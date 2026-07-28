import { describe, expect, it, vi } from 'vitest';
import {
  EDIT_METADATA_KEY,
  buildContentWithEditMetadata,
  getEditMetadata,
  getMarkerType,
  stripEditMetadata,
  type EditMarker,
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

  // ── Two-Color Highlighting Tests ──

  it('inserts into empty field → type: "new"', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-27T10:00:00.000Z'));

    const content = buildContentWithEditMetadata(
      { existing_field: 'hello' },
      { existing_field: 'hello', new_field: 'world' },
      'User',
    );

    const marker = getEditMetadata(content)?.markers['new_field'];
    expect(marker).toBeDefined();
    expect(marker?.type).toBe('new');
    expect(marker?.editor).toBe('User');

    vi.useRealTimers();
  });

  it('replaces existing field → type: "updated"', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-27T10:00:00.000Z'));

    const content = buildContentWithEditMetadata(
      { text: 'Original value' },
      { text: 'Modified value' },
      'User',
    );

    const marker = getEditMetadata(content)?.markers['text'];
    expect(marker).toBeDefined();
    expect(marker?.type).toBe('updated');
    expect(marker?.editor).toBe('User');

    vi.useRealTimers();
  });

  it('array growth → new indices are "new", changed indices are "updated"', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-27T10:00:00.000Z'));

    const content = buildContentWithEditMetadata(
      { rows: [{ name: 'PLC', maker: 'Hitachi' }, { name: 'HMI', maker: 'Hitachi' }] },
      { rows: [{ name: 'PLC', maker: 'HMSI' }, { name: 'HMI', maker: 'Hitachi' }, { name: 'SCADA', maker: 'ABB' }] },
      'AI',
    );

    const markers = getEditMetadata(content)?.markers || {};

    // Index 0 maker changed → "updated"
    expect(markers['rows.0.maker']?.type).toBe('updated');

    // Index 2 is entirely new → "new"
    expect(markers['rows.2.name']?.type).toBe('new');
    expect(markers['rows.2.maker']?.type).toBe('new');

    // Index 1 unchanged → no marker
    expect(markers['rows.1.name']).toBeUndefined();
    expect(markers['rows.1.maker']).toBeUndefined();

    vi.useRealTimers();
  });

  it('AI replacing existing content → type: "updated"', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-27T10:00:00.000Z'));

    const content = buildContentWithEditMetadata(
      { para1: '<p>User wrote this originally</p>' },
      { para1: '<p>AI rewrote this paragraph</p>' },
      'AI',
    );

    const marker = getEditMetadata(content)?.markers['para1'];
    expect(marker?.type).toBe('updated');
    expect(marker?.editor).toBe('AI');

    vi.useRealTimers();
  });

  it('AI inserting into empty section → type: "new"', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-27T10:00:00.000Z'));

    const content = buildContentWithEditMetadata(
      {},
      { para1: '<p>AI generated this</p>', system_objective: 'New objective' },
      'AI',
    );

    const markers = getEditMetadata(content)?.markers || {};
    expect(markers['para1']?.type).toBe('new');
    expect(markers['para1']?.editor).toBe('AI');
    expect(markers['system_objective']?.type).toBe('new');

    vi.useRealTimers();
  });

  it('Rule 5: re-editing a "new" path produces "updated" marker', () => {
    vi.useFakeTimers();

    // Step 1: AI inserts new content
    vi.setSystemTime(new Date('2026-07-27T10:00:00.000Z'));
    const afterInsert = buildContentWithEditMetadata(
      {},
      { text: 'AI wrote this' },
      'AI',
    );
    expect(getEditMetadata(afterInsert)?.markers['text']?.type).toBe('new');

    // Step 2: User edits the same content
    vi.setSystemTime(new Date('2026-07-27T11:00:00.000Z'));
    const afterEdit = buildContentWithEditMetadata(
      afterInsert,
      { text: 'User revised this' },
      'User',
    );

    const marker = getEditMetadata(afterEdit)?.markers['text'];
    expect(marker?.type).toBe('updated');
    expect(marker?.editor).toBe('User');
    expect(marker?.updatedAt).toBe('2026-07-27T11:00:00.000Z');

    vi.useRealTimers();
  });

  it('backward compat: markers without type are treated as "updated"', () => {
    const legacyMarker: EditMarker = {
      path: 'text',
      updatedAt: '2026-05-21T10:00:00.000Z',
    };

    // No type field at all
    expect(legacyMarker.type).toBeUndefined();
    expect(getMarkerType(legacyMarker)).toBe('updated');
  });

  it('editor attribution: editor field set correctly for "AI" and "User"', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-27T10:00:00.000Z'));

    const aiContent = buildContentWithEditMetadata({}, { text: 'hello' }, 'AI');
    expect(getEditMetadata(aiContent)?.markers['text']?.editor).toBe('AI');

    const userContent = buildContentWithEditMetadata({}, { text: 'hello' }, 'User');
    expect(getEditMetadata(userContent)?.markers['text']?.editor).toBe('User');

    const noEditorContent = buildContentWithEditMetadata({}, { text: 'hello' });
    expect(getEditMetadata(noEditorContent)?.markers['text']?.editor).toBeUndefined();

    vi.useRealTimers();
  });

  it('green markers persist when unrelated paths change', () => {
    vi.useFakeTimers();

    // Step 1: insert a new field (Green)
    vi.setSystemTime(new Date('2026-07-27T10:00:00.000Z'));
    const step1 = buildContentWithEditMetadata(
      { existing: 'hello' },
      { existing: 'hello', new_field: 'world' },
      'AI',
    );
    expect(getEditMetadata(step1)?.markers['new_field']?.type).toBe('new');

    // Step 2: edit an unrelated field
    vi.setSystemTime(new Date('2026-07-27T11:00:00.000Z'));
    const step2 = buildContentWithEditMetadata(
      step1,
      { existing: 'modified', new_field: 'world' },
      'User',
    );

    const markers = getEditMetadata(step2)?.markers || {};

    // The green marker should persist (unchanged path, not overwritten)
    expect(markers['new_field']?.type).toBe('new');
    expect(markers['new_field']?.updatedAt).toBe('2026-07-27T10:00:00.000Z');

    // The existing field should be "updated"
    expect(markers['existing']?.type).toBe('updated');
    expect(markers['existing']?.updatedAt).toBe('2026-07-27T11:00:00.000Z');

    vi.useRealTimers();
  });

  it('deletion (path removed) → no marker created', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-27T10:00:00.000Z'));

    const content = buildContentWithEditMetadata(
      { text: 'exists', will_delete: 'gone soon' },
      { text: 'exists' },
    );

    const markers = getEditMetadata(content)?.markers || {};

    // No marker for deleted path
    expect(markers['will_delete']).toBeUndefined();
    // No marker for unchanged path
    expect(markers['text']).toBeUndefined();

    vi.useRealTimers();
  });
});
