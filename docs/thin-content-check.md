# Thin content check

Builds the caller's Docusaurus site and lists pages with little real content, so
they can be filled in. Only the main article is measured (`.theme-doc-markdown`,
a blog post's `articleBody`, a generated category index, or `<main>`); navbar,
sidebar, breadcrumbs, table of contents, pagination, footer, scripts, SVG and
code blocks (`<pre>`) are excluded. Redirect stub pages are skipped.

Reasons a page is reported:

| Reason | Meaning |
| --- | --- |
| `empty` | No words and no images |
| `heading-only` | Headings but fewer than 5 body words and no images |
| `image-only` | Images with fewer than 30 body words |
| `placeholder` | Text such as TODO, TBD, WIP, coming soon, lorem ipsum, under construction |
| `thin` | Fewer than `min-words` visible words (headings + body) |

Generated category indexes are listings by design and are reported separately,
only when empty. The default `mode` is `warn`: the check reports without failing.

## Minimal caller

```yaml
name: Thin content
on: [workflow_dispatch]
permissions:
  contents: read
jobs:
  thin-content:
    uses: LLazyEmail/documentation-actions/.github/workflows/reusable-thin-content-check.yml@v1
    with:
      base-url: /my-site/
      site-url: https://example.github.io
```

## Inputs

| Input | Default | Meaning |
| --- | --- | --- |
| `build-dir` | `build` | Output directory relative to repository root |
| `base-url` | `/` | URL path prefix, e.g. `/v-school/` |
| `site-url` | empty | Site origin, used to print full page URLs |
| `min-words` | `150` | Pages below this many words are `thin` |
| `allowlist` | empty | Repository-relative file; one page path, URL path, route or source file per line, `#` comments |
| `mode` | `warn` | `fail` returns 1 when any page is reported |
| `working-directory` | `.` | Package directory (its `.docusaurus/` maps pages to source files) |
| `node-version` | `22` | Node version |
| `cache-dependency-path` | `package-lock.json` | Lockfile |
| `install-command` | `npm ci` | Dependency installation |
| `build-command` | `npm run build` | Build command |
| `prebuild-command` | empty | Optional pre-build command |
| `lfs` | `false` | Pass `lfs: true` to `actions/checkout` |

## Output

The job summary has a word distribution (<50, 50–149, 150–299, 300+) and a
**Pages with little content (thinnest first)** checklist:

```text
- [ ] https://example.github.io/my-site/docs/intro/ — `docs/intro.md` — 12 words, 3 images — image-only, thin
```

The same data is uploaded as the `thin-content-report` artifact
(`thin-content-report.json`: `pages[]` with `url`, `source`, `title`, `words`,
`images`, `codeBlocks`, `reasons`, `excerpt`).

## Local run

```bash
npm run build
node path/to/documentation-actions/actions/thin-content-check/scripts/check-thin-content.mjs \
  --build-dir build --base-url /my-site/ --site-url https://example.github.io \
  --min-words 150 --report-json thin-content-report.json
```
