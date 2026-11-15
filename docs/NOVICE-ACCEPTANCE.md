# Beginner acceptance — zero prior tabletop RPG knowledge

**State:** Not yet accepted. Automated synthetic browser tests are not a substitute for playing with the owner's complete, lawfully obtained 2026 rulebook.

## Goal
A new player who has never played D&D or any RPG can independently:
1. Explain what they will do in a solo roleplaying game after reading Home.
2. Choose the correct full rulebook PDF; understand that the file remains private and why blank forms or a ZIP do not count.
3. Understand the difference between a searchable PDF and *verified game options*.
4. Find a choice in their own book without entering a PDF page number or compiler schema.
5. Review candidate context, confirm only the actual source-derived bonuses, save unfinished choices, and resume after reloading.
6. Create a character using confirmed options, automatic ratings, and user-authored personality without manually rebuilding source statistics for every new character.
7. Create a ship using a confirmed class, see the rating preview, customize identity and save/reopen the draft.
8. Start a solo mission and record a first scene, use a roll only where an uncertain action warrants it, record the outcome, and resume the campaign.
9. Find next actions from Home and understand character/ship sheets without being instructed by a developer.
10. Export a safe backup and reopen it, without the app silently deleting or uploading personal data.

## Fail immediately if
- A player must know RPG jargon (lifepath, discipline, focus, source provenance) before getting a definition at its first use.
- The normal path asks for compiler record types, source hashes, manually entered page numbers, or a blank set of 12 numeric fields without source context.
- The app implies a searchable PDF is already an automatically verified playable catalog.
- A stale, unconfirmed, mismatched or manually altered source record is applied as official mechanics.
- Story, source text, copyrighted art or published option lists are bundled, uploaded or silently generated.
- Any character, ship, mission log, imported PDF or unfinished choice is lost unexpectedly.

## Testing method
Use a fresh browser profile and the current UNTESTED CI preview on localhost. Never clear the only copy of your existing browser storage; create a private backup first. Import the complete real book. The tester should go through the flow without verbal coaching; observe where they hesitate or ask what a field means. Do not give them a step-by-step script before the test—record each obstacle as a GitHub issue. Test a second session after quitting and restarting. Confirm offline behavior, narrow phone screens, keyboard access and that source text remains only in local device storage.

## Automated coverage versus human acceptance
Synthetic CI checks PDF processing, privacy guards, local selection, source review, drafts/resume, novice UI labels, ship mechanics, mission actions, offline play and mobile accessibility. It **does not** establish correct parsing of the full actual publisher PDF, human comprehension, source completeness, or publisher-specific option restrictions.

**Release gate:** R6 is accepted only by the owner after completing this real-book, first-time-player exercise without unresolved blockers. Until then, keep the 1.0 release/branding/license issues open and label artifacts UNTESTED.
