import { setSectionDraft, getSectionDraft } from './sectionDraftStore'
import type { CustomSectionContent, SubsectionData } from '../types/customSections'
import { RESPONSIBILITY_MATRIX_ROWS } from '../components/preview/templateContent'
import {
  extractStructuredIntroductionContent,
} from './introductionContent'

type Suggestion = {
  section_key?: string
  structured_import_available?: boolean
  content?: any
  raw_text?: string | null
  subsection_suggestions?: Array<any> | null
}

// Predefined sections whose draft content canonically stores its list under an
// `items` key (Family D per backend/app/ai_suggestions/section_schemas.py:
// features, documentation_control, buyer_obligations, exclusion_list,
// buyer_prerequisites). Suggestion content for these sections must always
// populate `items`, even if an unrelated `rows` key already exists on the draft.
const FAMILY_D_ITEMS_SECTION_KEYS = new Set([
  'features',
  'documentation_control',
  'buyer_obligations',
  'exclusion_list',
  'buyer_prerequisites',
])

const FAMILY_D_STRING_ITEM_SECTION_KEYS = new Set([
  'documentation_control',
  'buyer_obligations',
  'exclusion_list',
  'buyer_prerequisites',
])

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
    // Strip leading markdown heading lines (e.g. "## Executive Summary")
    // since the document template already renders section titles.
    .replace(/^\s*#{1,6}\s+.+\n*/gm, '')
    .trim()
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


function normalizeIntroductionImport(existingDraft: Record<string, any>, content: any) {
  const next = { ...(existingDraft || {}) }
  const structuredIntroduction = extractStructuredIntroductionContent(content)
  const fragments =
    structuredIntroduction && content && typeof content === 'object'
      ? []
      : collectTextFragments(content)
  const combinedText = fragments.join('\n\n')
  // Strip HTML tags so label extraction handles "<p>Tender Reference: ...</p>"
  const htmlStrippedText = combinedText.replace(/<[^>]+>/g, ' ').replace(/\s{2,}/g, ' ')

  const rawTenderReference =
    structuredIntroduction?.tenderReference ??
    (content && typeof content === 'object'
      ? getStringValueByKey(content, ['tender_reference', 'tenderreference'])
      : undefined) ??
    extractLabeledValue(combinedText, 'Tender Reference') ??
    extractLabeledValue(htmlStrippedText, 'Tender Reference')
  const rawTenderDate =
    structuredIntroduction?.tenderDate ??
    (content && typeof content === 'object'
      ? getStringValueByKey(content, ['tender_date', 'tenderdate'])
      : undefined) ??
    extractLabeledValue(combinedText, 'Tender Date') ??
    extractLabeledValue(htmlStrippedText, 'Tender Date')

  // Strip any residual HTML tags from extracted values
  const tenderReference = rawTenderReference?.replace(/<[^>]+>/g, '').trim()
  const tenderDate = rawTenderDate?.replace(/<[^>]+>/g, '').trim()

  if (tenderReference) {
    next.tender_reference = tenderReference
  }

  if (tenderDate) {
    next.tender_date = tenderDate
  }

  if (content && typeof content === 'object' && typeof content.heading === 'string' && content.heading.trim()) {
    next.heading = content.heading.trim()
  }

  // Introduction paragraphs are hardcoded in the doc preview template;
  // only tender_reference and tender_date are imported from AI suggestions.

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

function extractStringListItem(value: unknown): string[] {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed ? [trimmed] : []
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => extractStringListItem(item))
  }

  if (!value || typeof value !== 'object') {
    return []
  }

  const record = value as Record<string, unknown>

  if (Array.isArray(record.items)) {
    const nestedItems = record.items.flatMap((item) => extractStringListItem(item))
    if (nestedItems.length > 0) {
      return nestedItems
    }
  }

  const preferredKeys = ['name', 'title', 'item', 'label', 'text', 'description', 'brief']
  for (const key of preferredKeys) {
    const candidate = record[key]
    if (typeof candidate === 'string' && candidate.trim()) {
      return [candidate.trim()]
    }
  }

  return []
}

