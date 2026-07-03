import { describe, expect, it } from 'vitest';

import { mergeSectionContent } from './predefinedSectionContent';

describe('mergeSectionContent', () => {
  it('normalizes legacy division_of_eng object rows into preview-safe matrix rows', () => {
    const merged = mergeSectionContent('division_of_eng', {
      matrix_rows: [
        {
          No: '1',
          ITEM: 'Project Execution',
          Responsibility_Buyer: '-',
          Responsibility_Design: 'B/S',
          Responsibility_Seller: 'B/S',
          Responsibility_Erection: '-',
          Responsibility_Supervision: '-',
          Responsibility_Commissioning: '-',
        },
      ],
    });

    expect(Array.isArray(merged.matrix_rows)).toBe(true);
    expect(merged.matrix_rows[0]).toEqual([
      'No.',
      'ITEM',
      'Responsibility',
      'Responsibility',
      'Responsibility',
      'Responsibility',
      'Responsibility',
      'Responsibility',
    ]);
    expect(merged.matrix_rows[1]).toEqual([
      'No.',
      'ITEM',
      'BD',
      'BE',
      'DD',
      'SU',
      'ER',
      'COM',
    ]);
    expect(merged.matrix_rows[2]).toEqual([
      '1',
      'Project Execution',
      '-',
      'B/S',
      'B/S',
      '-',
      '-',
      '-',
    ]);
  });

  it('falls back to the default Division of Engineering matrix when saved rows are malformed', () => {
    const merged = mergeSectionContent('division_of_eng', {
      matrix_rows: [['No.', 'ITEM', 'Responsibility'], ['Only one broken row']],
    });

    expect(merged.matrix_rows[0]).toEqual([
      'No.',
      'ITEM',
      'Responsibility',
      'Responsibility',
      'Responsibility',
      'Responsibility',
      'Responsibility',
      'Responsibility',
    ]);
    expect(merged.matrix_rows[1]).toEqual([
      'No.',
      'ITEM',
      'BD',
      'BE',
      'DD',
      'SU',
      'ER',
      'COM',
    ]);
    expect(merged.matrix_rows[2]).toEqual([
      '(1)',
      'Services',
      '',
      '',
      '',
      '',
      '',
      '',
    ]);
    expect(merged.matrix_rows[14]).toEqual([
      '-4',
      'GSM Modem',
      'S',
      'S',
      'S',
      'S',
      'B',
      'S',
    ]);
  });
});
