semver: minor
type: Added
`lychee-link-check` and `reusable-link-check.yml` accept optional `docusaurus-root` and `config-file` inputs. When `docusaurus-root` is set, the check appends `--root-dir`, `--fallback-extensions md,mdx`, and `--index-files index.md,index.mdx,.` so Docusaurus root-relative and extensionless links resolve to Markdown sources. When `config-file` is set and the file exists, it passes `--config`. Both default to empty, so existing callers are unchanged.
