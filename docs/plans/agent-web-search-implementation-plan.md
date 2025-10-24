# Agent Web Search Integration - Implementation Plan

**Branch:** `feature/agent-web-search-integration`
**Created:** 2025-10-24
**Status:** Planning Phase
**Estimated Effort:** 25 hours (3-4 days)

---

## Executive Summary

This plan outlines the integration of the **Agent Web Search** component from agents-ui-kit with a new specialized Google ADK search agent flow. The implementation will create a dedicated, production-quality web search experience with AI-enhanced results, credibility scoring, and real-time streaming.

### Key Objectives

1. ✅ Install Agent Web Search UI component (shadcn-compatible)
2. ✅ Create specialized `web_search_agent` in Google ADK
3. ✅ Implement structured search results with AI summaries and scoring
4. ✅ Build SSE streaming endpoint for real-time search
5. ✅ Create dedicated search interface in frontend
6. ✅ Integrate with existing ADK dispatcher pattern

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER INTERFACE LAYER                         │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  /search - Dedicated Search Page                          │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │  Agent Web Search Component                         │  │  │
│  │  │  • Search input with advanced filters               │  │  │
│  │  │  • Result cards with AI summaries                   │  │  │
│  │  │  • Credibility badges (visual trust indicators)     │  │  │
│  │  │  • Relevance scoring progress bars                  │  │  │
│  │  │  • Related searches for discovery                   │  │  │
│  │  │  • Real-time streaming updates                      │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
└───────────────────────────┬─────────────────────────────────────┘
                            │ SSE Connection
                            │ POST /api/search/stream
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                    API LAYER (FastAPI)                          │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  /api/search/stream (NEW)                                 │  │
│  │  • Receives search query + filters                        │  │
│  │  • Validates and sanitizes input                          │  │
│  │  • Creates ADK invocation context                         │  │
│  │  • Streams events: search_started, result, complete       │  │
│  │  • Error handling with fallback                           │  │
│  └───────────────────────────────────────────────────────────┘  │
└───────────────────────────┬─────────────────────────────────────┘
                            │ Agent Invocation
                            │ run_async(context)
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                    AGENT LAYER (Google ADK)                     │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  dispatcher_agent (EXISTING)                              │  │
│  │  └─> Routes to web_search_agent (NEW)                     │  │
│  └───────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  web_search_agent (NEW SPECIALIZED AGENT)                 │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │ 1. Query Analysis                                    │  │  │
│  │  │    • Parse user intent                               │  │  │
│  │  │    • Extract keywords and context                    │  │  │
│  │  │    • Generate 4-5 targeted search queries            │  │  │
│  │  │                                                       │  │  │
│  │  │ 2. Parallel Search Execution                         │  │  │
│  │  │    • brave_search(query1) ──┐                        │  │  │
│  │  │    • brave_search(query2) ──┤ Parallel              │  │  │
│  │  │    • brave_search(query3) ──┤ Execution             │  │  │
│  │  │    • brave_search(query4) ──┤ (3-5x faster)         │  │  │
│  │  │    • brave_search(query5) ──┘                        │  │  │
│  │  │                                                       │  │  │
│  │  │ 3. Result Enhancement (Per Result)                   │  │  │
│  │  │    • Generate AI summary (2-3 sentences)             │  │  │
│  │  │    • Calculate credibility score (0.0-1.0)           │  │  │
│  │  │      - Domain authority check                        │  │  │
│  │  │      - Freshness scoring                             │  │  │
│  │  │      - HTTPS vs HTTP                                 │  │  │
│  │  │      - Content quality indicators                    │  │  │
│  │  │    • Calculate relevance score (0.0-1.0)             │  │  │
│  │  │      - Title match with query                        │  │  │
│  │  │      - Snippet match with query                      │  │  │
│  │  │      - Semantic similarity                           │  │  │
│  │  │                                                       │  │  │
│  │  │ 4. Related Search Generation                         │  │  │
│  │  │    • Analyze query context                           │  │  │
│  │  │    • Generate 4-5 related queries                    │  │  │
│  │  │    • Consider trending topics                        │  │  │
│  │  │                                                       │  │  │
│  │  │ 5. Structured Output                                 │  │  │
│  │  │    • Return SearchResponse (Pydantic model)          │  │  │
│  │  │    • Validate schema compliance                      │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
└───────────────────────────┬─────────────────────────────────────┘
                            │ brave_search tool
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                    TOOL LAYER                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  brave_search (EXISTING)                                   │  │
│  │  • Brave Search API integration                            │  │
│  │  • Connection pooling (async)                              │  │
│  │  • Error handling and retries                              │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Backend - ADK Agent Implementation

