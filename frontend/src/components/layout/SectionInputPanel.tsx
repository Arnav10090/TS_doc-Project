import React from 'react';

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
  onContentChange?: (sectionKey: string, content: Record<string, any>) => void;
}

// Map section keys to components and display names
const SECTION_COMPONENTS: Record<string, React.ComponentType<{ projectId: string }>> = {
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

const SectionInputPanel: React.FC<SectionInputPanelProps> = ({ projectId, activeSectionKey, onContentChange }) => {
  const SectionComponent = SECTION_COMPONENTS[activeSectionKey] || SECTION_COMPONENTS['cover'];
  const sectionName = SECTION_NAMES[activeSectionKey] || 'Section';

  // Create a callback that includes the section key
  const handleContentChange = (content: Record<string, any>) => {
    if (onContentChange) {
      onContentChange(activeSectionKey, content);
    }
  };

  return (
    <aside
      style={{
        width: '380px',
        position: 'fixed',
        right: 0,
        top: '56px',
        bottom: 0,
        backgroundColor: '#FFFFFF',
        borderLeft: '1px solid #E5E7EB',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
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
        <SectionComponent projectId={projectId} onContentChange={handleContentChange} />
      </div>
    </aside>
  );
};

export default SectionInputPanel;
