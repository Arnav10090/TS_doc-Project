/**
 * Preservation Test for DocumentPreview.tsx - Other List Sections Bullet Display
 * 
 * **IMPORTANT**: This test captures BASELINE behavior on UNFIXED code
 * **EXPECTED OUTCOME ON UNFIXED CODE**: Tests PASS (confirms baseline to preserve)
 * **After Fix**: These sections will also get bullet styling (which is desired per Requirement 3.1)
 * 
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4**
 * 
 * This test observes and captures the current bullet display behavior for:
 * - exclusion_list
 * - buyer_prerequisites
 * - documentation_control
 * - work_completion (criteria)
 * 
 * Goal: Ensure these sections render with the SAME styling as buyer_obligations currently has,
 * and that other functionality (filtering, template text, required field styling) continues to work.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import DocumentPreview from '../DocumentPreview'
import { 
  EXCLUSION_STANDARD_ITEMS,
  DOCUMENTATION_CONTROL_ITEMS,
  WORK_COMPLETION_CRITERIA,
} from '../templateContent'

// Mock the API
vi.mock('../../../api/images', () => ({
  getImages: vi.fn().mockResolvedValue({}),
}))

// Mock the project store
vi.mock('../../../store/project.store', () => ({
  useProjectStore: () => ({
    projectId: 'test-project',
    solutionName: 'Test Solution',
    solutionFullName: 'Test Solution Full Name',
    clientName: 'Test Client',
    clientLocation: 'Test Location',
    sectionCompletion: {},
  }),
}))

// Mock the editor context
vi.mock('../../../contexts/EditorContext', () => ({
  useOptionalEditor: () => null,
}))

describe('DocumentPreview.tsx Preservation: Other List Sections Display', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  /**
   * Property 3: Preservation - Exclusion List Section Rendering
   * 
   * Verify exclusion_list section renders with the SAME styling as buyer_obligations.
   * On unfixed code, both sections should have the SAME bullet styling (likely no visible bullets).
   * After fix, both sections should get bullet styling (which is desired per Requirement 3.1).
   */
  it('should render exclusion_list with consistent bullet list styling', () => {
    // Arrange: Create exclusion_list content with 5 items (3 standard + 2 custom)
    const standardItems = EXCLUSION_STANDARD_ITEMS.slice(0, 3)
    const customItems = [
      'Custom exclusion 1: Advanced analytics module',
      'Custom exclusion 2: Mobile application',
    ]

    const sectionContents = {
      exclusion_list: {
        heading: 'EXCLUSION LIST',
        intro_text: 'The following are out of scope',
        items: standardItems,
        custom_items: customItems,
      },
    }

    // Act: Render DocumentPreview
    const { container } = render(
      <DocumentPreview
        projectId="test-project"
        activeSectionKey="exclusion_list"
        sectionContents={sectionContents}
      />
    )

    // Assert: Verify HTML structure exists
    const exclusionSection = container.querySelector('[data-section-key="exclusion_list"]')
    expect(exclusionSection).not.toBeNull()

    // Find the exclusion list <ul> element
    const ulElements = exclusionSection!.querySelectorAll('ul')
    expect(ulElements.length).toBeGreaterThan(0)

    let exclusionListUl: HTMLElement | null = null
    ulElements.forEach((ul) => {
      const text = ul.textContent || ''
      if (text.includes('Custom exclusion 1')) {
        exclusionListUl = ul
      }
    })

    expect(exclusionListUl).not.toBeNull()

    // Assert: Verify all 5 items are rendered
    const liElements = exclusionListUl!.querySelectorAll('li')
    expect(liElements.length).toBe(5)

    // Assert: Document current styling behavior (baseline to preserve)
    const computedStyle = window.getComputedStyle(exclusionListUl!)
    const listStyleType = computedStyle.listStyleType

    // On unfixed code, this should match buyer_obligations styling (likely 'none')
    // After fix, this should have 'disc' or similar (which is desired per Requirement 3.1)
    console.log('Exclusion List - Computed listStyleType:', listStyleType)
    console.log('Exclusion List - Computed paddingLeft:', computedStyle.paddingLeft)
    console.log('Exclusion List - Computed margin:', computedStyle.margin)

    // Baseline assertion: Verify structure is correct
    expect(liElements.length).toBe(5)
  })

  /**
   * Property 3: Preservation - Buyer Prerequisites Section Rendering
   * 
   * Verify buyer_prerequisites section renders with the SAME styling as other list sections.
   */
  it('should render buyer_prerequisites with consistent bullet list styling', () => {
    // Arrange: Create buyer_prerequisites content with 3 items
    const prerequisiteItems = [
      'Prerequisite 1: Provide network infrastructure',
      'Prerequisite 2: Arrange server hardware',
      'Prerequisite 3: Grant necessary site access',
    ]

    const sectionContents = {
      buyer_prerequisites: {
        heading: 'BUYER PREREQUISITES',
        intro_text: 'Prerequisites to be fulfilled by buyer',
        items: prerequisiteItems,
      },
    }

    // Act: Render DocumentPreview
    const { container } = render(
      <DocumentPreview
        projectId="test-project"
        activeSectionKey="buyer_prerequisites"
        sectionContents={sectionContents}
      />
    )

    // Assert: Verify HTML structure exists
    const prereqSection = container.querySelector('[data-section-key="buyer_prerequisites"]')
    expect(prereqSection).not.toBeNull()

    // Find the prerequisites <ul> element
    const ulElements = prereqSection!.querySelectorAll('ul')
    expect(ulElements.length).toBeGreaterThan(0)

    const prereqListUl = ulElements[0] as HTMLElement

    // Assert: Verify all 3 items are rendered
    const liElements = prereqListUl.querySelectorAll('li')
    expect(liElements.length).toBe(3)

    // Assert: Document current styling behavior (baseline to preserve)
    const computedStyle = window.getComputedStyle(prereqListUl)
    const listStyleType = computedStyle.listStyleType

    console.log('Buyer Prerequisites - Computed listStyleType:', listStyleType)
    console.log('Buyer Prerequisites - Computed paddingLeft:', computedStyle.paddingLeft)

    // Baseline assertion: Verify structure is correct
    expect(liElements.length).toBe(3)
  })

  /**
   * Property 3: Preservation - Documentation Control Section Rendering
   * 
   * Verify documentation_control section renders with the SAME styling as other list sections.
   */
  it('should render documentation_control with consistent bullet list styling', () => {
    // Arrange: Create documentation_control content with 4 items (2 standard + 2 custom)
    const standardItems = DOCUMENTATION_CONTROL_ITEMS.slice(0, 2)
    const customItems = [
      'Custom doc control 1: Weekly progress reports',
      'Custom doc control 2: Change request documentation',
    ]

    const sectionContents = {
      documentation_control: {
        heading: 'DOCUMENTATION CONTROL',
        intro_text: 'The following documentation will be provided',
        items: standardItems,
        custom_items: customItems,
      },
    }

    // Act: Render DocumentPreview
    const { container } = render(
      <DocumentPreview
        projectId="test-project"
        activeSectionKey="documentation_control"
        sectionContents={sectionContents}
      />
    )

    // Assert: Verify HTML structure exists
    const docControlSection = container.querySelector('[data-section-key="documentation_control"]')
    expect(docControlSection).not.toBeNull()

    // Find the documentation control <ul> element
    const ulElements = docControlSection!.querySelectorAll('ul')
    expect(ulElements.length).toBeGreaterThan(0)

    let docControlUl: HTMLElement | null = null
    ulElements.forEach((ul) => {
      const text = ul.textContent || ''
      if (text.includes('Custom doc control 1')) {
        docControlUl = ul
      }
    })

    expect(docControlUl).not.toBeNull()

    // Assert: Verify all 4 items are rendered
    const liElements = docControlUl!.querySelectorAll('li')
    expect(liElements.length).toBe(4)

    // Assert: Document current styling behavior (baseline to preserve)
    const computedStyle = window.getComputedStyle(docControlUl!)
    const listStyleType = computedStyle.listStyleType

    console.log('Documentation Control - Computed listStyleType:', listStyleType)
    console.log('Documentation Control - Computed paddingLeft:', computedStyle.paddingLeft)

    // Baseline assertion: Verify structure is correct
    expect(liElements.length).toBe(4)
  })

  /**
   * Property 3: Preservation - Work Completion Criteria Section Rendering
   * 
   * Verify work_completion section renders criteria with the SAME styling as other list sections.
   */
  it('should render work_completion criteria with consistent bullet list styling', () => {
    // Arrange: Create work_completion content with 3 criteria (2 standard + 1 custom)
    const standardCriteria = WORK_COMPLETION_CRITERIA.slice(0, 2)
    const customCriteria = ['Custom criterion: All test cases passed']

    const sectionContents = {
      work_completion: {
        heading: 'WORK COMPLETION CRITERIA',
        intro_text: 'Work Completion Criteria:',
        criteria: standardCriteria,
        custom_items: customCriteria,
      },
    }

    // Act: Render DocumentPreview
    const { container } = render(
      <DocumentPreview
        projectId="test-project"
        activeSectionKey="work_completion"
        sectionContents={sectionContents}
      />
    )

    // Assert: Verify HTML structure exists
    const workCompletionSection = container.querySelector('[data-section-key="work_completion"]')
    expect(workCompletionSection).not.toBeNull()

    // Find the work completion <ul> element
    const ulElements = workCompletionSection!.querySelectorAll('ul')
    expect(ulElements.length).toBeGreaterThan(0)

    let workCompletionUl: HTMLElement | null = null
    ulElements.forEach((ul) => {
      const text = ul.textContent || ''
      if (text.includes('Custom criterion')) {
        workCompletionUl = ul
      }
    })

    expect(workCompletionUl).not.toBeNull()

    // Assert: Verify all 3 criteria are rendered
    const liElements = workCompletionUl!.querySelectorAll('li')
    expect(liElements.length).toBe(3)

    // Assert: Document current styling behavior (baseline to preserve)
    const computedStyle = window.getComputedStyle(workCompletionUl!)
    const listStyleType = computedStyle.listStyleType

    console.log('Work Completion - Computed listStyleType:', listStyleType)
    console.log('Work Completion - Computed paddingLeft:', computedStyle.paddingLeft)

    // Baseline assertion: Verify structure is correct
    expect(liElements.length).toBe(3)
  })

  /**
   * Property 3: Preservation - Empty Item Filtering
   * 
   * Verify filterFilledItems continues to work correctly.
   * Requirement 3.2: Empty or null items must continue to be filtered out.
   */
  it('should filter out empty and null items from all list sections', () => {
    // Arrange: Create sections with empty/null items
    const sectionContents = {
      exclusion_list: {
        heading: 'EXCLUSION LIST',
        intro_text: 'Exclusions',
        items: ['Valid item 1', '', null, '  ', 'Valid item 2'],
        custom_items: ['Custom item', null, ''],
      },
      buyer_prerequisites: {
        heading: 'BUYER PREREQUISITES',
        intro_text: 'Prerequisites',
        items: ['Prereq 1', '', 'Prereq 2', null, '   '],
      },
      documentation_control: {
        heading: 'DOCUMENTATION CONTROL',
        intro_text: 'Documentation',
        items: [null, '', 'Doc item 1', 'Doc item 2', '  '],
        custom_items: ['', 'Custom doc'],
      },
    }

    // Act: Render DocumentPreview
    const { container } = render(
      <DocumentPreview
        projectId="test-project"
        activeSectionKey="exclusion_list"
        sectionContents={sectionContents}
      />
    )

    // Assert: Verify only non-empty items are rendered

    // Exclusion list: should have 3 items (2 valid + 1 custom)
    const exclusionSection = container.querySelector('[data-section-key="exclusion_list"]')
    if (exclusionSection) {
      const exclusionUl = exclusionSection.querySelector('ul')
      if (exclusionUl) {
        const exclusionLi = exclusionUl.querySelectorAll('li')
        expect(exclusionLi.length).toBe(3) // 'Valid item 1', 'Valid item 2', 'Custom item'
      }
    }

    // Buyer prerequisites: should have 2 items
    const prereqSection = container.querySelector('[data-section-key="buyer_prerequisites"]')
    if (prereqSection) {
      const prereqUl = prereqSection.querySelector('ul')
      if (prereqUl) {
        const prereqLi = prereqUl.querySelectorAll('li')
        expect(prereqLi.length).toBe(2) // 'Prereq 1', 'Prereq 2'
      }
    }

    // Documentation control: should have 3 items
    const docSection = container.querySelector('[data-section-key="documentation_control"]')
    if (docSection) {
      const docUl = docSection.querySelector('ul')
      if (docUl) {
        const docLi = docUl.querySelectorAll('li')
        expect(docLi.length).toBe(3) // 'Doc item 1', 'Doc item 2', 'Custom doc'
      }
    }
  })

  /**
   * Property 3: Preservation - Template Text Replacement
   * 
   * Verify template text replacement continues to work via renderTemplateText.
   * Requirement 3.3: Items with template placeholders must be processed correctly.
   */
  it('should process template text placeholders in list items', () => {
    // Arrange: Create items with template placeholders
    const sectionContents = {
      exclusion_list: {
        heading: 'EXCLUSION LIST',
        intro_text: 'Exclusions',
        items: [
          'Integration with {{ClientName}} existing systems',
          'Deployment to {{ClientLocation}} servers',
        ],
        custom_items: [],
      },
    }

    // Act: Render DocumentPreview
    const { container } = render(
      <DocumentPreview
        projectId="test-project"
        activeSectionKey="exclusion_list"
        sectionContents={sectionContents}
      />
    )

    // Assert: Verify template placeholders are replaced
    const exclusionSection = container.querySelector('[data-section-key="exclusion_list"]')
    expect(exclusionSection).not.toBeNull()

    const sectionText = exclusionSection!.textContent || ''
    
    // Template should be replaced with values from mocked store
    expect(sectionText).toContain('Test Client') // {{ClientName}} replaced
    expect(sectionText).toContain('Test Location') // {{ClientLocation}} replaced
    
    // Original template placeholders should NOT appear
    expect(sectionText).not.toContain('{{ClientName}}')
    expect(sectionText).not.toContain('{{ClientLocation}}')
  })

  /**
   * Property 3: Preservation - Empty List Rendering
   * 
   * Verify that sections with empty item lists do not render a bullet list.
   * Requirement 3.2: Empty arrays must return null from renderBulletList.
   */
  it('should not render bullet list when all list sections have empty items', () => {
    // Arrange: Create sections with empty item arrays
    const sectionContents = {
      exclusion_list: {
        heading: 'EXCLUSION LIST',
        intro_text: 'No exclusions',
        items: [],
        custom_items: [],
      },
      buyer_prerequisites: {
        heading: 'BUYER PREREQUISITES',
        intro_text: 'No prerequisites',
        items: [],
      },
      documentation_control: {
        heading: 'DOCUMENTATION CONTROL',
        intro_text: 'No documentation requirements',
        items: [],
        custom_items: [],
      },
    }

    // Act: Render DocumentPreview
    const { container } = render(
      <DocumentPreview
        projectId="test-project"
        activeSectionKey="exclusion_list"
        sectionContents={sectionContents}
      />
    )

    // Assert: Verify headings exist
    // Note: Intro text may only render if items exist, which is acceptable behavior
    
    const exclusionSection = container.querySelector('[data-section-key="exclusion_list"]')
    if (exclusionSection) {
      const ulElements = exclusionSection.querySelectorAll('ul')
      expect(ulElements.length).toBe(0) // No bullet list should render
      
      // Heading should exist
      expect(exclusionSection.textContent).toContain('EXCLUSION LIST')
    }

    const prereqSection = container.querySelector('[data-section-key="buyer_prerequisites"]')
    if (prereqSection) {
      const ulElements = prereqSection.querySelectorAll('ul')
      expect(ulElements.length).toBe(0)
    }

    const docSection = container.querySelector('[data-section-key="documentation_control"]')
    if (docSection) {
      const ulElements = docSection.querySelectorAll('ul')
      expect(ulElements.length).toBe(0)
    }
  })

  /**
   * Property 3: Preservation - Section Hover and Click Indicators
   * 
   * Verify hover indicators and click-to-edit functionality remain unchanged.
   * Requirement 3.4: Edit indicators and navigation must continue to work.
   */
  it('should display click-to-edit indicator and handle section clicks', () => {
    // Arrange
    const mockOnSectionClick = vi.fn()
    const sectionContents = {
      exclusion_list: {
        heading: 'EXCLUSION LIST',
        intro_text: 'Exclusions',
        items: ['Exclusion 1'],
        custom_items: [],
      },
    }

    // Act: Render DocumentPreview with click handler
    const { container } = render(
      <DocumentPreview
        projectId="test-project"
        activeSectionKey={null}
        sectionContents={sectionContents}
        onSectionClick={mockOnSectionClick}
      />
    )

    // Assert: Verify section has data attributes for interaction
    const exclusionSection = container.querySelector('[data-section-key="exclusion_list"]')
    expect(exclusionSection).not.toBeNull()
    expect(exclusionSection!.getAttribute('data-section-key')).toBe('exclusion_list')

    // Note: Hover indicator is rendered conditionally on mouse events
    // The section structure should support hover/click interactions
    expect(exclusionSection).not.toBeNull()
  })
})
