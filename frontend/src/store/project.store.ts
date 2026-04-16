import { create } from 'zustand'
import type { ProjectStore, ProjectDetail } from '../types'

export const useProjectStore = create<ProjectStore>((set) => ({
  projectId: null,
  solutionName: '',
  solutionFullName: '',
  clientName: '',
  clientLocation: '',
  sectionCompletion: {},

  setProject: (project: ProjectDetail) => {
    set({
      projectId: project.id,
      solutionName: project.solution_name,
      solutionFullName: project.solution_full_name,
      clientName: project.client_name,
      clientLocation: project.client_location,
      sectionCompletion: project.section_completion,
    })
  },

  setSolutionName: (name: string) => {
    set({ solutionName: name })
  },

  setSectionComplete: (key: string, complete: boolean) => {
    set((state) => ({
      sectionCompletion: {
        ...state.sectionCompletion,
        [key]: complete,
      },
    }))
  },

  clearProject: () => {
    set({
      projectId: null,
      solutionName: '',
      solutionFullName: '',
      clientName: '',
      clientLocation: '',
      sectionCompletion: {},
    })
  },
}))
