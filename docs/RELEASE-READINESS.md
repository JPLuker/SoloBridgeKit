# Release readiness — v0.25.0 developer preview

**Status:** Automated developer safety checks passed [CI #188](https://github.com/JPLuker/SoloBridgeKit/actions/runs/43649559686). NOT APPROVED FOR A PUBLIC 1.0 RELEASE. This is a reproducible, source-free build candidate for development review only.

## Automated build gates
- Install exact dependency versions using the committed npm v3 lockfile and `npm ci --ignore-scripts --no-audit --no-fund`.
- Run source lint, all unit tests, browser source preparation/playthrough, PWA offline checks and M7 keyboard/contrast/layout suite.
- Run the source and `dist/` copyright/extension/allowed-assets audits. No purchased publisher PDFs, extracted page text, official art, proprietary tables or private indexes are committed or packaged.
- Run `npm run audit:release`: compare package versions to the lockfile and installed dependency licenses, verify bundled PDF.js license, hash every public distribution file with SHA-256, and write `test-output/SoloBridgeKit-0.25.0-UNTESTED-provenance.json`.
- CI publishes clearly labeled **UNTESTED** preview and build-provenance artifacts. A passing CI job does **not** certify real-device behavior or copyright ownership.

## Manual hold points (owner)
- [ ] Choose a public software code license (none has been chosen; the public PDF.js component retains its own license).
- [ ] Approve final visual identity/trademark presentation; existing styling remains unchanged.
- [ ] Complete [M7 one-pass real-device checklist](M7-DEVICE-ACCEPTANCE.md) on Android and desktop with privately owned 2026 source PDFs, including accessible PDF browsing, import/restore/offline and actual screen-reader/zoom behavior.
- [ ] Audit release assets, CI screenshots and archives for publisher material before making any release public.
- [ ] Approve a version 1.0 candidate and maintenance mode separately.

## Verification example
After downloading a CI preview, the hashes in the accompanying provenance JSON can be compared with the extracted distribution files. Run `node scripts/verify-release-provenance.mjs <downloaded-provenance.json> <extracted-dist-directory>` to verify every file and refuse extras, missing files or tampered bytes. The JSON contains only filenames, sizes, dependency names/licenses and SHA-256 values; no user PDF content.

Do not change `LICENSE`, authorize distribution of copyrighted book content, or claim an official Star Trek or publisher affiliation without direct owner authorization.
