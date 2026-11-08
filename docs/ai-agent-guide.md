# AI Agent Guide for documentation-actions

This guide helps coding agents (Claude, Copilot, Grok, Cursor, etc.) adopt, extend, and maintain the shared Actions suite with high confidence and low risk.

## Core principles for agents

1. **Copy, don't invent.** Every reusable workflow and composite has a thin caller under `examples/`. Start there.
2. **Keep behaviour identical** when extracting or adopting. Match globs, flags, commit messages, skip conditions, and Node versions.
3. **Small, focused PRs.** One action, one workflow, or one docs improvement per PR.
4. **Append-only inventory.** Never reorder `docs/actions-index.md`.
5. **Pin third-party Actions to SHA** with a version comment. Renovate updates them.
6. **Changelog fragments only.** Never hand-edit `CHANGELOG.md` for user-facing changes.
7. **Do not merge** unless the human owner explicitly asks.

## Quick links

- [docs/quickstart-for-agents.md](quickstart-for-agents.md)
- [docs/examples-guide.md](examples-guide.md)
- [docs/inputs-reference.md](inputs-reference.md)
- [docs/pinning.md](pinning.md)
- [docs/troubleshooting.md](troubleshooting.md)
- [docs/actions/](actions/) — per-action reference
- [skills/](../skills/) — checklists

## Adoption flow (step-by-step)

1. Read [`skills/docusaurus-docs-site/SKILL.md`](../skills/docusaurus-docs-site/SKILL.md) for the full site checklist (or the more focused skills).
2. Identify the matching example in `examples/` (see [docs/examples-guide.md](examples-guide.md)).
3. Copy the example into the consumer's `.github/workflows/`.
4. Adjust:
   - Triggers and path filters (keep them on the caller).
   - Permissions (minimal).
   - Inputs (`working-directory`, globs, Node version, `prebuild-command`, etc.). See [docs/inputs-reference.md](inputs-reference.md).
   - `secrets: inherit` when the workflow needs write access.
5. In the adoption PR body, link the documentation-actions PR and paste/link the previous local workflow for review.
6. After `v1` exists, switch the pin from `@main` to `@v1` (or a SHA). See [docs/pinning.md](pinning.md).
7. Verify locally where possible (`npm ci && npm run build`) and on a smoke PR.

## Adding a new composite action

1. Create `actions/<name>/action.yml` (and any scripts under `actions/<name>/scripts/`).
2. Add a reusable workflow under `.github/workflows/reusable-<name>.yml` if job-level reuse is useful.
3. Add a thin example under `examples/`.
4. Append exactly one row to `docs/actions-index.md`.
5. Add a self-test (fixture or CI job).
6. Add a `.changelog/` fragment.
7. Update `AGENTS.md` / README only if the public surface changes.

## Adding a new reusable workflow

Prefer reusable workflows when the entire job (permissions, concurrency, multi-step) should move. Keep the caller thin: only triggers, permissions, and `with:` / `secrets:`.

## Common input patterns

See the full table in [docs/inputs-reference.md](inputs-reference.md).

## Troubleshooting for agents

See [docs/troubleshooting.md](troubleshooting.md) and the troubleshooting skill.

## Reference consumers

See the table in the docusaurus skill for real-world callers (awesome-newsletters, awesome-email-marketing, assemblya, fuck-ecoflow, documentation, v-school).

## Related files

- [`AGENTS.md`](../AGENTS.md) — primary agent entry point
- [`docs/adoption.md`](adoption.md)
- [`docs/design.md`](design.md)
- [`skills/docusaurus-docs-site/SKILL.md`](../skills/docusaurus-docs-site/SKILL.md)
