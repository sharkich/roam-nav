---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
lastStep: 8
status: 'complete'
completedAt: '2026-06-12'
inputDocuments:
  - .bmad/planning-artifacts/prds/prd-roam-nav-2026-06-12/prd.md
  - .bmad/planning-artifacts/prds/prd-roam-nav-2026-06-12/.decision-log.md
  - .bmad/planning-artifacts/ux-designs/ux-roam-nav-2026-06-12/DESIGN.md
  - .bmad/planning-artifacts/ux-designs/ux-roam-nav-2026-06-12/EXPERIENCE.md
  - .bmad/planning-artifacts/ux-designs/ux-roam-nav-2026-06-12/.decision-log.md
  - docs/TECHSTACK.md
  - docs/DEPENDENCIES.md
  - docs/ASSUMPTIONS.md
  - docs/CODEMAP.md
workflowType: 'architecture'
project_name: 'roam-nav'
user_name: 'temich'
date: '2026-06-12'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:** 7 FRs across two features unified by "DNP = navigation anchor".
- Date Stepper (FR-1..3): prev/next-day controls only on a DNP; ±1 day with re-anchoring and arbitrary depth; open non-existent dates WITHOUT writing to the graph.
- Navigation Trail (FR-4..7): single-row trail outside `.rm-topbar`; track visited pages as ordered Crumbs (linear visit-history, consecutive-dedup only); reset & root on each DNP open; click-to-return; overflow = horizontal scroll.

Both features share one mounted surface (the unified roam-nav bar) and one source of truth for "current page / anchor date."

**Resolved scope decisions (this analysis):**
- **Single surface only:** "current page" = Roam main window. Right sidebar and multi-window are OUT of scope for detection, trail tracking, and DNP-reset.
- **Trail = linear history** (visit order), not browser-stack collapse; reset on DNP open.
- **Always-present bar:** the bar is always shown. With no history, it shows a link to **today's DNP** (today's date) as the sole element — covers the first-run / empty state.

**Non-Functional Requirements (architecture-shaping):**
- Header integrity (load-bearing): nothing injected into `.rm-topbar`; per-feature degrade-to-absent on Roam DOM/API changes (NOT a single global failure point).
- Perceptual continuity (UX-load-bearing): the bar is ONE long-lived container whose content updates in place (no unmount/remount per route → no flicker); its row height is reserved from the first frame (no layout shift); sticky verified across Roam modes (plain page, sidebar open, block-zoom, narrow window); theme changes flow live (no color cached at mount).
- Lifecycle / teardown: clean `onunload` (Depot-reviewed) — disconnect observers, remove listeners, `unmountComponentAtNode` + remove root (React 17 API, NOT `createRoot`), cancel timers, strip injected styles; idempotent mount (no double bar on reload).
- Read-only safety (safety invariant): zero write APIs, enforced by defense-in-depth (below).
- Lightweight: debounced/narrow-targeted observer with a `document.contains` guard (no callback-storm on keystrokes); no full-graph scans on route change; date math via Roam `util.*`.
- Observability (no backend): namespaced `console` + debug flag; capability-probe snapshot logged at startup so a bug report shows which API methods were present.
- Style isolation: scoped class names so plugin CSS and Roam/Blueprint/community-theme CSS don't bleed into each other.

**Scale & Complexity:**
- Primary domain: client-side overlay plugin inside the Roam Research SPA.
- Complexity: LOW by volume; MEDIUM by integration risk (foreign SPA DOM + untyped rolling API).
- Estimated components (~7): RoamPort+adapter, lifecycle/mount manager (observer + onunload), current-page/DNP detector, trail store (pure reducer), Date Stepper UI, Navigation Trail UI, shared top-zone layout owner.

### Technical Constraints & Dependencies
- Externals provided by Roam (not bundled): `window.React` (17 → `ReactDOM.render` / `unmountComponentAtNode`, NOT React 18 `createRoot`), `window.ReactDOM`, `window.Blueprint.Core`/`.Select` (v3), `window.roamAlphaAPI`. Verify expected global names resolve at load (else blank UI).
- API readiness: `roamAlphaAPI` may not be ready at `onload`; poll/await-ready before mount.
- Roam is a rolling release with no semver: feature-detect every adapter method at startup; degrade-to-absent if missing.
- Date identity: page **uid** (`MM-DD-YYYY`, deterministic) is the source of truth; title (`June 12th, 2026`, localized) is display/fallback only. Date math via `util.dateToPageUid` / `util.pageTitleToDate` with a hand-rolled ordinal fallback (dual path).
- Crumb identity = `{uid, title, ts}` (uid for navigation — survives rename; title for display).
- Build: TypeScript + Webpack → single `extension.js` (Roam Depot); `extension.css` for overlay positioning only; mind Depot CSP limits (inline-style/eval).
- `docs/CONTEXT.md` / `docs/ARCHITECTURE.md` describe a superseded Cmd+K palette — OUT of scope; only tech-stack facts carried forward.

