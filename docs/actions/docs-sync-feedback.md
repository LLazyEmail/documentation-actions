# docs-sync-feedback

Label a PR and leave **one** specific, self-updating comment when it changes `README.md`
without the matching docs page. Works for fork PRs. Opt-in: nothing happens unless a repo
adds the caller.

**Path:** `actions/docs-sync-feedback` + `.github/workflows/reusable-sync-feedback.yml`

## Why

`reusable-readme-sync` fails the check, but on a fork PR its comment is dropped: `pull_request`
runs get a read-only token. In awesome-email-marketing #453 the contributor added a tool to
`README.md` only, `check-sync` went red, and they got no label and no explanation.

## What the contributor sees

While docs are missing:

- Label `needs-docs-sync`, created if the repo doesn't have it yet.
- One comment naming the entry, the docs file (linked), the section, the neighbouring entry
  and its line, plus the exact line to add. For example:

  > Please add **WarmySender** to `website/docs/tools/automation-platforms.md` under
  > `## Delivery, outbound & infrastructure-owned`, right after the MisarReach entry (line 64):
  >
  > ```md
  > - [WarmySender](https://github.com/warmysender-oss/warmysender) - open-source, self-hostable cold email engine …
  > ```

  If the repo has a `CONTRIBUTING.md` (root, `.github/` or `docs/`), or if `contributing-url`
  is set, the comment links to it.

When the PR is in sync, either because a docs file under `docs-glob` changed or, with
`pass-if-links-in-docs`, because every added link is already on a docs page, the label is
removed and the comment is edited to **"Docs sync: resolved"**. Later runs edit the same
comment (hidden `<!-- docs-sync-feedback -->` marker) and never post a second one.

## How the docs page is found

There's no per-repo map to maintain:

1. Take the README section (the closest heading above the added line) the entry was added to.
2. Pick the docs page that already contains the most links from that section.
3. Find the closest existing entry above the new line (or below it, for the first entry) on that
   page, and suggest "right after/before" it, under the docs heading above it.
4. The suggested line is the README line, with the bullet style switched to match the docs page.

When no docs page shares links with the section, the comment says which section the entry
belongs to and asks for the matching page under `docs-glob`.

## Inputs

| Input | Default | Description |
| --- | --- | --- |
| `docs-glob` | `website/docs/**/*.md` | Docs files that count as "in sync". Keep it equal to your `reusable-readme-sync` input |
| `pass-if-links-in-docs` | `false` | Same meaning as in `reusable-readme-sync`. Keep them equal |
| `label` | `needs-docs-sync` | Label while docs are missing. Empty disables labelling |
| `contributing-url` | auto | Contributing guide link. Empty auto-detects `CONTRIBUTING.md` |
| `check-name` | `README ↔ docs sync` | Name of the failing check in the comment |
| `pr-number` | empty | PR to (re)check from `workflow_dispatch` |

Output `missing` (action only): `'true'` while docs are missing. The job itself never fails.
`reusable-readme-sync` stays the required check.

## Example

See [`examples/sync-feedback.yml`](../../examples/sync-feedback.yml). Pair it with
`reusable-readme-sync` and set `post-comment: false` there, so same-repo PRs don't also get the
older generic comment.

## Security

- The caller uses `pull_request_target`, so the token can label and comment on fork PRs.
- The job checks out the **base** branch only (`persist-credentials: false`). It reads docs
  pages as text and reads the PR's file list, patch and `README.md` through the API. No PR code
  is checked out, installed or executed.
- PR text in the comment goes inside a code fence that's longer than any backtick run in it,
  so it can't break out of the fence or ping people.
- Bot-authored PRs are skipped.

## Agent notes

- Picks up a PR on its next `opened`/`synchronize`/`reopened` event after the caller lands.
  Use `workflow_dispatch` with `pr-number` for PRs that are already open.
- Closed PRs are skipped.
