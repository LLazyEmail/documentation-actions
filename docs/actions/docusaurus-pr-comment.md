# docusaurus-pr-comment

Upsert a PR comment with Docusaurus build warning/error counts.

**Path:** `actions/docusaurus-pr-comment`

Used by the test-deploy reusable workflow when `pr-comment: true`.

## Agent notes

- Caller must grant `pull-requests: write`.
- Prefer enabling it on `reusable-docusaurus-test-deploy.yml` rather than calling the composite alone.
