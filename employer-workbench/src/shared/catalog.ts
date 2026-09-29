export type CompanyId =
  | 'windly'
  | 'interx'
  | 'docenty'
  | 'ensapia'
  | 'vibers'
  | 'wisewires';
export interface WorkSample {
  id: CompanyId;
  company: string;
  role: string;
  product: string;
  title: string;
  description: string;
  category: string;
  outcome: string;
  steps: string[];
  needs: string[];
  decisions: { title: string; detail: string }[];
  limits: string[];
  sources: { label: string; url: string; supports: string }[];
}
export const creator = {
  name: '권준',
  github: 'https://github.com/estona815',
  email: 'kwonj0815@gmail.com',
};
export const sourceCheckedDate = '2026-09-29';
export const samples: WorkSample[] = [
  {
    id: 'windly',
    company: 'WINDLY · 어베어',
    role: 'AI Product Builder 인턴',
    product: 'AdSpec',
    title: '광고 규칙이 바뀌면, 어떤 설정을 다시 봐야 할까요?',
    description:
      '광고 설정을 버전별 규칙과 대조하고, 수정·재검사·검토 기록을 한 흐름으로 연결합니다.',
    category: '광고 연동 · 회귀 검증',
    outcome: '규칙의 근거에서 재검사까지',
    steps: [
      '오류 예제에서 차단 사유와 규칙 출처를 확인합니다.',
      '제안된 수정 또는 직접 편집 후 결과 변화를 봅니다.',
      '정상 예제를 검토한 뒤 예산을 바꿔 재검토 필요 상태를 확인합니다.',
    ],
    needs: [
      '채용 공고의 API 연동·AI 제품 제작·QA 요구를 함께 보여줄 과제를 선택했습니다.',
      'Pervis가 공개한 사전 검토 흐름을 참고해, 규칙 버전 변경의 영향과 회귀 검증에 초점을 맞췄습니다.',
      '각 실패가 어떤 입력과 규칙에서 발생했는지 설명하고 재현할 수 있게 했습니다.',
    ],
    decisions: [
      {
        title: '규칙에 출처와 버전 부여',
        detail:
          '플랫폼의 일부 공식 규칙과 이 실습의 운영 정책을 구분합니다. 두 규칙 버전에서 달라지는 판정을 확인할 수 있습니다.',
      },
      {
        title: '수정은 명시적으로 적용',
        detail:
          'URL·UTM·예산에 대한 수정 제안은 사용자가 적용할 때만 입력을 바꿉니다.',
      },
      {
        title: '검토 기록을 현재 입력에 연결',
        detail:
          '입력이나 규칙이 변경되면 기존 기록은 다시 검토해야 하는 상태로 바뀝니다.',
      },
    ],
    limits: [
      '합성 광고 설정이며 광고 계정에 연결하거나 캠페인을 집행하지 않습니다.',
      'Google Ads의 일부 규칙만 다룹니다. 실제 광고 정책 전체의 통과를 보장하지 않습니다.',
      '검토 기록은 로컬 실습 상태입니다. 신원 확인·서명·서버 감사 기록이 아닙니다.',
    ],
    sources: [
      {
        label: '어베어 AI Product Builder 채용',
        url: 'https://team.windly.cc/34981025-15df-80c0-af67-e6965f2dcf4f',
        supports: 'API 연동, 제품 제작과 QA 업무',
      },
      {
        label: 'Pervis 공식 제품',
        url: 'https://www.pervis.ai/',
        supports: '광고 생성·검토·승인 제품 맥락',
      },
    ],
  },
  {
    id: 'interx',
    company: 'INTERX · 인터엑스',
    role: 'AX Coordinator 인턴',
    product: 'FlowMap',
    title: '업무 자동화에 승인과 예외 처리를 함께 설계하세요.',
    description:
      '단계·권한·승인 조건을 편집하고 중복 실행과 실패 재시도를 재현하는 업무 흐름 실습입니다.',
    category: '업무 설계 · 예외 처리',
    outcome: '업무 흐름을 실행 가능한 기준으로',
    steps: [
      '단계와 승인 정책을 편집하고 흐름의 검사 결과를 확인합니다.',
      '실행 기록을 만든 뒤 중복 실행·실패 재시도를 비교합니다.',
      '주간 건수와 작업 시간을 바꾸고 가정에 따른 계산표를 내려받습니다.',
    ],
    needs: [
      'AX 업무의 자동화 도구 활용과 업무 문서화 요구에서 출발했습니다.',
      '정상 처리뿐 아니라 승인 누락·중복 처리·실패 후 재시도를 설명하는 과제를 만들었습니다.',
      '시간 절감 추정은 입력 가정과 계산식을 함께 보여주도록 설계했습니다.',
    ],
    decisions: [
      {
        title: '업무 조건을 구조화',
        detail:
          '단계 순서·쓰기 권한·승인 위치의 충돌을 검사하고 해당 단계를 표시합니다.',
      },
      {
        title: '실행 기록으로 예외 설명',
        detail:
          '실습용 레코드와 작업 키를 사용해 중복과 재시도의 처리 결과를 관찰합니다.',
      },
      {
        title: '계산의 가정 공개',
        detail:
          '건수·사람의 작업 시간·검토 비율을 직접 바꿀 수 있습니다. 실측 생산성으로 표현하지 않습니다.',
      },
    ],
    limits: [
      '브라우저 안의 합성 업무 실습이며 실제 업무 시스템과 연동하지 않습니다.',
      '시간 계산은 사용자가 정한 가정입니다. 실제 도입 효과나 비용 절감 실적이 아닙니다.',
      '실제 승인 권한·동시성·서버 저장소가 있는 운영 자동화는 별도 구현이 필요합니다.',
    ],
    sources: [
      {
        label: 'INTERX 공식 AX Coordinator 공고',
        url: 'https://interxlab.career.greetinghr.com/ko/o/210619',
        supports: 'AX 업무, 자동화 및 문서화 요구',
      },
      {
        label: '기업 등록 채용 공고',
        url: 'https://www.superookie.com/jobs/69d5a7316ebba30c560ad35c',
        supports: '인턴 직무와 업무 상세',
      },
    ],
  },
  {
    id: 'docenty',
    company: 'DOCENTY · 도슨티',
    role: 'AI-native Builder (PO)',
    product: 'BriefLedger',
    title: '모호한 제품 요구를 확인 가능한 완료 기준으로.',
    description:
      '제품 브리프와 정상·오류·권한 시나리오 사이의 누락된 연결을 찾고 검수 기준으로 내보냅니다.',
    category: '제품 정의 · 검수 기준',
    outcome: '요구사항과 검사 근거의 연결',
    steps: [
      '초기 브리프의 보완 항목 3개와 연결된 입력을 확인합니다.',
      '완성 예제로 바꾸고 9개 구조 검사 결과를 비교합니다.',
      '검토 기록을 만든 뒤 요구사항을 바꿔 이전 기록이 무효화되는지 봅니다.',
    ],
    needs: [
      'AI 도구를 이용한 제품 구현과 문제 정의를 함께 요구하는 PO 공고에 맞췄습니다.',
      'VibeOps의 데이터 범위·승인 맥락을 참고해 권한 거부와 오류 시나리오를 포함했습니다.',
      '한 문서에서 요구사항, 완료 기준, 검수 시나리오를 추적할 수 있도록 만들었습니다.',
    ],
    decisions: [
      {
        title: '검사할 수 있는 구조',
        detail:
          '문제·사용자·목표·범위와 각 요구사항의 시나리오 연결을 명시적으로 작성합니다.',
      },
      {
        title: '정상 경로 외의 요구 포함',
        detail:
          '데이터 권한 거부와 오류 상황의 행동을 빠뜨렸을 때 보완 항목으로 표시합니다.',
      },
      {
        title: '결과물은 다시 사용할 문서',
        detail: '현재 입력으로 Markdown 브리프와 JSON 검사 근거를 생성합니다.',
      },
    ],
    limits: [
      '구조·정책 목록의 일관성을 검사합니다. 문장의 의미 정확성을 LLM으로 평가하지 않습니다.',
      '실제 고객 인터뷰나 내부 요구사항을 사용하지 않은 합성 제품 과제입니다.',
      '구조 검사 통과가 제품의 시장성이나 운영 품질을 보장하지 않습니다.',
    ],
    sources: [
      {
        label: 'DOCENTY AI-native Builder 공고',
        url: 'https://www.rocketpunch.com/jobs/159343?list=true',
        supports: '제품 문제 정의와 AI 협업 구현 요구',
      },
      {
        label: 'VibeOps 공식 제품',
        url: 'https://vibeops.docenty.ai',
        supports: '데이터 범위·승인·감사 제품 맥락',
      },
    ],
  },
  {
    id: 'ensapia',
    company: 'ENSAPIA · 엔세이피아',
    role: 'AI / AX Centric Engineer 인턴',
    product: 'AvatarOps',
    title: '에이전트의 실행 기록을 같은 기준으로 검토하세요.',
    description:
      '합성 아바타 서비스 기록에서 사용자 범위·승인 순서·중복 적용을 검사하고 기준과 후보를 비교합니다.',
    category: '에이전트 기록 · 평가',
    outcome: '실패를 이벤트 단위로 재현',
    steps: [
      '실패 시나리오를 선택하고 기준 기록의 위반 근거를 봅니다.',
      '후보 기록으로 전환해 같은 규칙에서 해결된 항목을 비교합니다.',
      'JSON의 사용자·승인·시간을 편집하고 새 검사 결과를 내려받습니다.',
    ],
    needs: [
      'AI·AX 엔지니어 공고와 아바타 서비스 맥락에 맞춘 실행 기록 검사 과제입니다.',
      '응답 문구뿐 아니라 도구의 실제 실패와 쓰기 동작의 범위를 확인하는 규칙을 만들었습니다.',
      '서로 비교할 수 있는 조건의 기록만 평가 차이에 포함합니다.',
    ],
    decisions: [
      {
        title: '근거가 있는 실패',
        detail:
          '각 발견 사항은 규칙 ID, 이벤트 ID, 관측값과 기대값을 함께 제공합니다.',
      },
      {
        title: '비교 조건 고정',
        detail:
          '시나리오·fixture·정책·규칙 버전이 다른 기록을 비교에서 제외합니다.',
      },
      {
        title: '합성 시간은 합성으로 표시',
        detail:
          '이벤트 누적 시간과 간격을 보여주며 실제 모델의 성능 측정으로 표현하지 않습니다.',
      },
    ],
    limits: [
      '로컬 합성 기록 검사이며 실제 AI 모델이나 엔세이피아 시스템을 호출하지 않습니다.',
      '구조화된 규칙 범위의 검사입니다. 응답의 의미적 정확성이나 운영 안전성을 보증하지 않습니다.',
      '누적 시간과 차이는 합성 예제 수치이며 실제 지연 시간 벤치마크가 아닙니다.',
    ],
    sources: [
      {
        label: 'ENSAPIA AI Engineer 공식 공고',
        url: 'https://recruit.cocone.co.kr/job_posting/xGnZyTs4',
        supports: 'AI 엔지니어 인턴 직무',
      },
      {
        label: 'ENSAPIA AX Centric Engineer 공식 공고',
        url: 'https://recruit.cocone.co.kr/job_posting/AH8VH2Bm',
        supports: 'AX 엔지니어 직무와 AI 도구 협업',
      },
    ],
  },
  {
    id: 'vibers',
    company: 'VIBERS · 바이버스',
    role: 'AI Product Engineer',
    product: 'StockBridge',
    title: '서로 다른 재고표에서 확인할 차이를 찾으세요.',
    description:
      'SKU와 지역별 재고를 대조하고 중복·형식 오류를 보류합니다. 차이의 원본 행까지 확인할 수 있습니다.',
    category: '고객 데이터 · 재고 대조',
    outcome: '원본 행에서 검토 파일까지',
    steps: [
      '합성 CSV를 대조해 차이·오류·중복의 분류를 확인합니다.',
      '차이가 있는 행을 선택하고 원본 값과 계산 근거를 봅니다.',
      '수량을 편집해 다시 대조한 뒤 현재 결과를 CSV로 내려받습니다.',
    ],
    needs: [
      '공식 고객 사례의 다국가 재고 대사 업무에서 직접 과제를 골랐습니다.',
      '업무 데이터를 이해하고 실제로 쓸 수 있는 도구를 완성하는 제품 엔지니어 역량을 보여줍니다.',
      '중복과 데이터 오류를 조용히 합산하지 않고 검토 대상과 계산 대상에서 구분했습니다.',
    ],
    decisions: [
      {
        title: 'SKU와 지역을 함께 식별',
        detail:
          '같은 SKU라도 지역이 다르면 분리합니다. 동일 중복은 제외하고 충돌 중복은 모두 보류합니다.',
      },
      {
        title: '금액을 통화별로 계산',
        detail:
          '수량 차이는 부호를 유지하고 금액은 절대 차이로 계산합니다. USD·EUR 등 서로 다른 통화는 합산하지 않습니다.',
      },
      {
        title: '민감한 파일은 탭 메모리에',
        detail:
          '업로드한 CSV는 서버로 보내거나 브라우저 저장소에 저장하지 않습니다. 새로고침하면 예제로 돌아옵니다.',
      },
    ],
    limits: [
      '합성 예제이며 실제 고객이나 재고 시스템에 접근하지 않습니다.',
      '열 연결과 정해진 형식에 따른 결정적 대조입니다. 자유로운 문서 이해나 ERP 연결 기능은 없습니다.',
      '검토 기록은 현재 탭의 입력 확인용이며 실제 재고 조정이나 발주를 실행하지 않습니다.',
    ],
    sources: [
      {
        label: 'VIBERS 공식 고객 사례',
        url: 'https://www.vibers-ai.dev/ko/customers',
        supports: '다국가 재고 대사 자동화 맥락',
      },
      {
        label: 'VIBERS 공식 팀 소개',
        url: 'https://www.vibers-ai.dev/ko/team',
        supports: '고객 문제에서 데이터·에이전트·제품으로 이어지는 업무',
      },
    ],
  },
  {
    id: 'wisewires',
    company: 'WISEWIRES · 와이즈와이어즈',
    role: 'SQA 신입',
    product: 'FaultLab',
    title: '같은 입력으로 결함과 수정 결과를 비교하세요.',
    description:
      '주문·할인·환불 등 6개 결함을 실제 함수로 재현하고 예상값과 관측값을 비교해 보고서를 만듭니다.',
    category: '결함 재현 · 회귀 검증',
    outcome: '재현 조건을 수정 검증으로 연결',
    steps: [
      '전체 시나리오를 실행해 결함 6개와 수정 결과를 비교합니다.',
      '한 시나리오의 경계값을 바꾸고 같은 검증 규칙으로 다시 실행합니다.',
      '재현 순서·예상·관측·회귀 결과가 포함된 보고서를 내려받습니다.',
    ],
    needs: [
      'SQA 신입 지원에 필요한 결함 재현과 근거 중심의 보고 역량을 보여주도록 구성했습니다.',
      '공식 이커머스 테스트 서비스 맥락에서 주문·할인·환불 사례를 선택했습니다.',
      '테스트가 수정 코드를 그대로 따라가는 것을 피하고 별도의 업무 규칙과 비교합니다.',
    ],
    decisions: [
      {
        title: '결함과 수정 함수를 함께 실행',
        detail:
          '정적 PASS 표 대신 현재 입력을 두 구현에 넣어 실제 상태와 반환값을 관측합니다.',
      },
      {
        title: '경계와 비동기 순서 재현',
        detail:
          '0개 주문·만료 시각·중복 요청·오래된 검색 응답·중복 환불을 다룹니다.',
      },
      {
        title: '실패한 현재 사례를 문서화',
        detail:
          '재현 조건, 예상값, 관측값, 심각도 판단과 수정 버전 결과를 한 보고서에 담습니다.',
      },
    ],
    limits: [
      '결함이 의도적으로 포함된 합성 함수 실습입니다. 실제 상점에 영향을 주지 않습니다.',
      '결함 버전의 FAIL은 시연 목적의 재현 결과입니다. 프로젝트 테스트 실패와 구분합니다.',
      '명시한 시나리오의 검증이며 모든 보안·성능·호환성 문제를 포괄하지 않습니다.',
    ],
    sources: [
      {
        label: 'WISEWIRES SQA 신입 채용',
        url: 'https://www.jobkorea.co.kr/Recruit/GI_Read/50025872',
        supports: '신입 SQA 직무와 채용 맥락',
      },
      {
        label: 'WISEWIRES 이커머스 테스트',
        url: 'https://www.wisewires.com/services-ecommerce.html',
        supports: '이커머스 품질 검증 서비스',
      },
    ],
  },
];
