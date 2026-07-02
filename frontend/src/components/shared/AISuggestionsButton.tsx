import React, { useState } from 'react'
import toast from 'react-hot-toast'
import { generateAISuggestion } from '../../api/aiSuggestions'
import type { SuggestionResponse } from '../../api/aiSuggestions'

interface Props {
  projectId: string
  sectionKey: string
  draftContent?: Record<string, unknown>
  onSuggestionReceived?: (suggestion: SuggestionResponse) => void
  disabled?: boolean
  disabledTooltip?: string
}

const AISuggestionsButton: React.FC<Props> = ({
  projectId,
  sectionKey,
  draftContent,
  onSuggestionReceived,
  disabled = false,
  disabledTooltip,
}) => {
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    if (disabled || loading) return

    setLoading(true)
    try {
      const suggestion = await generateAISuggestion(projectId, sectionKey, draftContent)
      onSuggestionReceived?.(suggestion)
      toast.success('AI suggestion received')
    } catch (err) {
      // apiClient interceptor shows the user-facing error toast.
      console.error('AI suggestion error', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || loading}
      title={disabled && disabledTooltip ? disabledTooltip : undefined}
      aria-busy={loading}
      className={`px-3 py-2 rounded font-semibold inline-flex items-center gap-2 text-sm ${disabled || loading ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
    >
      {loading ? (
        <svg
          className="w-4 h-4 animate-spin"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      ) : (
        <span aria-hidden="true">{'\u2728'}</span>
      )}
      <span>AI Suggestions</span>
    </button>
  )
}

export default AISuggestionsButton