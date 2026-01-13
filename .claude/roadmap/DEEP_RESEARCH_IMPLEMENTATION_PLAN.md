> **STATUS**: 📋 Planned
> **Last Updated**: 2026-01-12
> **Priority**: High
> **Implementation**: Demo pages exist (DeepResearchDemo*.tsx) but no backend Edge Function
> **Version**: 3.0 | **Created**: 2025-12-01 | **Updated**: 2026-01-12 | **Status**: Planning
>
> **Goal**: Implement a high-quality deep research experience similar to Gemini Deep Research, Claude's Extended Thinking, and ChatGPT's Deep Research mode.
>
> **Key Change in v3.0**: Updated to use **Gemini 3 Flash via OpenRouter** for reasoning/synthesis and **Tavily** for web search/extraction, matching the current production stack.

## Executive Summary

This plan outlines the implementation of a **Deep Research** feature that provides comprehensive, multi-source research capabilities. The feature will be triggered via a clickable option (similar to artifacts), perform multi-step web research using **Tavily** for search/extraction and **Gemini 3 Flash's thinking mode** for reasoning and synthesis, presenting results in an interactive, progressive disclosure UI.

### Key Architecture Decision: Technology Stack

| Component | Technology | Notes |
|-----------|------------|-------|
| **Web Search** | Tavily Search API | Real-time web search |
| **Content Extraction** | Tavily Extract API | Full page content |
| **Reasoning/Synthesis** | Gemini 3 Flash (OpenRouter) | Thinking mode for deep analysis |
| **Vision/OCR** | Gemini 3 Flash (OpenRouter) | Multimodal capabilities |
| **API Keys** | `OPENROUTER_GEMINI_FLASH_KEY`, `TAVILY_API_KEY` | Separate keys per service |

**Cost Model**: Pay-per-use via OpenRouter and Tavily APIs

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
- **Analyzes images/PDFs** using Gemini 3 Flash multimodal capabilities

### 1.2 User Flow

```
User Types Question → Clicks "Research" Button → Research Begins
    ↓
Phase 1: Query Analysis (2-3s)
- Gemini 3 Flash analyzes query complexity
- Generates search strategy (5-10 sub-queries)
- Estimates research scope
    ↓
Phase 2: Web Research (10-30s)
- Tavily Search executes searches in parallel
- Deduplicates and ranks findings
- [Optional] Gemini 3 Flash analyzes images/PDFs
    ↓
Phase 3: Content Extraction (5-15s)
- Tavily Extract extracts full content from top sources
- Structured data parsing + markdown formatting
    ↓
Phase 4: Synthesis (5-10s)
- Gemini 3 Flash synthesizes findings with thinking mode
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
| Multi-source search | ✅ Google Search | ❌ No web search | ✅ Bing Search | ✅ Tavily Search |
| Content extraction | ❌ Limited | ❌ None | ✅ Bing | ✅ Tavily Extract |
| Vision/OCR | ✅ Gemini Vision | ✅ Claude Vision | ✅ GPT-4V | ✅ **Gemini 3 Flash** |
| Live progress | ✅ Step cards | ✅ Thinking dots | ✅ Progress bar | ✅ Reasoning display |
| Source citations | ✅ Inline | ✅ Footnotes | ✅ Numbered | ✅ Interactive cards |
| Report format | Long-form | Conversational | Structured | **Interactive artifact** |
| Time to result | 1-3 min | 30s-2min | 1-5 min | **30s-1.5min** |
| Follow-up research | ✅ | ❌ | ✅ | ✅ |

### 1.4 Differentiators

1. **Speed**: Parallel search execution + aggressive caching = faster results
2. **Interactivity**: Research report is an interactive artifact (expandable sections, source previews)
3. **Transparency**: Full reasoning chain visible via Gemini 3 Flash thinking mode
4. **Vision Integration**: Analyze PDFs, images, and documents with Gemini 3 Flash multimodal
5. **Unified Reasoning**: Same model for query analysis, synthesis, and vision tasks

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
│  │  │ (Gemini)    │  │ (Tavily)    │  │ (Gemini + thinking) │    │    │
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘    │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                                                                         │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────────────┐   │
│  │ _shared/       │  │ _shared/       │  │ _shared/               │   │
│  │ tavily-        │  │ openrouter-    │  │ gemini-client.ts       │   │
│  │ client.ts      │  │ client.ts      │  │                        │   │
│  │ (SEARCH)       │  │ (LLM)          │  │                        │   │
│  └────────────────┘  └────────────────┘  └────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         EXTERNAL SERVICES                                │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐    │
│  │ Tavily          │  │ Tavily          │  │ OpenRouter          │    │
│  │ Search API      │  │ Extract API     │  │ (Gemini 3 Flash)    │    │
│  │                 │  │                 │  │                     │    │
│  │ - titles        │  │ - full content  │  │ - thinking mode     │    │
│  │ - URLs          │  │ - markdown      │  │ - multimodal        │    │
│  │ - summaries     │  │ - structured    │  │ - 1M context        │    │
│  │ - scores        │  │                 │  │                     │    │
│  └─────────────────┘  └─────────────────┘  └─────────────────────┘    │
│                                                                         │
│  Keys: TAVILY_API_KEY, OPENROUTER_GEMINI_FLASH_KEY                      │
└─────────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           DATABASE                                       │
├─────────────────────────────────────────────────────────────────────────┤
│  chat_messages (research_data JSONB)                                    │
│  research_cache (query deduplication)                                   │
│  ai_usage_logs (cost tracking)                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow

```
1. User clicks "Research" button + enters query
2. Frontend sends POST to /generate-research with researchMode=true
3. Edge function establishes SSE stream
4. Phase 1: Query Analysis
   - Gemini 3 Flash analyzes query → generates search strategy
   - Stream: { event: "analysis", data: { queries: [...], scope: "..." } }
