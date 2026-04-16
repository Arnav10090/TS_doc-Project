import React, { useEffect, useState } from 'react';
import { getSection } from '../../api/sections';
import LockedSection from '../shared/LockedSection';
import { CYBERSECURITY_CONTENT } from '../../constants/lockedSections';

interface CybersecuritySectionProps {
  projectId: string;
}

const CybersecuritySection: React.FC<CybersecuritySectionProps> = ({ projectId }) => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSection = async () => {
      try {
        // Load section data to mark as visited and trigger auto-create
        await getSection(projectId, 'cybersecurity');
      } catch (error) {
        console.error('Error loading cybersecurity section:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSection();
  }, [projectId]);

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
      <h2 style={{
        fontSize: '24px',
        fontWeight: 600,
        color: '#1A1A2E',
        marginBottom: '24px',
      }}>
        Cybersecurity
      </h2>

      <LockedSection
        content={CYBERSECURITY_CONTENT}
        sectionKey="cybersecurity"
      />
    </div>
  );
};

export default CybersecuritySection;
