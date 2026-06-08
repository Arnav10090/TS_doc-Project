import React, { useEffect, useMemo, useState, useCallback } from 'react';
import TableSubsectionEditor from '../input/TableSubsectionEditor';
import ParagraphSubsectionEditor from '../input/ParagraphSubsectionEditor';
import {
  CustomSubsection,
  ImageData,
  ParagraphData,
  SubsectionContentType,
  TableData,
  getImageItems,
  getParagraphItems,
  getTableItems,
} from '../../types/customSections';
import {
  convertImageToBase64,
  generateCustomSubsectionKey,
  isCustomSectionKey,
  validateImageUpload,
} from '../../utils/customSectionUtils';

type ModalStep =
  | 'choose-type'
  | 'configure-subsection'
  | 'configure-content';

interface ContentBlock {
  id: string;
  type: SubsectionContentType;
  tableData: TableData;
  imageData: ImageData;
  paragraphData: ParagraphData;
}

interface CustomSectionOption {
  key: string;
  title: string;
  subsections?: Array<{
    key: string;
    name: string;
  }>;
}

interface SubsectionAnchorOption {
  key: string;
  label: string;
  insertAfterKey: string;
  insertAfterSubsectionKey?: string;
}

interface CurrentSectionContext {
  label: string;
  subsections: SubsectionAnchorOption[];
}

interface SectionTypeModalProps {
  isOpen: boolean;
  insertAfterKey: string;
  insertAfterSubsectionKey?: string;
  currentSection?: CurrentSectionContext | null;
  availableCustomSections: CustomSectionOption[];
  onClose: () => void;
  onCreateSection: (insertAfterKey: string) => Promise<void> | void;
  onCreateSubsection: (
    parentSectionKey: string,
    subsection: CustomSubsection,
    insertAfterSubsectionKey?: string,
  ) => Promise<void> | void;
}

const createTableData = (columnCount: number): TableData => {
  const normalizedCount = Math.max(1, columnCount);
  const columns = Array.from(
    { length: normalizedCount },
    (_, index) => `Column ${index + 1}`,
  );
  const firstRow = columns.reduce<Record<string, string>>((row, column) => {
    row[column] = '';
    return row;
  }, {});

  return {
    tables: [
      {
        caption: '',
        columns,
        rows: [firstRow],
      },
    ],
  };
};

const stripHtml = (html: string): string => {
  if (!html) {
    return '';
  }

  const temp = document.createElement('div');
  temp.innerHTML = html;
  return (temp.textContent || temp.innerText || '').trim();
};

let blockIdCounter = 0;
const generateBlockId = (): string => {
  blockIdCounter += 1;
  return `block_${Date.now()}_${blockIdCounter}`;
};

const createContentBlock = (type: SubsectionContentType): ContentBlock => ({
  id: generateBlockId(),
  type,
  tableData: createTableData(2),
  imageData: { images: [] },
  paragraphData: { paragraphs: [{ html: '' }] },
});

