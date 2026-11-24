# Naming guide

## Current convention

- Composite actions: `actions/<short-name>/`
- Reusable workflows: `.github/workflows/reusable-<name>.yml`
- Examples: `examples/<name>.yml` (thin callers)

## Problem: overly long names

Several reusable workflows and paths are longer than necessary. This increases typing, reduces scanability in consumer YAML, and makes agent generation more error-prone.

### Short-name aliases (available)

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

`reusable-sync-feedback` was born short and has no long name.

**Check names.** A caller of an alias sees one more level in the check name (for example
`npm / call / npm-script-check` instead of `npm / npm-script-check`). If a branch protection
rule requires the old check name, update the rule when you switch the caller.

Short-name aliases are thin wrappers that call the original workflows (or, for `reusable-test-deploy`, the same `reusable-docs-ci.yml` the long name calls). Both names work and accept the same inputs. Prefer the short name in new callers.

`tests/short-name-aliases.test.sh` reads this table and fails CI if a listed workflow file is missing or an alias does not accept every input of its long name. The table is generated from `workflows.manifest.yml`: add the alias there and run the generator, not by hand here.

Since 2026-11-23 the alias files are **generated** from `workflows.manifest.yml` by `scripts/gen-workflows.py` (each copies its long name's `workflow_call` block and forwards every input). The generator also writes this table and the one in `docs/deprecation.md`. See CONTRIBUTING.md, "edit the manifest, run the generator".

> Until the release that includes this note, `reusable-test-deploy`, `reusable-readme-only` and `reusable-pr-report` were listed here but the files did not exist, so callers using them failed with "workflow not found". Use the long names on tags older than that release.

## Migration plan for v2

1. Introduce the shorter names as aliases (done).
2. Keep the old names working for one major version with deprecation notices.
3. Update all examples and docs to the short names.
4. Consumers pin `@v2` when ready.
5. Remove the long names in v3.

## Rules for new names

- Prefer 2–3 words.
- Avoid redundant domain words when the suite already implies the domain.
- Keep the `reusable-` prefix for workflows so they are easy to identify.
- Action directory names should stay short and kebab-case.

See also `docs/actions-index.md` and `docs/deprecation.md`.
