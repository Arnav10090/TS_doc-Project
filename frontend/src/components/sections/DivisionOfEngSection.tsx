import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSection } from '../../api/sections';
import { useAutoSave } from '../../hooks/useAutoSave';
import SectionHeader from '../shared/SectionHeader';
import { RESPONSIBILITY_MATRIX_CONTENT } from '../../constants/lockedSections';
import { useProjectStore } from '../../store/project.store';
import type { DivisionOfEngContent } from '../../types';

interface DivisionOfEngSectionProps {
  projectId: string;
}

const DivisionOfEngSection: React.FC<DivisionOfEngSectionProps> = ({ projectId }) => {
  const navigate = useNavigate();
  const [content, setContent] = useState<DivisionOfEngContent>({
    training_days: '',
    training_persons: '',
  });
  const [loading, setLoading] = useState(true);
  const { save, status } = useAutoSave(projectId, 'division_of_eng', 800);
  const { solutionName } = useProjectStore();

  useEffect(() => {
    const loadSection = async () => {
      try {
        const data = await getSection(projectId, 'division_of_eng');
        if (data.content && Object.keys(data.content).length > 0) {
          setContent(data.content as DivisionOfEngContent);
        }
      } catch (error) {
        console.error('Error loading division of eng section:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSection();
  }, [projectId]);

  const handleChange = (field: keyof DivisionOfEngContent, value: string) => {
    const updated = { ...content, [field]: value };
    setContent(updated);
    save(updated);
  };

  const handleDelete = () => {
    navigate(`/editor/${projectId}#cover`);
  };

  // Resolve placeholders in content
  const resolveContent = (text: string): string => {
    return text.replace(/\{\{SolutionName\}\}/g, solutionName || '[Solution Name]');
  };

  const resolvedContent = resolveContent(RESPONSIBILITY_MATRIX_CONTENT);

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
        sectionKey="division_of_eng"
        title="Division of Engineering Responsibility"
        showDeleteButton={true}
        onDelete={handleDelete}
        status={status}
      />

      {/* Responsibility Matrix */}
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
          {resolvedContent}
        </div>
      </div>

      {/* Training Fields */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontWeight: 500,
            color: '#1A1A2E',
          }}>
            Training Days
          </label>
          <input
            type="number"
            min="1"
            value={content.training_days || ''}
            onChange={(e) => handleChange('training_days', e.target.value)}
            placeholder="Enter training days"
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

        <div>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontWeight: 500,
            color: '#1A1A2E',
          }}>
            Training Persons
          </label>
          <input
            type="number"
            min="1"
            value={content.training_persons || ''}
            onChange={(e) => handleChange('training_persons', e.target.value)}
            placeholder="Enter number of persons"
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
      </div>
    </div>
  );
};

export default DivisionOfEngSection;
