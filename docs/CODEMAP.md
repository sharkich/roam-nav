# CODEMAP

> Project is in bootstrap phase — no source code yet. Map reflects planned structure.

## File Tree

```
src/
  extension.tsx          # onload / onunload — plugin entry point
  components/
    Palette.tsx          # overlay wrapper (Blueprint Dialog or portal div)
    SearchInput.tsx      # text input, fires query updates
    ResultsList.tsx      # virtualized list of page results
    ResultItem.tsx       # single result row
  hooks/
    useRoamPages.ts      # loads all page titles from roamAlphaAPI
    useSearch.ts         # fuzzy filter + rank results
    useKeyboardNav.ts    # arrow keys, Enter, Escape
  lib/
    roam.ts              # typed wrapper around window.roamAlphaAPI
  types/
    roam.d.ts            # window.roamAlphaAPI type declarations
  main.tsx               # React portal mount helper (called from onload)
extension.css            # palette positioning, backdrop, z-index
build.sh                 # pnpm install && pnpm build
webpack.config.js        # externals, entry → extension.js output
tsconfig.json
package.json
```

## Entry Points

| Entry | File | Purpose |
|-------|------|---------|
| Plugin lifecycle | `src/extension.tsx` | onload / onunload |
| Roam API adapter | `src/lib/roam.ts` | all roamAlphaAPI calls |
| React root | `src/main.tsx` | mount/unmount portal |
