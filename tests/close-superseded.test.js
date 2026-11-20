const assert = require('node:assert/strict');
const {parseSuperseded, run} = require('../actions/close-superseded/close');
const repo = {owner: 'LLazyEmail', repo: 'awesome-email-marketing'};
(async () => {
  assert.deepEqual(parseSuperseded('Supersedes #421\n\nOriginal PR: ...', repo, 446), [421]);
  assert.deepEqual(parseSuperseded('**Supersedes:** #1, #2 and #3', repo, 9), [1, 2, 3]);
  assert.deepEqual(parseSuperseded('- Supersedes https://github.com/LLazyEmail/awesome-email-marketing/pull/5', repo, 9), [5]);
  assert.deepEqual(parseSuperseded('Supersedes https://github.com/other/repo/pull/5', repo, 9), []);
  assert.deepEqual(parseSuperseded('Closes #4\nThis PR supersedes nothing #7', repo, 9), [], 'only lines that start with Supersedes');
  assert.deepEqual(parseSuperseded('Supersedes #9', repo, 9), [], 'never closes itself');
  assert.deepEqual(parseSuperseded(null, repo, 9), []);

  const summary = {addHeading() {return this;}, addList() {return this;}, async write() {}};
  const core = {summary, info() {}, warning() {}};
  const calls = [];
  const prs = {421: {state: 'open', user: {login: 'Romacode71'}}, 400: {state: 'closed'}};
  const github = {rest: {
    pulls: {get: async ({pull_number}) => { if (!prs[pull_number]) { const e = new Error('Not Found'); e.status = 404; throw e; } return {data: prs[pull_number]}; },
      update: async p => calls.push(['close', p.pull_number, p.state])},
    issues: {createComment: async p => calls.push(['comment', p.issue_number, p.body])},
  }};
  const ctx = (merged, body) => ({repo, payload: {pull_request: {number: 446, merged, body}}});
  assert.deepEqual(await run({github, context: ctx(false, 'Supersedes #421'), core}), []);
  assert.equal(calls.length, 0, 'closed-without-merge does nothing');
  const closed = await run({github, context: ctx(true, 'Supersedes #421, #400, #12'), core,
    comment: 'Closed in favour of #{merged}. Thanks @{author}!'});
  assert.deepEqual(closed, [421]);
  assert.deepEqual(calls, [['comment', 421, 'Closed in favour of #446. Thanks @Romacode71!'], ['close', 421, 'closed']]);
  console.log('close-superseded tests: ok');
})().catch(e => {console.error(e); process.exitCode = 1;});
