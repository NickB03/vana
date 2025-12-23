> **STATUS**: 📋 Planned
> **Last Updated**: 2025-12-23
> **Priority**: High
> **Implementation**: Demo pages exist (DeepResearchDemo*.tsx) but no backend Edge Function
> **Version**: 2.0 | **Created**: 2025-12-01 | **Updated**: 2025-12-01 | **Status**: Planning
>
> **Goal**: Implement a high-quality deep research experience similar to Gemini Deep Research, Claude's Extended Thinking, and ChatGPT's Deep Research mode.
>
> **Key Change in v2.0**: Switched from Tavily to **Z.ai MCP tools** as primary search/extraction backend (4,000 free calls/month with Coding Max plan), with Tavily as fallback.

## Executive Summary

This plan outlines the implementation of a **Deep Research** feature that provides comprehensive, multi-source research capabilities. The feature will be triggered via a clickable option (similar to artifacts), perform multi-step web research using **Z.ai MCP tools** (Web Search Prime, Web Reader, Vision) and GLM-4.6's reasoning capabilities, and present results in an interactive, progressive disclosure UI.

### Key Architecture Decision: Z.ai MCP vs Tavily

| Aspect | Z.ai MCP (Primary) | Tavily (Fallback) |
|--------|-------------------|-------------------|
| **Cost** | **$0** (included in Coding Max) | $0.001/search + extraction |
| **Monthly quota** | 4,000 searches + readers | Pay per use |
| **Web Search** | Web Search Prime | Search API |
| **Content Extraction** | Web Reader MCP | Extract API |
| **Vision/OCR** | Vision MCP (5h pool) | ❌ Not available |
| **API Key** | Same as GLM_API_KEY | Separate TAVILY_API_KEY |

**Estimated savings**: ~$35/month at 500 research queries (eliminates Tavily search/extraction costs)

---

## Table of Contents

