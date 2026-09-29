export type ScenarioId =
  | 'quantity'
  | 'discount'
  | 'duplicate'
  | 'expiry'
  | 'stale'
  | 'refund';
export type Variant = 'buggy' | 'fixed';
export type Params = Record<string, number | string | boolean>;
export type LabInputs = Record<ScenarioId, Params>;
export type Assertion = {
  rule: string;
  expected: unknown;
  actual: unknown;
  passed: boolean;
};
export type Observation = {
  summary: string;
  state: Record<string, unknown>;
  trace: string[];
};
export type TestResult = {
  scenario: ScenarioId;
  variant: Variant;
  input: Params;
  requirement: string;
  steps: string[];
  expected: Record<string, unknown>;
  observed: Observation | null;
  assertions: Assertion[];
  passed: boolean | null;
  inputErrors: string[];
};
export const SCENARIO_IDS: ScenarioId[] = [
  'quantity',
  'discount',
  'duplicate',
  'expiry',
  'stale',
  'refund',
];
export const RULES: Record<ScenarioId, string> = {
  quantity:
    '주문 수량은 1 이상, 재고 이하의 정수여야 합니다. 거절된 입력은 주문을 만들지 않습니다.',
  discount:
    '할인액은 0 이상 정수이며 상품금액을 넘을 수 없습니다. 결제금액과 적용할인 합계는 상품금액입니다.',
  duplicate:
    '같은 요청 키·같은 내용은 같은 주문을 반환합니다. 같은 키·다른 내용은 충돌로 거절하며 재고는 한 번만 줄어듭니다.',
  expiry:
    '쿠폰은 만료 시각 직전까지만 유효합니다. 만료 시각과 같거나 이후인 요청은 거절합니다.',
  stale:
    '모든 성공 응답 도착 후 화면은 마지막으로 요청한 검색어 B의 결과를 유지합니다.',
  refund:
    '취소를 반복해도 환불은 실제 결제금액을 넘지 않으며 재고는 한 번만 복원합니다. 미결제 주문은 환불하지 않습니다.',
};
const numericFields: Record<ScenarioId, string[]> = {
  quantity: ['stock', 'quantity'],
  discount: ['subtotal', 'coupon'],
  duplicate: ['stock', 'quantity', 'attempts'],
  expiry: [],
  stale: ['firstDelay', 'secondDelay', 'secondIssued'],
  refund: ['paid', 'attempts'],
};

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
function validCalendarDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})T/.exec(value);
  if (!match) return false;
  const year = Number(match[1]),
    month = Number(match[2]),
    day = Number(match[3]);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0),
    days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return month >= 1 && month <= 12 && day >= 1 && day <= days[month - 1];
}
export function isLabInputs(value: unknown): value is LabInputs {
  if (!isObject(value)) return false;
  return SCENARIO_IDS.every(id => {
    const params = value[id];
    if (!isObject(params) || Object.keys(params).length > 12) return false;
    if (
      !numericFields[id].every(
        key => typeof params[key] === 'number' && Number.isFinite(params[key])
      )
    )
      return false;
    if (id === 'duplicate')
      return (
        typeof params.requestKey === 'string' &&
        params.requestKey.length <= 80 &&
        typeof params.changedPayload === 'boolean'
      );
    if (id === 'expiry')
      return (
        typeof params.now === 'string' &&
        params.now.length < 100 &&
        typeof params.expiresAt === 'string' &&
        params.expiresAt.length < 100
      );
    if (id === 'refund') return typeof params.captured === 'boolean';
    return true;
  });
}

