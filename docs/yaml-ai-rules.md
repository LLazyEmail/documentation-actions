# YAML AI rules for documentation-actions

Strict rules for coding agents that write or edit YAML in this repository or in consumer repos that adopt these workflows.

## Structure

- Prefer reusable workflows (`workflow_call`) for whole jobs.
- Prefer composite actions for shared steps inside custom jobs.
- Always start by copying a file from `examples/`.
- Keep triggers, path filters, and permissions on the **caller**. Never put them inside a reusable workflow.

## Pinning

Every third-party `uses:` must be pinned to a full commit SHA with a version comment:

```yaml
uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
```

Never leave floating tags (`@v4`, `@main`) on third-party Actions.

For this suite:
- Production: `@v1` or full SHA
- Draft adoption only: `@main` during the adoption window

## Line length and formatting

- Maximum line length: **140** characters (enforced by `.yamllint.yml`).
- Break long script lines. Avoid multi-line template literals inside `script: |` blocks — they break YAML literal blocks.
- Prefer string concatenation or arrays for complex markdown in github-script steps.

## Permissions and secrets

- Request the minimum permissions required.
- Pass `secrets: inherit` on any `uses:` that needs write access (changelog, pages deploy, star-request, etc.).
- Never hard-code tokens.

## Common patterns

| Pattern | Rule |
|---------|------|
| `working-directory` | Match the consumer (`website` or `.`) |
| `cache-dependency-path` | Repository-relative path to the lockfile |
| `node-version` | Align with the consumer's `.nvmrc` |
| Boolean toggles | Use `true` / `false` explicitly |
| Commit-back | Always `contents: write` + `secrets: inherit` |

## What agents must never do

- Invent job YAML from scratch.
- Reorder or edit existing rows in `docs/actions-index.md`.
- Hand-edit `CHANGELOG.md`.
- Leave production consumers on `@main`.
- Merge or close PRs unless explicitly asked.
- Delete curated content in sibling repos.

## Self-check before opening a PR

1. Did I copy from an example?
2. Are all third-party Actions SHA-pinned?
3. Are triggers and permissions only on the caller?
4. Is every line ≤ 140 characters?
5. Did I add a `.changelog/` fragment (or label the PR `skip-changelog`)?
