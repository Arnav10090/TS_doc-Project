import React from 'react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDangerous?: boolean;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  isDangerous = false,
}) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onClick={onCancel}
      >
        {/* Dialog */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '8px',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
            maxWidth: '500px',
            width: '90%',
            padding: '24px',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Title */}
          <h3
            style={{
              fontSize: '20px',
              fontWeight: 600,
              color: '#1A1A2E',
              marginBottom: '12px',
              margin: 0,
            }}
          >
            {title}
          </h3>

          {/* Message */}
          <p
            style={{
              fontSize: '14px',
              color: '#6B7280',
              lineHeight: '1.6',
              marginBottom: '24px',
            }}
          >
            {message}
          </p>

          {/* Actions */}
          <div
            style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end',
            }}
          >
            <button
              onClick={onCancel}
              style={{
                padding: '10px 20px',
                backgroundColor: '#FFFFFF',
                color: '#1A1A2E',
                border: '1px solid #E5E7EB',
                borderRadius: '4px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#F9FAFB';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#FFFFFF';
              }}
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              style={{
                padding: '10px 20px',
                backgroundColor: isDangerous ? '#E60012' : '#1A1A2E',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '4px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = isDangerous ? '#C50010' : '#2A2A3E';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = isDangerous ? '#E60012' : '#1A1A2E';
              }}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default ConfirmDialog;
