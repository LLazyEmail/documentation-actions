# Reorganization proposal

## Status: decided 2026-11-23

Arthur answered all five questions in #181 on 2026-11-23 (Europe/Kiev):

1. **Option (a): yes.** Actions are the single source of truth, and a manifest plus a
   generator writes the thin reusable workflows and aliases. This is a separate PR that
   follows the pinning work.
2. **Pin actions per release: yes.** `tag-release.yml` rewrites own `@main` refs to the
   release tag in the tagged commit, opt-in through `RELEASE_PIN_TOKEN`. See
   [`docs/pinning.md`](pinning.md#per-release-pinning-of-this-repos-own-refs).
3. **Move `@v1` callers to `@v2`: yes, now.** Done with caller PRs.
4. **Long names: kept for all of v2, with no removal date.** See
   [`docs/deprecation.md`](deprecation.md).
5. **Umbrella per-domain workflows: later, as opt-in extras only.** They never replace
   the existing names.

### Progress

- 2026-11-23, decision 2: per-release pinning merged (#187). It's opt-in until the
  `RELEASE_PIN_TOKEN` secret exists.
- 2026-11-23, decision 1, step 1: `workflows.manifest.yml` and
  `scripts/gen-workflows.py`.
  - **Generated (13):** all short-name alias files. Each is semantically identical to
    the hand-written version: the same inputs, defaults, types, secrets, permissions,
    job ids and `with:` values. The text differs only in a "generated" comment
    line, input descriptions the old copies had dropped, and the order of `with:` keys.
  - **Checked, not generated (22):** every other reusable workflow. The checks cover
    job ids, check names, permissions, secrets, the actions it calls (and that every
    input passed to them exists), unused inputs, and `@main` own refs.
  - **Why the 22 aren't generated yet:** their job bodies are all different
    (checkout options, `if:`, concurrency, value conversions like `&& 'true' || 'false'`).
    Renovate also updates the third-party SHA pins inside them, and it would have to
    update a manifest instead, which it can't. Next step: generate their
    `workflow_call` inputs from the action's `action.yml` plus per-input type
    overrides, leaving the steps hand-written.
  - **Known quirk, found by the generator check:** `reusable-docusaurus-test-deploy` and
    `reusable-test-deploy` accepted `fetch-depth` but didn't pass it on. Fixed in the
    follow-up PR: `reusable-docs-ci` now has an opt-in `fetch-depth` input (default `0`,
    the previous fixed value), and test-deploy forwards it.

- Decision 1, step 2: the generator now writes the `workflow_call.inputs` block of
  9 single-action wrappers from their `action.yml`. These are auto-rebase-prs,
  awesome-list-checks, close-superseded-prs, docusaurus-pages-deploy, link-check,
  markdownlint, npm-script-check, star-request and sync-feedback.
  - The rule: `<name>: <type>` takes the action's description, required and default.
    `keep` keeps a workflow-only input. Every action input must be exposed or listed
    in `not-exposed:`.
  - This is semantically identical for callers: the same names, order, types,
    defaults and required flags. Only the descriptions now use the action's wording.
  - Still hand-written: steps and `with:` lines, the git-push-retry helpers
    (catalog-api, changelog, docs-index, whose inputs mean something different from the
    action's), docs-ci (5 actions), build-image-check and thin-content-check (2 actions
    each), the composite and suite workflows, and the 5 inline-logic workflows.
- Decision 1, step 3: the same 9 wrappers now also get the action step's `with:`
  lines generated, one `<name>: ${{ inputs.<name> }}` per typed input, between
  `# generated:` / `# end generated` comments. Hand-written lines stay below the block
  and win for their key: the boolean conversions in link-check, `github-token` in
  auto-rebase, `package-manager-cache: npm` in pages-deploy. All 9 files parse to the
  same YAML as before; only comments and key order changed. A new action input now
  takes one manifest line plus a regenerate.
- Decision 1, step 4: the alias tables in `docs/naming.md` and `docs/deprecation.md` are
  generated from the manifest, between `<!-- generated: … -->` markers. The rows are
  byte-identical to the hand-written tables.

The text below is the original proposal, kept as written.

Original status: **proposal**. This page changes no code and no caller. It records how the
repository is put together today, what hurts, three ways to restructure, and a
recommendation, so the choice can be made on purpose. Rule for every option:
**no breakage** — every caller that works today keeps working, on its current
name and current ref, until it is switched in its own PR.

Inventory measured on 20 November 2026 (Europe/Kiev) on `main` at 4732e06, plus
the four aliases in #179.

## 1. Inventory

| Thing | Count | Notes |
|---|---|---|
| Reusable workflows (`.github/workflows/reusable-*.yml`) | 35 (31 on `main`) | 2,375 lines in total |
| ...of which short-name aliases | 13 (9 on `main`) | 640 lines that only copy inputs and forward them |
| ...with logic inline in the YAML (no action) | 5 | `comment-readme-only`, `label-conflicted-prs`, `pr-status-report`, `readme-docs-sync-check`, `awesome-entry-format-check` |
| ...that wrap other reusable workflows | 4 + aliases | `docs-suite`, `docusaurus-test-deploy` → `docs-ci`, and the aliases |
| Composite actions (`actions/*/action.yml`) | 13 | 801 lines of `action.yml` |
| JS/MJS implementation files | 10 | `auto-rebase` (2), `close-superseded`, `docs-sync-feedback`, `docusaurus-pr-comment`, plus 5 `.mjs` check scripts |
| Workflow inputs declared on `workflow_call` | 226 | Most are declared a second time in the action's `action.yml` |
| Repo-internal workflows | 7 | ci, self-test, release, tag-release, release-changelog-pr, validate-changelog-entries, auto-rebase-prs |
| Tests / docs pages / examples | 32 / 48 / 26 | |

**Duplication.** Each alias repeats every input of its long name (the
descriptions and defaults too), so 640 of the 2,375 workflow lines are pure
copies. Each workflow that wraps an action repeats the action's inputs. The test
`tests/short-name-aliases.test.sh` catches drift between alias and long name,
but nothing checks drift between a workflow and its action.

**Which refs callers pin** (GitHub code search, default branches; the index can
lag). There are about 60 `uses:` lines in 9 repositories:

- `@v2`: awesome-email-marketing, awesome-newsletters, fuck-ecoflow,
  documentation, plus parts of v-school and markdown-regex.
- `@v1`: assemblya (all of its callers), content-marketing, plus parts of
  v-school and markdown-regex.
- Nobody pins a SHA, and nobody pins `@main`.
- `v1` is frozen at v1.18.1 (16 Nov 2026), and `v2` follows each v2.x release.

## 2. Pain points

1. **Long/short duplicate YAML.** Each new alias is a full copy of the inputs,
   and each new input has to be added in both files. That's 13 pairs today.
2. **Inputs declared in two places.** A new option goes in `action.yml`
   *and* in the reusable workflow. The action half is live as soon as it merges
   (see 3), but the workflow half reaches `@v2` callers only after a release
   moves `v2`. Callers that try the new input before that fail at startup
   (`startup_failure`, "unknown input"), which is what we saw on
   awesome-email-marketing #456 before v2.11.0.
3. **`@main` versus `@v2`.** Reusable workflows call the actions at `@main`
   (`LLazyEmail/documentation-actions/actions/<name>@main`). So:
   - A caller pinned to `@v2`, or even to the frozen `@v1`, runs **today's
     `main`** action code. `v1` has 20 such `@main` references. Pinning
     protects the input list, not the behaviour.
   - A change to an action that isn't backwards compatible breaks v1 and v2
     callers at once, the moment it merges.
   - A SHA pin on the caller doesn't give the reproducibility that
     `docs/pinning.md` promises.
4. **Release ordering.** Features that touch a workflow input need: DA PR →
   release PR (`send-it`) → `v2` moves → caller PR. Caller PRs sit in draft with
   "Merge after DA #N + release" until then. Several features in flight queue up
   behind one release PR.
5. **Fork permission splits.** A fork PR's `pull_request` token is read-only,
   so anything that comments, labels or pushes needs a second entry point on
   `pull_request_target` with a base-only checkout (for example `readme-sync`
   vs `sync-feedback`). That doubles the workflows per feature, and each caller
   has to wire two files correctly.
6. **Logic split across three styles.** Some is inline YAML/bash, some is in a
   composite action with `github-script`, and some is in standalone Node
   scripts. Only the last two have unit tests.
7. **Docs fan-out.** One feature touches the README, `docs/naming.md`,
   `docs/deprecation.md`, `docs/agent-short-names.md`, the quickstart,
   troubleshooting, the examples and `llms.txt`. These lists are maintained by
   hand.

## 3. Options

### (a) Actions/JS as the single source of truth, plus generated thin workflows

- Every feature lives in one composite action (or JS action) with one
  `action.yml`. Inline logic in the 5 inline workflows moves into actions.
- A manifest (`workflows.manifest.yml`) lists for each workflow: the action it
  wraps, its long and short names, its permissions, and its trigger kind
  (`pull_request` or `pull_request_target`).
- `scripts/gen-workflows` writes the reusable workflows and aliases from the
  manifest plus the action's inputs. CI fails if the generated files differ
  from the committed ones.
- Releases rewrite `actions/*@main` to the release tag in the tagged commit, so
  `@v2` and SHA pins really pin the code.

| Pros | Cons |
|---|---|
| Inputs are declared once; aliases and wrapper inputs can't drift | One generator plus a check job to maintain |
| Works with every existing name, file and ref; it's invisible to callers | The workflow files are still there (generated), so the repo doesn't get smaller |
| Fixes the `@main` problem at release time | Release tooling needs one new step (rewrite refs, then tag) |
| Can be done one workflow at a time | |

### (b) Umbrella workflows per domain, with feature flags

These would be `reusable-docs` (ci, links, lint, build, deploy, readme-sync),
`reusable-awesome` (duplicates, sorting, entry format, sync feedback),
`reusable-pr-hygiene` (auto-rebase, close superseded, conflict labels, report,
star request) and `reusable-npm`. Each one takes `checks: a,b,c` or boolean
flags.

| Pros | Cons |
|---|---|
| A caller repo needs 2–4 caller files instead of 10–15 | Triggers and permissions differ per feature (`push` vs `pull_request_target`, `contents: write` vs read), so an umbrella either asks for the widest permissions or still needs several entry points |
| Fewer names for agents to learn | Check names and required checks change for every caller that switches |
| | Very large input lists (the `docs-suite` precedent already has 11) |
| | Doesn't fix the double declaration or `@main` on its own |

### (c) One Node/TS action package with subcommands

Use `uses: LLazyEmail/documentation-actions@v3` with `with: { command: auto-rebase, ... }`.
The code is TypeScript, bundled with `ncc` into `dist/`, with one test suite and
one build step.

| Pros | Cons |
|---|---|
| One implementation language, typed inputs, one test runner | Biggest rewrite: bash and composite steps (Docusaurus build, lychee, Pages deploy) don't fit a JS action well, and some must stay composite or workflow |
| The action is versioned as a whole, so there's no `@main` problem | A committed `dist/` bundle and a build step on every change |
| | Callers still need reusable workflows for jobs, permissions and `pull_request_target`, so YAML wrappers stay |
| | It's effectively a v3 with a long migration |

## 4. Versioning and deprecation (any option)

- **One floating major tag** per major (`v2` now) that the release workflow
  moves. Never move it by hand, and never retag.
- **Pin actions per release.** The tagged commit references actions at the
  same tag or SHA as the workflow, not `@main`.
- **Long names:** keep them working for all of v2. Mark them "still works,
  prefer the short name" in `docs/deprecation.md` (as today). Remove them only
  in a future major, after every known caller has switched. The PR that removes
  them needs a list of callers showing zero hits.
- **`v1`:** frozen. While its workflows reference `@main`, a breaking change to
  an action also breaks v1 callers (assemblya, content-marketing, parts of
  v-school and markdown-regex). Moving those callers to `v2` is a prerequisite
  for any action change that isn't backwards compatible.

## 5. Migration plan (no-breakage rule)

1. Freeze the interfaces: no input is renamed or removed in v2. New inputs only,
   off by default.
2. Add the manifest and generator for the 13 alias pairs first. The output must
   be byte-identical to today's files.
3. Generate wrapper inputs from `action.yml` one workflow at a time. Each step
   is its own PR, with output identical apart from description text.
4. Move the 5 inline workflows into actions, keeping the workflow names.
5. Add the release step that pins `actions/*@main` → the release tag in the
   tagged commit. From then on, `@v2` and SHA pins are real.
6. Move the remaining `@v1` callers to `@v2` (short names at the same time)
   with caller PRs. Branch protection rules that require check names are
   updated in the same PR.
7. Only after that, consider (b)-style umbrellas as *extra* entry points
   (for example `reusable-pr-hygiene`), never as replacements.

## 6. Recommendation

**Option (a)**, done incrementally, with step 5 (pin actions per release) done
early, because it is the one real correctness problem: pinned callers run
unpinned code. Option (b) can come later as optional convenience wrappers on
top of (a). Option (c) is not worth a rewrite now. Most of the cost is in
Docusaurus, lychee and Pages steps that are better left as composite actions.

## 7. Decisions needed (answered 2026-11-23, see Status at the top)

1. Option (a) as the direction, yes or no?
2. Pin actions per release? This means a release changes `@main` references in
   the tagged commit, so `main` and the tag differ in those lines.
3. Timeline to move the `@v1` callers (assemblya, content-marketing, v-school,
   markdown-regex) to `@v2`.
4. Long names: keep them for the whole of v2 (proposed), or set a removal
   date?
5. Umbrella workflows: wanted later as extras, or not at all?

See also: `docs/architecture.md`, `docs/naming.md`, `docs/pinning.md`,
`docs/deprecation.md`.
