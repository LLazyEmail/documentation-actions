# Targeted branch updates and conflict rebases

Call `reusable-auto-rebase-prs.yml@v1` after this change is released. Pass
`pr-numbers: '351,371'` to select only those PRs. An empty value retains bulk
processing of open PRs. Inputs are validated before changes are attempted.

The workflow fetches each PR separately, retrying unknown mergeability up to
six times. Behind branches use GitHub's update-branch API (a merge update,
not a git rebase). Other mergeable branches need no changes. Each PR gets a
job-summary result, and one failed PR makes the job fail without skipping
later PRs.

`rebase-conflicts: true` opts in to a real git rebase for conflicting PRs.
Unresolved conflicts are aborted and listed in a PR comment. Pushes use an
explicit expected-head SHA lease; identical-to-base results and default/main
branches are refused. This mode rewrites history: obtain owner approval.
The token needs write access to the head repository; the caller's default
GITHUB_TOKEN usually cannot write forks. Failures are reported, not bypassed.
No untrusted PR scripts are run; git hooks are disabled. Concurrent executions
in a repository are serialized. Failure comments require PR write permission.

```yaml
jobs:
  rebase:
    uses: LLazyEmail/documentation-actions/.github/workflows/reusable-auto-rebase-prs.yml@v1
    with:
      pr-numbers: '351,371'
      rebase-conflicts: true
    secrets: inherit
```

Keep `contents: write` and `pull-requests: write` in the caller. Do not use
`pull_request_target` with untrusted code execution. Never pass PR input directly
into shell commands. The implementation uses argv arrays and environment values.
A green update request means accepted, not necessarily completed: inspect the
PR's final mergeability and CI after the job.

## Run on every push to main

Callers can run the bulk mode after each merge so nobody has to ask for a
rebase. Copy [`examples/auto-rebase-prs.yml`](../examples/auto-rebase-prs.yml):

```yaml
on:
  push:
    branches: [main]
  workflow_dispatch:
    inputs:
      pr-numbers: {type: string, default: ''}
      rebase-conflicts: {type: boolean, default: false}
jobs:
  rebase:
    uses: LLazyEmail/documentation-actions/.github/workflows/reusable-auto-rebase-prs.yml@v1
    with:
      pr-numbers: ${{ inputs.pr-numbers || '' }}
      rebase-conflicts: ${{ inputs.rebase-conflicts || false }}
      report-conflicts: true
      comment-on-update: ${{ github.event_name != 'push' }}
    secrets: inherit
```

| Input | Default | Effect |
| --- | --- | --- |
| `report-conflicts` | `false` | When `rebase-conflicts` is off, a conflicting PR gets a trial rebase in a throwaway clone (never pushed) and **one** comment per head SHA listing the conflicting files. The job does not fail for reported conflicts. |
| `comment-on-update` | `true` | Set `false` on push runs to avoid a "branch updated" comment on every merge. |
| `merge-fallback` | `false` | Only with `rebase-conflicts: true`. When the git rebase conflicts (for example the branch already merged `main` and the replayed commit clashes with adjacent lines) but GitHub reports the PR as mergeable, request a normal merge update (update-branch API, no force-push) instead of failing. Needs the DA release that adds it: on an older tag the caller run fails with an invalid-input error, so pass it only after the `@v2` tag includes it. |
| secret `AUTO_REBASE_TOKEN` | unset | Optional fine-grained PAT or GitHub App token. Branch updates made with the default `GITHUB_TOKEN` do **not** re-trigger `pull_request` CI, so required checks can look stale. Add the secret yourself in repo settings; the workflow falls back to `GITHUB_TOKEN`. |

Notes:

- GitHub only reports `mergeable_state: behind` when branch protection
  requires up-to-date branches. Without that rule, a behind PR reads `clean`
  and is left alone (it is still mergeable), which avoids re-running CI on
  every open PR after each merge.
- A PR with failing or pending required checks reads `unstable` or `blocked`
  even when it is also behind. For those two states the action compares the
  branch with its base and requests a branch update when it is behind, since
  the failure may already be fixed on the base. `clean` PRs are still left alone.
