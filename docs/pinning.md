# Pinning and supply chain

## Third-party Actions

Every `uses:` of a third-party Action must be pinned to a full commit SHA with a `# vX.Y.Z` comment.

```yaml
uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2
```

Renovate keeps these current. Never leave them on a floating tag or branch.

## This suite

- Production consumers: pin `LLazyEmail/documentation-actions@v2` (floating major), a release tag `@vX.Y.Z`, or a full SHA.
- `v1` is frozen at v1.18.1. Move `@v1` callers to `@v2` (decided in #181, 2026-11-23).
- Draft adoption PRs may use `@main` only during the adoption window.
- Prefer SHA + Renovate for the strongest guarantee.

> Earlier note (Nov 2026, kept for history): reusable workflows reference the composite actions at `@main`, so a tag or SHA pin fixed the workflow inputs but not the action code. Per-release pinning below fixes this for releases cut with `RELEASE_PIN_TOKEN` set. `v1` and releases cut before that keep running `@main` action code.

## Per-release pinning of this repo's own refs

On `main`, the reusable workflows call the actions as
`LLazyEmail/documentation-actions/actions/<name>@main`, so `main` stays testable and
CI exercises the code in the PR's base.

When a release is cut, `tag-release.yml`:

1. Takes the merged release commit on `main`.
2. Runs `scripts/pin-release-refs.sh vX.Y.Z`, which rewrites every
   `LLazyEmail/documentation-actions/...@main` in `.github/workflows/` and
   `actions/*/action.yml` to `@vX.Y.Z`. Nothing else changes: third-party
   actions, `./` local refs and other owners are left alone.
3. Commits that on top of the main commit (detached, never pushed to a branch)
   and points the `vX.Y.Z` tag at it.
4. Moves the floating major tag (`v2`) to the same commit.

The result: a caller at `@v2`, `@vX.Y.Z` or the tag's SHA runs the workflow
**and** the action code from that release. A fix to an action reaches callers
with the next release, not on merge.

**Opt-in.** Pinning runs only when the repo secret `RELEASE_PIN_TOKEN` is set.
It has to be a fine-grained PAT (or GitHub App token) on this repo with
**Contents: write** and **Workflows: write**: GitHub refuses a `GITHUB_TOKEN`
push of a new commit that changes `.github/workflows/`. Without the secret,
releases tag the main commit exactly as before, and the job logs a dry run
(`pin-release-refs.sh --check`) plus a warning.

**Checks.** `tests/pin-release-refs.test.sh` runs the dry run on the repo on every
PR and fails if no refs are found, if any `@main` ref is left after the rewrite,
or if a pinned ref names a path that doesn't exist. To see the rewrite locally:

```bash
bash scripts/pin-release-refs.sh --check v2.99.0
```

**Trade-offs.**

- The tag commit isn't on any branch. GitHub shows "This commit does not
  belong to any branch" on it, and `git branch --contains vX.Y.Z` is empty.
  Its parent is the release commit on `main`, so `git log vX.Y.Z` reads normally.
- Releases published by hand (`release.yml`) aren't pinned. Use the release PR.
- Action fixes no longer go live on merge. They need a release, like input
  changes already did.

## Why it matters for agents

- Floating tags can change under you.
- SHA pins are auditable and immutable.
- The `# vX.Y.Z` comment makes the intent human- and agent-readable.

See also `AGENTS.md` and `docs/design.md`.
