import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import EditableTable from './EditableTable';

describe('EditableTable', () => {
  it('renders formerly read-only fields as editable inputs', () => {
    const columns = [
      { key: 'name', label: 'Name' },
      { key: 'details', label: 'Details', readOnly: true },
      { key: 'date', label: 'Date', readOnly: true },
    ];
    const rows = [{ name: 'John', details: 'First issue', date: '15-01-2025' }];
    const onChange = vi.fn();

    render(<EditableTable columns={columns} rows={rows} onChange={onChange} />);

    const detailsInput = screen.getByDisplayValue('First issue') as HTMLInputElement;
    const dateInput = screen.getByDisplayValue('15-01-2025') as HTMLInputElement;
    const nameInput = screen.getByDisplayValue('John') as HTMLInputElement;

    expect(detailsInput.disabled).toBe(false);
    expect(dateInput.disabled).toBe(false);
    expect(nameInput.disabled).toBe(false);

    fireEvent.change(detailsInput, { target: { value: 'Updated issue' } });

    expect(onChange).toHaveBeenCalledWith([
      { name: 'John', details: 'Updated issue', date: '15-01-2025' },
    ]);
  });

  it('renders formerly read-only multiline fields as editable textareas', () => {
    const columns = [
      { key: 'details', label: 'Details', multiline: true, readOnly: true },
    ];
    const rows = [{ details: 'First issue with multiple lines' }];
    const onChange = vi.fn();

    render(<EditableTable columns={columns} rows={rows} onChange={onChange} />);

    const textarea = screen.getByDisplayValue(
      'First issue with multiple lines',
    ) as HTMLTextAreaElement;

    expect(textarea.disabled).toBe(false);

    fireEvent.change(textarea, { target: { value: 'Editable multiline value' } });

    expect(onChange).toHaveBeenCalledWith([
      { details: 'Editable multiline value' },
    ]);
  });

  it('ignores legacy locked flags and keeps every cell editable', () => {
    const columns = [
      { key: 'sr_no', label: 'Sr. No.', locked: true },
      { key: 'details', label: 'Details', readOnly: true },
      { key: 'name', label: 'Name' },
    ];
    const rows = [{ sr_no: 1, details: 'First issue', name: 'John' }];
    const onChange = vi.fn();

    render(<EditableTable columns={columns} rows={rows} onChange={onChange} />);

    expect(screen.queryByText('🔒')).not.toBeInTheDocument();

    const serialInput = screen.getByDisplayValue('1') as HTMLInputElement;
    const detailsInput = screen.getByDisplayValue('First issue') as HTMLInputElement;
    const nameInput = screen.getByDisplayValue('John') as HTMLInputElement;

    expect(serialInput.disabled).toBe(false);
    expect(detailsInput.disabled).toBe(false);
    expect(nameInput.disabled).toBe(false);
  });
});
