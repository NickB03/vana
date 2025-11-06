# Sandpack Integration Implementation Plan

## Overview
Complete integration of Sandpack for React artifacts to support npm package imports, resolving the current limitation where AI-generated code with `import` statements fails in the iframe-based renderer.

## Current State Analysis

### What Works
- ✅ Kibo UI Sandbox installed (`@codesandbox/sandpack-react@2.20.0`)
- ✅ `src/components/kibo-ui/sandbox/index.tsx` wrapper components available
- ✅ `src/utils/npmDetection.ts` utility for detecting npm imports
- ✅ Iframe-based rendering for simple HTML/CSS/JS artifacts
- ✅ Dev server running without errors at http://localhost:8081

### Current Problem
- ❌ React artifacts with `import` statements fail with "require is not defined"
- ❌ AI generates modern ES6 code with imports (incompatible with iframe)
- ❌ Radix UI imports in system prompt cause runtime errors
- ❌ No proper bundler to resolve npm dependencies

### Architecture Context
- **Production**: Lovable Cloud manages Supabase (xfwlneedhqealtktaacv)
- **Development**: Local Supabase project (vana-dev - vznhbocnuykdmjvujaka)
- **Deployment**: GitHub integration for Edge Functions, Lovable for hosting
- **Repository**: https://github.com/NickB03/llm-chat-site

---

## Phase 1: Sandpack Integration (Frontend)

### Task 1.1: Create SandpackContainer Component
**File**: `src/components/SandpackContainer.tsx`

**Requirements**:
- No lazy loading (causes context issues)
- Proper provider hierarchy: `SandboxProvider` → `SandboxLayout` → `SandboxPreview`
- Accept props: `code`, `title`, `dependencies`, `showEditor`, `onError`, `onReady`
- Theme synchronization with app theme (light/dark)
- Loading skeleton during initialization
- Error boundary for graceful failure

**Implementation Pattern**:
```typescript
interface SandpackContainerProps {
  code: string;
  title: string;
  dependencies?: Record<string, string>;
  showEditor?: boolean;
  onError?: (error: string) => void;
  onReady?: () => void;
}

export function SandpackContainer({ code, dependencies, ... }: SandpackContainerProps) {
  // Extract dependencies from code if not provided
  const deps = dependencies || extractNpmDependencies(code);
  
  return (
    <SandboxProvider
      template="react"
      files={{
        '/App.js': { code, active: true },
        '/index.js': { code: '...', hidden: true }
      }}
      customSetup={{
        dependencies: { react: '^18.3.0', 'react-dom': '^18.3.0', ...deps }
      }}
      options={{
        externalResources: ['https://cdn.tailwindcss.com'],
        autorun: true,
        recompileMode: 'delayed',
        recompileDelay: 300
      }}
    >
      <SandboxLayout>
        {showEditor ? <SandboxCodeEditor /> : <SandboxPreview />}
      </SandboxLayout>
    </SandboxProvider>
  );
}
```

### Task 1.2: Modify Artifact.tsx for Hybrid Rendering
**File**: `src/components/Artifact.tsx`

**Changes Required**:
1. Import `SandpackContainer` (NOT lazy loaded)
2. Import `detectNpmImports` from `@/utils/npmDetection`
3. Add `useMemo` hook to determine if Sandpack is needed:
   ```typescript
   const needsSandpack = useMemo(() => {
     if (artifact.type !== 'react') return false;
     const sandpackEnabled = import.meta.env.VITE_ENABLE_SANDPACK !== 'false';
     if (!sandpackEnabled) return false;
     return detectNpmImports(artifact.content);
   }, [artifact.content, artifact.type]);
   ```

4. Update `renderPreview()` to conditionally render Sandpack:
   ```typescript
   if (artifact.type === "react" && needsSandpack) {
     return <SandpackContainer code={artifact.content} title={artifact.title} />;
   }
   // ... existing iframe logic
   ```

5. Update `renderCode()` for edit mode with Sandpack editor
6. Update `handlePopOut()` to handle Sandpack artifacts (open in CodeSandbox)

### Task 1.3: Environment Configuration
**File**: `.env` (add to .env.example)

```env
# Sandpack Integration
VITE_ENABLE_SANDPACK=true
```

### Task 1.4: Testing Artifacts
Create test cases in the chat interface:

