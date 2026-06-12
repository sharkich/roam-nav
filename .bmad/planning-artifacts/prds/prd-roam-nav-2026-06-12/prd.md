---
title: roam-nav
status: final
created: 2026-06-12
updated: 2026-06-12
---

# PRD: roam-nav
*Working title — confirm.*

## 0. Document Purpose
This PRD is for the builder of **roam-nav** (a personal Roam Research navigation plugin) and any downstream design/architecture/implementation work. It is scoped to two capabilities — temporal Daily-Notes navigation and a header-safe navigation Trail — unified by a single principle: the DNP as navigation anchor. Vocabulary is fixed in §3 Glossary and used verbatim throughout; features are grouped with globally numbered FRs nested under them; inferred decisions are collected in §10 (all confirmed by the user). The pre-existing Cmd+K fuzzy-search palette described in this repo's `docs/` is a *separate* effort and is explicitly out of scope (§5). Technical API findings live in the decision log and §6/§9, not as implementation prescriptions here.

## 1. Vision

roam-nav makes the **Daily Notes Page the anchor of all movement through a Roam graph — across time and across links.** From any open date, a single click steps you to the previous or next day, and every day you land on offers that same step-back / step-forward affordance — so you can travel arbitrarily deep into the past or future without ever bouncing back to "today" or opening a menu. This is the gap Roam's own next/previous-day shortcuts leave open: they only work while you're standing on a dated page, and they're keyboard-buried.

Spatially, as you follow links deeper into the graph, a slim **Trail** bar — living in its own row, never inside Roam's header — shows the readable path of pages you've visited since your last Daily Notes Page, with a dropdown for the ones that scroll off the line. Opening any DNP resets the Trail and seats that date as its root, so the day you're working from is always the start of your path back. One click on any earlier crumb returns you there.

It's a personal tool first, built to fix two concrete failures: native date-stepping that breaks on the daily-log view, and an existing breadcrumbs plugin whose UI disfigures the header instead of helping. The bar to clear is simple — **never lose the thread, and never make Roam's chrome worse to get there.**

### 1.1 Prior Art & Differentiation
- **`mlava/yesterday-tomorrow`** — adds Yesterday/Today/Tomorrow buttons; its Standard mode anchors strictly to the *real* current date (the pain), and even its Perpetual mode is a manual toggle with no always-on, re-anchoring stepper. roam-nav's Date Stepper re-anchors to *whatever DNP is open*, with no mode switch.
- **`RoamJS/breadcrumbs`** — the closest history-trail attempt; it injects into `.rm-topbar`'s internal flex row, which is exactly why it breaks/splits the header. roam-nav's Trail lives in its own row and never touches the top bar.
- **Roam native** `Ctrl-Alt-N/P` — next/previous daily note, but only on a dated page (not the daily-log view) and keyboard-buried.
- **`github.com/RoamJS` ecosystem** (workbench, roamjs-components, query-builder) — reference for safe DOM-mount/observer and uid-resolution patterns, not direct competitors.

### 1.2 Design North-Star
A *well-designed* navigation component here means: **invisible until useful, one glance to orient, one click to recover.** A single slim row that reads like part of Roam, not bolted on — calm typography, readable titles, graceful overflow. The win condition is felt, not just functional: moving through time and links should feel effortless and reversible, never disorienting.

## 2. Target User

### 2.1 Jobs To Be Done
- When I'm reviewing my days, I want to flip to the previous/next day — and keep going arbitrarily deep — from *whatever* date I'm on, so I can read my log as a timeline without returning to "today".
- When I've followed links deep into the graph, I want to see the readable path of where I came from and jump back in one click, so I never lose my place.
- As the builder, I want navigation chrome that **never disfigures Roam's header** — the cure must not be worse than the disease.

### 2.2 Non-Users (v1)
- Not for users who navigate primarily by mouse/menu and don't think in Daily Notes.
- Not a team/shared-graph feature — single-operator, local.

### 2.3 Key User Journeys

