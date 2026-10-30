# Contributing to documentation-actions

Thanks for helping maintain the shared Actions used by LLazyEmail docs and awesome-list repos.

## Guidelines

1. **Small, single-purpose draft PRs.** One action or one infra concern per PR.
2. **Never delete content** in consumer repos or docs; extend or annotate instead.
3. **Pin third-party Actions** to a full commit SHA with a `# vX.Y.Z` comment.
4. **Keep behaviour identical** when extracting logic from a consumer workflow.
5. **Add a self-test** (fixture or CI job) with every new action.
6. **Update README, examples, AGENTS.md, and add a `.changelog/` entry** in the same PR when inputs/outputs change (do not hand-edit `CHANGELOG.md` for those changes).

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
bash scripts/changelog-check.sh
```


## Changelog entries

For every user-facing change, add **one** markdown file under `.changelog/`
instead of editing `CHANGELOG.md` directly:

```bash
slug=$(git branch --show-current | tr '/' '-')
cat > ".changelog/${slug}.md" <<'ENTRY'
semver: minor
type: Added
Short user-facing summary of the change.
ENTRY
```

Rules:

1. Required header: `semver: major|minor|patch`.
2. Optional header: `type: Added|Changed|Deprecated|Removed|Fixed|Security`.
3. Body is the Keep a Changelog bullet (multi-line OK).
4. Docs-only / chore PRs that should not affect the next version: add the
   `skip-changelog` or `no-changelog` label.
5. Local check: `bash scripts/changelog-check.sh`.

Full format notes: [`.changelog/README.md`](.changelog/README.md).

## Releasing

1. Feature PRs land with `.changelog/` entries (validated in CI).
2. **Changelog release PR** opens `rel/vX.Y.Z` and folds entries into `CHANGELOG.md`.
3. Merge that release PR. **Tag release** (`tag-release.yml`) creates the `vX.Y.Z`
   annotated tag and a GitHub Release from that changelog section. The workflow
   is idempotent: if the tag already exists it skips tagging; if the Release is
   missing it still publishes one (so a missed release like `v1.0.0` is created
   on the next push to `main` or via **workflow_dispatch**).
4. **Move major tag** (`release.yml`) points floating `v1` / `v2` at the new Release.

This mirrors `LLazyEmail/generate-template` (changesets version PR → publish on
merge), except publish here means tag + GitHub Release (Actions consumers pin
`@v1`), not npm.

## License

By contributing, you agree your contributions are licensed under the MIT License.
