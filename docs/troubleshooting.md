# Troubleshooting

Common failures when adopting or extending documentation-actions.

## Adoption failures

| Symptom | Cause | Fix |
| --- | --- | --- |
| `uses:` of reusable workflow fails with access denied | Org Actions policy | Allow reusable workflows from `LLazyEmail/documentation-actions` |
| Commit-back job fails to push | Missing permissions or secrets | `contents: write` + `secrets: inherit` |
| Docusaurus build cannot find package.json | Wrong working-directory | Set to `website` or `.` matching the consumer |
| Lockfile cache miss | Wrong cache-dependency-path | Use the repository-relative path to package-lock.json |
| Lychee fails the job | `fail: true` or aggressive args | Keep default soft-fail; accept 403,429 |
| Pages deploy fails intermittently | Known flakiness on some sites | Ignore for adoption PRs; verify once on main |
| `reusable-changelog` fails with `Refusing to run: in-repo config (.auto-changelog ...) sets unsafe options: "output" is absolute or escapes the repository` | auto-changelog 2.7.0+ rejects an in-repo `.auto-changelog` whose `output` points outside the working directory (GHSA-xpvr-2hvx-m8q4), e.g. `"output": "../CHANGELOG.md"` with `working-directory: website` | Drop `output` from `.auto-changelog` if your script writes the file itself from `--stdout`, or pass `--output` on the command line in `generate-command` |
| Lychee reports hundreds of `File not found` / `Cannot resolve root-relative link` errors on a Docusaurus site | Docusaurus links are routes (`/docs/x`, `./page`), not file paths | Add `--root-dir "$GITHUB_WORKSPACE/website" --fallback-extensions md,mdx --index-files index.md,index.mdx,.` to `args` (not `${{ github.workspace }}`, which is empty in reusable-workflow inputs; lychee-action evals `args`, so the shell variable expands); exclude React pages under `src/pages` |
| Excludes in `.lychee.toml` are ignored | lychee only auto-loads `lychee.toml` | Rename the file, or add `--config .lychee.toml` to `args` |
| A weekly lychee run opens a new report issue every week | `create-issue` always creates a new issue | Set `update-existing-issue: true` (opt-in, see `docs/actions/lychee-link-check.md`) once it is released |
| Fork PR: README-only or sync-check comment step logs 403 | `pull_request` runs from forks get a read-only `GITHUB_TOKEN` | Expected; since v2.0.0 the workflows warn and write guidance to the job summary instead of failing |
| Auto-rebase logs `No update required (state: unstable)` for a PR that is behind `main` | GitHub reports failing checks (`unstable`) or `blocked` ahead of `behind` | Fixed in v2.0.1: `unstable`/`blocked` PRs are compared with their base and updated when behind. Callers on `@v1` need `@v2` |
| `star-request` (or another `pull_request_target` workflow) is skipped with "Workflows are being blocked due to a scheduled brownout of the default `pull_request_target` protection" | GitHub's new default blocks `pull_request_target` unless an org Actions event policy allows it | An org admin adds an Actions policy that allows `pull_request_target` for that workflow path only; keep the workflow minimal (no checkout of PR code) |
| Org-owned fork PR cannot be updated by maintainers even with "Allow edits" | GitHub does not allow maintainer pushes to forks owned by an organization | Open a superseding PR from a branch in the base repo, keep the author's `Co-authored-by` trailer, and add `Closes #N` |
| A skipped check is named `docs-ci / inputs.npm-check-job-name` | GitHub prints the raw `name:` expression for a job skipped by `if:`; happens when `run-npm-check` is off (the default) | Harmless and left as is; see [docs-ci](actions/docs-ci.md#why-a-skipped-check-is-called-inputsnpm-check-job-name). For a clean check list call `reusable-npm-script-check.yml` directly |

## Agent mistakes

Mistakes AI agents (and humans copying YAML) make most often.

| Symptom | Cause | Fix |
| --- | --- | --- |
| yamllint `line too long` | A line over 140 characters (often inside `script: \|`) | Break long strings; build messages from arrays or concatenation |
| YAML syntax error inside a `github-script` step | A multi-line JavaScript template literal confuses the YAML block | Use string concatenation or `[...].join('\n')` |
| `Unable to find reusable workflow` / workflow not found | Wrong path, typo in the name, or a short name used on a tag older than the alias | Use the exact file name under `.github/workflows/`, pin `@v2`, and check `docs/naming.md` for the short names |
| Commit-back, pages or star job fails with 403 | Caller did not grant the permissions or `secrets: inherit` | Copy the permissions from the table below onto the calling job |
| The same bot comment appears on every push | Comment step has no idempotency marker | Reuse the marker pattern from `reusable-comment-readme-only.yml` / `docusaurus-pr-comment` |
| Unpinned action fails CI | `actions/...@vN` | Pin to full SHA + `# vX.Y.Z` |
| Missing secrets | Forgot `secrets: inherit` | Add it on commit-back / pages / star workflows |
| Wrong working directory | Layout mismatch | Set `working-directory` to `website` or `.` |
| Duplicate PR comments | No marker | Use the marker pattern from readme-only |

## Permissions the caller must grant

A reusable workflow can only use permissions the calling job grants. Grant at least these on the job that has the `uses:` line:

| Workflow (long or short name) | Caller permissions |
| --- | --- |
| `reusable-docs-ci`, `reusable-docusaurus-test-deploy` / `reusable-test-deploy` | `contents: read`, plus `pull-requests: write` and `issues: write` when `pr-comment: true` |
| `reusable-docusaurus-pages-deploy` / `reusable-pages-deploy` | `contents: write`, `pages: write`, `id-token: write` |
| `reusable-changelog`, `reusable-docs-index`, `reusable-catalog-api` | `contents: write` and `secrets: inherit` |
| `reusable-label-conflicted-prs` / `reusable-label-conflicts` | `pull-requests: write` |
| `reusable-pr-status-report` / `reusable-pr-report` | `issues: write`, `pull-requests: read` |
| `reusable-readme-docs-sync-check` / `reusable-readme-sync` | `pull-requests: write` (checkout with full history is handled inside) |
| `reusable-comment-readme-only` / `reusable-readme-only` | `pull-requests: write` |
| `reusable-star-request` | `pull-requests: write` |

## Workflow-specific

- **docs-ci / test-deploy**: Check Node version and lockfile path.
- **pages-deploy**: Needs `pages: write` + `id-token: write`.
- **label-conflicts**: Needs `pull-requests: write`.
- **pr-report**: Needs `issues: write`.
- **readme-sync**: Needs `pull-requests: write` and fetch-depth 0 (handled inside).

## Short names

Prefer short aliases when available (`reusable-pages-deploy`, `reusable-test-deploy`, `reusable-readme-sync`, `reusable-label-conflicts`, `reusable-pr-report`, `reusable-readme-only`). Both names work.

See also `docs/yaml-ai-rules.md` and `docs/naming.md`.
