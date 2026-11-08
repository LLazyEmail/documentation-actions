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
| secret `AUTO_REBASE_TOKEN` | unset | Optional fine-grained PAT or GitHub App token. Branch updates made with the default `GITHUB_TOKEN` do **not** re-trigger `pull_request` CI, so required checks can look stale. Add the secret yourself in repo settings; the workflow falls back to `GITHUB_TOKEN`. |

Notes:

- GitHub only reports `mergeable_state: behind` when branch protection
  requires up-to-date branches. Without that rule, a behind PR reads `clean`
  and is left alone (it is still mergeable), which avoids re-running CI on
  every open PR after each merge.
- After a conflict comment, fix the files manually or dispatch the workflow
  with `pr-numbers` and `rebase-conflicts: true` (owner approval required).
- Concurrent runs are serialized per repository; a burst of merges queues at
  most one pending run.
