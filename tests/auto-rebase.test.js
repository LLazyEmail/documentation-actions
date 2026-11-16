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
  // A scheduled sweep (no PR numbers) skips conflicting PRs without failing or commenting.
  failure = false;
  let comments = 0;
  const sweep = {...github, rest: {...github.rest, issues: {createComment: async () => {comments++;}}}, paginate: async () => [{number: 351}]};
  await run({github: sweep, context: {repo: {}}, core, numbers: ''});
  assert.equal(failure, false);
  assert.equal(comments, 0);
  assert.throws(() => gitRebase({head: {repo: {full_name: 'owner/repo'}, ref: 'main'}, base: {repo: {default_branch: 'main'}}}, ''), /Refusing/);
  // "unstable" PRs that are behind their base get a branch update; ones that are not behind do not.
  let updates = 0;
  const unstable = {...pr, mergeable_state: 'unstable', base: {ref: 'main'}, head: {sha: 'abc', label: 'test:feat'}};
  const gh2 = {rest: {pulls: {get: async () => ({data: unstable}), updateBranch: async () => {updates++;}},
    issues: {createComment: async () => {}}, repos: {compareCommits: async () => ({data: {behind_by: 5}})}}};
  failure = false;
  await run({github: gh2, context: {repo: {}}, core, numbers: '351'});
  assert.equal(updates, 1);
  assert.equal(failure, false);
  gh2.rest.repos.compareCommits = async () => ({data: {behind_by: 0}});
  await run({github: gh2, context: {repo: {}}, core, numbers: '351'});
  assert.equal(updates, 1);
  gh2.rest.pulls.get = async () => ({data: {...unstable, mergeable_state: 'clean'}});
  gh2.rest.repos.compareCommits = async () => {throw Error('clean PRs must not be compared');};
  await run({github: gh2, context: {repo: {}}, core, numbers: '351'});
  assert.equal(updates, 1);
  // rebase-conflicts mode: a dirty PR that already contains main (behind_by 0) is a no-op success.
  const dirty = {...pr, mergeable: false, mergeable_state: 'dirty', base: {ref: 'main'}, head: {sha: 'abc', label: 'fork:feat'}};
  let rebases = 0, merges = 0, behind = 0, fresh = {...dirty, mergeable: true};
  const conflict = () => {rebases++; return {ok: false, files: ['README.md'], message: 'Rebase conflicts (aborted):\n- README.md'};};
  const gh3 = {rest: {pulls: {get: async () => ({data: rebases ? fresh : dirty}), updateBranch: async p => {merges++; assert.equal(p.expected_head_sha, 'abc');}},
    issues: {createComment: async () => {}}, repos: {compareCommits: async () => ({data: {behind_by: behind}})}}};
  failure = false;
  await run({github: gh3, context: {repo: {}}, core, numbers: '420', mode: true, rebase: conflict});
  assert.equal(failure, false);
  assert.equal(rebases, 0);
  assert.equal(merges, 0);
  // Behind + rebase conflict without merge-fallback still fails (unchanged default).
  behind = 3;
  await run({github: gh3, context: {repo: {}}, core, numbers: '420', mode: true, rebase: conflict});
  assert.equal(failure, true);
  assert.equal(rebases, 1);
  assert.equal(merges, 0);
  // merge-fallback: conflict + GitHub says mergeable -> non-force merge update, no failure.
  failure = false; rebases = 0;
  await run({github: gh3, context: {repo: {}}, core, numbers: '420', mode: true, mergeFallback: true, rebase: conflict});
  assert.equal(failure, false);
  assert.equal(merges, 1);
  // merge-fallback but GitHub says not mergeable -> fails, no merge update.
  rebases = 0; fresh = {...dirty, mergeable: false};
  await run({github: gh3, context: {repo: {}}, core, numbers: '420', mode: true, mergeFallback: true, rebase: conflict});
  assert.equal(failure, true);
  assert.equal(merges, 1);
  // compare API error -> warn and attempt the rebase as before.
  failure = false; rebases = 0;
  gh3.rest.repos.compareCommits = async () => {throw Error('boom');};
  await run({github: gh3, context: {repo: {}}, core, numbers: '420', mode: true, rebase: () => {rebases++; return {ok: true, message: 'ok'};}});
  assert.equal(rebases, 1);
  assert.equal(failure, false);
  github.rest.pulls.get = async () => ({data: {...pr, mergeable: null, mergeable_state: 'unknown'}});
  await assert.rejects(details(github, {}, async () => {}), /six attempts/);
  console.log('targeted auto-rebase tests: ok');
})().catch(e => {console.error(e); process.exitCode = 1;});
