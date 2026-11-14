# Handoff

## Project

SoloBridgeKit is an unofficial D&D Beyond-style, offline-first companion for the owner's purchased 2026 *Star Trek Adventures: Captain's Log* books. The application cannot contain or publish the commercial PDFs, full table contents, or publisher artwork.

## Current session — 2026-11-13 (v0.16.1 plan update)

- Current app baseline was v0.16.0: browser-local PDF preparation, source-dependent play, private random tables/options/ship templates, mission rolling, Markdown journals, backup and Chrome smoke tests.
- No open GitHub Issues were found at roadmap review. Most recent verified v0.16.0 CI ran 87/87 unit tests, source checks, distribution audit and headless Chrome smoke successfully.
- **Start here:** [ACTIVE_ROADMAP.md](ACTIVE_ROADMAP.md), ordered M1–M8, starting with data-safety and preparation failure recovery. [ROADMAP.md](ROADMAP.md) preserves historical release notes.
- This session only formalized development priorities and updated the documentation/version; it did **not** implement future milestones, certify real hardware or ship a tested 1.0 build.
- Owner decisions remain: visual theme, public code license, optional sync, real-device acceptance and final release milestone.

## Firm rules

Follow `AGENTS.md`, internal guidelines and `docs/NO_LIST.md`; privacy/local-first, no AI-generated art or narrative, copyright separation and proof before claims. Do not apply an unapproved visual restyle.

## Historical foundation — 0.6.0

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

## 0.13.0 — Shared mission task actions

- `mission-actions.mjs:commitTaskToMission()` returns an updated episode, task record and previous resources without mutating original records.
- `app.mjs:recordMissionTask()` persists the shared result for both Dice and in-mission roll panels, including the state needed for a Momentum reroll.
- `app.mjs:renderMissionActions()` provides task controls and privately compiled random tables next to the active captain's log. Recorded table references never copy publisher text into exported campaign data.
- Unit tests cover pure task persistence; rendered UI and full PDF imports remain to be verified in a real browser.

## 0.14.0 — Browser smoke tests

- `scripts/synthetic-book.mjs` generates a small valid synthetic PDF at test runtime. It is never stored in Git or included in public release assets.
- `scripts/browser-smoke.mjs` launches system Chrome through pinned `puppeteer-core`, serves the packaged `dist/`, verifies import/search/campaign/character/mission/task-roll/offline flows, and writes screenshots.
- `.github/workflows/ci.yml` runs browser smoke after the static distribution audit and uploads phone/desktop captures even if the test fails. The untested application preview is uploaded only on a successful run.
- This is headless verification, **not** a real-device/Android acceptance test.

## 0.14.1 phone layout correction

- The first v0.14.0 browser screenshots revealed the mission screen's document width expanded to 475px on a 390px viewport. `.inline-form input` imposed 220px minimum width on three scene-plan inputs.
- `styles.css` now constrains the inputs to their grid cells. `scripts/browser-smoke.mjs` checks mobile horizontal overflow before desktop tests.

## 0.14.2 — Browser launcher reliability

- v0.14.1 browser smoke failed during Chrome startup, before any page or UI assertion. `scripts/browser-smoke.mjs` now uses `pipe:true`, 90-second launch timeout and diagnostic stderr. Re-check the next GitHub Actions run to confirm browser reaches the synthetic PDF flow.

## 0.15.0 — Readable journal export

- `campaign-export.mjs`: pure Markdown serialization for player-authored campaigns and individual episodes, plus safe filenames. Uses existing normalized models, never the document database.
- `app.mjs`: **Export journal** on Home campaign overview; **Export episode** next to selected mission status. Both download `.md` content without source documents.
- `tests/campaign-export.test.mjs`: verifies user-authored fields, safe filenames, and omission of private book data.
- Added module to service worker offline assets, distributable allowlist/build, syntax checks, documentation. Browser export/download remains to be exercised in a follow-up smoke test.

## 0.15.1 — Save/navigation race protection