const SectionTypeModal: React.FC<SectionTypeModalProps> = ({
  isOpen,
  insertAfterKey,
  insertAfterSubsectionKey,
  currentSection,
  availableCustomSections,
  onClose,
  onCreateSection,
  onCreateSubsection,
}) => {
  const [step, setStep] = useState<ModalStep>('choose-type');
  const [subsectionName, setSubsectionName] = useState('');
  const [selectedContentType, setSelectedContentType] =
    useState<SubsectionContentType>('table');
  const [selectedAnchorKey, setSelectedAnchorKey] = useState('');
  const [contentBlocks, setContentBlocks] = useState<ContentBlock[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const targetCustomSection = useMemo(() => {
    if (!isCustomSectionKey(insertAfterKey)) {
      return null;
    }

    return (
      availableCustomSections.find((section) => section.key === insertAfterKey) || null
    );
  }, [availableCustomSections, insertAfterKey]);

  const targetSectionKey = targetCustomSection?.key || insertAfterKey;
  const canCreateSubsection = !['cover', 'revision_history'].includes(insertAfterKey);

  const customSectionAnchors = useMemo<SubsectionAnchorOption[]>(() => {
    if (!targetCustomSection?.subsections?.length) {
      return [];
    }

    return targetCustomSection.subsections.map((subsection, index) => ({
      key: `${targetCustomSection.key}:${subsection.key}`,
      label: `${index + 1}. ${subsection.name || `Subsection ${index + 1}`}`,
      insertAfterKey: targetCustomSection.key,
      insertAfterSubsectionKey: subsection.key,
    }));
  }, [targetCustomSection]);

  const subsectionAnchorOptions =
    currentSection?.subsections?.length
      ? currentSection.subsections
      : customSectionAnchors;
  const targetSectionLabel =
    currentSection?.label ||
    targetCustomSection?.title ||
    'the current section';
  const preferredAnchor = useMemo(() => {
    const matchingAnchor = subsectionAnchorOptions.find(
      (anchor) =>
        anchor.insertAfterKey === targetSectionKey &&
        (anchor.insertAfterSubsectionKey || '') ===
          (insertAfterSubsectionKey || ''),
    );

    return (
      matchingAnchor ||
      subsectionAnchorOptions[subsectionAnchorOptions.length - 1] ||
      null
    );
  }, [
    insertAfterSubsectionKey,
    subsectionAnchorOptions,
    targetSectionKey,
  ]);
  const selectedAnchor =
    subsectionAnchorOptions.find((anchor) => anchor.key === selectedAnchorKey) ||
    preferredAnchor;

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
    }

    return () => {
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setStep('choose-type');
    setSubsectionName('');
    setSelectedContentType('table');
    setSelectedAnchorKey(preferredAnchor?.key || '');
    setContentBlocks([]);
    setErrorMessage('');
    setIsSaving(false);
  }, [isOpen, preferredAnchor?.key]);

  const updateBlock = useCallback((blockId: string, updates: Partial<ContentBlock>) => {
    setContentBlocks((prev) =>
      prev.map((block) =>
        block.id === blockId ? { ...block, ...updates } : block,
      ),
    );
  }, []);

  const removeBlock = useCallback((blockId: string) => {
    setContentBlocks((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((block) => block.id !== blockId);
    });
  }, []);

  const addBlock = useCallback((type: SubsectionContentType) => {
    setContentBlocks((prev) => [...prev, createContentBlock(type)]);
  }, []);

  if (!isOpen) {
    return null;
  }

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '24px',
  };

  const contentStyle: React.CSSProperties = {
    backgroundColor: '#FFFFFF',
    borderRadius: '8px',
    padding: '24px',
    maxWidth: '760px',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '20px',
    fontWeight: 600,
    color: '#1A1A2E',
    margin: 0,
    marginBottom: '8px',
  };

  const subtitleStyle: React.CSSProperties = {
    fontSize: '13px',
    color: '#6B7280',
    marginBottom: '20px',
  };

  const buttonContainerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  };

  const optionButtonStyle: React.CSSProperties = {
    padding: '16px 20px',
    backgroundColor: '#FFFFFF',
    color: '#1A1A2E',
    border: '2px solid #E5E7EB',
    borderRadius: '6px',
    fontSize: '15px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontFamily: 'inherit',
    textAlign: 'left',
  };

  const primaryButtonStyle: React.CSSProperties = {
    padding: '10px 16px',
    backgroundColor: '#E60012',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
  };

  const secondaryButtonStyle: React.CSSProperties = {
    ...primaryButtonStyle,
    backgroundColor: '#FFFFFF',
    color: '#1A1A2E',
    border: '1px solid #D1D5DB',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #D1D5DB',
    borderRadius: '6px',
    fontSize: '14px',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '14px',
    fontWeight: 600,
    color: '#1A1A2E',
    marginBottom: '8px',
  };

  const helperStyle: React.CSSProperties = {
    fontSize: '12px',
    color: '#6B7280',
    marginTop: '6px',
  };

  const sectionBlockStyle: React.CSSProperties = {
    marginBottom: '18px',
  };

  const footerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '20px',
  };

  const addElementButtonStyle: React.CSSProperties = {
    padding: '8px 12px',
    backgroundColor: '#FFFFFF',
    color: '#E60012',
    border: '2px solid #E60012',
    borderRadius: '4px',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: 'inherit',
  };

  const addElementRowStyle: React.CSSProperties = {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
    marginTop: '16px',
  };

  const blockContainerStyle: React.CSSProperties = {
    border: '1px solid #E5E7EB',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '16px',
    backgroundColor: '#FAFAFA',
  };

  const blockHeaderStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  };

  const blockTitleStyle: React.CSSProperties = {
    fontSize: '14px',
    fontWeight: 600,
    color: '#1A1A2E',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  };

  const removeBlockButtonStyle: React.CSSProperties = {
    padding: '4px 10px',
    backgroundColor: '#FFFFFF',
    color: '#6B7280',
    border: '1px solid #D1D5DB',
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer',
    fontFamily: 'inherit',
  };

  const selectedTypeButton = (
    type: SubsectionContentType,
  ): React.CSSProperties => ({
    ...optionButtonStyle,
    borderColor: selectedContentType === type ? '#E60012' : '#E5E7EB',
    backgroundColor: selectedContentType === type ? '#FFF0F0' : '#FFFFFF',
    color: selectedContentType === type ? '#E60012' : '#1A1A2E',
  });

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleImageFileChange = async (
    blockId: string,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) {
      return;
    }

    setErrorMessage('');
    const block = contentBlocks.find((b) => b.id === blockId);
    if (!block) return;

    try {
      const nextImages = [...getImageItems(block.imageData)];

      for (const file of files) {
        const validationError = validateImageUpload(file);
        if (validationError) {
          throw new Error(validationError.message);
        }

        const base64 = await convertImageToBase64(file);
        nextImages.push({
          base64,
          filename: file.name,
          mimeType: file.type,
          caption: file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim(),
        });
      }

      updateBlock(blockId, { imageData: { images: nextImages } });
    } catch (error) {
      console.error('Failed to convert image:', error);
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to load the selected image.',
      );
    } finally {
      e.target.value = '';
    }
  };

  const handleRemoveImage = (blockId: string, indexToRemove: number) => {
    const block = contentBlocks.find((b) => b.id === blockId);
    if (!block) return;

    updateBlock(blockId, {
      imageData: {
        images: getImageItems(block.imageData).filter((_, index) => index !== indexToRemove),
      },
    });
  };

  const handleImageCaptionChange = (
    blockId: string,
    imageIndex: number,
    caption: string,
  ) => {
    const block = contentBlocks.find((b) => b.id === blockId);
    if (!block) return;

    updateBlock(blockId, {
      imageData: {
        images: getImageItems(block.imageData).map((image, index) =>
          index === imageIndex ? { ...image, caption } : image,
        ),
      },
    });
  };

  const handleContinueToContent = () => {
    if (!subsectionName.trim()) {
      setErrorMessage('Subsection name is required.');
      return;
    }

    setErrorMessage('');
    setContentBlocks([createContentBlock(selectedContentType)]);
    setStep('configure-content');
  };

  const handleCreateSectionClick = async () => {
    setIsSaving(true);
    setErrorMessage('');

    try {
      await onCreateSection(insertAfterKey);
      onClose();
    } catch (error) {
      console.error('Failed to create section:', error);
      setErrorMessage('Failed to create the new section.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAllBlocks = async () => {
    const trimmedName = subsectionName.trim();

    if (!canCreateSubsection) {
      setErrorMessage(
        'Subsections can only be added after numbered sections in the document.',
      );
      return;
    }

    if (!trimmedName) {
      setErrorMessage('Subsection name is required.');
      return;
    }

    // Validate all blocks
    for (let i = 0; i < contentBlocks.length; i++) {
      const block = contentBlocks[i];
      const blockLabel = `Block ${i + 1}`;

      if (block.type === 'table') {
        const normalizedTables = getTableItems(block.tableData);
        if (
          normalizedTables.length === 0 ||
          normalizedTables.some((table) => table.columns.some((column) => !column.trim()))
        ) {
          setErrorMessage(`${blockLabel}: Every table needs at least one titled column before saving.`);
          return;
        }
      }

      if (block.type === 'image' && getImageItems(block.imageData).length === 0) {
        setErrorMessage(`${blockLabel}: Upload at least one image before saving.`);
        return;
      }

      if (block.type === 'paragraph') {
        const normalizedParagraphs = getParagraphItems(block.paragraphData);
        if (!normalizedParagraphs.some((paragraph) => stripHtml(paragraph.html))) {
          setErrorMessage(`${blockLabel}: Enter paragraph text before saving.`);
          return;
        }
      }
    }

    setIsSaving(true);
    setErrorMessage('');

    try {
      const initialInsertAfterKey =
        selectedAnchor?.insertAfterKey || targetSectionKey;
      let nextInsertAfterSubsectionKey =
        selectedAnchor?.insertAfterSubsectionKey || insertAfterSubsectionKey;

      for (let i = 0; i < contentBlocks.length; i++) {
        const block = contentBlocks[i];

        let data;
        if (block.type === 'table') {
          const normalizedTables = getTableItems(block.tableData);
          data = {
            tables: normalizedTables.map((table) => ({
              caption: table.caption?.trim() || '',
              columns: table.columns.map((column) => column.trim()),
              rows: table.rows.map((row) =>
                table.columns.reduce<Record<string, string>>((nextRow, column) => {
                  const trimmedColumn = column.trim();
                  nextRow[trimmedColumn] = row[column] || '';
                  return nextRow;
                }, {}),
              ),
            })),
          };
        } else if (block.type === 'image') {
          data = block.imageData;
        } else {
          data = {
            paragraphs: getParagraphItems(block.paragraphData),
          };
        }

        const blockName = contentBlocks.length > 1
          ? `${trimmedName} - ${block.type.charAt(0).toUpperCase() + block.type.slice(1)} ${i + 1}`
          : trimmedName;

        const subsection: CustomSubsection = {
          key: generateCustomSubsectionKey(),
          name: blockName,
          contentType: block.type,
          data,
        };

        if (nextInsertAfterSubsectionKey) {
          await onCreateSubsection(
            initialInsertAfterKey,
            subsection,
            nextInsertAfterSubsectionKey,
          );
        } else {
          await onCreateSubsection(initialInsertAfterKey, subsection);
        }
        nextInsertAfterSubsectionKey = subsection.key;
      }

      onClose();
    } catch (error) {
      console.error('Failed to create subsection:', error);
      setErrorMessage('Failed to create the new subsection.');
    } finally {
      setIsSaving(false);
    }
  };

  const renderChooseTypeStep = () => (
    <>
      <h2 id="section-type-modal-title" style={titleStyle}>
        What would you like to add?
      </h2>
      <div style={subtitleStyle}>
        Create a new section after this page break, or add a subsection to an
        existing custom section.
      </div>
      <div style={buttonContainerStyle}>
        <button
          type="button"
          style={optionButtonStyle}
          onClick={handleCreateSectionClick}
          disabled={isSaving}
        >
          New Section
        </button>
        <button
          type="button"
          style={{
            ...optionButtonStyle,
            opacity: canCreateSubsection ? 1 : 0.6,
            cursor: canCreateSubsection ? 'pointer' : 'not-allowed',
          }}
          onClick={() => {
            if (!canCreateSubsection) {
              setErrorMessage(
                'Subsections can only be added after numbered sections in the document.',
              );
              return;
            }

            setErrorMessage('');
            setStep('configure-subsection');
          }}
          disabled={isSaving}
        >
          New Subsection
        </button>
      </div>
    </>
  );

  const renderSubsectionSetupStep = () => (
    <>
      <h2 id="section-type-modal-title" style={titleStyle}>
        New Subsection
      </h2>
      <div style={subtitleStyle}>
        This subsection will be added in <strong>{targetSectionLabel}</strong>.
        Give it a name and select what you want to create.
      </div>

      <div style={sectionBlockStyle}>
        <label style={labelStyle} htmlFor="subsection-name">
          Name of this subsection?
        </label>
        <input
          id="subsection-name"
          type="text"
          style={inputStyle}
          value={subsectionName}
          onChange={(e) => setSubsectionName(e.target.value)}
          placeholder="Enter subsection name"
        />
      </div>

      <div style={sectionBlockStyle}>
        <div style={labelStyle}>Current Section</div>
        <div
          style={{
            ...inputStyle,
            backgroundColor: '#F9FAFB',
            color: '#1A1A2E',
          }}
        >
          {targetSectionLabel}
        </div>
      </div>

      <div style={sectionBlockStyle}>
        <label style={labelStyle} htmlFor="add-after-subsection">
          Add after subsection:
        </label>
        <select
          id="add-after-subsection"
          style={{
            ...inputStyle,
            backgroundColor:
              subsectionAnchorOptions.length > 0 ? '#FFFFFF' : '#F9FAFB',
          }}
          value={selectedAnchor?.key || ''}
          onChange={(e) => setSelectedAnchorKey(e.target.value)}
          disabled={subsectionAnchorOptions.length === 0}
        >
          {subsectionAnchorOptions.length === 0 ? (
            <option value="">End of current section</option>
          ) : (
            subsectionAnchorOptions.map((anchor) => (
              <option key={anchor.key} value={anchor.key}>
                {anchor.label}
              </option>
            ))
          )}
        </select>
      </div>

      <div style={sectionBlockStyle}>
        <div style={labelStyle}>Select which you want to create?</div>
        <div style={buttonContainerStyle}>
          <button
            type="button"
            style={selectedTypeButton('table')}
            onClick={() => setSelectedContentType('table')}
          >
            Add Table
          </button>
          <button
            type="button"
            style={selectedTypeButton('image')}
            onClick={() => setSelectedContentType('image')}
          >
            Add Image
          </button>
          <button
            type="button"
            style={selectedTypeButton('paragraph')}
            onClick={() => setSelectedContentType('paragraph')}
          >
            Add Paragraph
          </button>
        </div>
      </div>

      <div style={footerStyle}>
        <button
          type="button"
          style={secondaryButtonStyle}
          onClick={() => setStep('choose-type')}
        >
          Back
        </button>
        <button
          type="button"
          style={primaryButtonStyle}
          onClick={handleContinueToContent}
        >
          Continue
        </button>
      </div>
    </>
  );

  const renderTableBlock = (block: ContentBlock) => (
    <TableSubsectionEditor
      data={block.tableData}
      onChange={(data) => updateBlock(block.id, { tableData: data })}
    />
  );

  const renderImageBlock = (block: ContentBlock) => (
    <div>
      <label style={labelStyle}>Select image files from this computer</label>
      <label
        style={{
          display: 'block',
          padding: '18px',
          border: '2px dashed #D1D5DB',
          borderRadius: '6px',
          backgroundColor: '#FFFFFF',
          cursor: 'pointer',
          textAlign: 'center',
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: '6px' }}>Choose Images</div>
        <div style={helperStyle}>PNG or JPG, multiple files supported, maximum 10MB each</div>
        <input
          type="file"
          accept="image/png,image/jpeg"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => handleImageFileChange(block.id, e)}
        />
      </label>
      {getImageItems(block.imageData).length > 0 && (
        <div
          style={{
            marginTop: '12px',
            border: '1px solid #E5E7EB',
            borderRadius: '6px',
            padding: '12px',
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: '12px' }}>
            Uploaded Images ({getImageItems(block.imageData).length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {getImageItems(block.imageData).map((image, index) => (
              <div
                key={`${image.filename}-${index}`}
                style={{
                  border: '1px solid #E5E7EB',
                  borderRadius: '6px',
                  padding: '12px',
                }}
              >
                <img
                  src={image.base64}
                  alt={image.filename || 'Uploaded preview'}
                  style={{ maxWidth: '100%', height: 'auto', display: 'block' }}
                />
                <div style={helperStyle}>
                  {image.filename} {image.mimeType ? `(${image.mimeType})` : ''}
                </div>
                <div style={{ marginTop: '12px' }}>
                  <label style={labelStyle}>Figure Name / Caption</label>
                  <input
                    type="text"
                    style={inputStyle}
                    value={image.caption || ''}
                    onChange={(e) =>
                      handleImageCaptionChange(block.id, index, e.target.value)
                    }
                    placeholder={`Figure ${index + 1} caption`}
                  />
                </div>
                <button
                  type="button"
                  style={{ ...secondaryButtonStyle, marginTop: '8px' }}
                  onClick={() => handleRemoveImage(block.id, index)}
                >
                  Remove Image
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderParagraphBlock = (block: ContentBlock) => (
    <ParagraphSubsectionEditor
      data={block.paragraphData}
      onChange={(data) => updateBlock(block.id, { paragraphData: data })}
    />
  );

  const getBlockTypeLabel = (type: SubsectionContentType): string => {
    switch (type) {
      case 'table':
        return 'Table';
      case 'image':
        return 'Image';
      case 'paragraph':
        return 'Paragraph';
    }
  };

  const renderContentStep = () => (
    <>
      <h2 id="section-type-modal-title" style={titleStyle}>
        Add Content
      </h2>
      <div style={subtitleStyle}>
        Configure content for <strong>{subsectionName.trim() || 'this subsection'}</strong>{' '}
        in <strong>{targetSectionLabel}</strong>
        {selectedAnchor ? <> after <strong>{selectedAnchor.label}</strong></> : null}.
        Add more elements using the buttons below each block.
      </div>

      {contentBlocks.map((block, index) => (
        <div key={block.id} style={blockContainerStyle}>
          <div style={blockHeaderStyle}>
            <div style={blockTitleStyle}>
              {getBlockTypeLabel(block.type)} {contentBlocks.length > 1 ? index + 1 : ''}
            </div>
            {contentBlocks.length > 1 && (
              <button
                type="button"
                style={removeBlockButtonStyle}
                onClick={() => removeBlock(block.id)}
              >
                Remove
              </button>
            )}
          </div>

          {block.type === 'table' && renderTableBlock(block)}
          {block.type === 'image' && renderImageBlock(block)}
          {block.type === 'paragraph' && renderParagraphBlock(block)}
        </div>
      ))}

      <div style={addElementRowStyle}>
        <button
          type="button"
          style={addElementButtonStyle}
          onClick={() => addBlock('table')}
        >
          + Add New Table
        </button>
        <button
          type="button"
          style={addElementButtonStyle}
          onClick={() => addBlock('paragraph')}
        >
          + Add New Paragraph
        </button>
        <button
          type="button"
          style={addElementButtonStyle}
          onClick={() => addBlock('image')}
        >
          + Add New Image
        </button>
      </div>

      <div style={footerStyle}>
        <button
          type="button"
          style={secondaryButtonStyle}
          onClick={() => setStep('configure-subsection')}
        >
          Back
        </button>
        <button
          type="button"
          style={primaryButtonStyle}
          onClick={handleSaveAllBlocks}
          disabled={isSaving}
        >
          {isSaving ? 'Saving...' : 'Save All'}
        </button>
      </div>
    </>
  );

  return (
    <div
      style={overlayStyle}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="section-type-modal-title"
    >
      <div style={contentStyle}>
        {step === 'choose-type' && renderChooseTypeStep()}
        {step === 'configure-subsection' && renderSubsectionSetupStep()}
        {step === 'configure-content' && renderContentStep()}

        {errorMessage && (
          <div
            style={{
              marginTop: '16px',
              padding: '10px 12px',
              borderRadius: '6px',
              backgroundColor: '#FFF0F0',
              color: '#E60012',
              fontSize: '13px',
            }}
          >
            {errorMessage}
          </div>
        )}
      </div>
    </div>
  );
};

export default SectionTypeModal;
