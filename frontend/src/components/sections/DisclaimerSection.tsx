import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSection } from '../../api/sections';
import SectionHeader from '../shared/SectionHeader';
import LockedSection from '../shared/LockedSection';
import { DISCLAIMER_CONTENT } from '../../constants/lockedSections';

interface DisclaimerSectionProps {
  projectId: string;
}

const DisclaimerSection: React.FC<DisclaimerSectionProps> = ({ projectId }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSection = async () => {
      try {
        // Load section data to mark as visited and trigger auto-create
        await getSection(projectId, 'disclaimer');
      } catch (error) {
        console.error('Error loading disclaimer section:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSection();
  }, [projectId]);

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
        sectionKey="disclaimer"
        title="Disclaimer"
        showDeleteButton={true}
        onDelete={handleDelete}
      />

      <LockedSection
        content={DISCLAIMER_CONTENT}
        sectionKey="disclaimer"
      />
    </div>
  );
};

export default DisclaimerSection;