export function validateParams(id: ScenarioId, params: Params): string[] {
  const errors: string[] = [];
  for (const key of numericFields[id])
    if (
      typeof params[key] !== 'number' ||
      !Number.isFinite(params[key]) ||
      Math.abs(Number(params[key])) > 1000000000
    )
      errors.push(`${key}: 유한한 숫자를 ±1,000,000,000 이내로 입력하세요.`);
  const nonnegativeInteger = (key: string) => {
    if (!Number.isSafeInteger(params[key]) || Number(params[key]) < 0)
      errors.push(`${key}: 0 이상의 정수를 입력하세요.`);
  };
  if (id === 'quantity' || id === 'duplicate') nonnegativeInteger('stock');
  if (id === 'discount') nonnegativeInteger('subtotal');
  if (id === 'duplicate' || id === 'refund')
    if (
      !Number.isSafeInteger(params.attempts) ||
      Number(params.attempts) < 1 ||
      Number(params.attempts) > 8
    )
      errors.push('반복 횟수는 1~8 사이의 정수로 입력하세요.');
  if (id === 'duplicate') {
    if (
      typeof params.requestKey !== 'string' ||
      !params.requestKey.trim() ||
      params.requestKey.length > 80
    )
      errors.push('요청 키를 1~80자로 입력하세요.');
    if (typeof params.changedPayload !== 'boolean')
      errors.push('재요청 내용 변경 여부를 선택하세요.');
    if (
      !Number.isSafeInteger(params.quantity) ||
      Number(params.quantity) < 1 ||
      Number(params.quantity) > Number(params.stock)
    )
      errors.push(
        '중복 주문 실습의 첫 주문 수량은 1 이상 재고 이하의 정수여야 합니다.'
      );
  }
  if (id === 'refund') {
    nonnegativeInteger('paid');
    if (typeof params.captured !== 'boolean')
      errors.push('결제 여부를 선택하세요.');
  }
  if (id === 'stale')
    for (const key of numericFields[id]) {
      nonnegativeInteger(key);
      if (Number(params[key]) > 10000)
        errors.push(`${key}: 가상 시간은 10,000ms 이내로 입력하세요.`);
    }
  if (id === 'expiry')
    for (const key of ['now', 'expiresAt']) {
      const text = String(params[key] ?? '');
      if (
        !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/.test(
          text
        ) ||
        !validCalendarDate(text) ||
        !Number.isFinite(Date.parse(text))
      )
        errors.push(`${key}: 시간대를 포함한 유효한 ISO 날짜를 입력하세요.`);
    }
  return [...new Set(errors)];
}

/** Intentionally defective implementations live here solely for the local lab. */
export function quantityOperation(
  quantity: number,
  stock: number,
  variant: Variant
) {
  const accepted =
    variant === 'buggy'
      ? quantity >= 0 && quantity <= stock
      : Number.isSafeInteger(quantity) && quantity >= 1 && quantity <= stock;
  return {
    accepted,
    orderCount: accepted ? 1 : 0,
    stockAfter: accepted ? stock - quantity : stock,
    error: accepted ? null : 'QUANTITY_INVALID',
  };
}
export function discountOperation(
  subtotal: number,
  coupon: number,
  variant: Variant
) {
  if (variant === 'fixed' && (!Number.isSafeInteger(coupon) || coupon < 0))
    return {
      accepted: false,
      appliedDiscount: 0,
      payable: subtotal,
      error: 'COUPON_INVALID',
    };
  const appliedDiscount =
    variant === 'buggy' ? coupon : Math.min(subtotal, coupon);
  return {
    accepted: true,
    appliedDiscount,
    payable: subtotal - appliedDiscount,
    error: null,
  };
}
export function duplicateOperation(params: Params, variant: Variant) {
  const stock = Number(params.stock),
    quantity = Number(params.quantity),
    attempts = Number(params.attempts),
    key = String(params.requestKey);
  const orders: { orderId: string; key: string; quantity: number }[] = [],
    responses: { status: string; orderId?: string }[] = [];
  let remaining = stock;
  for (let n = 0; n < attempts; n++) {
    const requested = n > 0 && params.changedPayload ? quantity + 1 : quantity;
    const previous =
      variant === 'fixed' ? orders.find(order => order.key === key) : undefined;
    if (previous)
      responses.push(
        previous.quantity === requested
          ? { status: 'REPLAY', orderId: previous.orderId }
          : { status: 'CONFLICT' }
      );
    else if (requested > remaining) responses.push({ status: 'NO_STOCK' });
    else {
      const order = {
        orderId: `ORDER-${orders.length + 1}`,
        key,
        quantity: requested,
      };
      orders.push(order);
      responses.push({ status: 'CREATED', orderId: order.orderId });
      remaining -= requested;
    }
  }
  return {
    orderCount: orders.length,
    stockAfter: remaining,
    orders,
    responses,
  };
}
export function expiryOperation(
  now: string,
  expiresAt: string,
  variant: Variant
) {
  const nowTime = Date.parse(now),
    expiry = Date.parse(expiresAt);
  return {
    accepted: variant === 'buggy' ? nowTime <= expiry : !(nowTime >= expiry),
    deltaMs: nowTime - expiry,
  };
}
export function searchOperation(params: Params, variant: Variant) {
  type Event = {
    time: number;
    type: 'request' | 'response';
    query: string;
    sequence: number;
  };
  const events: Event[] = [
    { time: 0, type: 'request', query: 'A', sequence: 1 },
    {
      time: Number(params.secondIssued),
      type: 'request',
      query: 'B',
      sequence: 2,
    },
    {
      time: Number(params.firstDelay),
      type: 'response',
      query: 'A',
      sequence: 1,
    },
    {
      time: Number(params.secondIssued) + Number(params.secondDelay),
      type: 'response',
      query: 'B',
      sequence: 2,
    },
  ];
  events.sort(
    (a, b) =>
      a.time - b.time ||
      (a.type === b.type
        ? a.sequence - b.sequence
        : a.type === 'request'
          ? -1
          : 1)
  );
  let latest = 0,
    displayed = '';
  const timeline: { time: number; action: string; displayed: string }[] = [];
  for (const event of events) {
    if (event.type === 'request') {
      latest = event.sequence;
      timeline.push({
        time: event.time,
        action: `검색 ${event.query} 요청`,
        displayed,
      });
    } else {
      const apply = variant === 'buggy' || event.sequence === latest;
      if (apply) displayed = event.query;
      timeline.push({
        time: event.time,
        action: `검색 ${event.query} 응답 ${apply ? '화면 반영' : '오래된 응답 무시'}`,
        displayed,
      });
    }
  }
  return { displayedQuery: displayed, latestIssuedQuery: 'B', timeline };
}
export function refundOperation(params: Params, variant: Variant) {
  const paid = params.captured ? Number(params.paid) : 0;
  let refunded = 0,
    restorations = 0,
    state = params.captured ? 'PAID' : 'UNPAID';
  const events: string[] = [];
  for (let index = 0; index < Number(params.attempts); index++) {
    if (variant === 'buggy') {
      refunded += paid;
      restorations++;
      state = 'CANCELLED';
      events.push(`취소 ${index + 1}: ${paid}원 환불, 재고 복원`);
    } else if (state === 'PAID') {
      refunded = paid;
      restorations = 1;
      state = 'CANCELLED';
      events.push(`취소 ${index + 1}: 결제 취소와 재고 1회 복원`);
    } else events.push(`취소 ${index + 1}: 상태 ${state}, 추가 환불·복원 없음`);
  }
  return { paid, refunded, inventoryRestorations: restorations, state, events };
}

