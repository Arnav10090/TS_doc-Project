export type StructuredIntroductionContent = {
  paragraphs: string[]
  tenderReference?: string
  tenderDate?: string
}

const FENCED_JSON_BLOCK_REGEX = /```(?:json)?\s*([\s\S]*?)\s*```/i

function getStructuredIntroductionValue(
  value: Record<string, unknown>,
  keys: string[],
): string | undefined {
  for (const key of keys) {
    const candidate = value[key]
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim()
    }
  }

  return undefined
}

function toStructuredIntroductionContent(
  value: unknown,
): StructuredIntroductionContent | null {
  if (Array.isArray(value)) {
    const paragraphs = value
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean)

    return paragraphs.length > 0 ? { paragraphs } : null
  }

  if (!value || typeof value !== 'object') {
    return null
  }

  const structured = value as Record<string, unknown>
  const paragraphs = Array.isArray(structured.paragraphs)
    ? structured.paragraphs
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter(Boolean)
    : []

  const tenderReference = getStructuredIntroductionValue(structured, [
    'tender_reference',
    'tenderReference',
  ])
  const tenderDate = getStructuredIntroductionValue(structured, [
    'tender_date',
    'tenderDate',
  ])

  if (paragraphs.length === 0 && !tenderReference && !tenderDate) {
    return null
  }

  return {
    paragraphs,
    tenderReference,
    tenderDate,
  }
}

function tryParseStructuredIntroductionCandidate(
  candidate: string,
): StructuredIntroductionContent | null {
  try {
    return toStructuredIntroductionContent(JSON.parse(candidate))
  } catch {
    return null
  }
}

function extractStructuredIntroductionJsonCandidate(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }

  const fencedMatch = trimmed.match(FENCED_JSON_BLOCK_REGEX)
  if (fencedMatch?.[1]) {
    const fencedCandidate = fencedMatch[1].trim()
    if (tryParseStructuredIntroductionCandidate(fencedCandidate)) {
      return fencedCandidate
    }
  }

  if (/^[{\[]/.test(trimmed) && tryParseStructuredIntroductionCandidate(trimmed)) {
    return trimmed
  }

  const paragraphsKeyIndex = trimmed.search(/"paragraphs"\s*:/i)
  if (paragraphsKeyIndex === -1) {
    return null
  }

  const objectStart = trimmed.lastIndexOf('{', paragraphsKeyIndex)
  const objectEnd = trimmed.lastIndexOf('}')
  if (objectStart === -1 || objectEnd <= objectStart) {
    return null
  }

  const candidate = trimmed.slice(objectStart, objectEnd + 1).trim()
  return tryParseStructuredIntroductionCandidate(candidate) ? candidate : null
}

function normalizeParagraphKey(value: string): string {
  return value.replace(/\s+/g, ' ').trim().toLowerCase()
}

function extractLabeledValue(value: string, labels: string[]): string | undefined {
  for (const label of labels) {
    const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const match = value.match(
      new RegExp(
        String.raw`(?:^|\n)\s*(?:[-*]\s*)?(?:\*\*)?${escapedLabel}(?:\*\*)?\s*:\s*(.+)$`,
        'im',
      ),
    )

    if (match?.[1]?.trim()) {
      return match[1].trim()
    }
  }

  return undefined
}

function stripLabeledLines(value: string, labels: string[]): string {
  return labels.reduce((result, label) => {
    const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return result.replace(
      new RegExp(
        String.raw`(?:^|\n)\s*(?:[-*]\s*)?(?:\*\*)?${escapedLabel}(?:\*\*)?\s*:\s*.+(?=\n|$)`,
        'gim',
      ),
      '',
    )
  }, value)
}

export function dedupeStringParagraphs(paragraphs: string[]): string[] {
  const seen = new Set<string>()

  return paragraphs.filter((paragraph) => {
    const key = normalizeParagraphKey(paragraph)
    if (!key || seen.has(key)) {
      return false
    }

    seen.add(key)
    return true
  })
}

export function extractStructuredIntroductionContent(
  value: unknown,
): StructuredIntroductionContent | null {
  if (typeof value === 'string') {
    const candidate = extractStructuredIntroductionJsonCandidate(value)
    return candidate ? tryParseStructuredIntroductionCandidate(candidate) : null
  }

  return toStructuredIntroductionContent(value)
}

export function stripStructuredIntroductionJson(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) {
    return ''
  }

  const fencedMatch = trimmed.match(FENCED_JSON_BLOCK_REGEX)
  if (fencedMatch?.[1]) {
    const fencedCandidate = fencedMatch[1].trim()
    if (tryParseStructuredIntroductionCandidate(fencedCandidate)) {
      return trimmed.replace(fencedMatch[0], '').trim()
    }
  }

  const candidate = extractStructuredIntroductionJsonCandidate(trimmed)
  if (!candidate) {
    return trimmed
  }

  return trimmed.replace(candidate, '').trim()
}

export function extractIntroductionTextContent(value: string): StructuredIntroductionContent | null {
  const trimmed = stripStructuredIntroductionJson(value).trim()
  if (!trimmed) {
    return null
  }

  const tenderReference = extractLabeledValue(trimmed, [
    'Tender Reference',
    'tender_reference',
    'tenderReference',
  ])
  const tenderDate = extractLabeledValue(trimmed, [
    'Tender Date',
    'tender_date',
    'tenderDate',
  ])

  const narrative = stripLabeledLines(
    trimmed.replace(/(?:^|\n)\s*(?:[-*]\s*)?(?:\*\*)?Tender Information(?:\*\*)?\s*(?=\n|$)/gim, ''),
    ['Tender Reference', 'tender_reference', 'tenderReference', 'Tender Date', 'tender_date', 'tenderDate'],
  )
    .split(/\n\s*\n+/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => {
      // Filter out any paragraph that is just "Tender Information" (case-insensitive)
      const normalized = paragraph.replace(/\s+/g, ' ').trim().toLowerCase()
      return normalized && normalized !== 'tender information'
    })

  if (narrative.length === 0 && !tenderReference && !tenderDate) {
    return null
  }

  return {
    paragraphs: narrative,
    tenderReference,
    tenderDate,
  }
}
