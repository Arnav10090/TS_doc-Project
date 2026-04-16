import apiClient from './client'
import type { AiPromptResponse } from '../types'

export const getAiPrompt = async (
  projectId: string,
  promptType: 'architecture' | 'gantt_overall' | 'gantt_shutdown'
): Promise<AiPromptResponse> => {
  const response = await apiClient.post<AiPromptResponse>(
    `/api/v1/projects/${projectId}/ai-prompt/${promptType}`
  )
  return response.data
}