### Cross-Cutting Concerns Identified
- Header integrity & non-intrusive, self-healing DOM mount (anti-pattern: RoamJS/breadcrumbs).
- Resilience to Roam route changes & topbar re-creation (observer-driven re-attach, no dup/leak).
- Read-only invariant, defense-in-depth:
  1. Static gate — ESLint ban on `roamAlphaAPI` write methods (createBlock/Page, update/delete/move, `data.*`); CI fails on any write call.
  2. Architecture — RoamPort type does not expose write methods (can't call what isn't there).
  3. Runtime — jsdom proxy-sentinel throws on any write during full-scenario tests.
- Perceptual continuity (no flicker, no layout shift, sticky, live theme).
- Testability seams: narrow RoamPort (FakeRoamAdapter for jsdom) + pure logic (dateMath, isDNP, trailReducer, resolveMountPoint) at 100%; mount/observer integration-only; manual smoke checklist + manual contract-verification against real Roam (run at each Roam upgrade) as versioned release artifacts.
- Lifecycle/teardown & idempotency; observer performance; observability; style isolation; timezone ("today" = local device date).

### Verification Blocker (resolve empirically before finalizing architecture)
- **Does navigating to a non-existent DNP materialize a page in the graph?** Four reviewers flagged this as the dominant unknown. If `openPage`/`openBlock` on a date uid can create a page, a navigation guard layer is required; if not, the read-only port suffices. Confirm via a dev-console snippet in real Roam (navigate → query that the page was NOT created). This is smoke-test #1 and gates the read-only invariant.

## Starter Template Evaluation

### Primary Technology Domain
Client-side **Roam Depot browser plugin** (overlay inside the Roam SPA) — not greenfield. Roam provides React 17, ReactDOM, Blueprint.js v3 as window globals; the plugin ships a single `extension.js` (ES module) exporting `{ onload, onunload }`, built by `build.sh` on `ubuntu-24.04`.

### Starter Options Considered
- **`npx create-*` greenfield generators** — rejected (assume bundled React/router/app server; N/A for a Roam overlay).
- **`roamjs-components` (npm 0.15.0)** — de-facto RoamJS library. Kept as a **pattern reference**, NOT bundled. Rationale: a bundled dependency hides graph-write calls inside `node_modules` where the read-only ESLint gate can't see them — an owned adapter keeps the gate honest. Action: **selectively transcribe only the 2-3 non-trivial helpers actually needed** (date resolution, ref parsing) under our own signatures.
- **Community templates** (`KrishKrosh/Roam-Research-Extension-Template`, `Roam-Research/roam-depot` samples) — references; the in-repo scaffold already encodes the conventions.
- **Existing in-repo scaffold** — SELECTED (repurpose, not regenerate).

### Selected Starter: existing in-repo scaffold (repurposed)
**Rationale:** already satisfies the Depot contract + PRD stack; lower-risk than regenerating. Built for the superseded Cmd+K palette → needs retargeting plus the test/lint/safety infrastructure the quality strategy requires.

**Kept from scaffold:** TypeScript ^5.3 (`target es5`, `module es6`, `jsx react-jsx`, path alias `~/*→src/*`); webpack externals (`react→React`, `react-dom→ReactDOM`, `@blueprintjs/core→Blueprint.Core`, `@blueprintjs/select→Blueprint.Select`, `externalsType:'window'`); Webpack 5 → `extension.js` (`library.type:'module'`, `experiments.outputModule`); babel-loader (`@babel/preset-env|react|typescript`, config in `babel.config.cjs`); `build.sh`; ESLint 8 + typescript-eslint 5; Prettier; pnpm.

### Deltas to Apply (early implementation stories)

**1. Repurpose, not extend the palette:** remove `src/components/NavPalette.tsx`, `src/hooks/useRoamPages.ts`; update `package.json` description/keywords; audit `src/extension.tsx` exports `default { onload, onunload }`.

