---
title: roam-nav — Visual Identity
status: final
created: 2026-06-12
updated: 2026-06-12
sources:
  - ../prds/prd-roam-nav-2026-06-12/prd.md
ui_system: Blueprint.js v3 (Roam-provided; inherit tokens — do not bundle)
colors:
  # Light (default). Values mirror Blueprint v3 / Roam chrome so the bar reads as native.
  light:
    bar.bg: "#f1f4f6"          # navbar background — one notch off the article white
    bar.border: "#e1e8ed"      # bottom hairline, matches topbar divider
    crumb.fg: "#2b5797"        # page-crumb link color (Blueprint intent-ish blue)
    crumb.root.fg: "#394b59"   # DNP root — neutral, weighted
    crumb.current.fg: "#182026"
    crumb.hover.bg: "#e3ebf2"
    sep.fg: "#a7b6c2"          # the › separator
    step.fg: "#5c7080"         # stepper resting
    step.hover.fg: "#182026"
    step.arrow.fg: "#8a9ba8"
  # Dark (.bp3-dark)
  dark:
    bar.bg: "#2a333c"
    bar.border: "#1c2127"
    crumb.fg: "#8abbff"
    crumb.root.fg: "#ced9e0"
    crumb.current.fg: "#f5f8fa"
    crumb.hover.bg: "#34414c"
    sep.fg: "#5c7080"
    step.fg: "#a7b6c2"
    step.hover.fg: "#f5f8fa"
    step.arrow.fg: "#8a9ba8"
typography:
  font.family: "inherit (Roam/system: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto)"
  crumb.size: "13px"
  crumb.current.weight: "600"
  crumb.root.weight: "600"
  step.size: "12px"
  step.weight: "400"
rounded:
  control: "4px"   # Blueprint default radius for crumb/step hit areas
spacing:
  bar.height: "32px"
  bar.padding.x: "14px"
  bar.gap: "10px"          # between trail zone and stepper zone
  crumb.gap: "6px"         # between crumb and separator
  crumb.padding: "2px 7px"
  crumb.max-width: "180px"
  step.padding: "2px 8px"
  hit.min: "24px"          # min interactive height (a11y)
components:
  - navbar
  - crumb
  - stepper-control
  - overflow-scroller
---

# roam-nav — Visual Identity

## Brand & Style
roam-nav has no brand of its own. Its design language is **Roam's** (Blueprint.js v3, which Roam loads): the bar should read as a native strip of Roam chrome, not a bolted-on widget. The north-star (PRD §1.2) governs every choice here: **invisible until useful, one glance to orient, one click to recover.** Restraint is the aesthetic — one slim row, calm neutral typography, color used only to mark *what's clickable* and *where you are*.

## Colors
Inherit Blueprint v3 / Roam chrome values (see frontmatter `colors.light` / `colors.dark`). The bar never introduces a saturated accent of its own; the only color is the muted link-blue on page crumbs (`{colors.light.crumb.fg}`) and the neutral weighting of the DNP root and current page. All values must come from theme tokens so the bar follows Roam's light/`.bp3-dark` switch with no hard-coded colors.

## Typography
Inherit Roam's font stack (`{typography.font.family}`). Crumbs at `{typography.crumb.size}`; the DNP root and the current page render at weight `{typography.crumb.current.weight}` to anchor the two ends of the trail. Stepper labels are smaller (`{typography.step.size}`) and quieter — they assist, they don't compete with the page H1.

## Layout & Spacing
A single horizontal row, height `{spacing.bar.height}`, mounted in its **own row** directly under `.rm-topbar` and above `.roam-article` — never inside the topbar (PRD §6 header integrity). The Trail zone takes remaining width on the left (`flex: 1`, scrollable); the Stepper zone is fixed-width on the right, separated by a hairline divider. Horizontal padding `{spacing.bar.padding.x}` aligns the bar's content with the article gutter.

## Elevation & Depth
Flat. A single bottom hairline (`{colors.light.bar.border}`) is the only separation from the article — no shadows, no raised surface. The bar sits *sticky* just beneath the topbar; depth is communicated by position and the hairline, not elevation.

## Shapes
Rounded `{rounded.control}` on interactive hit areas (crumbs, stepper controls) on hover/focus only; the bar itself is a plain rectangle flush with Roam's chrome.

## Components

### navbar
The container row. `bar.bg` background, bottom `bar.border` hairline, height `{spacing.bar.height}`. Two zones: `.trail` (left, flex, scrollable) and `.stepper` (right, fixed). On a non-DNP surface the `.stepper` zone is omitted entirely (not greyed) — see EXPERIENCE.md State Patterns.

### crumb
A clickable page reference. Resting = link color (`crumb.fg`); hover = `crumb.hover.bg` pill. Three variants: **root** (the DNP, prefixed with a small 📅, weight 600), **default** (visited page), **current** (the open page — weight 600, persistent `crumb.hover.bg` fill, not clickable). Labels middle-ellipsis at `{spacing.crumb.max-width}`. Separated by a `›` glyph in `sep.fg`.

### stepper-control
Two compact controls — previous day (`‹ Jun 11`) and next day (`Jun 13 ›`) — flanking the page title's date, which lives in the article H1 below. Arrow glyph in `step.arrow.fg`; date label in `step.fg`, brightening to `step.hover.fg` on hover. Always shows the adjacent target dates (decision D3), never bare arrows.

### overflow-scroller
The `.trail` zone scrolls horizontally (wheel / trackpad / drag) when crumbs exceed width (decision D2 — no dropdown). A thin (~5px) themed scrollbar appears on overflow; the 📅 root stays at the far left and the current crumb at the far right.

## Do's and Don'ts
- **Do** inherit every color/font from Roam/Blueprint theme tokens; follow `.bp3-dark` automatically.
- **Do** keep the whole feature to one `{spacing.bar.height}` row (PRD SM-C1).
- **Don't** inject anything into `.rm-topbar` or alter native top-bar controls (PRD §6 — the exact failure of `RoamJS/breadcrumbs`).
- **Don't** add a second toolbar row, saturated accent color, drop shadow, or animation that draws the eye away from content.
- **Don't** let a single long page title dominate — middle-ellipsis at `{spacing.crumb.max-width}`.

> Mockup reference: [`mockups/roam-nav-bar-mock.html`](./mockups/roam-nav-bar-mock.html) (light/dark, DNP / non-DNP / overflow). Spine wins on any conflict with the mock.