- **UJ-1. Temich scans his week without losing his place.** Temich opens a Daily Notes Page from three days ago. A previous/next day control sits with the date. He clicks "next day" repeatedly, walking forward through his log day by day; each DNP he lands on shows its own previous/next affordance, re-anchored to that date. He never returns to "today" and never touches a menu. **Resolution:** he lands on the day he was looking for, in context.
- **UJ-2. Temich follows a rabbit hole and walks back out.** Starting from today's DNP, Temich clicks a page link, then a link on that page, then another — three levels deep into the graph. A slim Trail bar under the header shows `[Today] › Project X › Meeting notes › Person Y`. He realizes he's lost the thread, clicks `Project X` in the Trail, and is back two steps in one click. **Edge case:** earlier crumbs that don't fit the line are reachable from a dropdown.

## 3. Glossary

- **DNP (Daily Notes Page)** — a Roam date page (title `June 12th, 2026`, uid `06-12-2026`). The navigational anchor for both time and space.
- **Anchor DNP** — the currently-open DNP from which the Date Stepper computes previous/next day. Re-derived on every navigation.
- **Date Stepper** — the previous-day / next-day control rendered relative to the Anchor DNP (Feature 4.1).
- **Trail** — the ordered, readable history of pages visited since the last DNP open (Feature 4.2). Browser-history style, not block-hierarchy.
- **Trail Root** — the DNP that heads the Trail. Opening any DNP clears the Trail and becomes its Trail Root.
- **Crumb** — one entry in the Trail (a visited page with a readable title), clickable to navigate back to it.
- **Roam top bar** — Roam's native fixed header row (`.rm-topbar`), holding the graph name, search, sync indicator, and sidebar toggles. roam-nav treats it as off-limits.
- **Header integrity** — the guarantee that no roam-nav UI is injected into, or alters the size/position of, the Roam top bar. The product's core non-functional bar (§6, SM-2).

## 4. Features

### 4.1 Date Stepper

**Description:** On any **DNP**, roam-nav renders a previous-day / next-day control anchored to that page's date (the **Anchor DNP**). Clicking a control navigates to the adjacent DNP, where the control re-anchors to the new date — so the user can step arbitrarily deep into past or future, one day at a time, and each landed day offers the same affordance. This is the gap left by `mlava/yesterday-tomorrow`, whose Standard mode only anchors to the real current date. The control is **hidden on every non-DNP surface** (regular pages and the scrolling daily-log view). Stepping to a date with no page yet opens an empty page shell **without writing anything to the graph**. Realizes UJ-1. Placement (Roam top bar vs. on-page near the title) is an implementer's choice — not UX-load-bearing.

**Functional Requirements:**

#### FR-1: Render the Date Stepper only on a DNP
The user sees previous-day / next-day controls whenever an Anchor DNP is open, and never otherwise.

**Consequences (testable):**
- Controls are visible when the open main-window target resolves to a DNP (uid matches `MM-DD-YYYY` / title parses via `roamAlphaAPI.util.pageTitleToDate`).
- Controls are absent on non-date pages and on the scrolling daily-log view (where `getOpenPageOrBlockUid()` returns `null`).
- The Anchor DNP is re-derived on every navigation (no stored "anchor memory" — the open DNP *is* the anchor).

#### FR-2: Step to the adjacent day
The user can click "previous day" or "next day" to navigate to the DNP exactly one day before/after the Anchor DNP.

**Consequences (testable):**
- Target = Anchor date ∓ 1 calendar day, computed via `roamAlphaAPI.util.dateToPageUid` / `dateToPageTitle` (no hand-rolled date math).
- After navigation, the destination DNP becomes the new Anchor DNP and the Stepper re-renders relative to it.
- Stepping has no depth bound — repeated clicks walk arbitrarily far into past/future.

#### FR-3: Open a non-existent date without writing to the graph
When the target DNP has no page node, navigation opens the empty page shell and the graph is left unchanged.

**Consequences (testable):**
- No `roamAlphaAPI.createPage` (or any write) is issued on a step.
- Navigation uses `ui.mainWindow.openPage` / `openBlock` on the date uid.
- Graph page count is identical before and after stepping across empty dates.

**Out of Scope:**
- Calendar / datepicker jump to an arbitrary date — deferred to roadmap (see §7.2).
- Keyboard shortcuts for stepping — deferred ([NON-GOAL for MVP], §5).
- Stepping the right sidebar / per-window anchoring — main window only in v1.

### 4.2 Navigation Trail

