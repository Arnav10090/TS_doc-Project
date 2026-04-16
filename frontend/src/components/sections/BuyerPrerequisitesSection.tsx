import React, { useState, useEffect } from 'react';
import { getSection } from '../../api/sections';
import { useAutoSave } from '../../hooks/useAutoSave';
import DynamicList from '../shared/DynamicList';
import type { BuyerPrerequisitesContent } from '../../types';

interface BuyerPrerequisitesSectionProps {
  projectId: string;
}

const BuyerPrerequisitesSection: React.FC<BuyerPrerequisitesSectionProps> = ({ projectId }) => {
  const [content, setContent] = useState<BuyerPrerequisitesContent>({
    items: ['', '', ''],
  });
  const [loading, setLoading] = useState(true);
  const { save, status } = useAutoSave(projectId, 'buyer_prerequisites', 800);

  useEffect(() => {
    const loadSection = async () => {
      try {
        const data = await getSection(projectId, 'buyer_prerequisites');
        if (data.content && data.content.items && data.content.items.length > 0) {
          setContent(data.content as BuyerPrerequisitesContent);
        }
      } catch (error) {
        console.error('Error loading buyer prerequisites section:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSection();
  }, [projectId]);

  const handleItemsChange = (items: string[]) => {
    const updated = { items };
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
          Buyer Prerequisites
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
          marginBottom: '12px',
          fontWeight: 500,
          color: '#1A1A2E',
          fontSize: '16px',
        }}>
          Prerequisites <span style={{ color: '#E60012' }}>*</span>
        </label>
        <p style={{
          fontSize: '14px',
          color: '#6B7280',
          marginBottom: '12px',
        }}>
          List all prerequisites that the buyer must fulfill before project execution.
        </p>
        <DynamicList
          items={content.items}
          onChange={handleItemsChange}
          addButtonLabel="Add Prerequisite"
          minItems={1}
        />
      </div>
    </div>
  );
};

export default BuyerPrerequisitesSection;
