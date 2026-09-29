export type StageId =
  | 'intake'
  | 'validate'
  | 'normalize'
  | 'redact'
  | 'approve'
  | 'dispatch'
  | 'audit';
export type Stage = { id: StageId; enabled: boolean };
export type RequestRecord = {
  requestId: string;
  equipmentId: string;
  occurredAt: string;
  severity: string;
  note: string;
  contactEmail: string;
  revision: number;
};
export type WorkflowConfig = {
  name: string;
  owner: string;
  exceptionOwner: string;
  completion: string;
  externalTransfer: boolean;
  requiresApproval: boolean;
  failDispatch: boolean;
  stages: Stage[];
};
export type WorkflowInput = { config: WorkflowConfig; record: RequestRecord };
export type WorkflowIssue = {
  code: string;
  stage: StageId | 'requirements';
  message: string;
  remedy: string;
};
export type TraceStep = {
  stage: StageId;
  status: 'PASS' | 'BLOCK' | 'WAIT' | 'FAIL' | 'SKIP';
  detail: string;
};
export type LedgerEntry = {
  requestId: string;
  payloadKey: string;
  configKey: string;
  orderId: string;
  revision: number;
  output: Record<string, unknown>;
};
export type Approval = {
  requestId: string;
  revision: number;
  payloadKey: string;
  configKey: string;
};
export type RunStatus =
  | 'BLOCKED'
  | 'WAITING_APPROVAL'
  | 'SUCCEEDED'
  | 'DUPLICATE'
  | 'FAILED'
  | 'CONFLICT';
export type RunResult = {
  status: RunStatus;
  issues: WorkflowIssue[];
  trace: TraceStep[];
  ledger: LedgerEntry[];
  output: Record<string, unknown> | null;
  newDispatches: number;
};
export type EstimateInput = {
  volume: number;
  eligible: number;
  baseline: number;
  review: number;
  exceptionRate: number;
  exceptionMinutes: number;
  maintenance: number;
  setupHours: number;
};
export type EstimateResult = {
  errors: string[];
  before: number | null;
  after: number | null;
  net: number | null;
  recoveryWeeks: number | null;
};

export const STAGE_IDS: StageId[] = [
  'intake',
  'validate',
  'normalize',
  'redact',
  'approve',
  'dispatch',
  'audit',
];
export const STAGE_LABELS: Record<StageId, string> = {
  intake: '요청 접수',
  validate: '필드 검증',
  normalize: '정보 정리',
  redact: '연락처 마스킹',
  approve: '담당자 승인',
  dispatch: '전달 시뮬레이션',
  audit: '처리 기록',
};
export const EQUIPMENT = ['PR-01', 'CV-02', 'FAN-03'];
export const SOURCE_VERSION = '2026-09-29 / INTERX AX Coordinator 210619';

function object(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
function validCalendarDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})T/.exec(value);
  if (!match) return false;
  const year = Number(match[1]),
    month = Number(match[2]),
    day = Number(match[3]);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return month >= 1 && month <= 12 && day >= 1 && day <= days[month - 1];
}
export function isWorkflowInput(value: unknown): value is WorkflowInput {
  if (!object(value) || !object(value.config) || !object(value.record))
    return false;
  const c = value.config,
    r = value.record;
  return (
    ['name', 'owner', 'exceptionOwner', 'completion'].every(
      k => typeof c[k] === 'string' && (c[k] as string).length < 2000
    ) &&
    ['externalTransfer', 'requiresApproval', 'failDispatch'].every(
      k => typeof c[k] === 'boolean'
    ) &&
    Array.isArray(c.stages) &&
    c.stages.length === 7 &&
    c.stages.every(
      s =>
        object(s) &&
        STAGE_IDS.includes(s.id as StageId) &&
        typeof s.enabled === 'boolean'
    ) &&
    new Set(c.stages.map(s => (s as { id: string }).id)).size === 7 &&
    [
      'requestId',
      'equipmentId',
      'occurredAt',
      'severity',
      'note',
      'contactEmail',
    ].every(k => typeof r[k] === 'string' && (r[k] as string).length < 2000) &&
    Number.isSafeInteger(r.revision) &&
    (r.revision as number) > 0
  );
}

