# System Prompt Improvement Plan
**Date**: 2025-11-04  
**Branch**: `feature/remove-library-approval-merge`  
**Goal**: Align system prompt with Vana's artifact implementation capabilities

---

## Executive Summary

**Current State**: System prompt heavily promotes shadcn/ui (88 lines), which is **technically impossible** in Vana's sandboxed iframe architecture.

**Target State**: System prompt accurately reflects Vana's capabilities (Radix UI + Tailwind) and adopts Claude's best practices where applicable.

**Impact**: Eliminate artifact import errors, improve success rates, better user experience.

---

## Implementation Phases

### Phase 1: CRITICAL - Fix shadcn/ui Mismatch (BLOCKING)
**Priority**: P0 - Must complete before merge  
**Files**: `supabase/functions/chat/index.ts`  
**Estimated Time**: 2-3 hours

### Phase 2: HIGH - Adopt Claude's Best Practices
**Priority**: P1 - Improves quality significantly  
**Files**: `supabase/functions/chat/index.ts`  
**Estimated Time**: 3-4 hours

### Phase 3: MEDIUM - Enhanced Guidance
**Priority**: P2 - Nice to have improvements  
**Files**: `supabase/functions/chat/index.ts`  
**Estimated Time**: 2-3 hours

### Phase 4: LOW - Optional Enhancements
**Priority**: P3 - Future improvements  
**Files**: `supabase/functions/chat/index.ts`, `src/utils/artifactValidator.ts`  
**Estimated Time**: 1-2 hours

---

## Phase 1: CRITICAL - Fix shadcn/ui Mismatch

### Task 1.1: Remove shadcn/ui Promotion
**File**: `supabase/functions/chat/index.ts`  
**Lines**: 447-535 (88 lines to delete)

**Remove:**
- Line 447: `**shadcn/ui** (RECOMMENDED for React components)`
- Lines 448-454: Available components list
- Lines 456-461: shadcn/ui Best Practices section
- Lines 468-528: Common Patterns code examples (60 lines)
- Line 535: `**When building UIs in React, USE shadcn/ui components as your primary choice**`
- Line 540: `**For React artifacts: Prioritize shadcn/ui components for professional, accessible UIs**`
- Line 549: `✓ Professional styling with shadcn/ui or Tailwind`
- Line 580: `❌ Not using shadcn/ui when available for React`
- Line 581: `❌ Creating custom components when shadcn exists`

**Verification:**
```bash
git grep -i "shadcn" supabase/functions/chat/index.ts
# Expected: No matches
```

### Task 1.2: Add Radix UI + Tailwind Guidance
**File**: `supabase/functions/chat/index.ts`  
**Location**: Replace lines 447-535

**Add:**
```markdown
- **Radix UI Primitives** (Available via CDN for React artifacts): Headless UI components
  Available primitives from Radix UI:
  - Dialog, Dropdown Menu, Popover, Tooltip
  - Tabs, Switch, Slider
  - These are the SAME primitives that power shadcn/ui, but loaded via CDN
  
  **Import syntax**: 
  \`\`\`tsx
  import * as Dialog from '@radix-ui/react-dialog'
  import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
  import * as Popover from '@radix-ui/react-popover'
  import * as Tooltip from '@radix-ui/react-tooltip'
  import * as Tabs from '@radix-ui/react-tabs'
  import * as Switch from '@radix-ui/react-switch'
  import * as Slider from '@radix-ui/react-slider'
  \`\`\`
  
  **Styling**: Use Tailwind CSS utility classes for all styling
  
  ⚠️ **CRITICAL RESTRICTION**: 
  - Local imports (\`@/components/ui/*\`, \`@/lib/*\`, \`@/utils/*\`) are NOT available
  - Artifacts run in sandboxed iframes with no access to local project files
  - Use ONLY CDN-loaded libraries listed above
  - shadcn/ui components CANNOT be used (they require local imports)
```

### Task 1.3: Add Radix UI Code Examples
**File**: `supabase/functions/chat/index.ts`  
**Location**: After Radix UI guidance

