semver: minor
type: Added
auto-rebase: opt-in `delegate-bot-rebase` input (action and `reusable-auto-rebase-prs.yml`). Renovate and Dependabot PRs that are behind or conflicting are handed back to the bot (Renovate's rebase checkbox is ticked, or `@dependabot rebase` is commented once per head commit) instead of a git rebase that cannot regenerate lockfiles. They are reported as delegated, not failed. Off by default.