### 1.1 Data Models & Schemas

**File:** `app/models/search_models.py` (NEW)

```python
"""Pydantic models for structured search responses."""

from datetime import datetime
from pydantic import BaseModel, Field, HttpUrl


class SearchResult(BaseModel):
    """Individual search result with AI enhancements."""

    title: str = Field(..., description="Result title")
    url: HttpUrl = Field(..., description="Result URL")
    snippet: str = Field(..., description="Brief excerpt from the page")
    domain: str = Field(..., description="Source domain (e.g., 'example.com')")
    published_date: str | None = Field(None, description="Publication date (ISO 8601)")

    # AI-Generated Fields
    ai_summary: str = Field(..., description="AI-generated 2-3 sentence summary")

    # Scoring Fields
    credibility_score: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Source credibility (0.0-1.0)"
    )
    relevance_score: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Query relevance (0.0-1.0)"
    )

    # Metadata
    favicon_url: str | None = Field(None, description="Site favicon URL")
    is_https: bool = Field(True, description="Uses HTTPS")


class RelatedSearch(BaseModel):
    """Related search suggestion."""

    query: str = Field(..., description="Suggested query text")
    reason: str | None = Field(None, description="Why this is suggested")


class SearchResponse(BaseModel):
    """Complete structured search response."""

    query: str = Field(..., description="Original search query")
    results: list[SearchResult] = Field(..., description="Search results")
    related_searches: list[RelatedSearch] = Field(..., description="Related queries")
    total_results: int = Field(..., description="Total number of results")
    search_time_ms: int = Field(..., description="Search execution time in ms")
    timestamp: datetime = Field(default_factory=datetime.now)
```

### 1.2 Credibility Scoring Engine

**File:** `app/tools/credibility_scorer.py` (NEW)

