import type { EstimateInput, WorkflowInput } from './engine';

export const DEFAULT_INPUT: WorkflowInput = {
  config: {
    name: '설비 점검 요청 취합',
    owner: '샘플 운영 담당자',
    exceptionOwner: '샘플 검토 담당자',
    completion: '검증·승인된 요청을 한 번만 전달하고 처리 기록을 남긴다.',
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
    ].map(id => ({
      id: id as WorkflowInput['config']['stages'][number]['id'],
      enabled: true,
    })),
  },
  record: {
    requestId: 'REQ-1001',
    equipmentId: 'PR-01',
    occurredAt: '2026-09-29T09:00:00+09:00',
    severity: 'high',
    note: '프레스 진동 점검 요청. 다음 가동 전 담당자 검토가 필요합니다.',
    contactEmail: 'operator@example.invalid',
    revision: 1,
  },
};
export const DEFAULT_ESTIMATE: EstimateInput = {
  volume: 100,
  eligible: 0.6,
  baseline: 10,
  review: 2,
  exceptionRate: 0.1,
  exceptionMinutes: 8,
  maintenance: 60,
  setupHours: 12,
};
export const SCENARIOS = [
  {
    id: 'valid',
    label: '정상 요청 + 승인',
    description:
      '검증 후 현재 내용에 승인하고, 같은 요청을 다시 실행해 중복 전달 방지를 확인하세요.',
  },
  {
    id: 'missing',
    label: '장비 ID 누락',
    description:
      '필수 입력이 비어 있어 검증에서 멈춥니다. 장비를 선택해 복구하세요.',
  },
  {
    id: 'approval-order',
    label: '승인보다 먼저 전달',
    description:
      '전달 단계를 승인 앞에 놓았습니다. 위·아래 버튼으로 순서를 고치세요.',
  },
  {
    id: 'privacy',
    label: '연락처 마스킹 누락',
    description:
      '외부 전달 조건인데 마스킹이 꺼져 있습니다. 해당 단계를 다시 켜세요.',
  },
  {
    id: 'failure',
    label: '전달 실패 후 재시도',
    description:
      '전달 실패를 의도적으로 넣었습니다. 실패 스위치를 끄고 재시도하면 한 번만 완료됩니다.',
  },
] as const;
export function scenarioInput(id: string): WorkflowInput {
  const input = structuredClone(DEFAULT_INPUT);
  if (id === 'missing') input.record.equipmentId = '';
  if (id === 'approval-order') {
    const stages = input.config.stages;
    [stages[4], stages[5]] = [stages[5], stages[4]];
  }
  if (id === 'privacy')
    input.config.stages.find(s => s.id === 'redact')!.enabled = false;
  if (id === 'failure') input.config.failDispatch = true;
  return input;
}
