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

describe('aiSuggestionImport utilities', () => {
  beforeEach(() => {
    // ensure a clean draft store for each test project/section we use
    clearSectionDraft('test-project', 'test-section')
    clearSectionDraft('test-project', 'custom-section')
  })

  it('importFamilyA replaces textual fields and preserves structural fields', () => {
    const existing = { client_logo_rows: ['logo'], html: '<p>old</p>', title: 'Title' }
    const content = '<p>new</p>'

    const updated = importFamilyA(existing, content)

    expect(updated.client_logo_rows).toEqual(['logo'])
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
})
