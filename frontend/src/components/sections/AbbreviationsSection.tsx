import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSection } from '../../api/sections';
import { useAutoSave } from '../../hooks/useAutoSave';
import { useProjectStore } from '../../store/project.store';
import SectionHeader from '../shared/SectionHeader';
import EditableTable from '../shared/EditableTable';
import type { AbbreviationsContent, AbbreviationRow } from '../../types';

interface AbbreviationsSectionProps {
  projectId: string;
}

// Default 14 rows as per Requirement 53
const DEFAULT_ROWS: AbbreviationRow[] = [
  { sr_no: 1, abbreviation: 'JSPL', description: 'Jindal Steel & Power Ltd.', locked: true },
  { sr_no: 2, abbreviation: 'HIL', description: 'Hitachi India Pvt. Ltd.', locked: true },
  { sr_no: 3, abbreviation: 'SV', description: 'Supervisor', locked: true },
  { sr_no: 4, abbreviation: 'HMI', description: 'Human Machine Interface', locked: true },
  { sr_no: 5, abbreviation: 'PLC', description: 'Programmable Logic Controller', locked: true },
  { sr_no: 6, abbreviation: 'EOT', description: 'Electric Overhead Travelling Crane', locked: true },
  { sr_no: 7, abbreviation: 'HHT', description: 'Hand-held Terminal', locked: true },
  { sr_no: 8, abbreviation: 'LT', description: 'Long Travel of EOT Crane', locked: true },
  { sr_no: 9, abbreviation: 'CT', description: 'Cross Travel of EOT Crane', locked: true },
  { sr_no: 10, abbreviation: 'L1', description: 'Level-1 system', locked: true },
  { sr_no: 11, abbreviation: 'L2', description: 'Level-2 system', locked: true },
  { sr_no: 12, abbreviation: 'L3', description: 'Level-3 system', locked: true },
  { sr_no: 13, abbreviation: '', description: 'Plate Mill Yard Management System', locked: false },
  { sr_no: 14, abbreviation: 'HTC', description: 'Heat Treatment Complex', locked: true },
];

const AbbreviationsSection: React.FC<AbbreviationsSectionProps> = ({ projectId }) => {
  const navigate = useNavigate();
  const [content, setContent] = useState<AbbreviationsContent>({
    rows: DEFAULT_ROWS,
  });
  const [loading, setLoading] = useState(true);
  const { save, status } = useAutoSave(projectId, 'abbreviations', 800);
  const { solutionName } = useProjectStore();

  useEffect(() => {
    const loadSection = async () => {
      try {
        const data = await getSection(projectId, 'abbreviations');
        if (data.content && data.content.rows && data.content.rows.length > 0) {
          setContent(data.content as AbbreviationsContent);
        }
      } catch (error) {
        console.error('Error loading abbreviations:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSection();
  }, [projectId]);

  // Auto-fill row 13 abbreviation from solution abbreviation in store
  useEffect(() => {
    if (solutionName && content.rows[12]) {
      // Only update if row 13 abbreviation is empty
      if (!content.rows[12].abbreviation) {
        const updatedRows = [...content.rows];
        // Extract abbreviation from solution name (first letters of each word)
        const abbreviation = solutionName
          .split(' ')
          .map(word => word.charAt(0).toUpperCase())
          .join('');
        
        updatedRows[12] = {
          ...updatedRows[12],
          abbreviation: abbreviation,
        };
        
        const updated = { rows: updatedRows };
        setContent(updated);
        save(updated);
      }
    }
  }, [solutionName]);

  const handleRowsChange = (rows: Array<Record<string, any>>) => {
    const updated = { rows: rows as AbbreviationRow[] };
    setContent(updated);
    save(updated);
  };

  const handleAddRow = () => {
    const newRow: AbbreviationRow = {
      sr_no: content.rows.length + 1,
      abbreviation: '',
      description: '',
      locked: false,
    };
    const updated = { rows: [...content.rows, newRow] };
    setContent(updated);
    save(updated);
  };

  const handleDeleteRow = (index: number) => {
    // Only allow deletion of user-added rows (index >= 14)
    if (index < 14) return;
    
    const updatedRows = content.rows.filter((_, i) => i !== index);
    // Renumber rows
    const renumbered = updatedRows.map((row, i) => ({
      ...row,
      sr_no: i + 1,
    }));
    const updated = { rows: renumbered };
    setContent(updated);
    save(updated);
  };

  const handleDelete = () => {
    navigate(`/editor/${projectId}#cover`);
  };

  if (loading) {
    return <div style={{ padding: '24px' }}>Loading...</div>;
  }

  const columns = [
    { key: 'sr_no', label: 'Sr. No.', locked: true },
    { key: 'abbreviation', label: 'Abbreviation' },
    { key: 'description', label: 'Description', multiline: true },
  ];

  // Determine which rows are locked (first 14 rows except row 13)
  const lockedRowIndices = content.rows
    .map((row, index) => (row.locked ? index : -1))
    .filter(index => index !== -1);

  return (
    <div style={{
      padding: '24px',
      backgroundColor: '#FFFFFF',
      borderRadius: '8px',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    }}>
      <SectionHeader
        projectId={projectId}
        sectionKey="abbreviations"
        title="Abbreviations"
        showDeleteButton={true}
        onDelete={handleDelete}
        status={status}
      />

      <div style={{
        marginBottom: '16px',
        padding: '12px',
        backgroundColor: '#FFF0F0',
        borderRadius: '6px',
        border: '1px solid #E5E7EB',
        fontSize: '14px',
        color: '#1A1A2E',
      }}>
        <strong>Note:</strong> Rows with 🔒 icon are standard abbreviations and cannot be edited. 
        Row 13 is auto-filled with your solution abbreviation. You can add custom abbreviations below.
      </div>

      <EditableTable
        columns={columns}
        rows={content.rows}
        onChange={handleRowsChange}
        onAddRow={handleAddRow}
        onDeleteRow={handleDeleteRow}
        lockedRows={lockedRowIndices}
      />
    </div>
  );
};

export default AbbreviationsSection;
