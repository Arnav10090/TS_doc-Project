import toast from 'react-hot-toast';

const triggerBrowserDownload = (blob: Blob, filename: string): void => {
  const blobUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = blobUrl;
  anchor.download = filename;

  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  URL.revokeObjectURL(blobUrl);
};

/**
 * Handle document download from blob
 * Creates a temporary download link and triggers browser download
 */
export const handleDocumentDownload = (blob: Blob, filename: string): void => {
  try {
    triggerBrowserDownload(blob, filename);

    // Display success toast
    toast.success('Document downloaded successfully');
  } catch (error) {
    console.error('Download error:', error);
    toast.error('Failed to download document');
  }
};

export const downloadTextFile = (
  content: string,
  filename: string,
  mimeType = 'text/plain;charset=utf-8',
  successMessage = 'File downloaded successfully',
): void => {
  try {
    const blob = new Blob([content], { type: mimeType });
    triggerBrowserDownload(blob, filename);
    toast.success(successMessage);
  } catch (error) {
    console.error('Download error:', error);
    toast.error('Failed to download file');
  }
};
