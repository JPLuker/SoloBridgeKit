# Testing

## Local automated results — v0.6.0

Run `npm run check && npm test`. Results: 59/59 unit tests passed, JavaScript syntax checks passed. The tests cover source-form models, 2d20 task resolution, valid/invalid lifepath allocations, final caps/totals, legacy scene tracker migration, scene count editing and loss prevention, Momentum/Threat resource transitions, backup schema checks, ship/station builder validations, crew record compatibility, PDF bookmarks, old backup compatibility, bookmark validation, persistent task history, reroll amendment, legacy history normalization, and raw dice bounds.

## Focused user smoke test (once the browser UI can be tested)

1. Create a campaign and refresh; verify it remains.
2. Open Guided lifepath; save an incomplete step, switch tabs and return.
3. Complete seven steps (including two career events), apply, and confirm 56/16 totals on character sheet.
4. Create a mission; change Act One scene count, complete a scene and add notes.
5. Refresh, reopen the scene and verify that notes/completion persist.
6. Roll a task; spend Momentum/Threat and test one reroll when available. Refresh and check the original/updated dice in mission roll history.
7. Build a ship from owner-entered class stats; verify a station gets a smaller talent allowance. Add and edit a crew member.
8. Import a purchased PDF; create a named bookmark, reopen the bookmarked page and jump to another page.
9. Export a backup, restore it and verify the campaign, imported PDF and bookmarks.
10. Test without network after first load; verify offline shell runs.

## Not yet verified

- Browser UI rendering and click-through: Chromium reports `ERR_BLOCKED_BY_ADMINISTRATOR` for localhost/file/routed URLs in this execution environment, not proof the app works.
- Android hardware and narrow-screen overflow, native PDF page navigation, large commercial PDF quota failures and interrupted IndexedDB transactions.
- Accuracy of all option-specific lifepath bonuses for non-default species/upbringing/career events, option-specific ship class data, progression and combat; those features are not automated.
- Accessibility measurements and E2E tests in a supported browser are still required for a release.
## v0.7.0 book-content test plan

- [ ] Fresh profile with no files shows **Core rulebook required**. Library and Settings work; game-dependent pages cannot play.
- [ ] Import forms as **Forms**: game remains gated. Import a corebook as **Core rulebook**: gameplay unlocks.
- [ ] An older, unclassified PDF can be explicitly designated or unmarked without losing its bytes/bookmarks.
- [ ] Default JSON export contains `documents: []`; checking private PDF backup includes original PDFs. Both restore successfully, as do pre-0.7 backups.
- [ ] No commercial PDFs, extracted book prose, tables, stat blocks or licensed art in code, static deploy, service-worker shell or public release artifacts.
- [ ] `npm run check` and `npm test` pass, followed by real-browser import/export checks.

## v0.7.1 focused test

- [ ] Importing a PDF with the default **Other reference** type does not unlock gameplay until designated **Core rulebook**.
- [ ] Restoring a data-only backup preserves already imported PDFs and their page bookmarks on that device.
- [ ] Restoring a PDF-inclusive backup explicitly replaces the local documents and warns first.

## 0.8.0 source dependency test plan

- [ ] Launch with no PDF: only Home setup prompt, Library and Settings work. No character, missions, crew or dice UI.
- [ ] Import an unrelated PDF and mark it Core rulebook: still locked.
- [ ] Generate private index with `node scripts/prepare-corebook.mjs`, import index for matching PDF: gameplay unlocks and local full-text search returns page references.
- [ ] Try to import an index for a different PDF: fingerprint mismatch rejects it and preserves existing data.
- [ ] Reload offline: prepared state and search still work from IndexedDB. Removing the corebook locks gameplay again without deleting campaign saves.
- [ ] Export default backup: no PDF or book-derived text. Export opt-in private backup: includes PDF and index. Restore both in a separate browser profile.
- [ ] Place a generated `.solobridge-book.json` file in source checkout: public-source audit fails.
- [ ] Review the public deploy bundle for publisher text, images, random tables and assets. Do not treat a green test run as proof of copyright compliance.

## 0.8.1 restore integrity

- [ ] A private backup containing a mismatched PDF/index is rejected before any local campaign or PDF is replaced. A valid private backup restores.

## 0.9.0 single-file corebook preparation

- [ ] Import one legally obtained corebook PDF as **Core rulebook**; verify page progress, compilation, local search and gameplay unlock.
- [ ] Use a form or unrelated PDF as **Core rulebook**; validator rejects it without enabling game screens.
- [ ] Cancel midway through a large book; no partial prepared corebook or campaign data loss.
- [ ] With cached PWA disconnected from internet, prepare a new private PDF and search it.
- [ ] On Android Chrome and desktop Chromium/Firefox, verify PDF worker, scroll, extraction, native reader, 200% zoom and safe areas.
- [ ] `npm run build && npm run audit:dist` completes; archive/manifest contain no private PDFs or exported game-data indexes.

## 0.10.0 user smoke testing (private table system)

- [ ] From a prepared book, choose a page with a numbered table, click **Find rows on page**, and inspect candidate numbering and text.
- [ ] Repair a deliberately imperfect extraction, save a table with 1–6 contiguous ranges, and verify it persists after a reload.
- [ ] Roll the table multiple times. Confirm the displayed entry corresponds to the rolled number and source page.
- [ ] With an active mission, record a table roll; the mission log must contain only title/page/number, not publisher table text.
- [ ] Export a campaign-only backup: no private tables or indexed page text. Opt in to private PDF backup: table data is included and restores with the matching PDF.
- [ ] Try duplicate or overlapping ranges, missing values, and wrong-book table data; all must fail without writing data.

## 0.11.0 private character choices

- [ ] Complete a valid species/environment/education or career-event stage and save it as a private choice.
- [ ] In another campaign, apply a saved choice and verify all bonuses, focuses, values and source references were copied correctly.
- [ ] Confirm that applying a saved choice over an edited draft requests approval.
- [ ] Verify an event-1 choice can be used in event 2 but cannot be used in a species step.
- [ ] Delete a private choice; existing characters remain unchanged.
- [ ] Private PDF backup contains the choice; default campaign backup does not.

## 0.12.0 private ship templates

- [ ] Save valid published class statistics, including all six systems and six departments, as a private template.
- [ ] Apply it to a second ship; verify identical ratings and scale, but keep that ship's name, registry, traits and talents.
- [ ] Reject invalid scales, ratings outside allowed ranges, wrong-source templates and duplicate IDs.
- [ ] Delete a template; already-created starships retain their data.
- [ ] Validate private PDF backup includes class templates, default campaign-only export does not.

## 0.13.0 in-mission actions

- [ ] Start a mission, roll a task on the Captain's Log screen and compare saved result, Momentum/Threat, and history with the separate Dice screen.
- [ ] Use a source-derived private table from the mission scene; ensure roll and page reference display correctly and the mission log records only title/page/number.
- [ ] Reroll from the Dice screen after a mission-screen task, when Momentum is available, and verify history preserves original results.
- [ ] Reload the campaign and verify mission task history remains unchanged.
