# Naming guide

## Current convention

- Composite actions: `actions/<short-name>/`
- Reusable workflows: `.github/workflows/reusable-<name>.yml`
- Examples: `examples/<name>.yml` (thin callers)

## Problem: overly long names

Several reusable workflows and paths are longer than necessary. This increases typing, reduces scanability in consumer YAML, and makes agent generation more error-prone.

### Proposed shorter names (for v2)

| Current | Proposed | Notes |
|---------|----------|-------|
| `reusable-docusaurus-pages-deploy` | `reusable-pages-deploy` | Domain is already Docusaurus |
| `reusable-docusaurus-test-deploy` | `reusable-test-deploy` | |
| `reusable-readme-docs-sync-check` | `reusable-readme-sync` | |
| `reusable-comment-readme-only` | `reusable-readme-only` | |
| `reusable-label-conflicted-prs` | `reusable-label-conflicts` | |
| `reusable-pr-status-report` | `reusable-pr-report` | |
| `reusable-thin-content-check` | `reusable-thin-content` | |
| `reusable-build-image-check` | `reusable-image-check` | |
| `reusable-awesome-entry-format-check` | `reusable-entry-format` | |

## Migration plan for v2

1. Introduce the shorter names as new reusable workflows (or aliases).
2. Keep the old names working for one major version with deprecation notices in the workflow files and docs.
3. Update all examples and docs to the short names.
4. Consumers pin `@v2` when ready.
5. Remove the long names in v3.

## Rules for new names

- Prefer 2–3 words.
- Avoid redundant domain words when the suite already implies the domain.
- Keep the `reusable-` prefix for workflows so they are easy to identify.
- Action directory names should stay short and kebab-case.

See also `docs/actions-index.md` (append-only inventory).
