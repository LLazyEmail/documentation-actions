// Exercise the git command boundary without network or repository writes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {gitRebase} = require('../actions/auto-rebase/rebase');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rebase-test-'));
const oldPath = process.env.PATH;
const log = path.join(root, 'commands');
const pr = {head: {repo: {full_name: 'example/source'}, ref: 'feature', sha: 'head-sha'}, base: {repo: {full_name: 'example/base', default_branch: 'main'}, ref: 'main'}};
try {
  fs.writeFileSync(path.join(root, 'git'), `#!/usr/bin/env node
const fs = require('node:fs');
const args = process.argv.slice(4);
fs.appendFileSync(process.env.REBASE_TEST_LOG, JSON.stringify(args) + '\\n');
if (args[0] === 'rev-parse') {
  const ref = args[1];
  if (ref === 'FETCH_HEAD') console.log(process.env.REBASE_TEST_MODE === 'changed' ? 'different-sha' : 'head-sha');
  else if (ref === 'HEAD^{tree}') console.log('head-tree');
  else console.log(process.env.REBASE_TEST_MODE === 'identical' ? 'head-tree' : 'base-tree');
}
if (args[0] === 'rebase' && args[1] !== '--abort' && process.env.REBASE_TEST_MODE === 'conflict') process.exitCode = 1;
if (args[0] === 'diff') console.log('README.md\\nwebsite/docs/tools.md');
`);
  fs.chmodSync(path.join(root, 'git'), 0o755);
  process.env.PATH = `${root}:${oldPath}`;
  process.env.REBASE_TEST_LOG = log;
  const commands = () => fs.readFileSync(log, 'utf8').trim().split('\n').map(JSON.parse);
  process.env.REBASE_TEST_MODE = 'success';
  assert.equal(gitRebase(pr, '').ok, true);
  assert(commands().some(args => args.includes('--force-with-lease=refs/heads/feature:head-sha')));
  fs.writeFileSync(log, '');
  process.env.REBASE_TEST_MODE = 'conflict';
  const result = gitRebase(pr, '');
  assert.equal(result.ok, false);
  assert.match(result.message, /README.md/);
  assert.match(result.message, /website\/docs\/tools.md/);
  assert(commands().some(args => args[0] === 'rebase' && args[1] === '--abort'));
  assert(!commands().some(args => args[0] === 'push'));
  process.env.REBASE_TEST_MODE = 'changed';
  assert.throws(() => gitRebase(pr, ''), /Head changed/);
  process.env.REBASE_TEST_MODE = 'identical';
  assert.throws(() => gitRebase(pr, ''), /identical/);
  console.log('git rebase boundary tests: ok');
} finally {
  process.env.PATH = oldPath;
  delete process.env.REBASE_TEST_LOG;
  delete process.env.REBASE_TEST_MODE;
  fs.rmSync(root, {recursive: true, force: true});
}
