import { describe, expect, it } from 'vitest';
import type { CustomSubsection } from '../types/customSections';
import { insertSubsectionAfter } from './customSectionUtils';

const makeSubsection = (key: string): CustomSubsection => ({
  key,
  name: key,
  contentType: 'paragraph',
  data: {
    paragraphs: [{ html: `<p>${key}</p>` }],
  },
});

describe('insertSubsectionAfter', () => {
  it('inserts a subsection immediately after the requested anchor', () => {
    const subsections = [
      makeSubsection('first'),
      makeSubsection('second'),
      makeSubsection('third'),
    ];
    const inserted = makeSubsection('inserted');

    const result = insertSubsectionAfter(subsections, inserted, 'first');

    expect(result.map((subsection) => subsection.key)).toEqual([
      'first',
      'inserted',
      'second',
      'third',
    ]);
    expect(subsections.map((subsection) => subsection.key)).toEqual([
      'first',
      'second',
      'third',
    ]);
  });

  it('appends when no valid anchor is provided', () => {
    const subsections = [makeSubsection('first'), makeSubsection('second')];

    expect(
      insertSubsectionAfter(subsections, makeSubsection('inserted')).map(
        (subsection) => subsection.key,
      ),
    ).toEqual(['first', 'second', 'inserted']);

    expect(
      insertSubsectionAfter(
        subsections,
        makeSubsection('missing-anchor-inserted'),
        'missing',
      ).map((subsection) => subsection.key),
    ).toEqual(['first', 'second', 'missing-anchor-inserted']);
  });
});