5. Phase 2: Web Research (Tavily Search)
   - Execute searches in parallel batches (3-5 concurrent)
   - Stream: { event: "search", data: { completed: 2, total: 8, results: [...] } }
6. Phase 3: Content Extraction (Tavily Extract)
   - Extract full content from top URLs
   - Stream: { event: "extract", data: { source: {...}, content: "..." } }
7. Phase 4: Vision Analysis (Optional - Gemini 3 Flash)
   - If user provided images/PDFs, analyze with multimodal
   - Stream: { event: "vision", data: { analysis: "..." } }
8. Phase 5: Synthesis
   - Gemini 3 Flash synthesizes with thinking mode
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
  | { event: 'search_start'; data: { queryIndex: number; query: string } }
  | { event: 'search_complete'; data: { queryIndex: number; results: SearchResult[] } }
  | { event: 'extract_start'; data: { url: string } }
  | { event: 'extract_complete'; data: { url: string; content: string } }
  | { event: 'vision_start'; data: { type: 'image' | 'pdf'; filename: string } }
  | { event: 'vision_complete'; data: { analysis: string } }
  | { event: 'synthesis_start'; data: { totalSources: number } }
  | { event: 'reasoning_chunk'; data: { text: string } }
  | { event: 'content_chunk'; data: { section: string; text: string } }
  | { event: 'complete'; data: ResearchReport }
  | { event: 'error'; data: { message: string; recoverable: boolean } };

interface ResearchAnalysis {
  originalQuery: string;
  searchQueries: string[];
  researchScope: 'focused' | 'broad' | 'comprehensive';
  estimatedTime: number; // seconds
  topics: string[];
  hasImages: boolean; // If true, will use Gemini multimodal
}

