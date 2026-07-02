import type { ReactNode } from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import EditorPage from '../Editor'
import { mergeSectionContent } from '../../components/sections/predefinedSectionContent'

const mockGetProjectById = vi.fn()
const mockUpdateProject = vi.fn()
const mockGetAllSections = vi.fn()
const mockUpsertSection = vi.fn()
const mockSetProject = vi.fn()
const mockNavigate = vi.fn()

const flushEditorPromises = async () => {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })
}

vi.mock('react-router-dom', () => ({
  useParams: () => ({ projectId: 'project-1' }),
  useLocation: () => ({ hash: '#introduction' }),
  useNavigate: () => mockNavigate,
}))

vi.mock('../../api/projects', () => ({
  getProjectById: (...args: unknown[]) => mockGetProjectById(...args),
  updateProject: (...args: unknown[]) => mockUpdateProject(...args),
}))

vi.mock('../../api/sections', () => ({
  getAllSections: (...args: unknown[]) => mockGetAllSections(...args),
  upsertSection: (...args: unknown[]) => mockUpsertSection(...args),
}))

vi.mock('../../store/project.store', () => ({
  useProjectStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      setProject: mockSetProject,
      solutionName: 'Test Solution',
      solutionFullName: 'Test Solution Full Name',
      clientName: 'Test Client',
      clientLocation: 'Test Location',
    }),
}))