function add(
  issues: WorkflowIssue[],
  code: string,
  stage: WorkflowIssue['stage'],
  message: string,
  remedy: string
) {
  issues.push({ code, stage, message, remedy });
}
export function validateWorkflow(input: WorkflowInput): WorkflowIssue[] {
  const issues: WorkflowIssue[] = [];
  if (!isWorkflowInput(input))
    return [
      {
        code: 'STRUCTURE',
        stage: 'requirements',
        message: '저장된 입력 형식이 올바르지 않습니다.',
        remedy: '샘플을 다시 불러오세요.',
      },
    ];
  const c = input.config,
    r = input.record;
  for (const [field, label] of [
    ['owner', '업무 담당자'],
    ['exceptionOwner', '예외 담당자'],
    ['completion', '완료 기준'],
  ] as const) {
    if (!c[field].trim())
      add(
        issues,
        'WF-05',
        'requirements',
        `${label}가 비어 있습니다.`,
        `${label}를 입력하세요.`
      );
  }
  if (!c.name.trim())
    add(
      issues,
      'WF-05',
      'requirements',
      '업무 이름이 비어 있습니다.',
      '업무 이름을 입력하세요.'
    );
  const enabled = c.stages.filter(s => s.enabled).map(s => s.id);
  const index = (id: StageId) => enabled.indexOf(id);
  for (const id of [
    'intake',
    'validate',
    'normalize',
    'dispatch',
    'audit',
  ] as StageId[]) {
    if (index(id) < 0)
      add(
        issues,
        'WF-01',
        id,
        `${STAGE_LABELS[id]} 단계가 꺼져 있습니다.`,
        '필수 단계를 켜세요.'
      );
  }
  const depends: [StageId, StageId][] = [
    ['validate', 'intake'],
    ['normalize', 'validate'],
    ['redact', 'normalize'],
    ['approve', 'normalize'],
    ['dispatch', 'normalize'],
    ['audit', 'dispatch'],
  ];
  for (const [stage, before] of depends) {
    if (
      index(stage) >= 0 &&
      (index(before) < 0 || index(before) >= index(stage))
    )
      add(
        issues,
        stage === 'validate' ? 'WF-02' : 'WF-01',
        stage,
        `${STAGE_LABELS[stage]}에 필요한 ${STAGE_LABELS[before]} 결과가 없습니다.`,
        `${STAGE_LABELS[before]}를 먼저 실행하도록 이동하세요.`
      );
  }
  if (
    c.requiresApproval &&
    (index('approve') < 0 || index('approve') > index('dispatch'))
  )
    add(
      issues,
      'WF-03',
      'dispatch',
      '전달 전에 필요한 승인 단계가 없습니다.',
      '승인 단계를 켜고 전달 앞에 놓으세요.'
    );
  if (
    c.externalTransfer &&
    r.contactEmail.trim() &&
    (index('redact') < 0 || index('redact') > index('dispatch'))
  )
    add(
      issues,
      'WF-04',
      'dispatch',
      '외부 전달에 연락처 원문이 포함될 수 있습니다.',
      '연락처 마스킹을 켜고 전달 전에 놓으세요.'
    );
  if (!r.requestId.trim() || !/^[A-Za-z0-9_-]{1,80}$/.test(r.requestId.trim()))
    add(
      issues,
      'DATA-ID',
      'validate',
      '요청 ID는 영문·숫자·하이픈·밑줄 1~80자여야 합니다.',
      '예: REQ-1001'
    );
  if (!EQUIPMENT.includes(r.equipmentId))
    add(
      issues,
      'DATA-EQUIPMENT',
      'validate',
      '샘플 장비 목록에 없는 장비 ID입니다.',
      `목록: ${EQUIPMENT.join(', ')}`
    );
  if (!['low', 'medium', 'high'].includes(r.severity))
    add(
      issues,
      'DATA-SEVERITY',
      'validate',
      '요청 중요도를 확인할 수 없습니다.',
      'low, medium, high 중에서 선택하세요.'
    );
  if (!r.note.trim() || r.note.length > 500)
    add(
      issues,
      'DATA-NOTE',
      'validate',
      '요청 내용은 1~500자로 입력해야 합니다.',
      '공백이 아닌 내용을 입력하세요.'
    );
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/.test(
      r.occurredAt
    ) ||
    !validCalendarDate(r.occurredAt) ||
    !Number.isFinite(Date.parse(r.occurredAt))
  )
    add(
      issues,
      'DATA-TIME',
      'validate',
      '발생 일시에는 유효한 날짜와 시간대가 필요합니다.',
      '예: 2026-09-29T09:00:00+09:00'
    );
  if (
    r.contactEmail.trim() &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.contactEmail.trim())
  )
    add(
      issues,
      'DATA-CONTACT',
      'validate',
      '연락처 형식이 올바르지 않습니다.',
      '샘플 이메일을 입력하거나 비워 두세요.'
    );
  return issues;
}

