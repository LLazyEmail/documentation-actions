# Contributing to documentation-actions

Thanks for helping maintain the shared Actions used by LLazyEmail docs and awesome-list repos.

## Guidelines

1. **Small, single-purpose draft PRs.** One action or one infra concern per PR.
2. **Never delete content** in consumer repos or docs; extend or annotate instead.
3. **Pin third-party Actions** to a full commit SHA with a `# vX.Y.Z` comment.
4. **Keep behaviour identical** when extracting logic from a consumer workflow.
5. **Add a self-test** (fixture or CI job) with every new action.
6. **Update README, examples, CHANGELOG, and AGENTS.md** in the same PR when inputs/outputs change.

## Commit trailer

When working for the maintainer, every commit carries:

```
Co-authored-by: petroved <arthur.tkachenko.netweight@gmail.com>
```

## Local checks

```bash
pipx run 'yamllint==1.38.0' --format github .
# after actionlint is installed:
actionlint
bash tests/run-unit.sh
```

## License

By contributing, you agree your contributions are licensed under the MIT License.
