/**
 * Tests for generation API - specifically blob error handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generateDocument } from '../generation'
import apiClient from '../client'

// Mock the apiClient
vi.mock('../client', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
}))

describe('generateDocument', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return blob on successful generation', async () => {
    const mockBlob = new Blob(['test document'], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
    
    vi.mocked(apiClient.post).mockResolvedValue({
      data: mockBlob,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    })

    const result = await generateDocument('test-project-id')
    
    expect(result).toBe(mockBlob)
    expect(apiClient.post).toHaveBeenCalledWith(
      '/api/v1/projects/test-project-id/generate',
      {},
      { responseType: 'blob' }
    )
  })

  it('should parse blob error response and make missing_sections accessible', async () => {
    // Create a blob containing the error JSON
    const errorData = {
      detail: {
        message: 'Cannot generate document. Some required sections are incomplete.',
        missing_sections: ['cover', 'executive_summary', 'features']
      }
    }
    const errorBlob = new Blob([JSON.stringify(errorData)], { type: 'application/json' })

    const mockError = {
      response: {
        status: 422,
        statusText: 'Unprocessable Entity',
        data: errorBlob,
        headers: {},
        config: {} as any,
      },
      message: 'Request failed with status code 422',
      isAxiosError: true,
    }

    vi.mocked(apiClient.post).mockRejectedValue(mockError)

    try {
      await generateDocument('test-project-id')
      // Should not reach here
      expect(true).toBe(false)
    } catch (error: any) {
      // The error should now have parsed JSON data instead of blob
      expect(error.response.data).toEqual(errorData)
      expect(error.response.data.detail.missing_sections).toEqual([
        'cover',
        'executive_summary',
        'features'
      ])
      
      // Verify this is the structure SectionSidebar.tsx expects
      const detail = error.response.data?.detail
      expect(detail).toBeDefined()
      expect(detail.missing_sections).toBeDefined()
      expect(Array.isArray(detail.missing_sections)).toBe(true)
    }
  })

  it('should handle non-JSON blob errors gracefully', async () => {
    // Create a blob with non-JSON content
    const errorBlob = new Blob(['Internal Server Error'], { type: 'text/html' })

    const mockError = {
      response: {
        status: 500,
        statusText: 'Internal Server Error',
        data: errorBlob,
        headers: {},
        config: {} as any,
      },
      message: 'Request failed with status code 500',
      isAxiosError: true,
    }

    vi.mocked(apiClient.post).mockRejectedValue(mockError)

    try {
      await generateDocument('test-project-id')
      expect(true).toBe(false)
    } catch (error: any) {
      // Should still throw the error, but data remains as blob
      expect(error.response.data).toBeInstanceOf(Blob)
      expect(error.response.status).toBe(500)
    }
  })

  it('should handle errors with non-blob data unchanged', async () => {
    // Some errors might already be parsed JSON (e.g., from interceptors)
    const errorData = { message: 'Network error' }

    const mockError = {
      response: {
        status: 500,
        data: errorData, // Already parsed, not a blob
        headers: {},
        config: {} as any,
      },
      message: 'Network error',
      isAxiosError: true,
    }

    vi.mocked(apiClient.post).mockRejectedValue(mockError)

    try {
      await generateDocument('test-project-id')
      expect(true).toBe(false)
    } catch (error: any) {
      // Should pass through unchanged
      expect(error.response.data).toEqual(errorData)
    }
  })
})
