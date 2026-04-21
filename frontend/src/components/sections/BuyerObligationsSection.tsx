import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSection } from '../../api/sections';
import { useAutoSave } from '../../hooks/useAutoSave';
import SectionHeader from '../shared/SectionHeader';
import DynamicList from '../shared/DynamicList';
import type { BuyerObligationsContent } from '../../types';

interface BuyerObligationsSectionProps {
  projectId: string;
}

const LOCKED_ITEMS = [
  'Responsible for the project execution (answer technical queries in reasonable time and coordinate with all the stake holders of the project)',
  'Arrange all the hardware in BUYER scope well ahead of the agreed time schedule.',
  'Network cables & accessories not included in this technical proposal to be provided by BUYER',
  'Site access to SELLER\'s representative for data collection and discussion with the technical team as per requirement.',
  'Dedicated internet connection',
  'In case of any health issue to SELLER\'s representative, BUYER to immediately provide best available medical facility. The expenses will be borne by the SELLER.',
];

const BuyerObligationsSection: React.FC<BuyerObligationsSectionProps> = ({ projectId }) => {
  const navigate = useNavigate();
  const [content, setContent] = useState<BuyerObligationsContent>({
    custom_items: [],
  });
  const [loading, setLoading] = useState(true);
  const { save, status } = useAutoSave(projectId, 'buyer_obligations', 800);

  useEffect(() => {
    const loadSection = async () => {
      try {
        const data = await getSection(projectId, 'buyer_obligations');
        if (data.content && Object.keys(data.content).length > 0) {
          setContent(data.content as BuyerObligationsContent);
        }
      } catch (error) {
        console.error('Error loading buyer obligations section:', error);
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
        sectionKey="buyer_obligations"
        title="Buyer Obligations"
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
          Standard Obligations (Fixed)
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
          Additional Obligations
        </label>
        <p style={{
          fontSize: '14px',
          color: '#6B7280',
          marginBottom: '12px',
        }}>
          Add any project-specific buyer obligations.
        </p>
        <DynamicList
          items={content.custom_items}
          onChange={handleCustomItemsChange}
          addButtonLabel="Add Obligation"
          minItems={0}
        />
      </div>
    </div>
  );
};

export default BuyerObligationsSection;
