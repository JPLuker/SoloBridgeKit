# SoloBridgeKit

Offline-first solo tabletop roleplaying companion. The long-term goal is a D&D Beyond-like experience for **Star Trek Adventures: Captain's Log**: guided character creation, interactive sheets, ship and crew management, a mission workspace, integrated dice, and searchable reference books.

This repository contains the **application**, not the commercial rulebooks. Bring your own legally obtained PDFs. SoloBridgeKit is an independent, unofficial fan utility and is not affiliated with the publisher or rights holders.

## Current build: 0.7.0

- Multiple local campaigns with a resume action.
- Character and starship sheets based on the Captain's Log v1.2 forms, plus editable crew roster records. Numeric ratings are entered by the owner, not invented.
- Three-act missions with configurable per-act scene counts, individually editable scene titles/notes/completion, status, timestamped entries, saved task-roll history, value markers, development and Act One–Three/closing logs. Older 15-step counters migrate.
- Task rolls using the verified 2026 Captain's Log 2d20 resolution, source-backed resource spending (Momentum advantage/removing Threat, reroll one die; Threat complication or next-task difficulty), Focus advantages and cryptographically generated raw d6/d20 dice rolls. Mission task rolls are saved, and a reroll updates the existing record without losing the original dice.
- Guided seven-step character lifepath with draft saves, source-book page links, numeric validation, final caps and explicit apply-to-sheet. Individual option bonuses must be cross-checked against the personal PDF.
- Guided starship/station creation: choose the era, class, published ratings, traits, scale-based talents and identity. Stations support the smaller talent allowance. No class data or licensed talents are bundled.
- Private PDF import into local IndexedDB with browser-native PDF reader, source-page links, manual page jumping, and player-created page bookmarks.
- JSON backup and restore for campaigns; imported PDF bytes and bookmarks are included only in explicitly selected private backups.
- Offline service-worker shell cache, responsive desktop/mobile layouts, no account.

The app is an **in-progress foundation**, not the complete publisher game. Core task mechanics and lifepath point budgets have been checked against the privately provided 2026 rulebook. Specific species/upbringing/career-event bonuses, publisher starship stat blocks, table contents, full combat and advancement are not automated.

## Run

A secure browser origin is needed for service workers; `localhost` qualifies.

```sh
python3 -m http.server 4173
```

Open `http://localhost:4173`. No dependencies or compilation step. Tests:

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

There is no remote API, automatic update request, or third-party integration in 0.7.0. A future opt-in self-hosted sync service is only a roadmap proposal.

## Project documents

Read [AGENTS.md](AGENTS.md) first and follow the [internal design guidelines](https://github.com/JPLuker/InternalDesignGuidelines). Planning lives under `docs/`. Open GitHub Issues are the ongoing handoff once work begins.

## Copyright and license

No commercial book text, publisher artwork or licensed tables are bundled in source control. The user supplies their own files for private local reference. **Code license not yet chosen.** Do not assume MIT or any other license until the maintainer decides.
## Bring your own rulebook

SoloBridgeKit distributes **no publisher PDFs, extracted books, licensed random tables, starship stat blocks or official artwork**. Import your legally obtained corebook PDF in **Library** and select **Core rulebook**. Game-dependent pages require a locally imported document explicitly designated as the corebook. The designation is not proof of ownership or DRM. Previously imported PDFs remain intact and can be designated without reimporting.

Imported PDFs stay in the browser's local IndexedDB; the app does not upload them to the developer. The offline service worker caches only application assets. JSON backups exclude PDF bytes by default. The checkbox **Include imported PDFs (private backup only)** is for personal migration; never publish those backups. When restoring a data-only backup, import your own book again.

`npm run check` runs `scripts/audit-public-bundle.mjs` to reject PDF/ebook/archive assets in public source. Automated checks are not a substitute for manual copyright review of every release.
