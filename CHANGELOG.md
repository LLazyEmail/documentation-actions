# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.6.2] - 2026-11-08

### Changed

- Expanded AGENTS.md into a structured AI agent playbook with decision trees, common pitfalls, and a new docs/ai-agent-guide.md for higher-confidence adoption and extension.

## [1.6.1] - 2026-11-08

### Fixed

- Detect Docusaurus-minified unquoted image attributes, image hrefs, SVG references, and video posters in built-site image checks.

## [1.6.0] - 2026-11-07

### Added

- Reusable build-image checker with configurable build path, base URL, allowlist, and fail/warn reporting.

## [1.5.0] - 2026-11-03

### Added

- Add `skills/docusaurus-docs-site/SKILL.md` checklist for building a Docusaurus
  docs site on documentation-actions (repo setup, Node, reusable-docs-ci @v1,
  deploy, lint, link check, changelog, auto-rebase, i18n, AGENTS.md, PR template).

### Fixed

- Quote the root `action.yml` description so yamllint accepts the colon in
  "awesome-lists: lint" (CI Lint was red on main after the Marketplace shorten).
- Quote the root action.yml description so yamllint accepts the colon in the summary.
- Make reusable-docusaurus-test-deploy.yml a thin compatibility wrapper around
  reusable-docs-ci so legacy callers keep resolving after the docs-ci umbrella
  move. New sites should call reusable-docs-ci.yml directly.

## [1.4.0] - 2026-10-31

### Added

- Root-level composite action (action.yml) so the suite can be published to the GitHub Marketplace. The Marketplace entry point optionally runs markdownlint, lychee, and a Docusaurus build by reusing the existing local composites. Specialized actions under actions/ and reusable workflows remain usable by path.

## [1.3.0] - 2026-10-31

### Added

- Reusable `docs-ci` umbrella workflow with toggle inputs for markdownlint, lychee, Docusaurus test build, and an optional npm-script check. Sensible Node 22 / website/ defaults so callers can stay around 10–20 YAML lines.
- Docusaurus builds tee the log and surface broken-link / warning / error lines as GitHub annotations and a job summary (`annotate-log`, default true). Optional `pr-comment` on test-deploy upserts a PR comment with those counts via `actions/docusaurus-pr-comment`.
- Composite `git-push-retry` for commit-back jobs; changelog, docs-index, and catalog-api reusable workflows now call it instead of inlining the rebase-retry loop.

### Changed

- Reusable catalog-api now defaults to Node 22 (was 20), matching other documentation-actions defaults. Callers can still override `node-version`.

## [1.2.0] - 2026-10-31

### Added

- Reusable `npm-script-check` composite and workflow for PR quality scripts (media guardrails, naming, format, typecheck, i18n, images) with Node 22 and npm ci defaults and optional Git LFS checkout.

### Changed

- Docusaurus build / test-deploy / pages-deploy now default to Node 22 and accept an optional `lfs` checkout input for Git LFS documentation repos.

## [1.1.2] - 2026-10-30

### Fixed

- Stop requiring `contents: write` from Actions Pages callers of `reusable-docusaurus-pages-deploy` (nested peaceiris job permissions were validated even when skipped).

## [1.1.1] - 2026-10-30

### Fixed

- Reusable changelog / catalog-api / docs-index workflows rebase and retry when a concurrent push to main rejects the update.
- Auto-publish now moves the floating major tag (v1) inside tag-release.yml, because GITHUB_TOKEN-created releases never trigger release.yml.

## [1.1.0] - 2026-10-30

### Added

- Auto-publish on merge: after a release PR lands, create the `vX.Y.Z` tag and
  GitHub Release from `CHANGELOG.md`, then let `release.yml` move floating `v1`.
  Idempotent so a missed release (for example v1.0.0) is published on the first
  run when the tag is still missing.

### Fixed

- Release PRs no longer fail unit tests: tag-release helper test accepts any changelog semver instead of hardcoding 1.0.0.

## [1.0.0] - 2026-10-30

### Added

- First release of documentation-actions: CI/release foundation, composite
  actions (star-request, auto-rebase, markdownlint, lychee-link-check,
  docusaurus-build, awesome-list-checks), reusable workflows (test-deploy,
  pages-deploy, changelog, docs-index, catalog-api, auto-rebase, star-request,
  markdownlint, link-check), examples, and the floating `v1` major tag for
  consumers.

### Fixed

- Release PRs on rel/vX.Y.Z no longer fail CI: changelog validation skips them and the changelog unit test uses a fixture instead of a real entry.

## [Unreleased]

### Added

- Repository scaffolding: CONTRIBUTING, AGENTS.md, CODEOWNERS, SECURITY, Renovate, yamllint, gitignore.
- CI workflow (yamllint, actionlint, unit tests) and release workflow that moves the floating major tag (`v1`).
- Early in-repo auto-rebase workflow for open PRs.
- Thank contributors and ask for a star (`actions/star-request`).
- Update behind open PR branches (`actions/auto-rebase`).
- Polished README, adoption guide, design notes, and self-test workflow.
- Run markdownlint-cli2 on docs (`actions/markdownlint`).
- Soft-fail lychee link check with summary (`actions/lychee-link-check`).
- Install, optional prebuild, and Docusaurus build (`actions/docusaurus-build`).
- Reusable Docusaurus PR build workflow (`reusable-docusaurus-test-deploy`).
- Reusable GitHub Pages and peaceiris deploy (`reusable-docusaurus-pages-deploy`).
- Reusable regenerate-and-commit changelog workflow (`reusable-changelog`).
- Reusable pages-index regenerate workflow (`reusable-docs-index`).
- Reusable JSON API regenerate workflow (`reusable-catalog-api`).
- Awesome-list checks: entry-format, duplicates, sorted-sections (`actions/awesome-list-checks`).

[1.6.2]: https://github.com/LLazyEmail/documentation-actions/compare/v1.6.1...v1.6.2
[1.6.1]: https://github.com/LLazyEmail/documentation-actions/compare/v1.6.0...v1.6.1
[1.6.0]: https://github.com/LLazyEmail/documentation-actions/compare/v1.5.0...v1.6.0
[1.5.0]: https://github.com/LLazyEmail/documentation-actions/compare/v1.4.0...v1.5.0
[1.4.0]: https://github.com/LLazyEmail/documentation-actions/compare/v1.3.0...v1.4.0
[1.3.0]: https://github.com/LLazyEmail/documentation-actions/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/LLazyEmail/documentation-actions/compare/v1.1.2...v1.2.0
[1.1.2]: https://github.com/LLazyEmail/documentation-actions/compare/v1.1.1...v1.1.2
[1.1.1]: https://github.com/LLazyEmail/documentation-actions/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/LLazyEmail/documentation-actions/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/LLazyEmail/documentation-actions/releases/tag/v1.0.0
