# roam-nav — Dev Console Probe Playbook

Open Roam Research. Press **F12** (or **Cmd+Option+I** on Mac) → **Console** tab.
Run each snippet by pasting it and pressing Enter. Record results in `smoke-1-result.md`.

---

## Smoke #1 — Does openPage on a non-existent DNP write to the graph?

This is the critical read-only gate for FR-3 and the entire Epic 1 invariant.
We use a date far in the future (`01-01-2099`) which is guaranteed not to exist.

### Step A — Baseline page count

```javascript
const countBefore = window.roamAlphaAPI.q(
  '[:find (count ?e) . :where [?e :node/title _]]'
);
console.log('[smoke-1] page count before:', countBefore);
```

Record `countBefore`.

### Step B — Navigate via uid form (preferred per architecture D-6)

```javascript
// Try uid form first — this is what the architecture mandates
await window.roamAlphaAPI.ui.mainWindow.openPage({ page: { uid: "01-01-2099" } });
console.log('[smoke-1] openPage uid-form fired');
```

If this throws or does nothing, try the title form in Step B2 below.

### Step B2 — Fallback: navigate via title form

```javascript
// Try title form if uid form fails
await window.roamAlphaAPI.ui.mainWindow.openPage({ page: { title: "January 1st, 2099" } });
console.log('[smoke-1] openPage title-form fired');
```

Record which form successfully navigated (visually verify the page opens in Roam).

### Step C — Wait for graph to settle, then check

```javascript
await new Promise(r => setTimeout(r, 1500));

const countAfter = window.roamAlphaAPI.q(
  '[:find (count ?e) . :where [?e :node/title _]]'
);

const pageExists = window.roamAlphaAPI.q(
  '[:find ?uid . :where [?p :block/uid ?uid] [?p :block/uid "01-01-2099"]]'
);

const titleExists = window.roamAlphaAPI.q(
  '[:find ?t . :where [?p :node/title ?t] [?p :node/title "January 1st, 2099"]]'
);

console.log('[smoke-1] result:', {
  countBefore,
  countAfter,
  delta: countAfter - countBefore,
  pageExistsByUid: pageExists,
  pageExistsByTitle: titleExists,
  verdict: (pageExists || titleExists) ? "MATERIALIZED ⚠️" : "NOT_MATERIALIZED ✅"
});
```

Record the full console output in `smoke-1-result.md`.

**Verdict mapping:**
- `NOT_MATERIALIZED`, delta = 0 → `guard_required: no`
- `MATERIALIZED`, delta > 0 → `guard_required: yes`
- Error or ambiguous → `guard_required: conditional`

---

## openPage / openBlock Signature Discovery

Determines the exact parameter shape for the RoamPort adapter.

### openPage — uid form

```javascript
// Check if { page: { uid } } is the correct shape
const result1 = await window.roamAlphaAPI.ui.mainWindow.openPage({ page: { uid: "06-12-2026" } });
console.log('[sig] openPage uid-form result:', result1);
```

### openPage — direct uid form (some versions)

```javascript
// Some versions accept { uid } directly without { page: ... } wrapper
const result2 = await window.roamAlphaAPI.ui.mainWindow.openPage({ uid: "06-12-2026" });
console.log('[sig] openPage direct-uid result:', result2);
```

### openPage — title form

```javascript
const result3 = await window.roamAlphaAPI.ui.mainWindow.openPage({ page: { title: "June 12th, 2026" } });
console.log('[sig] openPage title-form result:', result3);
```

### openBlock — for block-zoom navigation

```javascript
// Get a real block uid from the current page first
const blocks = window.roamAlphaAPI.q(
  '[:find ?uid :limit 1 :where [?b :block/uid ?uid] [?b :block/string _]]'
);
const blockUid = blocks[0]?.[0] || blocks?.[0];
console.log('[sig] sample block uid:', blockUid);

if (blockUid) {
  const result4 = await window.roamAlphaAPI.ui.mainWindow.openBlock({ block: { uid: blockUid } });
  console.log('[sig] openBlock result:', result4);
}
```

Record which forms work and their exact parameter shapes in `smoke-1-result.md`.

---

## API Call 1 — getOpenPageOrBlockUid

