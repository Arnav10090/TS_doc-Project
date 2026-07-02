import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
const mockState = vi.hoisted(() => ({
  tsType: 'Level 2' as string | null,
  nextSuggestion: null as any,
  generateDrawioSuggestion: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}))

vi.mock('../../../store/project.store', () => ({
  useProjectStore: (selector?: (s: Record<string, unknown>) => unknown) => {
    const state = {
      tsType: mockState.tsType,
      setProject: () => {},
      solutionName: 'Test Solution',
      solutionFullName: 'Test Solution Full Name',
      clientName: 'Test Client',
      clientLocation: 'Test Location',
    }
    return typeof selector === 'function' ? selector(state) : state
  },
}))

vi.mock('../../../api/aiSuggestions', () => ({
  getAISuggestionsStatus: vi.fn(async () => ({ groq_configured: true })),
  generateAISuggestion: vi.fn(async () => mockState.nextSuggestion),
  generateDrawioSuggestion: (...args: unknown[]) => mockState.generateDrawioSuggestion(...args),
}))


vi.mock('react-hot-toast', () => ({
  default: {
    success: (...args: unknown[]) => mockState.toastSuccess(...args),
    error: (...args: unknown[]) => mockState.toastError(...args),
  },
}))

vi.mock('../../input/PredefinedSectionEditor', () => ({
  default: () => <div data-testid="predefined-editor">Predefined editor</div>,
}))

vi.mock('../../input/CustomSectionInput', () => ({
  default: () => <div data-testid="custom-section-editor">Custom section editor</div>,
}))

import SectionInputPanel from '../SectionInputPanel'

