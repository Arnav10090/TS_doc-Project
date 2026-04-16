import toast from 'react-hot-toast';

/**
 * Handle document download from blob
 * Creates a temporary download link and triggers browser download
 */
export const handleDocumentDownload = (blob: Blob, filename: string): void => {
  try {
    // Create blob URL using URL.createObjectURL per Req 70.1
    const blobUrl = URL.createObjectURL(blob);

    // Create temporary anchor element per Req 70.2
    const anchor = document.createElement('a');

    // Set anchor href to blob URL per Req 70.3
    anchor.href = blobUrl;

    // Set anchor download attribute to filename per Req 70.4
    anchor.download = filename;

    // Append anchor to document.body per Req 70.5
    document.body.appendChild(anchor);

    // Trigger click event per Req 70.6
    anchor.click();

    // Remove anchor from document.body per Req 70.7
    document.body.removeChild(anchor);

    // Revoke blob URL per Req 70.8
    URL.revokeObjectURL(blobUrl);

    // Display success toast
    toast.success('Document downloaded successfully');
  } catch (error) {
    console.error('Download error:', error);
    toast.error('Failed to download document');
  }
};
