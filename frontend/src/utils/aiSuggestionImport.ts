import { setSectionDraft, getSectionDraft } from './sectionDraftStore'
import type { CustomSectionContent, SubsectionData } from '../types/customSections'

type Suggestion = {
  section_key?: string
  structured_import_available?: boolean
  content?: any
  subsection_suggestions?: Array<any> | null
}

function parseStructuredStringContent(content: any): any {
  if (typeof content !== 'string') {
    return content
  }

  const trimmed = content.trim()
  const fencedMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)
  const candidate = fencedMatch?.[1]?.trim() ?? trimmed

  if (!candidate || !/^[{\[]/.test(candidate)) {
    return content
  }

  try {
    return JSON.parse(candidate)
  } catch {
    return content
  }
}

function normalizeLineBreaks(value: string) {
  return value.replace(/\r\n/g, '\n').trim()
}

function splitImportedTextToParagraphs(value: string): string[] {
  const normalized = normalizeLineBreaks(value)
    .replace(/<\/p>\s*<p/gi, '</p>\n\n<p')
    .replace(/<\/(h[1-6]|ul|ol|table|blockquote|div)>\s*(?=<)/gi, '</$1>\n\n')

  return normalized
    .split(/\n\s*\n+/)
    .map((part) => part.trim())
    .filter(Boolean)
}

function getStringValueByKey(obj: Record<string, any>, candidates: string[]): string | undefined {
  for (const [key, value] of Object.entries(obj)) {
    if (
      typeof value === 'string' &&
      candidates.some((candidate) => key.toLowerCase() === candidate.toLowerCase())
    ) {
      const trimmed = value.trim()
      if (trimmed) {
        return trimmed
      }
    }
  }

  return undefined
}

function collectTextFragments(content: any): string[] {
  if (typeof content === 'string') {
    return [content]
  }

  if (!content || typeof content !== 'object') {
    return []
  }

  const fragments: string[] = []

  Object.values(content).forEach((value) => {
    if (typeof value === 'string') {
      fragments.push(value)
      return
    }

    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (typeof item === 'string') {
          fragments.push(item)
        }
      })
    }
  })

  return fragments
}

function extractLabeledValue(text: string, label: string): string | undefined {
  const regex = new RegExp(
    `(?:^|\\n)\\s*(?:[-*]\\s*)?(?:\\*\\*)?${label}(?:\\*\\*)?\\s*:\\s*(.+)$`,
    'im',
  )
  const match = text.match(regex)
  return match?.[1]?.trim()
}

function stripStructuredOutputScaffolding(value: string): string {
  return normalizeLineBreaks(value)
    .replace(/^\s*#{1,6}\s*Output Data Structure\s*$/gim, '')
    .replace(/^\s*Output Data Structure\s*$/gim, '')
    .replace(/^\s*(?:[-*]\s*)?(?:\*{1,2})?paragraphs?(?:\*{1,2})?\s*:\s*$/gim, '')
    .trim()
}

function sanitizeRichTextString(value: string): string {
  return stripStructuredOutputScaffolding(value)
}

function sanitizeParagraphArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined
  }

  return value
    .flatMap((paragraph) =>
      typeof paragraph === 'string'
        ? splitImportedTextToParagraphs(sanitizeRichTextString(paragraph))
        : [],
    )
    .filter(Boolean)
}

function sanitizeTextFieldValue(key: string, value: any): any {
  if (typeof value === 'string') {
    return sanitizeRichTextString(value)
  }

  if (key.toLowerCase().includes('paragraph')) {
    return sanitizeParagraphArray(value) ?? value
  }

  return value
}

