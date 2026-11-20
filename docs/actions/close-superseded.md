# close-superseded

Closes pull requests that a merged PR supersedes. GitHub's `Closes #N`
keyword only closes issues, so a PR replaced by another PR stays open without this.

- Action: [`actions/close-superseded`](../../actions/close-superseded/action.yml)
- Reusable workflow: [`reusable-close-superseded-prs.yml`](../../.github/workflows/reusable-close-superseded-prs.yml)
- Example caller: [`examples/close-superseded-prs.yml`](../../examples/close-superseded-prs.yml)

## Usage

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

| Input | Default | Effect |
| --- | --- | --- |
| `comment` | `Closed in favour of #{merged}, which superseded this PR and has been merged. Thank you for the contribution, @{author}!` | Comment posted on each closed PR |
| `github-token` (action only) | `github.token` | Needs `pull-requests: write` |

## What it reads

Lines of the merged PR body that start with `Supersedes` (optionally bold, after
a list bullet, with or without a colon). Every `#N` and same-repo
`https://github.com/<owner>/<repo>/pull/N` on that line is a target. Only open PRs
are closed; issues, already closed PRs and the merged PR itself are skipped.

## Agent notes

- Write `Supersedes #N` as the first line of any PR that replaces a contributor PR
  (the auto-rebase `supersede-fork-prs` flow does this automatically).
- The job never checks out code, so `pull_request_target` is safe.
