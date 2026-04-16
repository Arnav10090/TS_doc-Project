import apiClient from './client'
import type { DocumentVersion } from '../types'

export const generateDocument = async (projectId: string): Promise<Blob> => {
  try {
    const response = await apiClient.post(
      `/api/v1/projects/${projectId}/generate`,
      {},
      {
        responseType: 'blob', // CRITICAL: Must use blob for binary file download
      }
    )
    return response.data
  } catch (error: any) {
    // When responseType is 'blob', error responses are also returned as Blob
    // We need to parse the blob as JSON to get the actual error details
    if (error.response?.data instanceof Blob) {
      try {
        const text = await error.response.data.text()
        const parsed = JSON.parse(text)
        
        // Replace the blob data with parsed JSON so error handlers can access it
        error.response.data = parsed
      } catch (parseError) {
        // If parsing fails, leave the original blob
        console.error('Failed to parse error response blob:', parseError)
      }
    }
    
    // Re-throw the error with the parsed data
    throw error
  }
}

export const getVersions = async (projectId: string): Promise<DocumentVersion[]> => {
  const response = await apiClient.get<DocumentVersion[]>(
    `/api/v1/projects/${projectId}/versions`
  )
  return response.data
}

export const downloadVersion = async (versionId: string): Promise<Blob> => {
  try {
    const response = await apiClient.get(`/api/v1/versions/${versionId}/download`, {
      responseType: 'blob',
    })
    return response.data
  } catch (error: any) {
    // Handle blob error responses
    if (error.response?.data instanceof Blob) {
      try {
        const text = await error.response.data.text()
        const parsed = JSON.parse(text)
        error.response.data = parsed
      } catch (parseError) {
        console.error('Failed to parse error response blob:', parseError)
      }
    }
    throw error
  }
}
