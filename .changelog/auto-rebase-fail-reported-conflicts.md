semver: minor
type: Changed
auto-rebase: `fail-on-skipped-conflicts: true` now also fails the run when conflicting PRs are reported with `report-conflicts` (one comment per head SHA), not only when a sweep skips them. A reported conflict is still an open conflict. It stays off by default. Callers that don't set it, and callers that set it without `report-conflicts`, behave as before.

Docs: `docs/auto-rebase.md` gains an "AUTO_REBASE_TOKEN permissions" section listing the fine-grained token permissions.
