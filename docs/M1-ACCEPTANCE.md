# M1 — Data Protection & Stability: acceptance gate

**Status:** Developer work verified by CI; real-device acceptance pending. **Do not mark 100% or begin M2** until the actual purchased source book and device tests pass.

**Test build:** v0.17.7; source and screenshots downloadable from the matching GitHub Actions run. This is an **untested preview**, not a public 1.0 release.

## What CI has already verified (noncommercial test source)

- Browser-local preparation of a generated 336-page PDF, local search, and source fingerprint.
- Whole-batch import rollback when a selected PDF is invalid or a DB insert fails.
- Mid-extraction cancellation, retry, offline parser, service-worker cache replacement.
- Data-only backup preserves private PDFs; PDF-inclusive backups restore index/source; corrupted source pairing is rejected before changes.
- Reattaching a matching source preserves compiled records; different source is rejected.
- Stale-tab campaign save conflicts, serialized rapid saves, restore barriers, generation guard against old imports after reset.
- Recovery draft download and re-import as a *new* campaign with no private PDF/index data.
- Mobile 390px overflow checks and screenshots, including the save-failure recovery controls.

## Owner acceptance — use privately owned 2026 book

1. [ ] **Android Chrome:** import the actual 336-page *Captain's Log* PDF as Core rulebook. Wait for preparation and open a few source pages/search results.
2. [ ] **Desktop Chrome or Firefox:** repeat the import, restart/reload the app, verify prepared data and a saved campaign persist.
3. [ ] Cancel a second preparation, then retry. Confirm previously stored book, bookmarks, character, and mission logs remain unchanged.
4. [ ] Export a campaign-only JSON backup and confirm it contains no imported book. Restore without losing the local prepared source.
5. [ ] Opt in to a **private PDF-inclusive backup**, restore in a separate browser profile, and verify source index, saved private options, bookmarks, and player records.
6. [ ] Switch offline after successful install and reload; open the library, start/resume a mission, record a task and verify the result survives reopening.
7. [ ] Reattach the same PDF and verify personal data persists. Attempt a different PDF and verify it is rejected instead of replacing the source.
8. [ ] If practical, edit the same campaign in two tabs and save from each. Verify the older tab refuses a stale overwrite and offers a downloadable recovery draft; import it as a separate campaign.
9. [ ] Inspect the Android and desktop layouts for unreachable controls, accidental horizontal scrolling, and misleading success/error messages.

**Report:** For each failure, note the item number, device/browser, what happened, and any screenshot or error. Do **not** upload or publish the commercial book, extracted text index, or full private backup in a public issue.

### Exit criteria

- All required steps pass or any exception has a documented justification and explicitly approved scope adjustment.
- No book content was included in public source/distribution/artifact outputs.
- User explicitly accepts M1 after testing. Only then record **M1 100%** and proceed to M2.
