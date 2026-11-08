# auto-rebase

Update behind open PR branches (and optionally rebase conflicts).

**Path:** `actions/auto-rebase` + `.github/workflows/reusable-auto-rebase-prs.yml`

## When to use

Schedule + `workflow_dispatch` to keep stacked draft PRs current.

## Key inputs

- `pr-numbers` — optional targeted list
- `rebase-conflicts` — opt-in true rebase (with SHA lease)

## Example

```yaml
on:
  schedule:
    - cron: '0 */6 * * *'
  workflow_dispatch:
permissions:
  contents: write
  pull-requests: write
jobs:
  rebase:
    uses: LLazyEmail/documentation-actions/.github/workflows/reusable-auto-rebase-prs.yml@v1
```

## Agent notes

- Requires `contents: write` + `pull-requests: write`.
- Conflict rebases are opt-in and abort on failure with comments.
