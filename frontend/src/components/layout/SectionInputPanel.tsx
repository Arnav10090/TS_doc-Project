import React, { useEffect, useState } from 'react';
import { isCustomSectionKey } from '../../utils/customSectionUtils';
import CustomSectionInput from '../input/CustomSectionInput';
import PredefinedSectionEditor from '../input/PredefinedSectionEditor';
import BuyerObligationsSection from '../sections/BuyerObligationsSection';
import type { CustomSectionContent } from '../../types/customSections';
import type { AutoSaveStatus, BuyerObligationsContent } from '../../types';
import { PREDEFINED_SECTION_TITLES, getDefaultSectionContent } from '../sections/predefinedSectionContent';
import { stripEditMetadata } from '../../utils/editMetadata';
import { useProjectStore } from '../../store/project.store'
import AISuggestionsButton from '../shared/AISuggestionsButton'
import SuggestionPanel from '../shared/SuggestionPanel'
import toast from 'react-hot-toast'
import importSuggestion from '../../utils/aiSuggestionImport'
import { generateAISuggestion, generateDrawioSuggestion, getAISuggestionsStatus } from '../../api/aiSuggestions'
import type { SuggestionResponse } from '../../api/aiSuggestions'

interface SectionInputPanelProps {
  projectId: string;
  activeSectionKey: string;
  activeSubsectionKey?: string | null;
  sectionContents: Record<string, Record<string, any>>;
  onContentChange?: (sectionKey: string, content: Record<string, any>) => void;
  onSaveSection?: (sectionKey: string) => void | Promise<void>;
  saveStatus?: AutoSaveStatus;
  onSectionNavigate?: (sectionKey: string) => void;
  onSubsectionSelect?: (subsectionKey: string | null) => void;
  onRefresh?: () => void;
  width: number;
  leftOffset: number;
  isNarrowScreen: boolean;
  showResizeHandle?: boolean;
  isResizing?: boolean;
  onResizeStart?: (event: React.PointerEvent<HTMLDivElement>) => void;
  onResizeStep?: (delta: number) => void;
  resizeKeyboardStep?: number;
}

