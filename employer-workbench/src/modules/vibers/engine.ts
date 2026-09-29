export const INVENTORY_FIELDS = [
  'sku',
  'region',
  'expected_qty',
  'counted_qty',
  'unit_cost',
  'currency',
] as const;
export type InventoryField = (typeof INVENTORY_FIELDS)[number];
export type ColumnMapping = Record<InventoryField, string>;
export type CsvRecord = { line: number; cells: string[] };
export type ParsedCsv = {
  headers: string[];
  records: CsvRecord[];
  error: string | null;
};
export type InventoryStatus =
  | 'matched'
  | 'discrepancy'
  | 'invalid'
  | 'duplicate_exact'
  | 'duplicate_conflict';
export type InventoryRow = {
  sourceLine: number;
  key: string;
  sku: string;
  region: string;
  expectedQty: number | null;
  countedQty: number | null;
  unitCost: number | null;
  currency: string;
  deltaQty: number | null;
  valueDifference: number | null;
  status: InventoryStatus;
  issues: string[];
  raw: Record<string, string>;
};
export type Reconciliation = {
  version: 'inventory-reconciliation-v1';
  inputSnapshot: string;
  evaluatedAt: string;
  mapping: ColumnMapping;
  rows: InventoryRow[];
  errors: string[];
  counts: Record<InventoryStatus, number>;
  validUniqueCount: number;
  discrepancyRate: number | null;
  valueDifferenceByCurrency: Record<string, number>;
  reviewable: boolean;
};
export type InventoryApproval = {
  inputSnapshot: string;
  runTime: string;
  approvedAt: string;
  reviewer: string;
};
export const MAX_CSV_BYTES = 2 * 1024 * 1024;
export const MAX_CSV_RECORDS = 10000;
export const MAX_CSV_COLUMNS = 128;
const statuses: InventoryStatus[] = [
  'matched',
  'discrepancy',
  'invalid',
  'duplicate_exact',
  'duplicate_conflict',
];

