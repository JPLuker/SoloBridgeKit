# SoloBridgeKit

Offline-first solo tabletop roleplaying companion. The long-term goal is a D&D Beyond-like experience for **Star Trek Adventures: Captain's Log**: guided character creation, interactive sheets, ship and crew management, a mission workspace, integrated dice, and searchable reference books.

This repository contains the **application**, not the commercial rulebooks. Bring your own legally obtained PDFs. SoloBridgeKit is an independent, unofficial fan utility and is not affiliated with the publisher or rights holders.

## Current build: 0.9.0

- Multiple local campaigns with a resume action.
- Character and starship sheets based on the Captain's Log v1.2 forms, plus editable crew roster records. Numeric ratings are entered by the owner, not invented.
- Three-act missions with configurable per-act scene counts, individually editable scene titles/notes/completion, status, timestamped entries, saved task-roll history, value markers, development and Act One–Three/closing logs. Older 15-step counters migrate.
- Task rolls using the verified 2026 Captain's Log 2d20 resolution, source-backed resource spending (Momentum advantage/removing Threat, reroll one die; Threat complication or next-task difficulty), Focus advantages and cryptographically generated raw d6/d20 dice rolls. Mission task rolls are saved, and a reroll updates the existing record without losing the original dice.
- Guided seven-step character lifepath with draft saves, source-book page links, numeric validation, final caps and explicit apply-to-sheet. Individual option bonuses must be cross-checked against the personal PDF.
- Guided starship/station creation: choose the era, class, published ratings, traits, scale-based talents and identity. Stations support the smaller talent allowance. No class data or licensed talents are bundled.
- Private PDF import into local IndexedDB with browser-native PDF reader, source-page links, manual page jumping, player-created bookmarks and locally prepared page-text search.
- JSON backup and restore for campaigns; imported PDF bytes and bookmarks are included only in explicitly selected private backups.
- Offline service-worker shell cache, responsive desktop/mobile layouts, no account.

The app is an **in-progress foundation**, not the complete publisher game. Core task mechanics and lifepath point budgets have been checked against the privately provided 2026 rulebook. Specific species/upbringing/career-event bonuses, publisher starship stat blocks, table contents, full combat and advancement are not automated.

## Run

A secure browser origin is needed for service workers; `localhost` qualifies.

```sh
npm install --ignore-scripts --no-audit --no-fund
npm start
```

Open `http://localhost:4173`. Node.js 22+ is needed to build/run the self-contained development distribution. End users of the packaged PWA do not need Node or Poppler. Run tests: Tests:

```sh
npm run check
npm test
```

**Storage:** IndexedDB under the browser profile for the exact origin. It is separate on each device/browser. Imported PDFs stay in that browser. Export a backup before clearing site data. JSON backup files are unencrypted and may include copyrighted PDFs; do not post them publicly.

## Privacy

No telemetry, no accounts required, no advertising, no third-party scripts or fonts. Nothing is sold or shared. Imported PDFs, campaigns, logs and backups remain on the device unless the user explicitly exports them.

### Network connections

| Host | When | What's sent |
|---|---|---|
| Local web origin | On application load and when uncached assets need loading | Requests for static application files only |

There is no remote API, automatic update request, or third-party integration in 0.8.0. A future opt-in self-hosted sync service is only a roadmap proposal.

## Project documents

Read [AGENTS.md](AGENTS.md) first and follow the [internal design guidelines](https://github.com/JPLuker/InternalDesignGuidelines). Planning lives under `docs/`. Open GitHub Issues are the ongoing handoff once work begins.

## Copyright and license

No commercial book text, publisher artwork or licensed tables are bundled in source control. The user supplies their own files for private local reference. **Code license not yet chosen.** Do not assume MIT or any other license until the maintainer decides.
## Bring your own rulebook

SoloBridgeKit distributes **no publisher PDFs, extracted books, licensed random tables, starship stat blocks or official artwork**. Import your legally obtained corebook PDF in **Library** and select **Core rulebook**. Game-dependent pages require a locally imported document explicitly designated as the corebook. The designation is not proof of ownership or DRM. Previously imported PDFs remain intact and can be designated without reimporting.

Imported PDFs stay in the browser's local IndexedDB; the app does not upload them to the developer. The offline service worker caches only application assets. JSON backups exclude PDF bytes by default. The checkbox **Include imported PDFs (private backup only)** is for personal migration; never publish those backups. When restoring a data-only backup, import your own book again.

`npm run check` runs `scripts/audit-public-bundle.mjs` to reject PDF/ebook/archive assets in public source. Automated checks are not a substitute for manual copyright review of every release.

## Source-dependent setup (0.8.0)

**SoloBridgeKit ships an unplayable application shell.** Importing a PDF alone no longer unlocks play. The user must also generate a searchable private rules index from the book. Its SHA-256 fingerprint must match the imported PDF. The game screens stay locked unless that matched index is stored locally.

**In-app preparation is now available.** Choose **Core rulebook** before selecting your PDF in Library. SoloBridgeKit extracts the book locally, shows page-by-page progress, builds a private index, checks its contents and activates gameplay. A packaged PWA includes its own local copy of PDF.js; the runtime makes no external CDN requests. The CLI workflow below remains as a fallback. On a Linux machine:

```bash
sudo apt install poppler-utils -y
node scripts/prepare-corebook.mjs "/path/to/your Captain's Log corebook.pdf"
```

The second command creates a `.solobridge-book.json` file alongside the PDF. Do not publish this file; it contains extracted text from your privately owned book. On Windows/macOS, install Poppler (`pdftotext` and `pdfinfo` on `PATH`), then use the same Node command.

1. Open **Library**, choose **Core rulebook**, then select your legally obtained PDF. Preparation runs entirely in your browser.
2. Once preparation completes, gameplay unlocks and **Search your prepared corebook** is available.
3. You can also import a previously generated private `.solobridge-book.json` index or prepare an existing library PDF with **Prepare as corebook**.

This is an honest data dependency, **not DRM or a license check**. It doesn't prove ownership, and it doesn't prevent a technically skilled person from modifying their local application. No third-party service is contacted during preparation or import.

The generated rules index is only created and stored by the user. Campaign-only backups exclude the PDF **and its extracted index**. Opt-in private PDF backups include both so the same browser database can be restored elsewhere. The source audit rejects `.solobridge-book.json` output inside a public checkout.

**Remaining limitations:** Browser-import stability on Android and large PDFs requires real-device validation. This is searchable source data, not yet a complete structured rules/table compiler. This application is not an ownership-verification or anti-piracy system.

## Distribution build

Run `npm install --ignore-scripts --no-audit --no-fund && npm run build && npm run audit:dist`. This creates the complete static, offline-capable site in `dist/`, including local open-source PDF.js and fonts/character maps. No user's books or extracted rulebook indexes enter this directory. `npm start` serves the generated build at `http://localhost:4173`.

GitHub Actions checks the code and uploads a clearly labeled **UNTESTED** `dist/` preview artifact. Do not call that artifact a tested release until the exact build has run on actual browser devices.
