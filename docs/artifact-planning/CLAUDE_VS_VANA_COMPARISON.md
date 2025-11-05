# Claude vs Vana: Artifact System Comparison
**Date**: 2025-11-04  
**Purpose**: Identify what Vana should adopt from Claude's official prompt

---

## High-Level Comparison

| Aspect | Claude | Vana (Current) | Vana (Recommended) |
|--------|--------|----------------|-------------------|
| **shadcn/ui** | Listed (1 line, neutral) | Heavily promoted (88 lines) | ❌ Remove entirely |
| **Radix UI** | Not mentioned | ✅ Pre-loaded (feature branch) | ✅ Promote in prompt |
| **Design principles** | ✅ Detailed guidance | ❌ Missing | ✅ Adopt from Claude |
| **Update/rewrite rules** | ✅ Clear guidelines | ❌ Missing | ✅ Adopt from Claude |
| **Artifact criteria** | ✅ When to create | ❌ Missing | ✅ Adopt from Claude |
| **localStorage warning** | ✅ Prominent header | ⚠️ Mentioned briefly | ✅ Adopt Claude's header |
| **CDN restrictions** | ✅ Strict (cdnjs only) | ⚠️ Multiple CDNs | ⚠️ Keep Vana's (more permissive) |
| **Library count** | ~13 listed | ✅ 25+ pre-loaded | ✅ Keep Vana's (superior) |

---

## Detailed Feature Comparison

### 1. Design Principles

**Claude's Approach:**
```markdown
For complex applications (Three.js, games, simulations):
- Prioritize functionality, performance, and user experience
- Focus on smooth frame rates and responsive controls
- Simple, functional design that doesn't interfere

For landing pages, marketing sites, presentational content:
- Consider emotional impact and "wow factor"
- Ask: "Would this make someone stop scrolling and say 'whoa'?"
- Default to contemporary design trends
- Dark modes, glassmorphism, micro-animations, 3D elements
- Static designs should be the exception, not the rule
```

**Vana's Current State:**
- ❌ No design principles section

**Recommendation:**
- ✅ **Adopt Claude's design principles** - Excellent guidance for visual quality

---

### 2. shadcn/ui Handling

**Claude's Approach:**
```markdown
- shadcn/ui: `import { Alert, AlertDescription } from '@/components/ui/alert'` (mention to user if used)
```
- 1 line, neutral tone
- No promotion or examples
- Note: "(mention to user if used)" suggests it's problematic

**Vana's Current State:**
```markdown
- **shadcn/ui** (RECOMMENDED for React components): Modern, accessible component library
  Available components to import from '@/components/ui/':
  - Layout & Structure: Card, Separator, Accordion, Tabs, Collapsible
  - Forms: Button, Input, Label, Textarea, Select, Checkbox, Switch, Radio Group, Slider
  [... 88 lines total ...]
  
  **When building UIs in React, USE shadcn/ui components as your primary choice**
```
- 88 lines of promotion
- "RECOMMENDED", "Always prefer", "USE as primary choice"
- Detailed examples and best practices

**Technical Reality:**
- ❌ **Neither Claude nor Vana can support shadcn/ui** in sandboxed iframes
- Local imports (`@/components/ui/*`) don't work without module bundler
- Both systems use sandboxed rendering

**Recommendation:**
- ✅ **Remove all shadcn/ui promotion** (88 lines)
- ✅ **Add explicit warning**: "Local imports are NOT available"
- ✅ **Promote Radix UI + Tailwind** (what actually works)

---

### 3. UI Component Libraries

**Claude's Approach:**
```markdown
- lucide-react: `import { Camera } from 'lucide-react'`
- recharts: `import { LineChart, XAxis, YAxis, CartesianGrid, Line } from 'recharts'`
- NO mention of Radix UI
```

**Vana's Implementation (Feature Branch):**
```html
<!-- Pre-loaded in React artifacts: -->
<script src="https://unpkg.com/lucide-react@0.263.1/dist/umd/lucide-react.js"></script>
<script src="https://unpkg.com/recharts@2.5.0/dist/Recharts.js"></script>
<script src="https://unpkg.com/@radix-ui/react-dialog@1.0.5/dist/index.umd.js"></script>
<script src="https://unpkg.com/@radix-ui/react-dropdown-menu@2.0.6/dist/index.umd.js"></script>
<script src="https://unpkg.com/@radix-ui/react-popover@1.0.7/dist/index.umd.js"></script>
<script src="https://unpkg.com/@radix-ui/react-tooltip@1.0.7/dist/index.umd.js"></script>
<script src="https://unpkg.com/@radix-ui/react-tabs@1.0.4/dist/index.umd.js"></script>
<script src="https://unpkg.com/@radix-ui/react-switch@1.0.3/dist/index.umd.js"></script>
<script src="https://unpkg.com/@radix-ui/react-slider@1.1.2/dist/index.umd.js"></script>
<!-- + 18 more libraries -->
```

