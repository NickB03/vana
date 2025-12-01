# Validation Warnings LLM Remediation Plan

**Created:** 2025-12-01  
**Status:** Pending Implementation  
**Issue:** Validation warnings detected on frontend are not passed to LLM for remediation

## Problem Summary

After commit `9f4de037` removed the warnings badge from the artifact header UI, an audit revealed that **validation warnings are never passed to the LLM** for fixing. The current flow only sends runtime errors (`previewError`) to the `generate-artifact-fix` endpoint.

### Current Gap

| Component | Status | Issue |
|-----------|--------|-------|
| `src/utils/artifactValidator.ts` | ✅ Works | Detects warnings (shadcn imports, security, accessibility) |
| `ArtifactContainer.tsx` validation | ✅ Works | Runs validation, stores in state |
| `ArtifactRenderer.tsx` display | ✅ Works | Shows warnings as Alert in UI |
| `handleAIFix` trigger | ❌ Gap | Requires `previewError` - blocks warning-only fixes |
| `handleAIFix` payload | ❌ Gap | Only sends `errorMessage`, not warnings |
| Backend validation | ❌ Gap | Requires `errorMessage` - returns 400 for warnings-only |
| Backend prompt | ❌ Gap | No `warnings` field processed in `validationContext` |

## Implementation Plan

### Task 1: Update Frontend - `ArtifactContainer.tsx`

**File:** `src/components/ArtifactContainer.tsx`  
**Function:** `handleAIFix` (lines 165-214)

#### Change 1: Allow warning-only triggers
```typescript
// BEFORE (line 166):
if (!previewError) return;

// AFTER:
const hasWarnings = validation && validation.warnings.length > 0;
if (!previewError && !hasWarnings) return;
```

#### Change 2: Include warnings in request body
```typescript
// BEFORE (lines 185-189):
body: JSON.stringify({
  content: artifact.content,
  type: artifact.type,
  errorMessage: previewError,
}),

// AFTER:
body: JSON.stringify({
  content: artifact.content,
  type: artifact.type,
  errorMessage: previewError || undefined,
  validationContext: {
    warnings: validation?.warnings?.map(w => ({
      type: w.type,
      message: w.message,
      suggestion: w.suggestion
    })) || []
  }
}),
```

### Task 2: Update Backend - `generate-artifact-fix/index.ts`

**File:** `supabase/functions/generate-artifact-fix/index.ts`

#### Change 1: Make `errorMessage` optional (lines 35-40)
```typescript
// Allow warnings-only fixes
const hasError = errorMessage && typeof errorMessage === "string";
const hasWarnings = validationContext?.warnings?.length > 0;

if (!hasError && !hasWarnings) {
  return new Response(
    JSON.stringify({ error: "Either errorMessage or validationContext.warnings required" }),
    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
```

#### Change 2: Process warnings in `validationSection` (after line 207)
```typescript
${validationContext?.warnings?.length > 0 ? `
⚠️ VALIDATION WARNINGS DETECTED:
${validationContext.warnings.map((w: {type: string, message: string, suggestion?: string}) => 
  `- [${w.type.toUpperCase()}] ${w.message}${w.suggestion ? ` → Fix: ${w.suggestion}` : ''}`
).join('\n')}

You MUST fix these warnings in addition to any errors.
` : ''}
```

#### Change 3: Handle warnings-only in prompt (line 215)
```typescript
ERROR: ${errorMessage || 'No runtime error - fixing validation warnings only'}
```

### Task 3: Add UI Trigger - `ArtifactRenderer.tsx`

**File:** `src/components/ArtifactRenderer.tsx`  
**Location:** After warnings Alert (line 691)

```typescript
{validation && validation.warnings.length > 0 && !previewError && (
  <div className="flex gap-2 mx-2 mt-1">
    <Button
      size="sm"
      variant="outline"
      className="h-6 text-xs"
      onClick={onAIFix}
      disabled={isFixingError}
    >
      {isFixingError ? "Fixing..." : "🤖 Fix Warnings"}
    </Button>
  </div>
)}
```

## Data Flow After Implementation

```
Frontend                           Backend
────────                           ───────
validateArtifact()
    │
    ▼
ValidationResult {
  errors: [...],
  warnings: [{type, message, suggestion}]
}
    │
    ▼
handleAIFix() ──────────────────▶ generate-artifact-fix
    │                                   │
    │  {                                │
    │    content,                       ▼
    │    type,                    Build prompt with:
    │    errorMessage?,           - ERROR context
    │    validationContext: {     - WARNINGS list
    │      warnings: [...]        - Fix suggestions
    │    }                              │
    │  }                                ▼
    │                             Call GLM-4.6
    │                                   │
    ◀───────────────────────────────────┘
    │  { fixedCode, reasoning }
    ▼
Apply fix via onContentChange()
```

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Runtime error + warnings | Both passed to LLM, all issues fixed |
| Warnings only | "Fix Warnings" button shown, LLM fixes proactively |
| No errors, no warnings | No fix button shown, API returns 400 if called |
| Empty warnings array | Treated as no warnings |

## Testing Checklist

- [ ] Create artifact with shadcn import → warning detected → Fix Warnings button works
- [ ] Create artifact with runtime error + warnings → both fixed in single call
- [ ] Verify warning suggestions appear in LLM prompt
- [ ] Confirm API rejects requests with neither error nor warnings

