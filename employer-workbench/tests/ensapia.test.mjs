import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateAvatarRun,
  evaluateTraceText,
  compareRuns,
  proposalFingerprint,
  traceFingerprint,
  RULES,
} from '../src/modules/ensapia/engine.ts';
import {
  ENSAPIA_FIXTURES,
  getFixture,
} from '../src/modules/ensapia/fixtures.ts';

const codes = (result) => result.findings.map((f) => f.code);
const good = () => getFixture('scope').candidate;
const has = (input, code) =>
  assert.ok(
    codes(evaluateAvatarRun(input)).includes(code),
    `${code} should be found`,
  );
const pair = (fixture) => [
  evaluateAvatarRun(fixture.baseline),
  evaluateAvatarRun(fixture.candidate),
];

for (const fixture of ENSAPIA_FIXTURES)
  test(`fixture ${fixture.id}: baseline fails and candidate passes bounded rules`, () => {
    const [a, b] = pair(fixture);
    assert.equal(a.status, 'failed');
    assert.equal(b.status, 'passed_with_limits');
    const comparison = compareRuns([a], [b]);
    assert.equal(comparison.pairedCount, 1);
    assert.equal(comparison.improved, 1);
    assert.ok(b.coverage.notChecked.length >= 4);
    assert.ok(b.requiredChecks.passed > 0);
  });

