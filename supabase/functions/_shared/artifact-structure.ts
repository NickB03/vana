/**
 * Lightweight structural checks for artifact outputs.
 *
 * These checks catch truncated or malformed artifacts that slip past
 * regex-based validators (e.g., missing closing tags or unbalanced braces).
 */

import type { ValidationIssue } from './artifact-validator.ts';

interface StructuralCheckParams {
  code: string;
  artifactType: string;
  finishReason?: string | null;
}

const ARTIFACT_OPEN_TAG = /<artifact\b[^>]*>/gi;
const ARTIFACT_CLOSE_TAG = /<\/artifact>/gi;
const DEFAULT_EXPORT_PATTERN = /export\s+default\b|export\s*\{[^}]*\bdefault\b[^}]*\}/i;

function stripStringsAndComments(code: string): string {
  let output = '';
  let i = 0;
  let inSingle = false;
  let inDouble = false;
  let inTemplate = false;
  let inLineComment = false;
  let inBlockComment = false;

  while (i < code.length) {
    const char = code[i];
    const next = code[i + 1];

    if (inLineComment) {
      if (char === '\n') {
        inLineComment = false;
        output += '\n';
      }
      i += 1;
      continue;
    }

    if (inBlockComment) {
      if (char === '*' && next === '/') {
        inBlockComment = false;
        i += 2;
        continue;
      }
      if (char === '\n') {
        output += '\n';
      }
      i += 1;
      continue;
    }

    if (inSingle) {
      if (char === '\\') {
        i += 2;
        continue;
      }
      if (char === "'") {
        inSingle = false;
      }
      i += 1;
      continue;
    }

    if (inDouble) {
      if (char === '\\') {
        i += 2;
        continue;
      }
      if (char === '"') {
        inDouble = false;
      }
      i += 1;
      continue;
    }

    if (inTemplate) {
      if (char === '\\') {
        i += 2;
        continue;
      }
      if (char === '`') {
        inTemplate = false;
      }
      i += 1;
      continue;
    }

    if (char === '/' && next === '/') {
      inLineComment = true;
      i += 2;
      continue;
    }

    if (char === '/' && next === '*') {
      inBlockComment = true;
      i += 2;
      continue;
    }

    if (char === "'") {
      inSingle = true;
      i += 1;
      continue;
    }

    if (char === '"') {
      inDouble = true;
      i += 1;
      continue;
    }

    if (char === '`') {
      inTemplate = true;
      i += 1;
      continue;
    }

    output += char;
    i += 1;
  }

  return output;
}

function findBracketMismatch(code: string): string | null {
  const pairs: Record<string, string> = {
    '{': '}',
    '(': ')',
    '[': ']',
  };
  const openers = new Set(Object.keys(pairs));
  const closers = new Set(Object.values(pairs));
  const stack: string[] = [];

  for (let i = 0; i < code.length; i += 1) {
    const char = code[i];
    if (openers.has(char)) {
      stack.push(char);
      continue;
    }
    if (closers.has(char)) {
      const opener = stack.pop();
      if (!opener) {
        return `Unexpected closing "${char}"`;
      }
      const expected = pairs[opener];
      if (expected !== char) {
        return `Mismatched closing "${char}" (expected "${expected}")`;
      }
    }
  }

  if (stack.length > 0) {
    const opener = stack[stack.length - 1];
    return `Missing closing "${pairs[opener]}"`;
  }

  return null;
}

export function getStructuralIssues(params: StructuralCheckParams): ValidationIssue[] {
  const { code, artifactType, finishReason } = params;
  const issues: ValidationIssue[] = [];
  const normalizedType = artifactType.toLowerCase();

  if (finishReason === 'length') {
    issues.push({
      severity: 'error',
      message: 'Model output was truncated (finish_reason="length"). Artifact likely incomplete.',
      suggestion: 'Regenerate with a shorter response or rewrite the artifact from scratch.',
    });
  }

  const openCount = code.match(ARTIFACT_OPEN_TAG)?.length ?? 0;
  const closeCount = code.match(ARTIFACT_CLOSE_TAG)?.length ?? 0;

  if (openCount + closeCount > 0) {
    if (openCount !== closeCount) {
      issues.push({
        severity: 'error',
        message: `Artifact tag mismatch: ${openCount} opening <artifact> tag(s), ${closeCount} closing </artifact> tag(s).`,
        suggestion: 'Ensure the artifact tag is opened and closed exactly once.',
      });
    } else if (openCount > 1) {
      issues.push({
        severity: 'error',
        message: `Multiple artifact blocks detected (${openCount}). Expected a single artifact.`,
        suggestion: 'Return one complete artifact block only.',
      });
    }
  }

  if (normalizedType === 'react' || normalizedType === 'code') {
    const sanitized = stripStringsAndComments(code);
    const mismatch = findBracketMismatch(sanitized);
    if (mismatch) {
      issues.push({
        severity: 'error',
        message: `Unbalanced brackets detected: ${mismatch}.`,
        suggestion: 'Check for missing or extra brackets/parentheses. Output may be truncated.',
      });
    }
  }

  if (normalizedType === 'react' && !DEFAULT_EXPORT_PATTERN.test(code)) {
    issues.push({
      severity: 'error',
      message: 'React artifact missing a default export.',
      suggestion: 'Add `export default App;` (or equivalent) at the end.',
    });
  }

  return issues;
}
