# Quickstart for AI agents

Ultra-concise checklist. For full detail see [AGENTS.md](../AGENTS.md) and [docs/ai-agent-guide.md](ai-agent-guide.md).

## Adopt into a consumer repo

1. Copy the matching file from [examples/](../examples/) (see [docs/examples-guide.md](examples-guide.md)).
2. Keep triggers, path filters, and permissions on the **caller**.
3. Adjust only the `with:` inputs that differ (see [docs/inputs-reference.md](inputs-reference.md)).
4. Add `secrets: inherit` when the workflow needs write access.
5. Pin `@v1` (or full SHA) after the first release. Prefer SHA + Renovate.
6. Add a smoke PR and verify.

## Work inside this repository

1. Small draft PRs only.
2. Append exactly one row to `docs/actions-index.md` when adding an action.
3. Add a `.changelog/` fragment (or label `skip-changelog` for pure docs).
4. Pin third-party Actions to full SHA with `# vX.Y.Z`.
5. Do not merge unless the owner asks.
6. Commit trailer: `Co-authored-by: petroved <arthur.tkachenko.netweight@gmail.com>`.

## Never

- Invent job YAML from scratch.
- Hand-edit `CHANGELOG.md`.
- Reorder the actions index.
- Leave production consumers on `@main`.
- Delete curated content in sibling repos.