test('empty/malformed JSON cannot create pass results or measurements', () => {
  for (const text of ['', '{', 'null', '[]', '{}']) {
    const { evaluation, input } = evaluateTraceText(text);
    assert.equal(input, null);
    assert.equal(evaluation.status, 'invalid_trace');
    assert.equal(evaluation.requiredChecks.passed, 0);
    assert.equal(evaluation.requiredChecks.notEvaluated, RULES.length);
    assert.equal(evaluation.measurements, null);
  }
});
test('empty events and unknown schemas are invalid', () => {
  const trace = good();
  trace.run.events = [];
  assert.equal(evaluateAvatarRun(trace).status, 'invalid_trace');
  for (const field of ['schemaVersion', 'ruleSetVersion']) {
    const modified = good();
    modified[field] = 'unsupported';
    assert.equal(evaluateAvatarRun(modified).status, 'invalid_trace');
  }
});
test('unknown fields and invalid args are rejected visibly', () => {
  const trace = good();
  trace.scenario.maxRetires = 1;
  assert.equal(evaluateAvatarRun(trace).status, 'invalid_trace');
  const invalidArgs = good();
  invalidArgs.run.events[0].args = [];
  assert.equal(evaluateAvatarRun(invalidArgs).status, 'invalid_trace');
});
test('nonfinite, negative time and duplicate event IDs are invalid', () => {
  for (const value of [NaN, Infinity, -1]) {
    const trace = good();
    trace.run.events[0].atMs = value;
    assert.equal(evaluateAvatarRun(trace).status, 'invalid_trace');
  }
  const trace = good();
  trace.run.events[1].id = trace.run.events[0].id;
  assert.equal(evaluateAvatarRun(trace).status, 'invalid_trace');
});
test('cross-user scope and unlisted tools are independently detected', () => {
  const trace = good();
  trace.run.events[0].args.userId = 'demo-user-b';
  trace.run.events[0].tool = 'wallet.refund';
  has(trace, 'CROSS_USER_ACCESS');
  has(trace, 'TOOL_NOT_ALLOWED');
});
test('missing, orphan and duplicated results fail pairing', () => {
  const missing = good();
  missing.run.events.splice(1, 1);
  has(missing, 'MISSING_RESULT');
  const orphan = good();
  orphan.run.events.splice(0, 1);
  has(orphan, 'ORPHAN_RESULT');
  const repeated = good();
  const copy = structuredClone(repeated.run.events[1]);
  copy.id = 'duplicate-result';
  repeated.run.events.splice(2, 0, copy);
  has(repeated, 'DUPLICATE_TERMINAL_RESULT');
});
test('result before its call cannot supply success evidence', () => {
  const trace = good();
  [trace.run.events[0], trace.run.events[1]] = [
    trace.run.events[1],
    trace.run.events[0],
  ];
  has(trace, 'ORPHAN_RESULT');
  has(trace, 'MISSING_RESULT');
  has(trace, 'TIME_REVERSED');
});
test('time budget includes delay before the first event', () => {
  const trace = good();
  trace.run.events.forEach((event) => {
    event.atMs += 5000;
  });
  has(trace, 'TIME_BUDGET_EXCEEDED');
  assert.equal(evaluateAvatarRun(trace).measurements.durationMs, 5320);
});
test('missing, unknown, stale and expired evidence fail', () => {
  const unknown = good();
  unknown.run.events.at(-1).evidenceIds.push('never-existed');
  has(unknown, 'MISSING_OR_FUTURE_EVIDENCE');
  const omitted = good();
  omitted.run.events.at(-1).evidenceIds = [];
  has(omitted, 'MISSING_OR_FUTURE_EVIDENCE');
  const stale = good();
  stale.run.events[1].evidence.dataVersion = 'old';
  has(stale, 'STALE_EVIDENCE_VERSION');
  const expired = good();
  expired.scenario.maxEvidenceAgeMs = 10;
  has(expired, 'EXPIRED_EVIDENCE');
});
test('failed result cannot manufacture completion evidence', () => {
  const trace = good();
  trace.run.events[3].status = 'error';
  trace.run.events[3].errorCode = 'TIMEOUT';
  has(trace, 'FAILED_RESULT_EVIDENCE');
  has(trace, 'UNSUPPORTED_SUCCESS');
  has(trace, 'SUCCESS_WITH_UNRESOLVED_OPERATION');
});
test('a recovered read within retry budget passes', () => {
  const trace = good();
  trace.run.events = [
    { ...trace.run.events[0], id: 'first-call' },
    {
      id: 'first-error',
      type: 'tool_result',
      atMs: 30,
      operationId: 'inventory-op',
      attempt: 1,
      status: 'error',
      errorCode: 'TIMEOUT',
    },
    { ...trace.run.events[0], id: 'retry-call', atMs: 50, attempt: 2 },
    { ...trace.run.events[1], attempt: 2 },
    ...trace.run.events.slice(2),
  ];
  assert.equal(evaluateAvatarRun(trace).status, 'passed_with_limits');
  assert.equal(evaluateAvatarRun(trace).measurements.retries, 1);
  trace.scenario.maxRetriesPerOperation = 0;
  has(trace, 'RETRY_EXHAUSTED');
});
test('unrelated operations are not counted as retries', () => {
  assert.equal(evaluateAvatarRun(good()).measurements.retries, 0);
});
test('properly reported unavailable/refused scenarios can pass', () => {
  assert.equal(
    evaluateAvatarRun(getFixture('unavailable').candidate).status,
    'passed_with_limits',
  );
  const trace = good();
  trace.scenario.expectedFinal = 'refused';
  trace.scenario.requiredEvidence = [];
  trace.run.events = [
    {
      id: 'refusal',
      type: 'final',
      atMs: 10,
      outcome: 'refused',
      evidenceIds: [],
      message: '합성 정책상 처리할 수 없습니다.',
    },
  ];
  const result = evaluateAvatarRun(trace);
  assert.equal(result.status, 'passed_with_limits');
  assert.equal(result.requiredChecks.passed, 2);
  assert.equal(result.requiredChecks.notEvaluated, 7);
});
test('duplicate proposed writes are distinguished from duplicate applied writes', () => {
  const fixture = getFixture('duplicate');
  const [a, b] = pair(fixture);
  assert.equal(a.measurements.duplicateOperations, 1);
  assert.equal(b.measurements.duplicateOperations, 0);
  assert.equal(b.measurements.repeatedWriteProposals, 1);
  assert.ok(codes(b).includes('REPEATED_WRITE_PROPOSAL'));
  assert.equal(b.status, 'passed_with_limits');
});
test('independent writes with different operation and keys are not collapsed', () => {
  const trace = getFixture('duplicate').candidate;
  trace.run.events[2].operationId = 'different-ticket';
  trace.run.events[2].attempt = 1;
  trace.run.events[2].idempotencyKey = 'different-key';
  trace.run.events[3].operationId = 'different-ticket';
  trace.run.events[3].attempt = 1;
  trace.run.events[3].sideEffectApplied = true;
  const result = evaluateAvatarRun(trace);
  assert.equal(result.status, 'passed_with_limits');
  assert.equal(result.measurements.duplicateOperations, 0);
  assert.equal(result.measurements.retries, 0);
});
test('same idempotency key cannot refer to changed payload', () => {
  const trace = getFixture('duplicate').candidate;
  trace.run.events[2].args.subject = 'changed';
  has(trace, 'IDEMPOTENCY_PAYLOAD_CHANGED');
  has(trace, 'OPERATION_CHANGED');
});
test('deduplicated resend under a new operation ID still links to prior applied request', () => {
  const trace = getFixture('duplicate').candidate;
  trace.run.events[2].operationId = 'resend-op';
  trace.run.events[2].attempt = 1;
  trace.run.events[3].operationId = 'resend-op';
  trace.run.events[3].attempt = 1;
  const result = evaluateAvatarRun(trace);
  assert.equal(result.status, 'passed_with_limits');
  assert.equal(result.measurements.duplicateOperations, 0);
});
test('excessively nested and cyclic data fail without a crash', () => {
  const trace = good();
  let nested = {};
  for (let i = 0; i < 60; i += 1) nested = { nested };
  trace.run.events[0].args.extra = nested;
  assert.equal(evaluateAvatarRun(trace).status, 'invalid_trace');
  const cyclic = good();
  cyclic.run.events[0].args.cycle = cyclic;
  assert.equal(evaluateAvatarRun(cyclic).status, 'invalid_trace');
});
test('write with missing application state cannot claim verified idempotency', () => {
  const trace = getFixture('approval').candidate;
  delete trace.run.events[2].sideEffectApplied;
  has(trace, 'SIDE_EFFECT_STATE_MISSING');
});
test('approval must precede execution and cover exact current payload', () => {
  has(getFixture('approval').baseline, 'PRIOR_APPROVAL_MISSING');
  const trace = getFixture('approval').candidate;
  trace.run.events[1].args.subject = 'changed after approval';
  has(trace, 'APPROVAL_PAYLOAD_MISMATCH');
  trace.run.events[0].proposalHash = proposalFingerprint(trace.run.events[1]);
  assert.equal(evaluateAvatarRun(trace).status, 'passed_with_limits');
});
test('no events may follow a final answer, including its evidence', () => {
  const trace = good();
  const final = trace.run.events.pop();
  final.atMs = 140;
  trace.run.events.splice(2, 0, final);
  has(trace, 'FINAL_NOT_LAST');
  has(trace, 'MISSING_OR_FUTURE_EVIDENCE');
});
test('comparison rejects missing pairs, duplicate keys and changed fixture version', () => {
  const [a, b] = pair(getFixture('scope'));
  assert.equal(compareRuns([a], []).pairedCount, 0);
  assert.equal(compareRuns([a, a], [b]).pairedCount, 0);
  const changed = good();
  changed.fixtureVersion = 'another-fixture';
  const result = compareRuns([a], [evaluateAvatarRun(changed)]);
  assert.equal(result.pairedCount, 0);
  assert.equal(result.exclusions.length, 2);
});
test('comparison rejects changed rules, changed scenario policy and wrong variants', () => {
  const [a, b] = pair(getFixture('scope'));
  assert.equal(
    compareRuns([a], [{ ...b, ruleSetVersion: 'different-version' }])
      .pairedCount,
    0,
  );
  const changed = good();
  changed.scenario.maxDurationMs = 9000;
  assert.equal(compareRuns([a], [evaluateAvatarRun(changed)]).pairedCount, 0);
  assert.equal(compareRuns([b], [a]).pairedCount, 0);
});
test('comparison reports regression and exact introduced rules', () => {
  const fixture = getFixture('scope');
  fixture.baseline = structuredClone(fixture.candidate);
  fixture.baseline.run.variant = 'baseline';
  fixture.candidate.run.events[0].args.userId = 'demo-user-b';
  const [a, b] = pair(fixture);
  const result = compareRuns([a], [b]);
  assert.equal(result.regressed, 1);
  assert.deepEqual(result.pairs[0].introducedRuleIds, ['USER_SCOPE']);
});
test('canonical input marker is key-order independent and export roundtrip deterministic', () => {
  assert.equal(
    traceFingerprint({ a: 1, b: 2 }),
    traceFingerprint({ b: 2, a: 1 }),
  );
  const input = good();
  const report = evaluateAvatarRun(input);
  const exportRoundtrip = JSON.parse(JSON.stringify({ input, report }));
  assert.deepEqual(
    evaluateAvatarRun(exportRoundtrip.input),
    exportRoundtrip.report,
  );
});
test('every error maps to an event or explicit input error and no fake ratio is exposed', () => {
  for (const fixture of ENSAPIA_FIXTURES) {
    const trace = fixture.baseline;
    const ids = new Set(trace.run.events.map((event) => event.id));
    const result = evaluateAvatarRun(trace);
    assert.ok(
      result.findings.every((f) => f.eventIds.every((id) => ids.has(id))),
    );
    assert.ok(!('score' in result));
    assert.ok(!('passPercentage' in result));
  }
});
