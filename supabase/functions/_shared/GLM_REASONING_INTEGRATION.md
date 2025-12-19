# GLM Reasoning Parser Integration Guide

This guide shows how to use the `glm-reasoning-parser.ts` utility to convert GLM's raw reasoning text into the app's structured format.

## Overview

GLM-4.6 returns `reasoning_content` as free-form text when thinking mode is enabled. This parser intelligently converts that raw text into the app's `StructuredReasoning` format with organized steps and phases.

## Files

- **Parser**: `supabase/functions/_shared/glm-reasoning-parser.ts`
- **Tests**: `supabase/functions/_shared/__tests__/glm-reasoning-parser.test.ts`
- **GLM Client**: `supabase/functions/_shared/glm-client.ts`
- **Reasoning Types**: `supabase/functions/_shared/reasoning-generator.ts`

## Quick Start

### 1. Extract reasoning from GLM response

```typescript
import { extractTextAndReasoningFromGLM } from '../_shared/glm-client.ts';
import { parseGLMReasoningToStructured } from '../_shared/glm-reasoning-parser.ts';

// Call GLM with thinking mode enabled
const response = await callGLM(systemPrompt, userPrompt, {
  enableThinking: true,  // ← Enable thinking mode
  requestId,
});

const responseData = await response.json();

// Extract both artifact content and reasoning
const { text, reasoning } = extractTextAndReasoningFromGLM(responseData, requestId);
```

### 2. Parse reasoning into structured format

```typescript
// Convert raw reasoning text to structured format
const structuredReasoning = reasoning
  ? parseGLMReasoningToStructured(reasoning)
  : null;

// Use structured reasoning in your response
if (structuredReasoning) {
  console.log(`Generated ${structuredReasoning.steps.length} reasoning steps`);
  console.log(`Summary: ${structuredReasoning.summary}`);
}
```

### 3. Store in database

```typescript
// Store in chat_messages table
await supabase.from('chat_messages').insert({
  session_id: sessionId,
  role: 'assistant',
  content: text,
  reasoning: structuredReasoning,  // ← Structured reasoning
  model: 'zhipu-ai/glm-4.6',
  created_at: new Date().toISOString(),
});
```

## Complete Example

```typescript
// In generate-artifact/index.ts or similar

import { callGLMWithRetryTracking, extractTextAndReasoningFromGLM } from '../_shared/glm-client.ts';
import { parseGLMReasoningToStructured } from '../_shared/glm-reasoning-parser.ts';

export default async function handler(req: Request) {
  const requestId = crypto.randomUUID();

  // Call GLM with thinking mode
  const { response, retryCount } = await callGLMWithRetryTracking(
    systemPrompt,
    userPrompt,
    {
      temperature: 1.0,
      max_tokens: 8000,
      requestId,
      enableThinking: true,  // ← Enable reasoning
    }
  );

  if (!response.ok) {
    return handleGLMError(response, requestId, corsHeaders);
  }

  const responseData = await response.json();

  // Extract both content and reasoning
  const { text: artifactContent, reasoning: rawReasoning } =
    extractTextAndReasoningFromGLM(responseData, requestId);

  // Parse reasoning into structured format
  const structuredReasoning = rawReasoning
    ? parseGLMReasoningToStructured(rawReasoning)
    : null;

  // Log reasoning details
  if (structuredReasoning) {
    console.log(`[${requestId}] 🧠 Structured reasoning:`);
    console.log(`  - Steps: ${structuredReasoning.steps.length}`);
    console.log(`  - Phases: ${structuredReasoning.steps.map(s => s.phase).join(', ')}`);
    console.log(`  - Summary: ${structuredReasoning.summary}`);
  }

  // Return response with reasoning
  return new Response(
    JSON.stringify({
      artifact: artifactContent,
      reasoning: structuredReasoning,
      requestId,
    }),
    {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    }
  );
}
```

## Parser Features

### Detected Patterns

The parser intelligently detects:

1. **Numbered steps**: `1.`, `2.`, `Step 1:`, `1)`
2. **Section headers**: Lines ending with `:`
3. **Bullet points**: `-`, `*`, `•`
4. **Paragraph breaks**: Double newlines as section dividers

### Phase Inference

The parser maps content to appropriate phases:

- **research**: Keywords like "analyzing", "understanding", "exploring", "investigating"
- **analysis**: Keywords like "evaluating", "considering", "comparing", "planning"
- **solution**: Keywords like "implementing", "creating", "building", "generating"
- **custom**: Fallback for content without clear phase indicators

Position-based fallback:
- First 33% of steps → `research`
- Middle 33% → `analysis`
- Last 33% → `solution`

### Title Generation

Ensures titles are:
- Present tense with action verbs
- 15-60 characters
- Clear and scannable
- Remove "Step N:" prefixes

### Graceful Fallback

