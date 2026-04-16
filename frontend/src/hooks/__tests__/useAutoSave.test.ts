import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useAutoSave } from '../useAutoSave'
import * as api from '../../api/sections'

vi.mock('../../api/sections')

describe('useAutoSave', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should debounce save calls', async () => {
    const mockUpsert = vi.spyOn(api, 'upsertSection').mockResolvedValue({} as any)
    const { result } = renderHook(() => useAutoSave('project-1', 'cover', 100))

    act(() => {
      result.current.save({ test: 'data1' })
      result.current.save({ test: 'data2' })
      result.current.save({ test: 'data3' })
    })

    // Should only call API once after debounce
    await waitFor(() => {
      expect(mockUpsert).toHaveBeenCalledTimes(1)
      expect(mockUpsert).toHaveBeenCalledWith('project-1', 'cover', { test: 'data3' })
    })
  })

  it('should update status to saving then saved', async () => {
    vi.spyOn(api, 'upsertSection').mockResolvedValue({} as any)
    const { result } = renderHook(() => useAutoSave('project-1', 'cover', 100))

    expect(result.current.status).toBe('idle')

    act(() => {
      result.current.save({ test: 'data' })
    })

    expect(result.current.status).toBe('saving')

    await waitFor(() => {
      expect(result.current.status).toBe('saved')
    })
  })

  it('should update status to error on API failure', async () => {
    vi.spyOn(api, 'upsertSection').mockRejectedValue(new Error('API Error'))
    const { result } = renderHook(() => useAutoSave('project-1', 'cover', 100))

    act(() => {
      result.current.save({ test: 'data' })
    })

    await waitFor(() => {
      expect(result.current.status).toBe('error')
    })
  })
})
