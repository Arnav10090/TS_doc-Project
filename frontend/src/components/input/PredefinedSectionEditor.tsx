import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSection } from '../../api/sections';
import { useAutoSave } from '../../hooks/useAutoSave';
import { useProjectStore } from '../../store/project.store';
import { EDIT_METADATA_KEY, stripEditMetadata } from '../../utils/editMetadata';
import { getSectionDraft } from '../../utils/sectionDraftStore';
import DiagramUpload from '../shared/DiagramUpload';
import RichTextEditor from '../shared/RichTextEditor';
import ExpandableTableFrame from '../shared/ExpandableTableFrame';
import SectionHeader from '../shared/SectionHeader';
import {
  PREDEFINED_SECTION_TITLES,
  getRequiredHint,
  isRequiredPath,
  mergeSectionContent,
} from '../sections/predefinedSectionContent';
import { validateAndFixHeaders } from '../preview/templateContent';

interface PredefinedSectionEditorProps {
  projectId: string;
  sectionKey: string;
  content?: Record<string, any>;
  onContentChange?: (content: Record<string, any>) => void;
}

type ImageType = 'architecture' | 'gantt_overall' | 'gantt_shutdown';

const IMAGE_SECTION_TYPES: Record<string, ImageType> = {
  system_config: 'architecture',
  overall_gantt: 'gantt_overall',
  shutdown_gantt: 'gantt_shutdown',
};

const HIDDEN_KEYS = new Set(['id', 'locked', 'locked_specs_line1', EDIT_METADATA_KEY]);
const HIDDEN_SECTION_FIELDS: Record<string, Set<string>> = {
  executive_summary: new Set(['client_logo_rows']),
  introduction: new Set(['paragraphs']),
};

const RICH_TEXT_KEYS = new Set([
  'para1',
  'text',
  'description',
  'system_objective',
  'existing_system',
  'integration',
  'tangible_benefits',
  'intangible_benefits',
]);

const LABEL_OVERRIDES: Record<string, string> = {
  para1: 'Project-specific summary paragraph',
  sw4_name: 'Third party software requirement',
  pm_days: 'Project manager days',
  dev_days: 'Developer days',
  comm_days: 'Commissioning days',
  total_man_days: 'Total man-days',
  matrix_rows: 'Responsibility matrix',
};

const clone = <T,>(value: T): T => {
  if (Array.isArray(value)) {
    return value.map((item) => clone(item)) as T;
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, clone(item)]),
    ) as T;
  }

  return value;
};

const isRecord = (value: unknown): value is Record<string, any> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const formatLabel = (key: string) =>
  LABEL_OVERRIDES[key] ||
  key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());

const getPathSegments = (path: string): string[] => path.split('.').filter(Boolean);

const setValueAtPath = (
  source: Record<string, any>,
  path: string,
  value: any,
): Record<string, any> => {
  const segments = getPathSegments(path);
  const next = clone(source);
  let cursor: any = next;

  segments.forEach((segment, index) => {
    if (index === segments.length - 1) {
      cursor[segment] = value;
      return;
    }

    cursor[segment] = Array.isArray(cursor[segment])
      ? [...cursor[segment]]
      : { ...(cursor[segment] || {}) };
    cursor = cursor[segment];
  });

  return next;
};

const getCellText = (value: unknown) => {
  if (value === undefined || value === null) {
    return '';
  }

  if (typeof value === 'string' || typeof value === 'number') {
    return String(value);
  }

  return JSON.stringify(value);
};

const getColumnsFromRows = (rows: Record<string, any>[]) => {
  const columns: string[] = [];

  rows.forEach((row) => {
    Object.keys(row).forEach((key) => {
      if (!HIDDEN_KEYS.has(key) && !columns.includes(key)) {
        columns.push(key);
      }
    });
  });

  return columns.length > 0 ? columns : ['Column 1'];
};

const fieldWrapStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

const inputBaseStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 10px',
  border: '1px solid #D1D5DB',
  borderRadius: '4px',
  fontFamily: 'inherit',
  fontSize: '14px',
  backgroundColor: '#FFFFFF',
};

const requiredInputStyle: React.CSSProperties = {
  borderColor: '#E60012',
  backgroundColor: '#FFF5F5',
  boxShadow: '0 0 0 1px rgba(230, 0, 18, 0.12)',
};

const sectionBlockStyle: React.CSSProperties = {
  padding: '16px',
  border: '1px solid #E5E7EB',
  borderRadius: '6px',
  backgroundColor: '#FFFFFF',
};

const buttonStyle: React.CSSProperties = {
  padding: '8px 12px',
  border: '1px solid #D1D5DB',
  borderRadius: '4px',
  backgroundColor: '#FFFFFF',
  color: '#1A1A2E',
  cursor: 'pointer',
  fontSize: '13px',
  fontWeight: 600,
  fontFamily: 'inherit',
};

const primaryButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  borderColor: '#E60012',
  color: '#E60012',
};

/**
 * =============================================================================
 * MATRIX EDITOR HEADER STYLES AND VALIDATION
 * =============================================================================
 * 
 * The following styles support the fixed header feature for the responsibility matrix
 * in the Division of Engineering section. This feature ensures visual consistency with
 * the document template and prevents accidental deletion of critical column headers.
 * 
 * **Header Validation Approach:**
 * 
 * Header integrity is maintained through a two-layer approach:
 * 
 * 1. **Data Load Validation (Primary Defense):**
 *    - When matrix data is loaded from saved state, the validateAndFixHeaders() function
 *      (defined in templateContent.ts) ensures the first two rows match the template.
 *    - If headers are missing or corrupted, they are automatically replaced with the
 *      correct template structure from RESPONSIBILITY_MATRIX_ROWS.
 *    - This happens in PredefinedSectionEditor when matrix_rows data is loaded.
 *    - Data rows (index > 1) are always preserved exactly as saved.
 * 
 * 2. **UI Protection (Secondary Defense):**
 *    - The MatrixEditor component with hasFixedHeaders={true} prevents header modification:
 *      a) Remove buttons only appear on data rows (index > 1)
 *      b) The removeRow() function checks rowIndex and rejects header row deletions
 *      c) Header cells are rendered with renderHeaderCell() which enforces colspan/rowspan
 *    - Users can still edit header text, but structure is preserved by the rendering logic.
 * 
 * **Why This Approach:**
 * - Validates once at load time rather than on every render (performance)
 * - Fixes corrupted data from older versions or manual edits
 * - Provides clear visual distinction between headers and data
 * - Maintains backward compatibility (other matrix editors unaffected)
 * 
 * @see validateAndFixHeaders in templateContent.ts - Header validation function
 * @see RESPONSIBILITY_MATRIX_ROWS in templateContent.ts - Header template structure
 * @see renderHeaderCell - Renders headers with correct HTML structure
 * @see renderDataCell - Renders data rows with group detection
 */

const headerCellStyle: React.CSSProperties = {
  border: '1px solid #E5E7EB',
  padding: '6px',
  backgroundColor: '#2E75B5', // Blue background
  color: '#FFFFFF', // White text
  fontWeight: 'bold',
  textAlign: 'center',
  verticalAlign: 'middle',
};

const headerInputStyle: React.CSSProperties = {
  ...inputBaseStyle,
  backgroundColor: 'transparent',
  color: '#FFFFFF',
  fontWeight: 'bold',
  textAlign: 'center',
  border: 'none',
};

const dataCellStyle: React.CSSProperties = {
  border: '1px solid #E5E7EB',
  padding: '6px',
  backgroundColor: '#FFFFFF',
  verticalAlign: 'top',
};

const groupRowCellStyle: React.CSSProperties = {
  ...dataCellStyle,
  backgroundColor: '#F3F3F3', // Light gray for group rows
  fontWeight: 'bold',
};

const actionColumnStyle: React.CSSProperties = {
  border: '1px solid #E5E7EB',
  padding: '6px',
  width: '100px', // Fixed width
  minWidth: '100px',
  textAlign: 'center',
  verticalAlign: 'top',
};

interface FieldLabelProps {
  sectionKey: string;
  path: string;
  label: string;
}

const FieldLabel: React.FC<FieldLabelProps> = ({ sectionKey, path, label }) => {
  const requiredHint = getRequiredHint(sectionKey, path);

  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '13px',
        fontWeight: 700,
        color: requiredHint ? '#B91C1C' : '#1A1A2E',
      }}
    >
      <span>{label}</span>
      {requiredHint && (
        <span
          style={{
            padding: '2px 6px',
            borderRadius: '999px',
            backgroundColor: '#FEE2E2',
            color: '#B91C1C',
            fontSize: '11px',
            fontWeight: 700,
          }}
        >
          {requiredHint}
        </span>
      )}
    </label>
  );
};

interface StringFieldProps {
  sectionKey: string;
  path: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}

