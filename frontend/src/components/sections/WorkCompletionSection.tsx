import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSection } from '../../api/sections';
import { useAutoSave } from '../../hooks/useAutoSave';
import SectionHeader from '../shared/SectionHeader';
import DynamicList from '../shared/DynamicList';
import { useProjectStore } from '../../store/project.store';
import type { WorkCompletionContent } from '../../types';

interface WorkCompletionSectionProps {
  projectId: string;
}

const WorkCompletionSection: React.FC<WorkCompletionSectionProps> = ({ projectId }) => {
  const navigate = useNavigate();
  const [content, setContent] = useState<WorkCompletionContent>({
    custom_items: [],
  });
  const [loading, setLoading] = useState(true);
  const { save, status } = useAutoSave(projectId, 'work_completion', 800);
  const { solutionName } = useProjectStore();

  const LOCKED_ITEMS = [
    'Supply of Hardware & Software as per the scope of supply (described in section 6.2)',
    'Submission of all documentation as per the scope (described in section 3.3)',
    'Commissioning work Man-days used (as described in section 5.2)',
    `Deployment of ${solutionName || '[Solution Name]'}`,
  ];

  useEffect(() => {
    const loadSection = async () => {
      try {
        const data = await getSection(projectId, 'work_completion');
        if (data.content && Object.keys(data.content).length > 0) {
          setContent(data.content as WorkCompletionContent);
        }
      } catch (error) {
        console.error('Error loading work completion section:', error);
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
        sectionKey="work_completion"
        title="Work Completion"
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
          Standard Completion Criteria (Fixed)
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
          Additional Completion Criteria
        </label>
        <p style={{
          fontSize: '14px',
          color: '#6B7280',
          marginBottom: '12px',
        }}>
          Add any project-specific work completion criteria.
        </p>
        <DynamicList
          items={content.custom_items}
          onChange={handleCustomItemsChange}
          addButtonLabel="Add Completion Criterion"
          minItems={0}
        />
      </div>
    </div>
  );
};

export default WorkCompletionSection;
