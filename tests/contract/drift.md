# API Drift Detection — Re-Verification Procedure

Run this procedure at each Roam upgrade to catch API contract drift before it causes silent failures.

## When to Run

- After Roam auto-updates (check Settings → About for version change)
- When the `FakeRoamAdapter` starts producing incorrect behavior in integration tests
- Before cutting a roam-nav release to the Depot

## Step 1 — Check Roam Version

Open Roam Settings → About and record the new version. Compare with the version in `smoke-1-result.md`.

## Step 2 — Re-Run All Capture Snippets

Open the Roam dev console and run all snippets from `probe.md`:
- API calls 1–6 (getOpenPageOrBlockUid, q, pull, util.*)
- The openPage/openBlock signature discovery snippets

Paste the new output into a temporary `drift-check-YYYY-MM-DD.txt` file.

## Step 3 — Diff Against Frozen Fixtures

```bash
# From the project root
npx ts-node tests/fixtures/validate-fixtures.ts
```

The validator will flag any shape mismatches.

For deeper comparison, manually diff the new console output against:
- `tests/fixtures/roam-api/getOpenPageOrBlockUid.json`
- `tests/fixtures/roam-api/q-node-title.json`
- `tests/fixtures/roam-api/pull-page.json`
- `tests/fixtures/roam-api/util-dateToPageUid.json`
- `tests/fixtures/roam-api/util-pageTitleToDate.json`
- `tests/fixtures/roam-api/util-dateToPageTitle.json`

Look for:
- New keys in pull/q results (additive — usually safe)
- Removed or renamed keys (breaking — update RoamPort + FakeRoamAdapter)
- Type changes (e.g. `string` → `null` for a previously always-present field)
- openPage/openBlock parameter shape changes

## Step 4 — Re-Run Smoke #1

Run the smoke #1 snippets from `probe.md` to re-verify that openPage still does not materialize pages.

If behavior changed (now MATERIALIZED when it was NOT before):
1. Update `smoke-1-result.md` with new verdict
2. Update `guard_required` decision
3. If `guard_required` changes to `yes`, add navigation guard to the active story or file a bug

## Step 5 — Update Fixtures if Needed

If drift is detected and the new shape is correct (Roam changed its API intentionally):
1. Update the relevant `tests/fixtures/roam-api/*.json` with new shape
2. Update `FakeRoamAdapter` in `src/lib/roamPort.fake.ts` to match
3. Update `RoamPort` interface in `src/lib/roamPort.ts` if the TypeScript type changed
4. Run `pnpm test` to verify nothing is broken
5. Commit: `fix: update Roam API fixtures for vX.Y.Z drift (drift-check YYYY-MM-DD)`

## Step 6 — Archive Drift Check

Rename `drift-check-YYYY-MM-DD.txt` → delete it (it was a temp file) OR commit it as a versioned note if the drift was significant.

Update the version in `smoke-1-result.md` to reflect the current Roam version.
