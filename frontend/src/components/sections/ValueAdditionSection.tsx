import React, { useState, useEffect } from 'react';
import { getSection } from '../../api/sections';
import { useAutoSave } from '../../hooks/useAutoSave';
import RichTextEditor from '../shared/RichTextEditor';
import type { ValueAdditionContent } from '../../types';

interface ValueAdditionSectionProps {
  projectId: string;
}

const ValueAdditionSection: React.FC<ValueAdditionSectionProps> = ({ projectId }) => {
  const [content, setContent] = useState<ValueAdditionContent>({
    text: '',
  });
  const [loading, setLoading] = useState(true);
  const { save, status } = useAutoSave(projectId, 'value_addition', 800);

  useEffect(() => {
    const loadSection = async () => {
      try {
        const data = await getSection(projectId, 'value_addition');
        if (data.content && Object.keys(data.content).length > 0) {
          setContent(data.content as ValueAdditionContent);
        }
      } catch (error) {
        console.error('Error loading value addition section:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSection();
  }, [projectId]);

  const handleChange = (html: string) => {
    const updated = { text: html };
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
          Value Addition
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
          Describe the value-added features and capabilities included in this solution <span style={{ color: '#E60012' }}>*</span>
        </label>
        <RichTextEditor
          value={content.text || ''}
          onChange={handleChange}
          placeholder="Enter value-added offerings and capabilities..."
        />
      </div>
    </div>
  );
};

export default ValueAdditionSection;
