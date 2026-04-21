import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSection } from '../../api/sections';
import { useAutoSave } from '../../hooks/useAutoSave';
import SectionHeader from '../shared/SectionHeader';
import RichTextEditor from '../shared/RichTextEditor';
import type { ValueAdditionContent } from '../../types';

interface ValueAdditionSectionProps {
  projectId: string;
}

const ValueAdditionSection: React.FC<ValueAdditionSectionProps> = ({ projectId }) => {
  const navigate = useNavigate();
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
        sectionKey="value_addition"
        title="Value Addition"
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
