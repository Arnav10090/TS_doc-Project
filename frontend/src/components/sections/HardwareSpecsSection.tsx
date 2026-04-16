import React, { useState, useEffect } from 'react';
import { getSection } from '../../api/sections';
import { useAutoSave } from '../../hooks/useAutoSave';
import { useProjectStore } from '../../store/project.store';
import type { HardwareSpecsContent } from '../../types';

interface HardwareSpecsSectionProps {
  projectId: string;
}

const HardwareSpecsSection: React.FC<HardwareSpecsSectionProps> = ({ projectId }) => {
  const { solutionName } = useProjectStore();
  const [content, setContent] = useState<HardwareSpecsContent>({
    rows: [],
  });
  const [loading, setLoading] = useState(true);
  const { save, status } = useAutoSave(projectId, 'hardware_specs', 800);

  // Generate default rows with solution name
  const getDefaultRows = () => [
    {
      sr_no: 1,
      name: 'Server (Tower Based)',
      specs_line1: '',
      specs_line2: '',
      specs_line3: '',
      specs_line4: '',
      maker: '',
      qty: '',
    },
    {
      sr_no: 2,
      name: 'Server Console & accessories',
      specs_line1: '',
      specs_line2: '',
      specs_line3: '',
      specs_line4: '',
      maker: '',
      qty: '2',
    },
    {
      sr_no: 3,
      name: 'GSM Modem',
      specs_line1: '2G/3G/4G Industrial Cellular GSM Model with Ethernet Port & 2dBi Antenna 2mtr cable',
      specs_line2: '',
      specs_line3: '',
      specs_line4: '',
      maker: '',
      qty: '',
      locked_specs_line1: true,
    },
    {
      sr_no: 4,
      name: 'HX Controller',
      specs_line1: '',
      specs_line2: '',
      specs_line3: '',
      specs_line4: '',
      maker: '',
      qty: '1 set',
    },
    {
      sr_no: 5,
      name: `${solutionName || '{SolutionName}'} Client Desktop`,
      specs_line1: '',
      specs_line2: '',
      specs_line3: '',
      specs_line4: '',
      maker: '',
      qty: '4 set',
    },
    {
      sr_no: 6,
      name: `${solutionName || '{SolutionName}'} Client Console & accessories`,
      specs_line1: '23.8" FHD (1920x1080) resolution monitor with USB Mouse and Keyboard',
      specs_line2: '',
      specs_line3: '',
      specs_line4: '',
      maker: '',
      qty: '4 Set',
      locked_specs_line1: true,
    },
  ];

  useEffect(() => {
    const loadSection = async () => {
      try {
        const data = await getSection(projectId, 'hardware_specs');
        if (data.content && data.content.rows && data.content.rows.length > 0) {
          // Update rows 5 and 6 names with current solution name
          const updatedRows = data.content.rows.map((row: any) => {
            if (row.sr_no === 5) {
              return { ...row, name: `${solutionName || '{SolutionName}'} Client Desktop` };
            }
            if (row.sr_no === 6) {
              return { ...row, name: `${solutionName || '{SolutionName}'} Client Console & accessories` };
            }
            return row;
          });
          setContent({ rows: updatedRows });
        } else {
          // Initialize with default rows
          const defaultContent = { rows: getDefaultRows() };
          setContent(defaultContent);
          save(defaultContent);
        }
      } catch (error) {
        console.error('Error loading hardware specs section:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSection();
  }, [projectId, solutionName]);

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
          Hardware Specifications
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {content.rows.map((row, index) => {
          const hasMultipleSpecs = index === 0 || index === 4; // Rows 1 and 5
          const isSpecsLocked = row.locked_specs_line1;

          return (
            <div
              key={index}
              style={{
                padding: '16px',
                border: '1px solid #E5E7EB',
                borderRadius: '6px',
                backgroundColor: '#F9FAFB',
              }}
            >
              {/* Row Header */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '80px 1fr',
                gap: '12px',
                marginBottom: '12px',
              }}>
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '6px',
                    fontWeight: 500,
                    color: '#1A1A2E',
                    fontSize: '14px',
                  }}>
                    Sr. No.
                  </label>
                  <div style={{
                    padding: '8px 12px',
                    backgroundColor: '#F9FAFB',
                    border: '1px solid #E5E7EB',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    color: '#6B7280',
                  }}>
                    <span>🔒</span>
                    <span>{row.sr_no}</span>
                  </div>
                </div>
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '6px',
                    fontWeight: 500,
                    color: '#1A1A2E',
                    fontSize: '14px',
                  }}>
                    Hardware Name
                  </label>
                  <div style={{
                    padding: '8px 12px',
                    backgroundColor: '#F9FAFB',
                    border: '1px solid #E5E7EB',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    color: '#6B7280',
                  }}>
                    <span>🔒</span>
                    <span>{row.name}</span>
                  </div>
                </div>
              </div>

              {/* Specifications */}
              <div style={{ marginBottom: '12px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '6px',
                  fontWeight: 500,
                  color: '#1A1A2E',
                  fontSize: '14px',
                }}>
                  Specifications {index === 0 && <span style={{ color: '#E60012' }}>*</span>}
                </label>
                {hasMultipleSpecs ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {[1, 2, 3, 4].map((lineNum) => {
                      const fieldName = `specs_line${lineNum}` as keyof typeof row;
                      const value = row[fieldName];
                      return (
                        <input
                          key={lineNum}
                          type="text"
                          value={typeof value === 'string' ? value : ''}
                          onChange={(e) => handleRowChange(index, `specs_line${lineNum}`, e.target.value)}
                          placeholder={`Specification line ${lineNum}`}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1px solid #E5E7EB',
                            borderRadius: '4px',
                            fontSize: '14px',
                            fontFamily: 'inherit',
                            backgroundColor: '#FFFFFF',
                          }}
                        />
                      );
                    })}
                  </div>
                ) : isSpecsLocked ? (
                  <div style={{
                    padding: '8px 12px',
                    backgroundColor: '#F9FAFB',
                    border: '1px solid #E5E7EB',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    color: '#6B7280',
                  }}>
                    <span>🔒</span>
                    <span>{row.specs_line1}</span>
                  </div>
                ) : (
                  <input
                    type="text"
                    value={row.specs_line1 || ''}
                    onChange={(e) => handleRowChange(index, 'specs_line1', e.target.value)}
                    placeholder="Enter specifications"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #E5E7EB',
                      borderRadius: '4px',
                      fontSize: '14px',
                      fontFamily: 'inherit',
                      backgroundColor: '#FFFFFF',
                    }}
                  />
                )}
              </div>

              {/* Maker and Quantity */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
              }}>
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '6px',
                    fontWeight: 500,
                    color: '#1A1A2E',
                    fontSize: '14px',
                  }}>
                    Maker {index === 0 && <span style={{ color: '#E60012' }}>*</span>}
                  </label>
                  <input
                    type="text"
                    value={row.maker || ''}
                    onChange={(e) => handleRowChange(index, 'maker', e.target.value)}
                    placeholder="Enter maker"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #E5E7EB',
                      borderRadius: '4px',
                      fontSize: '14px',
                      fontFamily: 'inherit',
                      backgroundColor: '#FFFFFF',
                    }}
                  />
                </div>
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '6px',
                    fontWeight: 500,
                    color: '#1A1A2E',
                    fontSize: '14px',
                  }}>
                    Quantity
                  </label>
                  <input
                    type="text"
                    value={row.qty || ''}
                    onChange={(e) => handleRowChange(index, 'qty', e.target.value)}
                    placeholder="Enter quantity"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #E5E7EB',
                      borderRadius: '4px',
                      fontSize: '14px',
                      fontFamily: 'inherit',
                      backgroundColor: '#FFFFFF',
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default HardwareSpecsSection;
