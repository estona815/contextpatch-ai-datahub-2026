import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('ContextPatch replay workbench', () => {
  it('labels replay truthfully and exposes the generated patch', () => {
    render(<App />)
    expect(screen.getByText('Recorded DataHub Context Replay')).toBeInTheDocument()
    expect(screen.getByText('No API key required')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Patch diff' })).toHaveAttribute('aria-selected', 'true')
  })

  it('shows deterministic validation and requires a human approval click', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('tab', { name: 'Validation' }))
    expect(screen.getByText('Patch ready for human review')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Approve Patch' }))
    expect(screen.getByText('Resolution package recorded locally')).toBeInTheDocument()
    expect(screen.getByText(/not a live DataHub mutation/i)).toBeInTheDocument()
  })

  it('explains the workflow without leaving the page', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'How it works' }))
    expect(screen.getByRole('dialog')).toHaveTextContent('Context before code. Evidence before approval.')
  })
})