export function payloadKey(record: RequestRecord): string {
  return JSON.stringify([
    record.requestId.trim(),
    record.equipmentId,
    record.occurredAt,
    record.severity,
    record.note.trim(),
    record.contactEmail.trim(),
  ]);
}
function configKey(config: WorkflowConfig): string {
  return JSON.stringify([
    config.name,
    config.owner,
    config.exceptionOwner,
    config.completion,
    config.externalTransfer,
    config.requiresApproval,
    config.failDispatch,
    config.stages,
  ]);
}
export function makeApproval(input: WorkflowInput): Approval {
  return {
    requestId: input.record.requestId.trim(),
    revision: input.record.revision,
    payloadKey: payloadKey(input.record),
    configKey: configKey(input.config),
  };
}
export function approvalMatches(
  input: WorkflowInput,
  approval: Approval | null
): boolean {
  const current = makeApproval(input);
  return (
    approval !== null &&
    Object.keys(current).every(
      k => current[k as keyof Approval] === approval[k as keyof Approval]
    )
  );
}

export function runWorkflow(
  input: WorkflowInput,
  ledger: LedgerEntry[] = [],
  approval: Approval | null = null
): RunResult {
  const issues = validateWorkflow(input),
    trace: TraceStep[] = [];
  const result = (
    status: RunStatus,
    output: Record<string, unknown> | null = null,
    next = ledger,
    newDispatches = 0
  ): RunResult => ({
    status,
    issues,
    trace,
    ledger: next.map(item => ({ ...item, output: { ...item.output } })),
    output,
    newDispatches,
  });
  if (issues.length) {
    for (const issue of issues)
      if (issue.stage !== 'requirements')
        trace.push({
          stage: issue.stage,
          status: 'BLOCK',
          detail: `${issue.code}: ${issue.message}`,
        });
    return result('BLOCKED');
  }
  const c = input.config,
    r = input.record,
    key = payloadKey(r),
    workflowKey = configKey(c);
  const prior = ledger.find(item => item.requestId === r.requestId.trim());
  let output: Record<string, unknown> = {},
    next = ledger;
  for (const step of c.stages.filter(s => s.enabled)) {
    if (step.id === 'intake')
      trace.push({
        stage: step.id,
        status: 'PASS',
        detail: `${r.requestId.trim()} · 변경 버전 ${r.revision} 접수`,
      });
    if (step.id === 'validate') {
      trace.push({
        stage: step.id,
        status: 'PASS',
        detail: '필수 필드·장비 목록·일시·내용 길이 검사 통과',
      });
      if (prior) {
        const sameExecution =
          prior.payloadKey === key && prior.configKey === workflowKey;
        trace.push({
          stage: 'dispatch',
          status: sameExecution ? 'SKIP' : 'BLOCK',
          detail: sameExecution
            ? `${prior.orderId}의 동일 입력·흐름 결과를 재사용합니다. 추가 전달 0건.`
            : '같은 요청 ID의 내용 또는 처리 흐름이 달라 전달과 기존 결과 재사용을 중지했습니다.',
        });
        trace.push({
          stage: 'audit',
          status: 'PASS',
          detail: '재실행 여부와 기존 처리 ID를 기록했습니다.',
        });
        if (!sameExecution)
          issues.push({
            code: 'WF-07',
            stage: 'dispatch',
            message:
              'DUPLICATE_CONFLICT: 같은 ID의 내용 또는 처리 흐름이 변경되었습니다.',
            remedy:
              '기존 결과와 새 전달 조건을 확인하고, 새 실행에는 새로운 요청 ID를 부여하세요.',
          });
        return result(
          sameExecution ? 'DUPLICATE' : 'CONFLICT',
          sameExecution ? prior.output : null
        );
      }
    }
    if (step.id === 'normalize') {
      output = {
        requestId: r.requestId.trim(),
        equipmentId: r.equipmentId,
        occurredAt: new Date(r.occurredAt).toISOString(),
        severity: r.severity,
        note: r.note.trim(),
        ...(r.contactEmail.trim()
          ? { contactEmail: r.contactEmail.trim() }
          : {}),
      };
      trace.push({
        stage: step.id,
        status: 'PASS',
        detail: '공백 정리, ISO UTC 일시 변환, 지정 필드 매핑 완료',
      });
    }
    if (step.id === 'redact') {
      if (output.contactEmail) {
        output.contactEmail = '[마스킹됨]';
        trace.push({
          stage: step.id,
          status: 'PASS',
          detail: '전달 데이터의 연락처 원문을 제거했습니다.',
        });
      } else
        trace.push({
          stage: step.id,
          status: 'SKIP',
          detail: '마스킹할 연락처가 없습니다.',
        });
    }
    if (step.id === 'approve') {
      if (!c.requiresApproval)
        trace.push({
          stage: step.id,
          status: 'SKIP',
          detail: '현재 샘플 정책에서 승인이 필수는 아닙니다.',
        });
      else if (!approvalMatches(input, approval)) {
        trace.push({
          stage: step.id,
          status: 'WAIT',
          detail: `버전 ${r.revision}의 입력과 흐름에 대한 샘플 승인이 필요합니다.`,
        });
        trace.push({
          stage: 'audit',
          status: 'PASS',
          detail: '대기 상태를 기록했습니다. 전달은 실행하지 않았습니다.',
        });
        return result('WAITING_APPROVAL', output);
      } else
        trace.push({
          stage: step.id,
          status: 'PASS',
          detail: `현재 버전 ${r.revision}의 승인 확인`,
        });
    }
    if (step.id === 'dispatch') {
      if (c.failDispatch) {
        trace.push({
          stage: step.id,
          status: 'FAIL',
          detail: '의도된 전달 실패. 성공 처리 키는 저장하지 않았습니다.',
        });
        trace.push({
          stage: 'audit',
          status: 'PASS',
          detail: '실패와 예외 담당자를 기록했습니다. 재시도할 수 있습니다.',
        });
        return result('FAILED', output);
      }
      const item: LedgerEntry = {
        requestId: r.requestId.trim(),
        payloadKey: key,
        configKey: workflowKey,
        revision: r.revision,
        orderId: `SIM-${String(ledger.length + 1).padStart(4, '0')}`,
        output: { ...output },
      };
      next = [...ledger, item];
      trace.push({
        stage: step.id,
        status: 'PASS',
        detail: `${item.orderId} 로컬 전달 1건 기록 · 외부 전송 없음`,
      });
    }
    if (step.id === 'audit')
      trace.push({
        stage: step.id,
        status: 'PASS',
        detail: `처리 ID, 버전, 검사 결과, 전달 여부와 담당자 ${c.owner.trim()} 기록 완료`,
      });
  }
  return result('SUCCEEDED', output, next, next.length - ledger.length);
}

