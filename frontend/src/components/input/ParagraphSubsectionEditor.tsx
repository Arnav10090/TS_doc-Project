import React, { useEffect, useCallback, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { ParagraphData, ParagraphItem, getParagraphItems } from '../../types/customSections';

interface ParagraphSubsectionEditorProps {
  data: ParagraphData;
  onChange: (data: ParagraphData) => void;
}

interface ParagraphEditorItemProps {
  index: number;
  paragraph: ParagraphItem;
  canRemove: boolean;
  onChange: (html: string) => void;
  onRemove: () => void;
}

const ParagraphEditorItem: React.FC<ParagraphEditorItemProps> = ({
  index,
  paragraph,
  canRemove,
  onChange,
  onRemove,
}) => {
  const debounceTimerRef = useRef<number | null>(null);

  const debouncedOnChange = useCallback(
    (html: string) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = window.setTimeout(() => {
        onChange(html);
      }, 500);
    },
    [onChange]
  );

  const editor = useEditor({
    extensions: [StarterKit, Underline],
    content: paragraph.html || '',
    onUpdate: ({ editor }) => {
      debouncedOnChange(editor.getHTML());
    },
  });

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (editor && paragraph.html !== editor.getHTML()) {
      editor.commands.setContent(paragraph.html || '');
    }
  }, [paragraph.html, editor]);

  if (!editor) {
    return null;
  }

  const containerStyle: React.CSSProperties = {
    padding: '16px',
    backgroundColor: '#F9FAFB',
    borderRadius: '6px',
  };

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: '14px',
    fontWeight: 600,
    color: '#1A1A2E',
    marginBottom: '12px',
  };

  const toolbarStyle: React.CSSProperties = {
    display: 'flex',
    gap: '4px',
    padding: '8px',
    borderBottom: '1px solid #E5E7EB',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: '4px',
    borderTopRightRadius: '4px',
  };

  const buttonStyle: React.CSSProperties = {
    padding: '6px 10px',
    border: '1px solid #E5E7EB',
    borderRadius: '4px',
    backgroundColor: '#FFFFFF',
    cursor: 'pointer',
    fontSize: '13px',
    fontFamily: 'inherit',
    transition: 'background-color 0.2s ease',
  };

  const activeButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: '#FFF0F0',
    borderColor: '#E60012',
    color: '#E60012',
  };

  const editorContentStyle: React.CSSProperties = {
    border: '1px solid #E5E7EB',
    borderTop: 'none',
    padding: '12px',
    minHeight: '150px',
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: '4px',
    borderBottomRightRadius: '4px',
  };

  return (
    <div
      style={{
        ...containerStyle,
        backgroundColor: '#FFFFFF',
        border: '1px solid #E5E7EB',
      }}
    >
      <div
        style={{
          ...sectionTitleStyle,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span>Paragraph {index + 1}</span>
        <button
          type="button"
          onClick={onRemove}
          disabled={!canRemove}
          style={{
            padding: '6px 10px',
            border: '1px solid #D1D5DB',
            borderRadius: '4px',
            backgroundColor: '#FFFFFF',
            cursor: canRemove ? 'pointer' : 'not-allowed',
            fontSize: '12px',
            fontFamily: 'inherit',
            color: '#1A1A2E',
            opacity: canRemove ? 1 : 0.6,
          }}
        >
          Remove Paragraph
        </button>
      </div>

      <div>
        <div style={toolbarStyle}>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              editor.chain().focus().toggleBold().run();
            }}
            style={editor.isActive('bold') ? activeButtonStyle : buttonStyle}
            title="Bold"
          >
            <strong>B</strong>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              editor.chain().focus().toggleItalic().run();
            }}
            style={editor.isActive('italic') ? activeButtonStyle : buttonStyle}
            title="Italic"
          >
            <em>I</em>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              editor.chain().focus().toggleUnderline().run();
            }}
            style={editor.isActive('underline') ? activeButtonStyle : buttonStyle}
            title="Underline"
          >
            <u>U</u>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              editor.chain().focus().toggleBulletList().run();
            }}
            style={editor.isActive('bulletList') ? activeButtonStyle : buttonStyle}
            title="Bullet List"
          >
            • List
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              editor.chain().focus().toggleOrderedList().run();
            }}
            style={editor.isActive('orderedList') ? activeButtonStyle : buttonStyle}
            title="Numbered List"
          >
            1. List
          </button>
        </div>
        <div style={editorContentStyle}>
          <EditorContent editor={editor} />
        </div>
      </div>

      <div
        style={{
          marginTop: '8px',
          fontSize: '12px',
          color: '#6B7280',
          fontStyle: 'italic',
        }}
      >
        Click SAVE to update the document preview.
      </div>
    </div>
  );
};

const ParagraphSubsectionEditor: React.FC<ParagraphSubsectionEditorProps> = ({
  data,
  onChange,
}) => {
  const paragraphs = getParagraphItems(data);
  const normalizedParagraphs = paragraphs.length > 0 ? paragraphs : [{ html: '' }];

  const updateParagraphs = (nextParagraphs: ParagraphItem[]) => {
    onChange({ paragraphs: nextParagraphs });
  };

  const handleParagraphChange = (index: number, html: string) => {
    updateParagraphs(
      normalizedParagraphs.map((paragraph, paragraphIndex) =>
        paragraphIndex === index ? { html } : paragraph,
      ),
    );
  };

  const handleAddParagraph = () => {
    updateParagraphs([...normalizedParagraphs, { html: '' }]);
  };

  const handleRemoveParagraph = (index: number) => {
    if (normalizedParagraphs.length <= 1) {
      return;
    }

    updateParagraphs(normalizedParagraphs.filter((_, paragraphIndex) => paragraphIndex !== index));
  };

  return (
    <div
      style={{
        padding: '16px',
        backgroundColor: '#F9FAFB',
        borderRadius: '6px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}
    >
      <div style={{ fontSize: '14px', fontWeight: 600, color: '#1A1A2E' }}>
        Rich Text Editor
      </div>
      {normalizedParagraphs.map((paragraph, index) => (
        <ParagraphEditorItem
          key={index}
          index={index}
          paragraph={paragraph}
          canRemove={normalizedParagraphs.length > 1}
          onChange={(html) => handleParagraphChange(index, html)}
          onRemove={() => handleRemoveParagraph(index)}
        />
      ))}
      <button
        type="button"
        onClick={handleAddParagraph}
        style={{
          alignSelf: 'flex-start',
          padding: '8px 12px',
          backgroundColor: '#E60012',
          color: '#FFFFFF',
          border: 'none',
          borderRadius: '4px',
          fontSize: '13px',
          fontWeight: 500,
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        + Add New Paragraph
      </button>
    </div>
  );
};

export default ParagraphSubsectionEditor;
