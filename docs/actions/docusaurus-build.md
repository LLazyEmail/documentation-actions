# docusaurus-build

Install, optional prebuild, and Docusaurus build with annotations.

**Path:** `actions/docusaurus-build`

## Inputs (key ones)

| Input | Default | Notes |
| --- | --- | --- |
| `working-directory` | `website` | Where package.json lives |
| `node-version` | `22` | Align with .nvmrc |
| `cache-dependency-path` | `website/package-lock.json` | |
| `prebuild-command` | empty | Runs before build if set |
| `annotate-log` | `true` | Emits annotations + job summary |

## Agent notes

- Match `working-directory` and lockfile to the consumer layout (root vs website/).
- Enable `pr-comment` on the reusable test-deploy workflow if you want the summary on the PR.
