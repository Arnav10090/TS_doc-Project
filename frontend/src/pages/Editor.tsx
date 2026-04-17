import { useEffect, useState, useCallback } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { getProjectById } from '../api/projects'
import { getAllSections } from '../api/sections'
import { useProjectStore } from '../store/project.store'
import Header from '../components/layout/Header'
import SectionSidebar from '../components/layout/SectionSidebar'
import SectionInputPanel from '../components/layout/SectionInputPanel'
import DocumentPreview from '../components/preview/DocumentPreview'
import toast from 'react-hot-toast'

const EditorPage = () => {
  const { projectId } = useParams<{ projectId: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const setProject = useProjectStore((state) => state.setProject)
  
  const [loading, setLoading] = useState(true)
  const [visitedSections, setVisitedSections] = useState<Set<string>>(new Set())
  const [activeSectionKey, setActiveSectionKey] = useState<string>('cover')
  const [showPreview, setShowPreview] = useState(true)
  const [isNarrowScreen, setIsNarrowScreen] = useState(false)
  const [sectionContents, setSectionContents] = useState<Record<string, Record<string, any>>>({})

  useEffect(() => {
    if (!projectId) return

    const loadProjectData = async () => {
      try {
        // Fetch project details
        const project = await getProjectById(projectId)
        setProject(project)

        // Fetch all sections to build visited state and content
        const sections = await getAllSections(projectId)
        const visited = new Set(sections.map((s) => s.section_key))
        setVisitedSections(visited)

        // Build section contents map
        const contentsMap: Record<string, Record<string, any>> = {}
        sections.forEach((section) => {
          contentsMap[section.section_key] = section.content || {}
        })
        setSectionContents(contentsMap)
      } catch (error) {
        toast.error('Failed to load project')
        console.error('Load project error:', error)
      } finally {
        setLoading(false)
      }
    }

    loadProjectData()
  }, [projectId, setProject])

  // Handle responsive layout
  useEffect(() => {
    const handleResize = () => {
      const isNarrow = window.innerWidth < 1200
      setIsNarrowScreen(isNarrow)
      if (isNarrow) {
        setShowPreview(false)
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

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

  const handleSectionContentChange = useCallback((sectionKey: string, content: Record<string, any>) => {
    setSectionContents((prev) => ({
      ...prev,
      [sectionKey]: content,
    }))
  }, [])

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
      
      <div style={{ display: 'flex', marginTop: '56px', height: 'calc(100vh - 56px)' }}>
        {/* Left Sidebar - 200px */}
        <SectionSidebar
          projectId={projectId}
          activeSectionKey={activeSectionKey}
          onSectionClick={handleSectionClick}
          visitedSections={visitedSections}
        />

        {/* Center Panel - Document Preview */}
        {(!isNarrowScreen || showPreview) && (
          <div
            style={{
              position: isNarrowScreen ? 'fixed' : 'absolute',
              left: isNarrowScreen ? 0 : '200px',
              right: isNarrowScreen ? 0 : '380px',
              top: isNarrowScreen ? '56px' : '56px',
              bottom: isNarrowScreen ? 0 : 0,
              height: isNarrowScreen ? 'calc(100vh - 56px)' : 'calc(100vh - 56px)',
              backgroundColor: '#E8E8E8',
              overflowY: 'auto',
              overflowX: 'hidden',
              zIndex: isNarrowScreen ? 50 : 'auto',
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            {isNarrowScreen && (
              <button
                onClick={() => setShowPreview(false)}
                style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  padding: '8px 16px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E5E7EB',
                  borderRadius: '4px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  zIndex: 10,
                }}
              >
                Close Preview
              </button>
            )}
            <DocumentPreview 
              projectId={projectId} 
              activeSectionKey={activeSectionKey}
              sectionContents={sectionContents}
              onSectionClick={handleSectionClick}
            />
          </div>
        )}

        {/* Right Panel - Section Input - 380px */}
        <div
          style={{
            marginLeft: isNarrowScreen ? '200px' : 'auto',
            width: isNarrowScreen ? 'calc(100% - 200px)' : 'auto',
          }}
        >
          {isNarrowScreen && !showPreview && (
            <button
              onClick={() => setShowPreview(true)}
              style={{
                position: 'fixed',
                bottom: '24px',
                left: '50%',
                transform: 'translateX(-50%)',
                padding: '12px 24px',
                backgroundColor: '#E60012',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '4px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                zIndex: 40,
              }}
            >
              Show Preview
            </button>
          )}
          <SectionInputPanel 
            projectId={projectId} 
            activeSectionKey={activeSectionKey}
            onContentChange={handleSectionContentChange}
          />
        </div>
      </div>
    </div>
  )
}

export default EditorPage
