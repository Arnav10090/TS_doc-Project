import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import EditableTable from './EditableTable';

describe('EditableTable', () => {
  it('should render read-only fields with disabled inputs and auto-generated styling', () => {
    const columns = [
      { key: 'name', label: 'Name' },
      { key: 'details', label: 'Details', readOnly: true },
      { key: 'date', label: 'Date', readOnly: true },
    ];

    const rows = [
      { name: 'John', details: 'First issue', date: '15-01-2025' },
    ];

    const onChange = vi.fn();

    render(
      <EditableTable
        columns={columns}
        rows={rows}
        onChange={onChange}
      />
    );

    // Check that read-only fields are rendered as disabled inputs
    const detailsInput = screen.getByDisplayValue('First issue') as HTMLInputElement;
    const dateInput = screen.getByDisplayValue('15-01-2025') as HTMLInputElement;
    const nameInput = screen.getByDisplayValue('John') as HTMLInputElement;

    expect(detailsInput.disabled).toBe(true);
    expect(dateInput.disabled).toBe(true);
    expect(nameInput.disabled).toBe(false);

    // Check that read-only fields have the correct title attribute
    expect(detailsInput.title).toBe('Auto-generated field');
    expect(dateInput.title).toBe('Auto-generated field');
  });

  it('should render read-only multiline fields with disabled textareas', () => {
    const columns = [
      { key: 'details', label: 'Details', multiline: true, readOnly: true },
    ];

    const rows = [
      { details: 'First issue with multiple lines' },
    ];

    const onChange = vi.fn();

    render(
      <EditableTable
        columns={columns}
        rows={rows}
        onChange={onChange}
      />
    );

    const textarea = screen.getByDisplayValue('First issue with multiple lines') as HTMLTextAreaElement;
    expect(textarea.disabled).toBe(true);
    expect(textarea.title).toBe('Auto-generated field');
  });

  it('should distinguish between locked and read-only fields', () => {
    const columns = [
      { key: 'sr_no', label: 'Sr. No.', locked: true },
      { key: 'details', label: 'Details', readOnly: true },
      { key: 'name', label: 'Name' },
    ];

    const rows = [
      { sr_no: 1, details: 'First issue', name: 'John' },
    ];

    const onChange = vi.fn();

    const { container } = render(
      <EditableTable
        columns={columns}
        rows={rows}
        onChange={onChange}
      />
    );

    // Locked field should show lock icon and not be an input
    expect(screen.getByText('🔒')).toBeInTheDocument();
    
    // Read-only field should be a disabled input
    const detailsInput = screen.getByDisplayValue('First issue') as HTMLInputElement;
    expect(detailsInput.disabled).toBe(true);

    // Regular field should be an enabled input
    const nameInput = screen.getByDisplayValue('John') as HTMLInputElement;
    expect(nameInput.disabled).toBe(false);
  });
});
