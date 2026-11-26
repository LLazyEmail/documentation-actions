// Visibility of PRs a sweep cannot fix (fuck-ecoflow #149): the conflict label on skipped
// conflicting PRs, opt-in fail-on-skipped-conflicts, opt-in failing-checks report and label,
// and the overview table in the job summary. Mocked GitHub API only.
const assert = require('node:assert/strict');
const {run, failingChecks} = require('../actions/auto-rebase/rebase');

function harness(prs, {checkRuns = {}, checksStatus = 200, statuses = {}} = {}) {
  const st = {added: [], removed: [], warnings: [], errors: [], failed: false, tables: [], checksCalls: 0, comments: 0};
  const byNumber = Object.fromEntries(prs.map(p => [p.number, p]));
  const github = {
    paginate: async (fn, params) => {
      if (fn === 'list') return prs.map(p => ({number: p.number}));
      if (fn === 'checks') {
        st.checksCalls++;
        if (checksStatus !== 200) { const e = new Error('Resource not accessible by integration'); e.status = checksStatus; throw e; }
        return checkRuns[params.ref] || [];
      }
      throw new Error('unexpected paginate');
    },
    rest: {
      pulls: {list: 'list', get: async ({pull_number}) => ({data: byNumber[pull_number]}), updateBranch: async () => {}},
      issues: {
        addLabels: async ({issue_number, labels}) => st.added.push([issue_number, ...labels]),
        removeLabel: async ({issue_number, name}) => st.removed.push([issue_number, name]),
        createComment: async () => { st.comments++; },
      },
      checks: {listForRef: 'checks'},
      repos: {
        getCombinedStatusForRef: async ({ref}) => ({data: {statuses: statuses[ref] || []}}),
        compareCommitsWithBasehead: async () => ({data: {behind_by: 0}}),
      },
    },
  };
  const summary = {addHeading() { return this; }, addCodeBlock() { return this; },
    addTable(t) { st.tables.push(t); return this; }, async write() {}};
  const core = {summary, info() {}, warning: m => st.warnings.push(m), error: m => st.errors.push(m), setFailed() { st.failed = true; }};
  return {st, go: opts => run({github, context: {repo: {owner: 'o', repo: 'r'}}, core, numbers: '', ...opts})};
}
const pr = (number, mergeable_state, extra = {}) => ({number, title: `PR ${number}`, state: 'open', mergeable: mergeable_state !== 'dirty',
  mergeable_state, labels: [], head: {sha: `sha${number}`, ref: `b${number}`, repo: {full_name: 'o/r'}}, base: {ref: 'main', repo: {full_name: 'o/r'}}, user: {login: 'atherdon', type: 'User'}, ...extra});

(async () => {
  // 1. Defaults (like fuck-ecoflow): a conflicting PR is skipped with a warning, the run stays
  // green, no label, no comment, no checks API call, and the overview table lists it.
  let h = harness([pr(149, 'dirty'), pr(100, 'clean')]);
  await h.go({});
  assert.equal(h.st.failed, false);
  assert.equal(h.st.added.length, 0);
  assert.equal(h.st.comments, 0);
  assert.equal(h.st.checksCalls, 0);
  assert.ok(h.st.warnings.some(w => /#149: Skipped: conflicts/.test(w)));
  assert.ok(h.st.warnings.some(w => /1 open PR\(s\) still have merge conflicts and were skipped: #149/.test(w)));
  const table = h.st.tables[0];
  assert.equal(table.length, 3, 'header + 2 rows');
  assert.equal(table[0].length, 3, 'no checks column by default');
  assert.deepEqual(table.slice(1).map(r => [r[0], r[1]]), [['#149 PR 149', 'conflict (skipped)'], ['#100 PR 100', 'up to date']]);

  // 2. conflict-label now also labels PRs the sweep skips (it used to return before labelling).
  h = harness([pr(149, 'dirty'), pr(100, 'clean', {labels: [{name: 'has-conflicts'}]})]);
  await h.go({conflictLabel: 'has-conflicts'});
  assert.deepEqual(h.st.added, [[149, 'has-conflicts']]);
  assert.deepEqual(h.st.removed, [[100, 'has-conflicts']], 'label removed once the PR is clean');
  assert.equal(h.st.failed, false);


  // 4. Opt-in fail-on-skipped-conflicts: red run, error annotation, no aggregate warning.
  h = harness([pr(149, 'dirty')]);
  await h.go({failOnSkippedConflicts: true});
  assert.equal(h.st.failed, true);
  assert.ok(h.st.errors.some(e => /#149: Skipped: conflicts/.test(e)));
  assert.ok(!h.st.warnings.some(w => /were skipped/.test(w)));

  // 5. Opt-in report-failing-checks with a token that can read checks: names + label + column.
  h = harness([pr(150, 'unstable'), pr(100, 'clean', {labels: [{name: 'checks-failing'}]})], {
    checkRuns: {sha150: [{name: 'build / Test build', conclusion: 'failure'}, {name: 'lint', conclusion: 'success'}]},
    statuses: {sha150: [{context: 'ci/legacy', state: 'error'}]},
  });
  await h.go({reportFailingChecks: true, failingChecksLabel: 'checks-failing'});
  assert.ok(h.st.warnings.some(w => /#150: checks not green on sha150: build \/ Test build, ci\/legacy/.test(w)));
  assert.deepEqual(h.st.added, [[150, 'checks-failing']]);
  assert.deepEqual(h.st.removed, [[100, 'checks-failing']]);
  assert.equal(h.st.failed, false, 'reporting checks never fails the run');
  assert.equal(h.st.tables[0][0].length, 4);
  assert.match(h.st.tables[0][1][3], /build \/ Test build/);
  assert.equal(h.st.tables[0][2][3], '—');

  // 6. Default reusable-workflow token (no checks: read): falls back to mergeable_state.
  h = harness([pr(150, 'unstable'), pr(100, 'clean')], {checksStatus: 403});
  await h.go({reportFailingChecks: true});
  assert.ok(h.st.warnings.some(w => /#150: checks not green.*mergeable_state unstable/.test(w)));
  assert.ok(!h.st.warnings.some(w => /#100: checks/.test(w)));
  assert.ok(!h.st.warnings.some(w => /could not read checks/.test(w)), '403 is expected, not warned');

  // 7. failingChecks unit: no red runs -> null.
  const gh = {paginate: async () => [{name: 'ok', conclusion: 'success'}],
    rest: {checks: {listForRef: 'x'}, repos: {getCombinedStatusForRef: async () => ({data: {statuses: []}})}}};
  assert.equal(await failingChecks(gh, {}, pr(1, 'clean'), {warning() {}}), null);

  console.log('auto-rebase-visibility: ok');
})().catch(err => { console.error(err); process.exit(1); });
