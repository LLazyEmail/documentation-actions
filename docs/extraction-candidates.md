# Extraction candidates

Workflows still living only in consumer repos that are good candidates to move into documentation-actions so similar projects share one implementation.

## High priority (generic)

| Pattern | Seen in | Notes |
| --- | --- | --- |
| Label conflicted PRs | awesome-email-marketing | Now extracted as `reusable-label-conflicted-prs` |
| Open PRs status report | awesome-email-marketing | Now extracted as `reusable-pr-status-report` |
| README ↔ docs sync check | awesome-email-marketing | Site-specific mappings; can be parameterized |
| Separate markdown-lint / link-check | several | Prefer umbrella `reusable-docs-ci` |

## Medium priority

| Pattern | Notes |
| --- | --- |
| Comment on README-only PRs | Similar to sync check; can be combined |
| Awesome-list entry validators | Already covered by `reusable-awesome-list-checks`; confirm remaining local copies are thin callers |

## Process

1. Extract as a reusable workflow + thin example + docs page in a draft PR here.
2. After release to `v2` (or next minor), open adoption PRs in consumers that replace the local file with a thin caller.
3. Delete the duplicated implementation from the consumer.

Goal: one implementation, thin callers everywhere.
