# Adopting documentation-actions in a consumer repo

1. Merge the matching stacked PR in `LLazyEmail/documentation-actions` first (or depend on `@main` only in a **draft** adoption PR).
2. Replace the local workflow with a thin caller from [`examples/`](../examples/). Keep **triggers, path filters, and permissions** identical.
3. Pass inputs so behaviour matches the old job (globs, lychee args, `prebuild-command`, `commit-paths`, Node version, working-directory).
4. In the adoption PR body, link the documentation-actions PR and paste or link the previous workflow for review.
5. After `v1.0.0` is published, switch `@main` → `@v1`.

## Org settings the owner must allow

- **Actions → General → Access**: allow GitHub Actions to create and approve pull requests if workflows commit back (changelog, docs-index, catalog).
- **Actions access for reusable workflows**: org policy must permit using actions and reusable workflows from `LLazyEmail/documentation-actions`.
- **Pages**: modern deploy needs the `github-pages` environment; peaceiris path needs `contents: write` to push `gh-pages`.
- **Marketplace**: optional; composite actions can be used by path without Marketplace listing.
