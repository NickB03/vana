import { assertEquals, assertExists } from "https://deno.land/std@0.220.0/assert/mod.ts";
import {
  validateArtifactCode,
  autoFixArtifactCode,
  validateImmutability,
  type MutationValidation,
} from "../artifact-validator.ts";

// ============================================================================
// Reserved Keyword Detection Tests
// ============================================================================

Deno.test("validateArtifactCode - detects 'eval' as variable name", () => {
  const code = `const eval = minimax(board, depth);`;
  const result = validateArtifactCode(code, 'react');

  assertEquals(result.valid, false);
  assertEquals(result.canAutoFix, true);
  assertEquals(result.issues.some(i => i.message.includes("'eval'")), true);
  assertEquals(result.issues[0].severity, 'error');
});

Deno.test("validateArtifactCode - detects 'arguments' as variable name", () => {
  const code = `let arguments = process();`;
  const result = validateArtifactCode(code, 'react');

  assertEquals(result.valid, false);
  assertEquals(result.canAutoFix, true);
  assertEquals(result.issues.some(i => i.message.includes("'arguments'")), true);
});

Deno.test("validateArtifactCode - detects 'yield' as variable name", () => {
  const code = `var yield = calculate();`;
  const result = validateArtifactCode(code, 'react');

  assertEquals(result.valid, false);
  assertEquals(result.issues.some(i => i.message.includes("'yield'")), true);
});

Deno.test("validateArtifactCode - detects 'await' as variable name", () => {
  const code = `const await = fetchData();`;
  const result = validateArtifactCode(code, 'react');

  assertEquals(result.valid, false);
  assertEquals(result.issues.some(i => i.message.includes("'await'")), true);
});

Deno.test("validateArtifactCode - detects function named with reserved keyword", () => {
  const code = `function eval(x, y) { return x + y; }`;
  const result = validateArtifactCode(code, 'react');

  assertEquals(result.valid, false);
  assertEquals(result.issues.some(i => i.message.includes("'eval'")), true);
});

Deno.test("validateArtifactCode - detects all 11 strict mode reserved keywords", () => {
  const keywords = [
    'eval', 'arguments', 'implements', 'interface', 'let',
    'package', 'private', 'protected', 'public', 'static', 'yield', 'await'
  ];

  keywords.forEach(keyword => {
    const code = `const ${keyword} = 42;`;
    const result = validateArtifactCode(code, 'react');
    assertEquals(result.valid, false, `Should flag: ${keyword}`);
    assertEquals(result.issues.some(i => i.message.includes(`'${keyword}'`)), true, `Should mention: ${keyword}`);
  });
});

Deno.test("validateArtifactCode - allows reserved keyword in string literal", () => {
  const code = `const score = "eval is forbidden";`;
  const result = validateArtifactCode(code, 'react');

  // Should pass - 'eval' is in a string, not used as a variable name
  assertEquals(result.valid, true);
  assertEquals(result.issues.length, 0);
});

Deno.test("validateArtifactCode - allows reserved keyword in comment", () => {
  const code = `const score = 42; // eval was replaced`;
  const result = validateArtifactCode(code, 'react');

  assertEquals(result.valid, true);
  assertEquals(result.issues.length, 0);
});

// ============================================================================
// Auto-Fix Tests
// ============================================================================

Deno.test("autoFixArtifactCode - replaces 'eval' with 'score'", () => {
  const code = `const eval = minimax(board, depth);`;
  const { fixed, changes } = autoFixArtifactCode(code);

  assertEquals(fixed.includes('const score = minimax'), true);
  assertEquals(fixed.includes('const eval'), false);
  assertEquals(changes.length >= 1, true);
  assertEquals(changes.some(c => c.includes("'eval'")), true);
});

Deno.test("autoFixArtifactCode - replaces 'arguments' with 'args'", () => {
  const code = `let arguments = process();`;
  const { fixed, changes } = autoFixArtifactCode(code);

  assertEquals(fixed.includes('let args = process'), true);
  assertEquals(fixed.includes('let arguments'), false);
  assertEquals(changes.some(c => c.includes("'arguments'")), true);
});

