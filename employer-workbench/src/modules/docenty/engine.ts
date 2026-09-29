export type ScenarioKind = 'normal' | 'error' | 'permission';
export type Requirement = { id: string; text: string };
export type Scenario = {
  id: string;
  kind: ScenarioKind;
  given: string;
  when: string;
  then: string;
  requirementIds: string[];
};
export type Brief = {
  title: string;
  userRole: string;
  problem: string;
  outcome: string;
  metric: {
    name: string;
    unit: string;
    baseline: string;
    target: string;
    direction: 'lte' | 'gte';
  };
  scopeIn: string;
  scopeOut: string;
  resource: {
    name: string;
    fields: string;
    approved: boolean;
    requestedScopes: string;
    allowedScopes: string;
  };
  requirements: Requirement[];
  scenarios: Scenario[];
};
export type BriefCheck = {
  id: string;
  name: string;
  passed: boolean;
  reason: string;
  evidence: string[];
};
export type BriefRun = {
  version: 'brief-acceptance-v1';
  inputSnapshot: string;
  evaluatedAt: string;
  status: 'ready_for_review' | 'needs_changes';
  checks: BriefCheck[];
  coveredRequirementIds: string[];
  uncoveredRequirementIds: string[];
};
export type BriefApproval = {
  inputSnapshot: string;
  approvedAt: string;
  reviewer: string;
  runTime: string;
};

const text = (value: string) => value.trim();
export const scopeList = (value: string) => [
  ...new Set(value.split(/[\n,]/).map(text).filter(Boolean)),
];
export function nonNegativeNumber(value: string): number | null {
  if (!/^\d+(?:\.\d+)?$/.test(value.trim())) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1e12
    ? parsed
    : null;
}
export const briefSnapshot = (brief: Brief) => JSON.stringify(brief);
const completeCase = (scenario: Scenario) =>
  [scenario.given, scenario.when, scenario.then].every(value => text(value));

