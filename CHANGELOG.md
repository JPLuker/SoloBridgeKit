## [0.14.1] - 2026-11-12
### Fixed
- Scene-count inputs no longer force the mission screen wider than a phone.
### Tests
- Headless browser smoke fails on horizontal overflow at 390px, not just desktop.

## [0.14.0] - 2026-11-12
### Added
- Headless Chrome end-to-end smoke test against the complete built PWA.
- Generated non-copyright synthetic PDF fixture for testing local import and preparation.
- CI screenshot artifacts at phone and desktop widths, with offline reload verification.
### Quality
- Tests prove the bundled PDF parser is exercised in a real browser; physical-device testing remains a separate gate.

## [0.13.0] - 2026-11-12
### Added
- In-mission task rolling with source-backed outcome recording and history.
- Direct private random-table rolling and page references inside the active scene workspace.
- Shared pure mission-task recording model with focused unit tests.
### Changed
- Dice-screen task recording and mission-screen task recording now use one implementation.
- Mission log references omit publisher table text and store only source page and rolled value.

## [0.12.0] - 2026-11-12
### Added
- Save source-verified starship and station class ratings as private reusable templates.
- Apply class templates to new ships while preserving player-defined identity and talents.
- Review and delete private ship class templates from the Library.
### Security
- Ship class stats remain tied to the user's local source PDF and are never included in public bundles.

## [0.11.0] - 2026-11-12
### Added
- Save validated lifepath steps as private, reusable source-book choices.
- Apply saved choices to future characters, with edition/source linkage.
- Review and delete saved choices in Library.
### Security
- Source-dependent choices remain in locally imported document data and opt-in private PDF backups only.

## [0.10.0] - 2026-11-12
### Added
- Local, source-page-linked private random-table creator from the user's prepared PDF.
- Editable numbered entries with ranges, gap/overlap validation and cryptographically unbiased rolls.
- Optional mission roll references that do not copy publisher table prose into campaign logs.
- Private table persistence tied to source PDF fingerprints and opt-in private backups.
### Security
- No table content bundled in the repository or public application artifact.

## [0.9.0] - 2026-11-12
### Added
- One-file local PDF preparation from the Library, with per-page progress and cancellation.
- Bundled PDF.js parser, worker, maps, and fonts for offline use without runtime CDNs.
- Static application build and downloadable UNTESTED CI preview, with distribution audit.
### Changed
- Corebook import compiles a private page-text index automatically; desktop Poppler remains an optional fallback.
- Existing library PDFs can be privately prepared for play without reuploading.
### Security
- Build artifacts explicitly exclude private PDFs and generated book data.

## [0.8.1] - 2026-11-12
### Fixed
- Private PDF-inclusive backup restores now verify that the prepared index belongs to the restored PDF before changing local saves.
- Clarified that the downloadable app shell needs no build step, but preparing private book data currently requires Node.js and Poppler.

## [0.8.0] - 2026-11-12
### Added
- Source-dependent boot: gameplay only unlocks with a private rules index prepared from the player's own corebook PDF.
- Offline `prepare:corebook` utility using Poppler tools; index requires text extraction and SHA-256 pairing with the original PDF.
- Private corebook full-text search with links back to the imported PDF.
- Tests and public-source safeguards for prepared-book data.
### Changed
- Merely marking a PDF as the corebook no longer unlocks gameplay.
- Opt-in private PDF backups now also preserve the prepared rules index; campaign-only backups contain neither.

## [0.7.1] - 2026-11-12
### Fixed
- Data-only backup restores now preserve PDFs already imported on the device.
- Corebook type must be explicitly selected during import, instead of preselected.
- Restore confirmation distinguishes data-only and PDF-inclusive backups.

## [0.7.0] - 2026-11-12
### Added
- Required private corebook import before book-dependent gameplay.
- Document type selection for new and existing local PDFs.
- Public checkout content audit to reject PDF and ebook/archive files.
### Changed
- Backups now exclude imported PDFs unless explicitly included for personal use.
- Previous PDF-containing backups remain compatible.

# Changelog

## [0.6.0] — 2026-11-12

- Added a persistent task-roll history on each mission, including target, result, dice and resource outcomes.
- A Momentum reroll updates the same roll record and preserves its original dice; individual history entries can be deleted.
- Migrated older missions with no history to empty logs and added seven tests (59 passing).

## [0.5.0] — 2026-11-12

- Added private PDF page bookmarks and an in-reader page-jump form.
- Included per-document bookmarks in backup exports and restores; older backups without bookmarks remain valid.
- Added validation for corrupted bookmarks and expanded automated tests from 47 to 52.

## [0.4.0] — 2026-11-12

- Added a source-linked, six-step guided starship/station builder with player-entered class stats and scale-based talent validation.
- Added a persistent crew roster with rank, role, department, relationship and notes.
- Preserved manual ship/character sheets and old campaign saves; expanded local tests from 38 to 47.

## [0.3.0] — 2026-11-12

- Added a saved, source-linked seven-step character lifepath with point allocation, finishing caps and explicit sheet application.
- Added individually tracked scenes, per-act scene count choices, saved scene notes and legacy tracker migration.
- Added Momentum and Threat spending, one-die task reroll and next-task increased difficulty.
- Hardened IndexedDB transaction completion and PDF backup validation.
- Expanded the model tests from 15 to 38.

## [0.2.0] — 2026-11-11

- Read the privately supplied 2026 edition and supplemental ZIP.
- Added rules-backed 2d20 target resolution, difficulty, Momentum, Threat and focus advantage.
- Track Momentum and Threat with each mission.
- Added rule tests and updated documentation.

## [0.1.0] — 2026-11-11

- Added a local-first companion for campaigns, character and starship records, missions and logs.
- Added a PDF library and native reader, with private local storage.
- Added unbiased raw d6/d20 rolls and full JSON backup/restore.
- Added offline static asset cache, mobile navigation, initial tests, and project documentation.

- Added field-complete character, ship and mission records based on the private v1.2 Captain's Log blank forms.