export function isEstimateInput(value: unknown): value is EstimateInput {
  return (
    object(value) &&
    [
      'volume',
      'eligible',
      'baseline',
      'review',
      'exceptionRate',
      'exceptionMinutes',
      'maintenance',
      'setupHours',
    ].every(k => typeof value[k] === 'number' && Number.isFinite(value[k]))
  );
}
export function estimateTime(input: EstimateInput): EstimateResult {
  const errors: string[] = [];
  if (!isEstimateInput(input))
    errors.push('모든 가정에 유한한 숫자를 입력하세요.');
  if (isEstimateInput(input)) {
    if (
      !Number.isSafeInteger(input.volume) ||
      input.volume < 0 ||
      input.volume > 10000000
    )
      errors.push('주간 요청 수는 0~10,000,000 사이의 정수여야 합니다.');
    for (const [key, label] of [
      ['eligible', '자동화 대상 비율'],
      ['exceptionRate', '대상 중 예외 비율'],
    ] as const)
      if (input[key] < 0 || input[key] > 1)
        errors.push(`${label}은 0~100%여야 합니다.`);
    for (const [key, label] of [
      ['baseline', '기존 처리'],
      ['review', '검토'],
      ['exceptionMinutes', '추가 예외 처리'],
      ['maintenance', '주간 유지보수'],
      ['setupHours', '초기 구축'],
    ] as const)
      if (input[key] < 0 || input[key] > 1000000)
        errors.push(`${label} 시간은 0~1,000,000 범위여야 합니다.`);
  }
  if (errors.length)
    return {
      errors,
      before: null,
      after: null,
      net: null,
      recoveryWeeks: null,
    };
  const before = input.volume * input.baseline;
  const after =
    input.volume * (1 - input.eligible) * input.baseline +
    input.volume *
      input.eligible *
      (input.review + input.exceptionRate * input.exceptionMinutes) +
    input.maintenance;
  const net = before - after;
  return {
    errors,
    before,
    after,
    net,
    recoveryWeeks: net > 0 ? (input.setupHours * 60) / net : null,
  };
}

