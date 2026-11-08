const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {execFileSync} = require('node:child_process');

function parseNumbers(value) {
  if (!value.trim()) return null;
  const numbers = value.split(',').map(s => s.trim());
  if (numbers.some(n => !/^[1-9]\d*$/.test(n))) throw new Error('pr-numbers must be comma-separated positive integers');
  return [...new Set(numbers.map(Number))];
}
async function details(github, params, pause = ms => new Promise(r => setTimeout(r, ms))) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const {data: pr} = await github.rest.pulls.get(params);
    if (pr.mergeable !== null && pr.mergeable_state !== 'unknown') return pr;
    if (attempt < 5) await pause(2000);
  }
  throw new Error('Mergeability remained unknown after six attempts; retry later');
}
function gitRebase(pr, token) {
  if (!pr.head.repo || !/^[\w.-]+\/[\w.-]+$/.test(pr.head.repo.full_name)) throw new Error('Invalid or deleted head repository');
  if (['main', 'master', pr.base.repo.default_branch].includes(pr.head.ref)) throw new Error('Refusing to force-push a default/main branch');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pr-rebase-'));
  const env = {...process.env, GIT_TERMINAL_PROMPT: '0', GIT_CONFIG_COUNT: '1',
    GIT_CONFIG_KEY_0: 'http.https://github.com/.extraheader',
    GIT_CONFIG_VALUE_0: `AUTHORIZATION: basic ${Buffer.from(`x-access-token:${token}`).toString('base64')}`};
  const git = (...args) => execFileSync('git', ['-c', 'core.hooksPath=/dev/null', ...args], {cwd: dir, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']});
  try {
    git('init');
    git('config', 'user.name', 'github-actions[bot]');
    git('config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com');
    git('remote', 'add', 'head', `https://github.com/${pr.head.repo.full_name}.git`);
    git('remote', 'add', 'base', `https://github.com/${pr.base.repo.full_name}.git`);
    git('fetch', '--no-tags', 'head', `refs/heads/${pr.head.ref}`);
    if (git('rev-parse', 'FETCH_HEAD').trim() !== pr.head.sha) throw new Error('Head changed before rebase; retry');
    git('checkout', '--detach', pr.head.sha);
    git('fetch', '--no-tags', 'base', `refs/heads/${pr.base.ref}`);
    const base = git('rev-parse', 'FETCH_HEAD').trim();
    try { git('rebase', base); } catch {
      const files = git('diff', '--name-only', '--diff-filter=U').trim().split('\n').filter(Boolean);
      git('rebase', '--abort');
      return {ok: false, message: files.length ? `Rebase conflicts (aborted):\n${files.map(f => `- ${f}`).join('\n')}` : 'Rebase failed and was aborted; inspect workflow logs'};
    }
    if (git('rev-parse', 'HEAD^{tree}').trim() === git('rev-parse', `${base}^{tree}`).trim()) throw new Error('Refusing to push a branch identical to its base');
    git('push', `--force-with-lease=refs/heads/${pr.head.ref}:${pr.head.sha}`, 'head', `HEAD:refs/heads/${pr.head.ref}`);
    return {ok: true, message: 'Rebased onto base and pushed with an explicit SHA lease'};
  } finally { fs.rmSync(dir, {recursive: true, force: true}); }
}
async function run({github, context, core, numbers = '', mode = false, token, successMessage = 'Automatically updated this PR branch.', forkBlockedMessage = 'Check fork write permissions.'}) {
  const repo = {...context.repo};
  const selected = parseNumbers(numbers) || (await github.paginate(github.rest.pulls.list, {...repo, state: 'open', per_page: 100})).map(pr => pr.number);
  let failed = false;
  await core.summary.addHeading('PR branch updates').write();
  for (const number of selected) {
    let message;
    let updated = false;
    try {
      const pr = await details(github, {...repo, pull_number: number});
      if (pr.state !== 'open') throw new Error('PR is not open');
      if (pr.mergeable_state === 'behind') {
        await github.rest.pulls.updateBranch({...repo, pull_number: number, expected_head_sha: pr.head.sha});
        message = 'Branch update requested (merge-base update, not git rebase)';
        updated = true;
      } else if (pr.mergeable_state === 'dirty') {
        if (!mode) throw new Error('Conflicts require opt-in rebase-conflicts mode');
        const result = gitRebase(pr, token);
        if (!result.ok) throw new Error(result.message);
        message = result.message;
        updated = true;
      } else {
        message = `No update required (state: ${pr.mergeable_state})`;
      }
    } catch (err) {
      failed = true;
      message = `Failed: ${err.message}${err.status === 403 ? `; ${forkBlockedMessage}` : ''}`;
      try { await github.rest.issues.createComment({...repo, issue_number: number, body: `Auto-rebase: ${message}`}); }
      catch (commentError) { core.warning(`Could not comment on #${number}: ${commentError.message}`); }
    }
    if (updated) {
      try { await github.rest.issues.createComment({...repo, issue_number: number, body: successMessage}); }
      catch (err) { core.warning(`Updated #${number}, but could not comment: ${err.message}`); }
    }
    core.info(`#${number}: ${message}`);
    await core.summary.addHeading(`#${number}`, 3).addCodeBlock(message, 'text').write();
  }
  if (failed) core.setFailed('One or more PR updates failed; see per-PR summary');
}
module.exports = {parseNumbers, details, gitRebase, run};