**Test 1: Simple React (should use iframe)**
```javascript
function App() {
  const [count, setCount] = React.useState(0);
  return <button onClick={() => setCount(count + 1)}>Count: {count}</button>;
}
```

**Test 2: React with Recharts (should use Sandpack)**
```javascript
import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function App() {
  const [data] = useState([
    { name: 'Mon', value: 400 },
    { name: 'Tue', value: 300 },
  ]);
  
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="value" stroke="#8884d8" />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

**Test 3: Multiple Dependencies**
```javascript
import { useState } from 'react';
import { Calendar } from 'lucide-react';
import { format } from 'date-fns';

export default function App() {
  const [date] = useState(new Date());
  return (
    <div className="p-4">
      <Calendar className="w-6 h-6" />
      <p>{format(date, 'PPP')}</p>
    </div>
  );
}
```

---

## Phase 2: AI System Prompt Updates (Edge Functions)

### Task 2.1: Update Chat Edge Function
**File**: `supabase/functions/chat/index.ts`

**Location**: System prompt section (around lines 450-600)

**Changes**:
1. **Remove** entire Radix UI documentation section (lines ~454-559)
2. **Add** new section: "React Artifacts with NPM Packages"

**New Content to Add**:
```markdown
### React Artifacts with NPM Package Support

React artifacts now support importing npm packages directly. Use standard ES6 import syntax.

**Supported Packages & Import Examples**:
```javascript
// React Core (always available)
import { useState, useEffect, useReducer, useRef, useMemo, useCallback } from 'react';

// Charts & Visualization
import { LineChart, BarChart, PieChart, Line, Bar, Pie, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import * as d3 from 'd3';

// Icons
import { Calendar, User, Settings, ChevronRight } from 'lucide-react';

// Animation
import { motion } from 'framer-motion';

// Utilities
import { format, addDays, subDays } from 'date-fns';
import _ from 'lodash';

// State Management
import create from 'zustand';

// UI Primitives (Radix UI)
import * as Dialog from '@radix-ui/react-dialog';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as Tabs from '@radix-ui/react-tabs';
```

**Component Structure**:
- Always export a default component
- Use functional components with hooks
- Tailwind CSS is available via CDN

**Example**:
```javascript
import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis } from 'recharts';

export default function Dashboard() {
  const [data, setData] = useState([...]);
  return <LineChart data={data}>...</LineChart>;
}
```
```

3. **Update** guidance sections to reference npm imports instead of globals
4. **Remove** warnings about avoiding imports or using global objects

### Task 2.2: Update Intent Detector
**File**: `supabase/functions/chat/intent-detector.ts`

**Change** (line ~464):
```typescript
// OLD
- Use native HTML elements + Tailwind CSS for UI components

