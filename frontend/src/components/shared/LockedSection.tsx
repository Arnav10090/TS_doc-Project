import React from 'react';
import { useProjectStore } from '../../store/project.store';

interface LockedSectionProps {
  content: string;
  sectionKey: string;
}

const LockedSection: React.FC<LockedSectionProps> = ({ content }) => {
  const { solutionName, clientName } = useProjectStore();

  // Resolve placeholders in content
  const resolveContent = (text: string): string => {
    return text
      .replace(/\{\{SolutionName\}\}/g, solutionName || '[Solution Name]')
      .replace(/\{\{ClientName\}\}/g, clientName || '[Client Name]');
  };

  const resolvedContent = resolveContent(content);

  return (
    <div className="locked-section">
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

export default LockedSection;
