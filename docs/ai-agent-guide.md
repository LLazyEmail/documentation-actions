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

## Adoption flow (step-by-step)

1. Read [`skills/docusaurus-docs-site/SKILL.md`](../skills/docusaurus-docs-site/SKILL.md) for the full site checklist.
2. Identify the matching example in `examples/`.
3. Copy the example into the consumer's `.github/workflows/`.
4. Adjust:
   - Triggers and path filters (keep them on the caller).
   - Permissions (minimal).
   - Inputs (`working-directory`, globs, Node version, `prebuild-command`, etc.).
   - `secrets: inherit` when the workflow needs write access.
5. In the adoption PR body, link the documentation-actions PR and paste/link the previous local workflow for review.
6. After `v1` exists, switch the pin from `@main` to `@v1` (or a SHA).
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

| Input | Typical values | Notes |
| --- | --- | --- |
| `working-directory` | `website` or `.` | Match where `package.json` lives |
| `cache-dependency-path` | `website/package-lock.json` | Repository-relative |
| `node-version` | `22` (default) or `24` | Align with `.nvmrc` |
| `markdownlint-globs` | Multiline YAML | Exclude `node_modules` / `build` |
| `lychee-args` | Flags + paths | Soft-fail by default; accept 403/429 |
| `prebuild-command` | `npm run lint:docs-links` | Empty skips |
| `commit-paths` | Space-separated | For git-push-retry |

## Troubleshooting for agents

- **Workflow not found / access denied**: Org policy must allow reusable workflows from this repo.
- **Commit-back fails**: Missing `secrets: inherit` or `contents: write`.
- **Build fails on missing deps**: Wrong `working-directory` or lockfile path.
- **Lychee fails hard**: Set `fail: false` (default) or adjust `--accept`.
- **Index conflicts**: You edited an existing row in `docs/actions-index.md` — revert to append-only.
- **Changelog validation fails**: Add a `.changelog/*.md` or label the PR `skip-changelog`.

## Reference consumers

See the table in the docusaurus skill for real-world callers (awesome-newsletters, awesome-email-marketing, assemblya, fuck-ecoflow, documentation, v-school).

## Related files

- [`AGENTS.md`](../AGENTS.md) — primary agent entry point
- [`docs/adoption.md`](adoption.md)
- [`docs/design.md`](design.md)
- [`skills/docusaurus-docs-site/SKILL.md`](../skills/docusaurus-docs-site/SKILL.md)