function assertion(
  rule: string,
  expected: unknown,
  actual: unknown
): Assertion {
  return {
    rule,
    expected,
    actual,
    passed: JSON.stringify(expected) === JSON.stringify(actual),
  };
}
export function runScenario(
  id: ScenarioId,
  params: Params,
  variant: Variant
): TestResult {
  const inputErrors = validateParams(id, params);
  const base = {
    scenario: id,
    variant,
    input: { ...params },
    requirement: RULES[id],
    inputErrors,
  };
  if (inputErrors.length)
    return {
      ...base,
      steps: [],
      expected: {},
      observed: null,
      assertions: [],
      passed: null,
    };
  let expected: Record<string, unknown> = {},
    observed: Observation = { summary: '', state: {}, trace: [] },
    assertions: Assertion[] = [],
    steps: string[] = [];
  if (id === 'quantity') {
    const q = Number(params.quantity),
      stock = Number(params.stock),
      valid = Number.isInteger(q) && q > 0 && q <= stock;
    const state = quantityOperation(q, stock, variant);
    expected = {
      accepted: valid,
      orderCount: valid ? 1 : 0,
      stockAfter: valid ? stock - q : stock,
    };
    assertions = [
      assertion('수량 정책에 맞는 승인/거절', valid, state.accepted),
      assertion(
        '거절된 요청은 주문을 만들지 않음',
        valid ? 1 : 0,
        state.orderCount
      ),
      assertion('재고 변화 일치', expected.stockAfter, state.stockAfter),
    ];
    steps = [`재고를 ${stock}개로 설정`, `수량 ${q}개로 주문 요청`];
    observed = {
      summary: state.accepted
        ? '주문이 생성되었습니다.'
        : '수량 오류로 주문이 거절되었습니다.',
      state,
      trace: steps,
    };
  }
  if (id === 'discount') {
    const subtotal = Number(params.subtotal),
      coupon = Number(params.coupon),
      valid = Number.isInteger(coupon) && coupon >= 0;
    const state = discountOperation(subtotal, coupon, variant);
    const applicable = valid ? (coupon > subtotal ? subtotal : coupon) : 0;
    expected = {
      accepted: valid,
      appliedDiscount: applicable,
      payable: subtotal - applicable,
    };
    assertions = [
      assertion('할인 입력 정책', valid, state.accepted),
      assertion('결제금액은 0 이상', true, state.payable >= 0),
      assertion(
        '적용할인은 상품금액 이내',
        true,
        state.appliedDiscount >= 0 && state.appliedDiscount <= subtotal
      ),
      assertion('요구사항의 결제금액', expected.payable, state.payable),
    ];
    steps = [`상품금액 ${subtotal}원 준비`, `정액 쿠폰 ${coupon}원 적용`];
    observed = {
      summary: state.accepted
        ? `결제 예정 ${state.payable}원`
        : '쿠폰 입력 오류로 적용 거절',
      state,
      trace: steps,
    };
  }
  if (id === 'duplicate') {
    const state = duplicateOperation(params, variant),
      attempts = Number(params.attempts),
      expectedConflicts = params.changedPayload ? attempts - 1 : 0;
    expected = {
      orderCount: 1,
      stockAfter: Number(params.stock) - Number(params.quantity),
      conflicts: expectedConflicts,
      uniqueReturnedOrderIds: 1,
    };
    const returnedIds = new Set(
      state.responses.flatMap(x => (x.orderId ? [x.orderId] : []))
    );
    assertions = [
      assertion('반복해도 주문은 1건', 1, state.orderCount),
      assertion('재고를 한 번만 차감', expected.stockAfter, state.stockAfter),
      assertion(
        '서로 다른 내용의 키 재사용은 충돌',
        expectedConflicts,
        state.responses.filter(x => x.status === 'CONFLICT').length
      ),
      assertion('주문 ID 재사용', 1, returnedIds.size),
    ];
    steps = [
      `재고 ${params.stock}, 수량 ${params.quantity}로 준비`,
      `키 ${params.requestKey}를 ${attempts}회 제출`,
      params.changedPayload
        ? '두 번째부터 수량을 1개 늘려 같은 키로 제출'
        : '같은 입력과 요청 키 유지',
    ];
    observed = {
      summary: `생성된 주문 ${state.orderCount}건 · 남은 재고 ${state.stockAfter}`,
      state,
      trace: state.responses.map(
        (r, i) => `${i + 1}회: ${r.status}${r.orderId ? ` / ${r.orderId}` : ''}`
      ),
    };
  }
  if (id === 'expiry') {
    const delta =
      Date.parse(String(params.now)) - Date.parse(String(params.expiresAt));
    const expectedValid = delta < 0;
    const state = expiryOperation(
      String(params.now),
      String(params.expiresAt),
      variant
    );
    expected = { accepted: expectedValid, deltaMs: delta };
    assertions = [
      assertion(
        '만료시각은 유효 구간에 포함하지 않음',
        expectedValid,
        state.accepted
      ),
    ];
    steps = [
      `만료시각 ${params.expiresAt} 설정`,
      `고정 시계 ${params.now}로 쿠폰 사용 요청`,
    ];
    observed = {
      summary: state.accepted
        ? '쿠폰을 받아들였습니다.'
        : '만료된 쿠폰을 거절했습니다.',
      state,
      trace: [`요청 시각 − 만료 시각 = ${delta}ms`, ...steps],
    };
  }
  if (id === 'stale') {
    const state = searchOperation(params, variant);
    expected = { displayedQuery: 'B' };
    assertions = [
      assertion('마지막 요청의 결과 유지', 'B', state.displayedQuery),
    ];
    steps = [
      `가상 0ms에 검색 A 요청, 응답 지연 ${params.firstDelay}ms`,
      `${params.secondIssued}ms에 검색 B 요청, 응답 지연 ${params.secondDelay}ms`,
      '정렬된 이벤트를 차례로 실행',
    ];
    observed = {
      summary: `마지막 화면: 검색 ${state.displayedQuery}`,
      state,
      trace: state.timeline.map(
        e => `${e.time}ms · ${e.action} · 화면 ${e.displayed || '없음'}`
      ),
    };
  }
  if (id === 'refund') {
    const state = refundOperation(params, variant),
      paid = params.captured ? Number(params.paid) : 0,
      restorations = params.captured ? 1 : 0;
    expected = { paid, refunded: paid, inventoryRestorations: restorations };
    assertions = [
      assertion('환불은 결제금액을 넘지 않음', true, state.refunded <= paid),
      assertion('최종 환불금액', paid, state.refunded),
      assertion(
        '재고 복원은 유효한 취소 1회만',
        restorations,
        state.inventoryRestorations
      ),
    ];
    steps = [
      `${params.captured ? '결제 완료' : '미결제'} 주문 ${paid}원 준비`,
      `취소를 ${params.attempts}회 요청`,
    ];
    observed = {
      summary: `결제 ${paid}원 / 누적 환불 ${state.refunded}원`,
      state,
      trace: state.events,
    };
  }
  return {
    ...base,
    steps,
    expected,
    observed,
    assertions,
    passed: assertions.every(a => a.passed),
  };
}

