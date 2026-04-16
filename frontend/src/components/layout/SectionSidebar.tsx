import React, { useState } from 'react';
import { useProjectStore } from '../../store/project.store';
import CompletionBadge from '../shared/CompletionBadge';
import { generateDocument } from '../../api/generation';
import { handleDocumentDownload } from '../../utils/downloadHelper';
import toast from 'react-hot-toast';

interface SectionSidebarProps {
  projectId: string;
  activeSectionKey: string | null;
  onSectionClick: (sectionKey: string) => void;
  visitedSections?: Set<string>;
}

interface SectionInfo {
  key: string;
  label: string;
  locked?: boolean;
}

interface SectionGroup {
  category: string;
  sections: SectionInfo[];
}

const SECTION_GROUPS: SectionGroup[] = [
  {
    category: 'COVER & HISTORY',
    sections: [
      { key: 'cover', label: 'Cover' },
      { key: 'revision_history', label: 'Revision History' },
    ],
  },
  {
    category: 'GENERAL OVERVIEW',
    sections: [
      { key: 'executive_summary', label: 'Executive Summary' },
      { key: 'introduction', label: 'Introduction' },
      { key: 'abbreviations', label: 'Abbreviations' },
      { key: 'process_flow', label: 'Process Flow' },
      { key: 'overview', label: 'Overview' },
    ],
  },
  {
    category: 'OFFERINGS',
    sections: [
      { key: 'features', label: 'Features' },
      { key: 'remote_support', label: 'Remote Support' },
      { key: 'documentation_control', label: 'Documentation Control' },
      { key: 'customer_training', label: 'Customer Training' },
      { key: 'system_config', label: 'System Configuration' },
      { key: 'fat_condition', label: 'FAT Condition' },
    ],
  },
  {
    category: 'TECHNOLOGY STACK',
    sections: [
      { key: 'tech_stack', label: 'Technology Stack' },
      { key: 'hardware_specs', label: 'Hardware Specifications' },
      { key: 'software_specs', label: 'Software Specifications' },
      { key: 'third_party_sw', label: 'Third Party Software' },
    ],
  },
  {
    category: 'SCHEDULE',
    sections: [
      { key: 'overall_gantt', label: 'Overall Gantt Chart' },
      { key: 'shutdown_gantt', label: 'Shutdown Gantt Chart' },
      { key: 'supervisors', label: 'Supervisors' },
    ],
  },
  {
    category: 'SCOPE OF SUPPLY',
    sections: [
      { key: 'scope_definitions', label: 'Scope Definitions' },
      { key: 'division_of_eng', label: 'Division of Engineering' },
      { key: 'work_completion', label: 'Work Completion' },
      { key: 'buyer_obligations', label: 'Buyer Obligations' },
      { key: 'exclusion_list', label: 'Exclusion List' },
      { key: 'value_addition', label: 'Value Addition' },
      { key: 'buyer_prerequisites', label: 'Buyer Prerequisites' },
    ],
  },
  {
    category: 'LEGAL',
    sections: [
      { key: 'binding_conditions', label: 'Binding Conditions', locked: true },
      { key: 'cybersecurity', label: 'Cybersecurity', locked: true },
      { key: 'disclaimer', label: 'Disclaimer', locked: true },
      { key: 'poc', label: 'Proof of Concept' },
    ],
  },
];

