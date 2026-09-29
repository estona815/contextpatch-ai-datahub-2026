/** Deterministic local preflight. No network, provider validation or ad execution. */
export const RULESET_V1 = 'adspec-2026-09-29.1';
export const RULESET_V2 = 'adspec-2026-09-29.2';
export const CURRENT_RULESET = RULESET_V2;
export type RuleSetVersion = typeof RULESET_V1 | typeof RULESET_V2;
export type Severity = 'error' | 'warning' | 'review';
export type SourceKind = 'official_api' | 'local_workflow';
export interface AdSpecInput {
  schemaVersion: '1.0';
  ruleSetVersion: RuleSetVersion;
  id: string;
  platform: string;
  account: { customerId: string; currency: string };
  campaign: {
    name: string;
    budgetPeriod: 'DAILY' | 'CUSTOM_PERIOD';
    dailyBudget?: string;
    totalBudget?: string;
    currency: string;
    startAt: string;
    endAt: string;
    destinationUrl: string;
    tracking: Record<string, string>;
  };
}
export interface Issue {
  ruleId: string;
  severity: Severity;
  path: string;
  message: string;
  actual: unknown;
  suggestion: string;
  sourceKind: SourceKind;
  sourceId?: string;
}
export interface Check {
  ruleId: string;
  title: string;
  result: 'pass' | 'fail' | 'not_checked';
  sourceKind: SourceKind;
  sourceId?: string;
}
export interface PreflightReport {
  schemaVersion: '1.0';
  ruleSetVersion: string;
  inputFingerprint: string | null;
  status:
    | 'invalid_input'
    | 'blocked'
    | 'needs_review'
    | 'ready_for_local_approval';
  issues: Issue[];
  checks: Check[];
  input?: AdSpecInput;
  normalizedDestination?: string;
  requestPreview?: Record<string, unknown>;
  coverage: { checked: string[]; notChecked: string[] };
}
export interface ApprovalSnapshot {
  canonicalInput: string;
  inputFingerprint: string;
  ruleSetVersion: RuleSetVersion;
  approvedAt: string;
}
export interface Repair {
  id: string;
  label: string;
  path: string;
  before: unknown;
  after: unknown;
  explanation: string;
}
export const SOURCES = [
  {
    id: 'W1',
    title: '어베어 AI Product Builder 채용',
    url: 'https://team.windly.cc/34981025-15df-80c0-af67-e6965f2dcf4f',
    checkedAt: '2026-09-29',
    kind: 'employer',
  },
  {
    id: 'W2',
    title: '어베어 Pervis 제품 설명',
    url: 'https://www.pervis.ai/',
    checkedAt: '2026-09-29',
    kind: 'employer',
  },
  {
    id: 'G1',
    title: 'Google Ads API v24 · 예산 요청',
    url: 'https://developers.google.com/google-ads/api/reference/rpc/v24/MutateCampaignBudgetsRequest',
    checkedAt: '2026-09-29',
    kind: 'official_api',
  },
  {
    id: 'G2',
    title: 'Google Ads API v24 · 예산 필드',
    url: 'https://developers.google.com/google-ads/api/reference/rpc/v24/CampaignBudget',
    checkedAt: '2026-09-29',
    kind: 'official_api',
  },
] as const;
export const LIMITATIONS = [
  'Google Ads v24 예산 필드 일부와 명시된 로컬 업무 규칙을 검사합니다.',
  '실제 API 검증·광고 업로드·집행은 수행하지 않습니다. 예산 요청은 전송되지 않은 proto 형식 미리보기입니다.',
  '실제 계정 권한·통화·잔액, 목적별 지원 조건, 소재 심사 정책, URL 접속 가능성, 캠페인 생성은 확인하지 않습니다.',
  'UTM·HTTPS·기간·승인은 AdSpec의 업무 규칙이며 광고 플랫폼 전체의 필수 정책이 아닙니다.',
  '승인은 이 브라우저의 현재 입력을 확인했다는 로컬 기록이며 신원 증명 또는 전자서명이 아닙니다.',
];
const record = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v);
const string = (v: unknown, max = 500): v is string =>
  typeof v === 'string' && v.length > 0 && v.length <= max;
const own = (v: Record<string, unknown>, k: string): boolean =>
  Object.prototype.hasOwnProperty.call(v, k);
