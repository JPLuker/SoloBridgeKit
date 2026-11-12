# Handoff

## Project

SoloBridgeKit is an unofficial D&D Beyond-style, offline-first companion for the owner's purchased 2026 *Star Trek Adventures: Captain's Log* books. The application cannot contain or publish the commercial PDFs, full table contents, or publisher artwork.

## Firm rules

Follow `AGENTS.md`, internal guidelines and `docs/NO_LIST.md`; privacy/local-first, no AI-generated art or narrative, copyright separation and proof before claims. Do not apply an unapproved visual restyle.

## Current state — 0.6.0

- `app.mjs`: `renderLifepath()` for the seven-step wizard (career events have separate pages), `renderSceneTracker()` for per-act scene planning, `renderDice()` for source-grounded task rolls, reroll and Momentum/Threat controls. Source jumps call `openPdf(document, page)`.
- `lifepath.mjs`: `LIFEPATH_STEPS`, `createLifepath()`, `normalizeLifepath()`, `validateLifepathStep()`, `lifepathReview()`, `applyLifepathToCharacter()`; source corebook PDF pp. 97–98, 109, 113, 121, 128–129, 135.
- `missions.mjs`: `createMissionScenes()`, `normalizeMissionScenes()`, `updateScenePlan()`, `toggleMissionScene()`; source corebook PDF pp. 191–193. Old missions with only `tracker` are migrated.
- `shipbuilder.mjs`: `createShipBuilder()`, `reviewShipBuilder()` and `applyShipBuilder()` for the six-step ship/station creation process, source PDF pp. 146–148, 172–175, 181–183. User supplies licensed class ratings and talent choices.
- `app.mjs`: `renderShipBuilder()` and `renderCrew()` implement ship/station setup and persistent crew roster. `model.mjs`: `createCrewMember()` and backwards-compatible campaign `crew: []`.
- `resources.mjs`: `taskDifficulty()`, `applyTaskOutcome()`, `spendMomentum()`, `spendThreat()`; source corebook PDF pp. 198–200.
- `model.mjs`: source-form fields, campaign/mission creation, task resolution and backup validation. `storage.mjs`: IndexedDB with transaction-complete reads/writes and atomic multi-store backup restore.
- `bookmarks.mjs` stores and validates player-authored page references per PDF; `renderLibrary()` and `#pdf-page-form` support saved bookmarks and direct page jumps, with bookmark data in JSON backup/restore.
- `rollhistory.mjs` stores player-initiated 2d20 task histories per mission. `renderTaskHistory()` displays the latest twenty with independent deletion; rerolls preserve original dice and update the matching saved record.
- Offline shell cache updated to v0.6.0 and includes all active modules.
- `npm run check && npm test` passes **59 tests** locally (source edition: 2026). No GitHub Issues were open at the start of this session.

## Known limits

- The lifepath builder validates allocation patterns, final 56/16 totals, four values/six focuses and the one-at-12/one-at-5 caps. It does *not* automate every option-dependent restriction, species or career event. The UI clearly directs the player to their imported book.
- Ship setup is guided, but the actual class stats and talent options remain manual because copyrighted reference data are not bundled. Crew is currently a roster, not a full secondary character builder. No PDF full-text search or licensed tables.
- Visual/browser interaction is not verified: local Chromium navigation returns `ERR_BLOCKED_BY_ADMINISTRATOR` under this environment, including localhost. CI unit tests are not a substitute for device tests.
- Browser-specific quota behavior, real PDF rendering and offline upgrades need further verification.
- Code license, visual identity, and optional self-hosted sync remain user decisions. None has been assumed.

## Next tasks, developer first

1. Gain approved browser smoke/visual tests; inspect all pages on 390px and desktop widths, run a11y measurements and resolve actual failures.
2. Finish lifepath option restrictions and source-linked guidance without bundling copyrighted tables.
3. Add crew statistics and relationship tools, character/ship advancement, then private PDF search.
4. Confirm real browser IndexedDB backups and interrupted restore; add undo where needed.

## User inputs later

- Visual identity approval, code license, and whether optional self-hosted synchronization is desired.
- One focused test pass per milestone when a real build is available; avoid repeated test requests.
## v0.7.0 book distribution safeguards

- `content-policy.mjs`: document types, corebook presence test, game route gate and explicit backup option.
- `render()` and `renderHome()`: gate gameplay until the player imports a PDF marked **Core rulebook**. `renderLibrary()`: classify documents at import and assign older untyped PDFs a corebook designation.
- `storage.mjs`: data-only backup by default; optional private PDF export; backward-compatible restore preserves document roles.
- `scripts/audit-public-bundle.mjs`: reject book/ebook/archive files from public checkout; integrated into `npm run check` and GitHub CI.
- Still required: human inspection of copyrighted extracts not detectable by file types and user testing of import and backup UI.

