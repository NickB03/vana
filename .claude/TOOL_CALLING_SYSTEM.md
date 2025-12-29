# Unified Tool-Calling System

## Overview

The chat function uses a unified tool-calling architecture that enables AI to invoke specialized tools (artifact generation, image generation, web search) through function calling. This replaces the old approach of separate API endpoints for each tool.

**Issue**: #340 - Unified Tool-Based Chat Architecture

## Available Tools

### Tool Catalog

**Location**: `supabase/functions/_shared/tool-definitions.ts`

```typescript
const TOOL_CATALOG = {
  generate_artifact: {
    handler: 'artifact',
    model: MODELS.GLM_4_6,
    streaming: true
  },
  generate_image: {
    handler: 'image',
    model: MODELS.GEMINI_FLASH_IMAGE,
    streaming: false
  },
  'browser.search': {
    handler: 'search',
    streaming: false
  }
};
```

### generate_artifact

**Purpose**: Generate React components, HTML pages, or other artifacts

**Model**: GLM-4.6 (Z.ai) with thinking mode enabled

**Parameters**:
- `type`: Artifact type (`react`, `html`, `svg`, `mermaid`, etc.)
- `title`: Artifact title
- `code`: Source code content

**Validation**: See `tool-validator.ts` for Zod schemas

### generate_image

**Purpose**: Generate AI images from text prompts

**Model**: Gemini 2.5 Flash Image (OpenRouter)

**Parameters**:
- `prompt`: Image description
- `style`: Optional style guidance

### browser.search

**Purpose**: Web search via Tavily API

**Model**: N/A (direct API call, but query rewriting uses GLM-4.5-Air)

**Parameters**:
- `query`: Search query
- `max_results`: Number of results (default: 5)

**Query Rewriting**:

Before sending queries to Tavily, the system optimizes them using LLM-powered query rewriting:

**Location**: `supabase/functions/_shared/query-rewriter.ts`

**Purpose**: Transform conversational queries into search-optimized queries for better results

**Model**: GLM-4.5-Air via Z.ai API (~300ms latency)

**Process**:
1. **Smart Skip Logic**: Short queries (≤3 words), URLs, and code blocks skip rewriting
2. **LLM Optimization**: Conversational queries sent to GLM-4.5-Air for rewriting
3. **Temporal Context**: Adds current year for "latest", "current", "recent" queries
4. **Fallback**: Returns original query if rewriting fails

**Examples**:
```typescript
// Conversational query → optimized
"Can you please tell me what the weather is like in NYC?"
→ "weather NYC"

// Temporal context injection
"What are the latest React features?"
→ "latest React features 2025"

// Already optimized → unchanged
"TypeScript generics tutorial"
→ "TypeScript generics tutorial"
```

**Key Functions**:
- `rewriteSearchQuery()` — Main rewriting function with retry logic
- `shouldRewriteQuery()` — Determines if rewriting would improve results

**Configuration**:
- Temperature: 0 (deterministic results)
- Max tokens: 50 (concise queries only)
- Timeout: Inherits from OpenRouter client retry logic

## SSE Event Flow

```
User Message → GLM Decides to Use Tool
    ↓
tool_call_start event (SSE)
    ↓
Executor runs (artifact/image/search)
    ↓
tool_result event (SSE)
    ↓
artifact_complete / image_complete / web_search event (SSE)
    ↓
AI generates response using tool result (streaming)
    ↓
done event (SSE)
```

## Tool Execution Architecture

### Components

**Orchestrator**: `tool-executor.ts`
- Main entry point for all tool calls
- Routes to appropriate executor based on tool name
- Handles SSE streaming for tool lifecycle events

**Executors**:
- `artifact-executor.ts` — Artifact generation (GLM-4.6)
- `image-executor.ts` — Image generation (Gemini Flash Image)
- `tavily-client.ts` — Web search (Tavily API)

**Security Infrastructure** (Phase 0):
- `tool-validator.ts` — Zod schemas, param sanitization
- `tool-rate-limiter.ts` — Per-tool rate limits
- `tool-execution-tracker.ts` — Resource exhaustion protection
- `prompt-injection-defense.ts` — Security scanning
- `safe-error-handler.ts` — Error sanitization

### Tool Execution Lifecycle

1. **Validation**: `tool-validator.ts` validates parameters against Zod schema
2. **Rate Limiting**: `tool-rate-limiter.ts` checks per-tool rate limits
3. **Execution**: Appropriate executor runs the tool
4. **Tracking**: `tool-execution-tracker.ts` records metrics (max 3 tools/request)
5. **Response**: Tool result returned to AI for response generation

## Security Infrastructure (Phase 0)

### Prompt Injection Defense

**Location**: `supabase/functions/_shared/prompt-injection-defense.ts`

**Features**:
- Unicode normalization (prevents homoglyph attacks)
- SQL/HTML pattern detection
- Suspicious output scanning
- Sandboxed validation

**Usage**:
```typescript
import { PromptInjectionDefense } from './prompt-injection-defense.ts';

const sanitized = PromptInjectionDefense.sanitizeArtifactContext(userInput);
```

### Tool Validator

