import { Icon } from '../icons'

interface AppHeaderProps {
  onHowItWorks: () => void
}

export function AppHeader({ onHowItWorks }: AppHeaderProps) {
  return (
    <header className="app-header">
      <div className="brand-lockup">
        <Icon name="logo" className="brand-icon" />
        <span>ContextPatch AI</span>
      </div>
      <div className="replay-lockup" aria-label="Replay mode status">
        <span className="mode-stamp">REPLAY MODE</span>
        <span>Recorded DataHub Context Replay</span>
      </div>
      <button className="quiet-button how-button" type="button" onClick={onHowItWorks}>
        <Icon name="help" />
        How it works
      </button>
    </header>
  )
}

