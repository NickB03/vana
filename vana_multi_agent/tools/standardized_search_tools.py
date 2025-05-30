"""
Standardized Search Tools for VANA Multi-Agent System

This module provides standardized search tools that follow the
tool standards framework for consistent interfaces, error handling,
and performance monitoring.
"""

import os
import sys
from typing import Dict, Any, List, Union

# Add the parent directory to the path to import VANA tools
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from vana_multi_agent.core.tool_standards import (
    StandardToolResponse, InputValidator, ErrorHandler,
    standardized_tool_wrapper, performance_monitor, tool_analytics
)

# Import original search tools with fallback to avoid circular imports
try:
    from agent.tools.vector_search import search as vector_search, search_knowledge
    from agent.tools.web_search import search as web_search
except ImportError:
    # Fallback implementations to avoid circular imports during initialization
    def vector_search(query: str, max_results: int = 5):
        return {"success": False, "error": "Vector search not available during initialization"}

    def search_knowledge(query: str, max_results: int = 5):
        return {"success": False, "error": "Knowledge search not available during initialization"}

    def web_search(query: str, max_results: int = 5):
        return {"success": False, "error": "Web search not available during initialization"}

class StandardizedSearchTools:
    """Standardized search tools with enhanced monitoring and error handling."""

    @standardized_tool_wrapper("vector_search")
    def vector_search(self, query: str, max_results: int = 5) -> StandardToolResponse:
        """🔍 Search the vector database for relevant information with enhanced results.

        Args:
            query: Search query string
            max_results: Maximum number of results to return (1-50)

        Returns:
            StandardToolResponse with search results or error information
        """
        # Validate inputs with standardized parameter name
        query = InputValidator.validate_string(query, "query", required=True, min_length=1, max_length=1000)
        max_results = InputValidator.validate_integer(max_results, "max_results", required=False, min_value=1, max_value=50)

        # Record usage for analytics
        parameters = {"query": query, "max_results": max_results}

        try:
            # Execute original tool (note: original uses top_k parameter)
            results = vector_search(query, max_results)

            # Handle different result formats
            if isinstance(results, dict) and not results.get("success", True):
                response = StandardToolResponse(
                    success=False,
                    error=results.get("error", "Vector search failed"),
                    tool_name="vector_search"
                )
            else:
                # Ensure results is a list
                if isinstance(results, str):
                    results = [{"content": results, "score": 1.0}]
                elif not isinstance(results, list):
                    results = []

                response = StandardToolResponse(
                    success=True,
                    data=results,
                    tool_name="vector_search",
                    metadata={
                        "query": query,
                        "result_count": len(results),
                        "max_results": max_results
                    }
                )
        except Exception as e:
            response = ErrorHandler.create_error_response("vector_search", e)

        # Record analytics
        tool_analytics.record_usage("vector_search", parameters, response)
        return response

    @standardized_tool_wrapper("web_search")
    def web_search(self, query: str, max_results: int = 5) -> StandardToolResponse:
        """🌐 Search the web for current information with enhanced formatting.

        Args:
            query: Search query string
            max_results: Maximum number of results to return (1-10)

        Returns:
            StandardToolResponse with search results or error information
        """
        # Validate inputs with standardized parameter name
        query = InputValidator.validate_string(query, "query", required=True, min_length=1, max_length=1000)
        max_results = InputValidator.validate_integer(max_results, "max_results", required=False, min_value=1, max_value=10)

        # Record usage for analytics
        parameters = {"query": query, "max_results": max_results}

        try:
            # Execute original tool (note: original uses num_results parameter)
            results = web_search(query, max_results)

            # Handle different result formats
            if isinstance(results, dict) and not results.get("success", True):
                response = StandardToolResponse(
                    success=False,
                    error=results.get("error", "Web search failed"),
                    tool_name="web_search"
                )
            else:
                # Ensure results is a list
                if isinstance(results, str):
                    results = [{"title": "Web Search Result", "content": results, "link": ""}]
                elif not isinstance(results, list):
                    results = []

                response = StandardToolResponse(
                    success=True,
                    data=results,
                    tool_name="web_search",
                    metadata={
                        "query": query,
                        "result_count": len(results),
                        "max_results": max_results,
                        "search_type": "web"
                    }
                )
        except Exception as e:
            response = ErrorHandler.create_error_response("web_search", e)

        # Record analytics
        tool_analytics.record_usage("web_search", parameters, response)
        return response

    @standardized_tool_wrapper("search_knowledge")
    def search_knowledge(self, query: str, max_results: int = 5) -> StandardToolResponse:
        """🧠 Search the knowledge base for relevant information with context.

        Args:
            query: Search query string
            max_results: Maximum number of results to return (1-20)

        Returns:
            StandardToolResponse with search results or error information
        """
        # Validate inputs
        query = InputValidator.validate_string(query, "query", required=True, min_length=1, max_length=1000)
        max_results = InputValidator.validate_integer(max_results, "max_results", required=False, min_value=1, max_value=20)

        # Record usage for analytics
        parameters = {"query": query, "max_results": max_results}

        try:
            # Execute original tool
            results = search_knowledge(query)

            # Handle different result formats
            if isinstance(results, dict) and not results.get("success", True):
                response = StandardToolResponse(
                    success=False,
                    error=results.get("error", "Knowledge search failed"),
                    tool_name="search_knowledge"
                )
            else:
                # Ensure results is a list and limit to max_results
                if isinstance(results, str):
                    results = [{"content": results, "score": 1.0}]
                elif not isinstance(results, list):
                    results = []

                # Limit results to max_results
                results = results[:max_results]

                response = StandardToolResponse(
                    success=True,
                    data=results,
                    tool_name="search_knowledge",
                    metadata={
                        "query": query,
                        "result_count": len(results),
                        "max_results": max_results,
                        "search_type": "knowledge"
                    }
                )
        except Exception as e:
            response = ErrorHandler.create_error_response("search_knowledge", e)

        # Record analytics
        tool_analytics.record_usage("search_knowledge", parameters, response)
        return response

