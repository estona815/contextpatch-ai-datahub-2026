import type { Brief } from './engine';

export const DOCENTY_SAMPLE_VERSION = 'docenty-independent-2026-09-29-v1';
const ready: Brief = {
  title: '부서별 주간 이슈 요약',
  userRole: '프로젝트 운영 담당자',
  problem: '각 팀의 이슈를 여러 문서에서 모으느라 주간 보고 준비가 반복됩니다.',
  outcome: '승인된 이슈 표에서 근거가 연결된 주간 요약 초안을 만듭니다.',
  metric: {
    name: '주간 보고 초안 준비 시간',
    baseline: '40',
    target: '10',
    direction: 'lte',
    unit: '분/주',
  },
  scopeIn: '이슈 읽기, 부서별 요약 초안, 원문 ID 연결',
  scopeOut: '이슈 원본 수정, 외부 메일 발송, 인사 평가',
  resource: {
    name: 'project_issues (예시 데이터)',
    fields: 'issue_id, status, owner_team, summary',
    approved: true,
    requestedScopes: 'read:issues',
    allowedScopes: 'read:issues',
  },
  requirements: [
    { id: 'R1', text: '각 요약 문장에 원본 이슈 ID를 표시한다.' },
    { id: 'R2', text: '누락된 이슈는 제외 이유와 재시도 방법을 표시한다.' },
    { id: 'R3', text: '허용되지 않은 팀의 이슈는 반환하지 않는다.' },
  ],
  scenarios: [
    {
      id: 'AC1',
      kind: 'normal',
      given: '승인된 팀의 이슈가 3개 있다.',
      when: '주간 초안 만들기를 실행한다.',
      then: '요약과 각 문장의 원본 이슈 ID를 함께 표시한다.',
      requirementIds: ['R1'],
    },
    {
      id: 'AC2',
      kind: 'error',
      given: '한 이슈의 summary가 비어 있다.',
      when: '같은 기간의 요약을 만든다.',
      then: '해당 이슈를 누락 목록에 표시하고 원본 수정 후 재시도를 안내한다.',
      requirementIds: ['R2'],
    },
    {
      id: 'AC3',
      kind: 'permission',
      given: '사용자의 팀이 리소스 허용 범위 밖이다.',
      when: '해당 팀의 이슈를 요청한다.',
      then: '이슈 내용 없이 권한 없음과 관리자 문의 방법을 표시한다.',
      requirementIds: ['R3'],
    },
  ],
};
const blocked: Brief = JSON.parse(JSON.stringify(ready));
blocked.resource.requestedScopes = 'read:issues, write:issues';
blocked.scenarios[1].then = '';
export const DOCENTY_SAMPLES = [
  { id: 'gaps', label: '권한·검수 보완이 필요한 브리프', brief: blocked },
  { id: 'ready', label: '검토 기준이 완성된 브리프', brief: ready },
];
export const copyBrief = (brief: Brief): Brief =>
  JSON.parse(JSON.stringify(brief));
