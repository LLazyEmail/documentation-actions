semver: minor
type: Added
`reusable-readme-docs-sync-check` (and the `reusable-readme-sync` alias) has a new opt-in input, `pass-if-links-in-docs`. When it is true, a PR that changes only `README.md` passes if every link it adds is already in a docs file matching `docs-glob`. It defaults to false, so existing callers behave as before.
