import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getImages } from '../../api/images';
import { useProjectStore } from '../../store/project.store';
import {
  BINDING_CONDITIONS_PARAGRAPHS,
  BUYER_OBLIGATION_ITEMS,
  CYBERSECURITY_DISCLAIMER_PARAGRAPHS,
  DISCLAIMER_SECTIONS,
  DOCUMENTATION_CONTROL_ITEMS,
  EXECUTIVE_SUMMARY_PARAGRAPHS,
  EXCLUSION_INTRO_PARAGRAPHS,
  EXCLUSION_STANDARD_ITEMS,
  INTRODUCTION_PARAGRAPHS,
  POC_PARAGRAPHS,
  REMOTE_SUPPORT_PARAGRAPHS,
  RESPONSIBILITY_MATRIX_ROWS,
  SCOPE_SUPPLY_DEFINITION_LINES,
  VALUE_ADDITION_INTRO,
  WORK_COMPLETION_CRITERIA,
  WORK_COMPLETION_PARAGRAPHS,
} from './templateContent';

interface DocumentPreviewProps {
  projectId: string;
  activeSectionKey: string | null;
  sectionContents: Record<string, Record<string, any>>;
  onSectionClick?: (sectionKey: string) => void;
}

type PreviewImageType = 'architecture' | 'gantt_overall' | 'gantt_shutdown';
type PreviewImageMap = Partial<Record<PreviewImageType, string>>;

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

const ZOOM_LEVELS = [0.5, 0.75, 1, 1.25];

const stripHtml = (html: string): string => {
  if (!html) return '';
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return (tmp.textContent || tmp.innerText || '').replace(/\s+/g, ' ').trim();
};

const resolveTemplateText = (
  text: string,
  replacements: Record<string, string>
): string => {
  let resolved = text;

  Object.entries(replacements).forEach(([key, value]) => {
    const safeValue = value || '';
    resolved = resolved.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), safeValue);
  });

  return resolved.replace(/\s+/g, ' ').trim();
};

const filterFilledItems = (items?: string[]) =>
  (items || []).map((item) => item.trim()).filter(Boolean);

const PageBreak: React.FC = () => (
  <div
    className="page-break"
    style={{
      pageBreakAfter: 'always',
      breakAfter: 'page',
      height: '48px',
      margin: '48px -97px',
      backgroundColor: '#E8E8E8',
      borderTop: '1px solid #D1D5DB',
      borderBottom: '1px solid #D1D5DB',
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.06)',
    }}
  >
    <span
      style={{
        fontSize: '10px',
        color: '#9CA3AF',
        fontStyle: 'italic',
        fontWeight: 500,
        letterSpacing: '2px',
      }}
    >
      • • •
    </span>
  </div>
);

const SectionWrapper: React.FC<SectionWrapperProps> = ({
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
        Click to edit {'->'}
      </div>
    )}
    {children}
  </div>
);

