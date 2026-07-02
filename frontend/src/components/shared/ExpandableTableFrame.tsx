import React from 'react';
import { createPortal } from 'react-dom';

interface ExpandableTableFrameProps {
  title: string;
  renderTable: () => React.ReactNode;
}

const ExpandableTableFrame: React.FC<ExpandableTableFrameProps> = ({ title, renderTable }) => {
  const [isExpanded, setIsExpanded] = React.useState(false);

  const closeModal = () => setIsExpanded(false);

  React.useEffect(() => {
    if (!isExpanded) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeModal();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isExpanded]);

  const expandButtonStyle: React.CSSProperties = {
    padding: '6px 10px',
    border: '1px solid #D1D5DB',
    borderRadius: '4px',
    backgroundColor: '#FFFFFF',
    color: '#1F2937',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 700,
    fontFamily: 'inherit',
  };

  const modal = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${title} expanded view`}
      onClick={closeModal}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2147483647,
        backgroundColor: '#FFFFFF',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px',
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          width: 'min(1680px, calc(100vw - 48px))',
          height: 'min(780px, calc(100vh - 96px))',
          backgroundColor: '#FFFFFF',
          borderRadius: '8px',
          boxShadow: '0 24px 60px rgba(15, 23, 42, 0.24)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '14px 18px',
            borderBottom: '1px solid #E5E7EB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexShrink: 0,
          }}
        >
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#111827' }}>{title}</div>
          <button
            type="button"
            onClick={closeModal}
            style={{
              ...expandButtonStyle,
              borderColor: '#E60012',
              color: '#E60012',
            }}
          >
            Close
          </button>
        </div>
        <div style={{ flex: 1, minHeight: 0, padding: '36px 24px 24px', overflow: 'auto' }}>
          {renderTable()}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
          <button
            type="button"
            onClick={() => setIsExpanded(true)}
            style={expandButtonStyle}
            aria-label={`Expand ${title}`}
            title={`Expand ${title}`}
          >
            Expand
          </button>
        </div>
        <div style={{ overflowX: 'auto' }}>{renderTable()}</div>
      </div>

      {isExpanded ? createPortal(modal, document.body) : null}
    </>
  );
};

export default ExpandableTableFrame;
