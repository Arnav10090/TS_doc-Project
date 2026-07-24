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

const FAMILY_D_CUSTOM_ITEM_TARGET_SECTION_KEYS = new Set([
  'buyer_obligations',
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

/**
 * Extract bullet-point or numbered-list items from raw AI text output.
 * Used as a last-resort fallback when the backend parser fails to produce
 * structured JSON for string-list Family D sections.
 */
function extractBulletItemsFromText(text: string): string[] {
  const lines = normalizeLineBreaks(text).split('\n')
  const items: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    // Match bullet points: "- text", "* text", "• text"
    // or numbered items: "1. text", "2) text"
    const bulletMatch = trimmed.match(/^(?:[-*•]|\d+[.)]\s*)\s*(.+)$/)
    if (bulletMatch?.[1]?.trim()) {
      // Strip surrounding quotes if any
      const item = bulletMatch[1].trim().replace(/^["']|["']$/g, '')
      if (item) items.push(item)
    }
  }

  return items
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
  // First try: match with end of line anchor (original pattern)
  const regexEndOfLine = new RegExp(
    `(?:^|\\n)\\s*(?:[-*]\\s*)?(?:\\*\\*)?${label}(?:\\*\\*)?\\s*:\\s*(.+?)\\s*$`,
    'im',
  )
  const matchEndOfLine = text.match(regexEndOfLine)
  if (matchEndOfLine?.[1]?.trim()) {
    return matchEndOfLine[1].trim()
  }

  // Second try: match until HTML closing tag or end of string (for HTML content)
  const regexHtml = new RegExp(
    `(?:^|\\n|>)\\s*(?:[-*]\\s*)?(?:\\*\\*)?${label}(?:\\*\\*)?\\s*:\\s*([^<\\n]+?)(?:<|\\n|$)`,
    'im',
  )
  const matchHtml = text.match(regexHtml)
  if (matchHtml?.[1]?.trim()) {
    return matchHtml[1].trim()
  }

  return undefined
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
  
  // Collect all text fragments from the content for fallback extraction
  const fragments =
    structuredIntroduction && content && typeof content === 'object'
      ? []
      : collectTextFragments(content)
  const combinedText = fragments.join('\n\n')
  
  // If structuredIntroduction has paragraphs, also check those for embedded values
  let paragraphText = ''
  if (structuredIntroduction?.paragraphs && Array.isArray(structuredIntroduction.paragraphs)) {
    paragraphText = structuredIntroduction.paragraphs.join('\n\n')
  }
  
  // Combine all text sources for extraction
  const allText = [combinedText, paragraphText].filter(Boolean).join('\n\n')
  
  // Strip HTML tags so label extraction handles "<p>Tender Reference: ...</p>"
  const htmlStrippedText = allText.replace(/<[^>]+>/g, ' ').replace(/\s{2,}/g, ' ')

  const rawTenderReference =
    structuredIntroduction?.tenderReference ??
    (content && typeof content === 'object'
      ? getStringValueByKey(content, ['tender_reference', 'tenderreference'])
      : undefined) ??
    extractLabeledValue(allText, 'Tender Reference') ??
    extractLabeledValue(htmlStrippedText, 'Tender Reference')
  const rawTenderDate =
    structuredIntroduction?.tenderDate ??
    (content && typeof content === 'object'
      ? getStringValueByKey(content, ['tender_date', 'tenderdate'])
      : undefined) ??
    extractLabeledValue(allText, 'Tender Date') ??
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
  console.log('[extractStringListItem] Input:', value);
  
  if (typeof value === 'string') {
    const trimmed = value.trim()
    const result = trimmed ? [trimmed] : []
    console.log('[extractStringListItem] Output:', result);
    return result
  }

  if (Array.isArray(value)) {
    const result = value.flatMap((item) => extractStringListItem(item))
    console.log('[extractStringListItem] Output:', result);
    return result
  }

  if (!value || typeof value !== 'object') {
    console.log('[extractStringListItem] Output:', []);
    return []
  }

  const record = value as Record<string, unknown>

  // First check nested items array (AI often returns this)
  if (Array.isArray(record.items)) {
    const nestedItems = record.items.flatMap((item) => extractStringListItem(item))
    if (nestedItems.length > 0) {
      console.log('[extractStringListItem] Output:', nestedItems);
      return nestedItems
    }
  }

  // Then check preferred field names - added 'obligation' to handle buyer_obligations AI responses
  const preferredKeys = ['name', 'title', 'item', 'label', 'text', 'description', 'brief', 'obligation']
  for (const key of preferredKeys) {
    const candidate = record[key]
    if (typeof candidate === 'string' && candidate.trim()) {
      const result = [candidate.trim()]
      console.log('[extractStringListItem] Output:', result);
      return result
    }
  }

  console.log('[extractStringListItem] Output:', []);
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

function extractFamilyDImportItems(content: any, sectionKey: string): any[] | null {
  if (Array.isArray(content)) {
    return content
  }

  if (!content || typeof content !== 'object') {
    return null
  }

  const record = content as Record<string, unknown>

  const wrappedSectionContent = record[sectionKey]
  if (wrappedSectionContent && wrappedSectionContent !== content) {
    const nestedItems = extractFamilyDImportItems(wrappedSectionContent, sectionKey)
    if (nestedItems) {
      return nestedItems
    }
  }

  const arrayKeys = ['custom_items', 'items', 'criteria', 'list', 'entries', 'rows', 'data']
  for (const key of arrayKeys) {
    if (Array.isArray(record[key])) {
      return record[key] as any[]
    }
  }

  const extractedItem = extractStringListItem(content)
  if (extractedItem.length > 0) {
    return [content]
  }

  return null
}

export async function importSuggestion(
  projectId: string,
  sectionKey: string,
  suggestion: Suggestion,
  existingDraft?: Record<string, any>,
): Promise<Record<string, any> | CustomSectionContent | null> {
  console.log('[importSuggestion] Called with:', {
    projectId,
    sectionKey,
    suggestionKeys: Object.keys(suggestion),
    structuredImportAvailable: suggestion.structured_import_available,
    hasContent: !!suggestion.content,
    contentType: typeof suggestion.content,
    contentIsString: typeof suggestion.content === 'string',
    contentSample: suggestion.content ? JSON.stringify(suggestion.content).substring(0, 300) : null,
    rawContentDump: suggestion.content,
  });

  // If custom subsection suggestions exist, handle custom import
  if (suggestion.subsection_suggestions && suggestion.subsection_suggestions.length > 0) {
    const updated = importCustomSection(existingDraft as CustomSectionContent, suggestion.subsection_suggestions)
    // Persist to draft store
    setSectionDraft(projectId, sectionKey, updated)
    return updated
  }

  const content = parseStructuredStringContent(suggestion.content)
  console.log('[importSuggestion] Parsed content:', {
    isNull: content === null,
    isArray: Array.isArray(content),
    isObject: content && typeof content === 'object',
    hasItemsArray: content && typeof content === 'object' && Array.isArray((content as any).items),
    itemsLength: content && typeof content === 'object' && Array.isArray((content as any).items) ? (content as any).items.length : 0,
    hasCustomItemsArray: content && typeof content === 'object' && Array.isArray((content as any).custom_items),
    customItemsLength: content && typeof content === 'object' && Array.isArray((content as any).custom_items) ? (content as any).custom_items.length : 0,
    contentKeys: content && typeof content === 'object' && !Array.isArray(content) ? Object.keys(content) : [],
    contentFullDump: JSON.stringify(content),
  });

  const draft = existingDraft ?? getSectionDraft(projectId, sectionKey) ?? {}
  console.log('[importSuggestion] Draft:', {
    hasItems: Array.isArray(draft.items),
    hasCustomItems: Array.isArray(draft.custom_items),
    draftKeys: Object.keys(draft),
  });

  if (sectionKey === 'introduction') {
    // When the backend parser (Family A) returns structured_available=false
    // (e.g. plain markdown with no HTML tags), content is null and the actual
    // text lives in raw_text. Fall back to raw_text so we can still extract
    // tender_reference and tender_date from the plain-text response.
    const introContent = content ?? suggestion.raw_text ?? null
    const updated = normalizeIntroductionImport(draft, introContent)
    setSectionDraft(projectId, sectionKey, updated)
    return updated
  }

  // Family D: list-based sections that canonically use `items` or `custom_items`.
  // Route by section key instead of falling through to Family B/C based on incidental
  // content shape. This keeps fixed template items intact while importing AI-generated
  // additions into the editable list field for sections like buyer_obligations.
  if (FAMILY_D_ITEMS_SECTION_KEYS.has(sectionKey)) {
    const familyDItems = extractFamilyDImportItems(content, sectionKey)
    if (familyDItems !== null) {
      console.log('[importSuggestion] Matched: Family D by section key');
      const updated = importFamilyD(draft, familyDItems, sectionKey)
      console.log('[importSuggestion] importFamilyD result:', {
        updatedKeys: Object.keys(updated),
        itemsLength: updated.items?.length,
        customItemsLength: updated.custom_items?.length,
      });
      setSectionDraft(projectId, sectionKey, updated)
      return updated
    }
  }

  if (
    content &&
    typeof content === 'object' &&
    !Array.isArray(content) &&
    Array.isArray((content as any).items) &&
    FAMILY_D_ITEMS_SECTION_KEYS.has(sectionKey)
  ) {
    console.log('[importSuggestion] Matched: Object with nested items array (Family D)');
    const updated = importFamilyD(draft, (content as any).items, sectionKey)
    console.log('[importSuggestion] importFamilyD result:', {
      updatedKeys: Object.keys(updated),
      itemsLength: updated.items?.length,
      customItemsLength: updated.custom_items?.length,
    });
    setSectionDraft(projectId, sectionKey, updated)
    return updated
  }

  // Family B: tabular
  if (content && (Array.isArray(content) || Array.isArray(content?.rows) || content?.tables)) {
    console.log('[importSuggestion] Matched: Family B (tabular)');
    const updated = importFamilyB(draft, content)
    setSectionDraft(projectId, sectionKey, updated)
    return updated
  }

  // Family A: rich text
  if (typeof content === 'string' || content?.html || content?.paragraphs) {
    console.log('[importSuggestion] Matched: Family A (rich text)');
    const updated = importFamilyA(draft, content)
    setSectionDraft(projectId, sectionKey, updated)
    return updated
  }

  // Family D: list-based (fallback for other array content)
  if (Array.isArray(content)) {
    console.log('[importSuggestion] Matched: Family D fallback (array)');
    const updated = importFamilyD(draft, content, sectionKey)
    setSectionDraft(projectId, sectionKey, updated)
    return updated
  }

  // Family E: image-backed
  if (content && (content.images || content.base64 || Object.keys(content).some((k) => k.toLowerCase().includes('image')))) {
    console.log('[importSuggestion] Matched: Family E (image-backed)');
    const updated = importFamilyE(draft, content)
    setSectionDraft(projectId, sectionKey, updated)
    return updated
  }

  // Family C: fallback mixed-field shallow merge
  if (content && typeof content === 'object') {
    console.log('[importSuggestion] Matched: Family C (mixed-field shallow merge)');
    const updated = importFamilyC(draft, content)
    setSectionDraft(projectId, sectionKey, updated)
    return updated
  }

  // Fallback: for Family D string-list sections (buyer_obligations, etc.),
  // when content is null but raw_text is available, extract bullet items from
  // the raw text so the import still works even if the parser failed.
  if (
    !content &&
    suggestion.raw_text &&
    FAMILY_D_STRING_ITEM_SECTION_KEYS.has(sectionKey)
  ) {
    console.log('[importSuggestion] Fallback: extracting bullet items from raw_text for', sectionKey);
    const rawItems = extractBulletItemsFromText(suggestion.raw_text)
    if (rawItems.length > 0) {
      const updated = importFamilyD(draft, rawItems, sectionKey)
      setSectionDraft(projectId, sectionKey, updated)
      return updated
    }
  }

  console.log('[importSuggestion] NO MATCH - returning null');
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
  // Expanded preferred keys to include `criteria` (used by work_completion) and `custom_items` (used by buyer_obligations)
  const preferredKeys = ['items', 'criteria', 'custom_items', 'list', 'rows', 'entries']
  let targetKey: string | undefined

  if (
    sectionKey &&
    FAMILY_D_CUSTOM_ITEM_TARGET_SECTION_KEYS.has(sectionKey)
  ) {
    // Ensure custom_items is an array so AI imports land in the right field
    if (!Array.isArray(next.custom_items)) {
      next.custom_items = []
    }
    targetKey = 'custom_items'
  }

  for (const k of preferredKeys) {
    if (targetKey) {
      break
    }
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