const DocumentPreview: React.FC<DocumentPreviewProps> = React.memo(
  ({ projectId, activeSectionKey, sectionContents, onSectionClick }) => {
    const {
      solutionName,
      solutionFullName,
      clientName,
      clientLocation,
      sectionCompletion,
    } = useProjectStore();

    const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const [hoveredSection, setHoveredSection] = useState<string | null>(null);
    const [imageUrls, setImageUrls] = useState<PreviewImageMap>({});
    const [zoom, setZoom] = useState<number>(() => {
      const saved = localStorage.getItem('documentPreviewZoom');
      return saved ? parseFloat(saved) : 1;
    });

    // Counter management for section and subsection numbering
    const sectionCounter = useRef<number>(0);
    const subsectionCounter = useRef<number>(0);

    const completedCount = useMemo(() => {
      const excludedSections = [
        'binding_conditions',
        'cybersecurity',
        'disclaimer',
        'scope_definitions',
      ];

      return Object.entries(sectionCompletion).filter(
        ([key, isComplete]) => !excludedSections.includes(key) && isComplete
      ).length;
    }, [sectionCompletion]);

    const getSectionContent = (key: string): Record<string, any> => sectionContents[key] || {};

    useEffect(() => {
      if (activeSectionKey && sectionRefs.current[activeSectionKey]) {
        sectionRefs.current[activeSectionKey]?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }
    }, [activeSectionKey]);

    useEffect(() => {
      localStorage.setItem('documentPreviewZoom', zoom.toString());
    }, [zoom]);

    useEffect(() => {
      let cancelled = false;

      const loadImages = async () => {
        try {
          const images = await getImages(projectId);
          if (cancelled) return;

          const next: PreviewImageMap = {};
          images.forEach((image) => {
            if (
              image.type === 'architecture' ||
              image.type === 'gantt_overall' ||
              image.type === 'gantt_shutdown'
            ) {
              next[image.type] = image.url;
            }
          });
          setImageUrls(next);
        } catch (error) {
          if (!cancelled) {
            setImageUrls({});
          }
          console.error('Failed to load preview images:', error);
        }
      };

      const handleImagesChanged = (event: Event) => {
        const customEvent = event as CustomEvent<{ projectId?: string }>;
        if (!customEvent.detail?.projectId || customEvent.detail.projectId === projectId) {
          void loadImages();
        }
      };

      void loadImages();
      window.addEventListener('project-images-changed', handleImagesChanged as EventListener);

      return () => {
        cancelled = true;
        window.removeEventListener(
          'project-images-changed',
          handleImagesChanged as EventListener
        );
      };
    }, [projectId]);

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

    const documentContent = useMemo(() => {
      return {
        coverContent: getSectionContent('cover'),
        revisionHistory: getSectionContent('revision_history'),
        executiveSummary: getSectionContent('executive_summary'),
        introduction: getSectionContent('introduction'),
        abbreviations: getSectionContent('abbreviations'),
        processFlow: getSectionContent('process_flow'),
        overview: getSectionContent('overview'),
        features: getSectionContent('features'),
        remoteSupport: getSectionContent('remote_support'),
        documentationControl: getSectionContent('documentation_control'),
        customerTraining: getSectionContent('customer_training'),
        techStack: getSectionContent('tech_stack'),
        hardwareSpecs: getSectionContent('hardware_specs'),
        softwareSpecs: getSectionContent('software_specs'),
        thirdPartySw: getSectionContent('third_party_sw'),
        fatCondition: getSectionContent('fat_condition'),
        supervisors: getSectionContent('supervisors'),
        divisionOfEng: getSectionContent('division_of_eng'),
        workCompletion: getSectionContent('work_completion'),
        buyerObligations: getSectionContent('buyer_obligations'),
        exclusionList: getSectionContent('exclusion_list'),
        valueAddition: getSectionContent('value_addition'),
        buyerPrerequisites: getSectionContent('buyer_prerequisites'),
        poc: getSectionContent('poc'),
      };
    }, [sectionContents]);

    const coverSolutionName =
      documentContent.coverContent.solution_full_name || solutionFullName || solutionName;
    const coverClientName = documentContent.coverContent.client_name || clientName;
    const coverClientLocation = documentContent.coverContent.client_location || clientLocation;
    const coverRefNumber =
      documentContent.coverContent.ref_number || '26/XXXX/XXXXX/v0';
    const coverDate = documentContent.coverContent.doc_date || '23rd Jan 2026';
    const coverVersion = documentContent.coverContent.doc_version || '0';

    const revisionRows =
      documentContent.revisionHistory.rows?.length > 0
        ? documentContent.revisionHistory.rows
        : [
            {
              sr_no: 1,
              revised_by: '',
              checked_by: '',
              approved_by: '',
              details: 'First issue',
              date: '23-01-2026',
              rev_no: '0',
            },
          ];

    const techRows = documentContent.techStack.rows || [];
    const hardwareRows = documentContent.hardwareSpecs.rows || [];
    const softwareRows = documentContent.softwareSpecs.rows || [];
    const featureItems = documentContent.features.items || [];
    const documentationControlCustom = filterFilledItems(
      documentContent.documentationControl.custom_items
    );
    const workCompletionCustom = filterFilledItems(
      documentContent.workCompletion.custom_items
    );
    const buyerObligationCustom = filterFilledItems(
      documentContent.buyerObligations.custom_items
    );
    const exclusionCustom = filterFilledItems(documentContent.exclusionList.custom_items);
    const buyerPrerequisites = filterFilledItems(documentContent.buyerPrerequisites.items);

    const templateReplacements = useMemo(
      () => ({
        ExecutiveSummaryPara1: stripHtml(documentContent.executiveSummary.para1 || ''),
        SolutionName: solutionName || '{SolutionName}',
        SolutionFullName: coverSolutionName || '{SolutionFullName}',
        ClientName: coverClientName || '{ClientName}',
        CLIENTNAME: coverClientName || '{CLIENTNAME}',
        ClientLocation: coverClientLocation || '{ClientLocation}',
        CLIENTLOCATION: coverClientLocation || '{CLIENTLOCATION}',
        ClientAbbreviation: coverClientName || '{ClientAbbreviation}',
        TenderReference:
          documentContent.introduction.tender_reference || '{TenderReference}',
        TenderDate: documentContent.introduction.tender_date || '{TenderDate}',
        ProcessFlowDescription:
          stripHtml(documentContent.processFlow.text || '') || '{ProcessFlowDescription}',
        SystemObjective:
          stripHtml(documentContent.overview.system_objective || '') || '{SystemObjective}',
        ExistingSystemDescription:
          stripHtml(documentContent.overview.existing_system || '') ||
          '{ExistingSystemDescription}',
        IntegrationDescription:
          stripHtml(documentContent.overview.integration || '') ||
          '{IntegrationDescription}',
        TangibleBenefits:
          stripHtml(documentContent.overview.tangible_benefits || '') || '{TangibleBenefits}',
        IntangibleBenefits:
          stripHtml(documentContent.overview.intangible_benefits || '') ||
          '{IntangibleBenefits}',
        TrainingPersons:
          documentContent.customerTraining.persons || '[TrainingPersons]',
        TrainingDays: documentContent.customerTraining.days || '[TrainingDays]',
        FATCondition:
          stripHtml(documentContent.fatCondition.text || '') || '{FATCondition}',
        ValueAddedOfferings:
          stripHtml(documentContent.valueAddition.text || '') || '{ValueAddedOfferings}',
        PMDays: documentContent.supervisors.pm_days || '[PMDays]',
        DevDays: documentContent.supervisors.dev_days || '[DevDays]',
        CommDays: documentContent.supervisors.comm_days || '[CommDays]',
        TotalManDays: documentContent.supervisors.total_man_days || '[TotalManDays]',
        SW3_Name: softwareRows[2]?.name || '{SW3_Name}',
        TS4_Component: techRows[3]?.component || '{TS4_Component}',
        TS2_Technology: techRows[1]?.technology || '{TS2_Technology}',
        POCName: documentContent.poc.name || '[POC Name]',
        POCDescription:
          stripHtml(documentContent.poc.description || '') || '[POC Description]',
      }),
      [
        coverClientLocation,
        coverClientName,
        coverSolutionName,
        documentContent.customerTraining.days,
        documentContent.customerTraining.persons,
        documentContent.executiveSummary.para1,
        documentContent.fatCondition.text,
        documentContent.introduction.tender_date,
        documentContent.introduction.tender_reference,
        documentContent.overview.existing_system,
        documentContent.overview.integration,
        documentContent.overview.intangible_benefits,
        documentContent.overview.system_objective,
        documentContent.overview.tangible_benefits,
        documentContent.poc.description,
        documentContent.poc.name,
        documentContent.processFlow.text,
        documentContent.supervisors.comm_days,
        documentContent.supervisors.dev_days,
        documentContent.supervisors.pm_days,
        documentContent.supervisors.total_man_days,
        documentContent.valueAddition.text,
        softwareRows,
        solutionName,
        techRows,
      ]
    );

    const resolvedMatrixRows = useMemo(
      () =>
        RESPONSIBILITY_MATRIX_ROWS.map((row) =>
          row.map((cell) => resolveTemplateText(cell, templateReplacements))
        ),
      [templateReplacements]
    );

    const resolvedExclusionItems = useMemo(() => {
      const custom = [...exclusionCustom];

      return [
        EXCLUSION_STANDARD_ITEMS[0],
        EXCLUSION_STANDARD_ITEMS[1],
        EXCLUSION_STANDARD_ITEMS[2],
        EXCLUSION_STANDARD_ITEMS[3],
        custom[0],
        custom[1],
        EXCLUSION_STANDARD_ITEMS[4],
        EXCLUSION_STANDARD_ITEMS[5],
        EXCLUSION_STANDARD_ITEMS[6],
        EXCLUSION_STANDARD_ITEMS[7],
        custom[2],
        EXCLUSION_STANDARD_ITEMS[8],
        EXCLUSION_STANDARD_ITEMS[9],
        ...custom.slice(3),
      ].filter(Boolean);
    }, [exclusionCustom]);

    const isActive = (sectionKey: string) => activeSectionKey === sectionKey;

    const sectionStyle = (sectionKey: string): React.CSSProperties => ({
      position: 'relative',
      cursor: onSectionClick ? 'pointer' : 'default',
      transition: 'all 0.2s ease',
      marginBottom: '24px',
      ...(isActive(sectionKey) && sectionKey !== 'cover' && {
        background: '#FFF9C4',
        borderLeft: '3px solid #E60012',
        borderRadius: '2px',
        paddingLeft: '8px',
        marginLeft: '-8px',
      }),
      ...(isActive(sectionKey) && sectionKey === 'cover' && {
        background: '#FFF9C4',
      }),
      ...(hoveredSection === sectionKey && !isActive(sectionKey) && sectionKey !== 'cover' && {
        border: '1px solid #BFDBFE',
        borderRadius: '2px',
        padding: '4px',
        margin: '-4px -4px 20px',
      }),
      ...(hoveredSection === sectionKey && !isActive(sectionKey) && sectionKey === 'cover' && {
        opacity: 0.9,
      }),
    });

    // ─── STYLE CONSTANTS (updated to match TS_Template_original.docx) ───────

    // Document font: Hitachi Sans with Arial fallback (matches template font)
    const DOC_FONT = "'Hitachi Sans', Arial, sans-serif";

    const heading1BurgundyStyle: React.CSSProperties = {
      fontFamily: DOC_FONT,
      fontSize: '16pt',
      fontWeight: 'bold',
      color: '#000000',          // Changed to black
      marginTop: '16px',         // 12pt space-before (matches template)
      marginBottom: '12px',
      textTransform: 'uppercase',
    };

    const heading1RedStyle: React.CSSProperties = {
      fontFamily: DOC_FONT,
      fontSize: '16pt',
      fontWeight: 'bold',
      color: '#000000',          // Changed to black
      marginTop: '16px',
      marginBottom: '12px',
      textTransform: 'uppercase',
    };

    const heading1BlueStyle: React.CSSProperties = {
      fontFamily: DOC_FONT,
      fontSize: '16pt',
      fontWeight: 'bold',
      color: '#000000',          // Changed to black
      marginTop: '16px',
      marginBottom: '12px',
      textTransform: 'uppercase',
    };

    const heading2BlackStyle: React.CSSProperties = {
      fontFamily: DOC_FONT,
      fontSize: '12pt',
      fontWeight: 'bold',
      color: '#000000',
      marginTop: '12px',
      marginBottom: '10px',
    };

    const heading2RedStyle: React.CSSProperties = {
      fontFamily: DOC_FONT,
      fontSize: '12pt',
      fontWeight: 'bold',
      color: '#000000',          // Changed to black
      marginTop: '12px',
      marginBottom: '10px',
      textTransform: 'uppercase',
    };

    const heading2BlueStyle: React.CSSProperties = {
      fontFamily: DOC_FONT,
      fontSize: '12pt',
      fontWeight: 'bold',
      color: '#000000',          // Changed to black
      marginTop: '12px',
      marginBottom: '10px',
      textTransform: 'uppercase',
    };

    const heading3RedStyle: React.CSSProperties = {
      fontFamily: DOC_FONT,
      fontSize: '11pt',
      fontWeight: 'bold',
      color: '#000000',          // Changed to black
      marginTop: '10px',
      marginBottom: '8px',
    };

    // Body text: justified alignment matches template (WD_ALIGN_PARAGRAPH.JUSTIFY)
    const bodyParagraphStyle: React.CSSProperties = {
      marginBottom: '8px',
      textAlign: 'justify',
    };

    const listParagraphStyle: React.CSSProperties = {
      ...bodyParagraphStyle,
      marginLeft: '16px',
    };

    const labelParagraphStyle: React.CSSProperties = {
      ...bodyParagraphStyle,
      fontWeight: 'bold',
      marginBottom: '4px',
      textAlign: 'left',
    };

    const noteParagraphStyle: React.CSSProperties = {
      marginBottom: '8px',
      fontSize: '10pt',
      fontStyle: 'italic',
      color: '#4F81BD',          // Blue color for notes
      textAlign: 'left',
    };

    const tableStyle: React.CSSProperties = {
      width: '100%',
      borderCollapse: 'collapse',
      fontSize: '10pt',
      marginBottom: '12px',
    };

    // Base table header - no background (overridden per-table below)
    const tableHeaderStyle: React.CSSProperties = {
      fontWeight: 'bold',
      padding: '4px 8px',
      border: '1px solid #000',
      textAlign: 'left',
      verticalAlign: 'top',
    };

    const tableCellStyle: React.CSSProperties = {
      padding: '4px 8px',
      border: '1px solid #000',
      verticalAlign: 'top',
    };

    const matrixCellStyle: React.CSSProperties = {
      padding: '3px 4px',
      border: '1px solid #000',
      verticalAlign: 'top',
      fontSize: '8.5pt',
      textAlign: 'center',
    };

    const matrixItemCellStyle: React.CSSProperties = {
      ...matrixCellStyle,
      textAlign: 'left',
    };

    const placeholderStyle: React.CSSProperties = {
      fontStyle: 'italic',
      color: '#6B7280',
    };

    const imageFrameStyle: React.CSSProperties = {
      width: '100%',
      minHeight: '180px',
      border: '1px solid #000',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#F9FAFB',
      marginBottom: '10px',
      overflow: 'hidden',
    };

    const renderTemplateParagraphs = (
      paragraphs: string[],
      style: React.CSSProperties = bodyParagraphStyle
    ) =>
      paragraphs.map((paragraph, index) => (
        <p key={`${paragraph}-${index}`} style={style}>
          {resolveTemplateText(paragraph, templateReplacements)}
        </p>
      ));

    const renderImageOrPlaceholder = (
      imageType: PreviewImageType,
      placeholderText: string,
      alt: string
    ) => {
      const imageUrl = imageUrls[imageType];

      if (imageUrl) {
        return (
          <div style={imageFrameStyle}>
            <img
              src={imageUrl}
              alt={alt}
              style={{
                width: '100%',
                display: 'block',
                objectFit: 'contain',
              }}
            />
          </div>
        );
      }

      return (
        <div style={imageFrameStyle}>
          <span style={placeholderStyle}>{placeholderText}</span>
        </div>
      );
    };

    const renderSpecLines = (row: Record<string, any>) => {
      const lines = [
        row.specs_line1,
        row.specs_line2,
        row.specs_line3,
        row.specs_line4,
      ].filter(Boolean);

      if (lines.length === 0) {
        return <span style={placeholderStyle}>[Specifications pending]</span>;
      }

      return (
        <div>
          {lines.map((line) => (
            <div key={line}>{line}</div>
          ))}
        </div>
      );
    };

    const formatSoftwareName = (row: Record<string, any>, index: number) => {
      const name = row.name || '';

      if (!name) {
        return <span style={placeholderStyle}>[Software name pending]</span>;
      }

      if (index === 0) return `${name} (5 CAL)`;
      if (index === 3) return `${name} (5 CAL) / Other`;
      return name;
    };

    const handleSectionClick = (sectionKey: string) => {
      if (onSectionClick) {
        onSectionClick(sectionKey);
      }
    };

    // Helper functions for section and subsection numbering
    const resetCounters = () => {
      sectionCounter.current = 0;
      subsectionCounter.current = 0;
    };

    const getNextSectionNumber = (): number => {
      sectionCounter.current += 1;
      subsectionCounter.current = 0;
      return sectionCounter.current;
    };

    const getNextSubsectionNumber = (): number => {
      subsectionCounter.current += 1;
      return subsectionCounter.current;
    };

    const formatHeadingWithNumber = (text: string, number: string): string => {
      return `${number} ${text}`;
    };

    // Reset counters at the start of each render
    resetCounters();

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
            /* Ensure page breaks work in print and hide visual indicator */
            .page-break {
              page-break-after: always;
              break-after: page;
              height: 0 !important;
              margin: 0 !important;
              padding: 0 !important;
              border: none !important;
              background: none !important;
              box-shadow: none !important;
            }
            .page-break span {
              display: none !important;
            }
          }
          
          @media screen {
            /* Show page break indicator on screen only */
            .page-break {
              background-color: #E8E8E8;
              border-top: 1px solid #D1D5DB;
              border-bottom: 1px solid #D1D5DB;
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
              -
            </button>
            <span
              style={{
                fontSize: '14px',
                fontWeight: 500,
                minWidth: '50px',
                textAlign: 'center',
              }}
            >
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
                cursor:
                  zoom === ZOOM_LEVELS[ZOOM_LEVELS.length - 1]
                    ? 'not-allowed'
                    : 'pointer',
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
            Preview - {completedCount} / 27 complete
          </div>

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
            {/* ── A4/Letter page: 21.59cm wide, 2.54cm margins = 96px margin ── */}
            <div
              style={{
                width: '816px',
                minHeight: '1056px',
                backgroundColor: '#FFFFFF',
                margin: '0 auto',
                padding: '97px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                // Hitachi Sans is the template font; Arial is the web fallback
                fontFamily: DOC_FONT,
                fontSize: '11pt',
                lineHeight: '1.5',
              }}
            >
              {/* ── COVER PAGE ── */}
              <SectionWrapper
                sectionKey="cover"
                isActive={isActive('cover')}
                isHovered={hoveredSection === 'cover'}
                onMouseEnter={() => setHoveredSection('cover')}
                onMouseLeave={() => setHoveredSection(null)}
                onClick={() => handleSectionClick('cover')}
                sectionRef={(el) => (sectionRefs.current.cover = el)}
                style={{
                  ...sectionStyle('cover'),
                  // Cover box: black border, cream/yellow background (matches Word template)
                  border: '2px solid #000000',
                  backgroundColor: '#FFFFF0',
                  width: '78%',
                  minHeight: '360px',
                  margin: '0 auto 48px',
                  padding: '44px 32px',
                  textAlign: 'center',
                }}
              >
                <h1
                  style={{
                    fontFamily: DOC_FONT,
                    fontSize: '18pt',
                    fontWeight: 'bold',
                    marginBottom: '20px',
                  }}
                >
                  TECHNICAL SPECIFICATION
                </h1>
                <p
                  style={{
                    fontFamily: DOC_FONT,
                    fontSize: '20pt',
                    fontWeight: 'bold',
                    marginBottom: '14px',
                  }}
                >
                  {coverSolutionName || '{SolutionFullName}'}
                </p>
                <p
                  style={{
                    fontFamily: DOC_FONT,
                    fontSize: '14pt',
                    fontWeight: 'bold',
                    marginBottom: '10px',
                  }}
                >
                  FOR
                </p>
                <p
                  style={{
                    fontFamily: DOC_FONT,
                    fontSize: '14pt',
                    fontWeight: 'bold',
                    marginBottom: '6px',
                  }}
                >
                  {coverClientName || '{CLIENTNAME}'}
                </p>
                <p
                  style={{
                    fontFamily: DOC_FONT,
                    fontSize: '14pt',
                    fontWeight: 'bold',
                    marginBottom: '28px',
                  }}
                >
                  {coverClientLocation || '{CLIENTLOCATION}'}
                </p>
                <p
                  style={{
                    fontFamily: DOC_FONT,
                    fontSize: '12pt',
                    marginBottom: '12px',
                  }}
                >
                  (Ref No - {coverRefNumber})
                </p>
                <p
                  style={{
                    fontFamily: DOC_FONT,
                    fontSize: '12pt',
                    fontWeight: 'bold',
                    marginBottom: '6px',
                  }}
                >
                  {coverDate} Ver. {coverVersion}
                </p>
                <p
                  style={{
                    fontFamily: DOC_FONT,
                    fontSize: '12pt',
                    fontWeight: 'bold',
                    marginBottom: '6px',
                  }}
                >
                  Hitachi India Pvt Ltd.
                </p>
                <p
                  style={{
                    fontFamily: DOC_FONT,
                    fontSize: '12pt',
                    marginBottom: 0,
                  }}
                >
                  www.hitachi.co.in | sales.paeg@hitachi.co.in
                </p>
              </SectionWrapper>

              {/* Page Break: End of Page 1 (Cover) */}
              <PageBreak />

              {/* ── REVISION HISTORY ── */}
              <SectionWrapper
                sectionKey="revision_history"
                isActive={isActive('revision_history')}
                isHovered={hoveredSection === 'revision_history'}
                onMouseEnter={() => setHoveredSection('revision_history')}
                onMouseLeave={() => setHoveredSection(null)}
                onClick={() => handleSectionClick('revision_history')}
                sectionRef={(el) => (sectionRefs.current.revision_history = el)}
                style={sectionStyle('revision_history')}
              >
                {/* "REVISION HISTORY:" is Normal style + #EE0000 bold in template */}
                <h2 style={heading2RedStyle}>REVISION HISTORY:</h2>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      {/* Revision history table has NO header shading in template */}
                      <th style={tableHeaderStyle}>Sr. No.</th>
                      <th style={tableHeaderStyle}>Revised By</th>
                      <th style={tableHeaderStyle}>Checked By</th>
                      <th style={tableHeaderStyle}>Approved By (QMS)</th>
                      <th style={tableHeaderStyle}>Details</th>
                      <th style={tableHeaderStyle}>Date</th>
                      <th style={tableHeaderStyle}>Rev No.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {revisionRows.map((row: any, index: number) => (
                      <tr key={`revision-row-${index}`}>
                        <td style={tableCellStyle}>{row.sr_no || index + 1}</td>
                        <td style={tableCellStyle}>{row.revised_by || ''}</td>
                        <td style={tableCellStyle}>{row.checked_by || ''}</td>
                        <td style={tableCellStyle}>{row.approved_by || ''}</td>
                        <td style={tableCellStyle}>{row.details || ''}</td>
                        <td style={tableCellStyle}>{row.date || ''}</td>
                        <td style={tableCellStyle}>{row.rev_no || ''}</td>
                      </tr>
                    ))}
                    {revisionRows.length < 4 &&
                      Array.from({ length: 4 - revisionRows.length }).map((_, index) => (
                        <tr key={`empty-revision-row-${index}`}>
                          <td style={tableCellStyle}>&nbsp;</td>
                          <td style={tableCellStyle}>&nbsp;</td>
                          <td style={tableCellStyle}>&nbsp;</td>
                          <td style={tableCellStyle}>&nbsp;</td>
                          <td style={tableCellStyle}>&nbsp;</td>
                          <td style={tableCellStyle}>&nbsp;</td>
                          <td style={tableCellStyle}>&nbsp;</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                <p style={{ color: '#000000', fontSize: '9pt', marginBottom: '4px' }}>
                  Copyright © 2026 Hitachi India Pvt. Ltd.
                </p>
                <p style={{ ...noteParagraphStyle, color: '#000000', fontSize: '8.5pt', lineHeight: '1.3' }}>
                  All rights in this work are strictly reserved by the producer and the owner. Any unauthorized use of this material—including, but not limited to, copying, reproduction, hiring, lending, public performance, broadcasting (including communication to the public or via the internet), or transmission by any distribution or diffusion service, whether in whole or in part—is strictly prohibited. This work contains confidential and/or proprietary information. The information and ideas contained herein are provided solely for the use of the intended recipient. All content remains the exclusive property of Hitachi India and may not be disclosed, shared, or communicated to any third party, in any form or by any means, without prior written authorization.
                </p>
              </SectionWrapper>

              <div style={{ marginBottom: '32px' }}>
                <h2 style={heading2RedStyle}>TABLE OF CONTENTS</h2>
                <p style={placeholderStyle}>[Auto-generated table of contents]</p>
              </div>

              {/* Page Break: End of Page 2-4 (Revision History / Legal / TOC) */}
              <PageBreak />

              {/* ── EXECUTIVE SUMMARY ── */}
              <SectionWrapper
                sectionKey="executive_summary"
                isActive={isActive('executive_summary')}
                isHovered={hoveredSection === 'executive_summary'}
                onMouseEnter={() => setHoveredSection('executive_summary')}
                onMouseLeave={() => setHoveredSection(null)}
                onClick={() => handleSectionClick('executive_summary')}
                sectionRef={(el) => (sectionRefs.current.executive_summary = el)}
                style={sectionStyle('executive_summary')}
              >
                {/* Heading 1, burgundy #943634 — matches template */}
                <h1 style={heading1BurgundyStyle}>
                  {formatHeadingWithNumber('EXECUTIVE SUMMARY', `${getNextSectionNumber()}.`)}
                </h1>
                {renderTemplateParagraphs(EXECUTIVE_SUMMARY_PARAGRAPHS)}
                <p style={bodyParagraphStyle}>Some of our clients include:</p>
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    marginBottom: '18px',
                  }}
                >
                  <tbody>
                    {[0, 1].map((rowIndex) => (
                      <tr key={`logo-row-${rowIndex}`}>
                        {[0, 1, 2].map((columnIndex) => (
                          <td
                            key={`logo-cell-${rowIndex}-${columnIndex}`}
                            style={{
                              border: '1px solid #D1D5DB',
                              height: '54px',
                              textAlign: 'center',
                              color: '#9CA3AF',
                              fontSize: '9pt',
                            }}
                          >
                            {rowIndex === 0 && columnIndex === 0 ? 'HITACHI' : 'Client Logo'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </SectionWrapper>

              {/* Page Break: End of Page 5 (Executive Summary) */}
              <PageBreak />

              {/* ── GENERAL OVERVIEW heading (Heading 1, #EE0000) ── */}
              <h1 style={heading1RedStyle}>
                {formatHeadingWithNumber('GENERAL OVERVIEW', `${getNextSectionNumber()}.`)}
              </h1>

              {/* ── INTRODUCTION ── */}
              <SectionWrapper
                sectionKey="introduction"
                isActive={isActive('introduction')}
                isHovered={hoveredSection === 'introduction'}
                onMouseEnter={() => setHoveredSection('introduction')}
                onMouseLeave={() => setHoveredSection(null)}
                onClick={() => handleSectionClick('introduction')}
                sectionRef={(el) => (sectionRefs.current.introduction = el)}
                style={sectionStyle('introduction')}
              >
                {/* Heading 2, no color (black) — matches template */}
                <h2 style={heading2BlackStyle}>
                  {formatHeadingWithNumber('INTRODUCTION', `${sectionCounter.current}.${getNextSubsectionNumber()}`)}
                </h2>
                {renderTemplateParagraphs(INTRODUCTION_PARAGRAPHS)}
              </SectionWrapper>

              {/* ── ABBREVIATIONS ── */}
              <SectionWrapper
                sectionKey="abbreviations"
                isActive={isActive('abbreviations')}
                isHovered={hoveredSection === 'abbreviations'}
                onMouseEnter={() => setHoveredSection('abbreviations')}
                onMouseLeave={() => setHoveredSection(null)}
                onClick={() => handleSectionClick('abbreviations')}
                sectionRef={(el) => (sectionRefs.current.abbreviations = el)}
                style={sectionStyle('abbreviations')}
              >
                <h2 style={heading2RedStyle}>
                  {formatHeadingWithNumber('ABBREVIATIONS USED', `${sectionCounter.current}.${getNextSubsectionNumber()}`)}
                </h2>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      {/* Abbreviations table: header shade = #D9D9D9 (from template) */}
                      <th style={{ ...tableHeaderStyle, width: '60px', backgroundColor: '#D9D9D9' }}>Sr. No.</th>
                      <th style={{ ...tableHeaderStyle, width: '140px', backgroundColor: '#D9D9D9' }}>Abbreviation</th>
                      <th style={{ ...tableHeaderStyle, backgroundColor: '#D9D9D9' }}>Full Form / Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(documentContent.abbreviations.rows || []).map(
                      (row: any, index: number) => (
                        <tr key={`abbr-${index}`}>
                          <td style={tableCellStyle}>{row.sr_no || index + 1}</td>
                          <td style={tableCellStyle}>{row.abbreviation || ''}</td>
                          <td style={tableCellStyle}>{row.description || ''}</td>
                        </tr>
                      )
                    )}
                    {(!documentContent.abbreviations.rows ||
                      documentContent.abbreviations.rows.length === 0) && (
                      <tr>
                        <td colSpan={3} style={tableCellStyle}>
                          <span style={placeholderStyle}>[No abbreviations defined]</span>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </SectionWrapper>

              {/* ── PROCESS FLOW ── */}
              <SectionWrapper
                sectionKey="process_flow"
                isActive={isActive('process_flow')}
                isHovered={hoveredSection === 'process_flow'}
                onMouseEnter={() => setHoveredSection('process_flow')}
                onMouseLeave={() => setHoveredSection(null)}
                onClick={() => handleSectionClick('process_flow')}
                sectionRef={(el) => (sectionRefs.current.process_flow = el)}
                style={sectionStyle('process_flow')}
              >
                <h2 style={heading2RedStyle}>
                  {formatHeadingWithNumber('PROCESS FLOW', `${sectionCounter.current}.${getNextSubsectionNumber()}`)}
                </h2>
                <p style={bodyParagraphStyle}>
                  {documentContent.processFlow.text ? (
                    stripHtml(documentContent.processFlow.text)
                  ) : (
                    <span style={placeholderStyle}>[Enter process flow description]</span>
                  )}
                </p>
              </SectionWrapper>

              {/* ── OVERVIEW ── */}
              <SectionWrapper
                sectionKey="overview"
                isActive={isActive('overview')}
                isHovered={hoveredSection === 'overview'}
                onMouseEnter={() => setHoveredSection('overview')}
                onMouseLeave={() => setHoveredSection(null)}
                onClick={() => handleSectionClick('overview')}
                sectionRef={(el) => (sectionRefs.current.overview = el)}
                style={sectionStyle('overview')}
              >
                <h2 style={heading2RedStyle}>
                  {formatHeadingWithNumber(`OVERVIEW OF ${(solutionName || '{SolutionName}').toUpperCase()}`, `${sectionCounter.current}.${getNextSubsectionNumber()}`)}
                </h2>
                <p style={bodyParagraphStyle}>
                  {documentContent.processFlow.text ? (
                    stripHtml(documentContent.processFlow.text)
                  ) : (
                    <span style={placeholderStyle}>[Process flow summary will appear here]</span>
                  )}
                </p>
                <p style={bodyParagraphStyle}>
                  {resolveTemplateText(
                    'This proposal outlines the technical feature of {{SolutionName}}',
                    templateReplacements
                  )}
                </p>
                <p style={labelParagraphStyle}>System Objective:</p>
                <p style={bodyParagraphStyle}>
                  {documentContent.overview.system_objective ? (
                    stripHtml(documentContent.overview.system_objective)
                  ) : (
                    <span style={placeholderStyle}>[Enter system objective]</span>
                  )}
                </p>
                <p style={labelParagraphStyle}>Existing System Architecture:</p>
                <p style={bodyParagraphStyle}>
                  {documentContent.overview.existing_system ? (
                    stripHtml(documentContent.overview.existing_system)
                  ) : (
                    <span style={placeholderStyle}>[Enter existing system architecture]</span>
                  )}
                </p>
                <p style={labelParagraphStyle}>Integration:</p>
                <p style={bodyParagraphStyle}>
                  {documentContent.overview.integration ? (
                    stripHtml(documentContent.overview.integration)
                  ) : (
                    <span style={placeholderStyle}>[Enter integration details]</span>
                  )}
                </p>
                <p style={labelParagraphStyle}>Benefits:</p>
                <p style={labelParagraphStyle}>Tangible benefits</p>
                <p style={bodyParagraphStyle}>
                  {documentContent.overview.tangible_benefits ? (
                    stripHtml(documentContent.overview.tangible_benefits)
                  ) : (
                    <span style={placeholderStyle}>[Enter tangible benefits]</span>
                  )}
                </p>
                <p style={labelParagraphStyle}>Intangible benefits</p>
                <p style={bodyParagraphStyle}>
                  {documentContent.overview.intangible_benefits ? (
                    stripHtml(documentContent.overview.intangible_benefits)
                  ) : (
                    <span style={placeholderStyle}>[Enter intangible benefits]</span>
                  )}
                </p>
              </SectionWrapper>

              {/* Page Break: End of Page 6-8 (General Overview) */}
              <PageBreak />

              {/* ── OFFERINGS heading (Heading 1, #EE0000) ── */}
              <h1 style={heading1RedStyle}>
                {formatHeadingWithNumber('OFFERINGS', `${getNextSectionNumber()}.`)}
              </h1>

              {/* ── FEATURES ── */}
              <SectionWrapper
                sectionKey="features"
                isActive={isActive('features')}
                isHovered={hoveredSection === 'features'}
                onMouseEnter={() => setHoveredSection('features')}
                onMouseLeave={() => setHoveredSection(null)}
                onClick={() => handleSectionClick('features')}
                sectionRef={(el) => (sectionRefs.current.features = el)}
                style={sectionStyle('features')}
              >
                <h2 style={heading2RedStyle}>
                  {formatHeadingWithNumber('DESIGN SCOPE OF WORK', `${sectionCounter.current}.${getNextSubsectionNumber()}`)}
                </h2>
                <p style={bodyParagraphStyle}>
                  {resolveTemplateText('Implementation of {{SolutionName}}', templateReplacements)}
                </p>
                {featureItems.length > 0 ? (
                  featureItems.map((feature: any, index: number) => (
                    <div key={feature.id || `feature-${index}`} style={{ marginBottom: '14px' }}>
                      {/* Feature titles: Heading 2, no color (black) — matches template */}
                      <h2 style={heading2BlackStyle}>
                        {feature.title || `Feature ${index + 1}`}
                      </h2>
                      <p style={bodyParagraphStyle}>
                        {feature.description ? (
                          stripHtml(feature.description)
                        ) : (
                          <span style={placeholderStyle}>[Enter feature description]</span>
                        )}
                      </p>
                    </div>
                  ))
                ) : (
                  <p style={placeholderStyle}>[No features defined yet]</p>
                )}
              </SectionWrapper>

              {/* ── REMOTE SUPPORT ── */}
              <SectionWrapper
                sectionKey="remote_support"
                isActive={isActive('remote_support')}
                isHovered={hoveredSection === 'remote_support'}
                onMouseEnter={() => setHoveredSection('remote_support')}
                onMouseLeave={() => setHoveredSection(null)}
                onClick={() => handleSectionClick('remote_support')}
                sectionRef={(el) => (sectionRefs.current.remote_support = el)}
                style={sectionStyle('remote_support')}
              >
                {/* Heading 2, #EE0000 — matches template (was incorrectly black before) */}
                <h2 style={heading2RedStyle}>
                  {formatHeadingWithNumber('REMOTE SUPPORT SYSTEM', `${sectionCounter.current}.${getNextSubsectionNumber()}`)}
                </h2>
                {renderTemplateParagraphs(REMOTE_SUPPORT_PARAGRAPHS)}
                {documentContent.remoteSupport.text && (
                  <p style={bodyParagraphStyle}>{stripHtml(documentContent.remoteSupport.text)}</p>
                )}
              </SectionWrapper>

              {/* ── DOCUMENTATION CONTROL ── */}
              <SectionWrapper
                sectionKey="documentation_control"
                isActive={isActive('documentation_control')}
                isHovered={hoveredSection === 'documentation_control'}
                onMouseEnter={() => setHoveredSection('documentation_control')}
                onMouseLeave={() => setHoveredSection(null)}
                onClick={() => handleSectionClick('documentation_control')}
                sectionRef={(el) => (sectionRefs.current.documentation_control = el)}
                style={sectionStyle('documentation_control')}
              >
                <h2 style={heading2RedStyle}>
                  {formatHeadingWithNumber('DOCUMENTATION CONTROL', `${sectionCounter.current}.${getNextSubsectionNumber()}`)}
                </h2>
                <p style={bodyParagraphStyle}>
                  {resolveTemplateText(
                    'SELLER shall provide the following technical documentation of the complete {{SolutionName}} solution:',
                    templateReplacements
                  )}
                </p>
                {[...DOCUMENTATION_CONTROL_ITEMS, ...documentationControlCustom].map(
                  (item, index) => (
                    <p key={`documentation-item-${index}`} style={listParagraphStyle}>
                      {resolveTemplateText(item, templateReplacements)}
                    </p>
                  )
                )}
              </SectionWrapper>

              {/* ── CUSTOMER TRAINING ── */}
              <SectionWrapper
                sectionKey="customer_training"
                isActive={isActive('customer_training')}
                isHovered={hoveredSection === 'customer_training'}
                onMouseEnter={() => setHoveredSection('customer_training')}
                onMouseLeave={() => setHoveredSection(null)}
                onClick={() => handleSectionClick('customer_training')}
                sectionRef={(el) => (sectionRefs.current.customer_training = el)}
                style={sectionStyle('customer_training')}
              >
                <h2 style={heading2RedStyle}>
                  {formatHeadingWithNumber('CUSTOMER TRAINING', `${sectionCounter.current}.${getNextSubsectionNumber()}`)}
                </h2>
                <p style={bodyParagraphStyle}>
                  {resolveTemplateText(
                    'SELLER shall provide training at site during commissioning to a maximum of {{TrainingPersons}} people for a maximum of {{TrainingDays}} days. Training shall cover mutually agreed topics on {{SolutionName}} application. Training shall comprise of classroom training at site.',
                    templateReplacements
                  )}
                </p>
              </SectionWrapper>

              {/* ── SYSTEM CONFIGURATION ── */}
              <SectionWrapper
                sectionKey="system_config"
                isActive={isActive('system_config')}
                isHovered={hoveredSection === 'system_config'}
                onMouseEnter={() => setHoveredSection('system_config')}
                onMouseLeave={() => setHoveredSection(null)}
                onClick={() => handleSectionClick('system_config')}
                sectionRef={(el) => (sectionRefs.current.system_config = el)}
                style={sectionStyle('system_config')}
              >
                <h2 style={heading2RedStyle}>
                  {formatHeadingWithNumber('SYSTEM CONFIGURATION (FOR REFERENCE)', `${sectionCounter.current}.${getNextSubsectionNumber()}`)}
                </h2>
                <p style={bodyParagraphStyle}>
                  {resolveTemplateText(
                    'The reference system configuration of {{SolutionName}} is shown below:',
                    templateReplacements
                  )}
                </p>
                {renderImageOrPlaceholder(
                  'architecture',
                  '[Architecture diagram to be inserted]',
                  'Architecture diagram'
                )}
                <p style={noteParagraphStyle}>
                  Note: The above architecture is provided for illustrative purposes only
                  and is subject to modification during detailed engineering to optimize
                  overall system performance and functionality
                </p>
              </SectionWrapper>

              {/* ── FAT CONDITION ── */}
              <SectionWrapper
                sectionKey="fat_condition"
                isActive={isActive('fat_condition')}
                isHovered={hoveredSection === 'fat_condition'}
                onMouseEnter={() => setHoveredSection('fat_condition')}
                onMouseLeave={() => setHoveredSection(null)}
                onClick={() => handleSectionClick('fat_condition')}
                sectionRef={(el) => (sectionRefs.current.fat_condition = el)}
                style={sectionStyle('fat_condition')}
              >
                <h2 style={heading2RedStyle}>
                  {formatHeadingWithNumber('FAT CONDITION', `${sectionCounter.current}.${getNextSubsectionNumber()}`)}
                </h2>
                <p style={bodyParagraphStyle}>
                  {documentContent.fatCondition.text ? (
                    stripHtml(documentContent.fatCondition.text)
                  ) : (
                    <span style={placeholderStyle}>[Enter FAT condition text]</span>
                  )}
                </p>
              </SectionWrapper>

              {/* Page Break: End of Page 9-11 (Offerings) */}
              <PageBreak />

              {/* ── TECHNOLOGY STACK (Heading 1, #EE0000) ── */}
              <SectionWrapper
                sectionKey="tech_stack"
                isActive={isActive('tech_stack')}
                isHovered={hoveredSection === 'tech_stack'}
                onMouseEnter={() => setHoveredSection('tech_stack')}
                onMouseLeave={() => setHoveredSection(null)}
                onClick={() => handleSectionClick('tech_stack')}
                sectionRef={(el) => (sectionRefs.current.tech_stack = el)}
                style={sectionStyle('tech_stack')}
              >
                <h1 style={heading1RedStyle}>
                  {formatHeadingWithNumber('TECHNOLOGY STACK', `${getNextSectionNumber()}.`)}
                </h1>
                <p style={{ ...bodyParagraphStyle, textAlign: 'left' }}>
                  The technology stack for various components is as follows:
                </p>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      {/* Tech stack table: header shade = #BFBFBF (from template) */}
                      <th style={{ ...tableHeaderStyle, width: '60px', backgroundColor: '#BFBFBF' }}>Sr. No.</th>
                      <th style={{ ...tableHeaderStyle, backgroundColor: '#BFBFBF' }}>Components</th>
                      <th style={{ ...tableHeaderStyle, backgroundColor: '#BFBFBF' }}>Technology Used</th>
                    </tr>
                  </thead>
                  <tbody>
                    {techRows.length > 0 ? (
                      techRows.map((row: any, index: number) => (
                        <tr key={`tech-row-${index}`}>
                          <td style={tableCellStyle}>{row.sr_no || index + 1}</td>
                          <td style={tableCellStyle}>{row.component || ''}</td>
                          <td style={tableCellStyle}>
                            <div>{row.technology || ''}</div>
                            {index === 0 && row.note && (
                              <div style={{ ...noteParagraphStyle, marginBottom: 0, marginTop: '6px' }}>
                                {row.note}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} style={tableCellStyle}>
                          <span style={placeholderStyle}>[Technology stack will appear here]</span>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </SectionWrapper>

              {/* ── HARDWARE SPECS (Heading 3, #EE0000) ── */}
              <SectionWrapper
                sectionKey="hardware_specs"
                isActive={isActive('hardware_specs')}
                isHovered={hoveredSection === 'hardware_specs'}
                onMouseEnter={() => setHoveredSection('hardware_specs')}
                onMouseLeave={() => setHoveredSection(null)}
                onClick={() => handleSectionClick('hardware_specs')}
                sectionRef={(el) => (sectionRefs.current.hardware_specs = el)}
                style={sectionStyle('hardware_specs')}
              >
                <h2 style={heading2RedStyle}>
                  {formatHeadingWithNumber('HARDWARE SPECIFICATIONS', `${sectionCounter.current}.${getNextSubsectionNumber()}`)}
                </h2>
                <p style={{ ...bodyParagraphStyle, textAlign: 'left' }}>
                  {resolveTemplateText(
                    'Following is the list of Hardware required for {{SolutionName}} Application.',
                    templateReplacements
                  )}
                </p>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      {/* Hardware specs table: header shade = #BFBFBF (from template) */}
                      <th style={{ ...tableHeaderStyle, width: '60px', backgroundColor: '#BFBFBF' }}>Sr. No.</th>
                      <th style={{ ...tableHeaderStyle, backgroundColor: '#BFBFBF' }}>Equipment Name</th>
                      <th style={{ ...tableHeaderStyle, backgroundColor: '#BFBFBF' }}>Specifications</th>
                      <th style={{ ...tableHeaderStyle, backgroundColor: '#BFBFBF' }}>Maker</th>
                      <th style={{ ...tableHeaderStyle, width: '110px', backgroundColor: '#BFBFBF' }}>
                        Quantity (Nos.)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {hardwareRows.length > 0 ? (
                      hardwareRows.map((row: any, index: number) => (
                        <tr key={`hardware-row-${index}`}>
                          <td style={tableCellStyle}>{row.sr_no || index + 1}</td>
                          <td style={tableCellStyle}>{row.name || ''}</td>
                          <td style={tableCellStyle}>{renderSpecLines(row)}</td>
                          <td style={tableCellStyle}>
                            {row.maker || <span style={placeholderStyle}>[Maker]</span>}
                          </td>
                          <td style={tableCellStyle}>
                            {row.qty || <span style={placeholderStyle}>[Qty]</span>}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} style={tableCellStyle}>
                          <span style={placeholderStyle}>
                            [Hardware specifications will appear here]
                          </span>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </SectionWrapper>

              {/* ── SOFTWARE SPECS (Heading 3, #EE0000) ── */}
              <SectionWrapper
                sectionKey="software_specs"
                isActive={isActive('software_specs')}
                isHovered={hoveredSection === 'software_specs'}
                onMouseEnter={() => setHoveredSection('software_specs')}
                onMouseLeave={() => setHoveredSection(null)}
                onClick={() => handleSectionClick('software_specs')}
                sectionRef={(el) => (sectionRefs.current.software_specs = el)}
                style={sectionStyle('software_specs')}
              >
                <h2 style={heading2RedStyle}>
                  {formatHeadingWithNumber('SOFTWARE SPECIFICATIONS', `${sectionCounter.current}.${getNextSubsectionNumber()}`)}
                </h2>
                <p style={{ ...bodyParagraphStyle, textAlign: 'left' }}>
                  {resolveTemplateText(
                    'Below are the Software Specifications for the Proposed {{SolutionName}} system.',
                    templateReplacements
                  )}
                </p>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      {/* Software specs table: header shade = #BFBFBF (from template) */}
                      <th style={{ ...tableHeaderStyle, width: '60px', backgroundColor: '#BFBFBF' }}>SR. NO.</th>
                      <th style={{ ...tableHeaderStyle, backgroundColor: '#BFBFBF' }}>EQUIPMENT/SOFTWARE NAME</th>
                      <th style={{ ...tableHeaderStyle, backgroundColor: '#BFBFBF' }}>MAKER</th>
                      <th style={{ ...tableHeaderStyle, width: '120px', backgroundColor: '#BFBFBF' }}>
                        QUANTITY (NOS.)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {softwareRows.length > 0 ? (
                      softwareRows.map((row: any, index: number) => (
                        <tr key={`software-row-${index}`}>
                          <td style={tableCellStyle}>{row.sr_no || index + 1}</td>
                          <td style={tableCellStyle}>{formatSoftwareName(row, index)}</td>
                          <td style={tableCellStyle}>
                            {row.maker || <span style={placeholderStyle}>[Maker]</span>}
                          </td>
                          <td style={tableCellStyle}>{row.qty || ''}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} style={tableCellStyle}>
                          <span style={placeholderStyle}>
                            [Software specifications will appear here]
                          </span>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </SectionWrapper>

              {/* ── THIRD PARTY SW (Heading 3, #EE0000) ── */}
              <SectionWrapper
                sectionKey="third_party_sw"
                isActive={isActive('third_party_sw')}
                isHovered={hoveredSection === 'third_party_sw'}
                onMouseEnter={() => setHoveredSection('third_party_sw')}
                onMouseLeave={() => setHoveredSection(null)}
                onClick={() => handleSectionClick('third_party_sw')}
                sectionRef={(el) => (sectionRefs.current.third_party_sw = el)}
                style={sectionStyle('third_party_sw')}
              >
                <h2 style={heading2RedStyle}>
                  {formatHeadingWithNumber('THIRD PARTY SOFTWARE', `${sectionCounter.current}.${getNextSubsectionNumber()}`)}
                </h2>
                <p style={bodyParagraphStyle}>
                  {documentContent.thirdPartySw.sw4_name ? (
                    documentContent.thirdPartySw.sw4_name
                  ) : (
                    <span style={placeholderStyle}>[Enter third party software requirement]</span>
                  )}
                </p>
                <p style={bodyParagraphStyle}>
                  Remote Link: To provide a suitable level of response to operation &
                  process execution problems and queries raised on site, SELLER requires
                  a network connection via broadband / VPN /
                  Remote connectivity.
                </p>
              </SectionWrapper>

              {/* Page Break: End of Page 12-14 (Technology Stack) */}
              <PageBreak />

              {/* ── SCHEDULE (Heading 1, #EE0000) ── */}
              <h1 style={heading1RedStyle}>
                {formatHeadingWithNumber('SCHEDULE', `${getNextSectionNumber()}.`)}
              </h1>

              {/* ── OVERALL GANTT ── */}
              <SectionWrapper
                sectionKey="overall_gantt"
                isActive={isActive('overall_gantt')}
                isHovered={hoveredSection === 'overall_gantt'}
                onMouseEnter={() => setHoveredSection('overall_gantt')}
                onMouseLeave={() => setHoveredSection(null)}
                onClick={() => handleSectionClick('overall_gantt')}
                sectionRef={(el) => (sectionRefs.current.overall_gantt = el)}
                style={sectionStyle('overall_gantt')}
              >
                <h2 style={heading2RedStyle}>
                  {formatHeadingWithNumber('OVERALL GANTT CHART', `${sectionCounter.current}.${getNextSubsectionNumber()}`)}
                </h2>
                {renderImageOrPlaceholder(
                  'gantt_overall',
                  '[Overall Gantt chart to be inserted]',
                  'Overall Gantt chart'
                )}
                <p style={noteParagraphStyle}>
                  {resolveTemplateText(
                    'Note: After Approval on System Design Document SELLER will take 4 Months for Software development. In the event of a delay in System design document approvals from the Customer, it will lead to an overall delay in the delivery. Above delivery schedule is for {{SolutionName}} application',
                    templateReplacements
                  )}
                </p>
              </SectionWrapper>

              {/* ── SHUTDOWN GANTT ── */}
              <SectionWrapper
                sectionKey="shutdown_gantt"
                isActive={isActive('shutdown_gantt')}
                isHovered={hoveredSection === 'shutdown_gantt'}
                onMouseEnter={() => setHoveredSection('shutdown_gantt')}
                onMouseLeave={() => setHoveredSection(null)}
                onClick={() => handleSectionClick('shutdown_gantt')}
                sectionRef={(el) => (sectionRefs.current.shutdown_gantt = el)}
                style={sectionStyle('shutdown_gantt')}
              >
                <h2 style={heading2RedStyle}>
                  {formatHeadingWithNumber('SHUTDOWN GANTT CHART', `${sectionCounter.current}.${getNextSubsectionNumber()}`)}
                </h2>
                {renderImageOrPlaceholder(
                  'gantt_shutdown',
                  '[Shutdown Gantt chart to be inserted]',
                  'Shutdown Gantt chart'
                )}
                <p style={labelParagraphStyle}>NOTE:</p>
                <p style={noteParagraphStyle}>
                  {resolveTemplateText(
                    '{{SolutionName}} Application Deployment & commissioning is subject to site readiness from BUYER. The above shutdown schedule provided is for reference only. The final shutdown schedule will be determined through discussion and mutual agreement between the BUYER & SELLER',
                    templateReplacements
                  )}
                </p>
              </SectionWrapper>

              {/* ── SUPERVISORS (Heading 3, #EE0000) ── */}
              <SectionWrapper
                sectionKey="supervisors"
                isActive={isActive('supervisors')}
                isHovered={hoveredSection === 'supervisors'}
                onMouseEnter={() => setHoveredSection('supervisors')}
                onMouseLeave={() => setHoveredSection(null)}
                onClick={() => handleSectionClick('supervisors')}
                sectionRef={(el) => (sectionRefs.current.supervisors = el)}
                style={sectionStyle('supervisors')}
              >
                <h3 style={heading3RedStyle}>SUPERVISORS:</h3>
                <p style={bodyParagraphStyle}>
                  The following site-supervisor will be deputed to the site for the
                  commissioning, deployment & training at site:
                </p>
                <p style={listParagraphStyle}>
                  {resolveTemplateText('Project Manager: {{PMDays}} Days', templateReplacements)}
                </p>
                <p style={listParagraphStyle}>
                  {resolveTemplateText(
                    '{{SolutionName}} Developer: {{DevDays}} Days',
                    templateReplacements
                  )}
                </p>
                <p style={listParagraphStyle}>
                  {resolveTemplateText(
                    'Commissioning SV (QA SV): {{CommDays}} Days',
                    templateReplacements
                  )}
                </p>
                <p style={bodyParagraphStyle}>
                  {resolveTemplateText(
                    'Total {{TotalManDays}} man-days (Inclusive of on-site training).',
                    templateReplacements
                  )}
                </p>
              </SectionWrapper>

              {/* Page Break: End of Page 15 (Schedule) */}
              <PageBreak />

              {/* ── SCOPE OF SUPPLY (Heading 1, #EE0000) ── */}
              <h1 style={heading1RedStyle}>
                {formatHeadingWithNumber('SCOPE OF SUPPLY', `${getNextSectionNumber()}.`)}
              </h1>

              {/* ── SCOPE DEFINITIONS (Heading 2, black — no color in template) ── */}
              <SectionWrapper
                sectionKey="scope_definitions"
                isActive={isActive('scope_definitions')}
                isHovered={hoveredSection === 'scope_definitions'}
                onMouseEnter={() => setHoveredSection('scope_definitions')}
                onMouseLeave={() => setHoveredSection(null)}
                onClick={() => handleSectionClick('scope_definitions')}
                sectionRef={(el) => (sectionRefs.current.scope_definitions = el)}
                style={sectionStyle('scope_definitions')}
              >
                <h2 style={heading2BlackStyle}>
                  {formatHeadingWithNumber('SCOPE OF SUPPLY DEFINITIONS', `${sectionCounter.current}.${getNextSubsectionNumber()}`)}
                </h2>
                {renderTemplateParagraphs(SCOPE_SUPPLY_DEFINITION_LINES)}
              </SectionWrapper>

              {/* ── DIVISION OF ENGINEERING ── */}
              <SectionWrapper
                sectionKey="division_of_eng"
                isActive={isActive('division_of_eng')}
                isHovered={hoveredSection === 'division_of_eng'}
                onMouseEnter={() => setHoveredSection('division_of_eng')}
                onMouseLeave={() => setHoveredSection(null)}
                onClick={() => handleSectionClick('division_of_eng')}
                sectionRef={(el) => (sectionRefs.current.division_of_eng = el)}
                style={sectionStyle('division_of_eng')}
              >
                <h2 style={heading2RedStyle}>
                  {formatHeadingWithNumber('DIVISION OF ENGINEERING, SOFTWARE DEVELOPMENT, & ERECTION/COMMISSIONING SERVICES', `${sectionCounter.current}.${getNextSubsectionNumber()}`)}
                </h2>
                <table
                  style={{
                    ...tableStyle,
                    tableLayout: 'fixed',
                  }}
                >
                  <tbody>
                    {resolvedMatrixRows.map((row, rowIndex) => {
                      const isHeaderRow = rowIndex <= 1;
                      const isGroupRow = !isHeaderRow && row[0] && !row[0].startsWith('-');

                      return (
                        <tr key={`matrix-row-${rowIndex}`}>
                          {row.map((cell, cellIndex) => {
                            const cellStyle =
                              cellIndex === 1 ? matrixItemCellStyle : matrixCellStyle;

                            // Responsibility matrix header: shade = #2E75B5 (blue) from template
                            const headerBg = isHeaderRow ? '#2E75B5' : undefined;
                            const headerColor = isHeaderRow ? '#FFFFFF' : undefined;
                            const groupBg = (!isHeaderRow && isGroupRow) ? '#F3F3F3' : undefined;

                            return (
                              <td
                                key={`matrix-cell-${rowIndex}-${cellIndex}`}
                                style={{
                                  ...cellStyle,
                                  fontWeight: isHeaderRow || isGroupRow ? 'bold' : 'normal',
                                  backgroundColor: headerBg || groupBg || '#FFFFFF',
                                  color: headerColor || undefined,
                                }}
                              >
                                {cell || '\u00A0'}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <p style={labelParagraphStyle}>Note:</p>
                <p style={noteParagraphStyle}>
                  1) Any additional requirements beyond the scope mentioned above
                  shall be discussed and mutually agreed upon. A separate proposal
                  will be submitted for such additional requirements.
                </p>
                <p style={noteParagraphStyle}>
                  2) Firewall Configuration will be managed by BUYER.
                </p>
              </SectionWrapper>

              {/* ── VALUE ADDITION ── */}
              <SectionWrapper
                sectionKey="value_addition"
                isActive={isActive('value_addition')}
                isHovered={hoveredSection === 'value_addition'}
                onMouseEnter={() => setHoveredSection('value_addition')}
                onMouseLeave={() => setHoveredSection(null)}
                onClick={() => handleSectionClick('value_addition')}
                sectionRef={(el) => (sectionRefs.current.value_addition = el)}
                style={sectionStyle('value_addition')}
              >
                <h2 style={heading2RedStyle}>
                  {formatHeadingWithNumber('VALUE ADDITION', `${sectionCounter.current}.${getNextSubsectionNumber()}`)}
                </h2>
                <p style={bodyParagraphStyle}>
                  {resolveTemplateText(VALUE_ADDITION_INTRO, templateReplacements)}
                </p>
                <p style={bodyParagraphStyle}>
                  {documentContent.valueAddition.text ? (
                    stripHtml(documentContent.valueAddition.text)
                  ) : (
                    <span style={placeholderStyle}>[Enter value addition details]</span>
                  )}
                </p>
              </SectionWrapper>

              {/* ── WORK COMPLETION ── */}
              <SectionWrapper
                sectionKey="work_completion"
                isActive={isActive('work_completion')}
                isHovered={hoveredSection === 'work_completion'}
                onMouseEnter={() => setHoveredSection('work_completion')}
                onMouseLeave={() => setHoveredSection(null)}
                onClick={() => handleSectionClick('work_completion')}
                sectionRef={(el) => (sectionRefs.current.work_completion = el)}
                style={sectionStyle('work_completion')}
              >
                <h2 style={heading2RedStyle}>
                  {formatHeadingWithNumber('WORK COMPLETION CERTIFICATE', `${sectionCounter.current}.${getNextSubsectionNumber()}`)}
                </h2>
                <p style={bodyParagraphStyle}>Work Completion Criteria:</p>
                {[...WORK_COMPLETION_CRITERIA, ...workCompletionCustom].map((item, index) => (
                  <p key={`completion-criterion-${index}`} style={listParagraphStyle}>
                    {resolveTemplateText(item, templateReplacements)}
                  </p>
                ))}
                {renderTemplateParagraphs(WORK_COMPLETION_PARAGRAPHS)}
              </SectionWrapper>

              {/* ── BUYER OBLIGATIONS ── */}
              <SectionWrapper
                sectionKey="buyer_obligations"
                isActive={isActive('buyer_obligations')}
                isHovered={hoveredSection === 'buyer_obligations'}
                onMouseEnter={() => setHoveredSection('buyer_obligations')}
                onMouseLeave={() => setHoveredSection(null)}
                onClick={() => handleSectionClick('buyer_obligations')}
                sectionRef={(el) => (sectionRefs.current.buyer_obligations = el)}
                style={sectionStyle('buyer_obligations')}
              >
                <h2 style={heading2RedStyle}>
                  {formatHeadingWithNumber('BUYER OBLIGATIONS', `${sectionCounter.current}.${getNextSubsectionNumber()}`)}
                </h2>
                <p style={bodyParagraphStyle}>The BUYER should fulfil the following obligations</p>
                {[...BUYER_OBLIGATION_ITEMS, ...buyerObligationCustom].map((item, index) => (
                  <p key={`buyer-obligation-${index}`} style={listParagraphStyle}>
                    {resolveTemplateText(item, templateReplacements)}
                  </p>
                ))}
              </SectionWrapper>

              {/* ── EXCLUSION LIST ── */}
              <SectionWrapper
                sectionKey="exclusion_list"
                isActive={isActive('exclusion_list')}
                isHovered={hoveredSection === 'exclusion_list'}
                onMouseEnter={() => setHoveredSection('exclusion_list')}
                onMouseLeave={() => setHoveredSection(null)}
                onClick={() => handleSectionClick('exclusion_list')}
                sectionRef={(el) => (sectionRefs.current.exclusion_list = el)}
                style={sectionStyle('exclusion_list')}
              >
                <h2 style={heading2RedStyle}>
                  {formatHeadingWithNumber('EXCLUSION LIST', `${sectionCounter.current}.${getNextSubsectionNumber()}`)}
                </h2>
                {renderTemplateParagraphs(EXCLUSION_INTRO_PARAGRAPHS)}
                {resolvedExclusionItems.map((item, index) => (
                  <p key={`exclusion-item-${index}`} style={listParagraphStyle}>
                    {resolveTemplateText(item, templateReplacements)}
                  </p>
                ))}
              </SectionWrapper>

              {/* ── BUYER PREREQUISITES ── */}
              <SectionWrapper
                sectionKey="buyer_prerequisites"
                isActive={isActive('buyer_prerequisites')}
                isHovered={hoveredSection === 'buyer_prerequisites'}
                onMouseEnter={() => setHoveredSection('buyer_prerequisites')}
                onMouseLeave={() => setHoveredSection(null)}
                onClick={() => handleSectionClick('buyer_prerequisites')}
                sectionRef={(el) => (sectionRefs.current.buyer_prerequisites = el)}
                style={sectionStyle('buyer_prerequisites')}
              >
                <h2 style={heading2RedStyle}>
                  {formatHeadingWithNumber('BUYER PREREQUISITES:', `${sectionCounter.current}.${getNextSubsectionNumber()}`)}
                </h2>
                {buyerPrerequisites.length > 0 ? (
                  buyerPrerequisites.map((item, index) => (
                    <p key={`buyer-prereq-${index}`} style={listParagraphStyle}>
                      {item}
                    </p>
                  ))
                ) : (
                  <p style={placeholderStyle}>[Enter buyer prerequisites]</p>
                )}
              </SectionWrapper>

              {/* ── BINDING CONDITIONS (Heading 2, #4F81BD) ── */}
              <SectionWrapper
                sectionKey="binding_conditions"
                isActive={isActive('binding_conditions')}
                isHovered={hoveredSection === 'binding_conditions'}
                onMouseEnter={() => setHoveredSection('binding_conditions')}
                onMouseLeave={() => setHoveredSection(null)}
                onClick={() => handleSectionClick('binding_conditions')}
                sectionRef={(el) => (sectionRefs.current.binding_conditions = el)}
                style={sectionStyle('binding_conditions')}
              >
                <h2 style={heading2BlueStyle}>
                  {formatHeadingWithNumber('BINDING CONDITIONS:', `${sectionCounter.current}.${getNextSubsectionNumber()}`)}
                </h2>
                {renderTemplateParagraphs(BINDING_CONDITIONS_PARAGRAPHS)}
              </SectionWrapper>

              {/* ── CYBERSECURITY (Heading 2, #4F81BD) ── */}
              <SectionWrapper
                sectionKey="cybersecurity"
                isActive={isActive('cybersecurity')}
                isHovered={hoveredSection === 'cybersecurity'}
                onMouseEnter={() => setHoveredSection('cybersecurity')}
                onMouseLeave={() => setHoveredSection(null)}
                onClick={() => handleSectionClick('cybersecurity')}
                sectionRef={(el) => (sectionRefs.current.cybersecurity = el)}
                style={sectionStyle('cybersecurity')}
              >
                <h2 style={heading2BlueStyle}>
                  {formatHeadingWithNumber('CYBERSECURITY DISCLAIMER', `${sectionCounter.current}.${getNextSubsectionNumber()}`)}
                </h2>
                {renderTemplateParagraphs(CYBERSECURITY_DISCLAIMER_PARAGRAPHS)}
              </SectionWrapper>

              {/* Page Break: End of Page 16-23 (Scope of Supply) */}
              <PageBreak />

              {/* ── DISCLAIMER (Heading 1, #4F81BD) ── */}
              <SectionWrapper
                sectionKey="disclaimer"
                isActive={isActive('disclaimer')}
                isHovered={hoveredSection === 'disclaimer'}
                onMouseEnter={() => setHoveredSection('disclaimer')}
                onMouseLeave={() => setHoveredSection(null)}
                onClick={() => handleSectionClick('disclaimer')}
                sectionRef={(el) => (sectionRefs.current.disclaimer = el)}
                style={sectionStyle('disclaimer')}
              >
                <h1 style={heading1BlueStyle}>
                  {formatHeadingWithNumber('DISCLAIMER', `${getNextSectionNumber()}.`)}
                </h1>
                {DISCLAIMER_SECTIONS.map((section) => (
                  <div key={section.title} style={{ marginBottom: '18px' }}>
                    {/* Disclaimer subsections: Heading 2, no color (black) — matches template */}
                    <h2 style={heading2BlackStyle}>
                      {formatHeadingWithNumber(section.title, `${sectionCounter.current}.${getNextSubsectionNumber()}`)}
                    </h2>
                    {renderTemplateParagraphs(section.paragraphs)}
                  </div>
                ))}
              </SectionWrapper>

              {/* Page Break: End of Page 24-25 (Disclaimer) */}
              <PageBreak />

              {/* ── PROOF OF CONCEPT (Heading 1, #4F81BD) ── */}
              <SectionWrapper
                sectionKey="poc"
                isActive={isActive('poc')}
                isHovered={hoveredSection === 'poc'}
                onMouseEnter={() => setHoveredSection('poc')}
                onMouseLeave={() => setHoveredSection(null)}
                onClick={() => handleSectionClick('poc')}
                sectionRef={(el) => (sectionRefs.current.poc = el)}
                style={sectionStyle('poc')}
              >
                <h1 style={heading1BlueStyle}>
                  {formatHeadingWithNumber('COMPLIMENTRY PROOF OF CONCEPTS (PoC)', `${getNextSectionNumber()}.`)}
                </h1>
                {renderTemplateParagraphs(POC_PARAGRAPHS)}
                <p style={bodyParagraphStyle}>The following solution will be part of the PoC:</p>
                <p style={{ ...heading2BlackStyle, marginBottom: '10px' }}>
                  {documentContent.poc.name || '[POC Name]'}
                </p>
                <p style={bodyParagraphStyle}>
                  {documentContent.poc.description ? (
                    stripHtml(documentContent.poc.description)
                  ) : (
                    <span style={placeholderStyle}>[Enter PoC description]</span>
                  )}
                </p>
              </SectionWrapper>

              <p
                style={{
                  marginTop: '36px',
                  textAlign: 'center',
                  fontFamily: DOC_FONT,
                  fontSize: '11pt',
                }}
              >
                End of Technical Proposal
              </p>
            </div>
          </div>
        </div>
      </>
    );
  }
);

DocumentPreview.displayName = 'DocumentPreview';

export default DocumentPreview;