# npm-script-check

Setup Node, optional `npm ci`, and run a `package.json` script (Prettier, i18n, images, typecheck, etc.).

**Path:** `actions/npm-script-check` + reusable workflow

## Example

```yaml
jobs:
  check:
    uses: LLazyEmail/documentation-actions/.github/workflows/reusable-npm-script-check.yml@v1
    with:
      working-directory: website
      script: format:check
```

## Agent notes

- Align `node-version` and lockfile with the rest of the site.
- Prefer `format:check` in CI; leave `--write` for explicit PRs.
