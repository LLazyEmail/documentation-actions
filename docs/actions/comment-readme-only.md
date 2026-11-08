# comment-readme-only

Post a one-time guidance comment when a PR only changes `README.md` (no matching docs file).

**Path:** `.github/workflows/reusable-comment-readme-only.yml`

## Inputs

| Input | Default | Description |
| --- | --- | --- |
| `docs-prefix` | `website/docs/` | Path prefix that counts as a docs update |
| `comment-body` | generic reminder | Markdown comment body |

## Example

See `examples/comment-readme-only.yml`.

## Agent notes

- Idempotent: uses a marker so it only comments once.
- Softer than the sync-check (does not fail the job).
- Pin `@v1`.
