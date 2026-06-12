---
title: roam-nav — Experience Spec
status: final
created: 2026-06-12
updated: 2026-06-12
sources:
  - ../prds/prd-roam-nav-2026-06-12/prd.md
design: ./DESIGN.md
---

# roam-nav — Experience Spec

> Behavior, states, interactions, and flows. Visual identity lives in `DESIGN.md`; this doc references its tokens as `{token.path}`. Both spines win over any mock on conflict.

## Foundation
- **Form-factor:** desktop web (Roam Research browser app). Single surface — the Roam main window. No mobile/sidebar surface in v1.
- **UI system:** Blueprint.js v3, provided by Roam (inherited, not bundled). The roam-nav bar is a single injected DOM row; all visuals derive from `DESIGN.md`.
- **Anchor principle (from PRD):** the **DNP is the navigation anchor** for both time (Date Stepper) and space (Trail). One unified bar expresses both (decision D1).
- **Constraint:** header integrity — the bar mounts in its own row under `.rm-topbar`, never inside it.

## Information Architecture
One persistent surface: the **roam-nav bar**, with two zones in a single row.

```
roam-nav bar (own row, sticky under .rm-topbar)
├─ Trail zone (left, flex, horizontally scrollable)
│   📅 Root(DNP) › crumb › crumb › … › current
└─ Stepper zone (right, fixed; present only on a DNP)
    ‹ prevDate            nextDate ›
```

- Every navigational need from the PRD resolves on this one surface: "what day am I on / step days" → Stepper; "how did I get here / go back" → Trail. No additional screens, panels, or modals in v1.

