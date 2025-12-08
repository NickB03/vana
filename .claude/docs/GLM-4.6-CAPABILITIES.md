# GLM-4.6 Capabilities Documentation

## Overview

GLM-4.6 is Z.ai's flagship language model powering artifact generation and error fixing in the Vana development assistant. This document provides comprehensive technical documentation for GLM-4.6 integration, including API reference, streaming behavior, and implementation details.

## Model Configuration

### Basic Information

| Property | Value |
|----------|-------|
| **Model Name** | `zhipu/glm-4.6` |
| **Provider** | Z.ai API |
| **Function** | Artifact generation and fixing |
| **API Endpoint** | `https://api.z.ai/api/coding/paas/v4/chat/completions` |
| **Temperature** | 1.0 (recommended by GLM) |
| **Max Tokens** | 8,000 |

### Model Selection

```typescript
// Import from shared configuration
import { MODELS } from '../_shared/config.ts';

// Usage in Edge Functions
const model = MODELS.GLM_4_6; // "zhipu/glm-4.6"
```

## API Reference

### Request Format

GLM-4.6 uses OpenAI-compatible API format with Z.ai-specific enhancements:

```json
{
  "model": "glm-4.6",
  "messages": [
    {
      "role": "system",
      "content": "System instruction prompt"
    },
    {
      "role": "user",
      "content": "User's request or code to fix"
    }
  ],
  "temperature": 1.0,
  "max_tokens": 8000,
  "stream": true,
  "thinking": {
    "type": "enabled"
  }
}
```

### Response Format

#### Standard Response

```json
{
  "id": "chatcmpl-123",
  "object": "chat.completion",
  "created": 1677652288,
  "model": "glm-4.6",
  "choices": [{
    "index": 0,
    "message": {
      "role": "assistant",
      "content": "Generated artifact code here..."
    },
    "finish_reason": "stop"
  }],
  "usage": {
    "prompt_tokens": 120,
    "completion_tokens": 450,
    "total_tokens": 570
  }
}
```

#### Streaming Response

GLM-4.6 streams content in two distinct phases:

1. **Reasoning Phase** (`reasoning_content`): AI's thought process
2. **Content Phase** (`content`): Actual artifact code

```json
// First chunk - reasoning content
{
  "id": "chatcmpl-123",
  "object": "chat.completion.chunk",
  "created": 1677652288,
  "model": "glm-4.6",
  "choices": [{
    "index": 0,
    "delta": {
      "reasoning_content": "I'll create a responsive React component using Tailwind CSS..."
    },
    "finish_reason": null
  }]
}

// Second chunk - artifact content
{
  "id": "chatcmpl-123",
  "object": "chat.completion.chunk",
  "created": 1677652288,
  "model": "glm-4.6",
  "choices": [{
    "index": 0,
    "delta": {
      "content": "\n<artifact type=\"application/vnd.ant.react\" title=\"Dashboard Component\">\nexport default function Dashboard() {"
    },
    "finish_reason": null
  }]
}
```

## Streaming Implementation

### SSE Event Types

GLM-4.6 streaming uses Server-Sent Events with specific event types:

| Event Type | Description | Content |
|------------|-------------|---------|
| `reasoning_chunk` | AI reasoning process | Text content from `reasoning_content` |
| `reasoning_complete` | Reasoning phase ended | Empty event |
| `content_chunk` | Artifact code generation | Text content from `content` |
| `artifact_complete` | Generation finished | Empty event |
| `error` | Error occurred | Error message details |

### Frontend Implementation

#### EventSource Handler

```typescript
// supabase/functions/chat/index.ts (simplified example)
function handleGLMStreaming(request: Request) {
  const eventSource = new EventSourceStream();

  try {
    const response = await callGLM(systemPrompt, userPrompt, { stream: true });

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No readable stream');

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        eventSource.write({ type: 'artifact_complete', data: '' });
        break;
      }

      const chunk = new TextDecoder().decode(value);
      const lines = chunk.split('\n').filter(line => line.trim());

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          const parsed = JSON.parse(data);

          if (parsed.choices?.[0]?.delta?.reasoning_content) {
            eventSource.write({
              type: 'reasoning_chunk',
              data: parsed.choices[0].delta.reasoning_content
            });
          }

          if (parsed.choices?.[0]?.delta?.content) {
            eventSource.write({
              type: 'content_chunk',
              data: parsed.choices[0].delta.content
            });
          }
        }
      }
    }
  } catch (error) {
    eventSource.write({
      type: 'error',
      data: JSON.stringify({ message: error.message })
    });
  }

  return eventSource.response;
}
```

