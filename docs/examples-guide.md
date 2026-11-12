# Examples guide

Thin callers under `examples/` are the source of truth. Always start by copying one.

| Example | Prefer when |
| --- | --- |
| `docs-ci.yml` | Greenfield docs CI (lint + links + build) |
| `test-deploy.yml` | PR build only |
| `deploy-pages.yml` / `deploy-peaceiris.yml` | Pages deploy |
| `link-check.yml` | Soft-fail lychee |
| `markdown-lint.yml` | Markdownlint only |
| `awesome-list-checks.yml` | Curated list validators |
| `changelog.yml` | Commit-back changelog |
| `docs-index.yml` | Pages-index regenerate |
| `auto-rebase-prs.yml` | Keep stacked PRs current |
| `star-request.yml` | Thank-you comment on opened PRs |
| `npm-script-check.yml` | Prettier / i18n / images / typecheck |
| `build-image-check.yml` | Built-site image validation |
| `thin-content-check.yml` | Pages with little content (weekly, warn) |
| `git-push-retry-step.yml` | Standalone commit-and-push step |
| `docusaurus-build-step.yml` | Standalone build step |

## Agent rules

1. Copy the matching example.
2. Keep triggers, path filters, and permissions on the caller.
3. Adjust only the `with:` inputs that differ.
4. Add `secrets: inherit` when the workflow needs write access.
5. Pin `@v1` (or SHA) after the first release.

See also `docs/actions/` and `skills/`.
