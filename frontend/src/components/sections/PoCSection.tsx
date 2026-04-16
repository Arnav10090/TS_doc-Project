import React, { useState, useEffect } from 'react';
import { getSection } from '../../api/sections';
import { useAutoSave } from '../../hooks/useAutoSave';
import RichTextEditor from '../shared/RichTextEditor';
import { POC_BOILERPLATE_CONTENT } from '../../constants/lockedSections';
import type { PocContent } from '../../types';

interface PoCSectionProps {
  projectId: string;
}

const PoCSection: React.FC<PoCSectionProps> = ({ projectId }) => {
  const [content, setContent] = useState<PocContent>({
    name: '',
    description: '',
  });
  const [loading, setLoading] = useState(true);
  const { save, status } = useAutoSave(projectId, 'poc', 800);

  useEffect(() => {
    const loadSection = async () => {
      try {
        const data = await getSection(projectId, 'poc');
        if (data.content && Object.keys(data.content).length > 0) {
          setContent(data.content as PocContent);
        }
      } catch (error) {
        console.error('Error loading poc section:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSection();
  }, [projectId]);

  const handleChange = (field: keyof PocContent, value: string) => {
    const updated = { ...content, [field]: value };
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
          Proof of Concept (PoC)
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

      {/* Boilerplate Content */}
      <div style={{ marginBottom: '32px' }}>
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: '#F9FAFB',
            border: '1px solid #E5E7EB',
            borderRadius: '4px 4px 0 0',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#6B7280',
            fontSize: '14px',
          }}
        >
          <span>🔒</span>
          <span>This section is fixed and cannot be edited.</span>
        </div>
        <div
          style={{
            padding: '24px',
            backgroundColor: '#F9FAFB',
            border: '1px solid #E5E7EB',
            borderTop: 'none',
            borderRadius: '0 0 4px 4px',
            whiteSpace: 'pre-wrap',
            lineHeight: '1.6',
            color: '#1A1A2E',
          }}
        >
          {POC_BOILERPLATE_CONTENT}
        </div>
      </div>

      {/* PoC Name */}
      <div style={{ marginBottom: '24px' }}>
        <label style={{
          display: 'block',
          marginBottom: '8px',
          fontWeight: 500,
          color: '#1A1A2E',
        }}>
          PoC Solution Name <span style={{ color: '#E60012' }}>*</span>
        </label>
        <input
          type="text"
          value={content.name || ''}
          onChange={(e) => handleChange('name', e.target.value)}
          placeholder="Enter PoC solution name"
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

      {/* PoC Description */}
      <div>
        <label style={{
          display: 'block',
          marginBottom: '8px',
          fontWeight: 500,
          color: '#1A1A2E',
        }}>
          PoC Description and Capabilities <span style={{ color: '#E60012' }}>*</span>
        </label>
        <RichTextEditor
          value={content.description || ''}
          onChange={(html) => handleChange('description', html)}
          placeholder="Describe the PoC solution and its capabilities..."
        />
      </div>
    </div>
  );
};

export default PoCSection;
