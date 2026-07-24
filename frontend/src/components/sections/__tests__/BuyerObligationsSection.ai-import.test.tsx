/**
 * Bug Condition Exploration Test for Buyer Obligations AI Import Field Population
 * 
 * **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
 * **DO NOT attempt to fix the test or the code when it fails**
 * **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
 * **GOAL**: Surface counterexamples that demonstrate the bug exists
 * 
 * **Validates: Requirements 1.4, 1.5, 1.6, 1.7, 1.8**
 * 
 * Bug: When AI imports buyer_obligations section content with nested JSON structure,
 * the importSuggestion function may fail to correctly extract string items from the nested
 * structure, or even if extraction succeeds, the BuyerObligationsSection component's form
 * input fields remain empty because the component only loads content from the backend API
 * on mount and does not react to draft store updates.
 * 
 * Expected: Form input fields should display the imported obligations with green background
 * highlighting, and after save, the preview should show the obligations with bullet points.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import BuyerObligationsSection from '../BuyerObligationsSection'
import { EditorProvider } from '../../../contexts/EditorContext'
import * as sectionsApi from '../../../api/sections'
import { getSectionDraft, setSectionDraft, clearSectionDraft } from '../../../utils/sectionDraftStore'
import importSuggestion from '../../../utils/aiSuggestionImport'

// Mock the API
vi.mock('../../../api/sections')

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

const renderBuyerObligationsSection = (projectId: string, content?: any) => {
  return render(
    <BrowserRouter>
      <EditorProvider refreshSections={mockRefreshSections}>
        <BuyerObligationsSection projectId={projectId} content={content} />
      </EditorProvider>
    </BrowserRouter>
  )
}

describe('BuyerObligationsSection Bug Condition Exploration - AI Import', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRefreshSections.mockClear()
    // Clear any existing drafts
    clearSectionDraft('test-project', 'buyer_obligations')
  })

  describe('Property 2: Bug Condition - AI Import Form Field Population Failure', () => {
    it('should display extracted obligations in form input fields after AI import with nested JSON (EXPECTED TO FAIL on unfixed code)', async () => {
      /**
       * **Scoped Test Approach**: Focus on concrete failing case where AI imports buyer_obligations
       * section content with nested JSON structure containing an items array with objects.
       * 
       * Test Setup:
       * 1. Component loads with empty custom_items from API
       * 2. AI import returns nested structure: {"items": [{"item": "Obligation 1"}, ...]}
       * 3. importSuggestion extracts string items and updates draft store
       * 4. EXPECTED: Form input fields (DynamicList) display the extracted obligations
       * 5. EXPECTED: Newly imported items have green background highlighting
       * 6. ACTUAL (on unfixed code): Form input fields remain empty OR extraction fails
       * 
       * Root Causes:
       * - extractStringListItem may not handle deeply nested structures
       * - BuyerObligationsSection component state is not synchronized with draft store updates
       * - Component doesn't receive content prop from parent
       */

      const projectId = 'test-project'

      // Mock initial API response - empty custom_items
      vi.mocked(sectionsApi.getSection).mockResolvedValue({
        section_key: 'buyer_obligations',
        content: {
          custom_items: [],
        },
      })

      // Render the BuyerObligationsSection component with empty content
      const { rerender } = renderBuyerObligationsSection(projectId, { custom_items: [] })

      // Wait for component to load and display empty state
      await waitFor(() => {
        const addButton = screen.getByRole('button', { name: /Add Obligation/i })
        expect(addButton).toBeInTheDocument()
      })

      // Verify no input fields exist initially (empty custom_items)
      const initialInputs = screen.queryAllByPlaceholderText(/Item \d+/)
      expect(initialInputs.length).toBe(0)

      // Simulate AI import: Generate suggestion with nested JSON structure
      // This is a realistic AI response format with nested objects
      const aiSuggestion = {
        section_key: 'buyer_obligations',
        structured_import_available: true,
        content: {
          items: [
            { item: 'Obligation 1 from AI' },
            { item: 'Obligation 2 from AI' },
            { item: 'Obligation 3 from AI' },
          ],
        },
      }

      // Call importSuggestion (this is what happens when user clicks "Import Suggestion")
      const existingDraft = {
        custom_items: [],
      }

      const updated = await importSuggestion(projectId, 'buyer_obligations', aiSuggestion, existingDraft)

      // Verify draft store is updated with extracted string items
      expect(updated).toBeDefined()
      expect(updated?.custom_items).toBeDefined()
      expect(Array.isArray(updated?.custom_items)).toBe(true)
      expect(updated?.custom_items.length).toBe(3)
      expect(updated?.custom_items).toEqual([
        'Obligation 1 from AI',
        'Obligation 2 from AI',
        'Obligation 3 from AI',
      ])

      // Verify draft store contains the correct values
      const storedDraft = getSectionDraft(projectId, 'buyer_obligations')
      expect(storedDraft?.custom_items).toEqual([
        'Obligation 1 from AI',
        'Obligation 2 from AI',
        'Obligation 3 from AI',
      ])

      // Simulate parent component passing updated content as prop (this is what SectionInputPanel does)
      rerender(
        <BrowserRouter>
          <EditorProvider refreshSections={mockRefreshSections}>
            <BuyerObligationsSection projectId={projectId} content={updated} />
          </EditorProvider>
        </BrowserRouter>
      )

      /**
       * **CRITICAL ASSERTION - THIS WILL FAIL ON UNFIXED CODE**
       * 
       * Expected Behavior: Form input fields (DynamicList) should display the 3 extracted obligations
       * Actual Behavior (unfixed): Form input fields remain empty because:
       *   1. extractStringListItem may fail to extract from nested structure, OR
       *   2. BuyerObligationsSection component state is not synchronized with draft store updates
       * 
       * Counterexamples found (expected on unfixed code):
       * - Draft store contains correct data but form fields remain empty
       * - Error message "No structured content available to import" appears
       * - Extraction fails to handle nested object structure
       * - Component state not synchronized with draft store updates
       */
      await waitFor(
        () => {
          // After import, we should see 3 input fields with the imported values
          const inputFields = screen.getAllByPlaceholderText(/Item \d+/)
          expect(inputFields.length).toBe(3)

          const input1 = inputFields[0] as HTMLInputElement
          const input2 = inputFields[1] as HTMLInputElement
          const input3 = inputFields[2] as HTMLInputElement

          // These assertions WILL FAIL on unfixed code because the component doesn't react to draft updates
          expect(input1.value).toBe('Obligation 1 from AI')
          expect(input2.value).toBe('Obligation 2 from AI')
          expect(input3.value).toBe('Obligation 3 from AI')
        },
        {
          timeout: 2000,
          onTimeout: (error) => {
            // This timeout is expected on unfixed code - it's the bug we're testing for
            const inputFields = screen.queryAllByPlaceholderText(/Item \d+/)

            console.log('[BUG CONFIRMED] Counterexample found:')
            console.log('  - Draft store custom_items:', storedDraft?.custom_items)
            console.log('  - Number of form input fields:', inputFields.length)
            console.log('  - Form field values:', inputFields.map((input: any) => input.value))
            console.log('  - Root cause: Component state not synchronized with draft store OR extraction failed')

            throw error
          },
        }
      )
    })

    it('should handle simple array import format', async () => {
      /**
       * Test Case 2: AI returns simple array format (less common but should work)
       * This verifies the bug exists across different content formats
       */

      const projectId = 'test-project-simple'

      vi.mocked(sectionsApi.getSection).mockResolvedValue({
        section_key: 'buyer_obligations',
        content: {
          custom_items: [],
        },
      })

      const { rerender } = renderBuyerObligationsSection(projectId, { custom_items: [] })

      await waitFor(() => {
        const addButton = screen.getByRole('button', { name: /Add Obligation/i })
        expect(addButton).toBeInTheDocument()
      })

      // Simulate AI import with simple array format
      const aiSuggestion = {
        section_key: 'buyer_obligations',
        structured_import_available: true,
        content: [
          'Simple Obligation 1',
          'Simple Obligation 2',
        ],
      }

      const existingDraft = {
        custom_items: [],
      }

      const updated = await importSuggestion(projectId, 'buyer_obligations', aiSuggestion, existingDraft)

      expect(updated?.custom_items).toEqual([
        'Simple Obligation 1',
        'Simple Obligation 2',
      ])

      // Simulate parent component passing updated content as prop
      rerender(
        <BrowserRouter>
          <EditorProvider refreshSections={mockRefreshSections}>
            <BuyerObligationsSection projectId={projectId} content={updated} />
          </EditorProvider>
        </BrowserRouter>
      )

      // This will FAIL on unfixed code
      await waitFor(
        () => {
          const inputFields = screen.getAllByPlaceholderText(/Item \d+/)
          expect(inputFields.length).toBe(2)

          const input1 = inputFields[0] as HTMLInputElement
          const input2 = inputFields[1] as HTMLInputElement

          expect(input1.value).toBe('Simple Obligation 1')
          expect(input2.value).toBe('Simple Obligation 2')
        },
        { timeout: 2000 }
      )
    })

    it('should handle deeply nested import format', async () => {
      /**
       * Test Case 3: AI returns deeply nested structure with items inside items
       * This tests the extraction logic more thoroughly
       */

      const projectId = 'test-project-nested'

      vi.mocked(sectionsApi.getSection).mockResolvedValue({
        section_key: 'buyer_obligations',
        content: {
          custom_items: [],
        },
      })

      const { rerender } = renderBuyerObligationsSection(projectId, { custom_items: [] })

      await waitFor(() => {
        const addButton = screen.getByRole('button', { name: /Add Obligation/i })
        expect(addButton).toBeInTheDocument()
      })

      // Simulate AI import with deeply nested format
      const aiSuggestion = {
        section_key: 'buyer_obligations',
        structured_import_available: true,
        content: {
          items: [
            { obligation: 'Nested Obligation 1', priority: 'high' },
            { obligation: 'Nested Obligation 2', priority: 'medium' },
          ],
        },
      }

      const existingDraft = {
        custom_items: [],
      }

      const updated = await importSuggestion(projectId, 'buyer_obligations', aiSuggestion, existingDraft)

      // Note: extractStringListItem should extract 'obligation' field (if it's in preferredKeys)
      // or may fail to extract anything, depending on current implementation
      expect(updated?.custom_items).toBeDefined()

      // Simulate parent component passing updated content as prop
      rerender(
        <BrowserRouter>
          <EditorProvider refreshSections={mockRefreshSections}>
            <BuyerObligationsSection projectId={projectId} content={updated} />
          </EditorProvider>
        </BrowserRouter>
      )

      // This will FAIL on unfixed code - either extraction fails or component doesn't update
      await waitFor(
        () => {
          const inputFields = screen.getAllByPlaceholderText(/Item \d+/)
          expect(inputFields.length).toBeGreaterThan(0)

          // If extraction works, we should see the obligations
          const input1 = inputFields[0] as HTMLInputElement
          expect(input1.value).toBeTruthy()
          expect(input1.value).toMatch(/Nested Obligation/)
        },
        { timeout: 2000 }
      )
    })

    it('should merge imported obligations with existing ones', async () => {
      /**
       * Test Case 4: Import obligations when custom_items already has content
       * Should merge and deduplicate
       */

      const projectId = 'test-project-merge'

      // Mock API with existing obligations
      vi.mocked(sectionsApi.getSection).mockResolvedValue({
        section_key: 'buyer_obligations',
        content: {
          custom_items: ['Existing Obligation 1', 'Existing Obligation 2'],
        },
      })

      const { rerender } = renderBuyerObligationsSection(projectId, {
        custom_items: ['Existing Obligation 1', 'Existing Obligation 2'],
      })

      await waitFor(() => {
        const inputFields = screen.getAllByPlaceholderText(/Item \d+/)
        expect(inputFields.length).toBe(2)
      })

      // Simulate AI import with new obligations
      const aiSuggestion = {
        section_key: 'buyer_obligations',
        structured_import_available: true,
        content: {
          items: [
            { item: 'New Obligation 1' },
            { item: 'New Obligation 2' },
          ],
        },
      }

      const existingDraft = {
        custom_items: ['Existing Obligation 1', 'Existing Obligation 2'],
      }

      const updated = await importSuggestion(projectId, 'buyer_obligations', aiSuggestion, existingDraft)

      // Should have merged: existing + new
      expect(updated?.custom_items).toEqual([
        'Existing Obligation 1',
        'Existing Obligation 2',
        'New Obligation 1',
        'New Obligation 2',
      ])

      // Simulate parent component passing updated content as prop
      rerender(
        <BrowserRouter>
          <EditorProvider refreshSections={mockRefreshSections}>
            <BuyerObligationsSection projectId={projectId} content={updated} />
          </EditorProvider>
        </BrowserRouter>
      )

      // This will FAIL on unfixed code
      await waitFor(
        () => {
          const inputFields = screen.getAllByPlaceholderText(/Item \d+/)
          expect(inputFields.length).toBe(4)

          // Verify all 4 obligations are present
          const values = inputFields.map((input: any) => input.value)
          expect(values).toContain('Existing Obligation 1')
          expect(values).toContain('Existing Obligation 2')
          expect(values).toContain('New Obligation 1')
          expect(values).toContain('New Obligation 2')
        },
        { timeout: 2000 }
      )
    })

    it('should verify imported items have green background highlighting', async () => {
      /**
       * Test Case 5: Verify that newly imported items have green background
       * This tests the visual highlighting requirement
       */

      const projectId = 'test-project-highlighting'

      vi.mocked(sectionsApi.getSection).mockResolvedValue({
        section_key: 'buyer_obligations',
        content: {
          custom_items: [],
        },
      })

      const { rerender } = renderBuyerObligationsSection(projectId, { custom_items: [] })

      await waitFor(() => {
        const addButton = screen.getByRole('button', { name: /Add Obligation/i })
        expect(addButton).toBeInTheDocument()
      })

      // Simulate AI import
      const aiSuggestion = {
        section_key: 'buyer_obligations',
        structured_import_available: true,
        content: {
          items: [
            { item: 'Highlighted Obligation 1' },
            { item: 'Highlighted Obligation 2' },
          ],
        },
      }

      const existingDraft = {
        custom_items: [],
      }

      const updated = await importSuggestion(projectId, 'buyer_obligations', aiSuggestion, existingDraft)

      // Simulate parent component passing updated content as prop
      rerender(
        <BrowserRouter>
          <EditorProvider refreshSections={mockRefreshSections}>
            <BuyerObligationsSection projectId={projectId} content={updated} />
          </EditorProvider>
        </BrowserRouter>
      )

      // This will FAIL on unfixed code
      await waitFor(
        () => {
          const inputFields = screen.getAllByPlaceholderText(/Item \d+/)
          expect(inputFields.length).toBe(2)

          // Check for green background highlighting on the input elements themselves
          const input1 = inputFields[0] as HTMLInputElement
          const input2 = inputFields[1] as HTMLInputElement

          // Expected: Green background (#E8F5E9 or rgb(232, 245, 233)) for newly imported items
          const input1BgColor = window.getComputedStyle(input1).backgroundColor
          const input2BgColor = window.getComputedStyle(input2).backgroundColor

          // Check that background color matches green (rgb(232, 245, 233))
          expect(input1BgColor).toMatch(/rgb\(232, 245, 233\)|rgba\(232, 245, 233/i)
          expect(input2BgColor).toMatch(/rgb\(232, 245, 233\)|rgba\(232, 245, 233/i)
        },
        { timeout: 2000 }
      )
    })

    it('should handle error case where extraction fails', async () => {
      /**
       * Test Case 6: Test case where AI returns format that extraction cannot handle
       * Should show error or fail gracefully
       */

      const projectId = 'test-project-error'

      vi.mocked(sectionsApi.getSection).mockResolvedValue({
        section_key: 'buyer_obligations',
        content: {
          custom_items: [],
        },
      })

      const { rerender } = renderBuyerObligationsSection(projectId, { custom_items: [] })

      await waitFor(() => {
        const addButton = screen.getByRole('button', { name: /Add Obligation/i })
        expect(addButton).toBeInTheDocument()
      })

      // Simulate AI import with format that cannot be extracted
      // (e.g., nested objects without any recognizable field names)
      const aiSuggestion = {
        section_key: 'buyer_obligations',
        structured_import_available: true,
        content: {
          data: [
            { unknown_field: 'Value 1', metadata: 'meta1' },
            { unknown_field: 'Value 2', metadata: 'meta2' },
          ],
        },
      }

      const existingDraft = {
        custom_items: [],
      }

      const updated = await importSuggestion(projectId, 'buyer_obligations', aiSuggestion, existingDraft)

      // Extraction may fail and return empty array or unchanged draft
      // This is a counterexample of the extraction bug
      console.log('[EXTRACTION TEST] Updated draft:', updated)

      // On unfixed code, this may result in:
      // - custom_items remains empty []
      // - No error message shown to user
      // - User sees "Import Suggestion" succeed but no content appears

      if (updated?.custom_items && updated.custom_items.length > 0) {
        // If extraction somehow succeeded, verify fields populate
        // Simulate parent component passing updated content as prop
        rerender(
          <BrowserRouter>
            <EditorProvider refreshSections={mockRefreshSections}>
              <BuyerObligationsSection projectId={projectId} content={updated} />
            </EditorProvider>
          </BrowserRouter>
        )
        
        await waitFor(() => {
          const inputFields = screen.getAllByPlaceholderText(/Item \d+/)
          expect(inputFields.length).toBeGreaterThan(0)
        }, { timeout: 2000 })
      } else {
        // Extraction failed - this is expected for unsupported formats
        // The bug is that there's no user feedback about this failure
        expect(updated?.custom_items || []).toEqual([])

        // Form fields should remain empty (no import happened)
        const inputFields = screen.queryAllByPlaceholderText(/Item \d+/)
        expect(inputFields.length).toBe(0)
      }
    })
  })
})
