import { describe, it, expect, beforeEach } from 'vitest'
import importSuggestion, {
  importFamilyA,
  importFamilyB,
  importFamilyC,
  importFamilyD,
  importFamilyE,
  importCustomSection,
} from './aiSuggestionImport'
import { getSectionDraft, clearSectionDraft } from './sectionDraftStore'
import { RESPONSIBILITY_MATRIX_ROWS } from '../components/preview/templateContent'

// Helper function to access extractStringListItem for testing
// We need to test this internal function, so we'll test it through importFamilyD
function testExtractStringListItem(value: unknown): string[] {
  // Use importFamilyD to indirectly test extractStringListItem
  const result = importFamilyD({}, Array.isArray(value) ? value : [value], 'buyer_obligations')
  return result.custom_items || []
}

describe('aiSuggestionImport utilities', () => {
  beforeEach(() => {
    // ensure a clean draft store for each test project/section we use
    clearSectionDraft('test-project', 'test-section')
    clearSectionDraft('test-project', 'custom-section')
  })

  it('importFamilyA replaces textual fields and preserves structural fields', () => {
    const existing = { attachments: ['logo'], html: '<p>old</p>', title: 'Title' }
    const content = '<p>new</p>'

    const updated = importFamilyA(existing, content)

    expect(updated.attachments).toEqual(['logo'])
    expect(updated.html === '<p>new</p>' || updated.paragraph === '<p>new</p>').toBe(true)
  })

  it('importFamilyA splits imported rich text when the target field is a paragraph array', () => {
    const existing = { paragraphs: ['Old paragraph'] }
    const content = '<p>First paragraph</p><p>Second paragraph</p>'

    const updated = importFamilyA(existing, content)

    expect(updated.paragraphs).toEqual(['<p>First paragraph</p>', '<p>Second paragraph</p>'])
  })

  it('importFamilyA strips structured output scaffolding from generic rich text fields', () => {
    const existing = { text: 'Old text' }
    const content = '## Output Data Structure\n\n**paragraphs**:\n\nActual paragraph content.'

    const updated = importFamilyA(existing, content)

    expect(updated.text).toBe('Actual paragraph content.')
  })

  it('importFamilyB replaces rows with suggestion content', () => {
    const existing = { rows: [{ a: 1 }], other: 'keep' }
    const content = [{ b: 2 }]

    const updated = importFamilyB(existing, content)

    expect(updated.rows).toEqual(content)
    expect(updated.other).toBe('keep')
  })

  it('importFamilyB preserves the full responsibility matrix when AI returns only subset rows', () => {
    const existing = {
      matrix_rows: RESPONSIBILITY_MATRIX_ROWS.map((row) => [...row]),
      other: 'keep',
    }
    const content = [
      {
        No: '-4',
        ITEM: 'GSM Modem',
        Responsibility_Buyer: 'S',
        Responsibility_Design: 'S',
        Responsibility_Seller: 'S',
        Responsibility_Supervision: 'S',
        Responsibility_Erection: 'B',
        Responsibility_Commissioning: 'S',
      },
    ]

    const updated = importFamilyB(existing, content)

    expect(updated.other).toBe('keep')
    expect(updated.matrix_rows).toHaveLength(RESPONSIBILITY_MATRIX_ROWS.length)
    expect(updated.matrix_rows[3]).toEqual([
      '-1',
      'Project Execution',
      'B/S',
      'B/S',
      'B/S',
      '-',
      '-',
      '-',
    ])
    expect(updated.matrix_rows[14]).toEqual([
      '-4',
      'GSM Modem',
      'S',
      'S',
      'S',
      'S',
      'B',
      'S',
    ])
    expect(updated.matrix_rows[29]).toEqual([
      '-10',
      'Trend Micro Antivirus',
      'S',
      'S',
      'S',
      'S',
      '',
      'S',
    ])
  })

  it('importFamilyC performs shallow merge with suggestion fields overwriting', () => {
    const existing = { a: 1, b: 2 }
    const content = { b: 3, c: 4 }

    const updated = importFamilyC(existing, content)

    expect(updated).toEqual({ a: 1, b: 3, c: 4 })
  })

  it('importFamilyD merges list items without duplicating existing items', () => {
    const existing = { items: [{ id: 1 }], title: 'keep' }
    const content = [{ id: 2 }, { id: 1 }]

    const updated = importFamilyD(existing, content)

    // should contain both id:1 and id:2 but no duplicate id:1
    const ids = (updated.items || []).map((i: any) => i.id).sort()
    expect(ids).toEqual([1, 2])
    expect(updated.title).toBe('keep')
  })

  it('importFamilyD normalizes documentation_control imports into plain string items', () => {
    const existing = {
      items: [
        'Screen Design Document',
        {
          items: [
            {
              name: 'Hardware Specifications',
              description: 'Nested duplicate that should collapse to a string item',
            },
          ],
          title: 'Documentation Control',
          description: 'Nested container object from malformed saved content',
        },
      ],
      custom_items: [],
    }
    const content = [
      {
        name: 'Software Specifications',
        description: 'Imported as an object by AI structured output',
      },
      {
        name: 'Operation Manual',
        description: 'Imported as an object by AI structured output',
      },
    ]

    const updated = importFamilyD(existing, content, 'documentation_control')

    expect(updated.items).toEqual([
      'Screen Design Document',
      'Hardware Specifications',
      'Software Specifications',
      'Operation Manual',
    ])
  })

  it('importFamilyE replaces description-like fields and preserves images', () => {
    const existing = { images: [{ filename: 'img1' }], description: 'old' }
    const content = 'a new description'

    const updated = importFamilyE(existing, content)

    expect(updated.images).toEqual([{ filename: 'img1' }])
    // description may be placed on html/description/paragraph keys
    const desc = updated.description || updated.html || updated.paragraph
    expect(desc).toBe('a new description')
  })

  it('importCustomSection updates subsection data by index and preserves structure', () => {
    const base = {
      title: 'Custom',
      subsections: [
        { key: 's1', name: 's1', contentType: 'paragraph', data: { paragraphs: [{ html: '<p>old</p>' }] } },
        { key: 's2', name: 's2', contentType: 'table', data: { rows: [{ a: 1 }] } },
      ],
      insertAfterKey: '',
    }

    const suggestions = [
      { subsection_index: 0, type: 'paragraph', content: '<p>new</p>' },
      { subsection_index: 1, type: 'table', content: [{ b: 2 }] },
    ]

    const updated = importCustomSection(base as any, suggestions as any)

    expect(updated.subsections.length).toBe(2)
    expect((updated.subsections[0].data as any).html || (updated.subsections[0].data as any).paragraphs[0].html).toBe('<p>new</p>')
    expect((updated.subsections[1].data as any).rows).toEqual([{ b: 2 }])
  })

  it('importCustomSection strips structured output scaffolding from paragraph subsection content', () => {
    const base = {
      title: 'Custom',
      subsections: [
        { key: 's1', name: 's1', contentType: 'paragraph', data: { html: '<p>old</p>' } },
      ],
      insertAfterKey: '',
    }

    const suggestions = [
      {
        subsection_index: 0,
        type: 'paragraph',
        content: '## Output Data Structure\n\n**paragraphs**:\n\n<p>new</p>',
      },
    ]

    const updated = importCustomSection(base as any, suggestions as any)

    expect((updated.subsections[0].data as any).html).toBe('<p>new</p>')
  })

  it('importSuggestion writes to draft store and returns updated draft (integration)', async () => {
    const existing = { html: '<p>old</p>' }
    const suggestion = { content: '<p>fresh</p>', structured_import_available: true }

    const result = await importSuggestion('test-project', 'test-section', suggestion, existing)

    const stored = getSectionDraft('test-project', 'test-section')

    expect(result).toBeTruthy()
    expect(stored).toBeTruthy()
    expect((stored as any).html === '<p>fresh</p>' || (stored as any).paragraph === '<p>fresh</p>').toBe(true)
  })

  it('importSuggestion populates `items` for the features section even when a stray `rows` key already exists on the draft', async () => {
    const existing = {
      heading: 'DESIGN SCOPE OF WORK',
      intro_text: 'Implementation of {{SolutionName}}',
      items: [{ id: 'feature-1', title: '', brief: '', description: '' }],
      // Simulates a project already corrupted by the routing bug: a `rows`
      // key exists on the draft even though `features` never uses one.
      rows: [],
    }
    const suggestionContent = [
      {
        id: '',
        title: 'End-to-end Yard Visibility',
        brief: 'Real-time tracking of yard operations',
        description: '<p>Full description</p>',
      },
    ]
    const suggestion = { structured_import_available: true, content: suggestionContent }

    const result = await importSuggestion('test-project', 'features', suggestion, existing)

    expect(result).toBeTruthy()
    const updated = result as Record<string, any>
    expect(updated.items).toEqual(suggestionContent)
    // The pre-existing `rows` key must be left alone, not overwritten with
    // the feature data.
    expect(updated.rows).toEqual([])
  })

  it('importSuggestion heals malformed documentation_control items before draft save', async () => {
    const existing = {
      heading: 'DOCUMENTATION CONTROL',
      intro_text: 'SELLER shall provide the following technical documentation.',
      items: [
        'Screen Design Document',
        {
          items: [
            {
              name: 'Hardware Specifications',
              description: 'Nested object persisted by older bad imports',
            },
          ],
          title: 'Documentation Control',
          description: 'Malformed container object',
        },
      ],
      custom_items: [],
    }
    const suggestion = {
      structured_import_available: true,
      content: [
        {
          name: 'Software Specifications',
          description: 'Imported as object',
        },
        {
          name: 'Operation Manual',
          description: 'Imported as object',
        },
      ],
    }

    const result = await importSuggestion(
      'test-project',
      'documentation_control',
      suggestion,
      existing,
    )

    expect(result).toEqual({
      heading: 'DOCUMENTATION CONTROL',
      intro_text: 'SELLER shall provide the following technical documentation.',
      items: [
        'Screen Design Document',
        'Hardware Specifications',
        'Software Specifications',
        'Operation Manual',
      ],
      custom_items: [],
    })
  })

  it('importSuggestion routes buyer obligations imports into `custom_items` when the draft includes locked template items', async () => {
    const existing = {
      heading: 'BUYER OBLIGATIONS',
      intro_text: 'The BUYER should fulfil the following obligations',
      items: [
        'Responsible for the project execution',
        'Arrange all the hardware in BUYER scope',
      ],
      custom_items: [],
    }
    const suggestion = {
      structured_import_available: true,
      content: {
        items: [
          { item: 'Provide site access for commissioning' },
          { obligation: 'Provide dedicated network connectivity' },
        ],
      },
    }

    const result = await importSuggestion(
      'test-project',
      'buyer_obligations',
      suggestion,
      existing,
    )

    expect(result).toEqual({
      heading: 'BUYER OBLIGATIONS',
      intro_text: 'The BUYER should fulfil the following obligations',
      items: [
        'Responsible for the project execution',
        'Arrange all the hardware in BUYER scope',
      ],
      custom_items: [
        'Provide site access for commissioning',
        'Provide dedicated network connectivity',
      ],
    })
  })

  it('importSuggestion accepts buyer obligations payloads that provide `custom_items` directly', async () => {
    const existing = {
      heading: 'BUYER OBLIGATIONS',
      intro_text: 'The BUYER should fulfil the following obligations',
      items: ['Locked obligation'],
      custom_items: ['Existing custom obligation'],
    }
    const suggestion = {
      structured_import_available: true,
      content: {
        heading: 'BUYER OBLIGATIONS',
        intro_text: 'The Buyer is required to fulfil the following obligations',
        custom_items: [
          ['Maintain a dedicated secure internet connection'],
          { item: 'Provide unrestricted site access to the seller team' },
        ],
      },
    }

    const result = await importSuggestion(
      'test-project',
      'buyer_obligations',
      suggestion,
      existing,
    )

    expect(result).toEqual({
      heading: 'BUYER OBLIGATIONS',
      intro_text: 'The BUYER should fulfil the following obligations',
      items: ['Locked obligation'],
      custom_items: [
        'Existing custom obligation',
        'Maintain a dedicated secure internet connection',
        'Provide unrestricted site access to the seller team',
      ],
    })
  })

  it('importSuggestion extracts introduction tender fields and removes metadata blocks from narrative text', async () => {
    const existing = {
      heading: 'INTRODUCTION',
      paragraphs: ['Old introduction paragraph'],
      tender_reference: '',
      tender_date: '',
    }
    const suggestion = {
      structured_import_available: true,
      content:
        '<p>This Technical Specification document is submitted in response to the tender.</p>\n\n## Tender Reference\nTender Reference: TS-PMYMS-2026-001\nTender Date: 29 Jun 2026',
    }

    const result = await importSuggestion('test-project', 'introduction', suggestion, existing)

    expect(result).toEqual({
      heading: 'INTRODUCTION',
      paragraphs: ['<p>This Technical Specification document is submitted in response to the tender.</p>'],
      tender_reference: 'TS-PMYMS-2026-001',
      tender_date: '29 Jun 2026',
    })
  })

  it('importSuggestion parses stringified introduction JSON and imports only the paragraph content', async () => {
    const existing = {
      heading: 'INTRODUCTION',
      paragraphs: ['Old introduction paragraph'],
      tender_reference: '',
      tender_date: '',
    }
    const suggestion = {
      structured_import_available: true,
      content: JSON.stringify({
        paragraphs: [
          'This Technical Specification document is submitted in response to the tender reference TS-PMYMS-2026-001 dated 29 Jun 2026.',
          'The solution is tailored to the specific needs of the JSPL Angul facility.',
        ],
        tender_reference: 'TS-PMYMS-2026-001',
        tender_date: '29 Jun 2026',
      }),
    }

    const result = await importSuggestion('test-project', 'introduction', suggestion, existing)

    expect(result).toEqual({
      heading: 'INTRODUCTION',
      paragraphs: [
        'This Technical Specification document is submitted in response to the tender reference TS-PMYMS-2026-001 dated 29 Jun 2026.',
        'The solution is tailored to the specific needs of the JSPL Angul facility.',
      ],
      tender_reference: 'TS-PMYMS-2026-001',
      tender_date: '29 Jun 2026',
    })
  })

  it('importSuggestion strips embedded introduction JSON blocks when narrative text is already present', async () => {
    const existing = {
      heading: 'INTRODUCTION',
      paragraphs: ['Old introduction paragraph'],
      tender_reference: '',
      tender_date: '',
    }
    const suggestion = {
      structured_import_available: true,
      content: `This Technical Specification document is submitted in response to the tender reference TS-PMYMS-2026-001 dated 29 Jun 2026.

The solution is tailored to the specific needs of the JSPL Angul facility.

{
  "paragraphs": [
    "This Technical Specification document is submitted in response to the tender reference TS-PMYMS-2026-001 dated 29 Jun 2026.",
    "The solution is tailored to the specific needs of the JSPL Angul facility."
  ],
  "tender_reference": "TS-PMYMS-2026-001",
  "tender_date": "29 Jun 2026"
}`,
    }

    const result = await importSuggestion('test-project', 'introduction', suggestion, existing)

    expect(result).toEqual({
      heading: 'INTRODUCTION',
      paragraphs: [
        'This Technical Specification document is submitted in response to the tender reference TS-PMYMS-2026-001 dated 29 Jun 2026.',
        'The solution is tailored to the specific needs of the JSPL Angul facility.',
      ],
      tender_reference: 'TS-PMYMS-2026-001',
      tender_date: '29 Jun 2026',
    })
  })

  it('importSuggestion strips output-structure scaffolding from introduction narrative text', async () => {
    const existing = {
      heading: 'INTRODUCTION',
      paragraphs: ['Old introduction paragraph'],
      tender_reference: '',
      tender_date: '',
    }
    const suggestion = {
      structured_import_available: true,
      content: `
This document provides a comprehensive overview of the PMYMS.

## Output Data Structure

**paragraphs**:

This Technical Specification (TS) document is submitted in response to the tender reference TS-PMYMS-2026-001 dated 29 Jun 2026.

As a trusted partner, Hitachi India Pvt. Ltd. is confident that our proposed solution will meet the requirements of JSPL Angul.

This Technical Specification (TS) document is submitted in response to the tender reference TS-PMYMS-2026-001 dated 29 Jun 2026.
      `,
    }

    const result = await importSuggestion('test-project', 'introduction', suggestion, existing)

    expect(result).toEqual({
      heading: 'INTRODUCTION',
      paragraphs: [
        'This document provides a comprehensive overview of the PMYMS.',
        'This Technical Specification (TS) document is submitted in response to the tender reference TS-PMYMS-2026-001 dated 29 Jun 2026.',
        'As a trusted partner, Hitachi India Pvt. Ltd. is confident that our proposed solution will meet the requirements of JSPL Angul.',
      ],
      tender_reference: '',
      tender_date: '',
    })
  })

  // Tests for extractStringListItem function via importFamilyD
  describe('extractStringListItem (via importFamilyD)', () => {
    it('extracts simple string array', () => {
      const input = ['Obligation 1', 'Obligation 2']
      const result = importFamilyD({}, input, 'buyer_obligations')
      
      expect(result.custom_items).toEqual(['Obligation 1', 'Obligation 2'])
    })

    it('extracts nested objects with "item" key', () => {
      const input = [
        { item: 'Obligation 1' },
        { item: 'Obligation 2' }
      ]
      const result = importFamilyD({}, input, 'buyer_obligations')
      
      expect(result.custom_items).toEqual(['Obligation 1', 'Obligation 2'])
    })

    it('extracts nested objects with "obligation" key', () => {
      const input = [
        { obligation: 'Buyer shall provide site access' },
        { obligation: 'Buyer shall provide power supply' }
      ]
      const result = importFamilyD({}, input, 'buyer_obligations')
      
      expect(result.custom_items).toEqual([
        'Buyer shall provide site access',
        'Buyer shall provide power supply'
      ])
    })

    it('extracts deeply nested structure with items array', () => {
      const input = {
        items: [
          { obligation: 'Obligation 1' },
          { obligation: 'Obligation 2' }
        ]
      }
      const result = importFamilyD({}, [input], 'buyer_obligations')
      
      expect(result.custom_items).toEqual(['Obligation 1', 'Obligation 2'])
    })

    it('extracts nested objects with "name" key', () => {
      const input = [
        { name: 'Hardware Specifications' },
        { name: 'Software Specifications' }
      ]
      const result = importFamilyD({}, input, 'documentation_control')
      
      expect(result.items).toEqual([
        'Hardware Specifications',
        'Software Specifications'
      ])
    })

    it('extracts nested objects with "title" key', () => {
      const input = [
        { title: 'Design Document' },
        { title: 'Test Report' }
      ]
      const result = importFamilyD({}, input, 'documentation_control')
      
      expect(result.items).toEqual(['Design Document', 'Test Report'])
    })

    it('extracts nested objects with "label" key', () => {
      const input = [
        { label: 'Label 1' },
        { label: 'Label 2' }
      ]
      const result = importFamilyD({}, input, 'exclusion_list')
      
      expect(result.items).toEqual(['Label 1', 'Label 2'])
    })

    it('extracts nested objects with "text" key', () => {
      const input = [
        { text: 'Text content 1' },
        { text: 'Text content 2' }
      ]
      const result = importFamilyD({}, input, 'buyer_prerequisites')
      
      expect(result.items).toEqual(['Text content 1', 'Text content 2'])
    })

    it('extracts nested objects with "description" key', () => {
      const input = [
        { description: 'Description 1' },
        { description: 'Description 2' }
      ]
      const result = importFamilyD({}, input, 'buyer_obligations')
      
      expect(result.custom_items).toEqual(['Description 1', 'Description 2'])
    })

    it('extracts nested objects with "brief" key', () => {
      const input = [
        { brief: 'Brief 1' },
        { brief: 'Brief 2' }
      ]
      const result = importFamilyD({}, input, 'buyer_obligations')
      
      expect(result.custom_items).toEqual(['Brief 1', 'Brief 2'])
    })

    it('handles mixed format arrays', () => {
      const input = [
        'Plain string obligation',
        { item: 'Object with item key' },
        { obligation: 'Object with obligation key' }
      ]
      const result = importFamilyD({}, input, 'buyer_obligations')
      
      expect(result.custom_items).toEqual([
        'Plain string obligation',
        'Object with item key',
        'Object with obligation key'
      ])
    })

    it('handles complex nested structures', () => {
      const input = [
        {
          items: [
            { obligation: 'Nested obligation 1' },
            { obligation: 'Nested obligation 2' }
          ]
        },
        { item: 'Direct item' }
      ]
      const result = importFamilyD({}, input, 'buyer_obligations')
      
      expect(result.custom_items).toEqual([
        'Nested obligation 1',
        'Nested obligation 2',
        'Direct item'
      ])
    })

    it('filters out empty strings and whitespace', () => {
      const input = [
        'Valid obligation',
        '',
        '   ',
        { item: '  ' },
        { obligation: 'Another valid obligation' }
      ]
      const result = importFamilyD({}, input, 'buyer_obligations')
      
      expect(result.custom_items).toEqual([
        'Valid obligation',
        'Another valid obligation'
      ])
    })

    it('trims whitespace from extracted strings', () => {
      const input = [
        '  Obligation with leading spaces  ',
        { item: '  Item with spaces  ' },
        { obligation: '  Obligation with spaces  ' }
      ]
      const result = importFamilyD({}, input, 'buyer_obligations')
      
      expect(result.custom_items).toEqual([
        'Obligation with leading spaces',
        'Item with spaces',
        'Obligation with spaces'
      ])
    })

    it('deduplicates extracted items', () => {
      const input = [
        'Duplicate obligation',
        'Unique obligation',
        { item: 'Duplicate obligation' },
        { obligation: 'Another unique' }
      ]
      const result = importFamilyD({}, input, 'buyer_obligations')
      
      expect(result.custom_items).toEqual([
        'Duplicate obligation',
        'Unique obligation',
        'Another unique'
      ])
    })

    it('merges with existing items without duplicates', () => {
      const existing = {
        custom_items: ['Existing obligation 1', 'Existing obligation 2']
      }
      const input = [
        'New obligation',
        { item: 'Existing obligation 1' }, // Should be deduplicated
        { obligation: 'Another new obligation' }
      ]
      const result = importFamilyD(existing, input, 'buyer_obligations')
      
      expect(result.custom_items).toEqual([
        'Existing obligation 1',
        'Existing obligation 2',
        'New obligation',
        'Another new obligation'
      ])
    })

    it('handles null and undefined values gracefully', () => {
      const input = [
        null,
        undefined,
        'Valid obligation',
        { item: null },
        { obligation: undefined }
      ]
      const result = importFamilyD({}, input, 'buyer_obligations')
      
      expect(result.custom_items).toEqual(['Valid obligation'])
    })

    it('handles objects without any recognized keys', () => {
      const input = [
        { unknownKey: 'Unknown value' },
        'Valid obligation',
        { anotherUnknown: 'Another unknown' }
      ]
      const result = importFamilyD({}, input, 'buyer_obligations')
      
      expect(result.custom_items).toEqual(['Valid obligation'])
    })

    it('handles very deeply nested items array', () => {
      const input = {
        items: [
          {
            items: [
              { obligation: 'Level 3 nested' }
            ]
          }
        ]
      }
      const result = importFamilyD({}, [input], 'buyer_obligations')
      
      expect(result.custom_items).toEqual(['Level 3 nested'])
    })

    it('prioritizes "name" over other keys based on order', () => {
      const input = [
        {
          name: 'Name value',
          title: 'Title value',
          description: 'Description value'
        }
      ]
      const result = importFamilyD({}, input, 'documentation_control')
      
      // Should extract "name" as it comes first in preferredKeys
      expect(result.items).toEqual(['Name value'])
    })

    it('handles AI response with nested items and multiple fields', () => {
      const input = {
        items: [
          {
            obligation: 'Buyer shall provide workspace',
            priority: 'high',
            category: 'infrastructure'
          },
          {
            obligation: 'Buyer shall provide utilities',
            priority: 'medium',
            category: 'services'
          }
        ]
      }
      const result = importFamilyD({}, [input], 'buyer_obligations')
      
      expect(result.custom_items).toEqual([
        'Buyer shall provide workspace',
        'Buyer shall provide utilities'
      ])
    })
  })
})