function dedupeStringList(items: string[]): string[] {
  const seen = new Set<string>()
  return items.filter((item) => {
    if (seen.has(item)) {
      return false
    }
    seen.add(item)
    return true
  })
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
    // When the backend parser (Family A) returns structured_available=false
    // (e.g. plain markdown with no HTML tags), content is null and the actual
    // text lives in raw_text. Fall back to raw_text so we can still extract
    // tender_reference and tender_date from the plain-text response.
    const introContent = content ?? suggestion.raw_text ?? null
    console.log('[INTRO_IMPORT] suggestion.content:', suggestion.content)
    console.log('[INTRO_IMPORT] suggestion.raw_text:', suggestion.raw_text)
    console.log('[INTRO_IMPORT] introContent type:', typeof introContent, 'value:', introContent)
    const updated = normalizeIntroductionImport(draft, introContent)
    console.log('[INTRO_IMPORT] updated.tender_reference:', updated.tender_reference)
    console.log('[INTRO_IMPORT] updated.tender_date:', updated.tender_date)
    console.log('[INTRO_IMPORT] full updated:', JSON.stringify(updated, null, 2))
    setSectionDraft(projectId, sectionKey, updated)
    return updated
  }

  // Family D: list-based sections that canonically use `items`. Route by
  // section key (FAMILY_D_ITEMS_SECTION_KEYS), not by incidentally checking
  // whether a `rows` key is absent from the draft — that heuristic breaks
  // permanently for a project once any `rows` key is ever written onto its
  // `features` draft (including by this very bug), because
  // mergeSectionContent() in
  // frontend/src/components/sections/predefinedSectionContent.ts preserves
  // any key not present in getDefaultSectionContent(). The document generator
  // (backend/app/generation/context_builder.py) only reads `features.items`,
  // so suggestions landing in `rows` never reach the doc preview or export.
  if (
    Array.isArray(content) &&
    FAMILY_D_ITEMS_SECTION_KEYS.has(sectionKey) &&
    Array.isArray(draft.items)
  ) {
    const updated = importFamilyD(draft, content, sectionKey)
    // #region debug-point A:documentation-control-import
    if (sectionKey === 'documentation_control') {
      fetch('http://127.0.0.1:7779/event', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: 'pmyms-fullscreen-blank',
          runId: 'pre-fix',
          hypothesisId: 'A',
          location: 'aiSuggestionImport.ts:276',
          msg: '[DEBUG] documentation_control importFamilyD output',
          data: {
            contentSample: content.slice(0, 3),
            contentTypes: content.map((item) => ({
              type: typeof item,
              isArray: Array.isArray(item),
              keys: item && typeof item === 'object' ? Object.keys(item) : [],
            })),
            updatedItemTypes: Array.isArray(updated.items)
              ? updated.items.map((item) => ({
                  type: typeof item,
                  isArray: Array.isArray(item),
                  keys: item && typeof item === 'object' ? Object.keys(item) : [],
                }))
              : null,
          },
          ts: Date.now(),
        }),
      }).catch(() => {})
    }
    // #endregion
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

  // Family D: list-based (fallback for other array content)
  if (Array.isArray(content)) {
    const updated = importFamilyD(draft, content, sectionKey)
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

const MATRIX_ROLE_KEY_CANDIDATES = [
  ['BD', ['BD', 'Responsibility_Buyer', 'buyer']],
  ['BE', ['BE', 'Responsibility_Design', 'design']],
  ['DD', ['DD', 'Responsibility_Seller', 'seller']],
  ['SU', ['SU', 'Responsibility_Supervision', 'supervision']],
  ['ER', ['ER', 'Responsibility_Erection', 'erection']],
  ['COM', ['COM', 'Responsibility_Commissioning', 'commissioning']],
] as const

function normalizeMatrixCell(value: unknown): string {
  return value == null ? '' : String(value).trim()
}

function normalizeMatrixRows(rows: unknown): string[][] {
  if (!Array.isArray(rows)) {
    return []
  }

  return rows.map((row) =>
    Array.isArray(row) ? row.map((cell) => normalizeMatrixCell(cell)) : [],
  )
}

function normalizeMatrixTokens(value: string): string[] {
  return value
    .replace(/\{\{[^}]+\}\}/g, ' ')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .filter(
      (token) =>
        !['solutionname', 'trainingdays', 'trainingpersons', 'sw3name', 'ts4component', 'ts2technology'].includes(
          token,
        ),
    )
}

