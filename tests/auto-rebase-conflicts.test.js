// Conflict types, the opt-in resolve-deleted-on-main resolver, the local merge
// fallback and conflict reporting: real git against a local bare repo, plus run()
// wiring with a mocked GitHub API.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const R = require('../actions/auto-rebase/rebase');
const {parsePaths} = require('../actions/auto-rebase/supersede');

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'conflicts-test-'));
const bare = path.join(root, 'base.git');
const work = path.join(root, 'work');
const sh = (...args) => execFileSync('git', ['-c', 'user.name=T', '-c', 'user.email=t@example.com', ...args], {cwd: work, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']}).trim();
const bareGit = (...args) => execFileSync('git', ['--git-dir', bare, ...args], {encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']}).trim();
const write = (file, text) => { fs.mkdirSync(path.dirname(path.join(work, file)), {recursive: true}); fs.writeFileSync(path.join(work, file), text); };
const remoteUrl = () => bare;
const wf = '.github/workflows/comment-readme-only.yml';
const prFor = (ref) => ({number: 457, state: 'open', head: {ref, sha: bareGit('rev-parse', `refs/heads/${ref}`), repo: {full_name: 'o/r'}},
  base: {ref: 'main', repo: {full_name: 'o/r', default_branch: 'main'}}, labels: []});
const workflows = parsePaths('.github/workflows/**');

(async () => {
  try {
    execFileSync('git', ['init', '-q', '--bare', '-b', 'main', bare]);
    execFileSync('git', ['init', '-q', '-b', 'main', work]);
    sh('remote', 'add', 'origin', bare);
    write(wf, 'name: old\n');
    write('README.md', '# Repo\n\nline a\nline b\n');
    write('docs/page.md', 'page\n');
    sh('add', '.'); sh('commit', '-qm', 'init'); sh('push', '-q', 'origin', 'main');
    // PR branch (like aem #457): one commit edits the workflow main later deletes, one edits README.
    sh('checkout', '-qb', 'aliases');
    write(wf, 'name: old\nuses: short-alias\n'); sh('commit', '-qam', 'short alias in workflow');
    write('README.md', '# Repo\n\nline a\nline b\nline c\n'); sh('commit', '-qam', 'readme');
    sh('push', '-q', 'origin', 'aliases');
    // A PR that also edits a README line main changes, and one that deletes a file main edits.
    sh('checkout', '-qb', 'mixed', 'main');
    write(wf, 'name: mixed\n'); write('README.md', '# Repo\n\nline A (pr)\nline b\n'); sh('commit', '-qam', 'mixed');
    sh('push', '-q', 'origin', 'mixed');
    sh('checkout', '-qb', 'deletes', 'main');
    sh('rm', '-q', 'docs/page.md'); sh('commit', '-qm', 'drop page'); sh('push', '-q', 'origin', 'deletes');
    sh('checkout', '-qb', 'deletes-wf', 'main');
    sh('rm', '-q', wf); sh('commit', '-qm', 'drop wf'); sh('push', '-q', 'origin', 'deletes-wf');
    // main: deletes the workflow (like aem #456), edits README line a and the docs page.
    sh('checkout', '-q', 'main');
    sh('rm', '-q', wf); write('README.md', '# Repo\n\nline a (main)\nline b\n'); write('docs/page.md', 'page v2\n', 'x');
    sh('add', '.'); sh('commit', '-qm', 'main moves on'); sh('push', '-q', 'origin', 'main');
    const mainSha = bareGit('rev-parse', 'refs/heads/main');

    // conflictKind maps DU/UD by operation.
    assert.equal(R.conflictKind('DU', 'rebase'), 'deleted-on-main');
    assert.equal(R.conflictKind('UD', 'merge'), 'deleted-on-main');
    assert.equal(R.conflictKind('UD', 'rebase'), 'deleted-in-pr');
    assert.equal(R.conflictKind('AU', 'rebase'), 'rename-or-add');

    // 1. Default (resolver off): a typed modify/delete conflict, nothing pushed.
    let pr = prFor('aliases');
    let r = R.gitRebase(pr, '', {push: false, remoteUrl});
    assert.equal(r.ok, false);
    assert.deepEqual(r.conflicts.map(c => [c.file, c.kind]), [[wf, 'deleted-on-main']]);
    assert.match(r.message, /`main` deleted this file; the PR still edits it/);

    // 2. Resolver on but path not allowed: still aborted.
    r = R.gitRebase(pr, '', {push: false, remoteUrl, resolveDeleted: true, resolvePaths: parsePaths('docs/**')});
    assert.equal(r.ok, false);

    // 3. Resolver on, workflows allowed: deletion accepted, the now-empty commit skipped, README kept.
    r = R.gitRebase(pr, '', {remoteUrl, resolveDeleted: true, resolvePaths: workflows});
    assert.equal(r.ok, true, r.message);
    assert.deepEqual(r.dropped, [wf]);
    assert.match(r.message, /accepted deletion on main of: \.github\/workflows\/comment-readme-only\.yml/);
    const head = bareGit('rev-parse', 'refs/heads/aliases');
    bareGit('merge-base', '--is-ancestor', mainSha, head);
    assert.throws(() => bareGit('cat-file', '-e', `${head}:${wf}`));
    assert.match(bareGit('show', `${head}:README.md`), /line a \(main\)\nline b\nline c/);
    assert.equal(bareGit('rev-list', '--count', `${mainSha}..${head}`), '1', 'workflow-only commit became empty and was dropped');

    // 4. Mixed conflicts (content + modify/delete): never partially resolved.
    pr = prFor('mixed');
    const mixedSha = pr.head.sha;
    r = R.gitRebase(pr, '', {remoteUrl, resolveDeleted: true, resolvePaths: workflows});
    assert.equal(r.ok, false);
    assert.deepEqual(r.conflicts.map(c => c.kind).sort(), ['content', 'deleted-on-main']);
    assert.equal(bareGit('rev-parse', 'refs/heads/mixed'), mixedSha, 'nothing pushed');
    r = R.gitMerge(pr, '', {remoteUrl, resolveDeleted: true, resolvePaths: workflows});
    assert.equal(r.ok, false);
    assert.deepEqual(r.conflicts.map(c => c.kind).sort(), ['content', 'deleted-on-main']);

    // 5. The PR deletes a file main edited: typed, never auto-resolved.
    pr = prFor('deletes');
    r = R.gitRebase(pr, '', {push: false, remoteUrl, resolveDeleted: true, resolvePaths: parsePaths('**')});
    assert.equal(r.ok, false);
    assert.deepEqual(r.conflicts.map(c => [c.file, c.kind]), [['docs/page.md', 'deleted-in-pr']]);
    assert.match(r.conflicts[0].note, /the PR deletes this file; `main` changed it/);

    // 6. Both sides deleted the same file: no conflict at all.
    r = R.gitRebase(prFor('deletes-wf'), '', {push: false, remoteUrl});
    assert.equal(r.ok, true, r.message);

    // 7. Local merge fallback with the resolver: merge commit, fast-forward push, file dropped.
    sh('checkout', '-qb', 'aliases2', `${mainSha}~1`);
    write(wf, 'name: old\nuses: alias2\n'); write('NOTES.md', 'n\n'); sh('add', '.'); sh('commit', '-qm', 'alias2');
    sh('push', '-q', 'origin', 'aliases2');
    pr = prFor('aliases2');
    r = R.gitMerge(pr, '', {remoteUrl});
    assert.equal(r.ok, false);
    assert.deepEqual(r.conflicts.map(c => [c.file, c.kind]), [[wf, 'deleted-on-main']], 'merge maps UD to deleted-on-main');
    r = R.gitMerge(pr, '', {remoteUrl, resolveDeleted: true, resolvePaths: workflows});
    assert.equal(r.ok, true, r.message);
    const merged = bareGit('rev-parse', 'refs/heads/aliases2');
    bareGit('merge-base', '--is-ancestor', pr.head.sha, merged);
    bareGit('merge-base', '--is-ancestor', mainSha, merged);
    assert.throws(() => bareGit('cat-file', '-e', `${merged}:${wf}`));
    assert.equal(bareGit('show', `${merged}:NOTES.md`), 'n');
    assert.match(bareGit('log', '-1', '--format=%B', merged), /Accepted deletion on main of: \.github\/workflows\/comment-readme-only\.yml/);

    // run() wiring.
    const summary = {addHeading() { return this; }, addCodeBlock() { return this; }, async write() {}};
    const mk = ({mergeable = false} = {}) => {
      const st = {comments: [], labels: [], failed: false, warnings: [], merges: 0, updates: 0};
      const dirty = {number: 457, state: 'open', mergeable: false, mergeable_state: 'dirty', labels: [], head: {sha: 'abcdef1', ref: 'ci/x', repo: {full_name: 'o/r'}}, base: {ref: 'main', repo: {full_name: 'o/r', default_branch: 'main'}}};
      const github = {
        paginate: async fn => fn === 'listComments' ? st.comments : [],
        rest: {
          pulls: {get: async () => ({data: {...dirty, mergeable, labels: st.labels.map(name => ({name}))}}), updateBranch: async () => { st.updates++; }},
          repos: {compareCommitsWithBasehead: async () => ({data: {behind_by: 2}})},
          issues: {listComments: 'listComments',
            createComment: async p => { st.comments.push({id: st.comments.length + 1, body: p.body}); },
            updateComment: async p => { st.comments.find(c => c.id === p.comment_id).body = p.body; },
            addLabels: async p => { st.labels.push(...p.labels); },
            removeLabel: async p => { st.labels = st.labels.filter(l => l !== p.name); }},
        },
      };
      const core = {summary, info() {}, warning: m => st.warnings.push(m), setFailed() { st.failed = true; }};
      return {st, go: opts => R.run({github, context: {repo: {owner: 'o', repo: 'r'}}, core, numbers: '457', mode: true, mergeFallback: true, token: 't', ...opts})};
    };
    const conflictResult = {ok: false, files: [wf], conflicts: [{file: wf, kind: 'deleted-on-main', note: '`main` deleted this file; the PR still edits it'}], message: 'Rebase conflicts (aborted):\n- x'};

    // Default: red, one typed report comment (edited in place, not duplicated), no label.
    let h = mk();
    await h.go({rebase: () => conflictResult});
    assert.equal(h.st.failed, true);
    assert.equal(h.st.comments.length, 1);
    assert.match(h.st.comments[0].body, new RegExp(R.REPORT_MARKER));
    assert.match(h.st.comments[0].body, /`\.github\/workflows\/comment-readme-only\.yml`: `main` deleted this file; the PR still edits it/);
    assert.match(h.st.comments[0].body, /resolve-deleted-on-main: true/);
    await h.go({rebase: () => ({...conflictResult, conflicts: [...conflictResult.conflicts, {file: 'README.md', kind: 'content', note: 'both changed'}]})});
    assert.equal(h.st.comments.length, 1, 'report edited in place');
    assert.match(h.st.comments[0].body, /README\.md/);
    assert.deepEqual(h.st.labels, []);

    // fail-on-conflict: false + conflict-label: warning (job green) and label added.
    h = mk();
    await h.go({rebase: () => conflictResult, failOnConflict: false, conflictLabel: 'has-conflicts'});
    assert.equal(h.st.failed, false);
    assert(h.st.warnings.some(w => /Needs a person/.test(w)));
    assert.deepEqual(h.st.labels, ['has-conflicts']);

    // GitHub says not mergeable + resolver off: merge fallback skipped (message kept).
    h = mk();
    let mergeCalls = 0;
    await h.go({rebase: () => conflictResult, merge: () => { mergeCalls++; return {ok: true}; }});
    assert.equal(mergeCalls, 0);

    // Resolver on: local merge is tried despite the API flag; dropped files listed; label removed.
    h = mk();
    h.st.labels.push('has-conflicts');
    await h.go({rebase: () => conflictResult, resolveDeletedOnMain: true, conflictLabel: 'has-conflicts', commentOnUpdate: false,
      merge: (p, t, opts) => { mergeCalls++; assert.equal(opts.resolveDeleted, true); assert(opts.resolvePaths[0].test(wf)); return {ok: true, dropped: [wf], message: 'Merged main locally'}; }});
    assert.equal(mergeCalls, 1);
    assert.equal(h.st.failed, false);
    assert.equal(h.st.comments.length, 1);
    assert.match(h.st.comments[0].body, /accepted deletions made on `main`[\s\S]*comment-readme-only\.yml/);
    assert.deepEqual(h.st.labels, []);

    // GitHub says mergeable: the API merge update is used as before.
    h = mk({mergeable: true});
    await h.go({rebase: () => conflictResult});
    assert.equal(h.st.updates, 1);
    assert.equal(h.st.failed, false);

    // Non-conflict failures keep the old plain comment.
    h = mk();
    await h.go({rebase: () => ({ok: false, files: [], message: 'Rebase failed and was aborted; inspect workflow logs'}), mergeFallback: false});
    assert.equal(h.st.failed, true);
    assert.match(h.st.comments[0].body, /^Auto-rebase: Failed: Rebase failed/);
    console.log('auto-rebase conflict tests: ok');
  } finally { fs.rmSync(root, {recursive: true, force: true}); }
})().catch(e => { console.error(e); process.exitCode = 1; });
