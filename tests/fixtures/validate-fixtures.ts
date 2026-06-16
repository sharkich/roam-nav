/**
 * Shape validator for frozen Roam API fixtures.
 * Run: npx ts-node tests/fixtures/validate-fixtures.ts
 *
 * Validates structural shape only — not data values.
 * Exits 0 on success, 1 on any shape mismatch.
 */

import * as fs from 'fs';
import * as path from 'path';

const FIXTURES_DIR = path.join(__dirname, 'roam-api');

// ─── helpers ────────────────────────────────────────────────────────────────

let errors = 0;

function fail(fixture: string, message: string): void {
  console.error(`  ✗ [${fixture}] ${message}`);
  errors++;
}

function pass(fixture: string, message: string): void {
  console.log(`  ✓ [${fixture}] ${message}`);
}

function loadFixture(name: string): unknown {
  const filePath = path.join(FIXTURES_DIR, name);
  if (!fs.existsSync(filePath)) {
    fail(name, `File not found: ${filePath}`);
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (e) {
    fail(name, `Invalid JSON: ${(e as Error).message}`);
    return null;
  }
}

function isTodo(value: unknown): boolean {
  return typeof value === 'string' && value.startsWith('TODO');
}

// ─── validators ─────────────────────────────────────────────────────────────

function validateGetOpenPageOrBlockUid(name: string): void {
  const fixture = loadFixture(name) as Record<string, unknown> | null;
  if (!fixture) return;

  // Method is async — fixture must record that the adapter awaits it
  if (fixture['_async'] !== true) {
    fail(name, '_async must be true (getOpenPageOrBlockUid returns a Promise — adapter must await)');
  } else {
    pass(name, '_async true — adapter must await this Promise');
  }

  // on_open_page.result must be a string (the awaited uid)
  const onOpen = fixture['on_open_page'] as Record<string, unknown> | undefined;
  if (!onOpen) { fail(name, 'Missing on_open_page section'); return; }
  if (typeof onOpen['result'] !== 'string') {
    fail(name, `on_open_page.result must be a string uid, got ${typeof onOpen['result']}`);
  } else {
    pass(name, `on_open_page.result is a uid string: "${onOpen['result']}"`);
  }

  // on_log_view_or_boot.result must be null
  const onLog = fixture['on_log_view_or_boot'] as Record<string, unknown> | undefined;
  if (!onLog) { fail(name, 'Missing on_log_view_or_boot section'); return; }
  if (onLog['result'] !== null) {
    fail(name, `on_log_view_or_boot.result must be null, got ${JSON.stringify(onLog['result'])}`);
  } else {
    pass(name, 'on_log_view_or_boot.result is null as expected');
  }

  // shape contract
  const shape = fixture['_shape'] as Record<string, unknown> | undefined;
  if (shape && shape['requires_await'] !== true) {
    fail(name, '_shape.requires_await must be true');
  } else if (shape) {
    pass(name, '_shape.requires_await confirmed true');
  }
}

function validateQNodeTitle(name: string): void {
  const fixture = loadFixture(name) as Record<string, unknown> | null;
  if (!fixture) return;

  const found = fixture['found_result'] as Record<string, unknown> | undefined;
  if (!found) { fail(name, 'Missing found_result section'); return; }

  const result = found['result'];
  if (isTodo(result) || result === 'BLOCKED') {
    fail(name, `found_result.result not captured (value: ${JSON.stringify(result)})`);
  } else if (!Array.isArray(result)) {
    fail(name, `found_result.result must be an array, got ${typeof result}`);
  } else if (result.length > 0) {
    const row = result[0];
    if (!Array.isArray(row) || row.length < 2) {
      fail(name, `found_result.result[0] must be [string, string] row`);
    } else if (typeof row[0] !== 'string' || typeof row[1] !== 'string') {
      fail(name, `found_result.result[0] must be [string (title), string (uid)]`);
    } else {
      pass(name, `found_result.result shape valid: [[title, uid], ...]`);
    }
  } else {
    pass(name, 'found_result.result is empty array (valid)');
  }

  const empty = fixture['empty_result'] as Record<string, unknown> | undefined;
  if (!empty) { fail(name, 'Missing empty_result section'); return; }
  if (!Array.isArray(empty['result']) || (empty['result'] as unknown[]).length !== 0) {
    fail(name, 'empty_result.result must be an empty array []');
  } else {
    pass(name, 'empty_result.result is [] as expected');
  }
}

function validatePullPage(name: string): void {
  const fixture = loadFixture(name) as Record<string, unknown> | null;
  if (!fixture) return;

  const found = fixture['found_result'] as Record<string, unknown> | undefined;
  if (!found) { fail(name, 'Missing found_result section'); return; }

  const keyTypes = found['result_key_types'] as Record<string, unknown> | undefined;
  if (!keyTypes || typeof keyTypes !== 'object') {
    fail(name, `result_key_types not captured (value: ${JSON.stringify(keyTypes)})`);
  } else {
    const hasUid = keyTypes[':block/uid'] !== undefined;
    const hasTitle = keyTypes[':node/title'] !== undefined;
    if (!hasUid) fail(name, 'result_key_types missing :block/uid field');
    else pass(name, ':block/uid key present in entity shape');
    if (!hasTitle) fail(name, 'result_key_types missing :node/title field');
    else pass(name, ':node/title key present in entity shape');
  }

  const nullResult = fixture['null_result'] as Record<string, unknown> | undefined;
  if (!nullResult) { fail(name, 'Missing null_result section'); return; }
  if (nullResult['result'] !== null) {
    fail(name, `null_result.result must be null, got ${JSON.stringify(nullResult['result'])}`);
  } else {
    pass(name, 'null_result.result is null as expected');
  }
}

function validateUtilDateToPageUid(name: string): void {
  const fixture = loadFixture(name) as Record<string, unknown> | null;
  if (!fixture) return;

  const today = fixture['today_result'] as Record<string, unknown> | undefined;
  if (!today) { fail(name, 'Missing today_result section'); return; }

  const result = today['result'];
  if (isTodo(result)) {
    console.warn(`  ⚠ [${name}] today_result.result is still TODO — fill in after running probe`);
  } else if (typeof result !== 'string') {
    fail(name, `today_result.result must be string, got ${typeof result}`);
  } else if (!/^\d{2}-\d{2}-\d{4}$/.test(result)) {
    fail(name, `today_result.result '${result}' does not match MM-DD-YYYY format`);
  } else {
    pass(name, `today_result.result format valid: "${result}"`);
  }

  const shape = fixture['_shape'] as Record<string, unknown> | undefined;
  if (shape && shape['zero_padded'] !== true) {
    fail(name, '_shape.zero_padded must be true');
  } else if (shape) {
    pass(name, '_shape.zero_padded confirmed true');
  }
}

function validateUtilPageTitleToDate(name: string): void {
  const fixture = loadFixture(name) as Record<string, unknown> | null;
  if (!fixture) return;

  const valid = fixture['valid_dnp_title'] as Record<string, unknown> | undefined;
  if (!valid) { fail(name, 'Missing valid_dnp_title section'); return; }

  if (valid['is_null'] === true) {
    fail(name, 'valid_dnp_title.is_null must be false for a valid DNP title');
  } else if (valid['is_date_object'] === true) {
    pass(name, 'valid_dnp_title returns a Date object');
  } else {
    console.warn(`  ⚠ [${name}] valid_dnp_title not yet filled in`);
  }

  const nonDate = fixture['non_date_title'] as Record<string, unknown> | undefined;
  if (!nonDate) { fail(name, 'Missing non_date_title section'); return; }
  if (nonDate['is_null'] !== true || nonDate['result'] !== null) {
    fail(name, 'non_date_title.result must be null and is_null must be true');
  } else {
    pass(name, 'non_date_title.result is null as expected');
  }
}

function validateUtilDateToPageTitle(name: string): void {
  const fixture = loadFixture(name) as Record<string, unknown> | null;
  if (!fixture) return;

  const today = fixture['today_result'] as Record<string, unknown> | undefined;
  if (!today) { fail(name, 'Missing today_result section'); return; }

  const result = today['result'];
  if (isTodo(result)) {
    console.warn(`  ⚠ [${name}] today_result.result is still TODO — fill in after running probe`);
  } else if (typeof result !== 'string') {
    fail(name, `today_result.result must be string, got ${typeof result}`);
  } else if (!/^[A-Z][a-z]+ \d+(st|nd|rd|th), \d{4}$/.test(result)) {
    fail(name, `today_result.result '${result}' does not match "Month Nth, YYYY" format`);
  } else {
    pass(name, `today_result.result format valid: "${result}"`);
  }

  const roundTrip = fixture['round_trip_check'] as Record<string, unknown> | undefined;
  if (roundTrip && !isTodo(roundTrip['match'])) {
    if (roundTrip['match'] !== true) {
      fail(name, `round_trip_check.match must be true — dateToPageTitle -> pageTitleToDate -> dateToPageUid roundtrip failed`);
    } else {
      pass(name, 'round_trip_check passes (dateToPageTitle ↔ pageTitleToDate ↔ dateToPageUid)');
    }
  }
}

// ─── main ────────────────────────────────────────────────────────────────────

console.log('\n🔬 roam-nav fixture shape validator\n');

validateGetOpenPageOrBlockUid('getOpenPageOrBlockUid.json');
console.log('');
validateQNodeTitle('q-node-title.json');
console.log('');
validatePullPage('pull-page.json');
console.log('');
validateUtilDateToPageUid('util-dateToPageUid.json');
console.log('');
validateUtilPageTitleToDate('util-pageTitleToDate.json');
console.log('');
validateUtilDateToPageTitle('util-dateToPageTitle.json');

console.log('');
if (errors === 0) {
  console.log('✅ All fixture shapes valid (or TODO placeholders noted above)\n');
  process.exit(0);
} else {
  console.error(`❌ ${errors} error(s) found — fix fixtures before proceeding\n`);
  process.exit(1);
}
