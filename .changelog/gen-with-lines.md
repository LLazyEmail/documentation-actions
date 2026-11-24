semver: patch
type: Changed
Maintainers: `scripts/gen-workflows.py` now also writes the pass-through `with:` lines (`<name>: ${{ inputs.<name> }}`) of the action step in the 9 generated wrappers, between `# generated:` / `# end generated` comments. Hand-written lines, such as value conversions and tokens, stay below the block and win for their key. Exposing a new action input is now one manifest line plus `python3 scripts/gen-workflows.py`. Callers see no change: every changed workflow parses to the same YAML as before.
