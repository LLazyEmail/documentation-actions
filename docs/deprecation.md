# Deprecation notices

Long reusable-workflow names remain supported on `@v1` and **for all of v2**.
Prefer the short-name aliases in new callers.

> Decided 2026-11-23 (#181): the long names stay for the whole of v2, with no removal date.
> They can only go in a future major, after a code search shows no caller still uses them.
> The earlier plan ("removed in v3 after a v2 transition period") is replaced by this.

<!-- generated: alias table from workflows.manifest.yml (scripts/gen-workflows.py); edit the manifest, not this table -->

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
| `reusable-npm-script-check` | `reusable-npm-check` |
| `reusable-auto-rebase-prs` | `reusable-auto-rebase` |
| `reusable-close-superseded-prs` | `reusable-close-superseded` |
| `reusable-awesome-list-checks` | `reusable-awesome-checks` |

<!-- end generated -->

See `docs/naming.md` and `docs/v2-migration.md`.