Deno.test("autoFixArtifactCode - removes unnecessary React import", () => {
  const code = `import React from 'react';\nconst App = () => <div>Hello</div>;`;
  const { fixed, changes } = autoFixArtifactCode(code);

  assertEquals(fixed.includes('import React'), false);
  assertEquals(changes.some(c => c.includes("React import")), true);
});

Deno.test("autoFixArtifactCode - handles multiple issues at once", () => {
  const code = `
    import React from 'react';
    const eval = minimax(board, depth);
    const arguments = process();
  `;
  const { fixed, changes } = autoFixArtifactCode(code);

  assertEquals(changes.length >= 3, true);
  assertEquals(fixed.includes('const score ='), true);
  assertEquals(fixed.includes('const args ='), true);
  assertEquals(fixed.includes('import React'), false);
});

Deno.test("autoFixArtifactCode - preserves code structure and indentation", () => {
  const code = `function minimax(board, depth) {
  const eval = calculateScore(board);
  return eval;
}`;
  const { fixed, changes } = autoFixArtifactCode(code);

  // Should preserve indentation
  assertEquals(fixed.includes('  const score ='), true);
  // Should preserve function structure
  assertEquals(fixed.includes('function minimax'), true);
  assertEquals(fixed.includes('return score;') || fixed.includes('return eval;'), true);
});

// ============================================================================
// Problematic Pattern Detection Tests
// ============================================================================

Deno.test("validateArtifactCode - detects @/ imports", () => {
  const code = `import { Button } from '@/components/ui/button';`;
  const result = validateArtifactCode(code, 'react');

  assertEquals(result.valid, false);
  assertEquals(result.issues.some(i => i.message.includes('@/')), true);
});

Deno.test("validateArtifactCode - detects localStorage usage", () => {
  const code = `localStorage.setItem('key', 'value');`;
  const result = validateArtifactCode(code, 'react');

  assertEquals(result.valid, false);
  assertEquals(result.issues.some(i => i.message.includes('localStorage')), true);
});

Deno.test("validateArtifactCode - detects sessionStorage usage", () => {
  const code = `sessionStorage.getItem('key');`;
  const result = validateArtifactCode(code, 'react');

  assertEquals(result.valid, false);
  assertEquals(result.issues.some(i => i.message.includes('sessionStorage')), true);
});

Deno.test("validateArtifactCode - warns about React import", () => {
  const code = `import React from 'react';`;
  const result = validateArtifactCode(code, 'react');

  assertEquals(result.canAutoFix, true);
  assertEquals(result.issues.some(i => i.severity === 'warning'), true);
});

// ============================================================================
// Immutability Validation Tests
// ============================================================================

Deno.test("validateImmutability - detects direct array assignment", () => {
  const code = `board[i] = 'X';`;
  const result: MutationValidation = validateImmutability(code);

  assertEquals(result.hasMutations, true);
  assertEquals(result.autoFixAvailable, true);
  assertEquals(result.patterns.some(p => p.includes('Direct array assignment')), true);
  assertExists(result.fixedCode);
});

Deno.test("validateImmutability - detects array.push()", () => {
  const code = `items.push(newItem);`;
  const result: MutationValidation = validateImmutability(code);

  assertEquals(result.hasMutations, true);
  assertEquals(result.patterns.some(p => p.includes('push')), true);
});

Deno.test("validateImmutability - detects array.splice()", () => {
  const code = `items.splice(0, 1);`;
  const result: MutationValidation = validateImmutability(code);

  assertEquals(result.hasMutations, true);
  assertEquals(result.patterns.some(p => p.includes('splice')), true);
});

Deno.test("validateImmutability - detects array.sort()", () => {
  const code = `items.sort();`;
  const result: MutationValidation = validateImmutability(code);

  assertEquals(result.hasMutations, true);
  assertEquals(result.patterns.some(p => p.includes('sort')), true);
});

Deno.test("validateImmutability - detects array.reverse()", () => {
  const code = `items.reverse();`;
  const result: MutationValidation = validateImmutability(code);

  assertEquals(result.hasMutations, true);
  assertEquals(result.patterns.some(p => p.includes('reverse')), true);
});

