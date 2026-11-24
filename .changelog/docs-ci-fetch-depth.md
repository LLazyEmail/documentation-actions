semver: minor
type: Added
`reusable-docs-ci`: new opt-in `fetch-depth` input for the build and npm-check checkouts. The default `0` (full history) is the value these jobs always used, so nothing changes unless you set it. `reusable-docusaurus-test-deploy` and its alias `reusable-test-deploy` already accepted `fetch-depth` but ignored it. They now pass it on, so `fetch-depth: 1` really gives a shallow build checkout. Keep `0` if the site shows git-based "last updated" data. The markdownlint and lychee checkouts are unchanged (shallow).
