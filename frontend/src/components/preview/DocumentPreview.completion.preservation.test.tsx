/**
 * Preservation Property Tests for DocumentPreview Completion Count Calculation
 * 
 * **Validates: Requirements 3.1, 3.2, 3.4, 3.6**
 * 
 * Property 2: Preservation - Completion Calculation Unchanged (Preview)
 * 
 * This test suite follows the observation-first methodology:
 * 1. Observe behavior on UNFIXED code for non-buggy inputs (full project with 27 sections)
 * 2. Write property-based tests capturing observed behavior patterns
 * 3. Run tests on UNFIXED code - they should PASS
 * 4. After fix, re-run tests to ensure no regressions
 * 
 * CRITICAL: These tests MUST PASS on unfixed code - they capture behavior to preserve.
 * 
 * The tests verify:
 * - Completion count calculation continues to exclude 4 auto-complete sections
 * - Full project (27 sections) continues to display "Preview - X / 27 complete"
 * - Preview rendering and scrolling behavior remains unchanged
 * 
 * EXPECTED OUTCOME: All tests PASS on unfixed code (confirms baseline behavior to preserve)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import * as fc from 'fast-check';
import DocumentPreview from './DocumentPreview';
import { useProjectStore } from '../../store/project.store';

// Mock the project store
vi.mock('../../store/project.store', () => ({
  useProjectStore: vi.fn(() => ({
    solutionName: 'Test Solution',
    solutionFullName: 'Test Solution Full Name',
    clientName: 'Test Client',
    clientLocation: 'Test Location',
    sectionCompletion: {},
  })),
}));

// Mock the images API
vi.mock('../../api/images', () => ({
  getImages: vi.fn().mockResolvedValue([]),
}));

// Helper to wrap component with router
const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('DocumentPreview - Preservation: Completion Calculation Unchanged', () => {
  /**
   * **Validates: Requirements 3.1, 3.2, 3.4, 3.6**
   * 
   * Property 2: Preservation - Completion Calculation Unchanged (Preview)
   * 
   * This test suite verifies that the fix does NOT break existing behavior for
   * non-buggy inputs. These tests observe and capture the baseline behavior on
   * UNFIXED code, then verify it remains unchanged after the fix.
   * 
   * CRITICAL: These tests MUST PASS on unfixed code - they capture behavior to preserve.
   * 
   * The tests verify:
   * - Completion count calculation excludes 4 auto-complete sections (binding_conditions, cybersecurity, disclaimer, scope_definitions)
   * - Full project (27 sections) displays "Preview - X / 27 complete"
   * - Preview rendering and scrolling behavior remains unchanged
   */

  const projectId = 'test-project-id';
  const activeSectionKey = null;
  const onSectionClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock scrollIntoView which is not available in jsdom
    Element.prototype.scrollIntoView = vi.fn();
  });

  describe('Requirement 3.1: Completion count excludes 4 auto-complete sections', () => {
    it('should exclude binding_conditions, cybersecurity, disclaimer, scope_definitions from completed count', () => {
      // Arrange: Create a full project with all 31 sections (27 completable + 4 auto-complete)
      const fullProjectSectionContents: Record<string, Record<string, any>> = {
        // All 27 completable sections
        cover: { solution_full_name: 'Test Solution' },
        revision_history: { rows: [] },
        executive_summary: { para1: 'Summary' },
        introduction: { tender_reference: 'REF-001' },
        abbreviations: { rows: [] },
        process_flow: { text: 'Flow' },
        overview: { text: 'Overview' },
        features: { items: [] },
        remote_support: { text: 'Support' },
        documentation_control: { items: [] },
        customer_training: { text: 'Training' },
        system_config: { text: 'Config' },
        fat_condition: { text: 'FAT' },
        tech_stack: { rows: [] },
        hardware_specs: { rows: [] },
        software_specs: { rows: [] },
        third_party_sw: { rows: [] },
        overall_gantt: { text: 'Gantt' },
        shutdown_gantt: { text: 'Shutdown' },
        supervisors: { rows: [] },
        division_of_eng: { rows: [] },
        work_completion: { text: 'Work' },
        buyer_obligations: { items: [] },
        exclusion_list: { items: [] },
        value_addition: { items: [] },
        buyer_prerequisites: { items: [] },
        poc: { text: 'POC' },
        // 4 auto-complete sections (should be excluded from completed count)
        binding_conditions: { paragraphs: [] },
        cybersecurity: { paragraphs: [] },
        disclaimer: { sections: [] },
        scope_definitions: { lines: [] },
      };

      // Mock sectionCompletion: Mark ALL sections as complete, including the 4 auto-complete
      const mockSectionCompletion: Record<string, boolean> = {};
      Object.keys(fullProjectSectionContents).forEach((key) => {
        mockSectionCompletion[key] = true;
      });

      // Mock the project store with all sections complete
      (useProjectStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        solutionName: 'Test Solution',
        solutionFullName: 'Test Solution Full Name',
        clientName: 'Test Client',
        clientLocation: 'Test Location',
        sectionCompletion: mockSectionCompletion,
      });

      // Act: Render the preview
      renderWithRouter(
        <DocumentPreview
          projectId={projectId}
          activeSectionKey={activeSectionKey}
          sectionContents={fullProjectSectionContents}
          onSectionClick={onSectionClick}
        />
      );

      // Assert: The completed count should be 27 (31 total - 4 auto-complete)
      // Even though all 31 sections are marked complete, only 27 should count
      const completionBadge = screen.getByText(/Preview - \d+ \/ \d+ complete/);
      const match = completionBadge.textContent?.match(/Preview - (\d+) \/ (\d+) complete/);
      expect(match).not.toBeNull();
      
      const completedCount = match ? parseInt(match[1], 10) : 0;
      
      // Verify: Completed count should be 27 (excluding 4 auto-complete sections)
      expect(completedCount).toBe(27);
    });

    it('should count only non-auto-complete sections when partially complete', () => {
      // Arrange: Create a full project with 31 sections
      const fullProjectSectionContents: Record<string, Record<string, any>> = {
        cover: { solution_full_name: 'Test Solution' },
        revision_history: { rows: [] },
        executive_summary: { para1: 'Summary' },
        introduction: { tender_reference: 'REF-001' },
        abbreviations: { rows: [] },
        process_flow: { text: 'Flow' },
        overview: { text: 'Overview' },
        features: { items: [] },
        remote_support: { text: 'Support' },
        documentation_control: { items: [] },
        customer_training: { text: 'Training' },
        system_config: { text: 'Config' },
        fat_condition: { text: 'FAT' },
        tech_stack: { rows: [] },
        hardware_specs: { rows: [] },
        software_specs: { rows: [] },
        third_party_sw: { rows: [] },
        overall_gantt: { text: 'Gantt' },
        shutdown_gantt: { text: 'Shutdown' },
        supervisors: { rows: [] },
        division_of_eng: { rows: [] },
        work_completion: { text: 'Work' },
        buyer_obligations: { items: [] },
        exclusion_list: { items: [] },
        value_addition: { items: [] },
        buyer_prerequisites: { items: [] },
        poc: { text: 'POC' },
        binding_conditions: { paragraphs: [] },
        cybersecurity: { paragraphs: [] },
        disclaimer: { sections: [] },
        scope_definitions: { lines: [] },
      };

      // Mock sectionCompletion: Mark only 14 completable sections as complete
      // Also mark all 4 auto-complete sections as complete (they should be excluded)
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
        // 4 auto-complete sections marked complete (should be excluded from count)
        binding_conditions: true,
        cybersecurity: true,
        disclaimer: true,
        scope_definitions: true,
      };

      // Mock the project store
      (useProjectStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        solutionName: 'Test Solution',
        solutionFullName: 'Test Solution Full Name',
        clientName: 'Test Client',
        clientLocation: 'Test Location',
        sectionCompletion: mockSectionCompletion,
      });

      // Act: Render the preview
      renderWithRouter(
        <DocumentPreview
          projectId={projectId}
          activeSectionKey={activeSectionKey}
          sectionContents={fullProjectSectionContents}
          onSectionClick={onSectionClick}
        />
      );

      // Assert: The completed count should be 14 (excluding 4 auto-complete sections)
      const completionBadge = screen.getByText(/Preview - \d+ \/ \d+ complete/);
      const match = completionBadge.textContent?.match(/Preview - (\d+) \/ (\d+) complete/);
      expect(match).not.toBeNull();
      
      const completedCount = match ? parseInt(match[1], 10) : 0;
      
      // Verify: Completed count should be 14 (excluding 4 auto-complete sections)
      expect(completedCount).toBe(14);
    });
  });

  describe('Requirement 3.2: Full project (27 sections) displays "Preview - X / 27 complete"', () => {
    it('should display "Preview - X / 27 complete" for a full project with 27 completable sections', () => {
      // Arrange: Create a full project with all 31 sections (27 completable + 4 auto-complete)
      const fullProjectSectionContents: Record<string, Record<string, any>> = {
        cover: { solution_full_name: 'Test Solution' },
        revision_history: { rows: [] },
        executive_summary: { para1: 'Summary' },
        introduction: { tender_reference: 'REF-001' },
        abbreviations: { rows: [] },
        process_flow: { text: 'Flow' },
        overview: { text: 'Overview' },
        features: { items: [] },
        remote_support: { text: 'Support' },
        documentation_control: { items: [] },
        customer_training: { text: 'Training' },
        system_config: { text: 'Config' },
        fat_condition: { text: 'FAT' },
        tech_stack: { rows: [] },
        hardware_specs: { rows: [] },
        software_specs: { rows: [] },
        third_party_sw: { rows: [] },
        overall_gantt: { text: 'Gantt' },
        shutdown_gantt: { text: 'Shutdown' },
        supervisors: { rows: [] },
        division_of_eng: { rows: [] },
        work_completion: { text: 'Work' },
        buyer_obligations: { items: [] },
        exclusion_list: { items: [] },
        value_addition: { items: [] },
        buyer_prerequisites: { items: [] },
        poc: { text: 'POC' },
        binding_conditions: { paragraphs: [] },
        cybersecurity: { paragraphs: [] },
        disclaimer: { sections: [] },
        scope_definitions: { lines: [] },
      };

      // Mock sectionCompletion: Mark 10 sections as complete
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
      };

      // Mock the project store
      (useProjectStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        solutionName: 'Test Solution',
        solutionFullName: 'Test Solution Full Name',
        clientName: 'Test Client',
        clientLocation: 'Test Location',
        sectionCompletion: mockSectionCompletion,
      });

      // Act: Render the preview
      renderWithRouter(
        <DocumentPreview
          projectId={projectId}
          activeSectionKey={activeSectionKey}
          sectionContents={fullProjectSectionContents}
          onSectionClick={onSectionClick}
        />
      );

      // Assert: Should display "Preview - 10 / 27 complete"
      const completionBadge = screen.getByText(/Preview - \d+ \/ \d+ complete/);
      const match = completionBadge.textContent?.match(/Preview - (\d+) \/ (\d+) complete/);
      expect(match).not.toBeNull();
      
      const displayedTotal = match ? parseInt(match[2], 10) : 0;
      
      // Verify: Total should be 27 for a full project (this is the baseline behavior to preserve)
      expect(displayedTotal).toBe(27);
    });
  });

  /**
   * Property-based test: For ANY full project (27 sections), the completion
   * calculation SHALL remain unchanged.
   * 
   * This test generates random completion states for a full project and verifies
   * that all preservation requirements are met.
   */
  describe('Property-based preservation test', () => {
    it('should preserve completion calculation for full projects with varying completion states', () => {
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

            // Mock the project store
            (useProjectStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
              solutionName: 'Test Solution',
              solutionFullName: 'Test Solution Full Name',
              clientName: 'Test Client',
              clientLocation: 'Test Location',
              sectionCompletion: mockSectionCompletion,
            });

            // Render the preview
            const { unmount } = renderWithRouter(
              <DocumentPreview
                projectId={projectId}
                activeSectionKey={activeSectionKey}
                sectionContents={fullProjectSectionContents}
                onSectionClick={onSectionClick}
              />
            );

            // Verify: Total should always be 27 for a full project
            const completionBadge = screen.getByText(/Preview - \d+ \/ \d+ complete/);
            const match = completionBadge.textContent?.match(/Preview - (\d+) \/ (\d+) complete/);
            const displayedTotal = match ? parseInt(match[2], 10) : 0;
            const displayedCompleted = match ? parseInt(match[1], 10) : 0;
            
            // Verify: Total is 27
            expect(displayedTotal).toBe(27);
            
            // Verify: Completed count matches the number of completed sections (excluding auto-complete)
            expect(displayedCompleted).toBe(completedSectionKeys.length);

            // Cleanup
            unmount();
          }
        ),
        {
          numRuns: 30, // Run 30 random test cases
          seed: 456, // Use a fixed seed for reproducibility
        }
      );
    });
  });
});
