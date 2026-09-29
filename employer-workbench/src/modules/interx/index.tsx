import { useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Check,
  Download,
  Play,
  RotateCcw,
} from 'lucide-react';
import {
  downloadJson,
  downloadText,
  formatNumber,
  usePersistedState,
} from '../../shared/utils';
import {
  approvalMatches,
  buildReport,
  EQUIPMENT,
  estimateTime,
  isEstimateInput,
  isWorkflowInput,
  makeApproval,
  reportMarkdown,
  runWorkflow,
  STAGE_LABELS,
  validateWorkflow,
} from './engine';
import type {
  Approval,
  EstimateInput,
  LedgerEntry,
  RequestRecord,
  RunResult,
  WorkflowInput,
} from './engine';
import {
  DEFAULT_ESTIMATE,
  DEFAULT_INPUT,
  SCENARIOS,
  scenarioInput,
} from './fixtures';

const statusLabel: Record<RunResult['status'], string> = {
  BLOCKED: '설계·입력 보완 필요',
  WAITING_APPROVAL: '현재 내용 승인 대기',
  SUCCEEDED: '샘플 전달 완료',
  DUPLICATE: '기존 결과 재사용',
  FAILED: '샘플 전달 실패',
  CONFLICT: '동일 ID 내용 충돌',
};
const traceLabel = {
  PASS: '통과',
  BLOCK: '차단',
  WAIT: '대기',
  FAIL: '실패',
  SKIP: '생략',
};

