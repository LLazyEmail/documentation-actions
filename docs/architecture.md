# Architecture overview

`documentation-actions` is a shared GitHub Actions suite for Docusaurus documentation sites and awesome-list repositories.

## Layers

```text
Consumer workflow (triggers + permissions)
        ↓ workflow_call
Reusable workflow (.github/workflows/reusable-*.yml)
        ↓ uses (optional)
Composite action (actions/<name>/)
```

- **Examples** (`examples/`) are the source of truth for thin callers. Always copy from here.
- **Skills** (`skills/`) are focused checklists for humans and agents.
- **Inventory** (`docs/actions-index.md`) is append-only.

## Design principles

1. **Thin callers** — consumers only declare triggers, permissions, and inputs.
2. **One implementation** — logic lives once in this repo.
3. **Pin everything** — third-party Actions are SHA-pinned; this suite is pinned to `@v1` or a SHA.
4. **Agent-first** — structured docs, decision tables, and strict rules so coding agents succeed with minimal invention.
5. **Small draft PRs** — one concern per PR; changelog fragments only.

## Current coverage

| Category | Examples |
|----------|----------|
| Docs CI | docs-ci, markdownlint, lychee, test-deploy, build |
| Deploy | pages-deploy (modern + peaceiris) |
| Commit-back | changelog, docs-index, catalog-api |
| PR hygiene | auto-rebase, label-conflicts, pr-report, star-request |
| Content checks | readme-sync, readme-only, thin-content, image-check, awesome-list checks |

## For agents

Start at `llms.txt` or `AGENTS.md`. Copy an example. Follow `docs/yaml-ai-rules.md`.

## Next major (v2)

See `docs/naming.md` for proposed shorter names. A v2 release can introduce cleaner paths while keeping v1 working.
