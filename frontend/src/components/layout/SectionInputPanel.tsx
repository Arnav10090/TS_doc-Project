import React, { useEffect } from 'react';
import { isCustomSectionKey } from '../../utils/customSectionUtils';
import CustomSectionInput from '../input/CustomSectionInput';
import type { CustomSectionContent } from '../../types/customSections';

// Import all 31 section components
import {
  CoverSection,
  RevisionHistory,
  ExecutiveSummary,
  IntroductionSection,
  AbbreviationsSection,
  ProcessFlowSection,
  OverviewSection,
  FeaturesSection,
  RemoteSupportSection,
  DocumentationControlSection,
  CustomerTrainingSection,
  SystemConfigSection,
  FATConditionSection,
  TechStackSection,
  HardwareSpecsSection,
  SoftwareSpecsSection,
  ThirdPartySwSection,
  OverallGanttSection,
  ShutdownGanttSection,
  SupervisorsSection,
  ScopeDefinitionsSection,
  DivisionOfEngSection,
  ValueAdditionSection,
  WorkCompletionSection,
  BuyerObligationsSection,
  ExclusionListSection,
  BuyerPrerequisitesSection,
  BindingConditionsSection,
  CybersecuritySection,
  DisclaimerSection,
  PoCSection,
} from '../sections';

interface SectionInputPanelProps {
  projectId: string;
  activeSectionKey: string;
  activeSubsectionKey?: string | null;
  sectionContents: Record<string, Record<string, any>>;
  onContentChange?: (sectionKey: string, content: Record<string, any>) => void;
  onSectionNavigate?: (sectionKey: string) => void;
  onSubsectionSelect?: (subsectionKey: string | null) => void;
  onRefresh?: () => void;
  width: number;
  leftOffset: number;
  isNarrowScreen: boolean;
  showResizeHandle?: boolean;
  isResizing?: boolean;
  onResizeStart?: (event: React.PointerEvent<HTMLDivElement>) => void;
  onResizeStep?: (delta: number) => void;
  resizeKeyboardStep?: number;
}

// Map section keys to components and display names
const SECTION_COMPONENTS: Record<string, React.ComponentType<any>> = {
  cover: CoverSection,
  revision_history: RevisionHistory,
  executive_summary: ExecutiveSummary,
  introduction: IntroductionSection,
  abbreviations: AbbreviationsSection,
  process_flow: ProcessFlowSection,
  overview: OverviewSection,
  features: FeaturesSection,
  remote_support: RemoteSupportSection,
  documentation_control: DocumentationControlSection,
  customer_training: CustomerTrainingSection,
  system_config: SystemConfigSection,
  fat_condition: FATConditionSection,
  tech_stack: TechStackSection,
  hardware_specs: HardwareSpecsSection,
  software_specs: SoftwareSpecsSection,
  third_party_sw: ThirdPartySwSection,
  overall_gantt: OverallGanttSection,
  shutdown_gantt: ShutdownGanttSection,
  supervisors: SupervisorsSection,
  scope_definitions: ScopeDefinitionsSection,
  division_of_eng: DivisionOfEngSection,
  value_addition: ValueAdditionSection,
  work_completion: WorkCompletionSection,
  buyer_obligations: BuyerObligationsSection,
  exclusion_list: ExclusionListSection,
  buyer_prerequisites: BuyerPrerequisitesSection,
  binding_conditions: BindingConditionsSection,
  cybersecurity: CybersecuritySection,
  disclaimer: DisclaimerSection,
  poc: PoCSection,
};

const SECTION_NAMES: Record<string, string> = {
  cover: 'Cover Page',
  revision_history: 'Revision History',
  executive_summary: 'Executive Summary',
  introduction: 'Introduction',
  abbreviations: 'Abbreviations',
  process_flow: 'Process Flow',
  overview: 'Overview',
  features: 'Features',
  remote_support: 'Remote Support',
  documentation_control: 'Documentation Control',
  customer_training: 'Customer Training',
  system_config: 'System Configuration',
  fat_condition: 'FAT Condition',
  tech_stack: 'Technology Stack',
  hardware_specs: 'Hardware Specifications',
  software_specs: 'Software Specifications',
  third_party_sw: 'Third Party Software',
  overall_gantt: 'Overall Gantt Chart',
  shutdown_gantt: 'Shutdown Gantt Chart',
  supervisors: 'Supervisors',
  scope_definitions: 'Scope Definitions',
  division_of_eng: 'Division of Engineering',
  value_addition: 'Value Addition',
  work_completion: 'Work Completion',
  buyer_obligations: 'Buyer Obligations',
  exclusion_list: 'Exclusion List',
  buyer_prerequisites: 'Buyer Prerequisites',
  binding_conditions: 'Binding Conditions',
  cybersecurity: 'Cybersecurity',
  disclaimer: 'Disclaimer',
  poc: 'Proof of Concept',
};

