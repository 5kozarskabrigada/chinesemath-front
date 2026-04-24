import React, { useEffect, useRef } from 'react';
import { addStyles, EditableMathField } from 'react-mathquill';

// Add MathQuill styles once
addStyles();

const MathInput = ({ value, onChange, onInit, className = '' }) => {
  const mathFieldRef = useRef(null);

  const handleChange = (mathField) => {
    if (onChange && mathField && mathField.latex) {
      onChange(mathField.latex());
    }
  };

  return (
    <>
      <style>{`
        .mq-editable-field {
          border: none !important;
          box-shadow: none !important;
          outline: none !important;
          width: 100%;
          font-family: serif;
          font-size: 1.125rem;
          color: #111827;
        }
        .mq-editable-field var {
            font-family: "Times New Roman", serif !important;
        }
        .mq-root-block {
          padding: 4px;
        }
        .mq-focused {
           box-shadow: none !important;
        }
      `}</style>
      <div 
        className={`math-input-wrapper bg-white border border-gray-300 rounded-md p-3 min-h-[60px] flex items-center cursor-text focus-within:ring-1 focus-within:ring-indigo-500 focus-within:border-indigo-500 ${className}`}
        onClick={(e) => {
          // Focus the math field when clicking anywhere in the wrapper
          if (mathFieldRef.current) {
            mathFieldRef.current.focus();
          }
        }}
      >
        <EditableMathField
          latex={value || ''}
          onChange={handleChange}
          mathquillDidMount={(mathField) => {
            mathFieldRef.current = mathField;
            if (onInit) {
              onInit(mathField);
            }
          }}
          config={{
            spaceBehavesLikeTab: true,
            leftRightIntoCmdGoes: 'up',
            restrictMismatchedBrackets: true,
            sumStartsWithNEquals: true,
            supSubsRequireOperand: true,
            charsThatBreakOutOfSupSub: '+=<>',
            autoSubscriptNumerals: true,
            autoCommands: 'pi theta sqrt sum int alpha beta gamma infty approx le ge ne angle triangle parallel perp',
            autoOperatorNames: 'sin cos tan log ln'
          }}
        />
      </div>
    </>
  );
};

export default MathInput;