**Location**: `supabase/functions/_shared/tool-validator.ts`

**Features**:
- Zod schema validation for each tool
- Prototype pollution protection
- Parameter sanitization
- Type safety enforcement

**Schema Example**:
```typescript
const artifactSchema = z.object({
  type: z.enum(['react', 'html', 'svg', 'mermaid', 'markdown']),
  title: z.string().min(1).max(100),
  code: z.string().min(1)
});
```

### Tool Rate Limiter

**Location**: `supabase/functions/_shared/tool-rate-limiter.ts`

**Features**:
- Per-tool rate limits (separate from global chat limits)
- Fail-closed circuit breaker
- Graceful degradation
- Detailed error messages with reset times

**Database Integration**:
- Uses `user_tool_rate_limits` table
- Calls `check_user_tool_rate_limit()` RPC function

**Configuration**:
```typescript
const TOOL_RATE_LIMITS = {
  generate_artifact: { guest: 5, auth: 50, window: 5 }, // per 5 hours
  generate_image: { guest: 10, auth: 100, window: 5 },
  'browser.search': { guest: 20, auth: 200, window: 5 }
};
```

### Execution Tracker

**Location**: `supabase/functions/_shared/tool-execution-tracker.ts`

**Features**:
- Resource exhaustion protection (max 3 tools/request)
- Timing metrics
- Tool call counting
- Memory leak prevention

**Usage**:
```typescript
const tracker = new ToolExecutionTracker(requestId);
await tracker.recordToolCall('generate_artifact', async () => {
  // Tool execution
});
```

### Safe Error Handler

**Location**: `supabase/functions/_shared/safe-error-handler.ts`

**Features**:
- Error message sanitization
- PII filtering
- No stack traces in production
- Structured error codes

**Usage**:
```typescript
import { sanitizeError } from './safe-error-handler.ts';

try {
  // Tool execution
} catch (err) {
  throw sanitizeError(err, 'generate_artifact');
}
```

## Integration with Chat Function

**Location**: `supabase/functions/chat/handlers/tool-calling-chat.ts`

**Flow**:
1. User sends message to `/chat` endpoint
2. GLM analyzes message and decides to call tool (or respond directly)
3. If tool call: `tool-executor.ts` runs appropriate executor
4. Executor streams progress via SSE events
5. Tool result returned to GLM for final response generation

**SSE Event Types**:
- `tool_call_start` — Tool execution starting
- `reasoning_status` — Reasoning progress (for artifacts)
- `tool_result` — Tool execution complete
- `artifact_complete` — Artifact generated
- `image_complete` — Image generated
- `web_search` — Search results
- `done` — Final response complete

## Testing Tool Calls

**Local Development**:
```bash
# Test artifact generation via chat
curl -X POST http://localhost:54321/functions/v1/chat \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "test-session",
    "message": "Create a counter app with React"
  }'
```

**Expected Response**:
```
data: {"type":"tool_call_start","tool":"generate_artifact"}

data: {"type":"reasoning_status","message":"Analyzing requirements...","phase":"analyzing"}

data: {"type":"tool_result","tool":"generate_artifact","result":{...}}

data: {"type":"artifact_complete","artifact":{...}}

data: {"type":"done"}
```

## Error Handling

### Tool Validation Errors

**Symptom**: Tool call rejected before execution

**Causes**:
- Invalid parameters (fails Zod schema)
- Missing required fields
- Type mismatches

**Response**:
```json
{
  "error": "Tool validation failed",
  "details": {
    "tool": "generate_artifact",
    "issues": [
      {"path": "code", "message": "Required"}
    ]
  }
}
```

### Rate Limit Errors

**Symptom**: Tool call rejected due to rate limit

**Response**:
```json
{
  "error": "Rate limit exceeded for tool 'generate_artifact'",
  "reset_at": "2025-12-27T15:30:00Z",
  "remaining": 0,
  "limit": 50
}
```

### Execution Errors

**Symptom**: Tool execution fails (API error, timeout, etc.)

**Response**:
```json
{
  "error": "Tool execution failed",
  "tool": "generate_image",
  "message": "Image generation timeout",
  "code": "TOOL_EXECUTION_TIMEOUT"
}
```

**Note**: Stack traces never exposed in production (sanitized by `safe-error-handler.ts`)

## Migration from Legacy Endpoints

**Old Approach** (pre-Issue #340):
- `/generate-artifact` — Separate endpoint
- `/generate-image` — Separate endpoint
- Manual routing in frontend

**New Approach**:
- `/chat` — Single unified endpoint
- AI decides which tools to use via function calling
- Automatic routing via `tool-executor.ts`

**Legacy endpoints still exist** for backward compatibility but are deprecated.

## References

- **Tool Definitions**: `supabase/functions/_shared/tool-definitions.ts`
- **Tool Executor**: `supabase/functions/_shared/tool-executor.ts`
- **Artifact Executor**: `supabase/functions/_shared/artifact-executor.ts`
- **Image Executor**: `supabase/functions/_shared/image-executor.ts`
- **Security Infrastructure**: `supabase/functions/_shared/tool-*.ts`
