# thin-content-check

Report built Docusaurus pages with little main content.

**Path:** `actions/thin-content-check` + `.github/workflows/reusable-thin-content-check.yml`

Full guide: [docs/thin-content-check.md](../thin-content-check.md).

## Agent notes

- Measures only the main article; site chrome and code blocks don't count.
- Defaults to `mode: warn`; use the summary checklist or JSON artifact to file content issues.
- Use `allowlist` for pages that are intentionally short (indexes, galleries).
