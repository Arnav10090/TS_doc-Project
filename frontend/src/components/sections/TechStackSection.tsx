import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSection } from '../../api/sections';
import { useAutoSave } from '../../hooks/useAutoSave';
import SectionHeader from '../shared/SectionHeader';
import type { TechStackContent } from '../../types';

interface TechStackSectionProps {
  projectId: string;
}

const DEFAULT_ROWS = [
  { sr_no: 1, component: 'Frontend Application', technology: '', note: 'Application can be viewed on a standard web browser like Chrome, Edge & Mozilla' },
  { sr_no: 2, component: 'Backend Application', technology: '', note: '' },
  { sr_no: 3, component: 'Database', technology: '', note: '' },
  { sr_no: 4, component: 'Integration Layer', technology: '', note: '' },
  { sr_no: 5, component: 'Mobile/HHT Application', technology: '', note: '' },
  { sr_no: 6, component: 'Communication Protocol', technology: '', note: '' },
];

const TechStackSection: React.FC<TechStackSectionProps> = ({ projectId }) => {
  const navigate = useNavigate();
  const [content, setContent] = useState<TechStackContent>({
    rows: DEFAULT_ROWS,
  });
  const [loading, setLoading] = useState(true);
  const { save, status } = useAutoSave(projectId, 'tech_stack', 800);

  useEffect(() => {
    const loadSection = async () => {
      try {
        const data = await getSection(projectId, 'tech_stack');
        if (data.content && data.content.rows && data.content.rows.length > 0) {
          setContent(data.content as TechStackContent);
        } else {
          // Initialize with default rows
          const defaultContent = { rows: DEFAULT_ROWS };
          setContent(defaultContent);
          save(defaultContent);
        }
      } catch (error) {
        console.error('Error loading tech stack section:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSection();
  }, [projectId]);

  const handleRowChange = (index: number, field: string, value: string) => {
    const updatedRows = [...content.rows];
    updatedRows[index] = { ...updatedRows[index], [field]: value };
    const updated = { rows: updatedRows };
    setContent(updated);
    save(updated);
  };

  const handleDelete = () => {
    navigate(`/editor/${projectId}#cover`);
  };

  if (loading) {
    return <div style={{ padding: '24px' }}>Loading...</div>;
  }

  return (
    <div style={{
      padding: '24px',
      backgroundColor: '#FFFFFF',
      borderRadius: '8px',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    }}>
      <SectionHeader
        projectId={projectId}
        sectionKey="tech_stack"
        title="Technology Stack"
        showDeleteButton={true}
        onDelete={handleDelete}
        status={status}
      />

      <div style={{ overflowX: 'auto' }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          border: '1px solid #E5E7EB',
        }}>
          <thead>
            <tr style={{ backgroundColor: '#F9FAFB' }}>
              <th style={{
                padding: '12px',
                textAlign: 'left',
                borderBottom: '2px solid #E5E7EB',
                fontWeight: 600,
                color: '#1A1A2E',
                width: '80px',
              }}>
                Sr. No.
              </th>
              <th style={{
                padding: '12px',
                textAlign: 'left',
                borderBottom: '2px solid #E5E7EB',
                fontWeight: 600,
                color: '#1A1A2E',
              }}>
                Component
              </th>
              <th style={{
                padding: '12px',
                textAlign: 'left',
                borderBottom: '2px solid #E5E7EB',
                fontWeight: 600,
                color: '#1A1A2E',
              }}>
                Technology <span style={{ color: '#E60012' }}>*</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {content.rows.map((row, index) => (
              <React.Fragment key={index}>
                <tr>
                  <td style={{
                    padding: '8px 12px',
                    borderBottom: '1px solid #E5E7EB',
                    backgroundColor: '#F9FAFB',
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      color: '#6B7280',
                    }}>
                      <span>🔒</span>
                      <span>{row.sr_no}</span>
                    </div>
                  </td>
                  <td style={{
                    padding: '8px 12px',
                    borderBottom: '1px solid #E5E7EB',
                    backgroundColor: '#F9FAFB',
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      color: '#6B7280',
                    }}>
                      <span>🔒</span>
                      <span>{row.component}</span>
                    </div>
                  </td>
                  <td style={{
                    padding: '8px 12px',
                    borderBottom: '1px solid #E5E7EB',
                    backgroundColor: '#FFFFFF',
                  }}>
                    <input
                      type="text"
                      value={row.technology || ''}
                      onChange={(e) => handleRowChange(index, 'technology', e.target.value)}
                      placeholder="Enter technology"
                      style={{
                        width: '100%',
                        padding: '6px',
                        border: '1px solid #E5E7EB',
                        borderRadius: '4px',
                        fontFamily: 'inherit',
                        fontSize: 'inherit',
                      }}
                    />
                  </td>
                </tr>
                {/* Display note field only for row 1 */}
                {index === 0 && row.note && (
                  <tr>
                    <td colSpan={3} style={{
                      padding: '8px 12px',
                      borderBottom: '1px solid #E5E7EB',
                      backgroundColor: '#FFF0F0',
                      fontSize: '13px',
                      color: '#6B7280',
                      fontStyle: 'italic',
                    }}>
                      Note: {row.note}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TechStackSection;
