import { create } from 'zustand'
import type { UiStore } from '../types'

export const useUiStore = create<UiStore>((set) => ({
  isNewProjectModalOpen: false,
  activeSectionKey: null,

  openNewProjectModal: () => {
    set({ isNewProjectModalOpen: true })
  },

  closeNewProjectModal: () => {
    set({ isNewProjectModalOpen: false })
  },

  setActiveSection: (key: string | null) => {
    set({ activeSectionKey: key })
  },
}))
