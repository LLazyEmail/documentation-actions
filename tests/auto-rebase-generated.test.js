// Opt-in generated-paths / regenerate-command resolver and named conflicts for skipped PRs.
// Modeled on atherdon/fuck-ecoflow run 45990681130: open PRs conflicted with main only in
// docs/pages-index.md (rewritten on main by the docs-index job) or also in a hand-edited
// config file. Real git against a local bare repo, plus run() wiring with a mocked GitHub API.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const R = require('../actions/auto-rebase/rebase');
const {parsePaths} = require('../actions/auto-rebase/supersede');

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'generated-test-'));
const bare = path.join(root, 'base.git');
const work = path.join(root, 'work');
const sh = (...args) => execFileSync('git', ['-c', 'user.name=T', '-c', 'user.email=t@example.com', ...args], {cwd: work, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']}).trim();
const bareGit = (...args) => execFileSync('git', ['--git-dir', bare, ...args], {encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']}).trim();
const write = (file, text) => { fs.mkdirSync(path.dirname(path.join(work, file)), {recursive: true}); fs.writeFileSync(path.join(work, file), text); };
const remoteUrl = () => bare;
const INDEX = 'docs/pages-index.md';
const generatedPaths = parsePaths(INDEX);
const prFor = (ref, fork = false) => ({number: 175, state: 'open', head: {ref, sha: bareGit('rev-parse', `refs/heads/${ref}`), repo: {full_name: fork ? 'someone/r' : 'o/r'}},
  base: {ref: 'main', repo: {full_name: 'o/r', default_branch: 'main'}}, labels: []});
// A dependency-free generator like fuck-ecoflow's scripts/generate-docs-index.mjs. It fails if a
// token-like variable reaches it, and leaves a stray file that must not be committed.
const GENERATOR = `const fs = require('node:fs');
if (Object.keys(process.env).some(k => /TOKEN|^INPUT_/i.test(k))) { console.error('token leaked'); process.exit(3); }
const pages = fs.readdirSync('docs').filter(f => f.endsWith('.md') && f !== 'pages-index.md').sort();
fs.writeFileSync('docs/pages-index.md', '# All pages\\n\\n' + pages.map(p => '- ' + p).join('\\n') + '\\n');
fs.writeFileSync('stray.txt', 'not generated\\n');
`;

(async () => {
  try {
    execFileSync('git', ['init', '-q', '--bare', '-b', 'main', bare]);
    execFileSync('git', ['init', '-q', '-b', 'main', work]);
    sh('remote', 'add', 'origin', bare);
    write('scripts/gen.js', GENERATOR);
    write('docs/a.md', 'a\n');
    write('config.js', 'module.exports = [\n  {to: "/a"},\n];\n');
    sh('add', '.'); sh('commit', '-qm', 'init');
    execFileSync('node', ['scripts/gen.js'], {cwd: work, env: {PATH: process.env.PATH}}); fs.rmSync(path.join(work, 'stray.txt'));
    sh('add', '.'); sh('commit', '-qm', 'index'); sh('push', '-q', 'origin', 'main');
    // PR "rename": adds a page and commits its own (now stale) index.
    sh('checkout', '-qb', 'rename');
    write('docs/potreba.md', 'p\n'); execFileSync('node', ['scripts/gen.js'], {cwd: work, env: {PATH: process.env.PATH}}); fs.rmSync(path.join(work, 'stray.txt'));
    sh('add', '.'); sh('commit', '-qm', 'rename page'); sh('push', '-q', 'origin', 'rename');
    // PR "mixed": same, plus a redirect in config.js where main also adds one.
    sh('checkout', '-qb', 'mixed', 'main');
    write('docs/vadim.md', 'v\n'); write('config.js', 'module.exports = [\n  {to: "/a"},\n  {to: "/vadim"},\n];\n');
    execFileSync('node', ['scripts/gen.js'], {cwd: work, env: {PATH: process.env.PATH}}); fs.rmSync(path.join(work, 'stray.txt'));
    sh('add', '.'); sh('commit', '-qm', 'mixed'); sh('push', '-q', 'origin', 'mixed');
    // main moves on: another page (and the docs-index bot's regenerated index), another redirect.
    sh('checkout', '-q', 'main');
    write('docs/maintainers.md', 'm\n'); write('config.js', 'module.exports = [\n  {to: "/a"},\n  {to: "/maintainers"},\n];\n');
    execFileSync('node', ['scripts/gen.js'], {cwd: work, env: {PATH: process.env.PATH}}); fs.rmSync(path.join(work, 'stray.txt'));
    sh('add', '.'); sh('commit', '-qm', 'main moves on'); sh('push', '-q', 'origin', 'main');
    const mainSha = bareGit('rev-parse', 'refs/heads/main');

    // 1. Without the resolver the index conflict aborts, as before.
    let pr = prFor('rename');
    let r = R.gitMerge(pr, '', {push: false, remoteUrl});
    assert.equal(r.ok, false);
    assert.deepEqual(r.files, [INDEX]);

    // 2. Trial merge with generated-paths: resolvable, nothing pushed.
    r = R.gitMerge(pr, '', {push: false, remoteUrl, generatedPaths});
    assert.equal(r.ok, true, r.message);
    assert.deepEqual(r.generated, [INDEX]);
    assert.match(r.message, /Trial merge applied cleanly; took main's version of generated: docs\/pages-index\.md; nothing pushed/);
    assert.equal(bareGit('rev-parse', 'refs/heads/rename'), pr.head.sha);

    // 3. Merge + regenerate: fast-forward push (no force), index lists both sides' pages,
    // the stray file is discarded and no token reaches the command.
    process.env.FAKE_TOKEN = 'secret';
    r = R.gitMerge(pr, 'tok', {remoteUrl, generatedPaths, regenerateCommand: 'node scripts/gen.js'});
    delete process.env.FAKE_TOKEN;
    assert.equal(r.ok, true, r.message);
    assert.deepEqual(r.regenerated, [INDEX]);
    assert.match(r.message, /no force-push\); took main's version of generated: docs\/pages-index\.md; regenerated with `node scripts\/gen\.js`: docs\/pages-index\.md/);
    let head = bareGit('rev-parse', 'refs/heads/rename');
    bareGit('merge-base', '--is-ancestor', pr.head.sha, head);
    bareGit('merge-base', '--is-ancestor', mainSha, head);
    assert.equal(bareGit('show', `${head}:${INDEX}`), '# All pages\n\n- a.md\n- maintainers.md\n- potreba.md');
    assert.throws(() => bareGit('cat-file', '-e', `${head}:stray.txt`));
    assert.match(bareGit('log', '-1', '--format=%s', head), /^chore: regenerate generated files after updating from main/);
    assert.match(bareGit('log', '-1', '--format=%B', `${head}~1`), /Took main's version of generated files: docs\/pages-index\.md/);

    // 4. Mixed conflicts are never partially resolved; the hand-edited file is named.
    pr = prFor('mixed');
    r = R.gitMerge(pr, '', {remoteUrl, generatedPaths, regenerateCommand: 'node scripts/gen.js'});
    assert.equal(r.ok, false);
    assert.deepEqual(r.files.sort(), ['config.js', INDEX]);
    assert.equal(bareGit('rev-parse', 'refs/heads/mixed'), pr.head.sha, 'nothing pushed');

    // 5. Rebase mode: generated conflicts take main's version per commit, then regenerate.
    sh('checkout', '-qb', 'rebased', `${mainSha}~1`);
    write('docs/florida.md', 'f\n'); execFileSync('node', ['scripts/gen.js'], {cwd: work, env: {PATH: process.env.PATH}}); fs.rmSync(path.join(work, 'stray.txt'));
    sh('add', '.'); sh('commit', '-qm', 'florida'); sh('push', '-q', 'origin', 'rebased');
    pr = prFor('rebased');
    r = R.gitRebase(pr, '', {remoteUrl, generatedPaths, regenerateCommand: 'node scripts/gen.js'});
    assert.equal(r.ok, true, r.message);
    head = bareGit('rev-parse', 'refs/heads/rebased');
    assert.equal(bareGit('rev-parse', `${head}~2`), mainSha, 'replayed commit + regenerate commit on top of main');
    assert.equal(bareGit('show', `${head}:${INDEX}`), '# All pages\n\n- a.md\n- florida.md\n- maintainers.md');

    // 6. A failing regenerate-command aborts without pushing.
    sh('checkout', '-qb', 'failing', `${mainSha}~1`);
    write('docs/x.md', 'x\n'); execFileSync('node', ['scripts/gen.js'], {cwd: work, env: {PATH: process.env.PATH}}); fs.rmSync(path.join(work, 'stray.txt'));
    sh('add', '.'); sh('commit', '-qm', 'x'); sh('push', '-q', 'origin', 'failing');
    pr = prFor('failing');
    assert.throws(() => R.gitMerge(pr, '', {remoteUrl, generatedPaths, regenerateCommand: 'echo broken >&2; exit 4'}), /regenerate-command failed \(nothing pushed\): broken/);
    assert.equal(bareGit('rev-parse', 'refs/heads/failing'), pr.head.sha);

    // 7. Fork PRs: the generated resolver may still apply, but PR code is never run.
    let ran = 0;
    r = R.gitMerge(prFor('failing', true), '', {push: false, remoteUrl, generatedPaths, regenerateCommand: 'node scripts/gen.js', regenerateRun: () => { ran++; }});
    assert.equal(r.ok, true);
    assert.equal(ran, 0);

    // run() wiring (a sweep: no rebase-conflicts).
    const summary = {addHeading() { return this; }, addCodeBlock() { return this; }, addTable() { return this; }, async write() {}};
    const mk = ({fork = false} = {}) => {
      const st = {comments: [], labels: ['has-conflicts'], failed: false, warnings: [], errors: []};
      const dirty = {number: 175, title: 't', state: 'open', mergeable: false, mergeable_state: 'dirty', head: {sha: 'abcdef1', ref: 'docs/x', repo: {full_name: fork ? 'someone/r' : 'o/r'}}, base: {ref: 'main', repo: {full_name: 'o/r', default_branch: 'main'}}};
      const github = {
        paginate: async fn => fn === 'listComments' ? st.comments : [{number: 175}],
        rest: {
          pulls: {list: 'list', get: async () => ({data: {...dirty, labels: st.labels.map(name => ({name}))}})},
          issues: {listComments: 'listComments',
            createComment: async p => { st.comments.push({id: st.comments.length + 1, body: p.body}); },
            addLabels: async p => { st.labels.push(...p.labels); },
            removeLabel: async p => { st.labels = st.labels.filter(l => l !== p.name); }},
        },
      };
      const core = {summary, info() {}, warning: m => st.warnings.push(m), error: m => st.errors.push(m), setFailed() { st.failed = true; }};
      return {st, go: opts => R.run({github, context: {repo: {owner: 'o', repo: 'r'}}, core, token: 't', conflictLabel: 'has-conflicts', failOnSkippedConflicts: true, ...opts})};
    };
    const mixed = {ok: false, files: ['config.js', INDEX], conflicts: [
      {file: 'config.js', kind: 'content', note: 'both the PR and `main` changed the same lines'},
      {file: INDEX, kind: 'content', note: 'both the PR and `main` changed the same lines'}], message: 'Merge conflicts (aborted)'};

    // Generated-only conflicts: merged and pushed instead of skipped; job green; label removed.
    let h = mk();
    let calls = [];
    await h.go({generatedPaths: INDEX, regenerateCommand: 'node scripts/gen.js', commentOnUpdate: false,
      merge: (p, t, o) => { calls.push(o); return {ok: true, dropped: [], generated: [INDEX], message: 'Merged main into the branch locally and pushed (no force-push)'}; }});
    assert.equal(calls.length, 1);
    assert.equal(calls[0].push, undefined);
    assert.equal(calls[0].resolveDeleted, false, 'sweeps never apply resolve-deleted-on-main');
    assert(calls[0].generatedPaths[0].test(INDEX));
    assert.equal(calls[0].regenerateCommand, 'node scripts/gen.js');
    assert.equal(h.st.failed, false);
    assert.deepEqual(h.st.labels, []);

    // Mixed: still skipped (and red with fail-on-skipped-conflicts), but the files are named;
    // the merge attempt is reused, no second clone.
    h = mk(); calls = [];
    await h.go({generatedPaths: INDEX, merge: (p, t, o) => { calls.push(o); return mixed; }});
    assert.equal(calls.length, 1);
    assert.equal(h.st.failed, true);
    assert.match(h.st.errors[0], /Skipped: conflicts need a manual rebase[\s\S]*Conflicting files:\n- config\.js: both the PR and `main` changed the same lines\n- docs\/pages-index\.md/);
    assert.deepEqual(h.st.labels, ['has-conflicts']);

    // Without generated-paths: a trial merge (push: false) names the files; list-skipped-conflicts: false skips it.
    h = mk(); calls = [];
    await h.go({merge: (p, t, o) => { calls.push(o); return mixed; }});
    assert.equal(calls.length, 1);
    assert.equal(calls[0].push, false);
    assert.match(h.st.errors[0], /Conflicting files:\n- config\.js/);
    h = mk(); calls = [];
    await h.go({listSkippedConflicts: false, merge: (p, t, o) => { calls.push(o); return mixed; }});
    assert.equal(calls.length, 0);
    assert.equal(h.st.errors[0], '#175: Skipped: conflicts need a manual rebase or a dispatch with rebase-conflicts: true');

    // A trial that throws keeps the old message and only warns.
    h = mk();
    await h.go({merge: () => { throw new Error('network'); }});
    assert.equal(h.st.errors[0], '#175: Skipped: conflicts need a manual rebase or a dispatch with rebase-conflicts: true');
    assert(h.st.warnings.some(w => /could not list conflicting files: network/.test(w)));

    // Fork PRs: no generated merge attempt (cannot push); only the trial listing.
    h = mk({fork: true}); calls = [];
    await h.go({generatedPaths: INDEX, merge: (p, t, o) => { calls.push(o); return mixed; }});
    assert.deepEqual(calls.map(o => o.push), [false]);
    console.log('auto-rebase generated-paths tests: ok');
  } finally { fs.rmSync(root, {recursive: true, force: true}); }
})().catch(e => { console.error(e); process.exitCode = 1; });
