# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Repository scaffolding: CONTRIBUTING, AGENTS.md, CODEOWNERS, SECURITY, Renovate, yamllint, gitignore.
- CI workflow (yamllint, actionlint, unit tests) and release workflow that moves the floating major tag (`v1`).
- Early in-repo auto-rebase workflow for open PRs.
- Thank contributors and ask for a star (`actions/star-request`).
- Update behind open PR branches (`actions/auto-rebase`).
- Polished README, adoption guide, design notes, and self-test workflow.
- Run markdownlint-cli2 on docs (`actions/markdownlint`).
- Soft-fail lychee link check with summary (`actions/lychee-link-check`).
- Install, optional prebuild, and Docusaurus build (`actions/docusaurus-build`).
- Reusable Docusaurus PR build workflow (`reusable-docusaurus-test-deploy`).
- Reusable GitHub Pages and peaceiris deploy (`reusable-docusaurus-pages-deploy`).
- Reusable regenerate-and-commit changelog workflow (`reusable-changelog`).
- Reusable pages-index regenerate workflow (`reusable-docs-index`).
- Reusable JSON API regenerate workflow (`reusable-catalog-api`).
- Awesome-list checks: entry-format, duplicates, sorted-sections (`actions/awesome-list-checks`).

