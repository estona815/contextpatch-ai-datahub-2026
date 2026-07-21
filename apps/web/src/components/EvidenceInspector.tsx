import type { PatchPlan, SchemaChange, ValidationResult, WriteBackPreview } from '../../../../packages/shared/src/types'
import { Icon } from '../icons'

export type Decision = 'pending' | 'approved' | 'revision' | 'rejected' | 'exported'

interface EvidenceInspectorProps {
  plan: PatchPlan
  changes: SchemaChange[]
  validation: ValidationResult
  writeBack: WriteBackPreview
  decision: Decision
  onDecision: (decision: Decision) => void
}

const citations = [
  ['Schema change diff', '2'],
  ['Lineage paths', '3'],
  ['Dataset queries', '3'],
  ['Sample data diff', '2'],
]

export function EvidenceInspector({ plan, changes, validation, writeBack, decision, onDecision }: EvidenceInspectorProps) {
  return (
    <aside className="evidence-inspector" aria-label="Evidence and approval">
      <p className="section-label">Evidence & approval</p>
      <section className="owner-block">
        <span>Owner</span>
        <div><b>RD</b><strong>Royalty Data Team</strong></div>
      </section>
      <section className="confidence-block">
        <span>Evidence confidence</span>
        <div className="confidence-value"><strong>{Math.round(plan.confidence * 100)}%</strong><div><i style={{ width: `${plan.confidence * 100}%` }} /></div><small>8/8 signals</small></div>
      </section>
      <section className="assumption-block">
        <h2>Assumptions <Icon name="help" /></h2>
        <ul>{plan.assumptions.map((assumption) => <li key={assumption}>{assumption}</li>)}</ul>
      </section>
      <section className="citation-block">
        <h2>Evidence citations <span>All verified <Icon name="check" /></span></h2>
        {citations.map(([label, count]) => (
          <details className="citation-row" key={label}>
            <summary><Icon name="document" /><span>{label}</span><code>{count}</code><Icon name="check" /><Icon name="chevron" /></summary>
            <p>{label === 'Schema change diff' ? changes.flatMap((change) => change.evidence).slice(0, 2).join(' ') : 'Recorded synthetic DataHub evidence is linked to this review item.'}</p>
          </details>
        ))}
      </section>
      <section className="rollback-block">
        <h2>Rollback plan</h2>
        <p>{plan.rollbackPlan[0]}</p>
        <details><summary>View rollback steps <Icon name="chevron" /></summary><ol>{plan.rollbackPlan.map((step) => <li key={step}>{step}</li>)}</ol></details>
      </section>

      {decision === 'approved' && (
        <div className="decision-receipt" role="status">
          <Icon name="check" />
          <div><strong>Locally approved</strong><span>{writeBack.operations.length} write-back operations recorded as replay preview.</span></div>
        </div>
      )}

      <section className="action-block">
        <p className="section-label">Actions</p>
        <button type="button" className="action-button approve" disabled={!validation.passed || decision === 'approved'} onClick={() => onDecision('approved')}>
          <Icon name="shield" />{decision === 'approved' ? 'Patch Approved' : 'Approve Patch'}
        </button>
        <button type="button" className="action-button" onClick={() => onDecision('revision')}><Icon name="comment" />Request Revision</button>
        <button type="button" className="action-button reject" onClick={() => onDecision('rejected')}><Icon name="ban" />Reject</button>
        <button type="button" className="action-button" onClick={() => onDecision('exported')}><Icon name="download" />Export Only</button>
      </section>
    </aside>
  )
}

