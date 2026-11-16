# Consumer adoption for v2

## Goal

Switch consumer repos from long workflow names + `@v1` to short names + `@v2`.

## Steps per consumer

1. Search for `reusable-docusaurus-` and other long names.
2. Replace with the short alias from `docs/naming.md`.
3. Update the pin to `@v2`.
4. Keep triggers and permissions on the caller.
5. Open a draft PR. Do not merge until reviewed.

## Priority consumers

- awesome-email-marketing
- awesome-newsletters
- documentation
- assemblya
- v-school

## After v2 is tagged

Open one adoption PR per consumer. Existing `@v1` pins continue to work until v3 removes the long names.
