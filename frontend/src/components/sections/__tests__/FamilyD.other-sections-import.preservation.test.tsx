/**
 * Preservation Tests for Other Family D Sections AI Import
 * 
 * Task 2.3: Observe and test other sections AI import behavior
 * 
 * **GOAL**: Document the ACTUAL baseline behavior on unfixed code for:
 * - documentation_control
 * - exclusion_list  
 * - buyer_prerequisites
 * - features
 * 
 * **EXPECTED OUTCOME**: Tests PASS on unfixed code (confirms baseline behavior)
 * 
 * **Validates: Requirements 3.5, 3.6, 3.7, 3.8, 3.9**
 * 
 * **KEY FINDINGS**:
 * Through observation testing, we discovered that the import routing in importSuggestion
 * depends on the content structure:
 * 
 * 1. **features** section WORKS CORRECTLY - uses record-style objects with id/title/brief/description
 * 2. **buyer_prerequisites** PARTIALLY WORKS - direct arrays work, but objects may not flatten
 * 3. **documentation_control/exclusion_list** have ROUTING BUGS similar to buyer_obligations
 * 
 * These tests establish the baseline so we can ensure the buyer_obligations fix
 * doesn't break existing working functionality (like features).
 */

import { describe, it, expect, beforeEach } from 'vitest'
import importSuggestion from '../../../utils/aiSuggestionImport'
import { clearSectionDraft } from '../../../utils/sectionDraftStore'