**Add:**
```markdown
**Radix UI + Tailwind Patterns:**

\`\`\`tsx
// Dialog Example
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'

<Dialog.Root>
  <Dialog.Trigger className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
    Open Dialog
  </Dialog.Trigger>
  <Dialog.Portal>
    <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
    <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 rounded-lg p-6 shadow-xl max-w-md w-full">
      <Dialog.Title className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
        Dialog Title
      </Dialog.Title>
      <Dialog.Description className="text-gray-600 dark:text-gray-300 mb-4">
        Dialog content goes here. Use Tailwind classes for all styling.
      </Dialog.Description>
      <Dialog.Close className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
        <X className="w-5 h-5" />
      </Dialog.Close>
      <div className="flex gap-2 justify-end mt-6">
        <Dialog.Close className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300">
          Cancel
        </Dialog.Close>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Confirm
        </button>
      </div>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>

// Tabs Example
import * as Tabs from '@radix-ui/react-tabs'

<Tabs.Root defaultValue="tab1" className="w-full">
  <Tabs.List className="flex border-b border-gray-200 dark:border-gray-700">
    <Tabs.Trigger 
      value="tab1" 
      className="px-4 py-2 border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 transition"
    >
      Tab 1
    </Tabs.Trigger>
    <Tabs.Trigger 
      value="tab2" 
      className="px-4 py-2 border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 transition"
    >
      Tab 2
    </Tabs.Trigger>
  </Tabs.List>
  <Tabs.Content value="tab1" className="p-4">
    Content for tab 1
  </Tabs.Content>
  <Tabs.Content value="tab2" className="p-4">
    Content for tab 2
  </Tabs.Content>
</Tabs.Root>

// Form with Tailwind (no Radix needed for simple forms)
<form className="space-y-4 max-w-md mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
  <div>
    <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
      Email
    </label>
    <input
      id="email"
      type="email"
      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
    />
  </div>
  <button
    type="submit"
    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition"
  >
    Submit
  </button>
</form>
\`\`\`
```

### Task 1.4: Update Quality Checklist
**File**: `supabase/functions/chat/index.ts`
**Line**: 549

**Change:**
```diff
- ✓ Professional styling with shadcn/ui or Tailwind
+ ✓ Professional styling with Radix UI primitives + Tailwind CSS
```

### Task 1.5: Update Common Pitfalls Section
**File**: `supabase/functions/chat/index.ts`
**Lines**: 580-581

**Change:**
```diff
- ❌ Not using shadcn/ui when available for React
- ❌ Creating custom components when shadcn exists
+ ❌ Attempting to import shadcn/ui components (@/components/ui/*)
+ ❌ Using local imports (@/lib/*, @/utils/*) - not available in artifacts
+ ❌ Not using Radix UI primitives for interactive components
```

### Task 1.6: Verification Tests
**Run after changes:**

```bash
# 1. No shadcn references in system prompt
git grep -i "shadcn" supabase/functions/chat/index.ts
# Expected: No matches

# 2. No @/components/ui references
git grep "@/components/ui" supabase/functions/chat/index.ts
# Expected: No matches

# 3. Radix UI is mentioned
git grep -i "radix" supabase/functions/chat/index.ts
# Expected: Multiple matches

# 4. Critical restriction is present
git grep "Local imports.*NOT available" supabase/functions/chat/index.ts
# Expected: Match found
```

**Success Criteria:**
- [ ] All shadcn/ui references removed
- [ ] Radix UI guidance added with examples
- [ ] Critical restriction warning present
- [ ] Quality checklist updated
- [ ] Common pitfalls updated
- [ ] All verification tests pass

---

## Phase 2: HIGH - Adopt Claude's Best Practices

### Task 2.1: Add Design Principles for Visual Artifacts
**File**: `supabase/functions/chat/index.ts`
**Location**: After artifact type definitions (around line 427)

