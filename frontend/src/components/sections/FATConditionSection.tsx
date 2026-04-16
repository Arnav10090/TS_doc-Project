import React, { useState, useEffect } from 'react';
import { getSection } from '../../api/sections';
import { useAutoSave } from '../../hooks/useAutoSave';
import RichTextEditor from '../shared/RichTextEditor';
import type { FatConditionContent } from '../../types';

interface FATConditionSectionProps {
  projectId: string;
}

const FATConditionSection: React.FC<FATConditionSectionProps> = ({ projectId }) => {
  const [content, setContent] = useState<FatConditionContent>({
    text: '',
  });
  const [loading, setLoading] = useState(true);
  const { save, status } = useAutoSave(projectId, 'fat_condition', 800);

  useEffect(() => {
    const loadSection = async () => {
      try {
        const data = await getSection(projectId, 'fat_condition');
        if (data.content && Object.keys(data.content).length > 0) {
          setContent(data.content as FatConditionContent);
        }
      } catch (error) {
        console.error('Error loading FAT condition section:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSection();
  }, [projectId]);

  const handleEditorChange = (html: string) => {
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
          FAT Condition
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

      <div>
        <label style={{
          display: 'block',
          marginBottom: '8px',
          fontWeight: 500,
          color: '#1A1A2E',
          fontSize: '16px',
        }}>
          Factory Acceptance Test Conditions
        </label>
        <p style={{
          fontSize: '14px',
          color: '#6B7280',
          marginBottom: '12px',
        }}>
          Describe the conditions and requirements for the Factory Acceptance Test (FAT).
        </p>
        <RichTextEditor
          value={content.text}
          onChange={handleEditorChange}
          placeholder="Enter FAT conditions..."
        />
      </div>
    </div>
  );
};

export default FATConditionSection;
