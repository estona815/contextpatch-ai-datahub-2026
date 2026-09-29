import { useMemo, useState } from 'react';
import { downloadJson, usePersistedState } from '../../shared/utils.ts';
import {
  compareRuns,
  evaluateTraceText,
  LIMITATIONS,
  RULE_SET_VERSION,
  type RunEvaluation,
} from './engine.ts';
import { ENSAPIA_FIXTURES, getFixture } from './fixtures.ts';

const statusLabel = (status: RunEvaluation['status']) =>
  status === 'passed_with_limits'
    ? '범위 내 통과'
    : status === 'invalid_trace'
      ? '입력 오류'
      : '규칙 실패';
interface Session {
  fixtureId: string;
  baseline: string;
  candidate: string;
}
const initialFixture = getFixture('scope');
const initial: Session = {
  fixtureId: 'scope',
  baseline: JSON.stringify(initialFixture.baseline, null, 2),
  candidate: JSON.stringify(initialFixture.candidate, null, 2),
};
function validSession(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const x = value as Partial<Session>;
  return (
    typeof x.fixtureId === 'string' &&
    ENSAPIA_FIXTURES.some(f => f.id === x.fixtureId) &&
    typeof x.baseline === 'string' &&
    x.baseline.length <= 250_000 &&
    typeof x.candidate === 'string' &&
    x.candidate.length <= 250_000
  );
}

