import type { AdSpecInput } from './engine.ts';
import { RULESET_V2 } from './engine.ts';
const base: AdSpecInput = {
  schemaVersion: '1.0',
  ruleSetVersion: RULESET_V2,
  id: 'autumn-launch',
  platform: 'google_ads',
  account: { customerId: '1234567890', currency: 'KRW' },
  campaign: {
    name: '가을 아바타 컬렉션',
    budgetPeriod: 'DAILY',
    dailyBudget: '30000',
    currency: 'KRW',
    startAt: '2026-10-01T09:00:00+09:00',
    endAt: '2026-10-07T23:59:00+09:00',
    destinationUrl: 'https://example.test/collection#new',
    tracking: {
      utm_source: 'google',
      utm_medium: 'cpc',
      utm_campaign: 'autumn-launch',
    },
  },
};
export const GOOD_INPUT: AdSpecInput = structuredClone(base);
export interface AdFixture {
  id: string;
  name: string;
  description: string;
  input: unknown;
  expectedRules: string[];
}
const change = (fn: (v: AdSpecInput) => void): AdSpecInput => {
  const v = structuredClone(base);
  fn(v);
  return v;
};
export const FIXTURES: AdFixture[] = [
  {
    id: 'launch-errors',
    name: '출시 전 오류 3개',
    description:
      '충돌하는 예산, 프로토콜 없는 URL, 빠진 캠페인 추적값을 고쳐보세요.',
    input: change(v => {
      v.campaign.totalBudget = '300000';
      v.campaign.destinationUrl = 'example.test/collection#new';
      delete v.campaign.tracking.utm_campaign;
    }),
    expectedRules: [
      'GOOGLE_BUDGET_EXCLUSIVE',
      'LOCAL_URL_HTTPS',
      'LOCAL_UTM_REQUIRED',
    ],
  },
  {
    id: 'ready',
    name: '검수 통과 예시',
    description: '이 입력을 승인한 뒤 예산을 바꾸면 이전 승인이 무효화됩니다.',
    input: structuredClone(base),
    expectedRules: [],
  },
  {
    id: 'tracking-version',
    name: '규칙 변경 영향',
    description: 'v1은 통과하지만 v2의 utm_campaign 규칙에서 실패합니다.',
    input: change(v => {
      delete v.campaign.tracking.utm_campaign;
    }),
    expectedRules: ['LOCAL_UTM_REQUIRED'],
  },
  {
    id: 'precise-micros',
    name: '미세 단위 예산',
    description: '소수점 예산을 부동소수점 반올림 없이 micros로 변환합니다.',
    input: change(v => {
      v.campaign.dailyBudget = '0.000001';
    }),
    expectedRules: [],
  },
  {
    id: 'precision-error',
    name: '단위 이하 금액',
    description: 'micros보다 작은 금액을 잘못 반올림하지 않고 차단합니다.',
    input: change(v => {
      v.campaign.dailyBudget = '0.0000001';
    }),
    expectedRules: ['LOCAL_EXACT_BUDGET'],
  },
  {
    id: 'currency-mismatch',
    name: '계정 통화 불일치',
    description: '계정과 캠페인 통화가 다를 때 자동 환산하지 않습니다.',
    input: change(v => {
      v.account.currency = 'USD';
    }),
    expectedRules: ['LOCAL_ACCOUNT_CURRENCY'],
  },
  {
    id: 'utm-conflict',
    name: 'UTM 값 충돌',
    description: 'URL의 기존 값과 시트에서 가져온 값이 다릅니다.',
    input: change(v => {
      v.campaign.destinationUrl =
        'https://example.test/collection?utm_source=newsletter#new';
    }),
    expectedRules: ['LOCAL_UTM_CONSISTENCY'],
  },
  {
    id: 'unsupported',
    name: '미지원 매체',
    description: 'Meta 정책을 검사하지 않았는데 통과라고 표시하지 않습니다.',
    input: change(v => {
      v.platform = 'meta_ads';
    }),
    expectedRules: ['LOCAL_PLATFORM_COVERAGE'],
  },
  {
    id: 'date-error',
    name: '존재하지 않는 날짜',
    description: '2월 30일을 3월로 조용히 보정하지 않습니다.',
    input: change(v => {
      v.campaign.startAt = '2026-02-30T09:00:00+09:00';
    }),
    expectedRules: ['LOCAL_DATE_ORDER'],
  },
  {
    id: 'total-budget',
    name: '총예산 방식',
    description: 'CUSTOM_PERIOD에 맞는 총예산 요청을 생성합니다.',
    input: change(v => {
      v.campaign.budgetPeriod = 'CUSTOM_PERIOD';
      v.campaign.totalBudget = '150000';
      delete v.campaign.dailyBudget;
    }),
    expectedRules: [],
  },
  {
    id: 'invalid-schema',
    name: '잘못된 입력 구조',
    description: '비어 있는 JSON 객체를 통과로 계산하지 않습니다.',
    input: {},
    expectedRules: ['INPUT_SCHEMA'],
  },
];
