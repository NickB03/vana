/**
 * Security Pattern Validation
 * Tightened regex patterns with word boundaries to prevent false positives
 * while maintaining strong security detection
 */

export interface SecurityPattern {
  name: string;
  pattern: RegExp;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

// Core security patterns with improved accuracy
export const SECURITY_PATTERNS: Record<string, RegExp> = {
  // SQL Injection - more context-aware pattern to reduce false positives
  sqlInjection: /\b(union\s+(all\s+)?select|select\s+[\w\*,\s]+\s+from\s+\w+|insert\s+into\s+\w+|update\s+\w+\s+set\s+\w+\s*=|delete\s+from\s+\w+|drop\s+(table|database|schema)\s+\w+|alter\s+(table|database)\s+\w+|exec(ute)?\s*\()\b/i,
  
  // XSS - improved detection with better patterns
  xss: /(<\s*script\b[^>]*>|javascript\s*:|data\s*:\s*text\/html|on[a-z]+\s*=|<\s*iframe\b|<\s*object\b|<\s*embed\b|<\s*link\b[^>]*href\s*=\s*[\"']javascript:)/i,
  
  // Path Traversal - directory traversal attempts
  pathTraversal: /(^|[\/\\])\.\.([\/\\]|$)|%2e%2e|%252e%252e|0x2e0x2e/i,
  
  // Command Injection - require command context to reduce false positives
  commandInjection: /(\s|^|;|&&|\|\|)(rm\s+-rf|eval\s+|exec\s+|sh\s+-c|bash\s+-c|cmd\s+\/c|powershell\s+-Command)[\s"']|`[^`]*\$[^`]*`|\$\([^)]*[;&|]\s*[^)]*\)/i,
  // Suspicious Headers - potential header injection
  suspiciousHeaders: /(\r\n|\n|\r|%0d|%0a|%00|<|>|"|'|\\x3c|\\x3e)/i,
  
  // LDAP Injection
  ldapInjection: /(\*|\(|\)|\\|\||&|!|=|<|>|~|;)/,
  
  // NoSQL Injection - MongoDB and similar
  nosqlInjection: /(\$ne|\$gt|\$lt|\$gte|\$lte|\$in|\$nin|\$regex|\$where|\$exists)/i,
  
  // Server-Side Template Injection
  templateInjection: /(\{\{.*\}\}|\{%.*%\}|\$\{.*\}|<%.*%>)/,
  
  // File Upload - dangerous file types
  dangerousFileTypes: /\.(exe|bat|cmd|com|pif|scr|vbs|js|jar|php|asp|aspx|jsp|war)$/i,
  
  // URL Validation - suspicious URLs
  suspiciousUrls: /(javascript:|data:|vbscript:|file:|ftp:\/\/|\\\\)/i,
  
  // Email Header Injection
  emailInjection: /(\r\n|\n|\r|%0d|%0a|bcc:|cc:|to:|from:|subject:)/i
};

// Detailed security patterns with metadata
export const DETAILED_SECURITY_PATTERNS: SecurityPattern[] = [
  {
    name: 'SQL Injection',
    pattern: SECURITY_PATTERNS['sqlInjection']!,
    description: 'Detects SQL injection attempts including UNION, SELECT, INSERT, UPDATE, DELETE, DROP statements',
    severity: 'critical'
  },
  {
    name: 'Cross-Site Scripting (XSS)',
    pattern: SECURITY_PATTERNS['xss']!,
    description: 'Detects XSS attempts including script tags, javascript URLs, and event handlers',
    severity: 'critical'
  },
  {
    name: 'Path Traversal',
    pattern: SECURITY_PATTERNS['pathTraversal']!,
    description: 'Detects directory traversal attempts using ../ or encoded variations',
    severity: 'high'
  },
  {
    name: 'Command Injection',
    pattern: SECURITY_PATTERNS['commandInjection']!,
    description: 'Detects shell command injection attempts using pipes, semicolons, and command substitution',
    severity: 'critical'
  },
  {
    name: 'Header Injection',
    pattern: SECURITY_PATTERNS['suspiciousHeaders']!,
    description: 'Detects HTTP header injection attempts using CRLF characters',
    severity: 'high'
  },
  {
    name: 'LDAP Injection',
    pattern: SECURITY_PATTERNS['ldapInjection']!,
    description: 'Detects LDAP injection attempts using special LDAP characters',
    severity: 'high'
  },
  {
    name: 'NoSQL Injection',
    pattern: SECURITY_PATTERNS['nosqlInjection']!,
    description: 'Detects NoSQL injection attempts using MongoDB operators',
    severity: 'high'
  },
  {
    name: 'Template Injection',
    pattern: SECURITY_PATTERNS['templateInjection']!,
    description: 'Detects server-side template injection attempts',
    severity: 'high'
  },
  {
    name: 'Dangerous File Upload',
    pattern: SECURITY_PATTERNS['dangerousFileTypes']!,
    description: 'Detects uploads of potentially dangerous file types',
    severity: 'medium'
  },
  {
    name: 'Suspicious URLs',
    pattern: SECURITY_PATTERNS['suspiciousUrls']!,
    description: 'Detects suspicious URL schemes that could be used for attacks',
    severity: 'medium'
  },
  {
    name: 'Email Injection',
    pattern: SECURITY_PATTERNS['emailInjection']!,
    description: 'Detects email header injection attempts',
    severity: 'high'
  }
];

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  violations: SecurityViolation[];
  severity: 'low' | 'medium' | 'high' | 'critical' | null;
}

export interface SecurityViolation {
  pattern: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  match: string;
  position?: number;
}

/**
 * Validate input against security patterns
 */
export function validateInput(
  input: string, 
  patterns: Record<string, RegExp> = SECURITY_PATTERNS,
  options: {
    stopOnFirst?: boolean;
    maxViolations?: number;
    includePosition?: boolean;
  } = {}
): ValidationResult {
  const violations: SecurityViolation[] = [];
  const { stopOnFirst = false, maxViolations = 10, includePosition = false } = options;
  
  if (!input || typeof input !== 'string') {
    return {
      isValid: true,
      violations: [],
      severity: null
    };
  }
  
  for (const [patternName, pattern] of Object.entries(patterns)) {
    const match = pattern.exec(input);
    if (match) {
      const detailedPattern = DETAILED_SECURITY_PATTERNS.find(p => p.name.toLowerCase().includes(patternName.toLowerCase()));
      
      const violation: SecurityViolation = {
        pattern: patternName,
        description: detailedPattern?.description || `Detected ${patternName} pattern`,
        severity: detailedPattern?.severity || 'medium',
        match: match[0],
        ...(includePosition && { position: match.index })
      };
      
      violations.push(violation);
      
      if (stopOnFirst || violations.length >= maxViolations) {
        break;
      }
    }
  }
  
  // Determine overall severity
  const severity = violations.length > 0 ? 
    violations.reduce((max, v) => {
      const severityOrder = { low: 1, medium: 2, high: 3, critical: 4 };
      return severityOrder[v.severity] > severityOrder[max] ? v.severity : max;
    }, 'low' as SecurityViolation['severity']) : 
    null;
  
  return {
    isValid: violations.length === 0,
    violations,
    severity
  };
}

/**
 * Fast validation for critical patterns only
 */
export function validateInputFast(input: string): boolean {
  const criticalPatterns = DETAILED_SECURITY_PATTERNS
    .filter(p => p.severity === 'critical')
    .reduce((acc, p) => {
      const key = p.name.replace(/[^a-zA-Z]/g, '').toLowerCase();
      acc[key] = p.pattern;
      return acc;
    }, {} as Record<string, RegExp>);
  
  return validateInput(input, criticalPatterns, { stopOnFirst: true }).isValid;
}

/**
 * Sanitize input by removing detected patterns
 */
export function sanitizeInput(
  input: string, 
  patterns: Record<string, RegExp> = SECURITY_PATTERNS,
  replacement: string = ''
): string {
  if (!input || typeof input !== 'string') {
    return '';
  }
  
  let sanitized = input;
  for (const pattern of Object.values(patterns)) {
    sanitized = sanitized.replace(pattern, replacement);
  }
  
  return sanitized;
}

/**
 * Get security assessment for input
 */
export function getSecurityAssessment(input: string): {
  riskLevel: 'safe' | 'low' | 'medium' | 'high' | 'critical';
  score: number; // 0-100, higher is more dangerous
  recommendations: string[];
} {
  const result = validateInput(input, SECURITY_PATTERNS, { includePosition: true });
  
  if (result.isValid) {
    return {
      riskLevel: 'safe',
      score: 0,
      recommendations: []
    };
  }
  
  // Calculate risk score
  const severityScores = { low: 10, medium: 25, high: 50, critical: 100 };
  const maxScore = Math.max(...result.violations.map(v => severityScores[v.severity]));
  const averageScore = result.violations.reduce((sum, v) => sum + severityScores[v.severity], 0) / result.violations.length;
  const score = Math.min(100, Math.round((maxScore + averageScore) / 2));
  
  // Determine risk level
  let riskLevel: 'safe' | 'low' | 'medium' | 'high' | 'critical';
  if (score >= 80) riskLevel = 'critical';
  else if (score >= 60) riskLevel = 'high';
  else if (score >= 40) riskLevel = 'medium';
  else if (score >= 20) riskLevel = 'low';
  else riskLevel = 'safe';
  
  // Generate recommendations
  const recommendations: string[] = [];
  const violationTypes = new Set(result.violations.map(v => v.pattern));
  
  if (violationTypes.has('sqlInjection')) {
    recommendations.push('Use parameterized queries or ORM to prevent SQL injection');
  }
  if (violationTypes.has('xss')) {
    recommendations.push('Sanitize and encode user input before displaying');
  }
  if (violationTypes.has('pathTraversal')) {
    recommendations.push('Validate and sanitize file paths, use whitelist approach');
  }
  if (violationTypes.has('commandInjection')) {
    recommendations.push('Avoid executing user input as commands, use safe APIs');
  }
  
  return {
    riskLevel,
    score,
    recommendations
  };
}

/**
 * Context-aware validation for different input types
 */
export function validateByContext(
  input: string,
  context: 'url' | 'email' | 'filename' | 'sql' | 'html' | 'json' | 'general'
): ValidationResult {
  const contextPatterns: Record<string, Record<string, RegExp>> = {
    url: {
      suspiciousUrls: SECURITY_PATTERNS['suspiciousUrls']!,
      xss: SECURITY_PATTERNS['xss']!
    },
    email: {
      emailInjection: SECURITY_PATTERNS['emailInjection']!,
      xss: SECURITY_PATTERNS['xss']!
    },
    filename: {
      pathTraversal: SECURITY_PATTERNS['pathTraversal']!,
      dangerousFileTypes: SECURITY_PATTERNS['dangerousFileTypes']!
    },
    sql: {
      sqlInjection: SECURITY_PATTERNS['sqlInjection']!,
      nosqlInjection: SECURITY_PATTERNS['nosqlInjection']!
    },
    html: {
      xss: SECURITY_PATTERNS['xss']!,
      templateInjection: SECURITY_PATTERNS['templateInjection']!
    },
    json: {
      nosqlInjection: SECURITY_PATTERNS['nosqlInjection']!,
      templateInjection: SECURITY_PATTERNS['templateInjection']!
    },
    general: SECURITY_PATTERNS
  };
  
  return validateInput(input, contextPatterns[context]);
}

/**
 * Batch validation for multiple inputs
 */
export function validateBatch(
  inputs: Array<{ value: string; context?: string; id?: string }>
): Array<ValidationResult & { id?: string }> {
  return inputs.map(({ value, context = 'general', id }) => ({
    ...validateByContext(value, context as ('url' | 'email' | 'filename' | 'sql' | 'html' | 'json' | 'general')),
    id
  }));
}

// Export commonly used validation functions
export {
  SECURITY_PATTERNS as patterns,
  validateInput as validate,
  validateInputFast as fastValidate,
  sanitizeInput as sanitize,
  getSecurityAssessment as assess,
  validateByContext as contextValidate
};