const SectionInputPanel: React.FC<SectionInputPanelProps> = ({
  projectId,
  activeSectionKey,
  activeSubsectionKey,
  sectionContents,
  onContentChange,
  onSaveSection,
  saveStatus = 'idle',
  onSectionNavigate,
  onSubsectionSelect,
  width,
  leftOffset,
  isNarrowScreen,
  showResizeHandle = false,
  isResizing = false,
  onResizeStart,
  onResizeStep,
  resizeKeyboardStep = 16,
}) => {
  // Check if this is a custom section
  const isCustomSection = isCustomSectionKey(activeSectionKey);
  const customSectionContent = isCustomSection
    ? (stripEditMetadata(sectionContents[activeSectionKey]) as CustomSectionContent | undefined)
    : undefined;

  useEffect(() => {
    if (isCustomSection && !customSectionContent) {
      onSectionNavigate?.('cover');
    }
  }, [customSectionContent, isCustomSection, onSectionNavigate]);
  
  // Get section name
  const getSectionName = () => {
    if (isCustomSection) {
      if (customSectionContent?.displayMode === 'subsection') {
        return customSectionContent.subsections[0]?.name || 'New Subsection';
      }

      const selectedSubsection = customSectionContent?.subsections.find(
        (subsection) => subsection.key === activeSubsectionKey,
      );
      if (selectedSubsection) {
        return selectedSubsection.name || 'New Subsection';
      }

      return customSectionContent?.title || 'New Section';
    }
    return PREDEFINED_SECTION_TITLES[activeSectionKey] || 'Section';
  };

  const sectionName = getSectionName();
  const isSaving = saveStatus === 'saving';
  const tsType = useProjectStore((s) => s.tsType)
  const [aiConfigured, setAiConfigured] = useState<boolean | null>(null)
  const [suggestion, setSuggestion] = useState<SuggestionResponse | null>(null)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const activeDraftContent = sectionContents[activeSectionKey]
  const suppressedSections = new Set(['cover', 'revision_history', 'abbreviations'])
  const isSuppressedSection = suppressedSections.has(activeSectionKey)
  const hasSavedCustomSection = Boolean(customSectionContent)
  const showAISuggestions = !isSuppressedSection && (!isCustomSection || hasSavedCustomSection)
  const aiSuggestionsDisabled = !tsType || aiConfigured !== true
  const aiSuggestionsDisabledTooltip = !tsType
    ? 'Select a TS type for this project to enable AI suggestions'
    : aiConfigured === false
      ? 'AI provider is not configured'
      : aiConfigured === null
        ? 'Checking AI provider configuration...'
        : undefined

  useEffect(() => {
    let cancelled = false

    const loadAISuggestionsStatus = async () => {
      try {
        const status = await getAISuggestionsStatus()
        if (!cancelled) {
          setAiConfigured(status.ai_configured ?? status.groq_configured ?? false)
        }
      } catch (error) {
        console.error('AI suggestions status error', error)
        if (!cancelled) {
          setAiConfigured(false)
        }
      }
    }

    void loadAISuggestionsStatus()

    return () => {
      cancelled = true
    }
  }, [])
  // Create a callback that includes the section key
  const handleContentChange = (content: Record<string, any>) => {
    if (onContentChange) {
      onContentChange(activeSectionKey, content);
    }
  };

  const handleResizeKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!onResizeStep) {
      return;
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      onResizeStep(resizeKeyboardStep);
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      onResizeStep(-resizeKeyboardStep);
    }
  };

  return (
    <aside
      style={{
        width: isNarrowScreen ? `calc(100% - ${leftOffset}px)` : width,
        position: 'fixed',
        left: isNarrowScreen ? `${leftOffset}px` : 'auto',
        right: 0,
        top: '56px',
        bottom: 0,
        backgroundColor: '#FFFFFF',
        borderLeft: '1px solid #E5E7EB',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        zIndex: isNarrowScreen ? 20 : 'auto',
      }}
    >
      {showResizeHandle && onResizeStart && (
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize right sidebar"
          tabIndex={0}
          onPointerDown={onResizeStart}
          onKeyDown={handleResizeKeyDown}
          style={{
            position: 'absolute',
            top: 0,
            left: '-6px',
            bottom: 0,
            width: '12px',
            cursor: 'col-resize',
            zIndex: 30,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            touchAction: 'none',
          }}
        >
          <div
            style={{
              width: '2px',
              height: '56px',
              borderRadius: '999px',
              backgroundColor: isResizing ? '#E60012' : '#D1D5DB',
              boxShadow: isResizing
                ? '0 0 0 3px rgba(230, 0, 18, 0.12)'
                : '0 0 0 3px rgba(255, 255, 255, 0.95)',
              transition: 'background-color 0.2s ease, box-shadow 0.2s ease',
            }}
          />
        </div>
      )}

      {/* Sticky Header */}
      <div
        style={{
          padding: '16px',
          borderBottom: '1px solid #E5E7EB',
          backgroundColor: '#FFFFFF',
          position: 'sticky',
          top: 0,
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}
      >
        <h2
          style={{
            fontSize: '16px',
            fontWeight: 600,
            color: '#1A1A2E',
            margin: 0,
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {sectionName}
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          {/* AI Suggestions button - visible for applicable sections */}
          {showAISuggestions ? (
            <AISuggestionsButton
              projectId={projectId}
              sectionKey={activeSectionKey}
              draftContent={activeDraftContent}
              disabled={aiSuggestionsDisabled}
              disabledTooltip={aiSuggestionsDisabledTooltip}
              onSuggestionReceived={(nextSuggestion) => setSuggestion(nextSuggestion)}
            />
          ) : null}
          {saveStatus === 'saved' && (
            <span style={{ color: '#10B981', fontSize: '13px', fontWeight: 500 }}>
              Saved
            </span>
          )}
          {saveStatus === 'error' && (
            <span style={{ color: '#E60012', fontSize: '13px', fontWeight: 500 }}>
              Save failed
            </span>
          )}
          <button
            type="button"
            onClick={() => {
              void onSaveSection?.(activeSectionKey);
            }}
            disabled={!onSaveSection || isSaving}
            style={{
              padding: '8px 14px',
              backgroundColor: isSaving ? '#F3F4F6' : '#E60012',
              color: isSaving ? '#6B7280' : '#FFFFFF',
              border: '1px solid #E60012',
              borderRadius: '4px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: !onSaveSection || isSaving ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
              minWidth: '72px',
            }}
          >
            {isSaving ? 'SAVING' : 'SAVE'}
          </button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          minHeight: 0,
        }}
      >
      {suggestion ? (
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #E5E7EB', backgroundColor: '#FBFBFC' }}>
          <SuggestionPanel
            sectionKey={activeSectionKey}
            sectionTitle={sectionName}
            suggestion={suggestion}
            isRegenerating={isRegenerating}
            onDismiss={() => setSuggestion(null)}
            onImport={async () => {
              try {
                // Merge section defaults into draft so import targets the correct fields
                // (e.g. para1 for executive_summary instead of creating a spurious 'paragraph' key)
                const existingDraft = sectionContents[activeSectionKey] || {}
                const baseDraft = isCustomSection
                  ? existingDraft
                  : { ...getDefaultSectionContent(activeSectionKey), ...existingDraft }
                let updated = await importSuggestion(projectId, activeSectionKey, suggestion, baseDraft)
                
                // Fallback extraction for introduction if the backend returns raw_text
                if (activeSectionKey === 'introduction' && suggestion.raw_text) {
                  updated = updated || { ...baseDraft }
                  const text = suggestion.raw_text
                  const htmlStrippedText = text.replace(/<[^>]+>/g, ' ').replace(/\s{2,}/g, ' ')
                  const extractLabeledValue = (t: string, label: string) => {
                    const regex = new RegExp(`(?:^|\\n)\\s*(?:[-*]\\s*)?(?:\\*\\*)?${label}(?:\\*\\*)?\\s*:\\s*(.+)$`, 'im')
                    const match = t.match(regex)
                    return match?.[1]?.trim()?.replace(/<[^>]+>/g, '')
                  }
                  const tenderRef = extractLabeledValue(text, 'Tender Reference') ?? extractLabeledValue(htmlStrippedText, 'Tender Reference')
                  const tenderDate = extractLabeledValue(text, 'Tender Date') ?? extractLabeledValue(htmlStrippedText, 'Tender Date')

                  if (tenderRef) (updated as Record<string, any>).tender_reference = tenderRef
                  if (tenderDate) (updated as Record<string, any>).tender_date = tenderDate
                }

                if (updated) {
                  // update in-memory draft and notify parent
                  handleContentChange(updated as Record<string, any>)
                  toast.success('Imported suggestion into draft')
                } else {
                  toast.error('No structured content available to import')
                }
              } catch (err) {
                console.error('Import error', err)
                toast.error('Import failed')
              }
            }}
            onRegenerate={async () => {
              setIsRegenerating(true)
              try {
                const nextSuggestion = await generateAISuggestion(projectId, activeSectionKey, activeDraftContent)
                setSuggestion(nextSuggestion)
                toast.success('Suggestion regenerated')
              } catch (err) {
                console.error('Regenerate error', err)
              } finally {
                setIsRegenerating(false)
              }
            }}
            onGenerateDrawio={async () => {
              try {
                const drawioSuggestion = await generateDrawioSuggestion(projectId, activeSectionKey, activeDraftContent)
                toast.success(
                  activeSectionKey === 'system_config'
                    ? 'Draw.io code generated'
                    : 'Draw.io chart generated',
                )
                return drawioSuggestion
              } catch (err) {
                console.error('Draw.io generation error', err)
                toast.error('Draw.io generation failed')
                throw err
              }
            }}
          />
        </div>
      ) : null}

      <div
        style={{
          padding: '16px',
        }}
      >
        {isCustomSection && customSectionContent ? (
          <CustomSectionInput
            projectId={projectId}
            sectionKey={activeSectionKey}
            activeSubsectionKey={activeSubsectionKey}
            content={customSectionContent}
            sectionContents={sectionContents}
            onContentChange={handleContentChange}
            onSectionNavigate={onSectionNavigate}
            onSubsectionSelect={onSubsectionSelect}
          />
        ) : isCustomSection ? (
          <div
            style={{
              fontSize: '14px',
              color: '#6B7280',
              lineHeight: 1.5,
            }}
          >
            This section is no longer available. Redirecting to a valid section...
          </div>
        ) : activeSectionKey === 'buyer_obligations' ? (
          <BuyerObligationsSection
            projectId={projectId}
            content={sectionContents['buyer_obligations'] as BuyerObligationsContent | undefined}
            onContentChange={handleContentChange}
          />
        ) : (
          <PredefinedSectionEditor
            projectId={projectId}
            sectionKey={activeSectionKey}
            content={sectionContents[activeSectionKey]}
            onContentChange={handleContentChange}
          />
        )}
      </div>
      </div>
    </aside>
  );
};

export default SectionInputPanel;
