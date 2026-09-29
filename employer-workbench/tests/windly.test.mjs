import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyRepair,
  approvalMatches,
  compareRuleVersions,
  createApproval,
  decimalToMicros,
  inputFingerprint,
  RULESET_V1,
  RULESET_V2,
  suggestRepairs,
  validateAdSpec,
} from '../src/modules/windly/engine.ts';
import { FIXTURES, GOOD_INPUT } from '../src/modules/windly/fixtures.ts';

const good = () => structuredClone(GOOD_INPUT);
const rules = (input) =>
  [
    ...new Set(validateAdSpec(input).issues.map((issue) => issue.ruleId)),
  ].sort();
for (const fixture of FIXTURES)
  test(`Windly fixture: ${fixture.id}`, () =>
    assert.deepEqual(rules(fixture.input), [...fixture.expectedRules].sort()));

test('exact micros conversion preserves fractional units and int64 boundary', () => {
  for (const [input, expected] of [
    ['30000', '30000000000'],
    ['0.1', '100000'],
    ['0.000001', '1'],
    ['9223372036854.775807', '9223372036854775807'],
    ['001.010000', '1010000'],
  ])
    assert.deepEqual(decimalToMicros(input), { ok: true, micros: expected });
});
test('bad monetary representations never round or coerce into accepted budget', () => {
  for (const input of [
    '0',
    '-1',
    '+1',
    ' 1',
    '1 ',
    'NaN',
    'Infinity',
    '1e6',
    '0.0000001',
    '9223372036854.775808',
    '999999999999999999999999999999',
    '1,000',
    '',
  ])
    assert.equal(decimalToMicros(input).ok, false, input);
});
test('numeric or NaN budgets fail runtime schema rather than silently lose precision', () => {
  for (const value of [0.1, NaN, Infinity, null, false, [], {}]) {
    const input = good();
    input.campaign.dailyBudget = value;
    const result = validateAdSpec(input);
    assert.equal(result.status, 'invalid_input');
    assert.equal(result.requestPreview, undefined);
  }
});
test('empty, arrays, null and unsupported schema cannot be green or produce requests', () => {
  for (const raw of [
    null,
    [],
    {},
    7,
    '',
    { ...good(), schemaVersion: '2.0' },
    { ...good(), ruleSetVersion: 'unknown' },
  ]) {
    const r = validateAdSpec(raw);
    assert.equal(r.status, 'invalid_input');
    assert.equal(r.checks.length, 0);
    assert.equal(r.requestPreview, undefined);
  }
});
test('unknown nested fields remain explicit errors instead of being ignored before approval', () => {
  const input = good();
  input.campaign.enableNow = true;
  assert.equal(validateAdSpec(input).status, 'invalid_input');
  assert.throws(() => createApproval(input, '2026-09-29T01:00:00Z'));
});
test('budget period requires its corresponding field and daily/total are exclusive', () => {
  const input = good();
  input.campaign.budgetPeriod = 'CUSTOM_PERIOD';
  assert.ok(rules(input).includes('GOOGLE_BUDGET_PERIOD'));
  input.campaign.totalBudget = '60000';
  assert.ok(rules(input).includes('GOOGLE_BUDGET_EXCLUSIVE'));
  delete input.campaign.dailyBudget;
  const r = validateAdSpec(input);
  assert.equal(r.status, 'ready_for_local_approval');
  assert.equal(
    r.requestPreview.operations[0].create.total_amount_micros,
    '60000000000',
  );
  assert.equal('amount_micros' in r.requestPreview.operations[0].create, false);
});
test('request preview is validation-only, non-shared and contains precise string micros', () => {
  const r = validateAdSpec(good());
  assert.deepEqual(r.requestPreview, {
    customer_id: '1234567890',
    operations: [
      {
        create: {
          name: '가을 아바타 컬렉션',
          period: 'DAILY',
          explicitly_shared: false,
          amount_micros: '30000000000',
        },
      },
    ],
    validate_only: true,
    partial_failure: false,
  });
  assert.ok(r.coverage.notChecked.includes('실제 API 응답 및 권한'));
});
test('Google budget name uses UTF-8 bytes, not JS characters', () => {
  const input = good();
  input.campaign.name = '가'.repeat(86);
  assert.ok(rules(input).includes('GOOGLE_BUDGET_NAME'));
  input.campaign.name = '가'.repeat(85);
  assert.ok(!rules(input).includes('GOOGLE_BUDGET_NAME'));
  input.campaign.name = '   ';
  assert.ok(rules(input).includes('GOOGLE_BUDGET_NAME'));
});
test('real calendar and timezone equality are validated', () => {
  const input = good();
  input.campaign.startAt = '2026-02-29T09:00:00+09:00';
  assert.ok(rules(input).includes('LOCAL_DATE_ORDER'));
  input.campaign.startAt = '2028-02-29T09:00:00+09:00';
  input.campaign.endAt = '2028-03-01T00:00:00Z';
  assert.ok(!rules(input).includes('LOCAL_DATE_ORDER'));
  input.campaign.endAt = '2028-02-29T00:00:00Z';
  assert.ok(rules(input).includes('LOCAL_DATE_ORDER'));
  input.campaign.endAt = '2028-03-01T00:00:00';
  assert.ok(rules(input).includes('LOCAL_DATE_ORDER'));
});
test('merge tracking preserves existing non-UTM query, fragments and encoded data', () => {
  const input = good();
  input.campaign.destinationUrl =
    'https://example.test/collection?q=%ED%95%9C%EA%B8%80&utm_source=google#new';
  const r = validateAdSpec(input);
  assert.equal(r.status, 'ready_for_local_approval');
  const u = new URL(r.normalizedDestination);
  assert.equal(u.searchParams.get('q'), '한글');
  assert.equal(u.hash, '#new');
  assert.equal(u.searchParams.getAll('utm_source').length, 1);
  assert.equal(u.searchParams.get('utm_campaign'), 'autumn-launch');
});
test('conflicting or duplicated tracking never silently overwrites URL', () => {
  const input = good();
  input.campaign.destinationUrl =
    'https://example.test/?utm_source=google&utm_source=newsletter';
  const r = validateAdSpec(input);
  assert.equal(r.status, 'blocked');
  assert.equal(r.normalizedDestination, undefined);
  assert.equal(r.requestPreview, undefined);
  input.campaign.destinationUrl =
    'https://example.test/?utm_source=google&utm_source=google';
  assert.equal(validateAdSpec(input).status, 'needs_review');
  assert.throws(() => createApproval(input, '2026-09-29T01:00:00Z'));
});
test('UTM required values may already exist in the URL', () => {
  const input = good();
  input.campaign.tracking = {};
  input.campaign.destinationUrl =
    'https://example.test/?utm_source=google&utm_medium=cpc&utm_campaign=autumn';
  assert.equal(validateAdSpec(input).status, 'ready_for_local_approval');
});
test('unsupported platform discloses incomplete coverage and cannot be approved', () => {
  const input = good();
  input.platform = 'meta_ads';
  const r = validateAdSpec(input);
  assert.equal(r.status, 'needs_review');
  assert.equal(r.requestPreview, undefined);
  assert.ok(r.checks.some((c) => c.result === 'not_checked'));
  assert.ok(r.coverage.notChecked.some((c) => c.includes('meta_ads')));
  assert.throws(() => createApproval(input, '2026-09-29T01:00:00Z'));
});
test('local approval survives key order only; money, URL, rule changes invalidate it', () => {
  const input = good();
  const approval = createApproval(input, '2026-09-29T01:00:00Z');
  const reordered = Object.fromEntries(Object.entries(input).reverse());
  assert.equal(approvalMatches(reordered, approval), true);
  assert.equal(inputFingerprint(reordered), inputFingerprint(input));
  for (const change of [
    (x) => (x.campaign.dailyBudget = '30001'),
    (x) => (x.campaign.destinationUrl += '?other=1'),
    (x) => (x.ruleSetVersion = RULESET_V1),
  ]) {
    const next = good();
    change(next);
    assert.equal(approvalMatches(next, approval), false);
  }
  assert.equal(approvalMatches(null, approval), false);
  assert.equal(
    approvalMatches(input, { ...approval, inputFingerprint: 'wrong' }),
    false,
  );
});
test('invalid and stale approval records cannot become current', () => {
  for (const approval of [
    null,
    {},
    [],
    { canonicalInput: '', approvedAt: 'NaN' },
    {
      canonicalInput: '{}',
      approvedAt: '2026-09-29T01:00:00Z',
      inputFingerprint: 'x',
      ruleSetVersion: RULESET_V2,
    },
  ])
    assert.equal(approvalMatches(good(), approval), false);
  assert.throws(() => createApproval(good(), 'bad-date'));
});
test('version comparison tests same input and exposes only newly-required campaign key', () => {
  const input = good();
  delete input.campaign.tracking.utm_campaign;
  const result = compareRuleVersions(input);
  assert.equal(result.before.status, 'ready_for_local_approval');
  assert.equal(result.after.status, 'blocked');
  assert.deepEqual(
    result.introduced.map((i) => i.path),
    ['/campaign/tracking/utm_campaign'],
  );
  assert.equal(result.resolved.length, 0);
});
test('explicit repair sequence resolves initial fixture without silently changing chosen daily amount', () => {
  let input = structuredClone(FIXTURES[0].input);
  const oldDaily = input.campaign.dailyBudget;
  for (const id of ['url_https', 'utm_campaign', 'budget_exclusive']) {
    assert.ok(suggestRepairs(input).some((r) => r.id === id));
    input = applyRepair(input, id);
  }
  assert.equal(input.campaign.dailyBudget, oldDaily);
  assert.equal(input.campaign.totalBudget, undefined);
  assert.equal(validateAdSpec(input).status, 'ready_for_local_approval');
  assert.throws(() => applyRepair(input, 'url_https'));
});
test('exports can roundtrip current source and deterministic results', () => {
  const input = good();
  const first = validateAdSpec(input);
  const second = validateAdSpec(JSON.parse(JSON.stringify(input)));
  assert.deepEqual(second, first);
});

