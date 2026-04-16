import axios, { AxiosError } from 'axios'
import toast from 'react-hot-toast'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Response interceptor for centralized error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response) {
      const status = error.response.status
      const data = error.response.data as any

      switch (status) {
        case 400:
          toast.error('Invalid request')
          break
        case 404:
          toast.error('Resource not found')
          break
        case 422:
          // Handle validation errors with missing sections
          if (data?.detail?.missing_sections) {
            const missingSections = data.detail.missing_sections
            toast.error(`Missing required sections: ${missingSections.join(', ')}`)
          } else {
            toast.error('Validation error')
          }
          break
        case 500:
          toast.error('Server error. Please try again.')
          break
        default:
          toast.error('An error occurred')
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
