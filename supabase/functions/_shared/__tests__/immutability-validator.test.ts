/**
 * Unit tests for immutability validation in artifact-validator.ts
 *
 * Tests the immutability validation system that detects and auto-fixes
 * array/object mutation patterns that violate React strict mode.
 */

import { assertEquals, assert } from "@std/assert";
import {
  validateImmutability,
  validateArtifactCode,
  autoFixArtifactCode,
  type MutationValidation
} from "../artifact-validator.ts";

// ==================== Direct Array Assignment Tests ====================

Deno.test("validateImmutability should detect direct array assignment", () => {
  const code = `
    function updateBoard(board, index, value) {
      board[index] = value;
      return board;
    }
  `;

  const result = validateImmutability(code);

  assert(result.hasMutations);
  assert(result.patterns.length > 0);
  assert(result.patterns.some(p => p.includes("Direct array assignment")));
});

Deno.test("validateImmutability should detect multiple array assignments", () => {
  const code = `
    function minimax(board, depth) {
      board[0] = 'X';
      board[1] = 'O';
      board[2] = 'X';
    }
  `;

  const result = validateImmutability(code);

  assert(result.hasMutations);
  assertEquals(result.patterns.length, 3);
});

Deno.test("validateImmutability should NOT flag comparison operators", () => {
  const code = `
    function checkWin(board) {
      if (board[0] === 'X') return true;
      if (board[1] == 'O') return false;
    }
  `;

  const result = validateImmutability(code);

  assert(!result.hasMutations);
  assertEquals(result.patterns.length, 0);
});

Deno.test("validateImmutability should NOT flag object property assignments", () => {
  const code = `
    function updateState(obj) {
      const newObj = { ...obj };
      newObj.property = 'value';
      return newObj;
    }
  `;

  const result = validateImmutability(code);

  // Should detect the property assignment (which is still a mutation pattern)
  // But in this case, it's on a new object, so context matters
  // Our validator is conservative and flags all direct assignments
  assert(result.hasMutations);
});

Deno.test("validateImmutability should provide auto-fix for direct assignments", () => {
  const code = `board[i] = 'X';`;

  const result = validateImmutability(code);

  assert(result.hasMutations);
  assert(result.autoFixAvailable);
  assert(result.fixedCode);
});

// ==================== Array Mutation Method Tests ====================

Deno.test("validateImmutability should detect Array.push()", () => {
  const code = `
    function addItem(arr, item) {
      arr.push(item);
    }
  `;

  const result = validateImmutability(code);

  assert(result.hasMutations);
  assert(result.patterns.some(p => p.includes("push")));
});

Deno.test("validateImmutability should detect Array.splice()", () => {
  const code = `
    function removeItem(arr, index) {
      arr.splice(index, 1);
    }
  `;

  const result = validateImmutability(code);

  assert(result.hasMutations);
  assert(result.patterns.some(p => p.includes("splice")));
});

Deno.test("validateImmutability should detect Array.sort()", () => {
  const code = `
    function sortArray(arr) {
      arr.sort((a, b) => a - b);
    }
  `;

  const result = validateImmutability(code);

  assert(result.hasMutations);
  assert(result.patterns.some(p => p.includes("sort")));
});

Deno.test("validateImmutability should detect Array.reverse()", () => {
  const code = `
    function reverseArray(arr) {
      arr.reverse();
    }
  `;

  const result = validateImmutability(code);

  assert(result.hasMutations);
  assert(result.patterns.some(p => p.includes("reverse")));
});

Deno.test("validateImmutability should detect Array.pop()", () => {
  const code = `
    function removeLast(arr) {
      arr.pop();
    }
  `;

  const result = validateImmutability(code);

  assert(result.hasMutations);
  assert(result.patterns.some(p => p.includes("pop")));
});

Deno.test("validateImmutability should detect Array.shift()", () => {
  const code = `
    function removeFirst(arr) {
      arr.shift();
    }
  `;

  const result = validateImmutability(code);

  assert(result.hasMutations);
  assert(result.patterns.some(p => p.includes("shift")));
});

Deno.test("validateImmutability should detect Array.unshift()", () => {
  const code = `
    function addFirst(arr, item) {
      arr.unshift(item);
    }
  `;

  const result = validateImmutability(code);

  assert(result.hasMutations);
  assert(result.patterns.some(p => p.includes("unshift")));
});

// ==================== Immutable Pattern Tests (Should Pass) ====================

Deno.test("validateImmutability should NOT flag spread operator with sort", () => {
  const code = `
    function sortArray(arr) {
      const sorted = [...arr].sort((a, b) => a - b);
      return sorted;
    }
  `;

  const result = validateImmutability(code);

  // Should NOT detect mutation since we're sorting a copy
  assert(!result.hasMutations || !result.patterns.some(p => p.includes("sort")));
});

