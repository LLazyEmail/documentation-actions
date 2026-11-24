semver: patch
type: Changed
Maintainers: `scripts/gen-workflows.py` now also generates the `workflow_call.inputs` block of 9 single-action wrappers (auto-rebase-prs, awesome-list-checks, close-superseded-prs, docusaurus-pages-deploy, link-check, markdownlint, npm-script-check, star-request, sync-feedback) from the action's `action.yml`. CI fails when an action gains an input that the manifest neither exposes nor lists under `not-exposed:`. Callers see no change: input names, order, types, defaults and required flags are identical. Only input descriptions now match the action's wording.