function scoreMatrixItemMatch(left: string, right: string): number {
  const leftTokens = normalizeMatrixTokens(left)
  const rightTokens = normalizeMatrixTokens(right)

  if (leftTokens.length === 0 || rightTokens.length === 0) {
    return 0
  }

  const overlap = leftTokens.filter((token) => rightTokens.includes(token)).length
  return overlap / Math.max(leftTokens.length, rightTokens.length)
}

function extractMatrixRow(row: unknown): string[] | null {
  if (Array.isArray(row)) {
    const normalized = row.map((cell) => normalizeMatrixCell(cell))
    return normalized.length >= 8 ? normalized.slice(0, 8) : null
  }

  if (!row || typeof row !== 'object') {
    return null
  }

  const record = row as Record<string, unknown>
  const no =
    normalizeMatrixCell(record.No ?? record['No.'] ?? record.no ?? record.sr_no)
  const item =
    normalizeMatrixCell(record.ITEM ?? record.item ?? record.Item ?? record.name)
  const responsibilities = MATRIX_ROLE_KEY_CANDIDATES.map(([_, candidates]) => {
    const matchedKey = candidates.find((candidate) => candidate in record)
    return matchedKey ? normalizeMatrixCell(record[matchedKey]) : ''
  })

  if (!no && !item && responsibilities.every((value) => !value)) {
    return null
  }

  return [no, item, ...responsibilities]
}

function isMatrixStructuralRow(row: string[]): boolean {
  const no = normalizeMatrixCell(row[0])
  const item = normalizeMatrixCell(row[1])
  const normalizedItem = item.toLowerCase()

  return (
    (no === 'No.' && item === 'ITEM') ||
    no.startsWith('(') ||
    (!no && !item) ||
    (Boolean(item) && !no.startsWith('-') && !normalizedItem.includes('training'))
  )
}

function mergeResponsibilityMatrixRows(existingRows: unknown, importedRows: unknown): string[][] {
  const baseRows = normalizeMatrixRows(existingRows)
  const nextRows =
    baseRows.length > 0
      ? baseRows.map((row) => [...row])
      : RESPONSIBILITY_MATRIX_ROWS.map((row) => [...row])

  if (!Array.isArray(importedRows)) {
    return nextRows
  }

  const rowIndexByExactItem = new Map<string, number>()
  const candidateRowIndices: Array<{ index: number; item: string }> = []

  nextRows.forEach((row, index) => {
    if (index < 2 || isMatrixStructuralRow(row)) {
      return
    }

    const item = normalizeMatrixCell(row[1])
    if (!item) {
      return
    }

    rowIndexByExactItem.set(item.toLowerCase(), index)
    candidateRowIndices.push({ index, item })
  })

  importedRows.forEach((row) => {
    const extracted = extractMatrixRow(row)
    if (!extracted || isMatrixStructuralRow(extracted)) {
      return
    }

    const importedItem = normalizeMatrixCell(extracted[1])
    if (!importedItem) {
      return
    }

    let targetIndex = rowIndexByExactItem.get(importedItem.toLowerCase())

    if (targetIndex === undefined) {
      let bestMatch: { index: number; score: number } | null = null

      for (const { index, item } of candidateRowIndices) {
        const score = scoreMatrixItemMatch(importedItem, item)
        if (score >= 0.6 && (!bestMatch || score > bestMatch.score)) {
          bestMatch = { index, score }
        }
      }

      targetIndex = bestMatch?.index
    }

    if (targetIndex === undefined) {
      return
    }

    const currentRow = nextRows[targetIndex] || ['', '', '', '', '', '', '', '']
    nextRows[targetIndex] = currentRow.map((cell, cellIndex) => {
      if (cellIndex < 2) {
        return cell
      }

      return extracted[cellIndex] || cell
    })
  })

  return nextRows
}

