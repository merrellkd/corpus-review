import React, { useCallback, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';

interface TipTapEditorProps {
  content: object;
  onChange: (content: object) => void;
  onSave?: () => void;
  placeholder?: string;
  editable?: boolean;
  className?: string;
  showWordCount?: boolean;
  autoSave?: boolean;
  autoSaveDelay?: number; // milliseconds
}

export const TipTapEditor: React.FC<TipTapEditorProps> = ({
  content,
  onChange,
  onSave,
  placeholder = 'Start writing...',
  editable = true,
  className = '',
  showWordCount = true,
  autoSave = true,
  autoSaveDelay = 2000
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder
      }),
      CharacterCount
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      const json = editor.getJSON();
      onChange(json);
    }
  });

  // Auto-save functionality
  useEffect(() => {
    if (!autoSave || !onSave || !editor) return;

    const timeoutId = setTimeout(() => {
      const currentContent = editor.getJSON();
      // Only save if content has actually changed
      if (JSON.stringify(currentContent) !== JSON.stringify(content)) {
        onSave();
      }
    }, autoSaveDelay);

    return () => clearTimeout(timeoutId);
  }, [content, autoSave, autoSaveDelay, onSave, editor]);

  // Update editor content when prop changes
  useEffect(() => {
    if (editor && content && JSON.stringify(editor.getJSON()) !== JSON.stringify(content)) {
      editor.commands.setContent(content);
    }
  }, [editor, content]);

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!editor) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+S or Cmd+S for manual save
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        if (onSave) {
          onSave();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [editor, onSave]);

  const handleManualSave = useCallback(() => {
    if (onSave) {
      onSave();
    }
  }, [onSave]);

  if (!editor) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-400">
        <span>Loading editor...</span>
      </div>
    );
  }

  return (
    <div className={`tiptap-editor ${className}`}>
      {/* Toolbar */}
      {editable && (
        <div className="border-b border-gray-200 p-2 bg-gray-50 flex items-center justify-between">
          <div className="flex items-center space-x-1">
            {/* Bold */}
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={`px-2 py-1 rounded text-sm font-medium ${
                editor.isActive('bold')
                  ? 'bg-blue-100 text-blue-700'
                  : 'hover:bg-gray-200 text-gray-700'
              }`}
              title="Bold (Ctrl+B)"
            >
              B
            </button>

            {/* Italic */}
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={`px-2 py-1 rounded text-sm italic ${
                editor.isActive('italic')
                  ? 'bg-blue-100 text-blue-700'
                  : 'hover:bg-gray-200 text-gray-700'
              }`}
              title="Italic (Ctrl+I)"
            >
              I
            </button>

            {/* Heading 1 */}
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              className={`px-2 py-1 rounded text-sm font-bold ${
                editor.isActive('heading', { level: 1 })
                  ? 'bg-blue-100 text-blue-700'
                  : 'hover:bg-gray-200 text-gray-700'
              }`}
              title="Heading 1"
            >
              H1
            </button>

            {/* Heading 2 */}
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              className={`px-2 py-1 rounded text-sm font-bold ${
                editor.isActive('heading', { level: 2 })
                  ? 'bg-blue-100 text-blue-700'
                  : 'hover:bg-gray-200 text-gray-700'
              }`}
              title="Heading 2"
            >
              H2
            </button>

            {/* Bullet List */}
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={`px-2 py-1 rounded text-sm ${
                editor.isActive('bulletList')
                  ? 'bg-blue-100 text-blue-700'
                  : 'hover:bg-gray-200 text-gray-700'
              }`}
              title="Bullet List"
            >
              •
            </button>

            {/* Numbered List */}
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className={`px-2 py-1 rounded text-sm ${
                editor.isActive('orderedList')
                  ? 'bg-blue-100 text-blue-700'
                  : 'hover:bg-gray-200 text-gray-700'
              }`}
              title="Numbered List"
            >
              1.
            </button>

            {/* Quote */}
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              className={`px-2 py-1 rounded text-sm ${
                editor.isActive('blockquote')
                  ? 'bg-blue-100 text-blue-700'
                  : 'hover:bg-gray-200 text-gray-700'
              }`}
              title="Quote"
            >
              "
            </button>

            <div className="border-l border-gray-300 h-6 mx-2" />

            {/* Manual Save Button */}
            {onSave && (
              <button
                type="button"
                onClick={handleManualSave}
                className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                title="Save (Ctrl+S)"
              >
                Save
              </button>
            )}
          </div>

          {/* Word Count */}
          {showWordCount && (
            <div className="text-xs text-gray-500">
              {editor.storage.characterCount.words()} words, {editor.storage.characterCount.characters()} characters
            </div>
          )}
        </div>
      )}

      {/* Editor Content */}
      <div className="min-h-[400px] p-4">
        <EditorContent
          editor={editor}
          className={`prose prose-sm max-w-none ${
            editable ? 'focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-opacity-50' : ''
          }`}
        />
      </div>
    </div>
  );
};