const versions: readonly string[] = [RULESET_V1, RULESET_V2];
export const INPUT_LIMITS = {
  maxDepth: 32,
  maxNodes: 10000,
  maxStringLength: 100000,
} as const;

/** Walk iteratively before cloning, canonicalizing, or exposing input in a report. */
function inputStructureProblem(value: unknown): string | null {
  const pending: { value: unknown; depth: number }[] = [{ value, depth: 0 }];
  const visited = new WeakSet<object>();
  let count = 0;
  while (pending.length) {
    const current = pending.pop()!;
    count += 1;
    if (count > INPUT_LIMITS.maxNodes)
      return `입력 노드가 ${INPUT_LIMITS.maxNodes}개를 초과합니다.`;
    if (current.depth > INPUT_LIMITS.maxDepth)
      return `입력 중첩은 ${INPUT_LIMITS.maxDepth}단계 이내여야 합니다.`;
    if (
      typeof current.value === 'string' &&
      current.value.length > INPUT_LIMITS.maxStringLength
    )
      return '입력 문자열이 허용 길이를 초과합니다.';
    if (current.value === null || typeof current.value !== 'object') continue;
    if (visited.has(current.value))
      return '순환하거나 같은 객체를 재참조하는 입력은 JSON 명세로 처리할 수 없습니다.';
    visited.add(current.value);
    const entries = Object.entries(current.value);
    if (entries.length + pending.length + count > INPUT_LIMITS.maxNodes)
      return `입력 노드가 ${INPUT_LIMITS.maxNodes}개를 초과합니다.`;
    for (const [key, child] of entries) {
      if (key.length > 1000) return '입력 필드 이름이 허용 길이를 초과합니다.';
      pending.push({ value: child, depth: current.depth + 1 });
    }
  }
  return null;
}
/** Observations are bounded, shallow JSON values, never caller-owned recursive data. */
function summarizeActual(value: unknown): unknown {
  const scalar = (v: unknown): unknown => {
    if (v == null) return null;
    if (typeof v === 'string')
      return v.length > 240 ? `${v.slice(0, 240)}…` : v;
    if (typeof v === 'number') return Number.isFinite(v) ? v : String(v);
    if (typeof v === 'boolean') return v;
    if (typeof v === 'bigint') return `${String(v).slice(0, 240)}n`;
    if (Array.isArray(v)) return `[배열: ${v.length}개 항목]`;
    return typeof v === 'object' ? '[중첩 객체]' : `[${typeof v}]`;
  };
  if (!record(value)) return scalar(value);
  const entries = Object.entries(value);
  const summary: Record<string, unknown> = Object.fromEntries(
    entries.slice(0, 6).map(([key, item]) => [key.slice(0, 80), scalar(item)])
  );
  if (entries.length > 6) summary['추가 필드 수'] = entries.length - 6;
  return summary;
}

