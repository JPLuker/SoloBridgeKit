# Roadmap

## Shipped: 0.1.0–0.2.0

- Offline-first static PWA, multiple local campaigns, editable character and ship records, three-act mission notes and logs.
- Private PDF import/reader, browser-local IndexedDB saves and JSON backup/restore.
- Source-verified 2026 2d20 core task resolution, Focus advantage, Momentum and Threat flags; raw d6/d20 dice.

## Implemented in 0.3.0

- Guided eight-screen interface for the source's seven lifepath steps (two separate career-event screens), with saved drafts, live allocations, source PDF page links, total/cap checks and explicit apply-to-sheet.
- Uses the book's starting numbers and final caps. **Does not** bundle option-specific species/upbringing/career-event tables; the player must confirm their choices and restrictions in their imported book.
- Three-act scenes are now individual editable records. Scenes per act are configurable, completion is deliberate, and previous 0–15 mission counters migrate into scene records.
- Momentum spending (narrative advantage, remove Threat, single-die reroll of latest task), Threat resolution (complication note or difficulty increase on next task), and resource flag persistence.
- IndexedDB record operations wait for transaction completion; import backup validation checks PDF signatures, sizes and duplicate document IDs.
- 38 automated model tests and JS syntax checks passing locally. Browser navigation and real-device behavior still unverified.

## Implemented in 0.4.0

- Six-step source-linked ship/station setup based on the 2026 book (era, class, polity trait, unique trait, talents and name/registry). Player enters class stats and talent names from private books; the public repository does not contain licensed stat blocks.
- Validates ship ratings (systems 6–12, departments 1–5), talent count equals ship scale, and stations use up to half their scale rounded down.
- Persistent editable crew roster for multiple officers with rank, role, department, relationship and notes.
- 47 model tests and JavaScript checks pass locally; browser UI still cannot be reached from the restricted Chromium runtime.

## Implemented in 0.5.0

- Saved player-created named page bookmarks for each imported PDF and direct page navigation inside the existing reader.
- Bookmarks are private, included with PDF backup/restore and validated on import; old backups and imported PDF records remain compatible.
- 52 automated model tests pass locally. The native PDF reader and browser backup flows still need real-browser verification.

## Implemented in 0.6.0

- Every player-triggered 2d20 task roll during a mission creates a durable, timestamped record on that mission.
- Momentum rerolls revise the same record while retaining its original dice; the user can delete individual history records. Raw dice utility rolls remain session-only.
- Older campaigns are compatible. All roll records export in the existing campaign backup.
- 59 source-checked model tests pass locally; real browser and device tests remain unverified.

## Next: application quality

1. Resolve blocked browser end-to-end testing; verify navigation, lifepath workflow, storage, PDFs and scenes with actual Chromium/Android screenshots.
2. Validate the complete education and upbringing option-specific constraints, using the owner's private rulebook at runtime instead of reproducing copyrighted reference data publicly.
3. Continue source-checked crew statistics, ship milestones and character advancement.
4. Test IndexedDB export/import with a large PDF and interrupted storage operations on real browsers; improve rollback/undo for destructive actions.
5. Add private PDF **text search** with on-device indexing, and user-created random generators linked to the appropriate pages.
6. Continue solo mission play integration and optional self-hosted sync only after explicit approval.
7. Accessibility audits, offline upgrade tests, final copyright review, and versioned releases.

## Rejected and non-goals

- Publishing commercial PDFs, original book prose or copyrighted table contents in the public repository.
- AI-generated characters, dialogue, stories or artwork; the player's content is their own.
- Required accounts, third-party telemetry, runtime trackers and network services.

## Private source material

- 2026 edition corebook, supplemental and both blank-form PDFs were privately provided on 2026-11-11. Source files are excluded from source control and release archives.
## 0.7.0 — Bring your own rulebook safeguards

- Game-dependent screens require a locally imported PDF designated **Core rulebook**, with an import prompt otherwise. Older documents can be marked without reimport.
- The Library allows explicit document-type classification for corebook, supplement, forms and references.
- Default backups include campaign data only. PDF-inclusive backups require an explicit private-backup checkbox; pre-0.7 backups still restore.
- Public source audit is part of the required checks. Manual copyright/source review remains necessary before each release.

## v0.7.1 data-safety refinement

- Existing imported PDFs are retained on restore of a data-only backup. PDF-inclusive backups still replace document records.
- Corebook designation during import is now opt-in, preventing accidentally treating forms or unrelated PDFs as the required corebook.

## 0.8.0 — Source-dependent setup

- Gameplay requires the user to import a PDF and prepare a matching, readable private index with Poppler. The PDF's SHA-256 digest is checked before the index is accepted.
- Browser-local full-text search now reads the user's extracted pages; no publisher text is shipped.
- Private-backup opt-in includes generated index with user PDFs; default campaign exports exclude both. Source audit blocks generated `.solobridge-book.json` files.

### Next
1. **Browser-local PDF extraction:** replace the desktop Poppler preparation step with a bundled, offline PDF parser so the user uploads the corebook only once, including on mobile.
2. Use the private index as the data source for table/choice lookups (human-reviewed parser rules, no licensed entries in public source).
3. Browser end-to-end testing of source mismatch, import failures, offline play, and restore from private backups.
4. Source-version compatibility, in-app preparation progress and file-integrity failure recovery.

