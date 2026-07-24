import { useEffect, useState, useCallback, useRef } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { getProjectById, updateProject } from '../api/projects'
import { getAllSections, upsertSection } from '../api/sections'
import { useProjectStore } from '../store/project.store'
import { EditorProvider } from '../contexts/EditorContext'
import { SECTION_DRAFT_CHANGED_EVENT } from '../hooks/useAutoSave'
import { setSectionDraft } from '../utils/sectionDraftStore'
import { buildContentWithEditMetadata } from '../utils/editMetadata'
import Header from '../components/layout/Header'
import SectionSidebar from '../components/layout/SectionSidebar'
import SectionInputPanel from '../components/layout/SectionInputPanel'
import DocumentPreview from '../components/preview/DocumentPreview'
import { mergeSectionContent } from '../components/sections/predefinedSectionContent'
import { isCustomSectionKey } from '../utils/customSectionUtils'
import type { AutoSaveStatus } from '../types'
import toast from 'react-hot-toast'

const HEADER_HEIGHT = 56
const NARROW_LAYOUT_BREAKPOINT = 1200
const LEFT_SIDEBAR_STORAGE_KEY = 'editorLeftSidebarWidth'
const RIGHT_PANEL_STORAGE_KEY = 'editorRightPanelWidth'
const DEFAULT_LEFT_SIDEBAR_WIDTH = 200
const MIN_LEFT_SIDEBAR_WIDTH = 160
const MAX_LEFT_SIDEBAR_WIDTH = 360
const DEFAULT_RIGHT_PANEL_WIDTH = 380
const MIN_RIGHT_PANEL_WIDTH = 320
const MAX_RIGHT_PANEL_WIDTH = 560
const MIN_CENTER_PANEL_WIDTH = 520
const MIN_FORM_PANEL_WIDTH = 360
const RESIZE_KEYBOARD_STEP = 16

type ResizablePanel = 'left' | 'right'

interface SectionDraftChangedDetail {
  projectId: string
  sectionKey: string
  content: Record<string, any>
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max)

const getStoredWidth = (key: string, fallback: number) => {
  if (typeof window === 'undefined') {
    return fallback
  }

  const storedValue = window.localStorage.getItem(key)
  const parsedValue = storedValue ? Number.parseFloat(storedValue) : Number.NaN

  return Number.isFinite(parsedValue) ? parsedValue : fallback
}

const getLeftSidebarBounds = (
  viewportWidth: number,
  rightPanelWidth: number,
  isNarrowScreen: boolean
) => {
  const reservedWidth = isNarrowScreen
    ? MIN_FORM_PANEL_WIDTH
    : rightPanelWidth + MIN_CENTER_PANEL_WIDTH

  return {
    min: MIN_LEFT_SIDEBAR_WIDTH,
    max: Math.max(
      MIN_LEFT_SIDEBAR_WIDTH,
      Math.min(MAX_LEFT_SIDEBAR_WIDTH, viewportWidth - reservedWidth)
    ),
  }
}

const getRightPanelBounds = (viewportWidth: number, leftSidebarWidth: number) => ({
  min: MIN_RIGHT_PANEL_WIDTH,
  max: Math.max(
    MIN_RIGHT_PANEL_WIDTH,
    Math.min(MAX_RIGHT_PANEL_WIDTH, viewportWidth - leftSidebarWidth - MIN_CENTER_PANEL_WIDTH)
  ),
})