#### Reasoning Display Component

```typescript
// src/components/ReasoningDisplay.tsx
export function ReasoningDisplay({ stream }: { stream: EventSource }) {
  const reasoningContent = useState('');
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    stream.addEventListener('reasoning_chunk', (e) => {
      reasoningContent.set(prev => prev + e.data);
      setIsVisible(true);
    });

    stream.addEventListener('reasoning_complete', () => {
      // Hide reasoning after completion
      setTimeout(() => setIsVisible(false), 3000);
    });
  }, [stream]);

  if (!isVisible) return null;

  return (
    <div className="reasoning-display">
      <div className="ticker">
        {reasoningContent}
        <span className="cursor">|</span>
      </div>
    </div>
  );
}
```

## Error Handling

### Error Codes and Responses

| HTTP Status | Error Type | Description |
|--------------|------------|-------------|
| 401 | `invalid_api_key` | Invalid or missing API key |
| 429 | `rate_limit_exceeded` | Rate limit exceeded |
| 503 | `service_unavailable` | Service temporarily unavailable |
| 500 | `internal_error` | Server error |

### Rate Limiting

GLM-4.6 implements strict rate limiting:

```typescript
// Rate limiting configuration
const RATE_LIMITS = {
  REQUESTS_PER_MINUTE: 60,
  TOKENS_PER_MINUTE: 100000,
  CONCURRENT_REQUESTS: 5
};
```

#### Retry Strategy

```typescript
// Exponential backoff retry
async function callGLMWithRetry(systemPrompt: string, userPrompt: string, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await callGLM(systemPrompt, userPrompt);
    } catch (error) {
      if (error.status === 429) {
        const retryAfter = parseInt(error.headers?.['retry-after'] || '60');
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        continue;
      }
      throw error;
    }
  }
}
```

### Fallback Mechanisms

1. **Gemini Flash Lite Fallback**: When GLM-4.6 fails, fallback to Gemini for basic chat
2. **Simplified Generation**: Reduce complexity for retry attempts
3. **Error Message**: Inform user of service issues

## Best Practices

### Prompt Engineering

#### System Prompt Structure

```typescript
const SYSTEM_PROMPT = `
You are an expert frontend developer specializing in creating React components, HTML pages, diagrams, and other interactive artifacts.

## Guidelines:
1. Use only Radix UI primitives and Tailwind CSS
2. NO local imports like "@/components/*"
3. Always export default components
4. Use functional components with hooks
5. Follow modern React patterns

## Thinking Process:
1. Analyze the user's request
2. Plan the component structure
3. Consider accessibility and responsive design
4. Generate clean, maintainable code

## Output Format:
<artifact type="application/vnd.ant.react" title="Component Name">
// Your artifact code here
</artifact>
`;
```

#### Temperature Settings

```typescript
// Different temperature settings for different tasks
const TEMPERATURES = {
  CREATIVE: 0.9,  // Higher for creative artifacts
  PRECISE: 0.7,  // Balanced for most cases
  STRICT: 0.3,   // Lower for code fixing
};
```

### Performance Optimization

#### Streaming Configuration

```typescript
// Optimize streaming settings
const STREAMING_CONFIG = {
  CHUNK_SIZE: 1024,  // Process in 1KB chunks
  ENCODING: 'utf-8',
  TIMEOUT: 60000,    // 60 second timeout
  BUFFER_SIZE: 8192 // 8KB buffer
};
```

#### Memory Management

```typescript
// Limit concurrent GLM requests
const CONCURRENT_REQUESTS = new Map<string, Promise<Response>>();

function getConcurrentRequest(sessionId: string) {
  return CONCURRENT_REQUESTS.get(sessionId);
}

function setConcurrentRequest(sessionId: string, promise: Promise<Response>) {
  CONCURRENT_REQUESTS.set(sessionId, promise);

  // Clean up after completion
  promise.finally(() => {
    CONCURRENT_REQUESTS.delete(sessionId);
  });
}
```

