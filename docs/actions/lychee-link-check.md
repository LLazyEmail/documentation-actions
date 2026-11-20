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
| `docusaurus-root` | no | empty | Workspace-relative site root (for example `website`). When set, appends `--root-dir $GITHUB_WORKSPACE/<value> --fallback-extensions md,mdx --index-files index.md,index.mdx,.` |
| `config-file` | no | empty | When set and the file exists, pass `--config <path>`. Needed for `.lychee.toml`, which lychee does not auto-load |

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

The reusable workflow (`reusable-link-check.yml`) exposes the same
`docusaurus-root` and `config-file` inputs, both defaulting to empty so
existing callers stay unchanged.

## Docusaurus sites

Root-relative links such as `/docs/strategy/building-an-email-list` and
extensionless links such as `./github-frameworks` fail as local files
unless you set `docusaurus-root` to the site directory (usually
`website`). The action expands `$GITHUB_WORKSPACE` on the runner, so
callers do not need to pass an absolute path — and should not use
`${{ github.workspace }}` in the reusable-workflow inputs, which comes
through empty.

Repo-specific skips (for example a React page like `/explore`) stay in
`args` or the lychee config, not in these inputs.

```yaml
jobs:
  lychee:
    uses: LLazyEmail/documentation-actions/.github/workflows/reusable-link-check.yml@v2
    with:
      args: >-
        --verbose --no-progress --accept 200,204,206,403,429
        --exclude '^file://.*/website/explore'
        README.md 'website/docs/**/*.md' 'website/docs/**/*.mdx'
      docusaurus-root: website
      config-file: .lychee.toml
```
