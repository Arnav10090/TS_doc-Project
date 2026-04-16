import React, { useState, useEffect } from 'react';
import { getSection } from '../../api/sections';
import { getAiPrompt } from '../../api/ai_prompts';
import DiagramUpload from '../shared/DiagramUpload';
import AiPromptModal from '../shared/AiPromptModal';
import toast from 'react-hot-toast';
import type { AiPromptResponse } from '../../types';

interface SystemConfigSectionProps {
  projectId: string;
}

const SystemConfigSection: React.FC<SystemConfigSectionProps> = ({ projectId }) => {
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [promptData, setPromptData] = useState<AiPromptResponse | null>(null);
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);

  useEffect(() => {
    const loadSection = async () => {
      try {
        // Load section data to mark as visited
        await getSection(projectId, 'system_config');
      } catch (error) {
        console.error('Error loading system config section:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSection();
  }, [projectId]);

  const handleGeneratePrompt = async () => {
    setIsGeneratingPrompt(true);
    try {
      const response = await getAiPrompt(projectId, 'architecture');
      setPromptData(response);
      setIsModalOpen(true);
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate AI prompt');
    } finally {
      setIsGeneratingPrompt(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '24px' }}>Loading...</div>;
  }

  return (
    <div style={{
      padding: '24px',
      backgroundColor: '#FFFFFF',
      borderRadius: '8px',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    }}>
      <h2 style={{
        fontSize: '24px',
        fontWeight: 600,
        color: '#1A1A2E',
        marginBottom: '24px',
      }}>
        System Configuration
      </h2>

      {/* AI Prompt Generation Section */}
      <div style={{ marginBottom: '32px' }}>
        <h3 style={{
          fontSize: '18px',
          fontWeight: 600,
          color: '#1A1A2E',
          marginBottom: '12px',
        }}>
          Architecture Diagram
        </h3>
        <p style={{
          fontSize: '14px',
          color: '#6B7280',
          marginBottom: '16px',
          lineHeight: '1.6',
        }}>
          Generate an AI prompt to create your system architecture diagram using free tools like
          Eraser.io, Claude.ai, or Mermaid Live Editor.
        </p>
        <button
          type="button"
          onClick={handleGeneratePrompt}
          disabled={isGeneratingPrompt}
          style={{
            padding: '10px 20px',
            border: 'none',
            borderRadius: '4px',
            backgroundColor: isGeneratingPrompt ? '#D1D5DB' : '#E60012',
            color: '#FFFFFF',
            cursor: isGeneratingPrompt ? 'not-allowed' : 'pointer',
            fontWeight: 500,
            fontSize: '14px',
          }}
        >
          {isGeneratingPrompt ? 'Generating...' : '✨ Generate AI Prompt'}
        </button>
      </div>

      {/* Image Upload Section */}
      <div>
        <h3 style={{
          fontSize: '18px',
          fontWeight: 600,
          color: '#1A1A2E',
          marginBottom: '12px',
        }}>
          Upload Architecture Diagram
        </h3>
        <p style={{
          fontSize: '14px',
          color: '#6B7280',
          marginBottom: '12px',
          lineHeight: '1.6',
        }}>
          Upload the generated architecture diagram (PNG or JPG, max 10MB).
        </p>
        <DiagramUpload
          projectId={projectId}
          imageType="architecture"
        />
      </div>

      {/* AI Prompt Modal */}
      {promptData && (
        <AiPromptModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          prompt={promptData.prompt}
          recommendedTools={promptData.recommended_tools}
        />
      )}
    </div>
  );
};

export default SystemConfigSection;
