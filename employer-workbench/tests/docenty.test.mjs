import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateBrief,
  approveBrief,
  isBriefRunCurrent,
  isBriefApprovalCurrent,
  briefMarkdown,
  isBrief,
  nonNegativeNumber,
} from '../src/modules/docenty/engine.ts';

function valid() {
  return {
    title: '업무 요약',
    userRole: '운영자',
    problem: '여러 파일을 수기로 합친다.',
    outcome: '근거 있는 초안',
    metric: {
      name: '소요 시간',
      unit: '분',
      baseline: '40',
      target: '10',
      direction: 'lte',
    },
    scopeIn: '읽기와 요약',
    scopeOut: '외부 발송',
    resource: {
      name: 'issues',
      fields: 'id, summary',
      approved: true,
      requestedScopes: 'read:issues',
      allowedScopes: 'read:issues',
    },
    requirements: [
      { id: 'R1', text: '근거를 보여준다.' },
      { id: 'R2', text: '누락을 표시한다.' },
      { id: 'R3', text: '권한을 확인한다.' },
    ],
    scenarios: ['normal', 'error', 'permission'].map((kind, index) => ({
      id: `AC${index}`,
      kind,
      given: '정해진 상황',
      when: '실행한다.',
      then: '관찰 가능한 결과',
      requirementIds: [`R${index + 1}`],
    })),
  };
}
test('complete brief is review-ready, with nine specific checks', () => {
  const run = evaluateBrief(valid(), '2026-09-29T01:00:00Z');
  assert.equal(run.status, 'ready_for_review');
  assert.equal(run.checks.length, 9);
  assert.deepEqual(run.uncoveredRequirementIds, []);
});
test('missing error outcome does not count as requirement coverage', () => {
  const input = valid();
  input.scenarios[1].then = '';
  const run = evaluateBrief(input);
  assert.equal(run.status, 'needs_changes');
  assert.deepEqual(run.uncoveredRequirementIds, ['R2']);
  assert.equal(run.checks.find((c) => c.id === 'case-error').passed, false);
});
test('unapproved write permission blocks readiness even if other fields pass', () => {
  const input = valid();
  input.resource.requestedScopes += ', write:issues';
  const run = evaluateBrief(input);
  assert.match(
    run.checks.find((c) => c.id === 'permission').reason,
    /write:issues/,
  );
  assert.throws(() => approveBrief(input, run, '검토자'));
});
test('editing any input makes run and approval stale; stale export is labeled', () => {
  const input = valid();
  const run = evaluateBrief(input, 'first');
  const approval = approveBrief(input, run, '검토자', 'approved');
  assert.equal(isBriefApprovalCurrent(input, run, approval), true);
  input.metric.target = '8';
  assert.equal(isBriefRunCurrent(input, run), false);
  assert.equal(isBriefApprovalCurrent(input, run, approval), false);
  assert.throws(() => approveBrief(input, run, '검토자'));
  assert.match(briefMarkdown(input, run, approval), /재검사 필요/);
});
test('duplicate requirement ids and dangling references are errors', () => {
  const input = valid();
  input.requirements[1].id = 'R1';
  input.scenarios[0].requirementIds = ['UNKNOWN'];
  const result = evaluateBrief(input).checks.find(
    (c) => c.id === 'traceability',
  );
  assert.equal(result.passed, false);
  assert.match(result.reason, /중복/);
  assert.match(result.reason, /UNKNOWN/);
});
test('blank, negative, malformed and non-finite metrics fail; zero is valid', () => {
  for (const value of ['', '-1', '12abc', 'Infinity', 'NaN', '1e3'])
    assert.equal(nonNegativeNumber(value), null);
  assert.equal(nonNegativeNumber('0'), 0);
  const input = valid();
  input.metric.target = '';
  assert.equal(
    evaluateBrief(input).checks.find((c) => c.id === 'metric').passed,
    false,
  );
});
test('saved state validator rejects malformed nested structures', () => {
  assert.equal(isBrief(valid()), true);
  assert.equal(isBrief({ ...valid(), resource: null }), false);
  assert.equal(isBrief({ ...valid(), scenarios: [{ id: 'oops' }] }), false);
  assert.equal(isBrief(null), false);
});
