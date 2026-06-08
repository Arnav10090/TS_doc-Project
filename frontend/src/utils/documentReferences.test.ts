import { describe, expect, it } from 'vitest';
import { buildDocumentReferences } from './documentReferences';

describe('documentReferences', () => {
  it('numbers built-in figures/tables and custom captions in document order', () => {
    const references = buildDocumentReferences(
      {
        revision_history: { rows: [] },
        executive_summary: { client_logo_rows: [] },
        system_config: {},
        'custom_section_1700000000000_12345678-1234-1234-1234-123456789abc': {
          title: 'Custom Section',
          insertAfterKey: 'system_config',
          subsections: [
            {
              key: 'custom_subsection_1',
              name: 'Network Layout',
              contentType: 'image',
              data: {
                images: [
                  {
                    base64: 'data:image/png;base64,abcd',
                    filename: 'network.png',
                    mimeType: 'image/png',
                    caption: 'Network Layout',
                  },
                ],
              },
            },
            {
              key: 'custom_subsection_2',
              name: 'Training Schedule',
              contentType: 'table',
              data: {
                tables: [
                  {
                    caption: 'Training Schedule',
                    columns: ['Day', 'Topic'],
                    rows: [{ Day: '1', Topic: 'Overview' }],
                  },
                ],
              },
            },
          ],
        },
      },
      { architecture: true },
    );

    expect(references.figures.map((figure) => [figure.number, figure.name])).toEqual([
      [1, 'System Architecture'],
      [2, 'Network Layout'],
    ]);
    expect(references.tables.map((table) => [table.number, table.name])).toEqual([
      [1, 'Revision History'],
      [2, 'Client Reference Logos'],
      [3, 'Training Schedule'],
    ]);
  });

  it('renumbers later built-in tables when a custom table is inserted between sections', () => {
    const references = buildDocumentReferences({
      abbreviations: { rows: [] },
      tech_stack: { rows: [] },
      'custom_section_1700000000000_12345678-1234-1234-1234-123456789abc': {
        title: '',
        insertAfterKey: 'abbreviations',
        displayMode: 'subsection',
        subsections: [
          {
            key: 'custom_subsection_1',
            name: 'Inserted Data',
            contentType: 'table',
            data: {
              tables: [
                {
                  caption: 'Inserted Data',
                  columns: ['Name'],
                  rows: [{ Name: 'Example' }],
                },
              ],
            },
          },
        ],
      },
    });

    expect(references.tables.map((table) => [table.number, table.name])).toEqual([
      [1, 'Abbreviations Used'],
      [2, 'Inserted Data'],
      [3, 'Technology Stack'],
    ]);
  });
});
