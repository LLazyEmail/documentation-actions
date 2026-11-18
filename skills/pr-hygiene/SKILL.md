---
name: pr-hygiene
description: Rules that keep LLazyEmail PRs from conflicting, stacking, or needing manual cleanup. Use before opening, combining, or rebasing PRs.
---

# PR hygiene checklist

Use before opening a PR, combining PRs, or answering a rebase request. These
rules exist so the owner spends no time asking for rebases or closing
superseded PRs.

## Before opening a PR

- [ ] **One file, one PR.** Edits to the same file (README, docs lists,
      `sidebars.js`, `CHANGELOG`-like lists) go into **one** PR. Do not open a
      second PR that touches a file another open PR already edits; add to that
      PR or wait for it to merge.
- [ ] **Dependencies are declared first.** If the PR needs another PR merged
      first, the PR body's **first line** is `Merge after #X` (one line per
      dependency). Do not hide this further down.
- [ ] **Small and draft.** Open as a draft. Keep unrelated changes in separate
      PRs that touch separate files.
- [ ] Commit trailer: `Co-authored-by: petroved <arthur.tkachenko.netweight@gmail.com>`.
      Credit outside contributors with their GitHub noreply `Co-authored-by`.

## Combining PRs

- [ ] A combined PR lists every PR it replaces as `Closes #N`, one per line,
      in the body. GitHub then closes the originals when the combined PR merges,
      so no one has to close them by hand. (GitHub only does this for
      *issues*; for replaced **PRs** also add `Supersedes #N` lines and the
      `close-superseded-prs.yml` workflow.)
- [ ] Keep the original authors' `Co-authored-by` trailers.
- [ ] Do not close the originals before the combined PR merges.

## Rebase requests

- [ ] First use the repository's `auto-rebase-prs.yml` (calling
      `reusable-auto-rebase-prs.yml@v1`) with targeted `pr-numbers`.
- [ ] Only fall back to a manual rebase if the workflow reports conflicts
      it cannot resolve. Ask the owner before force-pushing a PR branch.
- [ ] Never push a rebase whose tree equals the base branch; GitHub
      auto-closes the PR.
- [ ] With the push trigger enabled (see `docs/auto-rebase.md`), behind PRs
      update themselves; only conflict comments need attention.

## Contributor (fork) PRs that conflict or can't be pushed to

- [ ] Never push or force-push to a contributor fork.
- [ ] Rebase the work into a new base-repo branch `supersede/pr-<N>` (or let
      the auto-rebase `supersede-fork-prs` input do it), keeping the original
      commit authors and adding the contributor's noreply `Co-authored-by` trailer.
- [ ] The new PR body starts with `Supersedes #N` and links #N; comment on #N
      with a link to the new PR. Do not close #N by hand.
- [ ] The repo's `close-superseded-prs.yml` closes #N with a thank-you when
      the new PR merges (GitHub's `Closes #N` only closes issues, not PRs).

## Never

- Merge, push to `main`, or create tags or releases by hand.
- Delete docs or curated content; archive or annotate instead.
- Invent secrets or tokens; document which secret the owner must add.
