# build-image-check

Validate local image references in a built HTML/CSS site.

**Path:** `actions/build-image-check` + `.github/workflows/reusable-build-image-check.yml`

Full guide: [docs/build-image-check.md](../build-image-check.md).

## Agent notes

- `build-dir` is relative to repo root.
- `base-url` is the path prefix (e.g. `/v-school/`).
- Prefer step-level reuse after an existing build job when possible.
- Soften with `mode: warn` during adoption.