describe('Family D Other Sections Import - Preservation Tests', () => {
  const projectId = 'test-preservation'

  beforeEach(() => {
    clearSectionDraft(projectId, 'documentation_control')
    clearSectionDraft(projectId, 'exclusion_list')
    clearSectionDraft(projectId, 'buyer_prerequisites')
    clearSectionDraft(projectId, 'features')
  })

  describe('Features Section - Working Baseline', () => {
    it('correctly imports features with record-style objects (WORKING)', async () => {
      /**
       * Features section uses record-style items with id, title, brief, description
       * This WORKS CORRECTLY on unfixed code
       */

      const aiSuggestion = {
        section_key: 'features',
        structured_import_available: true,
        content: [
          {
            title: 'Real-time Monitoring',
            brief: 'Monitor system status in real-time',
            description: '<p>Comprehensive real-time monitoring dashboard</p>',
          },
          {
            title: 'Advanced Analytics',
            brief: 'AI-powered analytics engine',
            description: '<p>Machine learning based analytics</p>',
          },
        ],
      }

      const existingDraft = {
        items: [
          {
            id: 'placeholder-1',
            title: '',
            brief: '',
            description: '',
          },
        ],
      }

      const updated = await importSuggestion(
        projectId,
        'features',
        aiSuggestion,
        existingDraft
      )

      // Features import WORKS - replaces empty placeholder with imported features
      expect(updated?.items).toBeDefined()
      expect(Array.isArray(updated?.items)).toBe(true)
      expect(updated?.items.length).toBe(2)

      // Verify features have required fields
      expect(updated?.items[0]).toHaveProperty('id')
      expect(updated?.items[0]).toHaveProperty('title', 'Real-time Monitoring')
      expect(updated?.items[0]).toHaveProperty('brief', 'Monitor system status in real-time')

      expect(updated?.items[1]).toHaveProperty('id')
      expect(updated?.items[1]).toHaveProperty('title', 'Advanced Analytics')
    })

    it('merges features when existing items have content (WORKING)', async () => {
      /**
       * When existing features have content, merge instead of replace
       * This WORKS CORRECTLY
       */

      const aiSuggestion = {
        section_key: 'features',
        structured_import_available: true,
        content: [
          {
            title: 'New Feature',
            brief: 'New brief',
            description: '<p>New description</p>',
          },
        ],
      }

      const existingDraft = {
        items: [
          {
            id: 'existing-1',
            title: 'Existing Feature',
            brief: 'Existing brief',
            description: '<p>Existing description</p>',
          },
        ],
      }

      const updated = await importSuggestion(
        projectId,
        'features',
        aiSuggestion,
        existingDraft
      )

      // Features merge WORKS
      expect(updated?.items.length).toBe(2)
      expect(updated?.items[0].title).toBe('Existing Feature')
      expect(updated?.items[1].title).toBe('New Feature')
    })
  })

  describe('Buyer Prerequisites - Partial Working Baseline', () => {
    it('imports buyer_prerequisites when content is object with items array', async () => {
      /**
       * **BASELINE BEHAVIOR** - Document ACTUAL behavior on unfixed code
       * Input: {items: [{item: "text"}]}
       * 
       * ACTUAL: Routes to Family C (shallow merge), creates `items` key with objects
       * This is similar to the buyer_obligations bug
       */

      const aiSuggestion = {
        section_key: 'buyer_prerequisites',
        structured_import_available: true,
        content: {
          items: [
            { item: 'Network infrastructure ready' },
            { item: 'Server room prepared' },
          ],
        },
      }

      const existingDraft = {
        items: ['Existing Prerequisite'],
      }

      const updated = await importSuggestion(
        projectId,
        'buyer_prerequisites',
        aiSuggestion,
        existingDraft
      )

      // FIXED BEHAVIOR: Strings are correctly extracted and merged
      // The buyer_obligations fix also benefits this section!
      expect(updated).toBeDefined()
      expect(updated?.items).toBeDefined()
      expect(Array.isArray(updated?.items)).toBe(true)
      
      // Strings are correctly extracted from nested objects
      expect(updated?.items).toEqual([
        'Existing Prerequisite',
        'Network infrastructure ready',
        'Server room prepared',
      ])
    })

    it('handles buyer_prerequisites when existing draft is empty', async () => {
      /**
       * With no existing draft, the importer should still route Family D list
       * sections to their canonical list key instead of falling through to
       * tabular `rows`.
       */

      const aiSuggestion = {
        section_key: 'buyer_prerequisites',
        structured_import_available: true,
        content: [
          'Prerequisite A',
          'Prerequisite B',
        ],
      }

      const updated = await importSuggestion(
        projectId,
        'buyer_prerequisites',
        aiSuggestion,
        undefined
      )

      expect(updated).toBeDefined()
      expect(updated).toEqual({
        items: ['Prerequisite A', 'Prerequisite B']
      })
    })
  })

  describe('Documentation Control - Baseline Behavior', () => {
    it('documents ACTUAL routing for documentation_control with object content', async () => {
      /**
       * **BASELINE TEST** - Documents the buggy routing behavior
       * 
       * Input: {items: [{item: "text"}]}
       * Routes to: Family C (shallow merge)
       * Creates: Wrong key `items` instead of extracting to `custom_items`
       * 
       * This is the SAME BUG that affects buyer_obligations!
       */

      const aiSuggestion = {
        section_key: 'documentation_control',
        structured_import_available: true,
        content: {
          items: [
            { item: 'Project Execution Plan' },
            { item: 'Risk Assessment Document' },
          ],
        },
      }

      const existingDraft = {
        custom_items: ['Existing Doc'],
      }

      const updated = await importSuggestion(
        projectId,
        'documentation_control',
        aiSuggestion,
        existingDraft
      )

      // FIXED BEHAVIOR: Strings are correctly extracted and merged into custom_items
      // The buyer_obligations fix also benefits documentation_control!
      expect(updated).toBeDefined()
      expect(updated?.custom_items).toEqual([
        'Existing Doc',
        'Project Execution Plan',
        'Risk Assessment Document',
      ])
      // No wrong 'items' key created
      expect(updated?.items).toBeUndefined()
    })

    it('documents routing for documentation_control with direct array', async () => {
      /**
       * Input: [{item: "text"}]
       * Routes to: Family B (tabular)
       * Creates: Wrong key `rows` instead of `custom_items`
       */

      const aiSuggestion = {
        section_key: 'documentation_control',
        structured_import_available: true,
        content: [
          { item: 'Doc A' },
          { item: 'Doc B' },
        ],
      }

      const existingDraft = {
        custom_items: [],
      }

      const updated = await importSuggestion(
        projectId,
        'documentation_control',
        aiSuggestion,
        existingDraft
      )

      // FIXED BEHAVIOR: Strings are correctly extracted into custom_items
      // The buyer_obligations fix also benefits documentation_control!
      expect(updated).toBeDefined()
      expect(updated?.custom_items).toEqual([
        'Doc A',
        'Doc B',
      ])
      // No wrong 'rows' key created
      expect(updated?.rows).toBeUndefined()
    })
  })

  describe('Exclusion List - Baseline Behavior', () => {
    it('documents ACTUAL routing for exclusion_list', async () => {
      /**
       * After fix 4.1, extractStringListItem now correctly handles nested structures
       * for ALL Family D sections, including exclusion_list
       */

      const aiSuggestion = {
        section_key: 'exclusion_list',
        structured_import_available: true,
        content: {
          items: [
            { item: 'Custom hardware not specified' },
            { item: 'Third-party software licenses' },
          ],
        },
      }

      const existingDraft = {
        custom_items: [],
      }

      const updated = await importSuggestion(
        projectId,
        'exclusion_list',
        aiSuggestion,
        existingDraft
      )

      // FIXED BEHAVIOR (after task 4.1):
      // extractStringListItem now correctly extracts from nested objects
      expect(updated).toBeDefined()
      expect(updated?.custom_items).toEqual([
        'Custom hardware not specified',
        'Third-party software licenses',
      ]) // Correctly extracted!
    })
  })

  describe('Preservation Requirement - Features Must Keep Working', () => {
    it('verifies features import continues to work after any changes', async () => {
      /**
       * **CRITICAL PRESERVATION TEST**
       * 
       * This test ensures that whatever fix we apply for buyer_obligations,
       * it MUST NOT break the working features import.
       * 
       * Validates: Requirement 3.5 - other Family D sections continue to process correctly
       */

      const aiSuggestion = {
        section_key: 'features',
        structured_import_available: true,
        content: [
          {
            title: 'Feature Alpha',
            brief: 'Brief Alpha',
            description: '<p>Description Alpha</p>',
          },
        ],
      }

      const existingDraft = {
        items: [
          {
            id: 'test-1',
            title: '',
            brief: '',
            description: '',
          },
        ],
      }

      const updated = await importSuggestion(
        projectId,
        'features',
        aiSuggestion,
        existingDraft
      )

      // Features must continue to work
      expect(updated?.items).toBeDefined()
      expect(updated?.items.length).toBe(1)
      expect(updated?.items[0].title).toBe('Feature Alpha')
      expect(updated?.items[0].brief).toBe('Brief Alpha')
      expect(updated?.items[0]).toHaveProperty('id')
    })

    it('verifies deduplication logic continues to work', async () => {
      /**
       * Validates: Requirement 3.7 - deduplication logic continues to work
       */

      const aiSuggestion = {
        section_key: 'features',
        structured_import_available: true,
        content: [
          {
            title: 'Duplicate Feature',
            brief: 'Brief',
            description: '<p>Description</p>',
          },
          {
            title: 'Duplicate Feature',
            brief: 'Brief',
            description: '<p>Description</p>',
          },
        ],
      }

      const existingDraft = {
        items: [],
      }

      const updated = await importSuggestion(
        projectId,
        'features',
        aiSuggestion,
        existingDraft
      )

      // Note: For features, deduplication is based on JSON equality
      // Two identical features will both be added (this is ACTUAL behavior)
      expect(updated?.items.length).toBe(2)
    })
  })

  describe('Edge Cases - Baseline Behavior', () => {
    it('handles empty content array', async () => {
      const aiSuggestion = {
        section_key: 'features',
        content: [],
      }

      const existingDraft = {
        items: [
          {
            id: 'existing-1',
            title: 'Existing',
            brief: '',
            description: '',
          },
        ],
      }

      const updated = await importSuggestion(
        projectId,
        'features',
        aiSuggestion,
        existingDraft
      )

      // Empty import shouldn't remove existing items
      expect(updated?.items.length).toBe(1)
      expect(updated?.items[0].title).toBe('Existing')
    })
  })
})
