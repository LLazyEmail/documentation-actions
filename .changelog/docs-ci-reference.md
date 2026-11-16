semver: patch
type: Changed
`docs/actions/docs-ci.md` now lists every input, the check name each job produces, and explains the skipped `inputs.npm-check-job-name` check (GitHub does not evaluate `name:` on a job skipped by `if:`) and why it is left unchanged. Docs only.
