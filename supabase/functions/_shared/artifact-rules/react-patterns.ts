/**
 * React Artifact Patterns
 *
 * Best practices and patterns specific to React artifacts.
 * Focuses on immutability, component structure, and common pitfalls.
 */

export const REACT_PATTERNS = `
## React Artifact Guidelines

### [CRITICAL - WILL CRASH IN STRICT MODE]

**Immutability Requirements:**

React strict mode enforces immutability. Direct mutations cause "readonly property" errors.

❌ WRONG (causes runtime crash):
\`\`\`javascript
// Direct array assignment
board[i] = 'X';           // ❌ WILL CRASH

// Mutating methods
board.push(value);        // ❌ Mutates original
board.splice(0, 1);       // ❌ Mutates original
board.sort();             // ❌ Mutates original
board.reverse();          // ❌ Mutates original

// Object mutations
obj.count++;              // ❌ Mutates original
obj.foo = 'bar';          // ❌ Direct assignment
delete obj.key;           // ❌ Mutates original
\`\`\`

✅ CORRECT (immutable patterns):
\`\`\`javascript
// Array updates - create new copy first
const newBoard = [...board];
newBoard[i] = 'X';
setBoard(newBoard);

// Or use immutable methods
setBoard([...board, value]);              // Instead of push
setBoard(board.filter((_, idx) => idx !== 0)); // Instead of splice
setBoard([...board].sort());              // Copy first, then sort
setBoard([...board].reverse());           // Copy first, then reverse

// Object updates - use spread operator
setObj({...obj, count: obj.count + 1});   // Instead of obj.count++
setObj({...obj, foo: 'bar'});             // Instead of obj.foo = 'bar'
const {key, ...rest} = obj;               // Instead of delete
setObj(rest);
\`\`\`

**Reserved Keywords:**

Strict mode forbids using these as variable names:
- ❌ eval, arguments, implements, interface, package, private, protected, public, static, yield, await

✅ Use alternatives:
- \`score\` or \`value\` instead of \`eval\`
- \`args\` or \`params\` instead of \`arguments\`
- Descriptive names for others

### [HIGH - QUALITY DEGRADATION]

**Component Structure:**
- Component names MUST start with uppercase: \`function App()\`, not \`function app()\`
- Include default export: \`export default function ComponentName()\`
- Always include sample data (never empty initial state)

**Available Hooks (from React global):**
\`\`\`javascript
export default function App() {
  const {
    useState,
    useEffect,
    useCallback,
    useMemo,
    useRef,
    useReducer,
    useContext
  } = React;

  // Your component logic
}
\`\`\`

**State Management Example:**
\`\`\`javascript
export default function TodoApp() {
  const { useState } = React;

  // ✅ ALWAYS include sample data
  const [todos, setTodos] = useState([
    { id: 1, text: 'Sample todo', done: false },
    { id: 2, text: 'Another task', done: true }
  ]);

  // ✅ Immutable update pattern
  const toggleTodo = (id) => {
    setTodos(todos.map(todo =>
      todo.id === id
        ? { ...todo, done: !todo.done }  // New object
        : todo
    ));
  };

  return <div>{/* UI */}</div>;
}
\`\`\`

### [RECOMMENDED - BEST PRACTICE]

**Accessibility:**
- Use semantic HTML elements
- Add ARIA labels where appropriate
- Ensure keyboard navigation works

**Performance:**
- Use \`useCallback\` for event handlers passed to child components
- Use \`useMemo\` for expensive calculations
- Avoid inline function definitions in JSX when possible

**User Experience:**
- Include loading states for async operations
- Add error handling with user-friendly messages
- Implement keyboard shortcuts (Enter, Escape, etc.)
- Show validation feedback on forms
`;

export const REACT_IMMUTABILITY_EXAMPLE = `
## Immutability Example (Minimax Algorithm)

❌ WRONG (will crash in React):
\`\`\`javascript
function minimax(board, depth, isMaximizing) {
  for (let i = 0; i < board.length; i++) {
    if (board[i] === null) {
      board[i] = isMaximizing ? 'X' : 'O';  // ❌ MUTATION
      const score = minimax(board, depth + 1, !isMaximizing);
      board[i] = null;  // ❌ MUTATION
    }
  }
}
\`\`\`

✅ CORRECT (immutable):
\`\`\`javascript
function minimax(board, depth, isMaximizing) {
  for (let i = 0; i < board.length; i++) {
    if (board[i] === null) {
      const newBoard = [...board];  // ✅ Create copy
      newBoard[i] = isMaximizing ? 'X' : 'O';  // ✅ Modify copy
      const score = minimax(newBoard, depth + 1, !isMaximizing);
      // No need to undo - newBoard is discarded after recursion
    }
  }
}
\`\`\`
`;
