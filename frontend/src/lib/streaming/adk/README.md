# ADK Event Parser - Phase 3 Frontend Integration

This module provides TypeScript utilities for parsing and extracting content from Google ADK Event payloads in Server-Sent Event (SSE) streams.

## Quick Start

```typescript
import { parseAdkEventSSE, extractFunctionResponseText } from '@/lib/streaming/adk';

// Parse SSE data
const result = parseAdkEventSSE(sseData);

if (result.success && result.event) {
  const event = result.event;

  console.log('Author:', event.author); // e.g., 'plan_generator'
  console.log('Text:', event.textParts.join(' ')); // Regular text
  console.log('Thoughts:', event.thoughtParts.join(' ')); // Agent reasoning
  console.log('Function Calls:', event.functionCalls.length);
  console.log('Function Responses:', event.functionResponses.length);
  console.log('Is Final:', event.isFinalResponse);
}
```

## Architecture

```
frontend/src/lib/streaming/adk/
├── types.ts              # TypeScript interfaces (ADK Event model)
├── parser.ts             # Main parsing logic
├── content-extractor.ts  # Content extraction utilities
├── index.ts              # Public API exports
└── README.md             # This file
```

## Core Concepts

### ADK Event Structure

```typescript
interface AdkEvent {
  id: string;                    // Unique event ID
  author: string;                // 'user' or agent name
  invocationId: string;          // Groups related events
  timestamp: number;             // Unix timestamp (seconds)
  content?: {
    parts?: Array<                // Content parts
      | { text: string; thought?: boolean }
      | { functionCall: {...} }
      | { functionResponse: {...} }
    >
  };
  actions?: {
    transfer_to_agent?: string;  // Agent handoff
    skip_summarization?: boolean;
  };
  partial?: boolean;             // True if streaming incomplete
}
```

### Parsed Event Structure

```typescript
interface ParsedAdkEvent {
  rawEvent: AdkEvent;            // Original event
  messageId: string;             // Extracted ID
  author: string;                // Agent name
  textParts: string[];           // Regular text content
  thoughtParts: string[];        // Agent reasoning
  functionCalls: AdkFunctionCall[];
  functionResponses: AdkFunctionResponse[];
  isAgentTransfer: boolean;
  transferTargetAgent?: string;
  isFinalResponse: boolean;
}
```

## API Reference

### Parsing Functions

#### `parseAdkEventSSE(data, eventType?)`

Main entry point for parsing SSE event data.

```typescript
const result = parseAdkEventSSE('{"id":"evt_123",...}');

if (result.success) {
  // result.event is ParsedAdkEvent
} else {
  // result.error is string
}
```

**Returns**: `NormalizeResult` with `success`, `event?`, `error?`

#### `normalizeAdkEvent(rawEvent, eventType?)`

Converts validated ADK Event to ParsedAdkEvent.

```typescript
const parsed = normalizeAdkEvent(rawEvent);
```

**Returns**: `ParsedAdkEvent`

#### `parseSSEEventBlock(eventBlock)`

Parses SSE event blocks with metadata fields.

```typescript
const block = `
event: message
id: evt_123
data: {"id":"evt_123",...}
`;

const result = parseSSEEventBlock(block);
```

**Returns**: `NormalizeResult`

#### `batchParseAdkEvents(dataArray)`

Parse multiple events efficiently.

```typescript
const results = batchParseAdkEvents([data1, data2, data3]);
```

**Returns**: `NormalizeResult[]`

#### `isAdkEventData(data)`

Quick format detection without full parsing.

```typescript
if (isAdkEventData(sseData)) {
  // It's an ADK event
}
```

**Returns**: `boolean`

#### `fastParseAdkEvent(data)`

Performance-optimized parser (minimal validation).

```typescript
const parsed = fastParseAdkEvent(trustedData);
```

**Returns**: `ParsedAdkEvent | null`

### Content Extraction Functions

#### `extractTextContent(event)`

Extract text and thoughts separately.

