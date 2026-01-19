/**
 * Minimal artifact validation utilities.
 *
 * This is a simplified version that provides basic validation for artifacts.
 * Complex validation is handled by Sandpack's built-in error handling.
 */

import type { ArtifactType } from "@/components/ArtifactContainer";

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates artifact content based on type.
 * Returns basic validation - detailed errors come from Sandpack at runtime.
 */
export function validateArtifact(content: string, type: ArtifactType): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Basic empty content check
  if (!content || content.trim().length === 0) {
    errors.push("Artifact content is empty");
    return { isValid: false, errors, warnings };
  }

  // Type-specific basic validation
  switch (type) {
    case "react": {
      // Check for basic export
      if (!content.includes("export default") && !content.includes("export {")) {
        warnings.push("No default export found - component may not render correctly");
      }
      break;
    }
    case "html": {
      // Basic HTML check
      if (!content.includes("<") || !content.includes(">")) {
        warnings.push("Content doesn't appear to contain HTML tags");
      }
      break;
    }
    case "svg": {
      if (!content.includes("<svg")) {
        errors.push("SVG content must include an <svg> element");
      }
      break;
    }
    case "mermaid": {
      // Mermaid diagrams need specific syntax
      const mermaidTypes = ["graph", "flowchart", "sequenceDiagram", "classDiagram", "stateDiagram", "erDiagram", "journey", "gantt", "pie", "mindmap", "timeline"];
      const hasValidType = mermaidTypes.some(t => content.includes(t));
      if (!hasValidType) {
        warnings.push("Mermaid diagram type not detected");
      }
      break;
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Categorizes an error message for better UX display.
 */
export function categorizeError(errorMessage: string): {
  category: 'syntax' | 'runtime' | 'import' | 'unknown';
  suggestion?: string;
} {
  const lowerError = errorMessage.toLowerCase();

  // Import/module errors
  if (lowerError.includes("cannot find module") ||
      lowerError.includes("module not found") ||
      lowerError.includes("failed to resolve") ||
      lowerError.includes("import")) {
    return {
      category: "import",
      suggestion: "Check that all imports use valid npm packages or relative paths.",
    };
  }

  // Syntax errors
  if (lowerError.includes("syntax") ||
      lowerError.includes("unexpected token") ||
      lowerError.includes("parsing error") ||
      lowerError.includes("unterminated")) {
    return {
      category: "syntax",
      suggestion: "Check for missing brackets, quotes, or syntax errors.",
    };
  }

  // Runtime errors
  if (lowerError.includes("undefined") ||
      lowerError.includes("null") ||
      lowerError.includes("typeerror") ||
      lowerError.includes("referenceerror")) {
    return {
      category: "runtime",
      suggestion: "Check that all variables and functions are properly defined.",
    };
  }

  return {
    category: "unknown",
    suggestion: "An unexpected error occurred. Try refreshing or modifying the code.",
  };
}