```python
"""Credibility scoring for web search results."""

import re
from urllib.parse import urlparse


class CredibilityScorer:
    """Calculate credibility scores for search results."""

    # Known high-authority domains
    TRUSTED_DOMAINS = {
        'edu': 0.95,  # Educational institutions
        'gov': 0.95,  # Government sites
        'org': 0.85,  # Organizations (varies)
    }

    # High-authority specific domains
    AUTHORITY_DOMAINS = {
        'wikipedia.org': 0.90,
        'github.com': 0.88,
        'stackoverflow.com': 0.87,
        'medium.com': 0.75,
        'dev.to': 0.75,
        'arxiv.org': 0.92,
        'ieee.org': 0.93,
        'nature.com': 0.94,
        'science.org': 0.94,
    }

    def calculate_credibility(
        self,
        url: str,
        domain: str,
        is_https: bool,
        published_date: str | None,
        content_length: int
    ) -> float:
        """
        Calculate credibility score (0.0-1.0) based on multiple factors.

        Factors:
        - Domain authority (40%)
        - HTTPS (15%)
        - Freshness (25%)
        - Content quality (20%)
        """
        score = 0.0

        # Domain Authority (40%)
        domain_score = self._score_domain_authority(domain)
        score += domain_score * 0.4

        # HTTPS (15%)
        https_score = 1.0 if is_https else 0.5
        score += https_score * 0.15

        # Freshness (25%)
        freshness_score = self._score_freshness(published_date)
        score += freshness_score * 0.25

        # Content Quality (20%)
        quality_score = self._score_content_quality(content_length)
        score += quality_score * 0.2

        return round(score, 2)

    def _score_domain_authority(self, domain: str) -> float:
        """Score domain authority."""
        # Check specific domain
        if domain in self.AUTHORITY_DOMAINS:
            return self.AUTHORITY_DOMAINS[domain]

        # Check TLD
        tld = domain.split('.')[-1] if '.' in domain else ''
        if tld in self.TRUSTED_DOMAINS:
            return self.TRUSTED_DOMAINS[tld]

        # Default for unknown domains
        return 0.60

    def _score_freshness(self, published_date: str | None) -> float:
        """Score based on publication date."""
        if not published_date:
            return 0.5  # Unknown date = medium score

        try:
            from datetime import datetime
            pub_date = datetime.fromisoformat(published_date.replace('Z', '+00:00'))
            now = datetime.now(pub_date.tzinfo)
            days_old = (now - pub_date).days

            # Scoring curve
            if days_old <= 30:      return 1.0   # Last month
            if days_old <= 90:      return 0.9   # Last quarter
            if days_old <= 180:     return 0.8   # Last 6 months
            if days_old <= 365:     return 0.7   # Last year
            if days_old <= 730:     return 0.6   # Last 2 years
            return 0.5                            # Older
        except Exception:
            return 0.5

    def _score_content_quality(self, content_length: int) -> float:
        """Score based on content length (proxy for depth)."""
        # Assumption: longer content = more comprehensive
        if content_length >= 500:   return 1.0
        if content_length >= 300:   return 0.8
        if content_length >= 150:   return 0.6
        return 0.4


class RelevanceScorer:
    """Calculate relevance scores for search results."""

    def calculate_relevance(
        self,
        query: str,
        title: str,
        snippet: str
    ) -> float:
        """
        Calculate relevance score (0.0-1.0) based on query match.

        Factors:
        - Title match (50%)
        - Snippet match (30%)
        - Keyword density (20%)
        """
        score = 0.0
        query_lower = query.lower()
        query_words = set(query_lower.split())

        # Title Match (50%)
        title_score = self._calculate_match_score(query_lower, title.lower(), query_words)
        score += title_score * 0.5

        # Snippet Match (30%)
        snippet_score = self._calculate_match_score(query_lower, snippet.lower(), query_words)
        score += snippet_score * 0.3

        # Keyword Density (20%)
        combined_text = f"{title} {snippet}".lower()
        density_score = self._calculate_keyword_density(query_words, combined_text)
        score += density_score * 0.2

        return round(score, 2)

    def _calculate_match_score(self, query: str, text: str, query_words: set) -> float:
        """Calculate how well text matches query."""
        # Exact match = highest score
        if query in text:
            return 1.0

        # Partial word match
        text_words = set(text.split())
        matching_words = query_words.intersection(text_words)
        if not query_words:
            return 0.0

        match_ratio = len(matching_words) / len(query_words)
        return match_ratio

    def _calculate_keyword_density(self, query_words: set, text: str) -> float:
        """Calculate keyword density in text."""
        if not text:
            return 0.0

        text_words = text.split()
        if not text_words:
            return 0.0

        keyword_count = sum(1 for word in text_words if word in query_words)
        density = keyword_count / len(text_words)

        # Normalize to 0.0-1.0 (cap at 20% density = 1.0 score)
        return min(density / 0.2, 1.0)
```

### 1.3 Web Search Agent

**File:** `app/agents/web_search_agent.py` (NEW)

