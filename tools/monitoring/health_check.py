"""
Health Check API for VANA

This module provides health check functionality for the VANA memory system.
It implements health check endpoints and deep health checks for system components.
"""

import datetime
import json
import logging
import os
import time
from typing import Any, Callable, Dict, List, Optional, Union

# Set up logging
logger = logging.getLogger(__name__)


class HealthStatus:
    """Health status constants."""

    OK = "ok"
    WARNING = "warning"
    ERROR = "error"
    UNKNOWN = "unknown"


class HealthCheck:
    """
    Health Check for VANA memory system.

    This class provides health check functionality for the VANA memory system,
    including component health checks and overall system health.
    """

    def __init__(self):
        """Initialize the health check."""
        # Component health check functions
        self.component_checks = {}

        # Last check results
        self.last_check_results = {}

        # Last check time
        self.last_check_time = 0

        # Check interval in seconds
        self.check_interval = 60

        logger.info("Health Check initialized")

    def register_component(self, component_name: str, check_function: Callable[[], Dict[str, Any]]) -> None:
        """
        Register a component health check function.

        Args:
            component_name: Name of the component
            check_function: Function to check component health
        """
        self.component_checks[component_name] = check_function
        logger.info(f"Registered health check for component: {component_name}")

    def check_health(self, force: bool = False) -> Dict[str, Any]:
        """
        Check the health of all registered components.

        Args:
            force: Force a health check even if the interval hasn't passed

        Returns:
            Health check results
        """
        current_time = time.time()

        # Check if we need to run the health check
        if not force and current_time - self.last_check_time < self.check_interval:
            return self.last_check_results

        # Run health checks for all components
        component_results = {}
        overall_status = HealthStatus.OK

        for component_name, check_function in self.component_checks.items():
            try:
                result = check_function()
                component_results[component_name] = result

                # Update overall status
                component_status = result.get("status", HealthStatus.UNKNOWN)
                if component_status == HealthStatus.ERROR:
                    overall_status = HealthStatus.ERROR
                elif component_status == HealthStatus.WARNING and overall_status != HealthStatus.ERROR:
                    overall_status = HealthStatus.WARNING
            except Exception as e:
                logger.error(f"Error checking health for component {component_name}: {str(e)}")
                component_results[component_name] = {
                    "status": HealthStatus.ERROR,
                    "message": f"Error checking health: {str(e)}",
                    "timestamp": datetime.datetime.now().isoformat(),
                }
                overall_status = HealthStatus.ERROR

        # Create health check results
        results = {
            "status": overall_status,
            "timestamp": datetime.datetime.now().isoformat(),
            "components": component_results,
        }

        # Update last check results and time
        self.last_check_results = results
        self.last_check_time = current_time

        return results

    def check_component(self, component_name: str) -> Dict[str, Any]:
        """
        Check the health of a specific component.

        Args:
            component_name: Name of the component to check

        Returns:
            Component health check results
        """
        if component_name not in self.component_checks:
            return {
                "status": HealthStatus.UNKNOWN,
                "message": f"Component {component_name} not registered",
                "timestamp": datetime.datetime.now().isoformat(),
            }

        try:
            check_function = self.component_checks[component_name]
            result = check_function()
            return result
        except Exception as e:
            logger.error(f"Error checking health for component {component_name}: {str(e)}")
            return {
                "status": HealthStatus.ERROR,
                "message": f"Error checking health: {str(e)}",
                "timestamp": datetime.datetime.now().isoformat(),
            }

    def get_health_status(self) -> Dict[str, Any]:
        """
        Get the current health status.

        Returns:
            Current health status
        """
        # Check if we need to run a health check
        if not self.last_check_results:
            return self.check_health()

        return self.last_check_results


