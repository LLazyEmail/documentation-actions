const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const {isFork, parsePaths, supersedePr, reportSupersedeFailure} = require('./supersede');

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
// push: false runs a throwaway trial rebase that only reports conflicting files.
function gitRebase(pr, token, {push = true} = {}) {
  if (!pr.head.repo || !/^[\w.-]+\/[\w.-]+$/.test(pr.head.repo.full_name)) throw new Error('Invalid or deleted head repository');
  if (push && ['main', 'master', pr.base.repo.default_branch].includes(pr.head.ref)) throw new Error('Refusing to force-push a default/main branch');
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
      return {ok: false, files, message: files.length ? `Rebase conflicts (aborted):\n${files.map(f => `- ${f}`).join('\n')}` : 'Rebase failed and was aborted; inspect workflow logs'};
    }
    if (!push) return {ok: true, files: [], message: 'Trial rebase applied cleanly; nothing pushed'};
    if (git('rev-parse', 'HEAD^{tree}').trim() === git('rev-parse', `${base}^{tree}`).trim()) throw new Error('Refusing to push a branch identical to its base');
    git('push', `--force-with-lease=refs/heads/${pr.head.ref}:${pr.head.sha}`, 'head', `HEAD:refs/heads/${pr.head.ref}`);
    return {ok: true, message: 'Rebased onto base and pushed with an explicit SHA lease'};
  } finally { fs.rmSync(dir, {recursive: true, force: true}); }
}
// Compare the PR head with its base branch. Uses compareCommitsWithBasehead:
// in the Octokit bundled with actions/github-script v7, compareCommits expects
// separate `base` and `head` params, so passing `basehead` to it requested
// `/compare/...` and always returned 404 Not Found. Comparing against the head
// SHA (not `owner:branch`) also works for fork PRs and branch names with "/".
async function compare(github, repo, pr) {
  const {data} = await github.rest.repos.compareCommitsWithBasehead({...repo, basehead: `${pr.base.ref}...${pr.head.sha}`});
  return data;
}
// GitHub reports "unstable" (failing checks) or "blocked" ahead of "behind", so a PR that
// is behind its base and also failing is never marked "behind". Compare directly for those.
async function behindWhileFailing(github, repo, pr, core) {
  if (!['unstable', 'blocked'].includes(pr.mergeable_state)) return false;
  try {
    return (await compare(github, repo, pr)).behind_by > 0;
  } catch (err) {
    core.warning(`#${pr.number}: could not compare with ${pr.base.ref}: ${err.message}`);
    return false;
  }
}
// Before a git rebase, ask GitHub whether the head already contains the base.
// A PR whose branch has main merged in can still fail a replay-style rebase on
// adjacent lines, so "behind_by: 0" means there is nothing to do. On API errors
// return null and keep the previous behavior (attempt the rebase).
async function behindBy(github, repo, pr, core) {
  try {
    return (await compare(github, repo, pr)).behind_by;
  } catch (err) {
    core.warning(`#${pr.number}: could not compare with ${pr.base.ref}: ${err.message}`);
    return null;
  }
}
const MARKER = sha => `<!-- auto-rebase-conflicts:${sha} -->`;
// One comment per head SHA, so push-triggered runs do not repeat themselves.
async function reportConflicts(github, repo, pr, result) {
  const marker = MARKER(pr.head.sha);
  const comments = await github.paginate(github.rest.issues.listComments, {...repo, issue_number: pr.number, per_page: 100});
  if (comments.some(c => (c.body || '').includes(marker))) return false;
  const list = result.files && result.files.length
    ? `Files with conflicts:\n${result.files.map(f => `- \`${f}\``).join('\n')}`
    : result.ok ? 'GitHub reports a conflict, but a trial rebase applied cleanly. Dispatch the workflow with `rebase-conflicts: true` for this PR.'
      : result.message;
  await github.rest.issues.createComment({...repo, issue_number: pr.number,
    body: `⚠️ Auto-rebase: this PR conflicts with \`${pr.base.ref}\` and needs a manual or opt-in rebase.\n\n${list}\n\n${marker}`});
  return true;
}
async function run({github, context, core, numbers = '', mode = false, report = false, mergeFallback = false, rebase = gitRebase, commentOnUpdate = true, token, successMessage = 'Automatically updated this PR branch.', forkBlockedMessage = 'Check fork write permissions.', supersedeForks = false, supersedeUnionPaths = '', supersedeDraft = true, supersede = supersedePr}) {
  const repo = {...context.repo};
  const unionPaths = parsePaths(supersedeUnionPaths);
  // Opt-in: replay a fork PR's commits into a base-repo branch and open a new PR.
  const supersedeOne = async pr => {
    const result = await supersede({github, repo, pr, token, draft: supersedeDraft, unionPaths});
    if (result.ok) return result.message;
    await reportSupersedeFailure(github, repo, pr, result);
    throw new Error(`Supersede failed: ${result.message}`);
  };
  const explicit = parseNumbers(numbers);
  const selected = explicit || (await github.paginate(github.rest.pulls.list, {...repo, state: 'open', per_page: 100})).map(pr => pr.number);
  let failed = false;
  await core.summary.addHeading('PR branch updates').write();
  for (const number of selected) {
    let message;
    let updated = false;
    try {
      const pr = await details(github, {...repo, pull_number: number});
      if (pr.state !== 'open') throw new Error('PR is not open');
      if (pr.mergeable_state === 'behind' || await behindWhileFailing(github, repo, pr, core)) {
        try {
          await github.rest.pulls.updateBranch({...repo, pull_number: number, expected_head_sha: pr.head.sha});
          message = 'Branch update requested (merge-base update, not git rebase)';
          updated = true;
        } catch (err) {
          // The token cannot write to the fork (or edits from maintainers are off).
          if (!(supersedeForks && isFork(pr))) throw err;
          message = `Branch update failed (${err.message}); ${await supersedeOne(pr)}`;
        }
      } else if (pr.mergeable_state === 'dirty' && supersedeForks && isFork(pr)) {
        // A conflicting fork PR can neither be rebased (no push access to forks)
        // nor merge-updated (GitHub refuses conflicts), so supersede it.
        message = await supersedeOne(pr);
      } else if (pr.mergeable_state === 'dirty') {
        if (!mode && report) {
          const trial = gitRebase(pr, token, {push: false});
          const posted = await reportConflicts(github, repo, pr, trial);
          message = `Conflicts reported${posted ? '' : ' (already commented for this head)'}: ${trial.files.join(', ') || trial.message}`;
          core.info(`#${number}: ${message}`);
          await core.summary.addHeading(`#${number}`, 3).addCodeBlock(message, 'text').write();
          continue;
        }
        if (!mode && !explicit) {
          // Scheduled sweeps skip conflicting PRs quietly instead of failing the run
          // and commenting on the same PR every few hours.
          message = 'Skipped: conflicts need a manual rebase or a dispatch with rebase-conflicts: true';
          core.warning(`#${number}: ${message}`);
          core.info(`#${number}: ${message}`);
          await core.summary.addHeading(`#${number}`, 3).addCodeBlock(message, 'text').write();
          continue;
        }
        if (!mode) throw new Error('Conflicts require opt-in rebase-conflicts mode');
        if (await behindBy(github, repo, pr, core) === 0) {
          message = `Already up to date with ${pr.base.ref}; no rebase needed`;
        } else {
          const result = rebase(pr, token);
          if (result.ok) {
            message = result.message;
            updated = true;
          } else {
            if (!mergeFallback) throw new Error(result.message);
            // Opt-in: rebase replay conflicted, but GitHub may still be able to merge the
            // base into the branch. Re-read mergeability and do a non-force merge update.
            const fresh = await details(github, {...repo, pull_number: number});
            if (fresh.mergeable !== true) throw new Error(`${result.message}\nMerge fallback skipped: GitHub reports the PR as not mergeable`);
            await github.rest.pulls.updateBranch({...repo, pull_number: number, expected_head_sha: fresh.head.sha});
            message = `Rebase conflicted (${(result.files || []).join(', ') || 'see logs'}); merge-fallback requested a merge update (no force-push)`;
            updated = true;
          }
        }
      } else {
        message = `No update required (state: ${pr.mergeable_state})`;
      }
    } catch (err) {
      failed = true;
      message = `Failed: ${err.message}${err.status === 403 ? `; ${forkBlockedMessage}` : ''}`;
      try { await github.rest.issues.createComment({...repo, issue_number: number, body: `Auto-rebase: ${message}`}); }
      catch (commentError) { core.warning(`Could not comment on #${number}: ${commentError.message}`); }
    }
    if (updated && commentOnUpdate) {
      try { await github.rest.issues.createComment({...repo, issue_number: number, body: successMessage}); }
      catch (err) { core.warning(`Updated #${number}, but could not comment: ${err.message}`); }
    }
    core.info(`#${number}: ${message}`);
    await core.summary.addHeading(`#${number}`, 3).addCodeBlock(message, 'text').write();
  }
  if (failed) core.setFailed('One or more PR updates failed; see per-PR summary');
}
module.exports = {parseNumbers, details, gitRebase, reportConflicts, behindWhileFailing, behindBy, compare, run};