- `app.mjs` tracks `navigationVersion`; `persist()` captures it and `refresh(expectedNavigationVersion)` suppresses stale redraws after navigation while still refreshing stored data and campaign state.
- The v0.15.0 browser smoke failed because the mission title was blank at submission after navigating immediately from an in-flight character save. The failure screenshot showed native required-field validation, no JavaScript exception.
- Browser smoke now waits for explicit **Campaign created**, **Character saved**, and **Mission started** toasts and checks that the mission title input wasn't cleared. Verify the next CI run before labeling this fixed.

## 0.16.0 — Browser download/content verification

- `scripts/browser-smoke.mjs` uses Chrome DevTools download behavior and inspects the downloaded episode Markdown, campaign Markdown and default campaign-only JSON backup.
- Asserts exports contain player-authored character/mission data and task records but no imported PDF-derived page text. Default backup must have `includesDocuments:false` and `documents:[]`.
- This is the first browser-level export verification; tests continue using only a synthetic PDF. A failing browser export/download blocks the CI preview.

## v0.17.0 — Active M1 build 1

- `import-safety.mjs` contains pre-commit validation, cancellation check, quota estimate and user-facing storage errors.
- `storage.addDocumentsAtomically()` adds multi-file imports in one transaction; `saveCampaign()` doesn't claim failed writes completed.
- `app.mjs` stages imports and commits once, shares cancellation UI with existing-book preparation and reports storage failures.
- `tests/import-safety.test.mjs` plus Chrome malformed multi-file import test. CI run must be verified before claiming passed.
- Next in M1: full private backup/restore rollback cases, old document compatibility, and offline update recovery. Do not proceed to M2 until M1 acceptance passes.

## v0.17.1 — M1 restore regression

- `scripts/browser-smoke.mjs` tests real browser download/restore of a synthetic private PDF+index backup, data-only restore retaining local PDFs, corrupt private-index restore rejection, and true IndexedDB transaction rollback.
- `import-safety.storageMessage()` retains calculated storage estimate information when a preflight check fails.
- Remaining M1: explicit source replacement/reimport, interrupted import and offline service-worker upgrade tests, then physical-device acceptance.

## v0.17.2 — M1 source reattachment

- `import-safety.relinkDocument()` verifies a reattached PDF's SHA-256 against the existing prepared book or original PDF blob. A mismatch throws before changing IndexedDB.
- `app.mjs` exposes **Reattach the same PDF** for each imported document. The in-place write preserves all existing private content and the original document ID.
- Browser smoke and unit tests cover same-source reattachment and different-source rejection. Next: cancellation during long extraction and offline updates.

## v0.17.3 — M1 interruption/upgrade testing

- `scripts/browser-smoke.mjs` uses 336-page synthetic source and checks mid-parse cancellation, retry, service-worker re-registration and legacy-cache cleanup, and PDF index preparation while offline.
- `browser-compiler.mjs` hashes already-loaded bytes to reduce temporary memory use and checks the AbortSignal after reading input.
- Pending: CI validation; physical Android and desktop browser tests with the actual privately owned 336-page edition remain owner-only acceptance gates.

## v0.17.4 — M1 concurrent-save protection

- `storage.commitCampaignSnapshot()`: atomic transaction-level revision match, increment only after transaction commit, and explicit stale-tab error. Legacy campaigns with no revision load as revision zero.
- `storage.saveCampaign()`: per-campaign queue prevents in-tab out-of-order writes.
- `storage.withExclusiveMutation()`: drain campaign save queues and reject conflicting saves during full restore/reset.
- DB `onversionchange` automatically closes old connections so new app schema versions can proceed.
- Chrome tests cover concurrent stale saves, serialized rapid saves, blocked overlapping restore and connection re-open.
- **Do not declare M1 100% without actual physical-device user-owned book test and review.**

## v0.17.5 — M1 import epoch guard

- `storage.currentDataGeneration()` increases for database restore/reset; `addDocumentsAtomically(records, expectedGeneration)` refuses obsolete batches.
- `storage.patchDocumentIfCurrent()` updates the latest existing document in a read-write transaction, refusing removed records and obsolete generations; unrelated metadata remains intact.
- `app.mjs` captures import generation before long tasks and passes it to the final database mutation.
- Chrome test restores a data-only backup then attempts obsolete document insertion and patch: both must fail without changing records.
- **Pending:** actual physical-device test with the owner's legal 336-page corebook and a final M1 acceptance signoff. Do not call M1 complete without those checks.

