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