const normalizePanelWidths = (
  viewportWidth: number,
  leftSidebarWidth: number,
  rightPanelWidth: number,
  isNarrowScreen: boolean
) => {
  const clampedRightPanelWidth = clamp(
    rightPanelWidth,
    MIN_RIGHT_PANEL_WIDTH,
    MAX_RIGHT_PANEL_WIDTH
  )

  if (isNarrowScreen) {
    const leftBounds = getLeftSidebarBounds(
      viewportWidth,
      clampedRightPanelWidth,
      true
    )

    return {
      leftSidebarWidth: clamp(leftSidebarWidth, leftBounds.min, leftBounds.max),
      rightPanelWidth: clampedRightPanelWidth,
    }
  }

  const leftBounds = getLeftSidebarBounds(
    viewportWidth,
    clampedRightPanelWidth,
    false
  )
  const nextLeftSidebarWidth = clamp(
    leftSidebarWidth,
    leftBounds.min,
    leftBounds.max
  )
  const rightBounds = getRightPanelBounds(viewportWidth, nextLeftSidebarWidth)

  return {
    leftSidebarWidth: nextLeftSidebarWidth,
    rightPanelWidth: clamp(clampedRightPanelWidth, rightBounds.min, rightBounds.max),
  }
}

const EditorPage = () => {
  const { projectId } = useParams<{ projectId: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const setProject = useProjectStore((state) => state.setProject)
  const solutionName = useProjectStore((state) => state.solutionName)
  const solutionFullName = useProjectStore((state) => state.solutionFullName)
  const clientName = useProjectStore((state) => state.clientName)
  const clientLocation = useProjectStore((state) => state.clientLocation)
  
  const [loading, setLoading] = useState(true)
  const [visitedSections, setVisitedSections] = useState<Set<string>>(new Set())
  const [activeSectionKey, setActiveSectionKey] = useState<string>('cover')
  const [activeSubsectionKey, setActiveSubsectionKey] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(true)
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window === 'undefined' ? 1440 : window.innerWidth
  )
  const isNarrowScreen = viewportWidth < NARROW_LAYOUT_BREAKPOINT
  const [sectionContents, setSectionContents] = useState<Record<string, Record<string, any>>>({})
  const [sectionDraftContents, setSectionDraftContents] = useState<Record<string, Record<string, any>>>({})
  const [manualSaveStatus, setManualSaveStatus] = useState<Record<string, AutoSaveStatus>>({})
  const [leftSidebarWidth, setLeftSidebarWidth] = useState(() =>
    getStoredWidth(LEFT_SIDEBAR_STORAGE_KEY, DEFAULT_LEFT_SIDEBAR_WIDTH)
  )
  const [rightPanelWidth, setRightPanelWidth] = useState(() =>
    getStoredWidth(RIGHT_PANEL_STORAGE_KEY, DEFAULT_RIGHT_PANEL_WIDTH)
  )
  const [isLeftSidebarCollapsed, setIsLeftSidebarCollapsed] = useState(false)
  const [resizingPanel, setResizingPanel] = useState<ResizablePanel | null>(null)
  const resizeCleanupRef = useRef<(() => void) | null>(null)
  const sectionDraftsRef = useRef<Record<string, Record<string, any>>>({})
  const manualSaveResetTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const pendingSubsectionSelectionRef = useRef<{
    sectionKey: string
    subsectionKey: string
  } | null>(null)

  const effectiveLeftSidebarWidth = isLeftSidebarCollapsed ? 48 : leftSidebarWidth

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
        sectionDraftsRef.current = contentsMap
        setSectionContents(contentsMap)
        setSectionDraftContents(contentsMap)
      } catch (error) {
        toast.error('Failed to load project')
        console.error('Load project error:', error)
      } finally {
        setLoading(false)
      }
    }

    loadProjectData()
  }, [projectId, setProject])

  useEffect(() => {
    const handleResize = () => {
      setViewportWidth(window.innerWidth)
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (isNarrowScreen) {
      setShowPreview(false)
    }
  }, [isNarrowScreen])

  useEffect(() => {
    const normalizedWidths = normalizePanelWidths(
      viewportWidth,
      leftSidebarWidth,
      rightPanelWidth,
      isNarrowScreen
    )

    if (normalizedWidths.leftSidebarWidth !== leftSidebarWidth) {
      setLeftSidebarWidth(normalizedWidths.leftSidebarWidth)
    }

    if (normalizedWidths.rightPanelWidth !== rightPanelWidth) {
      setRightPanelWidth(normalizedWidths.rightPanelWidth)
    }
  }, [isNarrowScreen, leftSidebarWidth, rightPanelWidth, viewportWidth])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    window.localStorage.setItem(
      LEFT_SIDEBAR_STORAGE_KEY,
      leftSidebarWidth.toString()
    )
  }, [leftSidebarWidth])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    window.localStorage.setItem(
      RIGHT_PANEL_STORAGE_KEY,
      rightPanelWidth.toString()
    )
  }, [rightPanelWidth])

  useEffect(() => () => resizeCleanupRef.current?.(), [])

  useEffect(
    () => () => {
      Object.values(manualSaveResetTimersRef.current).forEach(clearTimeout)
    },
    []
  )

  useEffect(() => {
    const handleSectionDraftChanged = (event: Event) => {
      const customEvent = event as CustomEvent<SectionDraftChangedDetail>
      const detail = customEvent.detail

      if (!detail || detail.projectId !== projectId) {
        return
      }

      sectionDraftsRef.current[detail.sectionKey] = detail.content
      setSectionDraftContents((prev) => ({
        ...prev,
        [detail.sectionKey]: detail.content,
      }))
      setManualSaveStatus((prev) => ({
        ...prev,
        [detail.sectionKey]: 'idle',
      }))
    }

    window.addEventListener(
      SECTION_DRAFT_CHANGED_EVENT,
      handleSectionDraftChanged as EventListener
    )

    return () => {
      window.removeEventListener(
        SECTION_DRAFT_CHANGED_EVENT,
        handleSectionDraftChanged as EventListener
      )
    }
  }, [projectId])

  // Extract active section from URL hash or default to 'cover'
  useEffect(() => {
    const hash = location.hash.replace('#', '')
    const pendingSubsectionSelection = pendingSubsectionSelectionRef.current

    if (hash) {
      setActiveSectionKey(hash)
      if (pendingSubsectionSelection?.sectionKey === hash) {
        setActiveSubsectionKey(pendingSubsectionSelection.subsectionKey)
      } else {
        setActiveSubsectionKey(null)
      }
    } else {
      setActiveSectionKey('cover')
      setActiveSubsectionKey(null)
    }

    pendingSubsectionSelectionRef.current = null
  }, [location.hash])

  const handleSectionClick = (sectionKey: string) => {
    pendingSubsectionSelectionRef.current = null
    setActiveSectionKey(sectionKey)
    setActiveSubsectionKey(null)
    navigate(`/editor/${projectId}#${sectionKey}`)
  }

  const handleSubsectionClick = useCallback(
    (sectionKey: string, subsectionKey: string) => {
      const currentHash = location.hash.replace('#', '')

      setActiveSectionKey(sectionKey)
      setActiveSubsectionKey(subsectionKey)

      if (currentHash === sectionKey) {
        pendingSubsectionSelectionRef.current = null
        return
      }

      pendingSubsectionSelectionRef.current = {
        sectionKey,
        subsectionKey,
      }
      navigate(`/editor/${projectId}#${sectionKey}`)
    },
    [location.hash, navigate, projectId]
  )

  const handleSectionContentChange = useCallback((sectionKey: string, content: Record<string, any>) => {
    if (projectId) {
      setSectionDraft(projectId, sectionKey, content)
    }

    sectionDraftsRef.current[sectionKey] = content
    setSectionDraftContents((prev) => ({
      ...prev,
      [sectionKey]: content,
    }));
    setManualSaveStatus((prev) => ({
      ...prev,
      [sectionKey]: 'idle',
    }))
  }, [projectId])

  const refreshSections = useCallback(async () => {
    if (!projectId) return;
    
    try {
      // Reload all sections from the API
      const sections = await getAllSections(projectId);
      const visited = new Set(sections.map((s) => s.section_key));
      setVisitedSections(visited);

      // Rebuild section contents map
      const contentsMap: Record<string, Record<string, any>> = {};
      sections.forEach((section) => {
        contentsMap[section.section_key] = section.content || {};
      });
      sectionDraftsRef.current = contentsMap;
      setSectionContents(contentsMap);
      setSectionDraftContents(contentsMap);
    } catch (error) {
      console.error('Error refreshing sections:', error);
    }
  }, [projectId]);

  const handleSidebarResizeStep = useCallback(
    (side: ResizablePanel, delta: number) => {
      if (isNarrowScreen) {
        return
      }

      if (side === 'left') {
        const bounds = getLeftSidebarBounds(viewportWidth, rightPanelWidth, false)
        setLeftSidebarWidth((currentWidth) =>
          clamp(currentWidth + delta, bounds.min, bounds.max)
        )
        return
      }

      const bounds = getRightPanelBounds(viewportWidth, leftSidebarWidth)
      setRightPanelWidth((currentWidth) =>
        clamp(currentWidth + delta, bounds.min, bounds.max)
      )
    },
    [isNarrowScreen, leftSidebarWidth, rightPanelWidth, viewportWidth]
  )

  const handleSaveActiveSection = useCallback(
    async (sectionKey: string) => {
      if (!projectId) return

      const content =
        sectionDraftsRef.current[sectionKey] ||
        sectionDraftContents[sectionKey] ||
        sectionContents[sectionKey] ||
        {}
      const baselineContent = isCustomSectionKey(sectionKey)
        ? sectionContents[sectionKey]
        : mergeSectionContent(sectionKey, sectionContents[sectionKey] || {}, {
            solutionName,
            solutionFullName,
            clientName,
            clientLocation,
          })
      const contentWithEditMetadata = buildContentWithEditMetadata(
        baselineContent,
        content
      )

      const existingTimer = manualSaveResetTimersRef.current[sectionKey]
      if (existingTimer) {
        clearTimeout(existingTimer)
      }

      setManualSaveStatus((prev) => ({
        ...prev,
        [sectionKey]: 'saving',
      }))

      try {
        const savedSection = await upsertSection(projectId, sectionKey, contentWithEditMetadata)
        const savedContent = savedSection.content || contentWithEditMetadata

        if (sectionKey === 'cover') {
          const updatedProject = await updateProject(projectId, {
            solution_full_name: savedContent.solution_full_name,
            client_name: savedContent.client_name,
            client_location: savedContent.client_location,
            ref_number: savedContent.ref_number,
            doc_date: savedContent.doc_date,
            doc_version: savedContent.doc_version,
          })
          setProject(updatedProject)
        }

        sectionDraftsRef.current[sectionKey] = savedContent
        setSectionContents((prev) => ({
          ...prev,
          [sectionKey]: savedContent,
        }))
        setSectionDraftContents((prev) => ({
          ...prev,
          [sectionKey]: savedContent,
        }))
        setManualSaveStatus((prev) => ({
          ...prev,
          [sectionKey]: 'saved',
        }))
        toast.success('Section saved')

        manualSaveResetTimersRef.current[sectionKey] = setTimeout(() => {
          setManualSaveStatus((prev) => ({
            ...prev,
            [sectionKey]: 'idle',
          }))
          delete manualSaveResetTimersRef.current[sectionKey]
        }, 2000)
      } catch (error) {
        console.error('Manual section save error:', error)
        setManualSaveStatus((prev) => ({
          ...prev,
          [sectionKey]: 'error',
        }))
        toast.error('Failed to save section')
      }
    },
    [
      clientLocation,
      clientName,
      projectId,
      sectionContents,
      sectionDraftContents,
      setProject,
      solutionFullName,
      solutionName,
    ]
  )

  const createResizeHandler = useCallback(
    (side: ResizablePanel) => (event: ReactPointerEvent<HTMLDivElement>) => {
      if (isNarrowScreen) {
        return
      }

      event.preventDefault()

      const startX = event.clientX
      const initialWidth = side === 'left' ? leftSidebarWidth : rightPanelWidth
      const previousCursor = document.body.style.cursor
      const previousUserSelect = document.body.style.userSelect

      resizeCleanupRef.current?.()
      setResizingPanel(side)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'

      const handlePointerMove = (moveEvent: PointerEvent) => {
        const delta = moveEvent.clientX - startX

        if (side === 'left') {
          const bounds = getLeftSidebarBounds(window.innerWidth, rightPanelWidth, false)
          setLeftSidebarWidth(clamp(initialWidth + delta, bounds.min, bounds.max))
          return
        }

        const bounds = getRightPanelBounds(window.innerWidth, leftSidebarWidth)
        setRightPanelWidth(clamp(initialWidth - delta, bounds.min, bounds.max))
      }

      const stopResizing = () => {
        document.body.style.cursor = previousCursor
        document.body.style.userSelect = previousUserSelect
        setResizingPanel(null)
        window.removeEventListener('pointermove', handlePointerMove)
        window.removeEventListener('pointerup', stopResizing)
        window.removeEventListener('pointercancel', stopResizing)
        resizeCleanupRef.current = null
      }

      resizeCleanupRef.current = stopResizing
      window.addEventListener('pointermove', handlePointerMove)
      window.addEventListener('pointerup', stopResizing)
      window.addEventListener('pointercancel', stopResizing)
    },
    [isNarrowScreen, leftSidebarWidth, rightPanelWidth]
  )

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
    <EditorProvider refreshSections={refreshSections}>
      <div className="min-h-screen bg-bg">
        <Header />
      
      <div
        style={{
          display: 'flex',
          marginTop: `${HEADER_HEIGHT}px`,
          height: `calc(100vh - ${HEADER_HEIGHT}px)`,
        }}
      >
        <SectionSidebar
          projectId={projectId}
          activeSectionKey={activeSectionKey}
          onSectionClick={handleSectionClick}
          visitedSections={visitedSections}
          sectionContents={sectionContents}
          width={effectiveLeftSidebarWidth}
          showResizeHandle={!isNarrowScreen && !isLeftSidebarCollapsed}
          isResizing={resizingPanel === 'left'}
          onResizeStart={createResizeHandler('left')}
          onResizeStep={(delta) => handleSidebarResizeStep('left', delta)}
          isCollapsed={isLeftSidebarCollapsed}
          onToggleCollapsed={() => setIsLeftSidebarCollapsed(prev => !prev)}
        />

        {(!isNarrowScreen || showPreview) && (
          <div
            style={{
              position: isNarrowScreen ? 'fixed' : 'absolute',
              left: isNarrowScreen ? 0 : `${effectiveLeftSidebarWidth}px`,
              right: isNarrowScreen ? 0 : `${rightPanelWidth}px`,
              top: `${HEADER_HEIGHT}px`,
              bottom: isNarrowScreen ? 0 : 0,
              height: `calc(100vh - ${HEADER_HEIGHT}px)`,
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
              activeSubsectionKey={activeSubsectionKey}
              sectionContents={sectionContents}
              onSectionClick={handleSectionClick}
              onSubsectionClick={handleSubsectionClick}
            />
          </div>
        )}

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
          activeSubsectionKey={activeSubsectionKey}
          sectionContents={sectionDraftContents}
          onContentChange={handleSectionContentChange}
          onSaveSection={handleSaveActiveSection}
          saveStatus={manualSaveStatus[activeSectionKey] || 'idle'}
          onSectionNavigate={handleSectionClick}
          onSubsectionSelect={setActiveSubsectionKey}
          onRefresh={refreshSections}
          width={rightPanelWidth}
          leftOffset={effectiveLeftSidebarWidth}
          isNarrowScreen={isNarrowScreen}
          showResizeHandle={!isNarrowScreen}
          isResizing={resizingPanel === 'right'}
          onResizeStart={createResizeHandler('right')}
          onResizeStep={(delta) => handleSidebarResizeStep('right', delta)}
          resizeKeyboardStep={RESIZE_KEYBOARD_STEP}
        />
      </div>
    </div>
    </EditorProvider>
  )
}

export default EditorPage
