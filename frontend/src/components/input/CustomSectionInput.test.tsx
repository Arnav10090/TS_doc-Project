import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import CustomSectionInput from './CustomSectionInput';

const mockRefreshSections = vi.fn().mockResolvedValue(undefined);
const mockUpsertSection = vi.fn().mockResolvedValue(undefined);
const mockDeleteSection = vi.fn().mockResolvedValue(undefined);
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();

vi.mock('../../contexts/EditorContext', () => ({
  useEditor: () => ({
    refreshSections: mockRefreshSections,
  }),
}));

vi.mock('../../api/sections', () => ({
  upsertSection: (...args: unknown[]) => mockUpsertSection(...args),
  deleteSection: (...args: unknown[]) => mockDeleteSection(...args),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

describe('CustomSectionInput', () => {
  const parentSectionKey =
    'custom_section_1704067200000_a1b2c3d4-e5f6-7890-abcd-ef1234567890';
  const childSectionKey =
    'custom_section_1704067200001_b1b2c3d4-e5f6-7890-abcd-ef1234567890';
  const grandchildSectionKey =
    'custom_section_1704067200002_c1b2c3d4-e5f6-7890-abcd-ef1234567890';

  beforeEach(() => {
    vi.clearAllMocks();
    mockRefreshSections.mockResolvedValue(undefined);
    mockUpsertSection.mockResolvedValue(undefined);
    mockDeleteSection.mockResolvedValue(undefined);
  });

  it('deletes a subsection from the custom section sidebar', async () => {
    const onContentChange = vi.fn();

    render(
      <CustomSectionInput
        projectId="project-1"
        sectionKey={parentSectionKey}
        content={{
          title: 'Custom Section',
          insertAfterKey: 'overview',
          subsections: [
            {
              key: 'custom_subsection_keep',
              name: 'Keep Me',
              contentType: 'paragraph',
              data: { html: '<p>keep</p>' },
            },
            {
              key: 'custom_subsection_delete',
              name: 'Delete Me',
              contentType: 'paragraph',
              data: { html: '<p>delete</p>' },
            },
          ],
        }}
        sectionContents={{
          [parentSectionKey]: {
            title: 'Custom Section',
            insertAfterKey: 'overview',
            subsections: [],
          },
        }}
        onContentChange={onContentChange}
      />,
    );

    const subsectionCard = screen.getByText('2. Delete Me').parentElement;
    expect(subsectionCard).not.toBeNull();

    fireEvent.click(
      within(subsectionCard as HTMLElement).getByRole('button', {
        name: 'Delete Subsection',
      }),
    );
    fireEvent.click(
      within(subsectionCard as HTMLElement).getByRole('button', {
        name: 'Delete Subsection',
      }),
    );

    await waitFor(() => {
      expect(mockUpsertSection).toHaveBeenCalledWith(
        'project-1',
        parentSectionKey,
        expect.objectContaining({
          subsections: [
            expect.objectContaining({ key: 'custom_subsection_keep' }),
          ],
        }),
      );
    });

    expect(onContentChange).toHaveBeenCalledWith(
      expect.objectContaining({
        subsections: [expect.objectContaining({ key: 'custom_subsection_keep' })],
      }),
    );
    expect(mockRefreshSections).toHaveBeenCalled();
    expect(mockToastSuccess).toHaveBeenCalledWith('Subsection deleted');
  });

  it('renders inline subsection editing controls in the right sidebar and saves subsection changes', async () => {
    const onContentChange = vi.fn();

    render(
      <CustomSectionInput
        projectId="project-1"
        sectionKey={parentSectionKey}
        content={{
          title: '',
          insertAfterKey: 'overview',
          displayMode: 'subsection',
          subsections: [
            {
              key: 'custom_subsection_inline',
              name: 'Inline Table',
              contentType: 'table',
              data: {
                columns: ['Column 1'],
                rows: [{ 'Column 1': 'Value 1' }],
              },
            },
          ],
        }}
        sectionContents={{
          [parentSectionKey]: {
            title: '',
            insertAfterKey: 'overview',
            displayMode: 'subsection',
            subsections: [],
          },
        }}
        onContentChange={onContentChange}
      />,
    );

    expect(screen.getByText('Edit Subsection Details')).toBeInTheDocument();
    expect(screen.getByText('Table Configuration')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '+ Add Row' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '+ Add New Table' })).toBeInTheDocument();
    expect(screen.queryByText('Section Title')).not.toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Enter subsection name'), {
      target: { value: 'Updated Inline Table' },
    });

    await waitFor(() => {
      expect(mockUpsertSection).toHaveBeenCalledWith(
        'project-1',
        parentSectionKey,
        expect.objectContaining({
          displayMode: 'subsection',
          subsections: [
            expect.objectContaining({
              key: 'custom_subsection_inline',
              name: 'Updated Inline Table',
            }),
          ],
        }),
      );
    });

    expect(onContentChange).toHaveBeenCalledWith(
      expect.objectContaining({
        subsections: [
          expect.objectContaining({
            name: 'Updated Inline Table',
          }),
        ],
      }),
    );
  });

  it('renders inline paragraph subsection editing controls with add paragraph action', () => {
    render(
      <CustomSectionInput
        projectId="project-1"
        sectionKey={parentSectionKey}
        content={{
          title: '',
          insertAfterKey: 'overview',
          displayMode: 'subsection',
          subsections: [
            {
              key: 'custom_subsection_inline_paragraph',
              name: 'Inline Paragraph',
              contentType: 'paragraph',
              data: {
                paragraphs: [{ html: '<p>Value 1</p>' }],
              },
            },
          ],
        }}
        sectionContents={{
          [parentSectionKey]: {
            title: '',
            insertAfterKey: 'overview',
            displayMode: 'subsection',
            subsections: [],
          },
        }}
      />,
    );

    expect(screen.getByText('Edit Subsection Details')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '+ Add New Paragraph' })).toBeInTheDocument();
  });

  it('edits the selected subsection inside a regular custom section', async () => {
    const onContentChange = vi.fn();

    render(
      <CustomSectionInput
        projectId="project-1"
        sectionKey={parentSectionKey}
        activeSubsectionKey="custom_subsection_edit"
        content={{
          title: 'Custom Section',
          insertAfterKey: 'overview',
          subsections: [
            {
              key: 'custom_subsection_keep',
              name: 'Keep Me',
              contentType: 'paragraph',
              data: { html: '<p>keep</p>' },
            },
            {
              key: 'custom_subsection_edit',
              name: 'Edit Me',
              contentType: 'paragraph',
              data: { html: '<p>edit</p>' },
            },
          ],
        }}
        sectionContents={{
          [parentSectionKey]: {
            title: 'Custom Section',
            insertAfterKey: 'overview',
            subsections: [],
          },
        }}
        onContentChange={onContentChange}
      />,
    );

    expect(screen.getByDisplayValue('Edit Me')).toBeInTheDocument();

    fireEvent.change(screen.getByDisplayValue('Edit Me'), {
      target: { value: 'Updated Subsection' },
    });

    await waitFor(() => {
      expect(mockUpsertSection).toHaveBeenCalledWith(
        'project-1',
        parentSectionKey,
        expect.objectContaining({
          subsections: expect.arrayContaining([
            expect.objectContaining({
              key: 'custom_subsection_edit',
              name: 'Updated Subsection',
            }),
          ]),
        }),
      );
    });

    expect(onContentChange).toHaveBeenCalledWith(
      expect.objectContaining({
        subsections: expect.arrayContaining([
          expect.objectContaining({
            key: 'custom_subsection_edit',
            name: 'Updated Subsection',
          }),
        ]),
      }),
    );
  });

  it('selects a subsection card when clicked in the sidebar list', () => {
    const onSubsectionSelect = vi.fn();

    render(
      <CustomSectionInput
        projectId="project-1"
        sectionKey={parentSectionKey}
        content={{
          title: 'Custom Section',
          insertAfterKey: 'overview',
          subsections: [
            {
              key: 'custom_subsection_keep',
              name: 'Keep Me',
              contentType: 'paragraph',
              data: { html: '<p>keep</p>' },
            },
            {
              key: 'custom_subsection_edit',
              name: 'Edit Me',
              contentType: 'paragraph',
              data: { html: '<p>edit</p>' },
            },
          ],
        }}
        sectionContents={{
          [parentSectionKey]: {
            title: 'Custom Section',
            insertAfterKey: 'overview',
            subsections: [],
          },
        }}
        onSubsectionSelect={onSubsectionSelect}
      />,
    );

    fireEvent.click(screen.getByText('2. Edit Me'));

    expect(onSubsectionSelect).toHaveBeenCalledWith('custom_subsection_edit');
  });

  it('deletes a custom section and reanchors child custom sections', async () => {
    const onSectionNavigate = vi.fn();

    render(
      <CustomSectionInput
        projectId="project-1"
        sectionKey={parentSectionKey}
        content={{
          title: 'Parent Section',
          insertAfterKey: 'overview',
          subsections: [],
        }}
        sectionContents={{
          [parentSectionKey]: {
            title: 'Parent Section',
            insertAfterKey: 'overview',
            subsections: [],
          },
          [childSectionKey]: {
            title: 'Child Section',
            insertAfterKey: parentSectionKey,
            subsections: [],
          },
          [grandchildSectionKey]: {
            title: 'Grandchild Section',
            insertAfterKey: childSectionKey,
            subsections: [],
          },
        }}
        onSectionNavigate={onSectionNavigate}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Delete Section' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Delete' }));

    await waitFor(() => {
      expect(mockUpsertSection).toHaveBeenCalledWith(
        'project-1',
        childSectionKey,
        {
          title: 'Child Section',
          insertAfterKey: 'overview',
          subsections: [],
        },
      );
    });

    expect(mockDeleteSection).toHaveBeenCalledWith(
      'project-1',
      parentSectionKey,
    );
    expect(mockRefreshSections).toHaveBeenCalled();
    expect(onSectionNavigate).toHaveBeenCalledWith('overview');
    expect(mockToastSuccess).toHaveBeenCalledWith('Section deleted');
  });
});
