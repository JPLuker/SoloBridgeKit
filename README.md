# SoloBridgeKit

Offline-first solo tabletop roleplaying companion. The long-term goal is a D&D Beyond-like experience for **Star Trek Adventures: Captain's Log**: guided character creation, interactive sheets, ship and crew management, a mission workspace, integrated dice, and searchable reference books.

This repository contains the **application**, not the commercial rulebooks. Bring your own legally obtained PDFs. SoloBridgeKit is an independent, unofficial fan utility and is not affiliated with the publisher or rights holders.

## Current build: 0.3.0

- Multiple local campaigns with a resume action.
- Character and starship sheets with the actual fields present in the provided Captain's Log blank forms v1.2 (attributes, disciplines, systems, departments, traits, focuses and career fields). Numeric ratings are manually entered, not invented.
- Three-act missions with configurable per-act scene counts, individually editable scene titles/notes/completion, status, timestamped entries, value markers, development and Act One–Three/closing logs. Older 15-step counters migrate.
- Task rolls using the verified 2026 Captain's Log 2d20 resolution, source-backed resource spending (Momentum advantage/removing Threat, reroll one die; Threat complication or next-task difficulty), Focus advantages and cryptographically generated raw d6/d20 dice rolls.
- Guided seven-step character lifepath with draft saves, source-book page links, numeric validation, final caps and explicit apply-to-sheet. Individual option bonuses must be cross-checked against the personal PDF.
- Private PDF import into local IndexedDB with browser-native PDF reader and page-link support.
- Full JSON backup and restore including the imported PDF bytes.
- Offline service-worker shell cache, responsive desktop/mobile layouts, no account.

The app is an **in-progress foundation**, not the complete publisher game. Core task mechanics and lifepath point budgets have been checked against the privately provided 2026 rulebook. Specific species/upbringing/career-event bonuses, publisher tables, ship creation, full combat and advancement are not automated.

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

There is no remote API, automatic update request, or third-party integration in 0.3.0. A future opt-in self-hosted sync service is only a roadmap proposal.

## Project documents

Read [AGENTS.md](AGENTS.md) first and follow the [internal design guidelines](https://github.com/JPLuker/InternalDesignGuidelines). Planning lives under `docs/`. Open GitHub Issues are the ongoing handoff once work begins.

## Copyright and license

No commercial book text, publisher artwork or licensed tables are bundled in source control. The user supplies their own files for private local reference. **Code license not yet chosen.** Do not assume MIT or any other license until the maintainer decides.