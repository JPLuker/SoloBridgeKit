# SoloBridgeKit — D&D Beyond-inspired product re-evaluation
**Audit date:** 2026-11-14  
**Reviewed baseline:** v0.25.2 source; technical CI previously verified, **novice usability not accepted**.  
**Status:** Product/design proposal, **not implemented**. Owner must review priorities.  
**Comparable product:** D&D Beyond official character-builder instructions, including Builder Sections, beginner/quick builders and the “What's Next” stage (sources below).

## Product thesis
The next build should **guide a complete first solo adventure**, not merely display forms or ask the player to become a rules-data compiler. A brand-new tabletop player should never need to understand an app's internal concepts (schema, source hash, compiler, provenance, input field allocations) to reach the first scene. The experience should teach relevant tabletop concepts at the point of use, with a single obvious next action.

The D&D Beyond benchmark is the *behavior*, not its visual branding, D&D-specific classes, product catalog, art, or business model. SoloBridgeKit is independent, book-owner supplied, offline and story-author-driven. Do not clone copyrighted art, the source text, proprietary iconography, or create AI-generated game narrative.

## What the audit actually found
| Journey | Source evidence in current repo | UX gap | Severity |
| --- | --- | --- | --- |
| Onboarding | `corebookPrompt`, `renderLibrary`, `onboarding.mjs` | v0.25.2 has useful copy and defaults, but uploading a book only creates a searchable page index. It does **not** make the game option catalog available automatically. The player still discovers this much later. | Critical |
| Private source preparation | `renderPrivateCompiler` in `app.mjs` | Requires manually picking record type, numeric page and finding/confirming candidate records. It is a maintenance/advanced workflow masquerading as the primary setup. | Critical |
| Character creation | `renderLifepath`, `guided-explanations.mjs`, `character-guidance.mjs` | Explanations exist and previously confirmed choices have buttons, but most fresh installs have none. Player can land on blank attribute allocations. Incomplete drafts are validated at navigation and can strand novices. | Critical |
| Character sheet | `renderCharacter` in `app.mjs` | Full editable record/form is presented as a primary experience rather than a finished, readable play sheet. Detailed editing should be secondary to playing. | High |
| Ship creation | `renderShipBuilder`, `ship-guidance.mjs` | Unprepared private ship classes expose empty rating fields; a typical novice doesn't know what “Scale”, “Systems”, “Departments” or polity traits mean. | High |
| Mission player | `renderLog`, `renderSceneTracker`, `renderDice` | The UI asks for a mission name, a custom act plan and scene notes. It doesn't clearly transition the player from a starting situation to their first decision, uncertainty, roll and recorded outcome. | Critical |
| Information architecture | `PAGES`, `MOBILE_PAGES`, `renderHome`, `renderMore` | “Library”, “Dice”, “Character”, “Captain's log”, “Crew”, “Starship” are separate destinations; a beginner needs **Continue** to connect them in a single journey. | High |
| Terminology/help | `guided-explanations.mjs` and local hints | Explanations are added above existing forms. Teaching should be attached to the exact decision and its consequences, not stacked as permanent paragraphs. | High |
| Content & privacy | `book-data.mjs`, `compiler-data.mjs`, `storage.mjs`, safety audits | Fingerprinting, private confirmation and public-content isolation are valuable existing foundations; preserve them. Don't silently turn uncertain candidate extraction into “official verified” selections. | Preserve |
| Verification | `scripts/browser-smoke.mjs`, `scripts/browser-accessibility.mjs` | Automated tests prove that controls work on synthetic sources, not that a player can understand the app. Need usability-specific end-to-end scenarios and real first-time-user acceptance. | Critical |

## The target first-session journey
0. **Welcome / understand** (inline on Home, not a separate tutorial tab): “You play a Starfleet character. Describe what they try. Dice help when the outcome is uncertain.” One primary **Get started** action.
1. **My rulebook:** One file-picker action, explicit local-only handling; recognize validated 2026 corebook, show progress and resolve actionable errors. Don't pretend a page index equals game content being ready.
2. **Set up playable choices:** Locally scan the prepared pages for supported kinds, group *candidate* options into small, understandable review batches. Let owner verify candidates side-by-side with their PDF. Show specific coverage, e.g. “Species choices: 6 confirmed”, “Career choices: not ready”; don't fabricate coverage or ship publisher lists. One primary **Review choices** action; advanced compiler behind an advanced/repair area. If reliable extraction is impossible, offer an approachable guided manual verification with page context and explicit requirements.
3. **Make my character:** A decision at a time, selectable locally confirmed cards with description/implication provided only by the private imported source. Show effect previews and automatically apply verified mechanical changes. Explicit **Back**, **Next**, **Save and exit** and **Review character**. Keep personal story names/values player-authored; don't auto-write story content.
4. **Choose my ship:** Accessible source-backed class choices, meaningful plain-language comparison and automatic rating population; hide all numeric forms until **Edit ratings** or source choice genuinely requires it.
5. **Play:** **Begin first mission** offers a simple original prompt *structure* (not generated story), shows one scene, a primary action prompt, contextual roll only when needed, and one choice for **Record what happened**; optional advanced scene plan and custom act counts live elsewhere.
6. **Resume:** Home leads with the exact next uncompleted action: **Finish character**, **Continue ship**, **Resume Act One**, etc. Campaign and book library are supporting destinations, not the beginner's navigation homework.

