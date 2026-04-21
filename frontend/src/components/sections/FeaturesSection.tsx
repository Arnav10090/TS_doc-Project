import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSection } from '../../api/sections';
import { useAutoSave } from '../../hooks/useAutoSave';
import SectionHeader from '../shared/SectionHeader';
import RichTextEditor from '../shared/RichTextEditor';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { FeaturesContent, FeatureItem } from '../../types';

interface FeaturesSectionProps {
  projectId: string;
}

interface SortableFeatureCardProps {
  feature: FeatureItem;
  index: number;
  onUpdate: (id: string, field: keyof FeatureItem, value: string) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
}

const SortableFeatureCard: React.FC<SortableFeatureCardProps> = ({
  feature,
  index,
  onUpdate,
  onRemove,
  canRemove,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: feature.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        marginBottom: '16px',
        padding: '16px',
        backgroundColor: '#FFFFFF',
        border: '1px solid #E5E7EB',
        borderRadius: '8px',
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: isCollapsed ? '0' : '16px',
      }}>
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          style={{
            cursor: 'grab',
            fontSize: '20px',
            color: '#6B7280',
            padding: '4px',
          }}
          title="Drag to reorder"
        >
          ⠿
        </div>

        {/* Feature Label */}
        <div style={{
          fontWeight: 600,
          color: '#E60012',
          fontSize: '14px',
        }}>
          Feature {index + 1}
        </div>

        {/* Collapse/Expand Button */}
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          style={{
            marginLeft: 'auto',
            padding: '4px 12px',
            border: '1px solid #E5E7EB',
            borderRadius: '4px',
            backgroundColor: '#FFFFFF',
            cursor: 'pointer',
            fontSize: '14px',
            color: '#6B7280',
          }}
        >
          {isCollapsed ? '▼ Expand' : '▲ Collapse'}
        </button>

        {/* Remove Button */}
        {canRemove && (
          <button
            type="button"
            onClick={() => onRemove(feature.id)}
            style={{
              padding: '4px 12px',
              border: '1px solid #E5E7EB',
              borderRadius: '4px',
              backgroundColor: '#FFFFFF',
              color: '#E60012',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Remove
          </button>
        )}
      </div>

      {!isCollapsed && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Title */}
          <div>
            <label style={{
              display: 'block',
              marginBottom: '6px',
              fontWeight: 500,
              color: '#1A1A2E',
              fontSize: '14px',
            }}>
              Title <span style={{ color: '#E60012' }}>*</span>
            </label>
            <input
              type="text"
              value={feature.title}
              onChange={(e) => onUpdate(feature.id, 'title', e.target.value)}
              placeholder="Enter feature title"
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #E5E7EB',
                borderRadius: '4px',
                fontSize: '14px',
                fontFamily: 'inherit',
              }}
            />
          </div>

          {/* Brief */}
          <div>
            <label style={{
              display: 'block',
              marginBottom: '6px',
              fontWeight: 500,
              color: '#1A1A2E',
              fontSize: '14px',
            }}>
              Brief (max 150 characters)
            </label>
            <input
              type="text"
              value={feature.brief}
              onChange={(e) => {
                const value = e.target.value.slice(0, 150);
                onUpdate(feature.id, 'brief', value);
              }}
              placeholder="Enter brief description"
              maxLength={150}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #E5E7EB',
                borderRadius: '4px',
                fontSize: '14px',
                fontFamily: 'inherit',
              }}
            />
            <div style={{
              marginTop: '4px',
              fontSize: '12px',
              color: '#6B7280',
              textAlign: 'right',
            }}>
              {feature.brief.length} / 150
            </div>
          </div>

          {/* Description */}
          <div>
            <label style={{
              display: 'block',
              marginBottom: '6px',
              fontWeight: 500,
              color: '#1A1A2E',
              fontSize: '14px',
            }}>
              Description
            </label>
            <RichTextEditor
              value={feature.description}
              onChange={(html) => onUpdate(feature.id, 'description', html)}
              placeholder="Enter detailed feature description..."
            />
          </div>
        </div>
      )}

      {isCollapsed && feature.title && (
        <div style={{
          marginTop: '8px',
          fontSize: '14px',
          color: '#6B7280',
          fontStyle: 'italic',
        }}>
          {feature.title}
        </div>
      )}
    </div>
  );
};

const FeaturesSection: React.FC<FeaturesSectionProps> = ({ projectId }) => {
  const navigate = useNavigate();
  const [content, setContent] = useState<FeaturesContent>({
    items: [
      {
        id: crypto.randomUUID(),
        title: '',
        brief: '',
        description: '',
      },
    ],
  });
  const [loading, setLoading] = useState(true);
  const { save, status } = useAutoSave(projectId, 'features', 800);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    const loadSection = async () => {
      try {
        const data = await getSection(projectId, 'features');
        if (data.content && data.content.items && data.content.items.length > 0) {
          setContent(data.content as FeaturesContent);
        }
      } catch (error) {
        console.error('Error loading features:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSection();
  }, [projectId]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = content.items.findIndex((item) => item.id === active.id);
      const newIndex = content.items.findIndex((item) => item.id === over.id);

      const reordered = arrayMove(content.items, oldIndex, newIndex);
      const updated = { items: reordered };
      setContent(updated);
      save(updated);
    }
  };

  const handleUpdateFeature = (id: string, field: keyof FeatureItem, value: string) => {
    const updatedItems = content.items.map((item) =>
      item.id === id ? { ...item, [field]: value } : item
    );
    const updated = { items: updatedItems };
    setContent(updated);
    save(updated);
  };

  const handleAddFeature = () => {
    const newFeature: FeatureItem = {
      id: crypto.randomUUID(),
      title: '',
      brief: '',
      description: '',
    };
    const updated = { items: [...content.items, newFeature] };
    setContent(updated);
    save(updated);
  };

  const handleRemoveFeature = (id: string) => {
    if (content.items.length <= 1) return; // Keep at least one feature
    
    const updatedItems = content.items.filter((item) => item.id !== id);
    const updated = { items: updatedItems };
    setContent(updated);
    save(updated);
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
        sectionKey="features"
        title="Features"
        showDeleteButton={true}
        onDelete={handleDelete}
        status={status}
      />

      <div style={{
        marginBottom: '16px',
        padding: '12px',
        backgroundColor: '#F5F7FA',
        borderRadius: '6px',
        fontSize: '14px',
        color: '#1A1A2E',
      }}>
        <strong>Tip:</strong> Drag the ⠿ icon to reorder features. Features will be numbered automatically based on their position.
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={content.items.map((item) => item.id)}
          strategy={verticalListSortingStrategy}
        >
          {content.items.map((feature, index) => (
            <SortableFeatureCard
              key={feature.id}
              feature={feature}
              index={index}
              onUpdate={handleUpdateFeature}
              onRemove={handleRemoveFeature}
              canRemove={content.items.length > 1}
            />
          ))}
        </SortableContext>
      </DndContext>

      <button
        type="button"
        onClick={handleAddFeature}
        style={{
          marginTop: '16px',
          padding: '10px 20px',
          border: '1px solid #E60012',
          borderRadius: '4px',
          backgroundColor: '#FFFFFF',
          color: '#E60012',
          cursor: 'pointer',
          fontWeight: 500,
          fontSize: '14px',
        }}
      >
        + Add Feature
      </button>
    </div>
  );
};

export default FeaturesSection;
