# ASSUMPTIONS

## Confirmed

| Assumption | Source |
|-----------|--------|
| Plugin runs inside Roam browser app — no MCP needed | Roam Depot docs |
| Entry point: `extension.js`, exports `{ onload, onunload }` | Roam Depot README |
| Bundler: Webpack (outputs ES module) | roam-memo reference plugin |
| React 17 is available as `window.React` (external) | roam-memo webpack.config.js |
| Blueprint.js v3 is available as `window.Blueprint` (external) | roam-memo dependencies |
| Roam data API: `window.roamAlphaAPI` | Roam developer docs |
| Build CI: `build.sh` on ubuntu-24.04 via GitHub Actions | Roam Depot README |

## Assumed (unconfirmed)

| Assumption | Risk | Notes |
|-----------|------|-------|
| roamAlphaAPI.data.q() returns all page titles efficiently | Medium | Must test with large graphs |
| roamAlphaAPI.ui.mainWindow.openPage() exists and works as expected | Medium | Verify against actual API |
| Blueprint v3 classes are stable and won't conflict with plugin styles | Low | Well-established pattern |

## Resolved (previously blocking)

| Question | Resolution |
|---------|-----------|
| How to access Roam data from the app | `window.roamAlphaAPI` — no MCP needed |
| Styling approach | Blueprint.js v3 (external) + optional `extension.css` |
