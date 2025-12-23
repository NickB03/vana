> **STATUS**: 📋 Planned
> **Last Updated**: 2025-12-23
> **Priority**: Low
> **Implementation**: Not yet started - requires @mcp-ui/client package installation

# MCP UI Integration Plan

> **Goal**: Integrate MCP UI to render interactive widgets inline in chat messages
> **Timeline**: 1-2 weeks (Minimal Viable Implementation)
> **Future**: Migrate artifact system to MCP UI after proving the concept

---

## Executive Summary

This plan outlines the integration of [MCP UI](https://github.com/MCP-UI-Org/mcp-ui) into Vana's chat interface. MCP UI enables MCP servers to return rich, interactive UI components that clients can render. For the MVP, we'll focus on rendering HTML-based widgets inline in chat messages, following the exact patterns established by the existing reasoning and web search features.

---

## Architecture Overview

### Current State
```
SSE Stream → useChatMessages.tsx → MessageWithArtifacts.tsx
                    ↓
            Event Types:
            - 'reasoning' → ReasoningDisplay
            - 'web_search' → WebSearchResults
            - content → Markdown + Artifacts
```

### Target State
```
SSE Stream → useChatMessages.tsx → MessageWithArtifacts.tsx
                    ↓
            Event Types:
            - 'reasoning' → ReasoningDisplay
            - 'web_search' → WebSearchResults
            - 'mcp_ui' → MCPUIRenderer (NEW)
            - content → Markdown + Artifacts
```

---

## Implementation Steps

### Phase 1: Foundation (Days 1-3)

#### Step 1.1: Install MCP UI Client Package

**File**: `package.json`

```bash
npm install @mcp-ui/client
```

**Verification**:
```bash
npm ls @mcp-ui/client
```

---

#### Step 1.2: Create Type Definitions

**New File**: `src/types/mcpUI.ts`

Following the exact pattern from `src/types/reasoning.ts` and `src/types/webSearch.ts`:

```typescript
import { z } from 'zod';

/**
 * Zod schemas for runtime validation of MCP UI resources
 * Prevents crashes from malformed MCP server responses
 */

// Runtime validation schema for UI Action payloads
export const UIActionPayloadSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('tool'),
    toolName: z.string().min(1).max(200),
    params: z.record(z.unknown()).optional(),
  }),
  z.object({
    type: z.literal('prompt'),
    prompt: z.string().min(1).max(10000),
  }),
  z.object({
    type: z.literal('intent'),
    intent: z.string().min(1).max(200),
    params: z.record(z.unknown()).optional(),
  }),
  z.object({
    type: z.literal('notify'),
    message: z.string().min(1).max(1000),
  }),
  z.object({
    type: z.literal('link'),
    url: z.string().url().max(2000),
  }),
]);

// Runtime validation schema for MCP UI Resource
export const MCPUIResourceSchema = z.object({
  uri: z.string().min(1).max(500), // e.g., "ui://component/weather-widget"
  mimeType: z.enum([
    'text/html',
    'text/uri-list',
    'application/vnd.mcp-ui.remote-dom+javascript',
  ]),
  text: z.string().max(500000).optional(), // Content as text
  blob: z.string().max(1000000).optional(), // Content as base64
});

// Runtime validation schema for MCP UI event from SSE stream
export const MCPUIEventSchema = z.object({
  type: z.literal('mcp_ui'),
  sequence: z.number().int().min(0),
  timestamp: z.number(),
  data: z.object({
    resources: z.array(MCPUIResourceSchema).min(1).max(10),
    metadata: z.object({
      toolName: z.string().optional(),
      toolCallId: z.string().optional(),
      serverName: z.string().optional(),
    }).optional(),
  }),
});

// Infer TypeScript types from Zod schemas (single source of truth)
export type UIActionPayload = z.infer<typeof UIActionPayloadSchema>;
export type MCPUIResource = z.infer<typeof MCPUIResourceSchema>;
export type MCPUIEvent = z.infer<typeof MCPUIEventSchema>;
export type MCPUIData = MCPUIEvent['data'];

// Configuration constants
export const MCP_UI_CONFIG = {
  MAX_RESOURCES_PER_MESSAGE: 10,
  MAX_CONTENT_SIZE: 500000, // 500KB
  MAX_URI_LENGTH: 500,
  SUPPORTED_MIME_TYPES: [
    'text/html',
    'text/uri-list',
    'application/vnd.mcp-ui.remote-dom+javascript',
  ] as const,
  // For MVP, only support HTML (simplest)
  MVP_SUPPORTED_TYPES: ['text/html', 'text/uri-list'] as const,
  IFRAME_SANDBOX: 'allow-scripts allow-same-origin',
  DEFAULT_IFRAME_HEIGHT: 300,
  MAX_IFRAME_HEIGHT: 800,
} as const;

/**
 * Safe parsing function with error logging
 * Returns null if validation fails (graceful degradation)
 */
export function parseMCPUIEvent(data: unknown): MCPUIData | null {
  try {
    const event = MCPUIEventSchema.parse(data);
    return event.data;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('[MCPUIParser] Invalid MCP UI event:', {
        errors: error.errors,
        rawData: data,
      });
    }
    return null;
  }
}

/**
 * Parse individual resource for direct usage
 */
export function parseMCPUIResource(data: unknown): MCPUIResource | null {
  try {
    return MCPUIResourceSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('[MCPUIParser] Invalid MCP UI resource:', {
        errors: error.errors,
        rawData: data,
      });
    }
    return null;
  }
}

/**
 * Check if MIME type is supported in MVP
 */
export function isMVPSupportedType(mimeType: string): boolean {
  return MCP_UI_CONFIG.MVP_SUPPORTED_TYPES.includes(
    mimeType as (typeof MCP_UI_CONFIG.MVP_SUPPORTED_TYPES)[number]
  );
}

/**
 * Extract content from resource (handles text vs blob)
 */
export function extractResourceContent(resource: MCPUIResource): string | null {
  if (resource.text) {
    return resource.text;
  }
  if (resource.blob) {
    try {
      return atob(resource.blob);
    } catch {
      console.error('[MCPUIParser] Failed to decode base64 blob');
      return null;
    }
  }
  return null;
}
```

---

#### Step 1.3: Update ChatMessage Interface

**File**: `src/hooks/useChatMessages.tsx`

**Changes** (lines 6-18):

```typescript
// Add import
import { MCPUIData } from "@/types/mcpUI";

// Update ChatMessage interface
export interface ChatMessage {
  id: string;
  session_id: string;
  role: "user" | "assistant";
  content: string;
  reasoning?: string | null;
  reasoning_steps?: StructuredReasoning | null;
  search_results?: WebSearchResults | null;
  mcp_ui?: MCPUIData | null; // NEW: MCP UI resources
  created_at: string;
}

// Update StreamProgress interface
export interface StreamProgress {
  stage: GenerationStage;
  message: string;
  artifactDetected: boolean;
  percentage: number;
  reasoningSteps?: StructuredReasoning;
  searchResults?: WebSearchResults;
  mcpUI?: MCPUIData; // NEW: MCP UI data for streaming
}
```

---

#### Step 1.4: Add SSE Event Handler

**File**: `src/hooks/useChatMessages.tsx`

**Changes** (add after line 434, following the web_search handler pattern):

```typescript
// ========================================
// MCP UI: Handle UI resource events from MCP tools
// ========================================
if (parsed.type === 'mcp_ui') {
  // Validate and store MCP UI data
  const mcpUIData = parseMCPUIEvent(parsed);
  if (mcpUIData) {
    mcpUI = mcpUIData;

    // Update progress with MCP UI data
    const progress = updateProgress();
    progress.mcpUI = mcpUI;
    onDelta('', progress);

    console.log('[StreamProgress] Received MCP UI resources:', {
      resourceCount: mcpUI.resources.length,
      types: mcpUI.resources.map(r => r.mimeType),
    });
  }

  continue; // Skip to next event
}
```

**Also update**:
1. Add `let mcpUI: MCPUIData | undefined;` with other state variables (line ~320)
2. Add `mcpUI` to `updateProgress()` return (line ~367)
3. Update `saveMessage` function signature (line 92-98):
   ```typescript
   const saveMessage = async (
     role: "user" | "assistant",
     content: string,
     reasoning?: string,
     reasoningSteps?: StructuredReasoning,
     searchResults?: WebSearchResults,
     mcpUI?: MCPUIData // NEW
   ) => {
   ```
4. Update `saveMessage` call to include `mcpUI` (line 457):
   ```typescript
   await saveMessage("assistant", fullResponse, undefined, reasoningSteps, searchResults, mcpUI);
   ```

---

#### Step 1.5: Database Migration (Optional for MVP)

**Note**: For MVP, MCP UI data can be shown during streaming but not persisted. To persist MCP UI data for authenticated users (so it appears when they reload the page), add this migration:

**New File**: `supabase/migrations/YYYYMMDD_add_mcp_ui_column.sql`

```sql
-- Add mcp_ui column to chat_messages table
-- Stores MCP UI resources as JSONB (same pattern as search_results)
ALTER TABLE chat_messages
ADD COLUMN IF NOT EXISTS mcp_ui JSONB DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN chat_messages.mcp_ui IS 'MCP UI resources returned by MCP tools (JSONB array of UIResource objects)';
```

**Decision**: Skip for MVP, implement if persistence is needed.

---

### Phase 2: Rendering (Days 4-6)

#### Step 2.1: Create MCPUIRenderer Component

**New File**: `src/components/MCPUIRenderer.tsx`

```typescript
import { memo, useMemo, useCallback, useState } from "react";
import { ExternalLink, AlertCircle, Loader2 } from "lucide-react";
import {
  MCPUIData,
  MCPUIResource,
  MCP_UI_CONFIG,
  parseMCPUIResource,
  extractResourceContent,
  isMVPSupportedType,
} from "@/types/mcpUI";
import { toast } from "sonner";

interface MCPUIRendererProps {
  mcpUI?: MCPUIData | unknown | null;
  onPromptAction?: (prompt: string) => void;
  className?: string;
}

/**
 * MCPUIRenderer displays MCP UI resources inline in chat messages
 *
 * MVP supports:
 * - text/html: Inline HTML rendered in sandboxed iframe
 * - text/uri-list: External URL embedded in iframe
 *
 * Future (post-MVP):
 * - application/vnd.mcp-ui.remote-dom+javascript: Remote DOM rendering
 */
export const MCPUIRenderer = memo(function MCPUIRenderer({
  mcpUI,
  onPromptAction,
  className = "",
}: MCPUIRendererProps) {
  // Validate MCP UI data
  const validatedData = useMemo(() => {
    if (!mcpUI) return null;

    // If already parsed, validate structure
    if (typeof mcpUI === 'object' && 'resources' in mcpUI) {
      const resources = (mcpUI as MCPUIData).resources;
      if (!Array.isArray(resources) || resources.length === 0) {
        return null;
      }
      return mcpUI as MCPUIData;
    }

    return null;
  }, [mcpUI]);

  if (!validatedData) return null;

  return (
    <div className={`space-y-3 ${className}`}>
      {validatedData.resources.map((resource, index) => (
        <MCPUIResourceRenderer
          key={`${resource.uri}-${index}`}
          resource={resource}
          onPromptAction={onPromptAction}
        />
      ))}

      {/* Show metadata if available */}
      {validatedData.metadata?.toolName && (
        <div className="text-xs text-muted-foreground/60 flex items-center gap-1">
          <span>From tool:</span>
          <code className="bg-muted/50 px-1 py-0.5 rounded">
            {validatedData.metadata.toolName}
          </code>
        </div>
      )}
    </div>
  );
});

MCPUIRenderer.displayName = 'MCPUIRenderer';

/**
 * Individual resource renderer
 */
interface MCPUIResourceRendererProps {
  resource: MCPUIResource;
  onPromptAction?: (prompt: string) => void;
}

const MCPUIResourceRenderer = memo(function MCPUIResourceRenderer({
  resource,
  onPromptAction,
}: MCPUIResourceRendererProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [iframeHeight, setIframeHeight] = useState(MCP_UI_CONFIG.DEFAULT_IFRAME_HEIGHT);

  // Check if type is supported
  if (!isMVPSupportedType(resource.mimeType)) {
    return (
      <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg text-sm text-muted-foreground">
        <AlertCircle className="size-4 shrink-0" />
        <span>Unsupported MCP UI type: {resource.mimeType}</span>
      </div>
    );
  }

  // Handle UI Actions from iframe
  const handleIframeMessage = useCallback((event: MessageEvent) => {
    // Validate origin (security)
    // In production, check against allowed origins

    const { data } = event;
    if (!data || typeof data !== 'object') return;

    // Handle MCP UI action types
    if (data.type === 'mcp-ui-action') {
      const action = data.payload;

      switch (action?.type) {
        case 'prompt':
          onPromptAction?.(action.prompt);
          break;
        case 'notify':
          toast.info(action.message);
          break;
        case 'link':
          window.open(action.url, '_blank', 'noopener,noreferrer');
          break;
        case 'tool':
          // MVP: Log tool calls, implement in Phase 3
          console.log('[MCPUIRenderer] Tool call requested:', action);
          toast.info(`Tool "${action.toolName}" called - handler coming soon`);
          break;
        default:
          console.warn('[MCPUIRenderer] Unknown action type:', action?.type);
      }
    }

    // Handle height adjustment
    if (data.type === 'mcp-ui-resize') {
      const newHeight = Math.min(
        Math.max(100, data.height),
        MCP_UI_CONFIG.MAX_IFRAME_HEIGHT
      );
      setIframeHeight(newHeight);
    }
  }, [onPromptAction]);

  // Set up message listener
  useMemo(() => {
    window.addEventListener('message', handleIframeMessage);
    return () => window.removeEventListener('message', handleIframeMessage);
  }, [handleIframeMessage]);

  // Render based on MIME type
  if (resource.mimeType === 'text/uri-list') {
    // External URL - render in iframe
    const url = resource.text || (resource.blob ? atob(resource.blob) : null);

    if (!url) {
      return (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-lg text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          <span>Invalid URL resource</span>
        </div>
      );
    }

    return (
      <div className="relative rounded-lg overflow-hidden border border-border/50">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        )}
        <iframe
          src={url}
          title={`MCP UI: ${resource.uri}`}
          className="w-full bg-background"
          style={{ height: iframeHeight }}
          sandbox={MCP_UI_CONFIG.IFRAME_SANDBOX}
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            setError('Failed to load external content');
          }}
        />
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-destructive/10">
            <span className="text-sm text-destructive">{error}</span>
          </div>
        )}
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute top-2 right-2 p-1.5 bg-background/80 rounded-md hover:bg-background transition-colors"
        >
          <ExternalLink className="size-3.5" />
        </a>
      </div>
    );
  }

  if (resource.mimeType === 'text/html') {
    // Inline HTML - render in srcdoc iframe
    const htmlContent = extractResourceContent(resource);

    if (!htmlContent) {
      return (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-lg text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          <span>Invalid HTML content</span>
        </div>
      );
    }

    // Wrap HTML with action handler script
    const wrappedHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            * { box-sizing: border-box; }
            body { margin: 0; padding: 16px; font-family: system-ui, sans-serif; }
          </style>
        </head>
        <body>
          ${htmlContent}
          <script>
            // MCP UI Action helper
            window.mcpUI = {
              prompt: (text) => parent.postMessage({ type: 'mcp-ui-action', payload: { type: 'prompt', prompt: text } }, '*'),
              notify: (message) => parent.postMessage({ type: 'mcp-ui-action', payload: { type: 'notify', message } }, '*'),
              link: (url) => parent.postMessage({ type: 'mcp-ui-action', payload: { type: 'link', url } }, '*'),
              callTool: (toolName, params) => parent.postMessage({ type: 'mcp-ui-action', payload: { type: 'tool', toolName, params } }, '*'),
            };

            // Auto-resize
            const resizeObserver = new ResizeObserver(() => {
              parent.postMessage({ type: 'mcp-ui-resize', height: document.body.scrollHeight + 32 }, '*');
            });
            resizeObserver.observe(document.body);
          </script>
        </body>
      </html>
    `;

    return (
      <div className="relative rounded-lg overflow-hidden border border-border/50">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        )}
        <iframe
          srcDoc={wrappedHTML}
          title={`MCP UI: ${resource.uri}`}
          className="w-full bg-background"
          style={{ height: iframeHeight }}
          sandbox={MCP_UI_CONFIG.IFRAME_SANDBOX}
          onLoad={() => setIsLoading(false)}
        />
      </div>
    );
  }

  // Fallback for unknown types
  return (
    <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg text-sm text-muted-foreground">
      <AlertCircle className="size-4 shrink-0" />
      <span>Cannot render: {resource.mimeType}</span>
    </div>
  );
});

