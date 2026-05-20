import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { convertImageToBase64, validateImageUpload } from '../../utils/customSectionUtils';
import SectionTypeModal from './SectionTypeModal';

vi.mock('../input/ParagraphSubsectionEditor', () => ({
  default: ({
    value,
    data,
    onChange,
  }: {
    value?: string;
    data?: { paragraphs?: Array<{ html: string }>; html?: string };
    onChange: (data: { paragraphs: Array<{ html: string }> }) => void;
  }) => (
    <div>
      {(data?.paragraphs || (typeof data?.html === 'string' ? [{ html: data.html }] : [])).map(
        (paragraph, index) => (
          <textarea
            key={index}
            aria-label={`Paragraph Editor ${index + 1}`}
            value={paragraph.html}
            onChange={(event) => {
              const paragraphs = [
                ...(data?.paragraphs ||
                  (typeof data?.html === 'string' ? [{ html: data.html }] : [])),
              ];
              paragraphs[index] = { html: event.target.value };
              onChange({ paragraphs });
            }}
          />
        ),
      )}
      <button
        type="button"
        onClick={() =>
          onChange({
            paragraphs: [
              ...(data?.paragraphs ||
                (typeof data?.html === 'string' ? [{ html: data.html }] : [])),
              { html: '' },
            ],
          })
        }
      >
        + Add New Paragraph
      </button>
    </div>
  ),
}));

vi.mock('../input/TableSubsectionEditor', () => ({
  default: ({
    data,
    onChange,
  }: {
    data: { tables?: Array<{ columns: string[]; rows: Array<Record<string, string>> }> };
    onChange: (data: {
      tables: Array<{ columns: string[]; rows: Array<Record<string, string>> }>;
    }) => void;
  }) => (
    <div>
      <div>Mock Table Editor ({data.tables?.length || 0})</div>
      <button
        type="button"
        onClick={() =>
          onChange({
            tables: [
              ...(data.tables || []),
              { columns: ['Column 1'], rows: [{ 'Column 1': '' }] },
            ],
          })
        }
      >
        + Add New Table
      </button>
    </div>
  ),
}));

vi.mock('../../utils/customSectionUtils', async () => {
  const actual = await vi.importActual<typeof import('../../utils/customSectionUtils')>(
    '../../utils/customSectionUtils',
  );

  return {
    ...actual,
    convertImageToBase64: vi.fn(),
    validateImageUpload: vi.fn(() => null),
  };
});

