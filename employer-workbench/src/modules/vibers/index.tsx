import { useMemo, useState } from 'react';
import { Download, FileSpreadsheet, Play, ShieldCheck } from 'lucide-react';
import {
  downloadCsv,
  downloadJson,
  errorMessage,
  fingerprint,
  formatNumber,
} from '../../shared/utils';
import {
  approveInventory,
  canonicalMapping,
  INVENTORY_FIELDS,
  inventoryReportRows,
  isInventoryApprovalCurrent,
  isInventoryRunCurrent,
  MAX_CSV_BYTES,
  parseInventoryCsv,
  reconcileInventory,
} from './engine';
import type {
  ColumnMapping,
  InventoryApproval,
  InventoryStatus,
  Reconciliation,
} from './engine';
import { VIBERS_SAMPLES, VIBERS_SAMPLE_VERSION } from './fixtures';

const fieldLabels = {
  sku: 'SKU · 상품 식별자',
  region: '지역 · 창고',
  expected_qty: '장부 수량',
  counted_qty: '실사 수량',
  unit_cost: '단가',
  currency: '통화',
};
const statusLabels: Record<InventoryStatus, string> = {
  matched: '일치',
  discrepancy: '수량 차이',
  invalid: '입력 오류',
  duplicate_exact: '동일 중복',
  duplicate_conflict: '충돌 보류',
};
const statusClass = (status: InventoryStatus) =>
  status === 'matched'
    ? 'success'
    : status === 'invalid' || status === 'duplicate_conflict'
      ? 'danger'
      : 'warning';

