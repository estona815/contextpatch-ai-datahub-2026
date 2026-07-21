import type { AgentTraceEvent } from '../../../../packages/shared/src/types'
import { Icon } from '../icons'

interface TraceRailProps {
  events: AgentTraceEvent[]
  expanded: boolean
  onToggle: () => void
}

export function TraceRail({ events, expanded, onToggle }: TraceRailProps) {
  return (
    <section className={`trace-section ${expanded ? 'expanded' : ''}`}>
      <div className="trace-title-row">
        <p className="section-label">MCP Trace <span>(Recorded session)</span></p>
        <span className="trace-complete">{events.length} tools · All completed</span>
      </div>
      <div className="trace-tools">
        {events.map((event) => (
          <button type="button" className="trace-tool" key={event.traceId} title={event.responseSummary}>
            <Icon name="terminal" />
            <code>{event.tool}</code>
            <Icon name="check" className="trace-check" />
          </button>
        ))}
        <button type="button" className="trace-toggle" onClick={onToggle}>
          <Icon name="terminal" />
          {expanded ? 'Hide trace' : 'Show trace'}
        </button>
      </div>
      {expanded && (
        <div className="trace-log" aria-live="polite">
          {events.map((event) => (
            <div key={`${event.traceId}-detail`}>
              <code>{event.tool}</code>
              <span>{event.responseSummary}</span>
              <small>replay · {event.durationMs}ms recorded</small>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

