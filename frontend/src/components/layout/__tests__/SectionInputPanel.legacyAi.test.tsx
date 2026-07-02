import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('../../../store/project.store', () => ({
  useProjectStore: (selector?: (s: Record<string, unknown>) => unknown) => {
    const state = {
      tsType: null,
      setProject: () => {},
      solutionName: 'Test',
      solutionFullName: 'Test Full',
      clientName: 'Client',
      clientLocation: 'Location',
    }
    return typeof selector === 'function' ? selector(state) : state
  },
}))

vi.mock('../../../api/aiSuggestions', () => ({
  getAISuggestionsStatus: vi.fn(async () => ({ groq_configured: true })),
  generateAISuggestion: vi.fn(),
  generateDrawioSuggestion: vi.fn(),
}))

vi.mock('../../input/PredefinedSectionEditor', () => ({
  default: () => <div data-testid="predef-editor">Predefined</div>,
}))

vi.mock('../../input/CustomSectionInput', () => ({
  default: () => <div data-testid="custom-editor">Custom</div>,
}))

import SectionInputPanel from '../SectionInputPanel'

describe('SectionInputPanel legacy AI suggestions handling', () => {
  it('disables AI suggestions with tooltip when project ts_type is null', async () => {
    render(
      <SectionInputPanel
        projectId="test-project"
        activeSectionKey="introduction"
        sectionContents={{ introduction: {} }}
        width={600}
        leftOffset={0}
        isNarrowScreen={false}
      />,
    )

    const button = screen.getByRole('button', { name: /AI Suggestions/i })

    expect(button).toBeDisabled()
    await waitFor(() => {
      expect(button).toHaveAttribute(
        'title',
        'Select a TS type for this project to enable AI suggestions',
      )
    })
  })
})
