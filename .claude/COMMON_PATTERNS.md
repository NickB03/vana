# Common Development Patterns

## Session Validation

**When to use**: Before any authenticated operation

**Pattern**:
```typescript
import { ensureValidSession } from '@/utils/sessionUtils';
import { useNavigate } from 'react-router-dom';

const navigate = useNavigate();
const session = await ensureValidSession();

if (!session) {
  navigate("/auth");
  return;
}

// Proceed with authenticated operation
const { user } = session;
```

**Why**: Ensures user is authenticated before accessing protected resources. Redirects to login if session expired.

## Creating Artifacts (AI Response Format)

**When to use**: When AI needs to generate artifacts in chat responses

**Pattern**:
```xml
<artifact type="application/vnd.ant.react" title="Component Name">
export default function App() {
  return <div>Hello World</div>;
}
</artifact>
```

**Supported Types**:
- `application/vnd.ant.react` — React components
- `text/html` — HTML pages
- `image/svg+xml` — SVG graphics
- `application/vnd.ant.mermaid` — Mermaid diagrams
- `text/markdown` — Markdown documents

**Multiple Artifacts**:
```xml
<artifact type="application/vnd.ant.react" title="Counter Component">
export default function Counter() { ... }
</artifact>

<artifact type="text/html" title="Landing Page">
<!DOCTYPE html>
<html>...</html>
</artifact>
```

## Adding New Artifact Type

**Steps**:

### 1. Update Type Definition

**File**: `src/components/ArtifactContainer.tsx`

```typescript
export type ArtifactType =
  | "code"
  | "markdown"
  | "html"
  | "svg"
  | "mermaid"
  | "react"
  | "image"
  | "your-new-type";  // Add here
```

### 2. Add Renderer Logic

**File**: `src/components/ArtifactRenderer.tsx`

```typescript
if (artifact.type === "your-new-type") {
  return <YourCustomRenderer content={artifact.content} />;
}
```

### 3. Update Parser

**File**: `src/utils/artifactParser.ts`

```typescript
const mimeTypeMap: Record<string, ArtifactType> = {
  'application/vnd.ant.react': 'react',
  'text/html': 'html',
  'application/vnd.your-type': 'your-new-type',  // Add mapping
};
```

### 4. Add Validation Rules (Optional)

**File**: `supabase/functions/_shared/artifact-rules/type-selection.ts`

```typescript
export function inferArtifactType(code: string): ArtifactType {
  if (code.includes('<!-- your-marker -->')) return 'your-new-type';
  // ... existing logic
}
```

### 5. Update Tool Definition (Optional)

**File**: `supabase/functions/_shared/tool-definitions.ts`

```typescript
const ARTIFACT_TYPES = [
  'react',
  'html',
  'svg',
  'mermaid',
  'markdown',
  'your-new-type'  // Add to enum
];
```

## Adding New Edge Function

**Steps**:

### 1. Create Function

```bash
mkdir -p supabase/functions/your-function
touch supabase/functions/your-function/index.ts
```

### 2. Implement Handler

**File**: `supabase/functions/your-function/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors-config.ts';

serve(async (req) => {
  const origin = req.headers.get('origin') || '';

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(origin);
  }

  try {
    // Your logic here
    const data = { message: 'Hello from Edge Function' };

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        ...getCorsHeaders(origin),
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        ...getCorsHeaders(origin),
        'Content-Type': 'application/json'
      }
    });
  }
});
```

### 3. Deploy Function

```bash
# Test locally
supabase functions serve your-function

# Deploy to production
supabase functions deploy your-function --project-ref <project-ref>
```

### 4. Set Environment Variables (if needed)

```bash
# Add to supabase/functions/.env
YOUR_API_KEY=...

# Or set via CLI
supabase secrets set YOUR_API_KEY=...
```

## TanStack Query Patterns