MCPUIResourceRenderer.displayName = 'MCPUIResourceRenderer';
```

---

#### Step 2.2: Integrate into MessageWithArtifacts

**File**: `src/components/MessageWithArtifacts.tsx`

**Add import** (line ~11):
```typescript
import { MCPUIRenderer } from "@/components/MCPUIRenderer";
import { MCPUIData } from "@/types/mcpUI";
```

**Update interface** (line ~13):
```typescript
interface MessageWithArtifactsProps {
  content: string;
  messageId?: string;
  sessionId: string;
  onArtifactOpen: (artifact: ArtifactData) => void;
  searchResults?: WebSearchResultsType | null;
  mcpUI?: MCPUIData | null; // NEW
  onPromptAction?: (prompt: string) => void; // NEW: Handle prompt injection
  className?: string;
}
```

**Add rendering** (after line ~261, WebSearchResults):
```typescript
{/* Render MCP UI resources (if present) */}
{mcpUI && (
  <MCPUIRenderer
    mcpUI={mcpUI}
    onPromptAction={onPromptAction}
    className="mt-3"
  />
)}
```

---

#### Step 2.3: Update ChatInterface to Pass Props

**File**: `src/components/ChatInterface.tsx`

**Add handler** (after line ~106):
```typescript
// Handle prompt injection from MCP UI actions
const handlePromptAction = useCallback((prompt: string) => {
  setInput(prompt);
  toast.info("Prompt added to input");
}, [setInput]);
```

**Update MessageWithArtifacts calls** (lines ~474 and ~614):
```typescript
<MessageWithArtifacts
  content={message.content}
  messageId={message.id}
  sessionId={message.session_id}
  onArtifactOpen={handleArtifactOpen}
  searchResults={message.search_results}
  mcpUI={message.mcp_ui}
  onPromptAction={handlePromptAction}
