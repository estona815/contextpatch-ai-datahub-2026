import type { IncidentReport, SchemaChange } from '../../../../packages/shared/src/types'
import { Icon } from '../icons'

const stages = ['Incident', 'Context', 'Impact', 'Patch', 'Validate', 'Approve', 'Write-back'] as const

interface StageRailProps {
  incident: IncidentReport
  changes: SchemaChange[]
  activeStage: number
  approved: boolean
  onSelect: (index: number) => void
}

export function StageRail({ incident, changes, activeStage, approved, onSelect }: StageRailProps) {
  return (
    <aside className="stage-rail" aria-label="Incident stages">
      <section className="incident-summary">
        <p className="section-label">Incident</p>
        <h1>{incident.title}</h1>
        <div className="source-block">
          <span>Source (root cause)</span>
          <strong>{incident.sourceAssetHint}</strong>
        </div>
        <div className="mapping-block">
          <span>Changed mappings</span>
          {changes.map((change) => (
            <div className="mapping-row" key={change.changeId}>
              <code>{change.oldField}</code>
              <Icon name="arrow-right" />
              <code>{change.newField}</code>
            </div>
          ))}
        </div>
      </section>

      <nav className="stage-list">
        <p className="section-label">Stages</p>
        {stages.map((stage, index) => {
          const complete = index < activeStage || (approved && index <= 6)
          const active = index === activeStage
          return (
            <button
              type="button"
              key={stage}
              className={`stage-row ${active ? 'active' : ''} ${complete ? 'complete' : ''}`}
              onClick={() => onSelect(index)}
              aria-current={active ? 'step' : undefined}
            >
              <span className="stage-marker">{complete ? <Icon name="check" /> : index + 1}</span>
              <span className="stage-number">{index + 1}</span>
              <span>{stage}</span>
            </button>
          )
        })}
      </nav>

      <div className="rail-tip">
        <Icon name="lock" />
        <p><strong>Approval boundary</strong><br />No source file or metadata mutation occurs before approval.</p>
      </div>
    </aside>
  )
}