**Description:** A slim **Trail** bar lives in its **own dedicated row** below Roam's top bar and above the article — explicitly **never injected into `.rm-topbar`**, which is the structural mistake that makes the existing RoamJS breadcrumbs plugin disfigure the header. The Trail shows an ordered list of **Crumbs** — pages visited since the last DNP open — with the **Trail Root** (a DNP) first. When Crumbs exceed the available width the line scrolls horizontally; the Trail Root and the current page stay pinned at the two ends. Clicking any Crumb navigates back to it. Opening any DNP clears the Trail and seats that DNP as the new Trail Root; if no DNP has been opened in the session, the Trail Root is today's DNP (a virtual anchor). The bar is theme-aware (light / `.bp3-dark`) and never crowds Roam's native controls. Realizes UJ-2.

**Functional Requirements:**

#### FR-4: Render the Trail in its own row, never in the header
The Trail bar mounts as a sibling element above `.roam-article`, not inside `.rm-topbar`.

**Consequences (testable):**
- The Trail DOM node is not a descendant of `.rm-topbar`; Roam's native top-bar controls keep their full width and are visually unchanged.
- The bar has its own overflow handling (single line + horizontal scroll), so long titles never wrap into or shove native chrome.
- The bar (re)attaches across Roam navigations via a `MutationObserver` keyed on the article/title mount.
- Degrade-to-absent on DOM change: if the expected mount point is gone after a Roam restructure, the Trail renders nowhere rather than falling back into the Roam top bar — verifiable by asserting no Trail node is ever a descendant of `.rm-topbar`.
- Theme-aware: the Trail uses Roam/Blueprint theme tokens (or mirrors `.bp3-dark`) with no hard-coded colors — verifiable by toggling Roam dark mode and confirming the bar's text/background follow.

#### FR-5: Track visited pages as ordered Crumbs
On each main-window navigation, the visited page is appended to the Trail as a Crumb with a human-readable title.

**Consequences (testable):**
- Order is visit order, Trail Root → most recent (left → right).
- Consecutive duplicate visits to the same page are de-duplicated (no repeated adjacent Crumbs).
- Crumb labels are resolved to readable titles via `roamAlphaAPI` (`:node/title`).
- Only main-window navigation is tracked in v1 (sidebar navigation is ignored).
- The Trail is in-memory only — it resets on full Roam reload, not just on DNP open.

#### FR-6: A DNP resets and roots the Trail
Opening any DNP clears all existing Crumbs and makes that DNP the first Crumb (Trail Root).

**Consequences (testable):**
- Immediately after opening DNP *X*, the Trail contains exactly one Crumb: *X*.
- Subsequent page visits append after the Trail Root.
- If no DNP has been opened in the current session, the Trail Root is today's DNP (virtual root) and the first real visited page is appended after it.

#### FR-7: Navigate back by clicking a Crumb
Clicking any Crumb opens that page in the main window.

**Consequences (testable):**
- Click issues `ui.mainWindow.openPage` on the Crumb's uid.
- Clicking an earlier Crumb does NOT trim later Crumbs — the Trail remains a true visit history (browser-stack forward-trimming is deferred to v2; see §7.2).

**Feature-specific NFRs:**
- The Trail is a single line that scrolls horizontally on overflow (no dropdown); the Trail Root (📅) stays at the far left and the current page at the far right so orientation never breaks. *(UX decision D2, 2026-06-12.)*
- Long Crumb titles truncate (e.g. middle-ellipsis) rather than wrap.

## 5. Non-Goals (Explicit)

- **Not the Cmd+K fuzzy-search palette.** That page-jumper concept (still described in `docs/`) is a separate effort and explicitly out of this PRD.
- **Not a block-hierarchy breadcrumb.** The Trail is visited-history, not an ancestor/parent path (Logseq-style) — that's a possible future addition, not v1.
- **No writes to the graph.** roam-nav navigates only; it never creates pages, blocks, or settings nodes in v1.
- **No keyboard-first navigation in v1.** Clickable controls only. (The §1.2 "effortless, reversible" aspiration is met by clicks in v1; keyboard shortcuts are a roadmap item.)
- **Not a team/shared feature.** Single-operator, local, no sync or multi-user concerns.
- **Not a calendar/agenda view.** No month grid, event rendering, or datepicker in v1.

