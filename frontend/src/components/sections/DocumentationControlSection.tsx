import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSection } from '../../api/sections';
import { useAutoSave } from '../../hooks/useAutoSave';
import SectionHeader from '../shared/SectionHeader';
import DynamicList from '../shared/DynamicList';
import type { DocumentationControlContent } from '../../types';

interface DocumentationControlSectionProps {
  projectId: string;
}

const LOCKED_ITEMS = [
  'Screen Design Document',
  'Hardware Specifications',
  'Software specifications',
  'Operation Manual',
];

const DocumentationControlSection: React.FC<DocumentationControlSectionProps> = ({ projectId }) => {
  const navigate = useNavigate();
  const [content, setContent] = useState<DocumentationControlContent>({
    custom_items: [],
  });
  const [loading, setLoading] = useState(true);
  const { save, status } = useAutoSave(projectId, 'documentation_control', 800);

  useEffect(() => {
    const loadSection = async () => {
      try {
        const data = await getSection(projectId, 'documentation_control');
        if (data.content && Object.keys(data.content).length > 0) {
          setContent(data.content as DocumentationControlContent);
        }
      } catch (error) {
        console.error('Error loading documentation control section:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSection();
  }, [projectId]);

  const handleCustomItemsChange = (items: string[]) => {
    const updated = { custom_items: items };
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
        sectionKey="documentation_control"
        title="Documentation Control"
        showDeleteButton={true}
        onDelete={handleDelete}
        status={status}
      />

      {/* Locked Standard Items */}
      <div style={{ marginBottom: '24px' }}>
        <label style={{
          display: 'block',
          marginBottom: '12px',
          fontWeight: 500,
          color: '#1A1A2E',
          fontSize: '16px',
        }}>
          Standard Documentation (Fixed)
        </label>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}>
          {LOCKED_ITEMS.map((item, index) => (
            <div
              key={index}
              style={{
                padding: '12px',
                backgroundColor: '#F9FAFB',
                border: '1px solid #E5E7EB',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#6B7280',
              }}
            >
              <span>🔒</span>
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Custom Items */}
      <div>
        <label style={{
          display: 'block',
          marginBottom: '12px',
          fontWeight: 500,
          color: '#1A1A2E',
          fontSize: '16px',
        }}>
          Additional Documentation
        </label>
        <p style={{
          fontSize: '14px',
          color: '#6B7280',
          marginBottom: '12px',
        }}>
          Add any project-specific documentation items.
        </p>
        <DynamicList
          items={content.custom_items}
          onChange={handleCustomItemsChange}
          addButtonLabel="Add Documentation Item"
          minItems={0}
        />
      </div>
    </div>
  );
};

export default DocumentationControlSection;
