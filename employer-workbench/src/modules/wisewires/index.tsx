import { useState } from 'react';
import { ArrowRight, Download, Play, RotateCcw } from 'lucide-react';
import {
  downloadJson,
  downloadText,
  formatNumber,
  usePersistedState,
} from '../../shared/utils';
import {
  fixSuggestion,
  isLabInputs,
  issueMarkdown,
  makeIssueReport,
  RULES,
  runScenario,
  SCENARIO_IDS,
  validateParams,
} from './engine';
import type { LabInputs, ScenarioId, TestResult, Variant } from './engine';
import { DEFAULT_INPUTS, SCENARIOS } from './fixtures';

type Comparison = { buggy: TestResult; fixed: TestResult };
const display = (value: unknown) =>
  typeof value === 'boolean'
    ? value
      ? '예'
      : '아니오'
    : typeof value === 'string'
      ? value
      : JSON.stringify(value);

export default function WisewiresModule() {
  const [inputs, setInputs, storageNotice] = usePersistedState<LabInputs>(
    'wisewires-inputs',
    DEFAULT_INPUTS,
    isLabInputs
  );
  const [selected, setSelected] = useState<ScenarioId>('discount');
  const [variant, setVariant] = useState<Variant>('buggy');
  const [runs, setRuns] = useState<Partial<Record<ScenarioId, Comparison>>>({});
  const [severity, setSeverity] = useState('높음');
  const [notice, setNotice] = useState('');
  const definition = SCENARIOS.find(s => s.id === selected)!;
  const params = inputs[selected];
  const errors = validateParams(selected, params);
  const comparison = runs[selected];
  const current = comparison?.[variant];
  const completed = Object.values(runs).filter(Boolean) as Comparison[];
  const buggyFailures = completed.filter(
    pair => pair.buggy.passed === false
  ).length;
  const fixedPasses = completed.filter(
    pair => pair.fixed.passed === true
  ).length;
  const totalCases = completed.length;

  function select(id: ScenarioId) {
    setSelected(id);
    setSeverity(SCENARIOS.find(s => s.id === id)!.severity);
    setNotice('');
  }
  function update(key: string, value: number | string | boolean) {
    setInputs(previous => ({
      ...previous,
      [selected]: { ...previous[selected], [key]: value },
    }));
    setRuns({});
    setNotice(
      '입력이 바뀌어 이전 검증 결과를 비웠습니다. 같은 조건으로 다시 실행하세요.'
    );
  }
  function execute(all = false) {
    const next = all
      ? ({} as Partial<Record<ScenarioId, Comparison>>)
      : { ...runs };
    for (const id of all ? SCENARIO_IDS : [selected])
      next[id] = {
        buggy: runScenario(id, inputs[id], 'buggy'),
        fixed: runScenario(id, inputs[id], 'fixed'),
      };
    setRuns(next);
    setNotice(
      all
        ? '6개 시나리오의 현재 입력을 검사했습니다. 유효한 입력은 두 구현에서 비교했습니다.'
        : '현재 입력을 검사했습니다. 유효한 입력은 같은 검증 규칙으로 두 구현을 비교했습니다.'
    );
  }
  function resetCurrent() {
    setInputs(previous => ({
      ...previous,
      [selected]: structuredClone(DEFAULT_INPUTS[selected]),
    }));
    setRuns({});
    setNotice('선택한 시나리오를 결함이 재현되는 기본 입력으로 복원했습니다.');
  }
  function exportIssue(kind: 'md' | 'json') {
    if (!comparison || comparison.buggy.passed !== false) return;
    const report = {
      ...makeIssueReport(comparison.buggy, severity),
      regression: {
        variant: 'fixed',
        passed: comparison.fixed.passed,
        result: comparison.fixed,
      },
      suggestedStatus: comparison.fixed.passed ? 'FIX_VERIFIED' : 'REPRODUCED',
    };
    if (kind === 'json')
      downloadJson(`wisewires-${selected}-issue.json`, report);
    else
      downloadText(
        `wisewires-${selected}-issue.md`,
        `${issueMarkdown(report)}\n\n## 수정 버전 회귀 확인\n\n- 같은 입력의 수정 버전: ${comparison.fixed.passed ? 'PASS' : 'FAIL'}\n- 상태: ${report.suggestedStatus}\n\n\`\`\`json\n${JSON.stringify(comparison.fixed.assertions, null, 2)}\n\`\`\``,
        'text/markdown;charset=utf-8'
      );
  }
  function exportSuite() {
    if (!completed.length) return;
    downloadJson('wisewires-regression-run.json', {
      schemaVersion: 'wisewires-suite-v1',
      sourceVersion: '2026-09-29 / WiseWires SQA 50025872',
      scope:
        '의도된 샘플 결함을 로컬 함수로 재현한 지원용 실습. 실제 회사 서비스의 결함이 아닙니다.',
      currentInputs: inputs,
      results: runs,
      summary: {
        executedCases: totalCases,
        intentionallyBuggyFailures: buggyFailures,
        fixedPasses,
      },
      limitations: [
        '현재 입력과 등록된 규칙만 검사',
        '실제 결제·외부 네트워크·분산 동시성 검증 없음',
      ],
    });
  }
  const state = current?.observed?.state;

  return (
    <div className="module-grid">
      <section className="panel full-width">
        <div className="panel-body">
          <div className="callout">
            <strong>직접 만든 결함을, 실행해서 재현합니다.</strong>
            <p>
              가상의 주문·쿠폰·검색 화면입니다. 입력을 바꾸고 두 구현을 비교하면
              결함이 나타나는 조건과 사라지는 조건을 확인할 수 있습니다. 실제
              서비스나 고객 데이터와 연결되지 않습니다.
            </p>
          </div>
          <div className="toolbar">
            <button
              type="button"
              className="button primary"
              data-testid="wisewires-run-all"
              onClick={() => execute(true)}
            >
              <Play size={16} /> 전체 6개 비교 실행
            </button>
            <button
              type="button"
              className="button secondary"
              onClick={() => {
                setInputs(structuredClone(DEFAULT_INPUTS));
                setRuns({});
                setNotice('모든 사례를 기본 재현 입력으로 복원했습니다.');
              }}
            >
              <RotateCcw size={16} /> 모든 샘플 복원
            </button>
            <button
              type="button"
              className="button ghost"
              disabled={!completed.length}
              onClick={exportSuite}
            >
              <Download size={16} /> 실행 기록 JSON
            </button>
          </div>
          {storageNotice && <p className="form-note">{storageNotice}</p>}
          {totalCases > 0 && (
            <div className="field-grid" aria-live="polite">
              <div className="stat">
                <div className="metric-label">실행한 사례</div>
                <div className="metric-value">
                  {totalCases}
                  <small> / 6</small>
                </div>
              </div>
              <div className="stat">
                <div className="metric-label">결함 버전에서 재현</div>
                <div className="metric-value">
                  {buggyFailures}
                  <small>건</small>
                </div>
              </div>
              <div className="stat">
                <div className="metric-label">수정 버전에서 규칙 통과</div>
                <div className="metric-value">
                  {fixedPasses}
                  <small> / {totalCases}</small>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <span className="tag neutral">01 · 테스트 조건</span>
            <h3>재현할 경계를 고르세요</h3>
          </div>
        </div>
        <div className="panel-body">
          <div className="field">
            <label htmlFor="ww-scenario">시나리오</label>
            <select
              id="ww-scenario"
              className="select"
              value={selected}
              onChange={e => select(e.target.value as ScenarioId)}
            >
              {SCENARIOS.map(s => (
                <option key={s.id} value={s.id}>
                  {s.title} · {s.short}
                </option>
              ))}
            </select>
          </div>
          <p className="form-note">{definition.hint}</p>
          <div className="callout">
            <strong>판정 기준</strong>
            <p>{RULES[selected]}</p>
          </div>
          <div className="field-grid">
            {definition.fields.map(field =>
              field.type === 'checkbox' ? (
                <label className="check-row full-width" key={field.key}>
                  <input
                    type="checkbox"
                    checked={Boolean(params[field.key])}
                    onChange={e => update(field.key, e.target.checked)}
                  />
                  {field.label}
                </label>
              ) : (
                <div className="field" key={field.key}>
                  <label htmlFor={`ww-${selected}-${field.key}`}>
                    {field.label}
                  </label>
                  <input
                    id={`ww-${selected}-${field.key}`}
                    className={`input ${field.type === 'text' ? 'mono' : ''}`}
                    type={field.type}
                    step={field.type === 'number' ? 'any' : undefined}
                    value={
                      typeof params[field.key] === 'number' &&
                      !Number.isFinite(params[field.key])
                        ? ''
                        : String(params[field.key])
                    }
                    onChange={e =>
                      update(
                        field.key,
                        field.type === 'number'
                          ? e.target.value === ''
                            ? NaN
                            : Number(e.target.value)
                          : e.target.value
                      )
                    }
                  />
                  {field.note && <p className="form-note">{field.note}</p>}
                </div>
              )
            )}
          </div>
          {selected === 'expiry' && (
            <div className="toolbar">
              <button
                type="button"
                className="button ghost"
                disabled={
                  !Number.isFinite(Date.parse(String(params.expiresAt)))
                }
                onClick={() =>
                  update(
                    'now',
                    new Date(
                      Date.parse(String(params.expiresAt)) - 1
                    ).toISOString()
                  )
                }
              >
                만료 1ms 전
              </button>
              <button
                type="button"
                className="button ghost"
                onClick={() => update('now', String(params.expiresAt))}
              >
                정확한 만료 시각
              </button>
              <button
                type="button"
                className="button ghost"
                disabled={
                  !Number.isFinite(Date.parse(String(params.expiresAt)))
                }
                onClick={() =>
                  update(
                    'now',
                    new Date(
                      Date.parse(String(params.expiresAt)) + 1
                    ).toISOString()
                  )
                }
              >
                만료 1ms 후
              </button>
            </div>
          )}
          {errors.length > 0 && (
            <ul className="issue-list">
              {errors.map(error => (
                <li className="issue error" key={error}>
                  {error}
                </li>
              ))}
            </ul>
          )}
          <div className="toolbar">
            <button
              type="button"
              className="button primary"
              data-testid="wisewires-run"
              onClick={() => execute()}
            >
              <Play size={16} /> 이 조건으로 두 구현 비교
            </button>
            <button
              type="button"
              className="button secondary"
              onClick={resetCurrent}
            >
              현재 샘플 복원
            </button>
          </div>
          <p className="form-note">
            0개 주문처럼 업무 규칙에 어긋난 입력은 정상적인 테스트 대상입니다.
            숫자가 비거나 실습 범위를 넘으면 검증을 실행하지 않습니다.
          </p>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <span className="tag neutral">02 · 실제 관측</span>
            <h3>{definition.short}</h3>
          </div>
        </div>
        <div className="panel-body" aria-live="polite">
          <div
            className="segment-control"
            role="group"
            aria-label="관측할 구현 선택"
          >
            <button
              type="button"
              className={`button ${variant === 'buggy' ? 'primary' : 'ghost'}`}
              aria-pressed={variant === 'buggy'}
              onClick={() => setVariant('buggy')}
            >
              결함 포함
            </button>
            <button
              type="button"
              className={`button ${variant === 'fixed' ? 'primary' : 'ghost'}`}
              aria-pressed={variant === 'fixed'}
              onClick={() => setVariant('fixed')}
            >
              수정 적용
            </button>
          </div>
          {notice && <p className="form-note">{notice}</p>}
          {!current ? (
            <div className="empty-state">
              실행 후 이 영역에 함수가 만든 주문·금액·응답 기록이 나타납니다.
              통과 여부는 관측값과 별도 요구사항을 비교해 계산합니다.
            </div>
          ) : current.inputErrors.length ? (
            <ul className="issue-list">
              {current.inputErrors.map(error => (
                <li className="issue error" key={error}>
                  {error}
                </li>
              ))}
            </ul>
          ) : (
            <>
              <div className="result-summary">
                <span
                  className={`tag ${current.passed ? 'success' : 'danger'}`}
                >
                  {current.passed
                    ? '현재 입력에서 규칙 통과'
                    : '결함 재현 · 규칙 위반'}
                </span>
                <h4>{current.observed?.summary}</h4>
              </div>
              {state && selected === 'discount' && (
                <div className="field-grid">
                  <div className="stat">
                    <div className="metric-label">상품금액</div>
                    <div className="metric-value">
                      {formatNumber(Number(params.subtotal))}
                      <small>원</small>
                    </div>
                  </div>
                  <div className="stat">
                    <div className="metric-label">적용 할인</div>
                    <div className="metric-value">
                      {formatNumber(Number(state.appliedDiscount))}
                      <small>원</small>
                    </div>
                  </div>
                  <div className="stat">
                    <div className="metric-label">결제 예정</div>
                    <div
                      className="metric-value"
                      style={{
                        color:
                          Number(state.payable) < 0
                            ? 'var(--danger, #ef8b88)'
                            : undefined,
                      }}
                    >
                      {formatNumber(Number(state.payable))}
                      <small>원</small>
                    </div>
                  </div>
                </div>
              )}
              {state && selected === 'quantity' && (
                <div className="field-grid">
                  <div className="stat">
                    <div className="metric-label">생성된 주문</div>
                    <div className="metric-value">
                      {String(state.orderCount)}
                      <small>건</small>
                    </div>
                  </div>
                  <div className="stat">
                    <div className="metric-label">남은 재고</div>
                    <div className="metric-value">
                      {String(state.stockAfter)}
                      <small>개</small>
                    </div>
                  </div>
                </div>
              )}
              {state && selected === 'duplicate' && (
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>주문 ID</th>
                        <th>요청 키</th>
                        <th>수량</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(
                        state.orders as {
                          orderId: string;
                          key: string;
                          quantity: number;
                        }[]
                      ).map(order => (
                        <tr key={order.orderId}>
                          <td className="mono">{order.orderId}</td>
                          <td>{order.key}</td>
                          <td>{order.quantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {state && selected === 'stale' && (
                <div className="callout">
                  <span className="metric-label">마지막 검색 화면</span>
                  <h3>검색 {String(state.displayedQuery)} 결과</h3>
                  <p>사용자의 마지막 요청: 검색 B</p>
                </div>
              )}
              {state && selected === 'refund' && (
                <div className="field-grid">
                  <div className="stat">
                    <div className="metric-label">결제된 금액</div>
                    <div className="metric-value">
                      {formatNumber(Number(state.paid))}
                      <small>원</small>
                    </div>
                  </div>
                  <div className="stat">
                    <div className="metric-label">누적 환불</div>
                    <div className="metric-value">
                      {formatNumber(Number(state.refunded))}
                      <small>원</small>
                    </div>
                  </div>
                  <div className="stat">
                    <div className="metric-label">재고 복원</div>
                    <div className="metric-value">
                      {String(state.inventoryRestorations)}
                      <small>회</small>
                    </div>
                  </div>
                </div>
              )}
              <h4>실행 순서</h4>
              <ol className="step-list">
                {current.observed?.trace.map((event, index) => (
                  <li className="step-item" key={index}>
                    <span className="mono text-muted">{index + 1}</span>
                    <span>{event}</span>
                  </li>
                ))}
              </ol>
              <details>
                <summary>관측한 전체 상태 보기</summary>
                <pre
                  className="mono"
                  style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}
                >
                  {JSON.stringify(current.observed?.state, null, 2)}
                </pre>
              </details>
            </>
          )}
        </div>
      </section>

      <section className="panel full-width">
        <div className="panel-header">
          <div>
            <span className="tag neutral">03 · 검증과 보고</span>
            <h3>같은 요구사항, 다른 실행 결과</h3>
          </div>
        </div>
        <div className="panel-body">
          {!comparison ? (
            <div className="empty-state">
              두 구현을 비교하면 예상값·결함 버전 관측값·수정 버전 관측값을
              나란히 볼 수 있습니다.
            </div>
          ) : (
            <>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>검증 규칙</th>
                      <th>예상</th>
                      <th>결함 포함</th>
                      <th>수정 적용</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparison.buggy.assertions.map((assertion, index) => {
                      const fixed = comparison.fixed.assertions[index];
                      return (
                        <tr key={`${assertion.rule}-${index}`}>
                          <td>{assertion.rule}</td>
                          <td className="mono">
                            {display(assertion.expected)}
                          </td>
                          <td>
                            <span
                              className={`tag ${assertion.passed ? 'success' : 'danger'}`}
                            >
                              {assertion.passed ? 'PASS' : 'FAIL'}
                            </span>{' '}
                            <span className="mono">
                              {display(assertion.actual)}
                            </span>
                          </td>
                          <td>
                            <span
                              className={`tag ${fixed?.passed ? 'success' : 'danger'}`}
                            >
                              {fixed?.passed ? 'PASS' : 'FAIL'}
                            </span>{' '}
                            <span className="mono">
                              {display(fixed?.actual)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {comparison.buggy.passed === true && (
                <p className="callout">
                  현재 입력에서는 심어 둔 결함이 재현되지 않았습니다. 기본
                  샘플을 복원하거나 경계값을 바꿔 보세요. 이 결과는 구현 전체의
                  안전성을 보증하지 않습니다.
                </p>
              )}
              {comparison.buggy.passed === null && (
                <p className="callout">
                  입력 형식을 수정하기 전에는 PASS/FAIL을 판정하지 않습니다.
                </p>
              )}
              <div className="split-grid">
                <div>
                  <h4>수정 방향</h4>
                  <p>{fixSuggestion(selected)}</p>
                  <p className="form-note">
                    예상값은 결함·수정 함수의 반환값을 재사용하지 않고 업무
                    요구사항에서 별도로 계산합니다. 결함 버전 FAIL은 이 실습의
                    의도된 결과입니다.
                  </p>
                </div>
                <div>
                  <div className="field">
                    <label htmlFor="ww-severity">
                      보고서의 심각도 · 실습자 판단
                    </label>
                    <select
                      id="ww-severity"
                      className="select"
                      value={severity}
                      onChange={e => setSeverity(e.target.value)}
                    >
                      <option>낮음</option>
                      <option>보통</option>
                      <option>높음</option>
                    </select>
                  </div>
                  <div className="toolbar">
                    <button
                      type="button"
                      className="button secondary"
                      data-testid="wisewires-export-issue"
                      disabled={comparison.buggy.passed !== false}
                      onClick={() => exportIssue('md')}
                    >
                      <Download size={16} /> 재현 보고서 Markdown
                    </button>
                    <button
                      type="button"
                      className="button ghost"
                      disabled={comparison.buggy.passed !== false}
                      onClick={() => exportIssue('json')}
                    >
                      보고서 JSON
                    </button>
                  </div>
                  <p className="form-note">
                    현재 실패한 결함 버전의 입력·재현 순서·예상·관측값과 수정
                    버전 회귀 결과를 함께 저장합니다.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      {completed.length > 0 && (
        <section className="panel full-width">
          <div className="panel-header">
            <h3>실행한 시나리오</h3>
            <span className="text-muted">현재 입력의 기록</span>
          </div>
          <div className="panel-body">
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>시나리오</th>
                    <th>결함 재현</th>
                    <th>수정 버전</th>
                    <th>자세히</th>
                  </tr>
                </thead>
                <tbody>
                  {SCENARIOS.filter(s => runs[s.id]).map(s => {
                    const pair = runs[s.id]!;
                    return (
                      <tr key={s.id}>
                        <td>{s.title}</td>
                        <td>
                          <span
                            className={`tag ${pair.buggy.passed === false ? 'danger' : 'neutral'}`}
                          >
                            {pair.buggy.passed === null
                              ? '입력 오류'
                              : pair.buggy.passed
                                ? '미재현'
                                : '재현'}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`tag ${pair.fixed.passed ? 'success' : 'warning'}`}
                          >
                            {pair.fixed.passed === null
                              ? '입력 오류'
                              : pair.fixed.passed
                                ? '통과'
                                : '실패'}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="button ghost"
                            aria-label={`${s.title} 실행 결과 보기`}
                            onClick={() => select(s.id)}
                          >
                            보기 <ArrowRight size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