1. [Feature Overview](#1-feature-overview)
2. [Architecture Design](#2-architecture-design)
3. [Backend Implementation](#3-backend-implementation)
4. [Frontend Implementation](#4-frontend-implementation)
5. [Database Schema](#5-database-schema)
6. [API Contracts](#6-api-contracts)
7. [UI/UX Design](#7-uiux-design)
8. [Rate Limiting & Cost Management](#8-rate-limiting--cost-management)
9. [Testing Strategy](#9-testing-strategy)
10. [Implementation Phases](#10-implementation-phases)
11. [Success Metrics](#11-success-metrics)
12. [Risk Mitigation](#12-risk-mitigation)

---

## 1. Feature Overview

### 1.1 What is Deep Research?

Deep Research is an AI-powered research assistant that:
- **Searches multiple sources** (web, academic, news) to gather comprehensive information
- **Synthesizes findings** into structured, actionable insights
- **Shows its work** with live progress updates, source citations, and reasoning
- **Produces a research report** with key findings, analysis, and recommendations
- **Analyzes images/PDFs** using Z.ai Vision MCP (unique capability)

### 1.2 User Flow

```
User Types Question → Clicks "Research" Button → Research Begins
    ↓
Phase 1: Query Analysis (2-3s)
- GLM analyzes query complexity
- Generates search strategy (5-10 sub-queries)
- Estimates research scope
    ↓
Phase 2: Web Research (10-30s)
- Z.ai Web Search Prime executes searches in parallel
- Deduplicates and ranks findings
- [Optional] Z.ai Vision analyzes images/PDFs
    ↓
Phase 3: Content Extraction (5-15s)
- Z.ai Web Reader extracts full content from top sources
- Structured data parsing + markdown formatting
    ↓
Phase 4: Synthesis (5-10s)
- GLM synthesizes findings with deep reasoning
- Generates structured report
- Creates citations and source list
    ↓
Phase 5: Presentation
- Progressive disclosure of findings
- Interactive source exploration
- Export/share options
```

### 1.3 Comparison with Competitors

| Feature | Gemini Deep Research | Claude Extended Thinking | ChatGPT Deep Research | **Vana Deep Research** |
|---------|---------------------|-------------------------|----------------------|----------------------|
| Multi-source search | ✅ Google Search | ❌ No web search | ✅ Bing Search | ✅ Z.ai Web Search |
| Content extraction | ❌ Limited | ❌ None | ✅ Bing | ✅ Z.ai Web Reader |
| Vision/OCR | ✅ Gemini Vision | ✅ Claude Vision | ✅ GPT-4V | ✅ **Z.ai Vision MCP** |
| Live progress | ✅ Step cards | ✅ Thinking dots | ✅ Progress bar | ✅ Reasoning display |
| Source citations | ✅ Inline | ✅ Footnotes | ✅ Numbered | ✅ Interactive cards |
| Report format | Long-form | Conversational | Structured | **Interactive artifact** |
| Time to result | 1-3 min | 30s-2min | 1-5 min | **30s-1.5min** |
| Follow-up research | ✅ | ❌ | ✅ | ✅ |

### 1.4 Differentiators

1. **Cost Efficiency**: Z.ai MCP tools included in Coding Max plan (4,000 calls/month free)
2. **Speed**: Parallel search execution + aggressive caching = faster results
3. **Interactivity**: Research report is an interactive artifact (expandable sections, source previews)
4. **Transparency**: Full reasoning chain visible, not just final output
5. **Vision Integration**: Analyze PDFs, images, and documents with Z.ai Vision MCP
6. **Unified Stack**: Same API key for search, extraction, vision, and GLM synthesis

---

## 2. Architecture Design

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND                                    │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐   ┌──────────────────┐   ┌────────────────────────┐   │
│  │PromptInput  │   │ ResearchProgress │   │ ResearchArtifact       │   │
│  │+ Research   │──▶│ (live updates)   │──▶│ (interactive report)   │   │
│  │  Button     │   │                  │   │                        │   │
│  └─────────────┘   └──────────────────┘   └────────────────────────┘   │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │ SSE Stream
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         EDGE FUNCTIONS                                   │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │                    generate-research/                          │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐    │    │
│  │  │ Query       │  │ Search      │  │ Synthesis           │    │    │
│  │  │ Analyzer    │──▶│ Orchestrator│──▶│ Engine              │    │    │
│  │  │ (GLM)       │  │ (Z.ai MCP)  │  │ (GLM + reasoning)   │    │    │
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘    │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                                                                         │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────────────┐   │
│  │ _shared/       │  │ _shared/       │  │ _shared/               │   │
│  │ zai-mcp-       │  │ tavily-        │  │ glm-client.ts          │   │
│  │ client.ts      │  │ client.ts      │  │                        │   │
│  │ (PRIMARY)      │  │ (FALLBACK)     │  │                        │   │
│  └────────────────┘  └────────────────┘  └────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         Z.AI MCP SERVICES                                │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐    │
│  │ Web Search      │  │ Web Reader      │  │ Vision              │    │
│  │ Prime MCP       │  │ MCP             │  │ MCP                 │    │
│  │                 │  │                 │  │                     │    │
│  │ webSearchPrime  │  │ webReader       │  │ visionAnalyze       │    │
│  │ - titles        │  │ - full content  │  │ - image analysis    │    │
│  │ - URLs          │  │ - markdown      │  │ - PDF OCR           │    │
│  │ - summaries     │  │ - structured    │  │ - document parsing  │    │
│  │ - icons         │  │ - cache control │  │                     │    │
│  └─────────────────┘  └─────────────────┘  └─────────────────────┘    │
│                                                                         │
│  Quota: 4,000 combined searches + readers / month (Coding Max)         │
│  Vision: 5-hour maximum prompt resource pool                            │
└─────────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           DATABASE                                       │
├─────────────────────────────────────────────────────────────────────────┤
│  chat_messages (research_data JSONB)                                    │
│  research_cache (query deduplication)                                   │
│  ai_usage_logs (cost tracking)                                          │
│  zai_quota_tracking (MCP usage monitoring)                              │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow

```
1. User clicks "Research" button + enters query
2. Frontend sends POST to /generate-research with researchMode=true
3. Edge function establishes SSE stream
4. Phase 1: Query Analysis
   - GLM analyzes query → generates search strategy
   - Stream: { event: "analysis", data: { queries: [...], scope: "..." } }
5. Phase 2: Web Research (Z.ai Web Search Prime)
   - Execute searches in parallel batches (3-5 concurrent)
   - Stream: { event: "search", data: { completed: 2, total: 8, results: [...] } }
   - [If quota exhausted] Fallback to Tavily
6. Phase 3: Content Extraction (Z.ai Web Reader)
   - Extract full content from top URLs
   - Stream: { event: "extract", data: { source: {...}, content: "..." } }
   - [If quota exhausted] Fallback to Tavily Extract
7. Phase 4: Vision Analysis (Optional - Z.ai Vision MCP)
   - If user provided images/PDFs, analyze with Vision
   - Stream: { event: "vision", data: { analysis: "..." } }
8. Phase 5: Synthesis
   - GLM synthesizes with reasoning mode
   - Stream: { event: "reasoning", data: { text: "..." } }
   - Stream: { event: "content", data: { section: "...", text: "..." } }
9. Phase 6: Complete
   - Stream: { event: "complete", data: { report: {...}, sources: [...] } }
10. Frontend renders interactive research artifact
```

### 2.3 SSE Event Types

```typescript
// Event types for deep research SSE stream
type ResearchEvent =
  | { event: 'analysis_start'; data: { query: string } }
  | { event: 'analysis_complete'; data: ResearchAnalysis }
  | { event: 'search_start'; data: { queryIndex: number; query: string; provider: 'zai' | 'tavily' } }
  | { event: 'search_complete'; data: { queryIndex: number; results: SearchResult[] } }
  | { event: 'extract_start'; data: { url: string; provider: 'zai' | 'tavily' } }
  | { event: 'extract_complete'; data: { url: string; content: string } }
  | { event: 'vision_start'; data: { type: 'image' | 'pdf'; filename: string } }
  | { event: 'vision_complete'; data: { analysis: string } }
  | { event: 'synthesis_start'; data: { totalSources: number } }
  | { event: 'reasoning_chunk'; data: { text: string } }
  | { event: 'content_chunk'; data: { section: string; text: string } }
  | { event: 'quota_warning'; data: { remaining: number; type: 'search' | 'reader' | 'vision' } }
  | { event: 'fallback_activated'; data: { reason: string; provider: 'tavily' } }
  | { event: 'complete'; data: ResearchReport }
  | { event: 'error'; data: { message: string; recoverable: boolean } };

interface ResearchAnalysis {
  originalQuery: string;
  searchQueries: string[];
  researchScope: 'focused' | 'broad' | 'comprehensive';
  estimatedTime: number; // seconds
  topics: string[];
  hasImages: boolean; // If true, will use Vision MCP
}

interface ResearchReport {
  title: string;
  summary: string;
  sections: ReportSection[];
  sources: Source[];
  keyFindings: string[];
  reasoning: string;
  visionAnalysis?: string; // From Vision MCP if applicable
  generatedAt: string;
  providerUsed: {
    search: 'zai' | 'tavily';
    extraction: 'zai' | 'tavily';
    vision?: 'zai';
  };
}
```

---

## 3. Backend Implementation

### 3.1 New Edge Function: `generate-research/`

**File Structure:**
```
supabase/functions/generate-research/
├── index.ts                  # Main handler + SSE streaming
├── query-analyzer.ts         # Query analysis with GLM
├── search-orchestrator.ts    # Parallel search with Z.ai MCP + Tavily fallback
├── content-extractor.ts      # URL content extraction with Z.ai Web Reader
├── vision-analyzer.ts        # Image/PDF analysis with Z.ai Vision (NEW)
├── synthesizer.ts            # Report synthesis with GLM
├── quota-tracker.ts          # Z.ai MCP quota monitoring (NEW)
└── types.ts                  # Research-specific types
```

### 3.2 New Shared Client: `_shared/zai-mcp-client.ts`

**Z.ai MCP Client for Web Search, Web Reader, and Vision:**

```typescript
/**
 * Z.ai MCP Client
 *
 * Provides access to Z.ai MCP services for Deep Research:
 * - Web Search Prime: Real-time web search with titles, URLs, summaries
 * - Web Reader: Full-page content extraction with markdown formatting
 * - Vision: Image and PDF analysis
 *
 * All services use the same GLM_API_KEY and are included in Coding Max plan.
 * Quota: 4,000 combined searches + readers / month
 *
 * MCP Endpoints:
 * - Search: https://api.z.ai/api/mcp/web_search_prime/mcp
 * - Reader: https://api.z.ai/api/mcp/web_reader/mcp
 * - Vision: https://api.z.ai/api/mcp/vision/mcp
 */

const GLM_API_KEY = Deno.env.get("GLM_API_KEY");

// MCP endpoint URLs
const MCP_ENDPOINTS = {
  SEARCH: "https://api.z.ai/api/mcp/web_search_prime/mcp",
  READER: "https://api.z.ai/api/mcp/web_reader/mcp",
  VISION: "https://api.z.ai/api/mcp/vision/mcp",
} as const;

// ============================================================================
// TYPES
// ============================================================================

export interface ZaiSearchResult {
  title: string;
  url: string;
  summary: string;
  siteName?: string;
  icon?: string;
}

export interface ZaiSearchResponse {
  results: ZaiSearchResult[];
  query: string;
  responseTime?: number;
}

export interface ZaiReaderResponse {
  url: string;
  content: string;           // Full page content in markdown
  title?: string;
  metadata?: Record<string, unknown>;
}

export interface ZaiVisionResponse {
  analysis: string;
  confidence?: number;
  extractedText?: string;    // For OCR
}

export interface ZaiMCPOptions {
  requestId?: string;
  timeout?: number;          // ms, default 30000
}

// ============================================================================
// MCP RPC HELPER
// ============================================================================

async function callMCPTool<T>(
  endpoint: string,
  toolName: string,
  args: Record<string, unknown>,
  options?: ZaiMCPOptions
): Promise<T> {
  const { requestId = crypto.randomUUID(), timeout = 30000 } = options || {};

  if (!GLM_API_KEY) {
    throw new Error("GLM_API_KEY not configured - required for Z.ai MCP services");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    console.log(`[${requestId}] 🔌 Calling Z.ai MCP: ${toolName}`);

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GLM_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "tools/call",
        params: {
          name: toolName,
          arguments: args,
        },
        id: requestId,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[${requestId}] ❌ Z.ai MCP error (${response.status}):`, errorText.substring(0, 200));
      throw new ZaiMCPError(
        `Z.ai MCP error: ${response.status}`,
        response.status,
        errorText
      );
    }

    const data = await response.json();

    // Handle MCP RPC errors
    if (data.error) {
      throw new ZaiMCPError(
        data.error.message || "MCP tool call failed",
        data.error.code || 500,
        JSON.stringify(data.error)
      );
    }

    console.log(`[${requestId}] ✅ Z.ai MCP ${toolName} completed`);
    return data.result as T;

  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === "AbortError") {
      throw new ZaiMCPError(
        `Z.ai MCP request timed out after ${timeout}ms`,
        408,
        "timeout"
      );
    }

    throw error;
  }
}

// ============================================================================
// ERROR CLASS
// ============================================================================

export class ZaiMCPError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly responseBody?: string
  ) {
    super(message);
    this.name = "ZaiMCPError";
  }

  get isQuotaExceeded(): boolean {
    return this.statusCode === 429 || this.message.includes("quota");
  }

  get isRetryable(): boolean {
    return this.statusCode === 429 || this.statusCode === 503 || this.statusCode === 408;
  }
}

// ============================================================================
// WEB SEARCH PRIME
// ============================================================================

/**
 * Search the web using Z.ai Web Search Prime MCP
 *
 * @param query - Search query string
 * @param options - Request options
 * @returns Search results with titles, URLs, summaries
 *
 * @example
 * ```ts
 * const results = await searchWebPrime("React performance optimization");
 * // Returns: { results: [{ title, url, summary, siteName, icon }], query }
 * ```
 */
export async function searchWebPrime(
  query: string,
  options?: ZaiMCPOptions
): Promise<ZaiSearchResponse> {
  const result = await callMCPTool<{ results: ZaiSearchResult[] }>(
    MCP_ENDPOINTS.SEARCH,
    "webSearchPrime",
    { query },
    options
  );

  return {
    results: result.results || [],
    query,
  };
}

/**
 * Search with retry and fallback support
 */
export async function searchWebPrimeWithRetry(
  query: string,
  options?: ZaiMCPOptions,
  retryCount = 0
): Promise<ZaiSearchResponse> {
  const maxRetries = 2;
  const requestId = options?.requestId || crypto.randomUUID();

  try {
    return await searchWebPrime(query, { ...options, requestId });
  } catch (error) {
    if (error instanceof ZaiMCPError) {
      // If quota exceeded, don't retry - let caller handle fallback
      if (error.isQuotaExceeded) {
        throw error;
      }

      // Retry for transient errors
      if (error.isRetryable && retryCount < maxRetries) {
        const delayMs = Math.min(1000 * Math.pow(2, retryCount), 5000);
        console.log(`[${requestId}] Z.ai search retry ${retryCount + 1}/${maxRetries} after ${delayMs}ms`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        return searchWebPrimeWithRetry(query, options, retryCount + 1);
      }
    }

    throw error;
  }
}

// ============================================================================
// WEB READER
// ============================================================================

/**
 * Read and extract content from a URL using Z.ai Web Reader MCP
 *
 * @param url - URL to extract content from
 * @param options - Request options including format preferences
 * @returns Extracted content in markdown format
 *
 * @example
 * ```ts
 * const content = await readWebPage("https://react.dev/learn");
 * // Returns: { url, content: "# React Learn\n...", title }
 * ```
 */
export async function readWebPage(
  url: string,
  options?: ZaiMCPOptions & {
    format?: "markdown" | "text" | "html";
    includeImages?: boolean;
    useCachе?: boolean;
  }
): Promise<ZaiReaderResponse> {
  const { format = "markdown", includeImages = false, useCachе = true, ...mcpOptions } = options || {};

  const result = await callMCPTool<ZaiReaderResponse>(
    MCP_ENDPOINTS.READER,
    "webReader",
    {
      url,
      format,
      includeImages,
      useCache: useCachе,
    },
    mcpOptions
  );

  return result;
}

/**
 * Read multiple URLs in parallel with batching
 */
export async function readWebPagesBatch(
  urls: string[],
  options?: ZaiMCPOptions & { batchSize?: number }
): Promise<ZaiReaderResponse[]> {
  const { batchSize = 5, ...mcpOptions } = options || {};
  const results: ZaiReaderResponse[] = [];

  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize);
    const batchResults = await Promise.allSettled(
      batch.map(url => readWebPage(url, mcpOptions))
    );

    for (const result of batchResults) {
      if (result.status === "fulfilled") {
        results.push(result.value);
      }
    }
  }

  return results;
}

// ============================================================================
// VISION
// ============================================================================

/**
 * Analyze an image or PDF using Z.ai Vision MCP
 *
 * @param input - Base64 encoded image or PDF URL
 * @param prompt - Analysis prompt
 * @param options - Request options
 * @returns Vision analysis result
 *
 * @example
 * ```ts
 * const analysis = await analyzeWithVision(base64Image, "Describe this diagram");
 * // Returns: { analysis: "This is a system architecture diagram showing..." }
 * ```
 */
export async function analyzeWithVision(
  input: string,
  prompt: string,
  options?: ZaiMCPOptions & {
    inputType?: "base64" | "url";
    mediaType?: "image" | "pdf";
  }
): Promise<ZaiVisionResponse> {
  const { inputType = "base64", mediaType = "image", ...mcpOptions } = options || {};

  const result = await callMCPTool<ZaiVisionResponse>(
    MCP_ENDPOINTS.VISION,
    "visionAnalyze",
    {
      input,
      inputType,
      mediaType,
      prompt,
    },
    mcpOptions
  );

  return result;
}

// ============================================================================
// QUOTA TRACKING
// ============================================================================

export interface ZaiQuotaStatus {
  searchesUsed: number;
  searchesRemaining: number;
  readersUsed: number;
  readersRemaining: number;
  visionMinutesUsed: number;
  visionMinutesRemaining: number;
  resetDate: string;
}

/**
 * Get current Z.ai MCP quota status
 * Note: This requires tracking usage locally since MCP doesn't expose quota API
 */
export async function getQuotaStatus(supabase: any): Promise<ZaiQuotaStatus> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // Query usage from our tracking table
  const { data: usage, error } = await supabase
    .from("zai_quota_tracking")
    .select("*")
    .gte("created_at", monthStart.toISOString())
    .single();

  if (error || !usage) {
    // Default to full quota if no tracking data
    return {
      searchesUsed: 0,
      searchesRemaining: 4000,
      readersUsed: 0,
      readersRemaining: 4000, // Combined with searches
      visionMinutesUsed: 0,
      visionMinutesRemaining: 300, // 5 hours
      resetDate: new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString(),
    };
  }

  const totalUsed = (usage.searches_count || 0) + (usage.readers_count || 0);
  const remaining = Math.max(0, 4000 - totalUsed);

  return {
    searchesUsed: usage.searches_count || 0,
    searchesRemaining: remaining,
    readersUsed: usage.readers_count || 0,
    readersRemaining: remaining,
    visionMinutesUsed: usage.vision_minutes || 0,
    visionMinutesRemaining: Math.max(0, 300 - (usage.vision_minutes || 0)),
    resetDate: new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString(),
  };
}

/**
 * Log Z.ai MCP usage for quota tracking
 */
export async function logZaiUsage(
  supabase: any,
  type: "search" | "reader" | "vision",
  count: number = 1
): Promise<void> {
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  try {
    await supabase.rpc("increment_zai_usage", {
      p_month_key: monthKey,
      p_type: type,
      p_count: count,
    });
  } catch (error) {
    console.error("Failed to log Z.ai usage:", error);
    // Non-blocking - don't fail the request
  }
}
```

### 3.3 Search Orchestrator with Z.ai Primary + Tavily Fallback

**Updated `search-orchestrator.ts`:**

```typescript
import {
  searchWebPrimeWithRetry,
  ZaiMCPError,
  logZaiUsage,
  getQuotaStatus
} from "../_shared/zai-mcp-client.ts";
import { searchTavilyWithRetry } from "../_shared/tavily-client.ts";
import { SearchResult, SearchProgress, ResearchConfig } from "./types.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";

export interface SearchOrchestratorResult {
  results: SearchResult[];
  providerUsed: "zai" | "tavily";
  fallbackReason?: string;
}

export async function orchestrateSearch(
  queries: string[],
  config: ResearchConfig,
  onProgress: (progress: SearchProgress) => void,
  requestId: string
): Promise<SearchOrchestratorResult> {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  // Check Z.ai quota before starting
  const quota = await getQuotaStatus(supabase);
  const queriesNeeded = queries.length;

  // Determine which provider to use
  let useZai = quota.searchesRemaining >= queriesNeeded;
  let fallbackReason: string | undefined;

  if (!useZai) {
    fallbackReason = `Z.ai quota low (${quota.searchesRemaining} remaining, need ${queriesNeeded})`;
    console.log(`[${requestId}] ⚠️ ${fallbackReason} - using Tavily fallback`);
  }

  const allResults: SearchResult[] = [];
  const seenUrls = new Set<string>();

  // Process queries in batches
  for (let i = 0; i < queries.length; i += config.parallelSearches) {
    const batch = queries.slice(i, i + config.parallelSearches);

    const batchResults = await Promise.allSettled(
      batch.map(async (query, batchIndex) => {
        const queryIndex = i + batchIndex;
        onProgress({
          phase: "searching",
          queryIndex,
          query,
          completed: queryIndex,
          total: queries.length,
          provider: useZai ? "zai" : "tavily",
        });

        if (useZai) {
          try {
            // Try Z.ai Web Search Prime
            const response = await searchWebPrimeWithRetry(query, { requestId });

            // Log usage
            await logZaiUsage(supabase, "search", 1);

            return {
              queryIndex,
              query,
              results: response.results.map(r => ({
                title: r.title,
                url: r.url,
                content: r.summary,
                score: 1.0, // Z.ai doesn't return scores, default to 1.0
                siteName: r.siteName,
              })),
              provider: "zai" as const,
            };
          } catch (error) {
            if (error instanceof ZaiMCPError && error.isQuotaExceeded) {
              // Switch to Tavily for remaining queries
              useZai = false;
              fallbackReason = "Z.ai quota exceeded mid-research";
              console.log(`[${requestId}] ⚠️ ${fallbackReason} - switching to Tavily`);
            } else {
              throw error;
            }
          }
        }

        // Tavily fallback
        const response = await searchTavilyWithRetry(query, {
          requestId,
          maxResults: config.maxSourcesPerQuery,
          includeAnswer: true,
        });

        return {
          queryIndex,
          query,
          results: response.results.map(r => ({
            title: r.title,
            url: r.url,
            content: r.content,
            score: r.score,
          })),
          answer: response.answer,
          provider: "tavily" as const,
        };
      })
    );

    // Process results, deduplicating by URL
    for (const result of batchResults) {
      if (result.status === "fulfilled") {
        for (const source of result.value.results) {
          if (!seenUrls.has(source.url)) {
            seenUrls.add(source.url);
            allResults.push({
              ...source,
              fromQuery: result.value.query,
              queryAnswer: result.value.answer,
            });
          }
        }
      }
    }

    onProgress({
      phase: "searching",
      completed: Math.min(i + config.parallelSearches, queries.length),
      total: queries.length,
      resultsCount: allResults.length,
      provider: useZai ? "zai" : "tavily",
    });
  }

  // Sort by relevance score
  const sortedResults = allResults.sort((a, b) => (b.score || 0) - (a.score || 0));

  return {
    results: sortedResults,
    providerUsed: useZai ? "zai" : "tavily",
    fallbackReason,
  };
}
```

### 3.4 Content Extractor with Z.ai Web Reader

**Updated `content-extractor.ts`:**

```typescript
import {
  readWebPagesBatch,
  ZaiMCPError,
  logZaiUsage,
  getQuotaStatus
} from "../_shared/zai-mcp-client.ts";
import { extractUrlsWithRetry } from "../_shared/tavily-client.ts";
import { ExtractedContent, ExtractProgress, SearchResult } from "./types.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";

export interface ContentExtractorResult {
  content: ExtractedContent[];
  providerUsed: "zai" | "tavily";
  fallbackReason?: string;
}

export async function extractContent(
  sources: SearchResult[],
  onProgress: (progress: ExtractProgress) => void,
  requestId: string
): Promise<ContentExtractorResult> {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const urls = sources.map(s => s.url);

  // Check Z.ai quota
  const quota = await getQuotaStatus(supabase);
  let useZai = quota.readersRemaining >= urls.length;
  let fallbackReason: string | undefined;

  if (!useZai) {
    fallbackReason = `Z.ai quota low (${quota.readersRemaining} remaining, need ${urls.length})`;
    console.log(`[${requestId}] ⚠️ ${fallbackReason} - using Tavily fallback`);
  }

  onProgress({
    phase: "extracting",
    completed: 0,
    total: urls.length,
    provider: useZai ? "zai" : "tavily",
  });

  const allContent: ExtractedContent[] = [];

  if (useZai) {
    try {
      // Use Z.ai Web Reader
      const results = await readWebPagesBatch(urls, {
        requestId,
        batchSize: 5,
      });

      // Log usage
      await logZaiUsage(supabase, "reader", results.length);

      for (const result of results) {
        const source = sources.find(s => s.url === result.url);
        if (source && result.content) {
          allContent.push({
            url: result.url,
            title: result.title || source.title,
            content: truncateContent(result.content, 3000),
            score: source.score,
            fromQuery: source.fromQuery,
          });
        }
      }

      onProgress({
        phase: "extracting",
        completed: urls.length,
        total: urls.length,
        provider: "zai",
      });

      return {
        content: allContent,
        providerUsed: "zai",
      };
    } catch (error) {
      if (error instanceof ZaiMCPError && error.isQuotaExceeded) {
        useZai = false;
        fallbackReason = "Z.ai quota exceeded during extraction";
        console.log(`[${requestId}] ⚠️ ${fallbackReason} - falling back to Tavily`);
      } else {
        throw error;
      }
    }
  }

  // Tavily fallback - batch extraction
  const batchSize = 10;
  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize);

    try {
      const response = await extractUrlsWithRetry(batch, {
        requestId,
        extractDepth: "basic",
        includeImages: false,
      });

      for (const result of response.results) {
        const source = sources.find(s => s.url === result.url);
        if (source && result.raw_content) {
          allContent.push({
            url: result.url,
            title: source.title,
            content: truncateContent(result.raw_content, 3000),
            score: source.score,
            fromQuery: source.fromQuery,
          });
        }
      }
    } catch (error) {
      console.error(`[${requestId}] Extraction batch failed:`, error);
      // Continue with other batches
    }

    onProgress({
      phase: "extracting",
      completed: Math.min(i + batchSize, urls.length),
      total: urls.length,
      provider: "tavily",
    });
  }

  return {
    content: allContent,
    providerUsed: "tavily",
    fallbackReason,
  };
}

function truncateContent(content: string, maxLength: number): string {
  if (content.length <= maxLength) return content;

  const truncated = content.substring(0, maxLength);
  const lastPeriod = truncated.lastIndexOf(".");

  return lastPeriod > maxLength * 0.8
    ? truncated.substring(0, lastPeriod + 1)
    : truncated + "...";
}
```

### 3.5 Vision Analyzer (NEW)

**New file: `vision-analyzer.ts`**

```typescript
import { analyzeWithVision, logZaiUsage, getQuotaStatus } from "../_shared/zai-mcp-client.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";

export interface VisionInput {
  type: "image" | "pdf";
  data: string;        // Base64 or URL
  filename?: string;
}

export interface VisionAnalysisResult {
  analysis: string;
  extractedText?: string;
}

export async function analyzeVisionContent(
  inputs: VisionInput[],
  researchContext: string,
  requestId: string
): Promise<VisionAnalysisResult[]> {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  // Check vision quota
  const quota = await getQuotaStatus(supabase);
  if (quota.visionMinutesRemaining <= 0) {
    console.log(`[${requestId}] ⚠️ Z.ai Vision quota exhausted - skipping vision analysis`);
    return [];
  }

  const results: VisionAnalysisResult[] = [];

  for (const input of inputs) {
    try {
      const prompt = `Analyze this ${input.type} in the context of research about: ${researchContext}

Please provide:
1. A detailed description of the content
2. Key information relevant to the research topic
3. Any data, statistics, or facts that should be included in the report
${input.type === "pdf" ? "4. Extract and summarize any important text" : ""}`;

      const response = await analyzeWithVision(
        input.data,
        prompt,
        {
          requestId,
          inputType: input.data.startsWith("http") ? "url" : "base64",
          mediaType: input.type,
        }
      );

      // Log usage (estimate 1 minute per analysis)
      await logZaiUsage(supabase, "vision", 1);

      results.push({
        analysis: response.analysis,
        extractedText: response.extractedText,
      });
    } catch (error) {
      console.error(`[${requestId}] Vision analysis failed for ${input.filename}:`, error);
      // Continue with other inputs
    }
  }

  return results;
}
```

### 3.6 Main Handler Update

**Updated `index.ts` excerpt:**

```typescript
// ... imports ...

serve(async (req) => {
  // ... CORS handling ...

  try {
    const { query, sessionId, config: userConfig, visionInputs } = await req.json();
    const config = { ...DEFAULT_CONFIG, ...userConfig };

    // ... validation ...

    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (event: ResearchEvent) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        };

        try {
          // Phase 1: Query Analysis
          sendEvent({ event: "analysis_start", data: { query } });
          const analysis = await analyzeQuery(query, requestId);
          sendEvent({ event: "analysis_complete", data: analysis });

          // Phase 2: Web Research (Z.ai primary, Tavily fallback)
          const searchResult = await orchestrateSearch(
            analysis.searchQueries,
            config,
            (progress) => sendEvent({ event: "search_progress", data: progress }),
            requestId
          );

          // Notify if fallback was used
          if (searchResult.fallbackReason) {
            sendEvent({
              event: "fallback_activated",
              data: { reason: searchResult.fallbackReason, provider: "tavily" }
            });
          }

          // Phase 3: Content Extraction (Z.ai primary, Tavily fallback)
          const topSources = selectTopSources(searchResult.results, config.maxContentExtractions);
          const extractResult = await extractContent(
            topSources,
            (progress) => sendEvent({ event: "extract_progress", data: progress }),
            requestId
          );

          if (extractResult.fallbackReason) {
            sendEvent({
              event: "fallback_activated",
              data: { reason: extractResult.fallbackReason, provider: "tavily" }
            });
          }

          // Phase 4: Vision Analysis (if applicable)
          let visionAnalysis: VisionAnalysisResult[] = [];
          if (visionInputs && visionInputs.length > 0) {
            sendEvent({
              event: "vision_start",
              data: { type: visionInputs[0].type, filename: visionInputs[0].filename }
            });

            visionAnalysis = await analyzeVisionContent(
              visionInputs,
              query,
              requestId
            );

            for (const va of visionAnalysis) {
              sendEvent({
                event: "vision_complete",
                data: { analysis: va.analysis }
              });
            }
          }

          // Phase 5: Synthesis
          sendEvent({ event: "synthesis_start", data: { totalSources: extractResult.content.length } });
          const report = await synthesizeReport(
            query,
            analysis,
            extractResult.content,
            visionAnalysis,
            (chunk) => sendEvent({ event: "reasoning_chunk", data: { text: chunk } }),
            (section, text) => sendEvent({ event: "content_chunk", data: { section, text } })
          );

          // Add provider info to report
          report.providerUsed = {
            search: searchResult.providerUsed,
            extraction: extractResult.providerUsed,
            vision: visionAnalysis.length > 0 ? "zai" : undefined,
          };

          // Complete
          sendEvent({ event: "complete", data: report });

        } catch (error) {
          sendEvent({
            event: "error",
            data: { message: error.message, recoverable: false }
          });
        } finally {
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Request-Id": requestId,
      },
    });
  } catch (error) {
    // ... error handling ...
  }
});
```

---

## 4. Frontend Implementation

*(Unchanged from v1.0 - see sections 4.1-4.6)*

### 4.7 Additional: Provider Badge in Progress UI

Add provider indicator to `ResearchProgress.tsx`:

```tsx
// In ResearchProgress.tsx, add to progress display:
{progress.provider && (
  <Badge variant="outline" className="ml-2 text-xs">
    {progress.provider === "zai" ? "Z.ai MCP" : "Tavily"}
  </Badge>
)}
```

---

## 5. Database Schema

### 5.1 Schema Updates (Updated for Z.ai tracking)

```sql
-- Add research_data column to chat_messages (unchanged)
ALTER TABLE public.chat_messages
ADD COLUMN IF NOT EXISTS research_data JSONB;

