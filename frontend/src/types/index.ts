// Core Project Types
export interface Project {
  id: string
  solution_name: string
  solution_full_name: string
  solution_abbreviation?: string
  client_name: string
  client_location: string
  client_abbreviation?: string
  ref_number?: string
  doc_date?: string
  doc_version?: string
  created_at: string
  updated_at: string
}

export interface CompletionSummary {
  total: number
  completed: number
  percentage: number
}

export interface ProjectDetail extends Project {
  completion_summary: CompletionSummary
  section_completion: Record<string, boolean>
}

export interface ProjectSummary {
  id: string
  solution_name: string
  client_name: string
  client_location: string
  created_at: string
  completion_percentage: number
  total_sections: number
}

// Section Data Types
export interface SectionData {
  id: string
  project_id: string
  section_key: string
  content: Record<string, any>
  updated_at: string
}

// Document Version Types
export interface DocumentVersion {
  id: string
  project_id: string
  version_number: number
  filename: string
  file_path: string
  created_at: string
}

// Section-Specific Content Types
export interface CoverContent {
  solution_full_name?: string
  client_name?: string
  client_location?: string
  ref_number?: string
  doc_date?: string
  doc_version?: string
}

export interface RevisionHistoryRow {
  sr_no: number
  revised_by: string
  checked_by: string
  approved_by: string
  details: string
  date: string
  rev_no: string
}

export interface RevisionHistoryContent {
  rows: RevisionHistoryRow[]
}

export interface ExecutiveSummaryContent {
  para1: string
}

export interface IntroductionContent {
  tender_reference: string
  tender_date: string
}

export interface AbbreviationRow {
  sr_no: number
  abbreviation: string
  description: string
  locked: boolean
}

export interface AbbreviationsContent {
  rows: AbbreviationRow[]
}

export interface ProcessFlowContent {
  text: string
}

export interface OverviewContent {
  system_objective: string
  existing_system: string
  integration: string
  tangible_benefits: string
  intangible_benefits: string
}

export interface FeatureItem {
  id: string
  title: string
  brief: string
  description: string
}

export interface FeaturesContent {
  items: FeatureItem[]
}

export interface RemoteSupportContent {
  text: string
}

export interface DocumentationControlContent {
  custom_items: string[]
}

export interface CustomerTrainingContent {
  persons: string
  days: string
}

export interface SystemConfigContent {
  // No specific fields - just tracks visited status
}

export interface FatConditionContent {
  text: string
}

export interface TechStackRow {
  sr_no: number
  component: string
  technology: string
  note: string
}

export interface TechStackContent {
  rows: TechStackRow[]
}

export interface HardwareSpecsRow {
  sr_no: number
  name: string
  specs_line1: string
  specs_line2: string
  specs_line3: string
  specs_line4: string
  maker: string
  qty: string
  locked_specs_line1?: boolean
}

export interface HardwareSpecsContent {
  rows: HardwareSpecsRow[]
}

export interface SoftwareSpecsRow {
  sr_no: number
  name: string
  maker: string
  qty: string
}

export interface SoftwareSpecsContent {
  rows: SoftwareSpecsRow[]
}

export interface ThirdPartySoftwareContent {
  sw4_name: string
}

export interface OverallGanttContent {
  // No specific fields - just tracks visited status
}

export interface ShutdownGanttContent {
  // No specific fields - just tracks visited status
}

export interface SupervisorsContent {
  pm_days: string
  dev_days: string
  comm_days: string
  total_man_days: string
}

export interface ScopeDefinitionsContent {
  // Auto-filled from project data
}

export interface DivisionOfEngContent {
  training_days?: string
  training_persons?: string
}

export interface WorkCompletionContent {
  custom_items: string[]
}

export interface BuyerObligationsContent {
  custom_items: string[]
}

export interface ExclusionListContent {
  custom_items: string[]
}

export interface BindingConditionsContent {
  // Locked section - no editable content
}

export interface CybersecurityContent {
  // Locked section - no editable content
}

export interface DisclaimerContent {
  // Locked section - no editable content
}

export interface ValueAdditionContent {
  text: string
}

export interface BuyerPrerequisitesContent {
  items: string[]
}

export interface PocContent {
  name: string
  description: string
}

// Store Types
export interface ProjectStore {
  projectId: string | null
  solutionName: string
  solutionFullName: string
  clientName: string
  clientLocation: string
  sectionCompletion: Record<string, boolean>
  
  setProject: (project: ProjectDetail) => void
  setSolutionName: (name: string) => void
  setSectionComplete: (key: string, complete: boolean) => void
  clearProject: () => void
}

export interface UiStore {
  isNewProjectModalOpen: boolean
  activeSectionKey: string | null
  
  openNewProjectModal: () => void
  closeNewProjectModal: () => void
  setActiveSection: (key: string | null) => void
}

// API Response Types
export interface ImageUploadResponse {
  url: string
}

export interface ImageInfo {
  type: string
  url: string
}

export interface AiPromptResponse {
  prompt: string
  recommended_tools: Array<{
    name: string
    url: string
    note: string
  }>
}

// Auto-save hook types
export type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error'

// Generation polling types (stub for future use)
export type GenerationStatus = 'idle' | 'generating' | 'complete' | 'error'
