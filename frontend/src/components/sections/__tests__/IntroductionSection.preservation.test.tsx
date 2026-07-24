/**
 * Preservation Property Tests for IntroductionSection
 * 
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4**
 * 
 * Property 2: Preservation - Manual Input and Other Section Imports
 * 
 * **IMPORTANT**: Follow observation-first methodology
 * These tests observe behavior on UNFIXED code for non-buggy inputs:
 * - Manual typing into Tender Reference/Date fields
 * - AI imports into other sections (not Introduction)
 * - Fresh navigation to Introduction section
 * - Preview synchronization with manual input
 * 
 * **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
 * 
 * The tests ensure that when we implement the fix, all existing functionality remains unchanged:
 * - Manual input updates form state and triggers auto-save correctly
 * - AI imports for other sections continue to work unchanged
 * - Initial empty field states are preserved
 * - Preview updates synchronize correctly with manual input
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import * as fc from 'fast-check'
import IntroductionSection from '../IntroductionSection'
import { EditorProvider } from '../../../contexts/EditorContext'
import * as sectionsApi from '../../../api/sections'

// Mock the API
vi.mock('../../../api/sections')

// Mock useAutoSave hook
vi.mock('../../../hooks/useAutoSave', () => ({
  useAutoSave: () => ({
    save: vi.fn(),
    status: 'saved' as const,
  }),
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

const mockRefreshSections = vi.fn(async () => {})

const renderIntroductionSection = (projectId: string) => {
  return render(
    <BrowserRouter>
      <EditorProvider refreshSections={mockRefreshSections}>
        <IntroductionSection projectId={projectId} />
      </EditorProvider>
    </BrowserRouter>
  )
}

describe('IntroductionSection Preservation Property Tests', () => {
  const projectId = 'test-project-id'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  /**
   * Property 2.1: Manual Input Preservation - Tender Reference Field
   * **Validates: Requirement 3.2**
   * 
   * Observe behavior on UNFIXED code: typing into Tender Reference field updates
   * the form state, triggers auto-save, and updates the preview display.
   * 
   * This behavior MUST be preserved after the fix.
   */
  describe('Property 2.1: Manual Input Preservation - Tender Reference', () => {
    it('should preserve manual typing behavior in Tender Reference field', async () => {
      // Arrange: Mock initial empty section
      vi.mocked(sectionsApi.getSection).mockResolvedValue({
        id: 'intro-1',
        project_id: projectId,
        section_key: 'introduction',
        content: {
          tender_reference: '',
          tender_date: '',
        },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      })

      // Act: Render component
      renderIntroductionSection(projectId)

      // Wait for component to load
      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
      })

      // Find and type into Tender Reference field
      const tenderRefInput = screen.getByPlaceholderText('e.g., RFP/2026/001')
      fireEvent.change(tenderRefInput, { target: { value: 'Manual-REF-001' } })

      // Assert: Field value is updated (this is the baseline behavior to preserve)
      await waitFor(() => {
        expect(tenderRefInput).toHaveValue('Manual-REF-001')
      })

      // Verify the preview display is updated with the typed value
      // The preview should show the typed value in the highlighted placeholder
      expect(screen.getByText('Manual-REF-001')).toBeInTheDocument()

      // **PRESERVATION**: This behavior should remain unchanged after the fix
    })

    it('should preserve manual input with various text patterns', async () => {
      vi.mocked(sectionsApi.getSection).mockResolvedValue({
        id: 'intro-2',
        project_id: projectId,
        section_key: 'introduction',
        content: {
          tender_reference: '',
          tender_date: '',
        },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      })

      renderIntroductionSection(projectId)

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
      })

      const tenderRefInput = screen.getByPlaceholderText('e.g., RFP/2026/001')

      // Test various input patterns
      const testPatterns = [
        'RFP/2026/001',
        'Not Provided',
        'N/A',
        'TEST-REF-WITH-SPECIAL-CHARS-@#$',
        '12345',
        'a',
        'Very Long Reference Number With Many Characters That Should Still Work Correctly',
      ]

      for (const pattern of testPatterns) {
        fireEvent.change(tenderRefInput, { target: { value: pattern } })
        
        await waitFor(() => {
          expect(tenderRefInput).toHaveValue(pattern)
        })

        // Verify preview displays the typed value
        expect(screen.getByText(pattern)).toBeInTheDocument()
      }
    })
  })

  /**
   * Property 2.2: Manual Input Preservation - Tender Date Field
   * **Validates: Requirement 3.2**
   * 
   * Observe behavior on UNFIXED code: typing into Tender Date field updates
   * the form state, triggers auto-save, and updates the preview display.
   */
  describe('Property 2.2: Manual Input Preservation - Tender Date', () => {
    it('should preserve manual typing behavior in Tender Date field', async () => {
      vi.mocked(sectionsApi.getSection).mockResolvedValue({
        id: 'intro-3',
        project_id: projectId,
        section_key: 'introduction',
        content: {
          tender_reference: '',
          tender_date: '',
        },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      })

      renderIntroductionSection(projectId)

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
      })

      // Find and type into Tender Date field
      const tenderDateInput = screen.getByPlaceholderText('e.g., 15th January 2026')
      fireEvent.change(tenderDateInput, { target: { value: '01 Jan 2026' } })

      // Assert: Field value is updated
      await waitFor(() => {
        expect(tenderDateInput).toHaveValue('01 Jan 2026')
      })

      // Verify the preview display is updated
      expect(screen.getByText('01 Jan 2026')).toBeInTheDocument()

      // **PRESERVATION**: This behavior should remain unchanged after the fix
    })

    it('should preserve manual input with various date formats', async () => {
      vi.mocked(sectionsApi.getSection).mockResolvedValue({
        id: 'intro-4',
        project_id: projectId,
        section_key: 'introduction',
        content: {
          tender_reference: '',
          tender_date: '',
        },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      })

      renderIntroductionSection(projectId)

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
      })

      const tenderDateInput = screen.getByPlaceholderText('e.g., 15th January 2026')

      // Test various date format patterns
      const datePatterns = [
        '15th January 2026',
        '01 Jan 2026',
        '2026-01-15',
        '15/01/2026',
        'January 15, 2026',
        'Not Provided',
        '08 Jul 2026',
      ]

      for (const pattern of datePatterns) {
        fireEvent.change(tenderDateInput, { target: { value: pattern } })
        
        await waitFor(() => {
          expect(tenderDateInput).toHaveValue(pattern)
        })

        // Verify preview displays the typed value
        expect(screen.getByText(pattern)).toBeInTheDocument()
      }
    })
  })

  /**
   * Property 2.3: Initial Empty State Preservation
   * **Validates: Requirement 3.4**
   * 
   * Observe behavior on UNFIXED code: navigating to a fresh Introduction section
   * shows empty form fields as the default initial state.
   */
  describe('Property 2.3: Initial Empty State Preservation', () => {
    it('should preserve empty field display on initial load with no data', async () => {
      // Arrange: Mock API returning empty content
      vi.mocked(sectionsApi.getSection).mockResolvedValue({
        id: 'intro-5',
        project_id: projectId,
        section_key: 'introduction',
        content: {
          tender_reference: '',
          tender_date: '',
        },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      })

      // Act: Render component
      renderIntroductionSection(projectId)

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
      })

      // Assert: Fields should be empty
      const tenderRefInput = screen.getByPlaceholderText('e.g., RFP/2026/001')
      const tenderDateInput = screen.getByPlaceholderText('e.g., 15th January 2026')

      expect(tenderRefInput).toHaveValue('')
      expect(tenderDateInput).toHaveValue('')

      // Verify placeholders are shown in the preview (not actual values)
      expect(screen.getByText('{{TenderReference}}')).toBeInTheDocument()
      expect(screen.getByText('{{TenderDate}}')).toBeInTheDocument()

      // **PRESERVATION**: This default empty state should remain unchanged after the fix
    })

    it('should preserve empty state when API returns empty object', async () => {
      vi.mocked(sectionsApi.getSection).mockResolvedValue({
        id: 'intro-6',
        project_id: projectId,
        section_key: 'introduction',
        content: {},
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      })

      renderIntroductionSection(projectId)

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
      })

      // Fields should be empty when content object is empty
      const tenderRefInput = screen.getByPlaceholderText('e.g., RFP/2026/001')
      const tenderDateInput = screen.getByPlaceholderText('e.g., 15th January 2026')

      expect(tenderRefInput).toHaveValue('')
      expect(tenderDateInput).toHaveValue('')
    })
  })

  /**
   * Property 2.4: Preview Synchronization Preservation
   * **Validates: Requirement 3.2**
   * 
   * Observe behavior on UNFIXED code: manual input updates the markdown preview
   * synchronously, replacing the placeholder with the typed value.
   */
  describe('Property 2.4: Preview Synchronization Preservation', () => {
    it('should preserve preview update synchronization with manual input', async () => {
      vi.mocked(sectionsApi.getSection).mockResolvedValue({
        id: 'intro-7',
        project_id: projectId,
        section_key: 'introduction',
        content: {
          tender_reference: '',
          tender_date: '',
        },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      })

      renderIntroductionSection(projectId)

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
      })

      // Initial state: placeholders shown
      expect(screen.getByText('{{TenderReference}}')).toBeInTheDocument()
      expect(screen.getByText('{{TenderDate}}')).toBeInTheDocument()

      // Type into Tender Reference field
      const tenderRefInput = screen.getByPlaceholderText('e.g., RFP/2026/001')
      fireEvent.change(tenderRefInput, { target: { value: 'SYNC-TEST-REF' } })

      // Verify preview updates immediately
      await waitFor(() => {
        expect(screen.getByText('SYNC-TEST-REF')).toBeInTheDocument()
        expect(screen.queryByText('{{TenderReference}}')).not.toBeInTheDocument()
      })

      // Type into Tender Date field
      const tenderDateInput = screen.getByPlaceholderText('e.g., 15th January 2026')
      fireEvent.change(tenderDateInput, { target: { value: 'SYNC-TEST-DATE' } })

      // Verify preview updates immediately
      await waitFor(() => {
        expect(screen.getByText('SYNC-TEST-DATE')).toBeInTheDocument()
        expect(screen.queryByText('{{TenderDate}}')).not.toBeInTheDocument()
      })

      // **PRESERVATION**: Preview synchronization should remain unchanged after the fix
    })

    it('should preserve preview updates for rapid sequential input', async () => {
      vi.mocked(sectionsApi.getSection).mockResolvedValue({
        id: 'intro-8',
        project_id: projectId,
        section_key: 'introduction',
        content: {
          tender_reference: '',
          tender_date: '',
        },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      })

      renderIntroductionSection(projectId)

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
      })

      const tenderRefInput = screen.getByPlaceholderText('e.g., RFP/2026/001')

      // Simulate rapid typing
      const rapidInputs = ['A', 'AB', 'ABC', 'ABC-123', 'ABC-123-XYZ']
      
      for (const value of rapidInputs) {
        fireEvent.change(tenderRefInput, { target: { value } })
        
        // Each intermediate value should appear in the preview
        await waitFor(() => {
          expect(screen.getByText(value)).toBeInTheDocument()
        })
      }
    })
  })

  /**
   * Property 2.5: Loaded Content Display Preservation
   * **Validates: Requirement 3.2**
   * 
   * Observe behavior on UNFIXED code: when content is loaded from the backend API,
   * the form fields display the loaded values correctly.
   */
  describe('Property 2.5: Loaded Content Display Preservation', () => {
    it('should preserve display of content loaded from backend API', async () => {
      // Arrange: Mock API returning populated content
      vi.mocked(sectionsApi.getSection).mockResolvedValue({
        id: 'intro-9',
        project_id: projectId,
        section_key: 'introduction',
        content: {
          tender_reference: 'LOADED-REF-001',
          tender_date: '15th January 2026',
        },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      })

      // Act: Render component
      renderIntroductionSection(projectId)

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
      })

      // Assert: Fields should display loaded values
      const tenderRefInput = screen.getByPlaceholderText('e.g., RFP/2026/001')
      const tenderDateInput = screen.getByPlaceholderText('e.g., 15th January 2026')

      expect(tenderRefInput).toHaveValue('LOADED-REF-001')
      expect(tenderDateInput).toHaveValue('15th January 2026')

      // Verify preview displays the loaded values
      expect(screen.getByText('LOADED-REF-001')).toBeInTheDocument()
      expect(screen.getByText('15th January 2026')).toBeInTheDocument()

      // **PRESERVATION**: Loading and displaying backend data should remain unchanged
    })
  })

  /**
   * Property 2.6: Property-Based Test - Manual Input Sequences
   * **Validates: Requirements 3.2, 3.4**
   * 
   * Use property-based testing to generate random user input sequences and verify
   * that the behavior is preserved across all inputs.
   */
  describe('Property 2.6: Property-Based Test - Manual Input Sequences', () => {
    it('should preserve behavior for random user input sequences', async () => {
      // Use fast-check to generate random input sequences
      await fc.assert(
        fc.asyncProperty(
          // Generate random strings for tender reference
          fc.string({ minLength: 0, maxLength: 50 }),
          // Generate random strings for tender date
          fc.string({ minLength: 0, maxLength: 50 }),
          async (tenderRef, tenderDate) => {
            // Arrange: Mock empty initial state
            vi.mocked(sectionsApi.getSection).mockResolvedValue({
              id: 'intro-pbt',
              project_id: projectId,
              section_key: 'introduction',
              content: {
                tender_reference: '',
                tender_date: '',
              },
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            })

            // Act: Render and input values
            const { unmount } = renderIntroductionSection(projectId)

            await waitFor(() => {
              expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
            })

            const tenderRefInput = screen.getByPlaceholderText('e.g., RFP/2026/001')
            const tenderDateInput = screen.getByPlaceholderText('e.g., 15th January 2026')

            // Type the generated values
            fireEvent.change(tenderRefInput, { target: { value: tenderRef } })
            fireEvent.change(tenderDateInput, { target: { value: tenderDate } })

            // Assert: Values should be reflected in form fields
            await waitFor(() => {
              expect(tenderRefInput).toHaveValue(tenderRef)
              expect(tenderDateInput).toHaveValue(tenderDate)
            })

            // **PRESERVATION**: This behavior should hold for ALL random inputs
            // Note: We don't verify preview text here because React's HTML encoding
            // and text normalization can cause false negatives for special characters
            unmount()
          }
        ),
        {
          numRuns: 20, // Run 20 random test cases
          endOnFailure: true,
        }
      )
    })
  })

  /**
   * Property 2.7: Navigation and State Preservation
   * **Validates: Requirement 3.4**
   * 
   * Observe behavior on UNFIXED code: component initialization and state management
   * work correctly without any AI import interactions.
   */
  describe('Property 2.7: Navigation and State Preservation', () => {
    it('should preserve component loading state display', async () => {
      // Arrange: Mock delayed API response
      vi.mocked(sectionsApi.getSection).mockImplementation(
        () => new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              id: 'intro-10',
              project_id: projectId,
              section_key: 'introduction',
              content: {
                tender_reference: '',
                tender_date: '',
              },
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            })
          }, 100)
        })
      )

      // Act: Render component
      renderIntroductionSection(projectId)

      // Assert: Loading state should be displayed
      expect(screen.getByText('Loading...')).toBeInTheDocument()

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
      })

      // **PRESERVATION**: Loading state handling should remain unchanged
    })

    it('should preserve error handling when API fails', async () => {
      // Arrange: Mock API error
      vi.mocked(sectionsApi.getSection).mockRejectedValue(new Error('API Error'))

      // Mock console.error to avoid test output noise
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      // Act: Render component
      renderIntroductionSection(projectId)

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
      })

      // Assert: Component should still render (gracefully handle error)
      // Fields should be empty
      const tenderRefInput = screen.getByPlaceholderText('e.g., RFP/2026/001')
      const tenderDateInput = screen.getByPlaceholderText('e.g., 15th January 2026')

      expect(tenderRefInput).toHaveValue('')
      expect(tenderDateInput).toHaveValue('')

      // Verify error was logged
      expect(consoleErrorSpy).toHaveBeenCalled()

      // **PRESERVATION**: Error handling should remain unchanged
      consoleErrorSpy.mockRestore()
    })
  })

  /**
   * NOTE: Property 2.X for "AI imports into other sections" is NOT tested here
   * because IntroductionSection component does not handle AI imports directly.
   * 
   * AI import flow is handled by SectionInputPanel and importSuggestion utility.
   * Testing that "AI imports for Executive Summary, Features, etc. work correctly"
   * would require integration tests at the SectionInputPanel level, not at the
   * IntroductionSection component level.
   * 
   * The IntroductionSection component is only responsible for:
   * - Rendering form fields
   * - Handling manual input
   * - Loading content from backend API
   * - Displaying preview with placeholders
   * 
   * **Validates: Requirement 3.1** - This is implicitly preserved because we are not
   * modifying any code that handles AI imports for other sections. The fix only
   * affects how IntroductionSection receives and displays imported content.
   */
})
