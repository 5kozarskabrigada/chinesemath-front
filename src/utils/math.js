import katex from "katex";

/**
 * Renders a string that may contain inline/display LaTeX in either:
 * - <math-component> tags from TipTap editor
 * - \(...\) and \[...\] (preferred)
 * - $...$ and $$...$$ (legacy compatibility)
 * Returns HTML string safe to use with dangerouslySetInnerHTML.
 */
export function renderMath(text) {
  if (!text) return "";
  
  let result = String(text);
  
  // First, handle <math-component latex="..."> tags from TipTap editor
  result = result.replace(/<math-component[^>]*latex="([^"]*)"[^>]*><\/math-component>/g, (_, latex) => {
    try {
      // Unescape HTML entities in the latex attribute
      const unescapedLatex = latex
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, '&');
      
      return katex.renderToString(unescapedLatex, { displayMode: false, throwOnError: false });
    } catch {
      return `<span class="text-red-400">[math error]</span>`;
    }
  });

  // Create a temporary div to parse HTML and process text nodes only
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = result;
  
  // Function to process text nodes for LaTeX delimiters
  const processTextNode = (node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      let text = node.textContent;
      
      // Display math: \[...\]
      text = text.replace(/\\\[([\s\S]*?)\\\]/g, (_, expr) => {
        try {
          return `<span class="math-display">${katex.renderToString(expr, { displayMode: true, throwOnError: false })}</span>`;
        } catch {
          return `<span class="text-red-400">[math error]</span>`;
        }
      });

      // Inline math: \(...\)
      text = text.replace(/\\\(([\s\S]*?)\\\)/g, (_, expr) => {
        try {
          return katex.renderToString(expr, { displayMode: false, throwOnError: false });
        } catch {
          return `<span class="text-red-400">[math error]</span>`;
        }
      });

      // Display math: $$...$$
      text = text.replace(/\$\$([^$]+)\$\$/g, (_, expr) => {
        try {
          return `<span class="math-display">${katex.renderToString(expr, { displayMode: true, throwOnError: false })}</span>`;
        } catch {
          return `<span class="text-red-400">[math error]</span>`;
        }
      });

      // Inline math: $...$
      text = text.replace(/\$([^$\n]+)\$/g, (_, expr) => {
        try {
          return katex.renderToString(expr, { displayMode: false, throwOnError: false });
        } catch {
          return `<span class="text-red-400">[math error]</span>`;
        }
      });

      if (text !== node.textContent) {
        const span = document.createElement('span');
        span.innerHTML = text;
        node.parentNode.replaceChild(span, node);
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      // Recursively process child nodes
      Array.from(node.childNodes).forEach(processTextNode);
    }
  };
  
  processTextNode(tempDiv);
  
  return tempDiv.innerHTML;
}
