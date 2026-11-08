# Root action (marketplace umbrella)

**Path:** `action.yml` (repo root)

Optional composite that can run markdownlint, a soft-fail lychee check, and a Docusaurus build in one step.

## When to use

Prefer the specialized reusable workflows (`reusable-docs-ci`, `reusable-docusaurus-test-deploy`, etc.) for full jobs. Use the root action only when you want a single composite step inside an existing job and do not need the full workflow features (concurrency, permissions, PR comment, etc.).

## Inputs (booleans + supporting)

| Input | Default | Description |
| --- | --- | --- |
| `run-markdownlint` | `false` | Run markdownlint |
| `markdownlint-globs` | empty | Multiline globs |
| `run-lychee` | `false` | Run soft-fail lychee |
| `lychee-args` | empty | Paths and flags |
| `lychee-fail` | `false` | Hard-fail if true |
| `lychee-create-issue` | `false` | Create issue from report |
| `run-build` | `false` | Install + Docusaurus build |
| `working-directory` | `website` | |
| `node-version` | `22` | |
| `cache-dependency-path` | `website/package-lock.json` | |
| `install-command` | `npm ci` | |
| `build-command` | `npm run build` | |
| `prebuild-command` | empty | |
| `annotate-log` | `true` | |

## Example

```yaml
- uses: LLazyEmail/documentation-actions@v1
  with:
    run-markdownlint: true
    markdownlint-globs: |
      README.md
      website/docs/**/*.md
    run-lychee: true
    lychee-args: >-
      --verbose --no-progress --accept 200,204,206,403,429
      README.md 'website/docs/**/*.md'
    run-build: true
    working-directory: website
```

## Agent notes

- Specialized workflows under `.github/workflows/reusable-*.yml` are preferred for production callers.
- The root action is mainly for Marketplace listing and simple one-step use.
- Pin `@v1` or SHA.
