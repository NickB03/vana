# GLM-4.6 Model Capabilities

## Overview

GLM-4.6 is a large language model provided by Z.ai (Zhipu AI) via their Coding API. It serves as the primary model for artifact generation and fixing in Vana.

**Provider**: Z.ai Coding API
**API Base**: `https://api.z.ai/api/coding/paas/v4`
**Documentation**: https://docs.z.ai/guides/llm/glm-4.6

## Key Capabilities

### 1. Thinking Mode (Reasoning)

GLM-4.6 supports thinking mode, which enables the model to show its reasoning process before generating the final response.

**How It Works**:
- Model outputs reasoning text first (visible to users as status updates)
- Then generates the final structured response
- Reasoning is streamed separately from the main response

**Configuration**:
```typescript
{
  enableThinking: true,  // Enable thinking mode
  stream: true           // Required for thinking mode
}
```

**Use Cases**:
- **Artifact Generation**: Shows real-time progress ("Analyzing requirements...", "Planning architecture...")
- **Error Fixing**: Explains debugging process before proposing fixes
- **Complex Queries**: Demonstrates step-by-step problem solving

### 2. OpenAI-Compatible API Format

GLM-4.6 uses the same message format as OpenAI's API, making it easy to integrate:

```typescript
interface GLMMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_call_id?: string; // For tool result messages
  name?: string;         // For tool result messages
}
```

### 3. Function Calling (Tool Calling)

GLM-4.6 natively supports function calling in OpenAI-compatible format:

```typescript
interface GLMToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, {
      type: string;
      description: string;
      default?: unknown;
    }>;
    required: string[];
  };
}
```

**Supported Tools in Vana**:
- `generate_artifact` — Create React/HTML artifacts
- `generate_image` — Generate AI images
- `browser.search` — Web search via Tavily

### 4. Streaming Responses

GLM-4.6 supports Server-Sent Events (SSE) for real-time streaming:

**Benefits**:
- Real-time status updates via ReasoningProvider
- Progressive artifact rendering
- Better perceived performance
- Early error detection

**Implementation**:
```typescript
const response = await fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${GLM_API_KEY}`
  },
  body: JSON.stringify({
    model: MODELS.GLM_4_6,
    messages: [...],
    stream: true,
    enableThinking: true
  })
});

for await (const chunk of response.body) {
  // Process streaming chunks
}
```

### 5. Cost Tracking

GLM-4.6 responses include usage metadata for cost tracking:

```typescript
{
  usage: {
    prompt_tokens: 1234,
    completion_tokens: 567,
    total_tokens: 1801
  }
}
```

This data is logged to `ai_usage_logs` table for analytics.

## Context Limits

**Maximum Context Window**: 128,000 tokens (128K context)

**Practical Limits**:
- **Artifact Generation**: ~8,000 tokens input (includes system prompt, conversation history, examples)
- **Error Fixing**: ~6,000 tokens input (includes original artifact + error context)
- **Chat Messages**: ~4,000 tokens input (conversation history)

**Context Management**:
- Smart context windowing via `context-selector.ts`
- Message importance ranking (recent > artifact-related > conversational)
- Automatic summarization when context exceeds budget

## Performance Characteristics

**Average Response Times**:
- **Artifact Generation**: 8-15 seconds (includes thinking)
- **Error Fixing**: 5-10 seconds
- **Chat Messages**: 2-5 seconds (with thinking mode)

**Token Generation Speed**:
- **Thinking Mode**: ~50-100 tokens/second
- **Response Mode**: ~100-150 tokens/second

## When to Use GLM-4.6 vs. Gemini

Use **GLM-4.6** when:
- Need structured output (artifacts, code)
- Want visible reasoning process (thinking mode)
- Require tool calling (function calling)
- Need deep analysis or debugging

Use **Gemini 2.5 Flash Lite** when:
- Need fast conversational responses
- No structured output required
- Cost optimization is critical
- Simple queries without reasoning

## Configuration in Vana

**Location**: `supabase/functions/_shared/config.ts`

```typescript
export const MODELS = {
  GLM_4_6: 'zhipu/glm-4.6',
  GLM_4_5_AIR: 'zhipu/glm-4.5-air',  // Used for ReasoningProvider
} as const;
```

**Environment Variables**:
- `GLM_API_KEY` — Z.ai API key (required)
- `USE_GLM_THINKING_FOR_CHAT` — Enable thinking mode (default: `true`)
- `USE_REASONING_PROVIDER` — Enable semantic status generation (default: `true`)

**Default Settings**:
```typescript
export const GLM_CONFIG = {
  DEFAULT_TEMPERATURE: 0.7,
  DEFAULT_MAX_TOKENS: 4096,
  TIMEOUT_MS: 60000,  // 60 seconds
  THINKING_MODE_ENABLED: true,
  STREAMING_ENABLED: true,
} as const;
```

## Error Handling

**Common Errors**:

| Error | Cause | Solution |
|-------|-------|----------|
| `GLM_API_KEY not configured` | Missing API key | Set via `supabase secrets set GLM_API_KEY=your-key` |
| `401 Unauthorized` | Invalid API key | Check key is correct, not expired |
| `429 Rate Limited` | Too many requests | Implement retry with backoff |
| `500 Server Error` | Z.ai API issue | Retry with exponential backoff |
| `Timeout after 60s` | Large context or slow model | Reduce context window or increase timeout |

**Retry Logic**:
- **Max Retries**: 3 attempts
- **Backoff**: Exponential (1s, 2s, 4s)
- **Jitter**: ±500ms randomization

## Security Considerations

**API Key Protection**:
- Never hardcode API keys
- Store in Supabase Secrets
- Use environment variables for local dev

**Input Sanitization**:
- All inputs pass through `PromptInjectionDefense`
- Unicode normalization
- SQL/HTML pattern detection

**Output Validation**:
- Artifacts validated before rendering
- Error codes for structured error handling
- Suspicious patterns blocked (XSS, SQL injection)

## Cost Optimization

**Strategies**:
1. **Use Smart Context Management**: Only send relevant conversation history
2. **Enable Caching**: Reuse system prompts where possible
3. **Optimize Thinking Mode**: Disable for simple queries
4. **Pre-validate Inputs**: Catch errors before sending to LLM
5. **Monitor Usage**: Track via `ai_usage_logs` table

**Estimated Costs** (approximate):
- Artifact Generation: ~$0.01-0.03 per request
- Error Fixing: ~$0.005-0.01 per request
- Chat Message: ~$0.001-0.005 per request

## Client Implementation

**Location**: `supabase/functions/_shared/glm-client.ts`

**Key Functions**:
- `callGLM()` — Main entry point for GLM API calls
- `parseToolCall()` — Extract tool calls from responses
- `streamGLMResponse()` — Handle SSE streaming

**Usage Example**:
```typescript
import { callGLM } from './_shared/glm-client.ts';

const response = await callGLM({
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'Create a todo app' }
  ],
  temperature: 0.7,
  max_tokens: 4096,
  enableThinking: true,
  stream: true,
  tools: TOOL_CATALOG,
  toolChoice: 'auto',
  requestId: 'req_123',
  userId: session.user.id,
  functionName: 'chat'
});
```

## References

- **Z.ai Documentation**: https://docs.z.ai
- **GLM API Reference**: https://docs.z.ai/api-reference/llm/chat-completion
- **Thinking Mode Guide**: https://docs.z.ai/guides/llm/glm-4.6#thinking-mode
- **Function Calling**: https://docs.z.ai/guides/llm/function-calling
