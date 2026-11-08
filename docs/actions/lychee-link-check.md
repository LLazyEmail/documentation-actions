# lychee-link-check

Soft-fail lychee link check with job summary and optional issue creation.

**Path:** `actions/lychee-link-check`

## When to use

Soft-fail by default. Prefer the reusable workflow for whole-job reuse. Create issues only on schedule / workflow_dispatch.

## Inputs

| Input | Required | Default | Description |
| --- | --- | --- | --- |
| `args` | yes | | Paths and flags for lychee |
| `fail` | no | `false` | Whether the step should fail the job |
| `create-issue` | no | `false` | Create/update an issue from the report |
| `issue-title` | no | Link check report (lychee) | |
| `issue-labels` | no | maintenance, links | |

## Example

```yaml
- uses: LLazyEmail/documentation-actions/actions/lychee-link-check@v1
  with:
    args: >-
      --verbose --no-progress --accept 200,204,206,403,429
      README.md 'website/docs/**/*.md'
    create-issue: ${{ github.event_name == 'schedule' }}
```

## Agent notes

- Accept 403/429 for scanners.
- Add `.lychee.toml` excludes for known noisy hosts.
- Soft-fail keeps PRs green while still surfacing the summary.
