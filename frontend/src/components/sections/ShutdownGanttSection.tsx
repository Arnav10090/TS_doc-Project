import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSection } from '../../api/sections';
import { getAiPrompt } from '../../api/ai_prompts';
import SectionHeader from '../shared/SectionHeader';
import DiagramUpload from '../shared/DiagramUpload';
import AiPromptModal from '../shared/AiPromptModal';
import toast from 'react-hot-toast';
import type { AiPromptResponse } from '../../types';

interface ShutdownGanttSectionProps {
  projectId: string;
}

const ShutdownGanttSection: React.FC<ShutdownGanttSectionProps> = ({ projectId }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [promptData, setPromptData] = useState<AiPromptResponse | null>(null);
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);

  useEffect(() => {
    const loadSection = async () => {
      try {
        // Load section data to mark as visited
        await getSection(projectId, 'shutdown_gantt');
      } catch (error) {
        console.error('Error loading shutdown gantt section:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSection();
  }, [projectId]);

  const handleGeneratePrompt = async () => {
    setIsGeneratingPrompt(true);
    try {
      const response = await getAiPrompt(projectId, 'gantt_shutdown');
      setPromptData(response);
      setIsModalOpen(true);
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate AI prompt');
    } finally {
      setIsGeneratingPrompt(false);
    }
  };

  const handleDelete = () => {
    navigate(`/editor/${projectId}#cover`);
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
      <SectionHeader
        projectId={projectId}
        sectionKey="shutdown_gantt"
        title="Shutdown Gantt Chart"
        showDeleteButton={true}
        onDelete={handleDelete}
      />

      {/* AI Prompt Generation Section */}
      <div style={{ marginBottom: '32px' }}>
        <h3 style={{
          fontSize: '18px',
          fontWeight: 600,
          color: '#1A1A2E',
          marginBottom: '12px',
        }}>
          Commissioning Timeline Diagram
        </h3>
        <p style={{
          fontSize: '14px',
          color: '#6B7280',
          marginBottom: '16px',
          lineHeight: '1.6',
        }}>
          Generate an AI prompt to create your 14-day commissioning Gantt chart using free tools like
          Claude.ai, Mermaid Live Editor, or Tom's Planner.
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
          Upload Shutdown Gantt Chart
        </h3>
        <p style={{
          fontSize: '14px',
          color: '#6B7280',
          marginBottom: '12px',
          lineHeight: '1.6',
        }}>
          Upload the generated shutdown Gantt chart (PNG or JPG, max 10MB).
        </p>
        <DiagramUpload
          projectId={projectId}
          imageType="gantt_shutdown"
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

export default ShutdownGanttSection;