## v0.7.1 data safety follow-up

- Data-only backups are marked `includesDocuments: false` and restoring them keeps existing device-local imported PDFs.
- PDF-inclusive backups replace PDFs; older backups lacking the marker remain backward-compatible.
- New Library imports default to **Other reference** so classifying a file as **Core rulebook** is a deliberate choice.

## 0.8.0 source-dependent corebook preparation

- `book-data.mjs`: validates a private full-page text index and its section coverage, pairs a generated pack with the imported PDF using SHA-256, provides local search. `hasPreparedCorebook()` replaces a document-role gate.
- `scripts/prepare-corebook.mjs`: external, offline Poppler preparation command requiring the user's private PDF; generates `.solobridge-book.json` outside the distributed software. Never commit the generated output.
- `app.mjs`: renders only the setup shell until a prepared, matching corebook is stored in IndexedDB. Library imports private index files and exposes user-data-backed local search.
- `storage.mjs`: opt-in private book backup includes private index, default campaign-only export excludes everything from documents. `model.mjs` validates optional restored indexes.
- `scripts/audit-public-bundle.mjs` rejects `.solobridge-book.json` files. The shipped PWA offline shell caches the parser/validator code, not extracted data.
- Current limitation: desktop Poppler preparation, not yet a single mobile in-app PDF upload. Browser/UI behavior must still be device-tested; CI tests cover the pure validator and existing mechanics.

## 0.8.1 restore integrity

- `storage.restoreBackup()` verifies each imported `bookPack` against its corresponding PDF SHA-256 before starting the IndexedDB replacement transaction. Corrupt or mismatched private indexes abort restore without touching existing saves.

## 0.9.0 — One-file preparation and offline build

- `browser-compiler.mjs`: local PDF.js extraction and private book-pack validation, with optional progress updates and cancellation; it dynamically imports the locally bundled parser at `vendor/pdf.mjs`.
- `app.mjs:renderLibrary()`: importing a **Core rulebook** now compiles the private index automatically. Previously imported documents can be prepared via **Prepare as corebook**. Existing CLI-generated index import remains available.
- `scripts/build-static.mjs`: copies application sources and pinned PDF.js 5.4.296 runtime, worker, cmaps, and standard fonts into `dist/`; an asset manifest allows the service worker to precache the entire source-free runtime.
- `scripts/audit-dist.mjs`: output whitelist, forbid unexpected PDFs and documents, require PDF.js files; CI uploads clearly UNTESTED preview.
- Source checkout does not contain runtime node dependencies; run `npm install --ignore-scripts --no-audit --no-fund && npm run check && npm test && npm run build && npm run audit:dist`.
- Real browser/Android validation is still pending; do not call this a tested release.

## 0.10.0 — Private table compilation

- `private-tables.mjs` provides private candidate detection, user-reviewed range parsing, deterministic validation, secure roll selection and table lifecycle methods.
- `app.mjs:renderPrivateTables()` appears under Library once a privately prepared book is available. Players select a PDF source page, review candidate rows, save a private table and roll it. Mission log references contain page and roll number, not publisher result prose.
- `storage.mjs` and `model.mjs` validate table data and include it only in opt-in private PDF backups, not campaign-only JSON backups.
- `scripts/build-static.mjs`, `scripts/audit-dist.mjs`, `sw.js`, CI, README and source checks updated for the extra code module. The runtime bundle still contains no book data.
- Need actual browser testing and more robust source-table recognition before automating complex publisher table layouts.

## 0.11.0 — Private lifepath choice reuse

- `private-options.mjs` validates and stores source-linked private lifepath presets, with normalized bonus maps and separate source provenance. Career-event options are shared by events 1/2.
- `app.mjs:renderLifepath()` now offers **Save as private choice** for a fully valid stage and **Apply saved choice** for matching imported-source options; existing drafts require confirmation before replacement.
- `app.mjs:renderPrivateOptions()` lists/removes personal choices under Library. `storage.mjs` and `model.mjs` include source-matched options only in explicit private book backups.
- New module included in static build, offline cache, distribution whitelist and unit tests.

## 0.12.0 — Source-dependent private ship classes

- `private-ships.mjs` verifies starship/station class templates with source page, PDF SHA-256, scale and system/department ratings.
- `app.mjs:renderShipBuilder()` saves private class data from class step and applies selected templates without overwriting ship name, registry, traits or talents.
- `app.mjs:renderPrivateShips()` lists saved private class templates in Library. `storage.mjs`/`model.mjs` preserve and validate these only with the associated private book.
- Static build, offline precache, distribution audit and tests include the private ship schema; no specific publisher class data appears in public assets.
