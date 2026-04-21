/**
 * Bug Condition Exploration Test for DocumentPreview Section Count
 * 
 * **Validates: Requirements 1.4, 1.5, 1.6, 2.1, 2.2, 2.4, 2.5, 2.6**
 * 
 * This test encodes the EXPECTED behavior: section count total should dynamically
 * reflect the actual number of sections in sectionContents minus 4 auto-complete sections.
 * 
 * CRITICAL: This test MUST FAIL on unfixed code - failure confirms the bug exists.
 * When this test passes after the fix, it confirms the expected behavior is satisfied.
 * 
 * Bug Condition: When sectionContents has fewer than 27 sections (e.g., 24 sections
 * after 3 deletions), the DocumentPreview component displays "Preview - X / 27 complete"
 * instead of "Preview - X / 24 complete".
 * 
 * Expected Behavior: The total count SHALL dynamically reflect actual sections:
 * Object.keys(sectionContents).length - 4 (excluding auto-complete sections)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import DocumentPreview from './DocumentPreview';
import { BrowserRouter } from 'react-router-dom';
import * as fc from 'fast-check';

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

describe('DocumentPreview - Bug Condition Exploration: Section Count Dynamic Update', () => {
  const projectId = 'test-project-id';
  const activeSectionKey = null;
  const onSectionClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Property 1: Bug Condition - Dynamic Total Calculation (Preview)
   * 
   * Test Case 1: 3 sections deleted (24 sections remaining)
   * When sectionContents has 24 sections (27 - 3 deletions),
   * the preview should display "Preview - X / 20 complete" (24 - 4 auto-complete)
   * but currently displays "Preview - X / 27 complete" (BUG)
   */
  it('should display correct total when 3 sections are deleted (24 sections)', () => {
    // Arrange: Create sectionContents with 24 sections (3 deleted from original 27)
    const sectionContents = {
      cover: { solution_full_name: 'Test Solution' },
      introduction: { tender_reference: 'REF-001' },
      abbreviations: { rows: [] },
      // process_flow DELETED
      overview: { text: 'Overview' },
      features: { rows: [] },
      remote_support: { text: 'Remote support' },
      documentation_control: { items: [] },
      customer_training: { text: 'Training' },
      system_config: { text: 'Config' },
      fat_condition: { text: 'FAT' },
      tech_stack: { rows: [] },
      hardware_specs: { rows: [] },
      software_specs: { rows: [] },
      third_party_sw: { rows: [] },
      // overall_gantt DELETED
      shutdown_gantt: { text: 'Shutdown' },
      poc: { text: 'POC' },
      buyer_prerequisites: { items: [] },
      buyer_obligations: { items: [] },
      division_of_eng: { rows: [] },
      supervisors: { rows: [] },
      value_addition: { items: [] },
      work_completion: { text: 'Work completion' },
      exclusion_list: { items: [] },
      // Auto-complete sections (always present, excluded from total)
      binding_conditions: { paragraphs: [] },
      cybersecurity: { paragraphs: [] },
      disclaimer: { sections: [] },
      // scope_definitions DELETED (this is the 3rd deletion)
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

    // Assert: Should display "Preview - X / 20 complete"
    // Formula: Object.keys(sectionContents).length - 4
    // 24 sections - 4 auto-complete = 20
    const totalSections = Object.keys(sectionContents).length; // 24
    const expectedTotal = totalSections - 4; // 24 - 4 = 20
    const completionBadge = screen.getByText(/Preview - \d+ \/ \d+ complete/);
    
    // Extract the total from the badge text
    const match = completionBadge.textContent?.match(/Preview - (\d+) \/ (\d+) complete/);
    expect(match).not.toBeNull();
    
    const displayedTotal = match ? parseInt(match[2], 10) : 0;
    
    // This assertion will FAIL on unfixed code (displays 27 instead of 20)
    expect(displayedTotal).toBe(expectedTotal);
  });

  /**
   * Test Case 2: 5 sections deleted (22 sections remaining)
   * When sectionContents has 22 sections (27 - 5 deletions),
   * the preview should display "Preview - X / 18 complete" (22 - 4 auto-complete)
   * but currently displays "Preview - X / 27 complete" (BUG)
   */
  it('should display correct total when 5 sections are deleted (22 sections)', () => {
    // Arrange: Create sectionContents with 22 sections (5 deleted from original 27)
    const sectionContents = {
      cover: { solution_full_name: 'Test Solution' },
      introduction: { tender_reference: 'REF-001' },
      abbreviations: { rows: [] },
      // process_flow DELETED
      overview: { text: 'Overview' },
      features: { rows: [] },
      remote_support: { text: 'Remote support' },
      documentation_control: { items: [] },
      customer_training: { text: 'Training' },
      system_config: { text: 'Config' },
      fat_condition: { text: 'FAT' },
      tech_stack: { rows: [] },
      hardware_specs: { rows: [] },
      software_specs: { rows: [] },
      // third_party_sw DELETED
      // overall_gantt DELETED
      shutdown_gantt: { text: 'Shutdown' },
      poc: { text: 'POC' },
      buyer_prerequisites: { items: [] },
      buyer_obligations: { items: [] },
      division_of_eng: { rows: [] },
      // supervisors DELETED
      value_addition: { items: [] },
      work_completion: { text: 'Work completion' },
      // exclusion_list DELETED
      // Auto-complete sections (always present, excluded from total)
      binding_conditions: { paragraphs: [] },
      cybersecurity: { paragraphs: [] },
      disclaimer: { sections: [] },
      scope_definitions: { lines: [] },
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

    // Assert: Should display "Preview - X / 18 complete"
    // Formula: Object.keys(sectionContents).length - 4
    // 22 sections - 4 auto-complete = 18
    const totalSections = Object.keys(sectionContents).length; // 22
    const expectedTotal = totalSections - 4; // 22 - 4 = 18
    const completionBadge = screen.getByText(/Preview - \d+ \/ \d+ complete/);
    
    const match = completionBadge.textContent?.match(/Preview - (\d+) \/ (\d+) complete/);
    expect(match).not.toBeNull();
    
    const displayedTotal = match ? parseInt(match[2], 10) : 0;
    
    // This assertion will FAIL on unfixed code (displays 27 instead of 18)
    expect(displayedTotal).toBe(expectedTotal);
  });

  /**
   * Test Case 3: Full project (27 sections)
   * When sectionContents has all 27 sections,
   * the preview should display "Preview - X / 27 complete"
   * This should PASS on unfixed code (baseline behavior)
   */
  it('should display correct total when no sections are deleted (27 sections)', () => {
    // Arrange: Create sectionContents with all 27 sections
    const sectionContents = {
      cover: { solution_full_name: 'Test Solution' },
      introduction: { tender_reference: 'REF-001' },
      abbreviations: { rows: [] },
      process_flow: { text: 'Process flow' },
      overview: { text: 'Overview' },
      features: { rows: [] },
      remote_support: { text: 'Remote support' },
      documentation_control: { items: [] },
      customer_training: { text: 'Training' },
      system_config: { text: 'Config' },
      fat_condition: { text: 'FAT' },
      tech_stack: { rows: [] },
      hardware_specs: { rows: [] },
      software_specs: { rows: [] },
      third_party_sw: { rows: [] },
      overall_gantt: { text: 'Overall gantt' },
      shutdown_gantt: { text: 'Shutdown' },
      poc: { text: 'POC' },
      buyer_prerequisites: { items: [] },
      buyer_obligations: { items: [] },
      division_of_eng: { rows: [] },
      supervisors: { rows: [] },
      value_addition: { items: [] },
      work_completion: { text: 'Work completion' },
      exclusion_list: { items: [] },
      binding_conditions: { paragraphs: [] },
      cybersecurity: { paragraphs: [] },
      disclaimer: { sections: [] },
      scope_definitions: { lines: [] },
      executive_summary: { paragraphs: [] },
      revision_history: { rows: [] },
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

    // Assert: Should display "Preview - X / 27 complete"
    const expectedTotal = 27; // All sections present
    const completionBadge = screen.getByText(/Preview - \d+ \/ \d+ complete/);
    
    const match = completionBadge.textContent?.match(/Preview - (\d+) \/ (\d+) complete/);
    expect(match).not.toBeNull();
    
    const displayedTotal = match ? parseInt(match[2], 10) : 0;
    
    // This should PASS on unfixed code (baseline behavior)
    expect(displayedTotal).toBe(expectedTotal);
  });

  /**
   * Test Case 4: Property-based test - scoped to concrete failing cases
   * 
   * This test uses property-based testing to verify the bug exists across
   * multiple section count scenarios (scoped to deterministic cases).
   */
  it('should display dynamic total for any section count less than 27', () => {
    fc.assert(
      fc.property(
        // Generate section counts from 10 to 26 (excluding 27 which is the baseline)
        fc.integer({ min: 10, max: 26 }),
        (sectionCount) => {
          // Arrange: Create sectionContents with the specified number of sections
          const allSections = [
            'cover', 'introduction', 'abbreviations', 'process_flow', 'overview',
            'features', 'remote_support', 'documentation_control', 'customer_training',
            'system_config', 'fat_condition', 'tech_stack', 'hardware_specs',
            'software_specs', 'third_party_sw', 'overall_gantt', 'shutdown_gantt',
            'poc', 'buyer_prerequisites', 'buyer_obligations', 'division_of_eng',
            'supervisors', 'value_addition', 'work_completion', 'exclusion_list',
            'binding_conditions', 'cybersecurity', 'disclaimer', 'scope_definitions',
            'executive_summary', 'revision_history'
          ];

          // Take only the first sectionCount sections
          const selectedSections = allSections.slice(0, sectionCount);
          const sectionContents: Record<string, Record<string, any>> = {};
          
          selectedSections.forEach(key => {
            sectionContents[key] = { text: `Content for ${key}` };
          });

          // Act: Render the component
          const { unmount } = renderWithRouter(
            <DocumentPreview
              projectId={projectId}
              activeSectionKey={activeSectionKey}
              sectionContents={sectionContents}
              onSectionClick={onSectionClick}
            />
          );

          // Assert: Should display dynamic total
          const totalSections = Object.keys(sectionContents).length;
          const expectedTotal = totalSections - 4;
          const completionBadge = screen.getByText(/Preview - \d+ \/ \d+ complete/);
          
          const match = completionBadge.textContent?.match(/Preview - (\d+) \/ (\d+) complete/);
          const displayedTotal = match ? parseInt(match[2], 10) : 0;
          
          // Cleanup
          unmount();
          
          // This will FAIL on unfixed code for any sectionCount < 27
          return displayedTotal === expectedTotal;
        }
      ),
      { numRuns: 10 } // Run 10 test cases with different section counts
    );
  });
});