vi.mock('../../contexts/EditorContext', () => ({
  EditorProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

vi.mock('../../components/layout/Header', () => ({
  default: () => <div>Header</div>,
}))

vi.mock('../../components/layout/SectionSidebar', () => ({
  default: () => <div>Sidebar</div>,
}))

vi.mock('../../components/preview/DocumentPreview', () => ({
  default: (props: { sectionContents: Record<string, Record<string, any>> }) => (
    <div>
      <div data-testid="preview-tender-ref">
        {props.sectionContents.introduction?.tender_reference || ''}
      </div>
      <div data-testid="preview-edit-metadata">
        {props.sectionContents.introduction?.__editMetadata ? 'highlighted' : 'clean'}
      </div>
    </div>
  ),
}))

vi.mock('../../components/layout/SectionInputPanel', () => ({
  default: (props: {
    activeSectionKey: string
    saveStatus?: string
    onContentChange?: (sectionKey: string, content: Record<string, any>) => void
    onSaveSection?: (sectionKey: string) => void | Promise<void>
  }) => (
    <div>
      <button
        type="button"
        onClick={() => {
          const currentContent = mergeSectionContent(
            props.activeSectionKey,
            {
              tender_reference: 'REF-001',
              tender_date: '2026-05-20',
            },
            {
              solutionName: 'Test Solution',
              solutionFullName: 'Test Solution Full Name',
              clientName: 'Test Client',
              clientLocation: 'Test Location',
            },
          )

          props.onContentChange?.(props.activeSectionKey, {
            ...currentContent,
            tender_reference: 'REF-UPDATED',
          })
        }}
      >
        Edit section
      </button>
      <button
        type="button"
        onClick={() => {
          void props.onSaveSection?.(props.activeSectionKey)
        }}
      >
        SAVE
      </button>
      <button
        type="button"
        onClick={() => {
          const currentContent = mergeSectionContent(
            props.activeSectionKey,
            {
              tender_reference: 'REF-001',
              tender_date: '2026-05-20',
            },
            {
              solutionName: 'Test Solution',
              solutionFullName: 'Test Solution Full Name',
              clientName: 'Test Client',
              clientLocation: 'Test Location',
            },
          )

          // Simulate AI-imported suggestion into the draft (no save)
          props.onContentChange?.(props.activeSectionKey, {
            ...currentContent,
            tender_reference: 'REF-IMPORTED',
          })
        }}
      >
        Import suggestion
      </button>
      <span data-testid="save-button-label">
        {props.saveStatus === 'saving' ? 'SAVING' : 'SAVE'}
      </span>
    </div>
  ),
}))

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe('Editor explicit save persistence', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-21T10:00:00.000Z'))
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: 1440,
    })

    mockGetProjectById.mockResolvedValue({ id: 'project-1' })
    mockUpdateProject.mockResolvedValue({ id: 'project-1' })
    mockGetAllSections.mockResolvedValue([
      {
        section_key: 'cover',
        content: {},
      },
      {
        section_key: 'introduction',
        content: {
          tender_reference: 'REF-001',
          tender_date: '2026-05-20',
        },
      },
    ])
    mockUpsertSection.mockResolvedValue({
      content: {
        tender_reference: 'REF-UPDATED',
        tender_date: '2026-05-20',
        __editMetadata: {
          version: 1,
          sectionUpdatedAt: '2026-05-21T10:00:00.000Z',
          markers: {
            tender_reference: {
              path: 'tender_reference',
              updatedAt: '2026-05-21T10:00:00.000Z',
            },
          },
        },
      },
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('keeps draft edits out of the preview and backend until SAVE is clicked', async () => {
    render(<EditorPage />)

    await flushEditorPromises()

    expect(screen.getByRole('button', { name: 'Edit section' })).toBeInTheDocument()
    expect(screen.getByTestId('preview-tender-ref')).toHaveTextContent('REF-001')
    expect(screen.getByTestId('preview-edit-metadata')).toHaveTextContent('clean')

    fireEvent.click(screen.getByRole('button', { name: 'Edit section' }))

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })

    expect(screen.getByTestId('save-button-label')).toHaveTextContent('SAVE')
    expect(screen.getByTestId('preview-tender-ref')).toHaveTextContent('REF-001')
    expect(mockUpsertSection).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'SAVE' }))

    await flushEditorPromises()

    expect(mockUpsertSection).toHaveBeenCalledTimes(1)

    expect(mockUpsertSection).toHaveBeenCalledWith(
      'project-1',
      'introduction',
      expect.objectContaining({
        tender_reference: 'REF-UPDATED',
        tender_date: '2026-05-20',
        __editMetadata: expect.objectContaining({
          markers: expect.objectContaining({
            tender_reference: expect.objectContaining({
              path: 'tender_reference',
            }),
          }),
        }),
      }),
    )
    expect(screen.getByTestId('preview-tender-ref')).toHaveTextContent('REF-UPDATED')
    expect(screen.getByTestId('preview-edit-metadata')).toHaveTextContent('clean')
  })

  it('shows persisted edit metadata when the project is loaded again', async () => {
    mockGetAllSections.mockResolvedValue([
      {
        section_key: 'cover',
        content: {},
      },
      {
        section_key: 'introduction',
        content: {
          tender_reference: 'REF-UPDATED',
          tender_date: '2026-05-20',
          __editMetadata: {
            version: 1,
            sectionUpdatedAt: '2026-05-21T10:00:00.000Z',
            markers: {
              tender_reference: {
                path: 'tender_reference',
                updatedAt: '2026-05-21T10:00:00.000Z',
              },
            },
          },
        },
      },
    ])

    render(<EditorPage />)

    await flushEditorPromises()

    expect(screen.getByTestId('preview-tender-ref')).toHaveTextContent('REF-UPDATED')
    expect(screen.getByTestId('preview-edit-metadata')).toHaveTextContent('highlighted')
  })

  it('AI-imported and saved content appears in preview identically to manual content', async () => {
    // prepare upsert to return the AI-imported content as saved
    mockUpsertSection.mockResolvedValueOnce({
      content: {
        tender_reference: 'REF-IMPORTED',
        tender_date: '2026-05-20',
        __editMetadata: {
          version: 1,
          sectionUpdatedAt: '2026-05-21T10:00:00.000Z',
          markers: {
            tender_reference: {
              path: 'tender_reference',
              updatedAt: '2026-05-21T10:00:00.000Z',
            },
          },
        },
      },
    })

    render(<EditorPage />)

    await flushEditorPromises()

    // initial preview shows persisted value
    expect(screen.getByTestId('preview-tender-ref')).toHaveTextContent('REF-001')

    // simulate AI import into draft
    fireEvent.click(screen.getByRole('button', { name: 'Import suggestion' }))

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })

    // draft import alone should not change preview nor trigger backend
    expect(screen.getByTestId('preview-tender-ref')).toHaveTextContent('REF-001')
    expect(mockUpsertSection).not.toHaveBeenCalled()

    // save the imported draft
    fireEvent.click(screen.getByRole('button', { name: 'SAVE' }))

    await flushEditorPromises()

    expect(mockUpsertSection).toHaveBeenCalledTimes(1)
    expect(mockUpsertSection).toHaveBeenCalledWith(
      'project-1',
      'introduction',
      expect.objectContaining({
        tender_reference: 'REF-IMPORTED',
      }),
    )

    // preview should now reflect the saved AI-imported content
    expect(screen.getByTestId('preview-tender-ref')).toHaveTextContent('REF-IMPORTED')
  })
})
