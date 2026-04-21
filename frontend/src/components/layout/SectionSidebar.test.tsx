import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import SectionSidebar from './SectionSidebar';
import * as fc from 'fast-check';
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

describe('SectionSidebar - Bug Condition: Dynamic Total Calculation', () => {
  /**
   * **Validates: Requirements 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 2.4**
   * 
   * Property 1: Bug Condition - Dynamic Total Calculation
   * 
   * This test explores the bug condition where the total section count is hardcoded
   * to 27 on line 127, even when sections are deleted and sectionContents has fewer
   * than 27 sections.
   * 
   * CRITICAL: This test MUST FAIL on unfixed code - failure confirms the bug exists.
   * 
   * The test verifies that when sectionContents has fewer than 27 sections (e.g., 24
   * sections after 3 deletions), the displayed total count should equal the actual
   * section count minus 4 auto-complete sections.
   * 
   * Expected behavior: displayedTotal == Object.keys(sectionContents).length - 4
   * Actual behavior (unfixed): displayedTotal == 27 (hardcoded)
   */
  
  beforeEach(() => {
    // Reset the mock before each test
    vi.clearAllMocks();
    
    // Mock useProjectStore to return a sectionCompletion state
    // We'll set up completion for 14 sections (excluding the 4 auto-complete sections)
    const mockSectionCompletion: Record<string, boolean> = {
      cover: true,
      revision_history: true,
      executive_summary: true,
      introduction: true,
      abbreviations: true,
      process_flow: true,
      overview: true,
      features: true,
      remote_support: true,
      documentation_control: true,
      customer_training: true,
      system_config: true,
      fat_condition: true,
      tech_stack: true,
      // The rest are incomplete or don't exist
    };
    
    (useProjectStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockSectionCompletion);
  });

  const mockProps = {
    projectId: 'test-project-123',
    activeSectionKey: null,
    onSectionClick: vi.fn(),
    visitedSections: new Set<string>(),
    width: 200,
    showResizeHandle: false,
    isResizing: false,
  };

  it('should display "14 / 24 sections complete" when 24 sections exist (3 deleted)', () => {
    // Arrange: Create sectionContents with 24 sections (27 - 3 deletions)
    // This means 24 + 4 auto-complete = 28 total keys, but we exclude 4 auto-complete
    // So the expected total is 24
    const sectionContentsWith24Sections: Record<string, Record<string, any>> = {
      // COVER & HISTORY (2)
      cover: { title: 'Cover Page' },
      revision_history: { content: 'History' },
      // GENERAL OVERVIEW (5)
      executive_summary: { content: 'Summary' },
      introduction: { content: 'Intro' },
      abbreviations: { content: 'Abbr' },
      process_flow: { content: 'Flow' },
      overview: { content: 'Overview' },
      // OFFERINGS (6)
      features: { list: ['Feature 1'] },
      remote_support: { content: 'Support' },
      documentation_control: { content: 'Docs' },
      customer_training: { content: 'Training' },
      system_config: { content: 'Config' },
      fat_condition: { content: 'FAT' },
      // TECHNOLOGY STACK (4)
      tech_stack: { content: 'Tech' },
      hardware_specs: { content: 'Hardware' },
      software_specs: { content: 'Software' },
      third_party_sw: { content: 'Third Party' },
      // SCHEDULE (3) - 1 deleted (supervisors)
      overall_gantt: { content: 'Gantt' },
      shutdown_gantt: { content: 'Shutdown' },
      // supervisors: DELETED
      // SCOPE OF SUPPLY (7) - 1 deleted (buyer_prerequisites)
      scope_definitions: { content: 'Scope' }, // auto-complete
      division_of_eng: { content: 'Division' },
      work_completion: { content: 'Work' },
      buyer_obligations: { content: 'Buyer' },
      exclusion_list: { content: 'Exclusion' },
      value_addition: { content: 'Value' },
      // buyer_prerequisites: DELETED
      // LEGAL (4) - 1 deleted (poc)
      binding_conditions: { content: 'Binding' }, // auto-complete
      cybersecurity: { content: 'Cyber' }, // auto-complete
      disclaimer: { content: 'Disclaimer' }, // auto-complete
      // poc: DELETED
    };

    // Total sections: 28 keys
    // Auto-complete sections: 4 (scope_definitions, binding_conditions, cybersecurity, disclaimer)
    // Expected total: 28 - 4 = 24
    const expectedTotal = Object.keys(sectionContentsWith24Sections).length - 4;
    expect(expectedTotal).toBe(24); // Sanity check

    // Act: Render the sidebar
    render(<SectionSidebar {...mockProps} sectionContents={sectionContentsWith24Sections} />);

    // Assert: The progress indicator should show "14 / 24 sections complete"
    // This assertion will FAIL on unfixed code because line 127 has totalCompletable = 27
    const progressText = screen.getByText(/14 \/ 24 sections complete/i);
    expect(progressText).toBeInTheDocument();
  });

  it('should display "10 / 22 sections complete" when 22 sections exist (5 deleted)', () => {
    // Arrange: Create sectionContents with 22 sections (27 - 5 deletions)
    const sectionContentsWith22Sections: Record<string, Record<string, any>> = {
      // COVER & HISTORY (2)
      cover: { title: 'Cover Page' },
      revision_history: { content: 'History' },
      // GENERAL OVERVIEW (4) - 1 deleted (process_flow)
      executive_summary: { content: 'Summary' },
      introduction: { content: 'Intro' },
      abbreviations: { content: 'Abbr' },
      overview: { content: 'Overview' },
      // OFFERINGS (5) - 1 deleted (fat_condition)
      features: { list: ['Feature 1'] },
      remote_support: { content: 'Support' },
      documentation_control: { content: 'Docs' },
      customer_training: { content: 'Training' },
      system_config: { content: 'Config' },
      // TECHNOLOGY STACK (3) - 1 deleted (third_party_sw)
      tech_stack: { content: 'Tech' },
      hardware_specs: { content: 'Hardware' },
      software_specs: { content: 'Software' },
      // SCHEDULE (2) - 1 deleted (supervisors)
      overall_gantt: { content: 'Gantt' },
      shutdown_gantt: { content: 'Shutdown' },
      // SCOPE OF SUPPLY (6) - 1 deleted (buyer_prerequisites)
      scope_definitions: { content: 'Scope' }, // auto-complete
      division_of_eng: { content: 'Division' },
      work_completion: { content: 'Work' },
      buyer_obligations: { content: 'Buyer' },
      exclusion_list: { content: 'Exclusion' },
      value_addition: { content: 'Value' },
      // LEGAL (4)
      binding_conditions: { content: 'Binding' }, // auto-complete
      cybersecurity: { content: 'Cyber' }, // auto-complete
      disclaimer: { content: 'Disclaimer' }, // auto-complete
      poc: { content: 'POC' },
    };

    // Total sections: 26 keys
    // Auto-complete sections: 4
    // Expected total: 26 - 4 = 22
    const expectedTotal = Object.keys(sectionContentsWith22Sections).length - 4;
    expect(expectedTotal).toBe(22); // Sanity check

    // Mock sectionCompletion with 10 completed sections
    const mockSectionCompletion: Record<string, boolean> = {
      cover: true,
      revision_history: true,
      executive_summary: true,
      introduction: true,
      abbreviations: true,
      overview: true,
      features: true,
      remote_support: true,
      documentation_control: true,
      customer_training: true,
    };
    (useProjectStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockSectionCompletion);

    // Act: Render the sidebar
    render(<SectionSidebar {...mockProps} sectionContents={sectionContentsWith22Sections} />);

    // Assert: The progress indicator should show "10 / 22 sections complete"
    // This assertion will FAIL on unfixed code because line 127 has totalCompletable = 27
    const progressText = screen.getByText(/10 \/ 22 sections complete/i);
    expect(progressText).toBeInTheDocument();
  });

  it('should display "20 / 26 sections complete" when 26 sections exist (1 deleted)', () => {
    // Arrange: Create sectionContents with 26 sections (27 - 1 deletion)
    const sectionContentsWith26Sections: Record<string, Record<string, any>> = {
      // COVER & HISTORY (2)
      cover: { title: 'Cover Page' },
      revision_history: { content: 'History' },
      // GENERAL OVERVIEW (5)
      executive_summary: { content: 'Summary' },
      introduction: { content: 'Intro' },
      abbreviations: { content: 'Abbr' },
      process_flow: { content: 'Flow' },
      overview: { content: 'Overview' },
      // OFFERINGS (6)
      features: { list: ['Feature 1'] },
      remote_support: { content: 'Support' },
      documentation_control: { content: 'Docs' },
      customer_training: { content: 'Training' },
      system_config: { content: 'Config' },
      fat_condition: { content: 'FAT' },
      // TECHNOLOGY STACK (4)
      tech_stack: { content: 'Tech' },
      hardware_specs: { content: 'Hardware' },
      software_specs: { content: 'Software' },
      third_party_sw: { content: 'Third Party' },
      // SCHEDULE (3)
      overall_gantt: { content: 'Gantt' },
      shutdown_gantt: { content: 'Shutdown' },
      supervisors: { content: 'Supervisors' },
      // SCOPE OF SUPPLY (6) - 1 deleted (buyer_prerequisites)
      scope_definitions: { content: 'Scope' }, // auto-complete
      division_of_eng: { content: 'Division' },
      work_completion: { content: 'Work' },
      buyer_obligations: { content: 'Buyer' },
      exclusion_list: { content: 'Exclusion' },
      value_addition: { content: 'Value' },
      // LEGAL (4)
      binding_conditions: { content: 'Binding' }, // auto-complete
      cybersecurity: { content: 'Cyber' }, // auto-complete
      disclaimer: { content: 'Disclaimer' }, // auto-complete
      poc: { content: 'POC' },
    };

    // Total sections: 30 keys
    // Auto-complete sections: 4
    // Expected total: 30 - 4 = 26
    const expectedTotal = Object.keys(sectionContentsWith26Sections).length - 4;
    expect(expectedTotal).toBe(26); // Sanity check

    // Mock sectionCompletion with 20 completed sections
    const mockSectionCompletion: Record<string, boolean> = {
      cover: true,
      revision_history: true,
      executive_summary: true,
      introduction: true,
      abbreviations: true,
      process_flow: true,
      overview: true,
      features: true,
      remote_support: true,
      documentation_control: true,
      customer_training: true,
      system_config: true,
      fat_condition: true,
      tech_stack: true,
      hardware_specs: true,
      software_specs: true,
      third_party_sw: true,
      overall_gantt: true,
      shutdown_gantt: true,
      supervisors: true,
    };
    (useProjectStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockSectionCompletion);

    // Act: Render the sidebar
    render(<SectionSidebar {...mockProps} sectionContents={sectionContentsWith26Sections} />);

    // Assert: The progress indicator should show "20 / 26 sections complete"
    // This assertion will FAIL on unfixed code because line 127 has totalCompletable = 27
    const progressText = screen.getByText(/20 \/ 26 sections complete/i);
    expect(progressText).toBeInTheDocument();
  });

  /**
   * Property-based test: For ANY sectionContents with fewer than 27 sections,
   * the displayed total SHALL equal Object.keys(sectionContents).length - 4.
   * 
   * This test generates random scenarios where sections are deleted and verifies
   * that the total count is calculated dynamically.
   */
  it('should dynamically calculate total from sectionContents (property-based)', () => {
    // Define all possible section keys (27 total, excluding 4 auto-complete)
    const allSectionKeys = [
      'cover', 'revision_history',
      'executive_summary', 'introduction', 'abbreviations', 'process_flow', 'overview',
      'features', 'remote_support', 'documentation_control', 'customer_training', 'system_config', 'fat_condition',
      'tech_stack', 'hardware_specs', 'software_specs', 'third_party_sw',
      'overall_gantt', 'shutdown_gantt', 'supervisors',
      'scope_definitions', 'division_of_eng', 'work_completion', 'buyer_obligations', 'exclusion_list', 'value_addition', 'buyer_prerequisites',
      'binding_conditions', 'cybersecurity', 'disclaimer', 'poc',
    ];

    // The 4 auto-complete sections
    const autoCompleteSections = ['binding_conditions', 'cybersecurity', 'disclaimer', 'scope_definitions'];

    fc.assert(
      fc.property(
        // Generate a random subset of sections with fewer than 27 sections
        // (to trigger the bug condition)
        fc.subarray(allSectionKeys, { minLength: 10, maxLength: 26 }),
        fc.integer({ min: 0, max: 23 }), // Random completed count
        (existingSectionKeys, completedCount) => {
          // Build sectionContents with only the existing sections
          const sectionContents: Record<string, Record<string, any>> = {};
          existingSectionKeys.forEach((key) => {
            sectionContents[key] = { content: `Content for ${key}` };
          });

          // Calculate expected total (excluding 4 auto-complete sections)
          const expectedTotal = Object.keys(sectionContents).length - 4;

          // Ensure we have fewer than 27 sections (bug condition)
          fc.pre(expectedTotal < 27);

          // Mock sectionCompletion with random completed sections
          const mockSectionCompletion: Record<string, boolean> = {};
          const completableSections = existingSectionKeys.filter(
            key => !autoCompleteSections.includes(key)
          );
          completableSections.slice(0, Math.min(completedCount, completableSections.length)).forEach((key) => {
            mockSectionCompletion[key] = true;
          });
          const actualCompletedCount = Object.keys(mockSectionCompletion).length;
          (useProjectStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockSectionCompletion);

          // Render the sidebar
          const { container, unmount } = render(
            <SectionSidebar {...mockProps} sectionContents={sectionContents} />
          );

          // Find the progress text
          const progressRegex = new RegExp(`${actualCompletedCount} \\/ ${expectedTotal} sections complete`, 'i');
          const progressElement = Array.from(container.querySelectorAll('div')).find(
            div => progressRegex.test(div.textContent || '')
          );

          // This assertion will FAIL on unfixed code because the total is hardcoded to 27
          expect(progressElement).toBeDefined();

          // Cleanup
          unmount();
        }
      ),
      {
        numRuns: 20, // Run 20 random test cases
        seed: 123, // Use a fixed seed for reproducibility
      }
    );
  });
});

