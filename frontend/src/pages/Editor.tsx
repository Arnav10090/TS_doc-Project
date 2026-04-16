import { useEffect, useState } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { getProjectById } from '../api/projects'
import { getAllSections } from '../api/sections'
import { useProjectStore } from '../store/project.store'
import Header from '../components/layout/Header'
import SectionSidebar from '../components/layout/SectionSidebar'
import toast from 'react-hot-toast'

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
} from '../components/sections'

// Map section keys to components
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
}

const EditorPage = () => {
  const { projectId } = useParams<{ projectId: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const setProject = useProjectStore((state) => state.setProject)
  
  const [loading, setLoading] = useState(true)
  const [visitedSections, setVisitedSections] = useState<Set<string>>(new Set())
  const [activeSectionKey, setActiveSectionKey] = useState<string>('cover')

  useEffect(() => {
    if (!projectId) return

    const loadProjectData = async () => {
      try {
        // Fetch project details
        const project = await getProjectById(projectId)
        setProject(project)

        // Fetch all sections to build visited state
        const sections = await getAllSections(projectId)
        const visited = new Set(sections.map((s) => s.section_key))
        setVisitedSections(visited)
      } catch (error) {
        toast.error('Failed to load project')
        console.error('Load project error:', error)
      } finally {
        setLoading(false)
      }
    }

    loadProjectData()
  }, [projectId, setProject])

  // Extract active section from URL hash or default to 'cover'
  useEffect(() => {
    const hash = location.hash.replace('#', '')
    if (hash) {
      setActiveSectionKey(hash)
    } else {
      setActiveSectionKey('cover')
    }
  }, [location.hash])

  const handleSectionClick = (sectionKey: string) => {
    navigate(`/editor/${projectId}#${sectionKey}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <p className="text-text-muted">Loading project...</p>
      </div>
    )
  }

  if (!projectId) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <p className="text-text-muted">Project not found</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg">
      <Header />
      
      <div className="flex" style={{ marginTop: '56px' }}>
        {/* Sidebar */}
        <SectionSidebar
          projectId={projectId}
          activeSectionKey={activeSectionKey}
          onSectionClick={handleSectionClick}
          visitedSections={visitedSections}
        />

        {/* Main Content Area */}
        <main
          className="flex-1 overflow-y-auto"
          style={{ marginLeft: '260px', minHeight: 'calc(100vh - 56px)' }}
        >
          <div className="p-8">
            {(() => {
              // Retrieve component using activeSectionKey with fallback to cover
              const SectionComponent = SECTION_COMPONENTS[activeSectionKey] || SECTION_COMPONENTS['cover']
              return <SectionComponent projectId={projectId} />
            })()}
          </div>
        </main>
      </div>
    </div>
  )
}

export default EditorPage
