# PRD Input Reconciliation — roam-nav

**PRD reconciled:** `.bmad/planning-artifacts/prds/prd-roam-nav-2026-06-12/prd.md`
**Date:** 2026-06-12
**Method:** Read PRD + all four repo docs (CONTEXT, ARCHITECTURE, TECHSTACK, ASSUMPTIONS); reconciled against (1) the user's original verbatim request and (2) the repo docs' tech context. The Cmd+K palette in `docs/` is intentionally out of scope and is NOT flagged as a gap.

---

## Input 1 — User's original request (verbatim, two pains + ecosystem ref)

### What the PRD CAPTURED well
- **Pain (a) — temporal stepping relative to the CURRENTLY OPEN date, arbitrarily deep.** Fully captured: §1 Vision, §4.1 Date Stepper, FR-1–FR-3. "Anchor DNP re-derived on every navigation," "no depth bound," and "without ever bouncing back to today" all map cleanly to the verbatim ask. Strong.
- **The mlava/yesterday-tomorrow limitation (only anchors to real "today").** Captured in §1 ("they only work while you're standing on a dated page") and §4.1 (hidden on the scrolling daily-log view). Captured, though the specific *named plugin* is dropped — see gaps.
- **Pain (b) — losing your place when navigating deep through links, and getting back.** Captured: §1, §4.2 Trail, UJ-2, FR-4–FR-7. "Never lose the thread" is even elevated to the headline success bar in §1.
- **The "don't break/split the header" UX intent.** Strongly captured and even *promoted to a load-bearing NFR* (§6 Header integrity) and a glossary-level structural rule (FR-4: "never injected into `.rm-topbar`"). This is the best-preserved qualitative idea. SM-2 makes it a success metric.
- **"Wants a well-designed component" (not just functional).** Partially captured via SM-2, SM-C1 (single slim row), theme-awareness, middle-ellipsis truncation. The *aspiration* survives but is thinned — see gaps.

### GAPS / WEAKENINGS against Input 1

1. **Named-plugin provenance dropped.** The user named two specific reference points — `mlava/yesterday-tomorrow` (the date plugin that only anchors to real "today") and `RoamJS/breadcrumbs` (the header-disfiguring one). The PRD describes both *behaviors* but names neither plugin. For a builder, these are concrete reference implementations to study/diff against; losing the names loses a research shortcut. (RoamJS/breadcrumbs is alluded to generically as "the existing RoamJS breadcrumbs plugin" in FR-4 but not named; mlava is fully anonymized.)

2. **The github.com/RoamJS ecosystem reference is absent.** The user explicitly pointed at the RoamJS ecosystem as a model/source. The PRD §6 says API shapes are "confirmed via reference plugins" but never names RoamJS as the ecosystem to mine for patterns, packaging conventions, or the Depot publishing path. The ecosystem-as-prior-art intent is silently dropped.

3. **The visceral "disfigures / breaks-splits the header / cure worse than disease" tone is softened into NFR language.** The user's framing was emotional and concrete: the existing breadcrumbs "breaks/splits the header" and "ruins UX rather than helping." The PRD captures the *constraint* excellently (§6) but the *why-this-hurts* texture — that a bad fix is actively worse than the original problem — only survives as one JTBD line ("the cure must not be worse than the disease") and SM-2. Acceptable, but the qualitative sting that motivates the whole product is now a footnote rather than a felt driver. Watch that downstream design doesn't treat header-safety as a checkbox vs. a felt quality bar.

4. **"No mouse" / keyboard aspiration is captured-then-deferred — verify this is intended.** The original pain (b) is about *knowing where you are and getting back*; the user did not strongly demand keyboard-first, but the Vision (§1) introduces and §5 explicitly demotes "without touching the mouse" to aspirational, keyboard shortcuts → roadmap. This is internally consistent and honestly flagged — NOT a silent drop. Flagged here only so the PM confirms the demotion is acceptable, since the whole product's emotional pitch ("never lose the thread, never touch a menu") leans toward low-friction/keyboard, yet v1 ships click-only. Low risk; transparently handled.

