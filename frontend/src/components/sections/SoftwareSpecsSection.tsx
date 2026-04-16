import React, { useState, useEffect } from 'react';
import { getSection } from '../../api/sections';
import { useAutoSave } from '../../hooks/useAutoSave';
import type { SoftwareSpecsContent } from '../../types';

interface SoftwareSpecsSectionProps {
  projectId: string;
}

const DEFAULT_ROWS = [
  { sr_no: 1, name: '', maker: 'Microsoft', qty: '2' },
  { sr_no: 2, name: '', maker: 'Microsoft', qty: '4' },
  { sr_no: 3, name: '', maker: 'Microsoft/ Other', qty: '6' },
  { sr_no: 4, name: '', maker: 'Microsoft/ Other', qty: '2' },
  { sr_no: 5, name: '', maker: '', qty: '6' },
  { sr_no: 6, name: '', maker: '-', qty: '2' },
  { sr_no: 7, name: '', maker: '-', qty: '2' },
  { sr_no: 8, name: '', maker: '-', qty: '2' },
  { sr_no: 9, name: '', maker: '', qty: '2' },
];

const SoftwareSpecsSection: React.FC<SoftwareSpecsSectionProps> = ({ projectId }) => {
  const [content, setContent] = useState<SoftwareSpecsContent>({
    rows: DEFAULT_ROWS,
  });
  const [loading, setLoading] = useState(true);
  const { save, status } = useAutoSave(projectId, 'software_specs', 800);

  useEffect(() => {
    const loadSection = async () => {
      try {
        const data = await getSection(projectId, 'software_specs');
        if (data.content && data.content.rows && data.content.rows.length > 0) {
          setContent(data.content as SoftwareSpecsContent);
        } else {
          // Initialize with default rows
          const defaultContent = { rows: DEFAULT_ROWS };
          setContent(defaultContent);
          save(defaultContent);
        }
      } catch (error) {
        console.error('Error loading software specs section:', error);
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
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
      }}>
        <h2 style={{
          fontSize: '24px',
          fontWeight: 600,
          color: '#1A1A2E',
          margin: 0,
        }}>
          Software Specifications
        </h2>
        {status === 'saving' && (
          <span style={{ color: '#6B7280', fontSize: '14px' }}>Saving...</span>
        )}
        {status === 'saved' && (
          <span style={{ color: '#10B981', fontSize: '14px' }}>Saved ✓</span>
        )}
        {status === 'error' && (
          <span style={{ color: '#E60012', fontSize: '14px' }}>Error saving</span>
        )}
      </div>

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
                Name <span style={{ color: '#E60012' }}>*</span>
              </th>
              <th style={{
                padding: '12px',
                textAlign: 'left',
                borderBottom: '2px solid #E5E7EB',
                fontWeight: 600,
                color: '#1A1A2E',
              }}>
                Maker
              </th>
              <th style={{
                padding: '12px',
                textAlign: 'left',
                borderBottom: '2px solid #E5E7EB',
                fontWeight: 600,
                color: '#1A1A2E',
                width: '100px',
              }}>
                Qty
              </th>
            </tr>
          </thead>
          <tbody>
            {content.rows.map((row, index) => (
              <tr key={index}>
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
                  backgroundColor: '#FFFFFF',
                }}>
                  <input
                    type="text"
                    value={row.name || ''}
                    onChange={(e) => handleRowChange(index, 'name', e.target.value)}
                    placeholder="Enter software name"
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
                <td style={{
                  padding: '8px 12px',
                  borderBottom: '1px solid #E5E7EB',
                  backgroundColor: '#FFFFFF',
                }}>
                  <input
                    type="text"
                    value={row.maker || ''}
                    onChange={(e) => handleRowChange(index, 'maker', e.target.value)}
                    placeholder="Enter maker"
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
                    <span>{row.qty}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SoftwareSpecsSection;