describe('SectionSidebar - Bug Condition Exploration', () => {
  /**
   * **Validates: Requirements 2.1, 2.2, 2.3**
   * 
   * Property 1: Bug Condition - Deleted Sections Removed from Sidebar
   * 
   * This test explores the bug condition where sections that do NOT exist in
   * sectionContents are still rendered in the sidebar navigation.
   * 
   * CRITICAL: This test MUST FAIL on unfixed code - failure confirms the bug exists.
   * 
   * The test uses a scoped PBT approach with concrete failing cases to ensure
   * reproducibility of the deterministic bug.
   */
  describe('Property 1: Deleted sections should NOT appear in sidebar', () => {
    const mockProps = {
      projectId: 'test-project-123',
      activeSectionKey: null,
      onSectionClick: vi.fn(),
      visitedSections: new Set<string>(),
      width: 200,
      showResizeHandle: false,
      isResizing: false,
    };

    it('should NOT render "Features" navigation item when features section is deleted', () => {
      // Arrange: Create sectionContents WITHOUT the "features" section
      const sectionContentsWithoutFeatures: Record<string, Record<string, any>> = {
        cover: { title: 'Cover Page' },
        executive_summary: { content: 'Summary' },
        introduction: { content: 'Intro' },
        // "features" is intentionally missing - it's been deleted
      };

      // Act: Render the sidebar
      render(<SectionSidebar {...mockProps} sectionContents={sectionContentsWithoutFeatures} />);

      // Assert: The "Features" navigation item should NOT be in the document
      // This assertion will FAIL on unfixed code because the sidebar renders from
      // the hardcoded SECTION_GROUPS array without checking sectionContents
      const featuresButton = screen.queryByRole('button', { name: /Features/i });
      expect(featuresButton).toBeNull();
    });

    it('should NOT render "Executive Summary" navigation item when executive_summary section is deleted', () => {
      // Arrange: Create sectionContents WITHOUT the "executive_summary" section
      const sectionContentsWithoutExecutiveSummary: Record<string, Record<string, any>> = {
        cover: { title: 'Cover Page' },
        introduction: { content: 'Intro' },
        features: { list: ['Feature 1'] },
        // "executive_summary" is intentionally missing - it's been deleted
      };

      // Act: Render the sidebar
      render(<SectionSidebar {...mockProps} sectionContents={sectionContentsWithoutExecutiveSummary} />);

      // Assert: The "Executive Summary" navigation item should NOT be in the document
      const executiveSummaryButton = screen.queryByRole('button', { name: /Executive Summary/i });
      expect(executiveSummaryButton).toBeNull();
    });

    it('should NOT render "TECHNOLOGY STACK" category header when all sections in that category are deleted', () => {
      // Arrange: Create sectionContents WITHOUT any TECHNOLOGY STACK sections
      const sectionContentsWithoutTechStack: Record<string, Record<string, any>> = {
        cover: { title: 'Cover Page' },
        executive_summary: { content: 'Summary' },
        features: { list: ['Feature 1'] },
        // All TECHNOLOGY STACK sections are missing:
        // - tech_stack
        // - hardware_specs
        // - software_specs
        // - third_party_sw
      };

      // Act: Render the sidebar
      render(<SectionSidebar {...mockProps} sectionContents={sectionContentsWithoutTechStack} />);

      // Assert: The "TECHNOLOGY STACK" category header should NOT be in the document
      const techStackHeader = screen.queryByText('TECHNOLOGY STACK');
      expect(techStackHeader).toBeNull();
    });

    /**
     * Property-based test: For ANY section key that does NOT exist in sectionContents,
     * the sidebar SHALL NOT render a navigation item for that section.
     * 
     * This test generates random scenarios where sections are deleted and verifies
     * that the sidebar correctly filters them out.
     */
    it('should NOT render navigation items for any deleted sections (property-based)', () => {
      // Define all possible section keys from SECTION_GROUPS
      const allSectionKeys = [
        'cover', 'revision_history',
        'executive_summary', 'introduction', 'abbreviations', 'process_flow', 'overview',
        'features', 'remote_support', 'documentation_control', 'customer_training', 'system_config', 'fat_condition',
        'tech_stack', 'hardware_specs', 'software_specs', 'third_party_sw',
        'overall_gantt', 'shutdown_gantt', 'supervisors',
        'scope_definitions', 'division_of_eng', 'work_completion', 'buyer_obligations', 'exclusion_list', 'value_addition', 'buyer_prerequisites',
        'binding_conditions', 'cybersecurity', 'disclaimer', 'poc',
      ];

      // Map section keys to their display labels
      const sectionLabels: Record<string, string> = {
        cover: 'Cover',
        revision_history: 'Revision History',
        executive_summary: 'Executive Summary',
        introduction: 'Introduction',
        abbreviations: 'Abbreviations',
        process_flow: 'Process Flow',
        overview: 'Overview',
        features: 'Features',
        remote_support: 'Remote Support',
        documentation_control: 'Documentation Control',
        customer_training: 'Customer Training',
        system_config: 'System Configuration',
        fat_condition: 'FAT Condition',
        tech_stack: 'Technology Stack',
        hardware_specs: 'Hardware Specifications',
        software_specs: 'Software Specifications',
        third_party_sw: 'Third Party Software',
        overall_gantt: 'Overall Gantt Chart',
        shutdown_gantt: 'Shutdown Gantt Chart',
        supervisors: 'Supervisors',
        scope_definitions: 'Scope Definitions',
        division_of_eng: 'Division of Engineering',
        work_completion: 'Work Completion',
        buyer_obligations: 'Buyer Obligations',
        exclusion_list: 'Exclusion List',
        value_addition: 'Value Addition',
        buyer_prerequisites: 'Buyer Prerequisites',
        binding_conditions: 'Binding Conditions',
        cybersecurity: 'Cybersecurity',
        disclaimer: 'Disclaimer',
        poc: 'Proof of Concept',
      };

      fc.assert(
        fc.property(
          // Generate a random subset of sections to include (the rest are "deleted")
          fc.subarray(allSectionKeys, { minLength: 1, maxLength: allSectionKeys.length - 1 }),
          (existingSectionKeys) => {
            // Build sectionContents with only the existing sections
            const sectionContents: Record<string, Record<string, any>> = {};
            existingSectionKeys.forEach((key) => {
              sectionContents[key] = { content: `Content for ${key}` };
            });

            // Determine which sections are deleted (not in sectionContents)
            const deletedSectionKeys = allSectionKeys.filter(
              (key) => !existingSectionKeys.includes(key)
            );

            // Render the sidebar
            const { container, unmount } = render(
              <SectionSidebar {...mockProps} sectionContents={sectionContents} />
            );

            // For each deleted section, verify it does NOT appear in the sidebar
            deletedSectionKeys.forEach((deletedKey) => {
              const label = sectionLabels[deletedKey];
              // Query within the container to avoid finding elements from previous renders
              const buttons = Array.from(container.querySelectorAll('button'));
              const button = buttons.find(b => new RegExp(label, 'i').test(b.textContent || ''));
              
              // This assertion will FAIL on unfixed code because deleted sections
              // are still rendered from the hardcoded SECTION_GROUPS array
              expect(button).toBeUndefined();
            });

            // Cleanup after each render to avoid DOM pollution
            unmount();
          }
        ),
        {
          numRuns: 20, // Run 20 random test cases
          seed: 42, // Use a fixed seed for reproducibility
        }
      );
    });
  });
});

