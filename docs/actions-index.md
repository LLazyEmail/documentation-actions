# Actions index

Append-only. Each action PR adds **exactly one new line** at the end of the table (never reorder or edit other rows).

| Action | Path | One-line description |
| --- | --- | --- |
| `star-request` | `actions/star-request` | Thank contributors and ask for a star |
| `auto-rebase` | `actions/auto-rebase` | Update behind open PR branches |
| `markdownlint` | `actions/markdownlint` | Run markdownlint-cli2 on docs |
| `lychee-link-check` | `actions/lychee-link-check` | Soft-fail lychee link check with summary |
| `docusaurus-build` | `actions/docusaurus-build` | Install, optional prebuild, and Docusaurus build |
| `test-deploy` | `.github/workflows/reusable-docusaurus-test-deploy.yml` | Reusable Docusaurus PR build workflow |
| `pages-deploy` | `.github/workflows/reusable-docusaurus-pages-deploy.yml` | Reusable GitHub Pages and peaceiris deploy |
| `changelog` | `.github/workflows/reusable-changelog.yml` | Reusable regenerate-and-commit changelog workflow |
| `docs-index` | `.github/workflows/reusable-docs-index.yml` | Reusable pages-index regenerate workflow |
| `catalog-api` | `.github/workflows/reusable-catalog-api.yml` | Reusable JSON API regenerate workflow |
| `awesome-list-checks` | `actions/awesome-list-checks` | Entry-format, duplicates, and sorted-sections checks |
| `npm-script-check` | `actions/npm-script-check` | Setup Node, optional npm ci, run a package.json check script |
| `git-push-retry` | `actions/git-push-retry` | Stage, commit, and push with rebase-retry for commit-back jobs |
| `docusaurus-pr-comment` | `actions/docusaurus-pr-comment` | Upsert a PR comment with Docusaurus build warning/error counts |
| `docs-ci` | `.github/workflows/reusable-docs-ci.yml` | Umbrella docs CI (toggle markdownlint, lychee, build, npm-check) |
| `documentation-actions` | `action.yml` | Marketplace root composite (optional markdownlint + lychee + Docusaurus build) |
| `build-image-check` | `actions/build-image-check` | Validate built HTML/CSS image references with annotations and summary |
| `thin-content-check` | `actions/thin-content-check` | List built pages with little main content (word count, image-only, placeholders) |
| `label-conflicted-prs` | `.github/workflows/reusable-label-conflicted-prs.yml` | Label open PRs that have conflicts |
| `pr-status-report` | `.github/workflows/reusable-pr-status-report.yml` | Weekly open-PR summary tracking issue |
| `readme-docs-sync-check` | `.github/workflows/reusable-readme-docs-sync-check.yml` | Fail when README changes without matching docs |
| `comment-readme-only` | `.github/workflows/reusable-comment-readme-only.yml` | One-time comment when PR only changes README.md |
| `awesome-entry-format-check` | `.github/workflows/reusable-awesome-entry-format-check.yml` | Warn on list entries missing the description separator |