const SectionSidebar: React.FC<SectionSidebarProps> = ({
  projectId,
  activeSectionKey,
  onSectionClick,
  visitedSections = new Set(),
}) => {
  const sectionCompletion = useProjectStore((state) => state.sectionCompletion);
  const [isGenerating, setIsGenerating] = useState(false);
  const [missingSections, setMissingSections] = useState<string[]>([]);

  // Calculate completion statistics (27 completable sections)
  const completedCount = Object.entries(sectionCompletion).filter(
    ([key, isComplete]) => {
      // Exclude 4 auto-complete sections from count
      const excludedSections = ['binding_conditions', 'cybersecurity', 'disclaimer', 'scope_definitions'];
      return !excludedSections.includes(key) && isComplete;
    }
  ).length;

  const totalCompletable = 27;
  const completionPercentage = Math.round((completedCount / totalCompletable) * 100);

  const getSectionStatus = (sectionKey: string): 'complete' | 'visited' | 'not_started' => {
    if (sectionCompletion[sectionKey] === true) {
      return 'complete';
    } else if (visitedSections.has(sectionKey)) {
      return 'visited';
    }
    return 'not_started';
  };

  const handleGenerateDocument = async () => {
    setIsGenerating(true);
    setMissingSections([]);

    try {
      const blob = await generateDocument(projectId);
      
      // Extract filename from response headers if available
      const filename = `TS_Document_${Date.now()}.docx`;
      
      handleDocumentDownload(blob, filename);
    } catch (error: any) {
      if (error.response?.status === 422) {
        // Extract missing sections from error response
        const detail = error.response.data?.detail;
        if (detail && detail.missing_sections) {
          setMissingSections(detail.missing_sections);
          toast.error('Please complete all required sections before generating.');
        } else {
          toast.error('Some required sections are incomplete.');
        }
      } else {
        toast.error('Failed to generate document. Please try again.');
        console.error('Generation error:', error);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleMissingSectionClick = (sectionKey: string) => {
    setMissingSections([]);
    onSectionClick(sectionKey);
  };

  return (
    <aside
      style={{
        width: '260px',
        position: 'fixed',
        left: 0,
        top: '56px',
        bottom: 0,
        backgroundColor: '#FFFFFF',
        borderRight: '1px solid #E5E7EB',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Progress Indicator */}
      <div
        style={{
          padding: '16px',
          borderBottom: '1px solid #E5E7EB',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            fontSize: '14px',
            fontWeight: 600,
            color: '#1A1A2E',
            marginBottom: '8px',
          }}
        >
          {completedCount} / {totalCompletable} sections complete
        </div>
        <div
          style={{
            width: '100%',
            height: '4px',
            backgroundColor: '#E5E7EB',
            borderRadius: '2px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${completionPercentage}%`,
              height: '100%',
              backgroundColor: '#E60012',
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      </div>

      {/* Section Groups */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, paddingBottom: '16px' }}>
        {SECTION_GROUPS.map((group) => (
          <div key={group.category}>
            <div
              style={{
                padding: '12px 16px 8px',
                fontSize: '11px',
                fontWeight: 700,
                color: '#6B7280',
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
              }}
            >
              {group.category}
            </div>
            {group.sections.map((section) => {
              const isActive = activeSectionKey === section.key;
              const status = getSectionStatus(section.key);

              return (
                <button
                  key={section.key}
                  onClick={() => onSectionClick(section.key)}
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    border: 'none',
                    backgroundColor: isActive ? '#FFF0F0' : 'transparent',
                    borderLeft: isActive ? '3px solid #E60012' : '3px solid transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = '#F5F7FA';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      flex: 1,
                    }}
                  >
                    <span
                      style={{
                        fontSize: '14px',
                        fontWeight: isActive ? 600 : 500,
                        color: isActive ? '#E60012' : '#1A1A2E',
                      }}
                    >
                      {section.label}
                    </span>
                    {section.locked && (
                      <span style={{ fontSize: '12px' }}>🔒</span>
                    )}
                  </div>
                  <CompletionBadge status={status} />
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Missing Sections Alert */}
      {missingSections.length > 0 && (
        <div
          style={{
            padding: '16px',
            backgroundColor: '#FFF0F0',
            borderTop: '1px solid #E5E7EB',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: '#E60012',
              marginBottom: '8px',
            }}
          >
            Missing Required Sections:
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {missingSections.map((sectionKey) => {
              const sectionInfo = SECTION_GROUPS.flatMap((g) => g.sections).find(
                (s) => s.key === sectionKey
              );
              return (
                <button
                  key={sectionKey}
                  onClick={() => handleMissingSectionClick(sectionKey)}
                  style={{
                    padding: '4px 8px',
                    fontSize: '12px',
                    color: '#E60012',
                    backgroundColor: 'transparent',
                    border: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  → {sectionInfo?.label || sectionKey}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Generate Document Button */}
      <div
        style={{
          padding: '16px',
          borderTop: '1px solid #E5E7EB',
          flexShrink: 0,
          backgroundColor: '#FFFFFF',
          position: 'relative',
          zIndex: 10,
        }}
      >
        <button
          onClick={handleGenerateDocument}
          disabled={isGenerating}
          style={{
            width: '100%',
            padding: '12px 16px',
            backgroundColor: isGenerating ? '#6B7280' : '#E60012',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '4px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: isGenerating ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.2s ease',
          }}
          onMouseEnter={(e) => {
            if (!isGenerating) {
              e.currentTarget.style.backgroundColor = '#C50010';
            }
          }}
          onMouseLeave={(e) => {
            if (!isGenerating) {
              e.currentTarget.style.backgroundColor = '#E60012';
            }
          }}
        >
          {isGenerating ? 'Generating...' : 'Generate Document'}
        </button>
      </div>
    </aside>
  );
};

export default SectionSidebar;
