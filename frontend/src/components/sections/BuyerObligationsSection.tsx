import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSection } from '../../api/sections';
import { useAutoSave } from '../../hooks/useAutoSave';
import SectionHeader from '../shared/SectionHeader';
import DynamicList from '../shared/DynamicList';
import type { BuyerObligationsContent } from '../../types';

interface BuyerObligationsSectionProps {
  projectId: string;
  content?: BuyerObligationsContent;
  onContentChange?: (content: Record<string, any>) => void;
}

const LOCKED_ITEMS = [
  'Responsible for the project execution (answer technical queries in reasonable time and coordinate with all the stake holders of the project)',
  'Arrange all the hardware in BUYER scope well ahead of the agreed time schedule.',
  'Network cables & accessories not included in this technical proposal to be provided by BUYER',
  'Site access to SELLER\'s representative for data collection and discussion with the technical team as per requirement.',
  'Dedicated internet connection',
  'In case of any health issue to SELLER\'s representative, BUYER to immediately provide best available medical facility. The expenses will be borne by the SELLER.',
];

const BuyerObligationsSection: React.FC<BuyerObligationsSectionProps> = ({ projectId, content: contentProp, onContentChange }) => {
  const navigate = useNavigate();
  const [content, setContent] = useState<BuyerObligationsContent>({
    custom_items: [],
  });
  const [loading, setLoading] = useState(true);
  const [newlyImportedIndices, setNewlyImportedIndices] = useState<Set<number>>(new Set());
  const [previousItemCount, setPreviousItemCount] = useState(0);
  const { save, status } = useAutoSave(projectId, 'buyer_obligations', 800);

  // Synchronize state with content prop when it changes (handles AI imports)
  useEffect(() => {
    if (contentProp && Object.keys(contentProp).length > 0) {
      // Track which items are new
      const currentCount = contentProp.custom_items?.length || 0;
      if (currentCount > previousItemCount) {
        const newIndices = new Set<number>();
        for (let i = previousItemCount; i < currentCount; i++) {
          newIndices.add(i);
        }
        setNewlyImportedIndices(newIndices);
      }
      setPreviousItemCount(currentCount);
      setContent(contentProp);
      setLoading(false);
    }
  }, [contentProp, previousItemCount]);

  useEffect(() => {
    // Only load from API if no content prop provided
    if (!contentProp) {
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
    } else {
      setLoading(false);
    }
  }, [projectId, contentProp]);

  const handleCustomItemsChange = (items: string[]) => {
    const updated = { ...content, custom_items: items };
    setContent(updated);
    // Clear highlighting after user edits (optional - remove highlights once content is edited)
    setNewlyImportedIndices(new Set());
    // Notify parent so sectionContents stays in sync (critical for AI import flow)
    onContentChange?.(updated);
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
          itemStyle={(index) => newlyImportedIndices.has(index) ? {
            backgroundColor: '#E8F5E9',
            border: '1px solid #4CAF50',
            color: '#000000',
          } : undefined}
        />
      </div>
    </div>
  );
};

export default BuyerObligationsSection;
