import katex from "katex";

/**
 * Renders a string that may contain inline/display LaTeX in either:
 * - \(...\) and \[...\] (preferred)
 * - $...$ and $$...$$ (legacy compatibility)
 * Returns HTML string safe to use with dangerouslySetInnerHTML.
 */
export function renderMath(text) {
  if (!text) return "";
  // Escape HTML first, then render math
  let result = String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Display math: \[...\] (preferred)
  result = result.replace(/\\\[([\s\S]*?)\\\]/g, (_, expr) => {
    try {
      return katex.renderToString(expr, { displayMode: true, throwOnError: false });
    } catch {
      return `<span class="text-red-400">[math error]</span>`;
    }
  });

  // Inline math: \(...\) (preferred)
  result = result.replace(/\\\(([\s\S]*?)\\\)/g, (_, expr) => {
    try {
      return katex.renderToString(expr, { displayMode: false, throwOnError: false });
    } catch {
      return `<span class="text-red-400">[math error]</span>`;
    }
  });

  // Display math: $$...$$ (legacy)
  result = result.replace(/\$\$([^$]+)\$\$/g, (_, expr) => {
    try {
      return katex.renderToString(expr, { displayMode: true, throwOnError: false });
    } catch {
      return `<span class="text-red-400">[math error]</span>`;
    }
  });

  // Inline math: $...$ (legacy)
  result = result.replace(/\$([^$\n]+)\$/g, (_, expr) => {
    try {
      return katex.renderToString(expr, { displayMode: false, throwOnError: false });
    } catch {
      return `<span class="text-red-400">[math error]</span>`;
    }
  });

  return result;
}