**Recommendation:**
- ✅ **Vana's implementation is SUPERIOR** (25+ libraries vs Claude's ~13)
- ✅ **Update system prompt to match implementation**
- ✅ **Promote Radix UI primitives** (not mentioned by Claude but pre-loaded by Vana)

---

### 4. Update vs Rewrite Guidelines

**Claude's Approach:**
```markdown
Use `update` when:
- Changing fewer than 20 lines
- Modifying fewer than 5 distinct locations
- You can call `update` multiple times

Use `rewrite` when:
- Structural changes are needed
- Modifications would exceed the above thresholds
- After 4 `update` calls (better UX to rewrite once)

Update Requirements:
- Must provide both `old_str` and `new_str`
- Pay special attention to whitespace
- `old_str` must be perfectly unique (appear EXACTLY once)

Maximum: 4 `update` calls per message
```

**Vana's Current State:**
- ❌ No update/rewrite guidelines

**Recommendation:**
- ✅ **Adopt Claude's guidelines** - Clear, practical rules

---

### 5. Artifact Usage Criteria

**Claude's Approach:**
```markdown
You MUST always use artifacts for:
- Writing custom code to solve specific user problems
- Creating data visualizations
- Developing new algorithms
- Technical documents/guides meant as reference materials
- Code snippets longer than 20 lines
- Content intended for eventual use outside conversation
- Creative writing of any length
- Structured content users will reference (meal plans, workout routines, study guides)
- Modifying/iterating on content already in an existing artifact

General Principle:
If unsure, ask: "Will the user want to copy/paste this content outside the conversation?"
If yes, ALWAYS create the artifact.

Strictly limit to one artifact per response
```

**Vana's Current State:**
- ⚠️ Basic guidance, not comprehensive

**Recommendation:**
- ✅ **Adopt Claude's comprehensive criteria** - Clearer decision-making

---

### 6. localStorage Restriction

**Claude's Approach:**
```markdown
## CRITICAL BROWSER STORAGE RESTRICTION

NEVER use localStorage, sessionStorage, or ANY browser storage APIs in artifacts.
These APIs are NOT supported and will cause artifacts to fail.

Instead, you MUST:
- Use React state (useState, useReducer) for React components
- Use JavaScript variables or objects for HTML artifacts
- Store all data in memory during the session

Exception:
If a user explicitly requests localStorage/sessionStorage usage, explain that these APIs 
are not supported in artifacts and will cause the artifact to fail.
```

**Vana's Current State:**
```markdown
- localStorage/sessionStorage are not available in the sandboxed environment
```
- Brief mention, not prominent

**Recommendation:**
- ✅ **Adopt Claude's prominent header** - Critical restriction deserves emphasis

---

### 7. CDN Restrictions

**Claude's Approach:**
```markdown
The only place external scripts can be imported from is https://cdnjs.cloudflare.com

NO OTHER LIBRARIES ARE INSTALLED OR ABLE TO BE IMPORTED
```
- Very strict, single CDN only

**Vana's Implementation:**
```html
<!-- Uses multiple CDNs: -->
<script src="https://unpkg.com/react@18/..."></script>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4..."></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/lodash.js/..."></script>
<script src="https://d3js.org/d3.v7.min.js"></script>
<script src="https://cdn.plot.ly/plotly-2.27.0.min.js"></script>
```

**Recommendation:**
- ✅ **Keep Vana's approach** (more permissive, more libraries available)
- ✅ **Document allowed CDNs**: unpkg, jsdelivr, cdnjs, d3js.org, plot.ly
- ⚠️ **Add security note**: "Artifacts run in sandboxed iframes for security"

---

### 8. Concise Variable Naming

**Claude's Approach:**
```markdown
Use concise variable names to maximize content within context limits:
- Use `i`, `j`, `k` for loop indices
- Use `e` for event parameters
- Use `el` for element references
- Balance brevity with readability
```

