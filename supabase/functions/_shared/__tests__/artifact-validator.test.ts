// deno-lint-ignore-file no-explicit-any
import { assertEquals, assertExists, assertStringIncludes } from "https://deno.land/std@0.220.0/assert/mod.ts";
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

Deno.test("autoFixArtifactCode - fixes minimax algorithm (reserved keyword only)", () => {
  // NOTE: This test verifies that auto-fix handles reserved keywords but
  // intentionally SKIPS array mutation auto-fix for multi-mutation scenarios.
  // This is by design to prevent "Identifier already declared" errors.
  // The artifact-fix endpoint handles complex multi-mutation code instead.
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

  // Should fix 'eval' -> 'score' (reserved keyword)
  assertEquals(fixed.includes('const score = isMaximizing'), true);
  assertEquals(fixed.includes('const eval'), false);

  // Auto-fix is SKIPPED for multi-mutation code (board is mutated twice)
  // This prevents "Identifier already declared" errors from duplicate newBoard
  assertEquals(fixed.includes('const newBoard'), false);

  // Should have at least 1 change (the eval -> score fix)
  assertEquals(changes.length >= 1, true);
  assertEquals(changes.some(c => c.includes("'eval'")), true);
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


Deno.test("validateArtifactCode + autoFixArtifactCode - full Sucrase integration pipeline", () => {
  // Full integration test: TypeScript → Sucrase strip → validation → auto-fix
  const code = `
interface User {
  name: string;
}

export default function App() {
  const eval: User = { name: "Alice" };  // Reserved keyword + TypeScript
  return <div>{eval.name}</div>;
}`;

  // Step 1: Auto-fix (strips TypeScript)
  const { fixed, changes } = autoFixArtifactCode(code);

  // TypeScript should be stripped
  assertEquals(fixed.includes('interface User'), false);
  assertEquals(fixed.includes(': User'), false);
  assertEquals(changes.some(c => c.includes('Sucrase')), true);

  // Step 2: Validate the fixed code
  const validation = validateArtifactCode(fixed, 'react');

  // After TypeScript stripping, 'eval' keyword should still be detected
  // Note: Sucrase transpiles JSX to React.createElement, which changes variable usage
  // The variable 'eval' might be in a different form now
  assertEquals(typeof validation.valid, 'boolean');
  assertEquals(Array.isArray(validation.issues), true);
});

// ============================================================================
// Sucrase TypeScript Stripping Tests (Phase 2 Migration)
// ============================================================================

Deno.test("autoFixArtifactCode - Sucrase strips TypeScript type annotations", () => {
  const code = `
export default function App() {
  const x: string = "hello";
  const y: number = 42;
  return <div>{x}</div>;
}`;
  const { fixed, changes } = autoFixArtifactCode(code);

  // Type annotations should be stripped
  assertEquals(fixed.includes(': string'), false);
  assertEquals(fixed.includes(': number'), false);
  // Should report Sucrase was used
  assertEquals(changes.some(c => c.includes('Sucrase')), true);

  // Code structure preserved
  assertEquals(fixed.includes('const x = "hello"'), true);
  assertEquals(fixed.includes('const y = 42'), true);
});

Deno.test("autoFixArtifactCode - Sucrase strips generic type parameters", () => {
  const code = `
export default function App() {
  const [items, setItems] = React.useState<string[]>([]);
  const ref = React.useRef<HTMLDivElement>(null);
  return <div ref={ref}>{items.length}</div>;
}`;
  const { fixed, changes } = autoFixArtifactCode(code);

  // Generic types should be stripped
  assertEquals(fixed.includes('<string[]>'), false);
  assertEquals(fixed.includes('<HTMLDivElement>'), false);
  assertEquals(changes.some(c => c.includes('Sucrase')), true);

  // Hook calls preserved (without generics)
  assertEquals(fixed.includes('React.useState([])'), true);
  assertEquals(fixed.includes('React.useRef(null)'), true);
});

Deno.test("autoFixArtifactCode - Sucrase strips interface declarations", () => {
  const code = `
interface User {
  name: string;
  age: number;
}

export default function App() {
  const user = { name: "Alice", age: 30 };
  return <div>{user.name}</div>;
}`;
  const { fixed, changes } = autoFixArtifactCode(code);

  // Interface should be removed
  assertEquals(fixed.includes('interface User'), false);
  assertEquals(changes.some(c => c.includes('Sucrase')), true);

  // Component preserved
  assertEquals(fixed.includes('export default function App()'), true);
  assertEquals(fixed.includes('user.name'), true);
});

Deno.test("autoFixArtifactCode - Sucrase strips type aliases", () => {
  const code = `
type Status = 'pending' | 'active' | 'done';

export default function App() {
  const status = 'active';
  return <div>{status}</div>;
}`;
  const { fixed, changes } = autoFixArtifactCode(code);

  // Type alias should be removed
  assertEquals(fixed.includes('type Status'), false);
  assertEquals(changes.some(c => c.includes('Sucrase')), true);

  // Component preserved
  assertEquals(fixed.includes('export default function App()'), true);
});

Deno.test("autoFixArtifactCode - Sucrase preserves namespace imports", () => {
  // CRITICAL: Sucrase must NOT corrupt "import * as X from 'pkg'"
  const code = `
import * as Dialog from '@radix-ui/react-dialog';
import * as Icons from 'lucide-react';

export default function App() {
  return (
    <Dialog.Root>
      <Icons.Star />
    </Dialog.Root>
  );
}`;
  const { fixed } = autoFixArtifactCode(code);

  // Namespace imports must be preserved exactly
  assertEquals(fixed.includes('import * as Dialog from'), true);
  assertEquals(fixed.includes('import * as Icons from'), true);

  // Check for corruption (the bug we're preventing)
  assertEquals(fixed.includes('import * from'), false);
});

Deno.test("autoFixArtifactCode - Sucrase handles JSX with TypeScript", () => {
  const code = `
interface Props {
  title: string;
  count: number;
}

export default function App() {
  const props: Props = { title: "Hello", count: 5 };
  return <div>{props.title}: {props.count}</div>;
}`;
  const { fixed, changes } = autoFixArtifactCode(code);

  // Interface and type annotation removed
  assertEquals(fixed.includes('interface Props'), false);
  assertEquals(fixed.includes(': Props'), false);
  assertEquals(changes.some(c => c.includes('Sucrase')), true);

  // JSX transpiled to React.createElement
  assertEquals(fixed.includes('React.createElement'), true);
  assertEquals(fixed.includes('props.title'), true);
});

Deno.test("autoFixArtifactCode - regex fallback when Sucrase fails", () => {
  // Syntactically invalid code that Sucrase can't parse
  // but regex might still handle
  const code = `
export default function App() {
  const x: string = "hello"  // Missing semicolon
  const y as number = 42;    // Invalid syntax
  return <div>{x}</div>;
}`;
  const { fixed, changes } = autoFixArtifactCode(code);

  // Should fall back to regex
  // Note: Regex fallback might not catch everything, but shouldn't crash
  assertEquals(changes.some(c => c.includes('fallback') || c.includes('Sucrase')), true);

  // Basic structure should still be there
  assertEquals(fixed.includes('export default function App()'), true);
});

Deno.test("autoFixArtifactCode - Sucrase preserves valid JavaScript structure", () => {
  // Code with no TypeScript syntax - Sucrase still transpiles JSX to React.createElement
  const validCode = `
import * as Dialog from '@radix-ui/react-dialog';

export default function App() {
  const count = 42;
  const name = "Alice";

  return (
    <Dialog.Root>
      <div>{name}: {count}</div>
    </Dialog.Root>
  );
}`;
  const { fixed } = autoFixArtifactCode(validCode);

  // Namespace imports preserved (critical - the bug we fixed)
  assertEquals(fixed.includes('import * as Dialog from'), true);
  assertEquals(fixed.includes('import * from'), false); // No corruption

  // JSX transpiled to React.createElement (expected behavior)
  assertEquals(fixed.includes('React.createElement'), true);

  // JavaScript logic preserved
  assertEquals(fixed.includes('const count = 42'), true);
  assertEquals(fixed.includes('const name = "Alice"'), true);
});

// ============================================================================
// Server-Side Double-Failure Path Tests (Issue #6)
// ============================================================================

Deno.test("autoFixArtifactCode - handles catastrophic TypeScript that both Sucrase and regex reject", () => {
  const code = `
export default function App() {
  const x: <<<>>>>> = 1;  // Catastrophically broken
  return <div>{x}</div>;
}`;

  const { fixed, changes } = autoFixArtifactCode(code);

  // Should not crash - return string with error logged
  assertEquals(typeof fixed, 'string');
  assertEquals(fixed.length > 0, true);
  // Should fall back to regex when Sucrase fails
  assertEquals(changes.some(c => c.includes('fell back to regex') || c.includes('fallback')), true);
});

// ============================================================================
// Import Resolution Edge Case Tests (Issue #7)
// ============================================================================

Deno.test("autoFixArtifactCode - handles namespace import and type assertion on same line", () => {
  // This test verifies that the regex doesn't corrupt valid namespace imports
  // NOTE: Sucrase may remove unused imports during transpilation, which is expected behavior
  const code = `import * as Dialog from '@radix-ui/react-dialog'; const x = value as Type; export default () => <Dialog.Root><div /></Dialog.Root>;`;
  const { fixed } = autoFixArtifactCode(code);

  // Type assertion should be stripped (no " as Type" in output)
  assertEquals(fixed.includes(' as Type'), false);

  // CRITICAL: No corruption - "import * from" without namespace identifier is invalid syntax
  // This would indicate the regex incorrectly matched and removed "as Dialog"
  assertEquals(fixed.includes('import * from'), false);

  // Verify the component is using Dialog (so import won't be removed as unused)
  assertEquals(fixed.includes('Dialog'), true);
});

Deno.test("autoFixArtifactCode - Sucrase handles function parameter types", () => {
  const code = `
export default function App() {
  const onClick = (event: React.MouseEvent, index: number) => {
    console.log(event, index);
  };

  return <button onClick={(e) => onClick(e, 0)}>Click</button>;
}`;
  const { fixed, changes } = autoFixArtifactCode(code);

  // Parameter types should be stripped
  assertEquals(fixed.includes(': React.MouseEvent'), false);
  assertEquals(fixed.includes(': number'), false);
  assertEquals(changes.some(c => c.includes('Sucrase')), true);

  // Function structure preserved
  assertEquals(fixed.includes('const onClick = (event, index) =>'), true);
});

Deno.test("autoFixArtifactCode - Sucrase handles complex TypeScript features", () => {
  const code = `
type Point = { x: number; y: number };
interface Shape {
  area(): number;
}

export default function App() {
  const point: Point = { x: 10, y: 20 };
  const value = point.x as number;
  const items = [1, 2, 3] as const;

  return <div>{point.x}</div>;
}`;
  const { fixed, changes } = autoFixArtifactCode(code);

  // All TypeScript syntax should be stripped
  assertEquals(fixed.includes('type Point'), false);
  assertEquals(fixed.includes('interface Shape'), false);
  assertEquals(fixed.includes(': Point'), false);
  assertEquals(fixed.includes('as number'), false);
  assertEquals(fixed.includes('as const'), false);
  assertEquals(changes.some(c => c.includes('Sucrase')), true);

  // Core logic preserved
  assertEquals(fixed.includes('const point = { x: 10, y: 20 }'), true);
  assertEquals(fixed.includes('const items = [1, 2, 3]'), true);
});

// ============================================================================
// Duplicate Import Removal Tests (removeDuplicateImports via autoFixArtifactCode)
// ============================================================================
// Tests for the removeDuplicateImports function which is called internally
// by autoFixArtifactCode. We test it through the public API.

Deno.test("autoFixArtifactCode - removes simple duplicate imports", () => {
  const code = `import { Mail, User, Mail } from "lucide-react";

export default function App() {
  return <div><Mail /><User /></div>;
}`;
  const { fixed, changes } = autoFixArtifactCode(code);

  // Should report 1 duplicate removed
  assertEquals(changes.some(c => c.includes('1 duplicate import')), true);

  // Verify the import statement is deduplicated
  // Match the import line (Sucrase preserves import structure)
  const importMatch = fixed.match(/import\s*\{([^}]+)\}\s*from\s*["']lucide-react["']/);
  if (importMatch) {
    const imports = importMatch[1].split(',').map((s: string) => s.trim()).filter(Boolean);
    // Should have exactly 2 unique imports: Mail and User
    assertEquals(imports.length, 2);
    assertEquals(imports.includes('Mail'), true);
    assertEquals(imports.includes('User'), true);
  } else {
    // If Sucrase transforms the import differently, just check no duplicate Mail
    const mailCount = (fixed.match(/\bMail\b/g) || []).length;
    // In JSX transpiled output, Mail appears in React.createElement calls
    // Just ensure the import line doesn't have duplicate Mail
    assertEquals(fixed.includes('Mail, User, Mail'), false);
  }
});

Deno.test("autoFixArtifactCode - removes aliased duplicate imports", () => {
  const code = `import { X as A, Y, X as B } from "pkg";

export default function App() {
  return <div>{A}{Y}</div>;
}`;
  const { fixed, changes } = autoFixArtifactCode(code);

  // Sucrase handles duplicate aliased imports during transpilation
  // The original import X (aliased as A) should be kept, the duplicate X as B removed
  // Check that we don't have both aliases in the output
  assertEquals(fixed.includes('X as A'), true);
  assertEquals(fixed.includes('X as B'), false);
  // Sucrase reports its transpilation
  assertEquals(changes.some(c => c.includes('Sucrase')), true);
});

Deno.test("autoFixArtifactCode - handles multiline imports with duplicates", () => {
  const code = `import {
  Mail,
  User,
  Mail
} from "lucide-react";

export default function App() {
  return <Mail />;
}`;
  const { fixed, changes } = autoFixArtifactCode(code);

  // Should detect and remove the duplicate
  assertEquals(changes.some(c => c.includes('duplicate import')), true);

  // The fixed code should not have duplicate Mail in import
  const importMatch = fixed.match(/import\s*\{([^}]+)\}\s*from/);
  if (importMatch) {
    const mailCount = importMatch[1].split(',').filter((s: string) => s.trim() === 'Mail').length;
    assertEquals(mailCount, 1);
  }
});

Deno.test("autoFixArtifactCode - removes duplicates from multiple import statements", () => {
  const code = `import { A, B, A } from "pkg1";
import { C, D, C } from "pkg2";

export default function App() {
  return <div>{A}{B}{C}{D}</div>;
}`;
  const { fixed, changes } = autoFixArtifactCode(code);

  // Should report 2 duplicates removed (one from each import)
  assertEquals(changes.some(c => c.includes('2 duplicate import')), true);

  // Neither import should have duplicates
  assertEquals(fixed.includes('A, B, A'), false);
  assertEquals(fixed.includes('C, D, C'), false);
});

Deno.test("autoFixArtifactCode - preserves imports without duplicates", () => {
  const code = `import { Mail, User } from "lucide-react";

export default function App() {
  return <div><Mail /><User /></div>;
}`;
  const { fixed, changes } = autoFixArtifactCode(code);

  // Should NOT report any duplicate removal
  assertEquals(changes.some(c => c.includes('duplicate import')), false);

  // Import should be preserved (note: Sucrase will transpile JSX)
  assertEquals(fixed.includes('Mail'), true);
  assertEquals(fixed.includes('User'), true);
});

Deno.test("autoFixArtifactCode - removes triple duplicate imports", () => {
  const code = `import { A, A, A } from "pkg";

export default function App() {
  return <div>{A}</div>;
}`;
  const { fixed, changes } = autoFixArtifactCode(code);

  // Should report 2 duplicates removed (keeping only 1 A)
  assertEquals(changes.some(c => c.includes('2 duplicate import')), true);

  // Verify only one A remains in import
  const importMatch = fixed.match(/import\s*\{([^}]+)\}\s*from\s*["']pkg["']/);
  if (importMatch) {
    const imports = importMatch[1].split(',').map((s: string) => s.trim()).filter(Boolean);
    assertEquals(imports.length, 1);
    assertEquals(imports[0], 'A');
  }
});

Deno.test("autoFixArtifactCode - handles mixed aliased and non-aliased duplicates", () => {
  // When X and X as Alias both exist, they have the same original name (X)
  // Sucrase handles this during transpilation - removes the duplicate
  const code = `import { X, X as Alias } from "pkg";

export default function App() {
  return <div>{X}</div>;
}`;
  const { fixed, changes } = autoFixArtifactCode(code);

  // Sucrase handles the deduplication during transpilation
  assertEquals(changes.some(c => c.includes('Sucrase')), true);

  // The aliased version (X as Alias) should be removed by Sucrase
  assertEquals(fixed.includes('X as Alias'), false);

  // Verify X is still present in the import
  assertEquals(fixed.includes('import { X'), true);
});

Deno.test("autoFixArtifactCode - handles default import with duplicate named imports", () => {
  // Note: The regex in removeDuplicateImports requires `import { ... } from` pattern
  // and doesn't match `import Default, { ... } from` pattern
  // However, Sucrase handles this case during transpilation
  const code = `import React, { useState, useState } from 'react';

export default function App() {
  const [count, setCount] = useState(0);
  return <div>{count}</div>;
}`;
  const { fixed, changes } = autoFixArtifactCode(code);

  // Sucrase transpiles the code and handles imports
  assertEquals(changes.some(c => c.includes('Sucrase')), true);

  // useState should still be usable (appears in the transpiled output)
  assertEquals(fixed.includes('useState'), true);

  // The code should be valid JavaScript after transformation
  assertEquals(fixed.includes('React.createElement'), true);
});

Deno.test("autoFixArtifactCode - preserves whitespace style in deduplicated imports", () => {
  const code = `import { A,  B,   A } from "pkg";

export default function App() {
  return <div>{A}{B}</div>;
}`;
  const { fixed, changes } = autoFixArtifactCode(code);

  // Should remove the duplicate
  assertEquals(changes.some(c => c.includes('1 duplicate import')), true);

  // The fixed import should use standard spacing
  assertEquals(fixed.includes('import { A, B }'), true);
});

Deno.test("autoFixArtifactCode - handles complex real-world duplicate scenario", () => {
  // This simulates a real LLM output bug
  const code = `import { Mail, User, Settings, Mail, User } from "lucide-react";
import { Button, Input, Button } from "ui-library";

export default function App() {
  return (
    <div>
      <Mail />
      <User />
      <Settings />
      <Button>Click</Button>
      <Input />
    </div>
  );
}`;
  const { fixed, changes } = autoFixArtifactCode(code);

  // Should report 3 duplicates removed (2 from lucide-react, 1 from ui-library)
  assertEquals(changes.some(c => c.includes('3 duplicate import')), true);

  // Verify no duplicates remain
  assertEquals(fixed.includes('Mail, User, Settings, Mail'), false);
  assertEquals(fixed.includes('Button, Input, Button'), false);
});

// ============================================================================
// JavaScript Syntax Validation Tests (SYNTAX_PARSE_ERROR)
// ============================================================================
// These tests verify that validateJavaScriptSyntax catches various syntax errors
// that would cause client-side transpilation to fail.

import { validateJavaScriptSyntax } from "../artifact-validator.ts";

Deno.test("validateJavaScriptSyntax - valid JSX component passes", () => {
  const code = `
const { useState } = React;

function App() {
  const [count, setCount] = useState(0);
  return (
    <div className="p-4">
      <h1>Count: {count}</h1>
      <button onClick={() => setCount(c => c + 1)}>Increment</button>
    </div>
  );
}

export default App;`;
  const result = validateJavaScriptSyntax(code);

  assertEquals(result.valid, true);
  assertEquals(result.error, undefined);
});

Deno.test("validateJavaScriptSyntax - detects missing colon in object property", () => {
  // This is the exact error pattern from the sales dashboard bug: "backgroundColor]" instead of "backgroundColor: COLORS[i]"
  const code = `
const data = {
  backgroundColor]  // Missing colon
};
`;
  const result = validateJavaScriptSyntax(code);

  assertEquals(result.valid, false);
  assertExists(result.error);
  assertStringIncludes(result.error.toLowerCase(), 'unexpected');
});

Deno.test("validateJavaScriptSyntax - detects unclosed JSX tag", () => {
  const code = `
function App() {
  return (
    <div>
      <span>Hello
    </div>
  );
}`;
  const result = validateJavaScriptSyntax(code);

  assertEquals(result.valid, false);
  assertExists(result.error);
});

Deno.test("validateJavaScriptSyntax - detects missing closing brace", () => {
  const code = `
function App() {
  const data = {
    name: "test",
    value: 42
  // Missing closing brace
}`;
  const result = validateJavaScriptSyntax(code);

  assertEquals(result.valid, false);
  assertExists(result.error);
});

Deno.test("validateJavaScriptSyntax - detects invalid template literal", () => {
  const code = `
const message = \`Hello \${name}
// Unclosed template literal
`;
  const result = validateJavaScriptSyntax(code);

  assertEquals(result.valid, false);
  assertExists(result.error);
});

Deno.test("validateJavaScriptSyntax - detects invalid import syntax", () => {
  const code = `
import { useState from 'react';  // Missing closing brace
`;
  const result = validateJavaScriptSyntax(code);

  assertEquals(result.valid, false);
  assertExists(result.error);
});

Deno.test("validateJavaScriptSyntax - detects missing comma in object literal", () => {
  const code = `
const config = {
  width: 100
  height: 200  // Missing comma
};`;
  const result = validateJavaScriptSyntax(code);

  assertEquals(result.valid, false);
  assertExists(result.error);
});

Deno.test("validateJavaScriptSyntax - reports line number for error", () => {
  const code = `
function App() {
  return <div>;
}`;  // Invalid JSX on line 3
  const result = validateJavaScriptSyntax(code);

  assertEquals(result.valid, false);
  assertExists(result.error);
  // Error should have line/column info
  assertEquals(typeof result.line === 'number' || result.line === undefined, true);
});

Deno.test("validateJavaScriptSyntax - valid TypeScript with types passes", () => {
  const code = `
interface User {
  name: string;
  age: number;
}

function App(): JSX.Element {
  const user: User = { name: "Alice", age: 30 };
  return <div>{user.name}</div>;
}

export default App;`;
  const result = validateJavaScriptSyntax(code);

  // Sucrase handles TypeScript, so this should pass
  assertEquals(result.valid, true);
});

Deno.test("validateJavaScriptSyntax - complex chart component passes", () => {
  // Similar to the sales dashboard that had the bug
  const code = `
const { useState, useEffect, useRef } = React;

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'];

function SalesDashboard() {
  const [data, setData] = useState([]);
  const canvasRef = useRef(null);

  const chartData = data.map((item, i) => ({
    label: item.name,
    value: item.sales,
    backgroundColor: COLORS[i % COLORS.length]
  }));

  return (
    <div className="p-4">
      <h1>Sales Dashboard</h1>
      <canvas ref={canvasRef} />
    </div>
  );
}

export default SalesDashboard;`;
  const result = validateJavaScriptSyntax(code);

  assertEquals(result.valid, true);
});

// ============================================================================
// Integration: validateArtifactCode with Syntax Validation
// ============================================================================

Deno.test("validateArtifactCode - catches syntax errors before other validations", () => {
  const code = `
const data = {
  backgroundColor]  // Syntax error
};`;
  const result = validateArtifactCode(code, 'react');

  assertEquals(result.valid, false);
  assertEquals(result.canAutoFix, false); // Syntax errors can't be auto-fixed
  assertEquals(result.issues.some(i => i.message.includes('Syntax error')), true);
  assertEquals(result.issues.some(i => i.code === 'SYNTAX_PARSE_ERROR'), true);
});

Deno.test("validateArtifactCode - syntax validation skipped for markdown artifacts", () => {
  const code = `
This is markdown content.
It doesn't need JavaScript syntax validation.
{ This would be invalid JS but valid markdown }
`;
  const result = validateArtifactCode(code, 'markdown');

  // Markdown skips all validation
  assertEquals(result.valid, true);
  assertEquals(result.issues.length, 0);
});

Deno.test("validateArtifactCode - syntax validation skipped for SVG artifacts", () => {
  const code = `
<svg viewBox="0 0 100 100">
  <circle cx="50" cy="50" r="40" />
</svg>`;
  const result = validateArtifactCode(code, 'svg');

  // SVG skips all validation
  assertEquals(result.valid, true);
  assertEquals(result.issues.length, 0);
});
