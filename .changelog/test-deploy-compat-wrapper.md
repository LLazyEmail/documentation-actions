semver: patch
type: Fixed
Make reusable-docusaurus-test-deploy.yml a thin compatibility wrapper around
reusable-docs-ci so legacy callers keep resolving after the docs-ci umbrella
move. New sites should call reusable-docs-ci.yml directly.
