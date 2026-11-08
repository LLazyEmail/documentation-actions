# pages-deploy

Reusable GitHub Pages (modern) and peaceiris deploy for Docusaurus.

**Path:** `.github/workflows/reusable-docusaurus-pages-deploy.yml`

## Example (modern Pages)

```yaml
permissions:
  contents: read
  pages: write
  id-token: write
jobs:
  deploy:
    uses: LLazyEmail/documentation-actions/.github/workflows/reusable-docusaurus-pages-deploy.yml@v1
    with:
      working-directory: website
      artifact-path: website/build
    secrets: inherit
```

## Agent notes

- Modern path needs the `github-pages` environment.
- Peaceiris alternative requires `contents: write`.
- Ignore intermittent Pages flakes on some consumer sites during adoption.
