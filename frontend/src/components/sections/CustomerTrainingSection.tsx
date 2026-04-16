import React, { useState, useEffect } from 'react';
import { getSection } from '../../api/sections';
import { useAutoSave } from '../../hooks/useAutoSave';
import type { CustomerTrainingContent } from '../../types';

interface CustomerTrainingSectionProps {
  projectId: string;
}

const CustomerTrainingSection: React.FC<CustomerTrainingSectionProps> = ({ projectId }) => {
  const [content, setContent] = useState<CustomerTrainingContent>({
    persons: '',
    days: '',
  });
  const [loading, setLoading] = useState(true);
  const { save, status } = useAutoSave(projectId, 'customer_training', 800);

  useEffect(() => {
    const loadSection = async () => {
      try {
        const data = await getSection(projectId, 'customer_training');
        if (data.content && Object.keys(data.content).length > 0) {
          setContent(data.content as CustomerTrainingContent);
        }
      } catch (error) {
        console.error('Error loading customer training section:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSection();
  }, [projectId]);

  const handleChange = (field: keyof CustomerTrainingContent, value: string) => {
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
          Customer Training
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Number of Persons */}
        <div>
          <label style={{
            display: 'block',
            marginBottom: '6px',
            fontWeight: 500,
            color: '#1A1A2E',
          }}>
            Number of persons to be trained <span style={{ color: '#E60012' }}>*</span>
          </label>
          <input
            type="number"
            min="1"
            value={content.persons || ''}
            onChange={(e) => handleChange('persons', e.target.value)}
            placeholder="Enter number of persons"
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid #E5E7EB',
              borderRadius: '4px',
              fontSize: '14px',
              fontFamily: 'inherit',
            }}
          />
        </div>

        {/* Number of Days */}
        <div>
          <label style={{
            display: 'block',
            marginBottom: '6px',
            fontWeight: 500,
            color: '#1A1A2E',
          }}>
            Number of training days <span style={{ color: '#E60012' }}>*</span>
          </label>
          <input
            type="number"
            min="1"
            value={content.days || ''}
            onChange={(e) => handleChange('days', e.target.value)}
            placeholder="Enter number of days"
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid #E5E7EB',
              borderRadius: '4px',
              fontSize: '14px',
              fontFamily: 'inherit',
            }}
          />
        </div>

        {/* Preview Text */}
        {(content.persons || content.days) && (
          <div style={{
            marginTop: '16px',
            padding: '16px',
            backgroundColor: '#F5F7FA',
            borderRadius: '6px',
            border: '1px solid #E5E7EB',
          }}>
            <h3 style={{
              fontSize: '14px',
              fontWeight: 600,
              color: '#1A1A2E',
              marginBottom: '8px',
            }}>
              Preview
            </h3>
            <p style={{
              fontSize: '14px',
              color: '#1A1A2E',
              margin: 0,
              lineHeight: '1.6',
            }}>
              SELLER shall provide training at site during commissioning to a maximum of{' '}
              <strong>{content.persons || '[persons]'}</strong> people for a maximum of{' '}
              <strong>{content.days || '[days]'}</strong> days.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerTrainingSection;
