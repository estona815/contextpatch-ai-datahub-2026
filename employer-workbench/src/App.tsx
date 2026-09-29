import { Component, Suspense, lazy, useEffect, useState } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import {
  ArrowDownToLine,
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  Code2,
  Copy,
  ExternalLink,
  FileCheck2,
  FlaskConical,
  Github,
  Layers3,
  Mail,
  Terminal,
} from 'lucide-react';
import { samples, creator, sourceCheckedDate } from './shared/catalog';
import type { CompanyId, WorkSample } from './shared/catalog';
import { buildInfo } from './shared/build-info';
import { downloadText } from './shared/utils';

const modules = {
  windly: lazy(() => import('./modules/windly')),
  interx: lazy(() => import('./modules/interx')),
  docenty: lazy(() => import('./modules/docenty')),
  ensapia: lazy(() => import('./modules/ensapia')),
  vibers: lazy(() => import('./modules/vibers')),
  wisewires: lazy(() => import('./modules/wisewires')),
};
type View = 'work' | 'notes' | 'evidence';
const tabs = [
  { id: 'work' as const, label: '직접 사용하기', icon: Terminal },
  { id: 'notes' as const, label: '과제와 설계', icon: BookOpen },
  { id: 'evidence' as const, label: '검증과 출처', icon: FileCheck2 },
];
function href(id: CompanyId, view: View = 'work') {
  return `#/${id}${view === 'work' ? '' : `/${view}`}`;
}
function briefMarkdown(sample: WorkSample) {
  return [
    `# ${sample.product} — ${sample.company} 지원용 실증 과제`,
    '',
    `제작: ${creator.name} · 버전 ${buildInfo.version} · ${buildInfo.date}`,
    '',
    `## 과제`,
    sample.description,
    '',
    '## 공개 요구와 연결',
    ...sample.needs.map(n => `- ${n}`),
    '',
    '## 3분 확인 순서',
    ...sample.steps.map((s, i) => `${i + 1}. ${s}`),
    '',
    '## 설계 판단',
    ...sample.decisions.map(d => `### ${d.title}\n${d.detail}\n`),
    '## 검증 범위',
    `전체 프로젝트의 순수 엔진 자동 테스트 ${buildInfo.testCount}개. ${buildInfo.testStatus}. 회사별 테스트와 실제 실행 명령은 저장소의 검증 기록에서 확인할 수 있습니다.`,
    '',
    '## 한계',
    ...sample.limits.map(n => `- ${n}`),
    '',
    '## 출처',
    `확인일: ${sourceCheckedDate}`,
    ...sample.sources.map(s => `- ${s.label}: ${s.url}\n  용도: ${s.supports}`),
    '',
    '## 제작 방식',
    '권준의 지원 목표를 바탕으로 ChatGPT와 협업해 조사·설계·구현·검증한 독립 프로젝트입니다. 기업의 내부 데이터나 공식 의뢰를 사용하지 않았습니다.',
    '',
    `소스: ${buildInfo.sourceUrl}`,
    `시연: ${window.location.href.split('#')[0]}${href(sample.id)}`,
    '',
  ].join('\n');
}

class ModuleBoundary extends Component<
  { children: ReactNode; company: CompanyId },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(_error: Error, _info: ErrorInfo) {
    /* The recovery screen keeps private inputs out of logs. */
  }
  reset = () => {
    try {
      Object.keys(localStorage)
        .filter(key =>
          key.startsWith(`kwon-workbench:v1:${this.props.company}`)
        )
        .forEach(key => localStorage.removeItem(key));
    } catch {
      /* A disabled storage layer must not prevent recovery. */
    }
    window.location.reload();
  };
  render() {
    if (this.state.failed)
      return (
        <section className="panel">
          <div className="panel-body">
            <h2>작업 화면을 불러오지 못했습니다.</h2>
            <p>이 도구에 저장된 입력을 예제로 되돌리고 다시 열 수 있습니다.</p>
            <button
              type="button"
              className="button primary"
              onClick={this.reset}
            >
              이 도구를 예제로 다시 열기
            </button>
          </div>
        </section>
      );
    return this.props.children;
  }
}

