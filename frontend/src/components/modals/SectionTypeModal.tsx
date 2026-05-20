import React, { useEffect, useMemo, useState } from 'react';
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
  | 'configure-table'
  | 'configure-image'
  | 'configure-paragraph';

interface CustomSectionOption {
  key: string;
  title: string;
}

interface SectionTypeModalProps {
  isOpen: boolean;
  insertAfterKey: string;
  availableCustomSections: CustomSectionOption[];
  onClose: () => void;
  onCreateSection: (insertAfterKey: string) => Promise<void> | void;
  onCreateSubsection: (
    parentSectionKey: string,
    subsection: CustomSubsection,
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

const SectionTypeModal: React.FC<SectionTypeModalProps> = ({
  isOpen,
  insertAfterKey,
  availableCustomSections,
  onClose,
  onCreateSection,
  onCreateSubsection,
}) => {
  const [step, setStep] = useState<ModalStep>('choose-type');
  const [subsectionName, setSubsectionName] = useState('');
  const [selectedContentType, setSelectedContentType] =
    useState<SubsectionContentType>('table');
  const [tableData, setTableData] = useState<TableData>(() => createTableData(2));
  const [imageData, setImageData] = useState<ImageData>({ images: [] });
  const [paragraphData, setParagraphData] = useState<ParagraphData>({
    paragraphs: [{ html: '' }],
  });
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

  const targetSectionLabel = targetCustomSection?.title || 'the current section';

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
    setTableData(createTableData(2));
    setImageData({ images: [] });
    setParagraphData({ paragraphs: [{ html: '' }] });
    setErrorMessage('');
    setIsSaving(false);
  }, [isOpen, targetCustomSection]);

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
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) {
      return;
    }

    setErrorMessage('');

    try {
      const nextImages = [...getImageItems(imageData)];

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
        });
      }

      setImageData({ images: nextImages });
    } catch (error) {
      console.error('Failed to convert image:', error);
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to load the selected image.',
      );
    } finally {
      e.target.value = '';
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setImageData({
      images: getImageItems(imageData).filter((_, index) => index !== indexToRemove),
    });
  };

  const handleContinueToSubsectionContent = () => {
    if (!subsectionName.trim()) {
      setErrorMessage('Subsection name is required.');
      return;
    }

    setErrorMessage('');

    if (selectedContentType === 'table') {
      setStep('configure-table');
      return;
    }

    if (selectedContentType === 'image') {
      setStep('configure-image');
      return;
    }

    setStep('configure-paragraph');
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

  const handleSaveSubsection = async () => {
    const trimmedName = subsectionName.trim();
    const normalizedTables = getTableItems(tableData);
    const normalizedParagraphs = getParagraphItems(paragraphData);

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

    if (selectedContentType === 'table') {
      if (
        normalizedTables.length === 0 ||
        normalizedTables.some((table) => table.columns.some((column) => !column.trim()))
      ) {
        setErrorMessage('Every table needs at least one titled column before saving.');
        return;
      }
    }

    if (selectedContentType === 'image' && getImageItems(imageData).length === 0) {
      setErrorMessage('Upload at least one image before saving this subsection.');
      return;
    }

    if (
      selectedContentType === 'paragraph' &&
      !normalizedParagraphs.some((paragraph) => stripHtml(paragraph.html))
    ) {
      setErrorMessage('Enter paragraph text before saving.');
      return;
    }

    const subsection: CustomSubsection = {
      key: generateCustomSubsectionKey(),
      name: trimmedName,
      contentType: selectedContentType,
      data:
        selectedContentType === 'table'
          ? {
              tables: normalizedTables.map((table) => ({
                columns: table.columns.map((column) => column.trim()),
                rows: table.rows.map((row) =>
                  table.columns.reduce<Record<string, string>>((nextRow, column) => {
                    const trimmedColumn = column.trim();
                    nextRow[trimmedColumn] = row[column] || '';
                    return nextRow;
                  }, {}),
                ),
              })),
            }
          : selectedContentType === 'image'
            ? imageData
            : {
                paragraphs: normalizedParagraphs,
              },
    };

    setIsSaving(true);
    setErrorMessage('');

    try {
      await onCreateSubsection(targetSectionKey, subsection);
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
        <div style={labelStyle}>Target location</div>
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
          onClick={handleContinueToSubsectionContent}
        >
          Continue
        </button>
      </div>
    </>
  );

  const renderTableStep = () => (
    <>
      <h2 id="section-type-modal-title" style={titleStyle}>
        Add Table
      </h2>
      <div style={subtitleStyle}>
        Create one or more tables for <strong>{subsectionName.trim() || 'this subsection'}</strong>{' '}
        in <strong>{targetSectionLabel}</strong>.
      </div>

      <div style={sectionBlockStyle}>
        <TableSubsectionEditor data={tableData} onChange={setTableData} />
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
          onClick={handleSaveSubsection}
          disabled={isSaving}
        >
          Create Table
        </button>
      </div>
    </>
  );

  const renderImageStep = () => (
    <>
      <h2 id="section-type-modal-title" style={titleStyle}>
        Add Image
      </h2>
      <div style={subtitleStyle}>
        Upload an image for <strong>{subsectionName.trim() || 'this subsection'}</strong>{' '}
        in <strong>{targetSectionLabel}</strong>.
      </div>

      <div style={sectionBlockStyle}>
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
            onChange={handleImageFileChange}
          />
        </label>
        {getImageItems(imageData).length > 0 && (
          <div
            style={{
              marginTop: '12px',
              border: '1px solid #E5E7EB',
              borderRadius: '6px',
              padding: '12px',
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: '12px' }}>
              Uploaded Images ({getImageItems(imageData).length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {getImageItems(imageData).map((image, index) => (
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
                  <button
                    type="button"
                    style={{ ...secondaryButtonStyle, marginTop: '8px' }}
                    onClick={() => handleRemoveImage(index)}
                  >
                    Remove Image
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
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
          onClick={handleSaveSubsection}
          disabled={isSaving}
        >
          Save Images
        </button>
      </div>
    </>
  );

  const renderParagraphStep = () => (
    <>
      <h2 id="section-type-modal-title" style={titleStyle}>
        Add Paragraph
      </h2>
      <div style={subtitleStyle}>
        Write one or more formatted paragraphs for <strong>{subsectionName.trim() || 'this subsection'}</strong>{' '}
        using the same editor configured in the existing section inputs.
      </div>

      <div style={sectionBlockStyle}>
        <ParagraphSubsectionEditor data={paragraphData} onChange={setParagraphData} />
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
          onClick={handleSaveSubsection}
          disabled={isSaving}
        >
          Save Text
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
        {step === 'configure-table' && renderTableStep()}
        {step === 'configure-image' && renderImageStep()}
        {step === 'configure-paragraph' && renderParagraphStep()}

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
