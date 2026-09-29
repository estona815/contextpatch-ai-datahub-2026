import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  CircleAlert,
  Download,
  Play,
  ShieldCheck,
} from 'lucide-react';
import {
  downloadJson,
  downloadText,
  fingerprint,
  usePersistedState,
} from '../../shared/utils';
import {
  approveBrief,
  briefMarkdown,
  evaluateBrief,
  isBrief,
  isBriefApprovalCurrent,
  isBriefRunCurrent,
  scopeList,
} from './engine';
import type { Brief, BriefApproval, BriefRun } from './engine';
import { copyBrief, DOCENTY_SAMPLES, DOCENTY_SAMPLE_VERSION } from './fixtures';

export default function DocentyModule() {
  const [brief, setBrief, storageNotice] = usePersistedState<Brief>(
    'docenty-brief',
    copyBrief(DOCENTY_SAMPLES[0].brief),
    isBrief
  );
  const [sample, setSample] = useState('gaps');
  const [tab, setTab] = useState<'brief' | 'cases'>('brief');
  const [run, setRun] = useState<BriefRun | null>(() => evaluateBrief(brief));
  const [approval, setApproval] = useState<BriefApproval | null>(null);
  const [reviewer, setReviewer] = useState('');
  const [selected, setSelected] = useState('permission');
  const [notice, setNotice] = useState('');
  const current = isBriefRunCurrent(brief, run);
  const approved = isBriefApprovalCurrent(brief, run, approval);
  const selectedCheck =
    run?.checks.find(check => check.id === selected) ?? run?.checks[0];
  const passed = run?.checks.filter(check => check.passed).length ?? 0;
  const marker = useMemo(() => fingerprint(brief), [brief]);
  const update = (patch: Partial<Brief>) => {
    setBrief(value => ({ ...value, ...patch }));
    setApproval(null);
    setNotice('입력이 변경되었습니다. 다시 검사해 주세요.');
  };
  const changeCase = (
    index: number,
    patch: Partial<Brief['scenarios'][number]>
  ) =>
    update({
      scenarios: brief.scenarios.map((scenario, idx) =>
        idx === index ? { ...scenario, ...patch } : scenario
      ),
    });
  const execute = () => {
    const next = evaluateBrief(brief);
    setRun(next);
    setApproval(null);
    setSelected(next.checks.find(check => !check.passed)?.id ?? 'problem');
    setNotice(
      `검사 완료. ${next.checks.filter(check => check.passed).length}/${next.checks.length} 항목 통과.`
    );
  };
  const exportReceipt = () => {
    if (!current || !run) return;
    downloadJson(`docenty-acceptance-${marker}.json`, {
      product: 'Brief to Acceptance',
      sampleVersion: DOCENTY_SAMPLE_VERSION,
      mode: 'independent_work_sample',
      input: brief,
      changeMarker: marker,
      result: run,
      approval: approved ? approval : null,
      limits: [
        '브라우저 내 결정적 구조 검사',
        '실제 데이터 연결·LLM 실행 없음',
        '사업 성과·실제 접근 권한을 보증하지 않음',
        '변경 마커는 암호학적 서명이 아님',
      ],
    });
    setNotice('현재 입력과 검사 근거를 JSON으로 내려받았습니다.');
  };
  return (
    <div className="module-grid">
      <section className="panel">
        <div className="panel-header">
          <h2>제품 브리프</h2>
          <span className="tag neutral">가정값 · 직접 수정</span>
        </div>
        <div className="panel-body">
          <div className="field">
            <label htmlFor="docenty-sample">시나리오</label>
            <select
              className="select"
              id="docenty-sample"
              value={sample}
              onChange={event => setSample(event.target.value)}
            >
              {DOCENTY_SAMPLES.map(item => (
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
                const next = copyBrief(
                  DOCENTY_SAMPLES.find(item => item.id === sample)!.brief
                );
                setBrief(next);
                setRun(evaluateBrief(next));
                setApproval(null);
                setNotice('선택한 예시로 돌아왔습니다.');
              }}
            >
              선택한 예시 불러오기
            </button>
          </div>
          <div
            className="segment-control"
            role="group"
            aria-label="브리프 편집 영역"
          >
            <button
              type="button"
              className={`button ${tab === 'brief' ? 'primary' : 'ghost'}`}
              aria-pressed={tab === 'brief'}
              onClick={() => setTab('brief')}
            >
              문제·데이터
            </button>
            <button
              type="button"
              className={`button ${tab === 'cases' ? 'primary' : 'ghost'}`}
              aria-pressed={tab === 'cases'}
              onClick={() => setTab('cases')}
            >
              요구사항·검수
            </button>
          </div>
          {tab === 'brief' ? (
            <>
              <div className="field">
                <label htmlFor="docenty-title">제품 제목</label>
                <input
                  className="input"
                  id="docenty-title"
                  value={brief.title}
                  onChange={event => update({ title: event.target.value })}
                />
              </div>
              <div className="field">
                <label htmlFor="docenty-role">누가 사용하나요?</label>
                <input
                  className="input"
                  id="docenty-role"
                  value={brief.userRole}
                  onChange={event => update({ userRole: event.target.value })}
                />
              </div>
              <div className="field">
                <label htmlFor="docenty-problem">지금의 문제</label>
                <textarea
                  className="textarea"
                  id="docenty-problem"
                  rows={3}
                  value={brief.problem}
                  onChange={event => update({ problem: event.target.value })}
                />
              </div>
              <div className="field">
                <label htmlFor="docenty-outcome">기대하는 결과</label>
                <textarea
                  className="textarea"
                  id="docenty-outcome"
                  rows={2}
                  value={brief.outcome}
                  onChange={event => update({ outcome: event.target.value })}
                />
              </div>
              <details>
                <summary>완료 목표와 구현 범위</summary>
                <div className="field">
                  <label htmlFor="docenty-metric">측정 지표</label>
                  <input
                    className="input"
                    id="docenty-metric"
                    value={brief.metric.name}
                    onChange={event =>
                      update({
                        metric: { ...brief.metric, name: event.target.value },
                      })
                    }
                  />
                </div>
                <div className="field-grid">
                  <div className="field">
                    <label htmlFor="docenty-baseline">기준값 (가정)</label>
                    <input
                      className="input"
                      id="docenty-baseline"
                      inputMode="decimal"
                      value={brief.metric.baseline}
                      onChange={event =>
                        update({
                          metric: {
                            ...brief.metric,
                            baseline: event.target.value,
                          },
                        })
                      }
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="docenty-target">목표값 (가정)</label>
                    <input
                      className="input"
                      id="docenty-target"
                      inputMode="decimal"
                      value={brief.metric.target}
                      onChange={event =>
                        update({
                          metric: {
                            ...brief.metric,
                            target: event.target.value,
                          },
                        })
                      }
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="docenty-direction">목표 조건</label>
                    <select
                      className="select"
                      id="docenty-direction"
                      value={brief.metric.direction}
                      onChange={event =>
                        update({
                          metric: {
                            ...brief.metric,
                            direction: event.target.value as 'lte' | 'gte',
                          },
                        })
                      }
                    >
                      <option value="lte">이하</option>
                      <option value="gte">이상</option>
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="docenty-unit">단위</label>
                    <input
                      className="input"
                      id="docenty-unit"
                      value={brief.metric.unit}
                      onChange={event =>
                        update({
                          metric: { ...brief.metric, unit: event.target.value },
                        })
                      }
                    />
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="docenty-in">포함할 기능</label>
                  <textarea
                    className="textarea"
                    id="docenty-in"
                    rows={2}
                    value={brief.scopeIn}
                    onChange={event => update({ scopeIn: event.target.value })}
                  />
                </div>
                <div className="field">
                  <label htmlFor="docenty-out">제외할 기능</label>
                  <textarea
                    className="textarea"
                    id="docenty-out"
                    rows={2}
                    value={brief.scopeOut}
                    onChange={event => update({ scopeOut: event.target.value })}
                  />
                </div>
              </details>
              <div className="field">
                <label htmlFor="docenty-resource">연결할 데이터</label>
                <input
                  className="input"
                  id="docenty-resource"
                  value={brief.resource.name}
                  onChange={event =>
                    update({
                      resource: { ...brief.resource, name: event.target.value },
                    })
                  }
                />
              </div>
              <div className="field">
                <label htmlFor="docenty-fields">사용 필드 (쉼표로 구분)</label>
                <input
                  className="input"
                  id="docenty-fields"
                  value={brief.resource.fields}
                  onChange={event =>
                    update({
                      resource: {
                        ...brief.resource,
                        fields: event.target.value,
                      },
                    })
                  }
                />
              </div>
              <div className="field-grid">
                <div className="field">
                  <label htmlFor="docenty-requested">요청 권한</label>
                  <input
                    className="input mono"
                    id="docenty-requested"
                    value={brief.resource.requestedScopes}
                    onChange={event =>
                      update({
                        resource: {
                          ...brief.resource,
                          requestedScopes: event.target.value,
                        },
                      })
                    }
                  />
                </div>
                <div className="field">
                  <label htmlFor="docenty-allowed">허용 권한</label>
                  <input
                    className="input mono"
                    id="docenty-allowed"
                    value={brief.resource.allowedScopes}
                    onChange={event =>
                      update({
                        resource: {
                          ...brief.resource,
                          allowedScopes: event.target.value,
                        },
                      })
                    }
                  />
                </div>
              </div>
              <label className="check-row">
                <input
                  type="checkbox"
                  checked={brief.resource.approved}
                  onChange={event =>
                    update({
                      resource: {
                        ...brief.resource,
                        approved: event.target.checked,
                      },
                    })
                  }
                />
                예시 데이터 연결 승인 있음
              </label>
            </>
          ) : (
            <>
              <p className="form-note">
                요구사항마다 정상·오류·권한 시나리오를 연결하세요. 검수 결과가
                비어 있으면 연결이 완성되지 않습니다.
              </p>
              {brief.requirements.map((req, index) => (
                <div className="field" key={index}>
                  <label htmlFor={`docenty-req-${index}`}>
                    {req.id} 요구사항
                  </label>
                  <input
                    className="input"
                    id={`docenty-req-${index}`}
                    value={req.text}
                    onChange={event =>
                      update({
                        requirements: brief.requirements.map((item, idx) =>
                          idx === index
                            ? { ...item, text: event.target.value }
                            : item
                        ),
                      })
                    }
                  />
                </div>
              ))}
              <button
                className="button ghost"
                type="button"
                disabled={brief.requirements.length >= 20}
                onClick={() =>
                  update({
                    requirements: [
                      ...brief.requirements,
                      { id: `R${brief.requirements.length + 1}`, text: '' },
                    ],
                  })
                }
              >
                요구사항 추가
              </button>
              {brief.scenarios.map((scenario, index) => (
                <details key={scenario.id} open={scenario.kind === 'error'}>
                  <summary>
                    {scenario.id} ·{' '}
                    {
                      {
                        normal: '정상 처리',
                        error: '오류·복구',
                        permission: '권한 거부',
                      }[scenario.kind]
                    }
                  </summary>
                  <div className="field">
                    <label htmlFor={`docenty-case-refs-${index}`}>
                      연결할 요구사항 ID
                    </label>
                    <input
                      className="input"
                      id={`docenty-case-refs-${index}`}
                      value={scenario.requirementIds.join(', ')}
                      onChange={event =>
                        changeCase(index, {
                          requirementIds: event.target.value
                            .split(',')
                            .map(value => value.trim()),
                        })
                      }
                      onBlur={event =>
                        changeCase(index, {
                          requirementIds: scopeList(event.target.value),
                        })
                      }
                    />
                  </div>
                  {(['given', 'when', 'then'] as const).map(key => (
                    <div className="field" key={key}>
                      <label htmlFor={`docenty-case-${index}-${key}`}>
                        {
                          {
                            given: '어떤 상황에서',
                            when: '무엇을 하면',
                            then: '무엇이 확인되어야 하나요?',
                          }[key]
                        }
                      </label>
                      <textarea
                        className="textarea"
                        rows={2}
                        id={`docenty-case-${index}-${key}`}
                        value={scenario[key]}
                        onChange={event =>
                          changeCase(index, { [key]: event.target.value })
                        }
                      />
                    </div>
                  ))}
                </details>
              ))}
            </>
          )}
          <div className="toolbar">
            <button
              className="button primary"
              type="button"
              onClick={execute}
              data-testid="docenty-run"
            >
              <Play size={16} />
              검사 실행
            </button>
            <span className="form-note">현재 입력 {marker}</span>
          </div>
          <p className="form-note">
            편집 내용만 이 브라우저에 저장됩니다. 외부 데이터와 연결하지
            않습니다.
          </p>
          {storageNotice && <p className="callout">{storageNotice}</p>}
        </div>
      </section>
      <section className="panel">
        <div className="panel-header">
          <h2>검수 근거</h2>
          <span
            className={`tag ${!current ? 'warning' : approved ? 'success' : run?.status === 'ready_for_review' ? 'success' : 'warning'}`}
          >
            {!current
              ? '입력 변경 · 재검사 필요'
              : approved
                ? '검토 기록 완료'
                : run?.status === 'ready_for_review'
                  ? '검토 준비 완료'
                  : '보완 필요'}
          </span>
        </div>
        <div className="panel-body">
          <div className="result-summary">
            <div className="stat">
              <span className="metric-value">
                {current ? `${passed}/${run?.checks.length}` : '—'}
              </span>
              <span className="metric-label">구조·정책 검사 통과</span>
            </div>
            <div className="stat">
              <span className="metric-value">
                {current
                  ? `${run?.coveredRequirementIds.length}/${brief.requirements.length}`
                  : '—'}
              </span>
              <span className="metric-label">검수에 연결된 요구사항</span>
            </div>
          </div>
          {!current && (
            <p className="callout">
              아래는 이전 입력의 검사입니다. 변경된 브리프를 다시 검사하면
              검토와 내보내기가 활성화됩니다.
            </p>
          )}
          <div className="issue-list">
            {run?.checks.map(check => (
              <button
                type="button"
                key={check.id}
                className={`issue ${!current ? 'warning' : check.passed ? 'pass' : 'error'}`}
                onClick={() => setSelected(check.id)}
                aria-pressed={selected === check.id}
                style={{ width: '100%', textAlign: 'left' }}
              >
                {check.passed ? (
                  <CheckCircle2 size={17} />
                ) : (
                  <CircleAlert size={17} />
                )}
                <span>{check.name}</span>
                <span
                  className={`tag ${!current ? 'neutral' : check.passed ? 'success' : 'danger'}`}
                >
                  {!current ? '이전 결과' : check.passed ? '통과' : '보완'}
                </span>
              </button>
            ))}
          </div>
          {selectedCheck && (
            <div className="callout">
              <strong>{selectedCheck.name}</strong>
              <p>{selectedCheck.reason}</p>
              <ul>
                {selectedCheck.evidence.map((evidence, idx) => (
                  <li key={idx}>{evidence}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="field">
            <label htmlFor="docenty-reviewer">검토 기록의 작성자</label>
            <input
              className="input"
              id="docenty-reviewer"
              placeholder="검토자 이름"
              value={reviewer}
              onChange={event => setReviewer(event.target.value)}
            />
          </div>
          <div className="toolbar">
            <button
              className="button primary"
              type="button"
              disabled={
                !current ||
                run?.status !== 'ready_for_review' ||
                !reviewer.trim()
              }
              onClick={() => {
                if (run) {
                  setApproval(approveBrief(brief, run, reviewer));
                  setNotice('현재 입력의 검토 기록을 남겼습니다.');
                }
              }}
            >
              <ShieldCheck size={16} />
              현재 기준 검토 완료
            </button>
          </div>
          <div className="toolbar">
            <button
              className="button secondary"
              type="button"
              onClick={() =>
                downloadText(
                  `docenty-brief-${marker}.md`,
                  briefMarkdown(brief, run, approval),
                  'text/markdown;charset=utf-8'
                )
              }
            >
              <Download size={16} />
              브리프 Markdown
            </button>
            <button
              className="button secondary"
              type="button"
              disabled={!current}
              onClick={exportReceipt}
            >
              <Download size={16} />
              검사 근거 JSON
            </button>
          </div>
          <p className="form-note">
            검토 준비는 구조의 완결성을 뜻합니다. 실제 권한·사업 성과·운영
            품질의 승인은 별도로 확인해야 합니다.
          </p>
          <p className="form-note" role="status" aria-live="polite">
            {notice}
          </p>
        </div>
      </section>
    </div>
  );
}
