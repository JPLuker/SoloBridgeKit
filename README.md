# SoloBridgeKit

Offline-first solo tabletop roleplaying companion. The long-term goal is a D&D Beyond-like experience for **Star Trek Adventures: Captain's Log**: guided character creation, interactive sheets, ship and crew management, a mission workspace, integrated dice, and searchable reference books.

This repository contains the **application**, not the commercial rulebooks. Bring your own legally obtained PDFs. SoloBridgeKit is an independent, unofficial fan utility and is not affiliated with the publisher or rights holders.

## Current build: 0.2.0

- Multiple local campaigns with a resume action.
- Character and starship sheets with the actual fields present in the provided Captain's Log blank forms v1.2 (attributes, disciplines, systems, departments, traits, focuses and career fields). Numeric ratings are manually entered, not invented.
- Missions with status, timestamped entries, manual 15-step tracker, values markers, development, and Act One–Three/closing logs.
- Task rolls using the verified 2026 Captain's Log 2d20 resolution (target number, difficulty, Momentum, Threat, and focus-triggered advantages), plus raw cryptographically generated d6 and d20 dice rolls.
- Private PDF import into local IndexedDB with the browser's PDF reader.
- Full JSON backup and restore including the imported PDF bytes.
- Offline service-worker shell cache, responsive desktop/mobile layouts, no account.

The app is currently a **foundation**, not the complete publisher game. Core task mechanics have been checked against the privately provided 2026 rulebook, but lifepath choices, table lookups and full combat/advancement are not implemented.

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

There is no remote API, automatic update request, or third-party integration in 0.2.0. A future opt-in self-hosted sync service is only a roadmap proposal.

## Project documents

Read [AGENTS.md](AGENTS.md) first and follow the [internal design guidelines](https://github.com/JPLuker/InternalDesignGuidelines). Planning lives under `docs/`. Open GitHub Issues are the ongoing handoff once work begins.

## Copyright and license

No commercial book text, publisher artwork or licensed tables are bundled in source control. The user supplies their own files for private local reference. **Code license not yet chosen.** Do not assume MIT or any other license until the maintainer decides.