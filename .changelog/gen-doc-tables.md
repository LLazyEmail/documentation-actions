semver: patch
type: Changed
Docs: the alias tables in `docs/naming.md` and `docs/deprecation.md` are now generated from `workflows.manifest.yml` by `scripts/gen-workflows.py`, between `<!-- generated: … -->` markers. CI fails when they drift. The table rows didn't change.