export function evaluateBrief(
  brief: Brief,
  now = new Date().toISOString()
): BriefRun {
  const requested = scopeList(brief.resource.requestedScopes);
  const allowed = scopeList(brief.resource.allowedScopes);
  const excess = requested.filter(scope => !allowed.includes(scope));
  const ids = brief.requirements.map(req => text(req.id));
  const knownIds = new Set(ids);
  const completeCases = brief.scenarios.filter(completeCase);
  const covered = [
    ...new Set(
      completeCases
        .flatMap(scenario => scenario.requirementIds)
        .filter(id => knownIds.has(id))
    ),
  ];
  const uncovered = ids.filter(id => id && !covered.includes(id));
  const dangling = [
    ...new Set(
      brief.scenarios
        .flatMap(scenario => scenario.requirementIds)
        .filter(id => !knownIds.has(id))
    ),
  ];
  const invalidRequirements = brief.requirements.filter(
    req => !text(req.id) || !text(req.text)
  );
  const metricReady = Boolean(
    text(brief.metric.name) &&
    text(brief.metric.unit) &&
    nonNegativeNumber(brief.metric.baseline) !== null &&
    nonNegativeNumber(brief.metric.target) !== null
  );
  const checks: BriefCheck[] = [
    {
      id: 'problem',
      name: '사용자와 문제 정의',
      passed: [brief.title, brief.userRole, brief.problem, brief.outcome].every(
        value => Boolean(text(value))
      ),
      reason: '제목·대상 사용자·현재 문제·기대 결과를 모두 작성합니다.',
      evidence: [brief.userRole, brief.problem, brief.outcome].filter(Boolean),
    },
    {
      id: 'metric',
      name: '측정 가능한 완료 목표',
      passed: metricReady,
      reason:
        '기준값과 목표값은 0 이상 1조 이하 숫자여야 하며 측정 단위가 필요합니다.',
      evidence: [
        `${brief.metric.name || '지표 미정'}: ${brief.metric.baseline || '—'} → ${brief.metric.direction === 'lte' ? '이하' : '이상'} ${brief.metric.target || '—'} ${brief.metric.unit}`,
        '입력한 수치는 가정이며 실제 성과 측정이 아닙니다.',
      ],
    },
    {
      id: 'scope',
      name: '구현 범위와 제외 범위',
      passed: Boolean(text(brief.scopeIn) && text(brief.scopeOut)),
      reason: '이번에 구현할 기능과 의도적으로 제외할 기능을 함께 정합니다.',
      evidence: [
        `포함: ${brief.scopeIn || '미작성'}`,
        `제외: ${brief.scopeOut || '미작성'}`,
      ],
    },
    {
      id: 'resource',
      name: '데이터 연결 승인',
      passed: Boolean(
        text(brief.resource.name) &&
        scopeList(brief.resource.fields).length &&
        brief.resource.approved
      ),
      reason: '선택한 데이터 이름·필드와 연결 승인 여부를 확인합니다.',
      evidence: [
        brief.resource.name,
        `필드: ${scopeList(brief.resource.fields).join(', ') || '없음'}`,
        `승인: ${brief.resource.approved ? '있음' : '없음'}`,
      ],
    },
    {
      id: 'permission',
      name: '요청 권한이 허용 범위 안에 있음',
      passed: requested.length > 0 && excess.length === 0,
      reason: excess.length
        ? `허용되지 않은 권한: ${excess.join(', ')}`
        : requested.length
          ? '모든 요청 권한이 허용 목록에 있습니다.'
          : '요청 권한을 한 개 이상 명시하세요.',
      evidence: [
        `요청: ${requested.join(', ') || '없음'}`,
        `허용: ${allowed.join(', ') || '없음'}`,
      ],
    },
    ...(['normal', 'error', 'permission'] as ScenarioKind[]).map(kind => ({
      id: `case-${kind}`,
      name: `${{ normal: '정상 처리', error: '오류·복구', permission: '권한 거부' }[kind]} 시나리오`,
      passed: completeCases.some(scenario => scenario.kind === kind),
      reason:
        '상황·동작·관찰 가능한 기대 결과가 모두 있는 시나리오가 필요합니다.',
      evidence: brief.scenarios
        .filter(scenario => scenario.kind === kind)
        .map(
          scenario =>
            `${scenario.id}: ${scenario.given || '(상황 없음)'} → ${scenario.when || '(동작 없음)'} → ${scenario.then || '(결과 없음)'}`
        ),
    })),
    {
      id: 'traceability',
      name: '요구사항 ↔ 검수 시나리오 연결',
      passed:
        ids.length > 0 &&
        invalidRequirements.length === 0 &&
        knownIds.size === ids.length &&
        uncovered.length === 0 &&
        dangling.length === 0,
      reason:
        [
          !ids.length && '요구사항이 없습니다.',
          invalidRequirements.length > 0 &&
            'ID 또는 내용이 빈 요구사항이 있습니다.',
          knownIds.size !== ids.length && '요구사항 ID가 중복됩니다.',
          uncovered.length > 0 && `검수 없는 요구사항: ${uncovered.join(', ')}`,
          dangling.length > 0 &&
            `존재하지 않는 요구사항 연결: ${dangling.join(', ')}`,
        ]
          .filter(Boolean)
          .join(' ') || '모든 요구사항이 완성된 시나리오와 연결됩니다.',
      evidence: brief.requirements.map(
        req =>
          `${req.id || '(ID 없음)'} · ${req.text || '(내용 없음)'} · ${covered.includes(req.id) ? '검수 연결됨' : '검수 필요'}`
      ),
    },
  ];
  return {
    version: 'brief-acceptance-v1',
    inputSnapshot: briefSnapshot(brief),
    evaluatedAt: now,
    status: checks.every(check => check.passed)
      ? 'ready_for_review'
      : 'needs_changes',
    checks,
    coveredRequirementIds: covered,
    uncoveredRequirementIds: uncovered,
  };
}

export const isBriefRunCurrent = (brief: Brief, run: BriefRun | null) =>
  Boolean(run && run.inputSnapshot === briefSnapshot(brief));