```python
"""Specialized web search agent with AI enhancements."""

import asyncio
import datetime
import logging
from typing import Any

from google.adk.agents import LlmAgent
from google.adk.planners import BuiltInPlanner
from google.genai import types as genai_types

from app.config import config
from app.models.search_models import SearchResponse, SearchResult, RelatedSearch
from app.tools import brave_search
from app.tools.credibility_scorer import CredibilityScorer, RelevanceScorer
from app.enhanced_callbacks import before_agent_callback, after_agent_callback

logger = logging.getLogger(__name__)


web_search_agent = LlmAgent(
    model=config.worker_model,
    name="web_search_agent",
    description="Specialized web search agent with AI summaries, credibility scoring, and smart filtering",
    planner=BuiltInPlanner(
        thinking_config=genai_types.ThinkingConfig(include_thoughts=True)
    ),
    instruction=f"""
    You are an intelligent web search specialist that provides enhanced search results.

    WORKFLOW:
    1. **Query Analysis**
       - Parse the user's search query
       - Identify key concepts and intent
       - Generate 4-5 diverse, targeted search queries to get comprehensive results
       - Consider different angles: direct match, related concepts, specific aspects

    2. **Parallel Search Execution**
       - Execute ALL search queries in PARALLEL using brave_search
       - CRITICAL: Call all brave_search functions in the SAME turn for 3-5x speed improvement
       - Example: brave_search(q1), brave_search(q2), brave_search(q3), brave_search(q4)

    3. **Result Processing** (For EACH result)
       - Generate a clear, informative AI summary (2-3 sentences)
       - Explain what the source is about and why it's relevant
       - Highlight key insights or unique value

    4. **Result Aggregation**
       - Combine results from all queries
       - Remove duplicates (same URL)
       - Rank by relevance to original query
       - Keep top 10-15 most relevant results

    5. **Related Searches**
       - Generate 4-5 related search queries
       - Consider: broader topics, narrower topics, alternative angles, trending related topics
       - Provide brief reason for each suggestion

    6. **Structured Output**
       - Return data matching SearchResponse schema
       - Include all required fields
       - Ensure valid URLs and scores

    Current date: {datetime.datetime.now().strftime("%Y-%m-%d")}

    CRITICAL: Your output MUST be valid JSON matching the SearchResponse Pydantic schema.
    """,
    tools=[brave_search],
    output_schema=SearchResponse,
    before_agent_callback=before_agent_callback,
    after_agent_callback=after_agent_callback,
)


async def enhance_search_results(
    raw_results: list[dict[str, Any]],
    query: str
) -> list[SearchResult]:
    """
    Enhance raw search results with credibility and relevance scores.

    This runs AFTER the LLM has generated AI summaries.
    """
    credibility_scorer = CredibilityScorer()
    relevance_scorer = RelevanceScorer()

    enhanced_results = []

    for result in raw_results:
        try:
            # Calculate scores
            credibility = credibility_scorer.calculate_credibility(
                url=result['url'],
                domain=result['domain'],
                is_https=result.get('is_https', True),
                published_date=result.get('published_date'),
                content_length=len(result.get('snippet', ''))
            )

            relevance = relevance_scorer.calculate_relevance(
                query=query,
                title=result['title'],
                snippet=result['snippet']
            )

            # Create enhanced result
            enhanced_result = SearchResult(
                title=result['title'],
                url=result['url'],
                snippet=result['snippet'],
                domain=result['domain'],
                published_date=result.get('published_date'),
                ai_summary=result.get('ai_summary', result['snippet']),  # Fallback to snippet
                credibility_score=credibility,
                relevance_score=relevance,
                favicon_url=result.get('favicon_url'),
                is_https=result.get('is_https', True)
            )

            enhanced_results.append(enhanced_result)

        except Exception as e:
            logger.error(f"Error enhancing result {result.get('url')}: {e}")
            continue

    return enhanced_results
```

### 1.4 Dispatcher Integration

**File:** `app/agent.py` (MODIFY EXISTING)

```python
# Add import
from app.agents.web_search_agent import web_search_agent

# Update dispatcher_agent instruction
dispatcher_agent = LlmAgent(
    name="dispatcher_agent",
    model=config.worker_model,
    description="Main entry point that routes user requests to appropriate specialist agents.",
    instruction="""You are a request router that delegates ALL tasks to specialist agents.

    YOUR ONLY JOB: Analyze the user's request and immediately call transfer_to_agent() to route it.

    ROUTING RULES (apply in this order):

    1. META-QUESTIONS (about you, your tools, capabilities) → transfer_to_agent(agent_name='generalist_agent')
       Match: "what tools", "what can you do", "who are you", "how do you work"

    2. GREETINGS & PLEASANTRIES → transfer_to_agent(agent_name='generalist_agent')
       Match: "Hello", "Hi", "Hey", "How are you?", "Thanks", "Goodbye"

    3. SIMPLE FACTUAL QUESTIONS → transfer_to_agent(agent_name='generalist_agent')
       Match: "What is X?", "Who is/wrote/invented X?", "Define X"

    4. WEB SEARCH REQUESTS → transfer_to_agent(agent_name='web_search_agent')  # NEW
       Keywords: "search", "find", "look up", "what are the best", "compare X and Y"
       Match: User wants to find information on the web, compare options, discover resources
       Examples: "search for AI tools", "find the best React libraries", "what are popular coding practices"

    5. CURRENT/TIME-SENSITIVE RESEARCH → transfer_to_agent(agent_name='interactive_planner_agent')
       Keywords: "latest", "current", "recent", "2025", "2024", "research", "investigate", "analyze"
       Match: Deep research requiring multi-step planning and comprehensive reports
       Examples: "research quantum computing trends", "analyze the market for X", "investigate Y"

    6. DEFAULT CASE → transfer_to_agent(agent_name='generalist_agent')
       If no keywords match, route to generalist

    CRITICAL: You MUST call transfer_to_agent() immediately. Do NOT answer questions yourself.
    """,
    sub_agents=[
        generalist_agent,           # Simple Q&A
        web_search_agent,           # Quick web searches (NEW)
        interactive_planner_agent,  # Deep research
    ],
    before_agent_callback=before_agent_callback,
    after_agent_callback=agent_network_tracking_callback,
)
```

