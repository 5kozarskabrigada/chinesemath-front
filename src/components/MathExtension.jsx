import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import { useState, useRef, useEffect } from 'react';
import { InlineMath } from 'react-katex';
import 'katex/dist/katex.min.css';
import MathInput from './MathInput';

// Store active math field globally for toolbar integration
let globalActiveMathField = null;

export const getActiveMathField = () => globalActiveMathField;
export const setGlobalActiveMathField = (field) => {
  globalActiveMathField = field;
};

const MathComponent = ({ node, updateAttributes }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [latex, setLatex] = useState(node.attrs.latex || '');
  const mathFieldRef = useRef(null);
  const wrapperRef = useRef(null);

  const handleUpdate = (newLatex) => {
    setLatex(newLatex);
    updateAttributes({ latex: newLatex });
  };

  const handleClose = () => {
    setIsEditing(false);
    setGlobalActiveMathField(null);
  };

  useEffect(() => {
    if (!isEditing) {
      setGlobalActiveMathField(null);
    }
  }, [isEditing]);

  return (
    <NodeViewWrapper className="inline-block mx-1 align-middle" ref={wrapperRef}>
      {isEditing ? (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={(e) => {
              e.stopPropagation();
              handleClose();
            }} 
          />
          <div className="relative z-50 min-w-[300px]">
            <MathInput 
              value={latex} 
              onChange={handleUpdate}
              className="border border-indigo-500 shadow-lg !min-h-[40px] !p-1 text-[1.1rem]"
              onInit={(mf) => {
                  mathFieldRef.current = mf;
                  setGlobalActiveMathField(mf);
                  setTimeout(() => {
                      mf.focus();
                  }, 10);
              }}
            />
          </div>
        </>
      ) : (
        <span 
            className="cursor-pointer hover:bg-indigo-50 px-1 rounded transition-colors border border-transparent hover:border-indigo-200 text-[1.1rem] inline-block align-middle"
            onClick={() => setIsEditing(true)}
            title="Click to edit formula"
        >
            {latex ? <InlineMath math={latex} /> : <span className="text-gray-400 italic text-xs">[Formula]</span>}
        </span>
      )}
    </NodeViewWrapper>
  );
};

export const MathExtension = Node.create({
  name: 'mathComponent',
  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      latex: {
        default: '',
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'math-component',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['math-component', mergeAttributes(HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MathComponent);
  },
});