### Basic Query

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useChatSessions() {
  return useQuery({
    queryKey: ["chatSessions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_sessions")
        .select("*")
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,  // 5 minutes
  });
}
```

### Query with Parameters

```typescript
export function useChatMessages(sessionId: string) {
  return useQuery({
    queryKey: ["chatMessages", sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!sessionId,  // Only fetch if sessionId exists
  });
}
```

### Mutation

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';

export function useCreateSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (title: string) => {
      const { data, error } = await supabase
        .from("chat_sessions")
        .insert({ title })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidate and refetch sessions
      queryClient.invalidateQueries({ queryKey: ["chatSessions"] });
    },
  });
}
```

## Immutable State Updates

### Array Updates

```typescript
// ❌ WRONG - Mutates array
board[i] = 'X';
board.push(value);
board.sort();

// ✅ CORRECT - Immutable patterns
const newBoard = [...board];
newBoard[i] = 'X';

const newBoard = [...board, value];

const newBoard = [...board].sort();
```

### Object Updates

```typescript
// ❌ WRONG - Mutates object
user.name = 'John';
delete user.email;

// ✅ CORRECT - Immutable patterns
const newUser = { ...user, name: 'John' };

const { email, ...newUser } = user;  // Remove email
```

### Nested Updates

```typescript
// ❌ WRONG - Mutates nested object
state.user.profile.name = 'John';

// ✅ CORRECT - Immutable pattern
const newState = {
  ...state,
  user: {
    ...state.user,
    profile: {
      ...state.user.profile,
      name: 'John'
    }
  }
};

// Or use Immer (if installed)
import { produce } from 'immer';

const newState = produce(state, draft => {
  draft.user.profile.name = 'John';
});
```

## Error Handling

### Edge Function Errors

```typescript
import { sanitizeError } from '../_shared/safe-error-handler.ts';

try {
  // Operation that might fail
  const result = await riskyOperation();
  return new Response(JSON.stringify(result), { status: 200 });
} catch (error) {
  // Sanitize error (removes stack traces, PII)
  const safeError = sanitizeError(error, 'function-name');

  return new Response(JSON.stringify({ error: safeError.message }), {
    status: safeError.statusCode || 500,
    headers: { 'Content-Type': 'application/json' }
  });
}
```

### Frontend Errors

```typescript
import * as Sentry from '@sentry/react';
import { toast } from 'sonner';

try {
  await operation();
} catch (error) {
  // Log to Sentry
  Sentry.captureException(error, {
    tags: { component: 'ComponentName' },
    extra: { context: 'additional info' }
  });

  // Show user-friendly message
  toast.error('Operation failed. Please try again.');

  // Re-throw if needed
  throw error;
}
```

## Rate Limit Checking

### Frontend Check

```typescript
import { useAuthUserRateLimit } from '@/hooks/useAuthUserRateLimit';

const { data: rateLimit, isLoading } = useAuthUserRateLimit();

if (!isLoading && !rateLimit?.allowed) {
  toast.error(`Rate limit exceeded. Resets at ${rateLimit.reset_at}`);
  return;
}

// Proceed with operation
```

### Edge Function Check

```typescript
import { checkUserToolRateLimit } from '../_shared/tool-rate-limiter.ts';

const rateLimitResult = await checkUserToolRateLimit(
  userId,
  'generate_artifact',
  50,  // max requests
  5    // window hours
);

if (!rateLimitResult.allowed) {
  return new Response(
    JSON.stringify({
      error: 'Rate limit exceeded',
      reset_at: rateLimitResult.reset_at,
      remaining: rateLimitResult.remaining
    }),
    { status: 429 }
  );
}
```

## SSE Streaming Pattern

### Backend (Edge Function)

```typescript
const stream = new ReadableStream({
  async start(controller) {
    const writer = {
      write: (data: string) => {
        controller.enqueue(new TextEncoder().encode(data));
      }
    };

    try {
      // Emit events
      writer.write(`data: ${JSON.stringify({ type: 'start' })}\n\n`);

      // ... processing ...

      writer.write(`data: ${JSON.stringify({ type: 'data', content: '...' })}\n\n`);

      writer.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    } finally {
      controller.close();
    }
  }
});

return new Response(stream, {
  headers: {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  }
});
```

### Frontend (EventSource)

```typescript
const eventSource = new EventSource('/api/stream');

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);

  switch (data.type) {
    case 'start':
      console.log('Stream started');
      break;
    case 'data':
      console.log('Data:', data.content);
      break;
    case 'done':
      eventSource.close();
      break;
  }
};

eventSource.onerror = (error) => {
  console.error('SSE error:', error);
  eventSource.close();
};
```

## Artifact System Patterns

### Using Template Matching

**When to use**: When generating artifacts and you want to match user intent to predefined templates

**Pattern**:
```typescript
import { getMatchingTemplate } from '../_shared/artifact-rules/index.ts';
import type { TemplateMatchOutput } from '../_shared/artifact-rules/index.ts';

const result: TemplateMatchOutput = getMatchingTemplate(userMessage);

if (result.matched) {
  // Template matched successfully
  console.log('Using template:', result.templateId);
  console.log('Confidence:', result.confidence);
  console.log('Template code:', result.template.code);
  console.log('Description:', result.template.description);
} else {
  // No match found
  console.log('No template match. Reason:', result.reason);
  // result.reason: 'invalid_input' | 'no_matches' | 'low_confidence'
}
```

**Available Templates**:
```typescript
import { getAvailableTemplateIds } from '../_shared/artifact-rules/index.ts';

const templateIds = getAvailableTemplateIds();
// Returns: ['calculator', 'weather-dashboard', 'todo-list', 'timer']
```

**Why**: Templates provide battle-tested, reliable starting points for common artifact types, reducing generation failures.

### Using Design Tokens

**When to use**: When generating artifacts that need consistent theming and styling

**Pattern**:
```typescript
import {
  LIGHT_COLORS,
  DARK_COLORS,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  SHADOW,
  MOTION,
  Z_INDEX,
  BREAKPOINTS
} from '../_shared/artifact-rules/index.ts';

// Using color tokens
const primaryColor = LIGHT_COLORS.primary;  // '#3b82f6'
const darkPrimary = DARK_COLORS.primary;    // '#60a5fa'

// Using typography
const headingFont = TYPOGRAPHY.heading.family;     // 'Inter Variable, sans-serif'
const headingSize = TYPOGRAPHY.heading.size.xl;    // '2.25rem'

// Using spacing
const cardPadding = SPACING.md;  // '1rem'
const gap = SPACING.lg;          // '1.5rem'

// Using motion tokens
const transitionDuration = MOTION.duration.normal;  // '200ms'
const easing = MOTION.easing.smooth;                // 'cubic-bezier(0.4, 0, 0.2, 1)'
```

**Generate Full Theme CSS**:
```typescript
import { generateThemeCSS } from '../_shared/artifact-rules/index.ts';

const themeCSS = generateThemeCSS();
// Returns complete CSS with :root and .dark variables
```

**Why**: Design tokens ensure visual consistency across all artifacts and provide automatic dark mode support.

### Finding Canonical Examples

**When to use**: When you need reference implementations for specific artifact patterns

**Pattern**:
```typescript
import { findRelevantExample } from '../_shared/artifact-rules/index.ts';

const result = findRelevantExample(userRequest);

if (result.example) {
  console.log('Found example:', result.example.title);
  console.log('Code:', result.example.code);
  console.log('Description:', result.example.description);
  console.log('Matched keywords:', result.matchedKeywords);
  console.log('Match count:', result.debugInfo.matchCount);
} else {
  console.log('No relevant example found');
}
```

**Get All Examples**:
```typescript
import { CANONICAL_EXAMPLES, getCanonicalExampleSection } from '../_shared/artifact-rules/index.ts';

// Get all examples
const allExamples = CANONICAL_EXAMPLES;

// Get examples by section
const reactExamples = getCanonicalExampleSection('react');
const utilityExamples = getCanonicalExampleSection('utilities');
```

**Why**: Canonical examples provide proven implementations that follow best practices and avoid common pitfalls.

### Validating React Boilerplate

**When to use**: Before generating artifacts, to ensure code follows mandatory patterns

**Pattern**:
```typescript
import { validateReactBoilerplate, getViolationFix } from '../_shared/artifact-rules/index.ts';
import type { ValidationResult } from '../_shared/artifact-rules/index.ts';

const code = `
export default function App() {
  return <div>Hello</div>;
}
`;

const result: ValidationResult = validateReactBoilerplate(code);

if (!result.valid) {
  console.log('Validation failed!');

  // Handle critical violations
  result.violations.forEach(violation => {
    console.log('Error:', violation.message);
    console.log('Rule:', violation.rule);
    console.log('Severity:', violation.severity);

    // Get suggested fix
    const fix = getViolationFix(violation.rule);
    if (fix) {
      console.log('Suggested fix:', fix);
    }
  });
}

// Handle warnings
if (result.warnings.length > 0) {
  result.warnings.forEach(warning => {
    console.log('Warning:', warning.message);
  });
}
```

**Mandatory Patterns Enforced**:
```typescript
import { MANDATORY_REACT_BOILERPLATE } from '../_shared/artifact-rules/index.ts';

// View all mandatory patterns
console.log(MANDATORY_REACT_BOILERPLATE);
// Includes:
// - Must export default function
// - Must use function name 'App'
// - Must use React 18+ patterns
// - Package version constraints
```

**Why**: Validation catches common mistakes before artifacts are rendered, preventing runtime errors and blank screens.

### Using Package Versions

**When to use**: When generating artifacts that use npm packages

**Pattern**:
```typescript
import { PACKAGE_VERSIONS } from '../_shared/artifact-rules/index.ts';

// Get approved package versions
const reactVersion = PACKAGE_VERSIONS.react;           // '^18.3.1'
const lucideVersion = PACKAGE_VERSIONS['lucide-react']; // '^0.344.0'

// Example: Generate package.json dependencies
const dependencies = {
  'react': PACKAGE_VERSIONS.react,
  'react-dom': PACKAGE_VERSIONS['react-dom'],
  'lucide-react': PACKAGE_VERSIONS['lucide-react'],
  // ... other packages
};
```

**Why**: Using approved package versions ensures compatibility and avoids breaking changes.

### Using Pattern Cache

**When to use**: Before running full template matching, check cache for faster lookups

**Pattern**:
```typescript
import {
  getCachedMatch,
  cacheSuccessfulMatch,
  getCacheStats,
  normalizeRequest,
} from '../_shared/artifact-rules/index.ts';

// 1. Check cache FIRST (before expensive matching)
const cachedPattern = getCachedMatch(userRequest);

if (cachedPattern) {
  console.log('Cache hit!');
  console.log('Template IDs:', cachedPattern.templateIds);
  console.log('Confidence:', cachedPattern.confidence);
  console.log('Hit count:', cachedPattern.hitCount);

  // Use cached template directly
  const templateId = cachedPattern.templateIds[0];
  // ... proceed with artifact generation
} else {
  console.log('Cache miss - running full template matching');

  // Run expensive template matching
  const matchResult = getMatchingTemplate(userRequest);

  if (matchResult.matched) {
    // Cache successful match for future lookups
    cacheSuccessfulMatch(
      userRequest,
      [matchResult.templateId],
      matchResult.confidence
    );
  }
}

// 2. Monitor cache performance
const stats = getCacheStats();
console.log('Cache size:', stats.size);
console.log('Hit rate:', stats.hitRate, '%');
console.log('Total hits:', stats.totalHits);
console.log('Total misses:', stats.totalMisses);
```

**Manual Pattern Normalization**:
```typescript
// Normalize request for consistent matching
const normalized = normalizeRequest('Create a TODO list!');
// Returns: "create a todo list"

// Use normalized version for cache lookup
const cached = getCachedMatch(normalized);
```

**Why**: Pattern cache provides instant lookups for common requests, reducing response time from seconds to milliseconds. Hit rate typically 60-80% in production.

### Using Verification Checklist

**When to use**: Before finalizing artifact generation, inject checklist into system prompt

**Pattern**:
```typescript
import {
  getChecklistForPrompt,
  getCriticalChecklistSummary,
  getChecklistStats,
  getChecklistByPriority,
} from '../_shared/artifact-rules/index.ts';

// 1. Get FULL checklist for comprehensive verification
const fullChecklist = getChecklistForPrompt();
// Returns markdown-formatted checklist (80+ items)
// Inject into system prompt:
const systemPrompt = `
${baseInstructions}

${fullChecklist}

Verify ALL applicable checklist items before finalizing artifact.
`;

// 2. Get CRITICAL-ONLY checklist for quick review
const criticalOnly = getCriticalChecklistSummary();
// Returns only critical items (30+ items)
// Use for fast validation or streaming generation

// 3. Get checklist statistics
const stats = getChecklistStats();
console.log('Total items:', stats.total);          // 80+
console.log('Critical:', stats.critical);          // 30+
console.log('Important:', stats.important);        // 25+
console.log('Nice-to-have:', stats.niceToHave);   // 20+
console.log('Categories:', stats.categories);      // 9
```

**Filter by Priority**:
```typescript
import { getChecklistByPriority } from '../_shared/artifact-rules/index.ts';

// Get only critical items (array of ChecklistItem objects)
const criticalItems = getChecklistByPriority('critical');

criticalItems.forEach(item => {
  console.log(item.id);          // e.g., 'dt-1'
  console.log(item.description); // e.g., 'All colors from semantic tokens'
  console.log(item.priority);    // 'critical'
  console.log(item.examples);    // { bad?: string, good: string }
});
```

**Filter by Category**:
```typescript
import {
  getChecklistByCategory,
  getCategoryNames,
} from '../_shared/artifact-rules/index.ts';

// Get all category names
const categories = getCategoryNames();
// ['Design Tokens & Visual Consistency', 'Interactive States', ...]

// Get items for specific category
const a11yItems = getChecklistByCategory('Accessibility (WCAG 2.1 AA)');
// Returns ChecklistItem[] for accessibility category
```

**Why**: The verification checklist ensures production-grade quality by enforcing 80+ quality checks across design, accessibility, UX, and code quality.

### Using Task Complexity Analysis

**When to use**: BEFORE template matching to classify request and plan multi-step generation

**Pattern**:
```typescript
import {
  analyzeTaskComplexity,
  type TaskAnalysis,
} from '../_shared/artifact-rules/index.ts';

// Analyze BEFORE matching templates
const analysis: TaskAnalysis = analyzeTaskComplexity(userRequest);

console.log('Complexity:', analysis.complexity);
// 'simple' | 'moderate' | 'complex'

console.log('Requires multi-step:', analysis.requiresMultiStep);
// true for complex tasks requiring multiple artifacts

console.log('Suggested templates:', analysis.suggestedTemplates);
// ['landing-page', 'dashboard', 'chart']

console.log('Dependencies:', analysis.dependencies);
// Templates that depend on others

console.log('Reasoning:', analysis.reasoning);
// Explanation for the classification

// Use complexity tier to adjust generation strategy
if (analysis.complexity === 'complex') {
  // Multi-step generation required
  for (const templateId of analysis.suggestedTemplates) {
    // Generate each artifact separately
    console.log('Generating:', templateId);
  }
} else if (analysis.complexity === 'moderate') {
  // Single artifact with multiple features
  console.log('Single artifact with customization');
} else {
  // Simple, single-purpose artifact
  console.log('Direct template application');
}
```

**Complexity Examples**:
```typescript
// SIMPLE (single artifact, clear scope)
analyzeTaskComplexity("create a bar chart showing sales data")
// → { complexity: 'simple', suggestedTemplates: ['chart'], ... }

analyzeTaskComplexity("make a company logo")
// → { complexity: 'simple', suggestedTemplates: [], ... }

// MODERATE (single template, multiple features)
analyzeTaskComplexity("create a contact form with email validation and success message")
// → { complexity: 'moderate', suggestedTemplates: ['form-page'], ... }

analyzeTaskComplexity("dashboard with filters and sorting")
// → { complexity: 'moderate', suggestedTemplates: ['dashboard'], ... }

// COMPLEX (multiple templates, full applications)
analyzeTaskComplexity("build a website with landing page, dashboard, and analytics charts")
// → { complexity: 'complex', suggestedTemplates: ['landing-page', 'dashboard', 'chart'],
//     requiresMultiStep: true, ... }

analyzeTaskComplexity("create an app with user profiles and admin portal")
// → { complexity: 'complex', suggestedTemplates: ['settings-panel', 'dashboard'],
//     requiresMultiStep: true, ... }
```

**Why**: Task complexity analysis prevents scope creep and ensures multi-step planning for complex requests, improving generation success rate.

### Using Anti-Pattern Detection

**When to use**: After generating code, validate against anti-patterns and quality standards

**Pattern**:
```typescript
import {
  detectAntiPatterns,
  validateQualityStandards,
} from '../_shared/artifact-rules/index.ts';

const generatedCode = `
export default function App() {
  return (
    <div className="p-4 bg-blue-500">
      <h1 className="text-2xl font-['Inter']">Hello World</h1>
      <button>Click me</button>
    </div>
  );
}
`;

// 1. Detect anti-patterns (returns issues with severity)
const antiPatterns = detectAntiPatterns(generatedCode);

antiPatterns.forEach(issue => {
  console.log(`[${issue.severity.toUpperCase()}] ${issue.issue}`);
});

// Example output:
// [ERROR] Banned font detected: Inter. Use alternatives: Geist, Satoshi, Plus Jakarta Sans, ...
// [ERROR] Banned color detected: bg-blue-500. Use semantic tokens with intentional palette...
// [WARNING] Buttons detected without hover states. Add hover feedback for interactivity

// 2. Validate quality standards (returns pass/fail + score)
const qualityResult = validateQualityStandards(generatedCode);

console.log('Quality check passed:', qualityResult.passes);  // false
console.log('Quality score:', qualityResult.score);          // 0.375 (3/8)
console.log('Failures:', qualityResult.failures);

// Example output:
// Failures: [
//   'Uses default Tailwind colors',
//   'Uses generic fonts (Inter/Roboto)',
//   'Missing loading state',
//   'Missing empty state',
//   'Missing error handling'
// ]

// 3. Use validation results to improve code
if (!qualityResult.passes) {
  console.log('⚠️ Code quality below threshold');
  console.log('Issues to fix:', qualityResult.failures.join(', '));

  // Regenerate with fixes or show user improvement suggestions
}

// 4. Block generation if critical errors found
const criticalErrors = antiPatterns.filter(p => p.severity === 'error');
if (criticalErrors.length > 0) {
  console.log('❌ Cannot proceed - critical anti-patterns detected');
  // Show errors to user and request regeneration
}
```

**Quality Checklist Items**:
```typescript
// The 8 quality standards checked by validateQualityStandards():
// 1. Has custom color palette (not Tailwind defaults)
// 2. Uses distinctive typography (not Inter/Roboto)
// 3. Implements unique layout (not pure card grid)
// 4. Includes personality elements (custom icons, illustrations)
// 5. Handles all component states (loading, empty, error)
// 6. Has meaningful hover/focus states
// 7. Uses intentional animation timing (not instant)
// 8. Contains specific copy (not generic placeholders)
```

**Integration Example**:
```typescript
// Use in artifact generation pipeline
async function generateArtifact(userRequest: string) {
  // 1. Analyze complexity
  const analysis = analyzeTaskComplexity(userRequest);

  // 2. Check cache
  const cached = getCachedMatch(userRequest);

  // 3. Match template (if not cached)
  const template = cached || getMatchingTemplate(userRequest);

  // 4. Generate code (AI call)
  const code = await generateCodeFromTemplate(template, userRequest);

  // 5. Validate quality
  const antiPatterns = detectAntiPatterns(code);
  const quality = validateQualityStandards(code);

  // 6. Return or regenerate
  if (quality.passes && antiPatterns.length === 0) {
    // Cache successful generation
    cacheSuccessfulMatch(userRequest, [template.id], 0.95);
    return { code, quality: 'excellent' };
  } else {
    // Show validation errors and request fixes
    return {
      code,
      quality: 'needs-improvement',
      issues: antiPatterns,
      failures: quality.failures,
    };
  }
}
```

**Why**: Anti-pattern detection and quality validation ensure generated artifacts meet production standards and avoid common pitfalls like generic design, missing states, and poor accessibility.

## References

- **Session Utils**: `src/utils/sessionUtils.ts`
- **Artifact Parser**: `src/utils/artifactParser.ts`
- **Artifact Rules**: `supabase/functions/_shared/artifact-rules/index.ts`
- **Pattern Cache**: `supabase/functions/_shared/artifact-rules/pattern-cache.ts`
- **Verification Checklist**: `supabase/functions/_shared/artifact-rules/verification-checklist.ts`
- **Template Matcher**: `supabase/functions/_shared/artifact-rules/template-matcher.ts`
- **Design Tokens**: `supabase/functions/_shared/artifact-rules/design-tokens.ts`
- **TanStack Query Docs**: https://tanstack.com/query/latest
- **Supabase Client Docs**: https://supabase.com/docs/reference/javascript
