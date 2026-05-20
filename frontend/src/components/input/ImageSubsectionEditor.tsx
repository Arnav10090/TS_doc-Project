import React, { useState } from 'react';
import { ImageData, getImageItems } from '../../types/customSections';
import { validateImageUpload, convertImageToBase64 } from '../../utils/customSectionUtils';

interface ImageSubsectionEditorProps {
  data: ImageData;
  onChange: (data: ImageData) => void;
}

const ImageSubsectionEditor: React.FC<ImageSubsectionEditorProps> = ({ data, onChange }) => {
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const containerStyle: React.CSSProperties = {
    padding: '16px',
    backgroundColor: '#F9FAFB',
    borderRadius: '6px',
  };

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: '14px',
    fontWeight: 600,
    color: '#1A1A2E',
    marginBottom: '12px',
  };

  const fileInputContainerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  };

  const fileInputStyle: React.CSSProperties = {
    padding: '10px',
    border: '2px dashed #D1D5DB',
    borderRadius: '6px',
    backgroundColor: '#FFFFFF',
    cursor: 'pointer',
    fontSize: '14px',
    fontFamily: 'inherit',
  };

  const errorStyle: React.CSSProperties = {
    padding: '12px',
    backgroundColor: '#FEE2E2',
    color: '#DC2626',
    borderRadius: '4px',
    fontSize: '13px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  };

  const previewContainerStyle: React.CSSProperties = {
    marginTop: '16px',
    padding: '12px',
    backgroundColor: '#FFFFFF',
    borderRadius: '6px',
    border: '1px solid #E5E7EB',
  };

  const previewImageStyle: React.CSSProperties = {
    maxWidth: '100%',
    height: 'auto',
    borderRadius: '4px',
    marginTop: '8px',
  };

  const fileInfoStyle: React.CSSProperties = {
    fontSize: '13px',
    color: '#6B7280',
    marginTop: '8px',
  };

  const secondaryButtonStyle: React.CSSProperties = {
    padding: '8px 12px',
    backgroundColor: '#FFFFFF',
    color: '#1A1A2E',
    border: '1px solid #D1D5DB',
    borderRadius: '4px',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: 'inherit',
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setError(null);
    setIsUploading(true);

    try {
      const nextImages = [...getImageItems(data)];

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

      onChange({ images: nextImages });

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload image. Please try again.');
      console.error('Image upload error:', err);
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setError(null);
    onChange({
      images: getImageItems(data).filter((_, index) => index !== indexToRemove),
    });
  };

  const images = getImageItems(data);

  return (
    <div style={containerStyle}>
      <div style={sectionTitleStyle}>Image Upload</div>

      <div style={fileInputContainerStyle}>
        <label
          style={{
            ...fileInputStyle,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span style={{ fontSize: '32px' }}>📁</span>
          <span style={{ fontWeight: 500 }}>
            {isUploading ? 'Uploading...' : 'Click to upload image(s)'}
          </span>
          <span style={{ fontSize: '12px', color: '#6B7280' }}>
            PNG or JPG, multiple files supported (max 10MB each)
          </span>
          <input
            type="file"
            accept="image/png,image/jpeg"
            multiple
            onChange={handleFileChange}
            disabled={isUploading}
            style={{ display: 'none' }}
          />
        </label>

        {error && (
          <div style={errorStyle}>
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {images.length > 0 && (
          <div style={previewContainerStyle}>
            <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>
              Uploaded Images ({images.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {images.map((image, index) => (
                <div
                  key={`${image.filename}-${index}`}
                  style={{
                    border: '1px solid #E5E7EB',
                    borderRadius: '6px',
                    padding: '12px',
                  }}
                >
                  <img src={image.base64} alt={image.filename} style={previewImageStyle} />
                  <div style={fileInfoStyle}>
                    <div>
                      <strong>Filename:</strong> {image.filename}
                    </div>
                    <div>
                      <strong>Type:</strong> {image.mimeType}
                    </div>
                  </div>
                  <button
                    type="button"
                    style={{ ...secondaryButtonStyle, marginTop: '12px' }}
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
    </div>
  );
};

export default ImageSubsectionEditor;
