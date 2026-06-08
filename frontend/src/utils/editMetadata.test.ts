import { describe, expect, it, vi } from 'vitest';
import {
  EDIT_METADATA_KEY,
  buildContentWithEditMetadata,
  getEditMetadata,
  stripEditMetadata,
} from './editMetadata';

describe('editMetadata', () => {
  it('records granular changed leaf paths and preserves content', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-21T10:00:00.000Z'));

    const content = buildContentWithEditMetadata(
      {
        para1: '<p>Before</p>',
        rows: [{ name: 'PLC', maker: 'Hitachi' }],
      },
      {
        para1: '<p>After</p>',
        rows: [{ name: 'PLC', maker: 'HMSI' }],
      },
      'Tester',
    );

    expect(stripEditMetadata(content)).toEqual({
      para1: '<p>After</p>',
      rows: [{ name: 'PLC', maker: 'HMSI' }],
    });
    expect(Object.keys(getEditMetadata(content)?.markers || {})).toEqual([
      'para1',
      'rows.0.maker',
    ]);
    expect(content[EDIT_METADATA_KEY].markers['rows.0.maker']).toMatchObject({
      editor: 'Tester',
      updatedAt: '2026-05-21T10:00:00.000Z',
    });

    vi.useRealTimers();
  });

  it('keeps previous markers when no new values change', () => {
    const previous = {
      text: 'Same',
      [EDIT_METADATA_KEY]: {
        version: 1,
        sectionUpdatedAt: '2026-05-21T10:00:00.000Z',
        markers: {
          text: {
            path: 'text',
            updatedAt: '2026-05-21T10:00:00.000Z',
          },
        },
      },
    };

    const content = buildContentWithEditMetadata(previous, { text: 'Same' });

    expect(getEditMetadata(content)?.markers.text).toEqual(
      previous[EDIT_METADATA_KEY].markers.text,
    );
  });
});

