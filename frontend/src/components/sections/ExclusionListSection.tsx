import React, { useState, useEffect } from 'react';
import { getSection } from '../../api/sections';
import { useAutoSave } from '../../hooks/useAutoSave';
import DynamicList from '../shared/DynamicList';
import type { ExclusionListContent } from '../../types';

interface ExclusionListSectionProps {
  projectId: string;
}

const LOCKED_ITEMS = [
  'Interface with external devices other than explicitly described in the technical proposal document.',
  'Software patches including but not limited to Microsoft Security updates, Antivirus updates or any other software upgrades or patches.',
  'Any warranty, guarantee, liability, responsibility, etc. about productivity, quality, yield, etc.',
  'Source code of software of core technology.',
  'Erection activities wherever required for project execution. Any kind of Civil work.',
  'Hardware and software other than that is mentioned in technical document.',
  'Mechanical equipment supply, modification etc.',
  'Support for troubleshooting for mechanical/operation/process issues of customers.',
  'Firewall and other networking components',
  'Performance with respect to productivity, yield, quality, process capability, process performance, etc.',
];

const ExclusionListSection: React.FC<ExclusionListSectionProps> = ({ projectId }) => {
  const [content, setContent] = useState<ExclusionListContent>({
    custom_items: [],
  });
  const [loading, setLoading] = useState(true);
  const { save, status } = useAutoSave(projectId, 'exclusion_list', 800);

  useEffect(() => {
    const loadSection = async () => {
      try {
        const data = await getSection(projectId, 'exclusion_list');
        if (data.content && Object.keys(data.content).length > 0) {
          setContent(data.content as ExclusionListContent);
        }
      } catch (error) {
        console.error('Error loading exclusion list section:', error);
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
          Exclusion List
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

      {/* Locked Standard Items */}
      <div style={{ marginBottom: '24px' }}>
        <label style={{
          display: 'block',
          marginBottom: '12px',
          fontWeight: 500,
          color: '#1A1A2E',
          fontSize: '16px',
        }}>
          Standard Exclusions (Fixed)
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
                alignItems: 'flex-start',
                gap: '8px',
                color: '#6B7280',
              }}
            >
              <span style={{ flexShrink: 0 }}>🔒</span>
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
          Additional Exclusions
        </label>
        <p style={{
          fontSize: '14px',
          color: '#6B7280',
          marginBottom: '12px',
        }}>
          Add any project-specific exclusions.
        </p>
        <DynamicList
          items={content.custom_items}
          onChange={handleCustomItemsChange}
          addButtonLabel="Add Exclusion"
          minItems={0}
        />
      </div>
    </div>
  );
};

export default ExclusionListSection;
