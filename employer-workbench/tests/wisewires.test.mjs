import test from 'node:test';
import assert from 'node:assert/strict';
import {
  runScenario,
  quantityOperation,
  duplicateOperation,
  refundOperation,
  validateParams,
  makeIssueReport,
  issueMarkdown,
  isLabInputs,
} from '../src/modules/wisewires/engine.ts';
const cases = {
  quantity: { stock: 5, quantity: 0 },
  discount: { subtotal: 1000, coupon: 5000 },
  duplicate: {
    stock: 10,
    quantity: 1,
    attempts: 2,
    requestKey: 'DEMO-001',
    changedPayload: false,
  },
  expiry: {
    now: '2026-09-29T03:00:00.000Z',
    expiresAt: '2026-09-29T03:00:00.000Z',
  },
  stale: { firstDelay: 100, secondDelay: 20, secondIssued: 10 },
  refund: { paid: 12000, attempts: 2, captured: true },
};
for (const [id, params] of Object.entries(cases))
  test(`${id}: real seeded faulty operation fails while the same oracle accepts fixed implementation`, () => {
    const bad = runScenario(id, params, 'buggy'),
      good = runScenario(id, params, 'fixed');
    assert.equal(bad.inputErrors.length, 0);
    assert.equal(bad.passed, false);
    assert.ok(bad.assertions.some((a) => !a.passed));
    assert.equal(good.passed, true);
    assert.notDeepEqual(bad.observed.state, good.observed.state);
  });
test('quantity rejects zero, negative, fractional and oversold requests without side effects', () => {
  for (const q of [0, -1, 1.5, 6]) {
    const result = quantityOperation(q, 5, 'fixed');
    assert.equal(result.accepted, false);
    assert.equal(result.orderCount, 0);
    assert.equal(result.stockAfter, 5);
  }
  for (const q of [1, 5])
    assert.equal(quantityOperation(q, 5, 'fixed').accepted, true);
});
test('discount exact boundary and valid values do not invent a failure', () => {
  for (const coupon of [0, 999, 1000]) {
    const run = runScenario('discount', { subtotal: 1000, coupon }, 'buggy');
    assert.equal(run.passed, true);
  }
  const negative = runScenario(
    'discount',
    { subtotal: 1000, coupon: -1 },
    'fixed',
  );
  assert.equal(negative.passed, true);
  assert.equal(negative.observed.state.accepted, false);
});
test('same request key with changed payload conflicts and retains a single stock decrement', () => {
  const p = { ...cases.duplicate, attempts: 4, changedPayload: true };
  const result = duplicateOperation(p, 'fixed');
  assert.equal(result.orderCount, 1);
  assert.equal(result.stockAfter, 9);
  assert.equal(
    result.responses.filter((x) => x.status === 'CONFLICT').length,
    3,
  );
  assert.equal(runScenario('duplicate', p, 'fixed').passed, true);
});
test('expiry -1ms, exact instant and +1ms use a fixed clock and exclusive expiry', () => {
  const expiresAt = cases.expiry.expiresAt;
  for (const delta of [-1, 0, 1]) {
    const now = new Date(Date.parse(expiresAt) + delta).toISOString();
    const result = runScenario('expiry', { now, expiresAt }, 'fixed');
    assert.equal(result.passed, true);
    assert.equal(result.observed.state.accepted, delta < 0);
  }
});
test('search reordering exposes stale overwrite, ordinary ordering correctly passes', () => {
  const normal = { firstDelay: 5, secondIssued: 10, secondDelay: 20 };
  assert.equal(runScenario('stale', normal, 'buggy').passed, true);
  assert.equal(
    runScenario('stale', normal, 'fixed').observed.state.displayedQuery,
    'B',
  );
  const tie = { firstDelay: 30, secondIssued: 10, secondDelay: 20 };
  assert.equal(runScenario('stale', tie, 'fixed').passed, true);
});
test('unpaid and repeated refund must not create money or inventory', () => {
  const unpaid = refundOperation(
    { paid: 12000, captured: false, attempts: 4 },
    'fixed',
  );
  assert.equal(unpaid.refunded, 0);
  assert.equal(unpaid.inventoryRestorations, 0);
  const paid = refundOperation(
    { paid: 12000, captured: true, attempts: 8 },
    'fixed',
  );
  assert.equal(paid.refunded, 12000);
  assert.equal(paid.inventoryRestorations, 1);
});
test('invalid harness inputs produce no claimed pass/fail and no report', () => {
  for (const [id, changes] of [
    ['quantity', { quantity: NaN }],
    ['duplicate', { attempts: 100000 }],
    ['stale', { firstDelay: Infinity }],
    ['expiry', { now: 'yesterday' }],
    ['expiry', { now: '2026-02-30T03:00:00Z' }],
    ['refund', { paid: -1 }],
  ]) {
    const run = runScenario(id, { ...cases[id], ...changes }, 'fixed');
    assert.equal(run.passed, null);
    assert.equal(run.observed, null);
    assert.ok(run.inputErrors.length);
    assert.throws(() => makeIssueReport(run, '높음'));
  }
  assert.equal(isLabInputs({}), false);
  assert.equal(isLabInputs(cases), true);
  assert.ok(
    validateParams('duplicate', { ...cases.duplicate, requestKey: '' }).length,
  );
});
test('report uses actual failed run and cannot label a passing case a defect', () => {
  const failed = runScenario('discount', cases.discount, 'buggy');
  const report = makeIssueReport(failed, '높음');
  assert.equal(report.actual.state.payable, -4000);
  assert.equal(report.expected.payable, 0);
  assert.match(issueMarkdown(report), /-4000/);
  assert.throws(() =>
    makeIssueReport(runScenario('discount', cases.discount, 'fixed'), '높음'),
  );
});