## v0.17.6 — M1 unsaved-draft recovery

- `recovery.mjs`: validates and snapshots player-authored campaign data separately from private PDF content; recovering always assigns a new ID/title and revision zero.
- `app.mjs`: failed `persist()` displays a persistent recovery banner with user-triggered draft download; Settings can import the JSON draft as a separate campaign.
- Unit tests plus full browser test simulate stale save conflict, download the unsaved draft, import it, and verify both versions coexist.
- **Remaining M1 acceptance:** real-device Android and desktop import with actual 336-page privately owned PDF, offline reload, backup/restore and recovery smoke. No 100% claim before owner acceptance.

## v0.17.7 — M1 acceptance gate

- `scripts/browser-smoke.mjs` checks recovery banner/button accessibility at 390px and saves `phone-recovery.png`.
- [M1 acceptance checklist](M1-ACCEPTANCE.md) is the owner-only real-book/hardware verification requirement; do not treat green headless CI as actual Android acceptance.
- Developer code for M1 is otherwise covered by automated tests and documented. **Do not start M2 until user accepts the M1 device test.**

## v0.17.8 — M1 persisted generation token

- `storage.currentDataGeneration()` is now asynchronous: reads a persistent token from the `settings` object store and combines it with the tab's local mutation counter.
- `addDocumentsAtomically()` and `patchDocumentIfCurrent()` validate the token **inside the same IndexedDB transaction** that writes documents; a restore/reset in another tab cannot race these writes.
- `resetData()` and `restoreBackup()` generate a new persistent token in the destructive transaction. Restored campaign records receive an epoch marker, so old tabs cannot overwrite a restored campaign with the same revision number.
- `app.mjs` now awaits each generation capture/check. New Chrome smoke scenario performs a restore in a second browser tab and verifies both stale document writes and a stale campaign save are rejected.
- Private owner book baseline has been independently inspected locally (336 pages; SHA-256 matches user-generated private search index). Cannot verify Chrome's browser-local extraction here because local Chromium is blocked/hanging. Android acceptance remains user-only; **M1 stays at 98%**.

## v0.17.9 — Two-tab test defect fixed

- The 0.17.8 Chrome run failed on importing a recovery draft after the other-tab restore (timeout waiting for 'Recovery draft imported'). Root cause: the recovered campaign retained the original storageEpoch and correctly triggered stale-save protection.
- `recovery.recoverDraftAsNewCampaign()` now strips storageEpoch from a fresh imported campaign, preserving intended conflict protection while allowing recovery as a new independent campaign.
- The unit test and two-tab Chrome smoke must pass together. M1 physical Android acceptance remains open.

## v0.17.9 acceptance setup addendum

- Updated [M1-ACCEPTANCE.md](M1-ACCEPTANCE.md) with real Linux desktop/Android USB port-forwarding instructions for the passing 0.17.9 preview. `adb reverse` connects Android Chrome localhost to the desktop's loopback-only server without exposing licensed material.
- Independently inspected actual private 2026 source PDF (336 pages) and verified index hash matches; does not supersede unverified Android/browser import.
- **Current state:** 101 unit tests + Chrome smoke passed for v0.17.9. Owner physical-device acceptance remains the only M1 completion gate; do not start M2 until approved.

## v0.18.0 — M1 initial-campaign epoch guard and real-source compiler verification

- `storage.stampNewCampaign()` captures the persistent IndexedDB generation at creation. `saveCampaign()` now checks it and the revision in the **same transaction** as the write, including an absent/never-saved record. Old tabs cannot resurrect deleted campaigns after a reset/restore.
- UI campaign creation and recovery draft imports both call `stampNewCampaign()`. Legacy campaigns remain compatible when the database epoch is still `legacy`.
- `scripts/verify-private-corebook.mjs` runs the exact shipped `dist/browser-compiler.mjs` preparation function with minimal Node rendering-API stubs, prints ONLY page counts/readability, and never writes/exposes book data. `npm run browser:smoke` verifies it against a synthetic 336-page book.
- Independent LOCAL test of the actual purchased 336-page 2026 PDF successfully returned 336 prepared pages, 327 readable pages and matching stored SHA-256 in approximately 2.2 seconds on a server; this does not prove Chrome/Android performance. No private source/index was pushed to GitHub.
- Still unverified: device-local Chrome/Android import, full offline browser save/restore and user signoff. M1 cannot be honestly marked 100% on the strength of desktop Node PDF parsing and CI alone.