export function importFamilyB(existingDraft: Record<string, any>, content: any) {
  const next = { ...(existingDraft || {}) }
  const targetKey = findDraftTableKey(next)

  if (Array.isArray(content)) {
    next[targetKey] =
      targetKey === 'matrix_rows'
        ? mergeResponsibilityMatrixRows(next[targetKey], content)
        : content
    return next
  }

  if (Array.isArray(content.rows)) {
    next[targetKey] =
      targetKey === 'matrix_rows'
        ? mergeResponsibilityMatrixRows(next[targetKey], content.rows)
        : content.rows
    return next
  }

  if (Array.isArray(content.tables) && content.tables.length > 0) {
    // take first table as legacy rows
    const t = content.tables[0]
    if (Array.isArray(t.rows)) {
      next[targetKey] =
        targetKey === 'matrix_rows'
          ? mergeResponsibilityMatrixRows(next[targetKey], t.rows)
          : t.rows
    }
    return next
  }

  // fallback: look for an array in content
  const arrKey = findArrayKey(content)
  if (arrKey) {
    next[targetKey] =
      targetKey === 'matrix_rows'
        ? mergeResponsibilityMatrixRows(next[targetKey], content[arrKey])
        : content[arrKey]
  }

  return next
}

export function importFamilyC(existingDraft: Record<string, any>, content: Record<string, any>) {
  return { ...(existingDraft || {}), ...(content || {}) }
}

// Keys that should NOT be used as import targets for list content
// (they are template boilerplate or secondary collections)
const SKIP_LIST_KEYS = new Set(['paragraphs', 'custom_items', 'note_paragraphs', 'intro_paragraphs'])

export function importFamilyD(
  existingDraft: Record<string, any>,
  content: any[],
  sectionKey?: string,
) {
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
  const existingItems = Array.isArray(next[targetKey]) ? next[targetKey] : []

  const expectsStringItems =
    targetKey === 'criteria' ||
    targetKey === 'custom_items' ||
    (targetKey === 'items' &&
      Boolean(sectionKey) &&
      FAMILY_D_STRING_ITEM_SECTION_KEYS.has(sectionKey!))

  if (expectsStringItems) {
    const normalizedExistingItems = dedupeStringList(
      existingItems.flatMap((item: unknown) => extractStringListItem(item)),
    )
    const normalizedImportedItems = dedupeStringList(
      content.flatMap((item: unknown) => extractStringListItem(item)),
    )

    next[targetKey] = dedupeStringList([
      ...normalizedExistingItems,
      ...normalizedImportedItems,
    ])
    return next
  }

  // Check if the target holds record-style items that require an `id` field
  // (e.g. FeatureItem). If existing items all have `id`, ensure imported items
  // also carry one so the editor (SortableFeatureCard) can key on it.
  const needsId = existingItems.length > 0
    ? existingItems.every((item: any) => item && typeof item === 'object' && 'id' in item)
    : targetKey === 'items' // features default uses items with id

  const normalizedContent = needsId
    ? content.map((ci) => {
        if (ci && typeof ci === 'object' && !('id' in ci)) {
          return { ...ci, id: crypto.randomUUID() }
        }
        return ci
      })
    : content

  // For sections like features, replace the items entirely with the AI suggestion
  // rather than merging/appending, so the Required table is fully populated.
  // We detect this when the existing items are empty placeholder(s) (all fields blank).
  const isEmptyPlaceholder = existingItems.length <= 1 &&
    existingItems.every((item: any) => {
      if (!item || typeof item !== 'object') return true
      return Object.entries(item).every(
        ([k, v]) => k === 'id' || v === '' || v === undefined || v === null
      )
    })

  if (isEmptyPlaceholder && normalizedContent.length > 0) {
    next[targetKey] = normalizedContent
  } else {
    const merged = [...existingItems]
    normalizedContent.forEach((ci) => {
      const exists = merged.some((m) => JSON.stringify(m) === JSON.stringify(ci))
      if (!exists) merged.push(ci)
    })
    next[targetKey] = merged
  }
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
