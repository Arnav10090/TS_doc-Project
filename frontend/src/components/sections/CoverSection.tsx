import React, { useState, useEffect } from 'react';
import { getSection } from '../../api/sections';
import { updateProject } from '../../api/projects';
import { useAutoSave } from '../../hooks/useAutoSave';
import { useProjectStore } from '../../store/project.store';
import type { CoverContent } from '../../types';

interface CoverSectionProps {
  projectId: string;
}

const CoverSection: React.FC<CoverSectionProps> = ({ projectId }) => {
  const [content, setContent] = useState<CoverContent>({
    solution_full_name: '',
    client_name: '',
    client_location: '',
    ref_number: '',
    doc_date: '',
    doc_version: '',
  });
  const [loading, setLoading] = useState(true);
  const { save, status } = useAutoSave(projectId, 'cover', 800);
  const { setSolutionName } = useProjectStore();

  useEffect(() => {
    const loadSection = async () => {
      try {
        const data = await getSection(projectId, 'cover');
        if (data.content && Object.keys(data.content).length > 0) {
          setContent(data.content as CoverContent);
        }
      } catch (error) {
        console.error('Error loading cover section:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSection();
  }, [projectId]);

  const handleChange = async (field: keyof CoverContent, value: string) => {
    const updated = { ...content, [field]: value };
    setContent(updated);
    save(updated);

    // Update project record for global fields
    try {
      await updateProject(projectId, { [field]: value });
      
      // Update Zustand store when solution_name changes
      if (field === 'solution_full_name') {
        setSolutionName(value);
      }
    } catch (error) {
      console.error('Error updating project:', error);
    }
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
          Cover Page
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
        {/* Solution Full Name */}
        <div>
          <label style={{
            display: 'block',
            marginBottom: '6px',
            fontWeight: 500,
            color: '#1A1A2E',
          }}>
            Solution Full Name <span style={{ color: '#E60012' }}>*</span>
          </label>
          <input
            type="text"
            value={content.solution_full_name || ''}
            onChange={(e) => handleChange('solution_full_name', e.target.value)}
            placeholder="Enter full solution name"
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

        {/* Client Name */}
        <div>
          <label style={{
            display: 'block',
            marginBottom: '6px',
            fontWeight: 500,
            color: '#1A1A2E',
          }}>
            Client Name <span style={{ color: '#E60012' }}>*</span>
          </label>
          <input
            type="text"
            value={content.client_name || ''}
            onChange={(e) => handleChange('client_name', e.target.value)}
            placeholder="Enter client name"
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

        {/* Client Location */}
        <div>
          <label style={{
            display: 'block',
            marginBottom: '6px',
            fontWeight: 500,
            color: '#1A1A2E',
          }}>
            Client Location <span style={{ color: '#E60012' }}>*</span>
          </label>
          <input
            type="text"
            value={content.client_location || ''}
            onChange={(e) => handleChange('client_location', e.target.value)}
            placeholder="Enter client location"
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

        {/* Reference Number */}
        <div>
          <label style={{
            display: 'block',
            marginBottom: '6px',
            fontWeight: 500,
            color: '#1A1A2E',
          }}>
            Reference Number
          </label>
          <input
            type="text"
            value={content.ref_number || ''}
            onChange={(e) => handleChange('ref_number', e.target.value)}
            placeholder="Enter reference number"
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

        {/* Document Date */}
        <div>
          <label style={{
            display: 'block',
            marginBottom: '6px',
            fontWeight: 500,
            color: '#1A1A2E',
          }}>
            Document Date
          </label>
          <input
            type="text"
            value={content.doc_date || ''}
            onChange={(e) => handleChange('doc_date', e.target.value)}
            placeholder="e.g., 23-01-2026"
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

        {/* Document Version */}
        <div>
          <label style={{
            display: 'block',
            marginBottom: '6px',
            fontWeight: 500,
            color: '#1A1A2E',
          }}>
            Document Version
          </label>
          <input
            type="text"
            value={content.doc_version || ''}
            onChange={(e) => handleChange('doc_version', e.target.value)}
            placeholder="e.g., 0"
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
      </div>

      {/* Visual Preview */}
      <div style={{
        marginTop: '32px',
        padding: '20px',
        backgroundColor: '#F5F7FA',
        borderRadius: '8px',
        border: '1px solid #E5E7EB',
      }}>
        <h3 style={{
          fontSize: '16px',
          fontWeight: 600,
          color: '#1A1A2E',
          marginBottom: '16px',
        }}>
          Cover Page Preview
        </h3>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          fontSize: '14px',
          color: '#1A1A2E',
        }}>
          <div>
            <strong>Solution:</strong> {content.solution_full_name || '[Not set]'}
          </div>
          <div>
            <strong>Client:</strong> {content.client_name || '[Not set]'}
          </div>
          <div>
            <strong>Location:</strong> {content.client_location || '[Not set]'}
          </div>
          {content.ref_number && (
            <div>
              <strong>Reference:</strong> {content.ref_number}
            </div>
          )}
          {content.doc_date && (
            <div>
              <strong>Date:</strong> {content.doc_date}
            </div>
          )}
          {content.doc_version && (
            <div>
              <strong>Version:</strong> {content.doc_version}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CoverSection;
