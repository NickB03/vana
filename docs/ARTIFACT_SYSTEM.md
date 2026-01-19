# Artifact System

## Overview

The Artifact System enables AI-generated interactive components (artifacts) to be rendered in real-time alongside chat conversations using vanilla Sandpack. Artifacts are self-contained applications that run in isolated iframes.

**Rendering Engine**: [Sandpack](https://sandpack.codesandbox.io/) - CodeSandbox's browser-based bundler

**Philosophy**: Simple, fast, zero-config artifact rendering with natural error surfacing and AI-powered fixes.

## Supported Artifact Types

| Type | Description | Renderer |
|------|-------------|----------|
| `react` | React components with JSX | Sandpack |
| `html` | Static HTML pages | Simple iframe |
| `svg` | Vector graphics | Simple renderer |
| `mermaid` | Diagrams and flowcharts | Mermaid.js |
| `markdown` | Formatted documents | Marked.js |
| `code` | Code snippets with syntax highlighting | Shiki |

## Architecture

### Component Flow

```
AI generates artifact code
        ↓
artifact-tool-v2.ts extracts from XML tags
        ↓
artifact-saver.ts persists to database
        ↓
MessageWithArtifacts loads from artifact_versions table
        ↓
Type === 'react'?
  ├─ YES → Sandpack (React runtime)
  └─ NO  → Simple renderer (HTML/SVG/Mermaid/Markdown/Code)
        ↓
Errors? → Show in Sandpack console + "Ask AI to Fix" button
```

### Key Components

**Frontend** (`src/components/`):
- `SandpackArtifactRenderer.tsx` - Main rendering component for React artifacts
- `MessageWithArtifacts.tsx` - Loads artifacts from database, renders in chat
- `ArtifactContainer.tsx` - Artifact wrapper with state management
- `ArtifactErrorBoundary.tsx` - React error boundary for graceful degradation

**Backend** (`supabase/functions/_shared/`):
- `artifact-tool-v2.ts` - Simple XML parser, no transformations (~230 lines)
- `artifact-saver.ts` - Database persistence layer (~240 lines)
- `system-prompt-inline.ts` - Artifact generation guidance (~305 lines)

**Tool Calling**:
- `chat/handlers/tool-calling-chat.ts` - Integrates artifact generation with chat

### Storage

**Database Persistence** (replaces XML embedding):
- Artifacts stored in `artifact_versions` table
- Content-hash based deduplication
- Version tracking for iterations
- Linked to messages via `message_id` foreign key

## React Artifacts

### Package Whitelist

Sandpack provides these packages globally (no imports needed):

**Always Available**:
- `react` - React 18.x (global: `window.React`)
- `react-dom` - ReactDOM 18.x (global: `window.ReactDOM`)

**Whitelisted npm Packages** (auto-bundled by Sandpack):
- `recharts` - Charts and data visualization
- `framer-motion` - Animations and transitions
- `lucide-react` - Icon library
- `@radix-ui/react-*` - Accessible UI primitives (Dialog, Tabs, Switch, etc.)

### Required Structure

Every React artifact **must** use this exact boilerplate:

```jsx
// Step 1: Destructure React globals (MANDATORY)
const { useState, useEffect, useCallback, useMemo, useRef } = React;

// Step 2: Export default App component (MANDATORY)
export default function App() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      {/* Your component content */}
    </div>
  );
}
```

### Import Rules

```jsx
// ✅ CORRECT - npm packages (Sandpack bundles automatically)
import { LineChart } from "recharts";
import { motion } from "framer-motion";
import { Heart } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";

// ❌ FORBIDDEN - Local imports NEVER work in artifacts
import { Button } from "@/components/ui/button";
```

**Why**: Artifacts run in isolated Sandpack iframes with different security origins. Local `@/` imports are inaccessible. Use npm packages instead.

### Styling

**Tailwind CSS**: Automatically injected via CDN in all artifacts

```jsx
// Tailwind classes work out of the box
<div className="flex items-center gap-4 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
  <h1 className="text-2xl font-bold">Hello World</h1>
</div>
```

**Best Practices**:
- Use Tailwind's dark mode classes (`dark:bg-gray-900`)
- Prefer Tailwind over custom CSS
- Use semantic color names from Tailwind palette

## Error Handling

### Natural Error Surfacing

Sandpack shows compilation and runtime errors directly in the preview console:

**Syntax Errors**: Red error overlay with line numbers
**Import Errors**: "Could not resolve 'package-name'"
**Runtime Errors**: Stack traces in console

### "Ask AI to Fix" Recovery

When errors occur, users see an "Ask AI to Fix" button that:

1. Captures the error message and code
2. Sends to AI: `"Fix this error: {error}\n\nCode:\n{code}"`
3. AI generates corrected code
4. Re-renders artifact with fix

**Error Types**:
- **Syntax errors**: Missing brackets, typos, invalid JSX
- **Import errors**: Package not in whitelist
- **Runtime errors**: Undefined variables, type errors, logic bugs
- **React errors**: Invalid hook usage, missing dependencies

## Best Practices

### 1. Immutable State Updates

React strict mode crashes artifacts that mutate state:

```jsx
// ✅ CORRECT - Create new array
setItems([...items, newItem]);
setItems(prev => [...prev, newItem]);

// ❌ WRONG - Mutates state (WILL CRASH)
items.push(newItem);
setItems(items);
```

**Array Updates by Index** (games, grids):
```jsx
// ✅ CORRECT - Copy array first
const handleClick = (index) => {
  const newBoard = [...board];  // Create copy FIRST
  newBoard[index] = 'X';        // Update copy
  setBoard(newBoard);           // Set new array
};

// ❌ WRONG - Direct index assignment (WILL CRASH)
board[index] = 'X';
```

### 2. Always Include Sample Data

Never show empty states on first render:

```jsx
// ✅ CORRECT - Start with sample data
const [items, setItems] = useState([
  { id: 1, name: 'Sample Item 1' },
  { id: 2, name: 'Sample Item 2' }
]);

// ❌ WRONG - Empty initial state
const [items, setItems] = useState([]);
```

### 3. Use Radix UI for Complex Components

```jsx
// ✅ CORRECT - Radix UI namespace imports
import * as Dialog from "@radix-ui/react-dialog";
import * as Tabs from "@radix-ui/react-tabs";
import * as Switch from "@radix-ui/react-switch";

// ❌ WRONG - Named imports don't work reliably
import { Dialog, DialogTrigger } from "@radix-ui/react-dialog";
```

### 4. Unique Keys for Lists

```jsx
// ✅ CORRECT - Use stable IDs
{items.map(item => (
  <div key={item.id}>{item.name}</div>
))}

// ❌ WRONG - Array indices aren't stable
{items.map((item, i) => (
  <div key={i}>{item.name}</div>
))}
```

## Non-React Artifacts

### HTML

Static HTML pages rendered in simple iframe:

```xml
<artifact type="html" title="Landing Page">
<!DOCTYPE html>
<html>
<head>
  <title>My Page</title>
  <style>/* CSS here */</style>
</head>
<body>
  <h1>Hello World</h1>
  <script>/* JS here */</script>
</body>
</html>
</artifact>
```

### SVG

Vector graphics rendered directly:

```xml
<artifact type="svg" title="Logo">
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <circle cx="50" cy="50" r="40" fill="blue" />
</svg>
</artifact>
```

### Mermaid

Diagrams rendered with Mermaid.js:

```xml
<artifact type="mermaid" title="Flowchart">
graph TD
  A[Start] --> B{Decision}
  B -->|Yes| C[Action 1]
  B -->|No| D[Action 2]
</artifact>
```

### Code Snippets

Syntax-highlighted code with Shiki:

```xml
<artifact type="code" language="python" title="Example">
def hello(name):
    print(f"Hello, {name}!")
</artifact>
```

## Limitations

### What Sandpack Does NOT Support

- **Server-side code**: Node.js APIs, file system access
- **Native modules**: Binary addons, native dependencies
- **Large dependencies**: Packages >5MB may timeout
- **Legacy syntax**: ES5-only code without module support

### Package Restrictions

Only whitelisted packages are available. To add a package:

1. Test in isolated Sandpack environment
2. Verify size (<1MB recommended)
3. Add to whitelist in `SimpleArtifactRenderer.tsx`

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Could not resolve 'X'" | Package not in whitelist - use alternative or request addition |
| Blank screen | Check Sandpack console for errors → use "Ask AI to Fix" |
| React strict mode crash | Check for state mutations → see "Immutable State Updates" |
| Import error | Remove `@/` imports → use npm packages only |

## References

- **Sandpack Docs**: https://sandpack.codesandbox.io/
- **Radix UI Primitives**: https://www.radix-ui.com/primitives
- **Tailwind CSS**: https://tailwindcss.com/docs
- **Import Restrictions**: See CLAUDE.md Rule #4
