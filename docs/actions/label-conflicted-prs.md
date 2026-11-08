# label-conflicted-prs

Label open PRs with `has-conflicts` when `mergeable_state` is dirty; remove the label when clean.

**Path:** `.github/workflows/reusable-label-conflicted-prs.yml`

## When to use

Schedule + push to main + workflow_dispatch. Requires `pull-requests: write`.

## Example

See `examples/label-conflicted-prs.yml`.

## Agent notes

- Label name is fixed (`has-conflicts`).
- Runs on the caller’s schedule; keep triggers on the caller.
