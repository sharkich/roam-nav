# DEPENDENCIES

## Runtime (bundled into extension.js)

| Package | Purpose | Note |
|---------|---------|------|
| *(none planned)* | — | React + Blueprint are externals |

## Peer / Externals (provided by Roam — not bundled)

| Package | Global | Version |
|---------|--------|---------|
| react | window.React | ~17 |
| react-dom | window.ReactDOM | ~17 |
| @blueprintjs/core | window.Blueprint.Core | ~3 |
| @blueprintjs/select | window.Blueprint.Select | ~3 |

## Dev Dependencies (planned)

| Package | Purpose |
|---------|---------|
| typescript | Type checking |
| webpack + webpack-cli | Bundle |
| babel-loader + presets | TS/TSX transform |
| @types/react @types/react-dom | React types |
| jest + jest-environment-jsdom | Tests |
| @testing-library/react | Component tests |
| tsconfig-paths-webpack-plugin | Path aliases |
| eslint + prettier | Lint / format |

> No package.json yet — project is in bootstrap phase.
