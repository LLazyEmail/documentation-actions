# AGENTS.md

<!--
Template from LLazyEmail/documentation-actions (docs/templates/AGENTS.md).
Copy into a consumer repo root and fill in the "This repository" section.
Keep the guardrails unchanged unless the owner agrees.
-->

Rules for AI coding agents (and humans) working in this repository.

## This repository

- Purpose: <one line>
- Content lives in: <e.g. `README.md`, `website/docs/`>
- Build / check commands: <e.g. `npm ci && npm run build`>
- Shared CI comes from `LLazyEmail/documentation-actions@v1`; copy its
  `examples/` instead of writing new job YAML.

## Guardrails

| Rule | Detail |
| --- | --- |
| Draft PRs only | Open PRs as drafts. Never merge. |
| No pushes to `main` | Work on branches. Never force-push `main`. |
| No manual releases | Never create tags or releases by hand; releases come from automation. |
| No fake secrets | Never commit tokens or placeholder secrets. Name the secret the owner must add. |
| No deletions of docs | Archive or annotate docs and curated entries; never delete them. |
| Force-push needs approval | Ask the owner before force-pushing any PR branch. |
| Closing needs approval | Close PRs only when the owner asks or via `Closes #N` on a merged combined PR. |
| Commit trailer | `Co-authored-by: petroved <arthur.tkachenko.netweight@gmail.com>`; credit outside contributors with noreply `Co-authored-by` trailers. |

## PR hygiene

1. **Same file → same PR.** Never open a second PR that edits a file another
   open PR already edits.
2. **`Merge after #X` first.** A PR that depends on another starts its body
   with `Merge after #X`.
3. **`Closes #N` on combined PRs.** List every replaced PR so GitHub closes
   them on merge.
4. **Small PRs.** One topic per PR; unrelated changes go to separate files.

## Rebases

1. Use `.github/workflows/auto-rebase-prs.yml` first (dispatch with
   `pr-numbers`). It also runs on every push to `main`: behind PRs update
   automatically, conflicting PRs get one comment listing the files.
2. Fix listed conflicts manually only if the workflow cannot; ask before
   force-pushing.
3. Never push a rebase that makes a branch identical to `main` (GitHub closes
   the PR).

## CI

- A PR is ready only when required checks are green.
- If a check is red, fix it in the same PR or explain the failure in the PR
  body. Do not disable checks to get green.
