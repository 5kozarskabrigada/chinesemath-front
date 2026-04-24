import React, { useEffect, useRef } from 'react';
import { addStyles, EditableMathField } from 'react-mathquill';

// Add MathQuill styles once
addStyles();

const MathInput = ({ value, onChange, onInit, className = '' }) => {
  const mathFieldRef = useRef(null);
  const isInitializedRef = useRef(false);
  const preventBlurRef = useRef(false);

  useEffect(() => {
    if (onInit && mathFieldRef.current && !isInitializedRef.current) {
      isInitializedRef.current = true;
      onInit(mathFieldRef.current);
    }
  }, [onInit]);

  useEffect(() => {
    // Add event listener to detect toolbar button clicks
    const handleMouseDown = (e) => {
      // Check if click is on a toolbar button
      if (e.target.closest('button[type="button"]')) {
        preventBlurRef.current = true;
        setTimeout(() => {
          preventBlurRef.current = false;
        }, 100);
      }
    };

    document.addEventListener('mousedown', handleMouseDown, true);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown, true);
    };
  }, []);

  const handleChange = (mathField) => {
    if (onChange) {
      onChange(mathField.latex());
    }
  };

  const handleBlur = () => {
    if (preventBlurRef.current && mathFieldRef.current) {
      // Refocus if blur was caused by toolbar button click
      requestAnimationFrame(() => {
        mathFieldRef.current.focus();
      });
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
        onMouseDown={(e) => {
          // Prevent this wrapper from stealing focus from the math field
          if (e.target === e.currentTarget) {
            e.preventDefault();
            if (mathFieldRef.current) {
              mathFieldRef.current.focus();
            }
          }
        }}
        onBlur={handleBlur}
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
            supSubsRequireOperand: false,
            charsThatBreakOutOfSupSub: '',
            autoSubscriptNumerals: true,
            autoCommands: 'pi theta sqrt sum int alpha beta gamma delta epsilon zeta eta mu nu xi rho sigma tau phi chi psi omega infty approx le ge ne angle triangle parallel perp pm times div cdot',
            autoOperatorNames: 'sin cos tan log ln sec csc cot arcsin arccos arctan sinh cosh tanh'
          }}
        />
      </div>
    </>
  );
};

export default MathInput;
