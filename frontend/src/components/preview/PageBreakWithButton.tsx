import React from 'react';

interface PageBreakWithButtonProps {
  insertAfterKey: string;
  insertAfterSubsectionKey?: string;
  onAddClick: (
    insertAfterKey: string,
    insertAfterSubsectionKey?: string,
  ) => void;
}

const PageBreakWithButton: React.FC<PageBreakWithButtonProps> = ({
  insertAfterKey,
  insertAfterSubsectionKey,
  onAddClick,
}) => {
  const containerStyle: React.CSSProperties = {
    width: '21.59cm',
    maxWidth: '100%',
    margin: '0 auto',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '18px 24px',
    backgroundColor: '#E8E8E8',
    boxShadow: 'inset 0 8px 10px -10px rgba(15, 23, 42, 0.22), inset 0 -8px 10px -10px rgba(15, 23, 42, 0.22)',
  };

  const breakZoneStyle: React.CSSProperties = {
    position: 'relative',
    minHeight: '44px',
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const breakGuideStyle: React.CSSProperties = {
    position: 'absolute',
    left: '24px',
    right: '24px',
    top: '50%',
    transform: 'translateY(-50%)',
    borderTop: '1px solid #D1D5DB',
    zIndex: 0,
  };

  const buttonStyle: React.CSSProperties = {
    padding: '8px 18px',
    backgroundColor: '#FFFFFF',
    color: '#E60012',
    border: '1px solid #E60012',
    borderRadius: '999px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontFamily: 'inherit',
    boxShadow: '0 2px 8px rgba(15, 23, 42, 0.08)',
    position: 'relative',
    zIndex: 1,
  };

  return (
    <div
      style={containerStyle}
      className="page-break-with-button"
      data-insert-after-key={insertAfterKey}
      data-insert-after-subsection-key={insertAfterSubsectionKey || undefined}
    >
      <div style={breakZoneStyle}>
        <div style={breakGuideStyle} aria-hidden="true" />
        <button
          type="button"
          className="add-section-button"
          style={buttonStyle}
          onClick={() => onAddClick(insertAfterKey, insertAfterSubsectionKey)}
          aria-label={`Add new section after ${insertAfterKey}`}
        >
          + Add New Section
        </button>
      </div>
    </div>
  );
};

export default PageBreakWithButton;
