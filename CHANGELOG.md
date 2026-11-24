# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.15.3] - 2026-11-24

### Changed

- Docs: the alias tables in `docs/naming.md` and `docs/deprecation.md` are now generated from `workflows.manifest.yml` by `scripts/gen-workflows.py`, between `<!-- generated: … -->` markers. CI fails when they drift. The table rows didn't change.

## [2.15.2] - 2026-11-24

### Changed

- Maintainers: `scripts/gen-workflows.py` now also writes the pass-through `with:` lines (`<name>: ${{ inputs.<name> }}`) of the action step in the 9 generated wrappers, between `# generated:` / `# end generated` comments. Hand-written lines, such as value conversions and tokens, stay below the block and win for their key. Exposing a new action input is now one manifest line plus `python3 scripts/gen-workflows.py`. Callers see no change: every changed workflow parses to the same YAML as before.

## [2.15.1] - 2026-11-24

### Changed

- Maintainers: `scripts/gen-workflows.py` now also generates the `workflow_call.inputs` block of 9 single-action wrappers (auto-rebase-prs, awesome-list-checks, close-superseded-prs, docusaurus-pages-deploy, link-check, markdownlint, npm-script-check, star-request, sync-feedback) from the action's `action.yml`. CI fails when an action gains an input that the manifest neither exposes nor lists under `not-exposed:`. Callers see no change: input names, order, types, defaults and required flags are identical. Only input descriptions now match the action's wording.

## [2.15.0] - 2026-11-24

### Added

- `reusable-docs-ci`: new opt-in `fetch-depth` input for the build and npm-check checkouts. The default `0` (full history) is the value these jobs always used, so nothing changes unless you set it. `reusable-docusaurus-test-deploy` and its alias `reusable-test-deploy` already accepted `fetch-depth` but ignored it. They now pass it on, so `fetch-depth: 1` really gives a shallow build checkout. Keep `0` if the site shows git-based "last updated" data. The markdownlint and lychee checkouts are unchanged (shallow).

## [2.14.1] - 2026-11-24

### Changed

