# v2 migration checklist

## Goal

Introduce cleaner short names while keeping v1 working.

## Steps

1. [x] Document long vs short names
2. [x] Add all short-name aliases
3. [x] Update examples and add deprecation notices
4. [x] Release notes and consumer adoption guide
5. [x] Cut v2.0.0
6. [ ] Open consumer adoption PRs (short names + `@v2`)
7. [ ] Adopt reusable-docs-suite on greenfield / new sites
8. [ ] Remove long names in v3

## Consumer impact

Existing `@v1` callers keep working. New sites should start with `reusable-docs-suite@v2`.
