import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange }) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline, // CRITICAL: StarterKit does NOT include underline
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  React.useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className="rich-text-editor">
      <div className="toolbar" style={{
        display: 'flex',
        gap: '4px',
        padding: '8px',
        borderBottom: '1px solid #E5E7EB',
        backgroundColor: '#F9FAFB',
      }}>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            editor.chain().focus().toggleBold().run();
          }}
          className={editor.isActive('bold') ? 'active' : ''}
          style={{
            padding: '4px 8px',
            border: '1px solid #E5E7EB',
            borderRadius: '4px',
            backgroundColor: editor.isActive('bold') ? '#FFF0F0' : '#FFFFFF',
            cursor: 'pointer',
            fontWeight: 'bold',
          }}
          title="Bold"
        >
          B
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            editor.chain().focus().toggleItalic().run();
          }}
          className={editor.isActive('italic') ? 'active' : ''}
          style={{
            padding: '4px 8px',
            border: '1px solid #E5E7EB',
            borderRadius: '4px',
            backgroundColor: editor.isActive('italic') ? '#FFF0F0' : '#FFFFFF',
            cursor: 'pointer',
            fontStyle: 'italic',
          }}
          title="Italic"
        >
          I
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            editor.chain().focus().toggleUnderline().run();
          }}
          className={editor.isActive('underline') ? 'active' : ''}
          style={{
            padding: '4px 8px',
            border: '1px solid #E5E7EB',
            borderRadius: '4px',
            backgroundColor: editor.isActive('underline') ? '#FFF0F0' : '#FFFFFF',
            cursor: 'pointer',
            textDecoration: 'underline',
          }}
          title="Underline"
        >
          U
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            const { state } = editor;
            const { selection } = state;
            const { $from } = selection;
            
            // Check if we're in a different type of list
            const inOrderedList = editor.isActive('orderedList');
            
            if (inOrderedList) {
              // If in ordered list, split out and create bullet list
              editor.chain()
                .focus()
                .splitListItem('listItem')
                .liftListItem('listItem')
                .toggleBulletList()
                .run();
            } else {
              // Just toggle bullet list normally
              editor.chain().focus().toggleBulletList().run();
            }
          }}
          className={editor.isActive('bulletList') ? 'active' : ''}
          style={{
            padding: '4px 8px',
            border: '1px solid #E5E7EB',
            borderRadius: '4px',
            backgroundColor: editor.isActive('bulletList') ? '#FFF0F0' : '#FFFFFF',
            cursor: 'pointer',
          }}
          title="Bullet List"
        >
          • List
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            const { state } = editor;
            const { selection } = state;
            const { $from } = selection;
            
            // Check if we're in a different type of list
            const inBulletList = editor.isActive('bulletList');
            
            if (inBulletList) {
              // If in bullet list, split out and create ordered list
              editor.chain()
                .focus()
                .splitListItem('listItem')
                .liftListItem('listItem')
                .toggleOrderedList()
                .run();
            } else {
              // Just toggle ordered list normally
              editor.chain().focus().toggleOrderedList().run();
            }
          }}
          className={editor.isActive('orderedList') ? 'active' : ''}
          style={{
            padding: '4px 8px',
            border: '1px solid #E5E7EB',
            borderRadius: '4px',
            backgroundColor: editor.isActive('orderedList') ? '#FFF0F0' : '#FFFFFF',
            cursor: 'pointer',
          }}
          title="Numbered List"
        >
          1. List
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            // Clear all content in the editor
            editor.chain().focus().clearContent().run();
          }}
          style={{
            padding: '4px 8px',
            border: '1px solid #E5E7EB',
            borderRadius: '4px',
            backgroundColor: '#FFFFFF',
            cursor: 'pointer',
          }}
          title="Clear All Content"
        >
          Clear
        </button>
      </div>
      <EditorContent
        editor={editor}
        style={{
          border: '1px solid #E5E7EB',
          borderTop: 'none',
          padding: '12px',
          minHeight: '120px',
          backgroundColor: '#FFFFFF',
        }}
      />
    </div>
  );
};

export default RichTextEditor;
