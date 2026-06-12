---
stepsCompleted: [1, 2, 3, 4]
inputDocuments:
  - .bmad/planning-artifacts/prds/prd-roam-nav-2026-06-12/prd.md
  - .bmad/planning-artifacts/ux-designs/ux-roam-nav-2026-06-12/DESIGN.md
  - .bmad/planning-artifacts/ux-designs/ux-roam-nav-2026-06-12/EXPERIENCE.md
  - .bmad/planning-artifacts/architecture.md
---

# roam-nav - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for roam-nav, decomposing the requirements from the PRD, UX Design (DESIGN.md + EXPERIENCE.md), and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

**Feature 4.1 — Date Stepper**

FR-1: Render the Date Stepper only on a DNP — previous-day / next-day controls are visible whenever an Anchor DNP is open and never otherwise (absent on non-date pages and on the scrolling daily-log view); the Anchor DNP is re-derived on every navigation (no stored anchor memory).

FR-2: Step to the adjacent day — clicking "previous day" / "next day" navigates to the DNP exactly one calendar day before/after the Anchor DNP (computed via Roam `util.dateToPageUid`/`dateToPageTitle`); the destination becomes the new Anchor DNP and the Stepper re-renders; no depth bound (arbitrary past/future stepping).

FR-3: Open a non-existent date without writing to the graph — navigating to a target DNP with no page node opens the empty page shell and leaves the graph unchanged (no `createPage` or any write; navigation via `ui.mainWindow.openPage`/`openBlock`; graph page count identical before/after).

**Feature 4.2 — Navigation Trail**

FR-4: Render the Trail in its own row, never in the header — the Trail bar mounts as a sibling element above `.roam-article`, never a descendant of `.rm-topbar`; its own single-line overflow handling; (re)attaches across Roam navigations via MutationObserver; degrade-to-absent if the mount point disappears (never falls back into the top bar); theme-aware via theme tokens.

FR-5: Track visited pages as ordered Crumbs — on each main-window navigation the visited page is appended as a Crumb (readable title via `:node/title`); order is Trail Root → most recent (left → right); consecutive duplicate visits de-duplicated; only main-window navigation tracked (sidebar ignored); in-memory only (resets on full Roam reload).

FR-6: A DNP resets and roots the Trail — opening any DNP clears all Crumbs and makes that DNP the first Crumb (Trail Root); subsequent visits append after it; if no DNP has been opened this session, the Trail Root is today's DNP (virtual root).