**Add:**
```markdown
### Design Principles for Visual Artifacts

When creating visual artifacts (HTML, React components, or any UI elements):

**For complex applications (Three.js, games, simulations)**:
- Prioritize functionality, performance, and user experience over visual flair
- Focus on smooth frame rates and responsive controls
- Clear, intuitive user interfaces
- Efficient resource usage and optimized rendering
- Stable, bug-free interactions
- Simple, functional design that doesn't interfere with core experience

**For landing pages, marketing sites, and presentational content**:
- Consider the emotional impact and "wow factor" of the design
- Ask yourself: "Would this make someone stop scrolling and say 'whoa'?"
- Modern users expect visually engaging, interactive experiences that feel alive and dynamic
- Default to contemporary design trends unless specifically asked for something traditional
- Consider: dark modes, glassmorphism, micro-animations, 3D elements, bold typography, vibrant gradients

**General Guidelines**:
- Static designs should be the exception, not the rule
- Include thoughtful animations, hover effects, and interactive elements
- Even subtle movements can dramatically improve user engagement
- When faced with design decisions, lean toward bold and unexpected rather than safe and conventional
- Push the boundaries of what's possible with available technologies
- Use advanced CSS features, complex animations, and creative JavaScript interactions
- Ensure accessibility with proper contrast and semantic markup
- Create functional, working demonstrations rather than placeholders
```

### Task 2.2: Add Update vs Rewrite Guidelines
**File**: `supabase/functions/chat/index.ts`
**Location**: After artifact format section (around line 557)

**Add:**
```markdown
### Updating vs Rewriting Artifacts

**Use \`update\` when:**
- Changing fewer than 20 lines
- Modifying fewer than 5 distinct locations
- Making targeted fixes or small improvements
- You can call \`update\` multiple times to update different parts

**Use \`rewrite\` when:**
- Structural changes are needed
- Modifications would exceed the above thresholds
- Making comprehensive changes across the artifact
- After 4 \`update\` calls (better UX to rewrite once)

**Update Requirements:**
- Must provide both \`old_str\` and \`new_str\`
- Pay special attention to whitespace
- \`old_str\` must be perfectly unique (appear EXACTLY once)
- \`old_str\` must match exactly, including whitespace
- Maintain the same level of quality and detail as original

**Maximum**: 4 \`update\` calls per message. Use \`rewrite\` for further changes.
```

### Task 2.3: Add Artifact Usage Criteria
**File**: `supabase/functions/chat/index.ts`
**Location**: Before artifact type definitions (around line 400)

**Add:**
```markdown
## When to Create Artifacts

**You MUST always use artifacts for:**
- Writing custom code to solve specific user problems (building applications, components, tools)
- Creating data visualizations
- Developing new algorithms
- Generating technical documents/guides meant as reference materials
- Code snippets longer than 20 lines (always create code artifacts)
- Content intended for eventual use outside the conversation (reports, emails, articles, presentations, blog posts)
- Creative writing of any length (stories, poems, essays, narratives, fiction, scripts)
- Structured content users will reference, save, or follow (meal plans, document outlines, workout routines, schedules, study guides)
- Modifying/iterating on content already in an existing artifact
- Content that will be edited, expanded, or reused
- Standalone text-heavy documents longer than 20 lines or 1500 characters

**General Principle**:
If unsure whether to make an artifact, ask: "Will the user want to copy/paste this content outside the conversation?"
If yes, ALWAYS create the artifact.

**Usage Notes:**
- Create artifacts for text over EITHER 20 lines OR 1500 characters
- Shorter text should remain in conversation, except creative writing (always in artifacts)
- For structured reference content (meal plans, workout schedules, study guides), prefer markdown artifacts
- **Strictly limit to one artifact per response** - use the update mechanism for corrections
```

### Task 2.4: Add Concise Variable Naming Guidance
**File**: `supabase/functions/chat/index.ts`
**Location**: In quality standards section (around line 560)

**Add to quality standards:**
```markdown
10. **Concise variable naming** - Use short names for common patterns to maximize content within context limits:
    - Use \`i\`, \`j\`, \`k\` for loop indices
    - Use \`e\` for event parameters
    - Use \`el\` for element references
    - Use \`arr\` for arrays, \`obj\` for objects
    - Balance brevity with readability
```

### Task 2.5: Strengthen CDN Restriction
**File**: `supabase/functions/chat/index.ts`
**Line**: 413 (HTML artifact type section)