/>
```

---

### Phase 3: Server Integration (Days 7-10)

#### Step 3.1: Add MCP UI Event Injection to Streaming

**File**: `supabase/functions/chat/handlers/streaming.ts`

**Update imports** (line ~8):
```typescript
import type { MCPUIData } from "../../_shared/mcp-ui-types.ts";
```

**Update function signature** (line ~16):
```typescript
export function createStreamTransformer(
  structuredReasoning: StructuredReasoning | null,
  searchResult: SearchResult,
  mcpUIData: MCPUIData | null, // NEW
  requestId: string
): TransformStream<string, string>
```

**Add event injection** (after line ~66):
```typescript
// ========================================
// MCP UI: Send UI resources as event (if available)
// ========================================
if (mcpUIData && mcpUIData.resources.length > 0) {
  const mcpUIEvent = {
    type: "mcp_ui",
    sequence: searchResult.searchExecuted ? 2 : 1, // After search if present
    timestamp: Date.now(),
    data: mcpUIData,
  };

  controller.enqueue(`data: ${JSON.stringify(mcpUIEvent)}\n\n`);

  console.log(
    `[${requestId}] Sent MCP UI resources: ${mcpUIData.resources.length} items`
  );
}
```

---

#### Step 3.2: Create Server-Side Type Definitions

**New File**: `supabase/functions/_shared/mcp-ui-types.ts`

```typescript
/**
 * MCP UI type definitions for Edge Functions
 * Mirrors client-side types without Zod dependency
 */

