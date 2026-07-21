import type { ImpactedAsset } from '../../../../packages/shared/src/types'
import { Icon, type IconName } from '../icons'

interface LineageCanvasProps {
  nodes: ImpactedAsset[]
  selected: string
  onSelect: (urn: string) => void
}

const chainNames = [
  'stg_dsp_streams',
  'int_royalty_calculation',
  'royalty_ledger',
  'artist_monthly_payout',
  'finance_reconciliation_dashboard',
]

function iconFor(type: string): IconName {
  if (type === 'dashboard') return 'chart'
  if (type === 'dataset') return 'table'
  return 'database'
}

export function LineageCanvas({ nodes, selected, onSelect }: LineageCanvasProps) {
  const lookup = new Map(nodes.map((node) => [node.displayName, node]))
  const chain = chainNames.map((name) => lookup.get(name)).filter(Boolean) as ImpactedAsset[]
  return (
    <section className="lineage-section" aria-labelledby="lineage-title">
      <div className="section-heading-row">
        <p className="section-label" id="lineage-title">Lineage graph</p>
        <div className="lineage-legend" aria-label="Impact legend">
          <span><i className="legend-dot direct" />Direct impact</span>
          <span><i className="legend-dot indirect" />Indirect impact</span>
          <span><i className="legend-dot healthy" />Verified endpoint</span>
        </div>
      </div>
      <div className="lineage-flow">
        <button type="button" className="lineage-node source" onClick={() => onSelect('source')} aria-pressed={selected === 'source'}>
          <span className="node-top"><Icon name="database" /><Icon name="warning" className="node-status" /></span>
          <strong>raw_dsp_settlements</strong>
          <small>Source</small>
        </button>
        {chain.map((node, index) => {
          const isLast = index === chain.length - 1
          return (
            <div className="node-with-edge" key={node.urn}>
              <Icon name="arrow-right" className="lineage-arrow" />
              <button
                type="button"
                className={`lineage-node ${isLast ? 'healthy' : node.impactLevel} ${selected === node.urn ? 'selected' : ''}`}
                onClick={() => onSelect(node.urn)}
                aria-pressed={selected === node.urn}
              >
                <span className="node-top"><Icon name={iconFor(node.assetType)} />{isLast ? <Icon name="check" className="node-status" /> : <Icon name="warning" className="node-status" />}</span>
                <strong>{node.displayName}</strong>
                <small>{node.assetType}</small>
              </button>
            </div>
          )
        })}
      </div>
    </section>
  )
}