const StringField: React.FC<StringFieldProps> = ({
  sectionKey,
  path,
  label,
  value,
  onChange,
}) => {
  const key = path.split('.').pop() || path;
  const required = isRequiredPath(sectionKey, path);
  const isLongText =
    value.length > 100 ||
    key.includes('paragraph') ||
    key.includes('notice') ||
    key.includes('note') ||
    key.includes('intro') ||
    key.includes('criteria') ||
    key.includes('copyright');
  const isRichText = RICH_TEXT_KEYS.has(key) && !key.includes('intro');

  return (
    <div style={fieldWrapStyle}>
      <FieldLabel sectionKey={sectionKey} path={path} label={label} />
      {isRichText ? (
        <div
          style={{
            border: required ? '2px solid #E60012' : '1px solid #E5E7EB',
            borderRadius: '6px',
            backgroundColor: required ? '#FFF5F5' : '#FFFFFF',
          }}
        >
          <RichTextEditor value={value} onChange={onChange} placeholder={`Enter ${label.toLowerCase()}`} />
        </div>
      ) : isLongText ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={Math.min(8, Math.max(3, Math.ceil(value.length / 90)))}
          style={{
            ...inputBaseStyle,
            resize: 'vertical',
            lineHeight: 1.5,
            ...(required ? requiredInputStyle : {}),
          }}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          style={{
            ...inputBaseStyle,
            ...(required ? requiredInputStyle : {}),
          }}
        />
      )}
    </div>
  );
};

interface StringListEditorProps {
  sectionKey: string;
  path: string;
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
}

const StringListEditor: React.FC<StringListEditorProps> = ({
  sectionKey,
  path,
  label,
  items,
  onChange,
}) => {
  const updateItem = (index: number, value: string) => {
    onChange(items.map((item, itemIndex) => (itemIndex === index ? value : item)));
  };

  return (
    <div style={sectionBlockStyle}>
      <FieldLabel sectionKey={sectionKey} path={path} label={label} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
        {items.map((item, index) => (
          <div key={index} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
            <textarea
              value={item}
              onChange={(event) => updateItem(index, event.target.value)}
              rows={Math.min(5, Math.max(2, Math.ceil(item.length / 90)))}
              style={{
                ...inputBaseStyle,
                resize: 'vertical',
                lineHeight: 1.5,
                ...(isRequiredPath(sectionKey, path) ? requiredInputStyle : {}),
              }}
            />
            <button
              type="button"
              onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))}
              style={buttonStyle}
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => onChange([...items, ''])}
          style={{ ...primaryButtonStyle, alignSelf: 'flex-start' }}
        >
          + Add Item
        </button>
      </div>
    </div>
  );
};

/**
 * Props for the MatrixEditor component.
 * Renders an editable table matrix with optional fixed header rows.
 */
interface MatrixEditorProps {
  /** Display label for the matrix editor */
  label: string;
  
  /** Matrix data as 2D string array (rows x columns) */
  rows: string[][];
  
  /** Callback when matrix data changes */
  onChange: (rows: string[][]) => void;
  
  /**
   * Enables fixed header rows with special layout (Division of Engineering feature).
   * 
   * When enabled:
   * - First two rows are treated as non-removable headers
   * - Row 0 structure: "No." (rowspan=2), "ITEM" (rowspan=2), "Responsibility" (colspan=6)
   * - Row 1 structure: Six sub-header cells (BD, BE, DD, SU, ER, COM) under "Responsibility"
   * - Headers styled with blue background (#2E75B5) and white text
   * - Remove buttons only appear on data rows (index > 1)
   * - Group rows (starting with "(") have light gray background (#F3F3F3)
   * 
   * When disabled (default):
   * - All rows treated equally with standard rendering
   * - Remove button appears on all rows
   * - No special header styling or layout
   * 
   * @default false (maintains backward compatibility)
   * @see renderHeaderCell - Handles header cell rendering with colspan/rowspan
   * @see renderDataCell - Handles data cell rendering with group detection
   */
  hasFixedHeaders?: boolean;
}

/**
 * Renders a header cell with proper colspan/rowspan attributes for the responsibility matrix.
 * This function implements the fixed header layout matching the document template structure.
 * 
 * **Header Structure:**
 * - Row 0, Cell 0: "No." (rowspan=2) - Row number column spanning both header rows
 * - Row 0, Cell 1: "ITEM" (rowspan=2) - Item description column spanning both header rows
 * - Row 0, Cell 2: "Responsibility" (colspan=6) - Main responsibility heading spanning 6 sub-columns
 * - Row 1, Cells 2-7: "BD", "BE", "DD", "SU", "ER", "COM" - Responsibility category sub-headers
 * 
 * **Styling:**
 * - Blue background (#2E75B5) with white text (#FFFFFF)
 * - Bold font weight for emphasis
 * - Centered text alignment
 * 
 * **Validation Approach:**
 * Header validation is enforced at data load time via the validateAndFixHeaders utility function
 * in templateContent.ts. This ensures saved data always has correct header structure, even if
 * previously corrupted. The renderHeaderCell function focuses solely on correct HTML rendering.
 * 
 * @param rowIndex - The row index (must be 0 or 1 for headers)
 * @param cellIndex - The cell index within the row (0-7 for 8-column matrix)
 * @param value - The cell value to display in the input field
 * @param updateCell - Callback function to update cell value: (rowIndex, cellIndex, newValue) => void
 * @returns JSX element for the table cell, or null if the cell position is covered by a colspan/rowspan
 * 
 * @example
 * // Row 0, Cell 0 renders:
 * // <td rowSpan={2}><input value="No." /></td>
 * 
 * @example
 * // Row 0, Cell 2 renders:
 * // <td colSpan={6}><input value="Responsibility" /></td>
 * 
 * @example
 * // Row 1, Cell 0 returns null (covered by Row 0's rowspan)
 * 
 * @see validateAndFixHeaders in templateContent.ts - Ensures headers match template on data load
 * @see RESPONSIBILITY_MATRIX_ROWS in templateContent.ts - Defines the header template structure
 */