function cleanIntroductionNarrativeBlock(value: string): string {
  return stripStructuredOutputScaffolding(value)
    .replace(/^\s*#{1,6}\s*Introduction\s*$/gim, '')
    .replace(/^\s*Introduction\s*$/gim, '')
    .replace(/^\s*#{1,6}\s*Tender Reference\s*$/gim, '')
    .replace(/^\s*(?:\*{1,2})?Tender Reference(?:\*{1,2})?\s*:\s*.+$/gim, '')
    .replace(/^\s*(?:\*{1,2})?Tender Date(?:\*{1,2})?\s*:\s*.+$/gim, '')
    .trim()
}

function normalizeIntroductionImport(existingDraft: Record<string, any>, content: any) {
  const next = { ...(existingDraft || {}) }
  const fragments = collectTextFragments(content)
  const combinedText = fragments.join('\n\n')

  const tenderReference =
    (content && typeof content === 'object'
      ? getStringValueByKey(content, ['tender_reference', 'tenderreference'])
      : undefined) ?? extractLabeledValue(combinedText, 'Tender Reference')
  const tenderDate =
    (content && typeof content === 'object'
      ? getStringValueByKey(content, ['tender_date', 'tenderdate'])
      : undefined) ?? extractLabeledValue(combinedText, 'Tender Date')

  if (tenderReference) {
    next.tender_reference = tenderReference
  }

  if (tenderDate) {
    next.tender_date = tenderDate
  }

  if (content && typeof content === 'object' && typeof content.heading === 'string' && content.heading.trim()) {
    next.heading = content.heading.trim()
  }

  const importedParagraphs =
    typeof content === 'string'
      ? splitImportedTextToParagraphs(content)
      : Array.isArray(content?.paragraphs)
        ? content.paragraphs
            .flatMap((paragraph: unknown) =>
              typeof paragraph === 'string' ? splitImportedTextToParagraphs(paragraph) : [],
            )
        : fragments.flatMap((fragment) => splitImportedTextToParagraphs(fragment))

  const cleanedParagraphs = importedParagraphs
    .map((paragraph: string) => cleanIntroductionNarrativeBlock(paragraph))
    .filter(Boolean)
  const uniqueParagraphs = cleanedParagraphs.filter(
    (paragraph: string, index: number) => cleanedParagraphs.indexOf(paragraph) === index,
  )

  if (uniqueParagraphs.length > 0) {
    next.paragraphs = uniqueParagraphs
  }

  return next
}

function findTextKeys(obj: Record<string, any>) {
  const candidates = ['html', 'text', 'description', 'para', 'paragraph', 'content', 'summary']
  return Object.keys(obj).filter((k) => candidates.some((c) => k.toLowerCase().includes(c)))
}

function findArrayKey(obj: Record<string, any>) {
  const candidates = ['rows', 'items', 'list', 'entries']
  for (const c of candidates) {
    if (Array.isArray(obj[c])) return c
  }
  // fallback: any array value
  const arrKey = Object.keys(obj).find((k) => Array.isArray(obj[k]))
  return arrKey
}

export async function importSuggestion(
  projectId: string,
  sectionKey: string,
  suggestion: Suggestion,
  existingDraft?: Record<string, any>,
): Promise<Record<string, any> | CustomSectionContent | null> {
  // If custom subsection suggestions exist, handle custom import
  if (suggestion.subsection_suggestions && suggestion.subsection_suggestions.length > 0) {
    const updated = importCustomSection(existingDraft as CustomSectionContent, suggestion.subsection_suggestions)
    // Persist to draft store
    setSectionDraft(projectId, sectionKey, updated)
    return updated
  }

  const content = parseStructuredStringContent(suggestion.content)
  const draft = existingDraft ?? getSectionDraft(projectId, sectionKey) ?? {}

  if (sectionKey === 'introduction') {
    const updated = normalizeIntroductionImport(draft, content)
    setSectionDraft(projectId, sectionKey, updated)
    return updated
  }

  // Family B: tabular
  if (content && (Array.isArray(content) || Array.isArray(content?.rows) || content?.tables)) {
    const updated = importFamilyB(draft, content)
    setSectionDraft(projectId, sectionKey, updated)
    return updated
  }

  // Family A: rich text
  if (typeof content === 'string' || content?.html || content?.paragraphs) {
    const updated = importFamilyA(draft, content)
    setSectionDraft(projectId, sectionKey, updated)
    return updated
  }

  // Family D: list-based
  if (Array.isArray(content)) {
    const updated = importFamilyD(draft, content)
    setSectionDraft(projectId, sectionKey, updated)
    return updated
  }

  // Family E: image-backed
  if (content && (content.images || content.base64 || Object.keys(content).some((k) => k.toLowerCase().includes('image')))) {
    const updated = importFamilyE(draft, content)
    setSectionDraft(projectId, sectionKey, updated)
    return updated
  }

  // Family C: fallback mixed-field shallow merge
  if (content && typeof content === 'object') {
    const updated = importFamilyC(draft, content)
    setSectionDraft(projectId, sectionKey, updated)
    return updated
  }

  return null
}

// Primary rich text field names that should be preferred as import targets
// over secondary/label fields like intro_text, note_label, etc.
const PRIMARY_RICH_TEXT_KEYS = new Set([
  'text', 'para1', 'html', 'description', 'paragraph',
  'system_objective', 'existing_system', 'integration',
  'tangible_benefits', 'intangible_benefits',
])

export function importFamilyA(existingDraft: Record<string, any>, content: any) {
  const next = { ...(existingDraft || {}) }

  if (typeof content === 'string') {
    const sanitizedContent = sanitizeRichTextString(content)
    const textKeys = findTextKeys(next)
    if (textKeys.length > 0) {
      // 1. Prefer string-valued keys that are primary rich text fields
      //    (e.g. `text` over `intro_text` for value_addition)
      const primaryStringKey = textKeys.find(
        (k) => typeof next[k] === 'string' && PRIMARY_RICH_TEXT_KEYS.has(k)
      )
      if (primaryStringKey) {
        next[primaryStringKey] = sanitizedContent
        return next
      }

      // 2. Prefer any string-valued key over array-valued keys
      const stringKey = textKeys.find((k) => typeof next[k] === 'string')
      if (stringKey) {
        next[stringKey] = sanitizedContent
        return next
      }

      // 3. Only array-valued text keys remain (e.g. `paragraphs` for binding_conditions)
      //    Split imported text into paragraph blocks to preserve preview formatting.
      const arrayKey = textKeys.find((k) => Array.isArray(next[k]))
      if (arrayKey) {
        next[arrayKey] = splitImportedTextToParagraphs(sanitizedContent)
        return next
      }

      // 4. Last resort: write to first text key
      next[textKeys[0]] = sanitizedContent
      return next
    }
    // fallback fields
    if ('para1' in next) next.para1 = sanitizedContent
    else if ('text' in next) next.text = sanitizedContent
    else if ('html' in next) next.html = sanitizedContent
    else next.paragraph = sanitizedContent
    return next
  }

  // content is object with named fields - copy over textual fields
  Object.entries(content).forEach(([k, v]) => {
    if (k in next) next[k] = sanitizeTextFieldValue(k, v)
  })

  // if no overlap, shallow merge textual fields
  const textKeys = findTextKeys(content)
  if (textKeys.length > 0) {
    for (const k of textKeys) {
      next[k] = sanitizeTextFieldValue(k, content[k])
    }
  }

  return next
}

// Finds the best existing table/matrix array key in the draft.
// Handles sections like division_of_eng which use `matrix_rows` instead of `rows`.
function findDraftTableKey(draft: Record<string, any>): string {
  const tableCandidates = ['rows', 'matrix_rows']
  for (const c of tableCandidates) {
    if (Array.isArray(draft[c])) return c
  }
  return 'rows' // default
}

export function importFamilyB(existingDraft: Record<string, any>, content: any) {
  const next = { ...(existingDraft || {}) }
  const targetKey = findDraftTableKey(next)

  if (Array.isArray(content)) {
    next[targetKey] = content
    return next
  }

  if (Array.isArray(content.rows)) {
    next[targetKey] = content.rows
    return next
  }

  if (Array.isArray(content.tables) && content.tables.length > 0) {
    // take first table as legacy rows
    const t = content.tables[0]
    if (Array.isArray(t.rows)) next[targetKey] = t.rows
    return next
  }

  // fallback: look for an array in content
  const arrKey = findArrayKey(content)
  if (arrKey) next[targetKey] = content[arrKey]

  return next
}

export function importFamilyC(existingDraft: Record<string, any>, content: Record<string, any>) {
  return { ...(existingDraft || {}), ...(content || {}) }
}

// Keys that should NOT be used as import targets for list content
// (they are template boilerplate or secondary collections)
const SKIP_LIST_KEYS = new Set(['paragraphs', 'custom_items', 'note_paragraphs', 'intro_paragraphs'])

export function importFamilyD(existingDraft: Record<string, any>, content: any[]) {
  const next = { ...(existingDraft || {}) }
  // Expanded preferred keys to include `criteria` (used by work_completion)
  const preferredKeys = ['items', 'criteria', 'list', 'rows', 'entries']
  let targetKey: string | undefined
  for (const k of preferredKeys) {
    if (Array.isArray(next[k])) {
      targetKey = k
      break
    }
  }

  // Fallback: find any array key in draft that isn't in the skip list
  if (!targetKey) {
    targetKey = Object.keys(next).find(
      (k) => Array.isArray(next[k]) && !SKIP_LIST_KEYS.has(k)
    )
  }

  if (!targetKey) targetKey = 'items'

  const existing = Array.isArray(next[targetKey]) ? next[targetKey] : []
  const merged = [...existing]
  content.forEach((ci) => {
    const exists = merged.some((m) => JSON.stringify(m) === JSON.stringify(ci))
    if (!exists) merged.push(ci)
  })
  next[targetKey] = merged
  return next
}

export function importFamilyE(existingDraft: Record<string, any>, content: any) {
  const next = { ...(existingDraft || {}) }
  // preserve image fields
  const imageKeys = Object.keys(next).filter((k) => k.toLowerCase().includes('image') || k.toLowerCase().includes('images'))
  const descKeys = findTextKeys(next)

  // copy description-like fields from content
  const contentTextKeys = findTextKeys(content || {})
  if (contentTextKeys.length > 0) {
    for (const k of contentTextKeys) {
      // try to map to existing descKey or set new
      if (descKeys.length > 0) next[descKeys[0]] = content[k]
      else next[k] = content[k]
    }
  } else if (typeof content === 'string') {
    if (descKeys.length > 0) next[descKeys[0]] = content
    else next.description = content
  }

  // keep existing image fields untouched
  for (const ik of imageKeys) {
    next[ik] = next[ik]
  }

  return next
}

export function importCustomSection(existing: CustomSectionContent | undefined, subsectionSuggestions: Array<any>) {
  const base: CustomSectionContent = existing ? JSON.parse(JSON.stringify(existing)) : { title: '', subsections: [], insertAfterKey: '', displayMode: 'section' }

  subsectionSuggestions.forEach((sugg) => {
    const idx = Math.max(0, Number(sugg.subsection_index || 0))
    const subsection = base.subsections[idx]
    if (!subsection) return

    const type = (sugg.type || '').toLowerCase()
    const content = sugg.content

    const newData: SubsectionData = JSON.parse(JSON.stringify(subsection.data || {}))

    if (type.includes('table')) {
      // expect rows
      if (Array.isArray((content as any).rows)) (newData as any).rows = (content as any).rows
      else if (Array.isArray(content)) (newData as any).rows = content
    } else if (type.includes('image')) {
      if (Array.isArray((content as any).images)) (newData as any).images = (content as any).images
      else if ((content as any).base64) {
        ;(newData as any).base64 = (content as any).base64
        ;(newData as any).filename = (content as any).filename || ''
        ;(newData as any).mimeType = (content as any).mimeType || ''
      }
    } else {
      // paragraph
      if (content.html) (newData as any).html = sanitizeRichTextString(content.html)
      else if (typeof content === 'string') (newData as any).html = sanitizeRichTextString(content)
      else if (Array.isArray(content.paragraphs)) {
        ;(newData as any).paragraphs = content.paragraphs
          .filter((p: any) => typeof p === 'string')
          .map((p: string) => ({ html: sanitizeRichTextString(p) }))
          .filter((p: { html: string }) => Boolean(p.html))
      }
    }

    base.subsections[idx].data = newData
  })

  return base
}

export default importSuggestion