-- ... (existing constraints and indexes unchanged) ...

-- NEW: Create Z.ai quota tracking table
CREATE TABLE IF NOT EXISTS public.zai_quota_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month_key TEXT NOT NULL UNIQUE,  -- Format: "2025-12"
  searches_count INTEGER DEFAULT 0,
  readers_count INTEGER DEFAULT 0,
  vision_minutes INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_zai_quota_month_key
ON public.zai_quota_tracking(month_key);

-- Function to increment Z.ai usage
CREATE OR REPLACE FUNCTION increment_zai_usage(
  p_month_key TEXT,
  p_type TEXT,  -- 'search', 'reader', or 'vision'
  p_count INTEGER DEFAULT 1
)
RETURNS void AS $$
BEGIN
  INSERT INTO public.zai_quota_tracking (month_key, searches_count, readers_count, vision_minutes)
  VALUES (p_month_key, 0, 0, 0)
  ON CONFLICT (month_key) DO NOTHING;

  IF p_type = 'search' THEN
    UPDATE public.zai_quota_tracking
    SET searches_count = searches_count + p_count, updated_at = now()
    WHERE month_key = p_month_key;
  ELSIF p_type = 'reader' THEN
    UPDATE public.zai_quota_tracking
    SET readers_count = readers_count + p_count, updated_at = now()
    WHERE month_key = p_month_key;
  ELSIF p_type = 'vision' THEN
    UPDATE public.zai_quota_tracking
    SET vision_minutes = vision_minutes + p_count, updated_at = now()
    WHERE month_key = p_month_key;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- RLS for quota tracking (service role only)