interface ResearchReport {
  title: string;
  summary: string;
  sections: ReportSection[];
  sources: Source[];
  keyFindings: string[];
  reasoning: string;
  visionAnalysis?: string; // From Gemini multimodal if applicable
  generatedAt: string;
}
```

---

## 3. Backend Implementation

### 3.1 New Edge Function: `generate-research/`

**File Structure:**
```
supabase/functions/generate-research/
├── index.ts                  # Main handler + SSE streaming
├── query-analyzer.ts         # Query analysis with Gemini 3 Flash
├── search-orchestrator.ts    # Parallel search with Tavily
├── content-extractor.ts      # URL content extraction with Tavily Extract
├── vision-analyzer.ts        # Image/PDF analysis with Gemini 3 Flash multimodal
├── synthesizer.ts            # Report synthesis with Gemini 3 Flash thinking mode
└── types.ts                  # Research-specific types
```

### 3.2 Shared Clients

The research feature uses existing shared clients:

**Tavily Client** (`_shared/tavily-client.ts`):
- Already implemented for web search tool
- Provides `searchTavily()` and `extractUrls()` functions
- Handles retry logic and error handling

**Gemini Client** (`_shared/gemini-client.ts`):
- Uses OpenRouter API with `OPENROUTER_GEMINI_FLASH_KEY`
- Supports thinking mode via `thinking` parameter
- Supports multimodal inputs for vision analysis

**Key Types:**

```typescript
// Tavily search result
export interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

// Tavily extract result
export interface TavilyExtractResult {
  url: string;
  raw_content: string;
}

// Gemini thinking mode response
export interface GeminiThinkingResponse {
  thinking: string;
  content: string;
}
```

### 3.3 Search Orchestrator

**`search-orchestrator.ts`:**

```typescript
import { searchTavilyWithRetry } from "../_shared/tavily-client.ts";
import { SearchResult, SearchProgress, ResearchConfig } from "./types.ts";

export interface SearchOrchestratorResult {
  results: SearchResult[];
}

export async function orchestrateSearch(
  queries: string[],
  config: ResearchConfig,
  onProgress: (progress: SearchProgress) => void,
  requestId: string
): Promise<SearchOrchestratorResult> {
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
        });

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
    });
  }

  // Sort by relevance score
  const sortedResults = allResults.sort((a, b) => (b.score || 0) - (a.score || 0));

  return { results: sortedResults };
}
```

### 3.4 Content Extractor

**`content-extractor.ts`:**

```typescript
import { extractUrlsWithRetry } from "../_shared/tavily-client.ts";
import { ExtractedContent, ExtractProgress, SearchResult } from "./types.ts";

export interface ContentExtractorResult {
  content: ExtractedContent[];
}

export async function extractContent(
  sources: SearchResult[],
  onProgress: (progress: ExtractProgress) => void,
  requestId: string
): Promise<ContentExtractorResult> {
  const urls = sources.map(s => s.url);

  onProgress({
    phase: "extracting",
    completed: 0,
    total: urls.length,
  });

  const allContent: ExtractedContent[] = [];

  // Tavily batch extraction
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
    });
  }

  return { content: allContent };
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

### 3.5 Vision Analyzer

**`vision-analyzer.ts`:**

Uses Gemini 3 Flash multimodal capabilities via OpenRouter.

```typescript
import { callGeminiWithVision } from "../_shared/gemini-client.ts";

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
  const results: VisionAnalysisResult[] = [];

  for (const input of inputs) {
    try {
      const prompt = `Analyze this ${input.type} in the context of research about: ${researchContext}

