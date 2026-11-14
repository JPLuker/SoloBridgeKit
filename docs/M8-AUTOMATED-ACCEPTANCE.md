# M8 — Release-safety developer acceptance

**Automated result: PASS** — v0.25.0, [GitHub Actions CI #188](https://github.com/JPLuker/SoloBridgeKit/actions/runs/43649559686), commit `25411c01e92e00e2fa715a1c2ad96d7fb7fca89b`.

## CI passed
- Reproducible `npm ci` based on committed npm lockfile with exact dependency integrity; high-severity production dependency advisory audit passed.
- JavaScript syntax checks and complete unit suite.
- Source-free distribution build, source and dist copyright audits, and remote-asset checks.
- Synthetic 336-page/3-page PDF private preparation, multi-book search, corebook changes, full backup/restore, offline Chrome workflow.
- M7 keyboard, responsive, text contrast, reduced-motion and disconnected reload checks.
- `scripts/audit-release.mjs` generated a SHA-256 file provenance report and verified vendored PDF.js licensing.
- `scripts/verify-release-provenance.mjs` independently confirmed the reported bytes of every packaged file. UNTESTED previews and provenance reports are separate CI artifacts.

## Explicit release blockers
- [M7 device/assistive-tech acceptance](https://github.com/JPLuker/SoloBridgeKit/issues/1) remains open: real privately owned 2026 book and physical devices cannot be certified in CI.
- [M8 owner approval](https://github.com/JPLuker/SoloBridgeKit/issues/2) remains open: software code license, visual identity, manual artifact review and release version require the owner.
- No publisher books, extracted text or official artwork may be placed in the public repo or artifacts.

**Status:** Automated M8 development checks complete; **public release approval NOT GRANTED**. Do not label this 1.0 or maintenance mode without explicit owner direction.
