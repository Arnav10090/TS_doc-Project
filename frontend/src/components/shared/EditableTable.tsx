import React from 'react';

interface Column {
  key: string;
  label: string;
  locked?: boolean;
  multiline?: boolean;
}

interface EditableTableProps {
  columns: Column[];
  rows: Array<Record<string, any>>;
  onChange: (rows: Array<Record<string, any>>) => void;
  onAddRow?: () => void;
  onDeleteRow?: (index: number) => void;
  lockedRows?: number[];
}

const EditableTable: React.FC<EditableTableProps> = ({
  columns,
  rows,
  onChange,
  onAddRow,
  onDeleteRow,
  lockedRows = [],
}) => {
  const handleCellChange = (rowIndex: number, columnKey: string, value: any) => {
    const updatedRows = [...rows];
    updatedRows[rowIndex] = {
      ...updatedRows[rowIndex],
      [columnKey]: value,
    };
    onChange(updatedRows);
  };

  const isCellLocked = (rowIndex: number, column: Column) => {
    return lockedRows.includes(rowIndex) || column.locked;
  };

  return (
    <div className="editable-table">
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        border: '1px solid #E5E7EB',
      }}>
        <thead>
          <tr style={{ backgroundColor: '#F9FAFB' }}>
            {columns.map((column) => (
              <th
                key={column.key}
                style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderBottom: '2px solid #E5E7EB',
                  fontWeight: 600,
                  color: '#1A1A2E',
                }}
              >
                {column.label}
              </th>
            ))}
            {onDeleteRow && (
              <th style={{
                padding: '12px',
                width: '60px',
                borderBottom: '2px solid #E5E7EB',
              }}></th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {columns.map((column) => {
                const isLocked = isCellLocked(rowIndex, column);
                const cellValue = row[column.key] || '';

                return (
                  <td
                    key={column.key}
                    style={{
                      padding: '8px 12px',
                      borderBottom: '1px solid #E5E7EB',
                      backgroundColor: isLocked ? '#F9FAFB' : '#FFFFFF',
                    }}
                  >
                    {isLocked ? (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        color: '#6B7280',
                      }}>
                        <span>🔒</span>
                        <span>{cellValue}</span>
                      </div>
                    ) : column.multiline ? (
                      <textarea
                        value={cellValue}
                        onChange={(e) => handleCellChange(rowIndex, column.key, e.target.value)}
                        style={{
                          width: '100%',
                          padding: '6px',
                          border: '1px solid #E5E7EB',
                          borderRadius: '4px',
                          fontFamily: 'inherit',
                          fontSize: 'inherit',
                          minHeight: '60px',
                          resize: 'vertical',
                        }}
                      />
                    ) : (
                      <input
                        type="text"
                        value={cellValue}
                        onChange={(e) => handleCellChange(rowIndex, column.key, e.target.value)}
                        style={{
                          width: '100%',
                          padding: '6px',
                          border: '1px solid #E5E7EB',
                          borderRadius: '4px',
                          fontFamily: 'inherit',
                          fontSize: 'inherit',
                        }}
                      />
                    )}
                  </td>
                );
              })}
              {onDeleteRow && (
                <td style={{
                  padding: '8px 12px',
                  borderBottom: '1px solid #E5E7EB',
                  textAlign: 'center',
                }}>
                  {!lockedRows.includes(rowIndex) && (
                    <button
                      type="button"
                      onClick={() => onDeleteRow(rowIndex)}
                      style={{
                        padding: '4px 8px',
                        border: 'none',
                        backgroundColor: 'transparent',
                        color: '#E60012',
                        cursor: 'pointer',
                        fontSize: '18px',
                      }}
                      title="Delete row"
                    >
                      ✕
                    </button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {onAddRow && (
        <button
          type="button"
          onClick={onAddRow}
          style={{
            marginTop: '12px',
            padding: '8px 16px',
            border: '1px solid #E5E7EB',
            borderRadius: '4px',
            backgroundColor: '#FFFFFF',
            color: '#E60012',
            cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          + Add Row
        </button>
      )}
    </div>
  );
};

export default EditableTable;