describe('SectionInputPanel AI suggestions end-to-end workflows', () => {
  beforeEach(() => {
    mockState.tsType = 'Level 2'
    mockState.nextSuggestion = {
      section_key: 'introduction',
      section_title: 'Introduction',
      suggestion_mode: 'predefined',
      structured_import_available: true,
      content: '<p>Generated narrative</p>',
      subsection_suggestions: null,
      historical_context_available: false,
      context_sources: [],
      context_txt_used: false,
    }
    mockState.generateDrawioSuggestion.mockReset()
    mockState.toastSuccess.mockReset()
    mockState.toastError.mockReset()
    vi.clearAllMocks()
  })

  it('runs predefined rich-text and table workflows from suggestion to import to explicit save', async () => {
    const onContentChange = vi.fn()
    const onSaveSection = vi.fn()
    const sectionContents = {
      introduction: { html: '<p>Old narrative</p>' },
      tech_stack: { rows: [{ component: 'Old PLC', technology: 'Legacy' }] },
    }

    const { rerender } = render(
      <SectionInputPanel
        projectId="project-1"
        activeSectionKey="introduction"
        sectionContents={sectionContents}
        onContentChange={onContentChange}
        onSaveSection={onSaveSection}
        width={600}
        leftOffset={0}
        isNarrowScreen={false}
      />,
    )

    await waitFor(() => expect(screen.getByRole('button', { name: /AI Suggestions/i })).not.toBeDisabled())
    fireEvent.click(screen.getByRole('button', { name: /AI Suggestions/i }))
    fireEvent.click(await screen.findByRole('button', { name: 'Import Suggestion' }))

    await waitFor(() => expect(onContentChange).toHaveBeenCalled())
    expect(onContentChange).toHaveBeenCalledWith(
      'introduction',
      expect.objectContaining({
        heading: 'INTRODUCTION',
        paragraphs: ['<p>Generated narrative</p>'],
        tender_reference: '',
        tender_date: '',
      }),
    )
    expect(onSaveSection).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'SAVE' }))
    expect(onSaveSection).toHaveBeenLastCalledWith('introduction')

    mockState.nextSuggestion = {
      section_key: 'tech_stack',
      section_title: 'Technology Stack',
      suggestion_mode: 'predefined',
      structured_import_available: true,
      content: {
        rows: [{ component: 'New PLC', technology: 'Modern platform' }],
      },
      subsection_suggestions: null,
      historical_context_available: false,
      context_sources: [],
      context_txt_used: false,
    }

    rerender(
      <SectionInputPanel
        projectId="project-1"
        activeSectionKey="tech_stack"
        sectionContents={sectionContents}
        onContentChange={onContentChange}
        onSaveSection={onSaveSection}
        width={600}
        leftOffset={0}
        isNarrowScreen={false}
      />,
    )

    await waitFor(() => expect(screen.getByRole('button', { name: /AI Suggestions/i })).not.toBeDisabled())
    fireEvent.click(screen.getByRole('button', { name: /AI Suggestions/i }))
    fireEvent.click(await screen.findByRole('button', { name: 'Import Suggestion' }))

    await waitFor(() => expect(onContentChange).toHaveBeenLastCalledWith(
      'tech_stack',
      expect.objectContaining({
        rows: [{ component: 'New PLC', technology: 'Modern platform' }],
      }),
    ))
    fireEvent.click(screen.getByRole('button', { name: 'SAVE' }))
    expect(onSaveSection).toHaveBeenLastCalledWith('tech_stack')
  })

  it('suppresses the AI button for excluded predefined sections', () => {
    render(
      <SectionInputPanel
        projectId="project-1"
        activeSectionKey="cover"
        sectionContents={{ cover: {} }}
        width={600}
        leftOffset={0}
        isNarrowScreen={false}
      />,
    )

    expect(screen.queryByRole('button', { name: /AI Suggestions/i })).not.toBeInTheDocument()
  })

  it('imports custom multi-subsection suggestions without changing subsection structure', async () => {
    const onContentChange = vi.fn()
    const onSaveSection = vi.fn()
    const customSectionKey = 'custom_section_1704067200000_a1b2c3d4-e5f6-7890-abcd-ef1234567890'
    const sectionContents = {
      [customSectionKey]: {
        title: 'Custom Scope',
        insertAfterKey: 'features',
        displayMode: 'section',
        subsections: [
          {
            key: 'custom_subsection_1704067200001_a1b2c3d4-e5f6-7890-abcd-ef1234567891',
            name: 'Narrative',
            contentType: 'paragraph',
            data: { html: '<p>Old paragraph</p>' },
          },
          {
            key: 'custom_subsection_1704067200002_a1b2c3d4-e5f6-7890-abcd-ef1234567892',
            name: 'Equipment',
            contentType: 'table',
            data: { rows: [{ item: 'Old item' }] },
          },
          {
            key: 'custom_subsection_1704067200003_a1b2c3d4-e5f6-7890-abcd-ef1234567893',
            name: 'Architecture',
            contentType: 'image',
            data: {
              images: [{ base64: 'old', filename: 'existing.png', mimeType: 'image/png' }],
            },
          },
        ],
      },
    }

    mockState.nextSuggestion = {
      section_key: customSectionKey,
      section_title: 'Custom Scope',
      suggestion_mode: 'custom',
      structured_import_available: true,
      content: null,
      subsection_suggestions: [
        {
          subsection_index: 0,
          subsection_name: 'Narrative',
          type: 'paragraph',
          structured_import_available: true,
          content: '<p>Generated paragraph</p>',
        },
        {
          subsection_index: 1,
          subsection_name: 'Equipment',
          type: 'table',
          structured_import_available: true,
          content: { rows: [{ item: 'New item' }] },
        },
        {
          subsection_index: 2,
          subsection_name: 'Architecture',
          type: 'image',
          structured_import_available: true,
          content: { caption: 'Updated architecture description' },
        },
      ],
      historical_context_available: false,
      context_sources: [],
      context_txt_used: false,
    }

    render(
      <SectionInputPanel
        projectId="project-1"
        activeSectionKey={customSectionKey}
        sectionContents={sectionContents}
        onContentChange={onContentChange}
        onSaveSection={onSaveSection}
        width={600}
        leftOffset={0}
        isNarrowScreen={false}
      />,
    )

    await waitFor(() => expect(screen.getByRole('button', { name: /AI Suggestions/i })).not.toBeDisabled())
    fireEvent.click(screen.getByRole('button', { name: /AI Suggestions/i }))
    fireEvent.click(await screen.findByRole('button', { name: 'Import Suggestion' }))

    await waitFor(() => expect(onContentChange).toHaveBeenCalledTimes(1))
    const [, updated] = onContentChange.mock.calls[0]

    expect(updated.subsections).toHaveLength(3)
    expect(updated.subsections.map((subsection: any) => subsection.contentType)).toEqual([
      'paragraph',
      'table',
      'image',
    ])
    expect(updated.subsections[0].data.html).toBe('<p>Generated paragraph</p>')
    expect(updated.subsections[1].data.rows).toEqual([{ item: 'New item' }])
    expect(updated.subsections[2].data.images).toEqual([
      { base64: 'old', filename: 'existing.png', mimeType: 'image/png' },
    ])

    fireEvent.click(screen.getByRole('button', { name: 'SAVE' }))
    expect(onSaveSection).toHaveBeenCalledWith(customSectionKey)
  })

  it('generates Draw.io XML for Gantt suggestions and copies it to the clipboard', async () => {
    const writeText = vi.fn(async () => undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })
    mockState.nextSuggestion = {
      section_key: 'overall_gantt',
      section_title: 'Overall Gantt',
      suggestion_mode: 'predefined',
      structured_import_available: true,
      content: { rows: [{ task: 'Kickoff', start_week: 1, duration_weeks: 1 }] },
      subsection_suggestions: null,
      historical_context_available: false,
      context_sources: [],
      context_txt_used: false,
    }
    mockState.generateDrawioSuggestion.mockResolvedValue({
      drawio_xml: '<mxGraphModel><root /></mxGraphModel>',
      chart_instructions: '1. Open draw.io 2. Import XML',
    })

    render(
      <SectionInputPanel
        projectId="project-1"
        activeSectionKey="overall_gantt"
        sectionContents={{ overall_gantt: {} }}
        width={600}
        leftOffset={0}
        isNarrowScreen={false}
      />,
    )

    await waitFor(() => expect(screen.getByRole('button', { name: /AI Suggestions/i })).not.toBeDisabled())
    fireEvent.click(screen.getByRole('button', { name: /AI Suggestions/i }))
    fireEvent.click(await screen.findByRole('button', { name: 'Generate Draw.io Chart' }))

    expect(await screen.findByText('<mxGraphModel><root /></mxGraphModel>')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Copy XML' }))

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith('<mxGraphModel><root /></mxGraphModel>')
    })
  })

  it('auto-generates Draw.io XML for system configuration when AI suggestions are opened', async () => {
    mockState.nextSuggestion = {
      section_key: 'system_config',
      section_title: 'System Configuration',
      suggestion_mode: 'predefined',
      structured_import_available: true,
      content: {
        intro_text: 'Architecture diagram guidance',
        placeholder_text: '/[Architecture diagram to be inserted]/',
        note: 'Upload the exported PNG after editing in draw.io.',
      },
      subsection_suggestions: null,
      historical_context_available: false,
      context_sources: [],
      context_txt_used: false,
    }
    mockState.generateDrawioSuggestion.mockResolvedValue({
      drawio_xml: '<mxGraphModel><root><mxCell id="0" /></root></mxGraphModel>',
      chart_instructions: 'Open draw.io, import the XML, export PNG, and upload it back.',
    })

    render(
      <SectionInputPanel
        projectId="project-1"
        activeSectionKey="system_config"
        sectionContents={{ system_config: {} }}
        width={600}
        leftOffset={0}
        isNarrowScreen={false}
      />,
    )

    await waitFor(() => expect(screen.getByRole('button', { name: /AI Suggestions/i })).not.toBeDisabled())
    fireEvent.click(screen.getByRole('button', { name: /AI Suggestions/i }))

    expect(
      await screen.findByText('<mxGraphModel><root><mxCell id="0" /></root></mxGraphModel>'),
    ).toBeInTheDocument()
    await waitFor(() => {
      expect(mockState.generateDrawioSuggestion).toHaveBeenCalledWith(
        'project-1',
        'system_config',
        {},
      )
    })
  })

  it('disables AI suggestions for legacy projects with null ts_type while preserving manual save', async () => {
    mockState.tsType = null
    const onSaveSection = vi.fn()

    render(
      <SectionInputPanel
        projectId="legacy-project"
        activeSectionKey="introduction"
        sectionContents={{ introduction: { tender_reference: 'REF-LEGACY' } }}
        onSaveSection={onSaveSection}
        width={600}
        leftOffset={0}
        isNarrowScreen={false}
      />,
    )

    const aiButton = screen.getByRole('button', { name: /AI Suggestions/i })
    expect(aiButton).toBeDisabled()
    expect(aiButton).toHaveAttribute(
      'title',
      'Select a TS type for this project to enable AI suggestions',
    )

    fireEvent.click(screen.getByRole('button', { name: 'SAVE' }))
    expect(onSaveSection).toHaveBeenCalledWith('introduction')
  })
})