export default function InterxModule() {
  const [input, setInput, storageNotice] = usePersistedState<WorkflowInput>(
    'interx-input',
    DEFAULT_INPUT,
    isWorkflowInput
  );
  const [assumptions, setAssumptions, estimateNotice] =
    usePersistedState<EstimateInput>(
      'interx-estimate',
      DEFAULT_ESTIMATE,
      isEstimateInput
    );
  const [scenario, setScenario] = useState('valid');
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [approval, setApproval] = useState<Approval | null>(null);
  const [run, setRun] = useState<RunResult | null>(null);
  const [changeNote, setChangeNote] = useState('');
  const issues = validateWorkflow(input);
  const estimate = estimateTime(assumptions);
  const currentApproval = approvalMatches(input, approval);

  function change(update: (value: WorkflowInput) => void) {
    const next = structuredClone(input);
    update(next);
    next.record.revision += 1;
    setInput(next);
    setApproval(null);
    setRun(null);
    setChangeNote(
      '내용이 바뀌어 이전 실행 결과와 승인을 비웠습니다. 새 버전을 실행하세요.'
    );
  }
  function record<K extends keyof RequestRecord>(
    key: K,
    value: RequestRecord[K]
  ) {
    change(next => {
      next.record[key] = value;
    });
  }
  function execute(withApproval = false) {
    const approved = withApproval ? makeApproval(input) : approval;
    if (withApproval) setApproval(approved);
    const next = runWorkflow(input, ledger, approved);
    setRun(next);
    setLedger(next.ledger);
    setChangeNote('');
  }
  function loadScenario(id: string) {
    setScenario(id);
    setInput(scenarioInput(id));
    setLedger([]);
    setApproval(null);
    setRun(null);
    setChangeNote('새 샘플을 불러왔습니다. 단계별 검사를 실행해 보세요.');
  }
  function move(index: number, direction: -1 | 1) {
    change(next => {
      const stages = next.config.stages;
      [stages[index], stages[index + direction]] = [
        stages[index + direction],
        stages[index],
      ];
    });
  }
  function exportReport(kind: 'json' | 'md') {
    if (!run || estimate.errors.length) return;
    const report = buildReport(input, run, assumptions);
    if (kind === 'json') downloadJson('interx-workflow-run.json', report);
    else
      downloadText(
        'interx-workflow-brief.md',
        reportMarkdown(report),
        'text/markdown;charset=utf-8'
      );
  }
  const estimateFields: {
    key: keyof EstimateInput;
    label: string;
    unit: string;
    percent?: boolean;
    step?: number;
  }[] = [
    { key: 'volume', label: '주간 요청 수', unit: '건/주', step: 1 },
    { key: 'eligible', label: '자동화 대상', unit: '%', percent: true },
    { key: 'baseline', label: '기존 처리', unit: '분/건' },
    { key: 'review', label: '자동화 후 검토', unit: '분/대상 건' },
    {
      key: 'exceptionRate',
      label: '대상 중 예외 발생',
      unit: '%',
      percent: true,
    },
    { key: 'exceptionMinutes', label: '예외 추가 처리', unit: '분/예외 건' },
    { key: 'maintenance', label: '주간 유지보수', unit: '분/주' },
    { key: 'setupHours', label: '초기 구축', unit: '시간' },
  ];

  return (
    <div className="module-grid">
      <div className="panel full-width">
        <div className="panel-body">
          <div className="toolbar">
            <div className="field" style={{ flex: 1 }}>
              <label htmlFor="ix-scenario">실습 시나리오</label>
              <select
                id="ix-scenario"
                className="select"
                value={scenario}
                onChange={e => loadScenario(e.target.value)}
              >
                {SCENARIOS.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              className="button secondary"
              onClick={() => loadScenario(scenario)}
            >
              <RotateCcw size={16} /> 선택 샘플 초기화
            </button>
          </div>
          <p className="form-note">
            {SCENARIOS.find(s => s.id === scenario)?.description} 모든 데이터와
            승인은 실습용이며 전달은 브라우저 안에서만 기록됩니다.
          </p>
          {(storageNotice || estimateNotice) && (
            <p className="callout">{storageNotice || estimateNotice}</p>
          )}
        </div>
      </div>

      <section className="panel">
        <div className="panel-header">
          <div>
            <span className="tag neutral">01 · 요구사항</span>
            <h3>어떤 요청을 처리하나요?</h3>
          </div>
          <span className="mono">v{input.record.revision}</span>
        </div>
        <div className="panel-body">
          <div className="field">
            <label htmlFor="ix-name">업무 이름</label>
            <input
              id="ix-name"
              className="input"
              value={input.config.name}
              onChange={e =>
                change(next => {
                  next.config.name = e.target.value;
                })
              }
            />
          </div>
          <div className="field-grid">
            <div className="field">
              <label htmlFor="ix-owner">업무 담당자</label>
              <input
                id="ix-owner"
                className="input"
                value={input.config.owner}
                onChange={e =>
                  change(next => {
                    next.config.owner = e.target.value;
                  })
                }
              />
            </div>
            <div className="field">
              <label htmlFor="ix-exception-owner">예외 담당자</label>
              <input
                id="ix-exception-owner"
                className="input"
                value={input.config.exceptionOwner}
                onChange={e =>
                  change(next => {
                    next.config.exceptionOwner = e.target.value;
                  })
                }
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="ix-completion">완료 기준</label>
            <textarea
              id="ix-completion"
              className="textarea"
              rows={2}
              value={input.config.completion}
              onChange={e =>
                change(next => {
                  next.config.completion = e.target.value;
                })
              }
            />
          </div>
          <div className="field-grid">
            <div className="field">
              <label htmlFor="ix-request-id">요청 ID · 재실행 키</label>
              <input
                id="ix-request-id"
                className="input mono"
                value={input.record.requestId}
                onChange={e => record('requestId', e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="ix-equipment">장비 ID</label>
              <select
                id="ix-equipment"
                className="select"
                value={input.record.equipmentId}
                onChange={e => record('equipmentId', e.target.value)}
              >
                <option value="">장비 선택</option>
                {EQUIPMENT.map(id => (
                  <option key={id}>{id}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="field-grid">
            <div className="field">
              <label htmlFor="ix-time">발생 일시 · 시간대 포함</label>
              <input
                id="ix-time"
                className="input"
                value={input.record.occurredAt}
                onChange={e => record('occurredAt', e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="ix-severity">요청 중요도</label>
              <select
                id="ix-severity"
                className="select"
                value={input.record.severity}
                onChange={e => record('severity', e.target.value)}
              >
                <option value="low">낮음</option>
                <option value="medium">보통</option>
                <option value="high">높음</option>
              </select>
            </div>
          </div>
          <div className="field">
            <label htmlFor="ix-note">요청 내용</label>
            <textarea
              id="ix-note"
              className="textarea"
              rows={3}
              value={input.record.note}
              onChange={e => record('note', e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="ix-email">샘플 연락처 · 선택 입력</label>
            <input
              id="ix-email"
              className="input"
              value={input.record.contactEmail}
              onChange={e => record('contactEmail', e.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <span className="tag neutral">02 · 흐름 구성</span>
            <h3>순서와 전달 조건을 검사합니다</h3>
          </div>
        </div>
        <div className="panel-body">
          <label className="check-row">
            <input
              type="checkbox"
              checked={input.config.externalTransfer}
              onChange={e =>
                change(next => {
                  next.config.externalTransfer = e.target.checked;
                })
              }
            />{' '}
            외부로 전달하는 업무로 설정
          </label>
          <label className="check-row">
            <input
              type="checkbox"
              checked={input.config.requiresApproval}
              onChange={e =>
                change(next => {
                  next.config.requiresApproval = e.target.checked;
                })
              }
            />{' '}
            전달 전 담당자 승인 필요
          </label>
          <label className="check-row">
            <input
              type="checkbox"
              checked={input.config.failDispatch}
              onChange={e =>
                change(next => {
                  next.config.failDispatch = e.target.checked;
                })
              }
            />{' '}
            전달 실패 주입 · 재시도 실습
          </label>
          <ol className="step-list">
            {input.config.stages.map((stage, index) => (
              <li className="step-item" key={stage.id}>
                <label className="check-row" style={{ flex: 1 }}>
                  <input
                    aria-label={`${STAGE_LABELS[stage.id]} 단계 사용`}
                    type="checkbox"
                    checked={stage.enabled}
                    onChange={e =>
                      change(next => {
                        next.config.stages[index].enabled = e.target.checked;
                      })
                    }
                  />
                  <span>
                    <span className="text-muted">
                      {String(index + 1).padStart(2, '0')}{' '}
                    </span>
                    {STAGE_LABELS[stage.id]}
                  </span>
                </label>
                <button
                  type="button"
                  className="button ghost"
                  aria-label={`${STAGE_LABELS[stage.id]} 위로 이동`}
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                >
                  <ArrowUp size={16} />
                </button>
                <button
                  type="button"
                  className="button ghost"
                  aria-label={`${STAGE_LABELS[stage.id]} 아래로 이동`}
                  disabled={index === input.config.stages.length - 1}
                  onClick={() => move(index, 1)}
                >
                  <ArrowDown size={16} />
                </button>
              </li>
            ))}
          </ol>
          <div className="result-summary" aria-live="polite">
            <span className={`tag ${issues.length ? 'warning' : 'success'}`}>
              {issues.length
                ? `수정할 항목 ${issues.length}개`
                : '제한된 파일럿 검토 가능'}
            </span>
            <p className="form-note">
              입력을 바꾸면 즉시 재검사합니다. 실무 배포와 경제적 효과를
              보증하는 판정은 아닙니다.
            </p>
          </div>
          {issues.length > 0 && (
            <ul className="issue-list">
              {issues.map((issue, i) => (
                <li className="issue error" key={`${issue.code}-${i}`}>
                  <strong>
                    {issue.code} · {issue.message}
                  </strong>
                  <p>{issue.remedy}</p>
                </li>
              ))}
            </ul>
          )}
          <div className="toolbar">
            <button
              type="button"
              className="button primary"
              data-testid="interx-run"
              onClick={() => execute()}
            >
              <Play size={16} /> 검증하고 실행
            </button>
            <button
              type="button"
              className="button secondary"
              onClick={() => {
                setInput(structuredClone(DEFAULT_INPUT));
                setApproval(null);
                setRun(null);
                setLedger([]);
                setScenario('valid');
                setChangeNote('표준 순서와 정상 요청으로 복원했습니다.');
              }}
            >
              표준 흐름 복원
            </button>
          </div>
        </div>
      </section>

      <section className="panel full-width">
        <div className="panel-header">
          <div>
            <span className="tag neutral">03 · 실행 증거</span>
            <h3>
              {run ? statusLabel[run.status] : '실행 기록을 만들어 보세요'}
            </h3>
          </div>
          <span className="tag neutral">
            이 세션의 전달 기록 {ledger.length}건
          </span>
        </div>
        <div className="panel-body" aria-live="polite">
          {changeNote && <p className="callout">{changeNote}</p>}
          {!run ? (
            <div className="empty-state">
              실행 버튼을 누르면 각 단계의 검사 결과와 실제 로컬 처리 데이터가
              나타납니다. 입력을 바꾸면 이전 승인과 결과가 무효화됩니다.
            </div>
          ) : (
            <>
              <div className="toolbar">
                <span
                  className={`tag ${run.status === 'SUCCEEDED' || run.status === 'DUPLICATE' ? 'success' : run.status === 'WAITING_APPROVAL' ? 'warning' : 'danger'}`}
                >
                  {statusLabel[run.status]}
                </span>
                <span>
                  이번 실행의 추가 전달: <strong>{run.newDispatches}건</strong>
                </span>
                {currentApproval && (
                  <span className="tag success">현재 버전 승인됨</span>
                )}
              </div>
              {run.status === 'WAITING_APPROVAL' && (
                <div className="callout">
                  <p>
                    이 화면의 입력과 단계 구성을 확인한 뒤 샘플 승인자로 승인할
                    수 있습니다. 변경된 내용에는 새 승인이 필요합니다.
                  </p>
                  <button
                    type="button"
                    className="button primary"
                    data-testid="interx-approve"
                    onClick={() => execute(true)}
                  >
                    <Check size={16} /> 현재 내용 승인하고 실행
                  </button>
                </div>
              )}
              {run.status === 'SUCCEEDED' && (
                <p className="form-note">
                  다시 실행하면 같은 결과를 재사용합니다. 요청 내용을 바꾸고
                  같은 ID로 실행하면 충돌을 확인할 수 있습니다.
                </p>
              )}
              {run.issues.length > 0 && (
                <ul className="issue-list">
                  {run.issues.map((issue, i) => (
                    <li className="issue error" key={`run-${i}`}>
                      {issue.code}: {issue.message} {issue.remedy}
                    </li>
                  ))}
                </ul>
              )}
              <div className="split-grid">
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>단계</th>
                        <th>결과</th>
                        <th>관측 내용</th>
                      </tr>
                    </thead>
                    <tbody>
                      {run.trace.map((step, index) => (
                        <tr key={`${step.stage}-${index}`}>
                          <td>{STAGE_LABELS[step.stage]}</td>
                          <td>
                            <span
                              className={`tag ${step.status === 'PASS' ? 'success' : step.status === 'SKIP' ? 'neutral' : step.status === 'WAIT' ? 'warning' : 'danger'}`}
                            >
                              {traceLabel[step.status]}
                            </span>
                          </td>
                          <td>{step.detail}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div>
                  <h4>전달 후보 데이터</h4>
                  {run.output ? (
                    <pre
                      className="mono"
                      style={{
                        overflowX: 'auto',
                        whiteSpace: 'pre-wrap',
                        overflowWrap: 'anywhere',
                      }}
                    >
                      {JSON.stringify(run.output, null, 2)}
                    </pre>
                  ) : (
                    <p className="text-muted">
                      검증을 통과하기 전에는 전달 데이터를 생성하지 않습니다.
                    </p>
                  )}
                  <p className="form-note">
                    대기·실패 상태의 후보 데이터는 성공 기록에 포함되지
                    않습니다.
                  </p>
                </div>
              </div>
              <div className="toolbar">
                <button
                  type="button"
                  className="button secondary"
                  disabled={!!estimate.errors.length}
                  onClick={() => exportReport('md')}
                >
                  <Download size={16} /> 실행 보고서 Markdown
                </button>
                <button
                  type="button"
                  className="button ghost"
                  disabled={!!estimate.errors.length}
                  onClick={() => exportReport('json')}
                >
                  전체 기록 JSON
                </button>
              </div>
              {!!estimate.errors.length && (
                <p className="form-note">
                  시간 가정의 잘못된 입력을 수정하면 현재 상태의 진단 보고서를
                  저장할 수 있습니다.
                </p>
              )}
            </>
          )}
        </div>
      </section>

      <section className="panel full-width">
        <div className="panel-header">
          <div>
            <span className="tag neutral">04 · 가정 비교</span>
            <h3>실제 절감 대신, 계산 가능한 가정</h3>
          </div>
          <button
            type="button"
            className="button ghost"
            onClick={() => setAssumptions(structuredClone(DEFAULT_ESTIMATE))}
          >
            예시 가정 복원
          </button>
        </div>
        <div className="panel-body">
          <p className="form-note">
            초깃값은 예시입니다. 조직의 측정값을 입력하기 전까지는 예상
            시나리오이며 실제 성과·ROI가 아닙니다. 모든 숫자를 바꿔 계산을
            확인할 수 있습니다.
          </p>
          <div className="field-grid">
            {estimateFields.map(field => (
              <div className="field" key={field.key}>
                <label htmlFor={`ix-estimate-${field.key}`}>
                  {field.label}{' '}
                  <span className="text-muted">({field.unit})</span>
                </label>
                <input
                  id={`ix-estimate-${field.key}`}
                  className="input"
                  type="number"
                  step={field.step ?? 'any'}
                  value={
                    Number.isFinite(assumptions[field.key])
                      ? Math.round(
                          assumptions[field.key] *
                            (field.percent ? 100 : 1) *
                            1000000
                        ) / 1000000
                      : ''
                  }
                  onChange={e =>
                    setAssumptions(current => ({
                      ...current,
                      [field.key]:
                        e.target.value === ''
                          ? NaN
                          : Number(e.target.value) / (field.percent ? 100 : 1),
                    }))
                  }
                />
              </div>
            ))}
          </div>
          {estimate.errors.length ? (
            <ul className="issue-list">
              {estimate.errors.map(error => (
                <li className="issue error" key={error}>
                  {error}
                </li>
              ))}
            </ul>
          ) : (
            <>
              <div className="field-grid">
                <div className="stat">
                  <div className="metric-label">기존 사람 작업 시간</div>
                  <div className="metric-value">
                    {formatNumber(estimate.before! / 60, 2)}
                    <small> 시간/주</small>
                  </div>
                </div>
                <div className="stat">
                  <div className="metric-label">도입 후 사람 작업 시간</div>
                  <div className="metric-value">
                    {formatNumber(estimate.after! / 60, 2)}
                    <small> 시간/주</small>
                  </div>
                </div>
                <div className="stat">
                  <div className="metric-label">
                    {estimate.net! < 0 ? '가정상 추가 소요' : '가정상 순감소'}
                  </div>
                  <div className="metric-value">
                    {formatNumber(Math.abs(estimate.net!) / 60, 2)}
                    <small> 시간/주</small>
                  </div>
                </div>
                <div className="stat">
                  <div className="metric-label">초기 구축시간 회수</div>
                  <div className="metric-value">
                    {estimate.recoveryWeeks === null
                      ? '회수 안 됨'
                      : `${formatNumber(estimate.recoveryWeeks, 2)}주`}
                  </div>
                </div>
              </div>
              <div
                className="mini-bars"
                aria-label="가정에 따른 주간 작업시간 비교"
              >
                {[
                  ['기존', estimate.before!],
                  ['도입 후', estimate.after!],
                ].map(([label, value]) => (
                  <div className="bar-row" key={String(label)}>
                    <span>{label}</span>
                    <div className="bar-track">
                      <div
                        className="bar-fill"
                        style={{
                          width: `${(Math.max(0, Number(value)) / Math.max(estimate.before!, estimate.after!, 1)) * 100}%`,
                        }}
                      />
                    </div>
                    <span>{formatNumber(Number(value), 1)}분</span>
                  </div>
                ))}
              </div>
            </>
          )}
          <details>
            <summary>계산식과 포함하지 않은 항목</summary>
            <div className="form-note">
              <p>
                N=주간 요청 수, p=대상 비율, b=기존 처리시간, r=검토시간, q=예외
                비율, e=추가 예외시간, m=유지보수시간, h=초기 구축시간.
              </p>
              <p className="mono">
                기존 = N × b<br />
                도입 후 = N × (1−p) × b + N × p × (r + q × e) + m<br />
                순감소 = 기존 − 도입 후<br />
                구축시간 회수 = h × 60 ÷ 순감소 (순감소가 양수일 때)
              </p>
              <p>
                예외시간은 검토시간에 추가됩니다. 기계 처리 지연, 도구 비용,
                품질 변화와 실제 매출은 포함하지 않습니다. 요청이 0건이어도
                유지보수시간은 남습니다.
              </p>
            </div>
          </details>
        </div>
      </section>
    </div>
  );
}