---

## Phase 2: API Layer - SSE Streaming

### 2.1 Search Streaming Endpoint

**File:** `app/routes/search.py` (NEW)

```python
"""Search-specific API endpoints."""

import asyncio
import json
import logging
import time
from datetime import datetime
from typing import AsyncGenerator

from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.agent import web_search_agent
from app.agents.web_search_agent import enhance_search_results
from app.auth.middleware import get_current_user_optional
from app.integration.adk_integration import create_invocation_context

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/search", tags=["search"])


class SearchRequest(BaseModel):
    """Search request payload."""
    query: str = Field(..., min_length=1, max_length=500)
    filters: dict | None = None  # Future: domain, date range, etc.


@router.post("/stream")
async def search_stream(
    request: Request,
    search_request: SearchRequest,
    current_user: dict | None = None
):
    """
    Stream web search results with AI enhancements via SSE.

    SSE Events:
    - search_started: { query, timestamp }
    - search_executing: { tool, query }
    - result: { result_data }
    - search_complete: { total_results, search_time_ms }
    - error: { message }
    """

    async def event_generator() -> AsyncGenerator[str, None]:
        start_time = time.time()

        try:
            # Event: Search started
            yield f"event: search_started\n"
            yield f"data: {json.dumps({
                'query': search_request.query,
                'timestamp': datetime.now().isoformat()
            })}\n\n"

            # Create ADK invocation context
            context = create_invocation_context(
                app_name="vana",
                user_id=current_user.get("id", "anonymous") if current_user else "anonymous",
                session_id=f"search-{int(time.time())}",
                user_message=search_request.query
            )

            # Execute search agent
            result_count = 0

            async for event in web_search_agent.run_async(context):
                # Stream tool execution events
                if hasattr(event, 'tool_calls') and event.tool_calls:
                    for tool_call in event.tool_calls:
                        yield f"event: search_executing\n"
                        yield f"data: {json.dumps({
                            'tool': tool_call.name,
                            'query': tool_call.params.get('query', 'N/A')
                        })}\n\n"

                # Stream individual results as they're processed
                if hasattr(event, 'content') and event.content:
                    # Check if agent has produced partial results
                    # (this depends on your agent's streaming behavior)
                    pass

            # Get final results from session state
            final_response = context.session.state.get("search_response")

            if not final_response:
                raise ValueError("No search response generated")

            # Enhance results with scoring
            if hasattr(final_response, 'results'):
                enhanced = await enhance_search_results(
                    raw_results=[r.dict() for r in final_response.results],
                    query=search_request.query
                )
                final_response.results = enhanced

            # Calculate search time
            search_time_ms = int((time.time() - start_time) * 1000)

            # Stream individual results
            for result in final_response.results:
                result_count += 1
                yield f"event: result\n"
                yield f"data: {json.dumps(result.dict())}\n\n"

            # Event: Search complete
            yield f"event: search_complete\n"
            yield f"data: {json.dumps({
                'total_results': result_count,
                'search_time_ms': search_time_ms,
                'related_searches': [r.dict() for r in final_response.related_searches] if hasattr(final_response, 'related_searches') else []
            })}\n\n"

        except Exception as e:
            logger.error(f"Search stream error: {e}", exc_info=True)
            yield f"event: error\n"
            yield f"data: {json.dumps({'message': str(e)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        }
    )


@router.get("/health")
async def search_health():
    """Health check for search service."""
    return {"status": "healthy", "service": "web_search"}
```

### 2.2 Register Search Routes

**File:** `app/server.py` (MODIFY EXISTING)

```python
# Add import
from app.routes.search import router as search_router

# Register router
app.include_router(search_router)
```

---

## Phase 3: Frontend - UI Components

### 3.1 Install Agent Web Search Component

```bash
# From project root
cd frontend

# Install via shadcn CLI (if agents-ui-kit supports it)
npx shadcn add "https://agents-ui-kit.com/c/agent-web-search.json"

# OR manually copy component files from agents-ui-kit docs
# Place in: frontend/src/components/agents-ui/
```

