# changelog (reusable workflow)

Regenerate and commit changelog after merged PRs.

**Path:** `.github/workflows/reusable-changelog.yml`

Uses `git-push-retry` under the hood.

## Agent notes

- `secrets: inherit` + `contents: write` required.
- Match `commit-paths` to what the site regenerates.