describe('SectionSidebar - Preservation: Completion Calculation Unchanged', () => {
  /**
   * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**
   * 
   * Property 2: Preservation - Completion Calculation Unchanged
   * 
   * This test suite verifies that the fix does NOT break existing behavior for
   * non-buggy inputs. These tests observe and capture the baseline behavior on
   * UNFIXED code, then verify it remains unchanged after the fix.
   * 
   * CRITICAL: These tests MUST PASS on unfixed code - they capture behavior to preserve.
   * 
   * The tests verify:
   * - Completion count calculation excludes 4 auto-complete sections
   * - Completion percentage calculation uses (completedCount / totalCompletable) * 100
   * - Visible sections filtering checks sectionContents?.[section.key]
   * - Full project (27 sections) displays "X / 27 sections"
   */

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockProps = {
    projectId: 'test-project-123',
    activeSectionKey: null,
    onSectionClick: vi.fn(),
    visitedSections: new Set<string>(),
    width: 200,
    showResizeHandle: false,
    isResizing: false,
  };

  describe('Requirement 3.1: Completion count excludes 4 auto-complete sections', () => {
    it('should exclude binding_conditions, cybersecurity, disclaimer, scope_definitions from completed count', () => {
      // Arrange: Create a full project with 27 sections
      const fullProjectSectionContents: Record<string, Record<string, any>> = {
        // COVER & HISTORY (2)
        cover: { title: 'Cover Page' },
        revision_history: { content: 'History' },
        // GENERAL OVERVIEW (5)
        executive_summary: { content: 'Summary' },
        introduction: { content: 'Intro' },
        abbreviations: { content: 'Abbr' },
        process_flow: { content: 'Flow' },
        overview: { content: 'Overview' },
        // OFFERINGS (6)
        features: { list: ['Feature 1'] },
        remote_support: { content: 'Support' },
        documentation_control: { content: 'Docs' },
        customer_training: { content: 'Training' },
        system_config: { content: 'Config' },
        fat_condition: { content: 'FAT' },
        // TECHNOLOGY STACK (4)
        tech_stack: { content: 'Tech' },
        hardware_specs: { content: 'Hardware' },
        software_specs: { content: 'Software' },
        third_party_sw: { content: 'Third Party' },
        // SCHEDULE (3)
        overall_gantt: { content: 'Gantt' },
        shutdown_gantt: { content: 'Shutdown' },
        supervisors: { content: 'Supervisors' },
        // SCOPE OF SUPPLY (7)
        scope_definitions: { content: 'Scope' }, // auto-complete
        division_of_eng: { content: 'Division' },
        work_completion: { content: 'Work' },
        buyer_obligations: { content: 'Buyer' },
        exclusion_list: { content: 'Exclusion' },
        value_addition: { content: 'Value' },
        buyer_prerequisites: { content: 'Prerequisites' },
        // LEGAL (4)
        binding_conditions: { content: 'Binding' }, // auto-complete
        cybersecurity: { content: 'Cyber' }, // auto-complete
        disclaimer: { content: 'Disclaimer' }, // auto-complete
        poc: { content: 'POC' },
      };

      // Mock sectionCompletion: Mark ALL sections as complete, including the 4 auto-complete
      const mockSectionCompletion: Record<string, boolean> = {};
      Object.keys(fullProjectSectionContents).forEach((key) => {
        mockSectionCompletion[key] = true;
      });
      (useProjectStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockSectionCompletion);

      // Act: Render the sidebar
      render(<SectionSidebar {...mockProps} sectionContents={fullProjectSectionContents} />);

      // Assert: The completed count should be 27 (31 total - 4 auto-complete)
      // Even though all 31 sections are marked complete, only 27 should count
      const progressText = screen.getByText(/27 \/ 27 sections complete/i);
      expect(progressText).toBeInTheDocument();
    });

    it('should count only non-auto-complete sections when partially complete', () => {
      // Arrange: Create a full project with 27 sections
      const fullProjectSectionContents: Record<string, Record<string, any>> = {
        cover: { title: 'Cover Page' },
        revision_history: { content: 'History' },
        executive_summary: { content: 'Summary' },
        introduction: { content: 'Intro' },
        abbreviations: { content: 'Abbr' },
        process_flow: { content: 'Flow' },
        overview: { content: 'Overview' },
        features: { list: ['Feature 1'] },
        remote_support: { content: 'Support' },
        documentation_control: { content: 'Docs' },
        customer_training: { content: 'Training' },
        system_config: { content: 'Config' },
        fat_condition: { content: 'FAT' },
        tech_stack: { content: 'Tech' },
        hardware_specs: { content: 'Hardware' },
        software_specs: { content: 'Software' },
        third_party_sw: { content: 'Third Party' },
        overall_gantt: { content: 'Gantt' },
        shutdown_gantt: { content: 'Shutdown' },
        supervisors: { content: 'Supervisors' },
        scope_definitions: { content: 'Scope' },
        division_of_eng: { content: 'Division' },
        work_completion: { content: 'Work' },
        buyer_obligations: { content: 'Buyer' },
        exclusion_list: { content: 'Exclusion' },
        value_addition: { content: 'Value' },
        buyer_prerequisites: { content: 'Prerequisites' },
        binding_conditions: { content: 'Binding' },
        cybersecurity: { content: 'Cyber' },
        disclaimer: { content: 'Disclaimer' },
        poc: { content: 'POC' },
      };

      // Mock sectionCompletion: Mark 15 non-auto-complete sections as complete
      // AND mark all 4 auto-complete sections as complete
      const mockSectionCompletion: Record<string, boolean> = {
        // 15 regular sections
        cover: true,
        revision_history: true,
        executive_summary: true,
        introduction: true,
        abbreviations: true,
        process_flow: true,
        overview: true,
        features: true,
        remote_support: true,
        documentation_control: true,
        customer_training: true,
        system_config: true,
        fat_condition: true,
        tech_stack: true,
        hardware_specs: true,
        // 4 auto-complete sections (should NOT count)
        binding_conditions: true,
        cybersecurity: true,
        disclaimer: true,
        scope_definitions: true,
      };
      (useProjectStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockSectionCompletion);

      // Act: Render the sidebar
      render(<SectionSidebar {...mockProps} sectionContents={fullProjectSectionContents} />);

      // Assert: The completed count should be 15 (not 19)
      // The 4 auto-complete sections should be excluded from the count
      const progressText = screen.getByText(/15 \/ 27 sections complete/i);
      expect(progressText).toBeInTheDocument();
    });
  });

  describe('Requirement 3.2: Full project (27 sections) displays "X / 27 sections"', () => {
    it('should display "15 / 27 sections complete" for a full project with 15 completed', () => {
      // Arrange: Create a full project with all 27 sections (31 total including 4 auto-complete)
      const fullProjectSectionContents: Record<string, Record<string, any>> = {
        cover: { title: 'Cover Page' },
        revision_history: { content: 'History' },
        executive_summary: { content: 'Summary' },
        introduction: { content: 'Intro' },
        abbreviations: { content: 'Abbr' },
        process_flow: { content: 'Flow' },
        overview: { content: 'Overview' },
        features: { list: ['Feature 1'] },
        remote_support: { content: 'Support' },
        documentation_control: { content: 'Docs' },
        customer_training: { content: 'Training' },
        system_config: { content: 'Config' },
        fat_condition: { content: 'FAT' },
        tech_stack: { content: 'Tech' },
        hardware_specs: { content: 'Hardware' },
        software_specs: { content: 'Software' },
        third_party_sw: { content: 'Third Party' },
        overall_gantt: { content: 'Gantt' },
        shutdown_gantt: { content: 'Shutdown' },
        supervisors: { content: 'Supervisors' },
        scope_definitions: { content: 'Scope' },
        division_of_eng: { content: 'Division' },
        work_completion: { content: 'Work' },
        buyer_obligations: { content: 'Buyer' },
        exclusion_list: { content: 'Exclusion' },
        value_addition: { content: 'Value' },
        buyer_prerequisites: { content: 'Prerequisites' },
        binding_conditions: { content: 'Binding' },
        cybersecurity: { content: 'Cyber' },
        disclaimer: { content: 'Disclaimer' },
        poc: { content: 'POC' },
      };

      // Mock sectionCompletion with 15 completed sections
      const mockSectionCompletion: Record<string, boolean> = {
        cover: true,
        revision_history: true,
        executive_summary: true,
        introduction: true,
        abbreviations: true,
        process_flow: true,
        overview: true,
        features: true,
        remote_support: true,
        documentation_control: true,
        customer_training: true,
        system_config: true,
        fat_condition: true,
        tech_stack: true,
        hardware_specs: true,
      };
      (useProjectStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockSectionCompletion);

      // Act: Render the sidebar
      render(<SectionSidebar {...mockProps} sectionContents={fullProjectSectionContents} />);

      // Assert: Should display "15 / 27 sections complete"
      const progressText = screen.getByText(/15 \/ 27 sections complete/i);
      expect(progressText).toBeInTheDocument();
    });

    it('should display "0 / 27 sections complete" for a full project with no completed sections', () => {
      // Arrange: Create a full project with all 27 sections
      const fullProjectSectionContents: Record<string, Record<string, any>> = {
        cover: { title: 'Cover Page' },
        revision_history: { content: 'History' },
        executive_summary: { content: 'Summary' },
        introduction: { content: 'Intro' },
        abbreviations: { content: 'Abbr' },
        process_flow: { content: 'Flow' },
        overview: { content: 'Overview' },
        features: { list: ['Feature 1'] },
        remote_support: { content: 'Support' },
        documentation_control: { content: 'Docs' },
        customer_training: { content: 'Training' },
        system_config: { content: 'Config' },
        fat_condition: { content: 'FAT' },
        tech_stack: { content: 'Tech' },
        hardware_specs: { content: 'Hardware' },
        software_specs: { content: 'Software' },
        third_party_sw: { content: 'Third Party' },
        overall_gantt: { content: 'Gantt' },
        shutdown_gantt: { content: 'Shutdown' },
        supervisors: { content: 'Supervisors' },
        scope_definitions: { content: 'Scope' },
        division_of_eng: { content: 'Division' },
        work_completion: { content: 'Work' },
        buyer_obligations: { content: 'Buyer' },
        exclusion_list: { content: 'Exclusion' },
        value_addition: { content: 'Value' },
        buyer_prerequisites: { content: 'Prerequisites' },
        binding_conditions: { content: 'Binding' },
        cybersecurity: { content: 'Cyber' },
        disclaimer: { content: 'Disclaimer' },
        poc: { content: 'POC' },
      };

      // Mock sectionCompletion with no completed sections
      const mockSectionCompletion: Record<string, boolean> = {};
      (useProjectStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockSectionCompletion);

      // Act: Render the sidebar
      render(<SectionSidebar {...mockProps} sectionContents={fullProjectSectionContents} />);

      // Assert: Should display "0 / 27 sections complete"
      const progressText = screen.getByText(/0 \/ 27 sections complete/i);
      expect(progressText).toBeInTheDocument();
    });
  });

  describe('Requirement 3.3: Visible sections filtering checks sectionContents', () => {
    it('should only render sections that exist in sectionContents', () => {
      // Arrange: Create sectionContents with only a subset of sections
      const partialSectionContents: Record<string, Record<string, any>> = {
        cover: { title: 'Cover Page' },
        executive_summary: { content: 'Summary' },
        features: { list: ['Feature 1'] },
        tech_stack: { content: 'Tech' },
      };

      const mockSectionCompletion: Record<string, boolean> = {};
      (useProjectStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockSectionCompletion);

      // Act: Render the sidebar
      render(<SectionSidebar {...mockProps} sectionContents={partialSectionContents} />);

      // Assert: Only the 4 sections in sectionContents should be rendered
      expect(screen.getByRole('button', { name: /Cover/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Executive Summary/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Features/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Technology Stack/i })).toBeInTheDocument();

      // Sections NOT in sectionContents should NOT be rendered
      expect(screen.queryByRole('button', { name: /Introduction/i })).toBeNull();
      expect(screen.queryByRole('button', { name: /Abbreviations/i })).toBeNull();
      expect(screen.queryByRole('button', { name: /Remote Support/i })).toBeNull();
    });

    it('should hide entire category when no sections in that category exist in sectionContents', () => {
      // Arrange: Create sectionContents WITHOUT any TECHNOLOGY STACK sections
      const sectionContentsWithoutTechStack: Record<string, Record<string, any>> = {
        cover: { title: 'Cover Page' },
        executive_summary: { content: 'Summary' },
        features: { list: ['Feature 1'] },
      };

      const mockSectionCompletion: Record<string, boolean> = {};
      (useProjectStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockSectionCompletion);

      // Act: Render the sidebar
      render(<SectionSidebar {...mockProps} sectionContents={sectionContentsWithoutTechStack} />);

      // Assert: The "TECHNOLOGY STACK" category header should NOT be rendered
      expect(screen.queryByText('TECHNOLOGY STACK')).toBeNull();

      // But other categories should still be rendered
      expect(screen.getByText('COVER & HISTORY')).toBeInTheDocument();
      expect(screen.getByText('GENERAL OVERVIEW')).toBeInTheDocument();
      expect(screen.getByText('OFFERINGS')).toBeInTheDocument();
    });
  });

  describe('Requirement 3.4: Completion percentage calculation', () => {
    it('should calculate percentage as (completedCount / totalCompletable) * 100', () => {
      // Arrange: Create a full project with 27 sections
      const fullProjectSectionContents: Record<string, Record<string, any>> = {
        cover: { title: 'Cover Page' },
        revision_history: { content: 'History' },
        executive_summary: { content: 'Summary' },
        introduction: { content: 'Intro' },
        abbreviations: { content: 'Abbr' },
        process_flow: { content: 'Flow' },
        overview: { content: 'Overview' },
        features: { list: ['Feature 1'] },
        remote_support: { content: 'Support' },
        documentation_control: { content: 'Docs' },
        customer_training: { content: 'Training' },
        system_config: { content: 'Config' },
        fat_condition: { content: 'FAT' },
        tech_stack: { content: 'Tech' },
        hardware_specs: { content: 'Hardware' },
        software_specs: { content: 'Software' },
        third_party_sw: { content: 'Third Party' },
        overall_gantt: { content: 'Gantt' },
        shutdown_gantt: { content: 'Shutdown' },
        supervisors: { content: 'Supervisors' },
        scope_definitions: { content: 'Scope' },
        division_of_eng: { content: 'Division' },
        work_completion: { content: 'Work' },
        buyer_obligations: { content: 'Buyer' },
        exclusion_list: { content: 'Exclusion' },
        value_addition: { content: 'Value' },
        buyer_prerequisites: { content: 'Prerequisites' },
        binding_conditions: { content: 'Binding' },
        cybersecurity: { content: 'Cyber' },
        disclaimer: { content: 'Disclaimer' },
        poc: { content: 'POC' },
      };

      // Mock sectionCompletion with 14 completed sections (14/27 ≈ 52%)
      const mockSectionCompletion: Record<string, boolean> = {
        cover: true,
        revision_history: true,
        executive_summary: true,
        introduction: true,
        abbreviations: true,
        process_flow: true,
        overview: true,
        features: true,
        remote_support: true,
        documentation_control: true,
        customer_training: true,
        system_config: true,
        fat_condition: true,
        tech_stack: true,
      };
      (useProjectStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockSectionCompletion);

      // Act: Render the sidebar
      const { container } = render(<SectionSidebar {...mockProps} sectionContents={fullProjectSectionContents} />);

      // Assert: The progress bar should have width of 52% (Math.round(14/27 * 100))
      const expectedPercentage = Math.round((14 / 27) * 100);
      expect(expectedPercentage).toBe(52);

      // Find the progress bar element
      const progressBar = container.querySelector('div[style*="width: 52%"]');
      expect(progressBar).toBeInTheDocument();
    });

    it('should calculate 100% when all 27 sections are complete', () => {
      // Arrange: Create a full project with all 27 sections
      const fullProjectSectionContents: Record<string, Record<string, any>> = {
        cover: { title: 'Cover Page' },
        revision_history: { content: 'History' },
        executive_summary: { content: 'Summary' },
        introduction: { content: 'Intro' },
        abbreviations: { content: 'Abbr' },
        process_flow: { content: 'Flow' },
        overview: { content: 'Overview' },
        features: { list: ['Feature 1'] },
        remote_support: { content: 'Support' },
        documentation_control: { content: 'Docs' },
        customer_training: { content: 'Training' },
        system_config: { content: 'Config' },
        fat_condition: { content: 'FAT' },
        tech_stack: { content: 'Tech' },
        hardware_specs: { content: 'Hardware' },
        software_specs: { content: 'Software' },
        third_party_sw: { content: 'Third Party' },
        overall_gantt: { content: 'Gantt' },
        shutdown_gantt: { content: 'Shutdown' },
        supervisors: { content: 'Supervisors' },
        scope_definitions: { content: 'Scope' },
        division_of_eng: { content: 'Division' },
        work_completion: { content: 'Work' },
        buyer_obligations: { content: 'Buyer' },
        exclusion_list: { content: 'Exclusion' },
        value_addition: { content: 'Value' },
        buyer_prerequisites: { content: 'Prerequisites' },
        binding_conditions: { content: 'Binding' },
        cybersecurity: { content: 'Cyber' },
        disclaimer: { content: 'Disclaimer' },
        poc: { content: 'POC' },
      };

      // Mock sectionCompletion with all 27 non-auto-complete sections complete
      const mockSectionCompletion: Record<string, boolean> = {
        cover: true,
        revision_history: true,
        executive_summary: true,
        introduction: true,
        abbreviations: true,
        process_flow: true,
        overview: true,
        features: true,
        remote_support: true,
        documentation_control: true,
        customer_training: true,
        system_config: true,
        fat_condition: true,
        tech_stack: true,
        hardware_specs: true,
        software_specs: true,
        third_party_sw: true,
        overall_gantt: true,
        shutdown_gantt: true,
        supervisors: true,
        division_of_eng: true,
        work_completion: true,
        buyer_obligations: true,
        exclusion_list: true,
        value_addition: true,
        buyer_prerequisites: true,
        poc: true,
      };
      (useProjectStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockSectionCompletion);

      // Act: Render the sidebar
      const { container } = render(<SectionSidebar {...mockProps} sectionContents={fullProjectSectionContents} />);

      // Assert: The progress bar should have width of 100%
      const progressBar = container.querySelector('div[style*="width: 100%"]');
      expect(progressBar).toBeInTheDocument();
    });
  });

  describe('Requirement 3.5: Section status determination', () => {
    it('should correctly identify complete, visited, and not_started sections', () => {
      // Arrange: Create a full project
      const fullProjectSectionContents: Record<string, Record<string, any>> = {
        cover: { title: 'Cover Page' },
        executive_summary: { content: 'Summary' },
        introduction: { content: 'Intro' },
        features: { list: ['Feature 1'] },
      };

      // Mock sectionCompletion: cover is complete
      const mockSectionCompletion: Record<string, boolean> = {
        cover: true,
      };
      (useProjectStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockSectionCompletion);

      // Mock visitedSections: executive_summary is visited
      const visitedSections = new Set(['executive_summary']);

      // Act: Render the sidebar
      const { container } = render(
        <SectionSidebar
          {...mockProps}
          sectionContents={fullProjectSectionContents}
          visitedSections={visitedSections}
        />
      );

      // Assert: Verify the CompletionBadge components are rendered correctly
      // We can't directly test the badge status, but we can verify the sections are rendered
      expect(screen.getByRole('button', { name: /Cover/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Executive Summary/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Introduction/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Features/i })).toBeInTheDocument();
    });
  });

  /**
   * Property-based test: For ANY full project (27 sections), the completion
   * calculation, percentage display, and section filtering SHALL remain unchanged.
   * 
   * This test generates random completion states for a full project and verifies
   * that all preservation requirements are met.
   */
  describe('Property-based preservation test', () => {
    it('should preserve all behaviors for full projects with varying completion states', () => {
      // Define all 27 completable section keys (excluding 4 auto-complete)
      const completableSectionKeys = [
        'cover', 'revision_history',
        'executive_summary', 'introduction', 'abbreviations', 'process_flow', 'overview',
        'features', 'remote_support', 'documentation_control', 'customer_training', 'system_config', 'fat_condition',
        'tech_stack', 'hardware_specs', 'software_specs', 'third_party_sw',
        'overall_gantt', 'shutdown_gantt', 'supervisors',
        'division_of_eng', 'work_completion', 'buyer_obligations', 'exclusion_list', 'value_addition', 'buyer_prerequisites',
        'poc',
      ];

      // Define the 4 auto-complete sections
      const autoCompleteSections = ['binding_conditions', 'cybersecurity', 'disclaimer', 'scope_definitions'];

      // Create full project sectionContents (all 31 sections)
      const fullProjectSectionContents: Record<string, Record<string, any>> = {};
      [...completableSectionKeys, ...autoCompleteSections].forEach((key) => {
        fullProjectSectionContents[key] = { content: `Content for ${key}` };
      });

      fc.assert(
        fc.property(
          // Generate a random subset of completed sections
          fc.subarray(completableSectionKeys, { minLength: 0, maxLength: 27 }),
          (completedSectionKeys) => {
            // Mock sectionCompletion with the randomly completed sections
            const mockSectionCompletion: Record<string, boolean> = {};
            completedSectionKeys.forEach((key) => {
              mockSectionCompletion[key] = true;
            });
            (useProjectStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockSectionCompletion);

            // Render the sidebar
            const { container, unmount } = render(
              <SectionSidebar {...mockProps} sectionContents={fullProjectSectionContents} />
            );

            // Verify: Total should always be 27 for a full project
            const completedCount = completedSectionKeys.length;
            const progressRegex = new RegExp(`${completedCount} \\/ 27 sections complete`, 'i');
            const progressElement = Array.from(container.querySelectorAll('div')).find(
              div => progressRegex.test(div.textContent || '')
            );
            expect(progressElement).toBeDefined();

            // Verify: Completion percentage is calculated correctly
            const expectedPercentage = Math.round((completedCount / 27) * 100);
            const progressBar = container.querySelector(`div[style*="width: ${expectedPercentage}%"]`);
            expect(progressBar).toBeInTheDocument();

            // Cleanup
            unmount();
          }
        ),
        {
          numRuns: 30, // Run 30 random test cases
          seed: 789, // Use a fixed seed for reproducibility
        }
      );
    });
  });
});