Run from a **Daily Notes Page** (navigate to today's page first):

```javascript
// On a DNP
const onDnp = window.roamAlphaAPI.ui.mainWindow.getOpenPageOrBlockUid();
console.log('[fixture-1] on DNP:', JSON.stringify({ result: onDnp, type: typeof onDnp }));
```

Then navigate to a regular page (e.g. your daily log or any non-date page) and run:

```javascript
// On a regular page
const onPage = window.roamAlphaAPI.ui.mainWindow.getOpenPageOrBlockUid();
console.log('[fixture-1] on regular page:', JSON.stringify({ result: onPage, type: typeof onPage }));
```

Then open the "All Pages" / daily notes log view if available:

```javascript
// On daily-log / no specific page open
const onLog = window.roamAlphaAPI.ui.mainWindow.getOpenPageOrBlockUid();
console.log('[fixture-1] on log view:', JSON.stringify({ result: onLog, type: typeof onLog }));
```

---

## API Call 2 — q: node title lookup by uid

Navigate to today's DNP. Replace `TODAY_UID` with the actual uid shown in Call 1.

```javascript
const todayUid = window.roamAlphaAPI.ui.mainWindow.getOpenPageOrBlockUid();
const rows = window.roamAlphaAPI.q(
  `[:find ?title ?uid :where [?p :node/title ?title] [?p :block/uid ?uid] [?p :block/uid "${todayUid}"]]`
);
console.log('[fixture-2] q node-title result:', JSON.stringify({ rows, rowType: Array.isArray(rows) ? 'array' : typeof rows }));
```

Also capture the empty-result shape (query for a uid that doesn't exist):

```javascript
const emptyRows = window.roamAlphaAPI.q(
  '[:find ?title ?uid :where [?p :node/title ?title] [?p :block/uid ?uid] [?p :block/uid "XX-XX-0000"]]'
);
console.log('[fixture-2] q empty result:', JSON.stringify(emptyRows));
```

---

## API Call 3 — pull: full page entity

```javascript
const todayUid = window.roamAlphaAPI.ui.mainWindow.getOpenPageOrBlockUid();
const entity = window.roamAlphaAPI.pull('[*]', [':block/uid', todayUid]);
// Log only the keys (not full content — graph data may be sensitive)
const safeShape = entity ? Object.keys(entity).reduce((acc, k) => {
  acc[k] = typeof entity[k];
  return acc;
}, {}) : null;
console.log('[fixture-3] pull shape (keys only):', JSON.stringify(safeShape));
console.log('[fixture-3] pull uid field:', entity?.[':block/uid']);
console.log('[fixture-3] pull title field:', entity?.[':node/title']);
```

Also capture null case (non-existent uid):

```javascript
const nullEntity = window.roamAlphaAPI.pull('[*]', [':block/uid', 'XX-XX-0000']);
console.log('[fixture-3] pull null result:', nullEntity);
```

---

## API Call 4 — util.dateToPageUid

```javascript
const today = new Date();
const uid = window.roamAlphaAPI.util.dateToPageUid(today);
console.log('[fixture-4] dateToPageUid:', JSON.stringify({
  input: today.toISOString(),
  result: uid,
  type: typeof uid,
  format_example: uid  // should be "MM-DD-YYYY" e.g. "06-12-2026"
}));

// Also test year boundaries
const jan1 = new Date(2026, 0, 1); // Jan 1st
const dec31 = new Date(2026, 11, 31); // Dec 31st
console.log('[fixture-4] jan1:', window.roamAlphaAPI.util.dateToPageUid(jan1));
console.log('[fixture-4] dec31:', window.roamAlphaAPI.util.dateToPageUid(dec31));
```

---

## API Call 5 — util.pageTitleToDate

```javascript
// Valid DNP title
const d1 = window.roamAlphaAPI.util.pageTitleToDate("June 12th, 2026");
console.log('[fixture-5] valid title:', JSON.stringify({
  input: "June 12th, 2026",
  result: d1 instanceof Date ? d1.toISOString() : d1,
  isDate: d1 instanceof Date,
  isNull: d1 === null
}));

// Invalid / non-date title
const d2 = window.roamAlphaAPI.util.pageTitleToDate("Some Random Page");
console.log('[fixture-5] non-date title:', JSON.stringify({
  input: "Some Random Page",
  result: d2,
  isNull: d2 === null
}));

// Edge case: January 1st (ordinal "1st")
const d3 = window.roamAlphaAPI.util.pageTitleToDate("January 1st, 2026");
console.log('[fixture-5] jan1:', d3 instanceof Date ? d3.toISOString() : d3);
```

---

## API Call 6 — util.dateToPageTitle

```javascript
const today = new Date();
const title = window.roamAlphaAPI.util.dateToPageTitle(today);
console.log('[fixture-6] dateToPageTitle:', JSON.stringify({
  input: today.toISOString(),
  result: title,
  type: typeof title,
  format_example: title  // should be "June 12th, 2026"
}));

// Verify round-trip: dateToPageTitle -> pageTitleToDate -> dateToPageUid
const roundTrip = window.roamAlphaAPI.util.dateToPageUid(
  window.roamAlphaAPI.util.pageTitleToDate(title)
);
const directUid = window.roamAlphaAPI.util.dateToPageUid(today);
console.log('[fixture-6] round-trip check:', {
  title,
  roundTrip,
  directUid,
  match: roundTrip === directUid
});
```

---

## Finding-A Diagnostic — resolve getOpenPageOrBlockUid + openPage-by-uid

Run this on **today's Daily Notes Page** (which definitely exists). It resolves both
deviations found in the first probe run.

```javascript
// ── Part 1: what does getOpenPageOrBlockUid actually return? ──
const raw = window.roamAlphaAPI.ui.mainWindow.getOpenPageOrBlockUid();
console.log('[A] typeof:', typeof raw);
console.log('[A] is Promise?:', raw instanceof Promise);
console.log('[A] constructor:', raw?.constructor?.name);
console.log('[A] Object.keys:', Object.keys(raw || {}));
console.log('[A] String():', String(raw));

// If it's a Promise, await it:
if (raw && typeof raw.then === 'function') {
  const awaited = await raw;
  console.log('[A] AWAITED result:', JSON.stringify(awaited), 'typeof:', typeof awaited);
}

// ── Part 2: does openPage by uid work on an EXISTING page? ──
// Get a real, existing page uid (any page with a title)
const existing = window.roamAlphaAPI.q(
  '[:find ?uid :limit 1 :where [?p :node/title _] [?p :block/uid ?uid]]'
);
const existingUid = existing?.[0]?.[0];
console.log('[B] existing page uid:', existingUid);

if (existingUid) {
  const r = await window.roamAlphaAPI.ui.mainWindow.openPage({ page: { uid: existingUid } });
  console.log('[B] openPage existing-uid result:', r);
  console.log('[B] >>> LOOK AT ROAM: did it navigate to that page? (yes/no)');
}
```

Record in `smoke-1-result.md`:
- **[A]** the awaited result (is it a uid string after `await`?) — this determines whether the
  RoamPort adapter must `await` this call.
- **[B]** whether `openPage` by uid navigates to an *existing* page (yes/no, visually confirmed).

---

## Snippet [C] — Capture current-uid + unblock fixtures (final)

Run this anywhere in Roam. It opens a known-existing page itself, then reads the uid (awaited)
and captures the two blocked fixtures with a real uid.

```javascript
// Pick a real existing page (title + uid)
const someExisting = window.roamAlphaAPI.q(
  '[:find ?title ?uid :limit 1 :where [?p :node/title ?title] [?p :block/uid ?uid]]'
);
const pickTitle = someExisting?.[0]?.[0];
const pickUid   = someExisting?.[0]?.[1];
console.log('[C] picked page:', JSON.stringify({ pickTitle, pickUid }));

// Navigate to it by TITLE (the universal form)
await window.roamAlphaAPI.ui.mainWindow.openPage({ page: { title: pickTitle } });
await new Promise(r => setTimeout(r, 800));

// Read current uid — AWAITED (the method is a Promise)
const curUid = await window.roamAlphaAPI.ui.mainWindow.getOpenPageOrBlockUid();
console.log('[C] getOpenPageOrBlockUid (awaited):', JSON.stringify(curUid), 'typeof:', typeof curUid);
console.log('[C] matches picked uid?:', curUid === pickUid);

// Capture fixture-2 (q node-title) with a REAL uid
const rows = window.roamAlphaAPI.q(
  `[:find ?title ?uid :where [?p :node/title ?title] [?p :block/uid ?uid] [?p :block/uid "${pickUid}"]]`
);
console.log('[C] fixture-2 q rows:', JSON.stringify(rows));

// Capture fixture-3 (pull) with a REAL uid — keys only, no content
const entity = window.roamAlphaAPI.pull('[*]', [':block/uid', pickUid]);
const safeShape = entity ? Object.keys(entity).reduce((a,k)=>{a[k]=typeof entity[k];return a;},{}) : null;
console.log('[C] fixture-3 pull keys:', JSON.stringify(safeShape));
console.log('[C] fixture-3 uid field:', entity?.[':block/uid']);
console.log('[C] fixture-3 title field:', entity?.[':node/title']);
```

Send back all `[C]` lines. This resolves getOpenPageOrBlockUid and unblocks both fixtures.

---

## After Running All Snippets

1. Fill in `tests/fixtures/roam-api/*.json` with the captured data
2. Fill in `tests/contract/smoke-1-result.md` with the smoke #1 verdict
3. Run the shape validator: `npx ts-node tests/fixtures/validate-fixtures.ts`
4. Commit everything with message: `test: freeze Roam API fixtures and smoke-1 result (Story 1.1)`
