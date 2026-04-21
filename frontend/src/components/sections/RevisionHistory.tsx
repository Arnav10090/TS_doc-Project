import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSection } from '../../api/sections';
import { useAutoSave } from '../../hooks/useAutoSave';
import SectionHeader from '../shared/SectionHeader';
import EditableTable from '../shared/EditableTable';
import type { RevisionHistoryContent, RevisionHistoryRow } from '../../types';

interface RevisionHistoryProps {
  projectId: string;
}

const DEFAULT_ROW: RevisionHistoryRow = {
  sr_no: 1,
  revised_by: '',
  checked_by: '',
  approved_by: '',
  details: 'First issue',
  date: '23-01-2026',
  rev_no: '0',
};

const RevisionHistory: React.FC<RevisionHistoryProps> = ({ projectId }) => {
  const navigate = useNavigate();
  const [content, setContent] = useState<RevisionHistoryContent>({
    rows: [DEFAULT_ROW],
  });
  const [loading, setLoading] = useState(true);
  const { save, status } = useAutoSave(projectId, 'revision_history', 800);

  useEffect(() => {
    const loadSection = async () => {
      try {
        const data = await getSection(projectId, 'revision_history');
        if (data.content && data.content.rows && data.content.rows.length > 0) {
          setContent(data.content as RevisionHistoryContent);
        }
      } catch (error) {
        console.error('Error loading revision history:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSection();
  }, [projectId]);

  const handleRowsChange = (rows: Array<Record<string, any>>) => {
    const updated = { rows: rows as RevisionHistoryRow[] };
    setContent(updated);
    save(updated);
  };

  const handleAddRow = () => {
    const newRow: RevisionHistoryRow = {
      sr_no: content.rows.length + 1,
      revised_by: '',
      checked_by: '',
      approved_by: '',
      details: '',
      date: '',
      rev_no: '',
    };
    const updated = { rows: [...content.rows, newRow] };
    setContent(updated);
    save(updated);
  };

  const handleDeleteRow = (index: number) => {
    if (index === 0) return; // Prevent deleting first row
    
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
    { key: 'revised_by', label: 'Revised By' },
    { key: 'checked_by', label: 'Checked By' },
    { key: 'approved_by', label: 'Approved By' },
    { key: 'details', label: 'Details', multiline: true, readOnly: true },
    { key: 'date', label: 'Date', readOnly: true },
    { key: 'rev_no', label: 'Rev. No.', readOnly: true },
  ];

  return (
    <div style={{
      padding: '24px',
      backgroundColor: '#FFFFFF',
      borderRadius: '8px',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    }}>
      <SectionHeader
        projectId={projectId}
        sectionKey="revision_history"
        title="Revision History"
        showDeleteButton={true}
        onDelete={handleDelete}
        status={status}
      />

      <EditableTable
        columns={columns}
        rows={content.rows}
        onChange={handleRowsChange}
        onAddRow={handleAddRow}
        onDeleteRow={handleDeleteRow}
        lockedRows={[0]} // First row is locked from deletion
      />
    </div>
  );
};

export default RevisionHistory;
