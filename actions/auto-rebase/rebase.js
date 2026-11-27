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
// Conflict types, from `git status --porcelain` unmerged codes. During a rebase "ours"
// is the base branch and "theirs" the PR commit; during a merge of the base into the
// PR branch it is the other way round, so DU/UD flip meaning.
const CONFLICT_NOTES = {
  'deleted-on-main': base => `\`${base}\` deleted this file; the PR still edits it`,
  'deleted-in-pr': base => `the PR deletes this file; \`${base}\` changed it`,
  content: base => `both the PR and \`${base}\` changed the same lines`,
  'both-added': base => `the PR and \`${base}\` both added this file with different content`,
  'rename-or-add': base => `added or renamed on one side while the other side renamed, moved or deleted it (rename conflict with \`${base}\`)`,
  'both-deleted': base => `the PR and \`${base}\` renamed or removed it in different ways`,
};
function conflictKind(code, op) {
  if (code === 'UU') return 'content';
  if (code === 'AA') return 'both-added';
  if (code === 'DD') return 'both-deleted';
  if (code === 'AU' || code === 'UA') return 'rename-or-add';
  if (code === 'DU') return op === 'rebase' ? 'deleted-on-main' : 'deleted-in-pr';
  if (code === 'UD') return op === 'rebase' ? 'deleted-in-pr' : 'deleted-on-main';
  return 'content';
}
function unquote(file) {
  return file.startsWith('"') ? JSON.parse(file) : file;
}
function classifyConflicts(git, op, baseRef) {
  return git('status', '--porcelain=v1', '--untracked-files=no').split('\n')
    .map(line => ({code: line.slice(0, 2), file: unquote(line.slice(3))}))
    .filter(e => /^(DD|AU|UD|UA|DU|AA|UU)$/.test(e.code))
    .map(e => { const kind = conflictKind(e.code, op); return {file: e.file, kind, note: CONFLICT_NOTES[kind](baseRef)}; });
}
function describeConflicts(conflicts) {
  return conflicts.map(c => `- ${c.file}: ${c.note}`).join('\n');
}
// Opt-in resolver: a file the base branch deleted and the PR only modified is dropped
// (the deletion wins), restricted to resolve-deleted-paths. Never the other direction.
const resolvableDeletion = (c, paths) => c.kind === 'deleted-on-main' && paths.some(re => re.test(c.file));
// Opt-in resolver for generated files (generated-paths), such as docs/pages-index.md that a
// docs-index job rewrites on main after every merge: any conflict there is resolved by taking
// the base branch's version (or dropping the file when the base has none). The base branch
// regenerates it after the PR merges; regenerate-command can also rebuild it right away.
const isGenerated = (c, paths) => paths.some(re => re.test(c.file));
const resolvable = (conflicts, {resolveDeleted, resolvePaths, generatedPaths}) => conflicts.length > 0 &&
  conflicts.every(c => (resolveDeleted && resolvableDeletion(c, resolvePaths)) || isGenerated(c, generatedPaths));