function Landing() {
  return (
    <div className="landing">
      <header className="landing-header">
        <a className="wordmark" href="#/" aria-label="권준 작업 모음">
          <span className="brand-mark">
            <Layers3 size={19} />
          </span>
          KWON<span className="text-muted">.WORK</span>
        </a>
        <a
          className="quiet-link"
          href={creator.github}
          target="_blank"
          rel="noreferrer"
        >
          <Github size={17} /> GitHub <ExternalLink size={13} />
        </a>
      </header>
      <main id="main" tabIndex={-1}>
        <section className="landing-intro">
          <div>
            <p className="eyebrow">권준 · 제품 제작 / 업무 자동화 / 검증</p>
            <h1>
              업무를 이해하고,
              <br />
              <span>검증까지 연결합니다.</span>
            </h1>
          </div>
          <div className="intro-aside">
            <span className="edition">WORK SAMPLES / 2026.09</span>
            <p>
              공개된 업무 요구에서 출발한 여섯 가지 실증 과제.
              <br />
              입력을 바꾸고, 예외를 확인하고,
              <br />
              결과를 가져가세요.
            </p>
            <span className="tag neutral">
              <FlaskConical size={13} /> 합성 예제로 바로 사용
            </span>
          </div>
        </section>
        <div className="work-list-label">
          <span>회사별 업무 과제</span>
          <span>06 INTERACTIVE TOOLS</span>
        </div>
        <section className="work-list" aria-label="회사별 실증 도구">
          {samples.map((sample, index) => (
            <a
              className="work-row"
              href={href(sample.id)}
              key={sample.id}
              data-testid={`open-${sample.id}`}
            >
              <span className="work-number">0{index + 1}</span>
              <div className="work-name">
                <span className="row-category">{sample.category}</span>
                <h2>{sample.product}</h2>
              </div>
              <div className="work-summary">
                <h3>{sample.outcome}</h3>
                <p>
                  {sample.company} · {sample.role}
                </p>
              </div>
              <span className="row-arrow" aria-hidden="true">
                <ArrowRight size={22} />
              </span>
            </a>
          ))}
        </section>
        <section className="landing-bottom">
          <div>
            <Code2 size={20} />
            <p>
              <strong>동작과 근거를 함께 보여줍니다.</strong>
              <br />각 도구에 입력 예시, 실패 조건, 내려받기와 소스 코드를
              담았습니다.
            </p>
          </div>
          <a
            className="button secondary"
            href={buildInfo.sourceUrl}
            target="_blank"
            rel="noreferrer"
          >
            전체 소스 보기 <ExternalLink size={15} />
          </a>
        </section>
      </main>
      <footer className="landing-footer">
        <span>
          권준의 지원 목표를 바탕으로 ChatGPT와 협업해 제작한 독립 프로젝트
        </span>
        <a href={`mailto:${creator.email}`}>
          <Mail size={14} /> {creator.email}
        </a>
      </footer>
    </div>
  );
}