**Files to create/copy:**
- `frontend/src/components/agents-ui/agent-web-search.tsx`
- `frontend/src/components/agents-ui/search-result-card.tsx`
- `frontend/src/components/agents-ui/credibility-badge.tsx`
- `frontend/src/components/agents-ui/filter-panel.tsx`
- `frontend/src/components/agents-ui/related-searches.tsx`

### 3.2 Create Search Page

**File:** `frontend/src/app/search/page.tsx` (NEW)

```typescript
'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { AgentWebSearch } from '@/components/agents-ui/agent-web-search'
import { useRouter, useSearchParams } from 'next/navigation'

interface SearchResult {
  title: string
  url: string
  snippet: string
  domain: string
  publishedDate?: string
  aiSummary: string
  credibilityScore: number
  relevanceScore: number
  faviconUrl?: string
  isHttps: boolean
}

interface RelatedSearch {
  query: string
  reason?: string
}

export default function SearchPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialQuery = searchParams.get('q') || ''

  const [results, setResults] = useState<SearchResult[]>([])
  const [relatedSearches, setRelatedSearches] = useState<RelatedSearch[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTime, setSearchTime] = useState<number>(0)

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) return

    setLoading(true)
    setError(null)
    setResults([])
    setRelatedSearches([])

    try {
      // Update URL with search query
      router.push(`/search?q=${encodeURIComponent(query)}`, { scroll: false })

      // Connect to SSE endpoint
      const response = await fetch('/api/search/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      })

      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('No response body')
      }

      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()

        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.trim()) continue

          const [eventLine, dataLine] = line.split('\n')
          if (!eventLine.startsWith('event:') || !dataLine.startsWith('data:')) continue

          const eventType = eventLine.substring(6).trim()
          const data = JSON.parse(dataLine.substring(5))

          switch (eventType) {
            case 'search_started':
              console.log('Search started:', data)
              break

            case 'search_executing':
              console.log('Executing search:', data)
              break

            case 'result':
              setResults(prev => [...prev, data])
              break

            case 'search_complete':
              setRelatedSearches(data.related_searches || [])
              setSearchTime(data.search_time_ms)
              setLoading(false)
              break

            case 'error':
              setError(data.message)
              setLoading(false)
              break
          }
        }
      }
    } catch (err) {
      console.error('Search error:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
      setLoading(false)
    }
  }, [router])

  // Auto-search if query param exists
  useEffect(() => {
    if (initialQuery) {
      handleSearch(initialQuery)
    }
  }, []) // Only run once on mount

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <AgentWebSearch
        onSearch={handleSearch}
        results={results}
        relatedSearches={relatedSearches}
        loading={loading}
        error={error}
        searchTime={searchTime}
        initialQuery={initialQuery}
      />
    </div>
  )
}
```

### 3.3 Add Navigation Link

**File:** `frontend/src/components/ui/navbar.tsx` (MODIFY if exists)

Add a "Search" link to your navigation:

```typescript
<Link href="/search" className="nav-link">
  <Search className="h-4 w-4" />
  <span>Search</span>
</Link>
```

---

## Phase 4: Testing & Validation

### 4.1 Backend Unit Tests

**File:** `tests/unit/test_web_search_agent.py` (NEW)

```python
"""Unit tests for web search agent."""

import pytest
from app.agents.web_search_agent import web_search_agent, enhance_search_results
from app.tools.credibility_scorer import CredibilityScorer, RelevanceScorer


class TestCredibilityScorer:
    def test_edu_domain_high_score(self):
        scorer = CredibilityScorer()
        score = scorer.calculate_credibility(
            url="https://mit.edu/article",
            domain="mit.edu",
            is_https=True,
            published_date="2024-01-15",
            content_length=500
        )
        assert score >= 0.85

    def test_http_reduces_score(self):
        scorer = CredibilityScorer()
        https_score = scorer.calculate_credibility(
            url="https://example.com/page",
            domain="example.com",
            is_https=True,
            published_date="2024-01-15",
            content_length=500
        )
        http_score = scorer.calculate_credibility(
            url="http://example.com/page",
            domain="example.com",
            is_https=False,
            published_date="2024-01-15",
            content_length=500
        )
        assert https_score > http_score


class TestRelevanceScorer:
    def test_exact_title_match(self):
        scorer = RelevanceScorer()
        score = scorer.calculate_relevance(
            query="Python testing",
            title="Python testing best practices",
            snippet="Learn how to test Python code effectively"
        )
        assert score >= 0.8

    def test_no_match_low_score(self):
        scorer = RelevanceScorer()
        score = scorer.calculate_relevance(
            query="Python testing",
            title="JavaScript frameworks",
            snippet="Comparing React and Vue"
        )
        assert score < 0.3


@pytest.mark.asyncio
async def test_enhance_search_results():
    """Test result enhancement with scoring."""
    raw_results = [
        {
            'title': 'Test Article',
            'url': 'https://example.edu/article',
            'snippet': 'This is a test snippet about Python',
            'domain': 'example.edu',
            'published_date': '2024-01-15',
            'ai_summary': 'A comprehensive guide to Python testing',
        }
    ]

    enhanced = await enhance_search_results(raw_results, query="Python testing")

    assert len(enhanced) == 1
    assert enhanced[0].credibility_score > 0.5
    assert enhanced[0].relevance_score > 0.5
```

