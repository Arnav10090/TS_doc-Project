import React, { useEffect, useState } from 'react';
import { TableData, TableItem, getTableItems } from '../../types/customSections';

interface TableSubsectionEditorProps {
  data: TableData;
  onChange: (data: TableData) => void;
}

const createEmptyTable = (): TableItem => ({
  columns: ['Column 1'],
  rows: [{ 'Column 1': '' }],
});

const TableSubsectionEditor: React.FC<TableSubsectionEditorProps> = ({ data, onChange }) => {
  const [tables, setTables] = useState<TableItem[]>(() => {
    const items = getTableItems(data);
    return items.length > 0 ? items : [createEmptyTable()];
  });

  useEffect(() => {
    const items = getTableItems(data);
    setTables(items.length > 0 ? items : [createEmptyTable()]);
  }, [data]);

  const containerStyle: React.CSSProperties = {
    padding: '16px',
    backgroundColor: '#F9FAFB',
    borderRadius: '6px',
  };

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: '14px',
    fontWeight: 600,
    color: '#1A1A2E',
    marginBottom: '12px',
  };

  const buttonStyle: React.CSSProperties = {
    padding: '8px 12px',
    backgroundColor: '#E60012',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '4px',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    marginRight: '8px',
    marginBottom: '8px',
    fontFamily: 'inherit',
  };

  const secondaryButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: '#6B7280',
  };

  const inputStyle: React.CSSProperties = {
    padding: '6px 8px',
    border: '1px solid #D1D5DB',
    borderRadius: '4px',
    fontSize: '13px',
    fontFamily: 'inherit',
    width: '100%',
  };

  const tableStyle: React.CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '12px',
    backgroundColor: '#FFFFFF',
  };

  const thStyle: React.CSSProperties = {
    padding: '8px',
    border: '1px solid #D1D5DB',
    backgroundColor: '#F3F4F6',
    fontWeight: 600,
    fontSize: '13px',
  };

  const tdStyle: React.CSSProperties = {
    padding: '8px',
    border: '1px solid #D1D5DB',
  };

  const updateTables = (nextTables: TableItem[]) => {
    setTables(nextTables);
    onChange({ tables: nextTables });
  };

  const updateSingleTable = (tableIndex: number, nextTable: TableItem) => {
    updateTables(tables.map((table, index) => (index === tableIndex ? nextTable : table)));
  };

  const handleAddTable = () => {
    updateTables([...tables, createEmptyTable()]);
  };

  const handleRemoveTable = (tableIndex: number) => {
    if (tables.length <= 1) return;
    updateTables(tables.filter((_, index) => index !== tableIndex));
  };

  const handleAddColumn = (tableIndex: number) => {
    const table = tables[tableIndex];
    const newColumnName = `Column ${table.columns.length + 1}`;
    const newColumns = [...table.columns, newColumnName];
    const newRows = table.rows.map((row) => ({ ...row, [newColumnName]: '' }));
    updateSingleTable(tableIndex, { columns: newColumns, rows: newRows });
  };

  const handleRemoveColumn = (tableIndex: number, columnIndex: number) => {
    const table = tables[tableIndex];
    if (table.columns.length <= 1) return;
    const columnToRemove = table.columns[columnIndex];
    const newColumns = table.columns.filter((_, index) => index !== columnIndex);
    const newRows = table.rows.map((row) => {
      const { [columnToRemove]: _, ...rest } = row;
      return rest;
    });
    updateSingleTable(tableIndex, { columns: newColumns, rows: newRows });
  };

  const handleColumnNameChange = (
    tableIndex: number,
    columnIndex: number,
    newName: string,
  ) => {
    const table = tables[tableIndex];
    const oldName = table.columns[columnIndex];
    const newColumns = [...table.columns];
    newColumns[columnIndex] = newName;
    const newRows = table.rows.map((row) => {
      const { [oldName]: value, ...rest } = row;
      return { ...rest, [newName]: value || '' };
    });
    updateSingleTable(tableIndex, { columns: newColumns, rows: newRows });
  };

  const handleAddRow = (tableIndex: number) => {
    const table = tables[tableIndex];
    const newRow: Record<string, string> = {};
    table.columns.forEach((col) => {
      newRow[col] = '';
    });
    updateSingleTable(tableIndex, {
      columns: table.columns,
      rows: [...table.rows, newRow],
    });
  };

  const handleRemoveRow = (tableIndex: number, rowIndex: number) => {
    const table = tables[tableIndex];
    if (table.rows.length <= 1) return;
    const newRows = table.rows.filter((_, index) => index !== rowIndex);
    updateSingleTable(tableIndex, {
      columns: table.columns,
      rows: newRows,
    });
  };

  const handleCellChange = (
    tableIndex: number,
    rowIndex: number,
    columnName: string,
    value: string,
  ) => {
    const table = tables[tableIndex];
    const newRows = [...table.rows];
    newRows[rowIndex] = { ...newRows[rowIndex], [columnName]: value };
    updateSingleTable(tableIndex, {
      columns: table.columns,
      rows: newRows,
    });
  };

  return (
    <div style={containerStyle}>
      <div style={sectionTitleStyle}>Table Configuration</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {tables.map((table, tableIndex) => (
          <div
            key={tableIndex}
            style={{
              border: '1px solid #E5E7EB',
              borderRadius: '6px',
              padding: '12px',
              backgroundColor: '#FFFFFF',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px',
              }}
            >
              <div style={{ fontSize: '13px', fontWeight: 600 }}>Table {tableIndex + 1}</div>
              <button
                type="button"
                style={secondaryButtonStyle}
                onClick={() => handleRemoveTable(tableIndex)}
                disabled={tables.length <= 1}
              >
                Remove Table
              </button>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>
                Columns
              </div>
              {table.columns.map((col, columnIndex) => (
                <div
                  key={columnIndex}
                  style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}
                >
                  <input
                    type="text"
                    style={{ ...inputStyle, flex: 1 }}
                    value={col}
                    onChange={(e) =>
                      handleColumnNameChange(tableIndex, columnIndex, e.target.value)
                    }
                    placeholder={`Column ${columnIndex + 1}`}
                  />
                  <button
                    type="button"
                    style={secondaryButtonStyle}
                    onClick={() => handleRemoveColumn(tableIndex, columnIndex)}
                    disabled={table.columns.length <= 1}
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                style={buttonStyle}
                onClick={() => handleAddColumn(tableIndex)}
              >
                + Add Column
              </button>
            </div>

            <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>
              Table Data
            </div>
            <table style={tableStyle}>
              <thead>
                <tr>
                  {table.columns.map((col, index) => (
                    <th key={index} style={thStyle}>
                      {col}
                    </th>
                  ))}
                  <th style={{ ...thStyle, width: '60px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {table.rows.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {table.columns.map((col, colIndex) => (
                      <td key={colIndex} style={tdStyle}>
                        <input
                          type="text"
                          style={inputStyle}
                          value={row[col] || ''}
                          onChange={(e) =>
                            handleCellChange(tableIndex, rowIndex, col, e.target.value)
                          }
                          placeholder={`Enter ${col}`}
                        />
                      </td>
                    ))}
                    <td style={tdStyle}>
                      <button
                        type="button"
                        style={{
                          padding: '4px 8px',
                          border: 'none',
                          backgroundColor: 'transparent',
                          color: '#E60012',
                          cursor: 'pointer',
                          fontSize: '16px',
                        }}
                        onClick={() => handleRemoveRow(tableIndex, rowIndex)}
                        disabled={table.rows.length <= 1}
                        title="Delete row"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button
              type="button"
              style={{ ...buttonStyle, marginTop: '12px' }}
              onClick={() => handleAddRow(tableIndex)}
            >
              + Add Row
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        style={{ ...buttonStyle, marginTop: '16px' }}
        onClick={handleAddTable}
      >
        + Add New Table
      </button>
    </div>
  );
};

export default TableSubsectionEditor;
