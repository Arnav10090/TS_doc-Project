/**
 * Preservation Property Tests for Home.tsx
 * 
 * **Validates: Requirements 3.2, 3.4, 3.8**
 * 
 * Property 2: Preservation - Project Display Unchanged (Home)
 * 
 * **IMPORTANT**: Follow observation-first methodology
 * These tests observe behavior on UNFIXED code for non-buggy inputs (full project with 27 sections, 
 * completion percentage display, project card layout) and capture observed behavior patterns.
 * 
 * **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
 * 
 * The tests ensure that when we implement the fix, all existing functionality remains unchanged:
 * - Full project (27 sections) continues to display "X / 27 sections"
 * - Completion percentage display continues to work correctly
 * - Project card styling, layout, and interactions remain unchanged
 * - All project information (solution_name, client_name, etc.) continues to display correctly
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import * as fc from 'fast-check'
import HomePage from '../Home'
import * as projectsApi from '../../api/projects'
import * as generationApi from '../../api/generation'
import type { ProjectSummary } from '../../types'

// Mock the API
vi.mock('../../api/projects')
vi.mock('../../api/generation')

// Mock the UI store
vi.mock('../../store/ui.store', () => ({
  useUiStore: () => ({
    openNewProjectModal: vi.fn(),
  }),
}))

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    error: vi.fn(),
    success: vi.fn(),
  },
}))

// Mock react-router-dom navigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

// Mock download helper
vi.mock('../../utils/downloadHelper', () => ({
  handleDocumentDownload: vi.fn(),
}))

const renderHomePage = () => {
  return render(
    <BrowserRouter>
      <HomePage />
    </BrowserRouter>
  )
}

describe('Home.tsx Preservation Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  /**
   * Property 2.1: Full project (27 sections) continues to display "X / 27 sections"
   * **Validates: Requirement 3.2**
   * 
   * This test observes the baseline behavior for projects with 27 sections (no deletions).
   * On unfixed code, this should work correctly and continue to work after the fix.
   */
  describe('Property 2.1: Full project display preservation', () => {
    it('should continue to display "X / 27 sections" for full projects with 27 sections', async () => {
      // Arrange: Create a full project with 27 sections (no deletions)
      const fullProject: ProjectSummary = {
        id: 'full-project-1',
        solution_name: 'Full Project Test',
        client_name: 'Test Client',
        client_location: 'Test Location',
        created_at: '2024-01-01T00:00:00Z',
        completion_percentage: 85, // 23 completed out of 27 total
        total_sections: 27, // Full project - no sections deleted
      }

      vi.mocked(projectsApi.getAllProjects).mockResolvedValue([fullProject])

      // Act: Render the Home page
      renderHomePage()

      // Wait for project to load
      await screen.findByText('Full Project Test')

      // Assert: Should display "23 / 27 sections" (using total_sections=27)
      // This calculation should work correctly on both unfixed and fixed code
      const expectedCompleted = Math.round((fullProject.completion_percentage / 100) * fullProject.total_sections)
      const expectedDisplay = `${expectedCompleted} / 27 sections`

      // **PRESERVATION**: This should PASS on unfixed code and continue to pass after fix
      expect(screen.getByText(expectedDisplay)).toBeInTheDocument()
    })

    it('should preserve display for multiple full projects', async () => {
      // Arrange: Multiple full projects with different completion percentages
      const fullProjects: ProjectSummary[] = [
        {
          id: 'full-1',
          solution_name: 'Project Alpha',
          client_name: 'Client A',
          client_location: 'Location A',
          created_at: '2024-01-01T00:00:00Z',
          completion_percentage: 100, // All 27 sections complete
          total_sections: 27,
        },
        {
          id: 'full-2',
          solution_name: 'Project Beta',
          client_name: 'Client B',
          client_location: 'Location B',
          created_at: '2024-01-02T00:00:00Z',
          completion_percentage: 50, // 14 out of 27 sections complete
          total_sections: 27,
        },
        {
          id: 'full-3',
          solution_name: 'Project Gamma',
          client_name: 'Client C',
          client_location: 'Location C',
          created_at: '2024-01-03T00:00:00Z',
          completion_percentage: 0, // 0 out of 27 sections complete
          total_sections: 27,
        },
      ]

      vi.mocked(projectsApi.getAllProjects).mockResolvedValue(fullProjects)

      // Act: Render the Home page
      renderHomePage()

      // Wait for projects to load
      await screen.findByText('Project Alpha')

      // Assert: All should display correct section counts
      expect(screen.getByText('27 / 27 sections')).toBeInTheDocument() // 100% of 27
      expect(screen.getByText('14 / 27 sections')).toBeInTheDocument() // 50% of 27 (13.5 rounded to 14)
      expect(screen.getByText('0 / 27 sections')).toBeInTheDocument()   // 0% of 27
    })
  })

  /**
   * Property 2.2: Completion percentage display continues to work correctly
   * **Validates: Requirement 3.4**
   * 
   * This test verifies that the completion percentage progress bar and display
   * continue to work correctly and are not affected by the section count fix.
   */
  describe('Property 2.2: Completion percentage display preservation', () => {
    it('should preserve completion percentage progress bar display', async () => {
      const project: ProjectSummary = {
        id: 'test-project',
        solution_name: 'Test Project',
        client_name: 'Test Client',
        client_location: 'Test Location',
        created_at: '2024-01-01T00:00:00Z',
        completion_percentage: 75,
        total_sections: 27,
      }

      vi.mocked(projectsApi.getAllProjects).mockResolvedValue([project])

      renderHomePage()
      await screen.findByText('Test Project')

      // Find the progress bar element
      const progressBar = document.querySelector('.bg-primary.h-full')
      expect(progressBar).toBeInTheDocument()
      
      // Verify the progress bar width matches the completion percentage
      expect(progressBar).toHaveStyle({ width: '75%' })
    })

    it('should preserve completion percentage calculation for various percentages', async () => {
      // Test with specific known values instead of property-based testing
      const testCases = [
        { percentage: 0, expected: 0 },
        { percentage: 25, expected: 7 }, // Math.round(25/100 * 27) = 7
        { percentage: 50, expected: 14 }, // Math.round(50/100 * 27) = 14
        { percentage: 75, expected: 20 }, // Math.round(75/100 * 27) = 20
        { percentage: 100, expected: 27 }, // Math.round(100/100 * 27) = 27
      ]

      for (const testCase of testCases) {
        const project: ProjectSummary = {
          id: `test-${testCase.percentage}`,
          solution_name: `Test Project ${testCase.percentage}%`,
          client_name: 'Test Client',
          client_location: 'Test Location',
          created_at: '2024-01-01T00:00:00Z',
          completion_percentage: testCase.percentage,
          total_sections: 27, // Full project - no deletions
        }

        vi.mocked(projectsApi.getAllProjects).mockResolvedValue([project])

        const { unmount } = renderHomePage()
        await screen.findByText(`Test Project ${testCase.percentage}%`)

        // Verify section count calculation is preserved (this is the main preservation test)
        const expectedDisplay = `${testCase.expected} / 27 sections`
        expect(screen.getByText(expectedDisplay)).toBeInTheDocument()

        // Clean up for next iteration
        unmount()
      }
    })
  })

  /**
   * Property 2.3: Project card styling, layout, and interactions remain unchanged
   * **Validates: Requirement 3.8**
   * 
   * This test verifies that all visual and interactive elements of project cards
   * continue to work correctly and are not affected by the section count fix.
   */
  describe('Property 2.3: Project card layout and interactions preservation', () => {
    it('should preserve project card structure and styling', async () => {
      const project: ProjectSummary = {
        id: 'layout-test',
        solution_name: 'Layout Test Project',
        client_name: 'Layout Client',
        client_location: 'Layout Location',
        created_at: '2024-01-01T00:00:00Z',
        completion_percentage: 60,
        total_sections: 27,
      }

      vi.mocked(projectsApi.getAllProjects).mockResolvedValue([project])

      renderHomePage()
      await screen.findByText('Layout Test Project')

      // Verify all project information is displayed correctly
      expect(screen.getByText('Layout Test Project')).toBeInTheDocument()
      expect(screen.getByText('Layout Client')).toBeInTheDocument()
      expect(screen.getByText('Layout Location')).toBeInTheDocument()
      expect(screen.getByText(/Created: 01 Jan 2024/)).toBeInTheDocument()

      // Verify action buttons are present
      expect(screen.getByRole('button', { name: /Open →/ })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Download Latest/ })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Delete/ })).toBeInTheDocument()

      // Verify progress bar is present
      const progressBar = document.querySelector('.bg-primary.h-full')
      expect(progressBar).toBeInTheDocument()
    })

    it('should preserve Open button navigation functionality', async () => {
      const project: ProjectSummary = {
        id: 'nav-test',
        solution_name: 'Navigation Test',
        client_name: 'Nav Client',
        client_location: 'Nav Location',
        created_at: '2024-01-01T00:00:00Z',
        completion_percentage: 40,
        total_sections: 27,
      }

      vi.mocked(projectsApi.getAllProjects).mockResolvedValue([project])

      renderHomePage()
      await screen.findByText('Navigation Test')

      // Click the Open button
      const openButton = screen.getByRole('button', { name: /Open →/ })
      fireEvent.click(openButton)

      // Verify navigation was called with correct project ID
      expect(mockNavigate).toHaveBeenCalledWith('/editor/nav-test')
    })

    it('should preserve Delete button confirmation flow', async () => {
      const project: ProjectSummary = {
        id: 'delete-test',
        solution_name: 'Delete Test',
        client_name: 'Delete Client',
        client_location: 'Delete Location',
        created_at: '2024-01-01T00:00:00Z',
        completion_percentage: 30,
        total_sections: 27,
      }

      vi.mocked(projectsApi.getAllProjects).mockResolvedValue([project])

      renderHomePage()
      await screen.findByText('Delete Test')

      // Click the Delete button
      const deleteButton = screen.getByRole('button', { name: /Delete/ })
      fireEvent.click(deleteButton)

      // Verify confirmation buttons appear
      expect(screen.getByRole('button', { name: /Confirm/ })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Cancel/ })).toBeInTheDocument()

      // Click Cancel
      const cancelButton = screen.getByRole('button', { name: /Cancel/ })
      fireEvent.click(cancelButton)

      // Verify we're back to the original Delete button
      expect(screen.getByRole('button', { name: /Delete/ })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /Confirm/ })).not.toBeInTheDocument()
    })
  })

  /**
   * Property 2.4: All project information continues to display correctly
   * **Validates: Requirement 3.8**
   * 
   * This test verifies that all project fields (solution_name, client_name, etc.)
   * continue to be displayed correctly and are not affected by the section count fix.
   */
  describe('Property 2.4: Project information display preservation', () => {
    it('should preserve all project information fields display', async () => {
      const project: ProjectSummary = {
        id: 'info-test',
        solution_name: 'Information Display Test',
        client_name: 'Info Client Name',
        client_location: 'Info Client Location',
        created_at: '2024-03-15T10:30:00Z',
        completion_percentage: 45,
        total_sections: 27,
      }

      vi.mocked(projectsApi.getAllProjects).mockResolvedValue([project])

      renderHomePage()
      await screen.findByText('Information Display Test')

      // Verify all project information is displayed
      expect(screen.getByText('Information Display Test')).toBeInTheDocument()
      expect(screen.getByText('Info Client Name')).toBeInTheDocument()
      expect(screen.getByText('Info Client Location')).toBeInTheDocument()
      
      // Verify date formatting is preserved
      expect(screen.getByText(/Created: 15 Mar 2024/)).toBeInTheDocument()

      // Verify section count display (this is the main functionality we're testing)
      const expectedCompleted = Math.round((45 / 100) * 27) // = 12
      expect(screen.getByText('12 / 27 sections')).toBeInTheDocument()
    })
  })

  /**
   * Property 2.5: Empty state and loading state preservation
   * **Validates: Requirement 3.8**
   * 
   * This test verifies that empty state and loading state displays
   * continue to work correctly and are not affected by the section count fix.
   */
  describe('Property 2.5: State handling preservation', () => {
    it('should preserve loading state display', () => {
      // Mock a delayed API response to test loading state
      vi.mocked(projectsApi.getAllProjects).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve([]), 100))
      )

      renderHomePage()

      // Verify loading state is displayed
      expect(screen.getByText('Loading projects...')).toBeInTheDocument()
    })

    it('should preserve empty state display when no projects exist', async () => {
      vi.mocked(projectsApi.getAllProjects).mockResolvedValue([])

      renderHomePage()

      // Wait for loading to complete
      await screen.findByText('No projects yet. Create your first TS document.')

      // Verify empty state elements
      expect(screen.getByText('No projects yet. Create your first TS document.')).toBeInTheDocument()
      
      // Use getAllByRole since there are multiple "New Project" buttons (header + empty state)
      const newProjectButtons = screen.getAllByRole('button', { name: /New Project/ })
      expect(newProjectButtons.length).toBeGreaterThan(0) // At least one button exists
    })
  })

  /**
   * Property 2.6: Property-based test for comprehensive preservation
   * 
   * This test generates a few controlled scenarios with full projects (27 sections) and verifies
   * that all preservation properties hold.
   * 
   * **CRITICAL**: This focuses on NON-BUGGY inputs (full projects with 27 sections)
   * to verify that existing behavior is preserved after the fix.
   */
  describe('Property 2.6: Comprehensive preservation property test', () => {
    it('should preserve all functionality for full projects across controlled scenarios', async () => {
      // Use controlled test data instead of fully random generation
      const testProjects: ProjectSummary[][] = [
        // Single project scenarios
        [{
          id: 'single-1',
          solution_name: 'Single Project Alpha',
          client_name: 'Client Alpha',
          client_location: 'Location Alpha',
          created_at: '2024-01-01T00:00:00Z',
          completion_percentage: 25,
          total_sections: 27,
        }],
        // Multiple project scenarios
        [
          {
            id: 'multi-1',
            solution_name: 'Multi Project One',
            client_name: 'Client One',
            client_location: 'Location One',
            created_at: '2024-01-01T00:00:00Z',
            completion_percentage: 50,
            total_sections: 27,
          },
          {
            id: 'multi-2',
            solution_name: 'Multi Project Two',
            client_name: 'Client Two',
            client_location: 'Location Two',
            created_at: '2024-01-02T00:00:00Z',
            completion_percentage: 75,
            total_sections: 27,
          },
        ],
      ]

      for (const projects of testProjects) {
        vi.mocked(projectsApi.getAllProjects).mockResolvedValue(projects)

        const { unmount } = renderHomePage()

        // Wait for first project to load
        await screen.findByText(projects[0].solution_name)

        // Verify all projects are displayed with correct information
        projects.forEach((project) => {
          // Project information preservation
          expect(screen.getByText(project.solution_name)).toBeInTheDocument()
          expect(screen.getByText(project.client_name)).toBeInTheDocument()
          expect(screen.getByText(project.client_location)).toBeInTheDocument()

          // Section count preservation (should always show X / 27 for full projects)
          const expectedCompleted = Math.round((project.completion_percentage / 100) * 27)
          const expectedDisplay = `${expectedCompleted} / 27 sections`
          expect(screen.getByText(expectedDisplay)).toBeInTheDocument()
        })

        // Verify we have the expected number of action buttons
        const openButtons = screen.getAllByRole('button', { name: /Open →/ })
        expect(openButtons).toHaveLength(projects.length)

        const downloadButtons = screen.getAllByRole('button', { name: /Download Latest/ })
        expect(downloadButtons).toHaveLength(projects.length)

        const deleteButtons = screen.getAllByRole('button', { name: /Delete/ })
        expect(deleteButtons).toHaveLength(projects.length)

        // Clean up for next iteration
        unmount()
      }
    })
  })
})