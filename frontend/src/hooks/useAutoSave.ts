import { useState, useRef, useCallback } from 'react'
import { upsertSection } from '../api/sections'
import type { AutoSaveStatus } from '../types'

interface UseAutoSaveReturn {
  save: (content: Record<string, any>) => void
  status: AutoSaveStatus
}

export const useAutoSave = (
  projectId: string,
  sectionKey: string,
  delay: number = 800
): UseAutoSaveReturn => {
  const [status, setStatus] = useState<AutoSaveStatus>('idle')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const save = useCallback(
    (content: Record<string, any>) => {
      // Clear existing timer
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }

      // Clear reset timer if exists
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current)
      }

      // Set status to saving
      setStatus('saving')

      // Start new debounce timer
      timerRef.current = setTimeout(async () => {
        try {
          await upsertSection(projectId, sectionKey, content)
          setStatus('saved')

          // Reset to idle after 2 seconds
          resetTimerRef.current = setTimeout(() => {
            setStatus('idle')
          }, 2000)
        } catch (error) {
          setStatus('error')
          console.error('Auto-save error:', error)
        }
      }, delay)
    },
    [projectId, sectionKey, delay]
  )

  return { save, status }
}