- In `rebase-conflicts` mode the action first compares the branch with its
  base. If the branch is not behind (`behind_by: 0`, e.g. `main` was already
  merged in), it logs "Already up to date with main; no rebase needed" and
  succeeds without rebasing. If the comparison API fails it warns and tries the
  rebase as before. This check is always on and applies to every caller.
- With `merge-fallback: true`, a conflicting rebase re-reads the PR; if GitHub
  says it is mergeable the action calls update-branch with the current head SHA
  (a merge commit, history is not rewritten). If GitHub says it is not
  mergeable the PR still fails with the conflicting files listed.
- After a conflict comment, fix the files manually or dispatch the workflow
  with `pr-numbers` and `rebase-conflicts: true` (owner approval required).
- Concurrent runs are serialized per repository; a burst of merges queues at
  most one pending run.

## Contributor (fork) PRs: supersede instead of rebase

A PR from a fork is often impossible to fix in place:

- the default `GITHUB_TOKEN` (and most App tokens) cannot push to a fork, even
  with "Allow edits from maintainers" on, so `rebase-conflicts` fails there;
- when the fork PR conflicts, GitHub's update-branch API refuses it and
  `merge-fallback` is skipped ("GitHub reports the PR as not mergeable").

`supersede-fork-prs: true` (opt-in, off by default) handles those PRs by opening
a new PR in the base repository instead:

1. It fetches the PR commits from the **base** repo's `refs/pull/<N>/head`
   (the fork is never contacted, nothing from the PR is executed, git hooks are off).
2. It creates `supersede/pr-<N>` from the base branch and cherry-picks the
   contributor's non-merge commits with `-x`. The original commit authors are
   kept and the PR author is credited with
   `Co-authored-by: <login> <<id>+<login>@users.noreply.github.com>`.
3. It opens a PR (a draft unless `supersede-draft: false`) titled
   `<original title> (supersedes #N)`, whose body starts with `Supersedes #N`, and comments
   on #N with a link. The close-superseded workflow below closes #N when the new PR merges.
4. On later runs it reuses the open supersede PR. New commits pushed to #N are
   fast-forwarded onto `supersede/pr-<N>`, and a behind supersede PR gets a merge update.
   It never force-pushes. A hidden `<!-- supersede-of:#N head:SHA -->` marker in the body
   records which contributor commit is already included.
5. If the contributor **rewrites** #N (rebase, amend or squash, then force-push), the
   old commits can no longer be fast-forwarded. The action takes the contributor's
   current net change (PR head tree against its merge-base with the base branch),
   applies it to the base branch (same `supersede-union-paths` rules), and records
   the result as **one** `Sync with #N after the contributor rewrote the branch`
   commit on top of `supersede/pr-<N>`. That commit's parents are the old supersede
   head and, if needed, the base branch, so the push is still a fast-forward and the
   PR diff shows exactly the contributor's current change. Files the contributor
   dropped are dropped. The commit keeps the contributor as author plus the
   `Co-authored-by` trailer. The marker is updated. If the rewritten change no longer
   applies cleanly, nothing is pushed and #N gets the "needs a maintainer" comment (see below).
6. Whenever new or rewritten contributor commits are synced (steps 4 and 5), the
   contributor gets **one** thank-you comment on #N per head SHA, and the supersede PR
   gets a short technical note. The thank-you text is the `supersede-sync-message`
   input. Default:

   > Thanks for the update @{author}! Your updated branch ({sha}) was synced into
   > #{supersede}, and you're still credited as co-author. Nothing to do on your side;
   > this PR will be closed when #{supersede} merges.

   Placeholders: `{author}` (PR author login), `{sha}` (short contributor head SHA),
   `{supersede}` (supersede PR number), `{number}` (original PR number). An empty value
   uses the default. When the supersede PR is first created, #N gets the existing
   welcome comment ("Thanks @author! … Nothing to do on your side …"). Runs that push
   nothing post nothing.