export function parseInventoryCsv(input: string): ParsedCsv {
  if (new TextEncoder().encode(input).length > MAX_CSV_BYTES)
    return {
      headers: [],
      records: [],
      error: 'CSV는 2 MB 이하로 입력해 주세요.',
    };
  const source = input.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  const rows: CsvRecord[] = [];
  let cells: string[] = [];
  let cell = '';
  let quoted = false;
  let closed = false;
  let line = 1;
  let rowStart = 1;
  const fail = (reason: string): ParsedCsv => ({
    headers: [],
    records: [],
    error: `${line}행: ${reason}`,
  });
  const pushRow = () => {
    cells.push(cell);
    if (cells.length > 1 || cells[0].trim())
      rows.push({ line: rowStart, cells });
    cells = [];
    cell = '';
    closed = false;
  };
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (quoted) {
      if (char === '"') {
        if (source[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else {
          quoted = false;
          closed = true;
        }
      } else {
        cell += char;
        if (char === '\n') line += 1;
      }
      continue;
    }
    if (char === ',') {
      cells.push(cell);
      if (cells.length >= MAX_CSV_COLUMNS)
        return fail(
          'CSV는 최대 128개 열까지 처리합니다. 필요한 열만 남겨 주세요.'
        );
      cell = '';
      closed = false;
    } else if (char === '\n') {
      pushRow();
      line += 1;
      rowStart = line;
      if (rows.length > MAX_CSV_RECORDS + 1)
        return fail('최대 10,000개 데이터 행까지 처리합니다.');
    } else if (char === '"') {
      if (cell !== '' || closed)
        return fail('따옴표는 셀의 시작에서만 사용할 수 있습니다.');
      quoted = true;
    } else if (closed) {
      if (!/\s/.test(char))
        return fail('닫는 따옴표 뒤에는 쉼표 또는 줄바꿈이 필요합니다.');
    } else cell += char;
  }
  if (quoted) return fail('닫히지 않은 따옴표가 있습니다.');
  if (cell || cells.length || closed) pushRow();
  if (!rows.length)
    return {
      headers: [],
      records: [],
      error: '헤더와 데이터가 있는 CSV를 입력하세요.',
    };
  const headers = rows[0].cells.map(header => header.trim());
  if (headers.some(header => !header))
    return {
      headers,
      records: [],
      error: '이름이 없는 열이 있습니다. 헤더를 수정하세요.',
    };
  if (new Set(headers).size !== headers.length)
    return {
      headers,
      records: [],
      error: '중복된 열 이름이 있습니다. 각 헤더는 고유해야 합니다.',
    };
  if (rows.length - 1 > MAX_CSV_RECORDS)
    return {
      headers,
      records: [],
      error: '최대 10,000개 데이터 행까지 처리합니다.',
    };
  return {
    headers,
    records: rows.slice(1),
    error: rows.length === 1 ? '데이터 행이 없습니다.' : null,
  };
}

export function canonicalMapping(headers: string[]): ColumnMapping {
  return Object.fromEntries(
    INVENTORY_FIELDS.map(field => [field, headers.includes(field) ? field : ''])
  ) as ColumnMapping;
}
export const inventorySnapshot = (csv: string, mapping: ColumnMapping) =>
  JSON.stringify({
    csv,
    mapping: INVENTORY_FIELDS.map(field => [field, mapping[field]]),
  });
function quantity(value: string): number | null {
  if (!/^\d+$/.test(value.trim())) return null;
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= 0 && number <= 1e9
    ? number
    : null;
}
function costMinor(value: string, currency: string): number | null {
  const pattern = currency === 'KRW' ? /^\d+$/ : /^\d+(?:\.\d{1,2})?$/;
  if (!pattern.test(value.trim())) return null;
  const [whole, fraction = ''] = value.trim().split('.');
  const number =
    currency === 'KRW'
      ? Number(whole)
      : Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  return Number.isSafeInteger(number) && number <= 1e11 ? number : null;
}

export function reconcileInventory(
  csv: string,
  mapping: ColumnMapping,
  now = new Date().toISOString()
): Reconciliation {
  const parsed = parseInventoryCsv(csv);
  const errors: string[] = parsed.error ? [parsed.error] : [];
  const mapped = INVENTORY_FIELDS.map(field => mapping[field]);
  for (const field of INVENTORY_FIELDS)
    if (!mapping[field] || !parsed.headers.includes(mapping[field]))
      errors.push(`${field}에 대응하는 CSV 열을 선택하세요.`);
  if (mapped.filter(Boolean).length !== new Set(mapped.filter(Boolean)).size)
    errors.push('하나의 CSV 열을 여러 필드에 동시에 연결할 수 없습니다.');
  const base: Reconciliation = {
    version: 'inventory-reconciliation-v1',
    inputSnapshot: inventorySnapshot(csv, mapping),
    evaluatedAt: now,
    mapping: { ...mapping },
    rows: [],
    errors,
    counts: Object.fromEntries(statuses.map(status => [status, 0])) as Record<
      InventoryStatus,
      number
    >,
    validUniqueCount: 0,
    discrepancyRate: null,
    valueDifferenceByCurrency: {},
    reviewable: false,
  };
  if (errors.length) return base;
  const rows = parsed.records.map(record => {
    const raw = Object.fromEntries(
      parsed.headers.map((header, idx) => [header, record.cells[idx] ?? ''])
    );
    const value = (field: InventoryField) => (raw[mapping[field]] ?? '').trim();
    const sku = value('sku');
    const region = value('region');
    const currency = value('currency');
    const expectedQty = quantity(value('expected_qty'));
    const countedQty = quantity(value('counted_qty'));
    const minor = costMinor(value('unit_cost'), currency);
    const unitCost =
      minor === null ? null : minor / (currency === 'KRW' ? 1 : 100);
    const issues: string[] = [];
    if (record.cells.length !== parsed.headers.length)
      issues.push(
        `열 개수 불일치: 헤더 ${parsed.headers.length}개, 이 행 ${record.cells.length}개`
      );
    if (!sku) issues.push('SKU가 없습니다.');
    if (!region) issues.push('지역/창고가 없습니다.');
    if (expectedQty === null)
      issues.push('장부 수량은 빈 값 없이 0~10억의 정수여야 합니다.');
    if (countedQty === null)
      issues.push('실사 수량은 빈 값 없이 0~10억의 정수여야 합니다.');
    if (!['KRW', 'USD', 'EUR'].includes(currency))
      issues.push('통화는 KRW, USD, EUR 중 하나여야 합니다.');
    if (minor === null)
      issues.push(
        '단가는 0 이상 숫자여야 합니다. KRW는 정수, USD/EUR은 소수 둘째 자리까지 허용합니다.'
      );
    const deltaQty =
      expectedQty !== null && countedQty !== null
        ? countedQty - expectedQty
        : null;
    const differenceMinor =
      deltaQty !== null && minor !== null ? Math.abs(deltaQty) * minor : null;
    if (differenceMinor !== null && !Number.isSafeInteger(differenceMinor))
      issues.push('차이 금액이 안전하게 계산할 수 있는 범위를 넘었습니다.');
    const valid = issues.length === 0;
    return {
      sourceLine: record.line,
      key: JSON.stringify([sku, region]),
      sku,
      region,
      expectedQty,
      countedQty,
      unitCost,
      currency,
      deltaQty: valid ? deltaQty : null,
      valueDifference:
        valid && differenceMinor !== null
          ? differenceMinor / (currency === 'KRW' ? 1 : 100)
          : null,
      status: !valid ? 'invalid' : deltaQty === 0 ? 'matched' : 'discrepancy',
      issues,
      raw,
    } as InventoryRow;
  });
  const groups = new Map<string, InventoryRow[]>();
  for (const row of rows) {
    if (!row.sku || !row.region) continue;
    const group = groups.get(row.key);
    if (group) group.push(row);
    else groups.set(row.key, [row]);
  }
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const signature = (row: InventoryRow) =>
      JSON.stringify([
        row.expectedQty,
        row.countedQty,
        row.unitCost,
        row.currency,
        row.status === 'invalid'
          ? INVENTORY_FIELDS.map(field => row.raw[mapping[field]])
          : null,
      ]);
    const firstSignature = signature(group[0]);
    const hasConflict = group.some(
      row => row.status === 'invalid' || signature(row) !== firstSignature
    );
    if (hasConflict) {
      const shownLines = group
        .slice(0, 20)
        .map(row => row.sourceLine)
        .join(', ');
      const remaining = group.length - Math.min(group.length, 20);
      const conflictReason = `같은 SKU·지역의 ${shownLines}행${remaining ? ` 외 ${remaining}개 행` : ''}이 일치하지 않아 전체 ${group.length}개 행을 보류했습니다.`;
      for (const row of group) {
        if (row.status !== 'invalid') row.status = 'duplicate_conflict';
        row.deltaQty = null;
        row.valueDifference = null;
        row.issues.push(conflictReason);
      }
    } else
      group.slice(1).forEach(row => {
        row.status = 'duplicate_exact';
        row.deltaQty = null;
        row.valueDifference = null;
        row.issues.push(
          `${group[0].sourceLine}행과 완전히 같아 합계에서 제외했습니다.`
        );
      });
  }
  const totalsMinor: Record<string, number> = {};
  for (const row of rows) {
    base.counts[row.status] += 1;
    if (row.status === 'matched' || row.status === 'discrepancy') {
      base.validUniqueCount += 1;
      const factor = row.currency === 'KRW' ? 1 : 100;
      const next =
        (totalsMinor[row.currency] ?? 0) +
        Math.round((row.valueDifference ?? 0) * factor);
      if (!Number.isSafeInteger(next))
        errors.push(`${row.currency} 합계가 안전한 계산 범위를 넘었습니다.`);
      totalsMinor[row.currency] = next;
    }
  }
  base.rows = rows;
  base.discrepancyRate = base.validUniqueCount
    ? base.counts.discrepancy / base.validUniqueCount
    : null;
  base.valueDifferenceByCurrency = errors.length
    ? {}
    : Object.fromEntries(
        Object.entries(totalsMinor).map(([currency, minor]) => [
          currency,
          minor / (currency === 'KRW' ? 1 : 100),
        ])
      );
  base.reviewable =
    rows.length > 0 &&
    errors.length === 0 &&
    base.counts.invalid === 0 &&
    base.counts.duplicate_conflict === 0;
  return base;
}
export const isInventoryRunCurrent = (
  csv: string,
  mapping: ColumnMapping,
  run: Reconciliation | null
) => Boolean(run && run.inputSnapshot === inventorySnapshot(csv, mapping));
export function approveInventory(
  csv: string,
  mapping: ColumnMapping,
  run: Reconciliation,
  reviewer: string,
  now = new Date().toISOString()
): InventoryApproval {
  if (!isInventoryRunCurrent(csv, mapping, run))
    throw new Error('입력이 변경되었습니다. 대사를 다시 실행하세요.');
  if (!run.reviewable || !reconcileInventory(csv, mapping, now).reviewable)
    throw new Error('누락·형식·충돌 오류를 해결한 뒤 검토 완료를 기록하세요.');
  if (!reviewer.trim()) throw new Error('검토자 이름을 입력하세요.');
  return {
    inputSnapshot: inventorySnapshot(csv, mapping),
    runTime: run.evaluatedAt,
    approvedAt: now,
    reviewer: reviewer.trim(),
  };
}
export function isInventoryApprovalCurrent(
  csv: string,
  mapping: ColumnMapping,
  run: Reconciliation | null,
  approval: InventoryApproval | null
) {
  return Boolean(
    run &&
    approval &&
    isInventoryRunCurrent(csv, mapping, run) &&
    approval.inputSnapshot === run.inputSnapshot &&
    approval.runTime === run.evaluatedAt
  );
}
export function inventoryReportRows(
  run: Reconciliation
): Record<string, unknown>[] {
  return run.rows.map(row => ({
    source_line: row.sourceLine,
    sku: row.sku,
    region: row.region,
    expected_qty: row.expectedQty,
    counted_qty: row.countedQty,
    signed_delta_qty: row.deltaQty,
    unit_cost: row.unitCost,
    currency: row.currency,
    absolute_value_difference: row.valueDifference,
    status: row.status,
    reason: row.issues.join(' | '),
    algorithm: run.version,
    evaluated_at: run.evaluatedAt,
  }));
}
export function validMapping(value: unknown): value is ColumnMapping {
  return Boolean(
    value &&
    typeof value === 'object' &&
    INVENTORY_FIELDS.every(
      field =>
        typeof (value as ColumnMapping)[field] === 'string' &&
        (value as ColumnMapping)[field].length < 500
    )
  );
}