export default function VibersModule() {
  const [csv, setCsv] = useState(VIBERS_SAMPLES[0].csv);
  const [mapping, setMapping] = useState<ColumnMapping>(() =>
    canonicalMapping(parseInventoryCsv(VIBERS_SAMPLES[0].csv).headers)
  );
  const [sample, setSample] = useState('issues');
  const [inputOrigin, setInputOrigin] = useState<
    'synthetic_fixture' | 'user_file' | 'edited_input'
  >('synthetic_fixture');
  const [run, setRun] = useState<Reconciliation | null>(() =>
    reconcileInventory(csv, mapping)
  );
  const [approval, setApproval] = useState<InventoryApproval | null>(null);
  const [reviewer, setReviewer] = useState('');
  const [filter, setFilter] = useState<InventoryStatus | 'all'>('all');
  const [selectedLine, setSelectedLine] = useState<number | null>(6);
  const [notice, setNotice] = useState('');
  const [page, setPage] = useState(0);
  const parsed = useMemo(() => parseInventoryCsv(csv), [csv]);
  const current = isInventoryRunCurrent(csv, mapping, run);
  const approved = isInventoryApprovalCurrent(csv, mapping, run, approval);
  const marker = useMemo(() => fingerprint({ csv, mapping }), [csv, mapping]);
  const filtered = (run?.rows ?? []).filter(
    row => filter === 'all' || row.status === filter
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / 50));
  const activePage = Math.min(page, pageCount - 1);
  const visibleRows = filtered.slice(activePage * 50, activePage * 50 + 50);
  const selectedRow = run?.rows.find(row => row.sourceLine === selectedLine);
  const loadCsv = (next: string) => {
    setCsv(next);
    setInputOrigin('user_file');
    setMapping(canonicalMapping(parseInventoryCsv(next).headers));
    setApproval(null);
    setNotice('파일을 불러왔습니다. 열 연결을 확인하고 대사를 실행하세요.');
  };
  const execute = () => {
    const next = reconcileInventory(csv, mapping);
    setRun(next);
    setApproval(null);
    setSelectedLine(
      next.rows.find(
        row => row.status === 'invalid' || row.status === 'duplicate_conflict'
      )?.sourceLine ??
        next.rows[0]?.sourceLine ??
        null
    );
    setPage(0);
    setNotice(
      next.errors.length
        ? next.errors.join(' ')
        : `${next.rows.length}행 대사 완료. 유효한 고유 기록 ${next.validUniqueCount}개를 계산했습니다.`
    );
  };
  const exportReceipt = () => {
    if (run && current && !run.errors.length) {
      downloadJson(`vibers-reconciliation-${marker}.json`, {
        product: 'Inventory Reconciliation Desk',
        sampleVersion: VIBERS_SAMPLE_VERSION,
        mode: 'independent_work_sample',
        inputOrigin,
        changeMarker: marker,
        input: { csv, mapping },
        result: run,
        approval: approved ? approval : null,
        limitations: [
          'CSV·연결 정보는 현재 탭 메모리에서만 처리',
          '예시 파일은 합성 데이터',
          '실제 재고 수정이나 외부 시스템 연결 없음',
          '차이 금액은 평가 차이이며 확정 손실 아님',
          '통화별 합계이며 환산 없음',
          '변경 마커는 암호학적 서명이 아님',
        ],
      });
      setNotice('현재 입력과 대사 근거를 JSON으로 내려받았습니다.');
    }
  };
  return (
    <div>
      <div className="module-grid">
        <section className="panel">
          <div className="panel-header">
            <h2>CSV 온보딩</h2>
            <span className="tag neutral">브라우저에서 처리</span>
          </div>
          <div className="panel-body">
            <div className="field">
              <label htmlFor="vibers-sample">예시 시나리오</label>
              <select
                className="select"
                id="vibers-sample"
                value={sample}
                onChange={event => setSample(event.target.value)}
              >
                {VIBERS_SAMPLES.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="toolbar">
              <button
                className="button secondary"
                type="button"
                onClick={() => {
                  const next = VIBERS_SAMPLES.find(
                    item => item.id === sample
                  )!.csv;
                  const nextMapping = canonicalMapping(
                    parseInventoryCsv(next).headers
                  );
                  setCsv(next);
                  setInputOrigin('synthetic_fixture');
                  setMapping(nextMapping);
                  setRun(reconcileInventory(next, nextMapping));
                  setApproval(null);
                  setFilter('all');
                  setPage(0);
                  setSelectedLine(null);
                  setNotice('선택한 합성 예시를 불러왔습니다.');
                }}
              >
                선택한 예시 불러오기
              </button>
            </div>
            <div className="field">
              <label htmlFor="vibers-upload">CSV 파일 업로드</label>
              <input
                className="input"
                id="vibers-upload"
                type="file"
                accept=".csv,text/csv"
                onChange={async event => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  if (file.size > MAX_CSV_BYTES) {
                    setNotice('파일은 2 MB 이하여야 합니다.');
                    event.target.value = '';
                    return;
                  }
                  try {
                    loadCsv(await file.text());
                  } catch (error) {
                    setNotice(errorMessage(error));
                  }
                  event.target.value = '';
                }}
              />
            </div>
            <div className="field">
              <label htmlFor="vibers-csv">CSV 직접 편집</label>
              <textarea
                id="vibers-csv"
                className="textarea mono"
                rows={9}
                value={csv}
                onChange={event => {
                  setCsv(event.target.value);
                  setInputOrigin('edited_input');
                  setApproval(null);
                  setNotice('입력이 변경되었습니다. 대사를 다시 실행하세요.');
                }}
                spellCheck={false}
              />
            </div>
            <p className="form-note">
              SKU와 지역이 같은 행을 비교합니다. 빈 수량을 0으로 바꾸지 않으며
              충돌한 중복 행은 모두 보류합니다. 최대 2 MB · 10,000행 · 128열.
            </p>
            {parsed.error && (
              <p className="issue error" role="alert">
                {parsed.error}
              </p>
            )}
            <details
              open={INVENTORY_FIELDS.some(
                field =>
                  !mapping[field] || !parsed.headers.includes(mapping[field])
              )}
            >
              <summary>CSV 열 연결 확인</summary>
              <div className="field-grid">
                {INVENTORY_FIELDS.map(field => (
                  <div className="field" key={field}>
                    <label htmlFor={`vibers-map-${field}`}>
                      {fieldLabels[field]}
                    </label>
                    <select
                      className="select"
                      id={`vibers-map-${field}`}
                      value={mapping[field]}
                      onChange={event => {
                        setMapping(value => ({
                          ...value,
                          [field]: event.target.value,
                        }));
                        setApproval(null);
                        setNotice(
                          '열 연결이 변경되었습니다. 대사를 다시 실행하세요.'
                        );
                      }}
                    >
                      <option value="">열을 선택하세요</option>
                      {parsed.headers.map(header => (
                        <option value={header} key={header}>
                          {header}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </details>
            <div className="toolbar">
              <button
                className="button primary"
                type="button"
                onClick={execute}
                data-testid="vibers-run"
              >
                <Play size={16} />
                대사 실행
              </button>
              <span className="form-note">입력 {marker}</span>
            </div>
            <p className="form-note">
              업로드한 내용은 서버로 보내거나 브라우저 저장소에 남기지 않습니다.
              새로고침하면 예시로 돌아갑니다.
            </p>
          </div>
        </section>
        <section className="panel">
          <div className="panel-header">
            <h2>대사 결과</h2>
            <span
              className={`tag ${!current ? 'warning' : approved ? 'success' : run?.reviewable ? 'success' : 'warning'}`}
            >
              {!current
                ? '입력 변경 · 재실행 필요'
                : approved
                  ? '검토 완료'
                  : run?.reviewable
                    ? '검토 가능'
                    : '보완 필요'}
            </span>
          </div>
          <div className="panel-body">
            <div className="result-summary">
              <div className="stat">
                <span className="metric-value">
                  {current ? (run?.rows.length ?? 0) : '—'}
                </span>
                <span className="metric-label">CSV 데이터 행</span>
              </div>
              <div className="stat">
                <span className="metric-value">
                  {current ? (run?.validUniqueCount ?? 0) : '—'}
                </span>
                <span className="metric-label">계산한 고유 기록</span>
              </div>
              <div className="stat">
                <span className="metric-value">
                  {current && run?.discrepancyRate != null
                    ? `${formatNumber(run.discrepancyRate * 100, 1)}%`
                    : '—'}
                </span>
                <span className="metric-label">유효 기록 중 수량 차이</span>
              </div>
            </div>
            {!current && (
              <p className="callout">
                입력이나 열 연결이 바뀌어 이전 결과의 검토·내보내기를
                잠갔습니다. 대사를 다시 실행해 주세요.
              </p>
            )}
            {run?.errors.map(error => (
              <p className="issue error" key={error}>
                {error}
              </p>
            ))}
            <div className="mini-bars" aria-label="입력 행의 상태별 개수">
              {Object.entries(statusLabels).map(([status, label]) => (
                <div className="bar-row" key={status}>
                  <span>{label}</span>
                  <div className="bar-track">
                    <div
                      className="bar-fill"
                      style={{
                        width: `${current && run?.rows.length ? (run.counts[status as InventoryStatus] / run.rows.length) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <strong>
                    {current
                      ? (run?.counts[status as InventoryStatus] ?? 0)
                      : '—'}
                  </strong>
                </div>
              ))}
            </div>
            <div className="callout">
              <strong>통화별 차이 금액</strong>
              <p className="form-note">
                |실사 − 장부| × 단가. 오류·중복·충돌 행은 합계에서 제외합니다.
              </p>
              {current &&
              run &&
              Object.keys(run.valueDifferenceByCurrency).length ? (
                Object.entries(run.valueDifferenceByCurrency).map(
                  ([currency, value]) => (
                    <p key={currency}>
                      <strong className="mono">
                        {currency}{' '}
                        {formatNumber(value, currency === 'KRW' ? 0 : 2)}
                      </strong>
                    </p>
                  )
                )
              ) : (
                <p>계산할 유효한 기록이 없습니다.</p>
              )}
              <p className="form-note">
                실현 손실이 아닌 예시 재고 평가 차이이며 통화 간 합산하지
                않습니다.
              </p>
            </div>
            <div className="field">
              <label htmlFor="vibers-reviewer">검토 기록의 작성자</label>
              <input
                className="input"
                id="vibers-reviewer"
                placeholder="검토자 이름"
                value={reviewer}
                onChange={event => setReviewer(event.target.value)}
              />
            </div>
            <div className="toolbar">
              <button
                className="button primary"
                type="button"
                disabled={!current || !run?.reviewable || !reviewer.trim()}
                onClick={() => {
                  if (run) {
                    setApproval(approveInventory(csv, mapping, run, reviewer));
                    setNotice(
                      '현재 파일의 검토 완료를 기록했습니다. 재고 원본은 변경하지 않습니다.'
                    );
                  }
                }}
              >
                <ShieldCheck size={16} />
                현재 대사 검토 완료
              </button>
            </div>
            <div className="toolbar">
              <button
                className="button secondary"
                type="button"
                disabled={
                  !current || !run?.rows.length || Boolean(run.errors.length)
                }
                onClick={() => {
                  if (run)
                    downloadCsv(
                      `vibers-rows-${marker}.csv`,
                      inventoryReportRows(run)
                    );
                }}
              >
                <FileSpreadsheet size={16} />
                행별 결과 CSV
              </button>
              <button
                className="button secondary"
                type="button"
                disabled={
                  !current || !run?.rows.length || Boolean(run.errors.length)
                }
                onClick={exportReceipt}
              >
                <Download size={16} />
                대사 근거 JSON
              </button>
            </div>
            <p className="form-note" role="status" aria-live="polite">
              {notice}
            </p>
          </div>
        </section>
      </div>
      <section className="panel" style={{ marginTop: 20 }}>
        <div className="panel-header">
          <h2>원본을 따라가는 차이 목록</h2>
          <div className="field" style={{ margin: 0 }}>
            <label htmlFor="vibers-filter">상태 필터</label>
            <select
              className="select"
              id="vibers-filter"
              value={filter}
              onChange={event => {
                setFilter(event.target.value as InventoryStatus | 'all');
                setPage(0);
              }}
            >
              <option value="all">전체 상태</option>
              {Object.entries(statusLabels).map(([status, label]) => (
                <option key={status} value={status}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <caption className="form-note">
              {current
                ? '현재 입력의 대사 결과'
                : '이전 입력의 결과 · 재실행 필요'}{' '}
              · 수량 차이 = 실사 − 장부
            </caption>
            <thead>
              <tr>
                <th scope="col">원본 행</th>
                <th scope="col">SKU / 지역</th>
                <th scope="col">장부</th>
                <th scope="col">실사</th>
                <th scope="col">수량 차이</th>
                <th scope="col">상태</th>
                <th scope="col">근거</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map(row => (
                <tr key={row.sourceLine}>
                  <td>{row.sourceLine}</td>
                  <td>
                    <strong>{row.sku || '—'}</strong>
                    <br />
                    <span className="text-muted">{row.region || '—'}</span>
                  </td>
                  <td>
                    {row.expectedQty === null
                      ? '—'
                      : formatNumber(row.expectedQty)}
                  </td>
                  <td>
                    {row.countedQty === null
                      ? '—'
                      : formatNumber(row.countedQty)}
                  </td>
                  <td className="mono">
                    {row.deltaQty === null
                      ? '—'
                      : `${row.deltaQty > 0 ? '+' : ''}${formatNumber(row.deltaQty)}`}
                  </td>
                  <td>
                    <span className={`tag ${statusClass(row.status)}`}>
                      {statusLabels[row.status]}
                    </span>
                  </td>
                  <td>
                    <button
                      className="button ghost"
                      type="button"
                      onClick={() => setSelectedLine(row.sourceLine)}
                      aria-label={`${row.sourceLine}행 근거 보기`}
                    >
                      근거 보기
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!visibleRows.length && (
          <div className="empty-state">해당 상태의 행이 없습니다.</div>
        )}
        {pageCount > 1 && (
          <div className="toolbar" style={{ padding: 16 }}>
            <button
              className="button secondary"
              type="button"
              disabled={activePage === 0}
              onClick={() => setPage(activePage - 1)}
            >
              이전 50행
            </button>
            <span>
              {activePage + 1} / {pageCount}
            </span>
            <button
              className="button secondary"
              type="button"
              disabled={activePage === pageCount - 1}
              onClick={() => setPage(activePage + 1)}
            >
              다음 50행
            </button>
          </div>
        )}
        {selectedRow && (
          <div className="panel-body">
            <div className="callout">
              <strong>
                원본 {selectedRow.sourceLine}행 ·{' '}
                {selectedRow.sku || 'SKU 없음'}
              </strong>
              <p>
                {selectedRow.issues.length
                  ? selectedRow.issues.join(' ')
                  : selectedRow.status === 'matched'
                    ? '장부 수량과 실사 수량이 같습니다.'
                    : `실사 ${selectedRow.countedQty} − 장부 ${selectedRow.expectedQty} = ${selectedRow.deltaQty}.`}
              </p>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th scope="col">CSV 열</th>
                      <th scope="col">원본 값</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(selectedRow.raw).map(([key, value]) => (
                      <tr key={key}>
                        <td>{key}</td>
                        <td className="mono">
                          {value === '' ? '(빈 값)' : value}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
