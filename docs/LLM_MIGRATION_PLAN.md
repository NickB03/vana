# LLM Integration Modernization Plan

> **Branch**: `feat/llm-integration-modernization`
> **Created**: 2026-01-22
> **Updated**: 2026-01-23 (Added Phase 5: Reasoning Status System)
> **Goal**: Migrate from XML/regex parsing to structured outputs, add resilience patterns, fix reasoning display

## Overview

This plan uses the [Ralph Wiggum Loop](https://github.com/anthropics/claude-code/blob/main/plugins/ralph-wiggum/README.md) methodology for autonomous, iterative development.

| Phase | Goal | Max Iterations | Completion Promise |
|-------|------|----------------|-------------------|
| 1 | Foundation (parser, circuit breaker, errors) | 15 | `PHASE1_COMPLETE` |
| 2 | Structured Outputs Migration | 15 | `PHASE2_COMPLETE` |
| 3 | Hybrid Architecture (streaming, complexity) | 15 | `PHASE3_COMPLETE` |
| 4 | Production Hardening (cleanup, monitoring) | 15 | `PHASE4_COMPLETE` |
| 5 | **Reasoning Status System** (contextual ticker) | 15 | `PHASE5_COMPLETE` |

---

## Pre-Flight Checklist

Before starting any phase, verify:

```bash
# Ensure you're on the correct branch
git branch --show-current  # Should show: feat/llm-integration-modernization

# Ensure tests pass
npm run test

# Ensure build passes
npm run build
```

---

## Phase 1: Foundation

**Goal**: Consolidate artifact parsing, add circuit breaker pattern, add structured error types.

**Files to Create**:
- `supabase/functions/_shared/artifact-parser-shared.ts`
- `supabase/functions/_shared/errors.ts`
- `supabase/functions/_shared/circuit-breaker.ts`

**Files to Modify**:
- `supabase/functions/_shared/gemini-client.ts`
- `src/utils/artifactParser.ts`
- `supabase/functions/_shared/artifact-tool-v2.ts`

### Ralph Loop Prompt (Copy/Paste)

```
/ralph-loop "
# LLM Chat Migration - Phase 1: Foundation

## Objective
Implement foundational improvements: consolidate artifact parsing, add circuit breaker pattern, add structured error types.

## Working Directory
/Users/nick/Projects/llm-chat-site

## Tasks

### Task 1.1: Consolidate Artifact Parsing Logic
Create a single source of truth for artifact XML parsing.

Create file: supabase/functions/_shared/artifact-parser-shared.ts

Content:
- Export const ARTIFACT_REGEX = /<artifact([^>]*)>([\s\S]*?)<\/artifact>/gi
- Export interface ArtifactParseResult { type: string; title: string; code: string; language?: string }
- Export function parseArtifactXML(content: string): ArtifactParseResult | null
- Export function extractArtifactAttributes(attributeString: string): { type: string; title: string; language?: string }

Then update these files to import from shared:
- src/utils/artifactParser.ts - import parseArtifactXML, remove duplicate regex
- supabase/functions/_shared/artifact-tool-v2.ts - import parseArtifactXML, remove duplicate regex

### Task 1.2: Add Structured Error Types
Create typed error classes for better error handling.

Create file: supabase/functions/_shared/errors.ts

Error classes to create:
1. ArtifactParseError extends Error
   - constructor(message: string, rawResponse: string, retryable: boolean = true)
   - Properties: rawResponse, retryable

2. LLMQuotaExceededError extends Error
   - constructor(resetAt: Date, quotaType: 'rate' | 'token' | 'cost')
   - Properties: resetAt, quotaType

3. LLMTimeoutError extends Error
   - constructor(timeoutMs: number, operation: string)
   - Properties: timeoutMs, operation

4. CircuitBreakerOpenError extends Error
   - constructor(resetAt: Date)
   - Properties: resetAt

Export all error classes and a type guard function isRetryableError(error: unknown): boolean

### Task 1.3: Implement Circuit Breaker
Add circuit breaker pattern for LLM API resilience.

Create file: supabase/functions/_shared/circuit-breaker.ts

Implementation requirements:
- Class CircuitBreaker with generic type parameter
- States: 'closed' | 'open' | 'half-open'
- Configuration: failureThreshold (default 5), resetTimeoutMs (default 30000)
- Methods:
  - async call<T>(fn: () => Promise<T>, fallback?: () => Promise<T>): Promise<T>
  - getState(): string
  - getFailureCount(): number
- State transitions:
  - closed -> open: after failureThreshold consecutive failures
  - open -> half-open: after resetTimeoutMs
  - half-open -> closed: on success
  - half-open -> open: on failure
- Logging: Log state transitions with [CircuitBreaker] prefix

### Task 1.4: Integrate Circuit Breaker with Gemini Client
Modify: supabase/functions/_shared/gemini-client.ts

1. Import CircuitBreaker from ./circuit-breaker.ts
2. Create module-level circuit breaker instance
3. Wrap callGemini() calls in circuit breaker
4. Import and throw typed errors from ./errors.ts where appropriate

### Task 1.5: Add Tests
Create tests for new functionality:
- supabase/functions/_shared/__tests__/circuit-breaker.test.ts
- supabase/functions/_shared/__tests__/artifact-parser-shared.test.ts

Tests should cover:
- Circuit breaker state transitions
- Artifact parsing happy path and edge cases
- Error type instantiation

## Verification Commands
Run after each iteration:
npm run build && npm run test

## Completion Criteria
ALL must be true:
- [ ] npm run build passes with no TypeScript errors
- [ ] npm run test passes (all existing + new tests)
- [ ] No duplicate ARTIFACT_REGEX patterns (grep -r 'artifact.*regex' --include='*.ts' shows only shared file)
- [ ] Circuit breaker has tests with >80% coverage
- [ ] Shared parser has tests

When ALL criteria met, output: <promise>PHASE1_COMPLETE</promise>

## Self-Correction Instructions
If tests fail:
1. Read the exact error message
2. If type error: check imports and interface definitions
3. If runtime error: add console.log debugging
4. Fix the specific issue, re-run tests

If build fails:
1. Check TypeScript errors in output
2. Fix import paths (use relative paths for Deno)
3. Ensure all exports are properly typed

After 12 iterations without completion:
1. Document what's blocking in a comment
2. List attempted solutions
3. Output PHASE1_COMPLETE anyway if core functionality works
" --completion-promise "PHASE1_COMPLETE" --max-iterations 15
```

---

## Phase 2: Structured Outputs Migration

**Goal**: Eliminate XML parsing by using OpenRouter's structured outputs API.

**Prerequisites**: Phase 1 complete (circuit breaker, shared parser, typed errors exist)

**Files to Create**:
- `supabase/functions/_shared/schemas/artifact-schema.ts`
- `supabase/functions/_shared/artifact-generator-structured.ts`

**Files to Modify**:
- `supabase/functions/_shared/gemini-client.ts`
- `supabase/functions/_shared/tool-executor.ts`
- `supabase/functions/_shared/system-prompt-inline.ts`
- `supabase/functions/_shared/config.ts`

### Ralph Loop Prompt (Copy/Paste)

```
/ralph-loop "
# LLM Chat Migration - Phase 2: Structured Outputs

## Objective
Migrate artifact generation from XML parsing to OpenRouter structured outputs API.

## Working Directory
/Users/nick/Projects/llm-chat-site

## Prerequisites Check
Before starting, verify Phase 1 artifacts exist:
- supabase/functions/_shared/circuit-breaker.ts
- supabase/functions/_shared/errors.ts
- supabase/functions/_shared/artifact-parser-shared.ts

## Tasks

### Task 2.1: Create Zod Schema for Artifacts
Create file: supabase/functions/_shared/schemas/artifact-schema.ts

```typescript
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

export const ArtifactTypeSchema = z.enum([
  'react', 'html', 'svg', 'mermaid', 'code', 'markdown'
]);

export const ArtifactSchema = z.object({
  type: ArtifactTypeSchema,
  title: z.string().min(1).max(100),
  code: z.string().min(1),
  language: z.string().optional(),
});

export const ArtifactResponseSchema = z.object({
  explanation: z.string().min(20).describe('3-5 sentence explanation of what was created'),
  artifact: ArtifactSchema.optional().describe('The generated artifact, if applicable'),
});

export type ArtifactType = z.infer<typeof ArtifactTypeSchema>;
export type Artifact = z.infer<typeof ArtifactSchema>;
export type ArtifactResponse = z.infer<typeof ArtifactResponseSchema>;

// Convert Zod schema to JSON Schema for OpenRouter
export function getArtifactJsonSchema() {
  return {
    name: 'artifact_response',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        explanation: { type: 'string', minLength: 20 },
        artifact: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['react', 'html', 'svg', 'mermaid', 'code', 'markdown'] },
            title: { type: 'string', minLength: 1, maxLength: 100 },
            code: { type: 'string', minLength: 1 },
            language: { type: 'string' }
          },
          required: ['type', 'title', 'code']
        }
      },
      required: ['explanation'],
      additionalProperties: false
    }
  };
}
```

### Task 2.2: Add Structured Output Support to Gemini Client
Modify: supabase/functions/_shared/gemini-client.ts

Add to CallGeminiOptions interface:
```typescript
responseFormat?: {
  type: 'json_schema';
  json_schema: {
    name: string;
    strict: boolean;
    schema: Record<string, unknown>;
  };
};
```

In callGemini() function, add before the fetch call:
```typescript
if (options?.responseFormat) {
  body.response_format = options.responseFormat;
}
```

### Task 2.3: Add Feature Flag
Modify: supabase/functions/_shared/config.ts

Add to FEATURE_FLAGS:
```typescript
USE_STRUCTURED_ARTIFACT_GENERATION: Deno.env.get('USE_STRUCTURED_ARTIFACT_GENERATION') !== 'false',
```

### Task 2.4: Create Structured Artifact Generator
Create file: supabase/functions/_shared/artifact-generator-structured.ts

This replaces artifact-tool-v2.ts when feature flag is enabled.

Implementation:
1. Import getArtifactJsonSchema from schemas/artifact-schema.ts
2. Import ArtifactResponseSchema for validation
3. Call Gemini with response_format set
4. Parse response as JSON (not XML!)
5. Validate with Zod
6. Return ToolExecutionResult

Key function:
```typescript
export async function generateArtifactStructured(
  params: ArtifactGenerationParams
): Promise<ToolExecutionResult>
```

### Task 2.5: Update Tool Executor
Modify: supabase/functions/_shared/tool-executor.ts

In the generate_artifact case:
1. Check FEATURE_FLAGS.USE_STRUCTURED_ARTIFACT_GENERATION
2. If true: call generateArtifactStructured()
3. If false: call executeArtifactGenerationV2() (existing)

### Task 2.6: Simplify System Prompt
Modify: supabase/functions/_shared/system-prompt-inline.ts

In getSystemInstruction():
1. Remove the ARTIFACT FORMAT section (lines teaching XML tags)
2. Remove XML examples
3. Keep: Package whitelist, common pitfalls, Critical Behavior Rule #1

Target: Reduce prompt from ~250 lines to ~100 lines

## Verification Commands
npm run build && npm run test && npm run test:integration

## Completion Criteria
- [ ] npm run build passes
- [ ] npm run test passes
- [ ] Feature flag exists and defaults to true
- [ ] Structured generator uses response_format parameter
- [ ] System prompt is < 120 lines (check with: wc -l supabase/functions/_shared/system-prompt-inline.ts)
- [ ] Manual test: Generate a React artifact and verify it works

When ALL criteria met, output: <promise>PHASE2_COMPLETE</promise>

## Self-Correction Instructions
If Zod validation fails:
1. Log the raw LLM response
2. Check if schema matches actual output format
3. Make fields optional if LLM sometimes omits them

If structured output returns invalid JSON:
1. Verify model supports structured outputs (Gemini 3 Flash does)
2. Check response_format is in request body
3. Fall back to XML parsing as safety net

After 12 iterations without completion:
1. If structured outputs partially working, document issues
2. Ensure feature flag allows rollback
3. Output PHASE2_COMPLETE if core path works
" --completion-promise "PHASE2_COMPLETE" --max-iterations 15
```

