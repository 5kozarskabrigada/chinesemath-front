import React from 'react';
import { getActiveMathField } from './MathExtension';

const ToolbarButton = ({ onClick, onMouseDown, isActive, disabled, title, children, isMath }) => (
  <button
    type="button"
    onMouseDown={onMouseDown}
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={`min-w-[28px] h-7 px-2 rounded flex items-center justify-center text-sm transition-colors ${
      isActive
        ? 'bg-indigo-100 text-indigo-700'
        : disabled
        ? 'text-gray-300 cursor-not-allowed'
        : isMath
        ? 'text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 font-serif'
        : 'text-slate-700 hover:bg-slate-100'
    }`}
  >
    {children}
  </button>
);

const UnifiedToolbar = ({ editor, showMath = true }) => {
  const isDisabled = !editor || !editor.isEditable;

  // Helper for preventing focus loss on toolbar buttons
  const preventFocusLoss = (e) => {
    e.preventDefault();
  };

  const insertMath = (latex) => {
    const activeMathField = getActiveMathField();
    if (activeMathField) {
      activeMathField.cmd(latex);
      activeMathField.focus();
    } else if (editor && !isDisabled) {
      editor.chain().focus().insertContent({
        type: 'mathComponent',
        attrs: { latex }
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
              title="Insert Interactive Formula Box"
              className="px-3 py-1 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
            >
              <span className="font-serif italic">f(x)</span>
              Insert Math
            </button>

            <div className="flex items-center gap-0.5 flex-wrap">
              <ToolbarButton
                onMouseDown={preventFocusLoss}
                onClick={() => insertMath('\\frac{}{}')}
                disabled={isDisabled}
                title="Fraction"
                isMath
              >
                ½
              </ToolbarButton>
              <ToolbarButton
                onMouseDown={preventFocusLoss}
                onClick={() => insertMath('\\sqrt{}')}
                disabled={isDisabled}
                title="Square Root"
                isMath
              >
                √
              </ToolbarButton>
              <ToolbarButton
                onMouseDown={preventFocusLoss}
                onClick={() => insertMath('\\sqrt[]{}')}
                disabled={isDisabled}
                title="N-th Root"
                isMath
              >
                ∛
              </ToolbarButton>
              <ToolbarButton
                onMouseDown={preventFocusLoss}
                onClick={() => insertMath('^{}')}
                disabled={isDisabled}
                title="Superscript / Power"
                isMath
              >
                xʸ
              </ToolbarButton>
              <ToolbarButton
                onMouseDown={preventFocusLoss}
                onClick={() => insertMath('_{}')}
                disabled={isDisabled}
                title="Subscript"
                isMath
              >
                x₁
              </ToolbarButton>
              <ToolbarButton
                onMouseDown={preventFocusLoss}
                onClick={() => insertMath('\\times')}
                disabled={isDisabled}
                title="Multiply"
                isMath
              >
                ×
              </ToolbarButton>
              <ToolbarButton
                onMouseDown={preventFocusLoss}
                onClick={() => insertMath('\\div')}
                disabled={isDisabled}
                title="Divide"
                isMath
              >
                ÷
              </ToolbarButton>
              <ToolbarButton
                onMouseDown={preventFocusLoss}
                onClick={() => insertMath('\\pm')}
                disabled={isDisabled}
                title="Plus-Minus"
                isMath
              >
                ±
              </ToolbarButton>
              <ToolbarButton
                onMouseDown={preventFocusLoss}
                onClick={() => insertMath('\\le')}
                disabled={isDisabled}
                title="Less or Equal"
                isMath
              >
                ≤
              </ToolbarButton>
              <ToolbarButton
                onMouseDown={preventFocusLoss}
                onClick={() => insertMath('\\ge')}
                disabled={isDisabled}
                title="Greater or Equal"
                isMath
              >
                ≥
              </ToolbarButton>
              <ToolbarButton
                onMouseDown={preventFocusLoss}
                onClick={() => insertMath('\\ne')}
                disabled={isDisabled}
                title="Not Equal"
                isMath
              >
                ≠
              </ToolbarButton>
              <ToolbarButton
                onMouseDown={preventFocusLoss}
                onClick={() => insertMath('\\approx')}
                disabled={isDisabled}
                title="Approximately"
                isMath
              >
                ≈
              </ToolbarButton>
              <ToolbarButton
                onMouseDown={preventFocusLoss}
                onClick={() => insertMath('\\pi')}
                disabled={isDisabled}
                title="Pi"
                isMath
              >
                π
              </ToolbarButton>
              <ToolbarButton
                onMouseDown={preventFocusLoss}
                onClick={() => insertMath('\\theta')}
                disabled={isDisabled}
                title="Theta"
                isMath
              >
                θ
              </ToolbarButton>
              <ToolbarButton
                onMouseDown={preventFocusLoss}
                onClick={() => insertMath('\\infty')}
                disabled={isDisabled}
                title="Infinity"
                isMath
              >
                ∞
              </ToolbarButton>
              <ToolbarButton
                onMouseDown={preventFocusLoss}
                onClick={() => insertMath('\\angle')}
                disabled={isDisabled}
                title="Angle"
                isMath
              >
                ∠
              </ToolbarButton>
              <ToolbarButton
                onMouseDown={preventFocusLoss}
                onClick={() => insertMath('\\triangle')}
                disabled={isDisabled}
                title="Triangle"
                isMath
              >
                △
              </ToolbarButton>
              <ToolbarButton
                onMouseDown={preventFocusLoss}
                onClick={() => insertMath('\\parallel')}
                disabled={isDisabled}
                title="Parallel"
                isMath
              >
                ∥
              </ToolbarButton>
              <ToolbarButton
                onMouseDown={preventFocusLoss}
                onClick={() => insertMath('\\perp')}
                disabled={isDisabled}
                title="Perpendicular"
                isMath
              >
                ⊥
              </ToolbarButton>
              <ToolbarButton
                onMouseDown={preventFocusLoss}
                onClick={() => insertMath('\\log_{}')}
                disabled={isDisabled}
                title="Log base"
                isMath
              >
                log<sub>b</sub>
              </ToolbarButton>
              <ToolbarButton
                onMouseDown={preventFocusLoss}
                onClick={() => insertMath('\\overrightarrow{}')}
                disabled={isDisabled}
                title="Vector Arrow Over"
                isMath
              >
                <span style={{textDecoration: 'overline', fontWeight: 'bold'}}>→</span>OP
              </ToolbarButton>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default UnifiedToolbar;
