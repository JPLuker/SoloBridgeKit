# Roadmap

## Shipped in 0.1.0


- Static offline-capable PWA shell, desktop/mobile responsive navigation.
- Local campaigns; character and starship records; mission and log tracking.
- Raw d6/d20 rolls using cryptographic randomness.
- PDF import and in-app browser reader with files stored in IndexedDB.
- JSON backup/restore including PDFs, full deletion, basic automated tests.

## Implemented locally in 0.2.0

- Source-verified 2026 core task roll: target, difficulty, Momentum/Threat, and focus advantage.
- Mission resource flags persist between sessions and start empty.

## Next: application quality

- Test IndexedDB export/import including nontrivial PDFs and interrupted transactions.
- Add richer mission editing, local undo, and safe recovery for damaged backups.
- Improve per-device mobile layout, a11y and browser compatibility.
- Build browser-level smoke tests and rendering checks.

## Next: rules integration

1. Finish the internal PDF edition/section index and source page links.
2. Implement guided lifepath character creation with legal choices, validation and live sheet.
3. Complete rolling workflow, including spending Momentum and Threat, re-rolls, and combat context.
4. Implement ship creation, crew rosters, progression and rules-backed mechanics.
5. Add searchable PDF text/page references and indexed random tables *only where rights allow*.
6. Build integrated scene and mission play workspace; use the player's own writing and book-backed prompts.
7. Complete accessibility, offline tests, backup migration, and optional self-hosted sync.

## Rejected / not in scope

- Bundling copyrighted rulebooks or their tables in a public distribution.
- AI-generated stories, artwork or character dialogue.
- Mandatory user accounts, telemetry, remote runtime dependencies.

## Source materials received, 2026-11-11

- Blank Forms v1.1 and Fillable Blank Forms v1.2: three pages each, supplied privately.
- Character sheet fields, ship/station sheet fields, four mission summaries, value markers and 15-step mission tracker are now represented in the editable model.
- Core rulebook received by ZIP. Task mechanics were verified; lifepath, probability matrixes and combat should be implemented only after accurate source mapping, without distributing copyrighted text/tables.
- Source PDFs must not be committed to this public repository.
