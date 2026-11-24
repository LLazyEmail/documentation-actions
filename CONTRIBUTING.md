# Contributing to documentation-actions

Thanks for helping maintain the shared Actions used by LLazyEmail docs and awesome-list repos.

## Guidelines

1. **Small, single-purpose draft PRs.** One action or one infra concern per PR.
2. **Never delete content** in consumer repos or docs; extend or annotate instead.
3. **Pin third-party Actions** to a full commit SHA with a `# vX.Y.Z` comment.
4. **Keep behaviour identical** when extracting logic from a consumer workflow.
5. **Add a self-test** (fixture or CI job) with every new action.
6. **Update README, examples, AGENTS.md, and add a `.changelog/` entry** in the same PR when inputs/outputs change (do not hand-edit `CHANGELOG.md` for those changes).

## For AI agents

- Start with [AGENTS.md](AGENTS.md) and [docs/ai-agent-guide.md](docs/ai-agent-guide.md).
- Copy from [examples/](examples/) — never invent job YAML.
- Use the checklists under [skills/](skills/) (see [skills/README.md](skills/README.md)).
- Append exactly one new row to `docs/actions-index.md` when adding an action; never reorder.
- Add a `.changelog/` fragment (or label `skip-changelog` / `no-changelog` for pure docs).
- Do not merge or close PRs unless the human owner asks.
- Commit trailer: `Co-authored-by: petroved <arthur.tkachenko.netweight@gmail.com>`.

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
python3 scripts/gen-workflows.py --check   # needs PyYAML
```

## Reusable workflows and aliases: edit the manifest, run the generator

`workflows.manifest.yml` lists every `.github/workflows/reusable-*.yml`.

- **Short-name aliases are generated.** Don't edit them by hand. To add or change one,
  edit its entry under `aliases:`, then run `python3 scripts/gen-workflows.py`. That also
  rewrites the alias tables in `docs/naming.md` and `docs/deprecation.md` (between the
  `<!-- generated: … -->` markers). Don't edit those rows by hand. An alias copies the `workflow_call` block of its
  long name, so **a new input goes on the long workflow only**. Regenerate, and every
  alias picks it up.
- **The other reusable workflows are still hand-written**, and each one has an entry
  under `workflows:`. When you add a workflow, or change a job id, check name,
  permissions, secrets or the actions it calls, update its entry too.
- **Input declarations of 9 action wrappers are generated too.** This covers auto-rebase-prs,
  awesome-list-checks, close-superseded-prs, docusaurus-pages-deploy, link-check,
  markdownlint, npm-script-check, star-request and sync-feedback, which have
  `inputs-from-action:` in the manifest. Their `workflow_call.inputs` take description,
  required and default from the action's `action.yml`. To expose a new action input,
  add `<name>: <type>` under the workflow's `inputs:` in the manifest and run the generator.
  The generator writes both the declaration and the `<name>: ${{ inputs.<name> }}` line in the
  step's `with:` block, between the `# generated: …` / `# end generated` comments. If the value
  needs a conversion (for example `${{ inputs.x && 'true' || 'false' }}`), write that line by
  hand below `# end generated`. A hand line for a key wins over the generated one. CI fails until you either expose
  it or list it under `not-exposed:`. Inputs that exist only on the workflow are
  `<name>: keep`, and you edit them in the workflow file.
- **Keep this repo's own refs as `LLazyEmail/documentation-actions/...@main`.**
  `scripts/pin-release-refs.sh` pins them to the release tag when a release is cut.

CI (`tests/gen-workflows.test.sh`) fails when a generated file is out of date or a
workflow doesn't match its manifest entry.


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