**Change:**
```diff
- External scripts can only be imported from https://cdnjs.cloudflare.com
+ **CRITICAL**: External scripts can ONLY be imported from CDN sources
+ Allowed CDNs: cdnjs.cloudflare.com, unpkg.com, jsdelivr.net, d3js.org
+ This is a security requirement - artifacts run in sandboxed iframes
+ No local file access or arbitrary external scripts allowed
```

### Task 2.6: Add localStorage Warning Header
**File**: `supabase/functions/chat/index.ts`
**Location**: Before artifact types section (around line 398)

**Add:**
```markdown
## CRITICAL BROWSER STORAGE RESTRICTION

**NEVER use localStorage, sessionStorage, or ANY browser storage APIs in artifacts.**
These APIs are NOT supported and will cause artifacts to fail in the sandboxed environment.

**Instead, you MUST:**
- Use React state (useState, useReducer) for React components
- Use JavaScript variables or objects for HTML artifacts
- Store all data in memory during the session

**Exception**:
If a user explicitly requests localStorage/sessionStorage usage, explain that these APIs are not supported in artifacts and will cause the artifact to fail. Offer to implement the functionality using in-memory storage instead, or suggest they copy the code to use in their own environment where browser storage is available.
```

**Success Criteria:**
- [ ] Design principles added
- [ ] Update/rewrite guidelines added
- [ ] Artifact usage criteria added
- [ ] Concise variable naming guidance added
- [ ] CDN restriction strengthened
- [ ] localStorage warning header added

---

## Phase 3: MEDIUM - Enhanced Guidance

### Task 3.1: Add File Reading API Documentation
**File**: `supabase/functions/chat/index.ts`
**Location**: After artifact examples section

**Add:**
```markdown
## Reading Files

Users may upload files to the conversation. Access them programmatically using the \`window.fs.readFile\` API.

**API Details:**
- Works similarly to Node.js fs/promises readFile function
- Accepts a filepath and returns data as uint8Array by default
- Optional encoding parameter: \`window.fs.readFile($filepath, { encoding: 'utf8'})\` returns utf8 string
- Filename must be used EXACTLY as provided in \`<source>\` tags
- Always include error handling when reading files

**Example:**
\`\`\`javascript
try {
  const data = await window.fs.readFile('data.csv', { encoding: 'utf8' });
  console.log('File contents:', data);
} catch (error) {
  console.error('Failed to read file:', error);
}
\`\`\`
```

### Task 3.2: Add CSV Handling Best Practices
**File**: `supabase/functions/chat/index.ts`
**Location**: After file reading section

**Add:**
```markdown
## Manipulating CSVs

When working with uploaded CSVs, follow these guidelines:

**Parsing:**
- Always use Papaparse to parse CSVs
- Use robust parsing options: \`dynamicTyping\`, \`skipEmptyLines\`, \`delimitersToGuess\`
- CSVs can be finicky - prioritize robust parsing

**Headers:**
- One of the biggest challenges is processing headers correctly
- Always strip whitespace from headers
- Be careful when working with headers

**Computations:**
- Use lodash for CSV computations (groupby, etc.)
- If appropriate lodash functions exist, use them - DO NOT write your own
- Always handle potential undefined values, even for expected columns

**Example:**
\`\`\`javascript
import Papa from 'papaparse'
import _ from 'lodash'

const results = Papa.parse(csvData, {
  header: true,
  dynamicTyping: true,
  skipEmptyLines: true,
  delimitersToGuess: [',', '\t', '|', ';']
});

// Clean headers
const cleanedData = results.data.map(row => {
  const cleanRow = {};
  Object.keys(row).forEach(key => {
    cleanRow[key.trim()] = row[key];
  });
  return cleanRow;
});

// Group by using lodash
const grouped = _.groupBy(cleanedData, 'category');
\`\`\`
```

### Task 3.3: Add Three.js Version Warnings
**File**: `supabase/functions/chat/index.ts`
**Line**: 444 (Three.js section)