ALTER TABLE public.zai_quota_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage quota tracking"
ON public.zai_quota_tracking FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
```

### 5.2 Research Data Schema (Updated)

```typescript
interface StoredResearchData {
  version: "2.0";  // Updated version
  title: string;
  summary: string;
  sections: Array<{
    title: string;
    content: string;
  }>;
  sources: Array<{
    index: number;
    title: string;
    url: string;
    snippet?: string;
    relevance?: number;
  }>;
  keyFindings: string[];
  reasoning?: string;
  visionAnalysis?: string[];  // NEW: From Z.ai Vision
  analysis: {
    originalQuery: string;
    searchQueries: string[];
    topics: string[];
    scope: "focused" | "broad" | "comprehensive";
  };
  metrics: {
    totalSearches: number;
    totalSources: number;
    totalExtracted: number;
    generationTime: number;
    tokenUsage?: {
      input: number;
      output: number;
    };
  };
  // NEW: Provider tracking
  providers: {
    search: "zai" | "tavily";
    extraction: "zai" | "tavily";
    vision?: "zai";
    fallbackUsed: boolean;
    fallbackReason?: string;
  };
  generatedAt: string;
}
```

---

## 6. API Contracts

*(Mostly unchanged - see v1.0)*

### 6.1 Request Format (Updated)

```typescript
POST /functions/v1/generate-research
Content-Type: application/json
Authorization: Bearer <jwt_token> (optional)