export interface MCPUIResource {
  uri: string;
  mimeType: 'text/html' | 'text/uri-list' | 'application/vnd.mcp-ui.remote-dom+javascript';
  text?: string;
  blob?: string;
}

export interface MCPUIData {
  resources: MCPUIResource[];
  metadata?: {
    toolName?: string;
    toolCallId?: string;
    serverName?: string;
  };
}

/**
 * Create a simple HTML widget resource
 */
export function createHTMLResource(
  uri: string,
  html: string,
  metadata?: MCPUIData['metadata']
): MCPUIData {
  return {
    resources: [{
      uri,
      mimeType: 'text/html',
      text: html,
    }],
    metadata,
  };
}

/**
 * Create an embedded URL resource
 */
export function createURLResource(
  uri: string,
  url: string,
  metadata?: MCPUIData['metadata']
): MCPUIData {
  return {
    resources: [{
      uri,
      mimeType: 'text/uri-list',
      text: url,
    }],
    metadata,
  };
}
```

---

#### Step 3.3: Create Test MCP Tool Handler

**New File**: `supabase/functions/chat/handlers/mcp-tools.ts`

```typescript
/**
 * MCP Tool Handler (MVP)
 *
 * For MVP, this provides simple test widgets.
 * Future: Connect to actual MCP servers.
 */

