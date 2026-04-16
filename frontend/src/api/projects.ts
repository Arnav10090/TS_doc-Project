import apiClient from './client'
import type { Project, ProjectDetail, ProjectSummary } from '../types'

export const getAllProjects = async (): Promise<ProjectSummary[]> => {
  const response = await apiClient.get<ProjectSummary[]>('/api/v1/projects')
  return response.data
}

export const createProject = async (data: Partial<Project>): Promise<ProjectDetail> => {
  const response = await apiClient.post<ProjectDetail>('/api/v1/projects', data)
  return response.data
}

export const getProjectById = async (id: string): Promise<ProjectDetail> => {
  const response = await apiClient.get<ProjectDetail>(`/api/v1/projects/${id}`)
  return response.data
}

export const updateProject = async (id: string, data: Partial<Project>): Promise<ProjectDetail> => {
  const response = await apiClient.patch<ProjectDetail>(`/api/v1/projects/${id}`, data)
  return response.data
}

export const deleteProject = async (id: string): Promise<void> => {
  await apiClient.delete(`/api/v1/projects/${id}`)
}
