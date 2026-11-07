# Build image check

Builds the caller's site and checks local image references in HTML (`img`,
`source`, srcset, inline styles) and CSS. No deployment or external HTTP checks.
Validates presence, non-empty files, magic bytes, and Git LFS pointers; this is
not a full image decoder or browser-rendering test. HTML extraction is deliberately
lightweight (quoted attributes); complex data-URI srcsets are not supported.

## Minimal caller

Available at `@v1` after this change is merged and released normally:

```yaml
name: Build images
on: [pull_request, workflow_dispatch]
permissions:
  contents: read
jobs:
  images:
    uses: LLazyEmail/documentation-actions/.github/workflows/reusable-build-image-check.yml@v1
```

## Inputs

| Input | Default | Meaning |
| --- | --- | --- |
| `build-dir` | `build` | Output directory relative to repository root, not working-directory |
| `base-url` | `/` | URL path prefix, e.g. `/v-school/` (not a full origin) |
| `allowlist` | empty | Optional repository-relative text file |
| `mode` | `fail` | `fail` returns 1 for broken images; `warn` annotates without failing |
| `working-directory` | `.` | Package directory |
| `node-version` | `22` | Node version |
| `cache-dependency-path` | `package-lock.json` | Repository-relative lockfile |
| `install-command` | `npm ci` | Dependency installation |
| `build-command` | `npm run build` | Build command |
| `prebuild-command` | empty | Optional pre-build command |

Build/install/configuration errors always fail, including missing build output,
missing explicitly requested allowlist, or output with no HTML/CSS. Each broken
reference emits an escaped GitHub error/warning annotation. Counts and details
are appended to the job summary, matching DA's build reporting conventions.
No write permissions or secrets are required. Checkout does not fetch Git LFS.
As in DA's existing workflows, shared composite actions are loaded from `@main`.

## Allowlists and step-level reuse

No site-specific exceptions are bundled. One literal reference, normalized URL
path (without the base prefix), or basename per line; `#` starts a comment.
Prefer full paths over broad basenames, and document a tracking issue for each
exception. Example:

```text
# Tracked in the caller repository's issue 123
/img/temporarily-missing.png
```

For an existing build job, use
`LLazyEmail/documentation-actions/actions/build-image-check@v1` after building.
It accepts the first four inputs above and requires Node on PATH. Direct CLI:
`node actions/build-image-check/scripts/check-build-images.mjs --build-dir build`.

## Verified adoption candidates

These default-branch workflows already call DA `@v1`; their Docusaurus configs
were checked separately. No consumer PRs have been opened.

| Repository | Existing workflow | Additional inputs |
| --- | --- | --- |
| [documentation](https://github.com/LLazyEmail/documentation/blob/main/.github/workflows/test-deploy.yml) | Docusaurus test deploy | None |
| [v-school](https://github.com/LLazyEmail/v-school/blob/main/.github/workflows/docs-ci.yml) | Docs CI, build enabled | `base-url: /v-school/` |
| [awesome-email-marketing](https://github.com/LLazyEmail/awesome-email-marketing/blob/main/.github/workflows/test-deploy.yml) | Docusaurus test deploy | See below |
| [awesome-newsletters](https://github.com/LLazyEmail/awesome-newsletters/blob/main/.github/workflows/docs-ci.yml) | Docs CI, build enabled | See below |

For the two `website/` sites add:

```yaml
    with:
      working-directory: website
      build-dir: website/build
      cache-dependency-path: website/package-lock.json
      base-url: /awesome-email-marketing/
      prebuild-command: npm run lint:docs-links
```

For awesome-newsletters use `/awesome-newsletters/`, `node-version: '20'`,
and omit `prebuild-command`. Preserve existing triggers and other checks when
adopting; the standalone workflow builds independently, so step-level reuse is
preferable when an existing job already builds the site.