import { createHTMLResource, MCPUIData } from "../../_shared/mcp-ui-types.ts";

export interface MCPToolRequest {
  toolName: string;
  params?: Record<string, unknown>;
}

/**
 * Check if message should trigger an MCP tool
 */
export function detectMCPToolIntent(message: string): MCPToolRequest | null {
  const lowerMessage = message.toLowerCase();

  // MVP: Simple keyword detection for demo tools
  if (lowerMessage.includes('weather') && lowerMessage.includes('widget')) {
    return { toolName: 'demo-weather', params: {} };
  }

  if (lowerMessage.includes('poll') || lowerMessage.includes('vote')) {
    return { toolName: 'demo-poll', params: {} };
  }

  if (lowerMessage.includes('calculator')) {
    return { toolName: 'demo-calculator', params: {} };
  }

  return null;
}

/**
 * Execute MCP tool and return UI resource
 */
export async function executeMCPTool(
  request: MCPToolRequest
): Promise<MCPUIData | null> {
  switch (request.toolName) {
    case 'demo-weather':
      return createWeatherWidget();
    case 'demo-poll':
      return createPollWidget();
    case 'demo-calculator':
      return createCalculatorWidget();
    default:
      return null;
  }
}

// Demo widget generators
function createWeatherWidget(): MCPUIData {
  const html = `
    <div style="padding: 16px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; color: white;">
      <h3 style="margin: 0 0 8px 0; font-size: 18px;">Weather Widget Demo</h3>
      <p style="margin: 0 0 16px 0; opacity: 0.9;">San Francisco, CA</p>
      <div style="display: flex; align-items: center; gap: 16px;">
        <span style="font-size: 48px;">72F</span>
        <span style="font-size: 32px;">Sunny</span>
      </div>
      <button
        onclick="window.mcpUI.prompt('What\\'s the weather forecast for tomorrow?')"
        style="margin-top: 16px; padding: 8px 16px; background: white; color: #667eea; border: none; border-radius: 6px; cursor: pointer;"
      >
        Get Forecast
      </button>
    </div>
  `;

  return createHTMLResource('ui://demo/weather', html, { toolName: 'demo-weather' });
}