Conflicts: by default any cherry-pick conflict stops the flow for that PR. Nothing is
pushed, the original PR gets **one** comment per head SHA with the conflicting files,
and the run logs a warning (`Needs a maintainer (commented on #N): …`). States like this,
which a re-run can't fix (a conflict, a leftover `supersede/pr-N` branch without a
PR, changes already on the base), don't turn the run red, because the PR comment is the
signal. Real errors (API or permission failures, a PR that can't be created) still fail the job. Awesome lists conflict mostly because
two PRs append to the same list, so `supersede-union-paths` (for example
`README.md website/docs/**/*.md`) resolves a conflict by keeping both sides,
**only** when the contributor's change to that file adds lines and deletes none.
Edits to existing lines are never auto-resolved.

When it runs: for fork PRs only (same-repo branches keep the normal behavior),
when the PR is `dirty` (conflicting), or when it is behind and update-branch
is refused. It works in scheduled sweeps as well as targeted dispatches.

Requirements: "Allow GitHub Actions to create and approve pull requests" must
be enabled (repository or organization Actions settings), or PR creation fails
with a clear error. PRs opened with the default `GITHUB_TOKEN` do not start
`pull_request` CI. Set `AUTO_REBASE_TOKEN` so checks run, or push an empty
commit to the supersede branch.

```yaml
jobs:
  rebase:
    uses: LLazyEmail/documentation-actions/.github/workflows/reusable-auto-rebase-prs.yml@v2
    with:
      merge-fallback: true
      supersede-fork-prs: true
      supersede-union-paths: 'README.md website/docs/**/*.md'
    secrets: inherit
```

The new inputs need the DA release that adds them. On an older `@v2` tag,
passing them fails the caller with an invalid-input error.

## Conflict types and deleted files

Every conflict is reported with its type: in the job log and summary, in the trial-rebase
comment (`report-conflicts`), and in the conflict report on the PR.

| Type | Message |
| --- | --- |
| `deleted-on-main` | `main` deleted this file; the PR still edits it |
| `deleted-in-pr` | the PR deletes this file; `main` changed it |
| `content` | both the PR and `main` changed the same lines |
| `both-added` | both added this file with different content |
| `rename-or-add` | added or renamed on one side while the other renamed, moved or deleted it |
| `both-deleted` | renamed or removed in different ways |

Example (awesome-email-marketing #457, November 2026): the PR edited
`.github/workflows/comment-readme-only.yml`, and #456 deleted that workflow on `main`.
The rebase stopped with a modify/delete conflict. GitHub reported the PR as not mergeable,
so `merge-fallback` was skipped and the job went red.

**Conflict report on the PR.** An unresolvable conflict in `rebase-conflicts` mode gets
**one** comment per PR, edited in place on later runs instead of a new comment each run.
It lists each file with its type and what to do. Failures that aren't conflicts keep the
plain `Auto-rebase: Failed: …` comment.

**`resolve-deleted-on-main: true`** (opt-in, off by default):

- During the rebase, a conflict where `main` deleted a file and the PR only modified it
  is resolved by accepting the deletion (`git rm`). This applies only when **every**
  conflict in that step is of this kind and the file matches `resolve-deleted-paths`
  (default `.github/workflows/**`). Otherwise the rebase is aborted exactly as before.
  Commits that become empty are dropped.
- The reverse case (the PR deleted a file, `main` changed it) is never resolved automatically.
- With `merge-fallback: true`, GitHub's "not mergeable" flag no longer skips the fallback
  for same-repo PRs. The action tries a local `git merge` of `main` with the same resolver
  and pushes the merge commit as a fast-forward (no force-push).
- After an update that dropped files, the PR gets a comment listing them.

**`fail-on-conflict: false`** turns unresolvable conflicts into a warning: the job stays
green, and the PR still gets the report. The default `true` keeps today's red job.
**`conflict-label`** (for example `has-conflicts`, the label `reusable-label-conflicts` uses)
is added to PRs with unresolvable conflicts and removed after a successful update or
once the PR no longer conflicts.

```yaml
jobs:
  rebase:
    uses: LLazyEmail/documentation-actions/.github/workflows/reusable-auto-rebase-prs.yml@v2
    with:
      merge-fallback: true
      resolve-deleted-on-main: true
      fail-on-conflict: false
      conflict-label: has-conflicts
    secrets: inherit
```

These inputs need the DA release that adds them. On an older `@v2` tag, passing them
fails the caller with an invalid-input error.

## Renovate and Dependabot PRs: delegate the rebase

A plain git rebase is the wrong tool for dependency-bot PRs. A typical case
(LLazyEmail/markdown-regex, November 2026): four Renovate PRs each added lines
to `minimumReleaseAgeExclude` in `pnpm-workspace.yaml`. `main` already had every
one of those lines, in a different position, so each replay stopped with
`Rebase conflicts (aborted): pnpm-workspace.yaml` and the run went red. Even
past that file, `pnpm-lock.yaml` has to be regenerated, not merged line by line.

`delegate-bot-rebase: true` (opt-in, off by default) asks the bot to do it:

| PR author | What the action does |
| --- | --- |
| Renovate (`renovate[bot]`, or any login containing `renovate`, with the `<!-- rebase-check -->` checkbox in the body) | Ticks the "rebase/retry" checkbox. Only that checkbox changes; the rest of the body is untouched. If it is already ticked, nothing is edited. |
| Dependabot (`dependabot[bot]`) | Comments `@dependabot rebase`, once per head commit (a later sweep sees the earlier command and waits). |

When it applies: the PR is `dirty` (conflicting), `behind`, or `unstable`/`blocked`
and behind its base. Behind bot PRs are delegated too, because a merge commit
from `github-actions[bot]` makes Renovate treat the branch as edited and stop
updating it. Clean bot PRs are left alone.

The result is logged as `Delegated to Renovate: ...` / `Delegated to Dependabot: ...`.
A delegated PR is never counted as a failure and gets no "branch updated"
comment; the bot pushes the rebase itself (Renovate on its next run, usually
within minutes for the hosted app). It works in scheduled sweeps,
`report-conflicts` sweeps (instead of the conflict comment) and targeted
dispatches with `rebase-conflicts: true`.

Fallback: a Renovate PR without the checkbox (for example `rebaseWhen: never`)
and PRs from anyone else go through the normal path unchanged.

Dependabot only acts on commands from accounts with write access. If it ignores
comments from `github-actions[bot]`, set the `AUTO_REBASE_TOKEN` secret.

```yaml
jobs:
  rebase:
    uses: LLazyEmail/documentation-actions/.github/workflows/reusable-auto-rebase-prs.yml@v2
    with:
      report-conflicts: true
      delegate-bot-rebase: true
    secrets: inherit
```

Needs the DA release that adds the input. On an older `@v2` tag, passing it
fails the caller with an invalid-input error.

## Close superseded PRs when the new PR merges

GitHub's `Closes #N` keyword closes **issues**, not pull requests. To close the
superseded PR automatically, add
[`examples/close-superseded-prs.yml`](../examples/close-superseded-prs.yml):

```yaml
on:
  pull_request_target:
    types: [closed]
permissions:
  pull-requests: write
jobs:
  close:
    if: github.event.pull_request.merged == true
    uses: LLazyEmail/documentation-actions/.github/workflows/reusable-close-superseded-prs.yml@v2
```

When a merged PR has a line that starts with `Supersedes` (for example
`Supersedes #421`, `**Supersedes:** #1, #2`, or a same-repo PR URL), every
open PR named on that line gets a thank-you comment and is closed. Issues,
already closed PRs and the merged PR itself are skipped. The job reads only
the event payload and calls the API. It never checks out PR code, so
`pull_request_target` is safe here. Optional input: `comment`
(`{merged}` and `{author}` placeholders).

## Why `could not compare with main: Not Found` (fixed)

Before this change every comparison logged
`could not compare with main: Not Found`. The Octokit bundled with
`actions/github-script` v7 maps `repos.compareCommits` to
`/compare/{base}...{head}`, and the action passed a single `basehead` value, so
it requested `/compare/...`. As a result, `unstable` or `blocked` PRs that were
behind `main` (for example a PR whose only red check is fixed on `main`) were
never updated, and the "already up to date" skip never fired. The action now
calls `compareCommitsWithBasehead` with `<base>...<head SHA>`, which also
works for fork PRs and branch names that contain `/`. The action loads from
`@main`, so the fix applies to every caller without a new release.