class MemorySystemHealthCheck:
    """
    Health Check for Memory System components.

    This class provides health check functions for the VANA memory system components.
    """

    @staticmethod
    def check_mcp_server(mcp_client) -> Dict[str, Any]:
        """
        Check the health of the MCP server.

        Args:
            mcp_client: MCP client instance

        Returns:
            Health check results
        """
        try:
            # Check if the MCP server is available
            if not mcp_client._verify_connection():
                return {
                    "status": HealthStatus.ERROR,
                    "message": "MCP server is not available",
                    "timestamp": datetime.datetime.now().isoformat(),
                }

            # Get server status
            status_response = mcp_client._make_request({"operation": "status"})

            if "error" in status_response:
                return {
                    "status": HealthStatus.ERROR,
                    "message": f"MCP server error: {status_response['error']}",
                    "timestamp": datetime.datetime.now().isoformat(),
                }

            # Check server status
            server_status = status_response.get("status", "unknown")
            if server_status != "ok":
                return {
                    "status": HealthStatus.WARNING,
                    "message": f"MCP server status: {server_status}",
                    "timestamp": datetime.datetime.now().isoformat(),
                    "details": status_response,
                }

            return {
                "status": HealthStatus.OK,
                "message": "MCP server is healthy",
                "timestamp": datetime.datetime.now().isoformat(),
                "details": {"endpoint": mcp_client.endpoint, "namespace": mcp_client.namespace},
            }
        except Exception as e:
            logger.error(f"Error checking MCP server health: {str(e)}")
            return {
                "status": HealthStatus.ERROR,
                "message": f"Error checking MCP server health: {str(e)}",
                "timestamp": datetime.datetime.now().isoformat(),
            }

    @staticmethod
    def check_memory_manager(memory_manager) -> Dict[str, Any]:
        """
        Check the health of the memory manager.

        Args:
            memory_manager: Memory manager instance

        Returns:
            Health check results
        """
        try:
            # Check if the memory manager is initialized
            if not hasattr(memory_manager, "local_cache"):
                return {
                    "status": HealthStatus.ERROR,
                    "message": "Memory manager is not initialized",
                    "timestamp": datetime.datetime.now().isoformat(),
                }

            # Check if the MCP server is available
            mcp_available = memory_manager.mcp_available

            # Check local cache
            cache_size = len(memory_manager.local_cache)

            # Check sync status
            current_time = time.time()
            last_sync_time = memory_manager.last_sync_time
            sync_interval = memory_manager.sync_interval
            time_since_last_sync = current_time - last_sync_time

            status = HealthStatus.OK
            message = "Memory manager is healthy"

            if not mcp_available:
                status = HealthStatus.WARNING
                message = "Memory manager is using local fallback"

            if time_since_last_sync > sync_interval * 2:
                status = HealthStatus.WARNING
                message = f"Memory manager hasn't synced in {int(time_since_last_sync)} seconds"

            return {
                "status": status,
                "message": message,
                "timestamp": datetime.datetime.now().isoformat(),
                "details": {
                    "mcp_available": mcp_available,
                    "cache_size": cache_size,
                    "last_sync_time": datetime.datetime.fromtimestamp(last_sync_time).isoformat(),
                    "time_since_last_sync": int(time_since_last_sync),
                    "sync_interval": sync_interval,
                },
            }
        except Exception as e:
            logger.error(f"Error checking memory manager health: {str(e)}")
            return {
                "status": HealthStatus.ERROR,
                "message": f"Error checking memory manager health: {str(e)}",
                "timestamp": datetime.datetime.now().isoformat(),
            }

    @staticmethod
    def check_vector_search(vector_search_client) -> Dict[str, Any]:
        """
        Check the health of the Vector Search service.

        Args:
            vector_search_client: Vector Search client instance

        Returns:
            Health check results
        """
        try:
            # Check if the Vector Search client is initialized
            if not vector_search_client:
                return {
                    "status": HealthStatus.ERROR,
                    "message": "Vector Search client is not initialized",
                    "timestamp": datetime.datetime.now().isoformat(),
                }

            # Try a simple query to check if the service is working
            test_query = "test query for health check"

            # Generate embedding for the test query
            embedding = vector_search_client.generate_embedding(test_query)

            if not embedding:
                return {
                    "status": HealthStatus.ERROR,
                    "message": "Failed to generate embedding",
                    "timestamp": datetime.datetime.now().isoformat(),
                }

            # Try to search with the embedding
            results = vector_search_client.search_with_embedding(embedding, top_k=1)

            if results is None:
                return {
                    "status": HealthStatus.ERROR,
                    "message": "Failed to search with embedding",
                    "timestamp": datetime.datetime.now().isoformat(),
                }

            return {
                "status": HealthStatus.OK,
                "message": "Vector Search is healthy",
                "timestamp": datetime.datetime.now().isoformat(),
                "details": {
                    "endpoint_id": vector_search_client.endpoint_id,
                    "deployed_index_id": vector_search_client.deployed_index_id,
                },
            }
        except Exception as e:
            logger.error(f"Error checking Vector Search health: {str(e)}")
            return {
                "status": HealthStatus.ERROR,
                "message": f"Error checking Vector Search health: {str(e)}",
                "timestamp": datetime.datetime.now().isoformat(),
            }

    @staticmethod
    def check_hybrid_search(hybrid_search) -> Dict[str, Any]:
        """
        Check the health of the hybrid search.

        Args:
            hybrid_search: Hybrid search instance

        Returns:
            Health check results
        """
        try:
            # Check if the hybrid search is initialized
            if not hybrid_search:
                return {
                    "status": HealthStatus.ERROR,
                    "message": "Hybrid search is not initialized",
                    "timestamp": datetime.datetime.now().isoformat(),
                }

            # Check if the memory manager is available
            if not hasattr(hybrid_search, "memory_manager"):
                return {
                    "status": HealthStatus.ERROR,
                    "message": "Hybrid search memory manager is not initialized",
                    "timestamp": datetime.datetime.now().isoformat(),
                }

            # Try a simple query to check if the service is working
            test_query = "test query for health check"

            # Use the search method with a timeout
            import asyncio

            try:
                # Set a timeout for the search operation
                search_task = hybrid_search.search(test_query, top_k=1)
                results = asyncio.run(asyncio.wait_for(search_task, timeout=5.0))

                if not results:
                    return {
                        "status": HealthStatus.WARNING,
                        "message": "Hybrid search returned no results",
                        "timestamp": datetime.datetime.now().isoformat(),
                    }

                return {
                    "status": HealthStatus.OK,
                    "message": "Hybrid search is healthy",
                    "timestamp": datetime.datetime.now().isoformat(),
                    "details": {
                        "results_count": len(results.get("results", [])),
                        "sources": results.get("sources", {}),
                    },
                }
            except asyncio.TimeoutError:
                return {
                    "status": HealthStatus.ERROR,
                    "message": "Hybrid search timed out",
                    "timestamp": datetime.datetime.now().isoformat(),
                }
        except Exception as e:
            logger.error(f"Error checking hybrid search health: {str(e)}")
            return {
                "status": HealthStatus.ERROR,
                "message": f"Error checking hybrid search health: {str(e)}",
                "timestamp": datetime.datetime.now().isoformat(),
            }


def register_memory_system_health_checks(health_check: HealthCheck, memory_system) -> None:
    """
    Register health checks for the memory system.

    Args:
        health_check: Health check instance
        memory_system: Memory system instance
    """
    # Register MCP server health check
    health_check.register_component(
        "mcp_server", lambda: MemorySystemHealthCheck.check_mcp_server(memory_system.mcp_client)
    )

    # Register memory manager health check
    health_check.register_component(
        "memory_manager", lambda: MemorySystemHealthCheck.check_memory_manager(memory_system.memory_manager)
    )

    # Register vector search health check if available
    if hasattr(memory_system, "vector_search_client"):
        health_check.register_component(
            "vector_search", lambda: MemorySystemHealthCheck.check_vector_search(memory_system.vector_search_client)
        )

    # Register hybrid search health check if available
    if hasattr(memory_system, "hybrid_search"):
        health_check.register_component(
            "hybrid_search", lambda: MemorySystemHealthCheck.check_hybrid_search(memory_system.hybrid_search)
        )
