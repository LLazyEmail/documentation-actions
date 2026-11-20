# changelog (reusable workflow)

Regenerate and commit changelog after merged PRs.

**Path:** `.github/workflows/reusable-changelog.yml`

Uses `git-push-retry` under the hood.

## Agent notes

- `secrets: inherit` + `contents: write` required.
- Match `commit-paths` to what the site regenerates.
- If `generate-command` runs [auto-changelog](https://github.com/CookPete/auto-changelog),
  don't put `output` (or `template` URLs, `plugins`, `handlebarsSetup`) in an
  in-repo `.auto-changelog` file. Since 2.7.0 it refuses to run when `output`
  escapes the working directory. Either write the file from `--stdout` in your
  own script or pass `--output` on the command line. See
  [troubleshooting](../troubleshooting.md).