---

## Phase 3: Hybrid Architecture

**Goal**: Optimize with streaming and complexity-based routing.

**Prerequisites**: Phase 2 complete (structured outputs working)

**Files to Create**:
- `supabase/functions/_shared/artifact-complexity.ts`

**Files to Modify**:
- `supabase/functions/_shared/artifact-generator-structured.ts`
- `supabase/functions/chat/handlers/tool-calling-chat.ts`
- `src/hooks/useChatMessages.tsx`

### Ralph Loop Prompt (Copy/Paste)

```
/ralph-loop "
# LLM Chat Migration - Phase 3: Hybrid Architecture

## Objective
Add streaming for artifact generation and complexity-based routing.

## Working Directory
/Users/nick/Projects/llm-chat-site

## Prerequisites Check
Verify Phase 2 complete:
- supabase/functions/_shared/schemas/artifact-schema.ts exists
- supabase/functions/_shared/artifact-generator-structured.ts exists
- FEATURE_FLAGS.USE_STRUCTURED_ARTIFACT_GENERATION exists

## Tasks

### Task 3.1: Create Complexity Detector
Create file: supabase/functions/_shared/artifact-complexity.ts

```typescript
export interface ComplexityResult {
  isComplex: boolean;
  reason: string;
  estimatedTokens: number;
}

