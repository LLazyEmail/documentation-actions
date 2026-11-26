semver: minor
type: Added
auto-rebase: PRs that a run can't fix are now visible. Every run ends with an **Overview** table in the job summary (one row per PR: updated, up to date, conflict (skipped), conflict (reported), conflict, delegated to bot, needs a maintainer, failed), plus one warning that lists the conflicting PRs a sweep skipped. New opt-in inputs, all off by default:
- `fail-on-skipped-conflicts` turns the run red when a sweep skips a conflicting PR.
- `report-failing-checks` warns about PRs whose head checks are red and adds a summary column. Check names need a token with checks read access (for example `AUTO_REBASE_TOKEN`); otherwise `mergeable_state` is used.
- `failing-checks-label` labels those PRs.

Fixed: `conflict-label` was never applied to conflicting PRs that a sweep skipped, or to the `report-conflicts` path, because both returned early. They're labelled now (only when `conflict-label` is set). Found via atherdon/fuck-ecoflow #149.
