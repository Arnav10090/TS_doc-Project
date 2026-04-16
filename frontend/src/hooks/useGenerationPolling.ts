import type { GenerationStatus } from '../types'

/**
 * useGenerationPolling - Reserved for future async generation support
 * 
 * MVP Implementation: Document generation is synchronous.
 * The backend generates the .docx file and returns it immediately.
 * This hook is a stub for future enhancement when generation becomes async.
 * 
 * DO NOT call this hook from any component in the MVP.
 */
export function useGenerationPolling() {
  return {
    status: 'idle' as const,
    progress: 0,
    error: null,
  }
}

export type { GenerationStatus }