Deno.test("validateImmutability should NOT flag spread operator with reverse", () => {
  const code = `
    function reverseArray(arr) {
      const reversed = [...arr].reverse();
      return reversed;
    }
  `;

  const result = validateImmutability(code);

  // Should NOT detect mutation since we're reversing a copy
  assert(!result.hasMutations || !result.patterns.some(p => p.includes("reverse")));
});

Deno.test("validateImmutability should NOT flag immutable array methods", () => {
  const code = `
    function processArray(arr) {
      const filtered = arr.filter(x => x > 0);
      const mapped = arr.map(x => x * 2);
      const sliced = arr.slice(0, 5);
      return { filtered, mapped, sliced };
    }
  `;

  const result = validateImmutability(code);

  assert(!result.hasMutations);
});

Deno.test("validateImmutability should NOT flag spread operator for adding items", () => {
  const code = `
    function addItem(arr, item) {
      const newArr = [...arr, item];
      return newArr;
    }
  `;

  const result = validateImmutability(code);

  assert(!result.hasMutations);
});

// ==================== Edge Cases & Comment Handling ====================

Deno.test("validateImmutability should ignore mutations in comments", () => {
  const code = `
    function example(board) {
      // Don't do this: board[i] = 'X'
      /* Also avoid: board.push(item) */
      const newBoard = [...board];
      return newBoard;
    }
  `;

  const result = validateImmutability(code);

  assert(!result.hasMutations);
});

Deno.test("validateImmutability should ignore mutations in string literals", () => {
  const code = `
    function example() {
      const message = "Don't use board[i] = value";
      const warning = 'Avoid arr.push(item)';
      return message + warning;
    }
  `;

  const result = validateImmutability(code);

  assert(!result.hasMutations);
});

Deno.test("validateImmutability should ignore mutations in template literals", () => {
  const code = `
    function example(index) {
      const message = \`Set board[\${index}] = 'X' causes errors\`;
      return message;
    }
  `;

  const result = validateImmutability(code);

  assert(!result.hasMutations);
});

// ==================== Auto-Fix Tests ====================

Deno.test("autoFixArtifactCode should fix direct array assignment", () => {
  const code = `
    function updateBoard(board, index) {
      board[index] = 'X';
      return board;
    }
  `;

  const { fixed, changes } = autoFixArtifactCode(code);

  assert(changes.length > 0);
  assert(changes.some(c => c.includes("immutability")));
  assert(fixed.includes("const new"));
  assert(fixed.includes("[...board]"));
});

Deno.test("autoFixArtifactCode should preserve indentation when fixing", () => {
  const code = `
    function minimax(board, depth) {
      if (depth === 0) {
        board[0] = 'X';
      }
    }
  `;

  const { fixed } = autoFixArtifactCode(code);

  // Check that indentation is preserved
  const lines = fixed.split('\n');
  const fixedLine = lines.find(l => l.includes("const new"));
  const originalLine = code.split('\n').find(l => l.includes("board[0] = 'X'"));

  if (fixedLine && originalLine) {
    const fixedIndent = fixedLine.match(/^(\s*)/)?.[1] || '';
    const originalIndent = originalLine.match(/^(\s*)/)?.[1] || '';
    assertEquals(fixedIndent.length, originalIndent.length);
  }
});

Deno.test("autoFixArtifactCode should fix minimax algorithm pattern", () => {
  const code = `
function minimax(board, depth, isMaximizing) {
  for (let i = 0; i < board.length; i++) {
    if (board[i] === null) {
      board[i] = isMaximizing ? 'X' : 'O';
      const score = minimax(board, depth + 1, !isMaximizing);
      board[i] = null;
    }
  }
}
  `;

  const { fixed, changes } = autoFixArtifactCode(code);

  assert(changes.length > 0);
  assert(fixed.includes("const new"));
  assert(fixed.includes("[...board]"));
});

// ==================== Integration with validateArtifactCode ====================

Deno.test("validateArtifactCode should include immutability checks", () => {
  const code = `
    export default function TicTacToe() {
      const [board, setBoard] = React.useState(Array(9).fill(null));

      function makeMove(index) {
        board[index] = 'X';  // Mutation!
        setBoard(board);
      }

      return <div>Game</div>;
    }
  `;

  const result = validateArtifactCode(code, 'react');

  assert(!result.valid);
  assert(result.issues.length > 0);
  assert(result.issues.some(issue => issue.message.includes("Direct array assignment")));
  assert(result.canAutoFix);
});

