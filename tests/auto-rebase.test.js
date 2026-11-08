const assert = require('node:assert/strict');
const {parseNumbers, details, run, gitRebase} = require('../actions/auto-rebase/rebase');
(async () => {
  assert.equal(parseNumbers(''), null);
  assert.deepEqual(parseNumbers('351, 371,351'), [351, 371]);
  assert.throws(() => parseNumbers('1; echo bad'));
  let calls = 0;
  const pr = {number: 351, state: 'open', mergeable: true, mergeable_state: 'behind', head: {sha: 'abc'}};
  const github = {rest: {pulls: {
    get: async () => ({data: ++calls < 3 ? {...pr, mergeable: null} : pr}),
    updateBranch: async params => assert.equal(params.pull_number, 351)
  }, issues: {createComment: async () => {}}}, paginate: async () => {throw Error('must not enumerate all PRs');}};
  assert.equal((await details(github, {}, async () => {})).number, 351);
  assert.equal(calls, 3);
  const summary = {addHeading() {return this;}, addCodeBlock() {return this;}, async write() {}};
  let failure = false;
  const core = {summary, info() {}, warning() {}, setFailed() {failure = true;}};
  await run({github, context: {repo: {owner: 'test', repo: 'test'}}, core, numbers: '351'});
  assert.equal(failure, false);
  github.rest.pulls.get = async () => ({data: {...pr, mergeable: false, mergeable_state: 'dirty'}});
  await run({github, context: {repo: {}}, core, numbers: '351'});
  assert.equal(failure, true);
  assert.throws(() => gitRebase({head: {repo: {full_name: 'owner/repo'}, ref: 'main'}, base: {repo: {default_branch: 'main'}}}, ''), /Refusing/);
  github.rest.pulls.get = async () => ({data: {...pr, mergeable: null, mergeable_state: 'unknown'}});
  await assert.rejects(details(github, {}, async () => {}), /six attempts/);
  console.log('targeted auto-rebase tests: ok');
})().catch(e => {console.error(e); process.exitCode = 1;});
