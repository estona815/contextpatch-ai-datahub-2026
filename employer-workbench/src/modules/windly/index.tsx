import { useMemo, useState, type ChangeEvent } from 'react';
import {
  downloadJson,
  errorMessage,
  usePersistedState,
} from '../../shared/utils';
import {
  applyRepair,
  approvalMatches,
  compareRuleVersions,
  createApproval,
  CURRENT_RULESET,
  LIMITATIONS,
  RULESET_V1,
  RULESET_V2,
  SOURCES,
  suggestRepairs,
  validateAdSpec,
} from './engine.ts';
import type { AdSpecInput, ApprovalSnapshot, Issue, Repair } from './engine.ts';
import { FIXTURES } from './fixtures.ts';

type Tab = 'issues' | 'versions' | 'preview' | 'regression';
type RegressionRow = {
  id: string;
  name: string;
  passed: boolean;
  expected: string[];
  actual: string[];
  status: string;
};
const json = (v: unknown): string => JSON.stringify(v, null, 2);
const display = (v: unknown): string =>
  v == null ? '필드 없음' : typeof v === 'string' ? v : JSON.stringify(v);
const statusLabels = {
  invalid_input: '입력 구조 확인',
  blocked: '오류 수정 필요',
  needs_review: '범위 확인 필요',
  ready_for_local_approval: '로컬 검수 통과',
};
function validApproval(v: unknown): boolean {
  if (v === null) return true;
  if (!v || typeof v !== 'object') return false;
  const r = v as Record<string, unknown>;
  return (
    typeof r.canonicalInput === 'string' &&
    r.canonicalInput.length < 100000 &&
    typeof r.inputFingerprint === 'string' &&
    typeof r.approvedAt === 'string' &&
    [RULESET_V1, RULESET_V2].includes(String(r.ruleSetVersion))
  );
}
function IssueRow({ issue }: { issue: Issue }) {
  const source = SOURCES.find(s => s.id === issue.sourceId);
  return (
    <li className={`issue ${issue.severity === 'error' ? 'error' : 'warning'}`}>
      <div className="toolbar">
        <strong>{issue.message}</strong>
        <span
          className={`tag ${issue.severity === 'error' ? 'danger' : 'warning'}`}
        >
          {issue.severity === 'error' ? '오류' : '검토'}
        </span>
      </div>
      <p className="mono" style={{ overflowWrap: 'anywhere' }}>
        {issue.path}
      </p>
      <p>
        관측값: <code className="inline-code">{display(issue.actual)}</code>
      </p>
      <p className="text-muted">{issue.suggestion}</p>
      <small>
        {issue.sourceKind === 'official_api'
          ? '공식 API 일부 규칙'
          : 'AdSpec 업무 규칙'}{' '}
        · <span className="mono">{issue.ruleId}</span>
        {source && (
          <>
            {' '}
            ·{' '}
            <a href={source.url} target="_blank" rel="noreferrer">
              근거 문서
            </a>
          </>
        )}
      </small>
    </li>
  );
}

