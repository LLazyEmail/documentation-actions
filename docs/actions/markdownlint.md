# markdownlint

Run markdownlint-cli2 on given globs.

**Path:** `actions/markdownlint`

## When to use

Prefer the umbrella `reusable-docs-ci` when possible. Use this composite when you need only the lint step inside a custom job.

## Inputs

| Input | Required | Default | Description |
| --- | --- | --- | --- |
| `globs` | yes | | Multiline globs passed to markdownlint-cli2 |

## Example

```yaml
- uses: LLazyEmail/documentation-actions/actions/markdownlint@v1
  with:
    globs: |
      README.md
      website/docs/**/*.md
      !website/node_modules/**
```

## Agent notes

- Commit a `.markdownlint.json` (or cli2 config) before enabling.
- Exclude `node_modules` and `build`.
- Soften rules (MD013, MD033) on large legacy trees rather than mass-rewriting in the adoption PR.
