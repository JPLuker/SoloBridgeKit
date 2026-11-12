# SoloBridgeKit working agreement

Read in order: `docs/HANDOFF.md`, `docs/DECISIONS.md`, `docs/NO_LIST.md`, open GitHub Issues, `docs/ROADMAP.md`, then the relevant files in [InternalDesignGuidelines](https://github.com/JPLuker/InternalDesignGuidelines): `SOP.md`, `WORKING-WITH-JOSEPH.md`, `WORKFLOW.md`, `DESIGN.md` Part A, `PRIVACY.md`, `DATA-AND-UPDATES.md`, `SECURITY-BASELINE.md`, `VOICE.md`, and relevant `CODING.md` chapters.

## Project

A locally playable, offline-first D&D Beyond-like solo RPG companion oriented toward Captain's Log. Do not pretend generic inputs are verified game mechanics.

## Firm lines

- Commercial PDFs and their text must not be committed or included in public builds.
- Do not create copyrighted Star Trek images, characters, dialogue or lore; the user authors the story.
- No AI-generated art or prose. Functional UI controls are fine.
- Offline use, local storage, no telemetry, no mandatory accounts.
- No claim that game-specific rules are correct until verified against user-supplied PDFs.
- Apply internal design behavior rules; the optional Quiet Precision visual style has **not** been approved.
- Every completed change updates tests, changelog, roadmap and handoff in the same commit. Prove before claiming; gated push to `main`.

## Deviations

- This is a web PWA, so the desktop-specific installer formats in general release guidelines do not apply.
- The initial app uses a dependency-free static JS/CSS foundation rather than a React build system to allow immediate offline deployment without package downloads. Framework adoption is deferred until it provides clear value.

## Content distribution requirement (2026-11-12)

- Each player supplies their own lawfully obtained book. Never commit or distribute user-uploaded PDFs, extracted publisher prose, original table entries, stat blocks or licensed art.
- Book-based gameplay requires a locally imported PDF explicitly designated **Core rulebook**. Filename and role selection are not license verification.
- Offline caching and public releases contain only software files. Run the public-content audit before every push, and manually inspect distribution contents.
- Campaign backups exclude PDFs by default; including them is a deliberate private-backup opt-in.
