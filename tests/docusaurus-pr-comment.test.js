'use strict';

const assert = require('assert');
const { MARKER, buildBody, run } = require('../actions/docusaurus-pr-comment/pr-build-comment.js');

assert.ok(MARKER.includes('documentation-actions'));
const body = buildBody({
  warningCount: '3',
  errorCount: '0',
  conclusion: 'success',
  runUrl: 'https://example.test/run/1',
});
assert.ok(body.includes(MARKER));
assert.ok(body.includes('Warnings surfaced: **3**'));
assert.ok(body.includes('Build **succeeded**.'));

(async () => {
  const comments = [];
  const github = {
    paginate: async () => [],
    rest: {
      issues: {
        listComments: async () => ({ data: [] }),
        createComment: async (args) => {
          comments.push(args);
          return { data: { id: 1 } };
        },
        updateComment: async () => {
          throw new Error('should not update');
        },
      },
    },
  };
  const core = { info: () => {} };
  const context = {
    repo: { owner: 'o', repo: 'r' },
    runId: 99,
    payload: { pull_request: { number: 7 } },
  };
  process.env.GITHUB_SERVER_URL = 'https://github.com';
  process.env.WARNING_COUNT = '1';
  process.env.ERROR_COUNT = '0';
  process.env.BUILD_CONCLUSION = 'success';
  await run({ github, context, core, env: process.env });
  assert.strictEqual(comments.length, 1);
  assert.strictEqual(comments[0].issue_number, 7);
  assert.ok(comments[0].body.includes(MARKER));
  console.log('docusaurus-pr-comment: ok');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