**Enhance:**
```diff
  - Three.js (r128): \`import * as THREE from 'three'\`
    - Example imports like THREE.OrbitControls won't work as they aren't hosted on Cloudflare CDN
    - Correct script URL is https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js
-   - IMPORTANT: Do NOT use THREE.CapsuleGeometry (introduced in r142). Use alternatives like CylinderGeometry, SphereGeometry, or create custom geometries
+   - **CRITICAL VERSION CONSTRAINTS**:
+     - Do NOT use THREE.CapsuleGeometry (introduced in r142)
+     - Do NOT use THREE.RoundedBoxGeometry (not in r128)
+     - Do NOT use newer features from r140+
+     - Use alternatives: CylinderGeometry, SphereGeometry, BoxGeometry, or create custom geometries
+     - If you need newer features, explain to user that Three.js r128 is the available version
```

### Task 3.4: Expand Common Libraries Section
**File**: `supabase/functions/chat/index.ts`
**Lines**: 587-599 (Common Libraries via CDN)

**Enhance with more libraries:**
```markdown
## Common Libraries via CDN

**Always Available:**
- Tailwind CSS is automatically available for HTML artifacts - no need to include it

**Data Visualization:**
- Chart.js: \`<script src="https://cdn.jsdelivr.net/npm/chart.js@4"></script>\`
- D3.js: \`<script src="https://d3js.org/d3.v7.min.js"></script>\`
- Plotly: \`<script src="https://cdn.plot.ly/plotly-2.27.0.min.js"></script>\`

**3D Graphics:**
- Three.js: \`<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js"></script>\`

**Animation:**
- GSAP: \`<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js"></script>\`
- Anime.js: \`<script src="https://cdn.jsdelivr.net/npm/animejs@3.2.1/lib/anime.min.js"></script>\`
- Lottie: \`<script src="https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.2/lottie.min.js"></script>\`

**Creative Coding:**
- p5.js: \`<script src="https://cdn.jsdelivr.net/npm/p5@1.9.0/lib/p5.min.js"></script>\`
- Particles: \`<script src="https://cdn.jsdelivr.net/npm/tsparticles@3/tsparticles.bundle.min.js"></script>\`

**UI Frameworks:**
- Alpine.js: \`<script src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>\`

**Canvas Libraries:**
- Fabric.js: \`<script src="https://cdn.jsdelivr.net/npm/fabric@5.3.0/dist/fabric.min.js"></script>\`
- Konva: \`<script src="https://cdn.jsdelivr.net/npm/konva@9.2.3/konva.min.js"></script>\`
- PixiJS: \`<script src="https://cdn.jsdelivr.net/npm/pixi.js@7.3.2/dist/pixi.min.js"></script>\`

**Maps:**
- Leaflet: \`<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>\`
  \`<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />\`

**Utilities:**
- Moment.js: \`<script src="https://cdn.jsdelivr.net/npm/moment@2.30.1/moment.min.js"></script>\`
- Axios: \`<script src="https://cdn.jsdelivr.net/npm/axios@1.6.5/dist/axios.min.js"></script>\`
- Lodash: \`<script src="https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js"></script>\`

**Syntax Highlighting:**
- Highlight.js: \`<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>\`
  \`<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/default.min.css" />\`

**Icons:**
- Feather Icons: \`<script src="https://cdn.jsdelivr.net/npm/feather-icons@4.29.1/dist/feather.min.js"></script>\`
- Phosphor Icons: \`<script src="https://unpkg.com/@phosphor-icons/web@2.0.3"></script>\`

**Note**: These are auto-injected when detected in HTML artifacts. For React artifacts, use the pre-loaded libraries listed in the React section.
```

**Success Criteria:**
- [ ] File reading API documented
- [ ] CSV handling best practices added
- [ ] Three.js version warnings enhanced
- [ ] Common libraries section expanded

---

## Phase 4: LOW - Optional Enhancements

### Task 4.1: Update Artifact Validator
**File**: `src/utils/artifactValidator.ts`
**Lines**: 249-263

**Remove shadcn validation:**
```typescript
// REMOVE THIS ENTIRE BLOCK:
// Check for shadcn imports without proper path
const shadcnPattern = /import\s+\{[^}]+\}\s+from\s+['"]@\/components\/ui\/([^'"]+)['"]/g;
const shadcnComponents = ['button', 'card', 'alert', 'badge', 'input', 'label', 'dialog', 'tabs', 'accordion'];
let shadcnMatch;

while ((shadcnMatch = shadcnPattern.exec(content)) !== null) {
  const componentPath = shadcnMatch[1];
  if (!shadcnComponents.includes(componentPath)) {
    warnings.push({
      type: 'best-practice',
      message: `Importing from @/components/ui/${componentPath} - verify component exists`,
      suggestion: 'Only use available shadcn/ui components'
    });
  }
}
```

