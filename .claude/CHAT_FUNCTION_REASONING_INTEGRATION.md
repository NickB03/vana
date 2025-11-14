# Chat Edge Function - Reasoning Integration Strategy

**Date:** 2025-11-14
**Purpose:** Add Chain of Thought reasoning generation to chat function

## Changes Overview

### 1. Add Import for Reasoning Generator
```typescript
// Line 8 (after existing imports)
import { generateStructuredReasoning, createFallbackReasoning, type StructuredReasoning } from "../_shared/reasoning-generator.ts";
```

### 2. Extend Request Body Interface
```typescript
// Line 32 (in request body destructuring)
const {
  messages,
  sessionId,
  currentArtifact,
  isGuest,
  forceImageMode,
  forceArtifactMode,
  includeReasoning = false  // NEW: Optional flag to enable reasoning
} = requestBody;
```

### 3. Add Reasoning Generation (Before Main Chat Stream)
**Location:** After intent detection, before OpenRouter call (~line 625)

**Strategy:**
- Generate reasoning BEFORE starting chat stream
- Send reasoning as first SSE event
- Continue with regular chat streaming
- Graceful degradation: if reasoning fails, continue with chat only

```typescript
// BEFORE: const response = await callGeminiFlashWithRetry(...)

// Generate structured reasoning if requested
let structuredReasoning: StructuredReasoning | null = null;

if (includeReasoning && lastUserMessage) {
  console.log(`[${requestId}] 🧠 Generating reasoning for: "${lastUserMessage.content.substring(0, 50)}..."`);

  try {
    structuredReasoning = await generateStructuredReasoning(
      lastUserMessage.content,
      contextMessages.filter(m => m.role !== 'system') as OpenRouterMessage[],
      {
        maxSteps: 3,  // Limit for faster generation
        timeout: 8000  // 8s timeout
      }
    );

    console.log(`[${requestId}] ✅ Reasoning generated: ${structuredReasoning.steps.length} steps`);
  } catch (reasoningError) {
    console.error(`[${requestId}] ⚠️ Reasoning generation failed:`, reasoningError);
    // Use fallback reasoning instead of blocking the response
    structuredReasoning = createFallbackReasoning(reasoningError.message);
  }
}
```

### 4. Create Custom Streaming Transform
**Location:** Replace existing `transformedStream` (~line 704)

**Strategy:**
- Inject reasoning event as FIRST SSE message
- Then stream regular chat content
- Preserve existing artifact transformation logic

```typescript
// Create custom transform stream to inject reasoning
const transformedStream = response.body!.pipeThrough(new TextDecoderStream()).pipeThrough(
  (() => {
    // Closure-scoped state
    let buffer = '';
    let insideArtifact = false;
    let reasoningSent = false;  // NEW: Track if reasoning was sent

    return new TransformStream({
      start(controller) {
        // NEW: Send reasoning as FIRST event if available
        if (structuredReasoning && !reasoningSent) {
          const reasoningEvent = {
            type: 'reasoning',
            sequence: 0,
            timestamp: Date.now(),
            data: structuredReasoning
          };

          controller.enqueue(`data: ${JSON.stringify(reasoningEvent)}\n\n`);
          reasoningSent = true;

          console.log(`[${requestId}] 📤 Sent reasoning event`);
        }
      },
      transform(chunk, controller) {
        // EXISTING artifact transformation logic remains unchanged
        buffer += chunk;

        if (!insideArtifact && buffer.includes('<artifact')) {
          const artifactStartMatch = buffer.match(/<artifact[^>]*>/);
          if (artifactStartMatch) {
            insideArtifact = true;
          }
        }

        if (insideArtifact && buffer.includes('</artifact>')) {
          while (true) {
            const fullArtifactMatch = buffer.match(/(<artifact[^>]*>)([\s\S]*?)(<\/artifact>)/);
            if (!fullArtifactMatch) break;

            const [fullMatch, openTag, content, closeTag] = fullArtifactMatch;

            try {
              const result = transformArtifactCode(content);

              if (result.hadIssues) {
                console.log("🔧 Auto-fixed artifact imports:", result.changes);
                buffer = buffer.replace(fullMatch, openTag + result.transformedContent + closeTag);
              }
            } catch (error) {
              console.error("❌ Transform failed, sending original artifact:", error);
              break;
            }

            if (!buffer.includes('</artifact>')) {
              insideArtifact = false;
              break;
            }
          }
          insideArtifact = false;
        }

        if (!insideArtifact) {
          controller.enqueue(buffer);
          buffer = '';
        } else if (buffer.length > 50000) {
          console.warn("⚠️ Buffer overflow - sending untransformed artifact");
          controller.enqueue(buffer);
          buffer = '';
          insideArtifact = false;
        }
      },
      flush(controller) {
        if (buffer) {
          controller.enqueue(buffer);
        }
      }
    });
  })()
).pipeThrough(new TextEncoderStream());
```

## Benefits of This Approach

### 1. **Non-Blocking Architecture**
- Reasoning generation happens BEFORE main chat stream
- Total latency: ~1-2s for reasoning + normal chat time
- User sees reasoning immediately, then chat streams in

### 2. **Graceful Degradation**
- If reasoning fails, fallback reasoning is used
- Chat response continues normally
- No user-facing errors

### 3. **Backward Compatibility**
- `includeReasoning` defaults to `false`
- Existing clients continue to work unchanged
- Opt-in feature for new clients

### 4. **Minimal Changes**
- Only ~50 lines of new code
- Existing artifact transformation preserved
- No changes to error handling

### 5. **Performance Optimized**
- Reasoning uses fast Gemini Flash (sub-second)
- Limited to 3 steps for quick generation
- 8s timeout prevents hanging

## Testing Checklist

- [ ] Reasoning event arrives FIRST in SSE stream
- [ ] Chat content streams normally after reasoning
- [ ] Artifact transformation still works
- [ ] Graceful fallback on reasoning errors
- [ ] Backward compatibility (`includeReasoning=false`)
- [ ] Error handling unchanged
- [ ] Rate limiting unchanged
- [ ] No memory leaks from buffering

## Rollout Strategy

1. **Week 1:** Deploy to staging, test manually
2. **Week 2:** Production beta with `includeReasoning=false` by default
3. **Week 3:** Enable for 10% of users via feature flag
4. **Week 4:** Full rollout if metrics are positive

## Monitoring Metrics

- **Reasoning Generation Time:** Target <2s p95
- **Reasoning Success Rate:** Target >95%
- **Chat Latency Impact:** Target <10% increase
- **Error Rate:** Target <0.1% increase

---

**Status:** Ready for implementation
**Risk Level:** Low (backward compatible, graceful degradation)
**Estimated Implementation Time:** 30 minutes
