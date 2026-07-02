import apiClient from './client'
import type { DocumentVersion } from '../types'

export const generateDocument = async (projectId: string): Promise<Blob> => {
  try {
    const response = await apiClient.post(
      `/api/v1/projects/${projectId}/generate`,
      {},
      {
        responseType: 'blob', // CRITICAL: Must use blob for binary file download
      }
    )
    return response.data
  } catch (error: any) {
    // When responseType is 'blob', error responses are often returned as Blob-like
    // objects. Attempt to parse any response.data that exposes a `.text()` method
    // into JSON so callers can inspect structured error details.
    const respData = error?.response?.data;
    // No-op: proceed to attempt parsing the blob-like response
    if (respData) {
      let text: string | undefined

      // Prefer standard Blob.text() if available
      if (typeof respData.text === 'function') {
        try {
          text = await respData.text()
        } catch (e) {
          // ignore and try other strategies
        }
      }

      // Try Response-based text extraction (works in Node/jsdom environments)
      if (typeof globalThis.Response === 'function' && text === undefined) {
        try {
          // eslint-disable-next-line no-undef
          text = await new Response(respData).text()
        } catch {
          // ignore and try other strategies
        }
      }

      // Fallback to arrayBuffer -> Buffer (Node) if available
      if (text === undefined && typeof respData.arrayBuffer === 'function') {
        try {
          // arrayBuffer gives us raw bytes which we can decode to string
          // Buffer is available in Node test envs
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const ab = await (respData as any).arrayBuffer()
          // Buffer may not exist in some environments; guard it
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const BufferCtor = typeof Buffer !== 'undefined' ? Buffer : undefined
          if (BufferCtor) {
            text = BufferCtor.from(ab).toString('utf-8')
          } else {
            // Last resort: try TextDecoder
            try {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const td = new (globalThis as any).TextDecoder('utf-8')
              text = td.decode(ab)
            } catch {
              // give up
            }
          }
        } catch (e) {
          // ignore
        }
      }

      if (typeof text === 'string') {
        let parsed: any
        try {
          parsed = JSON.parse(text)
        } catch (parseError) {
          console.error('Failed to parse error response blob:', parseError)
        }

        if (parsed !== undefined) {
          // Rethrow a new error-like object that contains the parsed data. Some
          // tests mock plain objects for errors, so mutating may not be
          // observable; creating a fresh object ensures the test sees the
          // parsed payload.
          const newError = {
            ...error,
            response: {
              ...error?.response,
              data: parsed,
            },
          }
          throw newError
        }
      }
    }

    // If parsing didn't occur, rethrow the original error
    throw error
  }
}

export const getVersions = async (projectId: string): Promise<DocumentVersion[]> => {
  const response = await apiClient.get<DocumentVersion[]>(
    `/api/v1/projects/${projectId}/versions`
  )
  return response.data
}

export const downloadVersion = async (versionId: string): Promise<Blob> => {
  try {
    const response = await apiClient.get(`/api/v1/versions/${versionId}/download`, {
      responseType: 'blob',
    })
    return response.data
  } catch (error: any) {
      // Handle blob error responses similarly to `generateDocument`
      const respData2 = error?.response?.data;
      if (respData2) {
        let text: string | undefined

        if (typeof respData2.text === 'function') {
          try {
            text = await respData2.text()
          } catch {}
        }

        if (typeof globalThis.Response === 'function' && text === undefined) {
          try {
            // eslint-disable-next-line no-undef
            text = await new Response(respData2).text()
          } catch {}
        }

        if (text === undefined && typeof respData2.arrayBuffer === 'function') {
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const ab = await (respData2 as any).arrayBuffer()
            const BufferCtor = typeof Buffer !== 'undefined' ? Buffer : undefined
            if (BufferCtor) {
              text = BufferCtor.from(ab).toString('utf-8')
            } else {
              try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const td = new (globalThis as any).TextDecoder('utf-8')
                text = td.decode(ab)
              } catch {}
            }
          } catch {}
        }

        if (typeof text === 'string') {
          try {
            const parsed = JSON.parse(text)
            const newError = {
              ...error,
              response: {
                ...error?.response,
                data: parsed,
              },
            }
            throw newError
          } catch (parseError) {
            console.error('Failed to parse error response blob:', parseError)
          }
        }
      }

      throw error
  }
}
