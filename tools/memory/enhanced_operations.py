"""
Enhanced Memory Operations for VANA

This module provides advanced memory operations beyond the basic
memory recording and retrieval, including:

1. Memory filtering by tags, dates, and relevance
2. Memory categorization and tagging
3. Memory prioritization
4. Memory analytics
"""

import datetime
import logging
import os
from typing import Any, Optional, Union

import requests

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("memory-enhanced")

# Import base memory operations
try:
    from .ragie_client import query_memory
except ImportError:
    logger.warning(
        "Could not import base memory operations. Some features may be limited."
    )

    # Mock implementation for testing
    def query_memory(
        prompt: str, top_k: int = 5, api_key: Optional[str] = None, debug: bool = False
    ) -> list[dict[Any, Any]]:
        """Mock implementation of query_memory"""
        logger.warning("Using mock implementation of query_memory")
        return []


class EnhancedMemoryOperations:
    """Enhanced memory operations for VANA"""

    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize enhanced memory operations

        Args:
            api_key: Optional API key override (defaults to env var)
        """
        self.api_key = api_key or os.environ.get("RAGIE_API_KEY")
        if not self.api_key:
            logger.warning(
                "No Ragie API key provided. Set RAGIE_API_KEY environment variable or pass as parameter."
            )

    def filter_memories_by_date(
        self,
        query: str,
        start_date: Optional[Union[str, datetime.datetime]] = None,
        end_date: Optional[Union[str, datetime.datetime]] = None,
        top_k: int = 10,
    ) -> list[dict[Any, Any]]:
        """
        Filter memories by date range

        Args:
            query: The search query
            start_date: Start date for filtering (ISO format string or datetime object)
            end_date: End date for filtering (ISO format string or datetime object)
            top_k: Number of results to return

        Returns:
            List of matching memories
        """
        # Convert datetime objects to ISO strings if needed
        if isinstance(start_date, datetime.datetime):
            start_date = start_date.isoformat()
        if isinstance(end_date, datetime.datetime):
            end_date = end_date.isoformat()

        # Get base results
        results = query_memory(
            query, top_k=top_k * 2, api_key=self.api_key
        )  # Get more results for filtering

        # Filter by date
        filtered_results = []
        for result in results:
            # Extract timestamp from metadata
            timestamp = result.get("metadata", {}).get("timestamp")
            if not timestamp:
                continue

            # Check if within date range
            if start_date and timestamp < start_date:
                continue
            if end_date and timestamp > end_date:
                continue

            filtered_results.append(result)

            # Stop once we have enough results
            if len(filtered_results) >= top_k:
                break

        return filtered_results

    def tag_memory(self, memory_id: str, tags: list[str]) -> bool:
        """
        Add tags to a memory

        Args:
            memory_id: ID of the memory to tag
            tags: List of tags to add

        Returns:
            Success status
        """
        if not self.api_key:
            logger.error("No API key available")
            return False

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        payload = {"memory_id": memory_id, "tags": tags}

        try:
            response = requests.post(
                "https://api.ragie.ai/tag", json=payload, headers=headers
            )
            response.raise_for_status()
            return True
        except Exception as e:
            logger.error(f"Error tagging memory: {e}")
            return False

    def filter_memories_by_tags(
        self, query: str, tags: list[str], top_k: int = 10
    ) -> list[dict[Any, Any]]:
        """
        Filter memories by tags

        Args:
            query: The search query
            tags: List of tags to filter by
            top_k: Number of results to return

        Returns:
            List of matching memories
        """
        if not self.api_key:
            logger.error("No API key available")
            return []

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        payload = {"query": query, "tags": tags, "top_k": top_k}

        try:
            response = requests.post(
                "https://api.ragie.ai/retrievals/filter", json=payload, headers=headers
            )
            response.raise_for_status()

            # Extract relevant data from response
            results = response.json().get("scored_chunks", [])
            return results
        except Exception as e:
            logger.error(f"Error filtering memories by tags: {e}")
            return []

    def get_memory_analytics(self) -> dict[str, Any]:
        """
        Get analytics about stored memories

        Returns:
            Dictionary with analytics data
        """
        if not self.api_key:
            logger.error("No API key available")
            return {"error": "No API key available"}

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        try:
            response = requests.get("https://api.ragie.ai/analytics", headers=headers)
            response.raise_for_status()

            return response.json()
        except Exception as e:
            logger.error(f"Error getting memory analytics: {e}")
            return {"error": str(e)}

    def prioritize_memories(
        self, query: str, context: str, top_k: int = 5
    ) -> list[dict[Any, Any]]:
        """
        Prioritize memories based on relevance to both query and context

        Args:
            query: The search query
            context: Additional context to consider for prioritization
            top_k: Number of results to return

        Returns:
            List of prioritized memories
        """
        # Get memories relevant to the query
        query_results = query_memory(query, top_k=top_k * 2, api_key=self.api_key)

        # Get memories relevant to the context
        context_results = query_memory(context, top_k=top_k * 2, api_key=self.api_key)

        # Combine and prioritize results
        combined_results = {}

        # Add query results with their scores
        for result in query_results:
            memory_id = result.get("id", "")
            if not memory_id:
                continue

            score = result.get("score", 0)
            combined_results[memory_id] = {
                "result": result,
                "query_score": score,
                "context_score": 0,
                "total_score": score,
            }

        # Add or update with context results
        for result in context_results:
            memory_id = result.get("id", "")
            if not memory_id:
                continue

            score = result.get("score", 0)
            if memory_id in combined_results:
                # Update existing entry
                combined_results[memory_id]["context_score"] = score
                combined_results[memory_id]["total_score"] = (
                    combined_results[memory_id]["query_score"] + score
                )
            else:
                # Add new entry
                combined_results[memory_id] = {
                    "result": result,
                    "query_score": 0,
                    "context_score": score,
                    "total_score": score,
                }

        # Sort by total score and return top results
        sorted_results = sorted(
            combined_results.values(), key=lambda x: x["total_score"], reverse=True
        )

        return [item["result"] for item in sorted_results[:top_k]]


# Add these enhanced operations to the agent tools
def add_enhanced_memory_tools_to_agent(agent_class):
    """
    Add enhanced memory tools to an agent class

    Args:
        agent_class: The agent class to enhance
    """
    from google.adk.tools import FunctionTool

    # Create an instance of EnhancedMemoryOperations
    enhanced_memory = EnhancedMemoryOperations()

    # Define the tools
    filter_by_date_tool = FunctionTool(
        function=enhanced_memory.filter_memories_by_date,
        name="filter_memories_by_date",
        description="Filter memories by date range",
    )

    filter_by_tags_tool = FunctionTool(
        function=enhanced_memory.filter_memories_by_tags,
        name="filter_memories_by_tags",
        description="Filter memories by tags",
    )

    prioritize_memories_tool = FunctionTool(
        function=enhanced_memory.prioritize_memories,
        name="prioritize_memories",
        description="Prioritize memories based on relevance to query and context",
    )

    # Add the tools to the agent
    agent_class.add_tool(filter_by_date_tool)
    agent_class.add_tool(filter_by_tags_tool)
    agent_class.add_tool(prioritize_memories_tool)

    return agent_class
