import React from 'react';
import { getActiveMathField } from './MathExtension';

const ToolbarButton = ({ onClick, isActive, disabled, title, children }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={title}
    onMouseDown={(e) => e.preventDefault()}
    className={`min-w-[28px] h-7 px-2 rounded flex items-center justify-center text-sm transition-colors ${
      isActive
        ? 'bg-indigo-100 text-indigo-700'
        : disabled
        ? 'text-gray-300 cursor-not-allowed'
        : 'text-slate-700 hover:bg-slate-100'
    }`}
  >
    {children}
  </button>
);

const mathSymbols = [
  { label: '×', cmd: '\\times' },
  { label: '÷', cmd: '\\div' },
  { label: '±', cmd: '\\pm' },
  { label: '≤', cmd: '\\le' },
  { label: '≥', cmd: '\\ge' },
  { label: '≠', cmd: '\\ne' },
  { label: '≈', cmd: '\\approx' },
  { label: 'π', cmd: '\\pi' },
  { label: '∞', cmd: '\\infty' },
  { label: '√', cmd: '\\sqrt' },
  { label: 'x²', cmd: '^2' },
  { label: 'xⁿ', cmd: '^' },
  { label: 'x₁', cmd: '_' },
  { label: '½', cmd: '\\frac' },
  { label: '∑', cmd: '\\sum' },
  { label: '∫', cmd: '\\int' },
  { label: '°', cmd: '\\degree' },
  { label: '∠', cmd: '\\angle' },
  { label: '△', cmd: '\\triangle' },
  { label: '∥', cmd: '\\parallel' },
  { label: '⊥', cmd: '\\perp' },
];

const UnifiedToolbar = ({ editor, showMath = true }) => {
  const isDisabled = !editor || !editor.isEditable;

  const insertMath = (cmd) => {
    const activeMathField = getActiveMathField();
    if (activeMathField) {
      activeMathField.cmd(cmd);
      activeMathField.focus();
    } else if (editor && !isDisabled) {
      editor.chain().focus().insertContent({
        type: 'mathComponent',
        attrs: { latex: cmd.replace(/^\\/,'') }
      }).run();
    }
  };

  const insertMathNode = () => {
    if (editor && !isDisabled) {
      editor.chain().focus().insertContent({
        type: 'mathComponent',
        attrs: { latex: '' }
      }).run();
    }
  };

  return (
    <div className="w-full bg-white border-b border-gray-200">
      <div className="flex flex-wrap items-center gap-1 p-2">
        {/* Text Formatting */}
        <div className="flex items-center gap-0.5 border-r border-gray-200 pr-2 mr-1">
          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleBold().run()}
            isActive={editor?.isActive('bold')}
            disabled={isDisabled}
            title="Bold"
          >
            <span className="font-bold">B</span>
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            isActive={editor?.isActive('italic')}
            disabled={isDisabled}
            title="Italic"
          >
            <span className="italic">I</span>
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleUnderline().run()}
            isActive={editor?.isActive('underline')}
            disabled={isDisabled}
            title="Underline"
          >
            <span className="underline">U</span>
          </ToolbarButton>
        </div>

        {/* Text Alignment */}
        <div className="flex items-center gap-0.5 border-r border-gray-200 pr-2 mr-1">
          <ToolbarButton
            onClick={() => editor?.chain().focus().setTextAlign('left').run()}
            isActive={editor?.isActive({ textAlign: 'left' })}
            disabled={isDisabled}
            title="Align Left"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h18M3 8h12M3 12h18M3 16h12M3 20h18" />
            </svg>
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor?.chain().focus().setTextAlign('center').run()}
            isActive={editor?.isActive({ textAlign: 'center' })}
            disabled={isDisabled}
            title="Align Center"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h18M7 8h10M3 12h18M7 16h10M3 20h18" />
            </svg>
          </ToolbarButton>
        </div>

        {/* Math Entry */}
        {showMath && (
          <>
            <button
              type="button"
              onClick={insertMathNode}
              disabled={isDisabled}
              onMouseDown={(e) => e.preventDefault()}
              className="px-3 py-1 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
            >
              <span className="font-serif italic">f(x)</span>
              Insert Math
            </button>

            <div className="flex items-center gap-0.5 flex-wrap">
              {mathSymbols.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => insertMath(item.cmd)}
                  disabled={isDisabled}
                  onMouseDown={(e) => e.preventDefault()}
                  className="min-w-[26px] h-7 px-1 rounded flex items-center justify-center text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 border border-transparent hover:border-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  title={item.cmd}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default UnifiedToolbar;
