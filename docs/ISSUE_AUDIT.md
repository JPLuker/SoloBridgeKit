# Issue audit

No user playtest issues recorded for this new repository as of 2026-11-11. Open GitHub Issues are the source of truth for unresolved work.

## 2026-11-12 — v0.14.1 browser capture

- Observed: mission screen rendered 475px wide at a 390px viewport because scene-plan number inputs inherited `min-width:220px` from generic inline-form styles.
- Resolution: constrained scene-plan number fields to grid tracks and added measured mobile overflow assertion. Needs passing follow-up CI to close.
