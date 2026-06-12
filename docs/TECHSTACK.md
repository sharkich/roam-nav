# TECHSTACK

## Core

| Layer | Technology | Version | Note |
|-------|-----------|---------|------|
| Language | TypeScript | ^5.x | |
| UI | React | ^17 | external — provided by Roam |
| Bundler | Webpack | ^5 | outputs ES module `extension.js` |
| Styling | Blueprint.js v3 | ^3.x | external — provided by Roam |
| Extra styles | extension.css | — | for overlay positioning only |

## Runtime (browser globals from Roam)

| Global | Source |
|--------|--------|
| `window.React` | Roam's own React bundle |
| `window.ReactDOM` | Roam's own ReactDOM bundle |
| `window.Blueprint.Core` | Roam's Blueprint.js v3 Core |
| `window.Blueprint.Select` | Roam's Blueprint.js v3 Select |
| `window.roamAlphaAPI` | Roam Research plugin API |

## Dev Tooling

| Tool | Purpose |
|------|---------|
| Jest + RTL | Unit tests |
| Babel | JS transform (webpack loader) |
| ESLint | Linting |
| Prettier | Formatting |
| pnpm | Package manager |
