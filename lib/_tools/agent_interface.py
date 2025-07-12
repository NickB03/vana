"""
Agent Interface for Standardized Communication

This module provides a standardized interface for agent communication
using JSON-RPC over HTTP protocol.
"""

import asyncio
import logging
from abc import ABC, abstractmethod
from typing import Any, Callable, Dict, List, Optional

from .jsonrpc_client import JsonRpcClient
from .jsonrpc_server import AgentRpcHandler
from .message_protocol import AgentTaskResponse
from .message_router import MessageRouter, RoutingStrategy

logger = logging.getLogger(__name__)


class AgentInterface(ABC):
    """Abstract base class for agent communication interface."""

    def __init__(self, agent_name: str, base_url: str = "http://localhost:8000"):
        """Initialize the agent interface.

        Args:
            agent_name: Name of this agent
            base_url: Base URL for communication
        """
        self.agent_name = agent_name
        self.base_url = base_url
        self.rpc_handler: Optional[AgentRpcHandler] = None
        self.client = JsonRpcClient(base_url=base_url)
        self.router = MessageRouter()

    @abstractmethod
    async def execute_task(
        self,
        task: str,
        context: str = "",
        agent_id: str = "",
        priority: str = "normal",
        timeout_seconds: int = 30,
    ) -> AgentTaskResponse:
        """Execute a task assigned to this agent.

        Args:
            task: Task description
            context: Additional context
            agent_id: ID of the requesting agent
            priority: Task priority
            timeout_seconds: Task timeout

        Returns:
            AgentTaskResponse with execution result
        """

    @abstractmethod
    async def get_capabilities(self) -> Dict[str, Any]:
        """Get agent capabilities.

        Returns:
            Dictionary with agent capabilities
        """

    def setup_rpc_handler(self, app) -> AgentRpcHandler:
        """Set up RPC handler for this agent.

        Args:
            app: FastAPI application

        Returns:
            AgentRpcHandler instance
        """
        from .agent_communication import get_communication_service

        communication_service = get_communication_service(self.base_url)

        # Register the agent endpoint with task handler
        self.rpc_handler = communication_service.register_agent_endpoint(app, self.agent_name, self.execute_task)

        # Register additional methods
        self.rpc_handler.register_method("get_capabilities", self.get_capabilities)

        logger.info(f"✅ RPC handler set up for agent: {self.agent_name}")
        return self.rpc_handler

    async def send_task_to_agent(
        self, target_agent: str, task: str, context: str = "", priority: str = "normal"
    ) -> Dict[str, Any]:
        """Send a task to another agent.

        Args:
            target_agent: Name of the target agent
            task: Task description
            context: Additional context
            priority: Task priority

        Returns:
            Dictionary with task result
        """
        logger.info(f"📤 {self.agent_name} sending task to {target_agent}: {task}")

        async with JsonRpcClient(base_url=self.base_url) as client:
            response = await client.execute_task(target_agent, task, context, priority)

        if response.error:
            return {
                "status": "error",
                "error": response.error.message,
                "error_code": response.error.code,
                "target_agent": target_agent,
            }
        else:
            return {
                "status": "success",
                "result": response.result,
                "target_agent": target_agent,
            }

    async def route_task(
        self,
        task: str,
        context: str = "",
        strategy: RoutingStrategy = RoutingStrategy.CAPABILITY_BASED,
        required_capabilities: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """Route a task to the most appropriate agent.

        Args:
            task: Task description
            context: Additional context
            strategy: Routing strategy
            required_capabilities: Required agent capabilities

        Returns:
            Dictionary with routing result
        """
        logger.info(f"🧭 {self.agent_name} routing task: {task}")

        return await self.router.route_task(task, context, strategy, required_capabilities=required_capabilities)

    async def broadcast_task(
        self, task: str, context: str = "", agent_filter: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Broadcast a task to multiple agents.

        Args:
            task: Task description
            context: Additional context
            agent_filter: List of specific agents to send to

        Returns:
            Dictionary with results from multiple agents
        """
        logger.info(f"📢 {self.agent_name} broadcasting task: {task}")

        return await self.router.route_to_multiple_agents(task, context, agent_count=3)

    async def check_agent_health(self, target_agent: str) -> Dict[str, Any]:
        """Check health of another agent.

        Args:
            target_agent: Name of the target agent

        Returns:
            Health status dictionary
        """
        async with JsonRpcClient(base_url=self.base_url) as client:
            response = await client.health_check(target_agent)

        if response.error:
            return {
                "agent_name": target_agent,
                "status": "unhealthy",
                "error": response.error.message,
            }
        else:
            return response.result


class SimpleAgentInterface(AgentInterface):
    """Simple implementation of AgentInterface for basic agents."""

    def __init__(
        self,
        agent_name: str,
        task_handler: Optional[Callable] = None,
        capabilities: Optional[Dict[str, Any]] = None,
        base_url: str = "http://localhost:8000",
    ):
        """Initialize simple agent interface.

        Args:
            agent_name: Name of this agent
            task_handler: Optional custom task handler
            capabilities: Agent capabilities
            base_url: Base URL for communication
        """
        super().__init__(agent_name, base_url)
        self.task_handler = task_handler
        self.capabilities = capabilities or {
            "agent_name": agent_name,
            "methods": ["execute_task", "get_capabilities", "health_check"],
            "supports_async": True,
        }

    async def execute_task(
        self,
        task: str,
        context: str = "",
        agent_id: str = "",
        priority: str = "normal",
        timeout_seconds: int = 30,
    ) -> AgentTaskResponse:
        """Execute a task using the configured handler."""
        try:
            if self.task_handler:
                # Use custom task handler
                if asyncio.iscoroutinefunction(self.task_handler):
                    result = await self.task_handler(task, context, agent_id, priority, timeout_seconds)
                else:
                    result = self.task_handler(task, context, agent_id, priority, timeout_seconds)

                if isinstance(result, AgentTaskResponse):
                    return result
                else:
                    return AgentTaskResponse(status="completed", output=str(result), agent_id=self.agent_name)
            else:
                # Default task handler
                return AgentTaskResponse(
                    status="completed",
                    output=f"Task '{task}' processed by {self.agent_name}. Context: {context}",
                    agent_id=self.agent_name,
                    execution_time_ms=50.0,
                )

        except Exception as e:
            logger.error(f"❌ Task execution failed in {self.agent_name}: {e}")
            return AgentTaskResponse(status="error", agent_id=self.agent_name, error=str(e))

    async def get_capabilities(self) -> Dict[str, Any]:
        """Get agent capabilities."""
        return self.capabilities


class OrchestrationAgentInterface(AgentInterface):
    """Specialized interface for orchestration agents like VANA."""

    def __init__(self, agent_name: str = "vana", base_url: str = "http://localhost:8000"):
        """Initialize orchestration agent interface."""
        super().__init__(agent_name, base_url)
        self.delegation_history: List[Dict[str, Any]] = []

    async def execute_task(
        self,
        task: str,
        context: str = "",
        agent_id: str = "",
        priority: str = "normal",
        timeout_seconds: int = 30,
    ) -> AgentTaskResponse:
        """Execute task with intelligent delegation."""
        try:
            logger.info(f"🎯 {self.agent_name} orchestrating task: {task}")

            # Analyze task and determine if delegation is needed
            if await self._should_delegate_task(task):
                # Route task to appropriate agent
                routing_result = await self.route_task(task, context)

                if routing_result.get("status") == "success":
                    # Record delegation
                    self.delegation_history.append(
                        {
                            "task": task,
                            "delegated_to": routing_result.get("routing_info", {}).get("selected_agent"),
                            "timestamp": asyncio.get_event_loop().time(),
                            "success": True,
                        }
                    )

                    return AgentTaskResponse(
                        status="delegated",
                        output=f"Task delegated to {routing_result.get('routing_info', {}).get('selected_agent')}",
                        agent_id=self.agent_name,
                        execution_time_ms=routing_result.get("execution_time_ms", 0),
                    )
                else:
                    # Delegation failed, handle locally
                    return await self._handle_task_locally(task, context)
            else:
                # Handle task locally
                return await self._handle_task_locally(task, context)

        except Exception as e:
            logger.error(f"❌ Orchestration failed in {self.agent_name}: {e}")
            return AgentTaskResponse(status="error", agent_id=self.agent_name, error=str(e))

    async def get_capabilities(self) -> Dict[str, Any]:
        """Get orchestration agent capabilities."""
        return {
            "agent_name": self.agent_name,
            "type": "orchestration",
            "methods": [
                "execute_task",
                "get_capabilities",
                "health_check",
                "delegate_task",
                "route_task",
            ],
            "supports_delegation": True,
            "supports_routing": True,
            "supports_async": True,
            "delegation_count": len(self.delegation_history),
        }

    async def _should_delegate_task(self, task: str) -> bool:
        """Determine if a task should be delegated."""
        task_lower = task.lower()

        # Delegate code-related tasks
        if any(keyword in task_lower for keyword in ["code", "execute", "run", "script"]):
            return True

        # Delegate data analysis tasks
        if any(keyword in task_lower for keyword in ["analyze", "data", "chart", "graph"]):
            return True

        # Delegate search tasks
        if any(keyword in task_lower for keyword in ["search", "find", "knowledge"]):
            return True

        # Handle coordination tasks locally
        if any(keyword in task_lower for keyword in ["coordinate", "manage", "orchestrate"]):
            return False

        # Default to delegation for complex tasks
        return len(task.split()) > 10

    async def _handle_task_locally(self, task: str, context: str) -> AgentTaskResponse:
        """Handle task locally without delegation."""
        return AgentTaskResponse(
            status="completed",
            output=f"Orchestration task '{task}' handled by {self.agent_name}. Context: {context}",
            agent_id=self.agent_name,
            execution_time_ms=100.0,
        )
