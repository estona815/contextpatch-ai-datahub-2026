import type { LabInputs, ScenarioId } from './engine';
export const DEFAULT_INPUTS: LabInputs = {
  quantity: { stock: 5, quantity: 0 },
  discount: { subtotal: 1000, coupon: 5000 },
  duplicate: {
    stock: 10,
    quantity: 1,
    attempts: 2,
    requestKey: 'DEMO-001',
    changedPayload: false,
  },
  expiry: {
    now: '2026-09-29T03:00:00.000Z',
    expiresAt: '2026-09-29T03:00:00.000Z',
  },
  stale: { firstDelay: 100, secondDelay: 20, secondIssued: 10 },
  refund: { paid: 12000, attempts: 2, captured: true },
};
export type FieldDefinition = {
  key: string;
  label: string;
  type: 'number' | 'text' | 'checkbox';
  note?: string;
};
export type ScenarioDefinition = {
  id: ScenarioId;
  title: string;
  short: string;
  hint: string;
  severity: string;
  fields: FieldDefinition[];
};
export const SCENARIOS: ScenarioDefinition[] = [
  {
    id: 'quantity',
    title: '01 · 수량 경계',
    short: '0개 주문',
    hint: '수량을 0으로 요청한 뒤 1·5·6·1.5로 바꿔 경계를 비교하세요.',
    severity: '보통',
    fields: [
      { key: 'stock', label: '현재 재고 (개)', type: 'number' },
      {
        key: 'quantity',
        label: '주문 수량 (개)',
        type: 'number',
        note: '0·음수·소수도 검증할 수 있는 입력입니다.',
      },
    ],
  },
  {
    id: 'discount',
    title: '02 · 할인 한도',
    short: '음수 결제금액',
    hint: '상품금액보다 큰 쿠폰을 적용합니다. 할인액을 줄이면 결함이 재현되지 않을 수 있습니다.',
    severity: '높음',
    fields: [
      { key: 'subtotal', label: '상품금액 (원)', type: 'number' },
      {
        key: 'coupon',
        label: '정액 쿠폰 (원)',
        type: 'number',
        note: 'KRW 정수 금액 기준 · 배송비 0원',
      },
    ],
  },
  {
    id: 'duplicate',
    title: '03 · 주문 재실행',
    short: '중복 주문',
    hint: '같은 요청 키를 반복 제출해 주문 ID와 재고 변화를 확인하세요.',
    severity: '높음',
    fields: [
      { key: 'stock', label: '현재 재고 (개)', type: 'number' },
      { key: 'quantity', label: '첫 주문 수량 (개)', type: 'number' },
      { key: 'attempts', label: '제출 횟수 (1~8)', type: 'number' },
      { key: 'requestKey', label: '클라이언트 요청 키', type: 'text' },
      {
        key: 'changedPayload',
        label: '두 번째부터 수량을 1개 늘려 같은 키로 제출',
        type: 'checkbox',
      },
    ],
  },
  {
    id: 'expiry',
    title: '04 · 만료 경계',
    short: '만료 순간의 쿠폰',
    hint: '시계는 고정된 입력값입니다. 만료 1ms 전·정확한 순간·1ms 후를 비교하세요.',
    severity: '보통',
    fields: [
      { key: 'now', label: '요청 시각 (ISO · 시간대 포함)', type: 'text' },
      {
        key: 'expiresAt',
        label: '쿠폰 만료 시각 (ISO · 시간대 포함)',
        type: 'text',
      },
    ],
  },
  {
    id: 'stale',
    title: '05 · 응답 순서',
    short: '이전 검색어 덮어쓰기',
    hint: 'A를 먼저 요청하고 B를 나중에 요청합니다. A의 응답이 늦게 도착하면 어떻게 될까요?',
    severity: '보통',
    fields: [
      { key: 'firstDelay', label: 'A 응답 지연 (가상 ms)', type: 'number' },
      { key: 'secondIssued', label: 'B 요청 시점 (가상 ms)', type: 'number' },
      { key: 'secondDelay', label: 'B 응답 지연 (가상 ms)', type: 'number' },
    ],
  },
  {
    id: 'refund',
    title: '06 · 취소 재실행',
    short: '중복 환불',
    hint: '취소 요청을 반복해 누적 환불금액과 재고 복원이 한 번만 발생하는지 확인하세요.',
    severity: '높음',
    fields: [
      { key: 'paid', label: '주문 금액 (원)', type: 'number' },
      { key: 'attempts', label: '취소 횟수 (1~8)', type: 'number' },
      { key: 'captured', label: '실제로 결제된 샘플 주문', type: 'checkbox' },
    ],
  },
];
