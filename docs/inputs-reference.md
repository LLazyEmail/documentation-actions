# Inputs reference

Common inputs used across documentation-actions composites and reusable workflows.

| Input | Typical values | Used by | Notes |
| --- | --- | --- | --- |
| `working-directory` | `website` or `.` | build, docs-ci, pages-deploy, npm-script-check, build-image-check | Where `package.json` lives |
| `node-version` | `22` (default), `20`, `24` | most build workflows | Align with `.nvmrc` |
| `cache-dependency-path` | `website/package-lock.json` | build workflows | Repository-relative lockfile |
| `install-command` | `npm ci` | build workflows | |
| `build-command` | `npm run build` | build workflows | |
| `prebuild-command` | empty or `npm run lint:docs-links` | build, docs-ci | Empty skips |
| `fetch-depth` | `0` (default, full history) or `1` | docs-ci, test-deploy, npm-script-check | Earlier releases: test-deploy accepted it but always used `0` |
| `markdownlint-globs` | multiline YAML | docs-ci, root action | Exclude node_modules / build |
| `lychee-args` | flags + paths | docs-ci, root action | Soft-fail by default; accept 403,429 |
| `docusaurus-root` | `website` or empty | lychee-link-check, reusable-link-check | Empty skips. When set, resolves Docusaurus `/docs/...` and extensionless local links |
| `config-file` | `.lychee.toml` or empty | lychee-link-check, reusable-link-check | Empty skips. Passes `--config` when the file exists; needed because lychee only auto-loads `lychee.toml` |
| `run-markdownlint` / `run-lychee` / `run-build` | `true` / `false` | docs-ci, root action | Boolean toggles |
| `annotate-log` | `true` (default) | docusaurus-build, test-deploy | Emits annotations + summary |
| `pr-comment` | `false` | test-deploy | Needs `pull-requests: write` |
| `commit-paths` | space-separated | git-push-retry, changelog, docs-index | |
| `max-attempts` | `5` (default) | git-push-retry | Push attempts; between attempts it runs `git pull --rebase --autostash origin main` |
| `build-dir` | `build` or `website/build` | build-image-check | Relative to repo root |
| `base-url` | `/` or `/v-school/` | build-image-check | Path prefix, not full origin |
| `mode` | `fail` or `warn` | build-image-check | |
| `allowlist` | path to text file | build-image-check | Optional |
| `merge-fallback` | `false` / `true` | auto-rebase, reusable-auto-rebase-prs | With `rebase-conflicts`, merge update instead of failing when the rebase conflicts but GitHub says mergeable |
| `supersede-fork-prs` | `false` / `true` | auto-rebase, reusable-auto-rebase-prs | Fork PRs that conflict or can't be updated: replay into `supersede/pr-N` and open a PR starting with `Supersedes #N` |
| `supersede-union-paths` | `''` / `README.md website/docs/**/*.md` | auto-rebase, reusable-auto-rebase-prs | Addition-only conflicts in these globs keep both sides |
| `supersede-draft` | `true` / `false` | auto-rebase, reusable-auto-rebase-prs | Open supersede PRs as drafts |
| `supersede-sync-message` | thank-you text | auto-rebase, reusable-auto-rebase-prs | Comment on the contributor's PR after a sync; `{author}`, `{sha}`, `{supersede}`, `{number}` placeholders; empty uses the default |
| `resolve-deleted-on-main` | `false` / `true` | auto-rebase, reusable-auto-rebase-prs | Accept base-branch deletions of files the PR only modified (within `resolve-deleted-paths`) during rebase / merge-fallback |
| `resolve-deleted-paths` | `.github/workflows/**` | auto-rebase, reusable-auto-rebase-prs | Globs for `resolve-deleted-on-main` |
| `fail-on-conflict` | `true` / `false` | auto-rebase, reusable-auto-rebase-prs | `false`: unresolvable conflicts are a warning, not a failed job |
| `conflict-label` | `''` / `has-conflicts` | auto-rebase, reusable-auto-rebase-prs | Label PRs with unresolvable conflicts; removed after an update |
| `delegate-bot-rebase` | `false` / `true` | auto-rebase, reusable-auto-rebase-prs | Renovate/Dependabot PRs that are behind or conflicting: ask the bot to rebase instead of updating the branch |
| `label` | `needs-docs-sync` | docs-sync-feedback, reusable-sync-feedback | Label while README changes lack docs; empty disables |
| `post-comment` | `true` / `false` | reusable-readme-sync, reusable-readme-docs-sync-check | `false` leaves the comment to reusable-sync-feedback |
| `comment` | thank-you text | close-superseded, reusable-close-superseded-prs | Comment before closing; `{merged}` and `{author}` placeholders |

Always copy from `examples/` and adjust only what differs. Prefer `@v1` (or full SHA) after release.