function Navigation({
  sample,
  view,
  mobile = false,
}: {
  sample: WorkSample;
  view: View;
  mobile?: boolean;
}) {
  return (
    <nav
      className={mobile ? 'mobile-tabs' : 'workspace-nav'}
      aria-label="과제 메뉴"
    >
      {tabs.map(tab => (
        <a
          key={tab.id}
          href={href(sample.id, tab.id)}
          className={view === tab.id ? 'active' : ''}
          aria-current={view === tab.id ? 'page' : undefined}
        >
          <tab.icon size={17} />
          <span>{tab.label}</span>
          {!mobile && <ChevronRight size={14} />}
        </a>
      ))}
    </nav>
  );
}
function Notes({ sample }: { sample: WorkSample }) {
  return (
    <div className="document-page">
      <section className="panel">
        <div className="panel-header">
          <h2>이 과제를 선택한 이유</h2>
          <span className="tag neutral">공개 업무 요구 기반</span>
        </div>
        <div className="panel-body prose">
          <p>{sample.description}</p>
          <ul>
            {sample.needs.map(need => (
              <li key={need}>{need}</li>
            ))}
          </ul>
        </div>
      </section>
      <section className="panel">
        <div className="panel-header">
          <h2>구현에서 내린 판단</h2>
        </div>
        <div className="panel-body decision-list">
          {sample.decisions.map((decision, i) => (
            <article key={decision.title}>
              <span className="decision-number">0{i + 1}</span>
              <div>
                <h3>{decision.title}</h3>
                <p>{decision.detail}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
      <section className="panel">
        <div className="panel-header">
          <h2>3분 확인 순서</h2>
          <a href={href(sample.id)} className="quiet-link">
            도구 열기 <ArrowRight size={16} />
          </a>
        </div>
        <div className="panel-body">
          <ol className="walkthrough">
            {sample.steps.map(step => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
      </section>
      <div className="attribution">
        <h3>제작 방식</h3>
        <p>
          권준의 지원 목표를 바탕으로 ChatGPT와 협업해
          조사·설계·구현·검증했습니다. 공개 요구를 해석해 만든 독립
          프로젝트이며, 회사가 의뢰하거나 승인한 공식 과제가 아닙니다.
        </p>
      </div>
    </div>
  );
}
function Evidence({ sample }: { sample: WorkSample }) {
  return (
    <div className="document-page">
      <section className="panel">
        <div className="panel-header">
          <h2>공개 출처</h2>
          <span className="text-muted">확인 {sourceCheckedDate}</span>
        </div>
        <div className="panel-body source-list">
          {sample.sources.map(source => (
            <a
              href={source.url}
              key={source.url}
              target="_blank"
              rel="noreferrer"
            >
              <div>
                <strong>{source.label}</strong>
                <p>{source.supports}</p>
                <span className="source-domain">
                  {new URL(source.url).hostname}
                </span>
              </div>
              <ExternalLink size={17} />
            </a>
          ))}
        </div>
      </section>
      <section className="panel">
        <div className="panel-header">
          <h2>동작을 확인한 범위</h2>
          <span className="tag success">v{buildInfo.version}</span>
        </div>
        <div className="panel-body">
          <div className="verification-line">
            <FileCheck2 size={23} />
            <div>
              <strong>프로젝트 엔진 테스트 {buildInfo.testCount}개</strong>
              <p>{buildInfo.testStatus}</p>
            </div>
          </div>
          <p className="form-note">
            여섯 도구의 전체 합계입니다. 실제 회사의 운영 성과나 모든 입력에
            대한 품질 보증을 의미하지 않습니다. 회사별 테스트·명령·검수 기록은
            저장소에서 확인할 수 있습니다.
          </p>
          <a
            className="button secondary"
            href={buildInfo.sourceUrl}
            target="_blank"
            rel="noreferrer"
          >
            <Github size={16} /> 소스와 검증 기록 <ExternalLink size={14} />
          </a>
        </div>
      </section>
      <section className="panel">
        <div className="panel-header">
          <h2>사용 전에 알아둘 범위</h2>
        </div>
        <div className="panel-body">
          <ul className="scope-list">
            {sample.limits.map(limit => (
              <li key={limit}>{limit}</li>
            ))}
          </ul>
        </div>
      </section>
      <section className="download-strip">
        <div>
          <h3>이 과제의 설명을 파일로 가져가기</h3>
          <p>배경·설계·확인 순서·한계·출처를 담은 Markdown입니다.</p>
        </div>
        <button
          type="button"
          className="button primary"
          onClick={() =>
            downloadText(
              `${sample.product}-work-sample.md`,
              briefMarkdown(sample),
              'text/markdown;charset=utf-8'
            )
          }
        >
          <ArrowDownToLine size={17} /> 설명서 내려받기
        </button>
      </section>
    </div>
  );
}
function Workspace({ sample, view }: { sample: WorkSample; view: View }) {
  const [copied, setCopied] = useState(false);
  const Module = modules[sample.id];
  const copyLink = async () => {
    const url = `${window.location.href.split('#')[0]}${href(sample.id)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      downloadText(`${sample.product}-link.txt`, url);
    }
  };
  return (
    <div className="workspace">
      <header className="workspace-header">
        <a href={href(sample.id)} className="product-brand">
          <span className="brand-mark">
            <Layers3 size={18} />
          </span>
          <strong>{sample.product}</strong>
          <span>by {creator.name}</span>
        </a>
        <div className="header-context">
          <span>{sample.company}</span>
          <span className="tag neutral">지원용 독립 제작 과제</span>
        </div>
        <a
          className="icon-link"
          href={`${buildInfo.sourceUrl}/src/modules/${sample.id}`}
          target="_blank"
          rel="noreferrer"
          aria-label="이 도구의 GitHub 소스 보기"
        >
          <Github size={19} />
        </a>
      </header>
      <aside className="workspace-rail">
        <div className="rail-context">
          <p className="eyebrow">{sample.category}</p>
          <h2>{sample.outcome}</h2>
          <p className="rail-role">{sample.role}</p>
        </div>
        <Navigation sample={sample} view={view} />
        <section className="rail-walkthrough">
          <p className="rail-label">3분 확인 순서</p>
          <ol>
            {sample.steps.map((step, i) => (
              <li key={step}>
                <span>0{i + 1}</span>
                <p>{step}</p>
              </li>
            ))}
          </ol>
        </section>
        <div className="rail-note">
          <span className="status-dot" /> 브라우저에서 처리
          <p>
            외부 연결 없이 합성 예제로 시작합니다. 입력을 바꿔 동작을
            확인하세요.
          </p>
        </div>
      </aside>
      <div className="workspace-content">
        <Navigation sample={sample} view={view} mobile />
        <main id="main" className="work-main" tabIndex={-1}>
          <div className="page-heading">
            <div>
              <p className="eyebrow">
                {sample.product.toUpperCase()} /{' '}
                {view === 'work'
                  ? 'INTERACTIVE WORK SAMPLE'
                  : view === 'notes'
                    ? 'DESIGN NOTES'
                    : 'EVIDENCE & SOURCES'}
              </p>
              <h1>
                {view === 'work'
                  ? sample.title
                  : view === 'notes'
                    ? '업무 요구를 어떻게 구현했는가'
                    : '직접 확인할 수 있는 근거'}
              </h1>
              <p>
                {view === 'work'
                  ? sample.description
                  : view === 'notes'
                    ? '공개 자료에서 선택한 과제와 구현의 판단을 설명합니다.'
                    : '출처와 검증 범위를 확인하고 설명서를 가져갈 수 있습니다.'}
              </p>
            </div>
            <button
              type="button"
              className="button ghost copy-link"
              onClick={copyLink}
              aria-label="이 회사의 시연 링크 복사"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              <span>{copied ? '복사됨' : '링크 복사'}</span>
            </button>
          </div>
          {view === 'work' ? (
            <ModuleBoundary key={sample.id} company={sample.id}>
              <Suspense
                fallback={
                  <div className="loading-panel" role="status">
                    작업 도구를 불러오는 중입니다…
                  </div>
                }
              >
                <Module />
              </Suspense>
            </ModuleBoundary>
          ) : view === 'notes' ? (
            <Notes sample={sample} />
          ) : (
            <Evidence sample={sample} />
          )}
        </main>
        <footer className="workspace-footer">
          <span>
            {creator.name} · {sample.product} · v{buildInfo.version}
          </span>
          <span>합성 예제 기반의 개인 지원 과제</span>
          <a href={`mailto:${creator.email}`}>
            제작자에게 연락 <ArrowRight size={13} />
          </a>
        </footer>
      </div>
    </div>
  );
}
export default function App() {
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const change = () => {
      setHash(window.location.hash);
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', change);
    return () => window.removeEventListener('hashchange', change);
  }, []);
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  const sample = samples.find(s => s.id === parts[0]);
  const validView =
    !parts[1] || parts[1] === 'notes' || parts[1] === 'evidence';
  const view: View =
    parts[1] === 'notes'
      ? 'notes'
      : parts[1] === 'evidence'
        ? 'evidence'
        : 'work';
  useEffect(() => {
    document.title = sample
      ? `${sample.product} · 권준 | ${sample.company}`
      : 'KWON.WORK · 권준의 업무 실증 도구';
  }, [sample]);
  return (
    <>
      <a
        className="skip-link"
        href="#main"
        onClick={event => {
          event.preventDefault();
          document.getElementById('main')?.focus();
        }}
      >
        본문으로 이동
      </a>
      {!parts.length ? (
        <Landing />
      ) : sample && validView && parts.length <= 2 ? (
        <Workspace key={sample.id} sample={sample} view={view} />
      ) : (
        <main id="main" tabIndex={-1} className="not-found">
          <p className="eyebrow">PAGE NOT FOUND</p>
          <h1>해당 작업 화면이 없습니다.</h1>
          <a className="button primary" href="#/">
            작업 모음으로 돌아가기 <ArrowRight size={16} />
          </a>
        </main>
      )}
    </>
  );
}
