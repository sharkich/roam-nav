# Smoke #1 Result — Read-Only DNP Navigation Probe

## Probe Metadata

| Field | Value |
|-------|-------|
| Date run | 2026-06-16 |
| Roam version | 0.13.11-8cdcc4be |
| Operator | temich |

## Smoke #1 Verdict — ✅ READ-ONLY CONFIRMED

**Question:** Does `ui.mainWindow.openPage` on a non-existent DNP materialize a page in the graph?

| Metric | Value |
|--------|-------|
| countBefore | 4623 |
| countAfter | 4623 |
| delta | **0** |
| pageExistsByUid | null |
| pageExistsByTitle | null |
| Verdict | **NOT_MATERIALIZED ✅** |

Navigating to both `01-01-2099` (uid form) and `January 1st, 2099` (title form) left the
graph page count identical. No write occurred.

## guard_required Decision

```
guard_required: no
```

**Rationale:** delta = 0 and neither uid- nor title-based navigation to a non-existent date
created a page. The read-only invariant (FR-3) holds without a navigation guard. Story 1.9 can
use plain `openPage` with no guard around it.

---

## ⚠️ FINDING A — getOpenPageOrBlockUid() returns an OBJECT, not a uid string

**Critical deviation from architecture D-1.** On every surface (DNP, regular page, log view):

```js
window.roamAlphaAPI.ui.mainWindow.getOpenPageOrBlockUid()
// → JSON.stringify gives "{}", typeof is "object"
```

Architecture and Stories 1.3 / 1.7 assumed this returns a `string` uid (`"06-12-2026"`).
Reality in v0.13.11: it returns an object (likely a `Promise` — `typeof "object"` +
`JSON.stringify → "{}"` is the classic Promise signature).

**Impact:** this is the source-of-truth for route detection. Until resolved, fixtures
`q-node-title.json` and `pull-page.json` could not be captured (their query input `todayUid`
was the broken object, so `q` returned `[]` and `pull` returned `null`).

**Resolution (diagnostic run 2026-06-16):**
- `getOpenPageOrBlockUid()` IS a **Promise** (`is Promise?: true`, `constructor: Promise`).
  The RoamPort adapter MUST `await` it. Without await you get an unresolved Promise (the `{}`
  seen in the first run).
- After `await` it returned `null` in the diagnostic context — `null` is the documented value
  for the scrolling daily-log view, but it must also be confirmed to return a real uid string
  when a concrete page is open. Pending the [C] snippet (explicit-navigation capture).

**FULLY RESOLVED (snippet [C], 2026-06-16):**
- `getOpenPageOrBlockUid()` is `Promise<string | null>`. After `await`, on the open page
  "task/action" it returned `"vRMmbJUHV"` (typeof string), matching the page's actual uid.
- The earlier `null` was simply because no concrete page was open at that moment.
- **Adapter rule:** `const uid = await port...getOpenPageOrBlockUid()` — always await; treat
  `null` as "no DNP/page resolved" (→ Stepper absent, per FR-1).
- Fixtures `q-node-title` and `pull-page` captured with the real uid and now pass the validator.

---

## ⚠️ FINDING B — openPage navigates by TITLE, not by uid

**Critical deviation from architecture D-6 ("uid as source of truth for navigation").**

| Form | Result value | Navigates? |
|------|--------------|------------|
| `openPage({ page: { uid: "06-12-2026" } })` | `undefined` | ❌ NO |
| `openPage({ uid: "06-12-2026" })` (direct) | `null` | ❌ NO |
| `openPage({ page: { title: "June 12th, 2026" } })` | `undefined` | ✅ YES |
| `openBlock({ block: { uid: "BrnnXElzi" } })` | `undefined` | ✅ YES |

**Impact:** the Date Stepper (Story 1.9) cannot navigate to an adjacent day by its uid. It must
convert the target date to a **title** via `util.dateToPageTitle(date)` and call
`openPage({ page: { title } })`. `openBlock` by uid still works (for block-zoom). uid remains
the source-of-truth for *identity/date-math*, but navigation goes through title.

**Resolution (diagnostic run 2026-06-16):** `openPage({ page: { uid } })` DOES navigate when
the page **exists** (confirmed visually — "Google Calendar note" page opened). It silently
no-ops only for a **non-existent** date uid. Therefore:
- For existing pages: uid-form OR title-form both work.
- For non-existent dates (the Date Stepper's whole job): **title-form is required.**
- **Conclusion: navigate everything via `util.dateToPageTitle(date)` → `openPage({page:{title}})`** —
  it is the single universal form. uid stays the identity/date-math source of truth.

---

## Working API Calls (confirmed)

| Call | Result | Status |
|------|--------|--------|
| `util.dateToPageUid(today)` | `"06-16-2026"` (MM-DD-YYYY, zero-padded) | ✅ |
| `util.dateToPageUid(Jan 1)` | `"01-01-2026"` | ✅ |
| `util.dateToPageUid(Dec 31)` | `"12-31-2026"` | ✅ |
| `util.dateToPageTitle(today)` | `"June 16th, 2026"` | ✅ |
| `util.pageTitleToDate("June 12th, 2026")` | Date @ local midnight | ✅ |
| `util.pageTitleToDate("Some Random Page")` | `null` | ✅ |
| round-trip (title→date→uid) | matches direct uid (`match: true`) | ✅ |

**Timezone note:** `pageTitleToDate("June 12th, 2026")` → `2026-06-11T21:00:00.000Z`, i.e. local
midnight (UTC+3) shown in UTC. Date-math must use **local date components** or stay inside
Roam's `util.*` round-trip — never `.toISOString()` slicing, which would shift the day.

## openPage / openBlock Signature Findings (summary)

**Canonical navigation form for the RoamPort adapter:** `openPage({ page: { title } })`
— derive the title from the date with `util.dateToPageTitle`. uid-form does NOT navigate
(at least for non-existent pages). `openBlock({ block: { uid } })` works for block targets.
