import React, { useState, useEffect } from 'react';
import { getSection } from '../../api/sections';
import { useAutoSave } from '../../hooks/useAutoSave';
import RichTextEditor from '../shared/RichTextEditor';
import type { ProcessFlowContent } from '../../types';

interface ProcessFlowSectionProps {
  projectId: string;
}

const ProcessFlowSection: React.FC<ProcessFlowSectionProps> = ({ projectId }) => {
  const [content, setContent] = useState<ProcessFlowContent>({
    text: '',
  });
  const [loading, setLoading] = useState(true);
  const { save, status } = useAutoSave(projectId, 'process_flow', 800);

  useEffect(() => {
    const loadSection = async () => {
      try {
        const data = await getSection(projectId, 'process_flow');
        if (data.content && Object.keys(data.content).length > 0) {
          setContent(data.content as ProcessFlowContent);
        }
      } catch (error) {
        console.error('Error loading process flow:', error);
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
          Process Flow Description
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

      <div style={{ marginBottom: '12px' }}>
        <p style={{
          fontSize: '14px',
          color: '#6B7280',
          margin: 0,
        }}>
          Describe the process flow and workflow of the system. Include key steps, data flow, 
          and interactions between different components.
        </p>
      </div>

      <RichTextEditor
        value={content.text}
        onChange={handleEditorChange}
        placeholder="Enter process flow description..."
      />
    </div>
  );
};

export default ProcessFlowSection;
