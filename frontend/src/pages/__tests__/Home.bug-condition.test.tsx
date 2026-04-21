/**
 * Bug Condition Exploration Test for Home.tsx
 * 
 * **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
 * **DO NOT attempt to fix the test or the code when it fails**
 * **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
 * **GOAL**: Surface counterexamples that demonstrate the bug exists in Home.tsx project card display
 * 
 * **Validates: Requirements 1.7, 1.8, 1.9, 2.10, 2.11**
 * 
 * Bug: Home.tsx line 141 uses hardcoded calculation `Math.round((project.completion_percentage / 100) * 27) / 27`
 * Expected: Should use `project.total_sections` from API response
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import * as fc from 'fast-check'
import HomePage from '../Home'
import * as projectsApi from '../../api/projects'
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

const renderHomePage = () => {
  return render(
    <BrowserRouter>
      <HomePage />
    </BrowserRouter>
  )
}

describe('Home.tsx Bug Condition Exploration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Property 1: Bug Condition - Dynamic Section Count Display', () => {
    it('should display correct section count using project.total_sections instead of hardcoded 27', async () => {
      // **Scoped PBT Approach**: Focus on concrete failing cases to ensure reproducibility
      
      // Test case 1: Project with 24 sections (3 deleted)
      const projectWith24Sections: ProjectSummary = {
        id: '1',
        solution_name: 'Test Project 1',
        client_name: 'Test Client',
        client_location: 'Test Location',
        created_at: '2024-01-01T00:00:00Z',
        completion_percentage: 58, // 14 completed out of 24 total
        total_sections: 24, // 3 sections deleted from original 27
      }

      // Test case 2: Project with 22 sections (5 deleted)
      const projectWith22Sections: ProjectSummary = {
        id: '2',
        solution_name: 'Test Project 2',
        client_name: 'Test Client 2',
        client_location: 'Test Location 2',
        created_at: '2024-01-02T00:00:00Z',
        completion_percentage: 45, // 10 completed out of 22 total
        total_sections: 22, // 5 sections deleted from original 27
      }

      const projects = [projectWith24Sections, projectWith22Sections]
      
      vi.mocked(projectsApi.getAllProjects).mockResolvedValue(projects)

      renderHomePage()

      // Wait for projects to load
      await screen.findByText('Test Project 1')

      // **Expected Behavior**: displayedTotal == project.total_sections
      
      // For project 1: Should show "14 / 24 sections" (using total_sections=24)
      // Calculated completed: Math.round((58 / 100) * 24) = Math.round(13.92) = 14
      const expectedCompleted1 = Math.round((projectWith24Sections.completion_percentage / 100) * projectWith24Sections.total_sections)
      const expectedDisplay1 = `${expectedCompleted1} / ${projectWith24Sections.total_sections} sections`
      
      // For project 2: Should show "10 / 22 sections" (using total_sections=22)
      // Calculated completed: Math.round((45 / 100) * 22) = Math.round(9.9) = 10
      const expectedCompleted2 = Math.round((projectWith22Sections.completion_percentage / 100) * projectWith22Sections.total_sections)
      const expectedDisplay2 = `${expectedCompleted2} / ${projectWith22Sections.total_sections} sections`

      // **CRITICAL**: These assertions will FAIL on unfixed code because:
      // - Line 141 uses hardcoded 27: `Math.round((project.completion_percentage / 100) * 27) / 27 sections`
      // - For project 1: unfixed code shows "16 / 27 sections" instead of "14 / 24 sections"
      // - For project 2: unfixed code shows "12 / 27 sections" instead of "10 / 22 sections"
      
      expect(screen.getByText(expectedDisplay1)).toBeInTheDocument()
      expect(screen.getByText(expectedDisplay2)).toBeInTheDocument()

      // Additional verification: ensure we're NOT showing the hardcoded values
      expect(screen.queryByText('16 / 27 sections')).not.toBeInTheDocument() // Wrong display for project 1
      expect(screen.queryByText('12 / 27 sections')).not.toBeInTheDocument() // Wrong display for project 2
    })

    it('should use total_sections field from API response for all projects with deleted sections', async () => {
      // Property-based test to generate various project configurations
      await fc.assert(
        fc.asyncProperty(
          // Generate projects with fewer than 27 sections (simulating deletions)
          fc.record({
            id: fc.uuid(),
            solution_name: fc.string({ minLength: 10, maxLength: 30 }).map(s => s.replace(/[^a-zA-Z0-9 ]/g, 'A').replace(/\s+/g, ' ').trim() || 'Project Name'),
            client_name: fc.string({ minLength: 5, maxLength: 20 }).map(s => s.replace(/[^a-zA-Z0-9 ]/g, 'A').replace(/\s+/g, ' ').trim() || 'Client Name'),
            client_location: fc.string({ minLength: 5, maxLength: 20 }).map(s => s.replace(/[^a-zA-Z0-9 ]/g, 'A').replace(/\s+/g, ' ').trim() || 'Location'),
            created_at: fc.constant('2024-01-01T00:00:00Z'),
            completion_percentage: fc.integer({ min: 0, max: 100 }),
            total_sections: fc.integer({ min: 10, max: 26 }), // Less than 27 to trigger bug condition, min 10 to avoid edge cases
          }),
          async (project: ProjectSummary) => {
            vi.mocked(projectsApi.getAllProjects).mockResolvedValue([project])

            renderHomePage()

            // Wait for project to load
            await screen.findByText(project.solution_name)

            // **Expected Behavior**: Should use project.total_sections
            const expectedCompleted = Math.round((project.completion_percentage / 100) * project.total_sections)
            const expectedDisplay = `${expectedCompleted} / ${project.total_sections} sections`

            // **Bug Condition**: This will fail on unfixed code because it uses hardcoded 27
            const actualElement = screen.getByText(new RegExp(`\\d+ / \\d+ sections`))
            expect(actualElement.textContent).toBe(expectedDisplay)

            // Verify it's NOT using the hardcoded calculation
            const hardcodedCompleted = Math.round((project.completion_percentage / 100) * 27)
            const hardcodedDisplay = `${hardcodedCompleted} / 27 sections`
            if (hardcodedDisplay !== expectedDisplay) {
              expect(actualElement.textContent).not.toBe(hardcodedDisplay)
            }
          }
        ),
        { numRuns: 10 } // Limit runs for focused testing
      )
    })

    it('should handle edge case with very few sections correctly', async () => {
      // Edge case: Project with only 5 sections remaining
      const projectWithFewSections: ProjectSummary = {
        id: 'edge-case',
        solution_name: 'Minimal Project',
        client_name: 'Edge Client',
        client_location: 'Edge Location',
        created_at: '2024-01-01T00:00:00Z',
        completion_percentage: 80, // 4 completed out of 5 total
        total_sections: 5, // Many sections deleted
      }

      vi.mocked(projectsApi.getAllProjects).mockResolvedValue([projectWithFewSections])

      renderHomePage()

      await screen.findByText('Minimal Project')

      // Expected: 4 / 5 sections (using total_sections=5)
      const expectedCompleted = Math.round((80 / 100) * 5) // = 4
      const expectedDisplay = `${expectedCompleted} / 5 sections`

      // **This will fail on unfixed code**: shows "22 / 27 sections" instead of "4 / 5 sections"
      expect(screen.getByText(expectedDisplay)).toBeInTheDocument()
      expect(screen.queryByText('22 / 27 sections')).not.toBeInTheDocument()
    })
  })
})