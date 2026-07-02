import axios, { AxiosError } from 'axios'
import toast from 'react-hot-toast'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

const getDetailMessage = (detail: unknown): string | undefined => {
  if (typeof detail === 'string') return detail
  if (detail && typeof detail === 'object' && 'message' in detail) {
    const message = (detail as { message?: unknown }).message
    return typeof message === 'string' ? message : undefined
  }
  return undefined
}

const getAIErrorMessage = (status: number, detail?: string): string | undefined => {
  const normalizedDetail = detail?.toLowerCase() ?? ''

  if (status === 400) {
    if (normalizedDetail.includes('ts type')) {
      return 'Select a TS type for this project to enable AI suggestions.'
    }
    if (normalizedDetail.includes('not available for section')) {
      return detail
    }
    if (normalizedDetail.includes('invalid section_key')) {
      return 'This section cannot use AI suggestions.'
    }
    return detail || 'AI suggestion request is invalid. Review the section and try again.'
  }

  if (status === 404) {
    if (normalizedDetail.includes('custom section')) {
      return 'Save this custom section before requesting AI suggestions.'
    }
    if (normalizedDetail.includes('project')) {
      return 'Project not found. Reload the page and try again.'
    }
    return detail || 'The requested AI suggestion resource was not found.'
  }

  if (status === 502) {
    return 'The AI provider could not generate a response. Please try again.'
  }

  if (status === 503) {
    return 'AI suggestions are not configured. Ask an admin to set GROQ_API_KEY.'
  }

  if (status === 504) {
    return 'AI suggestion timed out. Please try again.'
  }

  return undefined
}

// Response interceptor for centralized error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response) {
      const status = error.response.status
      const data = error.response.data as any
      const detail = getDetailMessage(data?.detail)
      const requestUrl = error.config?.url ?? ''
      const isAIRequest = requestUrl.includes('/ai-suggestions')

      const aiErrorMessage = isAIRequest ? getAIErrorMessage(status, detail) : undefined
      if (aiErrorMessage) {
        toast.error(aiErrorMessage)
        return Promise.reject(error)
      }

      switch (status) {
        case 400:
          toast.error(detail || 'Invalid request')
          break
        case 404:
          toast.error(detail || 'Resource not found')
          break
        case 422:
          // Handle validation errors with missing sections
          if (data?.detail?.missing_sections) {
            const missingSections = data.detail.missing_sections
            toast.error(`Missing required sections: ${missingSections.join(', ')}`)
          } else {
            toast.error(detail || 'Validation error')
          }
          break
        case 500:
          toast.error('Server error. Please try again.')
          break
        default:
          toast.error(detail || 'An error occurred')
      }
    } else if (error.request) {
      toast.error('Network error. Check your connection.')
    } else {
      toast.error('An unexpected error occurred')
    }

    return Promise.reject(error)
  }
)

export default apiClient