## Implementation Examples

### Artifact Generation

```typescript
// supabase/functions/generate-artifact/index.ts
export async function generateArtifact(request: Request) {
  const { prompt, sessionId, isGuest } = await request.json();

  const systemPrompt = createArtifactSystemPrompt();

  const stream = new EventSourceStream();

  try {
    const response = await callGLM(systemPrompt, prompt, {
      stream: true,
      enableThinking: true,
      requestId: crypto.randomUUID(),
      userId: sessionId,
      isGuest
    });

    return handleStreamingResponse(response, stream);
  } catch (error) {
    stream.write({
      type: 'error',
      data: JSON.stringify({ message: 'Artifact generation failed' })
    });
    return stream.response;
  }
}
```

### Error Fixing

```typescript
// supabase/functions/generate-artifact-fix/index.ts
export async function fixArtifact(request: Request) {
  const { artifactCode, error } = await request.json();

  const systemPrompt = `
You are an expert debugger specializing in fixing React artifacts.

## Error Information:
${error}

## Instructions:
1. Analyze the error carefully
2. Provide a working fix
3. Explain what was wrong
4. Generate clean, production-ready code
`;

  const response = await callGLM(systemPrompt, artifactCode, {
    temperature: 0.3,  // Lower temperature for precise fixes
    max_tokens: 4000
  });

  return response;
}
```

## Configuration Files

### Client Configuration

```typescript
// supabase/functions/_shared/glm-client.ts
export interface GLMOptions {
  temperature?: number;
  max_tokens?: number;
  requestId?: string;
  userId?: string;
  isGuest?: boolean;
  functionName?: string;
  promptPreview?: string;
  enableThinking?: boolean;
  stream?: boolean;
}
```

### Model Constants

```typescript
// supabase/functions/_shared/config.ts
export const MODELS = {
  GEMINI_FLASH: 'google/gemini-2.5-flash-lite',
  GLM_4_6: 'zhipu/glm-4.6',
  GEMINI_FLASH_IMAGE: 'google/gemini-2.5-flash-image'
} as const;
```

## Monitoring and Analytics

### Request Tracking

```typescript
// Log GLM requests for monitoring
interface GLMRequestLog {
  requestId: string;
  userId: string;
  timestamp: Date;
  functionName: string;
  inputLength: number;
  outputLength: number;
  duration: number;
  success: boolean;
  error?: string;
}

function logGLMRequest(log: GLMRequestLog) {
  // Store in analytics database
  // Track performance metrics
  // Monitor error rates
}
```

### Performance Metrics

| Metric | Target | Current |
|--------|--------|---------|
| Response Time | < 30s | Varies |
| Success Rate | > 95% | Calculated |
| Error Rate | < 5% | Monitored |
| Throughput | 60 RPM | Tracked |

## Troubleshooting

### Common Issues

#### Streaming Not Working

**Symptoms**: No chunks received or incomplete streams

**Solutions**:
1. Verify `stream: true` in request
2. Check EventSource connection
3. Monitor network requests
4. Handle connection gracefully

#### High Latency

**Symptoms**: Response times > 30 seconds

**Solutions**:
1. Reduce max_tokens
2. Simplify prompts
3. Use concurrent request limits
4. Implement timeout handling

#### Error on Large Artifacts

**Symptoms**: Token limit exceeded errors

**Solutions**:
1. Split large artifacts
2. Increase max_tokens (within limits)
3. Use incremental generation
4. Implement artifact size validation

### Debug Commands

```bash
# Test GLM API directly
curl -X POST https://api.z.ai/api/coding/paas/v4/chat/completions \
  -H "Authorization: Bearer $GLM_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "glm-4.6",
    "messages": [{"role": "user", "content": "Hello"}],
    "stream": true
  }'

# Monitor GLM requests
tail -f /var/log/vana/glm-requests.log
```

## Version History

### v1.0 (December 2025)
- Initial GLM-4.6 integration
- Basic streaming support
- Error handling with fallbacks

### v1.1 (Current)
- Enhanced streaming with SSE events
- Reasoning display improvements
- Better rate limiting
- Performance optimizations

---

*Last Updated: 2025-12-08*