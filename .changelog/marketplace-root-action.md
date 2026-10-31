semver: minor
type: Added
Root-level composite action (action.yml) so the suite can be published to the GitHub Marketplace. The Marketplace entry point optionally runs markdownlint, lychee, and a Docusaurus build by reusing the existing local composites. Specialized actions under actions/ and reusable workflows remain usable by path.
