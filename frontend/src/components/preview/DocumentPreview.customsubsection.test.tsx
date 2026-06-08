import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import DocumentPreview from './DocumentPreview';

vi.mock('../../store/project.store', () => ({
  useProjectStore: () => ({
    solutionName: 'Test Solution',
    solutionFullName: 'Test Solution Full Name',
    clientName: 'Test Client',
    clientLocation: 'Test Location',
    sectionCompletion: {},
  }),
}));

vi.mock('../../api/images', () => ({
  getImages: vi.fn().mockResolvedValue([]),
}));

vi.mock('../../contexts/EditorContext', () => ({
  useEditor: () => ({
    refreshSections: vi.fn(),
  }),
  useOptionalEditor: () => ({
    refreshSections: vi.fn(),
  }),
}));

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('DocumentPreview inline custom subsections', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders a dynamic table of contents for existing predefined and custom sections', () => {
    const sectionContents = {
      cover: { solution_full_name: 'Test Solution' },
      revision_history: { rows: [] },
      executive_summary: { para1: 'Summary text' },
      introduction: { tender_reference: 'REF-001', tender_date: '2026-01-01' },
      overview: {
        system_objective: 'Objective text',
        existing_system: 'Existing system text',
      },
      features: { items: [] },
      'custom_section_1704067200000_a1b2c3d4-e5f6-7890-abcd-ef1234567890': {
        title: '',
        insertAfterKey: 'overview',
        displayMode: 'subsection',
        subsections: [
          {
            key: 'custom_subsection_1704067200000_a1b2c3d4-e5f6-7890-abcd-ef1234567890',
            name: 'Extra Overview Details',
            contentType: 'paragraph',
            data: {
              html: '<p>Inline overview subsection</p>',
            },
          },
        ],
      },
    };

    renderWithRouter(
      <DocumentPreview
        projectId="test-project-id"
        activeSectionKey={null}
        sectionContents={sectionContents}
      />,
    );

    const tocHeading = screen.getAllByText('TABLE OF CONTENTS')[0];
    const toc = tocHeading.parentElement;

    expect(toc).toHaveTextContent(/1\.EXECUTIVE SUMMARY/i);
    expect(toc).toHaveTextContent(/2\.1INTRODUCTION/i);
    expect(toc).toHaveTextContent(/2\.2OVERVIEW OF TEST SOLUTION/i);
    expect(toc).toHaveTextContent(/2\.3EXTRA OVERVIEW DETAILS/i);
    expect(toc).toHaveTextContent(/4\.LIST OF FIGURES AND TABLES/i);
    expect(toc).toHaveTextContent(/4\.1LIST OF FIGURES/i);
    expect(toc).toHaveTextContent(/4\.2LIST OF TABLES/i);
    expect(toc).not.toHaveTextContent(/PROCESS FLOW/i);
  });

  it('renders a custom subsection after overview without creating a new top-level section', () => {
    const sectionContents = {
      cover: { solution_full_name: 'Test Solution' },
      revision_history: { rows: [] },
      executive_summary: { para1: 'Summary text' },
      introduction: { tender_reference: 'REF-001', tender_date: '2026-01-01' },
      abbreviations: { rows: [] },
      process_flow: { text: 'Process flow description' },
      overview: {
        system_objective: 'Objective text',
        existing_system: 'Existing system text',
        integration: 'Integration text',
        tangible_benefits: 'Benefit text',
        intangible_benefits: 'Intangible text',
      },
      features: { items: [] },
      'custom_section_1704067200000_a1b2c3d4-e5f6-7890-abcd-ef1234567890': {
        title: '',
        insertAfterKey: 'overview',
        displayMode: 'subsection',
        subsections: [
          {
            key: 'custom_subsection_1704067200000_a1b2c3d4-e5f6-7890-abcd-ef1234567890',
            name: 'Extra Overview Details',
            contentType: 'paragraph',
            data: {
              html: '<p>Inline overview subsection</p>',
            },
          },
        ],
      },
    };

    renderWithRouter(
      <DocumentPreview
        projectId="test-project-id"
        activeSectionKey={null}
        sectionContents={sectionContents}
      />,
    );

    const subsectionHeading = screen.getByText(/2\.5\s+Extra Overview Details/i);
    const offeringsHeading = screen.getByText(/3\.\s+OFFERINGS/i);
    const pageBreakButtons = screen.getAllByRole('button', {
      name: /Add new section after/i,
    });
    const buttonsBeforeOfferings = pageBreakButtons.filter(
      (button) =>
        Boolean(
          button.compareDocumentPosition(offeringsHeading) &
            Node.DOCUMENT_POSITION_FOLLOWING,
        ),
    );
    const dividerBeforeOfferings =
      buttonsBeforeOfferings[buttonsBeforeOfferings.length - 1];

    expect(
      subsectionHeading,
    ).toBeInTheDocument();
    expect(offeringsHeading).toBeInTheDocument();
    expect(screen.queryByText(/3\.\s+Extra Overview Details/i)).toBeNull();
    expect(dividerBeforeOfferings).toBeDefined();
    expect(
      Boolean(
        subsectionHeading.compareDocumentPosition(dividerBeforeOfferings!) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ),
    ).toBe(true);
  });

  it('renders an inline custom subsection in the preview body after the selected predefined subsection', () => {
    const customSectionKey =
      'custom_section_1704067200000_a1b2c3d4-e5f6-7890-abcd-ef1234567890';
    const subsectionKey =
      'custom_subsection_1704067200000_a1b2c3d4-e5f6-7890-abcd-ef1234567890';
    const sectionContents = {
      cover: { solution_full_name: 'Test Solution' },
      revision_history: { rows: [] },
      executive_summary: { para1: 'Summary text' },
      introduction: { tender_reference: 'REF-001', tender_date: '2026-01-01' },
      abbreviations: { rows: [] },
      process_flow: { text: 'Process flow description' },
      overview: {
        system_objective: 'Objective text',
        existing_system: 'Existing system text',
        integration: 'Integration text',
        tangible_benefits: 'Benefit text',
        intangible_benefits: 'Intangible text',
      },
      [customSectionKey]: {
        title: '',
        insertAfterKey: 'introduction',
        displayMode: 'subsection' as const,
        subsections: [
          {
            key: subsectionKey,
            name: 'Inserted After Introduction',
            contentType: 'paragraph' as const,
            data: {
              paragraphs: [{ html: '<p>Visible introduction insertion</p>' }],
            },
          },
        ],
      },
    };

    renderWithRouter(
      <DocumentPreview
        projectId="test-project-id"
        activeSectionKey={null}
        sectionContents={sectionContents}
      />,
    );

    const insertedHeading = screen
      .getAllByText(/2\.2\s+Inserted After Introduction/i)
      .find((element) => element.closest(`[data-subsection-key="${subsectionKey}"]`));
    const abbreviationsHeading = screen
      .getAllByText(/2\.3\s+ABBREVIATIONS USED/i)
      .find((element) => element.closest('[data-section-key="abbreviations"]'));

    expect(insertedHeading).toBeDefined();
    expect(abbreviationsHeading).toBeDefined();
    expect(screen.getByText('Visible introduction insertion')).toBeInTheDocument();
    expect(
      Boolean(
        insertedHeading!.compareDocumentPosition(abbreviationsHeading!) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ),
    ).toBe(true);
  });

  it('shows the current top-level section and all sibling subsections when adding a subsection', () => {
    const sectionContents = {
      cover: { solution_full_name: 'Test Solution' },
      revision_history: { rows: [] },
      executive_summary: { para1: 'Summary text' },
      introduction: { tender_reference: 'REF-001', tender_date: '2026-01-01' },
      abbreviations: { rows: [] },
      process_flow: { text: 'Process flow description' },
      overview: {
        system_objective: 'Objective text',
        existing_system: 'Existing system text',
        integration: 'Integration text',
        tangible_benefits: 'Benefit text',
        intangible_benefits: 'Intangible text',
      },
    };

    renderWithRouter(
      <DocumentPreview
        projectId="test-project-id"
        activeSectionKey={null}
        sectionContents={sectionContents}
      />,
    );

    fireEvent.click(
      screen.getAllByRole('button', {
        name: /Add new section after overview/i,
      })[0],
    );
    fireEvent.click(screen.getByText('New Subsection'));

    expect(
      within(screen.getByRole('dialog')).getAllByText('2. GENERAL OVERVIEW')
        .length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByRole('option', { name: /2\.1 INTRODUCTION/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: /2\.2 ABBREVIATIONS USED/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: /2\.3 PROCESS FLOW/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: /2\.4 OVERVIEW OF TEST SOLUTION/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Add after subsection:')).toHaveValue(
      'overview',
    );
  });

  it('renders all images from a multi-image custom subsection', () => {
    const sectionContents = {
      cover: { solution_full_name: 'Test Solution' },
      revision_history: { rows: [] },
      executive_summary: { para1: 'Summary text' },
      introduction: { tender_reference: 'REF-001', tender_date: '2026-01-01' },
      abbreviations: { rows: [] },
      process_flow: { text: 'Process flow description' },
      overview: {
        system_objective: 'Objective text',
        existing_system: 'Existing system text',
        integration: 'Integration text',
        tangible_benefits: 'Benefit text',
        intangible_benefits: 'Intangible text',
      },
      features: { items: [] },
      'custom_section_1704067200000_a1b2c3d4-e5f6-7890-abcd-ef1234567890': {
        title: '',
        insertAfterKey: 'overview',
        displayMode: 'subsection',
        subsections: [
          {
            key: 'custom_subsection_1704067200000_a1b2c3d4-e5f6-7890-abcd-ef1234567890',
            name: 'Site Photos',
            contentType: 'image',
            data: {
              images: [
                {
                  base64: 'data:image/png;base64,first',
                  filename: 'photo-1.png',
                  mimeType: 'image/png',
                },
                {
                  base64: 'data:image/jpeg;base64,second',
                  filename: 'photo-2.jpg',
                  mimeType: 'image/jpeg',
                },
              ],
            },
          },
        ],
      },
    };

    renderWithRouter(
      <DocumentPreview
        projectId="test-project-id"
        activeSectionKey={null}
        sectionContents={sectionContents}
      />,
    );

    expect(screen.getByAltText('photo-1.png')).toBeInTheDocument();
    expect(screen.getByAltText('photo-2.jpg')).toBeInTheDocument();
  });

  it('selects an individual subsection instead of the whole custom section when clicked', () => {
    const onSectionClick = vi.fn();
    const onSubsectionClick = vi.fn();
    const customSectionKey =
      'custom_section_1704067200000_a1b2c3d4-e5f6-7890-abcd-ef1234567890';
    const subsectionKey =
      'custom_subsection_1704067200001_b1b2c3d4-e5f6-7890-abcd-ef1234567890';

    const sectionContents = {
      cover: { solution_full_name: 'Test Solution' },
      revision_history: { rows: [] },
      executive_summary: { para1: 'Summary text' },
      introduction: { tender_reference: 'REF-001', tender_date: '2026-01-01' },
      abbreviations: { rows: [] },
      process_flow: { text: 'Process flow description' },
      overview: {
        system_objective: 'Objective text',
        existing_system: 'Existing system text',
        integration: 'Integration text',
        tangible_benefits: 'Benefit text',
        intangible_benefits: 'Intangible text',
      },
      features: { items: [] },
      [customSectionKey]: {
        title: 'Editable Section',
        insertAfterKey: 'overview',
        displayMode: 'section' as const,
        subsections: [
          {
            key: subsectionKey,
            name: 'Editable Details',
            contentType: 'paragraph' as const,
            data: {
              html: '<p>Paragraph content</p>',
            },
          },
        ],
      },
    };

    renderWithRouter(
      <DocumentPreview
        projectId="test-project-id"
        activeSectionKey={customSectionKey}
        activeSubsectionKey={subsectionKey}
        sectionContents={sectionContents}
        onSectionClick={onSectionClick}
        onSubsectionClick={onSubsectionClick}
      />,
    );

    const editableDetailsHeading = screen
      .getAllByText(/Editable Details/i)
      .find((element) => element.closest('[data-subsection-key]'));

    expect(editableDetailsHeading).toBeDefined();
    fireEvent.click(editableDetailsHeading!);

    expect(onSubsectionClick).toHaveBeenCalledWith(customSectionKey, subsectionKey);
    expect(onSectionClick).not.toHaveBeenCalled();
  });

  it('renders all paragraphs from a multi-paragraph custom subsection', () => {
    const sectionContents = {
      cover: { solution_full_name: 'Test Solution' },
      revision_history: { rows: [] },
      executive_summary: { para1: 'Summary text' },
      introduction: { tender_reference: 'REF-001', tender_date: '2026-01-01' },
      abbreviations: { rows: [] },
      process_flow: { text: 'Process flow description' },
      overview: {
        system_objective: 'Objective text',
        existing_system: 'Existing system text',
        integration: 'Integration text',
        tangible_benefits: 'Benefit text',
        intangible_benefits: 'Intangible text',
      },
      features: { items: [] },
      'custom_section_1704067200000_a1b2c3d4-e5f6-7890-abcd-ef1234567890': {
        title: '',
        insertAfterKey: 'overview',
        displayMode: 'subsection',
        subsections: [
          {
            key: 'custom_subsection_1704067200000_a1b2c3d4-e5f6-7890-abcd-ef1234567890',
            name: 'Detailed Notes',
            contentType: 'paragraph',
            data: {
              paragraphs: [
                { html: '<p>First paragraph</p>' },
                { html: '<p>Second paragraph</p>' },
              ],
            },
          },
        ],
      },
    };

    renderWithRouter(
      <DocumentPreview
        projectId="test-project-id"
        activeSectionKey={null}
        sectionContents={sectionContents}
      />,
    );

    expect(screen.getByText('First paragraph')).toBeInTheDocument();
    expect(screen.getByText('Second paragraph')).toBeInTheDocument();
  });

  it('renders all tables from a multi-table custom subsection', () => {
    const sectionContents = {
      cover: { solution_full_name: 'Test Solution' },
      revision_history: { rows: [] },
      executive_summary: { para1: 'Summary text' },
      introduction: { tender_reference: 'REF-001', tender_date: '2026-01-01' },
      abbreviations: { rows: [] },
      process_flow: { text: 'Process flow description' },
      overview: {
        system_objective: 'Objective text',
        existing_system: 'Existing system text',
        integration: 'Integration text',
        tangible_benefits: 'Benefit text',
        intangible_benefits: 'Intangible text',
      },
      features: { items: [] },
      'custom_section_1704067200000_a1b2c3d4-e5f6-7890-abcd-ef1234567890': {
        title: '',
        insertAfterKey: 'overview',
        displayMode: 'subsection',
        subsections: [
          {
            key: 'custom_subsection_1704067200000_a1b2c3d4-e5f6-7890-abcd-ef1234567890',
            name: 'Data Tables',
            contentType: 'table',
            data: {
              tables: [
                {
                  columns: ['Header A'],
                  rows: [{ 'Header A': 'Value A1' }],
                },
                {
                  columns: ['Header B'],
                  rows: [{ 'Header B': 'Value B1' }],
                },
              ],
            },
          },
        ],
      },
    };

    renderWithRouter(
      <DocumentPreview
        projectId="test-project-id"
        activeSectionKey={null}
        sectionContents={sectionContents}
      />,
    );

    expect(screen.getByText('Header A')).toBeInTheDocument();
    expect(screen.getByText('Value A1')).toBeInTheDocument();
    expect(screen.getByText('Header B')).toBeInTheDocument();
    expect(screen.getByText('Value B1')).toBeInTheDocument();
  });
});
