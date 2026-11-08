# star-request

Thank contributors and ask for a star on newly opened PRs.

**Path:** `actions/star-request` + `.github/workflows/reusable-star-request.yml`

## When to use

Use the reusable workflow on `pull_request_target` (opened). Requires `pull-requests: write`.

## Example

```yaml
on:
  pull_request_target:
    types: [opened]
permissions:
  pull-requests: write
jobs:
  comment:
    uses: LLazyEmail/documentation-actions/.github/workflows/reusable-star-request.yml@v1
```

## Agent notes

- `pull_request_target` runs with elevated permissions; keep the workflow minimal.
- Skip for bots / maintainers is already handled.
