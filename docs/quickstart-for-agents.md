# Quickstart for agents

1. Read `llms.txt` or `AGENTS.md`.
2. Copy the matching file from `examples/`.
3. Prefer short-name aliases when they exist:
   - `reusable-pages-deploy`
   - `reusable-test-deploy`
   - `reusable-readme-sync`
   - `reusable-label-conflicts`
   - `reusable-pr-report`
   - `reusable-readme-only`
4. Pin third-party Actions to full SHA.
5. Keep triggers and permissions on the caller.
6. Add a `.changelog/` fragment.
7. Open a draft PR. Do not merge.

## Adopt into a consumer repo

1. Copy the matching file from [examples/](../examples/) (see [docs/examples-guide.md](examples-guide.md)).
2. Keep triggers, path filters, and permissions on the **caller**.
3. Use the short workflow name when one exists (`reusable-pages-deploy`, `reusable-test-deploy`, `reusable-readme-sync`, `reusable-readme-only`, `reusable-label-conflicts`, `reusable-pr-report`, `reusable-thin-content`, `reusable-image-check`, `reusable-entry-format`). The full list is in [docs/naming.md](naming.md). Both names work.
4. Adjust only the `with:` inputs that differ (see [docs/inputs-reference.md](inputs-reference.md)).
5. Grant the caller permissions listed in [docs/troubleshooting.md](troubleshooting.md#permissions-the-caller-must-grant), and add `secrets: inherit` when the workflow needs write access.
6. Pin `@v2` (or full SHA). Prefer SHA + Renovate.
7. Add a smoke PR and verify.

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

Full rules: `docs/yaml-ai-rules.md`.