describe('SectionTypeModal', () => {
  it('creates a new section from the first step', async () => {
    const onCreateSection = vi.fn().mockResolvedValue(undefined);
    const onCreateSubsection = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    render(
      <SectionTypeModal
        isOpen
        insertAfterKey="features"
        availableCustomSections={[]}
        onClose={onClose}
        onCreateSection={onCreateSection}
        onCreateSubsection={onCreateSubsection}
      />,
    );

    fireEvent.click(screen.getByText('New Section'));

    await waitFor(() => {
      expect(onCreateSection).toHaveBeenCalledWith('features');
    });

    expect(onClose).toHaveBeenCalled();
  });

  it('creates a paragraph subsection for an existing custom section', async () => {
    const onCreateSection = vi.fn().mockResolvedValue(undefined);
    const onCreateSubsection = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    const targetSectionKey =
      'custom_section_1704067200000_a1b2c3d4-e5f6-7890-abcd-ef1234567890';

    render(
      <SectionTypeModal
        isOpen
        insertAfterKey={targetSectionKey}
        availableCustomSections={[
          {
            key: targetSectionKey,
            title: 'Custom Compliance',
          },
        ]}
        onClose={onClose}
        onCreateSection={onCreateSection}
        onCreateSubsection={onCreateSubsection}
      />,
    );

    fireEvent.click(screen.getByText('New Subsection'));
    fireEvent.change(screen.getByLabelText('Name of this subsection?'), {
      target: { value: 'Additional Notes' },
    });
    fireEvent.click(screen.getByText('Add Paragraph'));
    fireEvent.click(screen.getByText('Continue'));
    fireEvent.change(screen.getByLabelText('Paragraph Editor 1'), {
      target: { value: '<p>Saved paragraph text</p>' },
    });
    fireEvent.click(screen.getByText('Save Text'));

    await waitFor(() => {
      expect(onCreateSubsection).toHaveBeenCalledWith(
        targetSectionKey,
        expect.objectContaining({
          name: 'Additional Notes',
          contentType: 'paragraph',
          data: {
            paragraphs: [{ html: '<p>Saved paragraph text</p>' }],
          },
        }),
      );
    });

    expect(onCreateSubsection.mock.calls[0][1].key).toMatch(
      /^custom_subsection_\d+_[a-f0-9-]{36}$/,
    );
    expect(onClose).toHaveBeenCalled();
  });

  it('creates a subsection from a predefined insertion point', async () => {
    const onCreateSection = vi.fn().mockResolvedValue(undefined);
    const onCreateSubsection = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    render(
      <SectionTypeModal
        isOpen
        insertAfterKey="overview"
        availableCustomSections={[
          {
            key: 'custom_section_1704067200000_a1b2c3d4-e5f6-7890-abcd-ef1234567890',
            title: 'Custom Compliance',
          },
        ]}
        onClose={onClose}
        onCreateSection={onCreateSection}
        onCreateSubsection={onCreateSubsection}
      />,
    );

    fireEvent.click(screen.getByText('New Subsection'));
    fireEvent.change(screen.getByLabelText('Name of this subsection?'), {
      target: { value: 'Extra Overview Details' },
    });
    fireEvent.click(screen.getByText('Add Paragraph'));
    fireEvent.click(screen.getByText('Continue'));
    fireEvent.change(screen.getByLabelText('Paragraph Editor 1'), {
      target: { value: '<p>Inline overview subsection</p>' },
    });
    fireEvent.click(screen.getByText('Save Text'));

    await waitFor(() => {
      expect(onCreateSubsection).toHaveBeenCalledWith(
        'overview',
        expect.objectContaining({
          name: 'Extra Overview Details',
          contentType: 'paragraph',
        }),
      );
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('creates a paragraph subsection with multiple paragraphs', async () => {
    const onCreateSection = vi.fn().mockResolvedValue(undefined);
    const onCreateSubsection = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    const targetSectionKey =
      'custom_section_1704067200000_a1b2c3d4-e5f6-7890-abcd-ef1234567890';

    render(
      <SectionTypeModal
        isOpen
        insertAfterKey={targetSectionKey}
        availableCustomSections={[
          {
            key: targetSectionKey,
            title: 'Custom Compliance',
          },
        ]}
        onClose={onClose}
        onCreateSection={onCreateSection}
        onCreateSubsection={onCreateSubsection}
      />,
    );

    fireEvent.click(screen.getByText('New Subsection'));
    fireEvent.change(screen.getByLabelText('Name of this subsection?'), {
      target: { value: 'Detailed Notes' },
    });
    fireEvent.click(screen.getByText('Add Paragraph'));
    fireEvent.click(screen.getByText('Continue'));
    fireEvent.click(screen.getByText('+ Add New Paragraph'));
    fireEvent.change(screen.getByLabelText('Paragraph Editor 1'), {
      target: { value: '<p>First paragraph</p>' },
    });
    fireEvent.change(screen.getByLabelText('Paragraph Editor 2'), {
      target: { value: '<p>Second paragraph</p>' },
    });
    fireEvent.click(screen.getByText('Save Text'));

    await waitFor(() => {
      expect(onCreateSubsection).toHaveBeenCalledWith(
        targetSectionKey,
        expect.objectContaining({
          name: 'Detailed Notes',
          contentType: 'paragraph',
          data: {
            paragraphs: [
              { html: '<p>First paragraph</p>' },
              { html: '<p>Second paragraph</p>' },
            ],
          },
        }),
      );
    });
  });

  it('creates a table subsection with multiple tables', async () => {
    const onCreateSection = vi.fn().mockResolvedValue(undefined);
    const onCreateSubsection = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    const targetSectionKey =
      'custom_section_1704067200000_a1b2c3d4-e5f6-7890-abcd-ef1234567890';

    render(
      <SectionTypeModal
        isOpen
        insertAfterKey={targetSectionKey}
        availableCustomSections={[
          {
            key: targetSectionKey,
            title: 'Custom Compliance',
          },
        ]}
        onClose={onClose}
        onCreateSection={onCreateSection}
        onCreateSubsection={onCreateSubsection}
      />,
    );

    fireEvent.click(screen.getByText('New Subsection'));
    fireEvent.change(screen.getByLabelText('Name of this subsection?'), {
      target: { value: 'Data Tables' },
    });
    fireEvent.click(screen.getByText('Add Table'));
    fireEvent.click(screen.getByText('Continue'));
    fireEvent.click(screen.getByText('+ Add New Table'));
    fireEvent.click(screen.getByText('Create Table'));

    await waitFor(() => {
      expect(onCreateSubsection).toHaveBeenCalledWith(
        targetSectionKey,
        expect.objectContaining({
          name: 'Data Tables',
          contentType: 'table',
          data: {
            tables: [
              expect.objectContaining({
                columns: ['Column 1', 'Column 2'],
              }),
              expect.objectContaining({
                columns: ['Column 1'],
              }),
            ],
          },
        }),
      );
    });
  });

  it('creates an image subsection with multiple uploaded images', async () => {
    const onCreateSection = vi.fn().mockResolvedValue(undefined);
    const onCreateSubsection = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    const targetSectionKey =
      'custom_section_1704067200000_a1b2c3d4-e5f6-7890-abcd-ef1234567890';

    vi.mocked(validateImageUpload).mockReturnValue(null);
    vi.mocked(convertImageToBase64)
      .mockResolvedValueOnce('data:image/png;base64,first')
      .mockResolvedValueOnce('data:image/jpeg;base64,second');

    render(
      <SectionTypeModal
        isOpen
        insertAfterKey={targetSectionKey}
        availableCustomSections={[
          {
            key: targetSectionKey,
            title: 'Custom Compliance',
          },
        ]}
        onClose={onClose}
        onCreateSection={onCreateSection}
        onCreateSubsection={onCreateSubsection}
      />,
    );

    fireEvent.click(screen.getByText('New Subsection'));
    fireEvent.change(screen.getByLabelText('Name of this subsection?'), {
      target: { value: 'Reference Photos' },
    });
    fireEvent.click(screen.getByText('Add Image'));
    fireEvent.click(screen.getByText('Continue'));

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const firstFile = new File(['first'], 'diagram-1.png', { type: 'image/png' });
    const secondFile = new File(['second'], 'diagram-2.jpg', { type: 'image/jpeg' });

    fireEvent.change(input, {
      target: {
        files: [firstFile, secondFile],
      },
    });

    await waitFor(() => {
      expect(screen.getByText('Uploaded Images (2)')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Save Images'));

    await waitFor(() => {
      expect(onCreateSubsection).toHaveBeenCalledWith(
        targetSectionKey,
        expect.objectContaining({
          name: 'Reference Photos',
          contentType: 'image',
          data: {
            images: [
              {
                base64: 'data:image/png;base64,first',
                filename: 'diagram-1.png',
                mimeType: 'image/png',
              },
              {
                base64: 'data:image/jpeg;base64,second',
                filename: 'diagram-2.jpg',
                mimeType: 'image/jpeg',
              },
            ],
          },
        }),
      );
    });

    expect(onClose).toHaveBeenCalled();
  });
});