function createPollWidget(): MCPUIData {
  const html = `
    <div style="padding: 16px; background: #f8f9fa; border-radius: 12px; border: 1px solid #e9ecef;">
      <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #333;">Quick Poll</h3>
      <p style="margin: 0 0 16px 0; color: #666;">What's your favorite feature?</p>
      <div style="display: flex; flex-direction: column; gap: 8px;">
        <button onclick="window.mcpUI.notify('You voted for: Artifacts')" style="padding: 10px; text-align: left; background: white; border: 1px solid #ddd; border-radius: 6px; cursor: pointer;">
          Artifacts
        </button>
        <button onclick="window.mcpUI.notify('You voted for: Chat')" style="padding: 10px; text-align: left; background: white; border: 1px solid #ddd; border-radius: 6px; cursor: pointer;">
          Chat
        </button>
        <button onclick="window.mcpUI.notify('You voted for: Web Search')" style="padding: 10px; text-align: left; background: white; border: 1px solid #ddd; border-radius: 6px; cursor: pointer;">
          Web Search
        </button>
      </div>
    </div>
  `;

  return createHTMLResource('ui://demo/poll', html, { toolName: 'demo-poll' });
}

function createCalculatorWidget(): MCPUIData {
  const html = `
    <div style="padding: 16px; background: #1a1a2e; border-radius: 12px; color: white;">
      <input type="text" id="display" readonly style="width: 100%; padding: 12px; font-size: 24px; text-align: right; background: #16213e; border: none; border-radius: 6px; color: white; margin-bottom: 12px;" value="0">
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;">
        <button onclick="calc('7')" style="padding: 12px; font-size: 18px; background: #0f3460; border: none; border-radius: 6px; color: white; cursor: pointer;">7</button>
        <button onclick="calc('8')" style="padding: 12px; font-size: 18px; background: #0f3460; border: none; border-radius: 6px; color: white; cursor: pointer;">8</button>
        <button onclick="calc('9')" style="padding: 12px; font-size: 18px; background: #0f3460; border: none; border-radius: 6px; color: white; cursor: pointer;">9</button>
        <button onclick="calc('/')" style="padding: 12px; font-size: 18px; background: #e94560; border: none; border-radius: 6px; color: white; cursor: pointer;">/</button>
        <button onclick="calc('4')" style="padding: 12px; font-size: 18px; background: #0f3460; border: none; border-radius: 6px; color: white; cursor: pointer;">4</button>
        <button onclick="calc('5')" style="padding: 12px; font-size: 18px; background: #0f3460; border: none; border-radius: 6px; color: white; cursor: pointer;">5</button>
        <button onclick="calc('6')" style="padding: 12px; font-size: 18px; background: #0f3460; border: none; border-radius: 6px; color: white; cursor: pointer;">6</button>
        <button onclick="calc('*')" style="padding: 12px; font-size: 18px; background: #e94560; border: none; border-radius: 6px; color: white; cursor: pointer;">*</button>
        <button onclick="calc('1')" style="padding: 12px; font-size: 18px; background: #0f3460; border: none; border-radius: 6px; color: white; cursor: pointer;">1</button>
        <button onclick="calc('2')" style="padding: 12px; font-size: 18px; background: #0f3460; border: none; border-radius: 6px; color: white; cursor: pointer;">2</button>
        <button onclick="calc('3')" style="padding: 12px; font-size: 18px; background: #0f3460; border: none; border-radius: 6px; color: white; cursor: pointer;">3</button>
        <button onclick="calc('-')" style="padding: 12px; font-size: 18px; background: #e94560; border: none; border-radius: 6px; color: white; cursor: pointer;">-</button>
        <button onclick="calc('0')" style="padding: 12px; font-size: 18px; background: #0f3460; border: none; border-radius: 6px; color: white; cursor: pointer;">0</button>
        <button onclick="clearCalc()" style="padding: 12px; font-size: 18px; background: #533483; border: none; border-radius: 6px; color: white; cursor: pointer;">C</button>
        <button onclick="calculate()" style="padding: 12px; font-size: 18px; background: #e94560; border: none; border-radius: 6px; color: white; cursor: pointer;">=</button>
        <button onclick="calc('+')" style="padding: 12px; font-size: 18px; background: #e94560; border: none; border-radius: 6px; color: white; cursor: pointer;">+</button>
      </div>
    </div>
    <script>
      let expression = '';
      function calc(val) {
        expression += val;
        document.getElementById('display').value = expression;
      }
      function clearCalc() {
        expression = '';
        document.getElementById('display').value = '0';
      }
      function calculate() {
        try {
          const result = eval(expression);
          document.getElementById('display').value = result;
          expression = String(result);
        } catch {
          document.getElementById('display').value = 'Error';
          expression = '';
        }
      }
    </script>
  `;

  return createHTMLResource('ui://demo/calculator', html, { toolName: 'demo-calculator' });
}
```

---

#### Step 3.4: Integrate MCP Tools into Chat Handler

**File**: `supabase/functions/chat/index.ts`

**Add import** (after line ~7):
```typescript
import { detectMCPToolIntent, executeMCPTool } from "./handlers/mcp-tools.ts";
import type { MCPUIData } from "./_shared/mcp-ui-types.ts";
```

**Add MCP tool detection** (after intent detection, around line ~211):
```typescript
// ========================================
// MCP TOOL: Check for MCP tool intent
// ========================================
let mcpUIData: MCPUIData | null = null;
const mcpToolRequest = detectMCPToolIntent(lastUserMessage);
if (mcpToolRequest) {
  console.log(`[${requestId}] MCP tool detected:`, mcpToolRequest.toolName);
  mcpUIData = await executeMCPTool(mcpToolRequest);
}
```

**Update createStreamingResponse call** (line 518):
```typescript
return createStreamingResponse(
  response.body!,
  structuredReasoning,
  searchResult,
  mcpUIData, // NEW - insert after searchResult
  corsHeaders,
  rateLimitHeaders,
  requestId
);
```

---

### Phase 4: Testing & Polish (Days 11-14)

#### Step 4.1: Add Unit Tests

**New File**: `src/types/__tests__/mcpUI.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import {
  parseMCPUIEvent,
  parseMCPUIResource,
  extractResourceContent,
  isMVPSupportedType,
} from '../mcpUI';

