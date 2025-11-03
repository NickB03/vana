import { ArtifactType } from "@/components/Artifact";

/**
 * Detection result with confidence scoring
 */
export interface DetectionResult {
  shouldCreateArtifact: boolean;
  confidence: number; // 0-1 scale
  suggestedType: ArtifactType | null;
  suggestedTitle: string | null;
  reason: string;
}

/**
 * Security validation result
 */
interface SecurityCheck {
  isSafe: boolean;
  violations: string[];
}

/**
 * Pattern signals for artifact type detection
 */
interface DetectionSignals {
  lineCount: number;
  hasLanguageIdentifier: boolean;
  hasHtmlStructure: boolean;
  hasReactImports: boolean;
  hasSvgTags: boolean;
  hasMermaidBlock: boolean;
  hasJsxSyntax: boolean;
  hasComponentExport: boolean;
  hasHtmlDoctype: boolean;
  hasScriptTags: boolean;
  hasStyleTags: boolean;
}

/**
 * Constants for detection thresholds
 */
const DETECTION_CONFIG = {
  MIN_LINE_THRESHOLD: 30,
  MIN_CONFIDENCE: 0.75,
  MAX_CONTENT_SIZE: 100 * 1024, // 100KB
  MAX_TITLE_LENGTH: 100,
};

/**
 * Dangerous patterns that indicate unsafe content
 * Note: <script> tags are allowed in HTML artifacts as they're sandboxed in iframes
 * These patterns catch common XSS bypass techniques for portfolio-level security
 */
