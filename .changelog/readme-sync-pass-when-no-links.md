semver: patch
type: Fixed
`readme-docs-sync-check` / `readme-sync`: with the opt-in `pass-if-links-in-docs: true`, a README-only PR that adds no links (prose or table edits, e.g. a CI section) now passes instead of failing with "README.md changed but no matching docs file was updated". Callers without the input are unchanged.
