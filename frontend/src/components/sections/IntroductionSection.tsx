import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSection } from '../../api/sections';
import { useAutoSave } from '../../hooks/useAutoSave';
import SectionHeader from '../shared/SectionHeader';
import type { IntroductionContent } from '../../types';

interface IntroductionSectionProps {
  projectId: string;
}

const INTRODUCTION_TEXT = `This Technical Specification document has been prepared in response to the tender reference {{TenderReference}} dated {{TenderDate}}. The document outlines the proposed solution architecture, technical specifications, implementation approach, and commercial terms for the project.

Hitachi India Pvt. Ltd. is pleased to present this comprehensive technical specification that demonstrates our understanding of the requirements and our capability to deliver a robust, scalable, and future-ready solution.`;

const IntroductionSection: React.FC<IntroductionSectionProps> = ({ projectId }) => {
  const navigate = useNavigate();
  const [content, setContent] = useState<IntroductionContent>({
    tender_reference: '',
    tender_date: '',
  });
  const [loading, setLoading] = useState(true);
  const { save, status } = useAutoSave(projectId, 'introduction', 800);

  useEffect(() => {
    const loadSection = async () => {
      try {
        const data = await getSection(projectId, 'introduction');
        if (data.content && Object.keys(data.content).length > 0) {
          setContent(data.content as IntroductionContent);
        }
      } catch (error) {
        console.error('Error loading introduction:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSection();
  }, [projectId]);

  const handleChange = (field: keyof IntroductionContent, value: string) => {
    const updated = { ...content, [field]: value };
    setContent(updated);
    save(updated);
  };

  const handleDelete = () => {
    navigate(`/editor/${projectId}#cover`);
  };

  const renderIntroductionText = () => {
    let text = INTRODUCTION_TEXT;
    
    // Highlight placeholders
    const parts = text.split(/({{TenderReference}}|{{TenderDate}})/g);
    
    return parts.map((part, index) => {
      if (part === '{{TenderReference}}') {
        return (
          <span
            key={index}
            style={{
              backgroundColor: '#FFF0F0',
              padding: '2px 6px',
              borderRadius: '3px',
              fontWeight: 500,
              color: '#E60012',
            }}
          >
            {content.tender_reference || '{{TenderReference}}'}
          </span>
        );
      } else if (part === '{{TenderDate}}') {
        return (
          <span
            key={index}
            style={{
              backgroundColor: '#FFF0F0',
              padding: '2px 6px',
              borderRadius: '3px',
              fontWeight: 500,
              color: '#E60012',
            }}
          >
            {content.tender_date || '{{TenderDate}}'}
          </span>
        );
      }
      return <span key={index}>{part}</span>;
    });
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
        sectionKey="introduction"
        title="Introduction"
        showDeleteButton={true}
        onDelete={handleDelete}
        status={status}
      />

      {/* Read-only introduction text with highlighted placeholders */}
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
          <span>📄</span>
          <span>Introduction paragraph (fill in the highlighted fields below)</span>
        </div>
        <div style={{
          fontSize: '14px',
          color: '#1A1A2E',
          lineHeight: '1.8',
          whiteSpace: 'pre-wrap',
        }}>
          {renderIntroductionText()}
        </div>
      </div>

      {/* Editable fields */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <label style={{
            display: 'block',
            marginBottom: '6px',
            fontWeight: 500,
            color: '#1A1A2E',
          }}>
            Tender Reference Number <span style={{ color: '#E60012' }}>*</span>
          </label>
          <input
            type="text"
            value={content.tender_reference}
            onChange={(e) => handleChange('tender_reference', e.target.value)}
            placeholder="e.g., RFP/2026/001"
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

        <div>
          <label style={{
            display: 'block',
            marginBottom: '6px',
            fontWeight: 500,
            color: '#1A1A2E',
          }}>
            Tender Date <span style={{ color: '#E60012' }}>*</span>
          </label>
          <input
            type="text"
            value={content.tender_date}
            onChange={(e) => handleChange('tender_date', e.target.value)}
            placeholder="e.g., 15th January 2026"
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
    </div>
  );
};

export default IntroductionSection;
