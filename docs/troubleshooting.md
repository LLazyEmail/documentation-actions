# Troubleshooting

Common issues when adopting or working on documentation-actions.

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
| Lychee reports hundreds of `File not found` / `Cannot resolve root-relative link` errors on a Docusaurus site | Docusaurus links are routes (`/docs/x`, `./page`), not file paths | Add `--root-dir "$GITHUB_WORKSPACE/website" --fallback-extensions md,mdx --index-files index.md,index.mdx,.` to `args`; exclude React pages under `src/pages` |
| Excludes in `.lychee.toml` are ignored | lychee only auto-loads `lychee.toml` | Rename the file, or add `--config .lychee.toml` to `args` |
| A weekly lychee run opens a new report issue every week | `create-issue` always creates a new issue | Set `update-existing-issue: true` (opt-in, see `docs/actions/lychee-link-check.md`) once it is released |
| Fork PR: README-only or sync-check comment step logs 403 | `pull_request` runs from forks get a read-only `GITHUB_TOKEN` | Expected; since v2.0.0 the workflows warn and write guidance to the job summary instead of failing |
| Auto-rebase logs `No update required (state: unstable)` for a PR that is behind `main` | GitHub reports failing checks (`unstable`) or `blocked` ahead of `behind` | Fixed in v2.0.1: `unstable`/`blocked` PRs are compared with their base and updated when behind. Callers on `@v1` need `@v2` |
| `star-request` (or another `pull_request_target` workflow) is skipped with "Workflows are being blocked due to a scheduled brownout of the default `pull_request_target` protection" | GitHub's new default blocks `pull_request_target` unless an org Actions event policy allows it | An org admin adds an Actions policy that allows `pull_request_target` for that workflow path only; keep the workflow minimal (no checkout of PR code) |
| Org-owned fork PR cannot be updated by maintainers even with "Allow edits" | GitHub does not allow maintainer pushes to forks owned by an organization | Open a superseding PR from a branch in the base repo, keep the author's `Co-authored-by` trailer, and add `Closes #N` |

## In this repository

| Symptom | Cause | Fix |
| --- | --- | --- |
| Changelog check fails | Missing `.changelog/` file | Add fragment or label `skip-changelog` |
| Stacked PR conflict on index | Edited existing row | Append only one new row |
| YAML lint fails | Unpinned third-party action | Pin to full SHA with `# vX.Y.Z` |

See also the skill at `skills/troubleshooting/SKILL.md` and `docs/ai-agent-guide.md`.