## Voice and Tone
Microcopy is minimal, literal, date-aware — never cute.
- Stepper labels: abbreviated adjacent dates, `‹ Jun 11` / `Jun 13 ›` (localized to Roam's date format).
- Tooltips / aria-labels: full and explicit — "Previous day, June 11th, 2026" / "Next day, June 13th, 2026"; crumb: "Go to {page title}".
- Empty/edge copy: none needed inline (the bar simply shows fewer elements); no empty-state sentences.

## Component Patterns (behavioral)
Visual specs in `DESIGN.md.Components`; behavior here.

- **crumb** — click navigates the main window to that page (`ui.mainWindow.openPage`). The **current** crumb is inert (no-op, not focusable as a link). The **root** crumb (DNP) navigates to the anchor day. Clicking an earlier crumb does **not** trim later crumbs (PRD FR-7, confirmed) — the trail stays a true visit log.
- **stepper-control** — click navigates to the adjacent DNP (anchor ±1 day via `util.dateToPageUid`); the bar re-anchors to the new date and the labels recompute. Present only when the open page is a DNP.
- **overflow-scroller** — horizontal scroll on the Trail zone when content exceeds width (decision D2). Root pinned far-left, current far-right; intermediate crumbs scroll between. No dropdown.

## State Patterns
| State | Trail zone | Stepper zone |
|---|---|---|
| **On a DNP** | Root (this DNP, 📅) + any crumbs visited since it | Visible: `‹ prevDate  nextDate ›` |
| **On a regular page** | Root (last opened DNP, or today's DNP if none) + crumbs incl. current | **Absent** (not a DNP) |
| **Fresh session, no DNP opened** | Root = today's DNP (virtual), then current page | Absent unless current page is a DNP |
| **Just opened a DNP** | Trail reset → exactly `[📅 thisDNP]` (PRD FR-6) | Visible |
| **Empty/future date** | Root/crumb renders normally; page shell is empty — no write (PRD FR-3) | Visible |
| **Overflow (many crumbs)** | Horizontally scrollable; root & current stay at the ends | Visible if on DNP |
| **Dark mode** | All tokens swap to `{colors.dark.*}` | same |
| **DOM mount missing after Roam restructure** | Degrade-to-absent: bar renders nowhere rather than into `.rm-topbar` (PRD §6) | n/a |

- **Persistence:** the Trail is in-memory only; a full Roam reload resets it (PRD FR-5, confirmed). The bar is otherwise effectively always visible (a Trail Root always exists) [ASSUMPTION A1].

## Interaction Primitives
- **Click crumb** → navigate main window to that page.
- **Click stepper control** → navigate to adjacent DNP; bar re-anchors.
- **Hover** → `{colors.light.crumb.hover.bg}` pill on crumbs; brighten on stepper.
- **Scroll over Trail** → horizontal pan of crumbs.
- **Sticky** → bar stays pinned under the topbar as the article scrolls [ASSUMPTION A2].
- **No keyboard navigation in v1** (PRD §5); controls are still real, focusable buttons/links for a11y.
- **No shift-to-sidebar in v1** [ASSUMPTION A4]; main-window navigation only (sidebar = v2).

## Accessibility Floor
- Crumbs and stepper controls are semantic `<button>` / `<a>` elements with descriptive `aria-label`s (full dates / titles per Voice & Tone).
- Visible focus ring on every interactive element; hit target ≥ `{spacing.hit.min}`.
- Color comes only from theme tokens, so contrast tracks Roam's own light/dark contrast; no information conveyed by color alone (the 📅 icon + weight mark the root; position marks the current page).
- The current page is announced as current (e.g. `aria-current="page"`), not just styled.

## Key Flows

- **KF-1 — Temich scans his week (realizes PRD UJ-1).**
  Temich opens a DNP from three days ago. The roam-nav bar shows `📅 (that day)` as root and, on the right, `‹ prevDate  nextDate ›`. He clicks `nextDate ›` repeatedly; each click lands on the next day, the bar re-anchors, and the labels roll forward. **Climax:** he reaches the day he wanted without ever returning to "today" or opening a menu — the dates did the walking. He never touched the article, only the slim bar.

- **KF-2 — Temich climbs out of a rabbit hole (realizes PRD UJ-2).**
  From today's DNP, Temich clicks into `Project X`, then `Meeting notes`, then `Person Y` — three links deep. The Trail reads `📅 Today › Project X › Meeting notes › Person Y`, current page bold at the right. He realizes he's wandered, glances at the trail, clicks `Project X`. **Climax:** one click puts him two steps back, in context, with the whole path still visible. **Edge:** had the trail been long, it would scroll — but `📅 Today` (his anchor) and the current page stay at the two ends, so orientation never breaks.

## Inspiration & Anti-patterns
- **Anti-pattern (primary): `RoamJS/breadcrumbs`** — injects into `.rm-topbar`'s internal flex, so long titles crowd native controls and Roam topbar restructures break it. roam-nav's entire structural premise (own row, degrade-to-absent) exists to avoid this. [Image #1 — user's screenshot of the broken header — to be added to `imports/` and linked here.]
- **Inspiration:** Notion's single-line breadcrumb (always one row, click any segment); browser back-via-history (clicking an earlier point). roam-nav keeps the always-one-row discipline but uses horizontal scroll instead of a dropdown (decision D2) and roots the trail at the DNP rather than the workspace.

## Responsive & Platform
- Desktop Roam only (v1). The bar relies on horizontal space; on a narrow window the Trail scrolls and the Stepper (compact, fixed) stays put. No separate mobile layout in v1.
- Theme-responsive: follows Roam light / `.bp3-dark` automatically via tokens.

## Open Items
- Assumptions A1 (always-visible bar), A2 (sticky), A3 (📅 root icon + `›` separator), A5 (per-crumb middle-ellipsis), A6 (a11y floor) — **accepted at finalize 2026-06-12** (user reviewed the mock); see `.decision-log.md`.
- ~~Overflow scroll supersedes PRD dropdown~~ — **resolved:** PRD synced 2026-06-12 (§4.2, FR-4, §10).
- [NOTE FOR UX] Image #1 (breadcrumbs anti-reference) still pending from user → drop into `imports/` and link in *Inspiration & Anti-patterns*.
