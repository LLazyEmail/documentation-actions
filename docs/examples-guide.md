# Examples guide

Always start by copying a file from `examples/`.

| Need | Example | Prefer workflow |
|------|---------|-----------------|
| Full docs CI | docs-ci.yml | reusable-docs-ci |
| PR build | test-deploy.yml | reusable-test-deploy |
| Pages | deploy-pages.yml | reusable-pages-deploy |
| Link check | link-check.yml | reusable-link-check |
| Awesome list | awesome-list-checks.yml | reusable-awesome-list-checks |
| Label conflicts | label-conflicted-prs.yml | reusable-label-conflicts |
| PR report | pr-status-report.yml | reusable-pr-report |
| README sync | readme-docs-sync-check.yml | reusable-readme-sync |
| README-only | comment-readme-only.yml | reusable-readme-only |

Short names are aliases. Both the long and short names work. Prefer short names in new code.

See `docs/naming.md` and `docs/yaml-ai-rules.md`.