describe('mcpUI type definitions', () => {
  describe('parseMCPUIEvent', () => {
    it('parses valid MCP UI event', () => {
      const event = {
        type: 'mcp_ui',
        sequence: 1,
        timestamp: Date.now(),
        data: {
          resources: [{
            uri: 'ui://test/widget',
            mimeType: 'text/html',
            text: '<p>Hello</p>',
          }],
        },
      };

      const result = parseMCPUIEvent(event);
      expect(result).not.toBeNull();
      expect(result?.resources).toHaveLength(1);
    });

    it('returns null for invalid event', () => {
      const result = parseMCPUIEvent({ invalid: 'data' });
      expect(result).toBeNull();
    });
  });

  describe('extractResourceContent', () => {
    it('extracts text content', () => {
      const resource = {
        uri: 'ui://test',
        mimeType: 'text/html' as const,
        text: '<p>Hello</p>',
      };

      expect(extractResourceContent(resource)).toBe('<p>Hello</p>');
    });

    it('decodes base64 blob', () => {
      const resource = {
        uri: 'ui://test',
        mimeType: 'text/html' as const,
        blob: btoa('<p>Hello</p>'),
      };

      expect(extractResourceContent(resource)).toBe('<p>Hello</p>');
    });
  });

  describe('isMVPSupportedType', () => {
    it('supports text/html', () => {
      expect(isMVPSupportedType('text/html')).toBe(true);
    });

    it('supports text/uri-list', () => {
      expect(isMVPSupportedType('text/uri-list')).toBe(true);
    });

    it('does not support remote-dom in MVP', () => {
      expect(isMVPSupportedType('application/vnd.mcp-ui.remote-dom+javascript')).toBe(false);
    });
  });
});
```

---

#### Step 4.2: Add Component Tests

**New File**: `src/components/__tests__/MCPUIRenderer.test.tsx`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MCPUIRenderer } from '../MCPUIRenderer';

describe('MCPUIRenderer', () => {
  it('renders nothing when mcpUI is null', () => {
    const { container } = render(<MCPUIRenderer mcpUI={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders HTML resource in iframe', () => {
    const mcpUI = {
      resources: [{
        uri: 'ui://test/widget',
        mimeType: 'text/html' as const,
        text: '<p>Hello World</p>',
      }],
    };

    render(<MCPUIRenderer mcpUI={mcpUI} />);

    const iframe = document.querySelector('iframe');
    expect(iframe).toBeInTheDocument();
    expect(iframe?.getAttribute('sandbox')).toContain('allow-scripts');
  });

  it('shows unsupported message for remote-dom', () => {
    const mcpUI = {
      resources: [{
        uri: 'ui://test/widget',
        mimeType: 'application/vnd.mcp-ui.remote-dom+javascript' as const,
        text: 'some code',
      }],
    };

    render(<MCPUIRenderer mcpUI={mcpUI} />);

    expect(screen.getByText(/Unsupported MCP UI type/)).toBeInTheDocument();
  });
});
```

