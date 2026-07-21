import { useMemo, useState } from 'react'
import type { ReplayOutcome } from '../../../packages/shared/src/types'
import replayJson from './data/replay-outcome.json'
import { AppHeader } from './components/AppHeader'
import { DiffViewer } from './components/DiffViewer'
import { EvidenceInspector, type Decision } from './components/EvidenceInspector'
import { LineageCanvas } from './components/LineageCanvas'
import { StageRail } from './components/StageRail'
import { TraceRail } from './components/TraceRail'
import { ValidationPanel } from './components/ValidationPanel'
import { Icon } from './icons'
import './styles.css'

const replay = replayJson as unknown as ReplayOutcome

function StageDetail({ stage }: { stage: number }) {
  if (stage === 0) {
    return (
      <section className="stage-detail">
        <p className="section-label">Incident intake</p>
        <h2>{replay.incident.title}</h2>
        <p>{replay.incident.description}</p>
        <div className="detail-grid">
          <div><span>Environment</span><strong>{replay.incident.environment}</strong></div>
          <div><span>Repository</span><strong>{replay.incident.repositoryPath}</strong></div>
          <div><span>Safety</span><strong>No external writes</strong></div>
        </div>
      </section>
    )
  }
  if (stage === 1) {
    return (
      <section className="stage-detail">
        <p className="section-label">Context bundle</p>
        <h2>Six recorded MCP calls, each linked to evidence</h2>
        <p>Structural metadata is evidence. Descriptions and query text remain untrusted content and cannot issue instructions.</p>
        <div className="context-call-list">
          {replay.trace.map((event) => <div key={event.traceId}><Icon name="check" /><code>{event.tool}</code><span>{event.responseSummary}</span></div>)}
        </div>
      </section>
    )
  }
  return (
    <section className="stage-detail">
      <p className="section-label">Impact analysis</p>
      <h2>{replay.impactGraph.blastRadius.total} downstream assets require review</h2>
      <p>{replay.impactGraph.blastRadius.direct} directly reference changed fields; {replay.impactGraph.blastRadius.indirect} inherit impact through bounded lineage.</p>
      <div className="impact-table">
        {replay.impactGraph.nodes.map((node) => (
          <div key={node.urn}><i className={`impact-line ${node.impactLevel}`} /><strong>{node.displayName}</strong><span>{node.owner}</span><code>{node.impactLevel} · hop {node.lineageDistance}</code></div>
        ))}
      </div>
    </section>
  )
}

function WriteBackPanel({ decision }: { decision: Decision }) {
  const approved = decision === 'approved'
  return (
    <section className="writeback-panel">
      <div className="writeback-head">
        <Icon name={approved ? 'check' : 'lock'} />
        <div>
          <p className="section-label">DataHub write-back</p>
          <h2>{approved ? 'Resolution package recorded locally' : 'Approval required'}</h2>
          <p>{replay.writeBackPreview.note}</p>
        </div>
      </div>
      <div className="writeback-operations">
        {replay.writeBackPreview.operations.map((operation, index) => (
          <div key={`${String(operation.tool)}-${index}`}>
            <span className="operation-index">0{index + 1}</span>
            <code>{String(operation.tool)}</code>
            <strong>{String(operation.target)}</strong>
            <span className={approved ? 'local-status' : 'preview-status'}>{approved ? 'locally recorded' : 'preview only'}</span>
          </div>
        ))}
      </div>
      <div className="truth-boundary"><Icon name="warning" /><span>This is not a live DataHub mutation. Full Mode must execute and re-read these operations against an approved local DataHub instance.</span></div>
    </section>
  )
}

function HowDialog({ onClose }: { onClose: () => void }) {
  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="how-dialog" role="dialog" aria-modal="true" aria-labelledby="how-title" onMouseDown={(event) => event.stopPropagation()}>
        <button type="button" className="dialog-close" onClick={onClose} aria-label="Close">×</button>
        <p className="section-label">How it works</p>
        <h2 id="how-title">Context before code. Evidence before approval.</h2>
        <ol>
          <li><b>Retrieve</b><span>Replay six bounded DataHub MCP calls with provenance.</span></li>
          <li><b>Analyze</b><span>Map semantic renames, units, and downstream lineage deterministically.</span></li>
          <li><b>Patch</b><span>Create a structured PatchPlan inside an allowlisted sandbox.</span></li>
          <li><b>Validate</b><span>Check SQL, paths, secrets, three fixtures, and payout totals.</span></li>
          <li><b>Approve</b><span>Require a person before local patch or metadata write-back.</span></li>
        </ol>
        <button className="action-button approve" type="button" onClick={onClose}>Return to workbench</button>
      </section>
    </div>
  )
}