## Navigation redesign (concept, subject to user design approval)
- Primary: **Home / Continue**, **My Character**, **My Ship**, **Play**, **Library**.
- Contextual inside builder: step tracker, Back/Next, concise help, progress, source provenance.
- Settings/advanced (secondary): **Rules preparation & repair**, granular source indexing, custom scoring, manual overrides, multi-book roles, backups and troubleshooting.
- Avoid default empty dashboards or unprompted dense technical fields. Preserve full advanced access for experienced players.

## Decision-screen contract
Every new decision UI must answer, in order:
1. **What am I deciding?** One plain-language question.
2. **Why does it matter?** At most two short sentences; optional “Learn more”.
3. **What can I choose?** Confirmed source-backed options, no invented fallback list.
4. **What will change?** Concrete rating/trait preview when verified data allows.
5. **What happens next?** One clear primary action; never discard an incomplete draft without warning.
Missing content is a recoverable **review source** state, not a blank form.

## Roadmap — rebuild one end-to-end slice before expanding
### R1. Source readiness and onboarding foundation
- Separate **PDF indexed** from **choices ready** states.
- Surface a readiness dashboard in understandable terms.
- Move the current compiler behind advanced settings and create a guided owner-confirmation workbench.
- Protect all source hashes, preexisting records, drafts and saves.
- Exit: A novice can select the correct book and understand exactly what remains to prepare before gameplay, without page-number/type/schema decisions.

### R2. Character creator replacement
- Upgrade current lifepath to a true one-decision-at-a-time option picker, with preview, automatic verified bonuses and built-in validation.
- Keep Back/Next, persistent drafts, safe resume and source-view inline.
- Distinguish *book-confirmed* vs *user-custom* choices; no unverified option can be shown as mechanically reliable.
- Exit: A first-time player with their locally reviewed source records completes and reviews a character without manually adding attribute bonuses.

### R3. Ship builder and completed sheets
- Same selection-first guided design for ship/station with saved verified class choices.
- Replace primary editable character/ship forms with clear, usable read-only sheets and contextual edit controls.
- Exit: A player knows which ship they chose, sees ratings and can correct them without losing the original verified choice.

### R4. Guided solo play
- Connect campaign, character, ship, first scene, contextual dice, result and scene journal into a single play path.
- Define the first action and resolution flow without generating story events, outcomes or dialogue.
- Preserve freeform writing and advanced three-act controls.
- Exit: A newcomer can independently finish the first meaningful scene, save, reopen, and continue.

### R5. Information architecture and first-use polish
- Simplify navigation, progressive disclosure, missing-content/recovery states, in-flow explanation and mobile layout.
- Introduce an **Advanced** affordance for compiler, manual overrides and troubleshooting rather than deleting those features.
- Exit: First-time players can find the next correct action; power users can still reach every existing feature.

### R6. Dedicated novice acceptance
- Run a synthetic automated end-to-end walkthrough plus actual owner testing using a private legally obtained source book.
- Observe whether any prompt requires explaining jargon or page-level compilation beyond normal source verification.
- Record every dead end, confusing term, duplicate entry and unrequested decision. Iterate until accepted.
- Exit: User can complete import → verify required choices → character → ship → first scene → resume with no outside directions or technical data editing. **This—not green CI—is the usability milestone.**

## What must NOT be lost
- Existing offline-first PWA, browser-local files and records, SHA-256 source binding, verified mechanics, source-page links, safe draft/restoration, public content audit, opt-in private backups and real-device release gates.
- No shipped licensed lists/book text, no official brand art, no invented stat blocks, no AI-authored story, no extra account or server dependence, no unsolicited theme replacement.
- Existing advanced editor remains available as an escape hatch while beginner workflows are rebuilt.

## Audit sources
- D&D Beyond, *Builder Sections*: https://dndbeyond-support.wizards.com/hc/en-us/articles/7747202748436-Builder-Sections
- D&D Beyond, *How to Create Your First D&D Character*: https://www.dndbeyond.com/posts/1059-how-to-create-your-first-dungeons-dragons
- D&D Beyond, *How to Play D&D Using D&D Beyond*: https://www.dndbeyond.com/posts/754-how-to-play-dungeons-dragons-using-d-d-beyond
- Official D&D Beyond, *Character Quickbuilder* (March 24, 2026): https://www.youtube.com/watch?v=Vx0BwdXQ-vk
- Local source audit: `app.mjs`, `onboarding.mjs`, `guided-explanations.mjs`, `compiler-data.mjs`, `character-guidance.mjs`, `ship-guidance.mjs`, `scripts/browser-smoke.mjs`, `docs/NO_LIST.md`.
