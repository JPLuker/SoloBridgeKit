# Decisions

- 2026-11-11 (user): The project is for the user's purchased Captain's Log PDFs and should aim for a **D&D Beyond-like interactive experience**, not a collection of standalone utilities.
- 2026-11-11 (user): Review and apply the repository at `JPLuker/InternalDesignGuidelines`.
- 2026-11-11 (user): Repository is `JPLuker/SoloBridgeKit`.
- 2026-11-11 (implementation): Start with a no-dependency offline web foundation while PDFs are not available to this work session. This is an implementation decision, not a chosen final visual identity.
- Pending: Final visual identity, public code license, and optional sync deployment model.

- 2026-11-12 (user): SoloBridgeKit must require people to supply their own PDFs. We must not ship the copyrighted rulebook or material from it. User-local corebook gate and PDF-free default backup are project requirements.

- 2026-11-12 (user): Make the application actually depend on user-supplied game data, like a game recompilation project; simply selecting a PDF as corebook must not unlock play. The user provides their own legally obtained files and locally derives the usable rules data.
- 2026-11-12 (implementation): First pass uses Poppler on the user's computer to generate a private, SHA-256-bound search index. A native in-browser preparation flow is planned before the full mobile release.

- 2026-11-12 (implementation): Bundle open-source PDF.js at build time, not a remote CDN. Prepare user-supplied PDF content locally in the PWA and retain the desktop Poppler preparation as fallback. No publisher content in build/release outputs.
