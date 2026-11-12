# Issue audit

No user playtest issues recorded for this new repository as of 2026-11-11. Open GitHub Issues are the source of truth for unresolved work.

## 2026-11-12 — v0.14.1 browser capture

- Observed: mission screen rendered 475px wide at a 390px viewport because scene-plan number inputs inherited `min-width:220px` from generic inline-form styles.
- Resolution: constrained scene-plan number fields to grid tracks and added measured mobile overflow assertion. Needs passing follow-up CI to close.

## 2026-11-12 — v0.14.2 CI browser startup

- v0.14.1 browser smoke did not reach the app. GitHub-hosted Chrome timed out after 30 seconds while waiting for DevTools websocket; source checks/tests/build passed.
- Mitigation: DevTools pipe transport, extended startup limit, no-GPU/networking flags and direct Chrome diagnostics.
- Do not mark the phone-overflow correction verified until browser smoke reaches it.

## 2026-11-12 — v0.15.0 browser regression

- Browser run passed model tests/build but failed awaiting scene actions. The screenshot showed required-field validation on an unexpectedly emptied mission name; a previous asynchronous save's `refresh()` can rerender the next page during typing.
- v0.15.1 change: navigation epoch guards against stale redraw, smoke waits for saved actions and asserts the mission title. Pending verification by CI.