export default function App() {
  const [activeStage, setActiveStage] = useState(3)
  const [tab, setTab] = useState<'patch' | 'validation'>('patch')
  const [traceExpanded, setTraceExpanded] = useState(false)
  const [decision, setDecision] = useState<Decision>('pending')
  const [selectedFilePath, setSelectedFilePath] = useState(replay.patchPlan.files[0].path)
  const [selectedNode, setSelectedNode] = useState(replay.impactGraph.nodes.find((node) => node.displayName === 'int_royalty_calculation')?.urn ?? 'source')
  const [showHow, setShowHow] = useState(false)

  const selectedFile = useMemo(
    () => replay.patchPlan.files.find((file) => file.path === selectedFilePath) ?? replay.patchPlan.files[0],
    [selectedFilePath],
  )

  function selectStage(index: number) {
    setActiveStage(index)
    if (index === 3) setTab('patch')
    if (index === 4 || index === 5) setTab('validation')
  }

  function handleDecision(next: Decision) {
    setDecision(next)
    if (next === 'approved') {
      setActiveStage(6)
      return
    }
    if (next === 'revision' || next === 'rejected') {
      setActiveStage(3)
      setTab('patch')
      return
    }
    if (next === 'exported') {
      const blob = new Blob([JSON.stringify(replay, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'contextpatch-replay-outcome.json'
      link.click()
      URL.revokeObjectURL(url)
    }
  }

  return (
    <div className="app-shell">
      <AppHeader onHowItWorks={() => setShowHow(true)} />
      <div className="app-body">
        <StageRail incident={replay.incident} changes={replay.schemaChanges} activeStage={activeStage} approved={decision === 'approved'} onSelect={selectStage} />
        <main className="workspace">
          <LineageCanvas nodes={replay.impactGraph.nodes} selected={selectedNode} onSelect={setSelectedNode} />
          <TraceRail events={replay.trace} expanded={traceExpanded} onToggle={() => setTraceExpanded((value) => !value)} />

          {activeStage <= 2 ? (
            <StageDetail stage={activeStage} />
          ) : activeStage === 6 ? (
            <WriteBackPanel decision={decision} />
          ) : (
            <section className="workbench-lower">
              <div className="workspace-tabs" role="tablist" aria-label="Patch workspace">
                <button type="button" role="tab" aria-selected={tab === 'patch'} className={tab === 'patch' ? 'active' : ''} onClick={() => { setTab('patch'); setActiveStage(3) }}>Patch diff</button>
                <button type="button" role="tab" aria-selected={tab === 'validation'} className={tab === 'validation' ? 'active' : ''} onClick={() => { setTab('validation'); setActiveStage(4) }}>Validation</button>
                <span className="workspace-target">Incident <code>{replay.incident.incidentId}</code></span>
              </div>
              {tab === 'patch' ? (
                <DiffViewer file={selectedFile} files={replay.patchPlan.files} onSelectFile={setSelectedFilePath} />
              ) : (
                <ValidationPanel result={replay.validation} />
              )}
              <div className="mutation-lock">
                <Icon name={decision === 'approved' ? 'check' : 'lock'} />
                <div><strong>{decision === 'approved' ? 'Local replay receipt created' : 'Mutation preview disabled until approval'}</strong><span>{decision === 'approved' ? 'No live DataHub call was made.' : 'No changes will be written until you approve the patch.'}</span></div>
                <button type="button" disabled={decision !== 'approved'} onClick={() => setActiveStage(6)}>Preview changes</button>
              </div>
            </section>
          )}
        </main>
        <EvidenceInspector plan={replay.patchPlan} changes={replay.schemaChanges} validation={replay.validation} writeBack={replay.writeBackPreview} decision={decision} onDecision={handleDecision} />
      </div>
      <footer className="status-footer">
        <span>Replay ID: <code>{replay.incident.incidentId}</code><Icon name="copy" /></span>
        <strong><span>No API key required</span><i /><span>Synthetic data</span><i /><span>Local replay</span></strong>
        <span><Icon name="clock" />Context recorded: Jul 18, 2026 10:24:31 UTC</span>
      </footer>
      {showHow && <HowDialog onClose={() => setShowHow(false)} />}
    </div>
  )
}
