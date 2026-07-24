/**
 * Bug Condition Exploration Test for Introduction AI Import Field Population
 * 
 * **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
 * **DO NOT attempt to fix the test or the code when it fails**
 * **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
 * **GOAL**: Surface counterexamples that demonstrate the bug exists
 * 
 * **Validates: Requirements 1.1, 1.2, 1.3**
 * 
 * Bug: When AI imports Introduction section content with structured fields (tender_reference, tender_date),
 * the importSuggestion function correctly extracts and stores these values in the draft store, but the
 * IntroductionSection component's form input fields remain empty because the component only loads content
 * from the backend API on mount and does not react to draft store updates.
 * 
 * Expected: Form input fields should display the same values that appear in the markdown preview after AI import.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import IntroductionSection from '../IntroductionSection'
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

const renderIntroductionSection = (projectId: string) => {
  return render(
    <BrowserRouter>
      <EditorProvider refreshSections={mockRefreshSections}>
        <IntroductionSection projectId={projectId} />
      </EditorProvider>
    </BrowserRouter>
  )
}

describe('IntroductionSection Bug Condition Exploration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRefreshSections.mockClear()
    // Clear any existing drafts
    clearSectionDraft('test-project', 'introduction')
  })

  describe('Property 1: Bug Condition - AI Import Form Field Population Failure', () => {
    it('should display extracted values in form input fields after AI import (EXPECTED TO FAIL on unfixed code)', async () => {
      /**
       * **Scoped PBT Approach**: Focus on concrete failing case where AI imports Introduction
       * section content with structured fields (tender_reference and tender_date).
       * 
       * Test Setup:
       * 1. Component loads with empty fields from API
       * 2. AI import extracts "Tender Reference: TEST-REF-001" and "Tender Date: 01 Jan 2026"
       * 3. importSuggestion updates draft store with extracted values
       * 4. EXPECTED: Form input fields display the extracted values
       * 5. ACTUAL (on unfixed code): Form input fields remain empty
       * 
       * Root Cause: IntroductionSection component state is not synchronized with draft store updates
       */

      const projectId = 'test-project'

      // Mock initial API response - empty fields
      vi.mocked(sectionsApi.getSection).mockResolvedValue({
        section_key: 'introduction',
        content: {
          tender_reference: '',
          tender_date: '',
        },
      })

      // Render the IntroductionSection component
      renderIntroductionSection(projectId)

      // Wait for component to load and display empty fields
      await waitFor(() => {
        expect(screen.getByPlaceholderText('e.g., RFP/2026/001')).toHaveValue('')
        expect(screen.getByPlaceholderText('e.g., 15th January 2026')).toHaveValue('')
      })

      // Simulate AI import: Generate suggestion with markdown containing structured fields
      const aiSuggestion = {
        structured_import_available: true,
        content: `
## Introduction

This Technical Specification document has been prepared in response to the tender.

- **Tender Reference**: TEST-REF-001
- **Tender Date**: 01 Jan 2026

Hitachi India Pvt. Ltd. is pleased to present this comprehensive technical specification.
        `.trim(),
      }

      // Call importSuggestion (this is what happens when user clicks "Import Suggestion")
      const existingDraft = {
        tender_reference: '',
        tender_date: '',
      }

      const updated = await importSuggestion(projectId, 'introduction', aiSuggestion, existingDraft)

      // Verify draft store is updated with extracted values
      expect(updated).toBeDefined()
      expect(updated?.tender_reference).toBe('TEST-REF-001')
      expect(updated?.tender_date).toBe('01 Jan 2026')

      // Verify draft store contains the correct values
      const storedDraft = getSectionDraft(projectId, 'introduction')
      expect(storedDraft?.tender_reference).toBe('TEST-REF-001')
      expect(storedDraft?.tender_date).toBe('01 Jan 2026')

      /**
       * **CRITICAL ASSERTION - THIS WILL FAIL ON UNFIXED CODE**
       * 
       * Expected Behavior: Form input fields should display the extracted values from draft store
       * Actual Behavior (unfixed): Form input fields remain empty because IntroductionSection
       * component state is not synchronized with draft store updates
       * 
       * Counterexamples found (expected on unfixed code):
       * - Form input fields show empty values or placeholders
       * - Markdown preview displays imported values correctly (reads from draft content passed as props)
       * - Draft store contains correct extracted values
       * - Component state not synchronized with draft store updates
       */
      await waitFor(
        () => {
          const tenderRefInput = screen.getByPlaceholderText('e.g., RFP/2026/001') as HTMLInputElement
          const tenderDateInput = screen.getByPlaceholderText('e.g., 15th January 2026') as HTMLInputElement

          // These assertions WILL FAIL on unfixed code because the component doesn't react to draft updates
          expect(tenderRefInput.value).toBe('TEST-REF-001')
          expect(tenderDateInput.value).toBe('01 Jan 2026')
        },
        {
          timeout: 2000,
          onTimeout: (error) => {
            // This timeout is expected on unfixed code - it's the bug we're testing for
            const tenderRefInput = screen.getByPlaceholderText('e.g., RFP/2026/001') as HTMLInputElement
            const tenderDateInput = screen.getByPlaceholderText('e.g., 15th January 2026') as HTMLInputElement

            console.log('[BUG CONFIRMED] Counterexample found:')
            console.log('  - Draft store tender_reference:', storedDraft?.tender_reference)
            console.log('  - Draft store tender_date:', storedDraft?.tender_date)
            console.log('  - Form field tender_reference value:', tenderRefInput.value)
            console.log('  - Form field tender_date value:', tenderDateInput.value)
            console.log('  - Root cause: Component state not synchronized with draft store')

            throw error
          },
        }
      )
    })

    it('should handle JSON import format with extracted values', async () => {
      /**
       * Test Case 2: AI returns JSON format with tender_reference and tender_date fields
       * This verifies the bug exists across different content formats
       */

      const projectId = 'test-project-json'

      vi.mocked(sectionsApi.getSection).mockResolvedValue({
        section_key: 'introduction',
        content: {
          tender_reference: '',
          tender_date: '',
        },
      })

      renderIntroductionSection(projectId)

      await waitFor(() => {
        expect(screen.getByPlaceholderText('e.g., RFP/2026/001')).toHaveValue('')
      })

      // Simulate AI import with JSON format
      const aiSuggestion = {
        structured_import_available: true,
        content: {
          tender_reference: 'JSON-REF-002',
          tender_date: '02 Feb 2026',
          paragraphs: ['Introduction paragraph content'],
        },
      }

      const existingDraft = {
        tender_reference: '',
        tender_date: '',
      }

      const updated = await importSuggestion(projectId, 'introduction', aiSuggestion, existingDraft)

      expect(updated?.tender_reference).toBe('JSON-REF-002')
      expect(updated?.tender_date).toBe('02 Feb 2026')

      // This will FAIL on unfixed code
      await waitFor(
        () => {
          const tenderRefInput = screen.getByPlaceholderText('e.g., RFP/2026/001') as HTMLInputElement
          const tenderDateInput = screen.getByPlaceholderText('e.g., 15th January 2026') as HTMLInputElement

          expect(tenderRefInput.value).toBe('JSON-REF-002')
          expect(tenderDateInput.value).toBe('02 Feb 2026')
        },
        { timeout: 2000 }
      )
    })

    it('should handle HTML import format with extracted values', async () => {
      /**
       * Test Case 3: AI returns HTML format with embedded structured fields on separate lines
       * This mirrors realistic AI response patterns
       */

      const projectId = 'test-project-html'

      vi.mocked(sectionsApi.getSection).mockResolvedValue({
        section_key: 'introduction',
        content: {
          tender_reference: '',
          tender_date: '',
        },
      })

      renderIntroductionSection(projectId)

      await waitFor(() => {
        expect(screen.getByPlaceholderText('e.g., RFP/2026/001')).toHaveValue('')
      })

      // Simulate AI import with HTML format including labeled values on separate lines
      const aiSuggestion = {
        structured_import_available: true,
        content: `<p>This Technical Specification document has been prepared in response to the tender.</p>

Tender Reference: HTML-REF-003
Tender Date: 03 Mar 2026`,
      }

      const existingDraft = {
        tender_reference: '',
        tender_date: '',
      }

      const updated = await importSuggestion(projectId, 'introduction', aiSuggestion, existingDraft)

      expect(updated?.tender_reference).toBe('HTML-REF-003')
      expect(updated?.tender_date).toBe('03 Mar 2026')

      // This will FAIL on unfixed code
      await waitFor(
        () => {
          const tenderRefInput = screen.getByPlaceholderText('e.g., RFP/2026/001') as HTMLInputElement
          const tenderDateInput = screen.getByPlaceholderText('e.g., 15th January 2026') as HTMLInputElement

          expect(tenderRefInput.value).toBe('HTML-REF-003')
          expect(tenderDateInput.value).toBe('03 Mar 2026')
        },
        { timeout: 2000 }
      )
    })

    it('should handle partial import with only one field populated', async () => {
      /**
       * Edge Case: Only tender_reference is present in AI suggestion
       * The populated field should appear while unpopulated field remains empty
       */

      const projectId = 'test-project-partial'

      vi.mocked(sectionsApi.getSection).mockResolvedValue({
        section_key: 'introduction',
        content: {
          tender_reference: '',
          tender_date: '',
        },
      })

      renderIntroductionSection(projectId)

      await waitFor(() => {
        expect(screen.getByPlaceholderText('e.g., RFP/2026/001')).toHaveValue('')
      })

      const aiSuggestion = {
        structured_import_available: true,
        content: `
**Tender Reference**: PARTIAL-REF-004

This is an introduction without a tender date specified.
        `.trim(),
      }

      const existingDraft = {
        tender_reference: '',
        tender_date: '',
      }

      const updated = await importSuggestion(projectId, 'introduction', aiSuggestion, existingDraft)

      expect(updated?.tender_reference).toBe('PARTIAL-REF-004')
      // When no tender_date is extracted, the existing value remains (empty string in this case)
      expect(updated?.tender_date).toBe('')

      // This will FAIL on unfixed code - even the populated field won't appear
      await waitFor(
        () => {
          const tenderRefInput = screen.getByPlaceholderText('e.g., RFP/2026/001') as HTMLInputElement
          const tenderDateInput = screen.getByPlaceholderText('e.g., 15th January 2026') as HTMLInputElement

          expect(tenderRefInput.value).toBe('PARTIAL-REF-004')
          expect(tenderDateInput.value).toBe('') // Should remain empty
        },
        { timeout: 2000 }
      )
    })
  })
})
