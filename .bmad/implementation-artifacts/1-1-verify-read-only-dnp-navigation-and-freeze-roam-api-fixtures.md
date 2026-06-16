---
baseline_commit: effd9a708879bf59f3f360ac1b7e2dc587e9791b
---

# Story 1.1: Verify Read-Only DNP Navigation and Freeze Roam API Fixtures

Status: review

## Story

As the builder of roam-nav,
I want an executable probe confirming whether navigating to a non-existent DNP materializes a page in the graph, and a set of real-Roam-captured API response shapes,
so that the read-only invariant (FR-3) rests on evidence rather than assumption and FakeRoamAdapter is built against a true contract.

## Acceptance Criteria

1. **Given** a real Roam graph open in a dev console,  
   **When** the probe in `tests/contract/probe.md` navigates via `ui.mainWindow.openPage`/`openBlock` to a date uid with no page node,  
   **Then** the result (materialized / not-materialized) is recorded in `tests/contract/smoke-1-result.md` with the Roam version and date,  
   **And** a binary decision `guard_required ∈ {yes | no | conditional}` is written as the scoping input for Story 1.9.

2. **Given** the probe session in real Roam,  
   **When** actual responses of the 6 calls roam-nav depends on are captured,  
   **Then** they are saved as versioned JSON pacts under `tests/fixtures/roam-api/*.json`,  
   **And** `tests/fixtures/validate-fixtures.ts` asserts each fixture matches its expected response schema.

3. **Given** `guard_required` is `yes` or `conditional`,  
   **When** Story 1.9 (Date Stepper) is scoped,  
   **Then** a navigation guard around the single `openPage` call is added to its scope before implementation begins.

## Tasks / Subtasks

