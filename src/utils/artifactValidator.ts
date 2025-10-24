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
 * Main validation function that routes to specific validators
 */
export function validateArtifact(content: string, type: string): ValidationResult {
  switch (type) {
    case 'html':
      return validateHTML(content);
    case 'code':
      return validateJavaScript(content);
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
