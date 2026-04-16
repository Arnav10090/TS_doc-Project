import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { createProject } from '../../api/projects'
import { useUiStore } from '../../store/ui.store'
import toast from 'react-hot-toast'

const NewProjectModal = () => {
  const navigate = useNavigate()
  const { isNewProjectModalOpen, closeNewProjectModal } = useUiStore()
  
  const [formData, setFormData] = useState({
    solution_name: '',
    solution_full_name: '',
    solution_abbreviation: '',
    client_name: '',
    client_location: '',
    client_abbreviation: '',
    ref_number: '',
    doc_date: '',
    doc_version: '0',
  })
  
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isNewProjectModalOpen) {
        closeNewProjectModal()
      }
    }
    
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isNewProjectModalOpen, closeNewProjectModal])

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const isFormValid = () => {
    return (
      formData.solution_name.trim() !== '' &&
      formData.solution_full_name.trim() !== '' &&
      formData.client_name.trim() !== '' &&
      formData.client_location.trim() !== ''
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!isFormValid()) {
      toast.error('Please fill in all required fields')
      return
    }

    setIsSubmitting(true)
    
    try {
      const newProject = await createProject(formData)
      toast.success('Project created successfully')
      closeNewProjectModal()
      navigate(`/editor/${newProject.id}`)
    } catch (error) {
      toast.error('Failed to create project')
      console.error('Create project error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      closeNewProjectModal()
    }
  }

  if (!isNewProjectModalOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleOverlayClick}
    >
      <div className="bg-surface rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-border">
          <h2 className="text-2xl font-bold text-text">Create New Project</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            {/* Solution Name */}
            <div>
              <label className="block text-sm font-semibold text-text mb-1">
                Solution Name <span className="text-primary">*</span>
              </label>
              <input
                type="text"
                value={formData.solution_name}
                onChange={(e) => handleChange('solution_name', e.target.value)}
                className="w-full px-3 py-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="e.g., MES System"
              />
            </div>

            {/* Solution Full Name */}
            <div>
              <label className="block text-sm font-semibold text-text mb-1">
                Solution Full Name <span className="text-primary">*</span>
              </label>
              <input
                type="text"
                value={formData.solution_full_name}
                onChange={(e) => handleChange('solution_full_name', e.target.value)}
                className="w-full px-3 py-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="e.g., Manufacturing Execution System"
              />
            </div>

            {/* Solution Abbreviation */}
            <div>
              <label className="block text-sm font-semibold text-text mb-1">
                Solution Abbreviation
              </label>
              <input
                type="text"
                value={formData.solution_abbreviation}
                onChange={(e) => handleChange('solution_abbreviation', e.target.value)}
                className="w-full px-3 py-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="e.g., MES"
              />
            </div>

            {/* Client Name */}
            <div>
              <label className="block text-sm font-semibold text-text mb-1">
                Client Name <span className="text-primary">*</span>
              </label>
              <input
                type="text"
                value={formData.client_name}
                onChange={(e) => handleChange('client_name', e.target.value)}
                className="w-full px-3 py-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="e.g., ABC Manufacturing Ltd"
              />
            </div>

            {/* Client Location */}
            <div>
              <label className="block text-sm font-semibold text-text mb-1">
                Client Location <span className="text-primary">*</span>
              </label>
              <input
                type="text"
                value={formData.client_location}
                onChange={(e) => handleChange('client_location', e.target.value)}
                className="w-full px-3 py-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="e.g., Mumbai, India"
              />
            </div>

            {/* Client Abbreviation */}
            <div>
              <label className="block text-sm font-semibold text-text mb-1">
                Client Abbreviation
              </label>
              <input
                type="text"
                value={formData.client_abbreviation}
                onChange={(e) => handleChange('client_abbreviation', e.target.value)}
                className="w-full px-3 py-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="e.g., ABC"
              />
            </div>

            {/* Reference Number */}
            <div>
              <label className="block text-sm font-semibold text-text mb-1">
                Reference Number
              </label>
              <input
                type="text"
                value={formData.ref_number}
                onChange={(e) => handleChange('ref_number', e.target.value)}
                className="w-full px-3 py-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="e.g., REF-2024-001"
              />
            </div>

            {/* Document Date */}
            <div>
              <label className="block text-sm font-semibold text-text mb-1">
                Document Date
              </label>
              <input
                type="text"
                value={formData.doc_date}
                onChange={(e) => handleChange('doc_date', e.target.value)}
                className="w-full px-3 py-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="e.g., 15 Jan 2024"
              />
            </div>

            {/* Document Version */}
            <div>
              <label className="block text-sm font-semibold text-text mb-1">
                Document Version
              </label>
              <input
                type="text"
                value={formData.doc_version}
                onChange={(e) => handleChange('doc_version', e.target.value)}
                className="w-full px-3 py-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="e.g., 0"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-6">
            <button
              type="submit"
              disabled={!isFormValid() || isSubmitting}
              className="flex-1 px-6 py-3 bg-primary text-white font-semibold rounded hover:bg-[#C50010] transition-colors disabled:bg-text-muted disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Creating...' : 'Create Project'}
            </button>
            <button
              type="button"
              onClick={closeNewProjectModal}
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 bg-surface text-text border border-border font-semibold rounded hover:bg-bg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default NewProjectModal