export function makeIssueReport(result: TestResult, severity: string) {
  if (result.passed !== false || !result.observed)
    throw new Error('실제로 실패한 실행을 먼저 선택하세요.');
  return {
    schemaVersion: 'wisewires-repro-v1',
    fixtureVersion: '2026-09-29',
    title: `[의도된 샘플 결함] ${result.scenario}`,
    status: 'REPRODUCED',
    severity,
    scope: '독립 제작한 채용 지원용 실습. 실제 회사 서비스의 결함이 아닙니다.',
    requirement: result.requirement,
    variant: result.variant,
    input: result.input,
    steps: result.steps,
    expected: result.expected,
    actual: result.observed,
    failedAssertions: result.assertions.filter(a => !a.passed),
    fixSuggestion: fixSuggestion(result.scenario),
    limitations: [
      '로컬 함수와 가상 이벤트 실습이며 실제 결제·재고·네트워크 없음',
      '순차 재실행 검사이며 분산 동시성 검증이 아님',
      '등록된 사례의 회귀 검증으로 완전한 품질 보증을 주장하지 않음',
    ],
    sources: [
      'https://www.wisewires.com/services-ecommerce.html',
      'https://www.jobkorea.co.kr/Recruit/GI_Read/50025872?Oem_Code=C1&PageGbn=ST&sc=225',
    ],
  };
}
export function fixSuggestion(id: ScenarioId): string {
  return {
    quantity:
      '수량을 정수·최솟값·재고 상한으로 검증하고 거절 시 부작용을 남기지 않습니다.',
    discount:
      '음수·소수 할인 입력을 거절하고 적용할인을 상품금액으로 제한합니다.',
    duplicate:
      '요청 키와 내용에 연결된 결과를 저장하고, 동일 요청은 재사용하며 내용 충돌을 거절합니다.',
    expiry: '시간대가 있는 시각을 비교하고 만료시각 이상은 거절합니다.',
    stale:
      '응답에 요청 순번을 연결해 마지막으로 요청한 순번만 화면에 반영합니다.',
    refund:
      'PAID에서 CANCELLED로 한 번만 전환하고 환불과 재고 복원을 그 전환에 연결합니다.',
  }[id];
}
export function issueMarkdown(
  report: ReturnType<typeof makeIssueReport>
): string {
  return [
    `# ${report.title}`,
    '',
    report.scope,
    '',
    `- 상태: ${report.status}`,
    `- 심각도: ${report.severity} (실습자의 판단)`,
    `- 구현: ${report.variant}`,
    `- 요구사항: ${report.requirement}`,
    '',
    '## 재현 순서',
    '',
    ...report.steps.map((s, i) => `${i + 1}. ${s}`),
    '',
    '## 입력',
    '```json',
    JSON.stringify(report.input, null, 2),
    '```',
    '',
    '## 예상',
    '```json',
    JSON.stringify(report.expected, null, 2),
    '```',
    '',
    '## 실제 결과',
    '```json',
    JSON.stringify(report.actual, null, 2),
    '```',
    '',
    '## 실패한 검증',
    '',
    ...report.failedAssertions.map(
      a =>
        `- ${a.rule}: 예상 ${JSON.stringify(a.expected)} / 실제 ${JSON.stringify(a.actual)}`
    ),
    '',
    '## 수정 방향',
    '',
    report.fixSuggestion,
    '',
    '## 범위',
    ...report.limitations.map(s => `- ${s}`),
    '',
    '## 직무·사업 맥락 출처',
    ...report.sources.map(url => `- ${url}`),
  ].join('\n');
}
