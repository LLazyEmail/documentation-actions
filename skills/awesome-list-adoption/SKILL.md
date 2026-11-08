---
name: awesome-list-adoption
description: Checklist for adopting documentation-actions awesome-list validators and related CI on curated list repositories.
---

# Awesome-list adoption checklist

Use when bringing an awesome-list (or hybrid list + docs site) onto the shared checks.

## Steps

- [ ] Copy `examples/awesome-list-checks.yml`.
- [ ] Select only the checks you need: `entry-format,duplicate-links,sorted-sections`.
- [ ] Keep triggers and path filters on the caller.
- [ ] Do not delete curated content; extend or annotate.
- [ ] Add a smoke PR that only touches the workflow file first.
- [ ] After green, pin `@v1`.

## Agent notes

Scripts live in this repository. No local copies of the validators are required after adoption.
