# readme-docs-sync-check

Fail (and comment) when a PR updates `README.md` but does not touch a matching docs page.

**Path:** `.github/workflows/reusable-readme-docs-sync-check.yml`

## Inputs

| Input | Default | Description |
| --- | --- | --- |
| `docs-glob` | `website/docs/**/*.md` | Files that count as "in sync" |
| `comment-body` | generic message | Markdown posted on the PR |
| `fail-on-missing` | `true` | Fail the job (set `false` to only comment) |

## Example

See `examples/readme-docs-sync-check.yml`.

## Agent notes

- Keep triggers and path filters on the caller.
- Customize `comment-body` with site-specific mappings when needed.
- Pin `@v1`.
