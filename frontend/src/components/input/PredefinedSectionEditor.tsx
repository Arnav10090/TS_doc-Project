import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSection } from '../../api/sections';
import { useAutoSave } from '../../hooks/useAutoSave';
import { useProjectStore } from '../../store/project.store';
import { EDIT_METADATA_KEY, stripEditMetadata } from '../../utils/editMetadata';
import DiagramUpload from '../shared/DiagramUpload';
import RichTextEditor from '../shared/RichTextEditor';
import SectionHeader from '../shared/SectionHeader';
import {
  PREDEFINED_SECTION_TITLES,
  getRequiredHint,
  isRequiredPath,
  mergeSectionContent,
} from '../sections/predefinedSectionContent';

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
  client_logo_rows: 'Client logo table',
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

interface MatrixEditorProps {
  label: string;
  rows: string[][];
  onChange: (rows: string[][]) => void;
}

const MatrixEditor: React.FC<MatrixEditorProps> = ({ label, rows, onChange }) => {
  const columnCount = Math.max(1, ...rows.map((row) => row.length));

  const normalizedRows =
    rows.length > 0
      ? rows.map((row) => Array.from({ length: columnCount }, (_, index) => row[index] || ''))
      : [['']];

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
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            {normalizedRows.map((row, rowIndex) => (
              <tr key={rowIndex}>
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
      </div>
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
      <div style={{ overflowX: 'auto' }}>
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
      </div>
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
    if (loading || !incomingContent) {
      return;
    }

    setContent(mergeSectionContent(sectionKey, stripEditMetadata(incomingContent), defaultContext));
  }, [defaultContext, incomingContent, loading, sectionKey]);

  const updateContent = (nextContent: Record<string, any>) => {
    setContent(nextContent);
    save(nextContent);
    onContentChange?.(nextContent);
  };

  const updatePath = (path: string, value: any) => {
    updateContent(setValueAtPath(content, path, value));
  };

  const renderValue = (key: string, value: any, path: string): React.ReactNode => {
    if (HIDDEN_KEYS.has(key)) {
      return null;
    }

    if (Array.isArray(value)) {
      const label = formatLabel(key);

      if (value.every((item) => Array.isArray(item))) {
        return (
          <MatrixEditor
            key={path}
            label={label}
            rows={value as string[][]}
            onChange={(rows) => updatePath(path, rows)}
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
