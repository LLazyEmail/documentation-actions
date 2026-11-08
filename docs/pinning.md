# Pinning and supply chain

## Third-party Actions

Every `uses:` of a third-party Action must be pinned to a full commit SHA with a `# vX.Y.Z` comment.

```yaml
uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2
```

Renovate keeps these current. Never leave them on a floating tag or branch.

## This suite

- Production consumers: pin `LLazyEmail/documentation-actions@v1` (floating major) or a full SHA.
- Draft adoption PRs may use `@main` only during the adoption window.
- Prefer SHA + Renovate for the strongest guarantee.

## Why it matters for agents

- Floating tags can change under you.
- SHA pins are auditable and immutable.
- The `# vX.Y.Z` comment makes the intent human- and agent-readable.

See also `AGENTS.md` and `docs/design.md`.