const SectionInputPanel: React.FC<SectionInputPanelProps> = ({
  projectId,
  activeSectionKey,
  activeSubsectionKey,
  sectionContents,
  onContentChange,
  onSectionNavigate,
  onSubsectionSelect,
  width,
  leftOffset,
  isNarrowScreen,
  showResizeHandle = false,
  isResizing = false,
  onResizeStart,
  onResizeStep,
  resizeKeyboardStep = 16,
}) => {
  // Check if this is a custom section
  const isCustomSection = isCustomSectionKey(activeSectionKey);
  const customSectionContent = isCustomSection
    ? (sectionContents[activeSectionKey] as CustomSectionContent | undefined)
    : undefined;

  useEffect(() => {
    if (isCustomSection && !customSectionContent) {
      onSectionNavigate?.('cover');
    }
  }, [customSectionContent, isCustomSection, onSectionNavigate]);
  
  // Get section name
  const getSectionName = () => {
    if (isCustomSection) {
      if (customSectionContent?.displayMode === 'subsection') {
        return customSectionContent.subsections[0]?.name || 'New Subsection';
      }

      const selectedSubsection = customSectionContent?.subsections.find(
        (subsection) => subsection.key === activeSubsectionKey,
      );
      if (selectedSubsection) {
        return selectedSubsection.name || 'New Subsection';
      }

      return customSectionContent?.title || 'New Section';
    }
    return SECTION_NAMES[activeSectionKey] || 'Section';
  };

  const sectionName = getSectionName();

  // Create a callback that includes the section key
  const handleContentChange = (content: Record<string, any>) => {
    if (onContentChange) {
      onContentChange(activeSectionKey, content);
    }
  };

  const handleResizeKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!onResizeStep) {
      return;
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      onResizeStep(resizeKeyboardStep);
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      onResizeStep(-resizeKeyboardStep);
    }
  };

  return (
    <aside
      style={{
        width: isNarrowScreen ? `calc(100% - ${leftOffset}px)` : width,
        position: 'fixed',
        left: isNarrowScreen ? `${leftOffset}px` : 'auto',
        right: 0,
        top: '56px',
        bottom: 0,
        backgroundColor: '#FFFFFF',
        borderLeft: '1px solid #E5E7EB',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        zIndex: isNarrowScreen ? 20 : 'auto',
      }}
    >
      {showResizeHandle && onResizeStart && (
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize right sidebar"
          tabIndex={0}
          onPointerDown={onResizeStart}
          onKeyDown={handleResizeKeyDown}
          style={{
            position: 'absolute',
            top: 0,
            left: '-6px',
            bottom: 0,
            width: '12px',
            cursor: 'col-resize',
            zIndex: 30,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            touchAction: 'none',
          }}
        >
          <div
            style={{
              width: '2px',
              height: '56px',
              borderRadius: '999px',
              backgroundColor: isResizing ? '#E60012' : '#D1D5DB',
              boxShadow: isResizing
                ? '0 0 0 3px rgba(230, 0, 18, 0.12)'
                : '0 0 0 3px rgba(255, 255, 255, 0.95)',
              transition: 'background-color 0.2s ease, box-shadow 0.2s ease',
            }}
          />
        </div>
      )}

      {/* Sticky Header */}
      <div
        style={{
          padding: '16px',
          borderBottom: '1px solid #E5E7EB',
          backgroundColor: '#FFFFFF',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <h2
          style={{
            fontSize: '16px',
            fontWeight: 600,
            color: '#1A1A2E',
            margin: 0,
          }}
        >
          {sectionName}
        </h2>
      </div>

      {/* Scrollable Content */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
        }}
      >
        {isCustomSection && customSectionContent ? (
          <CustomSectionInput
            projectId={projectId}
            sectionKey={activeSectionKey}
            activeSubsectionKey={activeSubsectionKey}
            content={customSectionContent}
            sectionContents={sectionContents}
            onContentChange={handleContentChange}
            onSectionNavigate={onSectionNavigate}
            onSubsectionSelect={onSubsectionSelect}
          />
        ) : isCustomSection ? (
          <div
            style={{
              fontSize: '14px',
              color: '#6B7280',
              lineHeight: 1.5,
            }}
          >
            This section is no longer available. Redirecting to a valid section...
          </div>
        ) : (
          <>
            {(() => {
              const SectionComponent = SECTION_COMPONENTS[activeSectionKey] || SECTION_COMPONENTS['cover'];
              return <SectionComponent projectId={projectId} onContentChange={handleContentChange} />;
            })()}
          </>
        )}
      </div>
    </aside>
  );
};

export default SectionInputPanel;