**2. Read-only enforcement — defense-in-depth (trust hierarchy):**
```
TS RoamPort type      ← BOUNDARY (compile): port type has NO write methods
Proxy sentinel        ← BOUNDARY (runtime/tests): default-DENY on window.roamAlphaAPI —
                        whitelist read methods (q, pull, getOpenPageOrBlockUid, util.*),
                        any other apply() throws → catches future write methods too
ESLint                ← HYGIENE only: no-restricted-properties on write methods
                        (createPage/createBlock/updateBlock/deleteBlock/moveBlock/
                         batchActions, data.* mutations) — syntactic, bypassable
as-cast hole closers  ← MANDATORY: @typescript-eslint/no-explicit-any +
                        no-non-null-assertion + ban `as` casts to the API
                        (else the TS boundary leaks via (api as any).createBlock())
meta-test             ← a test asserting the sentinel actually throws (control the control)
```
Note: `ui.mainWindow.openPage`/`openBlock` are **read-with-side-effect** (the DNP-materialize unknown, smoke #1) — explicitly whitelisted in the sentinel with a comment marking the most dangerous surface.

**3. Test infrastructure (babel-jest, NOT ts-jest):**
- Deps: `jest`, `babel-jest`, **`jest-environment-jsdom`**, **`@testing-library/react@^12.1.5`** (React 17 — NOT 13+), **`@testing-library/jest-dom`**.
- Config blockers (without these tests don't run): `babel.config.cjs` `env.test → preset-env targets.node:'current'`; jest `moduleNameMapper { '^~/(.*)$': '<rootDir>/src/$1' }`; jsdom stubs in setup (`scrollIntoView`, `getBoundingClientRect`, `matchMedia`).
- Structure: **jest projects — `unit` (node env: dateMath, isDNP, trailReducer, resolveMountPoint @100%) / `integration` (jsdom: mount/observer)**; fake timers convention for observer/mount (async → else flaky).
- **`tsc --noEmit` is a MANDATORY separate CI gate** (babel silently strips types); `coverageThreshold` on the adapter/pure-logic layer.

**4. Adapter contract verification (no provider available):**
- `tests/fixtures/roam-api/*.json` — responses captured once from REAL Roam, versioned (a frozen pact).
- shape-validator on fixtures (response shape can drift → port silently returns undefined).
- drift-detector script: diff live Roam response vs fixture, run at each Roam upgrade.
- smoke #1 (DNP materialize) → executable probe script, result committed to a log.

**5. TypeScript strict — sequence, don't big-bang:** enable full `strict` **in the same story as the RoamPort adapter** (the adapter is the single place Roam's surface gets typed). Before flipping the flag: run `tsc --noEmit`, count `noImplicitAny`/etc. violations, fix in a dedicated commit. (`useUnknownInCatchVariables` breaks `catch(e){e.message}`.)

**6. Runtime version-assertion in `onload`:** assert `window.React`/`ReactDOM`/`Blueprint` exist and major version matches expectation; degrade-to-absent with a clear console message if Roam ships React 18 (tests use our own React 17 and won't catch this).

**7. Teardown via disposables-pattern:** `onload` pushes every side-effect (observer, listeners, root, timers, injected styles) into a disposables array; `onunload` drains it. Structurally correct, not disciplinary; jsdom-tested (mount → onunload → assert listeners removed + nodes gone).

**8. Build hygiene:** prod `devtool:false` (inline-source-map bloats `extension.js`; Depot reviews size); pin `webpack >=5.80` (module-output + window-externals fragile below); `tsc --noEmit` npm-script.

**First implementation story:** "Repurpose scaffold + read-only enforcement + test/CI infra" (items 1-3, 8). Adapter + strict (items 2,4,5) follow as the foundation story; project init is already done.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical (block implementation):** Roam integration/route-detection strategy; mount strategy; RoamPort adapter shape; read-only enforcement (decided in §Starter).

**Important (shape architecture):** state management for trail/anchor; component composition of the unified bar; date-logic source of truth; lifecycle/teardown; styling/theming.

**Deferred (post-MVP):** Trail localStorage persistence; right-sidebar/multi-window; keyboard nav; calendar/datepicker jump. (All per PRD §7.2.)

**Not Applicable (no decision needed):**
- **Data Architecture** — no database; the only "data" is ephemeral in-memory trail state + transient reads from Roam's graph via query APIs.
- **Authentication & Security** — no auth surface; "security" here = the read-only safety invariant (covered by the defense-in-depth hierarchy in §Starter).
- **API & Communication** — no network, no services, no inter-process communication; the sole external surface is `window.roamAlphaAPI` (an in-process global).
- **Infrastructure & Deployment** — no hosting/scaling; "deployment" = a PR to the Roam Depot repo; "CI" = `build.sh` on GitHub Actions `ubuntu-24.04` (provided by Depot).

### Frontend / Plugin Architecture

**D-1 — Roam integration & route detection: hybrid, uid as source of truth.**
- `roamAlphaAPI.ui.mainWindow.getOpenPageOrBlockUid()` is the canonical "where am I"; `hashchange` is the cheap trigger; a debounced `MutationObserver` (narrow target, `document.contains` guard) handles re-attach when Roam re-creates the topbar/article.
- Resolve block-zoom uids → owning page before DNP classification; ignore right-sidebar route (main-window only, per §Context).
- Rationale: no native route event exists and the three sources (hash / API / DOM) update non-atomically; reading the API uid after a debounced settle avoids the race. Boring + resilient. Alternatives (pure polling / router-hook into Roam internals) rejected: CPU tax / private-API fragility.
- **⚠️ VERIFIED 2026-06-16 (Story 1.1, Roam v0.13.11):** `getOpenPageOrBlockUid()` is **async — `Promise<string | null>`** (NOT a sync string as assumed). The adapter MUST `await` it. Returns a uid string when a concrete page/block is open; `null` on the scrolling daily-log view or boot. uid stays the source of truth for identity/date-math.

**D-2 — Mount strategy: one long-lived container, perceptual continuity.**
- A single React 17 root (`ReactDOM.render`) into one plugin-owned node mounted as a sibling **above `.roam-article`**, never inside `.rm-topbar`. Placement computed by a pure `resolveMountPoint(document)`.
- The container persists across navigations; only its content updates (no per-route unmount → no flicker). Row height is reserved from first frame (no layout shift). Sticky under the topbar, verified across Roam modes (plain page, sidebar open, block-zoom, narrow window). Idempotent mount (`#roam-nav-root` guard).
- Degrade-to-absent per-feature: if the mount point is gone, render nowhere rather than into the topbar.

**D-3 — RoamPort adapter (anti-corruption layer).**
- A narrow, owned, **read-only** TypeScript interface exposing only the ~6 calls used (current uid, page title/type resolution, date utils, navigate). Single place Roam's surface is typed. `RealRoamAdapter` (thin, smoke-only) + `FakeRoamAdapter` (jsdom tests). Startup capability-probe → degrade-to-absent on missing methods. Selectively transcribe 2-3 non-trivial helpers from `roamjs-components` rather than depending on it.

**D-4 — State management: native, minimal.**
- `useReducer` + a small React context for the trail/anchor; the core is a **pure `trailReducer(state, event)`** (append visit, consecutive-dedup, DNP-reset/root, linear history). No Redux/MobX/Zustand — overkill for one ephemeral bar. In-memory only (resets on reload). Anchor date is derived, not stored (the open DNP *is* the anchor).
- Rationale: smallest moving part; reducer is 100%-unit-testable without DOM.

**D-5 — Component composition: one top-zone owner, two zones.**
- A single `NavBar` container owns the shared top zone and composes `TrailZone` (left, scrollable) + `DateStepperZone` (right, DNP-only). Avoids the two-independent-components fight for the same space. Stepper hidden when not on a DNP; Trail always present (empty → today's-DNP link).

**D-6 — Date logic: uid-canonical, util-first with fallback.**
- Page **uid** (`MM-DD-YYYY`) is the source of truth; title (`June 12th, 2026`) is display/fallback. Date math via `util.dateToPageUid`/`pageTitleToDate`, with a hand-rolled ordinal formatter fallback (dual path). "Today" = local device date. Boundary cases (month/year end, leap year) are explicit unit tests.
- **⚠️ VERIFIED 2026-06-16 (Story 1.1, Roam v0.13.11) — navigation goes by TITLE, not uid:** `openPage({ page: { uid } })` navigates ONLY to pages that already exist; for a non-existent date (the Stepper's core job) it silently no-ops. `openPage({ page: { title } })` navigates universally (existing AND empty dates) — confirmed read-only (no page materialized). **Rule: Date Stepper navigates via `util.dateToPageTitle(date)` → `openPage({ page: { title } })`.** uid remains canonical for identity/date-math only. `openBlock({ block: { uid } })` works for block targets. Timezone: `pageTitleToDate` returns local-midnight Date — use local date components / Roam `util.*` round-trip, never `.toISOString()` day-slicing.

**D-7 — Lifecycle: disposables pattern.**
- `onload` pushes every side-effect into a disposables array; `onunload` drains it (observer.disconnect, removeEventListener, `unmountComponentAtNode` + node remove, timers, injected styles). Plus a runtime React/Blueprint version-assertion in `onload`.

**D-8 — Styling & theming.**
- Blueprint v3 classes + a scoped `extension.css` (positioning/overflow only). Colors from theme tokens; follow `.bp3-dark` live (no color cached at mount). Scoped class prefix to avoid CSS bleed with Roam/community themes. Horizontal-scroll trail with edge fade affordance; guard against stealing trackpad swipe-back.

### Decision Impact Analysis

**Implementation sequence:** D-3 (adapter + read-only + strict) → D-7 (lifecycle/mount skeleton) → D-2 (mount/observer) → D-1 (route detection) → D-4 (trail store) → D-5/D-6/D-8 (UI + date + theme).

**Cross-component dependencies:** D-1 feeds the current-uid signal that drives both D-4 (trail events) and D-6 (anchor date). D-3 is the single seam every other component depends on (and the testability + read-only chokepoint). D-2's container is the host for D-5's UI. D-7 wraps all of them.

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined
Critical conflict points for THIS project are not DB/API/auth (N/A) but: (1) how Roam is accessed, (2) where DOM selectors live, (3) trail event/state shape, (4) degrade & logging, (5) theming. These are where independent implementers would diverge.

### Naming Patterns
**Code naming (the only naming surface — no DB/API):**
- Components & their files: `PascalCase` → `NavBar.tsx`, `TrailZone.tsx`, `DateStepperZone.tsx`, `Crumb.tsx`.
- Hooks: `useX` in `src/hooks/` → `useCurrentPage.ts`, `useTrail.ts`.
- Pure logic / non-React: `camelCase` files in `src/lib/` → `dateMath.ts`, `trailReducer.ts`, `resolveMountPoint.ts`, `roamPort.ts`.
- Functions `camelCase`; types/interfaces `PascalCase` (`RoamPort`, `Crumb`, `TrailState`); constants `UPPER_SNAKE`.
- Class/CSS prefix: every plugin class is `rn-` prefixed (`rn-bar`, `rn-crumb`, `rn-stepper`) — the CSS-isolation rule.

**Not Applicable:** database naming, REST endpoint/route/query-param naming, header conventions — no such surfaces.

### Structure Patterns
```
src/
  extension.tsx            # onload/onunload only — wires disposables, mounts, NOTHING else
  lib/
    roamPort.ts            # RoamPort interface (read-only type) + RealRoamAdapter
    roamPort.fake.ts       # FakeRoamAdapter for tests
    dateMath.ts            # pure: stepDate, isDNP, uid<->date
    trailReducer.ts        # pure: (state, event) => state
    resolveMountPoint.ts   # pure: (document) => HTMLElement | null
    dom.ts                 # ALL Roam DOM selectors, centralized (.rm-topbar/.roam-article/...)
    log.ts                 # namespaced logger + debug flag
    disposables.ts         # disposables array helper
  hooks/  useCurrentPage.ts  useTrail.ts
  components/  NavBar.tsx  TrailZone.tsx  DateStepperZone.tsx  Crumb.tsx
  types/  roam.d.ts
extension.css              # rn- scoped, positioning/overflow only
tests/
  fixtures/roam-api/*.json # captured-from-real-Roam pacts
  integration/             # jsdom mount/observer
*.test.ts co-located       # pure-logic unit tests next to lib/ files
```
- **Pure logic unit tests are co-located** (`dateMath.test.ts` beside `dateMath.ts`); **integration tests** live under `tests/integration/`; **fixtures** under `tests/fixtures/roam-api/`.

### Format Patterns
- **Crumb shape (canonical):** `{ uid: string; title: string; ts: number }`. uid for navigation, title for display.
- **Dates:** uid form `MM-DD-YYYY`; display via Roam title (`June 12th, 2026`); never hand-format for navigation — always derive uid.
- Field naming `camelCase` (TS-native). No API wrappers / status codes (N/A).

### Communication Patterns
- **All graph access goes through `RoamPort`.** Direct `window.roamAlphaAPI` references are FORBIDDEN anywhere except `RealRoamAdapter` (enforced by lint + review). This is the single most important consistency rule.
- **All Roam DOM selectors live in `lib/dom.ts`.** No raw `document.querySelector('.rm-...')` scattered in components — when Roam changes its DOM, exactly one file changes.
- **Trail events** (immutable reducer): past-tense domain names — `pageVisited`, `dnpOpened`. State updates are pure/immutable (spread, no mutation). Anchor date is derived from current page, never stored as a separate event.
- **Logging:** `log.ts` exports a namespaced logger; every message prefixed `[roam-nav]`; gated by a `debug` flag; on startup log the capability-probe snapshot (which roamAlphaAPI methods were present).

### Process Patterns
- **Degrade-to-absent, per-feature:** every adapter/DOM access is wrapped; on failure the *affected* feature renders nothing and logs once — it never throws into Roam and never takes down the other feature. A shared `safe()`/try-boundary helper, not ad-hoc try/catch.
- **No error UI:** the plugin shows no error toasts/banners; failure = silent absence + console log (north-star: invisible until useful).
- **Loading states:** none needed (reads are synchronous/near-instant); do not invent spinners.
- **Read-only:** write methods are unreachable (port has none); `ui.mainWindow.openPage/openBlock` are the only side-effecting calls, whitelisted with a `// read-with-side-effect` comment + covered by smoke #1.

### Enforcement Guidelines
**All implementers MUST:**
- Access Roam data/navigation ONLY through `RoamPort`; never import or touch `window.roamAlphaAPI` outside `RealRoamAdapter`.
- Reference Roam DOM ONLY via `lib/dom.ts`; never inject into `.rm-topbar`.
- Keep pure logic (`dateMath`, `trailReducer`, `resolveMountPoint`) free of DOM/Roam imports so it stays 100% unit-testable.
- Register every side-effect in `disposables`; verify teardown in a jsdom test.
- Prefix all CSS classes with `rn-`; take all colors from theme tokens (no hard-coded hex).

**Enforcement:** ESLint (`no-restricted-imports`/`no-restricted-properties` for `roamAlphaAPI` outside the adapter; ban hard-coded color literals in plugin CSS via review), `tsc --noEmit` gate, the runtime Proxy-sentinel in tests, and a PR review checklist.

### Pattern Examples
**Good:** `const uid = port.getCurrentUid()` · `mount(resolveMountPoint(document))` · `dispatch({type:'pageVisited', crumb})` · selector `DOM.article` from `lib/dom.ts`.
**Anti-patterns:** `window.roamAlphaAPI.ui.mainWindow.openPage(...)` in a component · `document.querySelector('.rm-topbar').appendChild(...)` · `state.crumbs.push(c)` (mutation) · `style="color:#2b5797"` hard-coded · a global try/catch that hides which feature failed.

## Project Structure & Boundaries

### Complete Project Directory Structure
```
roam-nav/
├── extension.js                  # webpack output — Roam Depot entry (gitignored or committed per Depot)
├── extension.css                 # rn- scoped: bar positioning, overflow, sticky, edge-fade
├── build.sh                      # npm install --legacy-peer-deps && npm run build (ubuntu-24.04 CI)
├── package.json                  # scripts: dev, build, typecheck, lint, test, test:unit, test:int
├── webpack.config.cjs            # externals (React/ReactDOM/Blueprint), module output; prod devtool:false
├── babel.config.cjs              # presets env/react/typescript + env.test (targets.node:current)
├── tsconfig.json                 # strict:true (enabled with the adapter story), paths ~/*→src/*
├── jest.config.cjs               # projects: unit(node) + integration(jsdom); moduleNameMapper ~/*
├── jest.setup.cjs                # @testing-library/jest-dom; jsdom stubs; roamAlphaAPI Proxy-sentinel
├── .eslintrc.cjs                 # no-restricted-imports/properties (roamAlphaAPI), no-explicit-any, no-non-null
├── .gitignore  .prettierrc.json
├── .github/workflows/ci.yml      # lint + typecheck(tsc --noEmit) + test + build (gates)
├── src/
│   ├── extension.tsx             # onload/onunload ONLY — version-assert, build disposables, mount
│   ├── lib/
│   │   ├── roamPort.ts           # RoamPort interface (read-only) + RealRoamAdapter + capability-probe
│   │   ├── roamPort.fake.ts      # FakeRoamAdapter (tests)
│   │   ├── dateMath.ts           # pure: stepDate(uid,±n), isDNP(uid|title), uid<->date, ordinal fallback
│   │   ├── trailReducer.ts       # pure: (TrailState, TrailEvent) => TrailState
│   │   ├── resolveMountPoint.ts  # pure: (Document) => HTMLElement | null
│   │   ├── dom.ts                # ALL Roam selectors (.rm-topbar/.roam-article/.rm-title-display…)
│   │   ├── log.ts                # namespaced [roam-nav] logger + debug flag
│   │   └── disposables.ts        # Disposable[] helper (push/drain)
│   ├── mount/
│   │   ├── mountManager.ts       # observer lifecycle, self-healing re-attach, idempotent root
│   │   └── routeWatcher.ts       # hashchange + getOpenPageOrBlockUid (debounced) → currentUid signal
│   ├── hooks/
│   │   ├── useCurrentPage.ts     # subscribes to routeWatcher → {uid,title,isDNP}
│   │   └── useTrail.ts           # useReducer(trailReducer) + dispatch on page changes
│   ├── components/
│   │   ├── NavBar.tsx            # top-zone owner; composes the two zones; reserves height
│   │   ├── TrailZone.tsx         # crumbs, horizontal scroll, edge fade, empty→today link
│   │   ├── DateStepperZone.tsx   # prev/next dated controls; rendered only when isDNP
│   │   └── Crumb.tsx             # single crumb (root/default/current variants)
│   ├── types/
│   │   └── roam.d.ts             # window.roamAlphaAPI / window.Blueprint type decls (the ONE typing site)
│   └── styles/                   # (optional) co-located css-module-ish partials, all rn- prefixed
├── tests/
│   ├── fixtures/roam-api/        # *.json captured from REAL Roam (frozen pacts)
│   ├── integration/              # jsdom: mount, observer re-attach, teardown, sentinel meta-test
│   └── contract/
│       ├── probe.md              # manual dev-console snippet incl. smoke #1 (DNP materialize)
│       └── drift.md              # how to diff live Roam vs fixtures at each Roam upgrade
└── docs/                         # existing project docs (CONTEXT/ARCHITECTURE = legacy palette, OUT of scope)
```
*(pure-logic `*.test.ts` co-located beside each `lib/` file.)*

### Architectural Boundaries

**The RoamPort boundary (primary seam).** `src/lib/roamPort.ts` is the ONLY module importing/touching `window.roamAlphaAPI`. Everything else depends on the `RoamPort` interface. This is simultaneously the testability seam (swap FakeRoamAdapter), the read-only chokepoint (no write methods in the type), and the version/contract-drift firewall.

**The DOM boundary.** `src/lib/dom.ts` is the ONLY module with Roam CSS selectors. Mount/observer code consumes named selectors; a Roam DOM change touches one file. Never select or attach inside `.rm-topbar`.

**The pure-core boundary.** `dateMath`, `trailReducer`, `resolveMountPoint` import NOTHING from React/Roam/DOM → 100% unit-testable, deterministic.

**The React-root boundary.** Exactly one root, owned by `mountManager`, hosting `NavBar`. UI never mounts itself; it is mounted.

**Not Applicable:** API boundaries, service boundaries, external data boundaries, auth boundaries — no network, services, database, or auth in this plugin.

### Requirements → Structure Mapping
| FR | Lives in |
|----|----------|
| FR-1 render Stepper only on DNP | `useCurrentPage` (isDNP) → `DateStepperZone` (conditional render) |
| FR-2 step ±1 day, re-anchor | `dateMath.stepDate` + `roamPort.openPage`; anchor derived in `useCurrentPage` |
| FR-3 open empty date, no write | `roamPort` (read-only; openPage whitelisted) + `tests/contract/probe.md` (smoke #1) |
| FR-4 trail row outside topbar | `resolveMountPoint` + `mountManager` + `dom.ts` + `extension.css` |
| FR-5 track visited as crumbs | `routeWatcher` → `useTrail` → `trailReducer` (append, consecutive-dedup) |
| FR-6 DNP resets/roots trail | `trailReducer` (dnpOpened event) |
| FR-7 click crumb to return | `Crumb.tsx` → `roamPort.openPage` |
| Empty trail → today link | `TrailZone` (empty state) + `dateMath` (today uid) |

### Integration Points
- **Internal:** `routeWatcher` emits the current-uid signal → consumed by `useCurrentPage` (anchor/isDNP) and `useTrail` (trail events). `RoamPort` is the data/navigation conduit. React context carries trail state to `NavBar`'s children.
- **External (host globals only):** `window.roamAlphaAPI` (read + navigate), `window.React`/`ReactDOM` (render root), `window.Blueprint` (UI primitives). No third-party services.
- **Data flow:** Roam route change → `routeWatcher` (debounced) → `RoamPort.getCurrentUid/resolve` → hooks update → reducer → `NavBar` re-renders content in the persistent container (no remount).

### File Organization Patterns
- **Config:** all root-level (`webpack/babel/jest/tsconfig/eslint`), CI under `.github/workflows/`.
- **Source:** by responsibility — `lib/` (pure + adapter + seams), `mount/` (lifecycle), `hooks/` (Roam→React glue), `components/` (UI). No barrel files that hide the RoamPort/DOM boundaries.
- **Tests:** pure unit co-located; jsdom integration in `tests/integration/`; fixtures + manual contract/probe docs in `tests/`.
- **Assets:** single `extension.css` (rn- scoped); no images/fonts (inherits Roam).

### Development Workflow Integration
- **Dev:** `pnpm dev` (`webpack --watch`) → load unpacked `extension.js` in Roam (developer mode).
- **Build:** `pnpm build` (prod, `devtool:false`) → `extension.js`; `build.sh` mirrors this for Depot CI.
- **Gates (`ci.yml`):** `lint` → `typecheck` (`tsc --noEmit`) → `test` (unit+integration) → `build`. Manual `tests/contract/probe.md` run before release and at each Roam upgrade.
- **Deploy:** PR to `Roam-Research/roam-depot` with the metadata JSON entry.

## Architecture Validation Results

### Coherence Validation ✅
- **Decision compatibility:** versions are locked by Roam (React 17 / Blueprint v3) — no version conflicts possible; the test stack (Jest + babel-jest + RTL 12) is pinned to React 17. babel-build + `tsc --noEmit` gate are complementary, not contradictory. No contradictory decisions found.
- **Pattern consistency:** the RoamPort/DOM/pure-core boundaries (D-3, patterns) directly implement the read-only invariant and testability seams; naming/structure rules align with the chosen TS+React+Webpack stack.
- **Structure alignment:** the directory tree realizes every boundary (one adapter file, one DOM file, pure `lib/`), and the mount/route split (D-1/D-2) maps cleanly to `mount/`.

### Requirements Coverage Validation ✅
- **Functional (FR-1..7):** every FR is mapped to concrete files in §Requirements→Structure; no orphan FRs, no orphan components.
- **UX coverage:** unified bar (D-5), overflow scroll, sticky/perceptual-continuity (D-2), theme-awareness (D-8), empty→today link all trace to EXPERIENCE.md.
- **NFRs:** header integrity (DOM boundary + mount above `.roam-article`), DOM/route resilience (self-healing observer), read-only (defense-in-depth), lightweight (debounce + no full-graph scans), observability (log+probe), lifecycle (disposables) — each has an owning mechanism.

### Implementation Readiness Validation ✅
- **Decisions:** complete, versioned, with rationale; sequencing defined (D-3→D-7→D-2→D-1→D-4→UI).
- **Structure:** complete, specific tree (not placeholders); boundaries explicit.
- **Patterns:** conflict points (Roam access, DOM, state, degrade, theming) all have rules + good/anti examples; enforceable via ESLint + tsc + Proxy-sentinel.

### Gap Analysis Results
- **Critical gaps:** none. The architecture is robust to both outcomes of the open empirical question.
- **Important gaps (verification, not architectural):**
  - **Smoke #1 — does navigating to a non-existent DNP materialize a page?** Must be confirmed in real Roam before the read-only invariant is declared closed. If it DOES write, add a navigation guard (architecture already isolates the single openPage call to absorb this with minimal change).
  - **Roam API signatures** (`openPage` vs `openBlock` param shapes, `util.*`) — verify against live `window.roamAlphaAPI` when building the adapter (captured into fixtures).
- **Nice-to-have:** localStorage persistence, sidebar/multi-window, keyboard nav, calendar — already deferred (PRD §7.2).

### Validation Issues Addressed
The two important gaps are **pre-implementation verification tasks**, codified as `tests/contract/probe.md` and run as the first build action; neither changes the architecture, both are absorbed by the RoamPort seam.

### Architecture Completeness Checklist
**Requirements Analysis**
- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed
- [x] Technical constraints identified
- [x] Cross-cutting concerns mapped

**Architectural Decisions**
- [x] Critical decisions documented with versions
- [x] Technology stack fully specified
- [x] Integration patterns defined
- [x] Performance considerations addressed

**Implementation Patterns**
- [x] Naming conventions established
- [x] Structure patterns defined
- [x] Communication patterns specified
- [x] Process patterns documented

**Project Structure**
- [x] Complete directory structure defined
- [x] Component boundaries established
- [x] Integration points mapped
- [x] Requirements to structure mapping complete

### Architecture Readiness Assessment
**Overall Status:** READY FOR IMPLEMENTATION — all 16 checklist items confirmed, no Critical Gaps. One pre-implementation verification gate (smoke #1) precedes coding but does not alter the design.

**Confidence Level:** high — small, well-bounded surface; the dominant risks (Roam API drift, read-only, header integrity) each have a named, testable mechanism.

**Key Strengths:** single RoamPort seam (testability + read-only + drift firewall in one place); per-feature degrade-to-absent; pure-core at 100% coverage; design unaffected by the one open empirical unknown.

**Areas for Future Enhancement:** trail persistence, sidebar/multi-window, keyboard nav, calendar jump (all deferred).

### Implementation Handoff
**AI Agent Guidelines:** follow decisions exactly; access Roam only via `RoamPort`; touch Roam DOM only via `lib/dom.ts`; never inject into `.rm-topbar`; register all side-effects in disposables; keep pure-core dependency-free.

**First Implementation Priority:** run `tests/contract/probe.md` smoke #1 (confirm read-only on DNP navigation) → then story "Repurpose scaffold + read-only enforcement + test/CI infra" → then the RoamPort adapter + strict story.