const renderHeaderCell = (
  rowIndex: number,
  cellIndex: number,
  value: string,
  updateCell: (rowIndex: number, cellIndex: number, value: string) => void
): React.ReactNode | null => {
  if (rowIndex === 0) {
    // First header row: No., ITEM, Responsibility
    if (cellIndex === 0) {
      return (
        <td
          key={`${rowIndex}-${cellIndex}`}
          rowSpan={2}
          style={headerCellStyle}
        >
          <input
            type="text"
            value={value}
            onChange={(e) => updateCell(rowIndex, cellIndex, e.target.value)}
            style={headerInputStyle}
          />
        </td>
      );
    }
    if (cellIndex === 1) {
      return (
        <td
          key={`${rowIndex}-${cellIndex}`}
          rowSpan={2}
          style={headerCellStyle}
        >
          <input
            type="text"
            value={value}
            onChange={(e) => updateCell(rowIndex, cellIndex, e.target.value)}
            style={headerInputStyle}
          />
        </td>
      );
    }
    if (cellIndex === 2) {
      return (
        <td
          key={`${rowIndex}-${cellIndex}`}
          colSpan={6}
          style={headerCellStyle}
        >
          <input
            type="text"
            value={value}
            onChange={(e) => updateCell(rowIndex, cellIndex, e.target.value)}
            style={headerInputStyle}
          />
        </td>
      );
    }
    // Skip remaining cells in first row (they're covered by colspan)
    return null;
  }

  if (rowIndex === 1) {
    // Second header row: skip first two columns (covered by rowspan)
    if (cellIndex < 2) {
      return null;
    }
    // Render BD, BE, DD, SU, ER, COM (cells 2-7)
    return (
      <td
        key={`${rowIndex}-${cellIndex}`}
        style={headerCellStyle}
      >
        <input
          type="text"
          value={value}
          onChange={(e) => updateCell(rowIndex, cellIndex, e.target.value)}
          style={headerInputStyle}
        />
      </td>
    );
  }

  return null; // Not a header cell
};

/**
 * Renders a standard data cell for rows beyond the fixed header rows.
 * Automatically detects and styles group rows differently from regular data rows.
 * 
 * **Group Row Detection:**
 * A row is identified as a "group row" if its first cell (index 0) starts with an opening
 * parenthesis "(". Group rows typically represent category headers within the data, such as:
 * - "(1) Services"
 * - "(2) Equipment Supply"
 * 
 * **Styling:**
 * - Group rows: Light gray background (#F3F3F3) with bold text
 * - Regular rows: White background (#FFFFFF) with normal font weight
 * - All rows: Consistent border styling (1px solid #E5E7EB)
 * 
 * **Cell Structure:**
 * Data cells are rendered without colspan or rowspan attributes, maintaining a simple
 * 8-column layout (or however many columns are defined in the matrix).
 * 
 * @param rowIndex - The row index (must be > 1 for data rows, as 0-1 are headers)
 * @param cellIndex - The cell index within the row (0 to columnCount-1)
 * @param value - The cell value to display in the input field
 * @param rowValues - Complete array of values for the current row (used for group detection)
 * @param updateCell - Callback function to update cell value: (rowIndex, cellIndex, newValue) => void
 * @returns JSX element for the table cell with appropriate styling
 * 
 * @example
 * // Group row (first cell is "(1)"):
 * // <td style={{backgroundColor: '#F3F3F3', fontWeight: 'bold'}}>
 * //   <input value="(1)" />
 * // </td>
 * 
 * @example
 * // Regular data row (first cell is "-1"):
 * // <td style={{backgroundColor: '#FFFFFF'}}>
 * //   <input value="-1" />
 * // </td>
 */