export default function WindlyWorkbench() {
  const [raw, setRaw, storageNotice] = usePersistedState<string>(
    'windly-input',
    json(FIXTURES[0].input),
    v => typeof v === 'string' && v.length <= 100000
  );
  const [approval, setApproval, approvalNotice] =
    usePersistedState<ApprovalSnapshot | null>(
      'windly-approval',
      null,
      validApproval
    );
  const [sampleId, setSampleId] = useState(FIXTURES[0].id);
  const [tab, setTab] = useState<Tab>('issues');
  const [notice, setNotice] = useState('');
  const [lastRepair, setLastRepair] = useState<Repair | null>(null);
  const [regression, setRegression] = useState<RegressionRow[] | null>(null);
  const parsed = useMemo((): { value: unknown; error: string } => {
    try {
      if (raw.length > 100000)
        throw new Error('입력은 100KB 이내로 제한됩니다.');
      return { value: JSON.parse(raw) as unknown, error: '' };
    } catch (e) {
      return { value: null, error: errorMessage(e) };
    }
  }, [raw]);
  const report = useMemo(() => validateAdSpec(parsed.value), [parsed.value]);
  const exceedsStructureLimit = report.issues.some(
    issue => issue.ruleId === 'INPUT_LIMIT'
  );
  const formInput = useMemo((): AdSpecInput | null => {
    if (exceedsStructureLimit) return null;
    if (
      !parsed.value ||
      typeof parsed.value !== 'object' ||
      Array.isArray(parsed.value)
    )
      return null;
    const root = parsed.value as Record<string, unknown>;
    const c = root.campaign;
    if (!c || typeof c !== 'object' || Array.isArray(c)) return null;
    const fields = c as Record<string, unknown>;
    if (
      !['name', 'budgetPeriod', 'currency', 'destinationUrl'].every(
        key => typeof fields[key] === 'string'
      )
    )
      return null;
    if (
      ['dailyBudget', 'totalBudget'].some(
        key => fields[key] !== undefined && typeof fields[key] !== 'string'
      )
    )
      return null;
    return parsed.value as AdSpecInput;
  }, [parsed.value, exceedsStructureLimit]);
  const repairs = useMemo(() => suggestRepairs(parsed.value), [parsed.value]);
  const comparison = useMemo(
    () => compareRuleVersions(parsed.value),
    [parsed.value]
  );
  const approved = approvalMatches(parsed.value, approval);
  const sample = FIXTURES.find(f => f.id === sampleId)!;
  const failures = report.issues.filter(i => i.severity === 'error').length;
  const completedChecks = report.checks.filter(
    c => c.result !== 'not_checked'
  ).length;
  const put = (input: unknown): void => {
    setRaw(json(input));
    setNotice('');
  };
  const editCampaign = (
    field: keyof AdSpecInput['campaign'],
    value: string
  ): void => {
    if (!formInput) return;
    const input = structuredClone(formInput);
    if (field === 'dailyBudget' || field === 'totalBudget') {
      if (value === '') delete input.campaign[field];
      else input.campaign[field] = value;
    } else if (field === 'budgetPeriod')
      input.campaign.budgetPeriod =
        value === 'DAILY' ? 'DAILY' : 'CUSTOM_PERIOD';
    else if (field !== 'tracking') input.campaign[field] = value;
    setLastRepair(null);
    put(input);
  };
  const loadSample = (): void => {
    put(sample.input);
    setLastRepair(null);
    setNotice(`“${sample.name}” 합성 예시를 불러왔습니다.`);
  };
  const importFile = async (
    event: ChangeEvent<HTMLInputElement>
  ): Promise<void> => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      if (file.size > 100000)
        throw new Error('100KB 이하 JSON 파일만 가져올 수 있습니다.');
      setRaw(await file.text());
      setLastRepair(null);
      setNotice(`${file.name}을 가져왔습니다. 현재 입력을 자동 검수합니다.`);
    } catch (e) {
      setNotice(errorMessage(e));
    }
    event.target.value = '';
  };
  const fix = (repair: Repair): void => {
    try {
      put(applyRepair(parsed.value, repair.id));
      setLastRepair(repair);
    } catch (e) {
      setNotice(errorMessage(e));
    }
  };
  const exportReport = (): void => {
    if (parsed.error || report.status === 'invalid_input') {
      setNotice('입력 구조를 수정한 뒤 보고서를 저장하세요.');
      return;
    }
    downloadJson('adspec-current-report.json', {
      generatedAt: new Date().toISOString(),
      dataKind: 'user-edited local demonstration',
      input: parsed.value,
      report,
      approval: approved ? approval : null,
      approvalCurrent: approved,
      sources: SOURCES,
      limitations: LIMITATIONS,
    });
    setNotice('현재 입력·규칙·오류·승인 상태를 보고서에 담았습니다.');
  };
  const runRegression = (): void => {
    const rows = FIXTURES.map(f => {
      const result = validateAdSpec(f.input);
      const actual = [...new Set(result.issues.map(i => i.ruleId))].sort();
      const expected = [...f.expectedRules].sort();
      return {
        id: f.id,
        name: f.name,
        passed: JSON.stringify(actual) === JSON.stringify(expected),
        expected,
        actual,
        status: result.status,
      };
    });
    setRegression(rows);
    setTab('regression');
  };
  const setVersion = (value: string): void => {
    if (exceedsStructureLimit) return;
    if (
      parsed.value &&
      typeof parsed.value === 'object' &&
      !Array.isArray(parsed.value)
    )
      put({ ...parsed.value, ruleSetVersion: value });
  };

  return (
    <div data-testid="windly-workbench">
      <div className="callout">
        <strong>설정 오류를 근거와 함께 수정하세요.</strong>
        <p>
          합성 예시를 불러오고 값을 바꾸면 검수 결과가 즉시 갱신됩니다. 광고는
          게시되지 않습니다.
        </p>
      </div>
      <div className="toolbar" style={{ alignItems: 'end', margin: '16px 0' }}>
        <div className="field" style={{ flex: '1 1 210px' }}>
          <label htmlFor="windly-sample">검수 시나리오</label>
          <select
            id="windly-sample"
            className="select"
            value={sampleId}
            onChange={e => setSampleId(e.target.value)}
          >
            {FIXTURES.map(f => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          className="button secondary"
          onClick={loadSample}
          data-testid="windly-load-sample"
        >
          예시 불러오기
        </button>
        <button
          type="button"
          className="button secondary"
          onClick={runRegression}
        >
          회귀 테스트 실행
        </button>
        <button
          type="button"
          className="button primary"
          onClick={exportReport}
          disabled={!!parsed.error || report.status === 'invalid_input'}
          data-testid="windly-export"
        >
          현재 보고서 저장
        </button>
      </div>
      {(notice || storageNotice || approvalNotice) && (
        <p role="status" className="form-note">
          {notice || storageNotice || approvalNotice}
        </p>
      )}
      <div className="module-grid">
        <section className="panel">
          <div className="panel-header">
            <h3>캠페인 명세</h3>
            <span className="tag neutral">로컬 입력</span>
          </div>
          <div className="panel-body">
            <p className="form-note">{sample.description}</p>
            <div className="field">
              <label htmlFor="windly-version">업무 규칙 버전</label>
              <select
                id="windly-version"
                className="select"
                value={report.input?.ruleSetVersion || CURRENT_RULESET}
                onChange={e => setVersion(e.target.value)}
                disabled={!!parsed.error || exceedsStructureLimit}
              >
                <option value={RULESET_V1}>v1 · 출처·매체 추적</option>
                <option value={RULESET_V2}>v2 · 캠페인 추적 추가</option>
              </select>
            </div>
            {formInput && (
              <>
                <div className="field">
                  <label htmlFor="windly-name">캠페인 이름</label>
                  <input
                    id="windly-name"
                    className="input"
                    value={formInput.campaign.name}
                    onChange={e => editCampaign('name', e.target.value)}
                  />
                </div>
                <div className="field-grid">
                  <div className="field">
                    <label htmlFor="windly-period">예산 방식</label>
                    <select
                      id="windly-period"
                      className="select"
                      value={formInput.campaign.budgetPeriod}
                      onChange={e =>
                        editCampaign('budgetPeriod', e.target.value)
                      }
                    >
                      <option value="DAILY">평균 일예산</option>
                      <option value="CUSTOM_PERIOD">기간 총예산</option>
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="windly-currency">캠페인 통화</label>
                    <input
                      id="windly-currency"
                      className="input"
                      value={formInput.campaign.currency}
                      onChange={e => editCampaign('currency', e.target.value)}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="windly-daily">
                      일예산 · 빈 값이면 필드 제거
                    </label>
                    <input
                      id="windly-daily"
                      className="input"
                      inputMode="decimal"
                      value={formInput.campaign.dailyBudget ?? ''}
                      onChange={e =>
                        editCampaign('dailyBudget', e.target.value)
                      }
                      data-testid="windly-budget"
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="windly-total">
                      총예산 · 빈 값이면 필드 제거
                    </label>
                    <input
                      id="windly-total"
                      className="input"
                      inputMode="decimal"
                      value={formInput.campaign.totalBudget ?? ''}
                      onChange={e =>
                        editCampaign('totalBudget', e.target.value)
                      }
                    />
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="windly-url">랜딩 URL</label>
                  <input
                    id="windly-url"
                    className="input"
                    value={formInput.campaign.destinationUrl}
                    onChange={e =>
                      editCampaign('destinationUrl', e.target.value)
                    }
                  />
                </div>
              </>
            )}
            <details
              open={!report.input || !!parsed.error}
              style={{ marginTop: 16 }}
            >
              <summary>전체 JSON 편집 · 계정, 일정, UTM</summary>
              <div className="field" style={{ marginTop: 12 }}>
                <label htmlFor="windly-json">광고 설정 JSON</label>
                <textarea
                  id="windly-json"
                  className="textarea mono"
                  rows={19}
                  spellCheck={false}
                  value={raw}
                  onChange={e => {
                    setRaw(e.target.value);
                    setLastRepair(null);
                    setNotice('');
                  }}
                  data-testid="windly-json"
                />
              </div>
            </details>
            <div className="field" style={{ marginTop: 14 }}>
              <label htmlFor="windly-import">
                JSON 파일 가져오기 · 최대 100KB
              </label>
              <input
                id="windly-import"
                className="input"
                type="file"
                accept=".json,application/json"
                onChange={e => {
                  void importFile(e);
                }}
              />
            </div>
            {parsed.error && (
              <div role="alert" className="issue error">
                <strong>JSON을 읽지 못했습니다.</strong>
                <p>{parsed.error}</p>
                <p>입력 내용을 수정하거나 예시를 다시 불러오세요.</p>
              </div>
            )}
          </div>
        </section>
        <section className="panel">
          <div className="panel-header">
            <h3>검수 결과</h3>
            <span
              className={`tag ${report.status === 'ready_for_local_approval' ? 'success' : 'warning'}`}
              data-testid="windly-status"
            >
              {parsed.error ? 'JSON 오류' : statusLabels[report.status]}
            </span>
          </div>
          <div className="panel-body">
            <div className="result-summary" aria-live="polite">
              <div className="stat">
                <span className="metric-value">{completedChecks}</span>
                <span className="metric-label">검사한 규칙</span>
              </div>
              <div className="stat">
                <span className="metric-value">{failures}</span>
                <span className="metric-label">오류 항목</span>
              </div>
              <div className="stat">
                <span className="metric-value">
                  {report.issues.length - failures}
                </span>
                <span className="metric-label">검토 항목</span>
              </div>
            </div>
            <div
              className="segment-control"
              role="tablist"
              aria-label="광고 검수 결과 보기"
              style={{ margin: '18px 0' }}
            >
              {(['issues', 'versions', 'preview', 'regression'] as Tab[]).map(
                key => (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={tab === key}
                    className={tab === key ? 'active' : ''}
                    onClick={() => setTab(key)}
                  >
                    {
                      {
                        issues: '오류와 수정',
                        versions: '규칙 비교',
                        preview: '요청 미리보기',
                        regression: '회귀 검증',
                      }[key]
                    }
                  </button>
                )
              )}
            </div>
            {tab === 'issues' && (
              <div role="tabpanel">
                {!parsed.error && report.issues.length > 0 && (
                  <ul className="issue-list">
                    {report.issues.map((issue, i) => (
                      <IssueRow
                        key={`${issue.ruleId}-${issue.path}-${i}`}
                        issue={issue}
                      />
                    ))}
                  </ul>
                )}
                {!parsed.error && report.issues.length === 0 && (
                  <div className="issue pass">
                    <strong>현재 로컬 규칙을 통과했습니다.</strong>
                    <p>
                      아래에서 입력 내용을 승인할 수 있습니다. 실제 Google API의
                      접수·심사 결과는 확인하지 않았습니다.
                    </p>
                  </div>
                )}
                {repairs.length > 0 && (
                  <>
                    <h4>변경 내용을 확인하고 적용</h4>
                    {repairs.map(repair => (
                      <div
                        className="check-row"
                        key={repair.id}
                        style={{ display: 'block', padding: '12px 0' }}
                      >
                        <strong>{repair.label}</strong>
                        <p
                          className="mono"
                          style={{ overflowWrap: 'anywhere' }}
                        >
                          {display(repair.before)} → {display(repair.after)}
                        </p>
                        <p className="form-note">{repair.explanation}</p>
                        <button
                          type="button"
                          className="button secondary"
                          onClick={() => fix(repair)}
                          data-testid={`windly-repair-${repair.id}`}
                        >
                          이 변경 적용
                        </button>
                      </div>
                    ))}
                  </>
                )}
                {lastRepair && (
                  <div role="status" className="callout">
                    <strong>적용한 변경</strong>
                    <p className="mono">{lastRepair.path}</p>
                    <p>
                      {display(lastRepair.before)} → {display(lastRepair.after)}
                    </p>
                    <p className="form-note">
                      결과는 수정된 현재 명세로 다시 계산되었습니다.
                    </p>
                  </div>
                )}
              </div>
            )}
            {tab === 'versions' && (
              <div role="tabpanel">
                <p className="form-note">
                  같은 명세를 두 버전으로 검사합니다. v2는 자체 업무 규칙에
                  utm_campaign을 추가합니다.
                </p>
                <div className="split-grid">
                  <div>
                    <strong>v1</strong>
                    <p>{statusLabels[comparison.before.status]}</p>
                    <span className="mono">
                      {comparison.before.issues.length}개 항목
                    </span>
                  </div>
                  <div>
                    <strong>v2</strong>
                    <p>{statusLabels[comparison.after.status]}</p>
                    <span className="mono">
                      {comparison.after.issues.length}개 항목
                    </span>
                  </div>
                </div>
                <h4>새로 발견한 항목 {comparison.introduced.length}개</h4>
                {comparison.introduced.length ? (
                  <ul className="issue-list">
                    {comparison.introduced.map((issue, i) => (
                      <IssueRow key={i} issue={issue} />
                    ))}
                  </ul>
                ) : (
                  <p className="empty-state">
                    두 버전에서 추가로 발견한 항목이 없습니다. ‘규칙 변경 영향’
                    예시로 차이를 확인할 수 있습니다.
                  </p>
                )}
                <button
                  type="button"
                  className="button secondary"
                  disabled={!!parsed.error || report.status === 'invalid_input'}
                  onClick={() =>
                    downloadJson('adspec-rule-comparison.json', {
                      input: parsed.value,
                      comparison,
                      sources: SOURCES,
                      limitations: LIMITATIONS,
                    })
                  }
                >
                  규칙 비교 저장
                </button>
              </div>
            )}
            {tab === 'preview' && (
              <div role="tabpanel">
                <p className="callout">
                  예산 생성 필드만 미리 봅니다.{' '}
                  <strong>실제 API 검증 미수행 · 캠페인 생성 제외</strong>
                </p>
                {report.requestPreview ? (
                  <>
                    <pre
                      className="mono"
                      style={{
                        whiteSpace: 'pre-wrap',
                        overflowWrap: 'anywhere',
                        fontSize: 12,
                      }}
                    >
                      {json(report.requestPreview)}
                    </pre>
                    <p className="form-note">
                      proto 필드 형식 · Google Ads v24 · validate_only=true ·
                      미전송
                    </p>
                  </>
                ) : (
                  <p className="empty-state">
                    Google 예산 범위의 오류를 해결하면 전송되지 않은 요청
                    미리보기가 표시됩니다.
                  </p>
                )}
                {report.normalizedDestination && (
                  <>
                    <h4>UTM이 병합된 URL</h4>
                    <p className="mono" style={{ overflowWrap: 'anywhere' }}>
                      {report.normalizedDestination}
                    </p>
                  </>
                )}
                <details>
                  <summary>검사 범위</summary>
                  <ul>
                    {report.coverage.notChecked.map(item => (
                      <li key={item}>{item}: 미검사</li>
                    ))}
                  </ul>
                </details>
              </div>
            )}
            {tab === 'regression' && (
              <div role="tabpanel">
                <div className="toolbar">
                  <button
                    type="button"
                    className="button secondary"
                    onClick={runRegression}
                  >
                    다시 검사
                  </button>
                  {regression && (
                    <button
                      type="button"
                      className="button ghost"
                      onClick={() =>
                        downloadJson('adspec-regression.json', {
                          ruleSetVersion: CURRENT_RULESET,
                          dataKind: 'synthetic regression fixtures',
                          rows: regression,
                          sources: SOURCES,
                          limitations: LIMITATIONS,
                        })
                      }
                    >
                      회귀 결과 저장
                    </button>
                  )}
                </div>
                {regression ? (
                  <>
                    <p>
                      {regression.filter(r => r.passed).length} /{' '}
                      {regression.length}개 예시에서 기대 오류와 실제 오류가
                      일치합니다.
                    </p>
                    <div className="table-wrap">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>시나리오</th>
                            <th>예상 / 관측 규칙</th>
                            <th>일치</th>
                          </tr>
                        </thead>
                        <tbody>
                          {regression.map(r => (
                            <tr key={r.id}>
                              <td>{r.name}</td>
                              <td
                                className="mono"
                                style={{ overflowWrap: 'anywhere' }}
                              >
                                {r.expected.join(', ') || '오류 없음'}
                                <br />
                                {r.actual.join(', ') || '오류 없음'}
                              </td>
                              <td>
                                <span
                                  className={`tag ${r.passed ? 'success' : 'danger'}`}
                                >
                                  {r.passed ? '일치' : '불일치'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="form-note">
                      합성 입력의 규칙 검증 결과입니다. 실제 광고 계정이나 외부
                      API의 성공률이 아닙니다.
                    </p>
                  </>
                ) : (
                  <p className="empty-state">
                    검사를 실행하면 11개 합성 사례의 기대값과 실제 결과를
                    비교합니다.
                  </p>
                )}
              </div>
            )}
            <div
              style={{
                marginTop: 24,
                paddingTop: 18,
                borderTop: '1px solid var(--border)',
              }}
            >
              <h4>현재 명세 확인</h4>
              <p className="mono" style={{ overflowWrap: 'anywhere' }}>
                {report.inputFingerprint || '유효한 입력 지문 없음'}
              </p>
              <p className="form-note">
                지문은 로컬 변경 표시입니다. 승인 시 전체 입력과 규칙 버전을
                함께 비교합니다.
              </p>
              {approved ? (
                <p className="tag success" data-testid="windly-approval-status">
                  현재 명세 승인됨
                </p>
              ) : approval ? (
                <p className="tag warning" data-testid="windly-approval-status">
                  입력 또는 규칙 변경 · 재승인 필요
                </p>
              ) : (
                <p className="tag neutral" data-testid="windly-approval-status">
                  아직 승인하지 않음
                </p>
              )}
              <div className="toolbar" style={{ marginTop: 12 }}>
                <button
                  type="button"
                  className="button primary"
                  disabled={
                    report.status !== 'ready_for_local_approval' ||
                    approved ||
                    !!parsed.error
                  }
                  data-testid="windly-approve"
                  onClick={() => {
                    try {
                      setApproval(
                        createApproval(parsed.value, new Date().toISOString())
                      );
                      setNotice(
                        '현재 명세를 로컬에서 승인했습니다. 외부로 전송한 내용은 없습니다.'
                      );
                    } catch (e) {
                      setNotice(errorMessage(e));
                    }
                  }}
                >
                  현재 명세 로컬 승인
                </button>
                {approval && (
                  <button
                    type="button"
                    className="button ghost"
                    onClick={() => setApproval(null)}
                  >
                    승인 기록 지우기
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