FR-7: Navigate back by clicking a Crumb — clicking any Crumb opens that page in the main window (`ui.mainWindow.openPage` on the Crumb's uid); clicking an earlier Crumb does NOT trim later Crumbs (the Trail stays a true visit history).

### NonFunctional Requirements

**Cross-cutting (PRD §6):**

NFR-1: Header integrity (load-bearing) — no roam-nav UI is injected into `.rm-topbar`'s internal flex row or otherwise alters the size/position of Roam's native top-bar controls. The explicit anti-pattern this product exists to avoid.

NFR-2: DOM resilience — UI mounts via observers and re-attaches on navigation; a Roam top-bar/article DOM restructure must degrade to "feature absent," never to "header broken."

NFR-3: Read-only safety — all graph access is read/query + navigation APIs; zero write APIs in v1.

NFR-4: Lightweight — navigation tracking and re-render are cheap (no full-graph scans on route change; debounced/narrow observer with a `document.contains` guard); date math uses Roam's own `util.*` helpers.

NFR-5: API-shape verification — exact `roamAlphaAPI.ui.mainWindow.*` and `util.*` signatures are re-verified against the live `window.roamAlphaAPI` in a Roam dev console before/at implementation.

NFR-6: Felt quality — beyond "header not broken," the Trail and Stepper read as native, calm Roam chrome (north-star §1.2: invisible until useful, one glance to orient, one click to recover).

**Architecture-shaping (architecture.md):**

NFR-7: Perceptual continuity — the bar is ONE long-lived container whose content updates in place (no unmount/remount per route → no flicker); row height reserved from the first frame (no layout shift); sticky verified across Roam modes (plain page, sidebar open, block-zoom, narrow window); theme changes flow live (no color cached at mount).

NFR-8: Lifecycle / teardown — clean `onunload`: disconnect observers, remove listeners, `unmountComponentAtNode` + remove root (React 17 API, NOT `createRoot`), cancel timers, strip injected styles; idempotent mount (no double bar on reload).

NFR-9: Observability — namespaced `console` logger (`[roam-nav]`) + debug flag; capability-probe snapshot logged at startup (which API methods were present).

NFR-10: Style isolation — scoped `rn-` class names so plugin CSS and Roam/Blueprint/community-theme CSS don't bleed into each other; no hard-coded color literals.

**Feature-specific (PRD §4.2):**

NFR-11: Trail single-line horizontal scroll on overflow (no dropdown); Trail Root (📅) pinned far-left, current page far-right so orientation never breaks (UX decision D2).

NFR-12: Long Crumb titles truncate (middle-ellipsis) rather than wrap.

### Additional Requirements

_From Architecture (architecture.md) — technical requirements that shape implementation and early-epic stories._

**Starter template (Architecture §Starter Template Evaluation):**
- **Selected starter: the existing in-repo scaffold, repurposed (NOT regenerated).** Built for the superseded Cmd+K palette → must be retargeted. This directly drives Epic 1 Story 1.
- Kept from scaffold: TypeScript ^5.3 (`target es5`, `module es6`, `jsx react-jsx`, path alias `~/*→src/*`); webpack externals (`react→React`, `react-dom→ReactDOM`, `@blueprintjs/core→Blueprint.Core`, `@blueprintjs/select→Blueprint.Select`); Webpack 5 module output → `extension.js`; babel-loader; ESLint 8 + typescript-eslint 5; Prettier; pnpm.
- Repurpose delta: remove `src/components/NavPalette.tsx`, `src/hooks/useRoamPages.ts`; update `package.json` description/keywords; audit `src/extension.tsx` exports `default { onload, onunload }`.
- `roamjs-components` is a **pattern reference only, NOT bundled** — selectively transcribe 2-3 non-trivial helpers (date resolution, ref parsing) under own signatures.

**Read-only enforcement — defense-in-depth (Architecture §Starter delta 2 + Patterns):**
- TS RoamPort type exposes NO write methods (compile-time boundary).
- Runtime Proxy-sentinel on `window.roamAlphaAPI`: default-DENY, whitelist read methods (`q`, `pull`, `getOpenPageOrBlockUid`, `util.*`); any other `apply()` throws. `openPage`/`openBlock` whitelisted as `// read-with-side-effect`.
- ESLint hygiene: `no-restricted-properties` on write methods; `no-explicit-any` + `no-non-null-assertion` + ban `as` casts to the API (close the TS-boundary leak).
- Meta-test: a test asserting the sentinel actually throws.

**Test & CI infrastructure (Architecture §Starter delta 3, 8 + Workflow):**
- babel-jest (NOT ts-jest); deps: `jest`, `babel-jest`, `jest-environment-jsdom`, `@testing-library/react@^12.1.5` (React 17), `@testing-library/jest-dom`.
- Jest projects: `unit` (node env: dateMath, isDNP, trailReducer, resolveMountPoint @100%) / `integration` (jsdom: mount/observer); fake-timers convention.
- Config blockers: `babel.config.cjs` `env.test → targets.node:'current'`; jest `moduleNameMapper { '^~/(.*)$': '<rootDir>/src/$1' }`; jsdom stubs (`scrollIntoView`, `getBoundingClientRect`, `matchMedia`).
- `tsc --noEmit` is a MANDATORY separate CI gate (babel silently strips types); `coverageThreshold` on adapter/pure-logic.
- CI gates (`ci.yml`): `lint` → `typecheck` → `test` (unit+integration) → `build`.
- Build hygiene: prod `devtool:false`; pin `webpack >=5.80`; `tsc --noEmit` npm-script.

**Adapter contract verification (Architecture §Starter delta 4):**
- `tests/fixtures/roam-api/*.json` — responses captured once from REAL Roam, versioned (frozen pact).
- Shape-validator on fixtures; drift-detector script (diff live Roam vs fixture at each Roam upgrade).

**TypeScript strict (Architecture §Starter delta 5):**
- Enable full `strict` in the SAME story as the RoamPort adapter (the single place Roam's surface gets typed); before flipping, count + fix `noImplicitAny` violations in a dedicated commit.

**Runtime version-assertion (Architecture §Starter delta 6):**
- In `onload`, assert `window.React`/`ReactDOM`/`Blueprint` exist and major version matches (React 17, Blueprint v3); degrade-to-absent with a clear console message if Roam ships React 18.

**Pre-implementation verification gate (Architecture §Verification Blocker + Gap Analysis):**
- **Smoke #1 — does navigating to a non-existent DNP materialize a page in the graph?** Executable dev-console probe in real Roam (navigate → assert page NOT created), result committed to a log. This is the FIRST build action and gates the read-only invariant; if it DOES write, add a navigation guard around the single `openPage` call.

### UX Design Requirements

_From DESIGN.md (visual identity) and EXPERIENCE.md (behavior/states). Each is specific enough to drive a story with testable AC._

UX-DR1: Unified single-row bar, two zones — one horizontal row, height `32px`, mounted in its own row directly under `.rm-topbar` and above `.roam-article`. Trail zone left (`flex:1`, scrollable); Stepper zone right (fixed-width), separated by a hairline divider; horizontal padding `14px` aligns content with the article gutter.

UX-DR2: Design-token color system (light + dark) — full palette for `bar.bg/border`, `crumb.fg/root.fg/current.fg/hover.bg`, `sep.fg`, `step.fg/hover.fg/arrow.fg` in both light and `.bp3-dark`; every value from Blueprint v3 / Roam theme tokens, NO hard-coded hex.

UX-DR3: Typography tokens — inherit Roam/system font stack; crumb `13px`; DNP root and current page at weight `600`; stepper labels `12px`/weight `400` (quieter than the page H1).

UX-DR4: navbar component — container row with `bar.bg` background and bottom `bar.border` hairline; two zones (`.trail` left flex/scroll, `.stepper` right fixed); on a non-DNP surface the `.stepper` zone is OMITTED entirely (not greyed).

UX-DR5: crumb component — clickable page reference; three variants: **root** (DNP, prefixed small 📅, weight 600), **default** (visited page, link-blue resting, hover `crumb.hover.bg` pill), **current** (open page, weight 600, persistent `crumb.hover.bg` fill, NOT clickable/inert); labels middle-ellipsis at `180px`; separated by a `›` glyph in `sep.fg`.

UX-DR6: stepper-control component — two compact controls flanking the H1 date: previous day (`‹ Jun 11`) and next day (`Jun 13 ›`); ALWAYS shows the adjacent target dates (decision D3), never bare arrows; arrow glyph in `step.arrow.fg`, date label in `step.fg` brightening to `step.hover.fg` on hover.

UX-DR7: overflow-scroller — the `.trail` zone scrolls horizontally (wheel / trackpad / drag) when crumbs exceed width; thin (~5px) themed scrollbar on overflow; the 📅 root stays far-left and the current crumb far-right; NO dropdown (decision D2); edge-fade affordance; guard against stealing trackpad swipe-back.

UX-DR8: Live theme-awareness — the bar follows Roam light / `.bp3-dark` automatically via tokens; no color cached at mount (toggle dark mode → text/background follow live).

UX-DR9: Voice & microcopy — stepper labels are abbreviated adjacent dates localized to Roam's date format; tooltips / aria-labels are full and explicit ("Previous day, June 11th, 2026" / "Next day, June 13th, 2026"; crumb: "Go to {page title}"); no inline empty-state sentences.

UX-DR10: Accessibility floor — crumbs and stepper controls are semantic `<button>`/`<a>` with descriptive `aria-label`s; visible focus ring on every interactive element; hit target ≥ `24px`; the current page announced via `aria-current="page"`; no information conveyed by color alone (📅 icon + weight mark the root, position marks current).

UX-DR11: Sticky + no layout shift — the bar stays pinned under the topbar as the article scrolls; row height reserved from the first frame so there is no layout shift; sticky verified across Roam modes (plain page, sidebar open, block-zoom, narrow window).

UX-DR12: Flat elevation & shape — flat surface, single bottom hairline as the only separation from the article (no shadows, no raised surface); rounded `4px` on interactive hit areas (crumbs, stepper) on hover/focus only; the bar itself is a plain rectangle flush with Roam's chrome.

### FR Coverage Map

FR-1: Epic 1 — Date Stepper renders only on a DNP
FR-2: Epic 1 — Step ±1 day, re-anchor, arbitrary depth
FR-3: Epic 1 — Open a non-existent date without writing to the graph
FR-4: Epic 1 (structural) — bar mounts in its own row, never in `.rm-topbar` (mount mechanism, header integrity, theme, degrade-to-absent); Epic 2 (content) — trail overflow behavior in that row
FR-5: Epic 2 — Track visited pages as ordered Crumbs
FR-6: Epic 2 — A DNP resets and roots the Trail
FR-7: Epic 2 — Navigate back by clicking a Crumb

## Epic List

### Epic 1: Date Stepper
A header-safe roam-nav bar mounts in its own row (never in `.rm-topbar`) and, on any DNP, gives the user working previous/next-day stepping with arbitrary depth and re-anchoring — realizing UJ-1 (scan a week without losing your place). This epic also lays the shared foundation every later capability depends on: the smoke #1 read-only probe, the repurposed scaffold, read-only defense-in-depth, the test/CI infrastructure, the RoamPort adapter under TypeScript strict, the lifecycle/disposables mount skeleton, route detection, and the unified NavBar container with live theming. Standalone: after this epic the user has a complete, valuable date-stepping tool.
**FRs covered:** FR-1, FR-2, FR-3 (+ FR-4 structural: the bar/container, header-integrity mount, theme, degrade-to-absent)

### Epic 2: Navigation Trail
The roam-nav bar now tracks the pages visited since the last DNP as ordered Crumbs, resets and roots itself whenever a DNP is opened, scrolls horizontally on overflow (Root + current pinned at the ends), and returns the user to any earlier page in one click — realizing UJ-2 (climb out of a rabbit hole). Builds on Epic 1's mounted container and RoamPort seam by adding the TrailZone, the pure trailReducer, crumb tracking, and the overflow-scroller. Standalone: a complete visited-history navigation capability layered onto the existing bar.
**FRs covered:** FR-5, FR-6, FR-7 (+ FR-4 content: trail overflow/scroll behavior in the bar's row)

## Epic 1: Date Stepper

A header-safe roam-nav bar mounts in its own row (never in `.rm-topbar`) and, on any DNP, gives the user working previous/next-day stepping with arbitrary depth and re-anchoring — realizing UJ-1. This epic is the **walking skeleton**: a vertical slice through every architectural layer (route → mount → port → render → theme) with the smallest possible UI, plus the shared foundation (read-only RoamPort seam, defense-in-depth, test/CI, lifecycle) that Epic 2 reuses in full. It is accepted not when "the Stepper works" but when every layer of the channel is proven.

**FRs covered:** FR-1, FR-2, FR-3 (+ FR-4 structural). **Relevant NFRs:** NFR-1 (header integrity), NFR-2 (DOM resilience), NFR-3 (read-only), NFR-4 (lightweight), NFR-5 (API verification), NFR-7 (perceptual continuity), NFR-8 (lifecycle), NFR-9 (observability), NFR-10 (style isolation). **Relevant UX-DRs:** 1, 2, 3, 4, 6, 8, 9, 10, 11, 12.

### Story 1.1: Verify read-only DNP navigation and freeze Roam API fixtures

As the builder of roam-nav,
I want an executable probe that confirms whether navigating to a non-existent DNP materializes a page in the graph, and a set of captured-from-real-Roam API responses,
So that the read-only invariant (FR-3) rests on evidence rather than assumption and the FakeRoamAdapter is built against a true contract, not a guess.

**Acceptance Criteria:**

**Given** a real Roam graph open in a dev console
**When** the probe in `tests/contract/probe.md` navigates via `ui.mainWindow.openPage`/`openBlock` to a date uid that has no page node, then queries whether that page now exists
**Then** the result (materialized / not-materialized) is recorded in a committed log with the date and the Roam version
**And** a binary decision `guard_required ∈ {yes, no, conditional}` is written into the log as the scoping input for the rest of the epic.

**Given** the probe session in real Roam
**When** the actual responses of the calls roam-nav depends on (`getOpenPageOrBlockUid`, `q`/`pull` for `:node/title`, `util.dateToPageUid`/`pageTitleToDate`/`dateToPageTitle`) are captured
**Then** they are saved as versioned JSON pacts under `tests/fixtures/roam-api/*.json`
**And** a shape-validator asserts each fixture matches the expected response shape.

**Given** the `guard_required` decision is `yes` or `conditional`
**When** Story 1.9 (Date Stepper) is scoped
**Then** a navigation guard around the single `openPage` call is added to its scope before implementation begins (the decision is an input to 1.9, not a surprise inside it).

### Story 1.2: Repurpose the scaffold and stand up the test/CI infrastructure

As the builder of roam-nav,
I want the inherited Cmd+K-palette scaffold retargeted to roam-nav and a working test/CI pipeline,
So that every later story lands in a project that compiles, tests, and gates correctly from the first commit.

**Acceptance Criteria:**

**Given** the existing in-repo scaffold built for the superseded palette
**When** the repurpose runs
**Then** `src/components/NavPalette.tsx` and `src/hooks/useRoamPages.ts` are removed, `package.json` description/keywords are updated to roam-nav, and `src/extension.tsx` exports `default { onload, onunload }`
**And** the webpack externals (`react→React`, `react-dom→ReactDOM`, `@blueprintjs/core→Blueprint.Core`, `@blueprintjs/select→Blueprint.Select`) and module output to a single `extension.js` are preserved.

**Given** the test toolchain
**When** it is configured
**Then** `babel-jest` (not ts-jest), `jest-environment-jsdom`, `@testing-library/react@^12.1.5` (React 17), and `@testing-library/jest-dom` are installed
**And** jest is configured with two projects — `unit` (node env) and `integration` (jsdom) — plus `moduleNameMapper { '^~/(.*)$': '<rootDir>/src/$1' }` and jsdom stubs (`scrollIntoView`, `getBoundingClientRect`, `matchMedia`).

**Given** the CI pipeline `.github/workflows/ci.yml`
**When** it runs on a push
**Then** the gates execute in order `lint → typecheck (tsc --noEmit) → test (unit+integration) → build`
**And** a failure in any gate fails the build
**And** production build uses `devtool:false` and webpack is pinned `>=5.80`.

**Given** a trivial pure module with a passing co-located `*.test.ts`
**When** `pnpm test` runs
**Then** both jest projects discover and run their tests green, proving the harness works end to end.

### Story 1.3: Introduce the read-only RoamPort adapter under TypeScript strict

As the builder of roam-nav,
I want a single narrow read-only adapter that is the only module touching `window.roamAlphaAPI`, typed under full TypeScript strict,
So that Roam's untyped rolling surface is contained at one seam that is simultaneously the testability, read-only, and drift-firewall boundary.

**Acceptance Criteria:**

**Given** the adapter module `src/lib/roamPort.ts`
**When** the `RoamPort` interface is defined
**Then** it exposes only the read/navigate calls actually used (current uid, page title/type resolution, date utils, `openPage`/`openBlock`) and **no write methods**
**And** `RealRoamAdapter` implements it against `window.roamAlphaAPI` and is the ONLY module in the codebase that references that global.

**Given** a `FakeRoamAdapter` in `src/lib/roamPort.fake.ts` backed by the frozen fixtures from Story 1.1
**When** unit/integration tests run
**Then** they exercise the port through the fake with no real Roam present.

**Given** the adapter is the first real typed TS code
**When** `tsconfig.json` flips `strict: true` as part of this story's Definition of Done
**Then** `tsc --noEmit` passes clean with zero `noImplicitAny`/strict violations (any pre-existing violations are counted and fixed in a dedicated commit before the flip).

**Given** startup
**When** the adapter's capability-probe runs
**Then** it records which `roamAlphaAPI` methods were present, and any missing method causes that capability to degrade-to-absent rather than throw.

### Story 1.4: Enforce the read-only invariant with defense-in-depth

As the builder of roam-nav,
I want the read-only guarantee enforced at runtime and in CI, not just by convention,
So that no future code — in this epic or Epic 2 — can issue a graph write without a test going red.

**Acceptance Criteria:**

**Given** a runtime Proxy-sentinel installed over `window.roamAlphaAPI` in the test setup
**When** any method outside the read whitelist (`q`, `pull`, `getOpenPageOrBlockUid`, `util.*`) is invoked
**Then** the sentinel throws
**And** `openPage`/`openBlock` are explicitly whitelisted with a `// read-with-side-effect` comment.

**Given** a meta-test that controls the control
**When** it runs
**Then** it asserts that every call path from `RealRoamAdapter` to Roam passes through the sentinel (the assertion is tied to adapter coverage, not to a frozen method list, so new consumption in Epic 2 cannot silently bypass it)
**And** a separate assertion confirms the sentinel actually throws on a banned method.

**Given** ESLint hygiene rules
**When** linting runs
**Then** `no-restricted-properties` bans write methods (`createPage`/`createBlock`/`updateBlock`/`deleteBlock`/`moveBlock`/`batchActions`/`data.*`), `no-restricted-imports` bans referencing `window.roamAlphaAPI` outside `RealRoamAdapter`, and `no-explicit-any` + `no-non-null-assertion` + a ban on `as` casts to the API close the type-boundary leak.

**Given** a red-probe verification
**When** a temporary write call is committed
**Then** ESLint and the meta-test both go red, and after confirming, the temporary call is reverted (the enforcement is proven to bite).

### Story 1.5: Establish the lifecycle and mount skeleton with disposables teardown

As the builder of roam-nav,
I want `onload`/`onunload` to mount and fully tear down a single idempotent React-17 root via a disposables pattern,
So that the plugin loads cleanly, never leaks, and never double-mounts across reloads (NFR-8).

**Acceptance Criteria:**

**Given** `src/extension.tsx` and `src/lib/disposables.ts` + `src/lib/log.ts`
**When** `onload` runs
**Then** it asserts `window.React`/`ReactDOM`/`Blueprint` exist and major versions match (React 17, Blueprint v3), pushes every side-effect into a disposables array, and mounts one React root via `ReactDOM.render` (NOT `createRoot`) guarded by `#roam-nav-root` so a second `onload` does not create a second bar.

**Given** the version-assertion fails (e.g. Roam ships React 18)
**When** `onload` runs
**Then** the plugin degrades-to-absent with a clear `[roam-nav]` console message and mounts nothing.

**Given** a mounted plugin in a jsdom integration test
**When** `onunload` runs
**Then** the disposables array drains: observers disconnected, listeners removed, `unmountComponentAtNode` + root node removed, timers cancelled, injected styles stripped
**And** the test asserts no listeners remain and no plugin nodes are left in the DOM.

**Given** the logger `src/lib/log.ts`
**When** the plugin starts
**Then** every message is prefixed `[roam-nav]`, gated by a debug flag, and the startup capability-probe snapshot is logged (NFR-9).

### Story 1.6: Resolve the mount point and self-heal across Roam DOM changes

As the builder of roam-nav,
I want the bar to mount in its own row above `.roam-article` and re-attach itself when Roam re-creates the DOM, degrading to absent rather than ever entering `.rm-topbar`,
So that header integrity (NFR-1) and DOM resilience (NFR-2) hold across navigations and Roam restructures.

**Acceptance Criteria:**

**Given** `src/lib/dom.ts` as the single home for all Roam selectors and a pure `src/lib/resolveMountPoint.ts`
**When** `resolveMountPoint(document)` runs
**Then** it returns the sibling mount node above `.roam-article` (never a descendant of `.rm-topbar`), or `null` if the expected anchor is gone
**And** no component or mount code contains a raw `document.querySelector('.rm-...')` — every selector is named in `dom.ts`.

**Given** `src/mount/mountManager.ts` with a debounced `MutationObserver` (narrow target + `document.contains` guard)
**When** Roam re-creates the topbar/article after a navigation
**Then** the bar re-attaches to the resolved mount point without duplicating or leaking the root (NFR-4: no callback-storm on keystrokes).

**Given** the expected mount point disappears after a Roam restructure
**When** the observer fires
**Then** the bar renders nowhere (degrade-to-absent) and a test asserts no Trail/Stepper node is ever a descendant of `.rm-topbar`.

**Given** the mountManager integration tests (jsdom, fake timers)
**When** mount → re-attach → teardown is exercised
**Then** exactly one root exists at all times and teardown leaves none.

### Story 1.7: Detect the current page and classify the Anchor DNP

As the builder of roam-nav,
I want a debounced route watcher that emits the current main-window uid and a hook that resolves it to `{uid, title, isDNP}`,
So that both the Stepper (anchor date) and the future Trail (visit events) read one reliable source of truth for "where am I."

**Acceptance Criteria:**

**Given** `src/mount/routeWatcher.ts`
**When** the main-window route changes
**Then** it reads `getOpenPageOrBlockUid()` after a debounced settle triggered by `hashchange`, resolves a block-zoom uid to its owning page, and ignores right-sidebar routes (main window only)
**And** date math and queries never run a full-graph scan on a route change (NFR-4).

**Given** `src/hooks/useCurrentPage.ts` subscribing to the route signal
**When** the open target resolves
**Then** it returns `{ uid, title, isDNP }` where `isDNP` is true only when the uid matches `MM-DD-YYYY` / the title parses via the date utils
**And** on the scrolling daily-log view (where `getOpenPageOrBlockUid()` is `null`) `isDNP` is false and no anchor is produced.

**Given** consecutive identical route signals
**When** they arrive
**Then** the watcher emits the current uid such that downstream consumers can de-duplicate (no spurious churn).

### Story 1.8: Mount the slot-based NavBar container with live theming

As Temich (a Roam user),
I want a single slim bar that appears in its own row, stays put as I scroll, and matches Roam's light/dark theme,
So that navigation chrome reads as native Roam (NFR-6) and never shifts layout or breaks the header (NFR-1, NFR-7).

**Acceptance Criteria:**

**Given** `src/components/NavBar.tsx` as the top-zone owner
**When** it renders
**Then** it composes two slots — `<TrailZone />` (left, flex) and `<DateStepperZone />` (right, fixed) — and **reserves both slots from the first commit even though `TrailZone` renders `null` until Epic 2** (so the Epic 1→Epic 2 seam yields zero rework)
**And** the bar is one row of height `32px` with `14px` horizontal padding and a bottom hairline, mounted above `.roam-article`.

**Given** the persistent container
**When** the route changes
**Then** only the container's content updates in place — it is never unmounted/remounted per route (no flicker) — and its row height is reserved from the first frame (no layout shift) (NFR-7, UX-DR11).

**Given** `extension.css` and theme tokens
**When** the bar renders
**Then** every CSS class is `rn-` prefixed (NFR-10, UX-DR1–4), all colors come from Blueprint/Roam theme tokens with no hard-coded hex, and the bar is flat (single hairline, no shadow) with `4px` rounding on hit areas on hover/focus only (UX-DR12).

**Given** Roam dark mode is toggled at runtime
**When** `.bp3-dark` is applied
**Then** the bar's text/background follow live with no color cached at mount (UX-DR8).

**Given** the bar is sticky under the topbar
**When** the article scrolls, the sidebar is open, a block is zoomed, or the window is narrow
**Then** the bar stays pinned and intact in each mode (UX-DR11).

### Story 1.9: Step previous/next day on a DNP without writing to the graph

As Temich (a Roam user),
I want previous-day / next-day controls that appear only on a DNP and walk me one day at a time to any depth,
So that I can scan my days as a timeline without bouncing back to "today" or opening a menu (UJ-1, FR-1/2/3).

**Acceptance Criteria:**

**Given** pure `src/lib/dateMath.ts`
**When** its functions run
**Then** `stepDate(uid, ±n)`, `isDNP`, and uid↔date conversion use Roam `util.dateToPageUid`/`pageTitleToDate` with a hand-rolled ordinal-formatter fallback, and boundary cases (month end, year end, leap year) are covered by 100% co-located unit tests with zero DOM/Roam imports.

**Given** `src/components/DateStepperZone.tsx`
**When** the open page is a DNP (FR-1)
**Then** the `‹ prevDate` / `nextDate ›` controls are visible showing the adjacent target dates (decision D3, never bare arrows; UX-DR6)
**And** on every non-DNP surface (regular pages and the scrolling daily-log view) the Stepper zone is omitted entirely, not greyed (UX-DR4).

**Given** the Stepper is visible on Anchor DNP `X`
**When** the user clicks `nextDate ›` (or `‹ prevDate`)
**Then** the main window navigates to `X ± 1` calendar day via the RoamPort `openPage` on the derived date uid (FR-2), the destination becomes the new Anchor DNP, and the labels recompute — repeated clicks step arbitrarily far with no depth bound.

**Given** the target date has no page node
**When** the Stepper navigates to it
**Then** no write is issued (per the Story 1.1 `guard_required` decision: read-only, or guarded if the probe required it), the empty page shell opens, and the graph page count is identical before and after (FR-3).

**Given** the Stepper controls
**When** rendered
**Then** they are semantic `<button>`/`<a>` with full aria-labels ("Previous day, June 11th, 2026"), a visible focus ring, and a hit target ≥ `24px` (UX-DR9, UX-DR10).

## Epic 2: Navigation Trail

The roam-nav bar now tracks the pages visited since the last DNP as ordered Crumbs, resets and roots itself whenever a DNP is opened, scrolls horizontally on overflow with the Root and current page pinned at the two ends, and returns the user to any earlier page in one click — realizing UJ-2. It layers onto Epic 1's already-proven walking skeleton (mounted NavBar slot, RoamPort seam, route signal), adding only the pure `trailReducer`, the `useTrail` wiring, the `TrailZone`/`Crumb` UI, and the overflow scroller.

**FRs covered:** FR-5, FR-6, FR-7 (+ FR-4 content). **Relevant NFRs:** NFR-3 (read-only, re-validated for new navigation consumption), NFR-6 (felt quality), NFR-11 (single-line horizontal scroll), NFR-12 (middle-ellipsis truncation). **Relevant UX-DRs:** 5, 7, 9, 10.

### Story 2.1: Model the Trail as a pure reducer

As the builder of roam-nav,
I want a pure `trailReducer(state, event)` that appends visits, de-duplicates consecutive repeats, and resets/roots on a DNP open,
So that all Trail behavior (FR-5, FR-6) lives in one deterministic, 100%-unit-tested module with no DOM or Roam imports.

**Acceptance Criteria:**

**Given** `src/lib/trailReducer.ts` with the canonical Crumb shape `{ uid: string; title: string; ts: number }`
**When** a `pageVisited` event is dispatched
**Then** the visited Crumb is appended in visit order (Trail Root → most recent, left → right) immutably (spread, no mutation) (FR-5)
**And** if the visited uid equals the last Crumb's uid, it is de-duplicated (no repeated adjacent Crumb).

**Given** the reducer
**When** a `dnpOpened` event is dispatched
**Then** all existing Crumbs are cleared and that DNP becomes the single first Crumb (Trail Root) (FR-6)
**And** subsequent `pageVisited` events append after the Trail Root.

**Given** no DNP has been opened in the session
**When** the first real page is visited
**Then** the Trail Root is today's DNP (a virtual root derived from the local device date) and the visited page is appended after it (FR-6).

**Given** clicking an earlier Crumb is later modeled as navigation
**When** that navigation produces a `pageVisited` for an earlier page
**Then** the reducer does NOT trim later Crumbs — the Trail stays a true visit history (FR-7, confirmed PRD §10).

**Given** the reducer is pure
**When** unit tests run
**Then** append, consecutive-dedup, DNP-reset/root, virtual-root, and no-trim cases are at 100% co-located coverage with zero DOM/Roam imports.

### Story 2.2: Wire visited pages into the Trail in real time

As Temich (a Roam user),
I want the Trail to update automatically as I move through the graph,
So that the path of where I came from is always current without any action on my part (FR-5, FR-6).

**Acceptance Criteria:**

**Given** `src/hooks/useTrail.ts` using `useReducer(trailReducer)` over a small React context
**When** the Story 1.7 route signal emits a new current page
**Then** `useTrail` dispatches `dnpOpened` if the page is a DNP, otherwise `pageVisited`, so the Trail content updates in the persistent NavBar container without remounting it (NFR-7).

**Given** only main-window navigation is tracked
**When** a right-sidebar navigation occurs
**Then** it is ignored and produces no Crumb (FR-5, v1 scope).

**Given** the Trail is in-memory only
**When** Roam fully reloads
**Then** the Trail resets (no persistence in v1) (FR-5, confirmed PRD §10).

**Given** Crumb labels
**When** a Crumb is created
**Then** its readable title is resolved through the RoamPort (`:node/title`) and its `uid` is retained for navigation (so a later rename does not break navigation).

**Given** the new navigation consumption introduced here
**When** the read-only meta-test runs
**Then** the Proxy-sentinel is re-validated against Epic 2's call paths (`openPage`/`openBlock`, any new `q`/`pull`) so the read-only invariant cannot be silently bypassed by Epic 2 (NFR-3).

### Story 2.3: Render the Trail as clickable Crumbs

As Temich (a Roam user),
I want to see the readable path of pages since my last DNP and click any earlier one to jump back,
So that I never lose my place after following links deep into the graph (UJ-2, FR-7).

**Acceptance Criteria:**

**Given** `src/components/TrailZone.tsx` and `src/components/Crumb.tsx` filling the reserved Trail slot in NavBar
**When** the Trail renders
**Then** Crumbs appear in order separated by a `›` glyph (`sep.fg`), with three variants: **root** (the DNP, prefixed with 📅, weight 600), **default** (visited page, link-blue, hover `crumb.hover.bg` pill), and **current** (open page, weight 600, persistent fill, inert/not clickable) (UX-DR5).

**Given** a Crumb title longer than `crumb.max-width` (180px)
**When** it renders
**Then** it truncates with middle-ellipsis rather than wrapping (NFR-12, UX-DR5).

**Given** the user clicks a non-current Crumb
**When** the click fires
**Then** the main window opens that Crumb's page via the RoamPort `openPage` on its uid (FR-7)
**And** later Crumbs are NOT trimmed — the Trail remains a true visit history (FR-7).

**Given** the current Crumb
**When** the user interacts with it
**Then** it is a no-op (inert, not focusable as a link) and is announced via `aria-current="page"` (UX-DR10).

**Given** all Crumbs
**When** rendered
**Then** they are semantic `<button>`/`<a>` with `aria-label` "Go to {page title}", a visible focus ring, and a hit target ≥ `24px`; no information is conveyed by color alone (the 📅 icon + weight mark the root, position marks current) (UX-DR9, UX-DR10).

### Story 2.4: Scroll the Trail on overflow with the ends pinned

As Temich (a Roam user),
I want a long Trail to stay on one line and scroll horizontally while my anchor day and current page stay visible at the ends,
So that orientation never breaks no matter how deep the path gets (NFR-11, UJ-2 edge case).

**Acceptance Criteria:**

**Given** the Trail zone content exceeds the available width
**When** it overflows
**Then** the zone scrolls horizontally on a single line (wheel / trackpad / drag) with no dropdown and no wrapping (decision D2, NFR-11)
**And** a thin (~5px) themed scrollbar appears only on overflow.

**Given** the overflow state
**When** the user scrolls
**Then** the 📅 Trail Root stays pinned at the far left and the current Crumb stays pinned at the far right, with intermediate Crumbs scrolling between them (NFR-11, UX-DR7).

**Given** the horizontal scroller
**When** the user performs a trackpad horizontal gesture
**Then** an edge-fade affordance signals more content, and the scroller does not steal the browser's trackpad swipe-back gesture (UX-DR7).

**Given** a narrow Roam window
**When** the bar renders
**Then** the Trail zone scrolls while the fixed Stepper zone (if on a DNP) stays put, keeping the whole feature to one `32px` row (PRD SM-C1).
