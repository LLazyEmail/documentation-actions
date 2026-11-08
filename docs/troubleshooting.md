# Troubleshooting

Common issues when adopting or working on documentation-actions.

## Adoption failures

| Symptom | Cause | Fix |
| --- | --- | --- |
| `uses:` of reusable workflow fails with access denied | Org Actions policy | Allow reusable workflows from `LLazyEmail/documentation-actions` |
| Commit-back job fails to push | Missing permissions or secrets | `contents: write` + `secrets: inherit` |
| Docusaurus build cannot find package.json | Wrong working-directory | Set to `website` or `.` matching the consumer |
| Lockfile cache miss | Wrong cache-dependency-path | Use the repository-relative path to package-lock.json |
| Lychee fails the job | `fail: true` or aggressive args | Keep default soft-fail; accept 403,429 |
| Pages deploy fails intermittently | Known flakiness on some sites | Ignore for adoption PRs; verify once on main |

## In this repository

| Symptom | Cause | Fix |
| --- | --- | --- |
| Changelog check fails | Missing `.changelog/` file | Add fragment or label `skip-changelog` |
| Stacked PR conflict on index | Edited existing row | Append only one new row |
| YAML lint fails | Unpinned third-party action | Pin to full SHA with `# vX.Y.Z` |

See also the skill at `skills/troubleshooting/SKILL.md` and `docs/ai-agent-guide.md`.
