semver: minor
type: Added
Build image check: list pages with broken images (full URLs with the new `site-url` input) in the job summary and as a `build-image-report` JSON artifact, and report raster `data:` URIs whose bytes are not an image (`inlined-not-an-image`).
