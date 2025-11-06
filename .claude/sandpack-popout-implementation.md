# Sandpack Pop-out Implementation

## Overview

Implemented **Option 2: Open in CodeSandbox** for Sandpack artifacts that need to be opened in a new window.

---

## Implementation Details

### Decision Logic

```typescript
const handlePopOut = () => {
  // For Sandpack artifacts (React with npm imports)
  if (artifact.type === "react" && needsSandpack) {
    handleOpenInCodeSandbox();  // NEW: Open in CodeSandbox
    return;
  }

  // For regular artifacts (HTML/CSS/simple React)
  // ... existing pop-out logic (opens in new window)
};
```

### CodeSandbox Integration

```typescript
const handleOpenInCodeSandbox = () => {
  // 1. Extract npm dependencies from code
  const dependencies = extractNpmDependencies(artifact.content);
  
  // 2. Create CodeSandbox project structure
  const sandboxConfig = {
    files: {
      'package.json': { /* React + dependencies */ },
      'public/index.html': { /* HTML template */ },
      'src/App.js': { /* User's code */ },
      'src/index.js': { /* React entry point */ },
    },
  };

  // 3. Encode and POST to CodeSandbox API
  const parameters = btoa(JSON.stringify(sandboxConfig));
  
  // 4. Submit via form (handles large payloads)
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = 'https://codesandbox.io/api/v1/sandboxes/define';
  form.target = '_blank';
  // ... submit form
};
```

---

## User Experience

### Before (Without Implementation)

**Problem:** Sandpack artifacts couldn't be popped out because:
- Sandpack requires React context
- Can't serialize Sandpack state to new window
- Would need to recreate entire Sandpack environment

**Options:**
1. ❌ Disable pop-out button (bad UX)
2. ❌ Generate standalone HTML (very complex)
3. ✅ Open in CodeSandbox (best UX)

### After (With Implementation)

**For Simple Artifacts (HTML/CSS/Simple React):**
- Click pop-out button → Opens in new browser window
- Same behavior as before (no changes)

**For Sandpack Artifacts (React with npm imports):**
- Click pop-out button → Opens in CodeSandbox
- Full IDE experience with:
  - File explorer
  - Terminal
  - Package manager
  - Shareable link
  - Fork/save functionality

---

## Benefits of CodeSandbox Approach

### 1. Professional Environment
- Full-featured IDE
- Better than simple pop-out window
- Users can continue editing

### 2. Shareable
- CodeSandbox generates shareable URL
- Users can save and share their work
- Collaborative editing possible

### 3. No Maintenance
- CodeSandbox handles bundling
- No need to maintain bundler
- Always up-to-date

### 4. Consistent with Sandpack
- Sandpack is built by CodeSandbox
- Natural integration
- Users familiar with CodeSandbox

### 5. Handles Complex Dependencies
- CodeSandbox resolves all npm packages
- Handles transitive dependencies
- Better than iframe approach

---

## Technical Details

### CodeSandbox API

**Endpoint:**
```
POST https://codesandbox.io/api/v1/sandboxes/define
```

**Parameters:**
- `parameters`: Base64-encoded JSON configuration
- Method: POST (handles large payloads better than GET)
- Target: `_blank` (opens in new tab)

**Response:**
- Redirects to new CodeSandbox with project loaded
- URL format: `https://codesandbox.io/s/{sandbox-id}`

### Project Structure

```
sandbox/
├── package.json          # Dependencies
├── public/
│   └── index.html       # HTML template with Tailwind CDN
└── src/
    ├── App.js           # User's artifact code
    └── index.js         # React entry point
```

### Dependencies Included

```json
{
  "react": "^18.3.0",
  "react-dom": "^18.3.0",
  "react-scripts": "^5.0.1",
  // ... plus extracted dependencies from artifact
}
```

---

## Testing

### Test Case 1: Simple React Artifact

**Code:**
```jsx
export default function App() {
  return <div>Hello World</div>;
}
```

**Expected:**
- Uses iframe (no npm imports)
- Pop-out opens in new browser window
- Same as before

