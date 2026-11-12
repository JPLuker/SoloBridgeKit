# Handoff

## What this is

SoloBridgeKit is an independent, offline-first digital solo RPG companion, intended to reach the convenience of D&D Beyond for Star Trek Adventures: Captain's Log. Current scope includes a private, user-imported PDF library and campaign data.

## Hard rules

No copyrighted book content in public repo; no unverified mechanics; no AI-authored story or art; local-first privacy. Refer to `AGENTS.md` and InternalDesignGuidelines.

## Where we are

**0.2.0 scaffold**: dependency-free PWA with IndexedDB in `storage.mjs`, data model and unbiased raw die rolls in `model.mjs`, UI in `app.mjs`, styling in `styles.css`, offline shell worker in `sw.js`, and tests in `tests/model.test.mjs`.

The user has supplied a ZIP containing the entire searchable 336-page 2026 corebook, a 19-page supplemental and both blank forms. The book stays PRIVATE; none of its bytes or copyrighted tables belong in the public repository. Core task resolution implemented and unit tested based on Rules of Play (PDF pages 194, 198–200), Focuses (PDF p. 203). The app still requires a user-imported PDF to read the source and has not implemented lifepath, table contents or complete combat.

## Next work that does not need PDFs

Improve backup integrity checks, storage quota handling, UI interactions and tests; add local PDF file management and safe import deduplication; expand responsive E2E test coverage.

## Source-verified work remaining

- Implement and validate the seven-step lifepath against the 2026 corebook (starts PDF p. 97).
- Model starship creation (PDF pp. 145–185) and combat (PDF pp. 205–222).
- Expand the three-act scene tracker to user-configurable scene counts and outcomes (PDF pp. 191–193).
- Use user-imported private PDFs for references and table lookups. Never ship copyrighted text/tables.

## User decisions needed later

Visual identity (LCARS influence versus neutral layout); code license; whether to add opt-in self-hosted sync. No immediate decision required for the foundation.

## 2026-11-11 initial update

- Received privately: Captain\'s Log blank forms v1.1 and fillable v1.2. Both 3 pages. At that time, the corebook upload was failing; the later ZIP resolved it.
- Added all identifiable character/ship fields, manual ratings, episode log sections, values markers and 0–15 mission tracker, without filling in unknown rules.
- `npm run check` and 8 model tests pass. Chromium UI preview is **blocked by local browser policy**, not verified. Do not claim real device testing.
- Superseded by later source-verification work below.

## 2026-11-11, later update: ZIP corebook received

- Archive verified: 336-page corebook, 19-page supplemental, both forms. Full ZIP integrity passed; 329 corebook pages have selectable text.
- Implemented `resolveTask` for two d20, Attribute + Discipline target, 1/2 successes, focus advantage, Momentum and Threat. Scene progression remains player-controlled.
- Added persistent mission Momentum/Threat flags and task-roll UI. No copyrighted table results bundled.
- Unit coverage extended from 8 to 15 tests. Browser UI not verified on physical hardware.
