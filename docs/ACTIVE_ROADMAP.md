# SoloBridgeKit — Active Development Roadmap

**Updated:** 2026-11-13  
**Baseline:** v0.16.0 on `main`; 87 unit tests and headless Chrome smoke passing at last verified CI.  
**Status:** Active development, not a tested public release and not maintenance mode.

This is the **ordered forward plan**. [ROADMAP.md](ROADMAP.md) retains shipped-version history and previous commitments. `AGENTS.md`, `DECISIONS.md`, and `NO_LIST.md` override proposals in this file. Future version numbers are not reserved or automatically authorized.

## Product target

A D&D Beyond-like, offline-first companion for *Star Trek Adventures: Captain's Log* with guided character and ship creation, rules-backed actions, integrated solo mission play, local reference search, campaign journaling, and player-owned saves.

The public software **must not include publisher PDFs, book prose, proprietary tables, stat blocks, or artwork**. Players import their own legally obtained sources. All licensed extracted content and compiled options stay private in local storage. The imported book and its prepared index are real gameplay dependencies, but this is not DRM or ownership verification.

## Confirmed existing foundation (v0.16.0)

- Offline static PWA; private PDF.js preparation, source fingerprint validation and local book search.
- User-reviewed private random tables, lifepath-stage presets and ship-class templates.
- Seven-step lifepath editor; ship builder; character and crew records; source-linked PDF pages.
- Three-act scene tracker, task rolls, Momentum/Threat, dice history and player-authored Markdown exports.
- Data-only backups by default; opt-in private PDF-containing backups, content audits.
- Headless Chrome tests for import, search, player workflows, downloads, offline reload and 390px overflow.
- **Not verified:** physical Android/desktop behavior with the actual 336-page 2026 book, all licensed options, large-file recovery, accessibility acceptance.

## Developer build queue — in order

### M1. Data safety and preparation resilience — FIRST

**Development completion: 100% (v0.18.0).** Per owner direction on 2026-11-13, physical-device acceptance is deferred to M7, and no longer counts against M1 coding completion. M1 implementation is closed for planned work; regressions/data-loss defects remain exceptions.

**Build**
- Make PDF import/preparation atomic: interrupted, cancelled or failed preparation never discards an existing prepared book or user campaign.
- Validate storage quota and free space before large imports; actionable errors for storage denied, unavailable or full.
- Exercise private PDF-inclusive backup and restore in headless Chrome, including SHA mismatch, bad index, duplicate docs and failed restore rollback.
- Verify source attachment loss, book replacement and reimport preserve unrelated campaigns and documents; never silently migrate incompatible editions.
- Add browser regression tests for repeated import, rapid navigation, offline preparation, upgrade and save recovery.

**Complete when**
- A synthetic full-sized import can be cancelled/retried without lost campaign state or dangling private index.
- Data-only export stays free of all book-derived content; full private restore preserves intended user data and checks source integrity.
- CI exercises destructive/failure paths, not just successful imports.

### M2. Private game-data compiler

