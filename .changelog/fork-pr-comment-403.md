semver: patch
type: Fixed
`reusable-comment-readme-only` and `reusable-readme-docs-sync-check` no longer crash when they cannot comment on a pull request from a fork, where the token is read-only. They log a warning and put the guidance in the job summary instead.