// NEW
+ Use React with npm imports for UI components (recharts, lucide-react, @radix-ui/*)
```

---

## Phase 3: Production Deployment

### Task 3.1: Verify GitHub Integration
**Action Items**:
1. Check if Lovable GitHub integration is configured:
   - Visit Lovable dashboard
   - Navigate to project settings
   - Verify GitHub repository connection
   - Check if auto-deploy is enabled for Edge Functions

2. If not configured:
   - Follow Lovable documentation to connect GitHub
   - Enable auto-deploy for `supabase/functions/` directory

### Task 3.2: Deploy Edge Functions
**Steps**:
1. Commit Edge Function changes:
   ```bash
   git add supabase/functions/chat/index.ts supabase/functions/chat/intent-detector.ts
   git commit -m "feat(ai): add npm package import support for React artifacts"
   ```

2. Push to GitHub:
   ```bash
   git push origin main
   ```

3. Monitor deployment:
   - Check Lovable dashboard for deployment status
   - Verify Edge Function version updated in Supabase dashboard
   - Check logs: `https://supabase.com/dashboard/project/xfwlneedhqealtktaacv/logs`

4. Alternative (if auto-deploy not available):
   - Use Lovable interface to prompt: "Deploy the updated chat Edge Function with npm import support"
   - Or manually update via Supabase dashboard

### Task 3.3: Deploy Frontend
**Steps**:
1. Build verification:
   ```bash
   npm run build
   ```

2. Check bundle size:
   ```bash
   ls -lh dist/assets/*.js
   ```
   - Expected increase: ~200-250KB for Sandpack
   - Verify total bundle < 1MB

3. Deploy via Lovable (current hosting):
   - Commit frontend changes
   - Push to GitHub
   - Lovable auto-deploys frontend

---

## Phase 4: Testing & Verification

### Task 4.1: End-to-End Testing
**Test Flow**:
1. Open production app
2. Create new chat session
3. Prompt: "Create a workout tracking app with a chart showing progress over time"
4. Verify:
   - ✅ AI generates code with `import` statements
   - ✅ Artifact renders without errors
   - ✅ Chart displays correctly
   - ✅ No console errors

### Task 4.2: Pop-out Testing
**Test Cases**:
1. Simple React artifact → Should open in new window (iframe)
2. Sandpack artifact → Should open in CodeSandbox
3. Verify dependencies load in CodeSandbox

### Task 4.3: Browser Compatibility
**Test Matrix**:
| Browser | Version | Simple React | Sandpack | Pop-out |
|---------|---------|--------------|----------|---------|
| Chrome  | Latest  | ✅           | ✅       | ✅      |
| Firefox | Latest  | ✅           | ✅       | ✅      |
| Safari  | Latest  | ✅           | ✅       | ✅      |
| Edge    | Latest  | ✅           | ✅       | ✅      |

### Task 4.4: AI Code Generation Verification
**Test Prompts**:
1. "Create a dashboard with multiple charts"
2. "Build a todo app with date-fns for formatting"
3. "Make an animated card component with framer-motion"
4. "Create a dialog component using Radix UI"

**Verify**:
- AI uses correct import syntax
- All imports resolve successfully
- No "require is not defined" errors

---

## Success Criteria

### Must Have
- [ ] React artifacts with npm imports render without errors
- [ ] AI generates code with proper import statements
- [ ] No regression in iframe-based artifacts
- [ ] Feature flag allows instant disable
- [ ] Production Edge Functions deployed successfully

### Should Have
- [ ] Bundle size increase < 250KB
- [ ] Pop-out works for both iframe and Sandpack
- [ ] Loading states display correctly
- [ ] Error messages are user-friendly

### Nice to Have
- [ ] Theme synchronization works perfectly
- [ ] Edit mode supports Sandpack editor
- [ ] Performance metrics show no degradation

---

## Rollback Plan

### Immediate Rollback (< 5 minutes)
1. Set environment variable:
   ```env
   VITE_ENABLE_SANDPACK=false
   ```
2. Redeploy frontend

### Full Rollback (< 30 minutes)
1. Revert Edge Function changes:
   ```bash
   git revert <commit-hash>
   git push origin main
   ```
2. Revert frontend changes:
   ```bash
   git revert <commit-hash>
   git push origin main
   ```

### Emergency Rollback
- Lovable dashboard: Rollback to previous deployment
- Supabase dashboard: Revert Edge Function to previous version

---

## Known Limitations

1. **Offline Support**: Sandpack requires internet for first load (caches after)
2. **Bundle Size**: Adds ~200KB to initial bundle
3. **Package Versions**: Fixed versions in `npmDetection.ts` version map
4. **Unsupported Packages**: Only whitelisted packages work
5. **Pop-out Complexity**: Sandpack artifacts open in CodeSandbox (not new window)

---

## Additional Resources

- **Sandpack Docs**: https://sandpack.codesandbox.io/
- **Kibo UI Sandbox**: Installed at `src/components/kibo-ui/sandbox/`
- **NPM Detection**: `src/utils/npmDetection.ts`
- **Existing Implementation**: Previous attempt files available in git history

---

## Estimated Timeline

| Phase | Tasks | Time Estimate |
|-------|-------|---------------|
| Phase 1 | Frontend Integration | 2-3 hours |
| Phase 2 | Edge Function Updates | 1-2 hours |
| Phase 3 | Production Deployment | 1 hour |
| Phase 4 | Testing & Verification | 2-3 hours |
| **Total** | | **6-9 hours** |

---

## Next Steps for Implementation

1. Start with Phase 1, Task 1.1 (SandpackContainer component)
2. Test locally before proceeding to Phase 2
3. Deploy Edge Functions before frontend (AI needs to generate compatible code)
4. Use feature flag for gradual rollout
5. Monitor error logs closely during first 24 hours

---

*Last Updated: 2025-11-06*
*Created by: AI Assistant (Conversation Summary)*