---

#### Step 4.3: Browser Verification Checklist

After implementation, verify with Chrome DevTools MCP:

```bash
chrome-mcp start
```

**Test Cases**:
1. Send message: "Show me a weather widget" → Should render weather UI inline
2. Send message: "Create a poll" → Should render poll UI with working buttons
3. Send message: "I need a calculator" → Should render interactive calculator
4. Click poll button → Should show toast notification
5. Click "Get Forecast" button → Should inject prompt into input

---

## File Change Summary

### New Files (6)
| File | Purpose |
|------|---------|
| `src/types/mcpUI.ts` | Type definitions and validation |
| `src/components/MCPUIRenderer.tsx` | Render MCP UI resources |
| `src/types/__tests__/mcpUI.test.ts` | Type tests |
| `src/components/__tests__/MCPUIRenderer.test.tsx` | Component tests |
| `supabase/functions/_shared/mcp-ui-types.ts` | Server-side types |
| `supabase/functions/chat/handlers/mcp-tools.ts` | MCP tool handler |

### Modified Files (5)
| File | Changes |
|------|---------|
| `package.json` | Add @mcp-ui/client dependency |
| `src/hooks/useChatMessages.tsx` | Add mcp_ui event parsing |
| `src/components/MessageWithArtifacts.tsx` | Render MCPUIRenderer |
| `src/components/ChatInterface.tsx` | Pass mcpUI props |
| `supabase/functions/chat/handlers/streaming.ts` | Inject mcp_ui events |
| `supabase/functions/chat/index.ts` | MCP tool detection |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| MCP UI package instability | Pin exact version, review changelog before updates |
| iframe security | Strict sandbox attributes, CSP headers |
| Performance with many widgets | Lazy load iframes, virtualize if >5 resources |
| Action handler errors | Try-catch all handlers, toast on error |

---

## Success Criteria

- [ ] `npm install @mcp-ui/client` succeeds
- [ ] Type definitions pass TypeScript compilation
- [ ] Demo widgets render inline in chat
- [ ] Button actions (notify, prompt) work correctly
- [ ] No console errors during normal operation
- [ ] Tests pass with >80% coverage for new code
- [ ] Chrome DevTools verification complete

---

## Future Roadmap (Post-MVP)

1. **Remote DOM Support**: Enable host component library rendering
2. **Full MCP Protocol**: Connect to external MCP servers
3. **Artifact Migration**: Refactor artifacts to use MCP UI
4. **Tool Registry**: Dynamic tool discovery and registration
5. **UI Theming**: Match widgets to Vana's design system
