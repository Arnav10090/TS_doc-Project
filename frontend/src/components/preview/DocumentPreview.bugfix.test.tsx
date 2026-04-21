/**
 * Bug Condition Exploration Test for Document Preview Deleted Sections Fix
 * 
 * **Validates: Requirements 2.1, 2.2, 2.3**
 * 
 * This test encodes the EXPECTED behavior: deleted sections should NOT render.
 * 
 * CRITICAL: This test MUST FAIL on unfixed code - failure confirms the bug exists.
 * When this test passes after the fix, it confirms the expected behavior is satisfied.
 * 
 * Bug Condition: When a section key does not exist in sectionContents (excluding "cover"),
 * the DocumentPreview component continues to render that section.
 * 
 * Expected Behavior: Deleted sections SHALL NOT render in the preview.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import DocumentPreview from './DocumentPreview';
import { BrowserRouter } from 'react-router-dom';

// Mock the project store
vi.mock('../../store/project.store', () => ({
  useProjectStore: () => ({
    solutionName: 'Test Solution',
    solutionFullName: 'Test Solution Full Name',
    clientName: 'Test Client',
    clientLocation: 'Test Location',
    sectionCompletion: {},
  }),
}));

// Mock the images API
vi.mock('../../api/images', () => ({
  getImages: vi.fn().mockResolvedValue([]),
}));

// Helper to wrap component with router
const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('DocumentPreview - Bug Condition Exploration: Deleted Sections Disappear from Preview', () => {
  const projectId = 'test-project-id';
  const activeSectionKey = null;
  const onSectionClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Property 1: Bug Condition - Deleted Sections Disappear from Preview
   * 
   * Test Case 1: Single section delete
   * When "abbreviations" section is deleted (key not in sectionContents),
   * it should NOT render in the preview.
   */
  it('should NOT render abbreviations section when deleted from sectionContents', () => {
    // Arrange: Create sectionContents WITHOUT "abbreviations" key (simulating deletion)
    const sectionContents = {
      cover: { solution_full_name: 'Test Solution' },
      introduction: { tender_reference: 'REF-001', tender_date: '2024-01-01' },
      // abbreviations is DELETED (key not present)
      process_flow: { text: 'Process flow description' },
    };

    // Act: Render the component
    const { container } = renderWithRouter(
      <DocumentPreview
        projectId={projectId}
        activeSectionKey={activeSectionKey}
        sectionContents={sectionContents}
        onSectionClick={onSectionClick}
      />
    );

    // Assert: Deleted section should NOT render
    // Look for the "ABBREVIATIONS USED" heading which should not exist
    const abbreviationsHeading = screen.queryByText(/ABBREVIATIONS USED/i);
    expect(abbreviationsHeading).toBeNull();

    // Verify the section wrapper for abbreviations does not exist
    const abbreviationsSection = container.querySelector('[data-section-key="abbreviations"]');
    expect(abbreviationsSection).toBeNull();
  });

  /**
   * Test Case 2: Multiple section delete
   * When "features" and "hardware_specs" sections are deleted,
   * they should NOT render in the preview.
   */
  it('should NOT render features and hardware_specs sections when deleted from sectionContents', () => {
    // Arrange: Create sectionContents WITHOUT "features" and "hardware_specs" keys
    const sectionContents = {
      cover: { solution_full_name: 'Test Solution' },
      introduction: { tender_reference: 'REF-001', tender_date: '2024-01-01' },
      // features is DELETED
      remote_support: { text: 'Remote support info' },
      tech_stack: { rows: [] },
      // hardware_specs is DELETED
      software_specs: { rows: [] },
    };

    // Act: Render the component
    const { container } = renderWithRouter(
      <DocumentPreview
        projectId={projectId}
        activeSectionKey={activeSectionKey}
        sectionContents={sectionContents}
        onSectionClick={onSectionClick}
      />
    );

    // Assert: Deleted sections should NOT render
    const featuresHeading = screen.queryByText(/DESIGN SCOPE OF WORK/i);
    expect(featuresHeading).toBeNull();

    const hardwareHeading = screen.queryByText(/HARDWARE SPECIFICATIONS/i);
    expect(hardwareHeading).toBeNull();

    // Verify section wrappers do not exist
    const featuresSection = container.querySelector('[data-section-key="features"]');
    expect(featuresSection).toBeNull();

    const hardwareSection = container.querySelector('[data-section-key="hardware_specs"]');
    expect(hardwareSection).toBeNull();
  });

  /**
   * Test Case 3: Group heading test
   * When ALL sections in "OFFERINGS" group are deleted,
   * the group heading should also NOT render.
   */
  it('should NOT render OFFERINGS group heading when all sections in group are deleted', () => {
    // Arrange: Create sectionContents WITHOUT any OFFERINGS sections
    // OFFERINGS sections: features, remote_support, documentation_control, 
    // customer_training, system_config, fat_condition
    const sectionContents = {
      cover: { solution_full_name: 'Test Solution' },
      introduction: { tender_reference: 'REF-001', tender_date: '2024-01-01' },
      abbreviations: { rows: [] },
      // All OFFERINGS sections are DELETED
      tech_stack: { rows: [] }, // This is in TECHNOLOGY STACK group
    };

    // Act: Render the component
    renderWithRouter(
      <DocumentPreview
        projectId={projectId}
        activeSectionKey={activeSectionKey}
        sectionContents={sectionContents}
        onSectionClick={onSectionClick}
      />
    );

    // Assert: OFFERINGS heading should NOT render when all its sections are deleted
    const offeringsHeading = screen.queryByText(/^3\.\s+OFFERINGS$/i);
    expect(offeringsHeading).toBeNull();
  });

  /**
   * Test Case 4: Empty vs deleted distinction
   * Verify that deleted sections (key not in sectionContents) behave differently
   * from empty sections (key exists but content is empty).
   */
  it('should distinguish between deleted sections and empty sections', () => {
    // Arrange: Create sectionContents with one empty section and one deleted section
    const sectionContents = {
      cover: { solution_full_name: 'Test Solution' },
      introduction: { tender_reference: 'REF-001', tender_date: '2024-01-01' },
      abbreviations: { rows: [] }, // EMPTY section (key exists, but no rows)
      // process_flow is DELETED (key not present)
    };

    // Act: Render the component
    renderWithRouter(
      <DocumentPreview
        projectId={projectId}
        activeSectionKey={activeSectionKey}
        sectionContents={sectionContents}
        onSectionClick={onSectionClick}
      />
    );

    // Assert: Empty section SHOULD render with placeholder
    const abbreviationsHeading = screen.queryByText(/ABBREVIATIONS USED/i);
    expect(abbreviationsHeading).not.toBeNull(); // Should exist

    // Verify placeholder text appears for empty section
    const abbreviationsPlaceholder = screen.queryByText(/No abbreviations defined/i);
    expect(abbreviationsPlaceholder).not.toBeNull();

    // Assert: Deleted section should NOT render at all
    // Use more specific query to avoid matching placeholder text
    const processFlowHeading = screen.queryByText(/^2\.3 PROCESS FLOW$/i);
    expect(processFlowHeading).toBeNull(); // Should NOT exist
  });

  /**
   * Test Case 5: Cover section always renders (special case)
   * The cover section should ALWAYS render, even if not in sectionContents,
   * because it cannot be deleted.
   */
  it('should always render cover section regardless of sectionContents', () => {
    // Arrange: Create sectionContents without cover key
    const sectionContents = {
      // cover is not present in sectionContents
      introduction: { tender_reference: 'REF-001', tender_date: '2024-01-01' },
    };

    // Act: Render the component
    renderWithRouter(
      <DocumentPreview
        projectId={projectId}
        activeSectionKey={activeSectionKey}
        sectionContents={sectionContents}
        onSectionClick={onSectionClick}
      />
    );

    // Assert: Cover section should ALWAYS render
    // Use getAllByText to handle multiple matches and check the first one (in cover section)
    const coverHeadings = screen.queryAllByText(/TECHNICAL SPECIFICATION/i);
    expect(coverHeadings.length).toBeGreaterThan(0); // Should exist at least once
  });

  /**
   * Test Case 6: Scoped property test - verify bug exists for all deletable sections
   * This test iterates through a representative sample of deletable sections
   * to confirm the bug exists across the component.
   */
  it('should NOT render any deleted section from representative sample', () => {
    // Arrange: List of deletable sections to test
    const deletableSections = [
      { key: 'abbreviations', heading: /ABBREVIATIONS USED/i },
      { key: 'process_flow', heading: /PROCESS FLOW/i },
      { key: 'overview', heading: /OVERVIEW OF/i },
      { key: 'features', heading: /DESIGN SCOPE OF WORK/i },
      { key: 'remote_support', heading: /REMOTE SUPPORT SYSTEM/i },
      { key: 'hardware_specs', heading: /HARDWARE SPECIFICATIONS/i },
      { key: 'software_specs', heading: /SOFTWARE SPECIFICATIONS/i },
      { key: 'overall_gantt', heading: /OVERALL GANTT CHART/i },
      { key: 'supervisors', heading: /SUPERVISORS/i },
    ];

    // Test each section individually
    deletableSections.forEach(({ key, heading }) => {
      // Create sectionContents WITHOUT the current section key
      const sectionContents = {
        cover: { solution_full_name: 'Test Solution' },
        // Current section is DELETED (not included)
      };

      // Act: Render the component
      const { unmount } = renderWithRouter(
        <DocumentPreview
          projectId={projectId}
          activeSectionKey={activeSectionKey}
          sectionContents={sectionContents}
          onSectionClick={onSectionClick}
        />
      );

      // Assert: Deleted section should NOT render
      const sectionHeading = screen.queryByText(heading);
      expect(sectionHeading).toBeNull();

      // Cleanup for next iteration
      unmount();
    });
  });
});