### 4.2 Integration Tests

**File:** `tests/integration/test_search_api.py` (NEW)

```python
"""Integration tests for search API."""

import pytest
from fastapi.testclient import TestClient
from app.server import app


client = TestClient(app)


def test_search_stream_endpoint():
    """Test SSE search streaming."""
    response = client.post(
        "/api/search/stream",
        json={"query": "Python testing frameworks"}
    )

    assert response.status_code == 200
    assert response.headers['content-type'] == 'text/event-stream'

    # Parse SSE events
    events = []
    for line in response.iter_lines():
        if line.startswith(b'event:'):
            events.append(line.decode().split(':')[1].strip())

    assert 'search_started' in events
    assert 'search_complete' in events or 'result' in events


def test_search_health_endpoint():
    """Test search health check."""
    response = client.get("/api/search/health")
    assert response.status_code == 200
    assert response.json()['status'] == 'healthy'
```

### 4.3 E2E Testing with Chrome DevTools MCP

```bash
# Start all services
pm2 start ecosystem.config.js

# Open Chrome DevTools MCP
# Navigate to search page and test
```

**E2E Test Script:**

```javascript
// Navigate to search page
mcp__chrome-devtools__navigate_page({ url: "http://localhost:3000/search" })

// Take snapshot
mcp__chrome-devtools__take_snapshot()

// Fill search input
mcp__chrome-devtools__fill({ uid: "search-input", value: "React testing libraries" })

// Click search button
mcp__chrome-devtools__click({ uid: "search-button" })

// Wait for results
mcp__chrome-devtools__wait_for({ text: "AI Summary", timeout: 10000 })

// Check console for errors
mcp__chrome-devtools__list_console_messages()

// Verify network requests
mcp__chrome-devtools__list_network_requests({ resourceTypes: ["fetch", "eventsource"] })

// Take screenshot
mcp__chrome-devtools__take_screenshot({ fullPage: true })
```

---

## Phase 5: Documentation & Polish

### 5.1 API Documentation

**File:** `docs/api/search-api.md` (NEW)

Document the search API endpoints, request/response formats, SSE events, and error codes.

### 5.2 Component Documentation

**File:** `docs/components/agent-web-search.md` (NEW)

Document the Agent Web Search component props, usage examples, and customization options.

### 5.3 User Guide

**File:** `docs/guides/web-search-guide.md` (NEW)

User-facing documentation on how to use the web search feature.

---

## Implementation Checklist

### Phase 1: Backend (6-8 hours)
- [ ] Create `app/models/search_models.py` with Pydantic schemas
- [ ] Create `app/tools/credibility_scorer.py` with scoring logic
- [ ] Create `app/agents/web_search_agent.py` with search agent
- [ ] Modify `app/agent.py` to add dispatcher routing
- [ ] Write unit tests for scoring logic
- [ ] Test agent with sample queries in ADK web UI

### Phase 2: API (3-4 hours)
- [ ] Create `app/routes/search.py` with SSE endpoint
- [ ] Register search router in `app/server.py`
- [ ] Add error handling and logging
- [ ] Write integration tests for API
- [ ] Test SSE streaming with curl/Postman

### Phase 3: Frontend (8-10 hours)
- [ ] Install Agent Web Search component via shadcn CLI
- [ ] Customize component styling to match Vana theme
- [ ] Create `frontend/src/app/search/page.tsx`
- [ ] Implement SSE connection and state management
- [ ] Add loading states and error handling
- [ ] Add navigation link to search page
- [ ] Test in browser with Chrome DevTools MCP
- [ ] Verify responsive design (mobile, tablet, desktop)

