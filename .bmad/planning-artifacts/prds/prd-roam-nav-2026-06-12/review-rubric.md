# PRD Quality Review — roam-nav

## Overall verdict

This is a tight, well-disciplined PRD for what it is: a single-operator hobby plugin with two coherent features hung off one genuine thesis (the DNP as navigation anchor). The FRs are unusually testable — most carry concrete `roamAlphaAPI` consequences an engineer can verify — and scope honesty is exemplary, with omissions tagged inline and rolled into a clean Non-Goals and Assumptions Index. What's at risk is small and mechanical: one real internal contradiction (the Vision/Non-Goals disagree about whether keyboard/mouse-free use is in play), a couple of glossary terms used loosely, and one FR consequence ("survives Roam top-bar DOM restructures") that is more aspiration than testable bound. None of these block downstream design; all are quick fixes.

**Gate: PASS-WITH-FIXES.**

## Decision-readiness — strong

A builder can act on this today. The two features are decided, not deliberated; the central bet (anchor everything on the DNP) is stated in §1 and traced through every FR. Trade-offs are named with what was given up: in-memory-only Trail (loses persistence, §7.2 + NOTE FOR PM), true visit-log over browser-stack trimming (FR-7 ASSUMPTION), main-window-only (drops sidebar). Open Questions in §9 are genuinely open — Q1 (jump-back semantics) and Q3 (persistence) name real tensions with the chosen-for-now answer and the condition under which to revisit, rather than rhetorical questions. The single `[NOTE FOR PM]` (§7.2, localStorage fast-follow) sits at a real deferred decision, not a safe checkpoint.

### Findings
- **low** Open Question Q4 and Q5 are build-time chores, not decisions (§9) — API signature verification (Q4) and stepper placement (Q5) are flagged elsewhere as implementer's choice / pre-build verification. They're correctly captured but slightly inflate the "open decisions" count for a green-light PRD. *Fix:* optionally move Q4/Q5 under a "Build-time verification" sub-heading to keep §9 as genuine product decisions.

## Substance over theater — strong

