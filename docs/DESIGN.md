# Design

## Product objective

Make SoloBridgeKit as useful during a solo RPG session as D&D Beyond is for D&D: one interactive character sheet and campaign workspace with rule-linked actions, mission logs, ship data, quick dice, and private book references. The publisher's books remain authoritative.

## Core loop

Select campaign → create/edit character → consult imported books → start mission → roll and record scene outcomes → close mission → resume later.

## Primary surfaces

- **Home:** one campaign selection plus resume action.
- **Character:** a character record; eventually rules-backed guided creation and action panel.
- **Starship:** ship information, later rule-based systems and crew.
- **Captain's log:** mission list, current mission, chronological entries.
- **Library:** locally imported PDFs and in-browser reader; search/indexing planned.
- **Dice:** raw d6/d20 utility pending verified game-specific interpretation.
- **Settings:** complete data backup/restore/deletion and later appearance preferences.

## Visual design

Neutral functional UI in 0.1.0. No themed art and no formal LCARS or Quiet Precision theme selection. Apply InternalDesignGuidelines DESIGN.md Part A, not optional Part B, pending approval.

## Known gaps

Rulebook-based flows are not implemented. Native PDF viewer has browser-dependent behavior. Browser local storage is not shared between devices without backup/restore.
