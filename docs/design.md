# Design notes

## Composite action vs reusable workflow

| Use a composite action when… | Use a reusable workflow when… |
| --- | --- |
| The caller keeps custom steps around shared logic | The entire job should move unchanged |
| Inputs are step-scoped (globs, message text) | Concurrency, permissions, and multi-step jobs matter |
| You want `uses: ./actions/...` in self-tests | Consumers replace a whole `.github/workflows/*.yml` file |

## Behaviour identity

Extractions keep the same github-script bodies, lychee flags, commit messages, and skip conditions (`github-actions[bot]`, maintainer associations) as the source workflows in the awesome-* and documentation repos.

## File layout conventions

- Composite actions live only under `actions/<name>/` (plus optional `scripts/`).
- Reusable workflows live under `.github/workflows/reusable-*.yml`.
- Thin callers live under `examples/`.
- Agent checklists live under `skills/<name>/SKILL.md`.
- Inventory is append-only in `docs/actions-index.md`.
- Do not scatter related files so that every PR must touch the same lines.

## Pinning

- Third-party actions: full commit SHA + `# vX.Y.Z` comment.
- This suite: `@v1` (floating major) after release; SHA preferred for strongest guarantee.
- Renovate updates both.

## Changelog

Use `.changelog/` fragments. Never hand-edit `CHANGELOG.md` for user-facing changes. Docs-only PRs may use the `skip-changelog` label.
