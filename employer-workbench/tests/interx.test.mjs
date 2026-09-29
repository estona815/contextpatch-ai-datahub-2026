import test from 'node:test';
import assert from 'node:assert/strict';
import {
  runWorkflow,
  makeApproval,
  estimateTime,
  validateWorkflow,
  isWorkflowInput,
  buildReport,
} from '../src/modules/interx/engine.ts';

function fixture() {
  return {
    config: {
      name: '점검 접수',
      owner: '운영',
      exceptionOwner: '검토',
      completion: '승인 후 한 번 전달',
      externalTransfer: true,
      requiresApproval: true,
      failDispatch: false,
      stages: [
        'intake',
        'validate',
        'normalize',
        'redact',
        'approve',
        'dispatch',
        'audit',
      ].map((id) => ({ id, enabled: true })),
    },
    record: {
      requestId: 'REQ-1',
      equipmentId: 'PR-01',
      occurredAt: '2026-09-29T09:00:00+09:00',
      severity: 'high',
      note: '진동 점검',
      contactEmail: 'operator@example.invalid',
      revision: 1,
    },
  };
}
const assumptions = {
  volume: 100,
  eligible: 0.6,
  baseline: 10,
  review: 2,
  exceptionRate: 0.1,
  exceptionMinutes: 8,
  maintenance: 60,
  setupHours: 12,
};
test('approval gate leaves ledger untouched; approved data is masked and dispatched once', () => {
  const input = fixture();
  const waiting = runWorkflow(input);
  assert.equal(waiting.status, 'WAITING_APPROVAL');
  assert.equal(waiting.ledger.length, 0);
  const approved = runWorkflow(input, [], makeApproval(input));
  assert.equal(approved.status, 'SUCCEEDED');
  assert.equal(approved.newDispatches, 1);
  assert.equal(approved.output.contactEmail, '[마스킹됨]');
  const repeat = runWorkflow(input, approved.ledger);
  assert.equal(repeat.status, 'DUPLICATE');
  assert.equal(repeat.ledger.length, 1);
  assert.equal(repeat.newDispatches, 0);
  assert.equal(repeat.ledger[0].orderId, approved.ledger[0].orderId);
});
test('changed request or workflow invalidates previous approval', () => {
  const input = fixture(),
    token = makeApproval(input);
  input.record.note = '내용 수정';
  input.record.revision++;
  assert.equal(runWorkflow(input, [], token).status, 'WAITING_APPROVAL');
  const token2 = makeApproval(input);
  input.config.owner = '다른 담당자';
  assert.equal(runWorkflow(input, [], token2).status, 'WAITING_APPROVAL');
});
test('same key with different payload holds existing result', () => {
  const input = fixture(),
    sent = runWorkflow(input, [], makeApproval(input));
  input.record.note = '새 내용';
  input.record.revision++;
  const collision = runWorkflow(input, sent.ledger, makeApproval(input));
  assert.equal(collision.status, 'CONFLICT');
  assert.equal(collision.newDispatches, 0);
  assert.equal(collision.ledger[0].output.note, '진동 점검');
});
test('replay cannot reuse unmasked internal output after the workflow changes to external masked delivery', () => {
  const input = fixture();
  input.config.externalTransfer = false;
  input.config.stages.find((s) => s.id === 'redact').enabled = false;
  const internal = runWorkflow(input, [], makeApproval(input));
  assert.equal(internal.status, 'SUCCEEDED');
  assert.equal(internal.output.contactEmail, 'operator@example.invalid');
  assert.equal(typeof internal.ledger[0].configKey, 'string');
  input.config.externalTransfer = true;
  input.config.stages.find((s) => s.id === 'redact').enabled = true;
  input.record.revision++;
  assert.equal(validateWorkflow(input).length, 0);
  const external = runWorkflow(input, internal.ledger, makeApproval(input));
  assert.equal(external.status, 'CONFLICT');
  assert.equal(external.output, null);
  assert.equal(external.newDispatches, 0);
  assert.equal(external.ledger.length, 1);
  assert.ok(external.issues.some((issue) => issue.code === 'WF-07'));
  assert.ok(
    !external.trace.some(
      (step) => step.stage === 'dispatch' && step.status === 'SKIP',
    ),
  );
  assert.deepEqual(external.ledger, internal.ledger);
});
test('unsafe ordering and missing controls are blocked before any side effect', () => {
  const input = fixture();
  [input.config.stages[4], input.config.stages[5]] = [
    input.config.stages[5],
    input.config.stages[4],
  ];
  assert.ok(validateWorkflow(input).some((x) => x.code === 'WF-03'));
  assert.equal(runWorkflow(input, [], makeApproval(input)).ledger.length, 0);
  const privacy = fixture();
  privacy.config.stages.find((x) => x.id === 'redact').enabled = false;
  assert.ok(validateWorkflow(privacy).some((x) => x.code === 'WF-04'));
  assert.equal(runWorkflow(privacy).status, 'BLOCKED');
  const audit = fixture();
  audit.config.stages.find((x) => x.id === 'audit').enabled = false;
  assert.equal(runWorkflow(audit).status, 'BLOCKED');
});
test('validation handles invalid identifiers, missing equipment and timezone', () => {
  for (const [field, value] of [
    ['requestId', ''],
    ['equipmentId', 'UNKNOWN'],
    ['occurredAt', '2026-09-29 09:00'],
    ['occurredAt', '2026-02-30T09:00:00Z'],
    ['note', ''],
  ]) {
    const input = fixture();
    input.record[field] = value;
    assert.equal(runWorkflow(input).status, 'BLOCKED');
  }
  assert.equal(isWorkflowInput({ config: { stages: [] }, record: {} }), false);
});
test('failure does not reserve a successful replay key and retry produces exactly one result', () => {
  const input = fixture();
  input.config.failDispatch = true;
  const failed = runWorkflow(input, [], makeApproval(input));
  assert.equal(failed.status, 'FAILED');
  assert.equal(failed.ledger.length, 0);
  input.config.failDispatch = false;
  const retried = runWorkflow(input, failed.ledger, makeApproval(input));
  assert.equal(retried.status, 'SUCCEEDED');
  assert.equal(retried.ledger.length, 1);
});
test('estimate preserves negative costs and computes the independent workload arithmetic', () => {
  const result = estimateTime(assumptions);
  assert.equal(result.before, 1000);
  assert.equal(result.after, 628);
  assert.equal(result.net, 372);
  assert.ok(Math.abs(result.recoveryWeeks - 720 / 372) < 1e-12);
  const noWork = estimateTime({ ...assumptions, volume: 0 });
  assert.equal(noWork.net, -60);
  assert.equal(noWork.recoveryWeeks, null);
  for (const changes of [
    { eligible: 1.01 },
    { exceptionRate: -0.1 },
    { volume: 0.5 },
    { baseline: NaN },
    { maintenance: Infinity },
    { review: -1 },
  ])
    assert.ok(estimateTime({ ...assumptions, ...changes }).errors.length);
});
test('report captures current observed status and current assumptions, not a fixed success', () => {
  const input = fixture();
  input.record.equipmentId = '';
  const run = runWorkflow(input);
  const report = buildReport(input, run, { ...assumptions, volume: 0 });
  assert.equal(report.execution.status, 'BLOCKED');
  assert.equal(report.currentRecord.equipmentId, '');
  assert.equal(report.estimate.net, -60);
});