{
  "query": string,           // Required: Research query (max 2000 chars)
  "sessionId": string,       // Optional: Chat session ID
  "visionInputs": [          // NEW: Optional vision inputs
    {
      "type": "image" | "pdf",
      "data": string,        // Base64 or URL
      "filename": string
    }
  ],
  "config": {
    "maxSearchQueries": number,
    "maxSourcesPerQuery": number,
    "maxContentExtractions": number,
    "preferZai": boolean,    // NEW: Default true, set false to prefer Tavily
  }
}
```

---

## 7. UI/UX Design

*(Unchanged from v1.0)*

---

## 8. Rate Limiting & Cost Management

### 8.1 Rate Limits (Unchanged)

| User Type | Per Hour | Per Day | Cooldown |
|-----------|----------|---------|----------|
| Guest | 3 | 10 | 5 min after limit |
| Authenticated | 20 | 100 | 1 min after limit |
| Premium (future) | 50 | 500 | No cooldown |

### 8.2 Cost Breakdown per Research Query (UPDATED)

| Service | Operations | Z.ai Cost | Tavily Cost (Fallback) |
|---------|------------|-----------|------------------------|
| Web Search | 8 queries | **$0** (included) | $0.008 |
| Content Extraction | 10 URLs | **$0** (included) | $0.002 |
| Vision Analysis | 0-2 images | **$0** (included) | N/A |
| GLM Analysis | 1 call | ~$0.01 | ~$0.01 |
| GLM Synthesis | 1 call | ~$0.05 | ~$0.05 |
| **Total (Z.ai)** | | **~$0.06** | |
| **Total (Tavily)** | | | ~$0.07 |

### 8.3 Z.ai MCP Quota Management

| Plan | Monthly Quota | Estimated Research Queries |
|------|---------------|---------------------------|
| Lite | 100 combined | ~5-10 researches |
| Pro | 1,000 combined | ~50-100 researches |
| **Max** | **4,000 combined** | **~200-500 researches** |

**Quota Strategy:**
1. Track usage in `zai_quota_tracking` table
2. Check quota before each research
3. Automatic fallback to Tavily when Z.ai quota is low (<20%)
4. Alert users when quota is running low
5. Reset tracking monthly

### 8.4 Cost Optimization Strategies (Updated)

1. **Z.ai First**: Always try Z.ai MCP first (free with plan)
2. **Smart Fallback**: Only use Tavily when Z.ai quota exhausted
3. **Query Caching**: Cache research results for 24 hours
4. **Progressive Depth**: Start with basic search, only expand if needed
5. **Source Deduplication**: Skip URLs already seen in session
6. **Content Truncation**: Limit extracted content to 3000 chars
7. **Vision Batching**: Combine multiple images into single analysis when possible

---

## 9. Testing Strategy

### 9.1 Unit Tests (Updated)

```typescript
// test/research/zai-mcp-client.test.ts
describe("Z.ai MCP Client", () => {
  describe("searchWebPrime", () => {
    it("returns search results with titles and summaries", async () => {
      const results = await searchWebPrime("React hooks");
      expect(results.results.length).toBeGreaterThan(0);
      expect(results.results[0]).toHaveProperty("title");
      expect(results.results[0]).toHaveProperty("url");
      expect(results.results[0]).toHaveProperty("summary");
    });

    it("handles quota exceeded error", async () => {
      // Mock quota exceeded response
      mockZaiQuotaExceeded();

      await expect(searchWebPrime("test")).rejects.toThrow(ZaiMCPError);
      await expect(searchWebPrime("test")).rejects.toHaveProperty("isQuotaExceeded", true);
    });
  });

  describe("readWebPage", () => {
    it("extracts content in markdown format", async () => {
      const result = await readWebPage("https://react.dev");
      expect(result.content).toBeDefined();
      expect(result.content.length).toBeGreaterThan(100);
    });
  });

  describe("analyzeWithVision", () => {
    it("analyzes images and returns description", async () => {
      const result = await analyzeWithVision(
        mockBase64Image,
        "Describe this image"
      );
      expect(result.analysis).toBeDefined();
      expect(result.analysis.length).toBeGreaterThan(50);
    });
  });
});

