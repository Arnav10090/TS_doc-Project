import apiClient from './client'
import type { TSTypeOption } from '../types'

export interface TSTypesResponse {
  ts_types: TSTypeOption[]
}

export const getTSTypes = async (): Promise<TSTypesResponse> => {
  const response = await apiClient.get<TSTypesResponse>('/api/v1/projects/ts-types')
  return response.data
}