const DANGEROUS_PATTERNS = [
  // eval() - direct calls, bracket notation, and property access
  /\beval\s*\(/gi,
  /\['eval'\]\s*\(/gi,
  /\["eval"\]\s*\(/gi,
  /\[`eval`\]\s*\(/gi,
  /window\s*\.\s*eval\s*\(/gi,
  /globalThis\s*\.\s*eval\s*\(/gi,
  /this\s*\.\s*eval\s*\(/gi,

  // Function constructor - direct, bracket notation, property access
  /\bFunction\s*\(/gi,
  /\['Function'\]\s*\(/gi,
  /\["Function"\]\s*\(/gi,
  /window\s*\.\s*Function\s*\(/gi,
  /globalThis\s*\.\s*Function\s*\(/gi,
  /new\s+Function\s*\(/gi,

  // React dangerous props
  /dangerouslySetInnerHTML/gi,

  // document.write - direct and bracket notation
  /document\s*\.\s*write\s*\(/gi,
  /document\s*\[['"]write['"]\]\s*\(/gi,

  // innerHTML - direct assignment and bracket notation
  /\.innerHTML\s*=/gi,
  /\[['"]innerHTML['"]\]\s*=/gi,

  // String execution in timers (code injection vector)
  /setTimeout\s*\(\s*['"`]/gi,
  /setInterval\s*\(\s*['"`]/gi,

  // javascript: protocol (XSS vector)
  /javascript\s*:/gi,

  // Constructor access patterns (advanced bypass)
  /constructor\s*\.\s*constructor\s*\(/gi,
  /\['constructor'\]\s*\[['"]constructor['"]\]\s*\(/gi,
];

/**
 * Extract code blocks from markdown-style content
 */
function extractCodeBlocks(content: string): Array<{ language: string; code: string }> {
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  const blocks: Array<{ language: string; code: string }> = [];

  let match;
  while ((match = codeBlockRegex.exec(content)) !== null) {
    blocks.push({
      language: match[1] || '',
      code: match[2].trim(),
    });
  }

  return blocks;
}

/**
 * Perform security validation on content
 */
function performSecurityCheck(content: string): SecurityCheck {
  const violations: string[] = [];

  // Check for dangerous patterns
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(content)) {
      violations.push(`Potentially unsafe pattern detected: ${pattern.source}`);
    }
  }

  return {
    isSafe: violations.length === 0,
    violations,
  };
}

/**
 * Sanitize and extract a title from content
 */
function extractTitle(content: string, type: ArtifactType): string {
  let title = '';

  // Try to extract meaningful title based on type
  if (type === 'react') {
    // Look for component name in export or function declaration
    const exportMatch = content.match(/export\s+(?:default\s+)?(?:function|const)\s+(\w+)/);
    const functionMatch = content.match(/function\s+(\w+)\s*\(/);
    title = exportMatch?.[1] || functionMatch?.[1] || 'React Component';
  } else if (type === 'html') {
    // Look for title tag or first heading
    const titleMatch = content.match(/<title>([^<]+)<\/title>/i);
    const h1Match = content.match(/<h1[^>]*>([^<]+)<\/h1>/i);
    title = titleMatch?.[1] || h1Match?.[1] || 'HTML Document';
  } else if (type === 'svg') {
    // Look for title or desc element
    const svgTitleMatch = content.match(/<title>([^<]+)<\/title>/i);
    title = svgTitleMatch?.[1] || 'SVG Graphic';
  } else if (type === 'mermaid') {
    // Look for diagram type
    const typeMatch = content.match(/^\s*(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|journey)/m);
    title = typeMatch?.[1] ? `${typeMatch[1]} Diagram` : 'Mermaid Diagram';
  } else if (type === 'code') {
    // Generic code title
    title = 'Code Snippet';
  } else {
    title = 'Generated Content';
  }

  // Sanitize title: remove special chars, limit length
  title = title
    .replace(/[^\w\s-]/g, '')
    .trim()
    .substring(0, DETECTION_CONFIG.MAX_TITLE_LENGTH);

  return title || 'Untitled Artifact';
}

/**
 * Analyze content and extract detection signals
 */
function analyzeContent(content: string): DetectionSignals {
  const lines = content.split('\n');
  const lineCount = lines.length;

  // HTML structure patterns
  const hasHtmlStructure = /<(?:html|body|div|head|main|section|article|nav|header|footer)/i.test(content);
  const hasHtmlDoctype = /<!DOCTYPE\s+html/i.test(content);
  const hasScriptTags = /<script[^>]*>/i.test(content);
  const hasStyleTags = /<style[^>]*>/i.test(content);

  // React patterns
  const hasReactImports = /import\s+.*\s+from\s+['"]react['"]/i.test(content);
  const hasJsxSyntax = /<[A-Z]\w+[^>]*>|<[a-z]+[^>]*className=/i.test(content);
  const hasComponentExport = /export\s+(?:default\s+)?(?:function|const|class)\s+[A-Z]/i.test(content);

  // SVG patterns
  const hasSvgTags = /<svg[\s>]/i.test(content);

  // Mermaid patterns
  const hasMermaidBlock = /```mermaid/i.test(content);

  // Language identifier (code blocks)
  const hasLanguageIdentifier = /```\w+/.test(content);

  return {
    lineCount,
    hasLanguageIdentifier,
    hasHtmlStructure,
    hasReactImports,
    hasSvgTags,
    hasMermaidBlock,
    hasJsxSyntax,
    hasComponentExport,
    hasHtmlDoctype,
    hasScriptTags,
    hasStyleTags,
  };
}

/**
 * Detect React component with confidence scoring
 */
function detectReact(signals: DetectionSignals, content: string): number {
  let confidence = 0;

  // Strong indicators
  if (signals.hasReactImports) confidence += 0.4;
  if (signals.hasComponentExport) confidence += 0.3;
  if (signals.hasJsxSyntax) confidence += 0.2;

  // Supporting indicators
  if (/useState|useEffect|useContext|useRef|useMemo|useCallback/i.test(content)) {
    confidence += 0.1;
  }

  return Math.min(confidence, 1.0);
}

/**
 * Detect HTML content with confidence scoring
 */
function detectHtml(signals: DetectionSignals, content: string): number {
  let confidence = 0;

  // Strong indicators
  if (signals.hasHtmlDoctype) confidence += 0.4;
  if (signals.hasHtmlStructure) confidence += 0.3;

  // Supporting indicators
  if (signals.hasScriptTags) confidence += 0.1;
  if (signals.hasStyleTags) confidence += 0.1;
  if (/<(?:button|input|form|table|ul|ol|li)/i.test(content)) {
    confidence += 0.1;
  }

  return Math.min(confidence, 1.0);
}

/**
 * Detect SVG with confidence scoring
 */
function detectSvg(signals: DetectionSignals, content: string): number {
  let confidence = 0;

  // Strong indicator
  if (signals.hasSvgTags) confidence += 0.6;

  // Supporting indicators
  if (/<(?:path|rect|circle|ellipse|line|polyline|polygon)/i.test(content)) {
    confidence += 0.2;
  }
  if (/viewBox|xmlns/i.test(content)) {
    confidence += 0.2;
  }

  return Math.min(confidence, 1.0);
}

/**
 * Detect Mermaid diagram with confidence scoring
 */
function detectMermaid(signals: DetectionSignals, content: string): number {
  let confidence = 0;

  // Strong indicator
  if (signals.hasMermaidBlock) confidence += 0.7;

  // Supporting indicators
  if (/(?:graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie)/i.test(content)) {
    confidence += 0.3;
  }

  return Math.min(confidence, 1.0);
}

/**
 * Detect generic code with confidence scoring
 */
function detectCode(signals: DetectionSignals, content: string): number {
  let confidence = 0;

  // Must have language identifier
  if (!signals.hasLanguageIdentifier) return 0;

  // Base confidence from having language identifier
  confidence += 0.4;

  // Supporting indicators
  if (signals.lineCount >= DETECTION_CONFIG.MIN_LINE_THRESHOLD) {
    confidence += 0.3;
  }

  // Check for typical code patterns
  if (/(?:function|const|let|var|class|interface|type|enum)\s+\w+/i.test(content)) {
    confidence += 0.2;
  }
  if (/[{};()[\]]/g.test(content)) {
    confidence += 0.1;
  }

  return Math.min(confidence, 1.0);
}

/**
 * Main artifact detection function
 * Analyzes content and determines if it should be rendered as an artifact
 */
export function detectArtifact(content: string): DetectionResult {
  // Initial validation
  if (!content || typeof content !== 'string') {
    return {
      shouldCreateArtifact: false,
      confidence: 0,
      suggestedType: null,
      suggestedTitle: null,
      reason: 'Invalid or empty content',
    };
  }

  // Check content size
  if (content.length > DETECTION_CONFIG.MAX_CONTENT_SIZE) {
    return {
      shouldCreateArtifact: false,
      confidence: 0,
      suggestedType: null,
      suggestedTitle: null,
      reason: `Content exceeds maximum size of ${DETECTION_CONFIG.MAX_CONTENT_SIZE} bytes`,
    };
  }

  // Perform security check
  const securityCheck = performSecurityCheck(content);
  if (!securityCheck.isSafe) {
    return {
      shouldCreateArtifact: false,
      confidence: 0,
      suggestedType: null,
      suggestedTitle: null,
      reason: `Security violations detected: ${securityCheck.violations.join(', ')}`,
    };
  }

  // Analyze content signals
  const signals = analyzeContent(content);

  // Check minimum line threshold for code-based artifacts
  // Exceptions: SVG, Mermaid, and complete HTML documents can be shorter
  if (signals.lineCount < DETECTION_CONFIG.MIN_LINE_THRESHOLD) {
    const hasException = signals.hasSvgTags ||
                        signals.hasMermaidBlock ||
                        signals.hasHtmlDoctype;

    if (!hasException) {
      return {
        shouldCreateArtifact: false,
        confidence: 0,
        suggestedType: null,
        suggestedTitle: null,
        reason: `Content has only ${signals.lineCount} lines (minimum: ${DETECTION_CONFIG.MIN_LINE_THRESHOLD})`,
      };
    }
  }

  // Detect artifact type with confidence scoring
  const detectionScores: Array<{ type: ArtifactType; confidence: number }> = [
    { type: 'mermaid', confidence: detectMermaid(signals, content) },
    { type: 'svg', confidence: detectSvg(signals, content) },
    { type: 'react', confidence: detectReact(signals, content) },
    { type: 'html', confidence: detectHtml(signals, content) },
    { type: 'code', confidence: detectCode(signals, content) },
  ];

  // Sort by confidence (highest first)
  detectionScores.sort((a, b) => b.confidence - a.confidence);

  // Get best match
  const bestMatch = detectionScores[0];

  // Check if confidence meets threshold
  if (bestMatch.confidence < DETECTION_CONFIG.MIN_CONFIDENCE) {
    return {
      shouldCreateArtifact: false,
      confidence: bestMatch.confidence,
      suggestedType: null,
      suggestedTitle: null,
      reason: `Confidence ${bestMatch.confidence.toFixed(2)} below threshold ${DETECTION_CONFIG.MIN_CONFIDENCE}`,
    };
  }

  // Extract title
  const title = extractTitle(content, bestMatch.type);

  return {
    shouldCreateArtifact: true,
    confidence: bestMatch.confidence,
    suggestedType: bestMatch.type,
    suggestedTitle: title,
    reason: `Detected ${bestMatch.type} with ${(bestMatch.confidence * 100).toFixed(0)}% confidence`,
  };
}

/**
 * Detect artifacts from code blocks in markdown-style content
 * This is useful for detecting artifacts in AI responses that contain multiple code blocks
 */
export function detectArtifactsFromCodeBlocks(content: string): Array<DetectionResult & { content: string }> {
  const codeBlocks = extractCodeBlocks(content);
  const results: Array<DetectionResult & { content: string }> = [];

  for (const block of codeBlocks) {
    const detection = detectArtifact(block.code);
    if (detection.shouldCreateArtifact) {
      results.push({
        ...detection,
        content: block.code,
      });
    }
  }

  return results;
}

/**
 * Get detection configuration (useful for testing)
 */
export function getDetectionConfig() {
  return { ...DETECTION_CONFIG };
}
