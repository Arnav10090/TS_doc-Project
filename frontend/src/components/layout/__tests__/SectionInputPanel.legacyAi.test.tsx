import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  tsType: null as string | null,
  status: {
    ai_configured: true as boolean | undefined,
    provider: 'ollama' as string | undefined,
    model: 'gemma3:4b' as string | undefined,
    groq_configured: undefined as boolean | undefined,
  },
}))

vi.mock('../../../store/project.store', () => ({
  useProjectStore: (selector?: (s: Record<string, unknown>) => unknown) => {
    const state = {
      tsType: mocks.tsType,
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
  getAISuggestionsStatus: vi.fn(async () => mocks.status),
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

describe('SectionInputPanel AI provider status handling', () => {
  beforeEach(() => {
    mocks.tsType = null
    mocks.status = {
      ai_configured: true,
      provider: 'ollama',
      model: 'gemma3:4b',
      groq_configured: undefined,
    }
  })

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

  it('enables AI suggestions when the selected provider is configured', async () => {
    mocks.tsType = 'TS-01'
    mocks.status = {
      ai_configured: true,
      provider: 'ollama',
      model: 'gemma3:4b',
      groq_configured: false,
    }

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

    await waitFor(() => {
      expect(button).not.toBeDisabled()
    })
  })

  it('keeps accepting legacy groq_configured status responses', async () => {
    mocks.tsType = 'TS-01'
    mocks.status = {
      ai_configured: undefined,
      provider: undefined,
      model: undefined,
      groq_configured: true,
    }

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

    await waitFor(() => {
      expect(button).not.toBeDisabled()
    })
  })
})