semver: patch
type: Fixed
auto-rebase: conflict detection no longer crashes with "Bad escaped character in JSON" when the merge or rebase touches a path that `git status` quotes (non-ASCII names such as Cyrillic file names): `git status` is now read with `-z`, and rename entries are parsed correctly. A git error in the `generated-paths` sweep merge now logs a warning and falls back to the normal skip path instead of failing the PR. Found via atherdon/fuck-ecoflow run 46053584500 (PR #184).