### Phase 4: Testing (4-5 hours)
- [ ] Write backend unit tests (credibility, relevance)
- [ ] Write integration tests (API, SSE streaming)
- [ ] E2E testing with Chrome DevTools MCP
- [ ] Performance testing (parallel search execution)
- [ ] Accessibility testing (a11y compliance)
- [ ] Cross-browser testing

### Phase 5: Documentation (2-3 hours)
- [ ] Document API endpoints and SSE events
- [ ] Document component props and usage
- [ ] Create user guide with examples
- [ ] Add code comments and docstrings
- [ ] Update CLAUDE.md with search feature

### Phase 6: Deployment (1-2 hours)
- [ ] Update environment variables (if needed)
- [ ] Test in staging environment
- [ ] Performance monitoring setup
- [ ] Create PR with detailed description
- [ ] Code review and iteration
- [ ] Merge to main and deploy

---

## Success Criteria

### Functional Requirements
✅ User can search the web via dedicated search interface
✅ Results display AI-generated summaries
✅ Credibility scores visible for each result
✅ Relevance scores indicate query match quality
✅ Related searches suggested for exploration
✅ Real-time streaming of search results
✅ Error handling with user-friendly messages

### Performance Requirements
✅ Search completes in < 5 seconds
✅ Parallel search execution (4-5 queries)
✅ SSE streaming with minimal latency
✅ UI remains responsive during search

### Quality Requirements
✅ 80%+ test coverage for backend
✅ All E2E tests pass
✅ No console errors in production
✅ Accessibility score 95+ (Lighthouse)
✅ Mobile-responsive design

---

## Risk Mitigation

### Risk 1: Agent Not Generating Valid JSON
**Mitigation:**
- Use Pydantic `output_schema` for strict validation
- Add extensive examples in agent instruction
- Implement fallback JSON parsing with error recovery

### Risk 2: Credibility Scoring Too Simplistic
**Mitigation:**
- Start with basic heuristics (domain, HTTPS, freshness)
- Iterate based on user feedback
- Consider future ML-based scoring

### Risk 3: SSE Connection Failures
**Mitigation:**
- Implement exponential backoff retry logic
- Add connection timeout handling
- Provide fallback to traditional request/response

### Risk 4: Component Customization Complexity
**Mitigation:**
- Copy component code directly (shadcn model)
- Modify as needed for Vana theme
- Document all customizations

---

## Future Enhancements

### Phase 2 (Future)
- [ ] Advanced filtering (domain, date range, file type)
- [ ] Search history and bookmarks
- [ ] Export results to CSV/PDF
- [ ] Image/video search support
- [ ] Voice search input
- [ ] Multi-language support
- [ ] Search analytics dashboard

### Phase 3 (Future)
- [ ] ML-based credibility scoring
- [ ] Personalized search results
- [ ] Collaborative filtering
- [ ] Search result caching with Redis
- [ ] Rate limiting per user
- [ ] Premium features (unlimited searches)

---

## Timeline

**Week 1:**
- Days 1-2: Phase 1 (Backend - ADK Agent)
- Days 3-4: Phase 2 (API - SSE Streaming)

**Week 2:**
- Days 1-3: Phase 3 (Frontend - UI Components)
- Day 4: Phase 4 (Testing)
- Day 5: Phase 5 (Documentation) + Phase 6 (Deployment)

**Total: ~10 working days (2 weeks)**

---

## Conclusion

This implementation plan provides a comprehensive roadmap for integrating the Agent Web Search component with a specialized Google ADK search agent. The architecture is:

- ✅ **Incremental**: Can be implemented in phases
- ✅ **Isolated**: No breaking changes to existing features
- ✅ **Scalable**: Can handle multiple concurrent searches
- ✅ **Extensible**: Easy to add new features (filters, history, etc.)
- ✅ **Tested**: Comprehensive test coverage
- ✅ **Production-Ready**: Error handling, monitoring, documentation

The result will be a professional, AI-enhanced web search experience that showcases Vana's multi-agent capabilities.

---

**Next Steps:**
1. Review and approve this plan
2. Begin Phase 1 (Backend implementation)
3. Iterate based on testing and feedback