// Resolve one step. During a rebase the base is "ours" (index stage 2); during a merge of the
// base into the PR branch it is "theirs" (stage 3).
function resolveStep(git, conflicts, op, {resolveDeleted, resolvePaths}, dropped, generated) {
  const stage = op === 'rebase' ? 2 : 3;
  for (const c of conflicts) {
    if (resolveDeleted && resolvableDeletion(c, resolvePaths)) { git('rm', '-q', '--', c.file); dropped.add(c.file); continue; }
    let onBase = true;
    try { git('cat-file', '-e', `:${stage}:${c.file}`); } catch { onBase = false; }
    if (onBase) { git('checkout', op === 'rebase' ? '--ours' : '--theirs', '--', c.file); git('add', '--', c.file); }
    else git('rm', '-q', '--', c.file);
    generated.add(c.file);
  }
}
// The regenerate command runs on the PR's own code, so it gets an environment without
// tokens (the git credentials live only in the git() wrapper's env) and never runs for fork PRs.
const SECRET_ENV = /TOKEN|SECRET|PASSWORD|^INPUT_|^GIT_CONFIG_|^ACTIONS_(RUNTIME|ID_TOKEN|CACHE)/i;
function cleanEnv() {
  return Object.fromEntries(Object.entries(process.env).filter(([key]) => !SECRET_ENV.test(key)));
}
// Run regenerate-command, then commit only the files matching generated-paths that it changed;
// anything else it touched is discarded. Returns the committed files. Throws on failure.
function regenerate(dir, git, {regenerateCommand, generatedPaths, baseRef, run = execFileSync}) {
  try {
    run('bash', ['-c', regenerateCommand], {cwd: dir, env: cleanEnv(), encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 10 * 60 * 1000});
  } catch (err) {
    const detail = String(err.stderr || err.stdout || err.message || '').trim().split('\n').slice(-5).join('\n');
    throw new Error(`regenerate-command failed (nothing pushed): ${detail}`);
  }
  const changed = git('status', '--porcelain=v1', '--untracked-files=all').split('\n').filter(Boolean)
    .map(line => unquote(line.slice(3).replace(/^.* -> /, '')));
  const files = changed.filter(file => generatedPaths.some(re => re.test(file)));
  if (files.length) git('add', '-A', '--', ...files);
  try { git('checkout', '-q', '--', '.'); } catch { /* nothing tracked changed */ }
  try { git('clean', '-fdq'); } catch { /* nothing untracked */ }
  let staged = false;
  try { git('diff', '--cached', '--quiet'); } catch { staged = true; }
  if (!staged) return [];
  git('commit', '-q', '--no-verify', '-m', `chore: regenerate generated files after updating from ${baseRef}\n\nauto-rebase regenerate-command: ${regenerateCommand}\nFiles: ${files.join(', ')}`);
  return files;
}
function maybeRegenerate(pr, dir, git, generated, {regenerateCommand = '', generatedPaths = [], regenerateRun}) {
  if (!generated.size || !regenerateCommand.trim() || isFork(pr)) return [];
  return regenerate(dir, git, {regenerateCommand, generatedPaths, baseRef: pr.base.ref, ...(regenerateRun ? {run: regenerateRun} : {})});
}
function resolvedSuffix(baseRef, dropped, generated, regenerated, regenerateCommand) {
  let text = dropped.length ? `; accepted deletion on ${baseRef} of: ${dropped.join(', ')}` : '';
  if (generated.length) text += `; took ${baseRef}'s version of generated: ${generated.join(', ')}`;
  if (regenerated.length) text += `; regenerated with \`${regenerateCommand}\`: ${regenerated.join(', ')}`;
  return text;
}
const conflictMessage = (verb, conflicts) => `${verb} conflicts (aborted):\n${describeConflicts(conflicts)}`;
function gitSession(pr, token, remoteUrl) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pr-rebase-'));
  const env = {...process.env, GIT_TERMINAL_PROMPT: '0', GIT_EDITOR: 'true'};
  if (token) Object.assign(env, {GIT_CONFIG_COUNT: '1', GIT_CONFIG_KEY_0: 'http.https://github.com/.extraheader',
    GIT_CONFIG_VALUE_0: `AUTHORIZATION: basic ${Buffer.from(`x-access-token:${token}`).toString('base64')}`});
  const git = (...args) => execFileSync('git', ['-c', 'core.hooksPath=/dev/null', ...args], {cwd: dir, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']});
  git('init', '-q');
  git('config', 'user.name', 'github-actions[bot]');
  git('config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com');
  git('remote', 'add', 'head', remoteUrl(pr.head.repo.full_name));
  git('remote', 'add', 'base', remoteUrl(pr.base.repo.full_name));
  git('fetch', '-q', '--no-tags', 'head', `refs/heads/${pr.head.ref}`);
  if (git('rev-parse', 'FETCH_HEAD').trim() !== pr.head.sha) { fs.rmSync(dir, {recursive: true, force: true}); throw new Error('Head changed before rebase; retry'); }
  git('checkout', '-q', '--detach', pr.head.sha);
  git('fetch', '-q', '--no-tags', 'base', `refs/heads/${pr.base.ref}`);
  const base = git('rev-parse', 'FETCH_HEAD').trim();
  return {dir, git, base, done: () => fs.rmSync(dir, {recursive: true, force: true})};
}
function checkHead(pr, push) {
  if (!pr.head.repo || !/^[\w.-]+\/[\w.-]+$/.test(pr.head.repo.full_name)) throw new Error('Invalid or deleted head repository');
  if (push && ['main', 'master', pr.base.repo.default_branch].includes(pr.head.ref)) throw new Error('Refusing to force-push a default/main branch');
}
const defaultRemote = full => `https://github.com/${full}.git`;
// push: false runs a throwaway trial rebase that only reports conflicting files.
// resolveDeleted: accept base-branch deletions of files the PR only modified, when every
// conflict of a step is of that kind and matches resolvePaths; otherwise abort as before.
// generatedPaths: conflicts in these files take the base branch's version (see isGenerated);
// regenerateCommand then rebuilds them in one extra commit (same-repo PRs only).
function gitRebase(pr, token, {push = true, resolveDeleted = false, resolvePaths = [], generatedPaths = [], regenerateCommand = '', regenerateRun, remoteUrl = defaultRemote} = {}) {
  checkHead(pr, push);
  const {dir, git, base, done} = gitSession(pr, token, remoteUrl);
  const dropped = new Set();
  const generated = new Set();
  const options = {resolveDeleted, resolvePaths, generatedPaths};
  try {
    let running = true;
    try { git('rebase', base); running = false; } catch { /* resolve below */ }
    for (let step = 0; running && step < 500; step++) {
      const conflicts = classifyConflicts(git, 'rebase', pr.base.ref);
      if (!resolvable(conflicts, options)) {
        try { git('rebase', '--abort'); } catch { /* nothing to abort */ }
        return {ok: false, conflicts, files: conflicts.map(c => c.file),
          message: conflicts.length ? conflictMessage('Rebase', conflicts) : 'Rebase failed and was aborted; inspect workflow logs'};
      }
      resolveStep(git, conflicts, 'rebase', options, dropped, generated);
      let empty = true;
      try { git('diff', '--cached', '--quiet'); } catch { empty = false; }
      try { git('rebase', empty ? '--skip' : '--continue'); running = false; } catch { /* next conflicting commit */ }
    }
    if (running) { try { git('rebase', '--abort'); } catch { /* ignore */ } return {ok: false, conflicts: [], files: [], message: 'Rebase did not finish; aborted'}; }
    const droppedList = [...dropped];
    const generatedList = [...generated];
    if (!push) return {ok: true, files: [], dropped: droppedList, generated: generatedList,
      message: `Trial rebase applied cleanly${resolvedSuffix(pr.base.ref, droppedList, generatedList, [], regenerateCommand)}; nothing pushed`};
    const regenerated = maybeRegenerate(pr, dir, git, generated, {regenerateCommand, generatedPaths, regenerateRun});
    if (git('rev-parse', 'HEAD^{tree}').trim() === git('rev-parse', `${base}^{tree}`).trim()) throw new Error('Refusing to push a branch identical to its base');
    git('push', '-q', `--force-with-lease=refs/heads/${pr.head.ref}:${pr.head.sha}`, 'head', `HEAD:refs/heads/${pr.head.ref}`);
    return {ok: true, dropped: droppedList, generated: generatedList, regenerated,
      message: `Rebased onto base and pushed with an explicit SHA lease${resolvedSuffix(pr.base.ref, droppedList, generatedList, regenerated, regenerateCommand)}`};
  } finally { done(); }
}
// Local merge update (no force-push): merge the base into the PR branch, applying the same
// opt-in resolvers, and push the merge commit as a fast-forward of the PR branch.
// Used by merge-fallback when GitHub's API says the PR is not mergeable, and by sweeps with
// generated-paths. push: false is a throwaway trial that only lists the conflicting files.
function gitMerge(pr, token, {push = true, resolveDeleted = false, resolvePaths = [], generatedPaths = [], regenerateCommand = '', regenerateRun, remoteUrl = defaultRemote} = {}) {
  checkHead(pr, push);
  const {dir, git, base, done} = gitSession(pr, token, remoteUrl);
  const dropped = new Set();
  const generated = new Set();
  const options = {resolveDeleted, resolvePaths, generatedPaths};
  const message = `Merge ${pr.base.ref} into ${pr.head.ref} (auto-rebase)`;
  try {
    try { git('merge', '--no-ff', '--no-edit', '-m', message, base); } catch {
      const conflicts = classifyConflicts(git, 'merge', pr.base.ref);
      if (!resolvable(conflicts, options)) {
        try { git('merge', '--abort'); } catch { /* nothing to abort */ }
        return {ok: false, conflicts, files: conflicts.map(c => c.file),
          message: conflicts.length ? conflictMessage('Merge', conflicts) : 'Merge failed and was aborted; inspect workflow logs'};
      }
      resolveStep(git, conflicts, 'merge', options, dropped, generated);
      const notes = [];
      if (dropped.size) notes.push(`Accepted deletion on ${pr.base.ref} of: ${[...dropped].join(', ')}`);
      if (generated.size) notes.push(`Took ${pr.base.ref}'s version of generated files: ${[...generated].join(', ')}`);
      git('commit', '-q', '--no-edit', '--no-verify', '-m', `${message}\n\n${notes.join('\n')}`);
    }
    const droppedList = [...dropped];
    const generatedList = [...generated];
    if (!push) return {ok: true, files: [], dropped: droppedList, generated: generatedList,
      message: `Trial merge applied cleanly${resolvedSuffix(pr.base.ref, droppedList, generatedList, [], regenerateCommand)}; nothing pushed`};
    const regenerated = maybeRegenerate(pr, dir, git, generated, {regenerateCommand, generatedPaths, regenerateRun});
    if (git('rev-parse', 'HEAD^{tree}').trim() === git('rev-parse', `${base}^{tree}`).trim()) throw new Error('Refusing to push a branch identical to its base');
    git('push', '-q', 'head', `HEAD:refs/heads/${pr.head.ref}`);
    return {ok: true, dropped: droppedList, generated: generatedList, regenerated,
      message: `Merged ${pr.base.ref} into the branch locally and pushed (no force-push)${resolvedSuffix(pr.base.ref, droppedList, generatedList, regenerated, regenerateCommand)}`};
  } finally { done(); }
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
// Opt-in "delegate-bot-rebase": Renovate and Dependabot regenerate lockfiles and
// their own config edits when they rebase, which a plain git rebase cannot do
// (both sides adding the same lines conflicts). Ask the bot to rebase instead.
const RENOVATE_UNCHECKED = /^(\s*[-*] )\[ \](\s*<!-- rebase-check -->)/m;
const RENOVATE_CHECKED = /^\s*[-*] \[[xX]\]\s*<!-- rebase-check -->/m;
const DEPENDABOT_COMMAND = '@dependabot rebase';
function botKind(pr) {
  const login = (pr.user && pr.user.login) || '';
  if (/^dependabot(-preview)?\[bot\]$/.test(login)) return 'dependabot';
  if (/renovate/i.test(login) && /<!-- rebase-check -->/.test(pr.body || '')) return 'renovate';
  return null;
}
// Returns a summary message, or null when the bot offers no rebase hook
// (the caller then falls back to the normal update/rebase path).
async function delegateBotRebase(github, repo, pr) {
  const kind = botKind(pr);
  if (kind === 'renovate') {
    const body = pr.body || '';
    if (RENOVATE_CHECKED.test(body)) return 'Delegated to Renovate: rebase checkbox already ticked; waiting for Renovate';
    if (!RENOVATE_UNCHECKED.test(body)) return null;
    // Only the checkbox changes; the rest of the body is left byte-for-byte.
    await github.rest.pulls.update({...repo, pull_number: pr.number, body: body.replace(RENOVATE_UNCHECKED, '$1[x]$2')});
    return 'Delegated to Renovate: ticked the rebase/retry checkbox; Renovate rebases and regenerates the lockfile on its next run';
  }
  if (kind === 'dependabot') {
    // One command per head commit, so scheduled sweeps do not repeat it.
    const {data: commit} = await github.rest.git.getCommit({...repo, commit_sha: pr.head.sha});
    const since = Date.parse(commit.committer && commit.committer.date) || 0;
    const comments = await github.paginate(github.rest.issues.listComments, {...repo, issue_number: pr.number, per_page: 100});
    if (comments.some(c => (c.body || '').trim() === DEPENDABOT_COMMAND && Date.parse(c.created_at) >= since)) {
      return 'Delegated to Dependabot: rebase already requested for this head; waiting for Dependabot';
    }
    await github.rest.issues.createComment({...repo, issue_number: pr.number, body: DEPENDABOT_COMMAND});
    return 'Delegated to Dependabot: commented "@dependabot rebase"';
  }
  return null;
}
const MARKER = sha => `<!-- auto-rebase-conflicts:${sha} -->`;
// One comment per head SHA, so push-triggered runs do not repeat themselves.
async function reportConflicts(github, repo, pr, result) {
  const marker = MARKER(pr.head.sha);
  const comments = await github.paginate(github.rest.issues.listComments, {...repo, issue_number: pr.number, per_page: 100});
  if (comments.some(c => (c.body || '').includes(marker))) return false;
  const list = result.conflicts && result.conflicts.length
    ? `Files with conflicts:\n${result.conflicts.map(c => `- \`${c.file}\`: ${c.note}`).join('\n')}`
    : result.files && result.files.length
    ? `Files with conflicts:\n${result.files.map(f => `- \`${f}\``).join('\n')}`
    : result.ok ? 'GitHub reports a conflict, but a trial rebase applied cleanly. Dispatch the workflow with `rebase-conflicts: true` for this PR.'
      : result.message;
  await github.rest.issues.createComment({...repo, issue_number: pr.number,
    body: `⚠️ Auto-rebase: this PR conflicts with \`${pr.base.ref}\` and needs a manual or opt-in rebase.\n\n${list}\n\n${marker}`});
  return true;
}
// One conflict report per PR, edited in place on later runs (not one comment per run).
const REPORT_MARKER = '<!-- auto-rebase-conflict-report -->';
async function upsertConflictReport(github, repo, pr, conflicts, {resolveHint = false} = {}) {
  const comments = await github.paginate(github.rest.issues.listComments, {...repo, issue_number: pr.number, per_page: 100});
  const existing = comments.find(c => (c.body || '').includes(REPORT_MARKER));
  const hints = [];
  if (conflicts.some(c => c.kind === 'deleted-on-main')) {
    hints.push(`- For files \`${pr.base.ref}\` deleted: if the PR's edits are no longer needed, delete the file on this branch too (\`git rm <file>\`)` +
      (resolveHint ? '. Repos can let auto-rebase do this with `resolve-deleted-on-main: true`.' : '.') +
      ` If they are still needed, move them to wherever \`${pr.base.ref}\` put that content.`);
  }
  if (conflicts.some(c => c.kind !== 'deleted-on-main')) hints.push(`- For the other files: merge or rebase \`${pr.base.ref}\` locally, fix the conflicts and push.`);
  const body = [REPORT_MARKER, `⚠️ Auto-rebase could not update this PR: it conflicts with \`${pr.base.ref}\` at ${pr.head.sha.slice(0, 7)}.`, '',
    'Conflicts:', ...conflicts.map(c => `- \`${c.file}\`: ${c.note}`), '', 'What to do:', ...hints, '',
    'This comment is updated by later auto-rebase runs.'].join('\n');
  if (!existing) await github.rest.issues.createComment({...repo, issue_number: pr.number, body});
  else if (existing.body !== body) await github.rest.issues.updateComment({...repo, comment_id: existing.id, body});
}
async function setLabel(github, repo, pr, label, on) {
  if (!label) return;
  const has = (pr.labels || []).some(l => (l.name || l) === label);
  if (on && !has) await github.rest.issues.addLabels({...repo, issue_number: pr.number, labels: [label]});
  if (!on && has) {
    try { await github.rest.issues.removeLabel({...repo, issue_number: pr.number, name: label}); }
    catch (err) { if (err.status !== 404) throw err; }
  }
}
const RED = new Set(['failure', 'timed_out', 'action_required', 'startup_failure', 'cancelled']);
// Opt-in report: are the PR head's checks red? Uses the checks and statuses APIs when the
// token can read them (the default GITHUB_TOKEN of the reusable workflow cannot: it only has
// contents and pull-requests), and falls back to GitHub's mergeable_state otherwise.
async function failingChecks(github, repo, pr, core) {
  const sha = pr.head && pr.head.sha;
  try {
    const runs = await github.paginate(github.rest.checks.listForRef, {...repo, ref: sha, per_page: 100});
    const list = Array.isArray(runs) ? runs : (runs.check_runs || []);
    const names = list.filter(r => RED.has(r.conclusion)).map(r => r.name);
    try {
      const {data} = await github.rest.repos.getCombinedStatusForRef({...repo, ref: sha});
      for (const st of data.statuses || []) if (['failure', 'error'].includes(st.state)) names.push(st.context);
    } catch (err) { if (![403, 404].includes(err.status)) throw err; }
    return names.length ? {names: [...new Set(names)], source: 'checks API'} : null;
  } catch (err) {
    if (![403, 404].includes(err.status)) core.warning(`#${pr.number}: could not read checks: ${err.message}`);
    // `unstable` = a non-required status is failing or pending; `blocked` can also be a red required check.
    return pr.mergeable_state === 'unstable' ? {names: [], source: 'mergeable_state unstable; pass a token with checks: read for names'} : null;
  }
}
function cell(text) { return String(text == null ? '' : text).replace(/\|/g, '\\|').replace(/\s+/g, ' ').slice(0, 160); }
async function writeTable(core, rows, {reportFailingChecks}) {
  if (!rows.length || typeof core.summary.addTable !== 'function') return;
  const head = [{data: 'PR', header: true}, {data: 'Status', header: true}, {data: 'Details', header: true}];
  if (reportFailingChecks) head.push({data: 'Checks not green', header: true});
  const body = rows.map(r => {
    const row = [`#${r.number}${r.title ? ` ${cell(r.title)}` : ''}`, r.status, cell(r.message)];
    if (reportFailingChecks) row.push(cell(r.checks) || '—');
    return row;
  });
  await core.summary.addHeading('Overview', 2).addTable([head, ...body]).write();
}
class ConflictError extends Error {
  constructor(result) { super(result.message); this.conflicts = result.conflicts || []; }
}
async function run({github, context, core, numbers = '', mode = false, report = false, mergeFallback = false, rebase = gitRebase, commentOnUpdate = true, token, successMessage = 'Automatically updated this PR branch.', forkBlockedMessage = 'Check fork write permissions.', supersedeForks = false, supersedeUnionPaths = '', supersedeDraft = true, supersedeSyncMessage = '', supersede = supersedePr, delegateBots = false, merge = gitMerge,
  resolveDeletedOnMain = false, resolveDeletedPaths = '.github/workflows/**', failOnConflict = true, conflictLabel = '',
  failOnSkippedConflicts = false, reportFailingChecks = false, failingChecksLabel = '',
  generatedPaths = '', regenerateCommand = '', listSkippedConflicts = true}) {
  const repo = {...context.repo};
  const unionPaths = parsePaths(supersedeUnionPaths);
  const resolvePaths = parsePaths(resolveDeletedPaths);
  const generated = parsePaths(generatedPaths);
  const gitOptions = {resolveDeleted: resolveDeletedOnMain, resolvePaths, generatedPaths: generated, regenerateCommand: String(regenerateCommand || '')};
  // Conflicting files for a skipped PR, from a throwaway local merge (what GitHub's "dirty"
  // means). Best effort: on any error the skip message stays as before.
  const listConflicts = (pr, trial) => {
    if (!trial && listSkippedConflicts) {
      try { trial = merge(pr, token, {...gitOptions, push: false}); } catch (err) { core.warning(`#${pr.number}: could not list conflicting files: ${err.message}`); }
    }
    return trial && trial.conflicts && trial.conflicts.length ? trial.conflicts : [];
  };
  // Opt-in: replay a fork PR's commits into a base-repo branch and open a new PR.
  const supersedeOne = async pr => {
    const result = await supersede({github, repo, pr, token, draft: supersedeDraft, unionPaths, ...(supersedeSyncMessage ? {syncMessage: supersedeSyncMessage} : {})});
    if (result.ok) return result.message;
    await reportSupersedeFailure(github, repo, pr, result);
    // A per-PR state that needs a maintainer (conflict, leftover branch) is commented on
    // the PR and logged as a warning; it does not turn the whole run red. Thrown errors
    // (API, permissions, git failures) still fail the job.
    const note = `Needs a maintainer (commented on #${pr.number}): ${result.message}`;
    core.warning(`#${pr.number}: ${note}`);
    return note;
  };
  const explicit = parseNumbers(numbers);
  const selected = explicit || (await github.paginate(github.rest.pulls.list, {...repo, state: 'open', per_page: 100})).map(pr => pr.number);
  let failed = false;
  const rows = [];
  // Per-PR bookkeeping shared by every exit path (including the early `continue`s):
  // conflict label, opt-in failing-checks report, and the summary table row.
  const finish = async ({number, pr, status, message, conflictOn, updated = false, keepLabel = false}) => {
    // Delegated bot PRs keep their label as is (unchanged from before); the bot rebases them.
    if (pr && conflictLabel && !keepLabel) {
      try { await setLabel(github, repo, pr, conflictLabel, conflictOn); }
      catch (err) { core.warning(`Could not update label on #${number}: ${err.message}`); }
    }
    let checks = '';
    if (pr && reportFailingChecks && !updated) {
      const red = await failingChecks(github, repo, pr, core);
      if (red) {
        checks = red.names.length ? red.names.join(', ') : `failing or pending (${red.source})`;
        core.warning(`#${number}: checks not green on ${String(pr.head && pr.head.sha).slice(0, 7)}: ${checks}`);
      }
      if (failingChecksLabel) {
        try { await setLabel(github, repo, pr, failingChecksLabel, Boolean(red)); }
        catch (err) { core.warning(`Could not update label on #${number}: ${err.message}`); }
      }
    }
    rows.push({number, title: pr && pr.title, status, message, checks});
  };
  await core.summary.addHeading('PR branch updates').write();
  for (const number of selected) {
    let message;
    let updated = false;
    let dropped = [];
    let pr;
    let conflicted = false;
    let generatedTry = null;
    try {
      pr = await details(github, {...repo, pull_number: number});
      if (pr.state !== 'open') throw new Error('PR is not open');
      if (delegateBots && botKind(pr) && (['dirty', 'behind'].includes(pr.mergeable_state) || await behindWhileFailing(github, repo, pr, core))) {
        // Delegated PRs are neither updated nor failed; the bot pushes the rebase itself.
        const delegated = await delegateBotRebase(github, repo, pr);
        if (delegated) {
          core.info(`#${number}: ${delegated}`);
          await core.summary.addHeading(`#${number}`, 3).addCodeBlock(delegated, 'text').write();
          await finish({number, pr, status: 'delegated to bot', message: delegated, keepLabel: true});
          continue;
        }
      }
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
      } else if (pr.mergeable_state === 'dirty' && !mode && generated.length && !isFork(pr)
        && (generatedTry = merge(pr, token, {...gitOptions, resolveDeleted: false})).ok) {
        // Opt-in generated-paths: a sweep merges the base into the branch (no force-push)
        // when every conflict is in a generated file, instead of skipping the PR.
        message = `Conflicts only in generated files; ${generatedTry.message}`;
        dropped = generatedTry.dropped || [];
        updated = true;
      } else if (pr.mergeable_state === 'dirty') {
        if (!mode && report) {
          const trial = gitRebase(pr, token, {push: false, ...gitOptions});
          const posted = await reportConflicts(github, repo, pr, trial);
          message = `Conflicts reported${posted ? '' : ' (already commented for this head)'}: ${trial.files.join(', ') || trial.message}`;
          // Opt-in: a reported conflict is still an open conflict, so it turns the run red too.
          if (failOnSkippedConflicts) { failed = true; core.error(`#${number}: ${message}`); }
          core.info(`#${number}: ${message}`);
          await core.summary.addHeading(`#${number}`, 3).addCodeBlock(message, 'text').write();
          await finish({number, pr, status: 'conflict (reported)', message, conflictOn: true});
          continue;
        }
        if (!mode && !explicit) {
          // Scheduled sweeps skip conflicting PRs quietly instead of failing the run
          // and commenting on the same PR every few hours.
          const files = listConflicts(pr, generatedTry);
          message = 'Skipped: conflicts need a manual rebase or a dispatch with rebase-conflicts: true' +
            (files.length ? `\nConflicting files:\n${describeConflicts(files)}` : '');
          // Opt-in: a skipped conflict turns the run red instead of a warning only.
          if (failOnSkippedConflicts) { failed = true; core.error(`#${number}: ${message}`); }
          else core.warning(`#${number}: ${message}`);
          core.info(`#${number}: ${message}`);
          await core.summary.addHeading(`#${number}`, 3).addCodeBlock(message, 'text').write();
          await finish({number, pr, status: 'conflict (skipped)', message, conflictOn: true});
          continue;
        }
        if (!mode) throw new Error('Conflicts require opt-in rebase-conflicts mode');
        if (await behindBy(github, repo, pr, core) === 0) {
          message = `Already up to date with ${pr.base.ref}; no rebase needed`;
        } else {
          const result = rebase(pr, token, gitOptions);
          if (result.ok) {
            message = result.message;
            dropped = result.dropped || [];
            updated = true;
          } else {
            if (!mergeFallback) throw new ConflictError(result);
            // Opt-in: rebase replay conflicted, but GitHub may still be able to merge the
            // base into the branch. Re-read mergeability and do a non-force merge update.
            const fresh = await details(github, {...repo, pull_number: number});
            if (fresh.mergeable === true) {
              await github.rest.pulls.updateBranch({...repo, pull_number: number, expected_head_sha: fresh.head.sha});
              message = `Rebase conflicted (${(result.files || []).join(', ') || 'see logs'}); merge-fallback requested a merge update (no force-push)`;
              updated = true;
            } else if ((resolveDeletedOnMain || generated.length) && !isFork(pr)) {
              // GitHub's flag cannot know about the opt-in resolvers: try a local merge with them.
              const merged = merge(fresh, token, gitOptions);
              if (!merged.ok) throw new ConflictError({...merged, message: `${result.message}\nLocal merge fallback: ${merged.message}`});
              message = `Rebase conflicted; merge-fallback: ${merged.message}`;
              dropped = merged.dropped || [];
              updated = true;
            } else {
              throw new ConflictError({...result, message: `${result.message}\nMerge fallback skipped: GitHub reports the PR as not mergeable`});
            }
          }
        }
      } else {
        message = `No update required (state: ${pr.mergeable_state})`;
      }
    } catch (err) {
      message = `Failed: ${err.message}${err.status === 403 ? `; ${forkBlockedMessage}` : ''}`;
      if (err instanceof ConflictError && err.conflicts.length && pr) {
        // Unresolvable conflicts: one report per PR (edited in place), optional label,
        // and red or warning depending on fail-on-conflict (default: red, as before).
        conflicted = true;
        if (failOnConflict) failed = true;
        else { message = `Needs a person (conflicts reported on #${number}): ${err.message}`; core.warning(`#${number}: ${message}`); }
        try { await upsertConflictReport(github, repo, pr, err.conflicts, {resolveHint: !resolveDeletedOnMain}); }
        catch (commentError) { core.warning(`Could not comment on #${number}: ${commentError.message}`); }
      } else {
        failed = true;
        try { await github.rest.issues.createComment({...repo, issue_number: number, body: `Auto-rebase: ${message}`}); }
        catch (commentError) { core.warning(`Could not comment on #${number}: ${commentError.message}`); }
      }
    }
    if (updated && dropped.length) {
      try {
        await github.rest.issues.createComment({...repo, issue_number: number, body:
          `ℹ️ Auto-rebase updated this branch and accepted deletions made on \`${pr.base.ref}\` (\`resolve-deleted-on-main\`). ` +
          `This PR's edits to these files were dropped:\n${dropped.map(f => `- \`${f}\``).join('\n')}\n\nIf those edits are still needed, re-apply them where \`${pr.base.ref}\` moved that content.`});
      } catch (err) { core.warning(`Updated #${number}, but could not list dropped files: ${err.message}`); }
    }
    if (updated && commentOnUpdate) {
      try { await github.rest.issues.createComment({...repo, issue_number: number, body: successMessage}); }
      catch (err) { core.warning(`Updated #${number}, but could not comment: ${err.message}`); }
    }
    core.info(`#${number}: ${message}`);
    await core.summary.addHeading(`#${number}`, 3).addCodeBlock(message, 'text').write();
    const status = conflicted ? 'conflict' : /^Failed/.test(message) ? 'failed' : updated ? 'updated'
      : /Needs a maintainer/.test(message) ? 'needs a maintainer' : /^(No update required|Already up to date)/.test(message) ? 'up to date' : 'see details';
    await finish({number, pr, status, message, updated, conflictOn: conflicted || Boolean(pr && pr.mergeable_state === 'dirty' && !updated)});
  }
  await writeTable(core, rows, {reportFailingChecks});
  const skipped = rows.filter(r => r.status === 'conflict (skipped)').map(r => `#${r.number}`);
  if (skipped.length && !failOnSkippedConflicts) {
    core.warning(`${skipped.length} open PR(s) still have merge conflicts and were skipped: ${skipped.join(', ')}. ` +
      'The run stays green by default; set fail-on-skipped-conflicts, conflict-label or report-conflicts to make this louder.');
  }
  if (failed) core.setFailed('One or more PR updates failed; see per-PR summary');
}
module.exports = {failingChecks, writeTable, botKind, delegateBotRebase, parseNumbers, details, gitRebase, gitMerge, classifyConflicts, conflictKind, upsertConflictReport, REPORT_MARKER, reportConflicts, behindWhileFailing, behindBy, compare, run};