export function approveBrief(
  brief: Brief,
  run: BriefRun,
  reviewer: string,
  now = new Date().toISOString()
): BriefApproval {
  if (!isBriefRunCurrent(brief, run))
    throw new Error('입력이 변경되었습니다. 검사를 다시 실행하세요.');
  if (
    run.status !== 'ready_for_review' ||
    !evaluateBrief(brief, now).checks.every(check => check.passed)
  )
    throw new Error('미통과 항목을 해결한 뒤 검토를 기록하세요.');
  if (!reviewer.trim()) throw new Error('검토자 이름을 입력하세요.');
  return {
    inputSnapshot: briefSnapshot(brief),
    approvedAt: now,
    reviewer: reviewer.trim(),
    runTime: run.evaluatedAt,
  };
}
export function isBriefApprovalCurrent(
  brief: Brief,
  run: BriefRun | null,
  approval: BriefApproval | null
) {
  return Boolean(
    approval &&
    run &&
    isBriefRunCurrent(brief, run) &&
    approval.inputSnapshot === briefSnapshot(brief) &&
    approval.runTime === run.evaluatedAt
  );
}
export function briefMarkdown(
  brief: Brief,
  run: BriefRun | null,
  approval: BriefApproval | null
): string {
  const current = isBriefRunCurrent(brief, run);
  return [
    `# ${brief.title || '제목 없는 브리프'}`,
    '',
    '독립 제작 지원용 샘플 · 실데이터 연결 및 LLM 호출 없음',
    '',
    `상태: ${!current ? '변경된 입력 · 재검사 필요' : isBriefApprovalCurrent(brief, run, approval) ? '현재 입력 검토 기록 있음' : run?.status === 'ready_for_review' ? '검토 준비 완료' : '보완 필요'}`,
    '',
    '## 문제와 사용자',
    brief.userRole,
    brief.problem,
    `기대 결과: ${brief.outcome}`,
    '',
    '## 목표 (입력한 가정값)',
    `${brief.metric.name}: ${brief.metric.baseline} → ${brief.metric.direction === 'lte' ? '≤' : '≥'} ${brief.metric.target} ${brief.metric.unit}`,
    '',
    '## 범위',
    `포함: ${brief.scopeIn}`,
    `제외: ${brief.scopeOut}`,
    '',
    '## 데이터와 권한',
    `데이터: ${brief.resource.name}`,
    `필드: ${brief.resource.fields}`,
    `연결 승인: ${brief.resource.approved ? '있음' : '없음'}`,
    `요청 권한: ${brief.resource.requestedScopes}`,
    `허용 권한: ${brief.resource.allowedScopes}`,
    '',
    '## 요구사항',
    ...brief.requirements.map(req => `- ${req.id}: ${req.text}`),
    '',
    '## 검수 시나리오',
    ...brief.scenarios.flatMap(scenario => [
      `### ${scenario.id} (${scenario.kind})`,
      `연결 요구사항: ${scenario.requirementIds.join(', ')}`,
      `Given: ${scenario.given}`,
      `When: ${scenario.when}`,
      `Then: ${scenario.then}`,
      '',
    ]),
    '## 현재 입력 검사',
    ...(current && run
      ? run.checks.map(
          check =>
            `- [${check.passed ? 'x' : ' '}] ${check.name} — ${check.reason}`
        )
      : ['입력 변경으로 이전 결과는 현재의 근거로 사용할 수 없습니다.']),
    '',
    '## 한계',
    '구조 완결성과 권한 목록의 일관성 검사입니다. 실제 운영 권한이나 목표 달성을 검증하지 않습니다.',
    '입력 및 검토 기록은 브라우저 내 상태이며 서버 전자서명이나 신원 확인이 아닙니다.',
  ].join('\n');
}

export function isBrief(value: unknown): value is Brief {
  if (!value || typeof value !== 'object') return false;
  const item = value as Brief;
  const str = (v: unknown) => typeof v === 'string' && v.length <= 30000;
  return (
    ['title', 'userRole', 'problem', 'outcome', 'scopeIn', 'scopeOut'].every(
      key => str((item as unknown as Record<string, unknown>)[key])
    ) &&
    Boolean(
      item.metric &&
      ['name', 'unit', 'baseline', 'target'].every(key =>
        str((item.metric as unknown as Record<string, unknown>)[key])
      ) &&
      ['lte', 'gte'].includes(item.metric.direction) &&
      item.resource &&
      ['name', 'fields', 'requestedScopes', 'allowedScopes'].every(key =>
        str((item.resource as unknown as Record<string, unknown>)[key])
      ) &&
      typeof item.resource.approved === 'boolean' &&
      Array.isArray(item.requirements) &&
      item.requirements.length <= 30 &&
      item.requirements.every(req => req && str(req.id) && str(req.text)) &&
      Array.isArray(item.scenarios) &&
      item.scenarios.length <= 30 &&
      item.scenarios.every(
        scenario =>
          scenario &&
          str(scenario.id) &&
          ['normal', 'error', 'permission'].includes(scenario.kind) &&
          [scenario.given, scenario.when, scenario.then].every(str) &&
          Array.isArray(scenario.requirementIds) &&
          scenario.requirementIds.every(str)
      )
    )
  );
}
