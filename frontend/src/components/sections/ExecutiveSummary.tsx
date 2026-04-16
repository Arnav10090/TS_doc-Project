import React, { useState, useEffect } from 'react';
import { getSection } from '../../api/sections';
import { useAutoSave } from '../../hooks/useAutoSave';
import RichTextEditor from '../shared/RichTextEditor';
import { EXECUTIVE_SUMMARY_BOILERPLATE, CLIENT_LOGOS_TABLE } from '../../constants/lockedSections';
import type { ExecutiveSummaryContent } from '../../types';

interface ExecutiveSummaryProps {
  projectId: string;
}

const ExecutiveSummary: React.FC<ExecutiveSummaryProps> = ({ projectId }) => {
  const [content, setContent] = useState<ExecutiveSummaryContent>({
    para1: '',
  });
  const [loading, setLoading] = useState(true);
  const { save, status } = useAutoSave(projectId, 'executive_summary', 800);

  useEffect(() => {
    const loadSection = async () => {
      try {
        const data = await getSection(projectId, 'executive_summary');
        if (data.content && Object.keys(data.content).length > 0) {
          setContent(data.content as ExecutiveSummaryContent);
        }
      } catch (error) {
        console.error('Error loading executive summary:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSection();
  }, [projectId]);

  const handleEditorChange = (html: string) => {
    const updated = { para1: html };
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
          Executive Summary
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

      {/* Locked Boilerplate Section */}
      <div style={{
        marginBottom: '24px',
        padding: '16px',
        backgroundColor: '#F9FAFB',
        borderRadius: '6px',
        border: '1px solid #E5E7EB',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '12px',
          color: '#6B7280',
          fontSize: '14px',
        }}>
          <span>🔒</span>
          <span>This section is fixed and cannot be edited.</span>
        </div>
        <div style={{
          whiteSpace: 'pre-wrap',
          fontSize: '14px',
          color: '#1A1A2E',
          lineHeight: '1.6',
        }}>
          {EXECUTIVE_SUMMARY_BOILERPLATE}
        </div>
      </div>

      {/* Client Logos Table */}
      <div style={{
        marginBottom: '24px',
        padding: '16px',
        backgroundColor: '#F9FAFB',
        borderRadius: '6px',
        border: '1px solid #E5E7EB',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '12px',
          color: '#6B7280',
          fontSize: '14px',
        }}>
          <span>🔒</span>
          <span>Client logos table (fixed layout)</span>
        </div>
        <div style={{
          whiteSpace: 'pre-wrap',
          fontSize: '14px',
          color: '#1A1A2E',
          lineHeight: '1.6',
        }}>
          {CLIENT_LOGOS_TABLE}
        </div>
      </div>

      {/* Editable Project-Specific Paragraph */}
      <div>
        <label style={{
          display: 'block',
          marginBottom: '8px',
          fontWeight: 500,
          color: '#1A1A2E',
          fontSize: '16px',
        }}>
          Project-specific summary paragraph
        </label>
        <p style={{
          fontSize: '14px',
          color: '#6B7280',
          marginBottom: '12px',
        }}>
          Add a custom paragraph describing the specific project context, objectives, and key highlights.
        </p>
        <RichTextEditor
          value={content.para1}
          onChange={handleEditorChange}
          placeholder="Enter project-specific summary..."
        />
      </div>
    </div>
  );
};

export default ExecutiveSummary;
