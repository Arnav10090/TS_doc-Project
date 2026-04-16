import apiClient from './client'
import type { DocumentVersion } from '../types'

export const generateDocument = async (projectId: string): Promise<Blob> => {
  const response = await apiClient.post(
    `/api/v1/projects/${projectId}/generate`,
    {},
    {
      responseType: 'blob', // CRITICAL: Must use blob for binary file download
    }
  )
  return response.data
}

export const getVersions = async (projectId: string): Promise<DocumentVersion[]> => {
  const response = await apiClient.get<DocumentVersion[]>(
    `/api/v1/projects/${projectId}/versions`
  )
  return response.data
}

export const downloadVersion = async (versionId: string): Promise<Blob> => {
  const response = await apiClient.get(`/api/v1/versions/${versionId}/download`, {
    responseType: 'blob',
  })
  return response.data
}
