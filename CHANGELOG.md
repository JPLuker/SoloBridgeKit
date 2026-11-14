## [0.20.1] - 2026-11-14
### M3 — Source-grounded character development (70% of development)
- Add post-mission milestone actions: legal Attribute shift, Discipline shift or Focus swap, limited to one milestone per mission.
- Require an explicit completed mission and recorded player rationale; enforce rating floors/caps and 56/16 totals.
- Add challenged-Value replacement with explicit user confirmation and source page 202.
- Add persistent player-authored injury/condition notes and status progression without fabricated modifiers.
- Preserve full character development log in data-only backups and refuse malformed/duplicate history records.
- Add unit and Chrome tests for positive/negative milestones, condition recovery and phone layout.

## [0.20.0] - 2026-11-14
### M3 — Guided source provenance (30% of development)
- Begin M3 after verified M2 development closure.
- Persist confirmed private rulebook choice ID, SHA-256 and PDF page per lifepath stage, including both career events.
- Reject choices with incompatible source/stage or invalid mechanical allocations.
- New lifepaths begin guided and require all seven source-based selections before applying to a character.
- Preserve manual/legacy and incomplete character drafts with explicit mode switching.
- Show source status and PDF references, and add synthetic provenance unit and browser regressions.

## [0.19.3] - 2026-11-13
### M2 — Developer completion (100%, CI verified)
- Completed typed private-data compiler workflow: page scanning, editable reviews, explicit confirmation, rejected candidates and original PDF references.
- Show future/incompatible compiler records safely without destroying user data; never consume unconfirmed, rejected or source-stale rules.
- Final Chrome regression covers unchecked confirmation refusal, approved and rejected records, all game catalog consumers, 390px review layout, private backup and restore.
- Added M2 build acceptance checklist. **Verified 111/111 unit tests, Chrome smoke, and distribution audit** in run 43540777249. Real hardware testing is tracked in M7.

## [0.19.2] - 2026-11-13
### M2 — Integrated compiler catalogs and revalidation (85% development)
- Use confirmed source-validated records in existing lifepath selection, ship-class selection and mission random-table rolling.
- Show confirmed private talents as source-linked references without applying unverified bonuses.
- Revalidate saved records without deleting player edits; stale or invalid records become needs-review and cannot be consumed.
- Permit removing old-source records; preserve corrections during compiler/schema migrations.
- Test two-column table ambiguity, bad ranges, schema migration, typed catalog output, and private backup restoration in synthetic browser tests.

## [0.19.1] - 2026-11-13
### M2 — In-app compiler review (60% building)
- Introduce Library review interface for source-page candidate scanning and manually entered private drafts.
- Add typed local editors for lifepath attributes/discipline bonuses, talents, ship systems/departments, and numbered random tables.
- Require explicit human verification before confirming any record. Keep raw suggestions as drafts and refuse incomplete typed fields.
- Show record status, PDF page navigation, and removal of saved private records.
- Add Chrome smoke for scan → verify → save with a synthetic PDF; no licensed data enters CI.

## [0.19.0] - 2026-11-13
### M2 — Private compiler foundation (25% build completion)
- Owner declared M1 complete for development; move real-device acceptance requirements to M7 and start M2.
- Introduce versioned, SHA-256-bound private compiled records for lifepath choices, talents, classes and random tables.
- Scan user-imported pages for **unverified** headings/numbered rows; do not invent mechanical bonuses or automatically confirm publisher data.
- Validate confirmed records using existing private choice, class and table validators; require explicit review metadata.
- Add atomic IndexedDB save/update/remove of compiled records, with cross-tab generation checks.
- Preserve private compiled records only in opt-in PDF-inclusive backups; validate on restore.
- Add synthetic unit tests for missing fields, source mismatch, stale compiled data and invalid table ranges.

## [0.18.0] - 2026-11-13
### M1 — Deleted-campaign protection and full-book parser verification
- Capture a database epoch when creating a campaign. Verify it and its expected revision atomically during every save, including first saves.
- Reject stale, never-saved campaign creation after a reset or restore in another tab; protect against campaign resurrection.
- Add Chrome regression for stale new-campaign writes following a second-tab restore.
- Add privacy-preserving private PDF verification utility, using the same shipped PDF.js preparation code as the offline PWA.
- Confirmed user-provided 336-page 2026 corebook parses through the shipped PDF.js compiler in a local Node compatibility harness (no licensed data published).
- Added synthetic PDF verification as part of Chrome CI, without including commercial PDFs.

## [0.17.9] - 2026-11-13
- Documentation follow-up: provided reproducible localhost preview and Android USB-debugging acceptance instructions; no gameplay code changed.
### M1 — Cross-tab recovery regression fix
- Fix recovery drafts failing to import after an external restore by stripping the original campaign's stale storage epoch when creating a new recovered campaign.
- Add a dedicated recovery unit test; retain the two-tab Chrome restore and import regression.
- v0.17.8 passed source/unit/distribution checks but its expanded Chrome smoke test caught this bug; v0.17.9 must pass all checks before acceptance.

