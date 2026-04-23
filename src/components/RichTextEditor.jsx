import React, { useState, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Superscript from '@tiptap/extension-superscript';
import Subscript from '@tiptap/extension-subscript';
import TextAlign from '@tiptap/extension-text-align';
import 'katex/dist/katex.min.css';
import UnifiedToolbar from './UnifiedToolbar';
import { MathExtension } from './MathExtension';
import { renderMath } from '../utils/math';

const RichTextEditor = ({
  id,
  name,
  defaultValue = '',
  required = false,
  label,
  placeholder,
  enableMath = true,
  onChange
}) => {
  const [value, setValue] = useState(defaultValue);
  const [showPreview, setShowPreview] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Superscript,
      Subscript,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        alignments: ['left', 'center'],
      }),
      MathExtension,
    ],
    content: defaultValue,
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[80px] px-3 py-2 font-serif text-gray-900',
      },
    },
    onFocus: () => setIsFocused(true),
    onBlur: () => setIsFocused(false),
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      setValue(html);
      if (onChange) onChange(html);
    },
  });

  useEffect(() => {
    if (editor && defaultValue !== editor.getHTML()) {
      if (defaultValue === '') {
        editor.commands.clearContent();
      } else if (editor.isEmpty && defaultValue) {
        editor.commands.setContent(defaultValue);
      }
    }
  }, [defaultValue, editor]);

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-end">
        <label htmlFor={id} className={`block text-sm font-medium ${isFocused ? 'text-indigo-700' : 'text-gray-700'}`}>
          {label}
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              if (editor) {
                editor.commands.clearContent();
                setValue('');
                if (onChange) onChange('');
              }
            }}
            className="text-xs text-red-600 hover:text-red-800 font-medium"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
          >
            {showPreview ? 'Hide Preview' : 'Show Preview'}
          </button>
        </div>
      </div>

      <div
        className={`border rounded-md shadow-sm bg-white transition-all duration-200 
                    ${isFocused
            ? 'border-indigo-500 ring-1 ring-indigo-500'
            : 'border-gray-300 hover:border-gray-400'
          }`}
      >
        <UnifiedToolbar editor={editor} showMath={enableMath} />
        <EditorContent editor={editor} />

        {/* Hidden input to submit form data */}
        <input type="hidden" name={name} value={value} required={required} />
      </div>

      {showPreview && (
        <div className="mt-2">
          <p className="text-xs text-gray-500 mb-1 uppercase font-semibold">Preview (Student View)</p>
          <div
            className="p-4 bg-gray-50 rounded-md border border-gray-200 mt-2 font-serif text-sm min-h-[60px] prose prose-sm max-w-none text-gray-900"
            dangerouslySetInnerHTML={{ __html: renderMath(value) }}
          />
        </div>
      )}
    </div>
  );
};

export default RichTextEditor;
