# SoloBridgeKit

Offline-first solo tabletop roleplaying companion. The long-term goal is a D&D Beyond-like experience for **Star Trek Adventures: Captain's Log**: guided character creation, interactive sheets, ship and crew management, a mission workspace, integrated dice, and searchable reference books.

This repository contains the **application**, not the commercial rulebooks. Bring your own legally obtained PDFs. SoloBridgeKit is an independent, unofficial fan utility and is not affiliated with the publisher or rights holders.

## Current build: 0.21.0

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

Open `http://localhost:4173`. Node.js 22+ is needed to build/run the self-contained development distribution. End users of the packaged PWA do not need Node or Poppler. Run tests:

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

Read [AGENTS.md](AGENTS.md) first and follow the [internal design guidelines](https://github.com/JPLuker/InternalDesignGuidelines). The active, prioritized plan is [docs/ACTIVE_ROADMAP.md](docs/ACTIVE_ROADMAP.md); shipped history remains in [docs/ROADMAP.md](docs/ROADMAP.md). Open GitHub Issues are the ongoing handoff once work begins.

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

## Private random tables (0.10.0)

A prepared corebook now powers **Private random tables** within Library. Choose a source page and use **Find rows on page** to propose numbered entries extracted from your own PDF. Review, edit and confirm every row before saving. You can also enter ranges manually (such as `1-2 | your result`, `3 | your result`). Table rolls use locally generated unbiased randomness; results can be referred to by page and roll number inside a mission.

No publisher table text is included in the public app. The owner-created table collection belongs to the imported book's SHA-256 fingerprint and stays locally inside that document record. It is included only with an explicitly chosen private PDF backup, not a default campaign-only export. Table parsing is deliberately conservative and requires review; ambiguous typesetting is not treated as an accurate completed table.

## Saved private lifepath choices (0.11.0)

A completed lifepath stage can be saved as a source-linked **private choice**, including the player-verified point allocations, value, focuses, and notes. In subsequent character creations, select the saved option to populate the relevant stage. Both career-event steps share the same private option category. Saved choices can be reviewed or removed from Library.

No species, career-event, talent, or other copyrighted options are shipped with the app. Private choices are created only after the player fills in a step using their imported book; they are tied to that book's SHA-256 and included only in explicit private PDF backups. The app still checks the completed character's allocations and caps before applying it to a sheet.

## Reusable private starship classes (0.12.0)

After entering and checking a starship or station's published class ratings in **Guided ship setup**, save the class as a private template. Other ships can load the same verified system/department ratings and scale without retyping the book's numbers. Existing ship names, registries, traits and talent choices are preserved when applying a class. Saved classes appear under Library for review or deletion.

Class templates live inside the owner's locally prepared source PDF record, not in the public build. They are included only in opt-in private PDF backups. No publisher stat blocks are distributed.

## In-mission actions (0.13.0)

The Captain's Log screen now includes **Scene actions**: choose Attribute and Discipline, apply the active mission's difficulty/Focus, and roll directly without leaving the mission. The same mission-recording function powers the separate Dice screen, keeping Momentum, Threat and task history consistent. Saved private random tables can be rolled from the mission screen, with source-page access. Recording a random result into the mission stores **only the private table title, source page and roll number**, not the publisher's result text.

All saved mission results remain part of the player's ordinary campaign history; book-derived table rows and private option catalogs remain inside the local documents database and optional private PDF backup only.

## Browser verification (0.14.0)

GitHub Actions now runs a headless Google Chrome smoke test against the **packaged** PWA using a synthetic, programmatically generated 210-page PDF. It checks the setup gate, private PDF preparation and search, creation of a campaign and character, a mission task roll, and an offline reload. The CI run saves phone and desktop screenshots as a test artifact. The synthetic PDF is generated only during testing and removed afterward.

Run the same check locally with Chrome installed: `npm install --ignore-scripts --no-audit --no-fund && npm run build && npm run browser:smoke`. Set `CHROME_BIN` to your Chrome executable if not at `/usr/bin/google-chrome`. This is headless **browser verification**, not a substitute for testing on actual Android or desktop devices.

## Portable campaign journals (0.15.0)

From **Home**, choose **Export journal** to save your character, starship, crew, missions, scenes, captain's logs and task-roll history as a readable Markdown file. Within an episode, **Export episode** saves just that mission. These exports are separate from full JSON backups and intentionally exclude all imported books, extracted PDF page text, player-curated private tables, class templates and option catalogs. Any content the player personally typed into their own notes is included.

Journals use open, non-proprietary Markdown and contain no externally hosted assets. Keep a JSON campaign backup as well if you need to restore editable game state.

## Download verification (0.16.0)

The headless Chrome CI test now saves and inspects a downloaded single-episode Markdown journal, a full-campaign Markdown journal and a default JSON backup. It checks that exports contain the expected player-created character and episode data, but **never the privately imported PDF, extracted page text, private tables or options**. The default backup must explicitly report `includesDocuments:false` and `documents:[]`. The same browser run then confirms the PWA loads offline.

## 0.17.0 import safety

The Library validates a complete PDF selection and checks an approximate browser-storage estimate before writing. A multi-file batch is added in **one** IndexedDB transaction; failures cannot leave a partial batch. Cancelling corebook preparation does not save an unfinished index or remove an existing book. Existing documents can be prepared with a cancel control. Browser capacity estimates are approximate, not a guarantee. Keep your own purchased PDFs and export campaign backups regularly.

### v0.17.1 restore verification

Automated headless Chrome now verifies a complete user-private PDF-inclusive backup round trip, preserving source-page text and campaigns. It tests campaign-only restore without losing previously imported PDFs, mismatched PDF/index rejection, and IndexedDB rollback for a duplicate-ID write. These checks use a generated synthetic book, not the commercial rulebook.

### v0.17.2 source reattachment

Use **Reattach the same PDF** for an already imported book when restoring a local file. SoloBridgeKit compares the PDF's SHA-256 fingerprint with its saved source; a byte-identical file replaces the local attachment without losing bookmarks or private compiled data. A different edition is rejected and must be imported as a separate book. This prevents silent replacement of previously confirmed game rules.

### v0.17.3 interruption and offline recovery

Chrome acceptance now includes a synthetic 336-page book, abort during page extraction with no saved-data changes, successful retry, a simulated service-worker replacement, and another private PDF preparation with network access disabled. The parser also hashes the existing in-memory PDF bytes instead of reading a second copy of the entire PDF into memory.

### v0.17.4 multi-tab save safety

Campaign saves now carry monotonically increasing revisions. A stale copy from another tab cannot silently overwrite a newer revision. Saves of the same campaign are serialized within each tab, and a full database restore/reset drains pending campaign saves before replacing data. Other tabs close old IndexedDB connections when a future schema version needs to upgrade. A rejected conflict leaves newer stored data intact; reload or export any unsaved personal edits before continuing.

### v0.17.5 interrupted import after restore

An import or source reattachment that started before a database reset/restore cannot finish afterward and silently recreate old documents. Each long-running import carries the current database generation and the final write refuses obsolete generations. Long-running existing-book operations patch the latest saved document inside one transaction instead of overwriting newer bookmarks or private choices.

### v0.17.6 unsaved-draft recovery

When a campaign save fails (for example because another tab saved a newer revision), a persistent **Download draft** option appears. The exported JSON contains only the player's current campaign, never a private PDF or compiled book data. In **Settings → Recover unsaved work**, import that file as a separate **(recovered)** campaign without overwriting the newer one. Keep the recovery file private. Recovery files are not automatic full backups.

## M1 acceptance and real-device verification

M1 developer-side protections are implemented and tested in CI. Before declaring it complete, follow [docs/M1-ACCEPTANCE.md](docs/M1-ACCEPTANCE.md) with your own 2026 PDF privately on physical Android/desktop browsers. The 336-page synthetic test PDF used by CI does not prove the full commercial PDF works on every device. The preview remains labeled untested until accepted.

### v0.17.8 cross-tab database integrity

The PDF import and source reattachment safeguards now use a durable generation marker in IndexedDB, checked together with document writes inside **one transaction**. This stops an import started in one tab from silently recreating documents after another tab resets or restores the database. Restored campaigns receive a fresh generation marker: older tabs cannot overwrite them even when their numeric revision is unchanged. Headless Chrome tests use two real tabs to verify cross-tab recovery.

### v0.17.9 recovery after cross-tab restore

After a restore in another tab, a downloaded unsaved-work draft now imports as a new campaign with a fresh storage identity. The original newer campaign remains protected. Regression tests cover a recovered draft carrying an obsolete database epoch and the complete Chrome recovery workflow.

### M1 local testing (v0.17.9)

The preview is a static PWA ZIP rather than an APK. See [M1 acceptance instructions](docs/M1-ACCEPTANCE.md) for a localhost desktop server and Android Chrome through `adb reverse` over USB. This method does **not** require publishing your rulebook or opening a public server. M1 stays at 98% until real-device tests and owner signoff.

### v0.18.0 — M1 real-source verification and deleted-campaign safety

- A previously unsaved campaign is now stamped with the current database generation **at creation time**. Saving checks that generation inside the same IndexedDB transaction used for the campaign write. This blocks old tabs from recreating a deleted/never-saved campaign after a restore or reset.
- A reusable **private corebook verification** command runs the application's actual PDF.js preparation path without publishing or storing extracted book text:

```bash
npm ci
npm run build
npm run verify:private-book -- "/path/to/your/legally-obtained-corebook.pdf"
```

The verifier displays only the page count and readability summary. Its CLI output contains no PDF text, filenames, or source fingerprints. The build uses the same PDF.js preparation module as the PWA, but this command does not prove Android performance or UI behavior. The private 336-page 2026 edition was successfully processed locally through the exact compiler path; browser device acceptance is still pending.

## M2 — Private game-data compiler (development)

M1 is **100% finished for coding**; real-device acceptance was moved to M7 at the owner's request. M2 now adds `compiler-data.mjs`: locally extracted **unverified candidates**, versioned and source-fingerprinted records, review state, and strict validators before any value becomes a usable game option. Draft, confirmed, rejected and needs-review states are explicit. The source-bound records stay on the locally imported document and are included **only in private PDF-inclusive backups**, never in normal campaign exports or the public app build. The initial compiler API supports lifepath steps, talents, starship classes and random tables; a guided review interface is next.

### v0.19.1 guided local compiler review

The Library now offers a **Private rules compiler** panel. Choose a page and record type (lifepath, talent, ship class or random table), scan that page for unverified candidates, or create a manual draft. Each candidate opens an editor with source-page navigation and structured fields. Only a user checking the explicit **verified against my PDF** box can confirm a valid record; drafts remain inactive. Records can be revisited or removed without affecting the original PDF or previously created characters. A real-browser regression demonstrates scan → edit → confirm → save using a synthetic, noncommercial PDF.

### v0.19.2 reusable compiled catalogs and revalidation

Confirmed private lifepath choices, ship classes and random tables are now available in the application's existing character, ship and mission selection controls. Talent records are available as source-linked, verified references only; no gameplay bonuses are invented or applied. Unreviewed, rejected and stale records are excluded. **Revalidate saved records** checks the local catalog after source/compiler changes without deleting user-edited payloads; records that no longer validate are preserved for review rather than silently trusted or lost. A synthetic Chrome workflow now confirms that a compiled table can be rolled during a mission and that the private PDF-inclusive backup retains the confirmed records.

### M2 build acceptance — v0.19.3

The private rules compiler is complete for **development scope**. It supports draft extraction from the user's book, typed review, explicit confirmation/rejection, source-page references, source/schema revalidation, local persistence, player-verified catalog reuse across existing game screens and opt-in private backup recovery. It ships no extracted publisher content. See [docs/M2-DEVELOPMENT-ACCEPTANCE.md](docs/M2-DEVELOPMENT-ACCEPTANCE.md) for the finished build criteria. Physical Android/desktop testing and manual UX acceptance remain in M7 under the owner's requested separation of build and testing milestones.

### v0.20.0 — M3 guided lifepath provenance

New character lifepath drafts begin in **Verified choices** mode, retaining the exact source PDF fingerprint, page, and confirmed private record ID for each selected stage (including both career events). Invalid source/stage combinations or mechanical bonus distributions are rejected before overwriting the draft. Edits and missing records visibly invalidate provenance. The guided path cannot be applied to the character sheet until all seven source-dependent stages retain confirmed, unchanged bonuses; finishing allocations still use the 2026 rulebook's caps. Existing/manual lifepaths can continue in manual mode and switch modes without deleting drafts. No official option catalogs are shipped.

### v0.20.1 — Character development after missions

Character sheets now provide source-linked, player-triggered progression: after a **completed mission**, an eligible character can record one milestone (transfer one point between Attributes or Disciplines within the 2026 caps, or exchange one Focus). Values challenged during a mission can be replaced with explicit confirmation. Players can also record ongoing injuries/conditions and move them through active, recovering and resolved states without automatic game penalties. Each development event stays in the private campaign history, with a source PDF fingerprint, original page, timestamp and mission ID. Older characters load with an empty development history; nothing is auto-applied or generated.

### v0.20.2 — M3 development completion candidate

The final M3 build adds a pure source-verified **complete guided character** gate (all seven stages and finishing totals), protects source references if the user's book changes, and distinguishes a normal milestone from the separate once-per-mission Focus refresh allowed by the rulebook. Manually editing sheet mechanics clears the last-applied lifepath status but retains the draft and source references. Development-history PDF links look up the original imported fingerprint rather than opening an unrelated replacement book. Data-only and full-private backups retain authored progression and source references; damaged or duplicate development records are rejected. See [M3 development acceptance](docs/M3-DEVELOPMENT-ACCEPTANCE.md). Real-device verification remains in M7, as agreed.

### v0.21.0 — M4 source-linked ship/station class guidance

New ship-builder drafts start in **Verified class** mode and use player-confirmed, privately compiled class records. Applying one copies only the selected class type, era, scale and systems/departments; it retains your ship's name, registry, custom traits, talents and notes. A class record carries its original source PDF fingerprint, record ID and page reference. If the source or class ratings change, the verified status is invalidated. Manual ship drafts and legacy saves can continue in manual mode. The existing ship/station talent limits are enforced at final application. No official vessel statistics are included in the public app.
