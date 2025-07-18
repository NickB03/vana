"""
Agent Communication Service

This module provides HTTP endpoints and communication management for agents
using JSON-RPC over HTTP protocol.
"""

import asyncio
import logging
import time
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import FastAPI

from .agent_discovery import get_discovery_service
from .jsonrpc_client import JsonRpcClient
from .jsonrpc_server import AgentRpcHandler, JsonRpcServer
from .message_protocol import AgentTaskResponse

logger = logging.getLogger(__name__)


class AgentCommunicationService:
    """Service for managing agent communication endpoints and routing."""

    def __init__(self, base_url: str):
        """Initialize the communication service.

        Args:
            base_url: Base URL for agent endpoints
        """
        self.base_url = base_url.rstrip("/")
        self.discovery_service = get_discovery_service()
        self.active_endpoints: Dict[str, JsonRpcServer] = {}
        self.client = JsonRpcClient(base_url=base_url)
        self.communication_stats: Dict[str, Dict[str, Any]] = {}
        self.health_status: Dict[str, Dict[str, Any]] = {}

    def register_agent_endpoint(
        self, app: FastAPI, agent_name: str, task_handler: Optional[callable] = None
    ) -> AgentRpcHandler:
        """Register an RPC endpoint for an agent.

        Args:
            app: FastAPI application
            agent_name: Name of the agent
            task_handler: Optional task execution handler

        Returns:
            AgentRpcHandler for further customization
        """
        logger.info(f"📡 Registering RPC endpoint for agent: {agent_name}")

        # Create RPC handler
        rpc_handler = AgentRpcHandler(agent_name)

        # Register task handler if provided
        if task_handler:
            rpc_handler.register_execute_task(task_handler)
        else:
            # Default task handler
            async def default_task_handler(
                task: str,
                context: str = "",
                agent_id: str = "",
                priority: str = "normal",
                timeout_seconds: int = 30,
            ) -> AgentTaskResponse:
                """Default task handler that returns a placeholder response."""
                return AgentTaskResponse(
                    status="completed",
                    output=f"Task '{task}' received by {agent_name}. Context: {context}",
                    agent_id=agent_name,
                    execution_time_ms=100.0,
                )

            rpc_handler.register_execute_task(default_task_handler)

        # Create FastAPI endpoint
        rpc_handler.create_fastapi_endpoint(app)

        # Store the server reference
        self.active_endpoints[agent_name] = rpc_handler.server

        # Initialize stats
        self.communication_stats[agent_name] = {
            "requests_sent": 0,
            "requests_received": 0,
            "errors": 0,
            "last_communication": None,
            "average_response_time": 0.0,
        }

        logger.info(f"✅ Agent {agent_name} RPC endpoint registered at /agent/{agent_name}/rpc")
        return rpc_handler

    async def send_task_to_agent(
        self,
        agent_name: str,
        task: str,
        context: str = "",
        priority: str = "normal",
        timeout_seconds: int = 30,
    ) -> Dict[str, Any]:
        """Send a task to a specific agent.

        Args:
            agent_name: Name of the target agent
            task: Task description
            context: Additional context
            priority: Task priority
            timeout_seconds: Task timeout

        Returns:
            Dictionary with task result or error
        """
        start_time = time.time()

        try:
            logger.info(f"📤 Sending task to {agent_name}: {task}")

            # Check if agent exists
            agent_info = self.discovery_service.get_agent_info(agent_name)
            if not agent_info:
                return {
                    "status": "error",
                    "error": f"Agent '{agent_name}' not found",
                    "available_agents": list(self.discovery_service.discover_agents().keys()),
                }

            # Send task using JSON-RPC client
            async with JsonRpcClient(base_url=self.base_url) as client:
                response = await client.execute_task(agent_name, task, context, priority, timeout_seconds)

            # Update stats
            execution_time = (time.time() - start_time) * 1000
            self._update_communication_stats(agent_name, "sent", execution_time, response.error is None)

            if response.error:
                logger.warning(f"⚠️ Task failed for {agent_name}: {response.error.message}")
                return {
                    "status": "error",
                    "error": response.error.message,
                    "error_code": response.error.code,
                    "agent_name": agent_name,
                }
            else:
                logger.info(f"✅ Task completed by {agent_name} ({execution_time:.1f}ms)")
                return {
                    "status": "success",
                    "result": response.result,
                    "agent_name": agent_name,
                    "execution_time_ms": execution_time,
                }

        except Exception as e:
            execution_time = (time.time() - start_time) * 1000
            self._update_communication_stats(agent_name, "sent", execution_time, False)

            logger.error(f"❌ Error sending task to {agent_name}: {e}")
            return {
                "status": "error",
                "error": str(e),
                "agent_name": agent_name,
                "execution_time_ms": execution_time,
            }

    async def broadcast_task(
        self, task: str, context: str = "", agent_filter: Optional[List[str]] = None
    ) -> Dict[str, Dict[str, Any]]:
        """Broadcast a task to multiple agents.

        Args:
            task: Task description
            context: Additional context
            agent_filter: List of specific agents to send to (None = all agents)

        Returns:
            Dictionary mapping agent names to their responses
        """
        logger.info(f"📢 Broadcasting task: {task}")

        # Get available agents
        available_agents = self.discovery_service.discover_agents()

        # Filter agents if specified
        if agent_filter:
            target_agents = {name: info for name, info in available_agents.items() if name in agent_filter}
        else:
            target_agents = available_agents

        if not target_agents:
            return {"error": "No target agents available"}

        # Send tasks concurrently
        tasks = []
        for agent_name in target_agents:
            task_coroutine = self.send_task_to_agent(agent_name, task, context)
            tasks.append((agent_name, task_coroutine))

        # Wait for all responses
        results = {}
        for agent_name, task_coroutine in tasks:
            try:
                result = await task_coroutine
                results[agent_name] = result
            except Exception as e:
                results[agent_name] = {
                    "status": "error",
                    "error": str(e),
                    "agent_name": agent_name,
                }

        logger.info(f"✅ Broadcast completed to {len(results)} agents")
        return results

    async def check_agent_health(self, agent_name: str) -> Dict[str, Any]:
        """Check health of a specific agent.

        Args:
            agent_name: Name of the agent to check

        Returns:
            Health status dictionary
        """
        try:
            async with JsonRpcClient(base_url=self.base_url) as client:
                response = await client.health_check(agent_name)

            if response.error:
                health_status = {
                    "agent_name": agent_name,
                    "status": "unhealthy",
                    "error": response.error.message,
                    "timestamp": datetime.now().isoformat(),
                }
            else:
                health_status = {
                    "agent_name": agent_name,
                    "status": "healthy",
                    "details": response.result,
                    "timestamp": datetime.now().isoformat(),
                }

            # Cache health status
            self.health_status[agent_name] = health_status
            return health_status

        except Exception as e:
            health_status = {
                "agent_name": agent_name,
                "status": "unreachable",
                "error": str(e),
                "timestamp": datetime.now().isoformat(),
            }
            self.health_status[agent_name] = health_status
            return health_status

    async def check_all_agents_health(self) -> Dict[str, Dict[str, Any]]:
        """Check health of all discovered agents.

        Returns:
            Dictionary mapping agent names to health status
        """
        available_agents = self.discovery_service.discover_agents()

        health_checks = []
        for agent_name in available_agents:
            health_checks.append(self.check_agent_health(agent_name))

        results = await asyncio.gather(*health_checks, return_exceptions=True)

        health_summary = {}
        for i, result in enumerate(results):
            agent_name = list(available_agents.keys())[i]
            if isinstance(result, Exception):
                health_summary[agent_name] = {
                    "agent_name": agent_name,
                    "status": "error",
                    "error": str(result),
                    "timestamp": datetime.now().isoformat(),
                }
            else:
                health_summary[agent_name] = result

        return health_summary

    def get_communication_stats(self) -> Dict[str, Any]:
        """Get communication statistics.

        Returns:
            Dictionary with communication statistics
        """
        return {
            "active_endpoints": list(self.active_endpoints.keys()),
            "total_endpoints": len(self.active_endpoints),
            "agent_stats": self.communication_stats,
            "health_status": self.health_status,
            "last_updated": datetime.now().isoformat(),
        }

    def _update_communication_stats(self, agent_name: str, direction: str, response_time: float, success: bool) -> None:
        """Update communication statistics.

        Args:
            agent_name: Name of the agent
            direction: 'sent' or 'received'
            response_time: Response time in milliseconds
            success: Whether the communication was successful
        """
        if agent_name not in self.communication_stats:
            self.communication_stats[agent_name] = {
                "requests_sent": 0,
                "requests_received": 0,
                "errors": 0,
                "last_communication": None,
                "average_response_time": 0.0,
            }

        stats = self.communication_stats[agent_name]

        if direction == "sent":
            stats["requests_sent"] += 1
        else:
            stats["requests_received"] += 1

        if not success:
            stats["errors"] += 1

        # Update average response time
        current_avg = stats["average_response_time"]
        total_requests = stats["requests_sent"] + stats["requests_received"]
        stats["average_response_time"] = ((current_avg * (total_requests - 1)) + response_time) / total_requests

        stats["last_communication"] = datetime.now().isoformat()


# Global communication service instance
_communication_service = None


def get_communication_service(
    base_url: str = "http://localhost:8000",
) -> AgentCommunicationService:
    """Get the global agent communication service instance."""
    global _communication_service
    if _communication_service is None:
        _communication_service = AgentCommunicationService(base_url=base_url)
    return _communication_service
