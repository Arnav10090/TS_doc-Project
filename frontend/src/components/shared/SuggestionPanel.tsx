import React from 'react'
import toast from 'react-hot-toast'
import { downloadTextFile } from '../../utils/downloadHelper'
import {
  extractIntroductionTextContent,
  extractStructuredIntroductionContent,
  stripStructuredIntroductionJson,
} from '../../utils/introductionContent'
import ExpandableTableFrame from './ExpandableTableFrame'

interface SubsectionSuggestion {
  subsection_index: number
  subsection_name?: string | null
  type: string
  content?: any
  raw_text?: string | null
  structured_import_available?: boolean
}

interface Suggestion {
  section_key: string
  section_title?: string | null
  suggestion_mode?: string | null
  structured_import_available: boolean
  content?: any
  subsection_suggestions?: SubsectionSuggestion[] | null
  raw_text?: string | null
  historical_context_available?: boolean
  context_sources?: string[] | null
  context_txt_used?: boolean | null
}

interface Props {
  sectionKey: string
  sectionTitle?: string
  suggestion: Suggestion
  onImport?: () => void
  onRegenerate?: () => void
  // Optional handler that triggers Draw.io generation and returns `{ drawio_xml, chart_instructions }`
  onGenerateDrawio?: () => Promise<any>
  onDismiss?: () => void
  isRegenerating?: boolean
}

function renderSuggestionParagraph(paragraph: string, key: string) {
  if (/<\/?[a-z][\s\S]*>/i.test(paragraph)) {
    return (
      <div
        key={key}
        style={{ marginBottom: 12 }}
        dangerouslySetInnerHTML={{ __html: paragraph }}
      />
    )
  }

  return (
    <p key={key} style={{ margin: '0 0 12px', whiteSpace: 'pre-wrap' }}>
      {paragraph}
    </p>
  )
}

