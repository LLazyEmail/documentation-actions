// Paths that `git status` quotes (non-ASCII, e.g. Cyrillic file names) must not break conflict
// classification. Reproduces atherdon/fuck-ecoflow run 46053584500: the generated-paths merge of
// PR #184 failed with "Bad escaped character in JSON" because main had deleted
// "docs/.../\320\257\320\272 ...md" and the porcelain line was parsed with JSON.parse.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const R = require('../actions/auto-rebase/rebase');
const {parsePaths} = require('../actions/auto-rebase/supersede');

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'quoted-test-'));
const bare = path.join(root, 'base.git');
const work = path.join(root, 'work');
const sh = (...args) => execFileSync('git', ['-c', 'user.name=T', '-c', 'user.email=t@example.com', ...args], {cwd: work, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']}).trim();
const bareGit = (...args) => execFileSync('git', ['--git-dir', bare, ...args], {encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']}).trim();
const write = (file, text) => { fs.mkdirSync(path.dirname(path.join(work, file)), {recursive: true}); fs.writeFileSync(path.join(work, file), text); };
const remoteUrl = () => bare;
const INDEX = 'docs/pages-index.md';
const CYR = 'docs/inspiration/Як робляться інші.md';
const CYR_PAGE = 'docs/notes/Акумулятори lifepo4.md';
const prFor = ref => ({number: 184, state: 'open', head: {ref, sha: bareGit('rev-parse', `refs/heads/${ref}`), repo: {full_name: 'o/r'}},
  base: {ref: 'main', repo: {full_name: 'o/r', default_branch: 'main'}}, labels: []});
// Force git's default quoting even if the machine's global config turns it off.
const saved = {...process.env};
Object.assign(process.env, {GIT_CONFIG_COUNT: '1', GIT_CONFIG_KEY_0: 'core.quotePath', GIT_CONFIG_VALUE_0: 'true'});

(async () => {
  try {
    execFileSync('git', ['init', '-q', '--bare', '-b', 'main', bare]);
    execFileSync('git', ['init', '-q', '-b', 'main', work]);
    sh('remote', 'add', 'origin', bare);
    write(INDEX, 'index v1\n'); write(CYR, 'old\n'); write(CYR_PAGE, 'a\n'); write('docs/Power Core.md', 'p\n');
    sh('add', '.'); sh('commit', '-qm', 'init'); sh('push', '-q', 'origin', 'main');
    sh('checkout', '-qb', 'entry-points');
    write(INDEX, 'index from PR\n'); write('docs/new.md', 'n\n'); sh('add', '.'); sh('commit', '-qm', 'pr'); sh('push', '-q', 'origin', 'entry-points');
    sh('checkout', '-qb', 'cyr-conflict', 'main');
    write(CYR_PAGE, 'pr edit\n'); sh('commit', '-qam', 'pr edits cyrillic page'); sh('push', '-q', 'origin', 'cyr-conflict');
    // main: deletes a Cyrillic file, renames another, edits the index and the Cyrillic page.
    sh('checkout', '-q', 'main');
    sh('rm', '-q', CYR); sh('mv', 'docs/Power Core.md', 'docs/Павер Кор.md');
    write(INDEX, 'index from main\n'); write(CYR_PAGE, 'main edit\n');
    sh('add', '.'); sh('commit', '-qm', 'main'); sh('push', '-q', 'origin', 'main');

    // Before the fix this threw "Bad escaped character in JSON".
    let r = R.gitMerge(prFor('entry-points'), '', {push: false, remoteUrl, generatedPaths: parsePaths(INDEX)});
    assert.equal(r.ok, true, r.message);
    assert.deepEqual(r.generated, [INDEX]);
    r = R.gitMerge(prFor('entry-points'), '', {push: false, remoteUrl});
    assert.equal(r.ok, false);
    assert.deepEqual(r.files, [INDEX]);

    // A conflict on a Cyrillic path is reported with its real name (merge and rebase).
    r = R.gitMerge(prFor('cyr-conflict'), '', {push: false, remoteUrl});
    assert.equal(r.ok, false);
    assert.deepEqual(r.files, [CYR_PAGE]);
    r = R.gitRebase(prFor('cyr-conflict'), '', {push: false, remoteUrl});
    assert.equal(r.ok, false);
    assert.deepEqual(r.files, [CYR_PAGE]);

    // statusEntries: renames consume the extra -z field, untracked files are listed unquoted.
    const fake = () => `R  docs/Павер Кор.md\0docs/Power Core.md\0UU ${CYR_PAGE}\0?? docs/нове.md\0`;
    assert.deepEqual(R.statusEntries(fake, 'all'), [
      {code: 'R ', file: 'docs/Павер Кор.md'}, {code: 'UU', file: CYR_PAGE}, {code: '??', file: 'docs/нове.md'}]);

    // run(): a git error in the generated merge warns and falls back to the skip path
    // instead of failing the PR with "Failed: ...".
    const st = {warnings: [], errors: [], failed: false};
    const dirty = {number: 184, title: 't', state: 'open', mergeable: false, mergeable_state: 'dirty', labels: [], head: {sha: 'abcdef1', ref: 'docs/x', repo: {full_name: 'o/r'}}, base: {ref: 'main', repo: {full_name: 'o/r', default_branch: 'main'}}};
    const github = {paginate: async () => [{number: 184}], rest: {pulls: {list: 'list', get: async () => ({data: dirty})}, issues: {createComment: async () => { throw new Error('no comment expected'); }}}};
    const summary = {addHeading() { return this; }, addCodeBlock() { return this; }, addTable() { return this; }, async write() {}};
    const core = {summary, info() {}, warning: m => st.warnings.push(m), error: m => st.errors.push(m), setFailed() { st.failed = true; }};
    let calls = 0;
    await R.run({github, context: {repo: {owner: 'o', repo: 'r'}}, core, numbers: '', token: 't', generatedPaths: INDEX,
      merge: () => { calls++; throw new Error('boom'); }});
    assert.equal(calls, 2, 'generated merge, then the listing trial');
    assert(st.warnings.some(w => /#184: generated-paths merge failed, skipping it: boom/.test(w)));
    assert(st.warnings.some(w => /#184: Skipped: conflicts need a manual rebase/.test(w)));
    assert.equal(st.failed, false, 'skipped without fail-on-skipped-conflicts stays green');
    console.log('auto-rebase quoted-paths tests: ok');
  } finally {
    for (const k of ['GIT_CONFIG_COUNT', 'GIT_CONFIG_KEY_0', 'GIT_CONFIG_VALUE_0']) { if (k in saved) process.env[k] = saved[k]; else delete process.env[k]; }
    fs.rmSync(root, {recursive: true, force: true});
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
