---
name: troubleshooting
description: Common failure modes and fixes when adopting or extending documentation-actions.
---

# Troubleshooting checklist

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Workflow not found | Org policy blocks reusable workflows | Allow access to LLazyEmail/documentation-actions |
| Commit-back fails | Missing secrets: inherit or contents: write | Add both on the caller |
| Build fails | Wrong working-directory or lockfile | Match consumer layout |
| Lychee fails hard | fail: true or missing accepts | Keep soft-fail; accept 403/429 |
| Index conflict | Edited existing row | Append only |
| Changelog check fails | Missing fragment | Add .changelog/*.md or label skip-changelog |

See also `docs/ai-agent-guide.md`.
