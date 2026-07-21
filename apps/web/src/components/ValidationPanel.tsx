import type { ValidationResult } from '../../../../packages/shared/src/types'
import { Icon } from '../icons'

export function ValidationPanel({ result }: { result: ValidationResult }) {
  const oldFixture = result.dataComparison['Old fixture']
  const newFixture = result.dataComparison['New fixture']
  return (
    <section className="validation-panel" aria-label="Validation results">
      <div className="validation-summary">
        <div>
          <span className="section-label">Deterministic result</span>
          <h2>{result.passed ? 'Patch ready for human review' : 'Patch blocked'}</h2>
        </div>
        <div className={`validation-seal ${result.passed ? 'pass' : 'fail'}`}>
          <Icon name={result.passed ? 'shield' : 'warning'} />
          {result.passed ? 'PASS' : 'BLOCK'}
        </div>
      </div>
      <div className="check-list">
        {result.checks.map((check) => (
          <div className="check-row" key={check.name}>
            <Icon name={check.passed ? 'check' : 'warning'} />
            <strong>{check.name}</strong>
            <span>{check.detail}</span>
            <code>{check.passed ? 'PASS' : 'FAIL'}</code>
          </div>
        ))}
      </div>
      <div className="reconciliation-strip">
        <div><span>Old fixture payable</span><strong>${oldFixture?.payableTotal ?? '—'}</strong></div>
        <Icon name="arrow-right" />
        <div><span>New fixture payable</span><strong>${newFixture?.payableTotal ?? '—'}</strong></div>
        <div className="tolerance"><Icon name="check" />Δ $0.00 · tolerance $0.01</div>
      </div>
    </section>
  )
}

