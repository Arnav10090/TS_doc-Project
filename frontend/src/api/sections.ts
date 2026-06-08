import apiClient from './client'
import type { SectionData } from '../types'
import { clearSectionDraft, getSectionDraft } from '../utils/sectionDraftStore'

export const getAllSections = async (projectId: string): Promise<SectionData[]> => {
  const response = await apiClient.get<SectionData[]>(`/api/v1/projects/${projectId}/sections`)
  return response.data
}

export const getSection = async (projectId: string, sectionKey: string): Promise<SectionData> => {
  const response = await apiClient.get<SectionData>(
    `/api/v1/projects/${projectId}/sections/${sectionKey}`
  )
  const draftContent = getSectionDraft(projectId, sectionKey)

  return draftContent
    ? {
        ...response.data,
        content: draftContent,
      }
    : response.data
}

export const upsertSection = async (
  projectId: string,
  sectionKey: string,
  content: Record<string, any>
): Promise<SectionData> => {
  const response = await apiClient.put<SectionData>(
    `/api/v1/projects/${projectId}/sections/${sectionKey}`,
    { content }
  )
  clearSectionDraft(projectId, sectionKey)
  return response.data
}

export const deleteSection = async (
  projectId: string,
  sectionKey: string
): Promise<void> => {
  await apiClient.delete(
    `/api/v1/projects/${projectId}/sections/${sectionKey}`
  )
}