const SuggestionPanel: React.FC<Props> = ({
  sectionKey,
  sectionTitle,
  suggestion,
  onImport,
  onRegenerate,
  onGenerateDrawio,
  onDismiss,
  isRegenerating = false,
}) => {
  const [isGeneratingDrawio, setIsGeneratingDrawio] = React.useState(false)
  const [drawioXml, setDrawioXml] = React.useState<string | null>(null)
  const [drawioInstructions, setDrawioInstructions] = React.useState<string | null>(null)
  const [drawioError, setDrawioError] = React.useState<string | null>(null)
  const hasAutoRequestedDrawio = React.useRef(false)
  const supportsDrawio = ['system_config', 'overall_gantt', 'shutdown_gantt'].includes(sectionKey)
  const drawioButtonLabel = sectionKey === 'system_config' ? 'Generate Draw.io Code' : 'Generate Draw.io Chart'
  const safeSectionKey = sectionKey.replace(/[^a-z0-9-]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'diagram'
  const drawioDownloadFilename = `${safeSectionKey}-drawio-code.drawio`

  const handleGenerateDrawio = async () => {
    if (!onGenerateDrawio) return
    setIsGeneratingDrawio(true)
    setDrawioError(null)
    try {
      const resp = await onGenerateDrawio()
      if (resp?.drawio_xml) {
        setDrawioXml(resp.drawio_xml)
        setDrawioInstructions(resp.chart_instructions || null)
      } else {
        setDrawioError('No Draw.io XML returned')
      }
    } catch (err: any) {
      setDrawioError(err?.message || 'Failed to generate Draw.io chart')
    } finally {
      setIsGeneratingDrawio(false)
    }
  }

  React.useEffect(() => {
    if (sectionKey !== 'system_config' || !supportsDrawio || !onGenerateDrawio) {
      return
    }
    if (hasAutoRequestedDrawio.current || drawioXml || isGeneratingDrawio) {
      return
    }

    hasAutoRequestedDrawio.current = true
    void handleGenerateDrawio()
  }, [sectionKey, supportsDrawio, onGenerateDrawio, drawioXml, isGeneratingDrawio])

  const handleCopyXml = async () => {
    if (!drawioXml) return
    try {
      await navigator.clipboard.writeText(drawioXml)
      toast.success('Draw.io XML copied to clipboard')
    } catch (e) {
      toast.error('Failed to copy Draw.io XML')
    }
  }

  const handleDownloadXml = () => {
    if (!drawioXml) return
    downloadTextFile(
      drawioXml,
      drawioDownloadFilename,
      'application/vnd.jgraph.mxfile;charset=utf-8',
      'Draw.io code file downloaded',
    )
  }

  const renderContent = () => {
    if (suggestion.subsection_suggestions && suggestion.subsection_suggestions.length > 0) {
      return (
        <div>
          {suggestion.subsection_suggestions.map((s) => (
            <div key={s.subsection_index} style={{ marginBottom: 12, padding: 8, border: '1px solid #E5E7EB', borderRadius: 6 }}>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>{s.subsection_name || `Subsection ${s.subsection_index}`}</div>
              <div style={{ fontSize: 13, color: '#374151', marginBottom: 8 }}>{s.structured_import_available ? 'Structured' : 'Unstructured'}</div>
              {s.content ? (
                <pre style={{ whiteSpace: 'pre-wrap', fontSize: 13 }}>{typeof s.content === 'string' ? s.content : JSON.stringify(s.content, null, 2)}</pre>
              ) : (
                <pre style={{ whiteSpace: 'pre-wrap', fontSize: 13 }}>{s.raw_text || 'No content'}</pre>
              )}
            </div>
          ))}
        </div>
      )
    }

    if (suggestion.structured_import_available && suggestion.content) {
      const c = suggestion.content

      if (sectionKey === 'introduction') {
        const structuredIntroduction = extractStructuredIntroductionContent(c)
        const plainIntroductionContent =
          typeof c === 'string' ? extractIntroductionTextContent(c) : null
        const plainIntroductionText =
          typeof c === 'string' ? stripStructuredIntroductionJson(c).trim() : ''

        if (structuredIntroduction) {
          return (
            <div>
              {structuredIntroduction.paragraphs.map((paragraph, index) =>
                renderSuggestionParagraph(paragraph, `intro-${index}`),
              )}
              {(structuredIntroduction.tenderReference || structuredIntroduction.tenderDate) && (
                <div style={{ marginTop: 4 }}>
                  <p style={{ margin: '0 0 8px', fontWeight: 700 }}>Tender Information</p>
                  {structuredIntroduction.tenderReference && (
                    <p style={{ margin: '0 0 6px' }}>
                      <strong>Tender Reference:</strong> {structuredIntroduction.tenderReference}
                    </p>
                  )}
                  {structuredIntroduction.tenderDate && (
                    <p style={{ margin: 0 }}>
                      <strong>Tender Date:</strong> {structuredIntroduction.tenderDate}
                    </p>
                  )}
                </div>
              )}
            </div>
          )
        }

        if (plainIntroductionContent) {
          return (
            <div>
              {plainIntroductionContent.paragraphs.map((paragraph, index) =>
                renderSuggestionParagraph(paragraph, `intro-text-${index}`),
              )}
              {(plainIntroductionContent.tenderReference || plainIntroductionContent.tenderDate) && (
                <div style={{ marginTop: 4 }}>
                  <p style={{ margin: '0 0 8px', fontWeight: 700 }}>Tender Information</p>
                  {plainIntroductionContent.tenderReference && (
                    <p style={{ margin: '0 0 6px' }}>
                      <strong>Tender Reference:</strong> {plainIntroductionContent.tenderReference}
                    </p>
                  )}
                  {plainIntroductionContent.tenderDate && (
                    <p style={{ margin: 0 }}>
                      <strong>Tender Date:</strong> {plainIntroductionContent.tenderDate}
                    </p>
                  )}
                </div>
              )}
            </div>
          )
        }

        if (plainIntroductionText) {
          return <div style={{ whiteSpace: 'pre-wrap' }}>{plainIntroductionText}</div>
        }
      }

      // HTML string (rich text)
      if (typeof c === 'string') {
        return <div style={{ whiteSpace: 'pre-wrap' }} dangerouslySetInnerHTML={{ __html: c }} />
      }

      // Table-like content: { rows: [...] }
      if (c && typeof c === 'object' && Array.isArray((c as any).rows)) {
        const rows = (c as any).rows as Array<Record<string, any>>
        const headersSet = rows.reduce((acc: Set<string>, r) => {
          Object.keys(r || {}).forEach((k) => acc.add(k))
          return acc
        }, new Set<string>())
        const headers = Array.from(headersSet)

        return (
          <ExpandableTableFrame
            title="Suggestion Table"
            renderTable={() => (
              <table style={{ borderCollapse: 'collapse', width: '100%' }}>
              <thead>
                <tr>
                  {headers.map((h) => (
                    <th key={h} style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #E5E7EB', fontWeight: 700 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #F3F4F6' }}>
                    {headers.map((h) => (
                      <td key={h} style={{ padding: '8px', verticalAlign: 'top' }}>{typeof r[h] === 'object' ? JSON.stringify(r[h]) : String(r[h] ?? '')}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
              </table>
            )}
          />
        )
      }

      // Array content -> list
      if (Array.isArray(c)) {
        return (
          <ul style={{ marginLeft: 16 }}>
            {c.map((item: any, i: number) => (
              <li key={i} style={{ marginBottom: 6 }}>{typeof item === 'object' ? JSON.stringify(item) : String(item)}</li>
            ))}
          </ul>
        )
      }

      // Generic object -> key/value preview
      if (c && typeof c === 'object') {
        return (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '8px 16px' }}>
            {Object.entries(c).map(([k, v]) => (
              <React.Fragment key={k}>
                <div style={{ fontWeight: 700, color: '#374151' }}>{k}</div>
                <div style={{ color: '#111827' }}>{typeof v === 'object' ? JSON.stringify(v, null, 2) : String(v)}</div>
              </React.Fragment>
            ))}
          </div>
        )
      }

      // Fallback to JSON
      return <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(c, null, 2)}</pre>
    }

    // Fallback: raw text
    return <pre style={{ whiteSpace: 'pre-wrap' }}>{suggestion.raw_text || 'No suggestion content available'}</pre>
  }

  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{sectionTitle || sectionKey}</div>
            <div style={{ fontSize: 12, color: '#6B7280' }}>AI-generated content. Review before importing.</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={onImport}
              style={{ padding: '8px 12px', backgroundColor: '#10B981', color: '#fff', borderRadius: 6, border: 'none', cursor: 'pointer', fontWeight: 700 }}
            >
              Import Suggestion
            </button>
            <button
              type="button"
              onClick={onRegenerate}
              style={{ padding: '8px 12px', backgroundColor: isRegenerating ? '#F3F4F6' : '#E60012', color: '#fff', borderRadius: 6, border: 'none', cursor: isRegenerating ? 'not-allowed' : 'pointer', fontWeight: 700 }}
              disabled={isRegenerating}
            >
              {isRegenerating ? 'Regenerating...' : 'Regenerate'}
            </button>
            {/* Draw.io generation button for Gantt sections */}
            {supportsDrawio && onGenerateDrawio && (
              <button
                type="button"
                onClick={handleGenerateDrawio}
                disabled={isGeneratingDrawio}
                style={{ padding: '8px 12px', backgroundColor: isGeneratingDrawio ? '#F3F4F6' : '#0EA5E9', color: '#fff', borderRadius: 6, border: 'none', cursor: isGeneratingDrawio ? 'not-allowed' : 'pointer', fontWeight: 700 }}
              >
                {isGeneratingDrawio ? 'Generating...' : drawioButtonLabel}
              </button>
            )}
            <button
              type="button"
              onClick={onDismiss}
              style={{ padding: '8px 12px', backgroundColor: '#FFFFFF', color: '#1F2937', borderRadius: 6, border: '1px solid #D1D5DB', cursor: 'pointer', fontWeight: 700 }}
            >
              Dismiss
            </button>
          </div>
        </div>

          <div style={{ marginTop: 12 }}>{renderContent()}</div>

          {/* Draw.io XML / instructions display */}
          {drawioError && (
            <div style={{ marginTop: 12, color: '#E60012', fontSize: 13 }}>{drawioError}</div>
          )}

          {sectionKey === 'system_config' && isGeneratingDrawio && !drawioXml && (
            <div style={{ marginTop: 12, fontSize: 13, color: '#6B7280' }}>
              Generating Draw.io XML for this architecture diagram...
            </div>
          )}

          {drawioXml && (
            <div style={{ marginTop: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ fontWeight: 600 }}>Draw.io XML</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    onClick={handleCopyXml}
                    style={{ padding: '6px 10px', backgroundColor: '#111827', color: '#fff', borderRadius: 6, border: 'none', cursor: 'pointer', fontWeight: 600 }}
                  >
                    Copy XML
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadXml}
                    style={{ padding: '6px 10px', backgroundColor: '#0EA5E9', color: '#fff', borderRadius: 6, border: 'none', cursor: 'pointer', fontWeight: 600 }}
                  >
                    Download Code File
                  </button>
                </div>
              </div>
              <pre style={{ whiteSpace: 'pre-wrap', marginTop: 8, maxHeight: 320, overflow: 'auto', backgroundColor: '#F8FAFC', padding: 12, borderRadius: 6 }}>{drawioXml}</pre>
              {drawioInstructions && (
                <div style={{ marginTop: 8, fontSize: 13, color: '#6B7280' }}>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>Instructions</div>
                  <div>{drawioInstructions}</div>
                </div>
              )}
            </div>
          )}
      </div>
    </div>
  )
}

export default SuggestionPanel

