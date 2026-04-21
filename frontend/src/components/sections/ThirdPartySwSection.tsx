import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSection } from '../../api/sections';
import { useAutoSave } from '../../hooks/useAutoSave';
import SectionHeader from '../shared/SectionHeader';
import type { ThirdPartySoftwareContent } from '../../types';

interface ThirdPartySwSectionProps {
  projectId: string;
}

const ThirdPartySwSection: React.FC<ThirdPartySwSectionProps> = ({ projectId }) => {
  const navigate = useNavigate();
  const [content, setContent] = useState<ThirdPartySoftwareContent>({
    sw4_name: '',
  });
  const [loading, setLoading] = useState(true);
  const { save, status } = useAutoSave(projectId, 'third_party_sw', 800);

  useEffect(() => {
    const loadSection = async () => {
      try {
        const data = await getSection(projectId, 'third_party_sw');
        if (data.content && Object.keys(data.content).length > 0) {
          setContent(data.content as ThirdPartySoftwareContent);
        }
      } catch (error) {
        console.error('Error loading third party sw section:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSection();
  }, [projectId]);

  const handleChange = (value: string) => {
    const updated = { sw4_name: value };
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
        sectionKey="third_party_sw"
        title="Third-Party Software"
        showDeleteButton={true}
        onDelete={handleDelete}
        status={status}
      />

      <div style={{ marginBottom: '16px' }}>
        <label style={{
          display: 'block',
          marginBottom: '8px',
          fontWeight: 500,
          color: '#1A1A2E',
        }}>
          Third-party software / remote link tool name <span style={{ color: '#E60012' }}>*</span>
        </label>
        <input
          type="text"
          value={content.sw4_name || ''}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Enter third-party software or remote link tool name"
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
  );
};

export default ThirdPartySwSection;