## [0.17.8] - 2026-11-13
### M1 — Cross-tab restore and import integrity
- Persist a database generation token in IndexedDB across tabs; importing a PDF and verifying the token occurs atomically in the same transaction.
- Invalidate prepared/importing PDF jobs after reset or restore in *another* tab; protect reattachments and private-index changes.
- Assign new campaign storage-epoch identities on restore, rejecting stale-tab campaign saves even if numeric revisions match.
- Add headless Chrome two-tab restore regression for imports, document changes and campaign overwrites.
- Independently inspected the private 336-page book and confirmed its previously generated index matches its source SHA-256; physical Android testing remains pending.

## [0.17.7] - 2026-11-13
### M1 — Acceptance gate and mobile recovery UI
- Chrome smoke asserts the persistent recovery banner/buttons fit the 390px phone viewport and records a screenshot.
- Added a single owner acceptance checklist for actual legal 336-page PDF, backup/restore, offline play and reattachment.
- Retained explicit untested preview status pending physical-device acceptance and M1 signoff.

## [0.17.6] - 2026-11-13
### M1 — Unsaved-draft recovery
- On save failure, retain a player-authored campaign snapshot and show a persistent download control.
- Import recovery JSON as a NEW campaign, preserving both the newer saved revision and the unsaved draft.
- Recovery format excludes commercial PDF bytes and privately compiled rules data.
- Add unit and full Chrome conflict-to-download-to-recovery tests.

## [0.17.5] - 2026-11-13
### M1 — Import/reset race protection
- Track database generation across resets/restores and reject obsolete staged PDF imports.
- Guard long-running existing-book preparation and source reattachment against reset races.
- Update documents through transaction-protected patches that preserve current bookmarks and private options.
- Add browser regression proving a stale import/reattachment cannot write after restore.

## [0.17.4] - 2026-11-13
### M1 — Concurrent save and restore protection
- Use atomic per-campaign revision checks to reject stale overwrites from other tabs.
- Serialize saves to the same campaign within a tab.
- Drain pending saves before restoring or clearing the database; reject new saves while destructive mutation runs.
- Close old IndexedDB connections when a newer version needs to upgrade.
- Exercise stale-copy conflict, queued-save order, database reopen and overlapping restore in Chrome.

## [0.17.3] - 2026-11-13
### M1 — Interrupted import and offline resilience
- Chrome regression uses a generated, noncommercial 336-page PDF to reflect the 2026 edition's page count.
- Verify cancellation after extraction begins, previous records intact, and successful retry.
- Reinstall the offline shell while an old cache exists; verify cleanup and retained campaign data.
- Prepare a private PDF again with network access disabled.
- Hash existing parser input in place, avoiding another full PDF read during preparation.

## [0.17.2] - 2026-11-13
### M1 — Source-replacement integrity
- Reattach existing source PDFs only if their SHA-256 fingerprint matches the saved book.
- Preserve the document ID, bookmarks, private rules index, tables, choices and ship templates.
- Reject a different PDF/edition without modifying existing data, and instruct the user to import it separately.
- Add source-relink tests and browser coverage for same-file success and different-file refusal.

## [0.17.1] - 2026-11-13
### M1 — Restore integrity
- Browser automation now downloads private full backups and restores both data-only and PDF-inclusive backups.
- Corrupted private source indexes must fail before changing existing campaigns or documents.
- Simulated duplicate-ID IndexedDB transaction failure must roll back all attempted writes.
- Preserve useful free-space numbers in quota-preflight errors.

## [0.17.0] - 2026-11-13
### M1 — Data protection (partial)
- Multi-file PDF imports validate before mutation and add all document records in one IndexedDB transaction.
- Added quota preflight, clearer storage errors, existing-book cancellation, and safe failed-write timestamps.
- Added invalid-batch, abort and capacity tests and browser partial-import regression.
### Verification
- CI must pass before accepting. M1 remains open for full private restore, source replacement and offline upgrade recovery.

## [0.16.1] - 2026-11-13
### Planning
- Added an ordered M1–M8 active development roadmap with concrete implementation and acceptance requirements.
- Linked the active roadmap while keeping historical milestones and prior decisions intact.
- No gameplay change, no new licensed source content, and no new hardware verification in this version.

## [0.16.0] - 2026-11-12
### Tests
- Headless Chrome now exercises actual Markdown episode/campaign downloads and default JSON backup exports.
- CI inspects downloaded content and rejects accidental private book-text inclusion.
- Default backup is verified to omit PDF-derived data while retaining the player's campaign.
### Quality
- Original import, gameplay and offline browser smoke checks remain required.

## [0.15.1] - 2026-11-12
### Fixed
- An earlier campaign save cannot asynchronously redraw a different page and erase text being typed.
### Tests
- Browser smoke now waits for the campaign and character saves to finish before switching screens, and confirms the mission title field retains its input.

## [0.15.0] - 2026-11-12
### Added
- Export complete campaigns or individual episodes to portable Markdown.
- Journals include player-authored character/ship/crew details, scenes, logs and roll history.
### Privacy
- Journal exports never pull imported rulebook PDFs, private page indexes, random-table entries or option catalogs.

## [0.14.2] - 2026-11-12
### Fixed
- Browser smoke launches Chrome with a DevTools pipe, a longer startup limit and diagnostic output to reduce hosted-runner startup failures.
### Tests
- Phone viewport overflow still must pass an actual browser run before the v0.14.1 layout fix can be marked verified.

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