Please provide:
1. A detailed description of the content
2. Key information relevant to the research topic
3. Any data, statistics, or facts that should be included in the report
${input.type === "pdf" ? "4. Extract and summarize any important text" : ""}`;

      const response = await callGeminiWithVision({
        prompt,
        imageData: input.data,
        imageType: input.data.startsWith("http") ? "url" : "base64",
        requestId,
      });

      results.push({
        analysis: response.content,
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

### 3.6 Main Handler

**`index.ts` excerpt:**

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
          // Phase 1: Query Analysis (Gemini 3 Flash)
          sendEvent({ event: "analysis_start", data: { query } });
          const analysis = await analyzeQuery(query, requestId);
          sendEvent({ event: "analysis_complete", data: analysis });

          // Phase 2: Web Research (Tavily)
          const searchResult = await orchestrateSearch(
            analysis.searchQueries,
            config,
            (progress) => sendEvent({ event: "search_progress", data: progress }),
            requestId
          );

          // Phase 3: Content Extraction (Tavily)
          const topSources = selectTopSources(searchResult.results, config.maxContentExtractions);
          const extractResult = await extractContent(
            topSources,
            (progress) => sendEvent({ event: "extract_progress", data: progress }),
            requestId
          );

          // Phase 4: Vision Analysis (if applicable - Gemini 3 Flash multimodal)
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

          // Phase 5: Synthesis (Gemini 3 Flash thinking mode)
          sendEvent({ event: "synthesis_start", data: { totalSources: extractResult.content.length } });
          const report = await synthesizeReport(
            query,
            analysis,
            extractResult.content,
            visionAnalysis,
            (chunk) => sendEvent({ event: "reasoning_chunk", data: { text: chunk } }),
            (section, text) => sendEvent({ event: "content_chunk", data: { section, text } })
          );

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

Add progress indicator to `ResearchProgress.tsx`:

```tsx
// In ResearchProgress.tsx, add to progress display:
<Badge variant="outline" className="ml-2 text-xs">
  {progress.phase === "searching" ? "Tavily Search" :
   progress.phase === "extracting" ? "Tavily Extract" :
   progress.phase === "synthesizing" ? "Gemini 3 Flash" : "Processing"}
</Badge>
```

---

## 5. Database Schema

### 5.1 Schema Updates

```sql
-- Add research_data column to chat_messages
ALTER TABLE public.chat_messages
ADD COLUMN IF NOT EXISTS research_data JSONB;

-- Add constraint to validate research_data structure
ALTER TABLE public.chat_messages
ADD CONSTRAINT valid_research_data CHECK (
  research_data IS NULL OR (
    research_data ? 'version' AND
    research_data ? 'title' AND
    research_data ? 'sections'
  )
);

-- Index for querying research messages
CREATE INDEX IF NOT EXISTS idx_chat_messages_research
ON public.chat_messages((research_data IS NOT NULL))
WHERE research_data IS NOT NULL;

-- Research cache table for query deduplication
CREATE TABLE IF NOT EXISTS public.research_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_hash TEXT NOT NULL UNIQUE,
  query_text TEXT NOT NULL,
  result JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '24 hours')
);

-- Index for cache lookups
CREATE INDEX IF NOT EXISTS idx_research_cache_hash
ON public.research_cache(query_hash);

-- Cleanup expired cache entries
CREATE OR REPLACE FUNCTION cleanup_research_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM public.research_cache WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;
```

### 5.2 Research Data Schema

```typescript
interface StoredResearchData {
  version: "3.0";  // Updated for Gemini 3 Flash
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
  reasoning?: string;  // From Gemini 3 Flash thinking mode
  visionAnalysis?: string[];  // From Gemini 3 Flash multimodal
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
  generatedAt: string;
}
```

---

## 6. API Contracts

*(Mostly unchanged - see v1.0)*

### 6.1 Request Format

```typescript
POST /functions/v1/generate-research
Content-Type: application/json
Authorization: Bearer <jwt_token> (optional)