**Vana's Current State:**
- ❌ No guidance on variable naming

**Recommendation:**
- ✅ **Adopt Claude's guidance** - Practical optimization tip

---

### 9. Three.js Version Constraints

**Claude's Approach:**
- No specific version warnings

**Vana's Current State:**
```markdown
- IMPORTANT: Do NOT use THREE.CapsuleGeometry (introduced in r142)
```
- Basic warning for one feature

**Recommendation:**
- ✅ **Expand Vana's warnings** - List all unavailable features from newer versions
- Add: RoundedBoxGeometry, features from r140+
- Explain version constraint (r128 available)

---

### 10. File Reading API

**Claude's Approach:**
```markdown
Users may upload files to the conversation. Access them programmatically using 
the `window.fs.readFile` API.

API Details:
- Works similarly to Node.js fs/promises readFile function
- Accepts a filepath and returns data as uint8Array by default
- Optional encoding parameter: `window.fs.readFile($filepath, { encoding: 'utf8'})`
- Filename must be used EXACTLY as provided in `<source>` tags
- Always include error handling when reading files
```

**Vana's Current State:**
- ❌ No file reading API documentation

**Recommendation:**
- ⚠️ **Only adopt if Vana supports file uploads** - Check if this feature exists
- If yes, adopt Claude's documentation

---

### 11. CSV Handling

**Claude's Approach:**
```markdown
When working with uploaded CSVs:

Parsing:
- Always use Papaparse to parse CSVs
- Use robust parsing options: `dynamicTyping`, `skipEmptyLines`, `delimitersToGuess`

Headers:
- One of the biggest challenges is processing headers correctly
- Always strip whitespace from headers

Computations:
- Use lodash for CSV computations (groupby, etc.)
- If appropriate lodash functions exist, use them - DO NOT write your own
- Always handle potential undefined values
```

**Vana's Current State:**
- ❌ No CSV handling guidance

**Recommendation:**
- ✅ **Adopt Claude's CSV guidance** - Practical best practices

---

## Priority Recommendations

### P0 - CRITICAL (Must Do)
1. ✅ **Remove shadcn/ui promotion** (88 lines) - Contradicts technical capabilities
2. ✅ **Add Radix UI + Tailwind guidance** - What actually works
3. ✅ **Add critical restriction warning** - Local imports NOT available

### P1 - HIGH (Should Do)
4. ✅ **Adopt design principles** - Improves visual quality
5. ✅ **Adopt update/rewrite guidelines** - Better UX
6. ✅ **Adopt artifact usage criteria** - Clearer decision-making
7. ✅ **Adopt localStorage header** - Critical restriction
8. ✅ **Adopt concise variable naming** - Practical optimization

### P2 - MEDIUM (Nice to Have)
9. ✅ **Adopt CSV handling guidance** - Practical best practices
10. ✅ **Expand Three.js warnings** - Prevent common errors
11. ⚠️ **Check file reading API** - Only if Vana supports uploads

### P3 - LOW (Optional)
12. ⚠️ **Consider CDN restriction** - Vana's approach is fine (more permissive)

---

## What Vana Should NOT Adopt

### 1. Claude's CDN Restriction
- **Claude**: cdnjs.cloudflare.com only
- **Vana**: Multiple CDNs (unpkg, jsdelivr, cdnjs, d3js.org, plot.ly)
- **Verdict**: Keep Vana's approach (more libraries available)

### 2. Claude's shadcn/ui Listing
- **Claude**: Lists shadcn/ui (likely doesn't work)
- **Vana**: Should NOT list shadcn/ui (doesn't work)
- **Verdict**: Vana should be honest about limitations

---

## Summary

**Vana's Strengths:**
- ✅ More libraries pre-loaded (25+ vs ~13)
- ✅ Radix UI primitives available
- ✅ More permissive CDN policy
- ✅ Honest implementation (feature branch)

**Vana's Gaps:**
- ❌ System prompt promotes shadcn/ui (doesn't work)
- ❌ Missing design principles
- ❌ Missing update/rewrite guidelines
- ❌ Missing artifact usage criteria
- ❌ Missing localStorage prominent warning

**Action Plan:**
1. Fix shadcn/ui mismatch (P0)
2. Adopt Claude's best practices (P1)
3. Enhance with nice-to-have improvements (P2-P3)

**Result**: Vana will have the BEST artifact system - superior implementation + superior guidance.

