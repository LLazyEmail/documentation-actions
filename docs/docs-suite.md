# Docs suite (recommended entry)

`reusable-docs-suite.yml` is the one-call entry point for new Docusaurus sites.

It wires:

- docs-ci (markdownlint + lychee + build)
- optional pages deploy (only on main)
- optional readme-sync (only on pull_request)
- optional label-conflicts

## When to use it

- Greenfield sites
- Sites that want the common path without composing multiple workflows

## When not to use it

- You need custom job ordering or extra steps between the checks
- You already have thin callers and only want one piece

## Example

See `examples/docs-suite.yml`.

Prefer short names and pin `@v2`.