const renderDataCell = (
  rowIndex: number,
  cellIndex: number,
  value: string,
  rowValues: string[],
  updateCell: (rowIndex: number, cellIndex: number, value: string) => void
): React.ReactNode => {
  // Detect if this is a group row (first cell starts with "(")
  const isGroupRow = rowValues.length > 0 && rowValues[0].trim().startsWith('(');
  const cellStyle = isGroupRow ? groupRowCellStyle : dataCellStyle;

  // Standard data cell (no colspan or rowspan)
  return (
    <td
      key={`${rowIndex}-${cellIndex}`}
      style={cellStyle}
    >
      <input
        type="text"
        value={value}
        onChange={(e) => updateCell(rowIndex, cellIndex, e.target.value)}
        style={inputBaseStyle}
      />
    </td>
  );
};

export const MatrixEditor: React.FC<MatrixEditorProps> = ({ label, rows, onChange, hasFixedHeaders = false }) => {
  // Calculate the maximum column count across all rows
  const columnCount = Math.max(1, ...rows.map((row) => row.length));

  // Normalize rows to ensure all have the same number of columns (pad with empty strings if needed)
  const normalizedRows =
    rows.length > 0
      ? rows.map((row) => Array.from({ length: columnCount }, (_, index) => row[index] || ''))
      : [['']];

  /**
   * Updates a single cell value in the matrix.
   * Creates a new matrix array with the updated value, maintaining immutability.
   */
  const updateCell = (rowIndex: number, columnIndex: number, value: string) => {
    onChange(
      normalizedRows.map((row, currentRowIndex) =>
        currentRowIndex === rowIndex
          ? row.map((cell, currentColumnIndex) =>
              currentColumnIndex === columnIndex ? value : cell,
            )
          : row,
      ),
    );
  };

  /**
   * Removes a row from the matrix with automatic header protection.
   * 
   * **Header Protection:**
   * When hasFixedHeaders is enabled, rows 0 and 1 are protected from deletion.
   * This ensures the header structure remains intact even if the function is called
   * with a header row index (e.g., through programmatic error or UI bypass).
   * 
   * **Behavior:**
   * - If hasFixedHeaders=true and rowIndex <= 1: Logs warning and returns without changes
   * - Otherwise: Filters out the row at the specified index
   * 
   * @param rowIndex - The index of the row to remove
   */
  const removeRow = (rowIndex: number) => {
    if (hasFixedHeaders && rowIndex <= 1) {
      // Safety check: prevent removal of header rows
      console.warn(`Cannot remove header row at index ${rowIndex}`);
      return;
    }
    
    // Filter out the row at the specified index, automatically protecting headers due to conditional rendering
    onChange(normalizedRows.filter((_, index) => index !== rowIndex));
  };

  return (
    <div style={sectionBlockStyle}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          marginBottom: '12px',
        }}
      >
        <div style={{ fontSize: '13px', fontWeight: 700 }}>{label}</div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => onChange([...normalizedRows, Array.from({ length: columnCount }, () => '')])}
            style={primaryButtonStyle}
          >
            + Row
          </button>
          <button
            type="button"
            onClick={() => onChange(normalizedRows.map((row) => [...row, '']))}
            style={primaryButtonStyle}
          >
            + Column
          </button>
        </div>
      </div>
      <ExpandableTableFrame
        title={label}
        renderTable={() => (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            {normalizedRows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {hasFixedHeaders && rowIndex <= 1 ? (
                  // === FIXED HEADER RENDERING (Rows 0-1) ===
                  // Render header rows with special colspan/rowspan layout
                  // Row 0: "No." (rowspan=2), "ITEM" (rowspan=2), "Responsibility" (colspan=6), "Actions" (rowspan=2)
                  // Row 1: (skip first 2 cells due to rowspan), then BD, BE, DD, SU, ER, COM sub-headers
                  <>
                    {row.map((cell, columnIndex) =>
                      renderHeaderCell(rowIndex, columnIndex, cell, updateCell)
                    ).filter(cell => cell !== null)}
                    {rowIndex === 0 && (
                      // Actions column header appears only in Row 0 with rowspan=2
                      <td
                        key="actions-header"
                        rowSpan={2}
                        style={headerCellStyle}
                      >
                        Actions
                      </td>
                    )}
                  </>
                ) : hasFixedHeaders && rowIndex > 1 ? (
                  // === DATA ROW RENDERING (Rows 2+) ===
                  // Render data rows with standard cells (no colspan/rowspan)
                  // Includes automatic group row detection and Remove button
                  <>
                    {row.map((cell, columnIndex) =>
                      renderDataCell(rowIndex, columnIndex, cell, row, updateCell)
                    )}
                    <td style={actionColumnStyle}>
                      <button
                        type="button"
                        onClick={() => removeRow(rowIndex)}
                        style={buttonStyle}
                      >
                        Remove
                      </button>
                    </td>
                  </>
                ) : (
                  // === LEGACY RENDERING (hasFixedHeaders=false) ===
                  // Original rendering logic for backward compatibility
                  // All rows treated equally with Remove button on every row
                  <>
                    {row.map((cell, columnIndex) => (
                      <td key={columnIndex} style={{ border: '1px solid #E5E7EB', padding: '6px' }}>
                        <input
                          type="text"
                          value={cell}
                          onChange={(event) => updateCell(rowIndex, columnIndex, event.target.value)}
                          style={inputBaseStyle}
                        />
                      </td>
                    ))}
                    <td style={{ border: '1px solid #E5E7EB', padding: '6px', width: '1%' }}>
                      <button
                        type="button"
                        onClick={() => removeRow(rowIndex)}
                        style={buttonStyle}
                      >
                        Remove
                      </button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        )}
      />
      {columnCount > 1 && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
          {Array.from({ length: columnCount }, (_, columnIndex) => (
            <button
              key={columnIndex}
              type="button"
              onClick={() =>
                onChange(normalizedRows.map((row) => row.filter((_, index) => index !== columnIndex)))
              }
              style={buttonStyle}
            >
              Remove Column {columnIndex + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

interface RecordTableEditorProps {
  sectionKey: string;
  path: string;
  label: string;
  rows: Record<string, any>[];
  onChange: (rows: Record<string, any>[]) => void;
}

const RecordTableEditor: React.FC<RecordTableEditorProps> = ({
  sectionKey,
  path,
  label,
  rows,
  onChange,
}) => {
  const columns = getColumnsFromRows(rows);
  const normalizedRows = rows.length > 0 ? rows : [Object.fromEntries(columns.map((column) => [column, '']))];

  const updateCell = (rowIndex: number, column: string, value: string) => {
    onChange(
      normalizedRows.map((row, currentRowIndex) =>
        currentRowIndex === rowIndex ? { ...row, [column]: value } : row,
      ),
    );
  };

  const addRow = () => {
    onChange([...normalizedRows, Object.fromEntries(columns.map((column) => [column, '']))]);
  };

  const addColumn = () => {
    const nextColumn = `column_${columns.length + 1}`;
    onChange(normalizedRows.map((row) => ({ ...row, [nextColumn]: '' })));
  };

  const removeColumn = (column: string) => {
    onChange(
      normalizedRows.map((row) => {
        const { [column]: _removed, ...rest } = row;
        return rest;
      }),
    );
  };

  const renameColumn = (oldColumn: string, newColumn: string) => {
    if (!newColumn.trim() || oldColumn === newColumn) {
      return;
    }

    onChange(
      normalizedRows.map((row) => {
        const { [oldColumn]: value, ...rest } = row;
        return { ...rest, [newColumn]: value ?? '' };
      }),
    );
  };

  return (
    <div style={sectionBlockStyle}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          marginBottom: '12px',
        }}
      >
        <FieldLabel sectionKey={sectionKey} path={path} label={label} />
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button type="button" onClick={addRow} style={primaryButtonStyle}>
            + Row
          </button>
          <button type="button" onClick={addColumn} style={primaryButtonStyle}>
            + Column
          </button>
        </div>
      </div>
      <ExpandableTableFrame
        title={label}
        renderTable={() => (
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '520px' }}>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column} style={{ border: '1px solid #E5E7EB', padding: '6px', background: '#F9FAFB' }}>
                  <input
                    type="text"
                    value={column}
                    onChange={(event) => renameColumn(column, event.target.value)}
                    style={{
                      ...inputBaseStyle,
                      fontWeight: 700,
                      ...(isRequiredPath(sectionKey, `${path}.${column}`) ? requiredInputStyle : {}),
                    }}
                    title="Edit column header"
                  />
                  {columns.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeColumn(column)}
                      style={{ ...buttonStyle, marginTop: '6px', width: '100%' }}
                    >
                      Remove
                    </button>
                  )}
                </th>
              ))}
              <th style={{ border: '1px solid #E5E7EB', padding: '6px', background: '#F9FAFB', width: '1%' }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {normalizedRows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {columns.map((column) => {
                  const cellPath = `${path}.${column}`;
                  const required = isRequiredPath(sectionKey, cellPath);
                  const text = getCellText(row[column]);

                  return (
                    <td key={column} style={{ border: '1px solid #E5E7EB', padding: '6px', verticalAlign: 'top' }}>
                      {text.length > 80 || column.includes('description') || column.includes('details') ? (
                        <textarea
                          value={text}
                          onChange={(event) => updateCell(rowIndex, column, event.target.value)}
                          rows={Math.min(5, Math.max(2, Math.ceil(text.length / 80)))}
                          style={{
                            ...inputBaseStyle,
                            resize: 'vertical',
                            ...(required ? requiredInputStyle : {}),
                          }}
                        />
                      ) : (
                        <input
                          type="text"
                          value={text}
                          onChange={(event) => updateCell(rowIndex, column, event.target.value)}
                          style={{
                            ...inputBaseStyle,
                            ...(required ? requiredInputStyle : {}),
                          }}
                        />
                      )}
                    </td>
                  );
                })}
                <td style={{ border: '1px solid #E5E7EB', padding: '6px', verticalAlign: 'top' }}>
                  <button
                    type="button"
                    onClick={() => onChange(normalizedRows.filter((_, index) => index !== rowIndex))}
                    style={buttonStyle}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        )}
      />
    </div>
  );
};

