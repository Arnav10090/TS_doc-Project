import React, { useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';
import { uploadImage, getImages, deleteImage } from '../../api/images';

interface DiagramUploadProps {
  projectId: string;
  imageType: 'architecture' | 'gantt_overall' | 'gantt_shutdown';
  onUploadSuccess?: () => void;
}

const DiagramUpload: React.FC<DiagramUploadProps> = ({
  projectId,
  imageType,
  onUploadSuccess,
}) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    loadExistingImage();
  }, [projectId, imageType]);

  const loadExistingImage = async () => {
    try {
      const images = await getImages(projectId);
      const existingImage = images.find((img) => img.type === imageType);
      if (existingImage) {
        setImageUrl(existingImage.url);
      }
    } catch (error) {
      console.error('Failed to load existing image:', error);
    }
  };

  const onDrop = async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];

    // Validate file type
    if (!['image/png', 'image/jpeg'].includes(file.type)) {
      toast.error('Invalid file type. Please upload PNG or JPG images only.');
      return;
    }

    // Validate file size (10MB = 10 * 1024 * 1024 bytes)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('File size exceeds 10MB. Please upload a smaller image.');
      return;
    }

    setIsUploading(true);

    try {
      const response = await uploadImage(projectId, imageType, file);
      setImageUrl(response.url);
      toast.success('Image uploaded successfully!');
      if (onUploadSuccess) {
        onUploadSuccess();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = async () => {
    try {
      await deleteImage(projectId, imageType);
      setImageUrl(null);
      toast.success('Image removed successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove image');
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/png': [],
      'image/jpeg': [],
    },
    multiple: false,
  });

  if (imageUrl) {
    return (
      <div className="diagram-upload-preview" style={{ marginTop: '12px' }}>
        <img
          src={imageUrl}
          alt={`${imageType} diagram`}
          style={{
            maxWidth: '100%',
            maxHeight: '400px',
            border: '1px solid #E5E7EB',
            borderRadius: '4px',
            marginBottom: '12px',
          }}
        />
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setImageUrl(null)}
            style={{
              padding: '8px 16px',
              border: '1px solid #E5E7EB',
              borderRadius: '4px',
              backgroundColor: '#FFFFFF',
              color: '#1A1A2E',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            Change
          </button>
          <button
            type="button"
            onClick={handleRemove}
            style={{
              padding: '8px 16px',
              border: '1px solid #E60012',
              borderRadius: '4px',
              backgroundColor: '#FFFFFF',
              color: '#E60012',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            Remove
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      {...getRootProps()}
      style={{
        border: '2px dashed #E5E7EB',
        borderRadius: '8px',
        padding: '32px',
        textAlign: 'center',
        cursor: 'pointer',
        backgroundColor: isDragActive ? '#FFF0F0' : '#F9FAFB',
        transition: 'background-color 0.2s',
        marginTop: '12px',
      }}
    >
      <input {...getInputProps()} />
      {isUploading ? (
        <div style={{ color: '#6B7280' }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>⏳</div>
          <p>Uploading...</p>
        </div>
      ) : (
        <div style={{ color: '#6B7280' }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>📤</div>
          {isDragActive ? (
            <p>Drop the image here...</p>
          ) : (
            <>
              <p style={{ marginBottom: '4px' }}>
                Drag & drop an image here, or click to select
              </p>
              <p style={{ fontSize: '12px', color: '#9CA3AF' }}>
                PNG or JPG, max 10MB
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default DiagramUpload;
