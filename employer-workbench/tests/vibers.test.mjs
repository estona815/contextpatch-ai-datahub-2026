import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseInventoryCsv,
  canonicalMapping,
  reconcileInventory,
  isInventoryRunCurrent,
  approveInventory,
  isInventoryApprovalCurrent,
  inventoryReportRows,
} from '../src/modules/vibers/engine.ts';
import { VIBERS_SAMPLES } from '../src/modules/vibers/fixtures.ts';
const map = canonicalMapping([
  'sku',
  'region',
  'expected_qty',
  'counted_qty',
  'unit_cost',
  'currency',
]);
const header = 'sku,region,expected_qty,counted_qty,unit_cost,currency\n';

test('seeded outcomes and separate-currency totals match hand-calculated values', () => {
  const run = reconcileInventory(VIBERS_SAMPLES[0].csv, map);
  assert.deepEqual(run.counts, {
    matched: 2,
    discrepancy: 2,
    invalid: 2,
    duplicate_exact: 1,
    duplicate_conflict: 0,
  });
  assert.equal(run.validUniqueCount, 4);
  assert.equal(run.discrepancyRate, 0.5);
  assert.deepEqual(run.valueDifferenceByCurrency, { USD: 17, EUR: 55.5 });
  assert.equal(
    run.rows.length,
    Object.values(run.counts).reduce((a, b) => a + b, 0),
  );
});
test('conflicting duplicate holds every row of that SKU-region key', () => {
  const run = reconcileInventory(VIBERS_SAMPLES[1].csv, map);
  const conflict = run.rows.filter((row) => row.sku === 'SKU-A03');
  assert.equal(conflict.length, 2);
  assert.ok(
    conflict.every(
      (row) => row.status === 'duplicate_conflict' && row.deltaQty === null,
    ),
  );
  assert.equal(run.valueDifferenceByCurrency.EUR, undefined);
  assert.equal(run.reviewable, false);
});
test('a duplicate with an invalid value also holds the otherwise valid record', () => {
  const run = reconcileInventory(
    header + 'A,US,10,10,2,USD\nA,US,10,,2,USD',
    map,
  );
  assert.equal(run.validUniqueCount, 0);
  assert.equal(run.counts.invalid, 1);
  assert.equal(run.counts.duplicate_conflict, 1);
});
test('BOM, quoted commas, escaped quotes and multiline fields preserve raw values and line numbers', () => {
  const csv =
    '\uFEFF' +
    header +
    '"SKU,""A""",US,1,2,0.10,USD\n"two\nlines",EU,2,2,4,EUR';
  const parsed = parseInventoryCsv(csv);
  assert.equal(parsed.error, null);
  assert.equal(parsed.records[0].cells[0], 'SKU,"A"');
  assert.equal(parsed.records[1].cells[0], 'two\nlines');
  assert.equal(parsed.records[1].line, 3);
  assert.equal(reconcileInventory(csv, map).valueDifferenceByCurrency.USD, 0.1);
});
test('bad CSV quote/headers/row width is explicit, never silently accepted', () => {
  assert.match(parseInventoryCsv('sku,sku\nA,A').error, /중복/);
  assert.match(parseInventoryCsv(header + '"A,US,1,2,3,USD').error, /따옴표/);
  assert.match(parseInventoryCsv(header + '"A"x,US,1,2,3,USD').error, /따옴표/);
  assert.equal(
    reconcileInventory(header + 'A,US,1,2,3,USD,extra', map).counts.invalid,
    1,
  );
});
test('blank/negative/malformed quantities are rejected instead of coerced to zero', () => {
  for (const bad of ['', '-1', '1.1', '12abc', 'Infinity', '1e3']) {
    const run = reconcileInventory(header + `A,US,${bad},2,1,USD`, map);
    assert.equal(run.counts.invalid, 1, bad);
    assert.equal(run.validUniqueCount, 0);
  }
  assert.equal(
    reconcileInventory(header + 'A,US,0,0,0,USD', map).counts.matched,
    1,
  );
});
test('unmapped or duplicated column connections block a run', () => {
  const csv = VIBERS_SAMPLES[3].csv;
  assert.ok(
    reconcileInventory(csv, canonicalMapping(parseInventoryCsv(csv).headers))
      .errors.length,
  );
  assert.ok(
    reconcileInventory(VIBERS_SAMPLES[0].csv, {
      ...map,
      counted_qty: 'expected_qty',
    }).errors.some((error) => /동시에/.test(error)),
  );
});
test('scope is SKU plus region, not SKU alone; currencies are never merged', () => {
  const run = reconcileInventory(
    header + 'A,US,1,2,0.10,USD\nA,EU,1,3,0.20,EUR',
    map,
  );
  assert.equal(run.counts.discrepancy, 2);
  assert.deepEqual(run.valueDifferenceByCurrency, { USD: 0.1, EUR: 0.4 });
});
test('approval binds exact CSV, mapping and run; a changed value invalidates it', () => {
  const csv = VIBERS_SAMPLES[2].csv;
  const run = reconcileInventory(csv, map, 'run-1');
  const approval = approveInventory(csv, map, run, '검토자', 'approval-1');
  assert.equal(isInventoryApprovalCurrent(csv, map, run, approval), true);
  const changed = csv.replace('120,118', '120,119');
  assert.equal(isInventoryRunCurrent(changed, map, run), false);
  assert.equal(isInventoryApprovalCurrent(changed, map, run, approval), false);
  assert.throws(() => approveInventory(changed, map, run, '검토자'));
  assert.throws(() =>
    approveInventory(
      VIBERS_SAMPLES[0].csv,
      map,
      reconcileInventory(VIBERS_SAMPLES[0].csv, map),
      '검토자',
    ),
  );
});
test('export preserves signed quantity, raw line reference and excluded nulls', () => {
  const run = reconcileInventory(VIBERS_SAMPLES[0].csv, map);
  const report = inventoryReportRows(run);
  assert.equal(report[0].signed_delta_qty, -2);
  assert.equal(report[0].source_line, 2);
  assert.equal(report[3].signed_delta_qty, null);
  assert.equal(report[3].status, 'duplicate_exact');
});
test('currency precision and unsafe valuation are rejected', () => {
  assert.equal(
    reconcileInventory(header + 'A,US,1,2,0.001,USD', map).counts.invalid,
    1,
  );
  assert.equal(
    reconcileInventory(header + 'A,KR,1,2,1.5,KRW', map).counts.invalid,
    1,
  );
  assert.equal(
    reconcileInventory(header + 'A,US,0,1000000000,1000000000,USD', map).counts
      .invalid,
    1,
  );
});
test('ten-thousand-row conflict keeps all evidence but bounds repeated group explanations', () => {
  const rowCount = 10000;
  const csv =
    header +
    Array.from(
      { length: rowCount },
      (_, index) => `A,US,10,${index % 2 ? 11 : 10},2,USD`,
    ).join('\n');
  const run = reconcileInventory(csv, map, 'bounded-run');
  assert.deepEqual(run.errors, []);
  assert.equal(run.rows.length, rowCount);
  assert.equal(run.counts.duplicate_conflict, rowCount);
  assert.equal(run.validUniqueCount, 0);
  assert.equal(run.reviewable, false);
  assert.equal(run.rows.at(-1).sourceLine, rowCount + 1);
  assert.equal(run.rows.at(-1).raw.counted_qty, '11');
  const explanations = run.rows.map((row) => row.issues.join(' '));
  assert.ok(explanations.every((reason) => reason.length < 250));
  assert.match(explanations[0], /외 9980개 행/);
  assert.match(explanations.at(-1), /전체 10000개 행/);
  assert.ok(
    explanations.reduce((length, reason) => length + reason.length, 0) <
      rowCount * 250,
  );
  assert.equal(new Set(run.rows.map((row) => row.sourceLine)).size, rowCount);
  assert.deepEqual(run.valueDifferenceByCurrency, {});
});
test('wide headers and data rows are rejected before exposing mapping options', () => {
  const wideHeaders = Array.from(
    { length: 20000 },
    (_, index) => `column_${index}`,
  ).join(',');
  const tooWideHeader = parseInventoryCsv(
    wideHeaders + '\n' + Array(20000).fill('1').join(','),
  );
  assert.match(tooWideHeader.error, /128/);
  assert.deepEqual(tooWideHeader.headers, []);
  assert.deepEqual(tooWideHeader.records, []);
  assert.ok(tooWideHeader.error.length < 100);
  const tooWideData = parseInventoryCsv(
    header + Array(129).fill('1').join(','),
  );
  assert.match(tooWideData.error, /128/);
  assert.deepEqual(tooWideData.headers, []);
  assert.deepEqual(tooWideData.records, []);
  const headersAtLimit = [
    'sku',
    'region',
    'expected_qty',
    'counted_qty',
    'unit_cost',
    'currency',
    ...Array.from({ length: 122 }, (_, index) => `extra_${index}`),
  ];
  const rowAtLimit = [
    'A',
    'US',
    '10',
    '10',
    '2',
    'USD',
    ...Array(122).fill(''),
  ];
  const boundedCsv = headersAtLimit.join(',') + '\n' + rowAtLimit.join(',');
  assert.equal(parseInventoryCsv(boundedCsv).headers.length, 128);
  assert.equal(parseInventoryCsv(boundedCsv).error, null);
  assert.equal(reconcileInventory(boundedCsv, map).counts.matched, 1);
  assert.equal(reconcileInventory(VIBERS_SAMPLES[0].csv, map).rows.length, 7);
});
