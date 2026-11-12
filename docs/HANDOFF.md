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