# Create global instance
standardized_search_tools = StandardizedSearchTools()

# Wrapper functions for ADK compatibility
def standardized_vector_search(query: str, max_results: int = 5) -> str:
    """🔍 Vector search with standardized interface - returns string for ADK compatibility."""
    result = standardized_search_tools.vector_search(query, max_results)
    return result.to_string()

def standardized_web_search(query: str, max_results: int = 5) -> str:
    """🌐 Web search with standardized interface - returns string for ADK compatibility."""
    result = standardized_search_tools.web_search(query, max_results)
    return result.to_string()

def standardized_search_knowledge(query: str, max_results: int = 5) -> str:
    """🧠 Knowledge search with standardized interface - returns string for ADK compatibility."""
    result = standardized_search_tools.search_knowledge(query, max_results)
    return result.to_string()

# Performance monitoring functions
def get_search_tools_performance() -> Dict[str, Any]:
    """Get performance metrics for search tools."""
    return {
        "vector_search": performance_monitor.get_metrics("vector_search"),
        "web_search": performance_monitor.get_metrics("web_search"),
        "search_knowledge": performance_monitor.get_metrics("search_knowledge")
    }

def get_search_tools_analytics() -> Dict[str, Any]:
    """Get usage analytics for search tools."""
    return {
        "vector_search": tool_analytics.get_usage_analytics("vector_search"),
        "web_search": tool_analytics.get_usage_analytics("web_search"),
        "search_knowledge": tool_analytics.get_usage_analytics("search_knowledge")
    }

def get_unified_search_performance() -> Dict[str, Any]:
    """Get unified performance summary for all search tools."""
    all_metrics = performance_monitor.get_all_metrics()
    search_metrics = {k: v for k, v in all_metrics.items() if "search" in k}

    if not search_metrics:
        return {"total_searches": 0, "avg_performance": 0.0}

    total_searches = sum(m.success_count + m.error_count for m in search_metrics.values())
    avg_performance = sum(m.average_execution_time for m in search_metrics.values()) / len(search_metrics)

    return {
        "total_searches": total_searches,
        "avg_performance": avg_performance,
        "tools": {name: {
            "executions": m.success_count + m.error_count,
            "avg_time": m.average_execution_time,
            "success_rate": m.success_count / (m.success_count + m.error_count) if (m.success_count + m.error_count) > 0 else 0
        } for name, m in search_metrics.items()}
    }