Almost no furniture. The Vision (§1) is product-specific — it names the exact gap (native date-stepping breaks on the daily-log view; an existing breadcrumbs plugin disfigures the header) and could not swap into another PRD. No persona theater (no personas at all, correctly — see Shape fit). NFRs in §6 are product-specific with real bounds ("never injected into `.rm-topbar`", "no full-graph scans on every route change", "zero write APIs"), not boilerplate. The counter-metric SM-C1 (don't grow into a second toolbar) is an earned tension, not decoration.

### Findings
- (none)

## Strategic coherence — strong

The PRD has a thesis and bets on it: "the DNP as navigation anchor" unifies both time (Date Stepper re-anchors to each landed DNP) and space (Trail resets and roots on every DNP open). Feature priority follows the thesis — both features ARE the thesis expressed in two axes, not a backlog. Success metrics validate the thesis rather than measure activity: SM-1 is sustained use (engagement quality), SM-2 is the header-integrity promise the product exists to keep, and SM-C1 is a named counter-metric. Qualitative metrics are appropriate for a solo tool and explicitly labeled as such (§8 header).

### Findings
- (none)

## Done-ness clarity — strong (one soft spot)

This is the PRD's strongest dimension and the one downstream leans on hardest. Every FR (FR-1 through FR-7) carries a "Consequences (testable)" block with verifiable conditions — DOM-position checks (FR-4: "not a descendant of `.rm-topbar`"), API-call assertions (FR-3: "no `roamAlphaAPI.createPage`… is issued"), state assertions (FR-6: "the Trail contains exactly one Crumb"), and order assertions (FR-5: "Trail Root → most recent, left → right"). No "handles X gracefully" or "user-friendly" hand-waving in the FRs.

### Findings
- **medium** "Survives Roam top-bar DOM restructures" is not testable as written (§4.2, FR-4 consequence) — unlike its sibling bullets, this consequence names no observable condition (which restructures? verified how?). It restates the §6 DOM-resilience intent without a check. *Fix:* reframe as the §6 contract already states it — "on an article/title remount the bar re-attaches; on an unrecognized DOM shape the feature is absent, never breaking the header" — i.e., a degrade-to-absent assertion that can actually be exercised.
- **low** FR-4 "theme-aware (light / `.bp3-dark`)" has no done-condition (§4.2) — "Styling adapts to light and dark themes" is the one adjective-shaped consequence. *Fix:* bound it minimally, e.g. "Trail text/background read from theme tokens or `.bp3-dark` selector; legible (no invisible-on-dark) in both themes" — enough for a visual check.

## Scope honesty — strong

Best-in-class for the stakes. Omissions are explicit, not inferred: §5 Non-Goals does real work (six concrete exclusions, each with the reason), §7.2 repeats the MVP cuts with version targets and rationale, and inferences carry `[ASSUMPTION: …]` tags (FR-5, FR-7, feature NFR) that round-trip cleanly into §10. De-scoping is proposed openly — the Cmd+K palette is named and pushed out in three places (§0, §5, §7.2), so nobody can silently assume it. Open-items density (6 Open Questions + 3 ASSUMPTIONs + 1 NOTE FOR PM) is high in absolute terms but entirely appropriate for a hobby PRD where "tune during build" is a legitimate stance.

### Findings
- (none — see Decision-readiness Q4/Q5 note for the only nit)

## Downstream usability — adequate

The PRD feeds design/architecture/implementation (per §0) and is mostly source-extractable. Glossary (§3) is present and the six terms are defined once. FR IDs are contiguous and unique (FR-1…FR-7), UJ IDs (UJ-1, UJ-2) and SM IDs (SM-1, SM-2, SM-C1) are clean, and cross-references resolve (§5/§6/§7.2/§8/§9/§10 all point at real anchors). Each feature section is self-contained enough to pull out alone. The soft spots are glossary discipline (below) and a couple of forward-references ("see §8") where §8 is Open Questions — fine, but "see §8" reads as a pointer to a section that doesn't itself resolve the item.

### Findings
- **medium** Glossary-term drift: "header" used as a synonym for both `.rm-topbar` and "top bar" (§1, §4.2, §6, SM-2) — the Glossary fixes DNP/Trail/Crumb etc. but never defines the most load-bearing noun in the whole PRD. The text alternates "Roam's header", "Roam's top bar", "`.rm-topbar`", and "native top-bar controls" for what is (mostly) one thing. Since header-integrity is the load-bearing NFR and SM-2, the ambiguity matters. *Fix:* add a Glossary entry, e.g. "**Top bar (`.rm-topbar`)** — Roam's native header row; roam-nav never injects into it," and use that term verbatim (drop bare "header" or make "header" explicitly = top bar).
- **low** "Trail Root" vs "first Crumb" used interchangeably (§3, FR-6) — §3 says the Trail Root "heads the Trail"; FR-6 says the DNP "makes that DNP the first Crumb (Trail Root)". Consistent in meaning but a reader must infer Trail Root ⊆ Crumb. *Fix:* one clause in §3 — "the Trail Root is itself the first Crumb."
- **low** "see §8" points at Open Questions, not a resolution (§4.2 FR-7, §6 API-shape NFR) — the cross-ref resolves to a real section but to an open item, which can read as a dangling promise. *Fix:* phrase as "(open — see §9 Q4)" and note §8 is Success Metrics, §9 is Open Questions; FR-7 and §6 say "§8" but mean §9. **This is also an ID/cross-ref error — verify: FR-7's "(see §8)" and §6's "(see §8)" appear to intend §9 Open Questions.**

## Shape fit — strong

The PRD knows what it is. It declares itself a personal/hobby single-operator tool (§0, §2.2, §8 header) and adopts the right shape: capability-spec with light rigor, qualitative operational metrics, and no enterprise furniture (no stakeholders, ROI, SLAs, compliance, instrumented KPIs) — exactly correct for the stakes. It is NOT over-formalized: the two UJs are kept but earn their place by mapping 1:1 to the two features (UJ-1→Date Stepper, UJ-2→Trail) and each has a named protagonist ("Temich"). Per the rubric, UJs are optional overhead for a single-operator tool; here they're lean and load-bearing as feature-realization narratives, so keeping them is defensible. Not under-formalized either. Good fit.

### Findings
- (none)

## Mechanical notes

- **Internal contradiction (HIGH — the one real content issue).** §1 Vision implies mouse-free / keyboard travel ("without ever bouncing back… or opening a menu") and §5 explicitly calls out the Vision phrase *"without touching the mouse"* as aspirational — but that exact phrase does **not appear** in §1 as written (§1 says "without… opening a menu"). So §5 quotes a Vision line that isn't in the Vision. Either the Vision was edited and §5's quote went stale, or the intended phrase was dropped. Net effect: a reader can't tell whether keyboard-first is teased in the Vision or not. *Fix:* reconcile — either restore the "without touching the mouse" phrasing in §1 (and keep §5's clarification) or update §5 to quote the actual §1 wording. Tag the residual aspiration with `[ASSUMPTION]` or leave it solely in Non-Goals.
- **Cross-ref target error (MEDIUM).** Multiple "(see §8)" references (§4.2 FR-7, §6 API-shape NFR) appear to intend **§9 Open Questions** (§8 is Success Metrics). Verify and renumber. §4.1 Out-of-Scope "(see §6.2)" — there is no §6.2; §6 has no sub-numbering. Likely intends §7.2. **Two broken/ambiguous cross-refs total.**
- **Glossary drift.** "header" / "top bar" / "`.rm-topbar`" used as synonyms for the load-bearing noun (see Downstream usability). Promote to Glossary and use verbatim.
- **Assumptions Index roundtrip — clean.** All three inline `[ASSUMPTION]` tags (FR-5, FR-7, FR-feature-NFR) appear in §10; all three §10 entries trace back to an inline tag. No orphans either direction.
- **ID continuity — clean.** FR-1…FR-7 contiguous/unique; UJ-1/UJ-2, SM-1/SM-2/SM-C1 clean; features 4.1/4.2 map to FR ranges as stated.
- **UJ protagonist naming — clean.** Both UJs carry the named protagonist "Temich" inline with full context.
- **Title still provisional.** §title "roam-nav" + "*Working title — confirm.*" (§ heading) — confirm before downstream artifacts inherit the name. *low.*
