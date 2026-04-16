import React, { useState, useEffect } from 'react';
import { getSection } from '../../api/sections';
import { useAutoSave } from '../../hooks/useAutoSave';
import { useProjectStore } from '../../store/project.store';
import RichTextEditor from '../shared/RichTextEditor';
import type { OverviewContent } from '../../types';

interface OverviewSectionProps {
  projectId: string;
}

const OverviewSection: React.FC<OverviewSectionProps> = ({ projectId }) => {
  const [content, setContent] = useState<OverviewContent>({
    system_objective: '',
    existing_system: '',
    integration: '',
    tangible_benefits: '',
    intangible_benefits: '',
  });
  const [loading, setLoading] = useState(true);
  const { save, status } = useAutoSave(projectId, 'overview', 800);
  const { solutionName } = useProjectStore();

  useEffect(() => {
    const loadSection = async () => {
      try {
        const data = await getSection(projectId, 'overview');
        if (data.content && Object.keys(data.content).length > 0) {
          setContent(data.content as OverviewContent);
        }
      } catch (error) {
        console.error('Error loading overview:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSection();
  }, [projectId]);

  const handleFieldChange = (field: keyof OverviewContent, html: string) => {
    const updated = { ...content, [field]: html };
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
          Overview of {solutionName || 'Solution'}
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
        {/* System Objective */}
        <div>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontWeight: 500,
            color: '#1A1A2E',
            fontSize: '16px',
          }}>
            System Objective <span style={{ color: '#E60012' }}>*</span>
          </label>
          <p style={{
            fontSize: '14px',
            color: '#6B7280',
            marginBottom: '8px',
          }}>
            Describe the primary objectives and goals of the system.
          </p>
          <RichTextEditor
            value={content.system_objective}
            onChange={(html) => handleFieldChange('system_objective', html)}
            placeholder="Enter system objective..."
          />
        </div>

        {/* Existing System Description */}
        <div>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontWeight: 500,
            color: '#1A1A2E',
            fontSize: '16px',
          }}>
            Existing System Description <span style={{ color: '#E60012' }}>*</span>
          </label>
          <p style={{
            fontSize: '14px',
            color: '#6B7280',
            marginBottom: '8px',
          }}>
            Describe the current system or process that will be replaced or enhanced.
          </p>
          <RichTextEditor
            value={content.existing_system}
            onChange={(html) => handleFieldChange('existing_system', html)}
            placeholder="Enter existing system description..."
          />
        </div>

        {/* Integration Description */}
        <div>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontWeight: 500,
            color: '#1A1A2E',
            fontSize: '16px',
          }}>
            Integration Description
          </label>
          <p style={{
            fontSize: '14px',
            color: '#6B7280',
            marginBottom: '8px',
          }}>
            Describe how the new system will integrate with existing systems and infrastructure.
          </p>
          <RichTextEditor
            value={content.integration}
            onChange={(html) => handleFieldChange('integration', html)}
            placeholder="Enter integration description..."
          />
        </div>

        {/* Tangible Benefits */}
        <div>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontWeight: 500,
            color: '#1A1A2E',
            fontSize: '16px',
          }}>
            Tangible Benefits
          </label>
          <p style={{
            fontSize: '14px',
            color: '#6B7280',
            marginBottom: '8px',
          }}>
            List measurable benefits such as cost savings, efficiency improvements, or productivity gains.
          </p>
          <RichTextEditor
            value={content.tangible_benefits}
            onChange={(html) => handleFieldChange('tangible_benefits', html)}
            placeholder="Enter tangible benefits..."
          />
        </div>

        {/* Intangible Benefits */}
        <div>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontWeight: 500,
            color: '#1A1A2E',
            fontSize: '16px',
          }}>
            Intangible Benefits
          </label>
          <p style={{
            fontSize: '14px',
            color: '#6B7280',
            marginBottom: '8px',
          }}>
            List qualitative benefits such as improved user experience, better decision-making, or enhanced reputation.
          </p>
          <RichTextEditor
            value={content.intangible_benefits}
            onChange={(html) => handleFieldChange('intangible_benefits', html)}
            placeholder="Enter intangible benefits..."
          />
        </div>
      </div>
    </div>
  );
};

export default OverviewSection;
