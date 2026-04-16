import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import CompletionBadge from '../CompletionBadge'

describe('CompletionBadge', () => {
  it('should render checkmark for complete status', () => {
    render(<CompletionBadge status="complete" />)
    expect(screen.getByText('✅')).toBeInTheDocument()
  })

  it('should render yellow circle for visited status', () => {
    render(<CompletionBadge status="visited" />)
    expect(screen.getByText('🟡')).toBeInTheDocument()
  })

  it('should render white circle for not_started status', () => {
    render(<CompletionBadge status="not_started" />)
    expect(screen.getByText('⚪')).toBeInTheDocument()
  })
})