If parsing fails or text is unstructured:
- Creates a single "Model reasoning" step
- Uses `custom` phase with `sparkles` icon
- Splits text into sentences/paragraphs for readability

## Example Input/Output

### Input (Raw GLM Reasoning)

```
1. Analyzing the user's request for a React component
The user wants to create a custom dropdown component with accessibility features.
Key requirements include keyboard navigation and ARIA labels.

2. Planning the implementation approach
I'll use Radix UI primitives for accessibility compliance.
The component will follow React best practices with TypeScript.

3. Implementing the solution
- Create main Dropdown component with composition pattern
- Implement keyboard event handlers
- Add ARIA attributes for screen readers
```

### Output (Structured Reasoning)

```typescript
{
  steps: [
    {
      phase: "research",
      title: "Analyzing the user's request for a React component",
      icon: "search",
      items: [
        "The user wants to create a custom dropdown component with accessibility features.",
        "Key requirements include keyboard navigation and ARIA labels."
      ]
    },
    {
      phase: "analysis",
      title: "Planning the implementation approach",
      icon: "lightbulb",
      items: [
        "I'll use Radix UI primitives for accessibility compliance.",
        "The component will follow React best practices with TypeScript."
      ]
    },
    {
      phase: "solution",
      title: "Implementing the solution",
      icon: "target",
      items: [
        "Create main Dropdown component with composition pattern",
        "Implement keyboard event handlers",
        "Add ARIA attributes for screen readers"
      ]
    }
  ],
  summary: "Add ARIA attributes for screen readers"
}
```

## Testing

Run the test suite:

```bash
cd supabase/functions
deno test _shared/__tests__/glm-reasoning-parser.test.ts
```

Test coverage includes:
- ✅ Numbered step detection (1., 2., Step 1:)
- ✅ Section header detection (lines ending with :)
- ✅ Bullet point extraction (-, *, •)
- ✅ Paragraph-based section splitting
- ✅ Phase inference (keyword and position-based)
- ✅ Title generation and cleanup
- ✅ Fallback handling for unstructured text
- ✅ Edge cases (empty, null, malformed input)
- ✅ Real-world GLM output examples

## Validation

All parsed output is validated against the `StructuredReasoning` schema:

```typescript
interface StructuredReasoning {
  steps: Array<{
    phase: 'research' | 'analysis' | 'solution' | 'custom';
    title: string;  // 10-500 characters
    icon?: 'search' | 'lightbulb' | 'target' | 'sparkles';
    items: string[];  // 1-20 items, each 1-2000 characters
  }>;
  summary?: string;  // Optional, max 1000 characters
}
```

Validation includes:
- Structure validation (types, required fields)
- Length constraints (titles, items, summary)
- XSS prevention (dangerous patterns blocked)
- Array size limits (max 10 steps, 20 items per step)

## Migration Path

### Current State (Before Parser)

```typescript
// Old: Reasoning content is just logged, not stored
const reasoningContent = responseData.choices[0].message.reasoning_content;
if (reasoningContent) {
  console.log(`🧠 GLM reasoning: ${reasoningContent.length} chars`);
}
```

### With Parser (After Migration)

```typescript
// New: Parse and store structured reasoning
const { text, reasoning } = extractTextAndReasoningFromGLM(responseData, requestId);
const structuredReasoning = reasoning
  ? parseGLMReasoningToStructured(reasoning)
  : null;

// Store in database for Chain of Thought UI
await supabase.from('chat_messages').insert({
  content: text,
  reasoning: structuredReasoning,  // ← Now structured
  // ... other fields
});
```

## API Reference

### `parseGLMReasoningToStructured(rawReasoning: string): StructuredReasoning | null`

Parses GLM's raw reasoning text into structured format.

**Parameters:**
- `rawReasoning` - Free-form reasoning text from GLM API

**Returns:**
- `StructuredReasoning` - Structured reasoning with steps and phases
- `null` - If input is invalid or empty

**Example:**
```typescript
const reasoning = parseGLMReasoningToStructured(glmReasoningText);
if (reasoning) {
  console.log(`${reasoning.steps.length} steps generated`);
}
```

## Best Practices

1. **Always enable thinking mode** when you want reasoning:
   ```typescript
   await callGLM(prompt, input, { enableThinking: true });
   ```

2. **Use `extractTextAndReasoningFromGLM`** instead of `extractTextFromGLM`:
   ```typescript
   const { text, reasoning } = extractTextAndReasoningFromGLM(data);
   ```

3. **Check for null before using** the parsed result:
   ```typescript
   const structured = reasoning ? parseGLMReasoningToStructured(reasoning) : null;
   ```

4. **Log reasoning details** for debugging:
   ```typescript
   if (structuredReasoning) {
     console.log(`Steps: ${structuredReasoning.steps.length}`);
     console.log(`Phases: ${structuredReasoning.steps.map(s => s.phase).join(', ')}`);
   }
   ```

