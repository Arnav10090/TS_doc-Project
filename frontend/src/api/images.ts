import apiClient from './client'
import type { ImageUploadResponse, ImageInfo } from '../types'

export const uploadImage = async (
  projectId: string,
  imageType: 'architecture' | 'gantt_overall' | 'gantt_shutdown',
  file: File
): Promise<ImageUploadResponse> => {
  const formData = new FormData()
  formData.append('file', file)

  const response = await apiClient.post<ImageUploadResponse>(
    `/api/v1/projects/${projectId}/images/${imageType}`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  )
  return response.data
}

export const getImages = async (projectId: string): Promise<ImageInfo[]> => {
  const response = await apiClient.get<ImageInfo[]>(`/api/v1/projects/${projectId}/images`)
  return response.data
}

export const deleteImage = async (
  projectId: string,
  imageType: 'architecture' | 'gantt_overall' | 'gantt_shutdown'
): Promise<void> => {
  await apiClient.delete(`/api/v1/projects/${projectId}/images/${imageType}`)
}
