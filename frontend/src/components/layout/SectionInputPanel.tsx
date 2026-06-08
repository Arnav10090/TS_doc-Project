import React, { useEffect } from 'react';
import { isCustomSectionKey } from '../../utils/customSectionUtils';
import CustomSectionInput from '../input/CustomSectionInput';
import PredefinedSectionEditor from '../input/PredefinedSectionEditor';
import type { CustomSectionContent } from '../../types/customSections';
import type { AutoSaveStatus } from '../../types';
import { PREDEFINED_SECTION_TITLES } from '../sections/predefinedSectionContent';
import { stripEditMetadata } from '../../utils/editMetadata';

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
        ) : (
          <PredefinedSectionEditor
            projectId={projectId}
            sectionKey={activeSectionKey}
            content={sectionContents[activeSectionKey]}
            onContentChange={handleContentChange}
          />
        )}
      </div>
    </aside>
  );
};

export default SectionInputPanel;