**Add local import error:**
```typescript
// Check for local imports (not available in artifacts)
const localImportPattern = /@\/(components|lib|utils)\//;
if (localImportPattern.test(content)) {
  errors.push({
    type: 'structure',
    message: 'Local imports (@/components/*, @/lib/*, @/utils/*) are not available in artifacts',
    severity: 'high'
  });
  warnings.push({
    type: 'best-practice',
    message: 'Use Radix UI primitives with Tailwind CSS instead',
    suggestion: 'Import from @radix-ui/react-* packages (e.g., @radix-ui/react-dialog)'
  });
}
```

### Task 4.2: Add Artifact Templates Documentation
**File**: `src/constants/artifactTemplates.ts`
**Action**: Review and update if it contains shadcn examples

**Check:**
```bash
git grep -i "shadcn\|@/components/ui" src/constants/artifactTemplates.ts
```

**If matches found**, update examples to use Radix UI + Tailwind instead.

### Task 4.3: Add System Prompt Version Tracking
**File**: `supabase/functions/chat/index.ts`
**Location**: Top of artifact instructions section

**Add:**
```markdown
<!-- System Prompt Version: 2.0.0 -->
<!-- Last Updated: 2025-11-04 -->
<!-- Changes: Removed shadcn/ui, added Radix UI + Tailwind, adopted Claude best practices -->
```

**Success Criteria:**
- [ ] Artifact validator updated
- [ ] Artifact templates reviewed/updated
- [ ] Version tracking added

---

## Testing & Verification

### Pre-Merge Checklist

**Code Quality:**
- [ ] All Phase 1 tasks complete (CRITICAL)
- [ ] No shadcn/ui references in system prompt
- [ ] Radix UI guidance present with examples
- [ ] Critical restriction warning present
- [ ] All verification commands pass

**Documentation:**
- [ ] CLAUDE.md matches system prompt
- [ ] Both documents explain shadcn/ui is NOT available
- [ ] Both documents recommend Radix UI primitives
- [ ] Library lists are consistent

**Testing:**
- [ ] Generate test artifact: "Create a form with a submit button"
  - Should use Tailwind, NOT shadcn/ui
- [ ] Generate test artifact: "Create a dialog component"
  - Should use Radix UI Dialog, NOT shadcn/ui Dialog
- [ ] Generate test artifact: "Create a tabs component"
  - Should use Radix UI Tabs, NOT shadcn/ui Tabs
- [ ] Verify no import errors in generated artifacts
- [ ] Verify artifacts render correctly

### Post-Merge Monitoring

**Week 1:**
- Monitor artifact error rates
- Track import error frequency
- Collect user feedback

**Week 2:**
- Analyze artifact success rates
- Identify common patterns
- Adjust guidance if needed

---

## Rollback Plan

If issues arise after merge:

1. **Immediate**: Revert system prompt changes
   ```bash
   git revert <commit-hash>
   git push origin feature/remove-library-approval-merge
   ```

2. **Investigate**: Review error logs and user reports

3. **Fix**: Address specific issues

4. **Re-deploy**: Test thoroughly before re-merging

---

## Success Metrics

**Target Improvements:**
- 90%+ reduction in artifact import errors
- 50%+ increase in artifact success rate on first generation
- Zero shadcn/ui import errors
- Positive user feedback on artifact quality

**Tracking:**
- Monitor error logs for import errors
- Track artifact regeneration requests
- User satisfaction surveys
- Support ticket volume

---

## Timeline

**Phase 1 (CRITICAL)**: 1 day
**Phase 2 (HIGH)**: 1-2 days
**Phase 3 (MEDIUM)**: 1 day
**Phase 4 (LOW)**: 0.5 days

**Total Estimated Time**: 3.5-4.5 days

**Recommended Approach**: Complete Phase 1, test thoroughly, then proceed with Phase 2-4 in subsequent iterations.