export function stableJson(value: unknown): string {
  if (value === null || typeof value !== 'object')
    return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  return `{${Object.keys(value)
    .sort()
    .map(
      k =>
        `${JSON.stringify(k)}:${stableJson((value as Record<string, unknown>)[k])}`
    )
    .join(',')}}`;
}
/** A display change marker. Approval validity also compares the complete canonical input. */
export function inputFingerprint(input: unknown): string {
  const text = stableJson(input);
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1)
    hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  return `local-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}
export function decimalToMicros(
  value: string
): { ok: true; micros: string } | { ok: false; error: string } {
  if (!/^\d{1,20}(?:\.\d{1,6})?$/.test(value))
    return {
      ok: false,
      error:
        '소수점 이하 6자리 이내의 양수 십진 문자열을 입력하세요. 지수·기호·공백은 허용하지 않습니다.',
    };
  const [whole, fraction = ''] = value.split('.');
  const micros = BigInt(whole) * 1000000n + BigInt(fraction.padEnd(6, '0'));
  if (micros <= 0n)
    return { ok: false, error: '로컬 예산 검수 규칙상 0보다 커야 합니다.' };
  if (micros > 9223372036854775807n)
    return { ok: false, error: 'Google int64 예산 필드의 범위를 초과합니다.' };
  return { ok: true, micros: micros.toString() };
}
function dateTime(value: string): number | null {
  const m =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/.exec(
      value
    );
  if (!m) return null;
  const [y, month, day, hour, minute, second] = m.slice(1, 7).map(Number);
  const leap = y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (
    y < 1000 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > days[month - 1] ||
    hour > 23 ||
    minute > 59 ||
    second > 59
  )
    return null;
  if (m[7] !== 'Z') {
    const [h, min] = m[7].slice(1).split(':').map(Number);
    if (h > 14 || min > 59 || (h === 14 && min !== 0)) return null;
  }
  const n = Date.parse(value);
  return Number.isFinite(n) ? n : null;
}

export function validateAdSpec(raw: unknown): PreflightReport {
  const issues: Issue[] = [];
  const checks: Check[] = [];
  const report: PreflightReport = {
    schemaVersion: '1.0',
    ruleSetVersion:
      record(raw) && typeof raw.ruleSetVersion === 'string'
        ? raw.ruleSetVersion
        : 'unknown',
    inputFingerprint: null,
    status: 'invalid_input',
    issues,
    checks,
    coverage: {
      checked: [],
      notChecked: [
        '실제 API 응답 및 권한',
        '계정 설정·잔액',
        '소재 및 광고 내용 심사',
        '목적별 캠페인 정책·생성',
        '랜딩 페이지 접속',
      ],
    },
  };
  const add = (
    ruleId: string,
    severity: Severity,
    path: string,
    message: string,
    actual: unknown,
    suggestion: string,
    sourceKind: SourceKind = 'local_workflow',
    sourceId?: string
  ): void => {
    issues.push({
      ruleId,
      severity,
      path,
      message,
      actual: summarizeActual(actual),
      suggestion,
      sourceKind,
      ...(sourceId ? { sourceId } : {}),
    });
  };
  const schema = (path: string, message: string, value: unknown): void =>
    add(
      'INPUT_SCHEMA',
      'error',
      path,
      message,
      value ?? null,
      '예시 JSON의 필드와 자료형을 확인하세요.'
    );
  const keys = (
    obj: Record<string, unknown>,
    allowed: string[],
    path: string
  ): void => {
    for (const key of Object.keys(obj))
      if (!allowed.includes(key))
        schema(
          `${path}/${key}`,
          '지원하지 않는 필드입니다. 검사하지 않은 설정을 승인할 수 없습니다.',
          obj[key]
        );
  };
  const structureProblem = inputStructureProblem(raw);
  if (structureProblem) {
    add(
      'INPUT_LIMIT',
      'error',
      '/',
      structureProblem,
      {
        inputType: Array.isArray(raw) ? 'array' : typeof raw,
        maxDepth: INPUT_LIMITS.maxDepth,
        maxNodes: INPUT_LIMITS.maxNodes,
      },
      '중첩·반복 데이터를 제거하거나 지원하는 캠페인 명세 예시를 불러오세요.'
    );
    return report;
  }
  if (!record(raw)) {
    schema('/', '최상위 입력은 JSON 객체여야 합니다.', raw);
    return report;
  }
  keys(
    raw,
    [
      'schemaVersion',
      'ruleSetVersion',
      'id',
      'platform',
      'account',
      'campaign',
    ],
    ''
  );
  if (raw.schemaVersion !== '1.0')
    schema(
      '/schemaVersion',
      '지원하는 schemaVersion은 1.0입니다.',
      raw.schemaVersion
    );
  if (
    typeof raw.ruleSetVersion !== 'string' ||
    !versions.includes(raw.ruleSetVersion)
  )
    schema(
      '/ruleSetVersion',
      '지원하지 않는 규칙 버전입니다.',
      raw.ruleSetVersion
    );
  for (const k of ['id', 'platform'])
    if (!string(raw[k], 100))
      schema(`/${k}`, '1~100자의 문자열이 필요합니다.', raw[k]);
  if (!record(raw.account))
    schema('/account', '계정 객체가 필요합니다.', raw.account);
  else {
    keys(raw.account, ['customerId', 'currency'], '/account');
    for (const k of ['customerId', 'currency'])
      if (!string(raw.account[k], 100))
        schema(
          `/account/${k}`,
          '빈 값이 아닌 문자열이 필요합니다.',
          raw.account[k]
        );
  }
  if (!record(raw.campaign))
    schema('/campaign', '캠페인 객체가 필요합니다.', raw.campaign);
  else {
    const c = raw.campaign;
    keys(
      c,
      [
        'name',
        'budgetPeriod',
        'dailyBudget',
        'totalBudget',
        'currency',
        'startAt',
        'endAt',
        'destinationUrl',
        'tracking',
      ],
      '/campaign'
    );
    for (const k of ['name', 'currency', 'startAt', 'endAt', 'destinationUrl'])
      if (!string(c[k], k === 'destinationUrl' ? 4096 : 500))
        schema(`/campaign/${k}`, '빈 값이 아닌 문자열이 필요합니다.', c[k]);
    if (c.budgetPeriod !== 'DAILY' && c.budgetPeriod !== 'CUSTOM_PERIOD')
      schema(
        '/campaign/budgetPeriod',
        'DAILY 또는 CUSTOM_PERIOD를 선택하세요.',
        c.budgetPeriod
      );
    for (const k of ['dailyBudget', 'totalBudget'])
      if (own(c, k) && !string(c[k], 40))
        schema(
          `/campaign/${k}`,
          '예산은 숫자가 아닌 정확한 십진 문자열이어야 합니다.',
          c[k]
        );
    if (!record(c.tracking))
      schema(
        '/campaign/tracking',
        '추적 파라미터 객체가 필요합니다.',
        c.tracking
      );
    else {
      if (Object.keys(c.tracking).length > 20)
        schema(
          '/campaign/tracking',
          '최대 20개의 추적 필드만 허용합니다.',
          Object.keys(c.tracking).length
        );
      for (const [key, value] of Object.entries(c.tracking))
        if (
          !/^utm_[a-z_]{1,32}$/.test(key) ||
          typeof value !== 'string' ||
          value.length > 500
        )
          schema(
            `/campaign/tracking/${key}`,
            'utm_ 키와 500자 이하 문자열이 필요합니다.',
            value
          );
    }
  }
  if (issues.length) return report;
  const input = structuredClone(raw) as unknown as AdSpecInput;
  const c = input.campaign;
  report.input = input;
  report.inputFingerprint = inputFingerprint(input);
  const check = (
    ruleId: string,
    title: string,
    fn: () => void,
    kind: SourceKind = 'local_workflow',
    sourceId?: string
  ): void => {
    const before = issues.length;
    fn();
    checks.push({
      ruleId,
      title,
      result: issues.length > before ? 'fail' : 'pass',
      sourceKind: kind,
      ...(sourceId ? { sourceId } : {}),
    });
  };
  const google = input.platform === 'google_ads';
  check('LOCAL_PLATFORM_COVERAGE', '지원 매체 범위', () => {
    if (!google)
      add(
        'LOCAL_PLATFORM_COVERAGE',
        'review',
        '/platform',
        '이 매체의 API 검증 규칙은 구현되지 않았습니다.',
        input.platform,
        'Google 예산 범위로 검사하거나 해당 매체 규칙을 별도로 검토하세요.'
      );
  });
  if (google) {
    check('GOOGLE_CUSTOMER_ID', 'Google 고객 ID 형식', () => {
      if (!/^\d{10}$/.test(input.account.customerId))
        add(
          'GOOGLE_CUSTOMER_ID',
          'error',
          '/account/customerId',
          '요청 미리보기에는 구분기호 없는 10자리 고객 ID를 사용합니다.',
          input.account.customerId,
          '이 데모의 고객 ID 형식은 1234567890입니다. 실제 소유권은 확인하지 않습니다.'
        );
    });
    check(
      'GOOGLE_BUDGET_NAME',
      '예산 이름 UTF-8 길이',
      () => {
        const bytes = new TextEncoder().encode(c.name.trim()).length;
        if (bytes < 1 || bytes > 255)
          add(
            'GOOGLE_BUDGET_NAME',
            'error',
            '/campaign/name',
            'trim 후 예산 이름은 UTF-8 기준 1~255바이트여야 합니다.',
            { value: c.name, bytes },
            '이름을 줄이세요. 한글 글자 수와 UTF-8 바이트 수는 다릅니다.',
            'official_api',
            'G2'
          );
      },
      'official_api',
      'G2'
    );
    check(
      'GOOGLE_BUDGET_EXCLUSIVE',
      '일예산·총예산 분리',
      () => {
        if (c.dailyBudget !== undefined && c.totalBudget !== undefined)
          add(
            'GOOGLE_BUDGET_EXCLUSIVE',
            'error',
            '/campaign',
            '일예산과 총예산을 동시에 지정할 수 없습니다.',
            { dailyBudget: c.dailyBudget, totalBudget: c.totalBudget },
            '사용할 예산 기간을 결정하고 다른 예산 필드를 직접 제거하세요.',
            'official_api',
            'G2'
          );
      },
      'official_api',
      'G2'
    );
    check(
      'GOOGLE_BUDGET_PERIOD',
      '예산 기간과 금액 필드',
      () => {
        const field =
          c.budgetPeriod === 'DAILY' ? 'dailyBudget' : 'totalBudget';
        if (c[field] === undefined)
          add(
            'GOOGLE_BUDGET_PERIOD',
            'error',
            `/campaign/${field}`,
            '선택한 기간에 대응하는 예산이 없습니다.',
            c.budgetPeriod,
            `${field}를 입력하세요.`,
            'official_api',
            'G2'
          );
      },
      'official_api',
      'G2'
    );
  } else
    checks.push({
      ruleId: 'GOOGLE_BUDGET_EXCLUSIVE',
      title: 'Google API 예산 규칙',
      result: 'not_checked',
      sourceKind: 'official_api',
      sourceId: 'G2',
    });
  const amounts: Record<string, string> = {};
  check('LOCAL_EXACT_BUDGET', '예산 정밀도·범위', () => {
    for (const field of ['dailyBudget', 'totalBudget'] as const)
      if (c[field] !== undefined) {
        const conversion = decimalToMicros(c[field]);
        if (!conversion.ok)
          add(
            'LOCAL_EXACT_BUDGET',
            'error',
            `/campaign/${field}`,
            conversion.error,
            c[field],
            '0보다 큰 십진 문자열로 수정하세요. 금액은 자동 보정하지 않습니다.'
          );
        else amounts[field] = conversion.micros;
      }
  });
  check('LOCAL_ACCOUNT_CURRENCY', '계정·캠페인 통화 일치', () => {
    if (
      !/^[A-Z]{3}$/.test(input.account.currency) ||
      !/^[A-Z]{3}$/.test(c.currency) ||
      input.account.currency !== c.currency
    )
      add(
        'LOCAL_ACCOUNT_CURRENCY',
        'error',
        '/campaign/currency',
        '대문자 3자리 통화 코드와 계정 통화가 일치해야 합니다.',
        { account: input.account.currency, campaign: c.currency },
        '통화를 확인해 직접 수정하세요. 자동 환산은 하지 않습니다.'
      );
  });
  check('LOCAL_DATE_ORDER', '시간대가 포함된 집행 기간', () => {
    const start = dateTime(c.startAt);
    const end = dateTime(c.endAt);
    if (start === null)
      add(
        'LOCAL_DATE_ORDER',
        'error',
        '/campaign/startAt',
        '실제 달력 날짜와 시간대가 포함된 ISO 일시가 필요합니다.',
        c.startAt,
        '예: 2026-10-01T09:00:00+09:00'
      );
    if (end === null)
      add(
        'LOCAL_DATE_ORDER',
        'error',
        '/campaign/endAt',
        '실제 달력 날짜와 시간대가 포함된 ISO 일시가 필요합니다.',
        c.endAt,
        '예: 2026-10-07T23:59:00+09:00'
      );
    if (start !== null && end !== null && end <= start)
      add(
        'LOCAL_DATE_ORDER',
        'error',
        '/campaign/endAt',
        '종료 시각이 시작 시각보다 늦어야 합니다.',
        c.endAt,
        '시간대를 포함해 실제 선후관계를 확인하세요.'
      );
  });
  let destination: URL | null = null;
  check('LOCAL_URL_HTTPS', '랜딩 URL 업무 규칙', () => {
    try {
      destination = new URL(c.destinationUrl);
      if (
        destination.protocol !== 'https:' ||
        !destination.hostname ||
        destination.username ||
        destination.password
      )
        add(
          'LOCAL_URL_HTTPS',
          'error',
          '/campaign/destinationUrl',
          '이 검수 흐름은 사용자 정보 없는 HTTPS 절대 URL을 요구합니다.',
          c.destinationUrl,
          'https://로 시작하는 URL을 직접 확인하세요.'
        );
    } catch {
      add(
        'LOCAL_URL_HTTPS',
        'error',
        '/campaign/destinationUrl',
        '올바른 절대 URL이 아닙니다.',
        c.destinationUrl,
        '호스트를 확인한 뒤 https://를 붙이세요.'
      );
    }
  });
  check('LOCAL_UTM_CONSISTENCY', '기존 UTM과 입력값 충돌', () => {
    if (!destination) return;
    for (const key of new Set([
      ...destination.searchParams.keys(),
      ...Object.keys(c.tracking),
    ])) {
      if (!key.startsWith('utm_')) continue;
      const values = destination.searchParams.getAll(key);
      if (values.length > 1)
        add(
          'LOCAL_UTM_CONSISTENCY',
          new Set(values).size > 1 ? 'error' : 'warning',
          '/campaign/destinationUrl',
          '같은 추적 키가 URL에 여러 번 들어 있습니다.',
          { key, values },
          'URL에서 중복 키를 직접 정리하세요.'
        );
      if (
        values.length &&
        own(c.tracking, key) &&
        c.tracking[key] !== values[0]
      )
        add(
          'LOCAL_UTM_CONSISTENCY',
          'error',
          `/campaign/tracking/${key}`,
          'URL의 추적값과 별도 입력값이 충돌합니다.',
          { url: values[0], input: c.tracking[key] },
          '사용할 값을 결정하세요. 기존 값을 자동으로 덮어쓰지 않습니다.'
        );
    }
  });
  const required =
    input.ruleSetVersion === RULESET_V2
      ? ['utm_source', 'utm_medium', 'utm_campaign']
      : ['utm_source', 'utm_medium'];
  check('LOCAL_UTM_REQUIRED', '규칙 버전별 추적 필수값', () => {
    for (const key of required) {
      const value =
        c.tracking[key] || (destination as URL | null)?.searchParams.get(key);
      if (!value?.trim())
        add(
          'LOCAL_UTM_REQUIRED',
          'error',
          `/campaign/tracking/${key}`,
          `현재 규칙에서 ${key}가 필요합니다.`,
          value ?? null,
          '해당 값을 입력하거나 제안한 변경을 검토해 적용하세요.'
        );
    }
  });
  const parsedUrl = destination as URL | null;
  if (
    parsedUrl &&
    !issues.some(
      i =>
        i.ruleId === 'LOCAL_URL_HTTPS' || i.ruleId === 'LOCAL_UTM_CONSISTENCY'
    )
  ) {
    for (const [key, value] of Object.entries(c.tracking))
      if (!parsedUrl.searchParams.has(key))
        parsedUrl.searchParams.append(key, value);
    report.normalizedDestination = parsedUrl.href;
  }
  if (issues.some(i => i.severity === 'error')) report.status = 'blocked';
  else if (issues.length) report.status = 'needs_review';
  else report.status = 'ready_for_local_approval';
  report.coverage.checked = checks
    .filter(x => x.result !== 'not_checked')
    .map(x => x.title);
  if (!google)
    report.coverage.notChecked.unshift(`${input.platform}의 API 필드 및 정책`);
  if (google && !issues.some(i => i.severity === 'error')) {
    const create: Record<string, unknown> = {
      name: c.name,
      period: c.budgetPeriod,
      explicitly_shared: false,
    };
    create[
      c.budgetPeriod === 'DAILY' ? 'amount_micros' : 'total_amount_micros'
    ] = amounts[c.budgetPeriod === 'DAILY' ? 'dailyBudget' : 'totalBudget'];
    report.requestPreview = {
      customer_id: input.account.customerId,
      operations: [{ create }],
      validate_only: true,
      partial_failure: false,
    };
  }
  return report;
}

export function createApproval(
  raw: unknown,
  approvedAt: string
): ApprovalSnapshot {
  const report = validateAdSpec(raw);
  if (
    report.status !== 'ready_for_local_approval' ||
    !report.input ||
    !report.inputFingerprint
  )
    throw new Error(
      '모든 로컬 검수 항목을 통과한 현재 입력만 승인할 수 있습니다.'
    );
  if (dateTime(approvedAt) === null)
    throw new Error('승인 일시가 올바르지 않습니다.');
  return {
    canonicalInput: stableJson(report.input),
    inputFingerprint: report.inputFingerprint,
    ruleSetVersion: report.input.ruleSetVersion,
    approvedAt,
  };
}
export function approvalMatches(
  raw: unknown,
  approval: unknown
): approval is ApprovalSnapshot {
  if (
    !record(approval) ||
    !string(approval.canonicalInput, 100000) ||
    !string(approval.inputFingerprint) ||
    !string(approval.approvedAt) ||
    dateTime(approval.approvedAt) === null
  )
    return false;
  const report = validateAdSpec(raw);
  return (
    report.status === 'ready_for_local_approval' &&
    !!report.input &&
    report.input.ruleSetVersion === approval.ruleSetVersion &&
    report.inputFingerprint === approval.inputFingerprint &&
    stableJson(report.input) === approval.canonicalInput
  );
}
export function suggestRepairs(raw: unknown): Repair[] {
  const report = validateAdSpec(raw);
  if (!report.input) return [];
  const input = report.input;
  const c = input.campaign;
  const out: Repair[] = [];
  if (
    report.issues.some(i => i.ruleId === 'LOCAL_URL_HTTPS') &&
    !c.destinationUrl.includes('://')
  ) {
    try {
      const u = new URL(`https://${c.destinationUrl}`);
      if (u.hostname.includes('.') && !u.username && !u.password)
        out.push({
          id: 'url_https',
          label: 'HTTPS 주소 적용',
          path: '/campaign/destinationUrl',
          before: c.destinationUrl,
          after: u.href,
          explanation:
            '호스트가 맞는지 확인한 뒤 적용하세요. 접속 여부는 검사하지 않았습니다.',
        });
    } catch {
      /* no speculative repair */
    }
  }
  for (const issue of report.issues.filter(
    i => i.ruleId === 'LOCAL_UTM_REQUIRED'
  )) {
    const key = issue.path.split('/').slice(-1)[0];
    const after =
      key === 'utm_campaign'
        ? input.id
        : key === 'utm_source'
          ? 'google'
          : 'cpc';
    if (input.platform === 'google_ads')
      out.push({
        id: key,
        label: `${key} 제안 적용`,
        path: issue.path,
        before: c.tracking[key] ?? null,
        after,
        explanation:
          '이 값은 AdSpec의 제안입니다. 사용 중인 분석 규칙에 맞는지 확인하세요.',
      });
  }
  if (c.dailyBudget !== undefined && c.totalBudget !== undefined) {
    const remove = c.budgetPeriod === 'DAILY' ? 'totalBudget' : 'dailyBudget';
    out.push({
      id: 'budget_exclusive',
      label:
        c.budgetPeriod === 'DAILY'
          ? '일예산 유지 · 총예산 제거'
          : '총예산 유지 · 일예산 제거',
      path: `/campaign/${remove}`,
      before: c[remove],
      after: null,
      explanation:
        '예산 방식 선택이 필요합니다. 선택한 기간을 유지하고 표시된 필드만 제거합니다.',
    });
  }
  return out;
}
export function applyRepair(raw: unknown, repairId: string): AdSpecInput {
  const report = validateAdSpec(raw);
  if (!report.input) throw new Error('입력 구조를 먼저 수정하세요.');
  const repair = suggestRepairs(raw).find(r => r.id === repairId);
  if (!repair) throw new Error('이 입력에 적용할 수 없는 수정입니다.');
  const input = structuredClone(report.input);
  if (repair.id === 'url_https')
    input.campaign.destinationUrl = String(repair.after);
  else if (repair.id === 'budget_exclusive') {
    if (input.campaign.budgetPeriod === 'DAILY')
      delete input.campaign.totalBudget;
    else delete input.campaign.dailyBudget;
  } else if (repair.id.startsWith('utm_'))
    input.campaign.tracking[repair.id] = String(repair.after);
  return input;
}
export function compareRuleVersions(raw: unknown): {
  before: PreflightReport;
  after: PreflightReport;
  introduced: Issue[];
  resolved: Issue[];
} {
  const withVersion = (version: RuleSetVersion): unknown =>
    record(raw) ? { ...raw, ruleSetVersion: version } : raw;
  const before = validateAdSpec(withVersion(RULESET_V1));
  const after = validateAdSpec(withVersion(RULESET_V2));
  const key = (i: Issue): string => `${i.ruleId}:${i.path}:${i.message}`;
  const old = new Set(before.issues.map(key));
  const next = new Set(after.issues.map(key));
  return {
    before,
    after,
    introduced: after.issues.filter(i => !old.has(key(i))),
    resolved: before.issues.filter(i => !next.has(key(i))),
  };
}
