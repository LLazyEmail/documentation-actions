---
name: docusaurus-docs-site
description: >-
  Checklist for building a proper Docusaurus documentation website on the
  LLazyEmail stack using documentation-actions shared workflows. Use when
  starting a new docs site, adopting reusable-docs-ci @v1, or bringing a fork
  (awesome-newsletters, awesome-email-marketing, assemblya, fuck-ecoflow) onto
  the shared CI, deploy, lint, link-check, changelog, and auto-rebase suite.
---

# Docusaurus docs site checklist (documentation-actions)

Reusable checklist for anyone standing up or hardening a Docusaurus site that
calls [`LLazyEmail/documentation-actions`](https://github.com/LLazyEmail/documentation-actions).

Pin consumers to **`LLazyEmail/documentation-actions@v1`** after the first
release. Draft adoption PRs may use `@main` only during the adoption window.
Prefer a full commit SHA for the strongest supply-chain guarantee (Renovate
keeps it current).

Reference consumers:

| Site | Notes |
| --- | --- |
| [`awesome-newsletters`](https://github.com/LLazyEmail/awesome-newsletters) | Awesome-list + `website/` Docusaurus; thin callers for docs-ci, deploy, changelog, docs-index, auto-rebase, star-request |
| [`awesome-email-marketing`](https://github.com/LLazyEmail/awesome-email-marketing) | Same pattern; adoption stack for star-request / auto-rebase / markdownlint / lychee / test-deploy / Pages |
| [`assemblya`](https://github.com/LLazyEmail/assemblya) | Docs at repo root (not `website/`); EN + UK i18n; Prettier / images / i18n npm-script checks; Node 24 via `.nvmrc` |
| [`fuck-ecoflow`](https://github.com/LLazyEmail/fuck-ecoflow) | Docs site fork; Git LFS media; ignore flaky GitHub Pages failures while adopting |

Also read [`AGENTS.md`](../../AGENTS.md), [`docs/adoption.md`](../../docs/adoption.md), and copy-paste callers under [`examples/`](../../examples/).

---

## 1. Repo setup

- [ ] Create (or fork) the docs repository under the org that can use reusable workflows from `LLazyEmail/documentation-actions`.
- [ ] Choose layout:
  - **`website/` subdirectory** (awesome-* pattern): Docusaurus app in `website/`, curated list / root README at repo root.
  - **Repo root** (assemblya / fuck-ecoflow pattern): `package.json`, `docs/`, `docusaurus.config.*` at root; set `working-directory: .` (or omit when defaulting carefully) and `cache-dependency-path` to the root lockfile.
- [ ] Add `.gitignore` for `node_modules/`, `build/`, `.docusaurus/`, `.cache/`, `.env*`, logs.
- [ ] Add `CODEOWNERS`, `SECURITY.md`, `CONTRIBUTING.md`, and (for agents) `AGENTS.md`.
- [ ] Org settings the owner must allow (see `docs/adoption.md`):
  - Actions can create/approve PRs if workflows commit back (changelog, docs-index).
  - Reusable workflows from `LLazyEmail/documentation-actions` permitted.
  - GitHub Pages environment (`github-pages`) for modern Pages deploy; or `contents: write` for peaceiris `gh-pages`.
- [ ] Never fake secrets. Use `secrets: inherit` on workflow calls; do not commit tokens, `.env` values, or placeholder API keys.

---

## 2. Node version

- [ ] **Default for `reusable-docs-ci` / Docusaurus build workflows: Node `22`** (`node-version` input default).
- [ ] Pin with `.nvmrc` at the package root when the site needs a different major (assemblya uses `24`).
- [ ] Pass the same version into every caller:

```yaml
with:
  node-version: '22'   # or '24' when .nvmrc says so
  working-directory: website
  cache-dependency-path: website/package-lock.json
  install-command: npm ci
  build-command: npm run build
```

- [ ] Keep `engines` in `package.json` aligned with CI.
- [ ] Prefer `package-lock.json` + `npm ci` unless the repo already standardizes on another package manager.

---

## 3. Minimal caller workflows

Keep triggers, path filters, and permissions in the **consumer**. Move job bodies into documentation-actions.

### 3a. Umbrella docs CI (`reusable-docs-ci` @v1)

Prefer one thin file over separate markdown-lint / link-check / test-deploy workflows when adopting greenfield. Example: [`examples/docs-ci.yml`](../../examples/docs-ci.yml).

```yaml
name: Docs CI
on:
  pull_request:
    paths: ['README.md', 'CHANGELOG.md', 'website/**', '.markdownlint.json', '.lychee.toml', '.github/workflows/docs-ci.yml']
  push:
    branches: [main]
    paths: ['README.md', 'CHANGELOG.md', 'website/**', '.markdownlint.json']
  schedule:
    - cron: '0 9 * * 1'
  workflow_dispatch:
permissions:
  contents: read
  pull-requests: write
  issues: write
jobs:
  docs-ci:
    uses: LLazyEmail/documentation-actions/.github/workflows/reusable-docs-ci.yml@v1
    with:
      working-directory: website
      cache-dependency-path: website/package-lock.json
      node-version: '22'
      run-markdownlint: true
      markdownlint-globs: |
        README.md
        CHANGELOG.md
        website/docs/**/*.md
        !website/node_modules/**
        !website/build/**
      run-lychee: true
      lychee-args: >-
        --verbose --no-progress --max-concurrency 8
        --accept 200,204,206,403,429 --timeout 20
        --exclude-path node_modules --exclude-path website/node_modules
        --exclude-path website/build --exclude-path .git
        README.md CHANGELOG.md 'website/docs/**/*.md' 'website/docs/**/*.mdx'
      lychee-create-issue: ${{ github.event_name == 'schedule' || github.event_name == 'workflow_dispatch' }}
      run-build: true
    secrets: inherit
```

Inputs to know: `run-build`, `annotate-log`, `pr-comment`, `run-npm-check` + `npm-check-command` (Prettier / i18n / images), `lfs` for Git LFS checkouts.

### 3b. Test deploy (PR build)

[`examples/test-deploy.yml`](../../examples/test-deploy.yml) → `reusable-docusaurus-test-deploy.yml@v1`.

- [ ] Enable `annotate-log` (default) so broken links / warnings become check annotations.
- [ ] Optional `pr-comment: true` with `pull-requests: write`.
- [ ] Set `lfs: true` when the repo uses Git LFS (fuck-ecoflow).
- [ ] Optional `prebuild-command` for site-specific gates (AEM docs-link lint).

### 3c. Pages deploy

[`examples/deploy-pages.yml`](../../examples/deploy-pages.yml) → `reusable-docusaurus-pages-deploy.yml@v1`.

```yaml
permissions:
  contents: read
  pages: write
  id-token: write
jobs:
  deploy:
    uses: LLazyEmail/documentation-actions/.github/workflows/reusable-docusaurus-pages-deploy.yml@v1
    with:
      working-directory: website
      cache-dependency-path: website/package-lock.json
      artifact-path: website/build
    secrets: inherit
```

- [ ] Ignore intermittent GitHub Pages failures on assemblya / fuck-ecoflow while the site is still landing; do not treat Pages red alone as a blocker for unrelated adoption PRs.
- [ ] Peaceiris alternative: [`examples/deploy-peaceiris.yml`](../../examples/deploy-peaceiris.yml).

### 3d. Markdownlint

Either toggle `run-markdownlint` on docs-ci, or use [`examples/markdown-lint.yml`](../../examples/markdown-lint.yml) → `reusable-markdownlint.yml@v1`.

- [ ] Add `.markdownlint.json` (or `.markdownlint-cli2.jsonc`) at the repo root before enabling the job.
- [ ] Scope globs to docs; exclude `node_modules` / `build`.
- [ ] Soften rules (MD013 line length, MD033 inline HTML) when migrating large legacy markdown rather than rewriting every page in the adoption PR.

### 3e. Link check (lychee)

[`examples/link-check.yml`](../../examples/link-check.yml) → `reusable-link-check.yml@v1`.

- [ ] Soft-fail with job summary; open issues only on `schedule` / `workflow_dispatch` via `create-issue` / `lychee-create-issue`.
- [ ] Accept `403` / `429` when scanners are blocked; keep timeouts modest.
- [ ] Add `.lychee.toml` excludes for known noisy hosts.

### 3f. Changelog regenerate

[`examples/changelog.yml`](../../examples/changelog.yml) → `reusable-changelog.yml@v1` with `contents: write` and `secrets: inherit`.

- [ ] Match `commit-paths` to what the site regenerates (`CHANGELOG.md`, optional `website/src/data/changelog.json`).

### 3g. Auto-rebase

[`examples/auto-rebase-prs.yml`](../../examples/auto-rebase-prs.yml) → `reusable-auto-rebase-prs.yml@v1`.

```yaml
on:
  schedule:
    - cron: '0 */6 * * *'
  workflow_dispatch:
permissions:
  contents: write
  pull-requests: write
```

- [ ] Keeps stacked draft adoption PRs current without manual rebases.

### 3h. Optional callers

- [ ] **docs-index** — [`examples/docs-index.yml`](../../examples/docs-index.yml)
- [ ] **star-request** — [`examples/star-request.yml`](../../examples/star-request.yml) (`pull_request_target`)
- [ ] **awesome-list-checks** — entry-format / duplicate-links / sorted-sections for curated lists
- [ ] **npm-script-check** — Prettier `format:check`, `check:i18n`, `check:images`, `typecheck` (assemblya)

---

## 4. Markdownlint and Prettier

- [ ] Commit markdownlint config before turning the workflow on.
- [ ] For Prettier: add config + `format` / `format:check` scripts; wire via `reusable-npm-script-check` or docs-ci `run-npm-check`.
- [ ] Large unformatted trees (assemblya ~59 files): land a dedicated **reformat PR** only after maintainer OK — do not sneak mass format into an unrelated CI tweak.
- [ ] Prefer `format:check` in CI and leave `prettier --write` for local / explicit PRs.

---

## 5. i18n

- [ ] When enabling locales (assemblya: English + Ukrainian):
  - Configure `i18n` in `docusaurus.config.*`.
  - Keep locale folders in sync (`npm run write-translations` / project `check:i18n` script).
  - Gate PRs with `npm-script-check` running the sync checker.
- [ ] PR template should ask authors whether EN/UK (or other) copies were updated together.
- [ ] Link-check both locale trees when they contain unique URLs.

---

## 6. Broken links and images

- [ ] Docusaurus `onBrokenLinks` / `onBrokenMarkdownLinks` — fail CI on broken internal links for production sites.
- [ ] Rely on test-deploy annotations (`annotate-log`) for build warnings/errors.
- [ ] Add a missing-images script (assemblya `scripts/check-missing-images.mjs`) and run it in CI for media-heavy docs.
- [ ] Git LFS: set `lfs: true` on build/deploy callers; do not download LFS on pure format-check jobs if that is what is slowing the gate (see assemblya format-check discussions).
- [ ] Lychee covers external HTTP links; Docusaurus covers internal routes and anchors.

---

## 7. AGENTS.md guide

Every consumer should ship an `AGENTS.md` that tells coding agents:

- [ ] What the repo is (docs site vs awesome-list + site).
- [ ] How to run locally (`nvm use`, `npm ci`, `npm start` / `npm run build`).
- [ ] That CI lives in documentation-actions — copy `examples/*`, do not reinvent job YAML.
- [ ] Changelog / `.changelog` rules when the consumer publishes shared actions (this repo) or regenerates `CHANGELOG.md` on merge.
- [ ] Commit trailer when working for the maintainer:

```
Co-authored-by: petroved <arthur.tkachenko.netweight@gmail.com>
```

- [ ] Do not merge or close PRs unless the human owner asks; never delete curated content.

Upstream template for action authors: [`AGENTS.md`](../../AGENTS.md) in this repository.

---

## 8. Pull request template

- [ ] Add `.github/PULL_REQUEST_TEMPLATE.md` (see awesome-newsletters / assemblya).
- [ ] Checklist items to include:
  - Docs / locale impact (EN + other locales).
  - Screenshots for UI changes.
  - Confirmation that markdownlint / link-check / test-deploy are green (or waived with reason).
  - Changelog / release note expectation.
  - No secrets in the diff.
- [ ] Keep templates short; deep policy stays in `CONTRIBUTING.md` + `AGENTS.md`.

---

## 9. `.changelog` fragments and releases (this Actions repo)

For **documentation-actions** itself (and any consumer that adopts the same fragment convention):

- [ ] Do **not** hand-edit `CHANGELOG.md` for user-facing changes.
- [ ] Add one file under [`.changelog/`](../../.changelog/) (see [`.changelog/README.md`](../../.changelog/README.md)):

```markdown
semver: minor
type: Added
Short user-facing summary.
```

- [ ] `semver:` required (`major` | `minor` | `patch`). `type:` optional.
- [ ] CI validates fragments (`scripts/changelog-check.sh`). Waive with label `skip-changelog` / `no-changelog` when appropriate.
- [ ] After merge, **Changelog release PR** opens `rel/vX.Y.Z`, folds entries into `CHANGELOG.md`.
- [ ] Merging the release PR → **Tag release** creates `vX.Y.Z` + GitHub Release; `release.yml` moves floating `v1`.

Consumer sites that only regenerate Keep-a-Changelog from git history use `reusable-changelog.yml` instead of fragments — pick one model per repo and stick to it.

---

## 10. Final verification checklist

Before calling the docs site “done”:

- [ ] `npm ci` + `npm run build` succeed locally on the pinned Node version.
- [ ] Thin callers exist for: docs-ci (or lint + lychee + test-deploy), Pages deploy, changelog (if used), auto-rebase.
- [ ] All `uses:` pins are `@v1` (or SHA) — not a long-lived `@main` on production.
- [ ] `secrets: inherit` only where write tokens are required; no secrets in the repo.
- [ ] Markdownlint and lychee configs committed; first green run on an empty or small PR.
- [ ] i18n sync / image / Prettier checks enabled only after the tree can pass (or behind an explicit reformat PR).
- [ ] `AGENTS.md`, PR template, `CONTRIBUTING.md`, `SECURITY.md`, `CODEOWNERS` present.
- [ ] README links to this skill (or to `documentation-actions` adoption docs) so the next person finds the checklist.
- [ ] A smoke PR shows: test-deploy green, lint green, link-check soft-fail only on known noise, Pages deploy succeeded once on `main` (ignore known flaky Pages on assemblya / fuck-ecoflow).
- [ ] Stacked adoption PRs are draft, small, and kept current by auto-rebase.

---

## Quick decision guide

| Need | Prefer |
| --- | --- |
| Whole job reuse (deploy, changelog, docs-index, auto-rebase, docs-ci) | Reusable workflow `workflow_call` |
| Shared steps inside a custom job | Composite under `actions/<name>/` |
| Awesome-list validators | `reusable-awesome-list-checks` / `actions/awesome-list-checks` |
| One PR build + lint + links | `reusable-docs-ci.yml@v1` |
| Inventory of what exists | [`docs/actions-index.md`](../../docs/actions-index.md) (append-only) |

When extracting from a consumer: merge the matching documentation-actions PR first (or draft-adopt `@main`), keep behaviour identical, and link the previous workflow in the adoption PR body.
