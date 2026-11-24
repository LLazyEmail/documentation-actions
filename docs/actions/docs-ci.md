# docs-ci (reusable workflow)

Umbrella docs CI: toggle markdownlint, lychee, Docusaurus build, and optional npm-script checks.

**Path:** `.github/workflows/reusable-docs-ci.yml`

## Preferred for greenfield adoption

Copy `examples/docs-ci.yml` and adjust booleans + globs.

```yaml
jobs:
  docs-ci:
    uses: LLazyEmail/documentation-actions/.github/workflows/reusable-docs-ci.yml@v2
    with:
      working-directory: website
      cache-dependency-path: website/package-lock.json
      run-markdownlint: true
      markdownlint-globs: |
        website/docs/**/*.md
      run-build: true
    secrets: inherit
```

## Inputs

| Input | Type | Default | Notes |
| --- | --- | --- | --- |
| `working-directory` | string | `website` | Where `package.json` lives |
| `node-version` | string | `22` | |
| `cache-dependency-path` | string | `website/package-lock.json` | |
| `install-command` | string | `npm ci` | |
| `build-command` | string | `npm run build` | |
| `prebuild-command` | string | empty | Empty skips |
| `fetch-depth` | number | `0` | Opt-in. Commits to fetch in the build and npm-check checkouts. `0` (the default) is full history, as before; `1` is a shallow, faster clone. Keep `0` if the site uses `showLastUpdateTime` / `showLastUpdateAuthor` (they read git history). Also accepted, and now passed on, by `reusable-docusaurus-test-deploy` / `reusable-test-deploy` |
| `lfs` | boolean | `false` | Check out Git LFS objects (build and npm-check jobs) |
| `run-build` | boolean | `true` | Docusaurus test build |
| `annotate-log` | boolean | `true` | Build warnings/errors as annotations + summary |
| `pr-comment` | boolean | `false` | PR comment with build counts; caller needs `pull-requests: write` |
| `run-markdownlint` | boolean | `false` | Requires `markdownlint-globs` |
| `markdownlint-globs` | string | empty | Multiline globs |
| `run-lychee` | boolean | `false` | Requires `lychee-args` |
| `lychee-args` | string | empty | Flags + paths |
| `lychee-create-issue` | boolean | `false` | Open an issue with the report |
| `run-npm-check` | boolean | `false` | Requires `npm-check-command` |
| `npm-check-command` | string | empty | e.g. `npm run check:images -- --strict` |
| `npm-check-job-name` | string | `npm script check` | Check name for the npm-check job |

## Check names

The caller's job id is the prefix, e.g. `docs-ci / Test build`.

| Job | Check name | Runs when |
| --- | --- | --- |
| markdownlint | `markdownlint` | `run-markdownlint: true` |
| lychee | `lychee` | `run-lychee: true` |
| npm-check | value of `npm-check-job-name` | `run-npm-check: true` |
| build | `Test build` | `run-build: true` |

### Why a skipped check is called `inputs.npm-check-job-name`

When `run-npm-check` is false (the default), the npm-check job is skipped and
GitHub shows it as `<caller> / inputs.npm-check-job-name`. GitHub does not
evaluate a job's `name:` expression for a job skipped by its `if:`, so it
prints the raw expression. This is cosmetic: the check is "skipped", never
fails, and is not required.

It is left as is on purpose. The only fixes are to make the job always start
(and skip its steps), which adds a runner job and a new green check to every
docs-ci caller, or to hard-code the name, which would rename the check for
callers who set `npm-check-job-name`. Neither fits the "don't change existing
callers" rule. For a clean check list, call `reusable-npm-script-check.yml`
directly with `job-name:` instead of using `run-npm-check` here.

## Agent notes

- Keep triggers and path filters on the **caller**.
- Pass `secrets: inherit` when any sub-job needs write access.
- Pin `@v2`.
