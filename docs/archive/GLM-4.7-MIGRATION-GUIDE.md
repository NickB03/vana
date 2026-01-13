# GLM-4.6 to GLM-4.7 Migration Guide

**Last Updated**: 2025-12-28
**Migration Difficulty**: Low (Minimal Breaking Changes)
**Estimated Effort**: 2-4 hours
**Risk Level**: Low

---

## Executive Summary

GLM-4.7 is a significant upgrade to GLM-4.6 with enhanced coding capabilities, improved reasoning, and new thinking mode features. The migration is straightforward since the API format remains OpenAI-compatible with minimal breaking changes. Most changes are additive features that can be adopted incrementally.

### Key Benefits of Upgrading

| Metric | GLM-4.6 | GLM-4.7 | Improvement |
|--------|---------|---------|-------------|
| SWE-bench | 68.0% | 73.8% | +5.8% |
| SWE-bench Multilingual | 53.8% | 66.7% | +12.9% |
| Terminal Bench 2.0 | 24.5% | 41.0% | +16.5% |
| HLE with Tools | 30.4% | 42.8% | +12.4% |
| τ²-Bench (Tool Usage) | 75.2% | 87.4% | +12.2% |
| Context Window | 128K | 200K | +56% |
| Max Output Tokens | ~8K | 128K | +1500% |

---

## Table of Contents