- Maintainers: the 13 short-name alias workflows are now generated from the new `workflows.manifest.yml` by `scripts/gen-workflows.py` (DA #181, option a, step 1). Each alias copies its long name's `workflow_call` block and forwards every input, so a new input is declared once, on the long workflow. The generated files are semantically identical to the hand-written ones: same inputs, defaults, secrets, permissions, job ids and check names. Callers need no change. The other 22 reusable workflows are listed in the manifest and checked in CI: job ids, check names, permissions, secrets, action inputs, unused inputs, and own refs on `@main` so `scripts/pin-release-refs.sh` can pin them. New `tests/gen-workflows.test.sh`.

## [2.14.0] - 2026-11-23

### Added

- Per-release pinning (opt-in). When the repo secret `RELEASE_PIN_TOKEN` is set (a fine-grained PAT with Contents: write and Workflows: write), `tag-release.yml` runs the new `scripts/pin-release-refs.sh`. It makes one commit on top of the release commit, never pushed to a branch, that rewrites this repo's own `LLazyEmail/documentation-actions/...@main` refs to `@vX.Y.Z`, then tags it and moves `v2` to it. Callers pinned at `@v2`, `@vX.Y.Z` or a SHA then run that release's action code instead of `main`. `main` keeps `@main`. Without the secret, releases are tagged exactly as before, with a logged dry run. `tests/pin-release-refs.test.sh` checks the rewrite on every PR. Docs: long workflow names stay supported for all of v2 (decided in #181). The decisions from #181 are recorded in `docs/reorganization-proposal.md`.

## [2.13.0] - 2026-11-23

### Added

- Four new short-name aliases, each passing the same inputs and secrets through to its long name: `reusable-npm-check` (`reusable-npm-script-check`), `reusable-auto-rebase` (`reusable-auto-rebase-prs`, including the optional `AUTO_REBASE_TOKEN` secret), `reusable-close-superseded` (`reusable-close-superseded-prs`) and `reusable-awesome-checks` (`reusable-awesome-list-checks`). Long names keep working. A caller that switches sees one extra level in its check names (`<job> / call / <inner job>`), so update any branch protection rule that requires the old name. `tests/short-name-aliases.test.sh` now also checks that every secret is declared and every input and secret is passed through.

### Changed

- Docs: added `docs/reorganization-proposal.md`, a draft proposal for restructuring the reusable workflows (inventory, pain points, three options, versioning, a no-breakage migration plan and a recommendation). Also annotated `docs/architecture.md` and `docs/pinning.md`: reusable workflows call the actions at `@main`, so tag and SHA pins fix inputs but not action code. No workflow or action changes.

## [2.12.0] - 2026-11-21

### Added

auto-rebase: conflicts are now reported with their type (`deleted-on-main`, `deleted-in-pr`, `content`, `both-added`, `rename-or-add`, `both-deleted`) in the log, the summary, the trial-rebase comment and a new conflict report on the PR. That report is one comment per PR, edited in place instead of a new comment per run. New opt-in inputs:
- `resolve-deleted-on-main` and `resolve-deleted-paths` (default `.github/workflows/**`) accept deletions made on the base branch for files the PR only modified, when that's the only kind of conflict. Dropped files are listed on the PR. With `merge-fallback`, they also try a local merge when GitHub says the PR is not mergeable.
- `fail-on-conflict` (default `true`) can turn unresolvable conflicts into a warning.
- `conflict-label` labels PRs with unresolvable conflicts, for example `has-conflicts`.

## [2.11.0] - 2026-11-21

### Added

- New opt-in `reusable-sync-feedback.yml` workflow and `actions/docs-sync-feedback` action. When a PR, forks included, changes `README.md` without the matching docs page, it adds a `needs-docs-sync` label (created if missing) and posts one comment. The comment names the docs file, section, neighbouring entry and the exact line to add, and is edited in place on later runs. Once the PR is in sync, the label is removed and the comment is marked resolved. It runs from a `pull_request_target` caller, checks out the base branch only and never runs PR code. `reusable-readme-sync` and `reusable-readme-docs-sync-check` gain a `post-comment` input (default `true`) so callers can switch their generic comment off.

## [2.10.1] - 2026-11-21

### Changed

- Expanded troubleshooting guide with common agent mistakes and short-name notes.
- Updated quickstart-for-agents to mention short-name aliases.

## [2.10.0] - 2026-11-21

### Added

- Added short-name alias reusable-test-deploy that calls the existing test-deploy workflow.

## [2.9.0] - 2026-11-21

### Changed

- auto-rebase `supersede-fork-prs`: when the contributor force-pushes (rewrites) their fork PR after a supersede PR exists, the action no longer fails with "close the supersede PR and delete the branch". Instead it re-applies the contributor's current net change on the base branch and pushes it as one `Sync with #N` commit on top of `supersede/pr-N`. That push is still a fast-forward, with no force-push. The contributor stays author and co-author, and both PRs get a comment. Per-PR supersede states that need a maintainer (conflicts, a leftover branch, changes already on base) are commented on the PR and logged as warnings instead of failing the whole run. Only callers that already set `supersede-fork-prs: true` are affected. New optional `supersede-sync-message` input (action and reusable workflow): after new or rewritten contributor commits are synced, the contributor gets a templated thank-you on their PR, once per head SHA. Placeholders are `{author}`, `{sha}`, `{supersede}` and `{number}`, and there's a friendly default.

## [2.8.0] - 2026-11-20

### Added

- Added short-name alias reusable-pr-report that calls the existing PR status report workflow.
- Added short-name alias reusable-readme-only that calls the existing comment-readme-only workflow.

## [2.7.0] - 2026-11-20

### Added

- auto-rebase: opt-in `delegate-bot-rebase` input (action and `reusable-auto-rebase-prs.yml`). Renovate and Dependabot PRs that are behind or conflicting are handed back to the bot (Renovate's rebase checkbox is ticked, or `@dependabot rebase` is commented once per head commit) instead of a git rebase that cannot regenerate lockfiles. They are reported as delegated, not failed. Off by default.

## [2.6.0] - 2026-11-18

### Added

- auto-rebase: opt-in `supersede-fork-prs` (with `supersede-union-paths` and `supersede-draft`). It replays conflicting or non-updatable fork PRs into a `supersede/pr-N` branch and opens a PR that starts with `Supersedes #N`. It never pushes to the fork. New `close-superseded` action and `reusable-close-superseded-prs.yml` workflow close the superseded PR when the new one merges.

### Fixed

- auto-rebase: comparing a PR with its base no longer fails with `Not Found` (it now uses `compareCommitsWithBasehead` with the head SHA). Behind PRs whose checks are red now get a branch update, and the "already up to date" skip works for every PR, fork PRs included.

## [2.5.1] - 2026-11-17

### Fixed

- `readme-docs-sync-check` / `readme-sync`: with the opt-in `pass-if-links-in-docs: true`, a README-only PR that adds no links (prose or table edits, e.g. a CI section) now passes instead of failing with "README.md changed but no matching docs file was updated". Callers without the input are unchanged.

## [2.5.0] - 2026-11-17

### Added

- Added the documented short-name aliases `reusable-test-deploy`, `reusable-readme-only` and `reusable-pr-report`, which docs/naming.md listed as available but did not exist, plus a test that every alias in docs/naming.md exists and accepts its long name's inputs.

### Changed

- Documented common agent mistakes and the caller permissions for each reusable workflow in docs/troubleshooting.md, and updated quickstart-for-agents to use short names and pin `@v2`.

## [2.4.0] - 2026-11-16

### Added

- `auto-rebase`: in `rebase-conflicts` mode a PR is first compared with its base, and a branch that is not behind (`behind_by: 0`, e.g. it already merged `main`) is reported as "already up to date" instead of being replayed and failing on adjacent-line conflicts. New opt-in `merge-fallback` input (default `false`) on the action and `reusable-auto-rebase-prs.yml`: when the rebase conflicts but GitHub reports the PR as mergeable, request a non-force merge update (update-branch API) instead of failing.

### Changed

- Documented that docs-suite label-conflicts calls the existing conflicted-PRs workflow.

## [2.3.0] - 2026-11-16

### Added

- Added reusable-docs-suite as the recommended one-call entry point for greenfield Docusaurus sites.

### Changed

- `docs/actions/docs-ci.md` now lists every input, the check name each job produces, and explains the skipped `inputs.npm-check-job-name` check (GitHub does not evaluate `name:` on a job skipped by `if:`) and why it is left unchanged. Docs only.
- Made reusable-docs-suite the recommended starting point in llms.txt and updated the v2 migration checklist.
- `skills/docusaurus-docs-site` covers gaps found while adopting real sites: bootstrapping an empty repo, lychee config loading and Docusaurus local-link flags, auto-changelog 2.7.0 `output` refusal, MD025 with front-matter titles, i18n internal links with `onBrokenLinks: throw`, and build-only sites without Pages.

### Fixed

- Fixed reusable-docs-suite to call the existing label-conflicted workflow and added the short alias reusable-label-conflicts.
- `git-push-retry` (used by the changelog, docs-index and catalog-api reusable workflows) now rebases with `--autostash` when a push to `main` is rejected, so unrelated unstaged files no longer abort the retry with "cannot pull with rebase: You have unstaged changes". It also stops pulling and sleeping after the final failed attempt. Runs whose first push succeeds are unchanged.

## [2.2.0] - 2026-11-16

### Added

- `lychee-link-check` and `reusable-link-check.yml` accept optional `docusaurus-root` and `config-file` inputs. When `docusaurus-root` is set, the check appends `--root-dir`, `--fallback-extensions md,mdx`, and `--index-files index.md,index.mdx,.` so Docusaurus root-relative and extensionless links resolve to Markdown sources. When `config-file` is set and the file exists, it passes `--config`. Both default to empty, so existing callers are unchanged.

### Changed

- Troubleshooting guide now covers failures seen on caller repos: auto-changelog 2.7.0 refusing an unsafe `.auto-changelog` `output`, lychee local-link noise on Docusaurus sites, `.lychee.toml` not being auto-loaded, fork PR comment 403s, auto-rebase skipping `unstable` PRs, the `pull_request_target` brownout, and org-owned fork PRs.

## [2.1.0] - 2026-11-16

### Added

- `lychee-link-check` and `reusable-link-check.yml` accept an opt-in `update-existing-issue` input. When set with `create-issue`, the report updates the newest open issue with the same title instead of opening a new issue every run. Default `false` keeps the current behavior.

## [2.0.1] - 2026-11-16

### Fixed

- auto-rebase now updates pull requests that GitHub marks `unstable` or `blocked` when they are behind their base branch. GitHub reports failing checks ahead of `behind`, so these PRs were skipped before. `clean` PRs are still left alone.

## [2.0.0] - 2026-11-16

### Changed

- Prefer short-name aliases as the public surface. Long names remain supported but are deprecated and will be removed in v3. No behavior changes.
- Updated the consumer adoption guide with a before/after example for short names + @v2.

### Fixed

- `reusable-comment-readme-only` and `reusable-readme-docs-sync-check` no longer crash when they cannot comment on a pull request from a fork, where the token is read-only. They log a warning and put the guidance in the job summary instead.

## [1.18.1] - 2026-11-16

### Added

- Added draft v2 release notes and consumer adoption guide.

### Changed

- Updated llms.txt to prefer short names and reference the v2 release notes.

## [1.18.0] - 2026-11-16

### Added

- `reusable-readme-docs-sync-check` (and the `reusable-readme-sync` alias) has a new opt-in input, `pass-if-links-in-docs`. When it is true, a PR that changes only `README.md` passes if every link it adds is already in a docs file matching `docs-glob`. It defaults to false, so existing callers behave as before.

## [1.17.1] - 2026-11-16

### Changed

- Added deprecation comments at the top of long-named reusable workflows pointing to short aliases.
- Updated key examples to prefer short-name aliases and pin @v1.
- Updated naming guide and v2 migration checklist to mark all short-name aliases as available.
- Marked examples and deprecation steps complete in the v2 migration checklist.

## [1.17.0] - 2026-11-16

### Added

- Added docs/agent-short-names.md with a short checklist for agents preferring short workflow names.
- Added docs/deprecation.md listing long workflow names and their preferred short aliases.
- Added short-name alias reusable-entry-format that calls the existing awesome-entry-format-check workflow.
- Added short-name alias reusable-image-check that calls the existing build-image-check workflow.
- Added short-name alias reusable-thin-content that calls the existing thin-content-check workflow.

## [1.16.4] - 2026-11-16

### Changed

- Updated examples guide to prefer short-name aliases.

## [1.16.3] - 2026-11-16

### Added

- Added docs/v2-migration.md with a checklist for the short-name migration.

### Changed

- Updated llms.txt to prefer short-name aliases.

## [1.16.2] - 2026-11-16

### Fixed

- The open PRs status report now lists issues with `issues.listForRepo`, fixing the 404 on scheduled runs. Scheduled auto-rebase sweeps now skip conflicting PRs with a warning instead of failing the run and commenting on the PR each time; targeted runs still fail on conflicts.

## [1.16.1] - 2026-11-16

### Fixed

- Renovate no longer pins this repo's own actions to a commit SHA, and labels its PRs `dependencies` so the changelog check skips them.

## [1.16.0] - 2026-11-14

### Added

- Added short-name aliases reusable-pages-deploy and reusable-readme-sync that call the existing long-named workflows. Both names remain supported.

### Changed

- AGENTS.md, README, and llms.txt now prominently link the new architecture, naming, and YAML AI rules guides.

## [1.15.2] - 2026-11-14

### Added

- Added docs/architecture.md — a clean, high-level overview of the suite for humans and agents.

## [1.15.1] - 2026-11-14

### Added

- Added docs/naming.md with analysis of long action names and a proposed v2 rename plan.
- Expanded llms.txt as an LLM entry point and added docs/yaml-ai-rules.md with strict rules for agents writing YAML.

## [1.15.0] - 2026-11-14

### Added

- Add reusable awesome-entry-format-check workflow that warns on list entries missing the description separator.

## [1.14.0] - 2026-11-12

### Added

- Build image check: list pages with broken images (full URLs with the new `site-url` input) in the job summary and as a `build-image-report` JSON artifact, and report raster `data:` URIs whose bytes are not an image (`inlined-not-an-image`).
- Thin content check: new `actions/thin-content-check` and `reusable-thin-content-check.yml` that list built Docusaurus pages with little main content (word count, image-only, heading-only, placeholder text) as a job summary checklist with page URLs and a `thin-content-report` JSON artifact.

## [1.13.0] - 2026-11-11

### Added

- Build image check: report Git LFS pointers that Docusaurus inlined as `data:` URIs (`inlined-git-lfs-pointer`), and add an `lfs` input to `reusable-build-image-check.yml`.

## [1.12.1] - 2026-11-08

### Changed

- Appended comment-readme-only to the actions index.

## [1.12.0] - 2026-11-08

### Added

- Reusable workflow that posts a one-time dual-update reminder when a PR only changes README.md.

### Changed

- Updated the actions index and extraction-candidates doc to reflect the newly extracted workflows.

## [1.11.0] - 2026-11-08

### Added

- Reusable workflow that fails and comments when README.md changes without a matching docs page update. Paths and comment body are configurable.

## [1.10.0] - 2026-11-08

### Added

- Reusable workflow that creates or updates a tracking issue summarizing open PRs (oldest first).

## [1.9.0] - 2026-11-08

### Added

- Added docs/extraction-candidates.md tracking remaining workflows that should move under the shared umbrella.
- Reusable workflow that labels open PRs with has-conflicts when mergeable_state is dirty and removes the label when clean.

## [1.8.0] - 2026-11-08

### Added

- Auto-rebase: `report-conflicts` comments conflicting files once per head SHA without failing, `comment-on-update` silences update comments, optional `AUTO_REBASE_TOKEN` secret re-triggers CI; example now runs on every push to main.
- PR hygiene skill, consumer `AGENTS.md` template, AI-fix design note, and a grouped weekly Dependabot example.

## [1.7.4] - 2026-11-08

### Added

- Added docs/actions/root-action.md documenting the marketplace umbrella composite and when to prefer specialized workflows.

### Changed

- Expanded docs/ai-agent-guide.md with links to the new reference docs and added skills/adoption-patterns/SKILL.md.
- Updated README links to the new agent docs and added docs/quickstart-for-agents.md.

## [1.7.3] - 2026-11-08

### Changed

- Expanded docs/build-image-check.md with more adoption patterns, allowlist examples, mode guidance, and notes on unquoted-attribute coverage.
- Completed the per-action reference under docs/actions/ with pages for star-request, auto-rebase, docusaurus-pr-comment, npm-script-check, build-image-check, pages-deploy, changelog, docs-index, and catalog-api.

## [1.7.2] - 2026-11-08

### Added

- Added docs/inputs-reference.md (consolidated common inputs) and docs/pinning.md (supply-chain guidance for agents).
- Added skills/README.md index and docs/examples-guide.md explaining when to copy which example.

### Changed

- Added a For AI agents section to CONTRIBUTING.md pointing at the playbook, skills, and key conventions.

## [1.7.1] - 2026-11-08

### Added

- Added focused agent skills for awesome-list adoption, changelog patterns, and troubleshooting.

### Changed

- Added detailed per-action reference guides under docs/actions/ covering inputs, examples, and agent notes for all major composites and workflows.
- Overhauled README.md with table of contents, architecture diagram, For AI agents section, and clearer structure.
- Added docs/troubleshooting.md and expanded docs/design.md with layout conventions, pinning rules, and agent-oriented guidance.

## [1.7.0] - 2026-11-08

### Added

- Targeted PR branch updates, computed mergeability retries, opt-in conflict rebases with SHA leases and per-PR failure summaries.

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

[2.15.3]: https://github.com/LLazyEmail/documentation-actions/compare/v2.15.2...v2.15.3
[2.15.2]: https://github.com/LLazyEmail/documentation-actions/compare/v2.15.1...v2.15.2
[2.15.1]: https://github.com/LLazyEmail/documentation-actions/compare/v2.15.0...v2.15.1
[2.15.0]: https://github.com/LLazyEmail/documentation-actions/compare/v2.14.1...v2.15.0
[2.14.1]: https://github.com/LLazyEmail/documentation-actions/compare/v2.14.0...v2.14.1
[2.14.0]: https://github.com/LLazyEmail/documentation-actions/compare/v2.13.0...v2.14.0
[2.13.0]: https://github.com/LLazyEmail/documentation-actions/compare/v2.12.0...v2.13.0
[2.12.0]: https://github.com/LLazyEmail/documentation-actions/compare/v2.11.0...v2.12.0
[2.11.0]: https://github.com/LLazyEmail/documentation-actions/compare/v2.10.1...v2.11.0
[2.10.1]: https://github.com/LLazyEmail/documentation-actions/compare/v2.10.0...v2.10.1
[2.10.0]: https://github.com/LLazyEmail/documentation-actions/compare/v2.9.0...v2.10.0
[2.9.0]: https://github.com/LLazyEmail/documentation-actions/compare/v2.8.0...v2.9.0
[2.8.0]: https://github.com/LLazyEmail/documentation-actions/compare/v2.7.0...v2.8.0
[2.7.0]: https://github.com/LLazyEmail/documentation-actions/compare/v2.6.0...v2.7.0
[2.6.0]: https://github.com/LLazyEmail/documentation-actions/compare/v2.5.1...v2.6.0
[2.5.1]: https://github.com/LLazyEmail/documentation-actions/compare/v2.5.0...v2.5.1
[2.5.0]: https://github.com/LLazyEmail/documentation-actions/compare/v2.4.0...v2.5.0
[2.4.0]: https://github.com/LLazyEmail/documentation-actions/compare/v2.3.0...v2.4.0
[2.3.0]: https://github.com/LLazyEmail/documentation-actions/compare/v2.2.0...v2.3.0
[2.2.0]: https://github.com/LLazyEmail/documentation-actions/compare/v2.1.0...v2.2.0
[2.1.0]: https://github.com/LLazyEmail/documentation-actions/compare/v2.0.1...v2.1.0
[2.0.1]: https://github.com/LLazyEmail/documentation-actions/compare/v2.0.0...v2.0.1
[2.0.0]: https://github.com/LLazyEmail/documentation-actions/compare/v1.18.1...v2.0.0
[1.18.1]: https://github.com/LLazyEmail/documentation-actions/compare/v1.18.0...v1.18.1
[1.18.0]: https://github.com/LLazyEmail/documentation-actions/compare/v1.17.1...v1.18.0
[1.17.1]: https://github.com/LLazyEmail/documentation-actions/compare/v1.17.0...v1.17.1
[1.17.0]: https://github.com/LLazyEmail/documentation-actions/compare/v1.16.4...v1.17.0
[1.16.4]: https://github.com/LLazyEmail/documentation-actions/compare/v1.16.3...v1.16.4
[1.16.3]: https://github.com/LLazyEmail/documentation-actions/compare/v1.16.2...v1.16.3
[1.16.2]: https://github.com/LLazyEmail/documentation-actions/compare/v1.16.1...v1.16.2
[1.16.1]: https://github.com/LLazyEmail/documentation-actions/compare/v1.16.0...v1.16.1
[1.16.0]: https://github.com/LLazyEmail/documentation-actions/compare/v1.15.2...v1.16.0
[1.15.2]: https://github.com/LLazyEmail/documentation-actions/compare/v1.15.1...v1.15.2
[1.15.1]: https://github.com/LLazyEmail/documentation-actions/compare/v1.15.0...v1.15.1
[1.15.0]: https://github.com/LLazyEmail/documentation-actions/compare/v1.14.0...v1.15.0
[1.14.0]: https://github.com/LLazyEmail/documentation-actions/compare/v1.13.0...v1.14.0
[1.13.0]: https://github.com/LLazyEmail/documentation-actions/compare/v1.12.1...v1.13.0
[1.12.1]: https://github.com/LLazyEmail/documentation-actions/compare/v1.12.0...v1.12.1
[1.12.0]: https://github.com/LLazyEmail/documentation-actions/compare/v1.11.0...v1.12.0
[1.11.0]: https://github.com/LLazyEmail/documentation-actions/compare/v1.10.0...v1.11.0
[1.10.0]: https://github.com/LLazyEmail/documentation-actions/compare/v1.9.0...v1.10.0
[1.9.0]: https://github.com/LLazyEmail/documentation-actions/compare/v1.8.0...v1.9.0
[1.8.0]: https://github.com/LLazyEmail/documentation-actions/compare/v1.7.4...v1.8.0
[1.7.4]: https://github.com/LLazyEmail/documentation-actions/compare/v1.7.3...v1.7.4
[1.7.3]: https://github.com/LLazyEmail/documentation-actions/compare/v1.7.2...v1.7.3
[1.7.2]: https://github.com/LLazyEmail/documentation-actions/compare/v1.7.1...v1.7.2
[1.7.1]: https://github.com/LLazyEmail/documentation-actions/compare/v1.7.0...v1.7.1
[1.7.0]: https://github.com/LLazyEmail/documentation-actions/compare/v1.6.2...v1.7.0
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
