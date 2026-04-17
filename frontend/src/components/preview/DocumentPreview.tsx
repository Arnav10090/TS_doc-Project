import React, { useRef, useEffect, useMemo, useState } from 'react';
import { useProjectStore } from '../../store/project.store';

interface DocumentPreviewProps {
  projectId: string;
  activeSectionKey: string | null;
  sectionContents: Record<string, Record<string, any>>;
  onSectionClick?: (sectionKey: string) => void;
}

// Helper functions
const stripHtml = (html: string): string => {
  if (!html) return '';
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
};

const truncate = (text: string, maxLen: number): string => {
  if (!text) return '';
  if (text.length <= maxLen) return text;
  return text.substring(0, maxLen) + '...';
};

// Zoom levels
const ZOOM_LEVELS = [0.5, 0.75, 1, 1.25];

// Page break component
const PageBreak: React.FC = () => (
  <div style={{ width: '100%', height: '16px', background: '#E8E8E8' }} />
);

// Page header component (for non-cover pages)
const PageHeader: React.FC = () => (
  <div style={{ 
    marginBottom: '24px', 
    paddingBottom: '12px', 
    borderBottom: '1px solid #1F3864',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <div style={{
        width: '60px',
        height: '30px',
        background: '#D1D5DB',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '8pt',
        color: '#6B7280',
      }}>
        HITACHI
      </div>
      <span style={{ fontFamily: 'Arial, sans-serif', fontSize: '10pt', fontWeight: 'bold', color: '#1F3864' }}>
        Technical Specification
      </span>
    </div>
    <span style={{ fontSize: '9pt', color: '#E60012', fontWeight: 'bold' }}>
      CONFIDENTIAL
    </span>
  </div>
);

// Page wrapper component
const Page: React.FC<{ pageNumber: number; showHeader?: boolean; children: React.ReactNode }> = ({ 
  pageNumber, 
  showHeader = false,
  children 
}) => (
  <div
    style={{
      width: '794px',
      minHeight: '1123px',
      backgroundColor: '#FFFFFF',
      margin: '0 auto',
      padding: '64px 72px 80px',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
      fontFamily: "'Times New Roman', serif",
      fontSize: '14.67px', // 11pt
      lineHeight: '1.5',
      position: 'relative',
    }}
  >
    {showHeader && <PageHeader />}
    {children}
    <div
      style={{
        position: 'absolute',
        bottom: '48px',
        left: '0',
        right: '0',
        borderTop: '1px solid #D1D5DB',
        paddingTop: '8px',
      }}
    >
      <div
        style={{
          textAlign: 'center',
          fontSize: '10pt',
          color: '#6B7280',
        }}
      >
        Page {pageNumber}
      </div>
    </div>
  </div>
);

// Section wrapper with click-to-edit functionality
interface SectionWrapperProps {
  sectionKey: string;
  isActive: boolean;
  isHovered: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onClick: () => void;
  sectionRef: (el: HTMLDivElement | null) => void;
  style: React.CSSProperties;
  children: React.ReactNode;
}

const SectionWrapper: React.FC<SectionWrapperProps> = ({
  sectionKey,
  isActive,
  isHovered,
  onMouseEnter,
  onMouseLeave,
  onClick,
  sectionRef,
  style,
  children,
}) => (
  <div
    ref={sectionRef}
    style={style}
    onMouseEnter={onMouseEnter}
    onMouseLeave={onMouseLeave}
    onClick={onClick}
  >
    {isHovered && !isActive && (
      <div
        style={{
          position: 'absolute',
          top: '4px',
          right: '4px',
          fontSize: '11px',
          color: '#E60012',
          fontWeight: 600,
          pointerEvents: 'none',
          zIndex: 10,
        }}
      >
        Click to edit →
      </div>
    )}
    {children}
  </div>
);

const DocumentPreview: React.FC<DocumentPreviewProps> = React.memo(({
  projectId,
  activeSectionKey,
  sectionContents,
  onSectionClick,
}) => {
  const { solutionName, clientName, clientLocation, sectionCompletion } = useProjectStore();
  
  // Refs for each section for scroll-to functionality
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  
  // State for hover effects and zoom
  const [hoveredSection, setHoveredSection] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(() => {
    const saved = localStorage.getItem('documentPreviewZoom');
    return saved ? parseFloat(saved) : 1;
  });

  // Calculate completion count
  const completedCount = useMemo(() => {
    const excludedSections = ['binding_conditions', 'cybersecurity', 'disclaimer', 'scope_definitions'];
    return Object.entries(sectionCompletion).filter(
      ([key, isComplete]) => !excludedSections.includes(key) && isComplete
    ).length;
  }, [sectionCompletion]);

  // Helper to safely get section content
  const getSectionContent = (key: string): Record<string, any> => {
    return sectionContents[key] || {};
  };

  // Scroll to active section when it changes
  useEffect(() => {
    if (activeSectionKey && sectionRefs.current[activeSectionKey]) {
      sectionRefs.current[activeSectionKey]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeSectionKey]);

  // Save zoom preference
  useEffect(() => {
    localStorage.setItem('documentPreviewZoom', zoom.toString());
  }, [zoom]);

  const handleZoomIn = () => {
    const currentIndex = ZOOM_LEVELS.indexOf(zoom);
    if (currentIndex < ZOOM_LEVELS.length - 1) {
      setZoom(ZOOM_LEVELS[currentIndex + 1]);
    }
  };

  const handleZoomOut = () => {
    const currentIndex = ZOOM_LEVELS.indexOf(zoom);
    if (currentIndex > 0) {
      setZoom(ZOOM_LEVELS[currentIndex - 1]);
    }
  };

  const handleFitWidth = () => {
    setZoom(1);
  };

  // Memoized document structure
  const documentContent = useMemo(() => {
    const coverContent = getSectionContent('cover');
    const executiveSummary = getSectionContent('executive_summary');
    const introduction = getSectionContent('introduction');
    const abbreviations = getSectionContent('abbreviations');
    const processFlow = getSectionContent('process_flow');
    const overview = getSectionContent('overview');
    const features = getSectionContent('features');
    const remoteSupport = getSectionContent('remote_support');
    const customerTraining = getSectionContent('customer_training');
    const fatCondition = getSectionContent('fat_condition');
    const techStack = getSectionContent('tech_stack');
    const hardwareSpecs = getSectionContent('hardware_specs');
    const softwareSpecs = getSectionContent('software_specs');
    const thirdPartySw = getSectionContent('third_party_sw');
    const supervisors = getSectionContent('supervisors');
    const poc = getSectionContent('poc');

    return {
      coverContent,
      executiveSummary,
      introduction,
      abbreviations,
      processFlow,
      overview,
      features,
      remoteSupport,
      customerTraining,
      fatCondition,
      techStack,
      hardwareSpecs,
      softwareSpecs,
      thirdPartySw,
      supervisors,
      poc,
    };
  }, [sectionContents]);

  const isActive = (sectionKey: string) => activeSectionKey === sectionKey;

  const sectionStyle = (sectionKey: string): React.CSSProperties => ({
    position: 'relative',
    cursor: onSectionClick ? 'pointer' : 'default',
    transition: 'all 0.2s ease',
    marginBottom: '24px',
    ...(isActive(sectionKey) && {
      background: '#FFF9C4',
      borderLeft: '3px solid #E60012',
      borderRadius: '2px',
      paddingLeft: '8px',
      marginLeft: '-8px',
    }),
    ...(hoveredSection === sectionKey && !isActive(sectionKey) && {
      border: '1px solid #BFDBFE',
      borderRadius: '2px',
      padding: '4px',
      margin: '-4px -4px 20px',
    }),
  });

  const headingStyle: React.CSSProperties = {
    fontFamily: 'Arial, sans-serif',
    fontSize: '12pt',
    fontWeight: 'bold',
    color: '#1F3864',
    marginBottom: '12px',
  };

  const subHeadingStyle: React.CSSProperties = {
    fontFamily: 'Arial, sans-serif',
    fontSize: '11pt',
    fontWeight: 'bold',
    marginBottom: '8px',
  };

  const tableStyle: React.CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '10pt',
    marginBottom: '12px',
  };

  const tableHeaderStyle: React.CSSProperties = {
    background: '#1F3864',
    color: 'white',
    fontWeight: 'bold',
    padding: '4px 8px',
    border: '1px solid #000',
    textAlign: 'left',
  };

  const tableCellStyle = (isEven: boolean): React.CSSProperties => ({
    padding: '4px 8px',
    border: '1px solid #000',
    background: isEven ? '#F2F2F2' : 'white',
  });

  const requiredPlaceholderStyle: React.CSSProperties = {
    border: '1px dashed #E60012',
    padding: '4px 8px',
    color: '#E60012',
    fontStyle: 'italic',
    display: 'inline-block',
  };

  const optionalPlaceholderStyle: React.CSSProperties = {
    fontStyle: 'italic',
    color: '#6B7280',
  };

  const handleSectionClick = (sectionKey: string) => {
    if (onSectionClick) {
      onSectionClick(sectionKey);
    }
  };

  return (
    <>
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .document-preview-print, .document-preview-print * {
            visibility: visible;
          }
          .document-preview-print {
            position: absolute;
            left: 0;
            top: 0;
          }
          .preview-toolbar, .completion-badge {
            display: none !important;
          }
        }
      `}</style>
      
      <div
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: '#E8E8E8',
          overflowY: 'auto',
          overflowX: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Zoom Toolbar */}
        <div
          className="preview-toolbar"
          style={{
            padding: '12px 24px',
            backgroundColor: '#FFFFFF',
            borderBottom: '1px solid #E5E7EB',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            flexShrink: 0,
          }}
        >
          <button
            onClick={handleZoomOut}
            disabled={zoom === ZOOM_LEVELS[0]}
            style={{
              padding: '4px 12px',
              border: '1px solid #D1D5DB',
              borderRadius: '4px',
              background: 'white',
              cursor: zoom === ZOOM_LEVELS[0] ? 'not-allowed' : 'pointer',
              fontSize: '14px',
            }}
          >
            −
          </button>
          <span style={{ fontSize: '14px', fontWeight: 500, minWidth: '50px', textAlign: 'center' }}>
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            disabled={zoom === ZOOM_LEVELS[ZOOM_LEVELS.length - 1]}
            style={{
              padding: '4px 12px',
              border: '1px solid #D1D5DB',
              borderRadius: '4px',
              background: 'white',
              cursor: zoom === ZOOM_LEVELS[ZOOM_LEVELS.length - 1] ? 'not-allowed' : 'pointer',
              fontSize: '14px',
            }}
          >
            +
          </button>
          <button
            onClick={handleFitWidth}
            style={{
              padding: '4px 12px',
              border: '1px solid #D1D5DB',
              borderRadius: '4px',
              background: 'white',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            Fit Width
          </button>
        </div>

        {/* Completion Badge */}
        <div
          className="completion-badge"
          style={{
            position: 'absolute',
            top: '80px',
            right: '24px',
            padding: '8px 12px',
            background: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: '4px',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
            fontSize: '12px',
            fontWeight: 500,
            color: '#1A1A2E',
            zIndex: 10,
          }}
        >
          Preview — {completedCount} / 27 complete
        </div>

        {/* Document Content */}
        <div
          className="document-preview-print"
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px 0',
            transform: `scale(${zoom})`,
            transformOrigin: 'top center',
            transition: 'transform 0.2s ease',
          }}
        >
      {/* PAGE 1: COVER PAGE */}
      <Page pageNumber={1} showHeader={false}>
        <SectionWrapper
          sectionKey="cover"
          isActive={isActive('cover')}
          isHovered={hoveredSection === 'cover'}
          onMouseEnter={() => setHoveredSection('cover')}
          onMouseLeave={() => setHoveredSection(null)}
          onClick={() => handleSectionClick('cover')}
          sectionRef={(el) => (sectionRefs.current['cover'] = el)}
          style={{
            ...sectionStyle('cover'),
            textAlign: 'center',
            paddingTop: '200px',
          }}
        >
          <h1 style={{ fontSize: '16pt', fontWeight: 'bold', marginBottom: '24px' }}>
            TECHNICAL SPECIFICATION
          </h1>
          <p style={{ fontSize: '12pt', marginBottom: '8px' }}>For</p>
          <p style={{ fontSize: '14pt', fontWeight: 'bold', marginBottom: '16px' }}>
            {documentContent.coverContent.solution_full_name || solutionName || '{Solution Full Name}'}
          </p>
          <p style={{ marginBottom: '4px' }}>Prepared for:</p>
          <p style={{ fontWeight: 'bold', marginBottom: '16px' }}>
            {clientName || '{Client Name}'}, {clientLocation || '{Client Location}'}
          </p>
          <p style={{ marginBottom: '4px' }}>
            Document Version: {documentContent.coverContent.doc_version || '0'}
          </p>
          <p style={{ marginBottom: '4px' }}>
            Date: {documentContent.coverContent.doc_date || '—'}
          </p>
          <p>Reference: {documentContent.coverContent.ref_number || '—'}</p>
        </SectionWrapper>
      </Page>

      <PageBreak />

      {/* PAGE 2: Executive Summary, Introduction, Abbreviations */}
      <Page pageNumber={2} showHeader={true}>
        {/* SECTION 1: EXECUTIVE SUMMARY */}
        <SectionWrapper
          sectionKey="executive_summary"
          isActive={isActive('executive_summary')}
          isHovered={hoveredSection === 'executive_summary'}
          onMouseEnter={() => setHoveredSection('executive_summary')}
          onMouseLeave={() => setHoveredSection(null)}
          onClick={() => handleSectionClick('executive_summary')}
          sectionRef={(el) => (sectionRefs.current['executive_summary'] = el)}
          style={sectionStyle('executive_summary')}
        >
          <h2 style={headingStyle}>
            1. Executive Summary
          </h2>
          <h3 style={subHeadingStyle}>
            1.1 About Hitachi India
          </h3>
          <p style={optionalPlaceholderStyle}>
            [Standard Hitachi boilerplate — locked]
          </p>
          <h3 style={subHeadingStyle}>
            1.2 Project Overview
          </h3>
          <p style={{ marginBottom: '12px' }}>
            {documentContent.executiveSummary?.para1
              ? stripHtml(documentContent.executiveSummary.para1)
              : <span style={requiredPlaceholderStyle}>Required — click to fill</span>}
          </p>
        </SectionWrapper>

        {/* SECTION 2: INTRODUCTION */}
        <SectionWrapper
          sectionKey="introduction"
          isActive={isActive('introduction')}
          isHovered={hoveredSection === 'introduction'}
          onMouseEnter={() => setHoveredSection('introduction')}
          onMouseLeave={() => setHoveredSection(null)}
          onClick={() => handleSectionClick('introduction')}
          sectionRef={(el) => (sectionRefs.current['introduction'] = el)}
          style={sectionStyle('introduction')}
        >
          <h2 style={headingStyle}>
            2. Introduction
          </h2>
          <p>
            This Technical Specification document has been prepared in response to the tender reference{' '}
            <strong style={documentContent.introduction?.tender_reference ? {} : requiredPlaceholderStyle}>
              {documentContent.introduction?.tender_reference || '{{TenderReference}}'}
            </strong>{' '}
            dated{' '}
            <strong style={documentContent.introduction?.tender_date ? {} : requiredPlaceholderStyle}>
              {documentContent.introduction?.tender_date || '{{TenderDate}}'}
            </strong>
            ...
          </p>
        </SectionWrapper>

        {/* SECTION 3: ABBREVIATIONS */}
        <SectionWrapper
          sectionKey="abbreviations"
          isActive={isActive('abbreviations')}
          isHovered={hoveredSection === 'abbreviations'}
          onMouseEnter={() => setHoveredSection('abbreviations')}
          onMouseLeave={() => setHoveredSection(null)}
          onClick={() => handleSectionClick('abbreviations')}
          sectionRef={(el) => (sectionRefs.current['abbreviations'] = el)}
          style={sectionStyle('abbreviations')}
        >
          <h2 style={headingStyle}>
            3. Abbreviations
          </h2>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={{ ...tableHeaderStyle, width: '60px' }}>Sr.No.</th>
                <th style={{ ...tableHeaderStyle, width: '120px' }}>Abbreviation</th>
                <th style={tableHeaderStyle}>Description</th>
              </tr>
            </thead>
            <tbody>
              {documentContent.abbreviations?.rows?.slice(0, 5).map((row: any, idx: number) => (
                <tr key={idx}>
                  <td style={tableCellStyle(idx % 2 === 0)}>{row.sr_no || idx + 1}</td>
                  <td style={tableCellStyle(idx % 2 === 0)}>{row.abbreviation || '—'}</td>
                  <td style={tableCellStyle(idx % 2 === 0)}>{row.description || '—'}</td>
                </tr>
              ))}
              {(documentContent.abbreviations?.rows?.length || 0) > 5 && (
                <tr>
                  <td colSpan={3} style={{ ...tableCellStyle(false), fontStyle: 'italic', color: '#6B7280' }}>
                    ... ({documentContent.abbreviations.rows.length - 5} more)
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </SectionWrapper>
      </Page>

      <PageBreak />

      {/* PAGE 3: Process Flow, Overview */}
      <Page pageNumber={3} showHeader={true}>
        {/* SECTION 4: PROCESS FLOW */}
        <SectionWrapper
          sectionKey="process_flow"
          isActive={isActive('process_flow')}
          isHovered={hoveredSection === 'process_flow'}
          onMouseEnter={() => setHoveredSection('process_flow')}
          onMouseLeave={() => setHoveredSection(null)}
          onClick={() => handleSectionClick('process_flow')}
          sectionRef={(el) => (sectionRefs.current['process_flow'] = el)}
          style={sectionStyle('process_flow')}
        >
          <h2 style={headingStyle}>
            4. Process Flow
          </h2>
          <p>
            {documentContent.processFlow?.text
              ? truncate(stripHtml(documentContent.processFlow.text), 200)
              : <span style={optionalPlaceholderStyle}>[Enter process flow description]</span>}
          </p>
        </SectionWrapper>

        {/* SECTION 5: OVERVIEW */}
        <SectionWrapper
          sectionKey="overview"
          isActive={isActive('overview')}
          isHovered={hoveredSection === 'overview'}
          onMouseEnter={() => setHoveredSection('overview')}
          onMouseLeave={() => setHoveredSection(null)}
          onClick={() => handleSectionClick('overview')}
          sectionRef={(el) => (sectionRefs.current['overview'] = el)}
          style={sectionStyle('overview')}
        >
          <h2 style={headingStyle}>
            5. Overview of {solutionName || '{Solution Name}'}
          </h2>
          <h3 style={subHeadingStyle}>System Objective</h3>
          <p style={{ marginBottom: '12px' }}>
            {documentContent.overview?.system_objective
              ? truncate(stripHtml(documentContent.overview.system_objective), 100)
              : <span style={optionalPlaceholderStyle}>[Enter system objective]</span>}
          </p>
          <h3 style={subHeadingStyle}>Existing System</h3>
          <p style={{ marginBottom: '12px' }}>
            {documentContent.overview?.existing_system
              ? truncate(stripHtml(documentContent.overview.existing_system), 100)
              : <span style={optionalPlaceholderStyle}>[Enter existing system details]</span>}
          </p>
        </SectionWrapper>
      </Page>

      <PageBreak />

      {/* PAGE 4: Features */}
      <Page pageNumber={4}>
        {/* SECTION 6: DESIGN SCOPE (FEATURES) */}
        <SectionWrapper
          sectionKey="features"
          isActive={isActive('features')}
          isHovered={hoveredSection === 'features'}
          onMouseEnter={() => setHoveredSection('features')}
          onMouseLeave={() => setHoveredSection(null)}
          onClick={() => handleSectionClick('features')}
          sectionRef={(el) => (sectionRefs.current['features'] = el)}
          style={sectionStyle('features')}
        >
          <h2 style={headingStyle}>
            6. Design Scope of Work
          </h2>
          {documentContent.features?.items?.slice(0, 3).map((feature: any, idx: number) => (
            <div key={idx} style={{ marginBottom: '12px' }}>
              <p style={{ fontWeight: 'bold' }}>{feature.title || `Feature ${idx + 1}`}</p>
              {feature.brief && <p style={{ fontStyle: 'italic', fontSize: '10pt' }}>{feature.brief}</p>}
              <p>{truncate(feature.description || '', 80)}</p>
            </div>
          ))}
          {(documentContent.features?.items?.length || 0) > 3 && (
            <p style={{ fontStyle: 'italic', color: '#6B7280' }}>
              ... ({documentContent.features.items.length - 3} more features)
            </p>
          )}
        </SectionWrapper>
      </Page>

      <PageBreak />

      {/* PAGE 5: Remote Support, Documentation, Training */}
      <Page pageNumber={5}>
        {/* SECTION 7: REMOTE SUPPORT */}
        <SectionWrapper
          sectionKey="remote_support"
          isActive={isActive('remote_support')}
          isHovered={hoveredSection === 'remote_support'}
          onMouseEnter={() => setHoveredSection('remote_support')}
          onMouseLeave={() => setHoveredSection(null)}
          onClick={() => handleSectionClick('remote_support')}
          sectionRef={(el) => (sectionRefs.current['remote_support'] = el)}
          style={sectionStyle('remote_support')}
        >
          <h2 style={headingStyle}>
            7. Remote Support System
          </h2>
          <p>
            {documentContent.remoteSupport?.text
              ? truncate(stripHtml(documentContent.remoteSupport.text), 150)
              : <span style={optionalPlaceholderStyle}>[Enter remote support details]</span>}
          </p>
        </SectionWrapper>

        {/* SECTION 8: DOCUMENTATION CONTROL */}
        <SectionWrapper
          sectionKey="documentation_control"
          isActive={isActive('documentation_control')}
          isHovered={hoveredSection === 'documentation_control'}
          onMouseEnter={() => setHoveredSection('documentation_control')}
          onMouseLeave={() => setHoveredSection(null)}
          onClick={() => handleSectionClick('documentation_control')}
          sectionRef={(el) => (sectionRefs.current['documentation_control'] = el)}
          style={sectionStyle('documentation_control')}
        >
          <h2 style={headingStyle}>
            8. Documentation Control
          </h2>
          <ul style={{ marginLeft: '20px' }}>
            <li>System Architecture Document</li>
            <li>User Manual</li>
            <li>Installation Guide</li>
            <li>Maintenance Manual</li>
          </ul>
        </SectionWrapper>

        {/* SECTION 9: CUSTOMER TRAINING */}
        <SectionWrapper
          sectionKey="customer_training"
          isActive={isActive('customer_training')}
          isHovered={hoveredSection === 'customer_training'}
          onMouseEnter={() => setHoveredSection('customer_training')}
          onMouseLeave={() => setHoveredSection(null)}
          onClick={() => handleSectionClick('customer_training')}
          sectionRef={(el) => (sectionRefs.current['customer_training'] = el)}
          style={sectionStyle('customer_training')}
        >
          <h2 style={headingStyle}>
            9. Customer Training
          </h2>
          <p>
            SELLER shall provide training for{' '}
            <strong>{documentContent.customerTraining?.persons || '[X]'}</strong> people for{' '}
            <strong>{documentContent.customerTraining?.days || '[Y]'}</strong> days.
          </p>
        </SectionWrapper>
      </Page>

      <PageBreak />

      {/* PAGE 6: System Config, FAT Condition, Tech Stack */}
      <Page pageNumber={6}>
        {/* SECTION 10: SYSTEM CONFIGURATION */}
        <SectionWrapper
          sectionKey="system_config"
          isActive={isActive('system_config')}
          isHovered={hoveredSection === 'system_config'}
          onMouseEnter={() => setHoveredSection('system_config')}
          onMouseLeave={() => setHoveredSection(null)}
          onClick={() => handleSectionClick('system_config')}
          sectionRef={(el) => (sectionRefs.current['system_config'] = el)}
          style={sectionStyle('system_config')}
        >
          <h2 style={headingStyle}>
            10. System Configuration
          </h2>
          <div
            style={{
              width: '100%',
              height: '80px',
              backgroundColor: '#F3F4F6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px dashed #D1D5DB',
              fontStyle: 'italic',
              color: '#6B7280',
            }}
          >
            [Architecture Diagram — To Be Inserted]
          </div>
        </SectionWrapper>

        {/* SECTION 11: FAT CONDITION */}
        <SectionWrapper
          sectionKey="fat_condition"
          isActive={isActive('fat_condition')}
          isHovered={hoveredSection === 'fat_condition'}
          onMouseEnter={() => setHoveredSection('fat_condition')}
          onMouseLeave={() => setHoveredSection(null)}
          onClick={() => handleSectionClick('fat_condition')}
          sectionRef={(el) => (sectionRefs.current['fat_condition'] = el)}
          style={sectionStyle('fat_condition')}
        >
          <h2 style={headingStyle}>
            11. FAT Condition
          </h2>
          <p>
            {documentContent.fatCondition?.text
              ? truncate(stripHtml(documentContent.fatCondition.text), 150)
              : <span style={optionalPlaceholderStyle}>[Enter FAT conditions]</span>}
          </p>
        </SectionWrapper>

        {/* SECTION 12: TECHNOLOGY STACK */}
        <SectionWrapper
          sectionKey="tech_stack"
          isActive={isActive('tech_stack')}
          isHovered={hoveredSection === 'tech_stack'}
          onMouseEnter={() => setHoveredSection('tech_stack')}
          onMouseLeave={() => setHoveredSection(null)}
          onClick={() => handleSectionClick('tech_stack')}
          sectionRef={(el) => (sectionRefs.current['tech_stack'] = el)}
          style={sectionStyle('tech_stack')}
        >
          <h2 style={headingStyle}>
            12. Technology Stack
          </h2>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={tableHeaderStyle}>Component</th>
                <th style={tableHeaderStyle}>Technology</th>
              </tr>
            </thead>
            <tbody>
              {documentContent.techStack?.rows?.slice(0, 5).map((row: any, idx: number) => (
                <tr key={idx}>
                  <td style={tableCellStyle(idx % 2 === 0)}>{row.component || '—'}</td>
                  <td style={tableCellStyle(idx % 2 === 0)}>{row.technology || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </SectionWrapper>
      </Page>

      <PageBreak />

      {/* PAGE 7: Hardware Specs, Software Specs, Third Party SW */}
      <Page pageNumber={7}>
        {/* SECTION 13: HARDWARE SPECS */}
        <SectionWrapper
          sectionKey="hardware_specs"
          isActive={isActive('hardware_specs')}
          isHovered={hoveredSection === 'hardware_specs'}
          onMouseEnter={() => setHoveredSection('hardware_specs')}
          onMouseLeave={() => setHoveredSection(null)}
          onClick={() => handleSectionClick('hardware_specs')}
          sectionRef={(el) => (sectionRefs.current['hardware_specs'] = el)}
          style={sectionStyle('hardware_specs')}
        >
          <h2 style={headingStyle}>
            13. Hardware Specifications
          </h2>
          <p style={optionalPlaceholderStyle}>
            [Table with {documentContent.hardwareSpecs?.rows?.length || 0} hardware items]
          </p>
        </SectionWrapper>

        {/* SECTION 14: SOFTWARE SPECS */}
        <SectionWrapper
          sectionKey="software_specs"
          isActive={isActive('software_specs')}
          isHovered={hoveredSection === 'software_specs'}
          onMouseEnter={() => setHoveredSection('software_specs')}
          onMouseLeave={() => setHoveredSection(null)}
          onClick={() => handleSectionClick('software_specs')}
          sectionRef={(el) => (sectionRefs.current['software_specs'] = el)}
          style={sectionStyle('software_specs')}
        >
          <h2 style={headingStyle}>
            14. Software Specifications
          </h2>
          <p style={optionalPlaceholderStyle}>
            [Table with {documentContent.softwareSpecs?.rows?.length || 0} software items]
          </p>
        </SectionWrapper>

        {/* SECTION 15: THIRD PARTY SOFTWARE */}
        <SectionWrapper
          sectionKey="third_party_sw"
          isActive={isActive('third_party_sw')}
          isHovered={hoveredSection === 'third_party_sw'}
          onMouseEnter={() => setHoveredSection('third_party_sw')}
          onMouseLeave={() => setHoveredSection(null)}
          onClick={() => handleSectionClick('third_party_sw')}
          sectionRef={(el) => (sectionRefs.current['third_party_sw'] = el)}
          style={sectionStyle('third_party_sw')}
        >
          <h2 style={headingStyle}>
            15. Third Party Software
          </h2>
          <p>{documentContent.thirdPartySw?.sw4_name || <span style={optionalPlaceholderStyle}>[Enter third party software]</span>}</p>
        </SectionWrapper>
      </Page>

      <PageBreak />

      {/* PAGE 8: Gantt Charts, Supervisors */}
      <Page pageNumber={8}>
        {/* SECTION 16: OVERALL GANTT */}
        <SectionWrapper
          sectionKey="overall_gantt"
          isActive={isActive('overall_gantt')}
          isHovered={hoveredSection === 'overall_gantt'}
          onMouseEnter={() => setHoveredSection('overall_gantt')}
          onMouseLeave={() => setHoveredSection(null)}
          onClick={() => handleSectionClick('overall_gantt')}
          sectionRef={(el) => (sectionRefs.current['overall_gantt'] = el)}
          style={sectionStyle('overall_gantt')}
        >
          <h2 style={headingStyle}>
            16. Overall Gantt Chart
          </h2>
          <div
            style={{
              width: '100%',
              height: '80px',
              backgroundColor: '#F3F4F6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px dashed #D1D5DB',
              fontStyle: 'italic',
              color: '#6B7280',
            }}
          >
            [Overall Gantt Chart — To Be Inserted]
          </div>
        </SectionWrapper>

        {/* SECTION 17: SHUTDOWN GANTT */}
        <SectionWrapper
          sectionKey="shutdown_gantt"
          isActive={isActive('shutdown_gantt')}
          isHovered={hoveredSection === 'shutdown_gantt'}
          onMouseEnter={() => setHoveredSection('shutdown_gantt')}
          onMouseLeave={() => setHoveredSection(null)}
          onClick={() => handleSectionClick('shutdown_gantt')}
          sectionRef={(el) => (sectionRefs.current['shutdown_gantt'] = el)}
          style={sectionStyle('shutdown_gantt')}
        >
          <h2 style={headingStyle}>
            17. Shutdown Gantt Chart
          </h2>
          <div
            style={{
              width: '100%',
              height: '80px',
              backgroundColor: '#F3F4F6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px dashed #D1D5DB',
              fontStyle: 'italic',
              color: '#6B7280',
            }}
          >
            [Shutdown Gantt Chart — To Be Inserted]
          </div>
        </SectionWrapper>

        {/* SECTION 18: SUPERVISORS */}
        <SectionWrapper
          sectionKey="supervisors"
          isActive={isActive('supervisors')}
          isHovered={hoveredSection === 'supervisors'}
          onMouseEnter={() => setHoveredSection('supervisors')}
          onMouseLeave={() => setHoveredSection(null)}
          onClick={() => handleSectionClick('supervisors')}
          sectionRef={(el) => (sectionRefs.current['supervisors'] = el)}
          style={sectionStyle('supervisors')}
        >
          <h2 style={headingStyle}>
            18. Supervisors
          </h2>
          <p>
            PM: <strong>{documentContent.supervisors?.pm_days || 'X'}</strong> days | Dev:{' '}
            <strong>{documentContent.supervisors?.dev_days || 'Y'}</strong> days | Comm:{' '}
            <strong>{documentContent.supervisors?.comm_days || 'Z'}</strong> days | Total:{' '}
            <strong>{documentContent.supervisors?.total_man_days || 'N'}</strong> man-days
          </p>
        </SectionWrapper>
      </Page>

      <PageBreak />

      {/* PAGE 9: Scope Definitions, Division of Engineering, Value Addition */}
      <Page pageNumber={9}>
        <SectionWrapper
          sectionKey="scope_definitions"
          isActive={isActive('scope_definitions')}
          isHovered={hoveredSection === 'scope_definitions'}
          onMouseEnter={() => setHoveredSection('scope_definitions')}
          onMouseLeave={() => setHoveredSection(null)}
          onClick={() => handleSectionClick('scope_definitions')}
          sectionRef={(el) => (sectionRefs.current['scope_definitions'] = el)}
          style={sectionStyle('scope_definitions')}
        >
          <h2 style={headingStyle}>
            19. Scope Definitions
          </h2>
          <p style={optionalPlaceholderStyle}>[Scope definitions content]</p>
        </SectionWrapper>

        <SectionWrapper
          sectionKey="division_of_eng"
          isActive={isActive('division_of_eng')}
          isHovered={hoveredSection === 'division_of_eng'}
          onMouseEnter={() => setHoveredSection('division_of_eng')}
          onMouseLeave={() => setHoveredSection(null)}
          onClick={() => handleSectionClick('division_of_eng')}
          sectionRef={(el) => (sectionRefs.current['division_of_eng'] = el)}
          style={sectionStyle('division_of_eng')}
        >
          <h2 style={headingStyle}>
            20. Division of Engineering
          </h2>
          <p style={optionalPlaceholderStyle}>[Division of engineering content]</p>
        </SectionWrapper>

        <SectionWrapper
          sectionKey="value_addition"
          isActive={isActive('value_addition')}
          isHovered={hoveredSection === 'value_addition'}
          onMouseEnter={() => setHoveredSection('value_addition')}
          onMouseLeave={() => setHoveredSection(null)}
          onClick={() => handleSectionClick('value_addition')}
          sectionRef={(el) => (sectionRefs.current['value_addition'] = el)}
          style={sectionStyle('value_addition')}
        >
          <h2 style={headingStyle}>
            21. Value Addition
          </h2>
          <p style={optionalPlaceholderStyle}>[Value addition content]</p>
        </SectionWrapper>
      </Page>

      <PageBreak />

      {/* PAGE 10: Work Completion, Buyer Obligations, Exclusion List, Buyer Prerequisites */}
      <Page pageNumber={10}>
        <SectionWrapper
          sectionKey="work_completion"
          isActive={isActive('work_completion')}
          isHovered={hoveredSection === 'work_completion'}
          onMouseEnter={() => setHoveredSection('work_completion')}
          onMouseLeave={() => setHoveredSection(null)}
          onClick={() => handleSectionClick('work_completion')}
          sectionRef={(el) => (sectionRefs.current['work_completion'] = el)}
          style={sectionStyle('work_completion')}
        >
          <h2 style={headingStyle}>
            22. Work Completion
          </h2>
          <p style={optionalPlaceholderStyle}>[Work completion content]</p>
        </SectionWrapper>

        <SectionWrapper
          sectionKey="buyer_obligations"
          isActive={isActive('buyer_obligations')}
          isHovered={hoveredSection === 'buyer_obligations'}
          onMouseEnter={() => setHoveredSection('buyer_obligations')}
          onMouseLeave={() => setHoveredSection(null)}
          onClick={() => handleSectionClick('buyer_obligations')}
          sectionRef={(el) => (sectionRefs.current['buyer_obligations'] = el)}
          style={sectionStyle('buyer_obligations')}
        >
          <h2 style={headingStyle}>
            23. Buyer Obligations
          </h2>
          <p style={optionalPlaceholderStyle}>[Buyer obligations content]</p>
        </SectionWrapper>

        <SectionWrapper
          sectionKey="exclusion_list"
          isActive={isActive('exclusion_list')}
          isHovered={hoveredSection === 'exclusion_list'}
          onMouseEnter={() => setHoveredSection('exclusion_list')}
          onMouseLeave={() => setHoveredSection(null)}
          onClick={() => handleSectionClick('exclusion_list')}
          sectionRef={(el) => (sectionRefs.current['exclusion_list'] = el)}
          style={sectionStyle('exclusion_list')}
        >
          <h2 style={headingStyle}>
            24. Exclusion List
          </h2>
          <p style={optionalPlaceholderStyle}>[Exclusion list content]</p>
        </SectionWrapper>

        <SectionWrapper
          sectionKey="buyer_prerequisites"
          isActive={isActive('buyer_prerequisites')}
          isHovered={hoveredSection === 'buyer_prerequisites'}
          onMouseEnter={() => setHoveredSection('buyer_prerequisites')}
          onMouseLeave={() => setHoveredSection(null)}
          onClick={() => handleSectionClick('buyer_prerequisites')}
          sectionRef={(el) => (sectionRefs.current['buyer_prerequisites'] = el)}
          style={sectionStyle('buyer_prerequisites')}
        >
          <h2 style={headingStyle}>
            25. Buyer Prerequisites
          </h2>
          <p style={optionalPlaceholderStyle}>[Buyer prerequisites content]</p>
        </SectionWrapper>
      </Page>

      <PageBreak />

      {/* PAGE 11: Binding Conditions, Cybersecurity, Disclaimer, PoC */}
      <Page pageNumber={11}>
        <SectionWrapper
          sectionKey="binding_conditions"
          isActive={isActive('binding_conditions')}
          isHovered={hoveredSection === 'binding_conditions'}
          onMouseEnter={() => setHoveredSection('binding_conditions')}
          onMouseLeave={() => setHoveredSection(null)}
          onClick={() => handleSectionClick('binding_conditions')}
          sectionRef={(el) => (sectionRefs.current['binding_conditions'] = el)}
          style={sectionStyle('binding_conditions')}
        >
          <h2 style={headingStyle}>
            26. Binding Conditions
          </h2>
          <p style={optionalPlaceholderStyle}>🔒 [Standard legal content — locked]</p>
        </SectionWrapper>

        <SectionWrapper
          sectionKey="cybersecurity"
          isActive={isActive('cybersecurity')}
          isHovered={hoveredSection === 'cybersecurity'}
          onMouseEnter={() => setHoveredSection('cybersecurity')}
          onMouseLeave={() => setHoveredSection(null)}
          onClick={() => handleSectionClick('cybersecurity')}
          sectionRef={(el) => (sectionRefs.current['cybersecurity'] = el)}
          style={sectionStyle('cybersecurity')}
        >
          <h2 style={headingStyle}>
            27. Cybersecurity
          </h2>
          <p style={optionalPlaceholderStyle}>🔒 [Standard legal content — locked]</p>
        </SectionWrapper>

        <SectionWrapper
          sectionKey="disclaimer"
          isActive={isActive('disclaimer')}
          isHovered={hoveredSection === 'disclaimer'}
          onMouseEnter={() => setHoveredSection('disclaimer')}
          onMouseLeave={() => setHoveredSection(null)}
          onClick={() => handleSectionClick('disclaimer')}
          sectionRef={(el) => (sectionRefs.current['disclaimer'] = el)}
          style={sectionStyle('disclaimer')}
        >
          <h2 style={headingStyle}>
            28. Disclaimer
          </h2>
          <p style={optionalPlaceholderStyle}>🔒 [Standard legal content — locked]</p>
        </SectionWrapper>

        <SectionWrapper
          sectionKey="poc"
          isActive={isActive('poc')}
          isHovered={hoveredSection === 'poc'}
          onMouseEnter={() => setHoveredSection('poc')}
          onMouseLeave={() => setHoveredSection(null)}
          onClick={() => handleSectionClick('poc')}
          sectionRef={(el) => (sectionRefs.current['poc'] = el)}
          style={sectionStyle('poc')}
        >
          <h2 style={headingStyle}>
            29. Proof of Concept
          </h2>
          <p style={{ fontWeight: 'bold' }}>{documentContent.poc?.name || '[POC Name]'}</p>
          <p>
            {documentContent.poc?.description
              ? truncate(documentContent.poc.description, 100)
              : <span style={optionalPlaceholderStyle}>[Enter POC description]</span>}
          </p>
        </SectionWrapper>
      </Page>
    </div>
  </div>
</>
  );
});

DocumentPreview.displayName = 'DocumentPreview';

export default DocumentPreview;