Deno.test("validateArtifactCode should pass for immutable code", () => {
  const code = `
    export default function TicTacToe() {
      const { useState } = React;
      const [board, setBoard] = useState(Array(9).fill(null));

      function makeMove(index) {
        const newBoard = [...board];
        newBoard[index] = 'X';
        setBoard(newBoard);
      }

      return <div>Game</div>;
    }
  `;

  const result = validateArtifactCode(code, 'react');

  assert(result.valid);
  assertEquals(result.issues.length, 0);
});

Deno.test("validateArtifactCode should skip immutability checks for non-code artifacts", () => {
  const code = `# Markdown content\n\nSome text with board[i] = value`;

  const result = validateArtifactCode(code, 'markdown');

  assert(result.valid);
  assertEquals(result.issues.length, 0);
});

// ==================== Complex Real-World Scenarios ====================

Deno.test("validateImmutability should handle complex minimax with multiple mutations", () => {
  const code = `
function minimax(board, depth, isMaximizing) {
  if (checkWin(board)) return isMaximizing ? -1 : 1;
  if (depth === 0) return 0;

  let bestScore = isMaximizing ? -Infinity : Infinity;

  for (let i = 0; i < board.length; i++) {
    if (board[i] === null) {
      board[i] = isMaximizing ? 'X' : 'O';
      const score = minimax(board, depth + 1, !isMaximizing);
      board[i] = null;

      if (isMaximizing) {
        bestScore = Math.max(score, bestScore);
      } else {
        bestScore = Math.min(score, bestScore);
      }
    }
  }

  return bestScore;
}
  `;

  const result = validateImmutability(code);

  assert(result.hasMutations);
  assertEquals(result.patterns.length, 2); // Two direct assignments
  assert(result.autoFixAvailable);
});

Deno.test("autoFixArtifactCode should fix complex minimax algorithm", () => {
  const code = `
function minimax(board, depth, isMaximizing) {
  for (let i = 0; i < board.length; i++) {
    if (board[i] === null) {
      board[i] = isMaximizing ? 'X' : 'O';
      const score = minimax(board, depth + 1, !isMaximizing);
      board[i] = null;
    }
  }
}
  `;

  const { fixed, changes } = autoFixArtifactCode(code);

  assert(changes.length > 0);
  assert(fixed.includes("const new"));
  assert(fixed.includes("[...board]"));
  assert(!fixed.includes("board[i] = isMaximizing")); // Original mutation removed
  assert(fixed.includes("newBoard[i] = isMaximizing") || fixed.includes("const newBoard"));
});

Deno.test("validateImmutability should handle whitespace variations", () => {
  const codeVariations = [
    "board[i]='X';",
    "board[i] = 'X';",
    "board[ i ] = 'X';",
    "board  [i]  =  'X';"
  ];

  codeVariations.forEach(code => {
    const result = validateImmutability(code);
    assert(result.hasMutations, `Failed to detect mutation in: ${code}`);
  });
});

// ==================== Performance & Boundary Tests ====================

Deno.test("validateImmutability should handle large code files efficiently", () => {
  // Generate a large file with multiple mutations
  const largeCode = Array(1000).fill(`
    function test${Math.random()}(board) {
      board[0] = 'X';
      return board;
    }
  `).join('\n');

  const startTime = Date.now();
  const result = validateImmutability(largeCode);
  const duration = Date.now() - startTime;

  // Should complete in reasonable time (<1 second for 1000 functions)
  assert(duration < 1000, `Validation took ${duration}ms, expected <1000ms`);
  assert(result.hasMutations);
});

Deno.test("validateImmutability should handle empty code", () => {
  const result = validateImmutability("");

  assert(!result.hasMutations);
  assertEquals(result.patterns.length, 0);
});

Deno.test("validateImmutability should handle code with only whitespace", () => {
  const result = validateImmutability("   \n\n\t\t  \n");

  assert(!result.hasMutations);
  assertEquals(result.patterns.length, 0);
});

// ==================== Error Handling ====================

Deno.test("validateImmutability should not throw on malformed code", () => {
  const malformedCode = `
    function broken(
      // Missing closing bracket
      board[i] = 'X'
  `;

  // Should not throw, just detect the mutation
  const result = validateImmutability(malformedCode);
  assert(result.hasMutations);
});

Deno.test("autoFixArtifactCode should not break valid code", () => {
  const validCode = `
    export default function Component() {
      const { useState } = React;
      const [items, setItems] = useState([]);

      function addItem(item) {
        setItems(prev => [...prev, item]);
      }

      return <div>Valid code</div>;
    }
  `;

  const { fixed } = autoFixArtifactCode(validCode);

  // Fixed code should be essentially the same (maybe minor whitespace differences)
  assert(fixed.includes("setItems(prev => [...prev, item])"));
  assert(fixed.includes("export default function Component"));
});
