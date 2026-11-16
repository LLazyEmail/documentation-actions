# Deprecation notices

Long reusable-workflow names remain supported on `@v1`.
Prefer the short-name aliases in new callers.
They will be removed in v3 after a v2 transition period.

| Long name (still works) | Prefer |
|-------------------------|--------|
| `reusable-docusaurus-pages-deploy` | `reusable-pages-deploy` |
| `reusable-docusaurus-test-deploy` | `reusable-test-deploy` |
| `reusable-readme-docs-sync-check` | `reusable-readme-sync` |
| `reusable-comment-readme-only` | `reusable-readme-only` |
| `reusable-label-conflicted-prs` | `reusable-label-conflicts` |
| `reusable-pr-status-report` | `reusable-pr-report` |
| `reusable-thin-content-check` | `reusable-thin-content` |
| `reusable-build-image-check` | `reusable-image-check` |
| `reusable-awesome-entry-format-check` | `reusable-entry-format` |

See `docs/naming.md` and `docs/v2-migration.md`.