export function buildReport(
  input: WorkflowInput,
  run: RunResult,
  assumptions: EstimateInput
) {
  return {
    schemaVersion: 'interx-workflow-v1',
    sourceVersion: SOURCE_VERSION,
    scope:
      '독립 제작한 지원용 실습. 모든 기록은 샘플이며 규칙 기반 로컬 시뮬레이션입니다.',
    requirements: input.config,
    currentRecord: input.record,
    checks: validateWorkflow(input),
    execution: run,
    assumptions,
    estimate: estimateTime(assumptions),
    formulas: {
      before: 'N × b',
      after: 'N × (1-p) × b + N × p × (r + q × e) + m',
      net: 'before - after',
      setupRecovery: 'h × 60 / net (net > 0)',
    },
    limitations: [
      'AI 모델/API 호출이나 실제 전송 없음',
      '승인은 인증된 조직 승인이 아닌 로컬 데모 상태',
      '가정 기반 시간 추정이며 실제 ROI·고객 성과가 아님',
      '예외 추가 시간은 검토 시간에 더해짐; 머신 지연·도구비용·품질변화 제외',
    ],
  };
}
export function reportMarkdown(report: ReturnType<typeof buildReport>): string {
  const lines = [
    '# 업무 자동화 설계·검증 보고서',
    '',
    report.scope,
    '',
    `- 출처 기준: ${report.sourceVersion}`,
    `- 업무: ${report.requirements.name}`,
    `- 담당자: ${report.requirements.owner}`,
    `- 예외 담당자: ${report.requirements.exceptionOwner}`,
    `- 완료 기준: ${report.requirements.completion}`,
    `- 처리 상태: ${report.execution.status}`,
    '',
    '## 현재 입력',
    '',
    '```json',
    JSON.stringify(report.currentRecord, null, 2),
    '```',
    '',
    '## 실행 기록',
    '',
  ];
  for (const step of report.execution.trace)
    lines.push(
      `- ${STAGE_LABELS[step.stage]} / ${step.status}: ${step.detail}`
    );
  lines.push(
    '',
    '## 가정과 시간 추정',
    '',
    '```json',
    JSON.stringify(
      {
        assumptions: report.assumptions,
        estimate: report.estimate,
        formulas: report.formulas,
      },
      null,
      2
    ),
    '```',
    '',
    '## 적용 범위',
    ...report.limitations.map(item => `- ${item}`)
  );
  return lines.join('\n');
}
