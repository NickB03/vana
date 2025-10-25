"""Quick search agent for fast, AI-enhanced web searches.

This agent orchestrates rapid search results with AI summaries, credibility scoring,
and relevance ranking. It's optimized for quick searches like "search for Python
testing libraries" or "best React frameworks 2025".

Architecture (Two-Agent Composition):
    1. search_executor_agent: Executes parallel searches (has tools, no schema)
    2. quick_search_agent: Formats results (has schema, no tools)

Key Features:
    - Parallel search execution via search_executor_agent
    - AI-generated summaries for each result
    - Credibility scoring (domain authority, HTTPS, freshness)
    - Relevance scoring (query match, keyword density)
    - Related search suggestions
    - Structured output via Pydantic schema

Usage:
    Called as a sub-agent of interactive_planner_agent when quick search mode
    is detected (keywords: "search", "find", "best", "compare").
"""

import datetime

from google.adk.agents import LlmAgent
from google.adk.planners import BuiltInPlanner
from google.genai import types as genai_types

from app.agents.search_composer_agent import search_composer_agent
from app.agents.search_executor_agent import search_executor_agent
from app.config import config
from app.enhanced_callbacks import after_agent_callback, before_agent_callback


quick_search_agent = LlmAgent(
    model=config.worker_model,
    name="quick_search_agent",
    description="Fast web search coordinator orchestrating parallel search execution and result formatting",
    planner=BuiltInPlanner(
        thinking_config=genai_types.ThinkingConfig(include_thoughts=True)
    ),
    instruction=f"""
    You are a web search coordinator that orchestrates a two-phase search workflow.
    You coordinate between search_executor_agent (searches) and search_composer_agent
    (formatting).

    **YOUR TWO-PHASE WORKFLOW:**

    **PHASE 1: Execute Searches**
    1. Receive the user's search query
    2. Immediately transfer to search_executor_agent:
       `transfer_to_agent(agent_name="search_executor_agent")`
    3. search_executor_agent will:
       - Generate 3-4 diverse search queries
       - Execute them in parallel via brave_search
       - Return raw results in structured text format

    **PHASE 2: Format Results**
    4. Once you receive raw results from search_executor_agent, transfer them to
       search_composer_agent:
       `transfer_to_agent(agent_name="search_composer_agent")`
    5. search_composer_agent will:
       - Parse the raw results
       - Generate AI summaries for each result
       - Create related search suggestions
       - Return structured SearchResponse object

    **CRITICAL RULES:**
    - Current date: {datetime.datetime.now().strftime("%Y-%m-%d")}
    - ALWAYS execute Phase 1 first (search_executor_agent)
    - ALWAYS execute Phase 2 second (search_composer_agent)
    - Pass the full context between agents
    - Do not modify or filter results yourself - let the specialists handle it

    **WORKFLOW SUMMARY:**
    User Query → search_executor_agent → Raw Results → search_composer_agent → SearchResponse
    """,
    sub_agents=[
        search_executor_agent,  # Phase 1: Execute searches
        search_composer_agent,  # Phase 2: Format results
    ],
    # ✅ Coordinator: has sub_agents, NO output_schema, NO tools (ADK compliant)
    before_agent_callback=before_agent_callback,
    after_agent_callback=after_agent_callback,
)
