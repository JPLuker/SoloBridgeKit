# M2 — Private Game-Data Compiler: development completion

**Scope:** Build-only acceptance for M2. Player-device testing is explicitly deferred to M7 by owner instruction. Completion of this module does not declare an app release or imply that every book layout parses perfectly.

## Implementation acceptance

- [x] Versioned `compiler-data.mjs` schema for lifepath choices, talents, ship classes and random tables.
- [x] Records include source PDF SHA-256, page, type, status, original local excerpt/payload and explicit review timestamp.
- [x] Candidate extraction reads **only user-imported PDF text**. It never bundles publisher data or automatically applies inferred bonuses.
- [x] Page scan returns unverified candidates; local editor can correct all typed fields, save drafts, reject entries and explicitly confirm reviewed values.
- [x] Confirmation enforces existing strict lifepath, ship and random-table validators; talent entries remain reference-only until a source-supported mechanic is added in a later module.
- [x] Confirmed lifepath choices, ship classes and random tables are usable by existing game selection and mission controls. Unconfirmed/rejected/stale items remain inactive.
- [x] Atomic IndexedDB writes use the latest local document and cross-tab generation check; unrelated records and player-created content are preserved.
- [x] Source or schema revalidation preserves player edits and demotes invalidated records to needs-review, never silently trusting old rules.
- [x] Private PDF-inclusive backup/restore includes derived compiler data; normal campaign-only JSON/Markdown exports exclude it.
- [x] Source and distribution audits continue to reject shipped rulebook PDFs and generated private catalogs.
- [x] Unit and headless Chrome regression suite covers source mismatch, schema migration, ambiguous layouts, human confirmation, game consumers, backup restoration and phone-width review interface.

## Deferred to M7

- Actual Android and desktop user acceptance with the purchased 336-page book.
- Manual review of visual ergonomics on physical devices, performance and broader accessibility scenarios.
- Release candidate copyright/license and artifact inspection beyond the automated audit.

## Boundaries for M3 and later

M2 compiles **private user-verified data**. It does not claim an infallible PDF text/table parser and does not ship official data. M3 owns fully guided character/advancement workflows consuming this catalog; M4 owns deeper starship/crew flows. Genuine bugs or data-loss regressions in M2 remain fixable, but M2 has no planned feature backlog once this checklist and CI are green.
