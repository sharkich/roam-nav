# ARCHITECTURE

Roam Depot plugin — TypeScript + React, bundled with Webpack into `extension.js`. Runs inside the Roam Research browser app.

## Plugin Lifecycle

```
Roam loads extension.js
  → onload()
      - register keyboard shortcut (e.g. Cmd+K)
      - inject React portal into Roam DOM
  → user triggers shortcut
      - fetch all pages via window.roamAlphaAPI.data.q(...)
      - render fuzzy-search palette overlay
      - on select: navigate via roamAlphaAPI.ui.mainWindow.openPage / openBlock
  → onunload()
      - deregister shortcuts
      - unmount React portal
      - remove injected DOM nodes
```

## Workspace Structure

```
roam-nav/
  src/
    extension.tsx      # onload / onunload entry point
    components/
      Palette.tsx      # overlay container
      SearchInput.tsx  # controlled input
      ResultsList.tsx  # keyboard-navigable list
    hooks/
      useRoamPages.ts  # fetches all pages via roamAlphaAPI
      useSearch.ts     # fuzzy filter + ranking
    lib/
      roam.ts          # roamAlphaAPI adapter (typed wrapper)
    types/
      roam.d.ts        # window.roamAlphaAPI type declarations
  extension.js         # webpack output (Roam Depot entry)
  extension.css        # optional styles (supplements Blueprint)
  build.sh             # CI build script for Roam Depot
  webpack.config.js
  tsconfig.json
  package.json
  gain.json
  docs/
  agents/
  plans/
```

## Key Externals (provided by Roam — do NOT bundle)

| Global | Package |
|--------|---------|
| `window.React` | react |
| `window.ReactDOM` | react-dom |
| `window.Blueprint.Core` | @blueprintjs/core |
| `window.Blueprint.Select` | @blueprintjs/select |

## Styling

Blueprint.js v3 is the standard — already loaded by Roam. Use Blueprint components and classes directly. Add `extension.css` only for layout overrides and palette positioning (z-index, backdrop).

## Data Flow

```
onload
  ↓
Cmd+K keydown
  ↓
roamAlphaAPI.data.q([all page titles])   ← Datalog query
  ↓
useSearch(query)                          ← fuzzy filter
  ↓
ResultsList renders candidates
  ↓
Enter / click on result
  ↓
roamAlphaAPI.ui.mainWindow.openPage({ title })
```

## Testing

- Unit: Jest + React Testing Library
- No E2E in v1