## v0.19.0 — M2 begins, M1 code-only closure

- Owner specifically approved proceeding to M2 without counting deferred device testing in M1 completion. M1 is **100% for development**, pending M7 device acceptance. Keep M1 issue as a deferred M7 acceptance gate.
- New `compiler-data.mjs` stores private SHA-bound records with `schemaVersion:1`, type, source page, status and payload. A page scan proposes only drafts; confirmed records go through existing strict value validators. Generic talent records require a private description, never auto-apply undisclosed bonuses.
- `storage.mutateCompiledRecords()`: atomic single-document compiler mutation inside read-write transaction, validating the persistent database epoch. Backups include compiled records only when importing private PDFs is explicitly requested.
- `model.validateBundle()` validates compiled records alongside previously saved choices/tables/classes; older backups remain valid.
- Next in M2: in-app candidate review editor, source navigation, migration/recompile handling, confirmed catalog consumers, synthetic Chrome test, final M2 build-only acceptance. **Do not mark M2 100% early**.

## v0.19.1 — M2 compiler review UI

- `app.renderPrivateCompiler()` displays scan controls, source-linked proposed records, type-specific editors and a human verification checkbox. Only `reviewCompiledRecord()` may promote valid drafts to confirmed.
- `storage.mutateCompiledRecords()` writes the reviewed record in one transaction and leaves unrelated book/private data intact.
- Chrome smoke now tries scan → talent description → check box → confirmed record and validates SHA pairing. CI status must be checked before marking this batch complete.
- Next: consume confirmed catalog in the existing lifepath/ship/table workflows, source revalidation/rebuild, and full browser backup/reimport verification. M2 remains open.

## v0.19.2 — M2 connected consumers, source reconciliation

- `app.combinedPrivateCatalog()` merges existing manually saved private options/ships/tables with confirmed compiler output, deduplicated by record ID. Unreviewed or invalidated records are invisible to gameplay.
- `compiler-data.compiledCatalog()` ignores source-mismatched records; `revalidateCompiledRecords()` marks older or malformed records needs-review and preserves their values.
- `storage.mutateCompiledRecords(..., {type:'revalidate'})` runs inside an atomic IndexedDB document transaction. Library includes Revalidate saved records button.
- The mission/table/campaign export path continues referencing result IDs/page numbers, not publisher table prose.
- Chrome synthetic test generates confirmed private talent, lifepath, ship and table records, rolls a compiled mission table and verifies opt-in private backup inclusion.
- Remaining M2: full source-recompile safety and regression audit (including stale records, migration and data-only export), then build-only acceptance. Physical devices are deferred to M7.

## v0.19.3 — Final M2 development handoff

- M2 implemented in `compiler-data.mjs` and Library `renderPrivateCompiler()`. A saved record carries `schemaVersion`, `kind`, `label`, `page`, `sourceSha256`, `status`, `payload`, `excerpt`, and optional `reviewedAt`.
- `compiledCatalog()` returns only confirmed source-matched data. Future incompatible record schemas remain stored but are not used; library shows an update warning instead of silently deleting records.
- Drafts and rejected entries persist but do not appear in gameplay. Human-verified confirmed lifepath, ship and table records feed the existing game tools. Talent entries are source references only, not invented effects.
- `storage.mutateCompiledRecords()` checks the persistent epoch and saves atomically, including revalidate action; private full backups include compiled records, default backups exclude book-derived data.
- New [M2 acceptance checklist](M2-DEVELOPMENT-ACCEPTANCE.md) tracks build-only completion. All actual-book/phone-browser checks have been deferred to M7 on owner's request.
- Next module M3: source-derived guided character creation, progression, and automated application of validated bonuses, keeping drafts and existing character saves safe.
