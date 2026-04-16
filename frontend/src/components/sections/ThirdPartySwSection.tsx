import React, { useState, useEffect } from 'react';
import { getSection } from '../../api/sections';
import { useAutoSave } from '../../hooks/useAutoSave';
import type { ThirdPartySoftwareContent } from '../../types';

interface ThirdPartySwSectionProps {
  projectId: string;
}

const ThirdPartySwSection: React.FC<ThirdPartySwSectionProps> = ({ projectId }) => {
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
          Third-Party Software
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