Deno.test("validateImmutability - allows immutable array patterns", () => {
  const code = `
    const newBoard = [...board];
    const sorted = [...items].sort();
    const added = [...items, newItem];
    const filtered = items.filter(x => x > 0);
  `;
  const result: MutationValidation = validateImmutability(code);

  // Should pass - these are immutable patterns
  assertEquals(result.hasMutations, false);
});

Deno.test("validateImmutability - ignores mutations in comments", () => {
  const code = `
    // Don't do this: board[i] = 'X'
    const newBoard = [...board];
  `;
  const result: MutationValidation = validateImmutability(code);

  assertEquals(result.hasMutations, false);
});

Deno.test("validateImmutability - ignores mutations in strings", () => {
  const code = `const message = "Use board[i] = value pattern";`;
  const result: MutationValidation = validateImmutability(code);

  assertEquals(result.hasMutations, false);
});

Deno.test("validateImmutability - auto-fixes direct array assignment", () => {
  const code = `board[i] = 'X';`;
  const result: MutationValidation = validateImmutability(code);

  assertEquals(result.autoFixAvailable, true);
  assertExists(result.fixedCode);
  assertEquals(result.fixedCode!.includes('const newBoard = [...board]'), true);
  assertEquals(result.fixedCode!.includes('newBoard[i] = \'X\''), true);
});

// ============================================================================
// Real-World Scenario Tests
// ============================================================================

Deno.test("validateArtifactCode - real-world minimax algorithm", () => {
  const code = `
function minimax(board, depth, isMaximizing) {
  if (checkWinner(board) === 'X') return 10 - depth;
  if (checkWinner(board) === 'O') return depth - 10;

  const eval = isMaximizing ? -Infinity : Infinity;

  for (let i = 0; i < board.length; i++) {
    if (board[i] === null) {
      board[i] = isMaximizing ? 'X' : 'O';
      const score = minimax(board, depth + 1, !isMaximizing);
      board[i] = null;

      if (isMaximizing) {
        eval = Math.max(eval, score);
      } else {
        eval = Math.min(eval, score);
      }
    }
  }

  return eval;
}
  `;

  const result = validateArtifactCode(code, 'react');

  // Should detect both 'eval' keyword and mutations
  assertEquals(result.valid, false);
  assertEquals(result.canAutoFix, true);
  assertEquals(result.issues.some(i => i.message.includes("'eval'")), true);
  assertEquals(result.issues.some(i => i.message.includes('Direct array assignment')), true);
});

Deno.test("autoFixArtifactCode - fixes minimax algorithm completely", () => {
  const code = `
function minimax(board, depth, isMaximizing) {
  const eval = isMaximizing ? -Infinity : Infinity;

  for (let i = 0; i < board.length; i++) {
    if (board[i] === null) {
      board[i] = isMaximizing ? 'X' : 'O';
      const score = minimax(board, depth + 1, !isMaximizing);
      board[i] = null;
    }
  }

  return eval;
}
  `;

  const { fixed, changes } = autoFixArtifactCode(code);

  // Should fix 'eval' -> 'score'
  assertEquals(fixed.includes('const score = isMaximizing'), true);
  assertEquals(fixed.includes('const eval'), false);

  // Should fix array mutations
  assertEquals(fixed.includes('const newBoard = [...board]') ||
               fixed.includes('const newBoard = ['), true);

  // Should have multiple changes
  assertEquals(changes.length >= 2, true);
});

Deno.test("validateArtifactCode - allows valid React component", () => {
  const code = `
export default function TicTacToe() {
  const { useState } = React;
  const [board, setBoard] = useState(Array(9).fill(null));

  const handleClick = (index) => {
    const newBoard = [...board];
    newBoard[index] = 'X';
    setBoard(newBoard);
  };

  return <div onClick={() => handleClick(0)}>Click me</div>;
}
  `;

  const result = validateArtifactCode(code, 'react');

  // Should pass - uses immutable patterns
  assertEquals(result.valid, true);
  assertEquals(result.issues.length, 0);
});