5. **Store in database** for Chain of Thought UI display:
   ```typescript
   await supabase.from('chat_messages').insert({
     reasoning: structuredReasoning,  // JSONB column
   });
   ```

## Troubleshooting

### Parser returns null

**Cause**: Invalid input (empty, null, or non-string)

**Solution**: Check the reasoning content before parsing:
```typescript
if (reasoning && typeof reasoning === 'string' && reasoning.trim().length > 0) {
  const structured = parseGLMReasoningToStructured(reasoning);
}
```

### Validation fails after parsing

**Cause**: Parsed output doesn't meet schema requirements

**Solution**: Check console logs for validation error details:
```typescript
try {
  validateReasoningSteps(structured);
} catch (error) {
  console.error('Validation failed:', error.message);
}
```

### Only one step generated for multi-step reasoning

**Cause**: Text doesn't match any structural patterns

**Solution**: The parser falls back to a single "Model reasoning" step. This is expected for truly unstructured text.

### Incorrect phase assignment

**Cause**: Content doesn't contain phase-indicating keywords

**Solution**: The parser uses position-based inference as fallback. This is expected behavior.

## Real-Time Status Generation

For streaming contexts (SSE), use `ReasoningProvider` to convert GLM reasoning chunks into semantic status updates in real-time.

### ReasoningProvider Overview

The ReasoningProvider is a hybrid LLM+fallback system that generates status messages during streaming:

```
┌─────────────────────────────────────────────────────────────┐
│                    ReasoningProvider                        │
│  ┌──────────────┐    ┌─────────────────────────────────┐   │
│  │ CircuitBreaker│───▶│ GLM-4.5-Air (Primary)            │   │
│  │ 3 failures →  │    │ Generates semantic status from   │   │
│  │ 30s cooldown  │    │ reasoning text chunks            │   │
│  └──────────────┘    └─────────────────────────────────┘   │
│         │                                                   │
│         ▼ (when LLM unavailable)                           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Phase-Based Fallback                                 │   │
│  │ analyzing → "Examining requirements..."              │   │
│  │ planning  → "Designing the approach..."              │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Usage in Streaming Context

```typescript
import {
  createReasoningProvider,
  type IReasoningProvider,
  type ReasoningEvent
} from '../_shared/reasoning-provider.ts';
import { shouldUseReasoningProvider } from '../_shared/config.ts';

// Check feature flag
if (shouldUseReasoningProvider(requestId)) {
  // Create provider with callback
  const provider = createReasoningProvider(requestId, async (event: ReasoningEvent) => {
    // event.type: 'reasoning_status' | 'reasoning_final' | 'reasoning_heartbeat' | 'reasoning_error'
    // event.message: The status message to display
    // event.phase: Current thinking phase
    controller.enqueue(`data: ${JSON.stringify({ type: event.type, message: event.message })}\n\n`);
  });

  await provider.start();

  // As GLM streams reasoning_content...
  for await (const chunk of glmStream) {
    if (chunk.reasoning_content) {
      // Fire-and-forget: provider buffers internally
      provider.processReasoningChunk(chunk.reasoning_content);
    }
  }

  // Finalize and cleanup
  await provider.finalize("artifact description");
  provider.destroy();
}
```

### Feature Flag Control

```bash
# Enable ReasoningProvider (default: false)
USE_REASONING_PROVIDER=true

# Percentage rollout (default: 100 when enabled)
REASONING_PROVIDER_ROLLOUT_PERCENT=50
```

### When to Use

| Scenario | Use Parser | Use ReasoningProvider |
|----------|------------|----------------------|
| Non-streaming response | ✅ `parseGLMReasoningToStructured()` | ❌ |
| Streaming with status updates | ❌ | ✅ |
| Storing reasoning in DB | ✅ | ❌ |
| Real-time UI ticker | ❌ | ✅ |

### Files

- **ReasoningProvider**: `supabase/functions/_shared/reasoning-provider.ts`
- **Config/Flags**: `supabase/functions/_shared/config.ts`
- **Integration Examples**:
  - `supabase/functions/generate-artifact/index.ts`
  - `supabase/functions/chat/handlers/streaming.ts`

## Related Documentation

- **GLM Client**: `supabase/functions/_shared/glm-client.ts`
- **Reasoning Generator**: `supabase/functions/_shared/reasoning-generator.ts`
- **Reasoning Provider**: `supabase/functions/_shared/reasoning-provider.ts` (real-time status)
- **Chain of Thought UI**: `src/components/ReasoningDisplay.tsx`
- **Database Schema**: `supabase/migrations/` (reasoning column)

## Support

For questions or issues:
1. Check the test suite for usage examples
2. Review the source code JSDoc comments
3. Check console logs for parser debug output
4. Run tests to verify parser behavior
