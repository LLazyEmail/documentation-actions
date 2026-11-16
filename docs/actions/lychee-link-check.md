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
| `update-existing-issue` | no | `false` | With `create-issue`, update the newest open issue titled `issue-title` instead of opening a new one each run |
| `issue-labels` | no | maintenance, links | |

## Example

```yaml
- uses: LLazyEmail/documentation-actions/actions/lychee-link-check@v1
  with:
    args: >-
      --verbose --no-progress --accept 200,204,206,403,429
      README.md 'website/docs/**/*.md'
    create-issue: ${{ github.event_name == 'schedule' }}
    # Opt in to one rolling report issue instead of a new issue every week:
    update-existing-issue: true
```

The reusable workflow (`reusable-link-check.yml`) exposes the same
`update-existing-issue` boolean input. Without it, a weekly schedule opens a
new `Link check report (lychee)` issue every week and the old ones stay open.

## Agent notes

- Accept 403/429 for scanners.
- Add excludes for known noisy hosts in a lychee config file. lychee only
  auto-loads `lychee.toml`; a file named `.lychee.toml` must be passed with
  `--config .lychee.toml` in `args`.
- Docusaurus sites: root-relative (`/docs/...`) and extensionless (`./page`)
  links fail as local files unless `args` include
  `--root-dir "$GITHUB_WORKSPACE/website" --fallback-extensions md,mdx`
  (lychee-action evals `args`, so the shell variable expands on the runner;
  `${{ github.workspace }}` is empty when passed through a reusable workflow)
  (and `--index-files index.md,index.mdx,.` for category folders).
- Soft-fail keeps PRs green while still surfacing the summary.
