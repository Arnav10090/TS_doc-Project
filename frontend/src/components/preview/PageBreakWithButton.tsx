import React, { useState } from 'react';

interface PageBreakWithButtonProps {
  insertAfterKey: string;
  onAddClick: (insertAfterKey: string) => void;
}

const PageBreakWithButton: React.FC<PageBreakWithButtonProps> = ({
  insertAfterKey,
  onAddClick,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const PAGE_HORIZONTAL_PADDING = 97;

  const containerStyle: React.CSSProperties = {
    width: `calc(100% + ${PAGE_HORIZONTAL_PADDING * 2}px)`,
    margin: `28px -${PAGE_HORIZONTAL_PADDING}px`,
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
    left: `${PAGE_HORIZONTAL_PADDING}px`,
    right: `${PAGE_HORIZONTAL_PADDING}px`,
    top: '50%',
    transform: 'translateY(-50%)',
    borderTop: '1px solid #D1D5DB',
    zIndex: 0,
  };

  const buttonStyle: React.CSSProperties = {
    padding: '8px 18px',
    backgroundColor: isHovered ? '#E60012' : '#FFFFFF',
    color: isHovered ? '#FFFFFF' : '#E60012',
    border: '1px solid #E60012',
    borderRadius: '999px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontFamily: 'inherit',
    boxShadow: isHovered
      ? '0 4px 14px rgba(230, 0, 18, 0.16)'
      : '0 2px 8px rgba(15, 23, 42, 0.08)',
    position: 'relative',
    zIndex: 1,
  };

  return (
    <div style={containerStyle} className="page-break-with-button">
      <div style={breakZoneStyle}>
        <div style={breakGuideStyle} aria-hidden="true" />
        <button
          type="button"
          className="add-section-button"
          style={buttonStyle}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onClick={() => onAddClick(insertAfterKey)}
          aria-label={`Add new section after ${insertAfterKey}`}
        >
          + Add New Section
        </button>
      </div>
    </div>
  );
};

export default PageBreakWithButton;
