# Optional AI-fix step (design note)

Status: **design only**. Nothing here is implemented, and no secrets are added.

## Goal

Most PR upkeep is rule-based and already automated:

| Task | Handled by |
| --- | --- |
| Behind PRs | `reusable-auto-rebase-prs.yml` on `push` to main (update-branch) |
| Conflicting PRs | Same workflow with `report-conflicts: true` (one comment listing files) |
| Superseded PRs | `Closes #N` in combined PRs |
| Dependency noise | Grouped weekly Dependabot / Renovate ([example](../examples/dependabot.yml)) |
| Merge order | `Merge after #X` as the first line of the PR body |

An AI agent is only worth adding for what rules cannot do: resolving real
conflicts (usually list/README edits) and fixing small red checks (lint,
Prettier, broken links).

## Trigger (only on failure)

Run the AI step **only** when:

1. the auto-rebase workflow posted a conflict comment (the
   `<!-- auto-rebase-conflicts:SHA -->` marker), or
2. a required check on a PR concluded `failure` (`workflow_run` / `check_suite`).

Never run on every push or every PR, and never on `pull_request_target` with
untrusted checkout.

## Guardrails

- Follows the repo's `AGENTS.md` ([template](templates/AGENTS.md)).
- Pushes only to the PR's own head branch, or opens a new draft PR; never
  `main`, never merges, never tags.
- Force-pushes only with the owner's approval; otherwise adds a merge commit.
- Skips fork PRs unless "Allow edits from maintainers" is on.
- Leaves a comment explaining every change and linking the run.
- One attempt per head SHA; if it fails, it comments and stops.

## Credentials

Needs a token the owner creates (fine-grained PAT or GitHub App with
`contents: write` and `pull-requests: write` on the repo) plus whatever API
key the chosen agent needs. Store both as repository or org secrets; never
commit them. Without those secrets the step must skip cleanly.

## Rollout

1. Land the rule-based pieces in every repo first (push-triggered rebase,
   `AGENTS.md`, grouped Dependabot).
2. Watch for two weeks which conflict and red-check comments still need a
   human.
3. Only then pilot the AI step on one repo (awesome-email-marketing).
