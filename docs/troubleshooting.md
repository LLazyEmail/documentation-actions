# Troubleshooting

Common failures when adopting or extending documentation-actions.

## Agent mistakes

| Symptom | Cause | Fix |
|---------|-------|-----|
| yamllint line too long | Script lines > 140 | Break strings; avoid multi-line templates inside `script: \|` |
| YAML syntax error in script | Multi-line template literal | Use concatenation or arrays |
| Unpinned action fails CI | `actions/...@vN` | Pin to full SHA + `# vX.Y.Z` |
| Reusable workflow not found | Wrong path or tag | Use exact path under `.github/workflows/` and `@v1` |
| Missing secrets | Forgot `secrets: inherit` | Add it on commit-back / pages / star workflows |
| Wrong working directory | Layout mismatch | Set `working-directory` to `website` or `.` |
| Duplicate PR comments | No marker | Use the marker pattern from readme-only |

## Workflow-specific

- **docs-ci / test-deploy**: Check Node version and lockfile path.
- **pages-deploy**: Needs `pages: write` + `id-token: write`.
- **label-conflicts**: Needs `pull-requests: write`.
- **pr-report**: Needs `issues: write`.
- **readme-sync**: Needs `pull-requests: write` and fetch-depth 0 (handled inside).

## Short names

Prefer short aliases when available (`reusable-pages-deploy`, `reusable-test-deploy`, `reusable-readme-sync`, `reusable-label-conflicts`, `reusable-pr-report`, `reusable-readme-only`). Both names work.

See also `docs/yaml-ai-rules.md` and `docs/naming.md`.