1. [Quick Start - Minimal Migration](#quick-start---minimal-migration)
2. [Detailed Changes Analysis](#detailed-changes-analysis)
3. [New Features to Consider](#new-features-to-consider)
4. [Code Changes Required](#code-changes-required)
5. [Configuration Changes](#configuration-changes)
6. [Testing Checklist](#testing-checklist)
7. [Rollback Plan](#rollback-plan)
8. [Known Issues & Considerations](#known-issues--considerations)

---

## Quick Start - Minimal Migration

For a minimal, low-risk migration, only **one change is required**:

### Step 1: Update Model Name in config.ts

```typescript
// File: supabase/functions/_shared/config.ts
// Line ~274-275

// Before (GLM-4.6)
export const MODELS = {
  GLM_4_6: 'zhipu/glm-4.6',
  // ...
} as const;

// After (GLM-4.7)
export const MODELS = {
  GLM_4_7: 'zhipu/glm-4.7',  // Renamed for clarity
  // ...
} as const;
```

### Step 2: Update References

Update all references from `MODELS.GLM_4_6` to `MODELS.GLM_4_7` (or keep the same key name if you prefer):

```bash
# Find all references
grep -r "GLM_4_6" supabase/functions/
```

### Step 3: Deploy

```bash
./scripts/deploy-simple.sh prod
```

**That's it for minimal migration!** The API format is identical.

---

## Detailed Changes Analysis

### Breaking Changes

**None identified.** The API format remains fully OpenAI-compatible.

### Non-Breaking API Changes

| Parameter | GLM-4.6 | GLM-4.7 | Impact |
|-----------|---------|---------|--------|
| `temperature` default | 1.0 | 1.0 | No change |
| `top_p` default | 0.95 | 0.95 | No change |
| `max_tokens` max | 8,192 | 128,000 | Can increase if needed |
| Context window | 128K | 200K | More context available |
| `tool_stream` | Not available | New option | Optional enhancement |
| Thinking defaults | Manual enable | Auto-enabled | May affect latency |

### Default Behavior Changes

1. **Thinking Mode is ON by Default in GLM-4.7**
   - GLM-4.6: Thinking was a hybrid approach
   - GLM-4.7: Thinking is activated by default
   - **Impact**: Responses may be slower but higher quality
   - **Mitigation**: Add `thinking: { type: "disabled" }` for simple queries

2. **Preserved Thinking (New)**
   - GLM-4.7 can retain reasoning across conversation turns
   - **Impact**: Better multi-turn reasoning but requires passing full reasoning_content back
   - **Mitigation**: Current implementation already handles this via conversation history

---

## New Features to Consider

### 1. Streaming Tool Calls (`tool_stream`)

**What it does**: Stream tool call arguments progressively instead of waiting for complete JSON.

**Current Implementation** (glm-client.ts):
```typescript
// We already handle streaming tool calls via delta.tool_calls
// GLM-4.7's tool_stream makes this more efficient
```

**Optional Enhancement**:
```typescript
// Add to request body in callGLM()
const requestBody: Record<string, unknown> = {
  model: MODELS.GLM_4_7.split('/').pop(),
  messages,
  // ... existing params
  tool_stream: true,  // NEW: Enable streaming tool arguments
};
```

**Recommendation**: Enable after initial migration to improve tool calling UX.

---

### 2. Turn-Level Thinking Control

**What it does**: Enable/disable thinking on a per-request basis for cost/latency optimization.

**Use Cases**:
- Disable thinking for simple queries
- Enable thinking for complex artifact generation
- Reduce costs on high-volume endpoints

**Implementation**:
```typescript
// For simple chat responses (faster, cheaper)
thinking: { type: "disabled" }

// For complex artifacts (current behavior)
thinking: { type: "enabled" }
```

**Current Code** (glm-client.ts:372):
```typescript
// Already implemented - no changes needed
thinking: enableThinking ? { type: "enabled" } : { type: "disabled" }
```

---

### 3. Preserved Thinking

**What it does**: Retains reasoning content across turns for better context continuity.

**Configuration**:
```typescript
thinking: {
  type: "enabled",
  clear_thinking: false  // NEW: Preserve thinking across turns
}
```

**Important**: When using preserved thinking, you must return the complete, unmodified `reasoning_content` from previous turns.

**Implementation Consideration**:
This would require changes to conversation history management to include `reasoning_content` in assistant messages. Consider as a Phase 2 enhancement.

---

### 4. Increased Output Limits

**What it does**: GLM-4.7 supports up to 128K output tokens (vs ~8K in GLM-4.6).

**Current Code** (config.ts):
```typescript
export const DEFAULT_MODEL_PARAMS = {
  MAX_TOKENS: 8000,  // Can increase to 128000 if needed
  ARTIFACT_MAX_TOKENS: 8000,  // Can increase for very large artifacts
};
```

**Recommendation**: Keep current limits unless users report truncation issues. Larger outputs = higher costs.

---

## Code Changes Required

### Minimal Migration (Required)

#### 1. Update config.ts

```typescript
// supabase/functions/_shared/config.ts

export const MODELS = {
  /** Gemini 2.5 Flash Lite for chat/summaries/titles */
  GEMINI_FLASH: 'google/gemini-2.5-flash-lite',

  /** GLM-4.7 for artifact generation and fixing - via Z.ai API */
  GLM_4_7: 'zhipu/glm-4.7',  // UPDATED from glm-4.6

  /** GLM-4.5-Air for ultra-fast reasoning summarization */
  GLM_4_5_AIR: 'zhipu/glm-4.5-air',

  /** Gemini Flash Image for image generation */
  GEMINI_FLASH_IMAGE: 'google/gemini-2.5-flash-image'
} as const;
```

#### 2. Update glm-client.ts Header Comments

```typescript
// supabase/functions/_shared/glm-client.ts

/**
 * GLM-4.7 API Client
 *
 * Dedicated client for Z.ai's GLM-4.7 model for artifact generation and fixing.
 * Uses OpenAI-compatible API format with thinking mode support.
 *
 * Key Features:
 * - OpenAI-compatible message format
 * - Built-in thinking/reasoning mode (enabled by default in 4.7)
 * - Streaming tool calls via tool_stream
 * - Automatic retry with exponential backoff
 * - Usage logging for admin dashboard
 *
 * API Documentation: https://docs.z.ai/guides/llm/glm-4.7
 */
```

#### 3. Update Log Messages

```typescript
// glm-client.ts:339
console.log(`[${requestId}] 🤖 Routing to GLM-4.7 via Z.ai API (thinking: ${enableThinking}, stream: ${stream})`);

// glm-client.ts:576
console.log(`${logPrefix} ✅ Extracted artifact from GLM-4.7, length: ${text.length} characters (finish_reason: ${finishReason})`);
```

---

### Optional Enhancements (Phase 2)

#### Enable Streaming Tool Calls

```typescript
// glm-client.ts - Add to CallGLMOptions interface
export interface CallGLMOptions {
  // ... existing options
  toolStream?: boolean;  // NEW: Enable streaming tool arguments
}

// In callGLM function, add to requestBody:
if (tools && tools.length > 0) {
  requestBody.tools = tools.map(tool => ({/* ... */}));
  requestBody.tool_choice = toolChoice === "auto" ? "auto" : {/* ... */};

  // NEW: Enable streaming tool call arguments
  if (options?.toolStream !== false) {
    requestBody.tool_stream = true;
  }
}
```

#### Add Turn-Level Thinking Control

```typescript
// In artifact generation (high-quality needed):
await callGLM(systemPrompt, userPrompt, {
  enableThinking: true,  // Explicit for complex tasks
});

// In simple chat responses (speed needed):
await callGLM(systemPrompt, userPrompt, {
  enableThinking: false,  // Disable for simple queries
});
```

---

## Configuration Changes

### Environment Variables

No new environment variables required. Existing `GLM_API_KEY` works unchanged.

### Optional New Configuration

```typescript
// config.ts - Add if implementing Phase 2 features

export const GLM_4_7_CONFIG = {
  /** Enable streaming tool call arguments (new in 4.7) */
  TOOL_STREAM_ENABLED: true,

  /** Preserve thinking across conversation turns */
  PRESERVED_THINKING_ENABLED: false,  // Requires conversation history changes

  /** Default thinking mode for simple queries */
  SIMPLE_QUERY_THINKING: false,

  /** Default thinking mode for complex tasks (artifacts, fixes) */
  COMPLEX_TASK_THINKING: true,
} as const;
```

---

## Testing Checklist

### Pre-Migration Testing

- [ ] Backup current `config.ts` and `glm-client.ts`
- [ ] Note current artifact generation performance metrics
- [ ] Document current error rates from `ai_usage_logs`

### Post-Migration Testing

#### Basic Functionality
- [ ] Simple chat responses work
- [ ] Artifact generation succeeds
- [ ] Artifact fixing succeeds
- [ ] Web search tool calling works
- [ ] Image generation tool calling works
- [ ] Streaming responses work correctly

#### Thinking Mode
- [ ] Reasoning content streams correctly
- [ ] ReasoningProvider processes thinking chunks
- [ ] Status updates appear in UI

#### Tool Calling
- [ ] `browser.search` tool executes correctly
- [ ] `generate_artifact` tool triggers correctly
- [ ] `generate_image` tool triggers correctly
- [ ] Tool result continuation works (no blank responses)

#### Edge Cases
- [ ] Very long conversations (test context limits)
- [ ] Error handling (rate limits, timeouts)
- [ ] Multi-turn artifact modifications

### Performance Metrics to Track

| Metric | Expected Change |
|--------|-----------------|
| Response Quality | +5-15% improvement |
| Response Latency | May increase slightly (more thinking) |
| Token Usage | Similar or slightly higher |
| Error Rate | Should decrease |

---

## Rollback Plan

### Immediate Rollback

If issues arise, revert the model name:

```typescript
// config.ts
export const MODELS = {
  GLM_4_6: 'zhipu/glm-4.6',  // Revert to 4.6
  // ...
};
```

Deploy:
```bash
./scripts/deploy-simple.sh prod
```

### Partial Rollback

If only certain features have issues:

1. **Thinking issues**: Disable thinking mode
   ```typescript
   enableThinking: false
   ```

2. **Tool stream issues**: Disable tool_stream
   ```typescript
   tool_stream: false
   ```

3. **Output truncation**: Reduce max_tokens
   ```typescript
   max_tokens: 4000  // Lower limit
   ```

---

## Known Issues & Considerations

### 1. Thinking Mode Default Change

**Issue**: GLM-4.7 has thinking enabled by default, which may increase latency.

**Mitigation**:
- Our code already controls thinking via `enableThinking` parameter
- Consider disabling for simple queries to reduce latency

### 2. Potential Cost Changes

**Issue**: More thinking = more tokens = higher costs.

**Mitigation**:
- Monitor `ai_usage_logs` after migration
- Implement turn-level thinking control for cost optimization

### 3. Sampling Parameter Warning

From Z.ai docs: "not recommended to adjust both [temperature and top_p] simultaneously"

**Current code** (glm-client.ts):
```typescript
// We only use temperature, not top_p - no issue
temperature: 1.0,
// top_p is not set
```

### 4. Preserved Thinking Complexity

**Issue**: Preserved thinking requires returning exact `reasoning_content` from previous turns.

**Current Status**: Not implemented. Would require:
- Storing `reasoning_content` in conversation history
- Passing it back in subsequent requests
- Setting `clear_thinking: false`

**Recommendation**: Defer to Phase 2 after basic migration is validated.

---

## Files Affected

| File | Changes Required | Priority |
|------|-----------------|----------|
| `supabase/functions/_shared/config.ts` | Model name update | Required |
| `supabase/functions/_shared/glm-client.ts` | Comments, log messages | Required |
| `docs/GLM-4.6-API-REFERENCE.md` | Update to 4.7 reference | Documentation |
| `.claude/docs/GLM-4.6-CAPABILITIES.md` | Update to 4.7 capabilities | Documentation |
| `CLAUDE.md` | Update model references | Documentation |

---

## Migration Timeline

### Phase 1: Basic Migration (Day 1)
1. Update model name in `config.ts`
2. Update comments and log messages
3. Deploy to staging
4. Run test suite
5. Deploy to production

### Phase 2: Feature Adoption (Week 2+)
1. Enable `tool_stream` for better tool calling UX
2. Implement turn-level thinking control
3. Update documentation

### Phase 3: Advanced Features (Future)
1. Consider preserved thinking for multi-turn improvements
2. Explore increased output limits for large artifacts
3. Optimize cost/quality tradeoffs

---

## References

### Official Documentation
- [GLM-4.7 Overview](https://docs.z.ai/guides/llm/glm-4.7)
- [Migration Guide](https://docs.z.ai/guides/overview/migrate-to-glm-new)
- [Thinking Mode](https://docs.z.ai/guides/capabilities/thinking-mode)
- [GLM Coding Plan](https://docs.z.ai/devpack/tool/others)

### External Resources
- [OpenRouter GLM-4.7](https://openrouter.ai/z-ai/glm-4.7)
- [GLM-4.7 Blog Post](https://z.ai/blog/glm-4.7)
- [HuggingFace Model](https://huggingface.co/zai-org/GLM-4.7)

### Internal Documentation
- [Current GLM-4.6 API Reference](./GLM-4.6-API-REFERENCE.md)
- [GLM-4.6 Capabilities](./.claude/docs/GLM-4.6-CAPABILITIES.md)
- [Tool Calling System](./.claude/TOOL_CALLING_SYSTEM.md)

---

## Appendix: Full Diff Preview

```diff
diff --git a/supabase/functions/_shared/config.ts b/supabase/functions/_shared/config.ts
--- a/supabase/functions/_shared/config.ts
+++ b/supabase/functions/_shared/config.ts
@@ -272,8 +272,8 @@ export const MODELS = {
   /** Gemini 2.5 Flash Lite for chat/summaries/titles */
   GEMINI_FLASH: 'google/gemini-2.5-flash-lite',
-  /** GLM-4.6 for artifact generation and fixing (replaces Kimi K2) - via Z.ai API */
-  GLM_4_6: 'zhipu/glm-4.6',
+  /** GLM-4.7 for artifact generation and fixing - via Z.ai API */
+  GLM_4_7: 'zhipu/glm-4.7',
   /** GLM-4.5-Air for ultra-fast reasoning summarization (sidecar commentator) - via Z.ai API */
   GLM_4_5_AIR: 'zhipu/glm-4.5-air',
   /** Gemini Flash Image for image generation */
```

---

**Document Version**: 1.0
**Author**: Generated by Claude Code
**Review Status**: Pending human review
