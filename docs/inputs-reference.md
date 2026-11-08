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
| `markdownlint-globs` | multiline YAML | docs-ci, root action | Exclude node_modules / build |
| `lychee-args` | flags + paths | docs-ci, root action | Soft-fail by default; accept 403,429 |
| `run-markdownlint` / `run-lychee` / `run-build` | `true` / `false` | docs-ci, root action | Boolean toggles |
| `annotate-log` | `true` (default) | docusaurus-build, test-deploy | Emits annotations + summary |
| `pr-comment` | `false` | test-deploy | Needs `pull-requests: write` |
| `commit-paths` | space-separated | git-push-retry, changelog, docs-index | |
| `build-dir` | `build` or `website/build` | build-image-check | Relative to repo root |
| `base-url` | `/` or `/v-school/` | build-image-check | Path prefix, not full origin |
| `mode` | `fail` or `warn` | build-image-check | |
| `allowlist` | path to text file | build-image-check | Optional |

Always copy from `examples/` and adjust only what differs. Prefer `@v1` (or full SHA) after release.
