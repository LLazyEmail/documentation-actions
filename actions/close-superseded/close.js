// When a PR whose body says "Supersedes #N" is merged, close PR #N with a
// thank-you comment. GitHub's own closing keywords (Closes/Fixes) only close
// issues, never pull requests, so superseded PRs would otherwise stay open.
// Reads only the event payload and the API; never checks out PR code.
function parseSuperseded(body, repo, self) {
  const numbers = new Set();
  const sameRepo = new RegExp(`https://github\\.com/${repo.owner}/${repo.repo}/pull/(\\d+)`, 'gi');
  for (const line of String(body || '').split(/\r?\n/)) {
    const match = /^\s*(?:[-*]\s*)?\**supersedes:?\**:?\s+(.*)$/i.exec(line);
    if (!match) continue;
    for (const m of match[1].matchAll(/(?:^|[\s,(])#(\d+)\b/g)) numbers.add(Number(m[1]));
    for (const m of match[1].matchAll(sameRepo)) numbers.add(Number(m[1]));
  }
  numbers.delete(self);
  return [...numbers].filter(n => n > 0);
}

async function run({github, context, core, comment}) {
  const repo = {...context.repo};
  const merged = context.payload.pull_request;
  if (!merged || !merged.merged) { core.info('Not a merged pull request; nothing to do'); return []; }
  const targets = parseSuperseded(merged.body, repo, merged.number);
  if (!targets.length) { core.info(`#${merged.number} does not supersede any PR`); return []; }
  const closed = [];
  for (const number of targets) {
    try {
      const {data: target} = await github.rest.pulls.get({...repo, pull_number: number});
      if (target.state !== 'open') { core.info(`#${number} is already ${target.state}`); continue; }
      const body = (comment || 'Closed in favour of #{merged}, which superseded this PR and has been merged. Thank you for the contribution!')
        .replaceAll('{merged}', String(merged.number)).replaceAll('{author}', target.user ? target.user.login : 'there');
      await github.rest.issues.createComment({...repo, issue_number: number, body});
      await github.rest.pulls.update({...repo, pull_number: number, state: 'closed'});
      core.info(`#${number}: closed (superseded by #${merged.number})`);
      closed.push(number);
    } catch (err) {
      // 404 = an issue number, not a PR; GitHub's Closes keyword handles issues.
      core.warning(`#${number}: not closed (${err.status === 404 ? 'not a pull request' : err.message})`);
    }
  }
  await core.summary.addHeading('Superseded PRs').addList(closed.map(n => `#${n} closed`)).write();
  return closed;
}
module.exports = {parseSuperseded, run};