### Test Case 2: React with Recharts

**Code:**
```jsx
import { LineChart, Line } from 'recharts';

export default function App() {
  return <LineChart><Line /></LineChart>;
}
```

**Expected:**
- Uses Sandpack (has npm imports)
- Pop-out opens in CodeSandbox
- Recharts dependency included
- Project loads and runs in CodeSandbox

### Test Case 3: Multiple Dependencies

**Code:**
```jsx
import { motion } from 'framer-motion';
import { Calendar } from 'lucide-react';

export default function App() {
  return <motion.div><Calendar /></motion.div>;
}
```

**Expected:**
- Opens in CodeSandbox
- Both dependencies included in package.json
- Project runs without errors

---

## Edge Cases

### Large Artifacts (>10KB)

**Issue:** URL length limits with GET requests  
**Solution:** Using POST with form submission (no URL length limit)

### Invalid Code

**Issue:** Syntax errors in artifact  
**Solution:** CodeSandbox shows error messages (better than our error handling)

### Missing Dependencies

**Issue:** Package not in version map  
**Solution:** CodeSandbox uses `latest` version (may work or fail gracefully)

### Popup Blockers

**Issue:** Browser blocks pop-up  
**Solution:** Show toast message asking user to allow popups

---

## Comparison with Alternatives

### Option 1: Disable Pop-out (Not Chosen)

**Pros:**
- Simple to implement
- No complexity

**Cons:**
- ❌ Bad UX (removes functionality)
- ❌ Users can't view full-screen
- ❌ Inconsistent with other artifacts

### Option 2: Open in CodeSandbox (Chosen) ✅

**Pros:**
- ✅ Better UX than disabling
- ✅ Professional environment
- ✅ Shareable results
- ✅ Low complexity
- ✅ Consistent with Sandpack

**Cons:**
- ⚠️ Requires internet connection
- ⚠️ Opens external site (CodeSandbox)

### Option 3: Generate Standalone HTML (Not Chosen)

**Pros:**
- Self-contained
- No external dependencies

**Cons:**
- ❌ Very complex (need bundler)
- ❌ Large bundle size
- ❌ Maintenance burden
- ❌ May not work for all packages

---

## User Communication

### Toast Messages

```typescript
// Success
toast.success("Opening in CodeSandbox...");

// Error (popup blocked)
toast.error("Popup blocked - please allow popups for this site");
```

### Optional: Add Tooltip

```tsx
<Button
  onClick={handlePopOut}
  title={
    needsSandpack 
      ? "Open in CodeSandbox" 
      : "Open in new window"
  }
>
  <ExternalLink className="size-4" />
</Button>
```

---

## Future Enhancements

### 1. Add "Open in CodeSandbox" Badge

Show badge on Sandpack artifacts:

```tsx
{needsSandpack && (
  <Badge variant="secondary" className="text-xs">
    <ExternalLink className="size-3 mr-1" />
    CodeSandbox
  </Badge>
)}
```

### 2. Remember User Preference

```typescript
// Let users choose: CodeSandbox vs. StackBlitz
const [preferredEditor, setPreferredEditor] = useState('codesandbox');
```

### 3. Add StackBlitz Support

Alternative to CodeSandbox:

```typescript
const handleOpenInStackBlitz = () => {
  // Similar to CodeSandbox but uses StackBlitz API
  // https://developer.stackblitz.com/platform/api/javascript-sdk
};
```

---

## Conclusion

**Implemented Solution:** Open Sandpack artifacts in CodeSandbox

**Benefits:**
- ✅ Better UX than disabling
- ✅ Professional IDE environment
- ✅ Shareable results
- ✅ Low implementation complexity
- ✅ Consistent with Sandpack ecosystem

**Trade-offs:**
- ⚠️ Requires internet (acceptable for npm-based artifacts)
- ⚠️ Opens external site (CodeSandbox is trusted)

**Status:** ✅ Implemented and ready for testing

---

**Last Updated:** 2025-01-05  
**Implementation Time:** 30 minutes  
**Files Modified:** `src/components/Artifact.tsx`

