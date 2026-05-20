import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import SectionSidebar from './SectionSidebar';
import { useProjectStore } from '../../store/project.store';

// Mock the project store
vi.mock('../../store/project.store', () => ({
  useProjectStore: vi.fn(() => ({})),
}));

// Mock the generation API
vi.mock('../../api/generation', () => ({
  generateDocument: vi.fn(),
}));

// Mock the download helper
vi.mock('../../utils/downloadHelper', () => ({
  handleDocumentDownload: vi.fn(),
}));

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe('SectionSidebar - Custom Sections Integration', () => {
  const mockProps = {
    projectId: 'test-project-123',
    activeSectionKey: null,
    onSectionClick: vi.fn(),
    visitedSections: new Set<string>(),
    width: 200,
    showResizeHandle: false,
    isResizing: false,
  };

  it('should display CUSTOM SECTIONS group when custom sections exist', () => {
    // Mock completion state
    (useProjectStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      cover: true,
      executive_summary: true,
    });

    // Create sectionContents with custom section
    const sectionContents: Record<string, Record<string, any>> = {
      cover: { title: 'Cover Page' },
      executive_summary: { content: 'Summary' },
      features: { list: ['Feature 1'] },
      binding_conditions: { content: 'Binding' },
      // Custom section
      'custom_section_1704067200000_a1b2c3d4-e5f6-7890-abcd-ef1234567890': {
        title: 'Additional Requirements',
        subsections: [],
        insertAfterKey: 'features'
      },
    };

    render(<SectionSidebar {...mockProps} sectionContents={sectionContents} />);

    // Verify CUSTOM SECTIONS group appears
    expect(screen.getByText('CUSTOM SECTIONS')).toBeInTheDocument();
    
    // Verify custom section title appears
    expect(screen.getByText('Additional Requirements')).toBeInTheDocument();
  });

  it('should display "NEW SECTION" placeholder for custom sections without titles', () => {
    // Mock completion state
    (useProjectStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      cover: true,
    });

    // Create sectionContents with custom section without title
    const sectionContents: Record<string, Record<string, any>> = {
      cover: { title: 'Cover Page' },
      'custom_section_1704067200000_a1b2c3d4-e5f6-7890-abcd-ef1234567890': {
        subsections: [],
        insertAfterKey: 'cover'
      },
    };

    render(<SectionSidebar {...mockProps} sectionContents={sectionContents} />);

    // Verify NEW SECTION placeholder appears
    expect(screen.getByText('NEW SECTION')).toBeInTheDocument();
  });

  it('should not display CUSTOM SECTIONS group when no custom sections exist', () => {
    // Mock completion state
    (useProjectStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      cover: true,
      executive_summary: true,
    });

    // Create sectionContents without custom sections
    const sectionContents: Record<string, Record<string, any>> = {
      cover: { title: 'Cover Page' },
      executive_summary: { content: 'Summary' },
      features: { list: ['Feature 1'] },
      binding_conditions: { content: 'Binding' },
    };

    render(<SectionSidebar {...mockProps} sectionContents={sectionContents} />);

    // Verify CUSTOM SECTIONS group does not appear
    expect(screen.queryByText('CUSTOM SECTIONS')).not.toBeInTheDocument();
  });

  it('should always show "X / 27 sections complete" regardless of custom sections', () => {
    // Mock completion state - 2 completed predefined sections
    (useProjectStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      cover: true,
      executive_summary: true,
    });

    // Create sectionContents with custom sections
    const sectionContents: Record<string, Record<string, any>> = {
      cover: { title: 'Cover Page' },
      executive_summary: { content: 'Summary' },
      features: { list: ['Feature 1'] },
      binding_conditions: { content: 'Binding' },
      // Add 5 custom sections
      'custom_section_1': { title: 'Custom 1', subsections: [], insertAfterKey: 'features' },
      'custom_section_2': { title: 'Custom 2', subsections: [], insertAfterKey: 'features' },
      'custom_section_3': { title: 'Custom 3', subsections: [], insertAfterKey: 'features' },
      'custom_section_4': { title: 'Custom 4', subsections: [], insertAfterKey: 'features' },
      'custom_section_5': { title: 'Custom 5', subsections: [], insertAfterKey: 'features' },
    };

    render(<SectionSidebar {...mockProps} sectionContents={sectionContents} />);

    // Verify completion count shows "2 / 27" (not affected by custom sections)
    expect(screen.getByText(/2 \/ 27 sections complete/i)).toBeInTheDocument();
  });

  it('should not show completion badges for custom sections', () => {
    // Mock completion state
    (useProjectStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      cover: true,
    });

    // Create sectionContents with custom section
    const sectionContents: Record<string, Record<string, any>> = {
      cover: { title: 'Cover Page' },
      'custom_section_1704067200000_a1b2c3d4-e5f6-7890-abcd-ef1234567890': {
        title: 'Custom Section',
        subsections: [],
        insertAfterKey: 'cover'
      },
    };

    render(<SectionSidebar {...mockProps} sectionContents={sectionContents} />);

    // Get the custom section button
    const customSectionButton = screen.getByText('Custom Section').closest('button');
    
    // Verify no completion badge (✅, ⚪, or 👁️) appears in the custom section button
    expect(customSectionButton?.textContent).not.toContain('✅');
    expect(customSectionButton?.textContent).not.toContain('⚪');
    expect(customSectionButton?.textContent).not.toContain('👁️');
  });

  it('should call onSectionClick when custom section is clicked', () => {
    // Mock completion state
    (useProjectStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      cover: true,
    });

    const mockOnSectionClick = vi.fn();
    const customSectionKey = 'custom_section_1704067200000_a1b2c3d4-e5f6-7890-abcd-ef1234567890';

    // Create sectionContents with custom section
    const sectionContents: Record<string, Record<string, any>> = {
      cover: { title: 'Cover Page' },
      [customSectionKey]: {
        title: 'Custom Section',
        subsections: [],
        insertAfterKey: 'cover'
      },
    };

    render(<SectionSidebar {...mockProps} sectionContents={sectionContents} onSectionClick={mockOnSectionClick} />);

    // Click the custom section
    const customSectionButton = screen.getByText('Custom Section');
    customSectionButton.click();

    // Verify onSectionClick was called with the custom section key
    expect(mockOnSectionClick).toHaveBeenCalledWith(customSectionKey);
  });
});
