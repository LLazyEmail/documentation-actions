'use strict';

// Posts or updates a PR comment summarising a Docusaurus test-deploy build.
// Invoked via actions/github-script from this composite. Marker keeps it idempotent.

const MARKER = '<!-- documentation-actions:docusaurus-build -->';

function buildBody({ warningCount, errorCount, conclusion, runUrl }) {
  const heading = '### Docusaurus build';
  const statusLine =
    conclusion === 'success'
      ? 'Build **succeeded**.'
      : `Build **${conclusion || 'finished'}**.`;
  return [
    MARKER,
    heading,
    '',
    statusLine,
    '',
    `- Warnings surfaced: **${warningCount}**`,
    `- Errors surfaced: **${errorCount}**`,
    `- Run: ${runUrl}`,
    '',
    '_Broken links / anchors / markdown warnings are also listed as check annotations and in the job summary._',
  ].join('\n');
}

async function run({ github, context, core, env = process.env }) {
  if (!context.payload.pull_request) {
    core.info('Not a pull_request event; skipping PR comment.');
    return;
  }

  const warningCount = env.WARNING_COUNT || '0';
  const errorCount = env.ERROR_COUNT || '0';
  const conclusion = env.BUILD_CONCLUSION || 'success';
  const runUrl = `${env.GITHUB_SERVER_URL}/${context.repo.owner}/${context.repo.repo}/actions/runs/${context.runId}`;
  const body = buildBody({ warningCount, errorCount, conclusion, runUrl });
  const issueNumber = context.payload.pull_request.number;

  const comments = await github.paginate(github.rest.issues.listComments, {
    owner: context.repo.owner,
    repo: context.repo.repo,
    issue_number: issueNumber,
    per_page: 100,
  });
  const existing = comments.find(
    (c) => c.user?.type === 'Bot' && c.body?.includes(MARKER),
  );

  if (existing) {
    await github.rest.issues.updateComment({
      owner: context.repo.owner,
      repo: context.repo.repo,
      comment_id: existing.id,
      body,
    });
    core.info(`Updated build comment ${existing.id}`);
  } else {
    await github.rest.issues.createComment({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: issueNumber,
      body,
    });
    core.info('Created build comment');
  }
}

module.exports = { MARKER, buildBody, run };