**Development completion: 100% — VERIFIED (v0.19.3).** All 111 unit tests passed, synthetic full-length Chrome smoke passed, and the distribution audit passed in [GitHub Actions run 43540777249](https://github.com/JPLuker/SoloBridgeKit/actions/runs/43540777249). Versioned private schemas, candidate extraction, typed review, explicit confirmation/rejection, game consumer integration, safe revalidation, database writes and private-backup round-trip are implemented. [M2 development acceptance](M2-DEVELOPMENT-ACCEPTANCE.md) is closed. Device acceptance remains M7. **Next: M3 guided character creation.**

**Build**
- Add private, versioned structured schemas for lifepath choices, talents, class records and random tables with `sourcePdfSha256`, source page, data type, extraction/confirmation state and schema version.
- Extract candidates from the **user's** locally indexed pages; never ship extracted tables or prepopulated official catalogs.
- Show a local confirmation editor for ambiguous text, ranges, bonus allocations and table rows. Reject incomplete or contradictory data.
- Support recompile/revalidate after an import or schema update without destroying player-confirmed content.
- Extend synthetic fixtures to cover malformed layouts, two-column tables, headings, and option constraints.

**Complete when**
- Confirmed structured data is reusable in other app features without manually retyping values.
- The public `dist/` contains only generic extractor/parser logic; no licensed data.
- Each record can open its source page and can be invalidated or corrected locally.

### M3. D&D Beyond-style character creation and progression

**Development completion: 100% — VERIFIED (v0.20.2).** All 124 unit tests, full synthetic-book Chrome smoke, source and distribution audits passed in [GitHub Actions run 43600347014](https://github.com/JPLuker/SoloBridgeKit/actions/runs/43600347014). Guided character creation, source-bound stage checks, career events, milestone/Focus/Value/condition history, backup validation and source-change safety are complete for the agreed build scope. [M3 acceptance checklist](M3-DEVELOPMENT-ACCEPTANCE.md) is closed. Device acceptance remains M7. **Next: M4.**

**Build**
- Drive the seven-step lifepath choices from validated private records, including the two career events, rather than merely offering free-text fields.
- Apply only source-verified bonuses and restrictions, enforce stage/final caps, and show where each value came from.
- Preserve incomplete drafts and existing characters when choices are replaced or sources disappear.
- Add source-checked career/character advancement, values changes and injury/other ongoing status as supported by the 2026 book.

**Complete when**
- A new character can be created end-to-end through guided selections using a prepared private book.
- Invalid allocations are blocked with a specific reason; sheet and original source references agree.
- A legacy character and an interrupted draft survive migration and reload.

### M4. Starship, station and crew management

**Development progress: 30% (v0.21.0, pending CI).** Confirmed private class selections now bind the source ID/SHA/page to a ship draft, preserving player identity and customizations. Remaining: crew statistics/assignments/relationships and source-grounded vessel/crew advancement, final regression and module acceptance.

**Build**
- Drive class and talent selection from the confirmed private source catalog, with source-validated ratings/limits.
- Keep ship identity and player customizations separate from class-template data.
- Expand crew into useful per-officer statistics, assignments and relationships, subject to actual source mechanics.
- Add source-verified ship and crew advancement or status changes only where rules support them.

**Complete when**
- A ship/station can be created without retyping confirmed class data.
- Every generated rating traces back to an imported source; no imaginary rules are applied.
- Existing ships and crew remain editable after reimport, restoration and source updates.

### M5. Integrated solo mission player

**Build**
- Use one active-scene workspace for roll outcomes, Momentum/Threat, available private random tables, notes, status and source references.
- Preserve and resume the exact active mission, act and scene; track decisions, unresolved threads, values used and the closing log.
- Make source-derived rolls attach page and result identifiers to mission history **without copying publisher table prose** into default campaign exports.
- Provide readable player-authored journals and useful corrections/undo for accidental changes.

**Complete when**
- A complete three-act solo episode can be played and journaled in-app, with the book available in context.
- Reload/offline/restart does not lose scene progress or misattribute roll history.
- Journal exports contain the player's writing and mechanical references, not the private book database.

### M6. Multi-book and library quality

**Build**
- Support source roles/versions for corebook, supplements and forms; identify conflicting or missing rule dependencies.
- Allow private search across imported books with exact book/page provenance.
- Migrate compiled data safely as the app's schema evolves; permit removing one book without corrupting unrelated campaigns or content.
- Provide clear per-book preparation status and repair/rebuild actions.

**Complete when**
- A supplement can coexist with the original corebook while every option/table points to the right book.
- Replacing, removing, repairing or updating one document is predictable, reversible where possible and test-covered.

### M7. UX, accessibility and actual-device verification

**Build**
- Test keyboard-only operation, focus visibility, accessibility labels, contrast, large text/200% zoom and screen readers.
- Verify the interface at 360px, 390px, tablet and desktop, including virtual keyboards, notch/safe areas and mobile PDF reader.
- Exercise the **actual** legally obtained 336-page book on Android Chrome and desktop browsers; track extraction time, IndexedDB quota and crash/recovery behavior without publishing its content.
- Test install/update/offline/PWA paths, and keep one focused user playtest request per milestone.
- Fix usability bugs. **No unapproved theme redesign or AI-generated artwork.**

**Complete when**
- Automated accessibility/layout gates pass and the designated real-device checklist is signed off.
- Book import, character creation, mission play, backup and restore work in a real install rather than only headless Chrome.

### M8. Release candidate and public-readiness gate

**Build**
- Audit source, `dist/`, cache, workflow artifacts, source maps, screenshots, fixtures and releases for licensed book material.
- Verify third-party licenses, dependencies, release provenance, checksums, stable upgrade, safe backups and user-facing error states.
- Freeze scope for a candidate, fix release-blocking issues, document known limitations and distinguish untested previews from tested releases.
- Choose a code license and visual identity through the owner's approval; optional self-hosted synchronization is a separate post-core decision.

**Complete when**
- All supported book-dependent flows are usable with the user's own PDF, without publisher content in public distributions.
- No known data-loss or game-blocking issues; relevant CI and real-device acceptance tests pass.
- **Do not declare 1.0 or maintenance mode without explicit owner approval.**

## Blockers / decisions reserved for the owner

- **Visual identity:** keep the present design until a specific style is approved; optional LCARS direction remains a proposal.
- **Public code license:** do not assume MIT, GPL or any other license.
- **Optional cross-device sync:** proposal only; privacy/security design and hosting need explicit approval.
- **Real-device acceptance:** owner tests actual 2026 PDFs and gameplay privately; developers use synthetic, non-copyright fixtures in CI.
- **Release milestone:** the owner approves official 1.0 or maintenance status.

## Always-on acceptance requirements

1. User-owned imported source data is required; no bundled book, official art, narrative text or proprietary tables.
2. No AI-generated lore, character art, mission dialogue, or player story content.
3. Local-first, no mandatory accounts, third-party telemetry, remote PDF upload or runtime CDN.
4. Existing saves and drafts protected; use explicit confirmation for destructive operations, test rollback and migrations.
5. Run syntax/unit/browser and public distribution audits; green CI means ready for a milestone playtest, not hardware verified.
6. Every completed change updates `CHANGELOG.md`, `HANDOFF.md`, historic `ROADMAP.md`, relevant tests, and issues in the same commit.
7. Follow [InternalDesignGuidelines](https://github.com/JPLuker/InternalDesignGuidelines); project decisions override optional conventions.