## 0.8.1 shipped

- PDF-inclusive restore now pairs every imported private rules index with its PDF fingerprint before destructive database replacement.

## 0.9.0 — In-browser preparation and packaged offline PWA

- Browser-local single-PDF corebook preparation, text extraction, progress and cancellation; SHA-256-bound private rules index stored in IndexedDB.
- Prepared existing documents without reimporting. CLI index import remains available.
- Build-time PDF.js vendoring, offline asset precache, auditable `dist/` output, CI-uploaded UNTESTED preview.

### Next — game-data layer
1. Private structured records authored from the user's compiled book index (with page provenance); do not ship species, talents, tables or copyrighted source text.
2. Interactive rule and random-table tools driven exclusively by that private local data.
3. Validate PDF.js parsing and real-browser flows on Android/desktop, particularly storage quota and offline installation.
4. Move toward automated section extraction using source-driven parsing with confirmation for ambiguous data.

## 0.10.0 — Private, source-dependent random tables

- Use source-book text stored only in the user's IndexedDB to propose numbered table rows; require correction and confirmation before storing playable tables.
- Each private table is tied to its source PDF SHA-256, has contiguous non-overlapping numerical ranges, and can be rolled without copying publisher text to mission logs.
- Private tables are kept with document records and included only in explicitly requested PDF-inclusive backups; no table material is shipped publicly.

### Next developer tasks
1. In-app structured option extraction and verification for lifepath and ships, with source/page provenance and manual review of ambiguous options.
2. Improve input validation, 2026-edition source compatibility, multi-book references and compile progress/error recovery.
3. Integrate selected private source options directly into character/ship builders and mission workspace.
4. Browser and Android testing of the actual parser, private tables, backup/restore and offline behavior.

## 0.11.0 — Source-linked lifepath presets

- Players may save a validated lifepath stage as a private source-book option and reuse it when building another character.
- Saved choices include source page and PDF fingerprint, allocations, values and focuses; no publisher choice list is shipped.
- Library supports removing saved choices; career-event presets work for both event steps. Private PDF backups include options; default campaign exports don't.

### Next
1. Extend source-linked private presets to ship class statistics and selected talents.
2. Integrate dice/table choices into active scene workflow.
3. Verify real Android and desktop browser flows; test PDF.js memory use with the full 2026 corebook.

## 0.12.0 — Private starship class reuse

- Player-entered, source-verified class data can be saved with PDF page and fingerprint, then applied to another ship without overwriting its personal identity.
- Library lists and removes class templates. No publisher class statistics are bundled; stored template data is included only in explicit private PDF backup exports.

### Next
1. Provide source-specific play actions directly in the active mission scene, without duplicating the Library interface.
2. Add recovery-safe import and export flows and a browser smoke-test harness.
3. Complete option-specific source-data checks and exercise the full 2026 PDF on real Android/desktop browsers.

## 0.13.0 — In-mission game actions

- Captain's Log now provides current-scene task rolls and privately sourced random tables in one mission workspace.
- Task history, Momentum and Threat use the same recording implementation as the Dice screen.
- Table roll logs store the table reference, source PDF page and rolled number rather than extracted publisher prose.

### Next quality target
- Add browser automation in CI to validate the full one-file corebook import, offline reload, character/mission navigation and screenshot layout, using a generated non-copyright test PDF.

## 0.14.0 — Automated browser smoke testing

- CI starts the compiled PWA in headless Chrome and uses a fully synthetic 210-page PDF to test local import, indexing, prepared search, campaign/character/mission creation, task rolls and an offline reload.
- Phone and desktop screenshot artifacts captured. A failed browser flow fails the CI job; no commercial source material is used.
- Still outstanding: real Android/device verification, accessibility measurements, and more extensive recovery tests.

## 0.14.1 — Mobile overflow fix

- Browser screenshot issue: three scene-count fields exceeded the phone viewport. Fixed width constraints and added CI assertion for 390px horizontal overflow.

## 0.14.2 — CI browser start resilience

- Adjusted headless Chrome launch transport and timeout to address an intermittent hosted-runner startup failure. The 390px overflow regression remains gated by the browser smoke step.

## 0.15.0 — Portable player-authored campaign journals

- Entire campaigns and individual episodes can be exported to readable Markdown, including character and ship records, crew, scenes, logs and task-roll history.
- Export intentionally excludes purchased PDFs, private indexed pages, random-table entries, and locally compiled species/class option catalogs.
- JSON backups remain the round-trip format for restoring editable state; Markdown export is for reading/archival rather than reimport.

### Next developer work
1. Expand browser smoke to exercise journal downloads, storage reload and UI controls on narrow screens.
2. Strengthen multi-document backup safety, large PDF quota failures, interrupted import, recovery and overwrite protections.
3. Continue source-linked progression and character/ship advancement after source-mechanics verification.

## 0.15.1 — Save/navigation race fix

- Prevent stale asynchronous saves from redrawing a subsequent page while the user is typing. Strengthen browser smoke timing and input retention assertions.