- [x] Task 1: Create `tests/contract/probe.md` with copy-pasteable dev-console snippets (AC: #1, #2)
  - [x] 1.1 Smoke #1 snippet — page-count before/after openPage on non-existent date uid
  - [x] 1.2 `openPage` vs `openBlock` signature discovery snippets (both title and uid forms)
  - [x] 1.3 Six API-capture snippets (one per fixture target)
- [x] Task 2: Create `tests/contract/smoke-1-result.md` template (AC: #1)
  - [x] 2.1 Scaffold with placeholders: Roam version, date, verdict, guard_required decision
- [x] Task 3: Create `tests/contract/drift.md` — re-verification procedure (AC: #2)
- [x] Task 4: Create template fixture files under `tests/fixtures/roam-api/` (AC: #2)
  - [x] 4.1 `getOpenPageOrBlockUid.json`
  - [x] 4.2 `q-node-title.json`
  - [x] 4.3 `pull-page.json`
  - [x] 4.4 `util-dateToPageUid.json`
  - [x] 4.5 `util-pageTitleToDate.json`
  - [x] 4.6 `util-dateToPageTitle.json`
- [x] Task 5: Create `tests/fixtures/validate-fixtures.ts` shape-validator (AC: #2)
- [x] **[MANUAL — temich]** Task 6: Run probe in real Roam, fill in fixtures and smoke-1-result.md
  - [x] 6.1 Open Roam developer mode (F12 / Cmd+Option+I → Console tab)
  - [x] 6.2 Execute smoke #1, record verdict + guard_required → NOT_MATERIALIZED, guard_required: no
  - [x] 6.3 Execute API-capture snippets, paste real responses into fixture files (incl. Finding-A diagnostic + snippet [C])
  - [x] 6.4 Run shape-validator — all 15 checks pass (via local tsc transpile; `npx ts-node` available after Story 1.2)
  - [ ] 6.5 Commit all files (pending — git is read-only until explicitly requested)

## Dev Notes

### Why This Story Is First — The Unproven Invariant

The entire Epic 1 read-only guarantee (FR-3) is currently an assumption. Architecture §Verification Blocker: *"Does navigating to a non-existent DNP materialize a page in the graph? Four reviewers flagged this as the dominant unknown."* Until smoke #1 runs in real Roam, `openPage`/`openBlock` could silently create a graph node, invalidating the core invariant.

The `guard_required` output gates Story 1.9 scope: if `yes`, a navigation guard must wrap the single `openPage` call before any implementation of the Date Stepper.

### Split of Work: Dev Agent vs. temich

| Who | What |
|-----|------|
| Dev agent (this story) | Creates `probe.md`, template fixtures, `validate-fixtures.ts`, `smoke-1-result.md` template, `drift.md` |
| temich | Runs snippets in real Roam dev console, fills real data into fixtures, records verdict, commits |

**Story is NOT complete until temich has run the probe and committed `smoke-1-result.md` with a verdict.**

### Critical: openPage Signature Must Be Verified

The existing `src/lib/roam.ts` (Cmd+K scaffold, to be deleted in Story 1.2) uses:
```javascript
window.roamAlphaAPI.ui.mainWindow.openPage({ title });  // title-form
```
Architecture mandates uid as navigation source of truth (D-6). The probe MUST test both forms and record which works:

```javascript
// Form A — uid (preferred per architecture D-6):
window.roamAlphaAPI.ui.mainWindow.openPage({ page: { uid: "01-01-2099" } })

// Form B — title (scaffold pattern, may be only option):
window.roamAlphaAPI.ui.mainWindow.openPage({ page: { title: "January 1st, 2099" } })

// Form C — openBlock variant (for block-zoom navigation):
window.roamAlphaAPI.ui.mainWindow.openBlock({ block: { uid: "some-block-uid" } })
```
Record which form actually opens the page and whether the parameter key is `{ uid }` directly or `{ page: { uid } }` — roamAlphaAPI has inconsistent nesting across versions.

### Smoke #1 Probe Logic

Pick a date uid guaranteed not to exist (far future):

```javascript
// Step 1 — baseline page count
const countBefore = window.roamAlphaAPI.q(
  '[:find (count ?e) . :where [?e :node/title _]]'
);

// Step 2 — navigate (try uid form first)
await window.roamAlphaAPI.ui.mainWindow.openPage({ page: { uid: "01-01-2099" } });

// Step 3 — wait for Roam to settle
await new Promise(r => setTimeout(r, 1500));

// Step 4 — check if page was created
const countAfter = window.roamAlphaAPI.q(
  '[:find (count ?e) . :where [?e :node/title _]]'
);
const pageExists = window.roamAlphaAPI.q(
  '[:find ?uid . :where [?p :block/uid ?uid] [?p :block/uid "01-01-2099"]]'
);

console.log({
  countBefore,
  countAfter,
  delta: countAfter - countBefore,
  pageExists,
  verdict: pageExists ? "MATERIALIZED" : "NOT_MATERIALIZED"
});
```

**Verdict → guard_required mapping:**
- `NOT_MATERIALIZED`, delta = 0 → `guard_required: no`
- `MATERIALIZED`, delta > 0 → `guard_required: yes`
- Inconclusive / error → `guard_required: conditional` (add guard defensively)

### Six API Calls to Capture

| # | Call | Purpose | Fixture |
|---|------|---------|---------|
| 1 | `getOpenPageOrBlockUid()` | Returns current main-window uid | `getOpenPageOrBlockUid.json` |
| 2 | `q('[:find ?title ?uid :where [?p :node/title ?title] [?p :block/uid ?uid] [?p :block/uid "06-12-2026"]]')` | Page title lookup by uid | `q-node-title.json` |
| 3 | `pull('[*]', ['block/uid', '06-12-2026'])` | Full page entity shape | `pull-page.json` |
| 4 | `util.dateToPageUid(new Date())` | Date → uid conversion | `util-dateToPageUid.json` |
| 5 | `util.pageTitleToDate("June 12th, 2026")` | Title → Date parsing | `util-pageTitleToDate.json` |
| 6 | `util.dateToPageTitle(new Date())` | Date → title formatting | `util-dateToPageTitle.json` |

Run these on a REAL DNP (e.g., today's date) to get representative data.

### Expected Response Shapes (for shape-validator)

```typescript
// 1. getOpenPageOrBlockUid() — on a DNP
// Returns: "06-12-2026"  (string, format MM-DD-YYYY)
// On non-date page: any uid string
// On daily-log view: null

// 2. q result rows
// Array<[string, string]>  →  [["June 12th, 2026", "06-12-2026"]]
// Empty result: []

// 3. pull result
// { ":node/title": string; ":block/uid": string; [key: string]: unknown } | null

// 4. util.dateToPageUid(date)
// string  →  "06-12-2026"  (MM-DD-YYYY, zero-padded)

// 5. util.pageTitleToDate(title)
// Date | null  (null for non-date-page titles)

// 6. util.dateToPageTitle(date)
// string  →  "June 12th, 2026"  (Roam ordinal format)
```

### Project Structure Notes

All files are NEW — `tests/` does not exist. Create the full directory tree:

```
tests/
  contract/
    probe.md              ← dev-agent creates (copy-pasteable JS snippets)
    smoke-1-result.md     ← dev-agent creates template; temich fills in
    drift.md              ← dev-agent creates (re-verification procedure)
  fixtures/
    roam-api/
      getOpenPageOrBlockUid.json
      q-node-title.json
      pull-page.json
      util-dateToPageUid.json
      util-pageTitleToDate.json
      util-dateToPageTitle.json
    validate-fixtures.ts  ← shape-validator (standalone, ts-node compatible)
```

**Do NOT touch `src/` in Story 1.1.** The scaffold (`NavPalette`, `useRoamPages`, `src/lib/roam.ts`) stays as-is until Story 1.2.

### validate-fixtures.ts Design

The validator is a standalone TypeScript script (no jest dependency):
- Imports each JSON file
- Checks structural types (not data values — we're checking SHAPE, not content)
- Throws with a clear message if shape is wrong
- Exits 0 on success

It must run with `npx ts-node tests/fixtures/validate-fixtures.ts` before Story 1.2's jest setup exists. Use simple `typeof` / `Array.isArray` checks — no schema library needed (keep it zero-dependency for now).

### Architecture Compliance Checklist

- [ ] Fixtures live at `tests/fixtures/roam-api/` [Source: architecture.md#Project Structure]
- [ ] Probe at `tests/contract/probe.md` [Source: architecture.md#Starter delta 4]
- [ ] Drift detector at `tests/contract/drift.md` [Source: architecture.md#Starter delta 4]
- [ ] Smoke #1 result committed as a file (not just a local note) [Source: architecture.md#Verification Blocker]
- [ ] guard_required decision is written explicitly in smoke-1-result.md [Source: epics.md#Story 1.1 AC 1]

### References

- Smoke #1 gate: [Source: .bmad/planning-artifacts/architecture.md → Verification Blocker]
- Fixture contract pattern: [Source: .bmad/planning-artifacts/architecture.md → Starter delta 4]
- FR-3 read-only invariant: [Source: .bmad/planning-artifacts/prds/prd-roam-nav-2026-06-12/prd.md → FR-3]
- guard_required feeds Story 1.9 scope: [Source: .bmad/planning-artifacts/epics.md → Story 1.1 AC 3]
- openPage uid-first mandate: [Source: .bmad/planning-artifacts/architecture.md → D-6 Date logic]
- Project directory structure: [Source: .bmad/planning-artifacts/architecture.md → Project Structure & Boundaries]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- TypeScript syntax of `validate-fixtures.ts` verified via `ts.transpileModule` — OK
- All 6 fixture JSON files verified valid JSON — OK

### Completion Notes List

- Tasks 1–5 complete: all probe, template, and validator files created and syntax-verified
- Task 6 is manual (temich): run probe.md snippets in real Roam dev console, fill fixtures, commit
- `validate-fixtures.ts` tolerates TODO placeholders with warnings; enforces shapes once real data is filled in
- Story 1.3 (FakeRoamAdapter) MUST NOT start until Task 6 is complete and fixtures have real Roam data
- Story 1.9 scope depends on `guard_required` decision recorded in `smoke-1-result.md`

### Probe Run Results (2026-06-16, Roam v0.13.11-8cdcc4be)

- ✅ **Smoke #1: NOT_MATERIALIZED** — read-only confirmed, `guard_required: no`. Story 1.9 needs no navigation guard.
- ✅ Confirmed fixtures: `dateToPageUid`, `dateToPageTitle`, `pageTitleToDate` (all working, round-trip match).
- ⚠️ **FINDING A (blocker):** `getOpenPageOrBlockUid()` returns an OBJECT (`{}`), not a uid string — likely a Promise. Breaks route-detection assumption (D-1) and blocked fixtures `q-node-title` + `pull-page`. Diagnostic snippet added to probe.md.
- ⚠️ **FINDING B (architecture impact):** `openPage` navigates by **title only**, not by uid. `openPage({page:{uid}})` and `openPage({uid})` did NOT navigate; `openPage({page:{title}})` and `openBlock({block:{uid}})` did. Contradicts D-6 ("uid as nav source of truth"). Date Stepper (1.9) must navigate via `dateToPageTitle` → `openPage({page:{title}})`.
- ⏳ Pending: Finding-A diagnostic run to (1) resolve getOpenPageOrBlockUid call shape, (2) confirm openPage-by-uid on an existing page.

### Change Log

- 2026-06-12: Created probe.md, smoke-1-result.md template, drift.md, 6 fixture templates, validate-fixtures.ts (Tasks 1–5)
- 2026-06-16: Ran probe in real Roam. Smoke #1 = read-only confirmed. Filled 3 valid fixtures; 2 blocked by Finding A. Logged Findings A & B (both impact architecture).
- 2026-06-16: Ran Finding-A diagnostic + snippet [C]. Resolved both findings. All 6 fixtures captured with real data; validator passes 15/15. Updated architecture D-1 (async) and D-6 (navigate by title). Story complete.

### Final Findings Summary (verified, Roam v0.13.11-8cdcc4be)

1. **Read-only confirmed** — `guard_required: no`. No navigation guard needed (Story 1.9 simpler).
2. **getOpenPageOrBlockUid is `Promise<string | null>`** — adapter MUST await; `null` = no page/DNP open. (Architecture D-1 updated.)
3. **Navigate by title, not uid** — `openPage({page:{uid}})` only works on existing pages; `openPage({page:{title}})` works universally incl. empty dates. Date Stepper uses `dateToPageTitle` → title-form. (Architecture D-6 updated.)
4. **Timezone** — `pageTitleToDate` returns local-midnight Date; use local components / util round-trip, never toISOString slicing.
5. **pull entity** carries `:node/title` + `:block/uid` (+ create/edit/page/db metadata); roam-nav needs only the first two.

### File List

- `tests/contract/probe.md` (NEW)
- `tests/contract/smoke-1-result.md` (NEW — template for temich to fill)
- `tests/contract/drift.md` (NEW)
- `tests/fixtures/roam-api/getOpenPageOrBlockUid.json` (NEW — template)
- `tests/fixtures/roam-api/q-node-title.json` (NEW — template)
- `tests/fixtures/roam-api/pull-page.json` (NEW — template)
- `tests/fixtures/roam-api/util-dateToPageUid.json` (NEW — template)
- `tests/fixtures/roam-api/util-pageTitleToDate.json` (NEW — template)
- `tests/fixtures/roam-api/util-dateToPageTitle.json` (NEW — template)
- `tests/fixtures/validate-fixtures.ts` (NEW)
