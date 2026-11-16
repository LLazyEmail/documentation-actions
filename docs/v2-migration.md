# v2 migration checklist

## Goal

Introduce cleaner short names while keeping v1 working.

## Steps

1. [x] Document long vs short names (`docs/naming.md`)
2. [x] Add aliases for pages-deploy and readme-sync
3. [x] Add aliases for test-deploy, label-conflicts, pr-report, readme-only
4. [x] Add remaining aliases (thin-content, image-check, entry-format)
5. [x] Update all examples to prefer short names
6. [x] Add deprecation notices to long-named workflows
7. [x] Release notes and consumer adoption guide added (`docs/v2-release.md`)
8. [ ] Merge the major changelog fragment and cut v2.0.0
9. [ ] Open consumer adoption PRs that switch to short names + `@v2`
10. [ ] Remove long names in v3

## Consumer impact

Existing `@v1` callers keep working. New callers should use short names and pin `@v2` after the major is tagged.
