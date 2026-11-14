# Naming guide

## Current convention

- Composite actions: `actions/<short-name>/`
- Reusable workflows: `.github/workflows/reusable-<name>.yml`
- Examples: `examples/<name>.yml` (thin callers)

## Problem: overly long names

Several reusable workflows and paths are longer than necessary. This increases typing, reduces scanability in consumer YAML, and makes agent generation more error-prone.

### Proposed shorter names (for v2)

| Current | Proposed (alias available) | Notes |
|---------|----------------------------|-------|
| `reusable-docusaurus-pages-deploy` | `reusable-pages-deploy` | Alias added |
| `reusable-docusaurus-test-deploy` | `reusable-test-deploy` | Planned |
| `reusable-readme-docs-sync-check` | `reusable-readme-sync` | Alias added |
| `reusable-comment-readme-only` | `reusable-readme-only` | Planned |
| `reusable-label-conflicted-prs` | `reusable-label-conflicts` | Planned |
| `reusable-pr-status-report` | `reusable-pr-report` | Planned |
| `reusable-thin-content-check` | `reusable-thin-content` | Planned |
| `reusable-build-image-check` | `reusable-image-check` | Planned |
| `reusable-awesome-entry-format-check` | `reusable-entry-format` | Planned |

Short-name aliases are thin wrappers that call the original workflows. Both names work. Prefer the short name in new callers.

## Migration plan for v2

1. Introduce the shorter names as aliases (started).
2. Keep the old names working for one major version with deprecation notices.
3. Update all examples and docs to the short names.
4. Consumers pin `@v2` when ready.
5. Remove the long names in v3.

## Rules for new names

- Prefer 2–3 words.
- Avoid redundant domain words when the suite already implies the domain.
- Keep the `reusable-` prefix for workflows so they are easy to identify.
- Action directory names should stay short and kebab-case.

See also `docs/actions-index.md` (append-only inventory).
