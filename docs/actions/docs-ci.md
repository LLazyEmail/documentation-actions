# docs-ci (reusable workflow)

Umbrella docs CI: toggle markdownlint, lychee, Docusaurus build, and optional npm-script checks.

**Path:** `.github/workflows/reusable-docs-ci.yml`

## Preferred for greenfield adoption

Copy `examples/docs-ci.yml` and adjust booleans + globs.

## Agent notes

- Keep triggers and path filters on the **caller**.
- Pass `secrets: inherit` when any sub-job needs write access.
- Pin `@v1`.
