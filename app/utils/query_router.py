"""Query routing utility for detecting search vs research modes.

This module provides programmatic query classification to force routing
BEFORE the LLM can make tool/agent decisions.
"""

import re
from typing import Literal

# Quick search patterns (prioritize these)
QUICK_SEARCH_PATTERNS = [
    r'\bsearch\s+for\b',
    r'\bfind\s+(the\s+)?(best|top|good|popular)',
    r'\bwhat\s+are\s+(the\s+)?(best|top|popular)',
    r'\bshow\s+me\b',
    r'\blist\s+(of\s+)?(the\s+)?',
    r'\bcompare\s+\w+\s+(vs|and|with)\b',
    r'\blooking\s+for\b',
    r'\brecommend\b',
]

# Deep research patterns
DEEP_RESEARCH_PATTERNS = [
    r'\bresearch\b',
    r'\binvestigate\b',
    r'\banalyze\b',
    r'\bcomprehensive\s+(analysis|study|report)\b',
    r'\bdetailed\s+(investigation|analysis|study)\b',
    r'\bin-depth\b',
    r'\bexamine\b',
]


def detect_query_mode(query: str) -> Literal["quick_search", "deep_research", "unknown"]:
    """Detect whether a query should trigger quick search or deep research.

    Args:
        query: The user's input query

    Returns:
        "quick_search" if quick search patterns detected
        "deep_research" if research patterns detected
        "unknown" if no clear pattern match

    Priority: Quick search patterns are checked FIRST to catch
    queries like "search for" before they can trigger research mode.
    """
    query_lower = query.lower().strip()

    # Priority 1: Check for quick search patterns FIRST
    for pattern in QUICK_SEARCH_PATTERNS:
        if re.search(pattern, query_lower, re.IGNORECASE):
            return "quick_search"

    # Priority 2: Check for deep research patterns
    for pattern in DEEP_RESEARCH_PATTERNS:
        if re.search(pattern, query_lower, re.IGNORECASE):
            return "deep_research"

    # Default: Unknown (let agent decide)
    return "unknown"


def should_force_quick_search(query: str) -> bool:
    """Check if query should be forcibly routed to quick_search_agent.

    This bypasses LLM decision-making to ensure search queries
    don't accidentally trigger research mode.

    Args:
        query: The user's input query

    Returns:
        True if query MUST go to quick_search_agent
    """
    return detect_query_mode(query) == "quick_search"


def should_force_deep_research(query: str) -> bool:
    """Check if query should be forcibly routed to research_pipeline.

    Args:
        query: The user's input query

    Returns:
        True if query MUST go to research_pipeline
    """
    return detect_query_mode(query) == "deep_research"
