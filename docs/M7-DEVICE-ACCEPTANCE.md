# M7 — One-pass private device acceptance

**Owner testing only — pending.** Use a build marked UNTESTED from a green CI run. Test with your own legally obtained 2026 source PDF and forms; never upload publisher PDFs, private indexes, screenshots of licensed pages or PDF-containing backups to GitHub.

Record the tested app version, OS/browser version, and PASS/FAIL for each scenario. Preserve a backup before any destructive checks.

## One consolidated playthrough
- [ ] Install/open the PWA on real Android Chrome and a desktop browser. Launch via the installed icon and open it offline.
- [ ] Privately import and locally prepare the 336-page corebook; confirm progress, search, source-page navigation, and stable storage use. Reopen the app after a tab/background switch.
- [ ] Import forms or a short supplement, prepare its local search index, and find the same phrase in multiple books with correct document/page/edition labels.
- [ ] Create and save a guided character, ship and crew record; review source citations privately. Restart browser and verify unchanged values.
- [ ] Complete a representative scene in each act, record a task, roll a private table, write a thread, correct/undo a scene edit, export a journal, and confirm the current scene after restarting offline.
- [ ] Export a campaign-only backup and confirm it excludes all source PDF bytes and compiled source text. Export a separate opt-in private book backup, restore it on another browser profile and confirm books, personal records and progress.
- [ ] Cancel/retry a large source preparation, reattach exactly the same PDF and reject a different PDF. Confirm no campaign or unrelated book was overwritten.
- [ ] Check keyboard-only navigation, visible focus, screen-reader headings/labels, Android virtual keyboard, screen safe areas, text enlargement and 200% desktop zoom. Report any cut-off controls or unusable PDF views.

## Report
Version/build: __________  Device/browser: __________

Outcome: PASS / FAIL / NOT TESTED

If anything fails, open/reopen an issue with the exact step, app version, visible error and reproduction. Keep copyrighted source pages and full-book backups private.

Do not sign off M7 based only on CI. A single complete private-device pass is the remaining acceptance gate before the owner can consider a public release.
