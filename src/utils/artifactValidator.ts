// Phase 4: Artifact Quality Validation

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  type: 'syntax' | 'structure' | 'security';
  message: string;
  severity: 'critical' | 'high';
}

export interface ValidationWarning {
  type: 'best-practice' | 'accessibility' | 'performance' | 'security';
  message: string;
  suggestion?: string;
}

/**
 * Validates HTML artifact structure and syntax
 */
export function validateHTML(content: string): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Check for basic HTML structure
  if (!content.trim()) {
    errors.push({
      type: 'structure',
      message: 'Artifact content is empty',
      severity: 'critical'
    });
    return { isValid: false, errors, warnings };
  }

  // Check for unclosed tags
  const tagPattern = /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi;
  const tags = content.match(tagPattern) || [];
  const stack: string[] = [];
  const selfClosingTags = ['img', 'br', 'hr', 'input', 'meta', 'link', 'area', 'base', 'col', 'embed', 'param', 'source', 'track', 'wbr'];

  for (const tag of tags) {
    const isClosing = tag.startsWith('</');
    const isSelfClosing = tag.endsWith('/>') || selfClosingTags.some(t => tag.toLowerCase().includes(`<${t}`));
    const tagName = tag.replace(/<\/?|>|\//g, '').split(/\s/)[0].toLowerCase();

    if (isSelfClosing) continue;

    if (isClosing) {
      if (stack.length === 0 || stack[stack.length - 1] !== tagName) {
        errors.push({
          type: 'syntax',
          message: `Unclosed or mismatched tag: ${tagName}`,
          severity: 'high'
        });
      } else {
        stack.pop();
      }
    } else {
      stack.push(tagName);
    }
  }

  if (stack.length > 0) {
    errors.push({
      type: 'syntax',
      message: `Unclosed tags: ${stack.join(', ')}`,
      severity: 'high'
    });
  }

  // Check for inline event handlers (security concern)
  const inlineEventPattern = /on\w+\s*=\s*["'][^"']*["']/gi;
  if (inlineEventPattern.test(content)) {
    warnings.push({
      type: 'security',
      message: 'Inline event handlers detected',
      suggestion: 'Consider using addEventListener or React event handlers'
    });
  }

  // Check for accessibility - alt attributes on images
  const imgWithoutAlt = /<img(?![^>]*alt=)[^>]*>/gi;
  if (imgWithoutAlt.test(content)) {
    warnings.push({
      type: 'accessibility',
      message: 'Images missing alt attributes',
      suggestion: 'Add alt text to all images for accessibility'
    });
  }

  // Check for viewport meta tag in full HTML documents
  if (content.includes('<html') && !content.includes('viewport')) {
    warnings.push({
      type: 'best-practice',
      message: 'Missing viewport meta tag',
      suggestion: 'Add <meta name="viewport" content="width=device-width, initial-scale=1.0"> for responsive design'
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validates JavaScript/React code structure
 */
export function validateJavaScript(content: string): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (!content.trim()) {
    errors.push({
      type: 'structure',
      message: 'Code content is empty',
      severity: 'critical'
    });
    return { isValid: false, errors, warnings };
  }

  // Check for balanced braces
  const braceCount = (content.match(/{/g) || []).length - (content.match(/}/g) || []).length;
  if (braceCount !== 0) {
    errors.push({
      type: 'syntax',
      message: 'Unbalanced curly braces',
      severity: 'high'
    });
  }

  // Check for balanced parentheses
  const parenCount = (content.match(/\(/g) || []).length - (content.match(/\)/g) || []).length;
  if (parenCount !== 0) {
    errors.push({
      type: 'syntax',
      message: 'Unbalanced parentheses',
      severity: 'high'
    });
  }

  // Check for eval usage (security concern)
  if (/\beval\s*\(/.test(content)) {
    warnings.push({
      type: 'security',
      message: 'Usage of eval() detected',
      suggestion: 'Avoid eval() for security reasons'
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Phase 2: Enhanced React-specific validation
 */
export function validateReact(content: string): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (!content.trim()) {
    errors.push({
      type: 'structure',
      message: 'React component content is empty',
      severity: 'critical'
    });
    return { isValid: false, errors, warnings };
  }

  // Check for React hooks without import
  const usesHooks = /\b(useState|useEffect|useContext|useReducer|useCallback|useMemo|useRef)\s*\(/.test(content);
  const hasReactImport = /import\s+.*\bReact\b.*from\s+['"]react['"]/.test(content);
  const hasHookImports = /import\s+\{[^}]*(useState|useEffect|useContext|useReducer|useCallback|useMemo|useRef)[^}]*\}\s+from\s+['"]react['"]/.test(content);
  
  if (usesHooks && !hasReactImport && !hasHookImports) {
    warnings.push({
      type: 'best-practice',
      message: 'React hooks used without importing from "react"',
      suggestion: 'Add: import { useState } from "react"'
    });
  }

  // Check for component naming convention
  const componentPattern = /(?:function|const)\s+([a-z][a-zA-Z0-9]*)\s*(?:=|[\(])/g;
  let match;
  while ((match = componentPattern.exec(content)) !== null) {
    const componentName = match[1];
    if (componentName && componentName[0] === componentName[0].toLowerCase() && content.includes(`<${componentName}`)) {
      warnings.push({
        type: 'best-practice',
        message: `Component "${componentName}" should start with uppercase letter`,
        suggestion: `Rename to "${componentName.charAt(0).toUpperCase() + componentName.slice(1)}"`
      });
    }
  }

  // Check for map without key
  if (/\.map\s*\([^)]*=>\s*</.test(content) && !/<[^>]+key=/.test(content)) {
    warnings.push({
      type: 'best-practice',
      message: 'Array.map() used without key prop on elements',
      suggestion: 'Add unique key prop to each mapped element'
    });
  }

  // Check for localStorage/sessionStorage usage
  if (/\b(localStorage|sessionStorage)\b/.test(content)) {
    errors.push({
      type: 'structure',
      message: 'Browser storage APIs (localStorage/sessionStorage) are not supported',
      severity: 'critical'
    });
    warnings.push({
      type: 'best-practice',
      message: 'Use React state (useState/useReducer) instead of browser storage',
      suggestion: 'Replace localStorage with useState hooks'
    });
  }

  // Check for unclosed JSX tags
  const jsxOpenTags = content.match(/<([A-Z][a-zA-Z0-9]*)[^/>]*>/g) || [];
  const jsxCloseTags = content.match(/<\/([A-Z][a-zA-Z0-9]*)>/g) || [];
  
  if (jsxOpenTags.length !== jsxCloseTags.length) {
    warnings.push({
      type: 'best-practice',
      message: 'Possible unclosed JSX tags detected',
      suggestion: 'Verify all JSX tags are properly closed'
    });
  }

  // Check for default export
  if (!content.includes('export default')) {
    warnings.push({
      type: 'best-practice',
      message: 'React component should have a default export',
      suggestion: 'Add: export default YourComponent'
    });
  }

  // Check for shadcn imports without proper path
  const shadcnPattern = /import\s+\{[^}]+\}\s+from\s+['"]@\/components\/ui\/([^'"]+)['"]/g;
  const shadcnComponents = ['button', 'card', 'alert', 'badge', 'input', 'label', 'dialog', 'tabs', 'accordion'];
  let shadcnMatch;
  
  while ((shadcnMatch = shadcnPattern.exec(content)) !== null) {
    const componentPath = shadcnMatch[1];
    if (!shadcnComponents.includes(componentPath)) {
      warnings.push({
        type: 'best-practice',
        message: `Importing from @/components/ui/${componentPath} - verify component exists`,
        suggestion: 'Only use available shadcn/ui components'
      });
    }
  }

  // Run standard JS validation
  const jsValidation = validateJavaScript(content);
  
  return {
    isValid: errors.length === 0 && jsValidation.isValid,
    errors: [...errors, ...jsValidation.errors],
    warnings: [...warnings, ...jsValidation.warnings]
  };
}

/**
 * Main validation function that routes to specific validators
 */
export function validateArtifact(content: string, type: string): ValidationResult {
  switch (type) {
    case 'html':
      return validateHTML(content);
    case 'code':
      return validateJavaScript(content);
    case 'react':
      return validateReact(content);
    case 'markdown':
      // Markdown is generally safe, minimal validation needed
      return {
        isValid: true,
        errors: [],
        warnings: content.trim() === '' ? [{
          type: 'best-practice',
          message: 'Markdown content is empty',
          suggestion: 'Add some content to the markdown'
        }] : []
      };
    default:
      return { isValid: true, errors: [], warnings: [] };
  }
}

/**
 * Phase 3: Categorize error messages for better UX
 */
export function categorizeError(errorMessage: string): {
  category: 'syntax' | 'runtime' | 'import' | 'unknown';
  severity: 'critical' | 'high' | 'medium';
  suggestion?: string;
} {
  const lowerMsg = errorMessage.toLowerCase();
  
  // Syntax errors
  if (lowerMsg.includes('syntaxerror') || lowerMsg.includes('unexpected token') || lowerMsg.includes('unexpected end of input')) {
    return {
      category: 'syntax',
      severity: 'critical',
      suggestion: 'Check for missing brackets, parentheses, or semicolons'
    };
  }
  
  // Import/module errors
  if (lowerMsg.includes('import') || lowerMsg.includes('module') || lowerMsg.includes('cannot find')) {
    return {
      category: 'import',
      severity: 'high',
      suggestion: 'Verify all imports are from available libraries'
    };
  }
  
  // Runtime errors
  if (lowerMsg.includes('referenceerror') || lowerMsg.includes('typeerror') || lowerMsg.includes('is not defined')) {
    return {
      category: 'runtime',
      severity: 'high',
      suggestion: 'Check variable names and ensure all dependencies are loaded'
    };
  }
  
  return {
    category: 'unknown',
    severity: 'medium',
    suggestion: 'Review the error details and check your code'
  };
}
