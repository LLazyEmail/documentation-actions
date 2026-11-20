// Supersede flow for fork PRs: real git against local bare repos (no network),
// plus the run() wiring with a mocked GitHub API.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const S = require('../actions/auto-rebase/supersede');
const {run} = require('../actions/auto-rebase/rebase');

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'supersede-test-'));
const bare = path.join(root, 'base.git');
const work = path.join(root, 'work');
const sh = (cwd, ...args) => execFileSync('git', ['-c', 'user.name=Main', '-c', 'user.email=main@example.com', ...args], {cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']}).trim();
const write = (file, text) => fs.writeFileSync(path.join(work, file), text);
const remoteUrl = () => bare;
const summary = {addHeading() {return this;}, addCodeBlock() {return this;}, addList() {return this;}, async write() {}};

(async () => {
  try {
    // Pure helpers.
    assert.equal(S.coAuthorTrailer({login: 'Romacode71', id: 305743003}), 'Co-authored-by: Romacode71 <305743003+Romacode71@users.noreply.github.com>');
    assert.equal(S.coAuthorTrailer({login: 'bad name', id: 1}), null);
    const [readme, docs] = S.parsePaths('README.md, website/docs/**/*.md');
    assert(readme.test('README.md') && !readme.test('xREADME.md'));
    assert(docs.test('website/docs/tools/deliverability-tools.md') && !docs.test('website/src/x.js'));
    assert.deepEqual(S.readSource('x <!-- supersede-of:#421 head:9bdb476 --> y'), {number: 421, sha: '9bdb476'});
    assert.equal(S.isFork({head: {repo: {full_name: 'a/b'}}, base: {repo: {full_name: 'c/b'}}}), true);
    assert.equal(S.isFork({head: {repo: {full_name: 'c/b'}}, base: {repo: {full_name: 'c/b'}}}), false);
    assert.equal(S.isFork({head: {repo: null}, base: {repo: {full_name: 'c/b'}}}), false);

    // Repo: main has a list; the "fork" appends an entry; main appends another on the same line.
    sh(root, 'init', '-q', '--bare', '-b', 'main', bare);
    sh(root, 'init', '-q', '-b', 'main', work);
    sh(work, 'remote', 'add', 'origin', bare);
    write('README.md', '# List\n\n* a\n* b\n\n## Next\n');
    sh(work, 'add', '.'); sh(work, 'commit', '-qm', 'init'); sh(work, 'push', '-q', 'origin', 'main');
    sh(work, 'checkout', '-qb', 'feature');
    write('README.md', '# List\n\n* a\n* b\n* fork entry\n\n## Next\n');
    sh(work, '-c', 'user.name=Contributor', '-c', 'user.email=c@example.com', 'commit', '-qam', 'Add fork entry');
    const head1 = sh(work, 'rev-parse', 'HEAD');
    sh(work, 'push', '-q', 'origin', 'HEAD:refs/pull/7/head');
    sh(work, 'checkout', '-q', 'main');
    write('README.md', '# List\n\n* a\n* b\n* main entry\n\n## Next\n');
    sh(work, 'commit', '-qam', 'Add main entry'); sh(work, 'push', '-q', 'origin', 'main');

    const pr = {number: 7, title: 'Add fork entry', html_url: 'https://github.com/o/r/pull/7', user: {login: 'contrib', id: 42},
      head: {sha: head1, ref: 'feature', repo: {full_name: 'contrib/r'}}, base: {ref: 'main', repo: {full_name: 'o/r', default_branch: 'main'}}};
    const trailers = [S.coAuthorTrailer(pr.user)];

    // Without union paths a real conflict is reported and nothing is pushed.
    let result = S.supersedeGit(pr, '', {trailers, remoteUrl});
    assert.equal(result.ok, false);
    assert.match(result.message, /README.md/);
    assert.throws(() => sh(root, '--git-dir', bare, 'rev-parse', '--verify', 'refs/heads/supersede/pr-7'));

    // With union paths, an addition-only conflict keeps both entries.
    result = S.supersedeGit(pr, '', {trailers, remoteUrl, unionPaths: S.parsePaths('README.md')});
    assert.equal(result.ok, true, result.message);
    const branchSha = sh(root, '--git-dir', bare, 'rev-parse', 'refs/heads/supersede/pr-7');
    const content = sh(root, '--git-dir', bare, 'show', `${branchSha}:README.md`);
    assert.match(content, /\* main entry\n\* fork entry/);
    assert.equal(sh(root, '--git-dir', bare, 'log', '-1', '--format=%an <%ae>', branchSha), 'Contributor <c@example.com>');
    const msg = sh(root, '--git-dir', bare, 'log', '-1', '--format=%B', branchSha);
    assert.match(msg, /Co-authored-by: contrib <42\+contrib@users\.noreply\.github\.com>/);
    assert.match(msg, /cherry picked from commit/);
    assert.equal(sh(root, '--git-dir', bare, 'rev-parse', 'refs/heads/main'), sh(work, 'rev-parse', 'main'), 'main untouched');

    // Creating it again must not overwrite the existing branch.
    result = S.supersedeGit(pr, '', {trailers, remoteUrl, unionPaths: S.parsePaths('README.md')});
    assert.equal(result.ok, false);
    assert.match(result.message, /already exists/);
    assert.equal(sh(root, '--git-dir', bare, 'rev-parse', 'refs/heads/supersede/pr-7'), branchSha);

    // The contributor pushes another commit: the supersede branch is fast-forwarded.
    sh(work, 'checkout', '-q', 'feature');
    write('NOTES.md', 'more\n');
    sh(work, '-c', 'user.name=Contributor', '-c', 'user.email=c@example.com', 'add', '.');
    sh(work, '-c', 'user.name=Contributor', '-c', 'user.email=c@example.com', 'commit', '-qm', 'Add notes');
    const head2 = sh(work, 'rev-parse', 'HEAD');
    sh(work, 'push', '-q', '-f', 'origin', 'HEAD:refs/pull/7/head');
    result = S.supersedeGit({...pr, head: {...pr.head, sha: head2}}, '', {trailers, remoteUrl, existingSha: branchSha, previousHead: head1});
    assert.equal(result.ok, true, result.message);
    const branchSha2 = sh(root, '--git-dir', bare, 'rev-parse', 'refs/heads/supersede/pr-7');
    sh(root, '--git-dir', bare, 'merge-base', '--is-ancestor', branchSha, branchSha2);
    assert.equal(sh(root, '--git-dir', bare, 'show', `${branchSha2}:NOTES.md`), 'more');

    // The contributor rewrites (force-pushes) their branch: rebased on main, entry renamed,
    // NOTES.md dropped, a docs page added. The supersede branch gets one sync commit on top.
    sh(work, 'checkout', '-q', '-b', 'rewrite', 'main');
    write('README.md', '# List\n\n* a\n* b\n* main entry\n* fork entry v2\n\n## Next\n');
    fs.mkdirSync(path.join(work, 'docs'), {recursive: true});
    write('docs/tools.md', 'tool page\n');
    sh(work, 'add', '.');
    sh(work, '-c', 'user.name=Contributor', '-c', 'user.email=c@example.com', 'commit', '-qm', 'Add fork entry v2 (README + docs page)');
    const head4 = sh(work, 'rev-parse', 'HEAD');
    sh(work, 'push', '-q', '-f', 'origin', 'HEAD:refs/pull/7/head');
    const rewrittenPr = {...pr, head: {...pr.head, sha: head4}};
    result = S.supersedeGit(rewrittenPr, '', {trailers, remoteUrl, existingSha: branchSha2, previousHead: head2});
    assert.equal(result.ok, true, result.message);
    assert.equal(result.synced, true);
    assert.equal(result.pushed, true);
    const branchSha3 = sh(root, '--git-dir', bare, 'rev-parse', 'refs/heads/supersede/pr-7');
    sh(root, '--git-dir', bare, 'merge-base', '--is-ancestor', branchSha2, branchSha3); // fast-forward only
    assert.equal(sh(root, '--git-dir', bare, 'show', `${branchSha3}:README.md`), '# List\n\n* a\n* b\n* main entry\n* fork entry v2\n\n## Next');
    assert.equal(sh(root, '--git-dir', bare, 'show', `${branchSha3}:docs/tools.md`), 'tool page');
    assert.throws(() => sh(root, '--git-dir', bare, 'show', `${branchSha3}:NOTES.md`), 'dropped files are dropped');
    assert.equal(sh(root, '--git-dir', bare, 'diff', '--name-only', `main...${branchSha3}`), 'README.md\ndocs/tools.md');
    assert.equal(sh(root, '--git-dir', bare, 'log', '-1', '--format=%an <%ae>', branchSha3), 'Contributor <c@example.com>');
    const syncMsg = sh(root, '--git-dir', bare, 'log', '-1', '--format=%B', branchSha3);
    assert.match(syncMsg, /^Sync with #7 after the contributor rewrote the branch/);
    assert.match(syncMsg, /Co-authored-by: contrib <42\+contrib@users\.noreply\.github\.com>/);
    // Running again is a no-op.
    result = S.supersedeGit(rewrittenPr, '', {trailers, remoteUrl, existingSha: branchSha3, previousHead: head2});
    assert.equal(result.ok, true, result.message);
    assert.equal(result.pushed, false);
    assert.equal(sh(root, '--git-dir', bare, 'rev-parse', 'refs/heads/supersede/pr-7'), branchSha3);
    // A rewrite whose change no longer applies: reported, nothing pushed.
    sh(work, 'checkout', '-q', '-b', 'rewrite-bad', 'main~1');
    write('README.md', '# List\n\n* a\n* b (rewritten)\n\n## Next\n');
    sh(work, '-c', 'user.name=Contributor', '-c', 'user.email=c@example.com', 'commit', '-qam', 'Rewrite b');
    const head5 = sh(work, 'rev-parse', 'HEAD');
    sh(work, 'push', '-q', '-f', 'origin', 'HEAD:refs/pull/7/head');
    result = S.supersedeGit({...pr, head: {...pr.head, sha: head5}}, '', {trailers, remoteUrl, existingSha: branchSha3, previousHead: head4});
    assert.equal(result.ok, false);
    assert.match(result.message, /rewrote the PR branch[\s\S]*README\.md/);
    assert.equal(sh(root, '--git-dir', bare, 'rev-parse', 'refs/heads/supersede/pr-7'), branchSha3);

    // A conflict that edits existing lines is never auto-resolved.
    sh(work, 'checkout', '-q', '-b', 'edit', 'main~1');
    write('README.md', '# List\n\n* a\n* b (edited)\n\n## Next\n');
    sh(work, '-c', 'user.name=Contributor', '-c', 'user.email=c@example.com', 'commit', '-qam', 'Edit b');
    const head3 = sh(work, 'rev-parse', 'HEAD');
    sh(work, 'push', '-q', 'origin', 'HEAD:refs/pull/8/head');
    result = S.supersedeGit({...pr, number: 8, head: {...pr.head, sha: head3}}, '', {trailers, remoteUrl, unionPaths: S.parsePaths('README.md')});
    assert.equal(result.ok, false);
    assert.throws(() => sh(root, '--git-dir', bare, 'rev-parse', '--verify', 'refs/heads/supersede/pr-8'));

    // run() wiring: off by default (a dirty fork PR in a sweep is skipped, as before).
    const dirtyFork = {...pr, state: 'open', mergeable: false, mergeable_state: 'dirty'};
    let calls = [];
    const comments = [];
    const github = {
      paginate: async (fn, params) => fn === github.rest.pulls.list && params.state === 'open' && params.head ? [] : fn === github.rest.issues.listComments ? comments : [{number: 7}],
      rest: {
        pulls: {get: async () => ({data: dirtyFork}), list: () => {}, updateBranch: async () => {calls.push('update');},
          create: async params => { calls.push(['create', params]); return {data: {number: 99}}; }, update: async () => {}},
        issues: {listComments: () => {}, createComment: async params => { calls.push(['comment', params.issue_number]); }},
        repos: {compareCommitsWithBasehead: async () => ({data: {behind_by: 3}})},
      },
    };
    let failed = false;
    const core = {summary, info() {}, warning() {}, setFailed() {failed = true;}};
    const fakeGit = () => ({ok: true, pushed: true, message: 'Pushed 1 commit(s)'});
    await run({github, context: {repo: {owner: 'o', repo: 'r'}}, core, numbers: ''});
    assert.deepEqual(calls, []);
    assert.equal(failed, false);

    // Opted in: a sweep supersedes the dirty fork PR, opens a draft "Supersedes #7" PR and links it.
    const supersede = args => S.supersedePr({...args, git: fakeGit});
    await run({github, context: {repo: {owner: 'o', repo: 'r'}}, core, numbers: '', supersedeForks: true, supersede});
    assert.equal(failed, false);
    const created = calls.find(c => c[0] === 'create')[1];
    assert.equal(created.head, 'supersede/pr-7');
    assert.equal(created.draft, true);
    assert.match(created.body, /^Supersedes #7\n/);
    assert.match(created.body, /supersede-of:#7 head:/);
    assert(calls.some(c => c[0] === 'comment' && c[1] === 7));

    // An existing supersede PR for the same head is reused, not duplicated.
    calls = [];
    github.paginate = async (fn, params) => fn === github.rest.pulls.list && params.head
      ? [{number: 99, head: {ref: 'supersede/pr-7', sha: 'x'}, body: `Supersedes #7\n${'<!-- supersede-of:#7 head:' + head1 + ' -->'}`}]
      : fn === github.rest.issues.listComments ? comments : [{number: 7}];
    github.rest.pulls.get = async ({pull_number}) => ({data: pull_number === 99 ? {number: 99, mergeable_state: 'behind', head: {sha: 'x'}} : dirtyFork});
    await run({github, context: {repo: {owner: 'o', repo: 'r'}}, core, numbers: '', supersedeForks: true, supersede});
    assert(!calls.some(c => c[0] === 'create'));
    assert(calls.includes('update'), 'behind supersede PR gets a merge update');

    // Same-repo dirty PRs are never superseded.
    calls = [];
    github.rest.pulls.get = async () => ({data: {...dirtyFork, head: {...dirtyFork.head, repo: {full_name: 'o/r'}}}});
    await run({github, context: {repo: {owner: 'o', repo: 'r'}}, core, numbers: '', supersedeForks: true, supersede});
    assert.deepEqual(calls, []);

    // A conflict the flow cannot resolve: comment on the original PR and warn (run stays green); no PR.
    calls = []; failed = false;
    github.paginate = async (fn, params) => fn === github.rest.pulls.list && params.head ? [] : fn === github.rest.issues.listComments ? [] : [{number: 7}];
    github.rest.pulls.get = async () => ({data: dirtyFork});
    await run({github, context: {repo: {owner: 'o', repo: 'r'}}, core, numbers: '', supersedeForks: true,
      supersede: args => S.supersedePr({...args, git: () => ({ok: false, files: ['README.md'], message: 'Conflicts that need a person:\n- README.md'})})});
    assert.equal(failed, false);
    assert(!calls.some(c => c[0] === 'create'));
    assert(calls.some(c => c[0] === 'comment' && c[1] === 7));

    // A behind fork PR whose branch update is refused (403) is superseded instead.
    calls = []; failed = false;
    github.rest.pulls.get = async () => ({data: {...dirtyFork, mergeable: true, mergeable_state: 'behind'}});
    github.rest.pulls.updateBranch = async () => { const e = new Error('Resource not accessible by integration'); e.status = 403; throw e; };
    await run({github, context: {repo: {owner: 'o', repo: 'r'}}, core, numbers: '', supersedeForks: true, supersede});
    assert.equal(failed, false);
    assert(calls.some(c => c[0] === 'create'));
    // Thrown errors (API/permissions) still fail the run.
    failed = false;
    github.rest.pulls.get = async () => ({data: dirtyFork});
    await run({github, context: {repo: {owner: 'o', repo: 'r'}}, core, numbers: '', supersedeForks: true,
      supersede: async () => { throw new Error('boom'); }});
    assert.equal(failed, true);

    // Rewritten contributor branch: existing supersede PR is synced, marker updated, both PRs commented once.
    calls = []; failed = false;
    const bodies = [];
    const oldBody = `Supersedes #7\n<!-- supersede-of:#7 head:${head2} -->`;
    let posted = [];
    github.paginate = async (fn, params) => fn === github.rest.pulls.list && params.head
      ? [{number: 99, head: {ref: 'supersede/pr-7', sha: branchSha2}, body: oldBody}]
      : fn === github.rest.issues.listComments ? posted.filter(c => c.issue === params.issue_number) : [{number: 7}];
    github.rest.pulls.get = async () => ({data: {...dirtyFork, head: {...dirtyFork.head, sha: head4}}});
    github.rest.pulls.update = async params => { bodies.push(params.body); };
    github.rest.issues.createComment = async params => { posted.push({issue: params.issue_number, body: params.body}); };
    let gitArgs;
    const syncGit = (p, t, opts) => { gitArgs = opts; return {ok: true, pushed: true, synced: true, message: 'Synced'}; };
    await run({github, context: {repo: {owner: 'o', repo: 'r'}}, core, numbers: '', supersedeForks: true, supersede: args => S.supersedePr({...args, git: syncGit})});
    assert.equal(failed, false);
    assert.equal(gitArgs.existingSha, branchSha2);
    assert.equal(gitArgs.previousHead, head2);
    assert.equal(bodies.length, 1);
    assert.match(bodies[0], new RegExp(`supersede-of:#7 head:${head4}`));
    assert.deepEqual(posted.map(c => c.issue).sort(), [7, 99]);
    await run({github, context: {repo: {owner: 'o', repo: 'r'}}, core, numbers: '', supersedeForks: true, supersede: args => S.supersedePr({...args, git: syncGit})});
    assert.equal(posted.length, 2, 'sync comments are not repeated for the same head');
    console.log('auto-rebase supersede tests: ok');
  } finally {
    fs.rmSync(root, {recursive: true, force: true});
  }
})().catch(e => {console.error(e); process.exitCode = 1;});
