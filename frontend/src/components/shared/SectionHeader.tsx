import React, { useState } from 'react';
import { deleteSection } from '../../api/sections';
import { useEditor } from '../../contexts/EditorContext';
import ConfirmDialog from './ConfirmDialog';
import toast from 'react-hot-toast';

interface SectionHeaderProps {
  projectId: string;
  sectionKey: string;
  title: string;
  showDeleteButton?: boolean;
  onDelete?: () => void;
  onRefresh?: () => void;  // New prop to trigger data refresh
  status?: 'saving' | 'saved' | 'error' | null;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({
  projectId,
  sectionKey,
  title,
  showDeleteButton = true,
  onDelete,
  onRefresh,
  status,
}) => {
  const { refreshSections } = useEditor();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteClick = () => {
    setShowConfirmDialog(true);
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteSection(projectId, sectionKey);
      
      // Trigger refresh to reload section data from context
      await refreshSections();  // Wait for refresh to complete
      
      // Trigger refresh from prop if provided (backward compatibility)
      if (onRefresh) {
        await onRefresh();
      }
      
      toast.success('Section deleted successfully');
      setShowConfirmDialog(false);
      
      // Call onDelete callback AFTER refresh completes
      // This ensures the preview is updated before navigation
      if (onDelete) {
        // Small delay to ensure state updates have propagated
        setTimeout(() => {
          onDelete();
        }, 100);
      } else {
        // If no onDelete callback, just close the dialog
        setShowConfirmDialog(false);
      }
    } catch (error: any) {
      console.error('Error deleting section:', error);
      if (error.response?.status === 400) {
        toast.error(error.response.data.detail || 'Cannot delete this section');
      } else {
        toast.error('Failed to delete section');
      }
      setShowConfirmDialog(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setShowConfirmDialog(false);
  };

  return (
    <>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
        }}
      >
        <h2
          style={{
            fontSize: '24px',
            fontWeight: 600,
            color: '#1A1A2E',
            margin: 0,
          }}
        >
          {title}
        </h2>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Save Status */}
          {status === 'saving' && (
            <span style={{ color: '#6B7280', fontSize: '14px' }}>Saving...</span>
          )}
          {status === 'saved' && (
            <span style={{ color: '#10B981', fontSize: '14px' }}>Saved ✓</span>
          )}
          {status === 'error' && (
            <span style={{ color: '#E60012', fontSize: '14px' }}>Error saving</span>
          )}

          {/* Delete Button */}
          {showDeleteButton && (
            <button
              onClick={handleDeleteClick}
              disabled={isDeleting}
              style={{
                padding: '8px 16px',
                backgroundColor: '#FFFFFF',
                color: '#E60012',
                border: '1px solid #E60012',
                borderRadius: '4px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: isDeleting ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                opacity: isDeleting ? 0.6 : 1,
              }}
              onMouseEnter={(e) => {
                if (!isDeleting) {
                  e.currentTarget.style.backgroundColor = '#FFF0F0';
                }
              }}
              onMouseLeave={(e) => {
                if (!isDeleting) {
                  e.currentTarget.style.backgroundColor = '#FFFFFF';
                }
              }}
            >
              {isDeleting ? 'Deleting...' : 'Delete Section'}
            </button>
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showConfirmDialog}
        title="Delete Section"
        message="Do you really want to delete this section? This action is irreversible."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        isDangerous={true}
      />
    </>
  );
};

export default SectionHeader;
