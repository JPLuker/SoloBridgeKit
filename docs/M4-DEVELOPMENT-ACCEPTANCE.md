# M4 — Starship, Station & Crew Management: development acceptance

**Scope:** Build-only completion. Owner-authorized physical Android/desktop acceptance remains in M7 and is not counted in the development percentages.

## Completion checklist

- [x] Existing private class records are reusable without retyping source-entered System/Department ratings.
- [x] Choosing a verified class stores the source PDF SHA-256, page and class record ID; switching or editing class ratings invalidates confirmed status.
- [x] Ship/station names, registries, traits, talents and personal notes survive class changes; older manual ship builders remain usable.
- [x] Ship creation validates base ratings and the private book's talent count limits (starship by Scale, station up to half Scale).
- [x] Crew members support lightweight ship-based representation or optional full NPC sheets with manually entered Attributes, Disciplines and Focuses.
- [x] Crew may have on-board/away-team/unassigned duty, availability and player-written relationship records; deleting a linked officer does not delete relationship prose.
- [x] NPC target calculators use user-entered Attribute + Discipline or verified ship System + Department; nothing is generated automatically.
- [x] Optional ship milestones can transfer a System/Department point within the source limits or increase a rating within those limits. Each records a completed mission, source fingerprint/page and authored reason.
- [x] Persistent vessel condition/repair notes have player-managed status, without automatically applying imagined injury penalties.
- [x] Legacy ships/crew continue loading, and data-only and full private backups retain player history, source references and customizations.
- [x] Invalid and duplicate source-linked ship histories are refused before restore. Missing source pages do not silently point at a different edition.
- [x] Browser regression covers a complete privately compiled synthetic ship, two NPCs, relationships, vessel development, source identities, backup, restore and phone layout.
- [x] Public bundle and CI artifacts contain no licensed PDF text, classes, random tables or artwork.

## Explicit boundaries

This is a player-entered rules companion, not an authoritative automatic rules engine. Unique source/class options and talent effects not represented in the private compiler are reviewed against the user's original book. No synthetic score is passed off as an official ship/NPC statistic.

The book's ship improvement chapter is referenced by the original private PDF at page 181. Improvement actions are optional and player-triggered; the app does not decide whether a milestone was earned.

**Exit condition:** v0.21.2 syntax checks, complete unit and Chrome smoke tests, static build, and distribution audit are green. Then M4 development can be marked 100% and M5 starts. Device verification stays M7.