import apiClient from './client'

export interface SubsectionSuggestion {
  subsection_index: number
  subsection_name?: string | null
  type: string
  content?: unknown
  raw_text?: string | null
  structured_import_available: boolean
}

export interface SuggestionResponse {
  section_key: string
  section_title?: string | null
  suggestion_mode?: string | null
  structured_import_available: boolean
  content?: unknown
  subsection_suggestions?: SubsectionSuggestion[] | null
  raw_text?: string | null
  historical_context_available: boolean
  context_sources?: string[] | null
  context_txt_used?: boolean | null
}

export interface DrawioResponse {
  drawio_xml: string
  chart_instructions?: string | null
}

export interface AISuggestionsStatusResponse {
  ai_configured?: boolean
  provider?: string
  model?: string
  groq_configured?: boolean
}

export interface SuggestionRequest {
  draft_content?: Record<string, unknown>
}

export const getAISuggestionsStatus = async (): Promise<AISuggestionsStatusResponse> => {
  const response = await apiClient.get<AISuggestionsStatusResponse>('/api/v1/ai-suggestions/status')
  return response.data
}

export const generateAISuggestion = async (
  projectId: string,
  sectionKey: string,
  draftContent?: Record<string, unknown>,
): Promise<SuggestionResponse> => {
  const payload: SuggestionRequest = { draft_content: draftContent }
  const response = await apiClient.post<SuggestionResponse>(
    `/api/v1/projects/${projectId}/ai-suggestions/${sectionKey}`,
    payload,
  )
  return response.data
}

export const generateDrawioSuggestion = async (
  projectId: string,
  sectionKey: string,
  draftContent?: Record<string, unknown>,
): Promise<DrawioResponse> => {
  const payload: SuggestionRequest = { draft_content: draftContent }
  const response = await apiClient.post<DrawioResponse>(
    `/api/v1/projects/${projectId}/ai-suggestions/${sectionKey}/drawio`,
    payload,
  )
  return response.data
}