// test/research/search-orchestrator.test.ts
describe("Search Orchestrator", () => {
  it("uses Z.ai when quota available", async () => {
    mockZaiQuotaAvailable(1000);

    const result = await orchestrateSearch(
      ["React hooks", "React state"],
      defaultConfig,
      () => {},
      "test-request"
    );

    expect(result.providerUsed).toBe("zai");
    expect(result.fallbackReason).toBeUndefined();
  });

  it("falls back to Tavily when Z.ai quota exhausted", async () => {
    mockZaiQuotaAvailable(0);

    const result = await orchestrateSearch(
      ["React hooks"],
      defaultConfig,
      () => {},
      "test-request"
    );

    expect(result.providerUsed).toBe("tavily");
    expect(result.fallbackReason).toContain("quota");
  });

  it("switches to Tavily mid-research if Z.ai quota runs out", async () => {
    mockZaiQuotaAvailable(2); // Only 2 searches available
    const queries = ["q1", "q2", "q3", "q4", "q5"];

    const progressUpdates: SearchProgress[] = [];
    const result = await orchestrateSearch(
      queries,
      { ...defaultConfig, parallelSearches: 1 },
      (p) => progressUpdates.push(p),
      "test-request"
    );

    // Should have started with Z.ai and switched to Tavily
    expect(progressUpdates.some(p => p.provider === "zai")).toBe(true);
    expect(progressUpdates.some(p => p.provider === "tavily")).toBe(true);
  });
});
```

---

## 10. Implementation Phases (Updated)

### Phase 1: Z.ai MCP Integration (Week 1-2)

**Deliverables:**
- [ ] Create `_shared/zai-mcp-client.ts` with Web Search Prime, Web Reader, Vision
- [ ] Create `zai_quota_tracking` database table and RPC functions
- [ ] Update `generate-research/` to use Z.ai MCP as primary
- [ ] Implement fallback logic to Tavily
- [ ] Add quota monitoring and alerting
- [ ] Write unit tests for Z.ai MCP client
- [ ] Test fallback scenarios

**Success Criteria:**
- Z.ai MCP calls work correctly
- Fallback to Tavily works when quota exhausted
- Quota tracking is accurate

### Phase 2: Backend Foundation (Week 2-3)

**Deliverables:**
- [ ] Complete `generate-research/` Edge Function structure
- [ ] Implement query analyzer with GLM
- [ ] Implement search orchestrator with Z.ai + Tavily fallback
- [ ] Implement content extractor with Z.ai Web Reader + Tavily fallback
- [ ] Implement vision analyzer with Z.ai Vision
- [ ] Implement report synthesizer
- [ ] Add SSE streaming for all events
- [ ] Add rate limiting

**Success Criteria:**
- Full research flow works end-to-end
- All phases complete in < 90 seconds
- Vision analysis works for images and PDFs

### Phase 3: Frontend Components (Week 3-4)

*(Same as v1.0)*

### Phase 4: Database & Caching (Week 4-5)

*(Same as v1.0, plus quota tracking)*

### Phase 5: Polish & Optimization (Week 5-6)

*(Same as v1.0)*

### Phase 6: Launch & Monitoring (Week 6-7)

**Additional deliverables:**
- [ ] Z.ai quota dashboard
- [ ] Fallback rate monitoring
- [ ] Cost comparison analytics (Z.ai vs Tavily usage)

---

## 11. Success Metrics

*(Mostly unchanged - see v1.0)*

### 11.4 Cost Metrics (Updated)

| Metric | Target | Measurement |
|--------|--------|-------------|
| Z.ai Usage Rate | > 90% | Z.ai requests / total requests |
| Fallback Rate | < 10% | Tavily requests / total requests |
| Cost per Research | < $0.07 | Total API costs / research count |
| Monthly Z.ai Savings | > $30 | (Tavily equivalent cost - actual cost) |

---

## 12. Risk Mitigation (Updated)

### 12.1 Technical Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Z.ai MCP outage | High | Low | Automatic fallback to Tavily |
| Z.ai quota exceeded | Medium | Medium | Proactive monitoring + Tavily fallback |
| Tavily API outage | Medium | Low | Cache + error message |
| GLM rate limiting | Medium | Medium | Queue + exponential backoff |
| Vision quota exhausted | Low | Medium | Skip vision, continue with text research |

### 12.2 Cost Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Unexpected Tavily costs | Medium | Low | Z.ai first policy + budget alerts |
| Z.ai quota runs out early | Medium | Medium | Usage forecasting + throttling |
| Cache misses | Low | Low | Fuzzy query matching + longer TTL |

---

## Appendix A: Z.ai MCP Configuration

### Claude Code MCP Setup (for local development)

Add to `.mcp.json`:

```json
{
  "mcpServers": {
    "web-search-prime": {
      "type": "http",
      "url": "https://api.z.ai/api/mcp/web_search_prime/mcp",
      "headers": {
        "Authorization": "Bearer ${GLM_API_KEY}"
      }
    },
    "web-reader": {
      "type": "http",
      "url": "https://api.z.ai/api/mcp/web_reader/mcp",
      "headers": {
        "Authorization": "Bearer ${GLM_API_KEY}"
      }
    },
    "vision": {
      "type": "http",
      "url": "https://api.z.ai/api/mcp/vision/mcp",
      "headers": {
        "Authorization": "Bearer ${GLM_API_KEY}"
      }
    }
  }
}
```

### Environment Variables

```bash
# Supabase secrets (Edge Functions)
GLM_API_KEY=your-zai-api-key        # Used for both GLM and MCP
TAVILY_API_KEY=tvly-your-key        # Fallback only