```typescript
const { textParts, thoughtParts } = extractTextContent(event);

console.log('Message:', textParts.join(' '));
console.log('Reasoning:', thoughtParts.join(' '));
```

**Returns**: `{ textParts: string[], thoughtParts: string[] }`

#### `extractFunctionCalls(event)`

Get all function call parts.

```typescript
const calls = extractFunctionCalls(event);

calls.forEach(call => {
  console.log(`Calling ${call.name} with args:`, call.args);
});
```

**Returns**: `AdkFunctionCall[]`

#### `extractFunctionResponses(event)`

Get all function response parts.

```typescript
const responses = extractFunctionResponses(event);

responses.forEach(resp => {
  console.log(`${resp.name} returned:`, resp.response);
});
```

**Returns**: `AdkFunctionResponse[]`

#### `extractFunctionResponseText(functionResponse)`

Convert function response to readable text.

**P0-002 FIX**: Follows canonical extraction path:
1. `response.result`
2. `response.content`
3. `response.output`
4. Stringified fallback

```typescript
const text = extractFunctionResponseText(functionResponse);
console.log(text); // Human-readable result
```

**Returns**: `string`

#### `extractSourcesFromFunctionResponse(functionResponse)`

Extract source citations (e.g., web search results).

```typescript
const sources = extractSourcesFromFunctionResponse(functionResponse);

sources.forEach(source => {
  console.log(`${source.title}: ${source.url}`);
});
```

**Returns**: `Array<{ title: string, url: string }>`

#### `extractAllContent(event)`

Convenience function to extract everything at once.

```typescript
const {
  textParts,
  thoughtParts,
  functionCalls,
  functionResponses
} = extractAllContent(event);
```

**Returns**: Object with all content arrays

#### `hasContent(event)`

Check if event contains meaningful content.

```typescript
if (hasContent(event)) {
  // Process event
}
```

**Returns**: `boolean`

### Type Guards

#### `isTextPart(part)`

```typescript
if (isTextPart(part)) {
  console.log(part.text);
}
```

#### `isFunctionCallPart(part)`

```typescript
if (isFunctionCallPart(part)) {
  console.log(part.functionCall.name);
}
```

#### `isFunctionResponsePart(part)`

```typescript
if (isFunctionResponsePart(part)) {
  console.log(part.functionResponse.response);
}
```

#### `isValidAdkEvent(data)`

Comprehensive validation of ADK Event structure.

```typescript
if (isValidAdkEvent(data)) {
  // data is AdkEvent
}
```

## Usage with useSSE Hook

The ADK parser integrates with `useSSE` via feature flag:

```typescript
// In .env.local
NEXT_PUBLIC_ENABLE_ADK_CANONICAL_STREAM=true

// In your component
import { useResearchSSE } from '@/hooks/useSSE';

function MyComponent() {
  const { lastAdkEvent, lastEvent } = useResearchSSE(sessionId);

  // lastAdkEvent: ParsedAdkEvent | null (when feature flag enabled)
  // lastEvent: AgentNetworkEvent | null (backward compatible format)

  useEffect(() => {
    if (lastAdkEvent) {
      console.log('ADK Event:', lastAdkEvent);
      console.log('Author:', lastAdkEvent.author);
      console.log('Text:', lastAdkEvent.textParts.join(' '));
    }
  }, [lastAdkEvent]);
}
```

## Performance Characteristics

- **Event Parsing**: <5ms per event
- **Content Extraction**: <2ms per event
- **Type Validation**: <1ms per validation
- **Memory**: Minimal overhead (pre-processed arrays)

## Error Handling

All parsing functions handle errors gracefully:

```typescript
const result = parseAdkEventSSE(malformedData);

if (!result.success) {
  console.warn('Parse error:', result.error);
  // Options:
  // 1. Retry
  // 2. Skip event
  // 3. Log for debugging
  // 4. Fall back to legacy parser
}
```