interface SectionListEditorProps {
  sectionKey: string;
  path: string;
  sections: Array<{ title: string; paragraphs: string[] }>;
  onChange: (sections: Array<{ title: string; paragraphs: string[] }>) => void;
}

const SectionListEditor: React.FC<SectionListEditorProps> = ({
  sectionKey,
  path,
  sections,
  onChange,
}) => (
  <div style={sectionBlockStyle}>
    <FieldLabel sectionKey={sectionKey} path={path} label="Subsections" />
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '12px' }}>
      {sections.map((section, index) => (
        <div
          key={index}
          style={{
            padding: '12px',
            border: '1px solid #E5E7EB',
            borderRadius: '6px',
            backgroundColor: '#F9FAFB',
          }}
        >
          <StringField
            sectionKey={sectionKey}
            path={`${path}.${index}.title`}
            label="Subsection Heading"
            value={section.title || ''}
            onChange={(value) =>
              onChange(
                sections.map((item, itemIndex) =>
                  itemIndex === index ? { ...item, title: value } : item,
                ),
              )
            }
          />
          <div style={{ marginTop: '12px' }}>
            <StringListEditor
              sectionKey={sectionKey}
              path={`${path}.${index}.paragraphs`}
              label="Paragraphs"
              items={section.paragraphs || []}
              onChange={(paragraphs) =>
                onChange(
                  sections.map((item, itemIndex) =>
                    itemIndex === index ? { ...item, paragraphs } : item,
                  ),
                )
              }
            />
          </div>
          <button
            type="button"
            onClick={() => onChange(sections.filter((_, itemIndex) => itemIndex !== index))}
            style={{ ...buttonStyle, marginTop: '12px' }}
          >
            Remove Subsection
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...sections, { title: '', paragraphs: [''] }])}
        style={{ ...primaryButtonStyle, alignSelf: 'flex-start' }}
      >
        + Add Subsection
      </button>
    </div>
  </div>
);

