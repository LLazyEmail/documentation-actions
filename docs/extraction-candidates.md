# Extraction candidates

Workflows still living only in consumer repos that are good candidates to move into documentation-actions so similar projects share one implementation.

## Done

| Pattern | Status |
| --- | --- |
| Label conflicted PRs | Extracted — `reusable-label-conflicted-prs` |
| Open PRs status report | Extracted — `reusable-pr-status-report` |
| README ↔ docs sync check | Extracted — `reusable-readme-docs-sync-check` |
| Comment on README-only PRs | Extracted — `reusable-comment-readme-only` |

## Remaining

| Pattern | Seen in | Notes |
| --- | --- |
| Separate markdown-lint / link-check | several | Prefer umbrella `reusable-docs-ci` where possible |
| Awesome-list entry validators | awesome-newsletters | Confirm remaining local copies are already thin callers of `reusable-awesome-list-checks` |

## Process

1. Extract as a reusable workflow + thin example + docs page in a draft PR here.
2. After release, open adoption PRs in consumers that replace the local file with a thin caller.
3. Delete the duplicated implementation from the consumer.

Goal: one implementation, thin callers everywhere.
