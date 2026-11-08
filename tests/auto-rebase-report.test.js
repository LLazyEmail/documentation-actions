// report-conflicts: trial rebase lists files, comments once per head SHA, never pushes or fails the job.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {run, reportConflicts} = require('../actions/auto-rebase/rebase');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rebase-report-'));
const oldPath = process.env.PATH;
const log = path.join(root, 'commands');
fs.writeFileSync(path.join(root, 'git'), `#!/usr/bin/env node
const fs = require('node:fs');
const args = process.argv.slice(4);
fs.appendFileSync(process.env.REBASE_TEST_LOG, JSON.stringify(args) + '\\n');
if (args[0] === 'rev-parse') console.log('head-sha');
if (args[0] === 'rebase' && args[1] !== '--abort') process.exitCode = 1;
if (args[0] === 'diff') console.log('README.md');
`);
fs.chmodSync(path.join(root, 'git'), 0o755);
process.env.PATH = `${root}:${oldPath}`;
process.env.REBASE_TEST_LOG = log;
(async () => {
  // Head branch is the fork's main: trial rebase is allowed (no push happens).
  const pr = {number: 371, state: 'open', mergeable: false, mergeable_state: 'dirty',
    head: {sha: 'head-sha', ref: 'main', repo: {full_name: 'fork/repo'}},
    base: {ref: 'main', repo: {full_name: 'org/repo', default_branch: 'main'}}};
  const comments = [];
  const github = {
    rest: {pulls: {get: async () => ({data: pr})}, issues: {listComments: 'list', createComment: async c => comments.push(c)}},
    paginate: async () => comments
  };
  const summary = {addHeading() {return this;}, addCodeBlock() {return this;}, async write() {}};
  let failure = false;
  const core = {summary, info() {}, warning() {}, setFailed() {failure = true;}};
  await run({github, context: {repo: {owner: 'org', repo: 'repo'}}, core, numbers: '371', report: true});
  assert.equal(failure, false);
  assert.equal(comments.length, 1);
  assert.match(comments[0].body, /`README.md`/);
  assert.match(comments[0].body, /auto-rebase-conflicts:head-sha/);
  const commands = fs.readFileSync(log, 'utf8').trim().split('\n').map(JSON.parse);
  assert(!commands.some(args => args[0] === 'push'));
  // Second push-triggered run with the same head: no duplicate comment.
  await run({github, context: {repo: {owner: 'org', repo: 'repo'}}, core, numbers: '371', report: true});
  assert.equal(comments.length, 1);
  // Clean trial rebase still explains what to do.
  const fresh = [];
  const gh2 = {rest: {issues: {listComments: 'list', createComment: async c => fresh.push(c)}}, paginate: async () => []};
  assert.equal(await reportConflicts(gh2, {}, pr, {ok: true, files: []}), true);
  assert.match(fresh[0].body, /rebase-conflicts: true/);
  // commentOnUpdate: false suppresses the success comment for behind PRs.
  const behind = {...pr, mergeable: true, mergeable_state: 'behind'};
  const posted = [];
  const gh3 = {rest: {pulls: {get: async () => ({data: behind}), updateBranch: async () => {}}, issues: {createComment: async c => posted.push(c)}}};
  await run({github: gh3, context: {repo: {}}, core, numbers: '371', commentOnUpdate: false});
  assert.equal(posted.length, 0);
  console.log('auto-rebase report-conflicts tests: ok');
})().catch(e => {console.error(e); process.exitCode = 1;}).finally(() => {
  process.env.PATH = oldPath;
  fs.rmSync(root, {recursive: true, force: true});
});
