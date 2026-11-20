// Opt-in "supersede" flow for contributor (fork) PRs that the workflow cannot
// update in place: the default GITHUB_TOKEN cannot push to forks, and a fork
// PR that conflicts with the base cannot be merge-updated by GitHub either.
//
// The flow never checks out or runs fork code. It only uses git plumbing on
// the PR's commits, fetched from the BASE repository's refs/pull/<n>/head, and
// git hooks are disabled. It never pushes to the fork and never force-pushes.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {execFileSync} = require('node:child_process');

const LOGIN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;
const branchFor = number => `supersede/pr-${number}`;
const sourceMarker = (number, sha) => `<!-- supersede-of:#${number} head:${sha} -->`;
const linkMarker = number => `<!-- supersede-link:#${number} -->`;

function isFork(pr) {
  return Boolean(pr.head && pr.head.repo && pr.base && pr.base.repo && pr.head.repo.full_name !== pr.base.repo.full_name);
}
function coAuthorTrailer(user) {
  if (!user || !LOGIN.test(user.login || '') || !Number.isInteger(user.id)) return null;
  return `Co-authored-by: ${user.login} <${user.id}+${user.login}@users.noreply.github.com>`;
}
// Minimal glob: `**` matches across directories, `*` within one segment.
function globToRegExp(glob) {
  const body = glob.trim().split('**').map(part => part.split('*').map(s => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('[^/]*')).join('.*');
  return new RegExp(`^${body}$`);
}
function parsePaths(value) {
  return String(value || '').split(/[\s,]+/).filter(Boolean).map(globToRegExp);
}
function readSource(body) {
  const match = /<!-- supersede-of:#(\d+) head:([0-9a-f]{7,40}) -->/.exec(body || '');
  return match ? {number: Number(match[1]), sha: match[2]} : null;
}

// Git boundary: build or extend the supersede branch. Returns
// {ok: true, pushed: boolean} or {ok: false, files, message}.
function supersedeGit(pr, token, {existingSha = null, previousHead = null, unionPaths = [], trailers = [], remoteUrl = full => `https://github.com/${full}.git`} = {}) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(pr.base.repo.full_name)) throw new Error('Invalid base repository');
  const branch = branchFor(pr.number);
  if ([pr.base.ref, pr.base.repo.default_branch, 'main', 'master'].includes(branch)) throw new Error('Refusing to push to a default/main branch');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pr-supersede-'));
  const env = {...process.env, GIT_TERMINAL_PROMPT: '0', GIT_EDITOR: 'true'};
  if (token) Object.assign(env, {GIT_CONFIG_COUNT: '1', GIT_CONFIG_KEY_0: 'http.https://github.com/.extraheader',
    GIT_CONFIG_VALUE_0: `AUTHORIZATION: basic ${Buffer.from(`x-access-token:${token}`).toString('base64')}`});
  const gitEnv = (extra, ...args) => execFileSync('git', ['-c', 'core.hooksPath=/dev/null', ...args], {cwd: dir, env: {...env, ...extra}, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']});
  const git = (...args) => gitEnv({}, ...args);
  // Cherry-pick one commit; addition-only conflicts in unionPaths keep both sides.
  // Returns null on success, or a failure result (the cherry-pick is aborted).
  const pick = commit => {
    try { git('cherry-pick', '-x', '--allow-empty', commit); return null; } catch {
      const files = git('diff', '--name-only', '--diff-filter=U').trim().split('\n').filter(Boolean);
      const resolvable = files.length > 0 && files.every(file => unionPaths.some(re => re.test(file))
        && git('diff', '--numstat', `${commit}^`, commit, '--', file).trim().split('\n').every(line => line.split('\t')[1] === '0'));
      if (!resolvable) {
        try { git('cherry-pick', '--abort'); } catch { /* nothing to abort */ }
        return {ok: false, files, message: files.length ? `Conflicts that need a person:\n${files.map(f => `- ${f}`).join('\n')}` : 'Cherry-pick failed; inspect workflow logs'};
      }
      // Addition-only changes to list files (README entries): keep both sides.
      for (const file of files) {
        const stage = n => {
          const p = path.join(os.tmpdir(), `${path.basename(dir)}-stage${n}`);
          let text = '';
          try { text = git('show', `:${n}:${file}`); } catch { /* added on both sides: empty base */ }
          fs.writeFileSync(p, text);
          return p;
        };
        const [ours, baseFile, theirs] = [stage(2), stage(1), stage(3)];
        fs.writeFileSync(path.join(dir, file), git('merge-file', '-p', '--union', ours, baseFile, theirs));
        [ours, baseFile, theirs].forEach(p => fs.rmSync(p));
        git('add', '--', file);
      }
      git('-c', 'core.editor=true', 'cherry-pick', '--continue');
      return null;
    }
  };
  try {
    git('init', '-q');
    git('config', 'user.name', 'github-actions[bot]');
    git('config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com');
    git('remote', 'add', 'base', remoteUrl(pr.base.repo.full_name));
    // The PR head is read from the base repository, so the fork is never contacted.
    git('fetch', '-q', '--no-tags', 'base', `refs/pull/${pr.number}/head`);
    if (git('rev-parse', 'FETCH_HEAD').trim() !== pr.head.sha) throw new Error('Head changed before supersede; retry');
    git('fetch', '-q', '--no-tags', 'base', `refs/heads/${pr.base.ref}`);
    const base = git('rev-parse', 'FETCH_HEAD').trim();
    let from;
    if (existingSha) {
      // Extend the existing supersede branch with commits pushed to the PR since.
      git('fetch', '-q', '--no-tags', 'base', `refs/heads/${branch}`);
      if (git('rev-parse', 'FETCH_HEAD').trim() !== existingSha) throw new Error('Supersede branch changed during the run; retry');
      git('checkout', '-q', '--detach', existingSha);
      let rewritten = false;
      try { git('merge-base', '--is-ancestor', previousHead, pr.head.sha); } catch { rewritten = true; }
      if (rewritten) {
        // The contributor force-pushed (rebased, amended or squashed). Their old
        // commits cannot be fast-forwarded, so re-apply their current net change
        // (PR head tree vs its merge-base) on the base branch, then record the
        // result as one "sync" commit on top of the existing supersede branch.
        // The branch only moves forward: no force-push.
        git('checkout', '-q', '--detach', base);
        const mergeBase = git('merge-base', base, pr.head.sha).trim();
        const [name, email, subject] = git('log', '-1', '--format=%an%x00%ae%x00%s', pr.head.sha).trim().split('\0');
        const author = {GIT_AUTHOR_NAME: name, GIT_AUTHOR_EMAIL: email};
        const message = [`Sync with #${pr.number} after the contributor rewrote the branch`, '',
          `Re-applies the net change of ${pr.head.sha} (against ${mergeBase.slice(0, 12)}) on ${pr.base.ref}.`,
          `Latest contributor commit: ${subject}`, '', ...trailers].join('\n');
        const squashed = gitEnv(author, 'commit-tree', `${pr.head.sha}^{tree}`, '-p', mergeBase, '-m', message).trim();
        const failure = pick(squashed);
        if (failure) return {...failure, message: `The contributor rewrote the PR branch and their current change does not apply cleanly to ${pr.base.ref}.\n${failure.message}`};
        const tree = git('rev-parse', 'HEAD^{tree}').trim();
        if (tree === git('rev-parse', `${base}^{tree}`).trim()) {
          return {ok: false, files: [], message: `The contributor's changes are already on ${pr.base.ref}; nothing to supersede`};
        }
        if (tree === git('rev-parse', `${existingSha}^{tree}`).trim()) {
          return {ok: true, pushed: false, synced: true, message: `${branch} already matches the contributor's rewritten branch`};
        }
        // Parents: the existing branch (fast-forward) and, if not already included, the
        // base, so the PR diff against the base is exactly the contributor's change.
        let baseIncluded = true;
        try { git('merge-base', '--is-ancestor', base, existingSha); } catch { baseIncluded = false; }
        const parents = ['-p', existingSha, ...(baseIncluded ? [] : ['-p', base])];
        const sync = gitEnv(author, 'commit-tree', tree, ...parents, '-m', message).trim();
        git('push', '-q', 'base', `${sync}:refs/heads/${branch}`);
        return {ok: true, pushed: true, synced: true, message: `Synced ${branch} with the contributor's rewritten branch (one sync commit, no force-push)`};
      }
      from = previousHead;
    } else {
      if (git('ls-remote', 'base', `refs/heads/${branch}`).trim()) {
        return {ok: false, files: [], message: `\`${branch}\` already exists without an open supersede PR; delete the branch (or reopen its PR) to regenerate it`};
      }
      git('checkout', '-q', '--detach', base);
      from = git('merge-base', base, pr.head.sha).trim();
    }
    const commits = git('rev-list', '--reverse', '--no-merges', `${from}..${pr.head.sha}`).trim().split('\n').filter(Boolean);
    if (!commits.length) return {ok: true, pushed: false, message: 'No new contributor commits to bring over'};
    for (const commit of commits) {
      const failure = pick(commit);
      if (failure) return failure;
      const message = git('log', '-1', '--format=%B');
      const missing = trailers.filter(t => !message.includes(t));
      if (missing.length) git('commit', '-q', '--amend', '--no-edit', ...missing.flatMap(t => ['--trailer', t]));
    }
    if (git('rev-parse', 'HEAD^{tree}').trim() === git('rev-parse', `${base}^{tree}`).trim()) {
      return {ok: false, files: [], message: `The contributor's changes are already on ${pr.base.ref}; nothing to supersede`};
    }
    // Fast-forward only for an existing branch; create-only (lease on absence) for a new one.
    // An existing branch only ever gets a fast-forward push; a new branch is
    // created with a lease that requires it not to exist yet. Never a force-push.
    if (existingSha) git('push', '-q', 'base', `HEAD:refs/heads/${branch}`);
    else git('push', '-q', `--force-with-lease=refs/heads/${branch}:`, 'base', `HEAD:refs/heads/${branch}`);
    return {ok: true, pushed: true, message: `Pushed ${commits.length} commit(s) to ${branch}`};
  } finally { fs.rmSync(dir, {recursive: true, force: true}); }
}

function supersedeBody(pr, trailer) {
  return [
    `Supersedes #${pr.number}`,
    '',
    `Original PR: ${pr.html_url} by @${pr.user.login}. Thank you for the contribution!`,
    '',
    `This PR was opened automatically by the auto-rebase workflow because #${pr.number} comes from a fork and ` +
      `could not be updated in place (it conflicts with \`${pr.base.ref}\`, or the workflow token cannot push to the fork). ` +
      'It replays the contributor\'s commits onto the current base. The original commit authors are kept' +
      (trailer ? ' and the PR author is credited with a `Co-authored-by` trailer.' : '.'),
    '',
    `When this PR is merged, #${pr.number} is closed automatically if the repository uses the close-superseded-prs workflow.`,
    '',
    sourceMarker(pr.number, pr.head.sha),
  ].join('\n');
}

async function supersedePr({github, repo, pr, token, draft = true, unionPaths = [], git = supersedeGit}) {
  const branch = branchFor(pr.number);
  const trailer = coAuthorTrailer(pr.user);
  const trailers = trailer ? [trailer] : [];
  const open = await github.paginate(github.rest.pulls.list, {...repo, state: 'open', head: `${repo.owner}:${branch}`, per_page: 100});
  const existing = open.find(p => p.head && p.head.ref === branch);
  if (existing) {
    const source = readSource(existing.body);
    if (source && source.sha === pr.head.sha) {
      // Nothing new from the contributor: keep the supersede PR current with a merge update.
      const {data: fresh} = await github.rest.pulls.get({...repo, pull_number: existing.number});
      if (fresh.mergeable_state === 'behind') await github.rest.pulls.updateBranch({...repo, pull_number: existing.number, expected_head_sha: fresh.head.sha});
      return {ok: true, number: existing.number, message: `Already superseded by #${existing.number}`};
    }
    if (!source) return {ok: false, number: existing.number, message: `#${existing.number} uses ${branch} but has no supersede marker; leaving it alone`};
    const result = git(pr, token, {existingSha: existing.head.sha, previousHead: source.sha, unionPaths, trailers});
    if (!result.ok) return {...result, number: existing.number};
    await github.rest.pulls.update({...repo, pull_number: existing.number,
      body: (existing.body || '').replace(sourceMarker(source.number, source.sha), sourceMarker(pr.number, pr.head.sha))});
    if (result.synced) await commentSync(github, repo, pr, existing.number);
    return {ok: true, number: existing.number, message: `Updated supersede PR #${existing.number}: ${result.message}`};
  }
  const result = git(pr, token, {unionPaths, trailers});
  if (!result.ok || !result.pushed) return result;
  let created;
  try {
    ({data: created} = await github.rest.pulls.create({...repo, base: pr.base.ref, head: branch, draft,
      title: `${pr.title} (supersedes #${pr.number})`, body: supersedeBody(pr, trailer)}));
  } catch (err) {
    throw new Error(`Pushed ${branch} but could not open the PR (${err.message}). Check "Allow GitHub Actions to create and approve pull requests" in the repository or organization settings`);
  }
  const comments = await github.paginate(github.rest.issues.listComments, {...repo, issue_number: pr.number, per_page: 100});
  if (!comments.some(c => (c.body || '').includes(linkMarker(created.number)))) {
    await github.rest.issues.createComment({...repo, issue_number: pr.number, body:
      `Thanks @${pr.user.login}! This PR can't be updated in place, so its commits were replayed onto \`${pr.base.ref}\` in #${created.number}, ` +
      `with you credited as co-author. Nothing to do on your side: when #${created.number} is merged, this PR will be closed in its favour.\n\n${linkMarker(created.number)}`});
  }
  return {ok: true, number: created.number, message: `Superseded by #${created.number} (${result.message})`};
}

// After a rewritten contributor branch is synced, tell both PRs (once per head SHA).
async function commentSync(github, repo, pr, number) {
  const marker = `<!-- supersede-sync:#${pr.number} head:${pr.head.sha} -->`;
  const notes = [
    [pr.number, `Thanks for the update @${pr.user.login}! Your rewritten branch (${pr.head.sha.slice(0, 7)}) was synced into #${number}, with you still credited as co-author. Nothing to do on your side.`],
    [number, `Synced with #${pr.number} after the contributor rewrote their branch: this PR now carries their current change (${pr.head.sha.slice(0, 7)}) as one sync commit on top of the earlier history (no force-push).`],
  ];
  for (const [issue, text] of notes) {
    const comments = await github.paginate(github.rest.issues.listComments, {...repo, issue_number: issue, per_page: 100});
    if (!comments.some(c => (c.body || '').includes(marker))) await github.rest.issues.createComment({...repo, issue_number: issue, body: `${text}\n\n${marker}`});
  }
}

// Comment once (per head SHA) on the original PR when the supersede attempt needs a person.
async function reportSupersedeFailure(github, repo, pr, result) {
  const marker = `<!-- supersede-failed:${pr.head.sha} -->`;
  const comments = await github.paginate(github.rest.issues.listComments, {...repo, issue_number: pr.number, per_page: 100});
  if (comments.some(c => (c.body || '').includes(marker))) return false;
  const fix = result.number
    ? `A maintainer can resolve this by hand: push a commit with the contributor's current change to \`${branchFor(pr.number)}\` (the branch of #${result.number}).`
    : `A maintainer can resolve this by hand: create \`${branchFor(pr.number)}\` from \`${pr.base.ref}\`, cherry-pick the commits, ` +
      `and open a PR whose body starts with \`Supersedes #${pr.number}\`.`;
  await github.rest.issues.createComment({...repo, issue_number: pr.number, body:
    `⚠️ Auto-rebase could not ${result.number ? `update the superseding PR #${result.number}` : 'create a superseding PR for this contribution'}, and nothing was pushed.\n\n${result.message}\n\n${fix}\n\n${marker}`});
  return true;
}

module.exports = {isFork, coAuthorTrailer, globToRegExp, parsePaths, readSource, supersedeGit, supersedeBody, supersedePr, reportSupersedeFailure, commentSync, branchFor};
