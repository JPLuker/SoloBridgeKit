# Testing

## Local automated results — v0.3.0

Run `npm run check && npm test`. Results: 38/38 unit tests passed, JavaScript syntax checks passed. The tests cover source-form models, 2d20 task resolution, valid/invalid lifepath allocations, final caps/totals, legacy scene tracker migration, scene count editing and loss prevention, Momentum/Threat resource transitions, basic backup schema checks and raw dice bounds.

## Focused user smoke test (once the browser UI can be tested)

1. Create a campaign and refresh; verify it remains.
2. Open Guided lifepath; save an incomplete step, switch tabs and return.
3. Complete seven steps (including two career events), apply, and confirm 56/16 totals on character sheet.
4. Create a mission; change Act One scene count, complete a scene and add notes.
5. Refresh, reopen the scene and verify that notes/completion persist.
6. Roll a task; spend Momentum/Threat and test one reroll when available.
7. Import a purchased PDF; open it at a lifepath source-page link.
8. Export a backup, restore it and verify the campaign and imported PDF.
9. Test without network after first load; verify offline shell runs.

## Not yet verified

- Browser UI rendering and click-through: Chromium reports `ERR_BLOCKED_BY_ADMINISTRATOR` for localhost/file/routed URLs in this execution environment, not proof the app works.
- Android hardware and narrow-screen overflow, native PDF page navigation, large commercial PDF quota failures and interrupted IndexedDB transactions.
- Accuracy of all option-specific lifepath bonuses for non-default species/upbringing/career events, ship rules, progression and combat; those features are not automated.
- Accessibility measurements and E2E tests in a supported browser are still required for a release.