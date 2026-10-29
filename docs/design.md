# Design notes

## Composite action vs reusable workflow

| Use a composite action when… | Use a reusable workflow when… |
| --- | --- |
| The caller keeps custom steps around shared logic | The entire job should move unchanged |
| Inputs are step-scoped (globs, message text) | Concurrency, permissions, and multi-step jobs matter |
| You want `uses: ./actions/...` in self-tests | Consumers replace a whole `.github/workflows/*.yml` file |

## Behaviour identity

Extractions keep the same github-script bodies, lychee flags, commit messages, and skip conditions (`github-actions[bot]`, maintainer associations) as the source workflows in the awesome-* and documentation repos.