{
  "query": string,           // Required: Research query (max 2000 chars)
  "sessionId": string,       // Optional: Chat session ID
  "visionInputs": [          // Optional: Images/PDFs for multimodal analysis
    {
      "type": "image" | "pdf",
      "data": string,        // Base64 or URL
      "filename": string
    }
  ],
  "config": {
    "maxSearchQueries": number,       // Default: 8
    "maxSourcesPerQuery": number,     // Default: 5
    "maxContentExtractions": number,  // Default: 10
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

### 8.2 Cost Breakdown per Research Query

| Service | Operations | Est. Cost |
|---------|------------|-----------|
| Tavily Search | 8 queries | ~$0.008 |
| Tavily Extract | 10 URLs | ~$0.002 |
| Gemini 3 Flash Analysis | 1 call | ~$0.01 |
| Gemini 3 Flash Synthesis | 1 call (thinking mode) | ~$0.05 |
| Gemini 3 Flash Vision | 0-2 images (optional) | ~$0.02 |
| **Total** | | **~$0.07-0.09** |

### 8.3 Cost Optimization Strategies

1. **Query Caching**: Cache research results for 24 hours
2. **Progressive Depth**: Start with basic search, only expand if needed
3. **Source Deduplication**: Skip URLs already seen in session
4. **Content Truncation**: Limit extracted content to 3000 chars
5. **Batch Vision**: Combine multiple images into single analysis when possible
6. **Smart Query Generation**: Generate focused sub-queries to minimize search calls

---

## 9. Testing Strategy

### 9.1 Unit Tests

```typescript
// test/research/tavily-client.test.ts
describe("Tavily Client", () => {
  describe("searchTavily", () => {
    it("returns search results with titles and content", async () => {
      const results = await searchTavily("React hooks");
      expect(results.results.length).toBeGreaterThan(0);
      expect(results.results[0]).toHaveProperty("title");
      expect(results.results[0]).toHaveProperty("url");
      expect(results.results[0]).toHaveProperty("content");
    });

    it("handles rate limiting with retry", async () => {
      mockTavilyRateLimit();
      const results = await searchTavilyWithRetry("test");
      expect(results.results).toBeDefined();
    });
  });

  describe("extractUrls", () => {
    it("extracts content from URLs", async () => {
      const result = await extractUrls(["https://react.dev"]);
      expect(result.results[0].raw_content).toBeDefined();
      expect(result.results[0].raw_content.length).toBeGreaterThan(100);
    });
  });
});

// test/research/search-orchestrator.test.ts
describe("Search Orchestrator", () => {
  it("executes searches in parallel batches", async () => {
    const result = await orchestrateSearch(
      ["React hooks", "React state", "React context"],
      { ...defaultConfig, parallelSearches: 2 },
      () => {},
      "test-request"
    );

    expect(result.results.length).toBeGreaterThan(0);
  });

  it("deduplicates results by URL", async () => {
    const result = await orchestrateSearch(
      ["React hooks tutorial", "React hooks guide"],
      defaultConfig,
      () => {},
      "test-request"
    );

    const urls = result.results.map(r => r.url);
    const uniqueUrls = [...new Set(urls)];
    expect(urls.length).toBe(uniqueUrls.length);
  });

  it("reports progress during search", async () => {
    const progressUpdates: SearchProgress[] = [];
    await orchestrateSearch(
      ["q1", "q2", "q3"],
      defaultConfig,
      (p) => progressUpdates.push(p),
      "test-request"
    );

    expect(progressUpdates.length).toBeGreaterThan(0);
    expect(progressUpdates.some(p => p.phase === "searching")).toBe(true);
  });
});
```

---

## 10. Implementation Phases

### Phase 1: Backend Foundation (Week 1-2)

**Deliverables:**
- [ ] Create `generate-research/` Edge Function structure
- [ ] Implement query analyzer with Gemini 3 Flash
- [ ] Implement search orchestrator with Tavily
- [ ] Implement content extractor with Tavily Extract
- [ ] Implement report synthesizer with Gemini 3 Flash thinking mode
- [ ] Add SSE streaming for all events
- [ ] Add rate limiting

**Success Criteria:**
- Full research flow works end-to-end
- All phases complete in < 90 seconds
- SSE events stream correctly

### Phase 2: Vision & Multimodal (Week 2-3)

**Deliverables:**
- [ ] Implement vision analyzer with Gemini 3 Flash multimodal
- [ ] Support image uploads in research requests
- [ ] Support PDF analysis
- [ ] Integrate vision results into synthesis

**Success Criteria:**
- Images analyzed and included in reports
- PDFs parsed and text extracted
- Vision context improves report quality

### Phase 3: Frontend Components (Week 3-4)

**Deliverables:**
- [ ] Research button and trigger UI
- [ ] ResearchProgress component with phase tracking
- [ ] ResearchArtifact interactive report viewer
- [ ] Source citation cards
- [ ] Export/share functionality

**Success Criteria:**
- Smooth UX from trigger to completion
- Progressive disclosure works well
- Sources are easy to explore

### Phase 4: Database & Caching (Week 4-5)

**Deliverables:**
- [ ] Database schema migration
- [ ] Research result caching
- [ ] Query deduplication
- [ ] Usage logging integration

**Success Criteria:**
- Results persist correctly
- Cache hit rate > 20%
- Usage tracked for cost analysis

### Phase 5: Polish & Launch (Week 5-6)

**Deliverables:**
- [ ] Error handling and recovery
- [ ] Loading states and animations
- [ ] Performance optimization
- [ ] Documentation
- [ ] Monitoring and alerting

---

## 11. Success Metrics

### 11.1 User Experience Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Time to First Result | < 15s | Time from click to first search result |
| Total Research Time | < 90s | Time from start to complete report |
| User Satisfaction | > 4.2/5 | Post-research feedback |

### 11.2 Quality Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Source Relevance | > 80% | User ratings of source quality |
| Report Accuracy | > 90% | Fact-check sampling |
| Citation Rate | 100% | All claims have sources |

### 11.3 Cost Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Cost per Research | < $0.10 | Total API costs / research count |
| Cache Hit Rate | > 20% | Cached results / total requests |

---

## 12. Risk Mitigation

### 12.1 Technical Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Tavily API outage | High | Low | Cache results + graceful error message |
| OpenRouter rate limiting | Medium | Medium | Queue + exponential backoff |
| Long research times | Medium | Medium | Timeout limits + progressive results |
| Large context overflow | Low | Low | Content truncation + chunking |

### 12.2 Cost Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| High API costs | Medium | Medium | Rate limiting + caching |
| Cache misses | Low | Low | Fuzzy query matching + longer TTL |
| Abuse/spam | Medium | Low | User rate limits + authentication |

---

## Appendix A: Environment Configuration

### Required Environment Variables

```bash
# Supabase secrets (Edge Functions)
OPENROUTER_GEMINI_FLASH_KEY=sk-or-...  # For Gemini 3 Flash (analysis, synthesis, vision)
TAVILY_API_KEY=tvly-...                 # For web search and content extraction
```

### Supabase Secret Setup

```bash
# Set secrets for Edge Functions
supabase secrets set OPENROUTER_GEMINI_FLASH_KEY=sk-or-your-key
supabase secrets set TAVILY_API_KEY=tvly-your-key
```

---

## Appendix B: API Cost Reference

### Tavily Pricing
| Operation | Cost |
|-----------|------|
| Search | ~$0.001/query |
| Extract | ~$0.001/5 URLs |

### OpenRouter Gemini 3 Flash Pricing
| Operation | Input | Output |
|-----------|-------|--------|
| Standard | $0.15/M tokens | $0.60/M tokens |
| Thinking mode | $0.15/M tokens | $0.60/M tokens |

**Note**: Costs are estimates based on typical usage patterns.

---

## Appendix C: Future Enhancements

1. **Academic Search**: Add Google Scholar / Semantic Scholar integration
2. **News Search**: Add news-specific search for current events
3. **Image Research**: Leverage Gemini 3 Flash multimodal for image-based research
4. **PDF Analysis**: Full PDF document analysis with Gemini 3 Flash
5. **Follow-up Questions**: Enable iterative research refinement
6. **Collaborative Research**: Share and collaborate on research reports
7. **Research Templates**: Pre-defined templates for common research types
8. **Multi-language**: Research in and translate from multiple languages
9. **Research History**: Track and revisit past research sessions

---

*This plan is a living document. Update as implementation progresses.*

**Changelog:**
- v3.0 (2026-01-12): Updated to use Gemini 3 Flash via OpenRouter + Tavily (matching production stack)
- v2.0 (2025-12-01): Switched to Z.ai MCP as primary search/extraction backend
- v1.0 (2025-12-01): Initial plan with Tavily
