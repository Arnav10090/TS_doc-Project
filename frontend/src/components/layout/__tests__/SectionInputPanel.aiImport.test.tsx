import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { BrowserRouter } from 'react-router-dom'

// Mock the project store to provide a non-null tsType and other fields
vi.mock('../../../store/project.store', () => ({
  useProjectStore: (selector?: (s: Record<string, unknown>) => unknown) => {
    const state = {
      tsType: 'DATA_ANALYSIS',
      setProject: () => {},
      solutionName: 'Test',
      solutionFullName: 'Test Full',
      clientName: 'Client',
      clientLocation: 'Location',
    }
    return typeof selector === 'function' ? selector(state) : state
  },
}))

// Mock the AISuggestionsButton to avoid network calls and directly supply a suggestion
vi.mock('../../shared/AISuggestionsButton', () => ({
  default: (props: { projectId: string; sectionKey: string; onSuggestionReceived?: (s: any) => void }) => (
    <button
      type="button"
      onClick={() =>
        props.onSuggestionReceived?.({ structured_import_available: true, content: '<p>fresh</p>' })
      }
    >
      Mock AI
    </button>
  ),
}))

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock API module used by PredefinedSectionEditor to avoid real network calls
vi.mock('../../../api/sections', () => ({
  getSection: async (projectId: string, sectionKey: string) => ({
    section_key: sectionKey,
    content: { html: '<p>old</p>' },
  }),
  upsertSection: async () => ({}),
  getAllSections: async () => [],
}))

// Mock nested editor components to avoid requiring full Editor context
vi.mock('../../input/PredefinedSectionEditor', () => ({
  default: (props: any) => <div data-testid="predef-editor">Predefined</div>,
}))

vi.mock('../../input/CustomSectionInput', () => ({
  default: (props: any) => <div data-testid="custom-editor">Custom</div>,
}))

// Import after mocks so internal imports are stubbed
import SectionInputPanel from '../SectionInputPanel'

describe('SectionInputPanel AI import integration', () => {
  beforeEach(() => {
    // ensure DOM cleanup mocks reset
    vi.clearAllMocks()
  })

  afterEach(() => {
    // nothing
  })

  it('imports suggestion into draft and does not trigger save until SAVE clicked', async () => {
    const existingContent = { html: '<p>old</p>' }
    const sectionContents: Record<string, Record<string, any>> = { introduction: existingContent }

    const onContentChange = vi.fn()
    const onSaveSection = vi.fn()

    render(
      <BrowserRouter>
        <SectionInputPanel
          projectId="test-project"
          activeSectionKey="introduction"
          sectionContents={sectionContents}
          onContentChange={onContentChange}
          onSaveSection={onSaveSection}
          width={600}
          leftOffset={0}
          isNarrowScreen={false}
        />
      </BrowserRouter>,
    )

    // Click the mocked AI button to produce a suggestion
    fireEvent.click(screen.getByRole('button', { name: 'Mock AI' }))

    // Import Suggestion button should appear in SuggestionPanel
    const importBtn = await screen.findByRole('button', { name: 'Import Suggestion' })
    expect(importBtn).toBeInTheDocument()

    // Click Import Suggestion -> should call onContentChange but NOT onSaveSection
    fireEvent.click(importBtn)

    // Wait for async import to complete and for onContentChange to be invoked
    await waitFor(() => expect(onContentChange).toHaveBeenCalledTimes(1))
    const [sectionKey, updated] = onContentChange.mock.calls[0]
    expect(sectionKey).toBe('introduction')
    expect(updated).toEqual(
      expect.objectContaining({
        heading: 'INTRODUCTION',
        paragraphs: ['<p>fresh</p>'],
        tender_reference: '',
        tender_date: '',
      }),
    )

    // Save should not have been triggered by import
    expect(onSaveSection).not.toHaveBeenCalled()

    // Now click the SAVE button and expect onSaveSection to be called
    const saveBtn = screen.getAllByRole('button', { name: 'SAVE' }).find((b) => b.textContent === 'SAVE')
    expect(saveBtn).toBeTruthy()
    fireEvent.click(saveBtn!)

    expect(onSaveSection).toHaveBeenCalledTimes(1)
    expect(onSaveSection).toHaveBeenCalledWith('introduction')
  })
})
