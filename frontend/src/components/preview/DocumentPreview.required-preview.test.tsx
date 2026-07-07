import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import DocumentPreview from './DocumentPreview';

vi.mock('../../store/project.store', () => ({
  useProjectStore: () => ({
    solutionName: 'Test Solution',
    solutionFullName: '',
    clientName: '',
    clientLocation: '',
    sectionCompletion: {},
  }),
}));

vi.mock('../../api/images', () => ({
  getImages: vi.fn(() => new Promise(() => {})),
}));

vi.mock('../../contexts/EditorContext', () => ({
  useEditor: () => ({
    refreshSections: vi.fn(),
  }),
}));

const REQUIRED_COLOR = '#E60012';
const OPTIONAL_PLACEHOLDER_COLOR = '#6B7280';

const renderPreview = (sectionContents: Record<string, Record<string, any>>) =>
  render(
    <BrowserRouter>
      <DocumentPreview
        projectId="test-project-id"
        activeSectionKey={null}
        sectionContents={sectionContents}
      />
    </BrowserRouter>,
  );

describe('DocumentPreview required preview styling', () => {
  it('renders required placeholders and template values in red', () => {
    renderPreview({
      cover: {},
      introduction: {
        tender_reference: 'REF-001',
        tender_date: '',
      },
      process_flow: {
        text: '',
      },
    });

    expect(screen.getByText('REF-001')).toHaveStyle({
      color: REQUIRED_COLOR,
    });
    expect(screen.getByText('{TenderDate}')).toHaveStyle({
      color: REQUIRED_COLOR,
    });
    expect(screen.getByText('[Enter process flow description]')).toHaveStyle({
      color: REQUIRED_COLOR,
    });
  });

  it('renders required table cells in red while optional cells keep normal placeholder styling', () => {
    renderPreview({
      cover: {},
      hardware_specs: {
        rows: [
          {
            sr_no: 1,
            name: 'Server',
            specs_line1: '',
            maker: '',
            qty: '',
          },
        ],
      },
    });

    expect(screen.getByText('[Specifications pending]')).toHaveStyle({
      color: REQUIRED_COLOR,
    });
    expect(screen.getByText('[Maker]')).toHaveStyle({
      color: REQUIRED_COLOR,
    });
    expect(screen.getByText('[Qty]')).toHaveStyle({
      color: OPTIONAL_PLACEHOLDER_COLOR,
    });
  });
});
