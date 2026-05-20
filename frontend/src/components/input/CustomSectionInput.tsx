import React, { useEffect, useState } from 'react';
import { deleteSection, upsertSection } from '../../api/sections';
import { useEditor } from '../../contexts/EditorContext';
import toast from 'react-hot-toast';
import type { CustomSectionContent, CustomSubsection } from '../../types/customSections';
import { isCustomSectionKey } from '../../utils/customSectionUtils';
import CustomSubsectionInput from './CustomSubsectionInput';

interface CustomSectionInputProps {
  projectId: string;
  sectionKey: string;
  activeSubsectionKey?: string | null;
  content: CustomSectionContent;
  sectionContents: Record<string, Record<string, any>>;
  onContentChange?: (content: CustomSectionContent) => void;
  onSectionNavigate?: (sectionKey: string) => void;
  onSubsectionSelect?: (subsectionKey: string | null) => void;
}

const CustomSectionInput: React.FC<CustomSectionInputProps> = ({
  projectId,
  sectionKey,
  activeSubsectionKey,
  content,
  sectionContents,
  onContentChange,
  onSectionNavigate,
  onSubsectionSelect,
}) => {
  const { refreshSections } = useEditor();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(content.title || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isSubsectionSaving, setIsSubsectionSaving] = useState(false);
  const [sectionDeletePending, setSectionDeletePending] = useState(false);
  const [pendingSubsectionDeleteKey, setPendingSubsectionDeleteKey] = useState<
    string | null
  >(null);
  const isInlineSubsectionSection = content.displayMode === 'subsection';
  const inlineSubsection = isInlineSubsectionSection ? content.subsections[0] : null;
  const selectedSubsection =
    !isInlineSubsectionSection && activeSubsectionKey
      ? content.subsections.find(
          (subsection) => subsection.key === activeSubsectionKey,
        ) || null
      : null;

  useEffect(() => {
    setTitleValue(content.title || '');
  }, [content.title]);

  useEffect(() => {
    if (
      !isInlineSubsectionSection &&
      activeSubsectionKey &&
      !content.subsections.some((subsection) => subsection.key === activeSubsectionKey)
    ) {
      onSubsectionSelect?.(null);
    }
  }, [
    activeSubsectionKey,
    content.subsections,
    isInlineSubsectionSection,
    onSubsectionSelect,
  ]);

  const handleSaveTitle = async () => {
    const trimmedTitle = titleValue.trim();

    if (trimmedTitle === (content.title || '')) {
      setIsEditingTitle(false);
      return;
    }

    setIsSaving(true);
    try {
      const updatedContent: CustomSectionContent = {
        ...content,
        title: trimmedTitle,
      };

      await upsertSection(projectId, sectionKey, updatedContent);
      
      if (onContentChange) {
        onContentChange(updatedContent);
      }

      await refreshSections();
      setIsEditingTitle(false);
      toast.success('Section title saved');
    } catch (error) {
      console.error('Failed to save section title:', error);
      toast.error('Failed to save section title');
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      void handleSaveTitle();
    } else if (e.key === 'Escape') {
      setTitleValue(content.title || '');
      setIsEditingTitle(false);
    }
  };

  const handleDeleteSubsection = async (subsectionKey: string) => {
    setIsSaving(true);
    try {
      const updatedContent: CustomSectionContent = {
        ...content,
        subsections: content.subsections.filter(
          (subsection) => subsection.key !== subsectionKey,
        ),
      };

      await upsertSection(projectId, sectionKey, updatedContent);

      if (onContentChange) {
        onContentChange(updatedContent);
      }

      await refreshSections();
      if (activeSubsectionKey === subsectionKey) {
        onSubsectionSelect?.(null);
      }
      setPendingSubsectionDeleteKey(null);
      toast.success('Subsection deleted');
    } catch (error) {
      console.error('Failed to delete subsection:', error);
      toast.error('Failed to delete subsection');
    } finally {
      setIsSaving(false);
    }
  };

  const handleInlineSubsectionUpdate = async (updatedSubsection: CustomSubsection) => {
    const updatedContent: CustomSectionContent = {
      ...content,
      subsections: content.subsections.map((subsection, index) =>
        index === 0 ? updatedSubsection : subsection,
      ),
    };

    onContentChange?.(updatedContent);
    setIsSubsectionSaving(true);

    try {
      await upsertSection(projectId, sectionKey, updatedContent);
    } catch (error) {
      console.error('Failed to save subsection:', error);
      toast.error('Failed to save subsection changes');
    } finally {
      setIsSubsectionSaving(false);
    }
  };

  const handleSelectedSubsectionUpdate = async (
    updatedSubsection: CustomSubsection,
  ) => {
    const updatedContent: CustomSectionContent = {
      ...content,
      subsections: content.subsections.map((subsection) =>
        subsection.key === updatedSubsection.key ? updatedSubsection : subsection,
      ),
    };

    onContentChange?.(updatedContent);
    setIsSubsectionSaving(true);

    try {
      await upsertSection(projectId, sectionKey, updatedContent);
    } catch (error) {
      console.error('Failed to save subsection:', error);
      toast.error('Failed to save subsection changes');
    } finally {
      setIsSubsectionSaving(false);
    }
  };

  const handleDeleteSection = async () => {
    setIsSaving(true);
    try {
      const childCustomSections = Object.entries(sectionContents).filter(
        ([key, sectionContent]) =>
          key !== sectionKey &&
          isCustomSectionKey(key) &&
          (sectionContent as CustomSectionContent).insertAfterKey === sectionKey,
      );

      for (const [childSectionKey, childSectionContent] of childCustomSections) {
        const childContent = childSectionContent as CustomSectionContent;
        await upsertSection(projectId, childSectionKey, {
          ...childContent,
          insertAfterKey: content.insertAfterKey,
        });
      }

      await deleteSection(projectId, sectionKey);
      setSectionDeletePending(false);
      onSectionNavigate?.(content.insertAfterKey || 'cover');
      await refreshSections();
      toast.success('Section deleted');
    } catch (error) {
      console.error('Failed to delete section:', error);
      toast.error('Failed to delete section');
    } finally {
      setIsSaving(false);
    }
  };

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  };

  const buttonStyle: React.CSSProperties = {
    padding: '12px 16px',
    backgroundColor: '#FFFFFF',
    color: '#E60012',
    border: '2px solid #E60012',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontFamily: 'inherit',
    width: '100%',
  };

  const buttonHoverStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: '#E60012',
    color: '#FFFFFF',
  };

  const inputStyle: React.CSSProperties = {
    padding: '12px',
    fontSize: '14px',
    border: '2px solid #E5E7EB',
    borderRadius: '6px',
    fontFamily: 'inherit',
    width: '100%',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '14px',
    fontWeight: 600,
    color: '#1A1A2E',
    marginBottom: '8px',
  };

  const helpTextStyle: React.CSSProperties = {
    fontSize: '12px',
    color: '#6B7280',
    marginTop: '4px',
  };

  const subsectionCardStyle: React.CSSProperties = {
    border: '1px solid #E5E7EB',
    borderRadius: '6px',
    padding: '12px',
    backgroundColor: '#FFFFFF',
    marginTop: '10px',
  };

  const secondaryButtonStyle: React.CSSProperties = {
    padding: '10px 14px',
    backgroundColor: '#FFFFFF',
    color: '#1A1A2E',
    border: '1px solid #D1D5DB',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: 'inherit',
  };

  const dangerButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    color: '#B42318',
    border: '1px solid #F04438',
  };

  const dangerButtonHoverStyle: React.CSSProperties = {
    ...dangerButtonStyle,
    backgroundColor: '#F04438',
    color: '#FFFFFF',
  };

  if (isInlineSubsectionSection && inlineSubsection) {
    return (
      <div style={containerStyle}>
        <div>
          <div style={labelStyle}>Edit Subsection Details</div>
          <div style={helpTextStyle}>
            Update the subsection name and edit its paragraph, table, or image content here.
          </div>
          {isSubsectionSaving && (
            <div style={{ ...helpTextStyle, color: '#E60012', marginTop: '8px' }}>
              Saving changes...
            </div>
          )}
        </div>

        <div style={subsectionCardStyle}>
          <CustomSubsectionInput
            parentSectionKey={sectionKey}
            subsection={inlineSubsection}
            onUpdate={(updatedSubsection) => {
              void handleInlineSubsectionUpdate(updatedSubsection);
            }}
          />
        </div>

        <div>
          <div style={labelStyle}>Subsection Actions</div>
          {!sectionDeletePending ? (
            <button
              type="button"
              style={dangerButtonStyle}
              onMouseEnter={(e) => {
                Object.assign(e.currentTarget.style, dangerButtonHoverStyle);
              }}
              onMouseLeave={(e) => {
                Object.assign(e.currentTarget.style, dangerButtonStyle);
              }}
              onClick={() => setSectionDeletePending(true)}
              disabled={isSaving}
            >
              Delete Subsection
            </button>
          ) : (
            <>
              <div style={helpTextStyle}>
                Delete this subsection from the document?
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  style={dangerButtonStyle}
                  onClick={() => void handleDeleteSection()}
                  disabled={isSaving}
                >
                  {isSaving ? 'Deleting...' : 'Confirm Delete'}
                </button>
                <button
                  type="button"
                  style={secondaryButtonStyle}
                  onClick={() => setSectionDeletePending(false)}
                  disabled={isSaving}
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div>
        <div style={labelStyle}>Section Title</div>
        
        {!isEditingTitle ? (
          <>
            <button
              type="button"
              style={buttonStyle}
              onMouseEnter={(e) => {
                Object.assign(e.currentTarget.style, buttonHoverStyle);
              }}
              onMouseLeave={(e) => {
                Object.assign(e.currentTarget.style, buttonStyle);
              }}
              onClick={() => setIsEditingTitle(true)}
            >
              {content.title ? 'Edit Section Title' : '+ Add Section Title'}
            </button>
            {content.title && (
              <div style={{ ...helpTextStyle, marginTop: '8px' }}>
                Current title: <strong>{content.title}</strong>
              </div>
            )}
          </>
        ) : (
          <>
            <input
              type="text"
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              onKeyDown={handleKeyDown}
              style={inputStyle}
              placeholder="Enter section title..."
              autoFocus
              disabled={isSaving}
            />
            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button
                type="button"
                style={buttonStyle}
                onClick={() => void handleSaveTitle()}
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
              <button
                type="button"
                style={secondaryButtonStyle}
                onClick={() => {
                  setTitleValue(content.title || '');
                  setIsEditingTitle(false);
                }}
                disabled={isSaving}
              >
                Cancel
              </button>
            </div>
            <div style={helpTextStyle}>
              Press Enter to save or Escape to cancel.
            </div>
          </>
        )}
      </div>

      <div>
        <div style={labelStyle}>Section Actions</div>
        {!sectionDeletePending ? (
          <button
            type="button"
            style={dangerButtonStyle}
            onMouseEnter={(e) => {
              Object.assign(e.currentTarget.style, dangerButtonHoverStyle);
            }}
            onMouseLeave={(e) => {
              Object.assign(e.currentTarget.style, dangerButtonStyle);
            }}
            onClick={() => setSectionDeletePending(true)}
            disabled={isSaving}
          >
            Delete Section
          </button>
        ) : (
          <>
            <div style={helpTextStyle}>
              Delete this section? Any custom sections added after it will be kept
              and moved to the previous page break.
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button
                type="button"
                style={dangerButtonStyle}
                onClick={() => void handleDeleteSection()}
                disabled={isSaving}
              >
                {isSaving ? 'Deleting...' : 'Confirm Delete'}
              </button>
              <button
                type="button"
                style={secondaryButtonStyle}
                onClick={() => setSectionDeletePending(false)}
                disabled={isSaving}
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>

      <div>
        <div style={labelStyle}>Subsections</div>
        {content.subsections.length === 0 ? (
          <div style={helpTextStyle}>
            No subsections yet. Use the page-break "Add New Section" button and
            choose "New Subsection" to create a table, image, or paragraph.
          </div>
        ) : (
          content.subsections.map((subsection, index) => (
            <div
              key={subsection.key}
              role="button"
              tabIndex={0}
              style={{
                ...subsectionCardStyle,
                cursor: 'pointer',
                borderColor:
                  selectedSubsection?.key === subsection.key ? '#E60012' : '#E5E7EB',
                backgroundColor:
                  selectedSubsection?.key === subsection.key ? '#FFF5F5' : '#FFFFFF',
              }}
              onClick={() => onSubsectionSelect?.(subsection.key)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onSubsectionSelect?.(subsection.key);
                }
              }}
            >
              <div
                style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#1A1A2E',
                  marginBottom: '6px',
                }}
              >
                {index + 1}. {subsection.name}
              </div>
              <div style={helpTextStyle}>
                Content type: {subsection.contentType}
              </div>
              {pendingSubsectionDeleteKey === subsection.key ? (
                <div style={{ marginTop: '10px' }}>
                  <div style={helpTextStyle}>
                    Delete this subsection from the section?
                  </div>
                  <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                    <button
                      type="button"
                      style={dangerButtonStyle}
                      onClick={(event) => {
                        event.stopPropagation();
                        void handleDeleteSubsection(subsection.key);
                      }}
                      disabled={isSaving}
                    >
                      {isSaving ? 'Deleting...' : 'Delete Subsection'}
                    </button>
                    <button
                      type="button"
                      style={secondaryButtonStyle}
                      onClick={(event) => {
                        event.stopPropagation();
                        setPendingSubsectionDeleteKey(null);
                      }}
                      disabled={isSaving}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  style={{ ...secondaryButtonStyle, marginTop: '10px' }}
                  onClick={(event) => {
                    event.stopPropagation();
                    onSubsectionSelect?.(subsection.key);
                    setPendingSubsectionDeleteKey(subsection.key);
                  }}
                  disabled={isSaving}
                >
                  Delete Subsection
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {content.subsections.length > 0 && (
        <div>
          <div style={labelStyle}>Edit Subsection Details</div>
          {selectedSubsection ? (
            <>
              <div style={helpTextStyle}>
                Update the subsection name and edit its paragraph, table, or image
                content here.
              </div>
              {isSubsectionSaving && (
                <div style={{ ...helpTextStyle, color: '#E60012', marginTop: '8px' }}>
                  Saving changes...
                </div>
              )}
              <div style={subsectionCardStyle}>
                <CustomSubsectionInput
                  parentSectionKey={sectionKey}
                  subsection={selectedSubsection}
                  onUpdate={(updatedSubsection) => {
                    void handleSelectedSubsectionUpdate(updatedSubsection);
                  }}
                />
              </div>
            </>
          ) : (
            <div style={helpTextStyle}>
              Click a subsection in the preview or list above to edit it.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CustomSectionInput;
