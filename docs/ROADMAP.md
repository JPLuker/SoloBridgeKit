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

## Next: application quality

1. Resolve blocked browser end-to-end testing; verify navigation, lifepath workflow, storage, PDFs and scenes with actual Chromium/Android screenshots.
2. Validate the complete education and upbringing option-specific constraints, using the owner's private rulebook at runtime instead of reproducing copyrighted reference data publicly.
3. Build source-checked ship creation, crew roster and advancement.
4. Test IndexedDB export/import with a large PDF and interrupted storage operations on real browsers; improve rollback/undo for destructive actions.
5. Add PDF text search/bookmarks with private on-device indexing, and user-created random generators linked to the appropriate pages.
6. Continue solo mission play integration and optional self-hosted sync only after explicit approval.
7. Accessibility audits, offline upgrade tests, final copyright review, and versioned releases.

## Rejected and non-goals

- Publishing commercial PDFs, original book prose or copyrighted table contents in the public repository.
- AI-generated characters, dialogue, stories or artwork; the player's content is their own.
- Required accounts, third-party telemetry, runtime trackers and network services.

## Private source material

- 2026 edition corebook, supplemental and both blank-form PDFs were privately provided on 2026-11-11. Source files are excluded from source control and release archives.