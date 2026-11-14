# M3 — Guided Character Creation & Progression (development acceptance)

**Scope:** Developer build acceptance only. Real-device and manual UX acceptance is deferred to M7 by owner decision; this is not a public 1.0 release.

## Completed build requirements

- [x] Each of seven source-dependent stages (including two separate career events) can select a privately confirmed lifepath option tied to its record ID, source PDF SHA-256 and page.
- [x] Stage allocations are checked before a verified option is applied; finishing uses existing source-verified total and cap rules (56/16, four Values, six Focuses, and one-at-12/one-at-5).
- [x] New characters start guided; legacy manual characters and unfinished drafts continue to load and can switch modes without deleting their work.
- [x] A guided character can be applied only when all seven stages retain unchanged source-matched mechanics. The code enforces this independently of button disabled states.
- [x] Changing the source catalog or manually editing mechanics invalidates the applied/verified status without deleting the original selections and player-authored information.
- [x] After a completed mission, a player can choose one source-grounded milestone (Attribute shift, Discipline shift, or Focus swap). Rating ranges and final constraints are enforced; no automatic XP or invented benefits.
- [x] The separate optional end-of-mission Focus change is limited to one per mission and cannot be repeated after a milestone Focus swap.
- [x] A challenged Value may be replaced with explicit confirmation. The app does not decide whether a Value was challenged.
- [x] Player-authored injuries and conditions are stored as active/recovering/resolved records without fictional penalties or medical mechanics.
- [x] Development history includes previous and new data, source SHA/page, mission reference, time and user-authored notes.
- [x] Legacy characters, incomplete drafts and milestones survive save/reload and both backup types. A corrupt/duplicate development record is rejected at backup validation.
- [x] Old source links only open matching imported PDFs; missing or replaced sources remain identified instead of pointing to a different book.
- [x] Automated tests cover full guided creation, invalid bonuses, stale source, rating caps, focus/value consent, same-mission duplicates, conditions, mobile-width UI and backup restore.
- [x] Distributable PWA includes only software and generic tests; no commercial PDFs, licensed options, art or text.

## Boundaries

- Individual species/education/career-event constraints not representable in the privately confirmed option schema require the player to check the purchased source. The app does not invent such restrictions. Mechanically typed bonuses must pass confirmed source records and the general stage/final validators.
- Character-development actions are player-triggered; the app does not automatically award milestones or write narratives.
- Physical Android and desktop acceptance and broader accessibility remain M7.
- M4 owns enhanced ship/station and crew management. M5 owns mission-play refinement.

**Exit gate:** Version 0.20.2 full CI (syntax, unit, browser, distribution) green, followed by final handoff documentation; then M3 is 100% for development with no planned backlog. Regressions and data-loss fixes remain exceptions.
