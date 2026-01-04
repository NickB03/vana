/**
 * Golden Patterns for Artifact Generation
 *
 * These patterns apply to ALL artifacts regardless of template matching.
 * They address the most common runtime failures:
 *
 * 1. Immutability violations (React strict mode)
 * 2. Complex state management
 * 3. Event handler patterns
 * 4. Sample data requirements
 * 5. Component structure
 *
 * USAGE: Include in system prompt for EVERY artifact generation request.
 */

export const GOLDEN_PATTERNS = `
## MANDATORY PATTERNS FOR ALL ARTIFACTS

These patterns prevent the most common runtime errors. Copy them EXACTLY.

### 1. IMMUTABLE STATE UPDATES (CRITICAL)

React strict mode will crash artifacts that mutate state directly. ALWAYS use immutable patterns:

**Arrays - Adding items:**
\`\`\`jsx
// ✅ CORRECT - Create new array
setItems([...items, newItem]);
setItems(prev => [...prev, newItem]);

// ❌ WRONG - Mutates state (WILL CRASH)
items.push(newItem);  // NEVER DO THIS
setItems(items);
\`\`\`

**Arrays - Removing items:**
\`\`\`jsx
// ✅ CORRECT - Filter creates new array
setItems(items.filter(item => item.id !== idToRemove));
setItems(prev => prev.filter(item => item.id !== idToRemove));

// ❌ WRONG - Mutates state (WILL CRASH)
items.splice(index, 1);  // NEVER DO THIS
\`\`\`

**Arrays - Updating items:**
\`\`\`jsx
// ✅ CORRECT - Map creates new array with updated item
setItems(items.map(item =>
  item.id === targetId ? { ...item, completed: true } : item
));

// ❌ WRONG - Mutates state (WILL CRASH)
items[index].completed = true;  // NEVER DO THIS
\`\`\`

**Arrays - Updating by index (games, grids):**
\`\`\`jsx
// ✅ CORRECT - Copy array, then update copy
const handleClick = (index) => {
  const newBoard = [...board];  // Create copy FIRST
  newBoard[index] = 'X';        // Update copy
  setBoard(newBoard);           // Set new array
};

// ❌ WRONG - Direct index assignment (WILL CRASH)
const handleClick = (index) => {
  board[index] = 'X';  // NEVER DO THIS
  setBoard(board);
};
\`\`\`

**Objects - Updating properties:**
\`\`\`jsx
// ✅ CORRECT - Spread creates new object
setUser({ ...user, name: 'New Name' });
setUser(prev => ({ ...prev, score: prev.score + 10 }));

// ❌ WRONG - Mutates state (WILL CRASH)
user.name = 'New Name';  // NEVER DO THIS
\`\`\`

**Nested objects:**
\`\`\`jsx
// ✅ CORRECT - Spread at each level
setData({
  ...data,
  settings: {
    ...data.settings,
    theme: 'dark'
  }
});

// ❌ WRONG - Mutates nested object
data.settings.theme = 'dark';  // NEVER DO THIS
\`\`\`

### 2. ALWAYS INCLUDE SAMPLE DATA

Artifacts should NEVER show empty states on first load. Initialize with realistic data:

\`\`\`jsx
// ✅ CORRECT - Real, diverse sample data
const [tasks, setTasks] = useState([
  { id: 1, text: 'Complete project proposal', completed: true, priority: 'high' },
  { id: 2, text: 'Review pull requests', completed: false, priority: 'medium' },
  { id: 3, text: 'Update documentation', completed: false, priority: 'low' },
  { id: 4, text: 'Schedule team meeting', completed: true, priority: 'medium' },
  { id: 5, text: 'Deploy to staging', completed: false, priority: 'high' },
]);

const [products] = useState([
  { id: 1, name: 'MacBook Pro M3', price: 2399, category: 'Electronics', stock: 15 },
  { id: 2, name: 'Sony WH-1000XM5', price: 349, category: 'Audio', stock: 42 },
  { id: 3, name: 'iPad Air', price: 599, category: 'Electronics', stock: 28 },
  { id: 4, name: 'Magic Keyboard', price: 299, category: 'Accessories', stock: 67 },
]);

// ❌ WRONG - Empty initial state
const [tasks, setTasks] = useState([]);  // User sees empty screen
const [data, setData] = useState(null);  // User sees nothing
\`\`\`

### 3. STANDARD EVENT HANDLERS

Use these exact patterns for event handling:

**Form submission:**
\`\`\`jsx
const handleSubmit = (e) => {
  e.preventDefault();  // ALWAYS prevent default for forms
  if (!inputValue.trim()) return;  // Validate input

  // Add to list (immutable)
  setItems(prev => [...prev, { id: Date.now(), text: inputValue }]);
  setInputValue('');  // Clear input
};

<form onSubmit={handleSubmit}>
  <input
    value={inputValue}
    onChange={(e) => setInputValue(e.target.value)}
    placeholder="Enter text..."
  />
  <button type="submit">Add</button>
</form>
\`\`\`

**Click handlers with data:**
\`\`\`jsx
// ✅ CORRECT - Arrow function passes data
{items.map(item => (
  <button
    key={item.id}
    onClick={() => handleSelect(item.id)}  // Arrow function
  >
    {item.name}
  </button>
))}

// ❌ WRONG - Calls function immediately during render
onClick={handleSelect(item.id)}  // NEVER - This calls immediately!
\`\`\`

**Toggle handlers:**
\`\`\`jsx
// ✅ CORRECT - Use functional update
const toggleComplete = (id) => {
  setItems(prev => prev.map(item =>
    item.id === id ? { ...item, completed: !item.completed } : item
  ));
};
\`\`\`

### 4. COMPONENT STRUCTURE PATTERN

Every artifact should follow this structure:

\`\`\`jsx
// 1. Import hooks at top
const { useState, useEffect, useCallback, useMemo, useRef } = React;

// 2. Import external packages
import { Check, X, Plus, Trash2 } from 'lucide-react';

// 3. Define component with sample data
export default function App() {
  // State with sample data
  const [items, setItems] = useState([
    { id: 1, name: 'Sample Item 1', status: 'active' },
    { id: 2, name: 'Sample Item 2', status: 'completed' },
  ]);
  const [inputValue, setInputValue] = useState('');

  // Handler functions (using immutable patterns)
  const addItem = () => {
    if (!inputValue.trim()) return;
    setItems(prev => [...prev, { id: Date.now(), name: inputValue, status: 'active' }]);
    setInputValue('');
  };

  const removeItem = (id) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  // Computed values
  const activeCount = items.filter(i => i.status === 'active').length;

  // Render
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
          My App
        </h1>

        {/* Content */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          {items.map(item => (
            <div key={item.id} className="flex items-center gap-3 p-3">
              <span>{item.name}</span>
              <button onClick={() => removeItem(item.id)}>
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
\`\`\`

### 5. SORTING AND FILTERING (COMMON GOTCHA)

Sorting mutates arrays! Always copy first:

\`\`\`jsx
// ✅ CORRECT - Copy before sorting
const sortedItems = [...items].sort((a, b) => a.name.localeCompare(b.name));
const sortedByDate = [...items].sort((a, b) => new Date(b.date) - new Date(a.date));

// For state updates
const handleSort = () => {
  setItems(prev => [...prev].sort((a, b) => a.name.localeCompare(b.name)));
};

// ❌ WRONG - Sort mutates original array
const sortedItems = items.sort(...);  // NEVER - This mutates items!
\`\`\`

### 6. UNIQUE KEYS IN LISTS

Always use stable, unique keys:

\`\`\`jsx
// ✅ CORRECT - Use unique ID
{items.map(item => (
  <div key={item.id}>...</div>
))}

// ✅ CORRECT - Use index ONLY for static lists that never change
{staticOptions.map((option, index) => (
  <div key={index}>...</div>
))}

// ❌ WRONG - Using index for dynamic lists
{dynamicItems.map((item, index) => (
  <div key={index}>...</div>  // WRONG - Causes issues when items reorder
))}
\`\`\`

### 7. CONDITIONAL RENDERING

Safe patterns for conditional rendering:

\`\`\`jsx
// ✅ CORRECT - Ternary for either/or
{isLoading ? (
  <div>Loading...</div>
) : (
  <div>{content}</div>
)}

// ✅ CORRECT - && for show/hide (with length check)
{items.length > 0 && (
  <ul>{items.map(...)}</ul>
)}

// ❌ WRONG - && with number (shows "0" if items.length is 0)
{items.length && <ul>...</ul>}  // Shows "0" when empty!
\`\`\`
`;

export const GOLDEN_PATTERNS_REMINDER = `
[PATTERN CHECKLIST - VERIFY BEFORE GENERATING]

✓ All state updates use immutable patterns (spread operator, map, filter)
✓ Arrays copied before sort/reverse: [...array].sort()
✓ Sample data included (never empty initial state)
✓ Event handlers use arrow functions: onClick={() => handle(id)}
✓ Forms use e.preventDefault()
✓ List items have unique keys (prefer id over index)
✓ Conditional rendering uses ternary or .length > 0 &&
`;
