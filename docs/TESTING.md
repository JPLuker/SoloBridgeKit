# Testing

## Automated baseline

Run `npm run check && npm test`. Eight model tests now cover campaign and mission construction, source-form fields, sparse-save compatibility, manual tracking, raw dice boundaries and backup schema checks.

## User-facing smoke test (current build)

1. Create a campaign, then switch tabs and return.
2. Save a character and starship, refresh browser, verify persistence.
3. Start a mission, add an entry, refresh and confirm it remains.
4. Roll 2d20, confirm two individual die results and total.
5. Import a real PDF and open it in Library.
6. Export everything, restore it and verify campaigns and PDF remain available.

## Not tested yet

- Real-device Android or iOS browser.
- Large commercial rulebook PDFs and browser quota failures.
- Cross-browser native PDF reader reliability.
- Offline mode on a real device after service worker install.
- User playtest against rulebook rules (no mechanics implemented yet).

- Browser UI rendering could not be completed in this environment: Chromium navigation returned ERR_BLOCKED_BY_ADMINISTRATOR for localhost, file and routed URLs. This is an environment limitation, not evidence that the UI works. Real browser smoke test required before a release.
