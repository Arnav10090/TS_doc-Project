import { useCallback } from 'react'
import type { AutoSaveStatus } from '../types'
import { setSectionDraft } from '../utils/sectionDraftStore'

export const SECTION_DRAFT_CHANGED_EVENT = 'project-section-draft-changed'

interface UseAutoSaveReturn {
  save: (content: Record<string, any>) => void
  status: AutoSaveStatus
}

export const useAutoSave = (
  projectId: string,
  sectionKey: string,
  _delay: number = 800,
): UseAutoSaveReturn => {
  const save = useCallback(
    (content: Record<string, any>) => {
      setSectionDraft(projectId, sectionKey, content)

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent(SECTION_DRAFT_CHANGED_EVENT, {
            detail: {
              projectId,
              sectionKey,
              content,
            },
          })
        )
      }
    },
    [projectId, sectionKey]
  )

  return { save, status: 'idle' as AutoSaveStatus }
}
