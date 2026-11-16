# v2 migration checklist

## Goal

Introduce cleaner short names while keeping v1 working.

## Steps

1. [x] Document long vs short names (`docs/naming.md`)
2. [x] Add aliases for pages-deploy and readme-sync
3. [x] Add aliases for test-deploy, label-conflicts, pr-report, readme-only
4. [ ] Add remaining aliases (thin-content, image-check, entry-format)
5. [ ] Update all examples to prefer short names
6. [ ] Add deprecation notices to long-named workflows
7. [ ] Release v2
8. [ ] Open consumer adoption PRs that switch to short names + `@v2`
9. [ ] Remove long names in v3

## Consumer impact

Existing `@v1` callers keep working. New callers should use short names.