// ============================================================================
// Edge Case Tests
// ============================================================================

Deno.test("validateArtifactCode - skips validation for non-code artifacts", () => {
  const svgCode = `<svg><circle cx="50" cy="50" r="40"/></svg>`;
  const result = validateArtifactCode(svgCode, 'svg');

  assertEquals(result.valid, true);
  assertEquals(result.issues.length, 0);
});

Deno.test("validateArtifactCode - skips validation for markdown", () => {
  const markdownCode = `# Hello\n\nThis is markdown with eval keyword.`;
  const result = validateArtifactCode(markdownCode, 'markdown');

  assertEquals(result.valid, true);
});

Deno.test("validateArtifactCode - skips validation for mermaid", () => {
  const mermaidCode = `graph TD\nA[eval] --> B[score]`;
  const result = validateArtifactCode(mermaidCode, 'mermaid');

  assertEquals(result.valid, true);
});

Deno.test("validateArtifactCode - handles empty code", () => {
  const result = validateArtifactCode('', 'react');

  assertEquals(result.valid, true);
  assertEquals(result.issues.length, 0);
});

Deno.test("validateArtifactCode - handles code with only whitespace", () => {
  const result = validateArtifactCode('   \n\n   ', 'react');

  assertEquals(result.valid, true);
  assertEquals(result.issues.length, 0);
});

Deno.test("autoFixArtifactCode - handles empty code", () => {
  const { fixed, changes } = autoFixArtifactCode('');

  assertEquals(fixed, '');
  assertEquals(changes.length, 0);
});

// ============================================================================
// Integration Tests
// ============================================================================

Deno.test("validateArtifactCode + autoFixArtifactCode - full pipeline", () => {
  const badCode = `
    import React from 'react';
    const eval = 42;
    const arguments = [];
    board[0] = 'X';
  `;

  // Step 1: Validate
  const validation = validateArtifactCode(badCode, 'react');
  assertEquals(validation.valid, false);
  assertEquals(validation.canAutoFix, true);

  // Step 2: Auto-fix
  const { fixed, changes } = autoFixArtifactCode(badCode);
  assertEquals(changes.length >= 3, true);

  // Step 3: Re-validate
  const revalidation = validateArtifactCode(fixed, 'react');

  // After auto-fix, should have fewer issues (or none)
  assertEquals(revalidation.issues.length < validation.issues.length, true);
});

Deno.test("validateArtifactCode - provides helpful suggestions", () => {
  const code = `const eval = 42;`;
  const result = validateArtifactCode(code, 'react');

  assertEquals(result.issues.length > 0, true);
  assertExists(result.issues[0].suggestion);
  assertEquals(result.issues[0].suggestion!.includes('score'), true);
});

Deno.test("validateArtifactCode - includes line numbers", () => {
  const code = `
    const x = 1;
    const eval = 2;
    const y = 3;
  `;
  const result = validateArtifactCode(code, 'react');

  assertEquals(result.issues.length > 0, true);
  assertExists(result.issues[0].line);
  assertEquals(result.issues[0].line, 3); // Line 3 has 'eval'
});

// ============================================================================
// Performance Tests
// ============================================================================

Deno.test("validateArtifactCode - handles large code files efficiently", () => {
  // Generate a large valid code file (1000 lines)
  const lines = Array(1000).fill('const validVar = 42;');
  const code = lines.join('\n');

  const start = performance.now();
  const result = validateArtifactCode(code, 'react');
  const duration = performance.now() - start;

  assertEquals(result.valid, true);
  assertEquals(duration < 100, true); // Should complete in <100ms
});

Deno.test("validateImmutability - handles complex nested code", () => {
  const code = `
function complex() {
  for (let i = 0; i < 10; i++) {
    for (let j = 0; j < 10; j++) {
      const value = i * j;
      items[i] = value;
    }
  }
}
  `;

  const result = validateImmutability(code);
  assertEquals(result.hasMutations, true);
  assertEquals(result.autoFixAvailable, true);
});