5. **"Well-designed component" / craft aspiration is thinned to metrics, no positive design intent.** The original ask was aspirational about *quality of the component itself* ("a well-designed component"). The PRD encodes this only negatively (don't break the header, don't grow a second toolbar, truncate not wrap) plus theme-awareness. There is no positive statement of what *good* looks/feels like (elegance, unobtrusiveness, "slim," readable-at-a-glance) beyond "slim." Minor, but the craft bar that motivated the user is now mostly expressed as constraints rather than a design north-star.

---

## Input 2 — Repo docs tech-context consistency check

The PRD's stated tech context was checked against CONTEXT.md / ARCHITECTURE.md / TECHSTACK.md / ASSUMPTIONS.md. **No contradictions found.** All anchors are consistent:

| Tech anchor | Repo docs | PRD | Consistent? |
|---|---|---|---|
| React 17, external (`window.React`) | TECHSTACK, ASSUMPTIONS | implied via roamAlphaAPI/Blueprint context, not contradicted | YES (PRD doesn't re-state version; no conflict) |
| Blueprint v3, external (`window.Blueprint`) | TECHSTACK, ARCHITECTURE | FR-4 "theme-aware (light / `.bp3-dark`)" — uses Blueprint's bp3 class | YES — `.bp3-dark` matches Blueprint **v3** exactly (v4 would be `.bp4-*`). Strong corroboration. |
| Webpack → `extension.js` | TECHSTACK, ARCHITECTURE, ASSUMPTIONS | not re-stated; PRD stays out of build prescription (by design, §0) | YES (no conflict) |
| `window.roamAlphaAPI` | all docs | §6, FR-1/2/3/5/7 use `roamAlphaAPI.ui.mainWindow.*`, `util.*`, `:node/title` | YES — fully aligned |
| Roam Depot delivery | CONTEXT, ASSUMPTIONS | implied (personal plugin); not re-stated | YES (no conflict) |
| No MCP — runs in Roam browser app | CONTEXT, ASSUMPTIONS | not re-stated; PRD §0 keeps API findings in decision log | YES (no conflict) |
| Read-only, no graph writes in v1 | CONTEXT non-goals, ASSUMPTIONS | §6 Read-only safety, FR-3, §5 "No writes," §7 | YES — strongly reinforced |

**Notable positive signal:** the PRD's `.bp3-dark` reference actively confirms Blueprint **v3** (not v4/v5), matching TECHSTACK. No tech drift.

**One soft observation (not a contradiction):** the PRD deliberately omits re-stating React 17 / Webpack / pnpm versions, per its §0 scoping ("technical API findings live in the decision log… not as implementation prescriptions"). This is intentional and correct PRD hygiene, not a gap — the architecture/techstack docs remain the source of truth and the PRD does not conflict with them. Builder must read both PRD and TECHSTACK together.

---

## Summary of actionable gaps (priority order)

1. **Add the named prior-art plugins** (`mlava/yesterday-tomorrow`, `RoamJS/breadcrumbs`) and the **github.com/RoamJS ecosystem** as explicit reference inputs — builder loses concrete diff targets without them. (Gaps 1 & 2)
2. **Preserve the qualitative "header disfigurement is worse than the disease" driver** as a felt design bar, not just an NFR checkbox. (Gap 3)
3. **State a positive design north-star** for the "well-designed component" craft aspiration, beyond negative constraints. (Gap 5)
4. **Confirm the click-only / mouse demotion is acceptable** given the low-friction emotional pitch. (Gap 4 — already transparently flagged in PRD §5, just needs PM sign-off.)
5. **Tech context: no contradictions.** PRD is consistent with all four repo docs; `.bp3-dark` even corroborates Blueprint v3.
