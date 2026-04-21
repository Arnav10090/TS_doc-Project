import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSection } from '../../api/sections';
import { useAutoSave } from '../../hooks/useAutoSave';
import SectionHeader from '../shared/SectionHeader';
import type { SupervisorsContent } from '../../types';

interface SupervisorsSectionProps {
  projectId: string;
}

const SupervisorsSection: React.FC<SupervisorsSectionProps> = ({ projectId }) => {
  const navigate = useNavigate();
  const [content, setContent] = useState<SupervisorsContent>({
    pm_days: '',
    dev_days: '',
    comm_days: '',
    total_man_days: '',
  });
  const [loading, setLoading] = useState(true);
  const { save, status } = useAutoSave(projectId, 'supervisors', 800);

  useEffect(() => {
    const loadSection = async () => {
      try {
        const data = await getSection(projectId, 'supervisors');
        if (data.content && Object.keys(data.content).length > 0) {
          setContent(data.content as SupervisorsContent);
        }
      } catch (error) {
        console.error('Error loading supervisors section:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSection();
  }, [projectId]);

  const handleChange = (field: keyof SupervisorsContent, value: string) => {
    const updated = { ...content, [field]: value };
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
        sectionKey="supervisors"
        title="Supervisors & Man-days"
        showDeleteButton={true}
        onDelete={handleDelete}
        status={status}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
        <div>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontWeight: 500,
            color: '#1A1A2E',
          }}>
            Project Manager (days) <span style={{ color: '#E60012' }}>*</span>
          </label>
          <input
            type="number"
            min="1"
            value={content.pm_days || ''}
            onChange={(e) => handleChange('pm_days', e.target.value)}
            placeholder="Enter PM days"
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #E5E7EB',
              borderRadius: '4px',
              fontFamily: 'inherit',
              fontSize: '14px',
            }}
          />
        </div>

        <div>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontWeight: 500,
            color: '#1A1A2E',
          }}>
            Developer (days) <span style={{ color: '#E60012' }}>*</span>
          </label>
          <input
            type="number"
            min="1"
            value={content.dev_days || ''}
            onChange={(e) => handleChange('dev_days', e.target.value)}
            placeholder="Enter developer days"
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #E5E7EB',
              borderRadius: '4px',
              fontFamily: 'inherit',
              fontSize: '14px',
            }}
          />
        </div>

        <div>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontWeight: 500,
            color: '#1A1A2E',
          }}>
            Commissioning Supervisor (days) <span style={{ color: '#E60012' }}>*</span>
          </label>
          <input
            type="number"
            min="1"
            value={content.comm_days || ''}
            onChange={(e) => handleChange('comm_days', e.target.value)}
            placeholder="Enter commissioning days"
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #E5E7EB',
              borderRadius: '4px',
              fontFamily: 'inherit',
              fontSize: '14px',
            }}
          />
        </div>

        <div>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontWeight: 500,
            color: '#1A1A2E',
          }}>
            Total Man-days <span style={{ color: '#E60012' }}>*</span>
          </label>
          <input
            type="number"
            min="1"
            value={content.total_man_days || ''}
            onChange={(e) => handleChange('total_man_days', e.target.value)}
            placeholder="Enter total man-days"
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #E5E7EB',
              borderRadius: '4px',
              fontFamily: 'inherit',
              fontSize: '14px',
            }}
          />
        </div>
      </div>

      {/* Preview Text */}
      <div style={{
        padding: '16px',
        backgroundColor: '#F9FAFB',
        borderRadius: '4px',
        border: '1px solid #E5E7EB',
      }}>
        <h3 style={{
          fontSize: '14px',
          fontWeight: 600,
          color: '#1A1A2E',
          marginBottom: '8px',
        }}>
          Preview
        </h3>
        <p style={{
          fontSize: '14px',
          color: '#6B7280',
          lineHeight: '1.6',
          margin: 0,
        }}>
          Project Manager: <strong>{content.pm_days || 'X'} Days</strong> · 
          Developer: <strong>{content.dev_days || 'Y'} Days</strong> · 
          Commissioning: <strong>{content.comm_days || 'Z'} Days</strong> · 
          Total: <strong>{content.total_man_days || 'N'} man-days</strong>
        </p>
      </div>
    </div>
  );
};

export default SupervisorsSection;