# No separate Z.ai MCP key needed - uses GLM_API_KEY
```

---

## Appendix B: API Cost Comparison (Updated)

| Provider | Search Cost | Extract Cost | Vision | Notes |
|----------|-------------|--------------|--------|-------|
| **Z.ai MCP** | **$0** | **$0** | **$0** | Included in Coding Max (4,000/mo) |
| Tavily | $0.001/search | $0.001/5 URLs | ❌ | Pay per use |
| SerpAPI | $0.002/search | N/A | ❌ | No extraction |
| Bing Search | $0.003/search | N/A | ❌ | Requires Azure |

**Decision**: Z.ai MCP as primary (free), Tavily as fallback (pay per use)

---

## Appendix C: Future Enhancements

1. **Academic Search**: Add Google Scholar / Semantic Scholar integration
2. **News Search**: Add news-specific search for current events
3. **Image Research**: Leverage Z.ai Vision for image-based research
4. **PDF Analysis**: Full PDF document analysis with Z.ai Vision
5. **Follow-up Questions**: Enable iterative research refinement
6. **Collaborative Research**: Share and collaborate on research reports
7. **Research Templates**: Pre-defined templates for common research types
8. **Multi-language**: Research in and translate from multiple languages
9. **Z.ai Quota Dashboard**: Real-time quota monitoring in admin panel

---

*This plan is a living document. Update as implementation progresses.*

**Changelog:**
- v2.0 (2025-12-01): Switched to Z.ai MCP as primary search/extraction backend
- v1.0 (2025-12-01): Initial plan with Tavily
