import React, { useEffect } from 'react';
import toast from 'react-hot-toast';

interface RecommendedTool {
  name: string;
  url: string;
  note: string;
}

interface AiPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  prompt: string;
  recommendedTools: RecommendedTool[];
}

const AiPromptModal: React.FC<AiPromptModalProps> = ({
  isOpen,
  onClose,
  prompt,
  recommendedTools,
}) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(prompt);
    toast.success('Prompt copied to clipboard!');
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
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
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '8px',
          padding: '24px',
          maxWidth: '700px',
          width: '90%',
          maxHeight: '80vh',
          overflow: 'auto',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
        }}>
          <h2 style={{ margin: 0, color: '#1A1A2E', fontSize: '20px', fontWeight: 600 }}>
            AI Diagram Prompt
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: 'none',
              backgroundColor: 'transparent',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#6B7280',
            }}
          >
            ×
          </button>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <textarea
            value={prompt}
            readOnly
            style={{
              width: '100%',
              minHeight: '200px',
              padding: '12px',
              border: '1px solid #E5E7EB',
              borderRadius: '4px',
              fontFamily: 'monospace',
              fontSize: '13px',
              resize: 'vertical',
              backgroundColor: '#F9FAFB',
            }}
          />
        </div>

        <button
          type="button"
          onClick={handleCopyPrompt}
          style={{
            padding: '10px 20px',
            border: 'none',
            borderRadius: '4px',
            backgroundColor: '#E60012',
            color: '#FFFFFF',
            cursor: 'pointer',
            fontWeight: 500,
            marginBottom: '24px',
          }}
        >
          📋 Copy Prompt
        </button>

        <div style={{
          borderTop: '1px solid #E5E7EB',
          paddingTop: '16px',
          marginBottom: '16px',
        }}>
          <h3 style={{
            margin: '0 0 12px 0',
            color: '#1A1A2E',
            fontSize: '16px',
            fontWeight: 600,
          }}>
            Recommended Free Tools
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {recommendedTools.map((tool, index) => (
              <div
                key={index}
                style={{
                  padding: '12px',
                  border: '1px solid #E5E7EB',
                  borderRadius: '4px',
                  backgroundColor: '#F9FAFB',
                }}
              >
                <a
                  href={tool.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: '#E60012',
                    fontWeight: 500,
                    textDecoration: 'none',
                    display: 'block',
                    marginBottom: '4px',
                  }}
                >
                  {tool.name} →
                </a>
                <p style={{
                  margin: 0,
                  fontSize: '13px',
                  color: '#6B7280',
                }}>
                  {tool.note}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div style={{
          borderTop: '1px solid #E5E7EB',
          paddingTop: '16px',
        }}>
          <h3 style={{
            margin: '0 0 12px 0',
            color: '#1A1A2E',
            fontSize: '16px',
            fontWeight: 600,
          }}>
            Step-by-Step Instructions
          </h3>
          <ol style={{
            margin: 0,
            paddingLeft: '20px',
            color: '#6B7280',
            fontSize: '14px',
            lineHeight: '1.6',
          }}>
            <li>Copy the prompt above using the button</li>
            <li>Open any of the recommended tools</li>
            <li>Paste the prompt and generate the diagram</li>
            <li>Export the diagram as PNG (minimum 1920x1080px)</li>
            <li>Upload the PNG file using the upload section below</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default AiPromptModal;
