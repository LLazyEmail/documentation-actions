# Merge order — documentation-actions

Generated: **Thursday, October 29, 2026 (Europe)** (`2026-10-29`, Europe/Kiev).  
Source of truth for landing stacked/combined PRs onto `main`, then cutting `v1` and merging consumer adoption PRs.

Do **not** merge out of order. Check each box only after that PR is on `main` with green CI.

---

## documentation-actions (this repo)

- [ ] 1. [#19 feat: CI foundation, star-request, auto-rebase, README polish](https://github.com/LLazyEmail/documentation-actions/pull/19) — base `main`. Lands CI/release, early in-repo auto-rebase, `star-request`, `auto-rebase`, README/adoption docs. Recovers content that previously merged only into side-branches (#3, #4, #5, #15). **Merge first.**
- [ ] 2. [#20 feat: remaining docs/awesome actions (combined stack)](https://github.com/LLazyEmail/documentation-actions/pull/20) — base `combine/foundation` (PR #19). After #19 merges, retarget this PR to `main` if GitHub does not do so automatically, confirm CI green, then merge. Replaces former stacked #6–#9 and #11–#14 (markdownlint, lychee, docusaurus-build, test-deploy, pages-deploy content, changelog, docs-index, catalog-api, awesome-list-checks).
- [ ] 3. **Cut `v1`** — after #19 and #20 are on `main`, create the first release / tag so `release.yml` can move the floating major tag `v1`. Prefer pin consumers to `@v1` (or a commit SHA) after this step.

---

## Adoption PRs (merge after documentation-actions is on `main` and `v1` is cut)

Prefer retargeting callers from `@main` to `@v1` when updating these drafts, unless you intentionally want floating `main`.

### [awesome-email-marketing](https://github.com/LLazyEmail/awesome-email-marketing)

- [ ] [#362 ci: adopt documentation-actions star-request](https://github.com/LLazyEmail/awesome-email-marketing/pull/362)
- [ ] [#363 ci: adopt documentation-actions auto-rebase](https://github.com/LLazyEmail/awesome-email-marketing/pull/363)
- [ ] [#364 ci: adopt documentation-actions markdownlint](https://github.com/LLazyEmail/awesome-email-marketing/pull/364)
- [ ] [#365 ci: adopt documentation-actions lychee link-check](https://github.com/LLazyEmail/awesome-email-marketing/pull/365)
- [ ] [#366 ci: adopt documentation-actions test-deploy](https://github.com/LLazyEmail/awesome-email-marketing/pull/366) — needs docusaurus-build + test-deploy on DA `main`/`v1`
- [ ] [#367 ci: adopt documentation-actions Pages deploy](https://github.com/LLazyEmail/awesome-email-marketing/pull/367) — needs docusaurus-build + pages-deploy on DA `main`/`v1`
- [ ] [#368 ci: adopt documentation-actions changelog](https://github.com/LLazyEmail/awesome-email-marketing/pull/368)
- [ ] [#369 ci: adopt documentation-actions docs-index](https://github.com/LLazyEmail/awesome-email-marketing/pull/369)
- [ ] [#370 ci: adopt documentation-actions industry-leaders API](https://github.com/LLazyEmail/awesome-email-marketing/pull/370)

### [awesome-newsletters](https://github.com/LLazyEmail/awesome-newsletters)

- [ ] [#110 ci: adopt documentation-actions star-request](https://github.com/LLazyEmail/awesome-newsletters/pull/110)
- [ ] [#111 ci: adopt documentation-actions auto-rebase](https://github.com/LLazyEmail/awesome-newsletters/pull/111)
- [ ] [#112 ci: adopt documentation-actions markdownlint](https://github.com/LLazyEmail/awesome-newsletters/pull/112)
- [ ] [#113 ci: adopt documentation-actions lychee link-check](https://github.com/LLazyEmail/awesome-newsletters/pull/113)
- [ ] [#114 ci: adopt documentation-actions test-deploy](https://github.com/LLazyEmail/awesome-newsletters/pull/114)
- [ ] [#115 ci: adopt documentation-actions Pages deploy](https://github.com/LLazyEmail/awesome-newsletters/pull/115)
- [ ] [#116 ci: adopt documentation-actions changelog](https://github.com/LLazyEmail/awesome-newsletters/pull/116)
- [ ] [#117 ci: adopt documentation-actions docs-index](https://github.com/LLazyEmail/awesome-newsletters/pull/117)
- [ ] [#118 ci: adopt documentation-actions entry-format check](https://github.com/LLazyEmail/awesome-newsletters/pull/118)
- [ ] [#119 ci: adopt documentation-actions duplicate-links check](https://github.com/LLazyEmail/awesome-newsletters/pull/119)
- [ ] [#120 ci: adopt documentation-actions sorted-sections check](https://github.com/LLazyEmail/awesome-newsletters/pull/120)

### [documentation](https://github.com/LLazyEmail/documentation)

Workflow-only adoption (root-level Docusaurus; peaceiris + CNAME):

- [ ] [#324 ci: adopt documentation-actions test-deploy](https://github.com/LLazyEmail/documentation/pull/324)
- [ ] [#326 ci: adopt documentation-actions Pages deploy (peaceiris)](https://github.com/LLazyEmail/documentation/pull/326)

Related consumer prep (not adoption callers; merge when ready, ideally Node 22 foundation before or with adopt):

- [ ] [#328 chore: combine Node 22 CI foundation](https://github.com/LLazyEmail/documentation/pull/328) — engines/lockfile/Node 22 on existing workflows; merge before or when updating #324/#326 to `node-version: '22'`

---

## Settings to change

Owner/org settings to verify before or right after merging #19:

1. **Actions enabled** on `LLazyEmail/documentation-actions` (Allow all actions, or allow listed actions including this repo’s composite actions and reusable workflows).
2. **Workflow permissions** — repository Settings → Actions → General → Workflow permissions: **Read and write** permissions (needed for auto-rebase updating PR branches, release floating `v1` tag pushes, and any commit-back reusable workflows).
3. **Allow GitHub Actions to create and approve pull requests** — enable if you want Renovate/auto-rebase style bots to open or update PRs.
4. **Renovate** — app already configured via #1/#2; confirm it stays installed on this repo after CI lands.
5. **Branch protection on `main`** (optional but recommended): require CI status checks (`Lint`, `Unit tests`) before merge; do **not** require linear history if you prefer merge commits for release notes.
6. **Pages / deploy consumers** — for repos using Actions Pages (not peaceiris), ensure Pages source is GitHub Actions and `id-token`/`pages` permissions are allowed; `documentation` keeps peaceiris + `docs.llazyemail.com`.
7. **First release** — after #20: tag (e.g. `v1.0.0`) so `release.yml` can publish/move floating `v1`; then flip adoption PRs to `@v1`.

---

## Closed / combined (historical)

These open stack PRs were closed with `Combined into #20 to avoid repeated rebases.`: #6, #7, #8, #9, #11, #12, #13, #14.  
Already on `main` earlier: #1 (Renovate), #2 (infra). Side-branch-only merges recovered by #19: #3, #4, #5, #15 (and pages-deploy content from #10 via #20).