Common errors:
- `'Empty SSE data'` - No data to parse
- `'Stream complete marker'` - `[DONE]` token
- `'SSE comment'` - Line starting with `:`
- `'Invalid JSON'` - Malformed JSON string
- `'Invalid ADK Event structure'` - Missing required fields

## Multi-Agent Patterns

### Detect Agent Changes

```typescript
if (event.isAgentTransfer) {
  console.log(`Transferring from ${event.author} to ${event.transferTargetAgent}`);
}
```

### Track Agent Progress

```typescript
const agentMessages = new Map<string, string[]>();

if (event.textParts.length > 0) {
  const messages = agentMessages.get(event.author) || [];
  agentMessages.set(event.author, [...messages, ...event.textParts]);
}
```

### Display Agent Reasoning

```typescript
if (event.thoughtParts.length > 0) {
  console.log(`[${event.author} thinking]`, event.thoughtParts.join('\n'));
}
```

### Monitor Function Calls

```typescript
event.functionCalls.forEach(call => {
  console.log(`[${event.author}] Calling ${call.name}...`);
});

event.functionResponses.forEach(resp => {
  const text = extractFunctionResponseText(resp);
  console.log(`[${event.author}] ${resp.name} completed: ${text}`);
});
```

## Testing

### Unit Tests (Recommended)

```typescript
import { parseAdkEventSSE } from '@/lib/streaming/adk';

describe('ADK Parser', () => {
  it('should parse valid event', () => {
    const data = JSON.stringify({
      id: 'evt_123',
      author: 'plan_generator',
      invocationId: 'inv_456',
      timestamp: Date.now() / 1000,
      content: {
        parts: [{ text: 'Hello' }]
      }
    });

    const result = parseAdkEventSSE(data);

    expect(result.success).toBe(true);
    expect(result.event?.author).toBe('plan_generator');
    expect(result.event?.textParts).toEqual(['Hello']);
  });
});
```

### Integration Tests

Test with live SSE connection:

```typescript
import { useResearchSSE } from '@/hooks/useSSE';
import { render, waitFor } from '@testing-library/react';

test('should parse ADK events from SSE stream', async () => {
  const { result } = renderHook(() => useResearchSSE(sessionId));

  await waitFor(() => {
    expect(result.current.lastAdkEvent).toBeTruthy();
    expect(result.current.lastAdkEvent?.author).toBe('plan_generator');
  });
});
```

## Migration Guide

### From Legacy Events

**Before** (Legacy format):
```typescript
const event = {
  type: 'research_update',
  data: {
    message: 'Processing...',
    timestamp: '2025-10-18T12:00:00Z'
  }
};
```

**After** (ADK format):
```typescript
const event = {
  id: 'evt_123',
  author: 'section_researcher',
  invocationId: 'inv_456',
  timestamp: 1729252800,
  content: {
    parts: [
      { text: 'Processing...' }
    ]
  }
};
```

### Adapter Pattern

Use both formats during migration:

```typescript
function handleEvent(legacyEvent: AgentNetworkEvent) {
  // If ADK data is present, use it
  if (legacyEvent.data.author && legacyEvent.data.textParts) {
    console.log('ADK event:', legacyEvent.data.author);
  } else {
    // Fall back to legacy format
    console.log('Legacy event:', legacyEvent.type);
  }
}
```

## References

- **ADK Event Model**: `docs/adk/refs/official-adk-python/src/google/adk/events/event.py`
- **Specification**: `docs/specs/phase_3_frontend_sse_specification.md`
- **Reference Implementation**: `docs/adk/refs/frontend-nextjs-fullstack/nextjs/src/lib/streaming/sse-parser.ts`

## Contributing

When modifying the ADK parser:

1. ✅ Maintain 100% TypeScript coverage
2. ✅ Add JSDoc comments to new functions
3. ✅ Update this README with examples
4. ✅ Write unit tests for new features
5. ✅ Ensure backward compatibility
6. ✅ Meet performance targets (<5ms parsing)

## License

Part of Vana project - Google ADK integration.
