# v2 release notes (draft)

## What changes in v2

- Short-name aliases become the preferred public surface.
- Long names remain available but are marked deprecated.
- Examples and agent docs already prefer the short names.
- No behavior changes. Callers using the long names continue to work.

## Recommended pin

- New callers: `LLazyEmail/documentation-actions@v2`
- Existing callers: stay on `@v1` until you are ready to switch.

## Migration for consumers

1. Replace long workflow paths with short aliases (see `docs/naming.md`).
2. Change the pin from `@v1` to `@v2`.
3. Verify triggers, permissions, and inputs are unchanged.
4. Open a draft PR in the consumer repo.

## What is not changing

- Composite actions under `actions/` keep their current paths.
- Inputs and outputs stay the same.
- Changelog and release process stay the same.

See `docs/v2-migration.md` and `docs/deprecation.md`.
