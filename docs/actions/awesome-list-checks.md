# awesome-list-checks

Entry-format, duplicate-links, and sorted-sections validators for curated lists.

**Path:** `actions/awesome-list-checks`

Scripts live in this repo; consumers do not need local copies.

## Usage

Prefer the reusable workflow:

```yaml
jobs:
  checks:
    uses: LLazyEmail/documentation-actions/.github/workflows/reusable-awesome-list-checks.yml@v1
    with:
      checks: entry-format,duplicate-links,sorted-sections
```

## Agent notes

- Never delete curated content; extend or annotate.
- Keep checks focused; do not mix with unrelated reformats.
