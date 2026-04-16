import React, { useState, useEffect } from 'react';
import { getSection } from '../../api/sections';
import { useAutoSave } from '../../hooks/useAutoSave';
import RichTextEditor from '../shared/RichTextEditor';
import type { RemoteSupportContent } from '../../types';

interface RemoteSupportSectionProps {
  projectId: string;
}

const DEFAULT_TEXT = `SELLER will provide complimentary remote maintenance support for troubleshooting and issue resolution (if any) for a period of 6 months from the date of completion of project. Necessary infrastructure and network configuration will have to be enabled by BUYER to facilitate this. Remote maintenance support will be limited to scope of supply of this proposal. Also, access to remote terminal should be made available to SELLER as per requirement. Dedicated Internet/Lease line at site to be arranged by BUYER. The effective working hours at SELLER's Office shall be from 9:00 AM to 5:00 PM IST (Monday to Friday), excluding National Holidays. NON-DISCLOSURE AGREEMENT (NDA) will be signed between BUYER and SELLER before starting the remote support.`;

const RemoteSupportSection: React.FC<RemoteSupportSectionProps> = ({ projectId }) => {
  const [content, setContent] = useState<RemoteSupportContent>({
    text: '',
  });
  const [loading, setLoading] = useState(true);
  const { save, status } = useAutoSave(projectId, 'remote_support', 800);

  useEffect(() => {
    const loadSection = async () => {
      try {
        const data = await getSection(projectId, 'remote_support');
        if (data.content && Object.keys(data.content).length > 0) {
          setContent(data.content as RemoteSupportContent);
        } else {
          // Pre-populate with default text on first open
          const defaultContent = { text: DEFAULT_TEXT };
          setContent(defaultContent);
          save(defaultContent);
        }
      } catch (error) {
        console.error('Error loading remote support section:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSection();
  }, [projectId]);

  const handleEditorChange = (html: string) => {
    const updated = { text: html };
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
          Remote Support
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

      <div>
        <label style={{
          display: 'block',
          marginBottom: '8px',
          fontWeight: 500,
          color: '#1A1A2E',
          fontSize: '16px',
        }}>
          Remote Support Details
        </label>
        <p style={{
          fontSize: '14px',
          color: '#6B7280',
          marginBottom: '12px',
        }}>
          Describe the remote support terms, duration, and conditions.
        </p>
        <RichTextEditor
          value={content.text}
          onChange={handleEditorChange}
          placeholder="Enter remote support details..."
        />
      </div>
    </div>
  );
};

export default RemoteSupportSection;