export default function EnsapiaModule() {
  const [session, setSession, storageNotice] = usePersistedState<Session>(
    'ensapia-traces',
    initial,
    validSession
  );
  const [side, setSide] = useState<'baseline' | 'candidate'>('baseline');
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [downloadNotice, setDownloadNotice] = useState('');
  const baseline = useMemo(
    () => evaluateTraceText(session.baseline),
    [session.baseline]
  );
  const candidate = useMemo(
    () => evaluateTraceText(session.candidate),
    [session.candidate]
  );
  const comparison = useMemo(
    () => compareRuns([baseline.evaluation], [candidate.evaluation]),
    [baseline, candidate]
  );
  const active = side === 'baseline' ? baseline : candidate;
  const report = active.evaluation;
  const currentFixture =
    ENSAPIA_FIXTURES.find(fixture => fixture.id === session.fixtureId) ??
    ENSAPIA_FIXTURES[0];
  const displayedFindings = selectedEvent
    ? report.findings.filter(finding =>
        finding.eventIds.includes(selectedEvent)
      )
    : report.findings;
  const svgMax = Math.max(
    1,
    report.measurements?.durationMs ?? 1,
    active.input?.scenario.maxDurationMs ?? 1
  );
  const restore = (id: string) => {
    const fixture = getFixture(id);
    setSession({
      fixtureId: id,
      baseline: JSON.stringify(fixture.baseline, null, 2),
      candidate: JSON.stringify(fixture.candidate, null, 2),
    });
    setSelectedEvent(null);
    setDownloadNotice('');
  };
  const exportReport = () => {
    try {
      downloadJson('avatarops-synthetic-evaluation.json', {
        artifact: 'AvatarOps Harness',
        dataMode: 'synthetic',
        ruleSetVersion: RULE_SET_VERSION,
        sourceResearchDate: '2026-09-29',
        fixturePickerId: session.fixtureId,
        baseline: { input: baseline.input, evaluation: baseline.evaluation },
        candidate: { input: candidate.input, evaluation: candidate.evaluation },
        comparison,
        limitations: LIMITATIONS,
        publicContextSources: [
          'https://recruit.cocone.co.kr/job_posting/xGnZyTs4',
          'https://recruit.cocone.co.kr/job_posting/AH8VH2Bm',
          'https://ensapia.com/en/',
        ],
      });
      setDownloadNotice(
        '현재 입력·검사 결과·비교 근거를 JSON으로 내려받았습니다.'
      );
    } catch {
      setDownloadNotice(
        '파일을 내려받지 못했습니다. 브라우저 다운로드 권한을 확인하세요.'
      );
    }
  };
  return (
    <div className="module-grid" data-testid="ensapia-module">
      <section className="panel full-width">
        <div className="panel-header">
          <h2>실행 기록 비교</h2>
          <span className="tag neutral">합성 기록 · 외부 실행 없음</span>
        </div>
        <div className="panel-body">
          <div className="field-grid">
            <div className="field">
              <label htmlFor="ensapia-fixture">실패 시나리오</label>
              <select
                id="ensapia-fixture"
                className="select"
                value={session.fixtureId}
                onChange={event => restore(event.target.value)}
              >
                {ENSAPIA_FIXTURES.map(fixture => (
                  <option key={fixture.id} value={fixture.id}>
                    {fixture.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="toolbar">
              <button
                type="button"
                className="button secondary"
                onClick={() => restore(session.fixtureId)}
              >
                선택 예제로 초기화
              </button>
              <button
                type="button"
                className="button primary"
                onClick={exportReport}
                disabled={!baseline.input || !candidate.input}
              >
                비교 보고서 내려받기
              </button>
            </div>
          </div>
          <p className="form-note">
            {currentFixture.description} 입력을 편집하면 현재 결과가 즉시 다시
            계산됩니다.
          </p>
          {storageNotice && (
            <p className="callout" role="status">
              {storageNotice}
            </p>
          )}
          {downloadNotice && (
            <p className="form-note" role="status">
              {downloadNotice}
            </p>
          )}
          {(!baseline.input || !candidate.input) && (
            <p className="issue error" role="alert">
              기준 또는 후보 JSON이 유효하지 않습니다. 입력을 고치면 비교와
              보고서 다운로드가 다시 활성화됩니다.
            </p>
          )}
          <div className="result-summary">
            {[
              {
                label: '비교 가능한 시나리오',
                value: `${comparison.pairedCount}개`,
              },
              {
                label: '실패 → 범위 내 통과',
                value: `${comparison.improved}개`,
              },
              { label: '통과 → 실패', value: `${comparison.regressed}개` },
              {
                label: '비교 제외',
                value: `${comparison.exclusions.length}건`,
              },
            ].map(stat => (
              <div className="stat" key={stat.label}>
                <strong className="metric-value">{stat.value}</strong>
                <span className="metric-label">{stat.label}</span>
              </div>
            ))}
          </div>
          {comparison.pairs.map(pair => (
            <div className="callout" key={pair.key}>
              <strong>{pair.scenarioId}</strong> ·{' '}
              {statusLabel(pair.baselineStatus)} →{' '}
              {statusLabel(pair.candidateStatus)}
              <p>
                해결한 규칙: {pair.resolvedRuleIds.join(', ') || '없음'} · 새
                실패: {pair.introducedRuleIds.join(', ') || '없음'}
              </p>
              <p className="form-note">
                합성 누적 시간 차이: 후보 − 기준 ={' '}
                {pair.durationDeltaMs > 0 ? '+' : ''}
                {pair.durationDeltaMs} ms. 실제 모델 속도 측정값이 아닙니다.
              </p>
            </div>
          ))}
          {comparison.exclusions.map((item, index) => (
            <p key={`${item.key}-${index}`} className="issue warning">
              비교 제외 ({item.side}): {item.reason}
            </p>
          ))}
        </div>
      </section>

      <section className="panel full-width">
        <div className="panel-header">
          <h2>기록 검사기</h2>
          <div className="segment-control" aria-label="검사할 기록 선택">
            <button
              type="button"
              className={`button ${side === 'baseline' ? 'primary' : 'ghost'}`}
              aria-pressed={side === 'baseline'}
              onClick={() => {
                setSide('baseline');
                setSelectedEvent(null);
              }}
            >
              기준 기록
            </button>
            <button
              type="button"
              className={`button ${side === 'candidate' ? 'primary' : 'ghost'}`}
              aria-pressed={side === 'candidate'}
              onClick={() => {
                setSide('candidate');
                setSelectedEvent(null);
              }}
            >
              후보 기록
            </button>
          </div>
        </div>
        <div className="panel-body">
          <div className="toolbar">
            <span
              className={`tag ${report.status === 'passed_with_limits' ? 'success' : 'danger'}`}
              data-testid="ensapia-status"
            >
              {statusLabel(report.status)}
            </span>
            <span className="text-muted">
              통과 {report.requiredChecks.passed} · 실패{' '}
              {report.requiredChecks.failed} · 미평가{' '}
              {report.requiredChecks.notEvaluated}
            </span>
            <button
              type="button"
              className="button secondary"
              aria-expanded={showEditor}
              aria-controls="ensapia-editor"
              onClick={() => setShowEditor(!showEditor)}
            >
              {showEditor ? 'JSON 편집 닫기' : 'JSON 직접 편집'}
            </button>
          </div>
          <p className="form-note">
            {report.inputHash ?? '유효한 내용 표시 없음'} · 규칙{' '}
            {RULE_SET_VERSION}. 쓰기·승인 이벤트가 없는 기록은 해당 규칙을
            미평가로 표시합니다.
          </p>
          {showEditor && (
            <div className="field" id="ensapia-editor">
              <label htmlFor="ensapia-json">
                {side === 'baseline' ? '기준' : '후보'} 합성 실행 기록 JSON
              </label>
              <textarea
                id="ensapia-json"
                data-testid="ensapia-json"
                className="textarea mono"
                rows={20}
                spellCheck={false}
                maxLength={250_000}
                value={session[side]}
                onChange={event => {
                  setSession({ ...session, [side]: event.target.value });
                  setSelectedEvent(null);
                  setDownloadNotice('');
                }}
              />
              <p className="form-note">
                예: args.userId, evidence.dataVersion, atMs, sideEffectApplied를
                바꿔 검사가 어떻게 달라지는지 확인하세요. 빈 입력은 통과
                처리하지 않습니다.
              </p>
            </div>
          )}
          <div className="split-grid">
            <div>
              <h3>이벤트별 합성 누적 시간</h3>
              {report.timeline.length ? (
                <>
                  <div
                    className="table-wrap"
                    style={{ maxHeight: 440, overflow: 'auto' }}
                  >
                    <svg
                      role="img"
                      aria-label={`${side === 'baseline' ? '기준' : '후보'} 기록의 합성 누적 시간. 예산 ${svgMax}밀리초 기준.`}
                      viewBox={`0 0 650 ${Math.min(report.timeline.length, 30) * 31 + 38}`}
                      style={{
                        width: '100%',
                        minWidth: 650,
                        height: 'auto',
                        display: 'block',
                      }}
                    >
                      <text x="175" y="18" fontSize="12" fill="currentColor">
                        0 ms
                      </text>
                      <text
                        x="640"
                        y="18"
                        textAnchor="end"
                        fontSize="12"
                        fill="currentColor"
                      >
                        {svgMax} ms
                      </text>
                      {report.timeline.slice(0, 30).map((event, index) => (
                        <g key={event.id}>
                          <text
                            x="0"
                            y={index * 31 + 45}
                            fontSize="12"
                            fill="currentColor"
                          >
                            {event.id.length > 21
                              ? `${event.id.slice(0, 19)}…`
                              : event.id}
                          </text>
                          <rect
                            x="175"
                            y={index * 31 + 32}
                            width="465"
                            height="18"
                            rx="3"
                            fill="currentColor"
                            opacity="0.08"
                          />
                          <rect
                            x="175"
                            y={index * 31 + 32}
                            width={Math.max(2, (event.atMs / svgMax) * 465)}
                            height="18"
                            rx="3"
                            fill={
                              event.findingCodes.length ? '#d15a48' : '#237d69'
                            }
                          />
                          <title>
                            {event.id}: {event.atMs} ms / {event.label}
                          </title>
                        </g>
                      ))}
                    </svg>
                  </div>
                  {report.timeline.length > 30 && (
                    <p className="form-note">
                      차트는 처음 30개 이벤트를 표시합니다. 아래 표에는 전체
                      기록이 있습니다.
                    </p>
                  )}
                  <div className="table-wrap">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>이벤트</th>
                          <th>내용</th>
                          <th>누적 / 간격</th>
                          <th>발견</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.timeline.map(event => (
                          <tr key={event.id}>
                            <td>
                              <button
                                type="button"
                                className="button ghost mono"
                                onClick={() =>
                                  setSelectedEvent(
                                    selectedEvent === event.id ? null : event.id
                                  )
                                }
                                aria-pressed={selectedEvent === event.id}
                              >
                                {event.id}
                              </button>
                            </td>
                            <td>{event.label}</td>
                            <td>
                              {event.atMs} / {event.deltaMs} ms
                            </td>
                            <td>{event.findingCodes.length}건</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <p className="empty-state">
                  유효한 이벤트가 없어 타임라인을 만들지 않았습니다.
                </p>
              )}
            </div>
            <div>
              <h3>규칙 검사 결과</h3>
              <div className="issue-list">
                {report.checks.map(check => (
                  <div
                    className={`issue ${check.status === 'failed' ? 'error' : check.status === 'passed' ? 'pass' : 'warning'}`}
                    key={check.ruleId}
                  >
                    <strong>{check.label}</strong>
                    <span>
                      {' '}
                      {check.status === 'passed'
                        ? '통과'
                        : check.status === 'failed'
                          ? `${check.findingCount}건 실패`
                          : '미평가'}
                    </span>
                  </div>
                ))}
              </div>
              {report.measurements && (
                <div className="callout">
                  <p>
                    도구 호출 {report.measurements.toolCalls}회 · 재시도{' '}
                    {report.measurements.retries}회
                  </p>
                  <p>
                    쓰기 제안 중복 {report.measurements.repeatedWriteProposals}
                    회 · 관찰된 추가 적용{' '}
                    {report.measurements.duplicateOperations}회
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="panel full-width">
        <div className="panel-header">
          <h2>
            {selectedEvent
              ? `${selectedEvent}의 발견 사항`
              : '발견 사항과 근거'}
          </h2>
          {selectedEvent && (
            <button
              type="button"
              className="button ghost"
              onClick={() => setSelectedEvent(null)}
            >
              전체 이벤트 보기
            </button>
          )}
        </div>
        <div className="panel-body">
          {displayedFindings.length ? (
            <div className="issue-list">
              {displayedFindings.map((finding, index) => (
                <article
                  className={`issue ${finding.severity === 'error' ? 'error' : 'warning'}`}
                  key={`${finding.code}-${index}`}
                >
                  <strong>{finding.code}</strong>
                  <p>{finding.explanation}</p>
                  <p>관찰: {finding.observed}</p>
                  <p>기대: {finding.expected}</p>
                  <p className="form-note">
                    {finding.ruleId} ·{' '}
                    {finding.eventIds.join(', ') || '입력 전체'}
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <p className="empty-state">
              {selectedEvent
                ? '선택한 이벤트에서 해당 규칙의 위반을 찾지 못했습니다.'
                : '지원하는 구조화 규칙에서 위반을 찾지 못했습니다. 의미 정확성이나 실제 서비스 안전성을 보증하지 않습니다.'}
            </p>
          )}
          <details>
            <summary>검증 범위와 해석</summary>
            <ul>
              {LIMITATIONS.map(item => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p className="form-note">
              {report.coverage.hashNotice} 비교는 시나리오 ID·fixture 버전·규칙
              버전뿐 아니라 시나리오 정책 내용도 일치해야 합니다.
            </p>
          </details>
        </div>
      </section>
    </div>
  );
}
