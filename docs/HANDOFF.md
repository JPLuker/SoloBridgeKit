# Handoff

## Project

SoloBridgeKit is an unofficial D&D Beyond-style, offline-first companion for the owner's purchased 2026 *Star Trek Adventures: Captain's Log* books. The application cannot contain or publish the commercial PDFs, full table contents, or publisher artwork.

## Firm rules

Follow `AGENTS.md`, internal guidelines and `docs/NO_LIST.md`; privacy/local-first, no AI-generated art or narrative, copyright separation and proof before claims. Do not apply an unapproved visual restyle.

## Current state — 0.3.0

- `app.mjs`: `renderLifepath()` for the seven-step wizard (career events have separate pages), `renderSceneTracker()` for per-act scene planning, `renderDice()` for source-grounded task rolls, reroll and Momentum/Threat controls. Source jumps call `openPdf(document, page)`.
- `lifepath.mjs`: `LIFEPATH_STEPS`, `createLifepath()`, `normalizeLifepath()`, `validateLifepathStep()`, `lifepathReview()`, `applyLifepathToCharacter()`; source corebook PDF pp. 97–98, 109, 113, 121, 128–129, 135.
- `missions.mjs`: `createMissionScenes()`, `normalizeMissionScenes()`, `updateScenePlan()`, `toggleMissionScene()`; source corebook PDF pp. 191–193. Old missions with only `tracker` are migrated.
- `resources.mjs`: `taskDifficulty()`, `applyTaskOutcome()`, `spendMomentum()`, `spendThreat()`; source corebook PDF pp. 198–200.
- `model.mjs`: source-form fields, campaign/mission creation, task resolution and backup validation. `storage.mjs`: IndexedDB with transaction-complete reads/writes and atomic multi-store backup restore.
- Offline shell cache updated to v0.3.0 and includes all the new module files.
- `npm run check && npm test` passes **38 tests** locally (source edition: 2026). No GitHub Issues were open at the start of this session.

## Known limits

- The lifepath builder validates allocation patterns, final 56/16 totals, four values/six focuses and the one-at-12/one-at-5 caps. It does *not* automate every option-dependent restriction, species or career event. The UI clearly directs the player to their imported book.
- Ship creation is still a manual sheet. No integrated PDF text search or licensed tables.
- Visual/browser interaction is not verified: local Chromium navigation returns `ERR_BLOCKED_BY_ADMINISTRATOR` under this environment, including localhost. CI unit tests are not a substitute for device tests.
- Browser-specific quota behavior, real PDF rendering and offline upgrades need further verification.
- Code license, visual identity, and optional self-hosted sync remain user decisions. None has been assumed.

## Next tasks, developer first

1. Gain approved browser smoke/visual tests; inspect all pages on 390px and desktop widths, run a11y measurements and resolve actual failures.
2. Finish lifepath option restrictions and source-linked guidance without bundling copyrighted tables.
3. Ship-builder and crew management, then advancement, then PDF search.
4. Confirm real browser IndexedDB backups and interrupted restore; add undo where needed.

## User inputs later

- Visual identity approval, code license, and whether optional self-hosted synchronization is desired.
- One focused test pass per milestone when a real build is available; avoid repeated test requests.