const PredefinedSectionEditor: React.FC<PredefinedSectionEditorProps> = ({
  projectId,
  sectionKey,
  content: incomingContent,
  onContentChange,
}) => {
  const navigate = useNavigate();
  const { solutionName, solutionFullName, clientName, clientLocation } = useProjectStore();
  const defaultContext = useMemo(
    () => ({ solutionName, solutionFullName, clientName, clientLocation }),
    [clientLocation, clientName, solutionFullName, solutionName],
  );
  const [content, setContent] = useState<Record<string, any>>(() =>
    mergeSectionContent(sectionKey, stripEditMetadata(incomingContent), defaultContext),
  );
  const [loading, setLoading] = useState(true);
  const { save, status } = useAutoSave(projectId, sectionKey, 800);

  useEffect(() => {
    let cancelled = false;

    const loadSection = async () => {
      setLoading(true);
      try {
        const section = await getSection(projectId, sectionKey);
        if (cancelled) {
          return;
        }

        const nextContent = mergeSectionContent(
          sectionKey,
          stripEditMetadata(section.content),
          defaultContext,
        );
        setContent(nextContent);
      } catch (error) {
        console.error(`Error loading ${sectionKey} section:`, error);
        if (!cancelled) {
          setContent(mergeSectionContent(sectionKey, stripEditMetadata(incomingContent), defaultContext));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadSection();

    return () => {
      cancelled = true;
    };
  }, [defaultContext, projectId, sectionKey]);

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!incomingContent) {
      return;
    }

    const merged = mergeSectionContent(sectionKey, stripEditMetadata(incomingContent), defaultContext);
    setContent(merged);
  }, [defaultContext, incomingContent, loading, sectionKey]);

  // Poll draft store for updates (handles AI imports and ensures sync)
  useEffect(() => {
    if (sectionKey !== 'introduction') {
      return; // Only poll for introduction section where the bug occurs
    }

    const interval = setInterval(() => {
      const draft = getSectionDraft(projectId, sectionKey);
      if (draft && (draft.tender_reference || draft.tender_date)) {
        setContent((prev) => {
          // Only update if values actually changed to avoid unnecessary re-renders
          if (
            prev.tender_reference !== draft.tender_reference ||
            prev.tender_date !== draft.tender_date
          ) {
            const merged = mergeSectionContent(sectionKey, draft, defaultContext);
            return merged;
          }
          return prev;
        });
      }
    }, 100); // Poll every 100ms

    return () => clearInterval(interval);
  }, [defaultContext, projectId, sectionKey]);

  const updateContent = (nextContent: Record<string, any>) => {
    setContent(nextContent);
    save(nextContent);
    onContentChange?.(nextContent);
  };

  const updatePath = (path: string, value: any) => {
    updateContent(setValueAtPath(content, path, value));
  };

  const renderValue = (key: string, value: any, path: string): React.ReactNode => {
    if (HIDDEN_KEYS.has(key) || HIDDEN_SECTION_FIELDS[sectionKey]?.has(key)) {
      return null;
    }

    if (Array.isArray(value)) {
      const label = formatLabel(key);

      if (value.every((item) => Array.isArray(item))) {
        // Apply header validation for matrix_rows
        const matrixValue = key === 'matrix_rows' ? validateAndFixHeaders(value as string[][]) : value;
        
        return (
          <MatrixEditor
            key={path}
            label={label}
            rows={matrixValue as string[][]}
            onChange={(rows) => {
              // Apply validation on change to maintain header integrity
              const validatedRows = key === 'matrix_rows' ? validateAndFixHeaders(rows) : rows;
              updatePath(path, validatedRows);
            }}
            hasFixedHeaders={sectionKey === 'division_of_eng' && key === 'matrix_rows'}
          />
        );
      }

      if (value.every((item) => typeof item === 'string')) {
        return (
          <StringListEditor
            key={path}
            sectionKey={sectionKey}
            path={path}
            label={label}
            items={value as string[]}
            onChange={(items) => updatePath(path, items)}
          />
        );
      }

      if (
        value.every(
          (item) =>
            isRecord(item) &&
            'title' in item &&
            Array.isArray((item as Record<string, any>).paragraphs),
        )
      ) {
        return (
          <SectionListEditor
            key={path}
            sectionKey={sectionKey}
            path={path}
            sections={value as Array<{ title: string; paragraphs: string[] }>}
            onChange={(sections) => updatePath(path, sections)}
          />
        );
      }

      if (value.every((item) => isRecord(item))) {
        return (
          <RecordTableEditor
            key={path}
            sectionKey={sectionKey}
            path={path}
            label={label}
            rows={value as Record<string, any>[]}
            onChange={(rows) => updatePath(path, rows)}
          />
        );
      }
    }

    if (isRecord(value)) {
      return (
        <div key={path} style={sectionBlockStyle}>
          <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '12px' }}>
            {formatLabel(key)}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {Object.entries(value).map(([childKey, childValue]) =>
              renderValue(childKey, childValue, `${path}.${childKey}`),
            )}
          </div>
        </div>
      );
    }

    return (
      <StringField
        key={path}
        sectionKey={sectionKey}
        path={path}
        label={formatLabel(key)}
        value={getCellText(value)}
        onChange={(nextValue) => updatePath(path, nextValue)}
      />
    );
  };

  const imageType = IMAGE_SECTION_TYPES[sectionKey];

  if (loading) {
    return <div style={{ padding: '24px' }}>Loading...</div>;
  }

  return (
    <div
      style={{
        padding: '24px',
        backgroundColor: '#FFFFFF',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      }}
    >
      <SectionHeader
        projectId={projectId}
        sectionKey={sectionKey}
        title={PREDEFINED_SECTION_TITLES[sectionKey] || 'Section'}
        showDeleteButton={sectionKey !== 'cover'}
        onDelete={() => navigate(`/editor/${projectId}#cover`)}
        status={status}
      />

      <div
        style={{
          marginBottom: '16px',
          padding: '12px',
          backgroundColor: '#F8FAFC',
          border: '1px solid #E5E7EB',
          borderRadius: '6px',
          color: '#374151',
          fontSize: '13px',
          lineHeight: 1.5,
        }}
      >
        Every field below is editable. Required fields are highlighted in red only to show validation priority.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {Object.entries(content).map(([key, value]) => renderValue(key, value, key))}
      </div>

      {imageType && (
        <div style={{ ...sectionBlockStyle, marginTop: '18px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '8px' }}>
            Image
          </div>
          <DiagramUpload projectId={projectId} imageType={imageType} />
        </div>
      )}
    </div>
  );
};

export default PredefinedSectionEditor;
