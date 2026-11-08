# pr-status-report

Weekly (or on-demand) summary of open PRs posted to a tracking issue.

**Path:** `.github/workflows/reusable-pr-status-report.yml`

## When to use

Schedule + workflow_dispatch. Requires `issues: write`.

## Example

See `examples/pr-status-report.yml`.

## Agent notes

- Creates or updates an issue labeled `pr-status-report`.
- Keep triggers on the caller.