export function analyzeArtifactComplexity(
  type: string,
  requirements: string
): ComplexityResult {
  const complexTypes = ['react', 'game', 'visualization', 'dashboard'];
  const complexKeywords = /interactive|animation|state management|api|fetch|websocket|real-time|canvas|3d|chart|graph/i;

  const isComplexType = complexTypes.includes(type.toLowerCase());
  const hasComplexKeywords = complexKeywords.test(requirements);
  const isLongRequirement = requirements.length > 300;

  const isComplex = isComplexType && (hasComplexKeywords || isLongRequirement);

  return {
    isComplex,
    reason: isComplex
      ? `Complex: ${type} with advanced requirements`
      : `Simple: straightforward ${type}`,
    estimatedTokens: isComplex ? 4000 : 1500
  };
}
```

### Task 3.2: Add Streaming to Artifact Generator
Modify: supabase/functions/_shared/artifact-generator-structured.ts

Add new function for streaming generation:
```typescript
export async function* generateArtifactStreaming(
  params: ArtifactGenerationParams,
  sendEvent: (data: unknown) => void
): AsyncGenerator<{ type: string; data: unknown }>
```

Emit events:
- { type: 'artifact_progress', data: { stage: 'thinking', percentage: 10 } }
- { type: 'artifact_progress', data: { stage: 'generating', percentage: 50 } }
- { type: 'artifact_progress', data: { stage: 'validating', percentage: 90 } }
- { type: 'artifact_complete', data: { ...artifact } }

### Task 3.3: Update Tool Calling Chat Handler
Modify: supabase/functions/chat/handlers/tool-calling-chat.ts

In generate_artifact execution:
1. Import analyzeArtifactComplexity
2. Analyze complexity before generation
3. Log complexity result for metrics
4. For complex artifacts: use streaming with progress events
5. For simple artifacts: use non-streaming fast path

### Task 3.4: Update Frontend Progress Handling
Modify: src/hooks/useChatMessages.tsx

Add handler for artifact_progress event:
```typescript
if (parsed.type === 'artifact_progress') {
  const { stage, percentage } = parsed.data;
  // Update progress state
  const progress = updateProgress();
  progress.artifactInProgress = true;
  progress.message = `${stage}: ${percentage}%`;
  onDelta('', progress);
  continue;
}
```

### Task 3.5: Add Complexity Metrics Logging
In tool-calling-chat.ts, log complexity decisions:
```typescript
console.log(\`[\${requestId}] Artifact complexity: \${complexity.reason}\`);
```

## Verification Commands
npm run build && npm run test

## Completion Criteria
- [ ] npm run build passes
- [ ] npm run test passes
- [ ] Complexity detector correctly identifies simple vs complex
- [ ] artifact_progress events are emitted during generation
- [ ] Frontend handles artifact_progress events
- [ ] Simple artifacts skip thinking mode (faster)

When ALL criteria met, output: <promise>PHASE3_COMPLETE</promise>

## Self-Correction Instructions
If streaming breaks:
1. Check SSE event format (data: JSON\\n\\n)
2. Verify sendEvent function is passed correctly
3. Test with curl to see raw events

If complexity misclassifies:
1. Add more test cases
2. Adjust keyword patterns
3. Log classification decisions for debugging

After 12 iterations without completion:
1. Streaming is optional - core functionality is priority
2. Document partial progress
3. Output PHASE3_COMPLETE if basic flow works
" --completion-promise "PHASE3_COMPLETE" --max-iterations 15
```

---

## Phase 4: Production Hardening

**Goal**: Remove legacy code, add monitoring, finalize documentation.

**Prerequisites**: Phases 1-3 complete, structured outputs stable

**Files to Delete**:
- `supabase/functions/_shared/artifact-tool-v2.ts` (replaced by structured generator)

**Files to Modify**:
- `supabase/functions/_shared/config.ts` (remove feature flag)
- `docs/ARCHITECTURE.md` (update)
- `CLAUDE.md` (update)

### Ralph Loop Prompt (Copy/Paste)

```
/ralph-loop "
# LLM Chat Migration - Phase 4: Production Hardening

## Objective
Remove legacy code, add monitoring, update documentation.

## Working Directory
/Users/nick/Projects/llm-chat-site

## Prerequisites Check
Verify Phases 1-3 complete:
- Circuit breaker working
- Structured outputs working
- Complexity detection working
- All tests passing

## Tasks

### Task 4.1: Remove Legacy Artifact Generator
Delete file: supabase/functions/_shared/artifact-tool-v2.ts

Update imports in any file that referenced it:
- Replace with artifact-generator-structured.ts

### Task 4.2: Remove Feature Flag
Modify: supabase/functions/_shared/config.ts

Remove: USE_STRUCTURED_ARTIFACT_GENERATION (now always-on)

Update: supabase/functions/_shared/tool-executor.ts
- Remove conditional logic, always use structured generator

### Task 4.3: Add Circuit Breaker Metrics
Modify: supabase/functions/_shared/gemini-client.ts

Add logging for circuit breaker events:
```typescript
// Log to console (can be picked up by monitoring)
console.log(JSON.stringify({
  event: 'circuit_breaker_state_change',
  from: previousState,
  to: newState,
  failures: failureCount,
  timestamp: new Date().toISOString()
}));
```

### Task 4.4: Add Structured Output Metrics
In artifact-generator-structured.ts, log:
```typescript
console.log(JSON.stringify({
  event: 'structured_output_generation',
  success: true,
  validationPassed: true,
  artifactType: result.artifact?.type,
  latencyMs: endTime - startTime,
  timestamp: new Date().toISOString()
}));
```

### Task 4.5: Update Documentation
Modify: docs/ARCHITECTURE.md

Add section on structured outputs:
- How artifact generation works (no more XML)
- Circuit breaker behavior
- Complexity-based routing

Modify: CLAUDE.md

Update artifact section:
- Remove references to XML tags in responses
- Note that artifacts use structured outputs
- Keep package whitelist info

### Task 4.6: Final Test Suite
Run full test suite:
```bash
npm run test
npm run test:integration
npm run build
```

Verify no references to old patterns:
```bash
grep -r 'artifact-tool-v2' --include='*.ts' supabase/
grep -r 'USE_STRUCTURED_ARTIFACT' --include='*.ts' supabase/
```

## Verification Commands
npm run build && npm run test && npm run test:integration

## Completion Criteria
- [ ] npm run build passes
- [ ] npm run test passes
- [ ] npm run test:integration passes
- [ ] artifact-tool-v2.ts deleted
- [ ] Feature flag removed
- [ ] No grep matches for old patterns
- [ ] Documentation updated
- [ ] git diff shows clean migration

When ALL criteria met, output: <promise>PHASE4_COMPLETE</promise>

## Self-Correction Instructions
If removing legacy code breaks imports:
1. Find all files importing the deleted module
2. Update to use new module
3. Run build to verify

If tests fail after removal:
1. Check if tests were testing old code
2. Update or remove obsolete tests
3. Add new tests for current behavior

After 12 iterations without completion:
1. Document any remaining legacy code
2. Add TODO comments for future cleanup
3. Output PHASE4_COMPLETE if core migration done
" --completion-promise "PHASE4_COMPLETE" --max-iterations 15
```

---

## Post-Migration Checklist

After all phases complete:

```bash
# 1. Verify all tests pass
npm run test
npm run test:integration
npm run test:e2e:headed

# 2. Review changes
git diff main...feat/llm-integration-modernization --stat

# 3. Create PR
gh pr create --title "feat: Modernize LLM integration with structured outputs" --body "
## Summary
- Migrated artifact generation from XML parsing to OpenRouter structured outputs
- Added circuit breaker pattern for API resilience
- Added complexity-based routing for artifact generation
- Consolidated duplicate parsing logic
- Added structured error types

## Test Plan
- [x] All unit tests pass
- [x] Integration tests pass
- [x] E2E tests pass
- [x] Manual testing of artifact generation
- [x] Verified circuit breaker behavior

## Breaking Changes
None - internal implementation change only
"
```

---

## Troubleshooting

### Ralph Loop Stuck
If loop exceeds iterations without completion:
1. Check the last error in console
2. Run `npm run test` manually to see failures
3. Consider reducing scope and completing manually

### Structured Outputs Not Working
1. Verify OpenRouter API key has access
2. Check model supports structured outputs
3. Test with simpler schema first

### Circuit Breaker Firing Too Often
1. Increase failure threshold
2. Check if API is actually unstable
3. Review logs for root cause

---

## Monitoring

### Circuit Breaker Events

The circuit breaker emits structured JSON events for monitoring integration. These events can be consumed by logging services (Datadog, CloudWatch, Splunk) or error tracking tools (Sentry).

#### Events to Monitor

**1. Circuit Breaker State Changes**

All state transitions emit a structured event:
```json
{
  "event": "circuit_breaker_state_change",
  "circuitName": "GeminiAPI",
  "from": "closed",
  "to": "open",
  "trigger": "automatic",
  "failures": 5,
  "totalCalls": 127,
  "totalFailures": 8,
  "totalSuccesses": 119,
  "successRate": 0.94,
  "timestamp": "2026-01-23T10:30:00.000Z"
}
```

**2. Critical Alert: Circuit Opens**

When a circuit transitions to `open`, an ERROR-level log is emitted:
```
🚨 [GeminiAPI] CIRCUIT BREAKER OPENED - Service degraded!
   Failures: 5/5, Success rate: 94%, Resets at: 2026-01-23T10:30:30.000Z
```

#### Recommended Alert Rules

**Critical: Circuit Breaker Opens**
- **Trigger**: `event == "circuit_breaker_state_change" AND to == "open"`
- **Severity**: Critical
- **Action**: Page on-call engineer
- **Description**: API circuit breaker has opened, indicating service degradation

**Warning: High Failure Rate**
- **Trigger**: `event == "circuit_breaker_state_change" AND successRate < 0.95`
- **Severity**: Warning
- **Action**: Create ticket for investigation
- **Description**: Circuit breaker success rate dropped below 95%

**Info: Circuit Recovered**
- **Trigger**: `event == "circuit_breaker_state_change" AND from == "open" AND to == "closed"`
- **Severity**: Info
- **Action**: Log for post-mortem analysis
- **Description**: Circuit breaker recovered to healthy state

#### Integration Examples

**Sentry Integration** (TODO):
```typescript
import * as Sentry from '@sentry/deno';

// In logStateChange() when circuit opens:
if (to === 'open') {
  Sentry.captureMessage('Circuit breaker opened', {
    level: 'error',
    extra: event,
    tags: {
      circuit_name: this.config.name,
      failure_count: this.state.failureCount
    }
  });
}
```

**Datadog Integration** (TODO):
```typescript
import { client as ddClient } from 'datadog-client';

// In logStateChange():
ddClient.increment('circuit_breaker.state_change', 1, [
  `circuit:${this.config.name}`,
  `from:${from}`,
  `to:${to}`,
  `trigger:${trigger}`
]);

if (to === 'open') {
  ddClient.event('Circuit Breaker Opened', 'Service degraded', {
    alert_type: 'error',
    tags: [`circuit:${this.config.name}`]
  });
}
```

**CloudWatch Metrics** (TODO):
```typescript
import { CloudWatch } from '@aws-sdk/client-cloudwatch';

const cloudwatch = new CloudWatch({ region: 'us-east-1' });

// In logStateChange():
await cloudwatch.putMetricData({
  Namespace: 'EdgeFunctions',
  MetricData: [{
    MetricName: 'CircuitBreakerStateChange',
    Value: to === 'open' ? 1 : 0,
    Unit: 'Count',
    Dimensions: [
      { Name: 'CircuitName', Value: this.config.name },
      { Name: 'State', Value: to }
    ]
  }]
});
```

---

## Stashed Changes

Pre-migration changes were stashed. To review:
```bash
git stash show -p
```

To apply after migration (if still relevant):
```bash
git stash pop
```

To discard:
```bash
git stash drop
```

---

## Phase 5: Reasoning Status System

**Goal**: Fix the reasoning display to show contextual, LLM-tailored status updates instead of generic "Thinking..." messages.

**Problem Statement**: The `ReasoningProvider` was removed during Gemini migration (January 2026), leaving no mechanism to generate semantic status updates. Users see static "Thinking..." for 70%+ of streaming time because:
1. Backend never sends `reasoning_status` events (only `reasoning_chunk` with raw text)
2. Frontend regex extraction fails on Gemini's prose-style reasoning
3. No fallback progression during long operations

**Solution**: Prompt Engineering + Enhanced Pattern Matching (Options 1+3)
- Instruct Gemini to format reasoning with parseable action headers
- Add backend status extraction with Gemini-specific patterns
- Emit `reasoning_status` events with contextual updates
- Add time-based fallbacks for guaranteed progression

**Prerequisites**: Phases 1-4 complete OR can be done independently

**Files to Create**:
- `supabase/functions/_shared/reasoning-status-extractor.ts`

**Files to Modify**:
- `supabase/functions/_shared/system-prompt-inline.ts` (add reasoning format instructions)
- `supabase/functions/chat/handlers/tool-calling-chat.ts` (emit reasoning_status events)
- `src/components/ReasoningDisplay.tsx` (improve fallback hierarchy)
- `src/hooks/useChatMessages.tsx` (add time tracking)

### Ralph Loop Prompt (Copy/Paste)

```
/ralph-loop "
# LLM Chat Migration - Phase 5: Reasoning Status System

## Objective
Fix the reasoning display to show contextual, LLM-tailored status updates instead of generic 'Thinking...' messages. Implement prompt engineering + enhanced pattern matching.

## Working Directory
/Users/nick/Projects/llm-chat-site

## Problem Analysis
The ReasoningProvider was removed during Gemini migration. Currently:
- Backend sends reasoning_chunk events (raw text) but NOT reasoning_status events
- Frontend falls back to 'Thinking...' because regex can't parse Gemini's prose
- No time-based progression during long operations

## Solution Overview
1. PROMPT ENGINEERING: Instruct Gemini to use action headers in reasoning
2. ENHANCED PATTERNS: Extract status from reasoning text server-side
3. EMIT STATUS EVENTS: Send reasoning_status SSE events
4. TIME-BASED FALLBACKS: Guarantee progression every 3-5 seconds

## Tasks

### Task 5.1: Add Reasoning Format Instructions to System Prompt
Modify: supabase/functions/_shared/system-prompt-inline.ts

Add this section to getSystemInstruction() AFTER the core instructions, BEFORE the tools section:

```typescript
// Add to system prompt string:
const REASONING_FORMAT_INSTRUCTION = \`
## Reasoning Format (For Status Display)

When thinking through problems, occasionally use clear action headers to help users understand your progress:

**[VERB]ing [OBJECT]**

Examples:
- **Analyzing the user's requirements**
- **Planning the component structure**
- **Implementing the data validation logic**
- **Reviewing the error handling**
- **Designing the API interface**

Guidelines:
- Use present participle form (-ing verbs)
- Keep headers under 6 words
- Place headers at natural transition points in your thinking
- Don't force headers - only use when starting a distinct phase
\`;
```

Integrate this into the system prompt template.

### Task 5.2: Create Reasoning Status Extractor
Create file: supabase/functions/_shared/reasoning-status-extractor.ts

```typescript
/**
 * Extracts contextual status from Gemini reasoning text.
 * Uses patterns optimized for Gemini 3 Flash's prose style.
 */

// Verb conjugation map (gerund forms)
const VERB_TO_GERUND: Record<string, string> = {
  analyze: 'Analyzing', check: 'Checking', create: 'Creating',
  design: 'Designing', review: 'Reviewing', build: 'Building',
  implement: 'Implementing', fix: 'Fixing', test: 'Testing',
  write: 'Writing', update: 'Updating', validate: 'Validating',
  configure: 'Configuring', add: 'Adding', remove: 'Removing',
  fetch: 'Fetching', load: 'Loading', process: 'Processing',
  generate: 'Generating', render: 'Rendering', parse: 'Parsing',
  search: 'Searching', find: 'Finding', query: 'Querying',
  connect: 'Connecting', authenticate: 'Authenticating',
  plan: 'Planning', consider: 'Considering', examine: 'Examining',
  evaluate: 'Evaluating', determine: 'Determining', prepare: 'Preparing',
  structure: 'Structuring', organize: 'Organizing', format: 'Formatting',
};

// Patterns optimized for Gemini's reasoning style
const GEMINI_PATTERNS: Array<{ pattern: RegExp; verbIndex: number; objectIndex: number }> = [
  // Markdown headers: **Analyzing the schema**
  { pattern: /\*\*(\w+)ing ([^*]{3,40})\*\*/i, verbIndex: 1, objectIndex: 2 },

  // "I will analyze the schema" / "I'll check the requirements"
  { pattern: /I (?:will|'ll|should|need to|am going to) (\w+) (?:the |a |an )?(.{3,35}?)(?:\.|,|$)/i, verbIndex: 1, objectIndex: 2 },

  // "Let me check the database" / "Let me analyze this"
  { pattern: /Let me (\w+) (?:the |a |an |this |these )?(.{3,35}?)(?:\.|,|$)/i, verbIndex: 1, objectIndex: 2 },

  // "First, I'll design the component" / "Next, let's implement..."
  { pattern: /(?:First|Next|Now|Then),? (?:I'll |I will |let me |let's )?(\w+) (?:the |a |an )?(.{3,35}?)(?:\.|,|$)/i, verbIndex: 1, objectIndex: 2 },

  // "I'm thinking about the architecture" / "I'm considering..."
  { pattern: /I'm (?:thinking about|considering|looking at|examining) (?:the |a |an )?(.{3,35}?)(?:\.|,|$)/i, verbIndex: 0, objectIndex: 1 },

  // "The first step is to validate input"
  { pattern: /(?:first |next |main )?step is to (\w+) (?:the |a |an )?(.{3,35}?)(?:\.|,|$)/i, verbIndex: 1, objectIndex: 2 },
];

/**
 * Convert verb to gerund form
 */
function toGerund(verb: string): string {
  const lower = verb.toLowerCase();
  if (VERB_TO_GERUND[lower]) return VERB_TO_GERUND[lower];

  // Fallback: basic -ing conversion
  if (lower.endsWith('e')) return verb.slice(0, -1) + 'ing';
  if (/[aeiou][bcdfghjklmnpqrstvwxyz]$/.test(lower)) return verb + verb.slice(-1) + 'ing';
  return verb + 'ing';
}

/**
 * Clean and format extracted object text
 */
function cleanObject(text: string): string {
  return text
    .replace(/[.,;:!?]+$/, '')  // Remove trailing punctuation
    .replace(/\s+/g, ' ')        // Normalize whitespace
    .trim()
    .toLowerCase();
}

export interface StatusExtractionResult {
  status: string | null;
  confidence: 'high' | 'medium' | 'low';
  pattern: string | null;
}

/**
 * Extract contextual status from reasoning text
 */
export function extractStatusFromReasoning(text: string): StatusExtractionResult {
  if (!text || text.length < 10) {
    return { status: null, confidence: 'low', pattern: null };
  }

  // Check each pattern in order of preference
  for (const { pattern, verbIndex, objectIndex } of GEMINI_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      let status: string;

      if (verbIndex === 0) {
        // Pattern like "I'm thinking about X" - use "Considering" + object
        const object = cleanObject(match[objectIndex]);
        status = \`Considering \${object}...\`;
      } else {
        // Pattern with verb + object
        const verb = match[verbIndex];
        const object = cleanObject(match[objectIndex]);
        const gerund = toGerund(verb);
        status = \`\${gerund} \${object}...\`;
      }

      // Capitalize first letter
      status = status.charAt(0).toUpperCase() + status.slice(1);

      // Truncate if too long
      if (status.length > 45) {
        status = status.substring(0, 42) + '...';
      }

      return {
        status,
        confidence: pattern.source.includes('\\*\\*') ? 'high' : 'medium',
        pattern: pattern.source.substring(0, 30),
      };
    }
  }

  return { status: null, confidence: 'low', pattern: null };
}

/**
 * Get time-based fallback status
 */
export function getTimeBasedStatus(elapsedMs: number): string {
  if (elapsedMs < 3000) return 'Analyzing your request...';
  if (elapsedMs < 10000) return 'Still working on your request...';
  if (elapsedMs < 20000) return 'Building a detailed response...';
  if (elapsedMs < 30000) return 'Crafting a thorough answer...';
  if (elapsedMs < 45000) return 'This is taking longer than usual...';
  return 'Almost there, finalizing response...';
}
```

### Task 5.3: Emit reasoning_status Events from Backend
Modify: supabase/functions/chat/handlers/tool-calling-chat.ts

1. Import the extractor:
```typescript
import { extractStatusFromReasoning, getTimeBasedStatus } from '../_shared/reasoning-status-extractor.ts';
```

2. Add state tracking near line 542 (before Gemini call):
```typescript
let lastEmittedStatus: string | null = null;
let lastStatusTime = Date.now();
const STATUS_COOLDOWN_MS = 2000; // Prevent flickering

// Emit initial status
sendEvent({ type: 'status_update', status: 'Analyzing your request...' });
```

3. Modify the reasoning chunk handler (around line 587-591):
```typescript
else if (chunk.type === 'reasoning') {
  fullReasoningAccumulated += chunk.data;

  // Try to extract contextual status
  const now = Date.now();
  if (now - lastStatusTime >= STATUS_COOLDOWN_MS) {
    const extraction = extractStatusFromReasoning(chunk.data);

    if (extraction.status && extraction.status !== lastEmittedStatus) {
      sendEvent({
        type: 'reasoning_status',
        status: extraction.status,
        confidence: extraction.confidence,
      });
      lastEmittedStatus = extraction.status;
      lastStatusTime = now;

      console.log(\`[\${requestId}] 📊 Extracted status: \"\${extraction.status}\" (confidence: \${extraction.confidence})\`);
    }
  }

  // Forward raw reasoning chunk
  sendEvent({
    type: 'reasoning_chunk',
    chunk: chunk.data,
  });
}
```

4. Add continuation status (around line 962):
```typescript
sendEvent({
  type: 'status_update',
  status: 'Analyzing results and formulating response...'
});
```

5. Fix reasoning_complete to emit for ALL responses (move outside artifact block, around line 643):
```typescript
// After stream completes, send reasoning_complete for ALL response types
if (fullReasoningAccumulated) {
  sendEvent({
    type: 'reasoning_complete',
    reasoning: fullReasoningAccumulated,
  });
}
```

### Task 5.4: Update Frontend ReasoningDisplay
Modify: src/components/ReasoningDisplay.tsx

Update getStreamingStatus() to use the new priority system:

```typescript
const getStreamingStatus = (): string => {
  // P1: Semantic status from backend (reasoning_status events)
  if (reasoningStatus && reasoningStatus !== 'Thinking...') {
    return reasoningStatus;
  }

  // P2: Tool execution status (always available during tool use)
  if (toolExecution && isStreaming) {
    const { toolName, success, sourceCount } = toolExecution;
    if (success !== undefined) {
      if (success && sourceCount !== undefined) {
        return \`Found \${sourceCount} source\${sourceCount !== 1 ? 's' : ''}\`;
      }
      return success ? \`\${toolName} completed\` : \`\${toolName} failed\`;
    }
    switch (toolName) {
      case 'browser.search': return 'Searching the web...';
      case 'generate_artifact': return 'Generating artifact...';
      case 'generate_image': return 'Creating image...';
      default: return \`Using \${toolName}...\`;
    }
  }

  // P3: Extract from streaming reasoning text (improved patterns)
  if (streamingReasoningText && isStreaming) {
    // Check for markdown headers: **Header Text**
    const headerMatch = streamingReasoningText.match(/\*\*([^*]{3,40})\*\*/);
    if (headerMatch) {
      const header = headerMatch[1].trim();
      return header.length > 35 ? header.substring(0, 32) + '...' : header + '...';
    }

    // Check for action phrases: 'I will analyze' -> 'Analyzing...'
    const actionMatch = streamingReasoningText.match(
      /(?:I (?:will|'ll|should) |Let me )(\w+) (?:the |a |an )?(.{3,25}?)(?:\.|,|$)/i
    );
    if (actionMatch) {
      const verb = actionMatch[1];
      const object = actionMatch[2].toLowerCase().replace(/[.,;:]+$/, '');
      // Simple gerund conversion
      const gerund = verb.endsWith('e') ? verb.slice(0, -1) + 'ing' : verb + 'ing';
      const status = \`\${gerund.charAt(0).toUpperCase() + gerund.slice(1)} \${object}...\`;
      if (status.length <= 40) return status;
    }
  }

  // P4: Time-based fallback (guaranteed progression)
  // This requires elapsedSeconds prop to be passed
  if (typeof elapsedSeconds === 'number' && isStreaming) {
    if (elapsedSeconds < 3) return 'Analyzing your request...';
    if (elapsedSeconds < 10) return 'Still working on your request...';
    if (elapsedSeconds < 20) return 'Building a detailed response...';
    if (elapsedSeconds < 30) return 'Crafting a thorough answer...';
    if (elapsedSeconds < 45) return 'This is taking longer than usual...';
    return 'Almost there, finalizing response...';
  }

  // P5: Generic fallback (should rarely reach here now)
  return 'Thinking...';
};
```

Add elapsedSeconds prop to ReasoningDisplayProps interface:
```typescript
interface ReasoningDisplayProps {
  // ... existing props
  elapsedSeconds?: number;  // NEW: Time elapsed since stream started
}
```

### Task 5.5: Add Time Tracking to useChatMessages
Modify: src/hooks/useChatMessages.tsx

Add elapsed time tracking to StreamProgress:

```typescript
// In updateProgress() function, add:
const elapsedMs = Date.now() - streamStartTime;
const elapsedSeconds = Math.floor(elapsedMs / 1000);

return {
  // ... existing fields
  elapsedSeconds,  // NEW
};
```

Add streamStartTime tracking:
```typescript
// Near the start of streamChat(), add:
const streamStartTime = Date.now();
```

### Task 5.6: Update Parent Components
Modify: src/components/ChatMessage.tsx (or wherever ReasoningDisplay is rendered)

Pass the new elapsedSeconds prop:
```typescript
<ReasoningDisplay
  // ... existing props
  elapsedSeconds={progress?.elapsedSeconds}
/>
```

### Task 5.7: Add Integration Tests
Create file: supabase/functions/_shared/__tests__/reasoning-status-extractor.test.ts

Test cases:
1. Extracts markdown headers correctly
2. Extracts 'I will...' patterns
3. Extracts 'Let me...' patterns
4. Returns null for non-matching text
5. Respects 45-char limit
6. Gerund conversion works correctly
7. Time-based fallbacks progress correctly

## Verification Commands
npm run build && npm run test

## Completion Criteria
ALL must be true:
- [ ] npm run build passes
- [ ] npm run test passes
- [ ] System prompt includes reasoning format instructions
- [ ] reasoning-status-extractor.ts exists with tests
- [ ] Backend emits reasoning_status events during streaming
- [ ] Frontend shows contextual status instead of generic 'Thinking...'
- [ ] Time-based fallbacks trigger at 3s, 10s, 20s, 30s, 45s
- [ ] Manual test: Send a complex request and observe status changes every 3-5 seconds

When ALL criteria met, output: <promise>PHASE5_COMPLETE</promise>

## Self-Correction Instructions
If status extraction not working:
1. Check console logs for extraction attempts
2. Verify pattern matching with test cases
3. Try adding more patterns for Gemini's style

If frontend not showing status:
1. Verify reasoning_status events are being emitted (check browser Network tab)
2. Check useChatMessages is handling reasoning_status event type
3. Verify ReasoningDisplay is receiving reasoningStatus prop

If status flickering:
1. Increase STATUS_COOLDOWN_MS from 2000 to 3000
2. Add debouncing in frontend
3. Check for duplicate event emission

After 12 iterations without completion:
1. Focus on backend status emission (most impact)
2. Document partial progress
3. Output PHASE5_COMPLETE if core status extraction works
" --completion-promise "PHASE5_COMPLETE" --max-iterations 15
```

---

## Phase 5 Summary

### Expected Results

| Scenario | Before (Current) | After (Phase 5) |
|----------|-----------------|-----------------|
| Simple question | "Thinking..." (static) | "Analyzing your request..." → "Building response..." |
| Code request | "Thinking..." (static) | "Analyzing the requirements..." → "Planning the implementation..." |
| Complex artifact | "Thinking..." → "Generating artifact..." | "Analyzing requirements..." → "Designing component structure..." → "Implementing logic..." |
| Long operation (30s+) | "Thinking..." (stuck) | Progressive updates every 3-5 seconds |

### Status Coverage by Priority

| Priority | Source | Coverage | Contextual? |
|----------|--------|----------|-------------|
| P1 | Backend reasoning_status | 40-60% | ✅ Yes |
| P2 | Tool execution | 10-30% | ⚠️ Partial |
| P3 | Frontend regex | 10-20% | ⚠️ Partial |
| P4 | Time-based fallback | 100% | ❌ Generic |
| P5 | "Thinking..." | <5% | ❌ Generic |

### Key Files Changed

| File | Change Type | Purpose |
|------|-------------|---------|
| `system-prompt-inline.ts` | Modified | Add reasoning format instructions |
| `reasoning-status-extractor.ts` | Created | Backend status extraction |
| `tool-calling-chat.ts` | Modified | Emit reasoning_status events |
| `ReasoningDisplay.tsx` | Modified | 5-level priority system |
| `useChatMessages.tsx` | Modified | Time tracking |

### Success Metrics

- **Static "Thinking..." Duration**: < 3 seconds (currently: unbounded)
- **Status Update Frequency**: Every 3-5 seconds (currently: sporadic)
- **Contextual Status Coverage**: > 50% (currently: ~10%)
- **User Perceivable Changes**: 3+ status updates per 30s stream (currently: 0-2)
