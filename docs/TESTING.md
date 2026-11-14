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

## 0.14.0 browser test

- [ ] Headless Chrome smoke creates a synthetic PDF and completes its in-browser preparation without an external URL or runtime CDN.
- [ ] The prepared index is usable for search; character, mission and task rolls persist.
- [ ] Offline reload works when the service worker has cached the distributable.
- [ ] Screenshot captures are inspected at 390x844 and 1280x720 for clipping, contrast, and overlapping controls.
- [ ] Still obtain one actual Android and desktop hardware run before any tested release. Headless Chrome is not hardware verification.

## 0.14.1 phone overflow regression

- [ ] At 390px, the three scene-count fields and **Set scenes** control remain within the mission card.
- [ ] Browser smoke verifies document width at 390px and saves screenshots for inspection.

## 0.14.2 browser startup

- [ ] Headless Chrome launches reliably on ubuntu-latest, completes import and phone overflow assertion, then uploads screenshots.
- [ ] If startup fails again, inspect Chrome stderr and runner health before changing app code.

## 0.15.0 campaign journal export

- [ ] From Home, export a campaign journal; verify Markdown includes character, ship, crew, scenes, mission notes and task-roll history.
- [ ] Export a single episode from Captain's Log; ensure other episodes aren't included.
- [ ] Check exported Markdown contains no full PDFs, private page text, table entries or private compiled options. User-authored narrative is expected.
- [ ] Filenames are safe; generated journals open in standard Markdown/text editors.
- [ ] Keep JSON backups as the supported editable restore format.

## 0.15.1 save/navigation regression

- [ ] Save a character, immediately switch to Captain's Log, enter a mission title, and confirm the field is never cleared by the completed save.
- [ ] Browser smoke confirms completion messages and mission title retention before starting the mission.

## 0.16.0 browser export checks

- [ ] Browser CI downloads one episode and one full campaign Markdown file; both include player-created records and omit synthetic private-book page text.
- [ ] Browser CI downloads the default JSON backup; it contains the campaign and `documents:[]`, without any PDF/compiled book data.
- [ ] The same run completes the existing offline reload and mobile/desktop viewport assertions.

## v0.16.1 planning-only update

- Last verified implementation baseline: v0.16.0, 87 passing unit tests and successful headless Chrome smoke and distribution audit (run 43233606270).
- No new user-facing functions were added in this planning commit. Future milestone verification criteria are tracked in [ACTIVE_ROADMAP.md](ACTIVE_ROADMAP.md).
- Real Android/desktop hardware acceptance and full private-book 336-page import remain unverified; do not mark them complete merely because CI is green.

## v0.17.0 M1 regression coverage

- Unit: importing valid PDFs stages records, malformed batch aborts before commit, cancellation, approximate quota preflight, storage error guidance.
- Browser: prepared corebook remains intact when second PDF is malformed; no partial commit.
- **Open:** full private backup/restore, quota errors during transaction, interrupted extraction at 336 pages and offline update.

## v0.17.1 Chrome restore regressions

- [ ] Duplicate document ID on second write: transaction rolls back first attempted document too.
- [ ] Default backup restore retains already installed private documents and compiled data.
- [ ] Full private backup restores both campaign state and source PDF/index.
- [ ] Full private backup with modified source fingerprint rejects before mutating IndexedDB.
- All automated tests run with generated synthetic PDFs; actual 2026 owner PDF remains an outstanding private acceptance test.

## v0.17.2 source replacement tests

- [ ] Reattach the same source file: the ID and private index remain valid.
- [ ] Attempt to reattach a different PDF/edition: reject it, leave the current book and campaign intact, allow separately importing the new edition.
- [ ] Recover a missing blob from a valid existing PDF fingerprint without losing bookmarks.

## v0.17.3 synthetic full-length and offline tests

- [ ] In headless Chrome, generate a 336-page noncommercial PDF; prepare a corebook successfully and search it.
- [ ] Abort at the sixteenth extracted page: no partial index or campaign mutation. Retry succeeds.
- [ ] Re-register the service worker with a legacy cache; obsolete cache is removed without losing campaigns.
- [ ] With network disabled, the bundled parser prepares a new private index from the saved source.
- [ ] Final physical Android and desktop test must use the owner's private real PDF; it is not a CI fixture.

## v0.17.4 concurrent data integrity

- [ ] Browser test: two independent copies of a campaign with the same initial revision; the second stale save is refused, not silently committed.
- [ ] Two rapid saves in one tab serialize and leave the latest state with two revision increments.
- [ ] Database restore waits for pending queued writes and rejects new saves while destructive replacement runs.
- [ ] Database connection can close on simulated versionchange and be reopened without losing existing records.
- [ ] Real cross-tab/physical-device verification still required before marking M1 complete.

## v0.17.5 interrupted import following reset

- [ ] Prepare a PDF using a pre-restore database generation. Restore a backup, then attempt the old import: no stale document is inserted.
- [ ] Reattach/update an old document with a pre-restore generation: refuse without changing the latest document.
- [ ] During a long extraction, independently modify bookmarks: final patch must preserve latest unrelated document fields.
- [ ] Physical-device verification on Android and desktop still needed before 100% M1.

## v0.17.6 unsaved-save recovery

- [ ] Cause a stale-tab save conflict in Chrome; banner offers to download unsaved draft without clearing typed text.
- [ ] Recovery JSON includes the user's unsaved notes but no source-book text, private index, tables, or PDFs.
- [ ] Import the recovery draft in Settings; a new campaign exists and the newer original campaign remains unchanged.
- [ ] On real Android and desktop browsers, verify the banner remains reachable at normal and 200% zoom.

### Final M1 owner acceptance (still required)

- [ ] Import the actual lawfully obtained 336-page 2026 PDF on physical Android and desktop, verify progress and source matching.
- [ ] Cancel/retry a long preparation; existing campaign and book still intact.
- [ ] Export a data-only backup, optionally a private PDF-inclusive backup, and successfully restore the intended data.
- [ ] Reload with network disabled, inspect corebook search and resume a mission; confirm no missing saves or unexpected prompts.
- [ ] Validate source reattachment with the same PDF and refusal of a different book/edition.
