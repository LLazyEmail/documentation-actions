---
name: adoption-patterns
description: Focused checklist of the most common consumer adoption patterns for documentation-actions.
---

# Common adoption patterns

Use this skill when adopting one or more workflows into an existing or new Docusaurus / awesome-list repo.

## Pattern: greenfield docs CI

- Copy `examples/docs-ci.yml`.
- Set `working-directory`, lockfile path, Node version, globs.
- Enable only the checks you need via booleans.
- Pin `@v1`.

## Pattern: existing build job + image check

- Prefer step-level `actions/build-image-check@v1` after the existing build.
- Start with `mode: warn`.
- Set `build-dir` relative to repo root and correct `base-url`.

## Pattern: commit-back (changelog / docs-index / catalog)

- Copy the matching example.
- `contents: write` + `secrets: inherit`.
- Match `commit-paths` exactly.

## Pattern: stacked draft adoption

- Use `examples/auto-rebase-prs.yml` so drafts stay current.
- Keep each adoption PR small and draft.
- Link the documentation-actions PR in the body.

## Agent rules

- Copy, don't invent.
- Keep triggers and permissions on the caller.
- Never leave production on `@main`.
- Do not merge unless asked.
