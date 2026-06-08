import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useAutoSave } from '../useAutoSave'
import {
  clearSectionDraft,
  getSectionDraft,
} from '../../utils/sectionDraftStore'

describe('useAutoSave', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearSectionDraft('project-1', 'cover')
  })

  it('stages the latest draft content immediately', () => {
    const { result } = renderHook(() => useAutoSave('project-1', 'cover', 100))

    act(() => {
      result.current.save({ test: 'data1' })
      result.current.save({ test: 'data2' })
      result.current.save({ test: 'data3' })
    })

    expect(getSectionDraft('project-1', 'cover')).toEqual({ test: 'data3' })
  })

  it('dispatches draft change events for the editor shell', async () => {
    const listener = vi.fn()
    window.addEventListener('project-section-draft-changed', listener)
    const { result } = renderHook(() => useAutoSave('project-1', 'cover', 100))

    act(() => {
      result.current.save({ test: 'data' })
    })

    await waitFor(() => {
      expect(listener).toHaveBeenCalled()
    })

    window.removeEventListener('project-section-draft-changed', listener)
  })

  it('keeps the hook status idle because persistence is manual', () => {
    const { result } = renderHook(() => useAutoSave('project-1', 'cover', 100))

    act(() => {
      result.current.save({ test: 'data' })
    })

    expect(result.current.status).toBe('idle')
  })
})