test('8,000-level 16KB JSON cannot crash validation or rendering of error observations', () => {
  const raw = JSON.parse('['.repeat(8000) + '0' + ']'.repeat(8000));
  const report = validateAdSpec(raw);
  assert.equal(report.status, 'invalid_input');
  assert.deepEqual(
    report.issues.map((issue) => issue.ruleId),
    ['INPUT_LIMIT'],
  );
  assert.equal(report.input, undefined);
  assert.equal(report.requestPreview, undefined);
  assert.doesNotThrow(() =>
    report.issues.map((issue) => JSON.stringify(issue.actual)),
  );
  assert.ok(
    JSON.stringify(report).length < 4096,
    'the report must not embed the nested raw input',
  );
});
test('deep extra data also prevents cloning, repairing or approving an otherwise valid campaign', () => {
  const raw = good();
  raw.extra = JSON.parse('['.repeat(8000) + '0' + ']'.repeat(8000));
  const approval = createApproval(good(), '2026-09-29T01:00:00Z');
  assert.equal(validateAdSpec(raw).status, 'invalid_input');
  assert.equal(approvalMatches(raw, approval), false);
  assert.deepEqual(suggestRepairs(raw), []);
  const comparison = compareRuleVersions(raw);
  assert.equal(comparison.before.status, 'invalid_input');
  assert.equal(comparison.after.status, 'invalid_input');
  assert.doesNotThrow(() => JSON.stringify(comparison));
});
test('wide and cyclic inputs terminate with serializable bounded failure reports', () => {
  const cycle = {};
  cycle.self = cycle;
  for (const input of [Array(10001).fill(0), cycle]) {
    const result = validateAdSpec(input);
    assert.equal(result.status, 'invalid_input');
    assert.deepEqual(
      result.issues.map((issue) => issue.ruleId),
      ['INPUT_LIMIT'],
    );
    assert.doesNotThrow(() => JSON.stringify(result));
    assert.ok(JSON.stringify(result).length < 4096);
  }
});
test('schema failures below the depth limit summarize observed containers instead of echoing them', () => {
  const input = JSON.parse('['.repeat(15) + '0' + ']'.repeat(15));
  const result = validateAdSpec(input);
  assert.equal(result.status, 'invalid_input');
  assert.deepEqual(
    result.issues.map((issue) => issue.ruleId),
    ['INPUT_SCHEMA'],
  );
  assert.equal(typeof result.issues[0].actual, 'string');
  assert.ok(JSON.stringify(result).length < 4096);
});