## 6. Cross-Cutting NFRs

- **Header integrity (load-bearing).** No roam-nav UI may be injected into `.rm-topbar`'s internal flex row or otherwise alter the size/position of Roam's native top-bar controls. This is the explicit anti-pattern this product exists to avoid.
- **DOM resilience.** UI mounts via observers and re-attaches on navigation; a Roam top-bar/article DOM restructure must degrade to "feature absent," never to "header broken."
- **Read-only safety.** All graph access is read/query + navigation APIs; zero write APIs in v1.
- **Lightweight.** Navigation tracking and re-render must be cheap (no full-graph scans on every route change); date math uses Roam's own `util.*` helpers.
- **API-shape verification.** Exact `roamAlphaAPI.ui.mainWindow.*` and `util.*` signatures are confirmed via reference plugins but must be re-verified against the live `window.roamAlphaAPI` in a Roam dev console before/at implementation (see §9).
- **Felt quality.** Beyond "header not broken," the Trail and Stepper must meet the §1.2 north-star — reading as native, calm chrome — not merely satisfy the negative constraints.

## 7. MVP Scope

### 7.1 In Scope
- **Date Stepper** on DNPs — previous/next day, re-anchoring, arbitrary depth, hidden off-DNP (FR-1–FR-3).
- **Navigation Trail** — dedicated header-safe row, visited-history Crumbs, DNP-rooted reset, dropdown overflow, click-to-return (FR-4–FR-7).
- Header-integrity and DOM-resilience guarantees (§6).
- Theme-aware (light / dark) styling.
- Read-only: no graph writes.

### 7.2 Out of Scope for MVP
- Calendar / datepicker absolute-date jump — *v2; keeps v1 lean.*
- Keyboard shortcuts for stepping and trail navigation — *v2.*
- Block-hierarchy (ancestor-path) breadcrumb — *v2; distinct from visited-history Trail.*
- Right-sidebar navigation tracking and per-window anchoring — *main window only in v1.*
- Trail persistence across full Roam reload — *in-memory only for v1.* [NOTE FOR PM: cheap localStorage persistence is a likely fast-follow if reload-resets annoy in daily use.]
- Browser-style forward-history trimming when jumping back to an earlier Crumb — *v1 keeps a true visit log.*
- Cmd+K fuzzy-search palette — *separate effort, not this product.*

## 8. Success Metrics

*Hobby/personal calibration — qualitative, not instrumented.*

**Primary**
- **SM-1**: I keep roam-nav enabled and use date-stepping or the Trail in most working sessions a month after install. Validates FR-1–FR-7.

**Secondary**
- **SM-2**: Roam's top bar looks and behaves exactly as it did without the plugin — no broken/cramped header in light or dark theme, across a Roam update cycle. Validates FR-4 and §6 (header integrity).

**Counter-metrics (do not optimize)**
- **SM-C1**: Screen real estate consumed by roam-nav chrome stays to a single slim row — do not grow the Trail/Stepper into a second toolbar in pursuit of features. Counterbalances SM-1.

## 9. Open Questions

*Build-time decisions, none blocking downstream design.*

1. **API signature verification** — confirm exact param shapes for `ui.mainWindow.openPage` vs `openBlock`, `getOpenPageOrBlockUid`, and `util.*` against the live `window.roamAlphaAPI` console before build.
2. **Stepper placement** — top bar vs. on-page near `h1.rm-title-display`; check the on-page option for theme-CSS collisions.
3. **Adjacent-date labels** — bare arrows vs. arrows showing the target date (e.g. "‹ June 11th, 2026"). Minor UX, decide at build.

## 10. Assumptions Index

*All confirmed by the user on 2026-06-12 — retained here for traceability.*

- §4.2 FR-5 — The Trail is in-memory only; it resets on full Roam reload, not just on DNP open. **(Confirmed.)**
- §4.2 FR-7 — Clicking an earlier Crumb does not trim later Crumbs; the Trail stays a true visit history. **(Confirmed.)**
- §4.2 (feature NFR) — Trail overflow handled by horizontal scroll (no dropdown), Root + current pinned at the ends. **(Confirmed; superseded the earlier ~5-inline-crumbs+dropdown assumption per UX decision D2, 2026-06-12.)**
