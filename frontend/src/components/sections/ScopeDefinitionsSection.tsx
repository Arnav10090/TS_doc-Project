import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSection } from '../../api/sections';
import SectionHeader from '../shared/SectionHeader';
import { SCOPE_DEFINITIONS_CONTENT } from '../../constants/lockedSections';
import { useProjectStore } from '../../store/project.store';

interface ScopeDefinitionsSectionProps {
  projectId: string;
}

const ScopeDefinitionsSection: React.FC<ScopeDefinitionsSectionProps> = ({ projectId }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const { clientName } = useProjectStore();

  useEffect(() => {
    const loadSection = async () => {
      try {
        // Load section data to mark as visited
        await getSection(projectId, 'scope_definitions');
      } catch (error) {
        console.error('Error loading scope definitions section:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSection();
  }, [projectId]);

  // Resolve placeholders in content
  const resolveContent = (text: string): string => {
    return text.replace(/\{\{ClientName\}\}/g, clientName || '[Client Name]');
  };

  const resolvedContent = resolveContent(SCOPE_DEFINITIONS_CONTENT);

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
        sectionKey="scope_definitions"
        title="Scope Definitions"
        showDeleteButton={true}
        onDelete={handleDelete}
      />

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
  );
};

export default ScopeDefinitionsSection;
