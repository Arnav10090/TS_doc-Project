import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAllProjects, deleteProject } from '../api/projects'
import { getVersions, downloadVersion } from '../api/generation'
import { handleDocumentDownload } from '../utils/downloadHelper'
import { useUiStore } from '../store/ui.store'
import type { ProjectSummary } from '../types'
import toast from 'react-hot-toast'

const HomePage = () => {
  const navigate = useNavigate()
  const openNewProjectModal = useUiStore((state) => state.openNewProjectModal)
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    try {
      const data = await getAllProjects()
      setProjects(data)
    } catch (error) {
      toast.error('Failed to load projects')
      console.error('Load projects error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenProject = (projectId: string) => {
    navigate(`/editor/${projectId}`)
  }

  const handleDeleteProject = async (projectId: string) => {
    try {
      await deleteProject(projectId)
      toast.success('Project deleted successfully')
      setProjects(projects.filter((p) => p.id !== projectId))
      setDeleteConfirmId(null)
    } catch (error) {
      toast.error('Failed to delete project')
      console.error('Delete project error:', error)
    }
  }

  const handleDownloadLatest = async (projectId: string) => {
    try {
      const versions = await getVersions(projectId)
      if (versions.length === 0) {
        toast.error('No document versions available')
        return
      }

      const latestVersion = versions[0]
      const blob = await downloadVersion(latestVersion.id)
      
      handleDocumentDownload(blob, latestVersion.filename)
    } catch (error) {
      toast.error('Failed to download document')
      console.error('Download error:', error)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <div className="bg-surface border-b border-border">
        <div className="max-w-7xl mx-auto px-8 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-primary mb-2">HITACHI</h1>
            <p className="text-xl text-text-muted">Technical Specification Generator</p>
          </div>
          <button
            onClick={openNewProjectModal}
            className="px-6 py-3 bg-primary text-white font-semibold rounded hover:bg-[#C50010] transition-colors"
          >
            New Project
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-8 py-8">
        {loading ? (
          <div className="text-center py-12">
            <p className="text-text-muted">Loading projects...</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-xl text-text-muted mb-8">
              No projects yet. Create your first TS document.
            </p>
            <button
              onClick={openNewProjectModal}
              className="px-8 py-4 bg-primary text-white text-lg font-semibold rounded hover:bg-[#C50010] transition-colors"
            >
              New Project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <div
                key={project.id}
                className="bg-surface border border-border rounded-lg p-6 hover:shadow-lg transition-shadow"
              >
                <h3 className="text-lg font-bold text-text mb-2">
                  {project.solution_name}
                </h3>
                <p className="text-sm text-text-muted mb-1">
                  {project.client_name}
                </p>
                <p className="text-sm text-text-muted mb-3">
                  {project.client_location}
                </p>
                <p className="text-xs text-text-muted mb-4">
                  Created: {formatDate(project.created_at)}
                </p>

                {/* Completion Badge */}
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex-1 bg-border rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-primary h-full transition-all"
                      style={{ width: `${project.completion_percentage}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-text-muted">
                    {Math.round((project.completion_percentage / 100) * project.total_sections)} / {project.total_sections} sections
                  </span>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => handleOpenProject(project.id)}
                    className="w-full px-4 py-2 bg-primary text-white font-semibold rounded hover:bg-[#C50010] transition-colors"
                  >
                    Open →
                  </button>
                  <button
                    onClick={() => handleDownloadLatest(project.id)}
                    className="w-full px-4 py-2 bg-surface text-primary border border-primary font-semibold rounded hover:bg-primary-light transition-colors"
                  >
                    Download Latest
                  </button>
                  {deleteConfirmId === project.id ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDeleteProject(project.id)}
                        className="flex-1 px-4 py-2 bg-primary text-white font-semibold rounded hover:bg-[#C50010] transition-colors"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        className="flex-1 px-4 py-2 bg-surface text-text border border-border font-semibold rounded hover:bg-bg transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirmId(project.id)}
                      className="w-full px-4 py-2 bg-surface text-primary border border-border font-semibold rounded hover:bg-bg transition-colors"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default HomePage
