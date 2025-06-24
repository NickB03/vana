"""
Real Agent Coordination Tools for VANA

This module provides functional agent coordination tools to replace the stub implementations.
These tools actually coordinate between agents using Google ADK patterns.
"""

import asyncio
import json
import logging
import os
import sys
from datetime import datetime
from typing import Any, Dict, List, Optional

# Add project root to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from lib._tools.agent_communication import get_communication_service
from lib._tools.agent_discovery import AgentCapability, get_discovery_service
from lib._tools.routing_engine import get_routing_engine
from lib._tools.task_orchestrator import get_task_orchestrator

logger = logging.getLogger(__name__)


class AgentCoordinationService:
    """Service for coordinating between agents."""

    def __init__(self):
        """Initialize the coordination service."""
        self.discovery_service = get_discovery_service()
        self.coordination_history: List[Dict[str, Any]] = []
        self.active_delegations: Dict[str, Dict[str, Any]] = {}

    def coordinate_task(self, task_description: str, assigned_agent: str = "") -> str:
        """Coordinate task assignment with real agent routing.

        Args:
            task_description: Description of the task to coordinate
            assigned_agent: Specific agent to assign to (optional)

        Returns:
            JSON string with coordination result
        """
        try:
            logger.info(f"🎯 Coordinating task: {task_description}")

            # Discover available agents
            available_agents = self.discovery_service.discover_agents()

            if not available_agents:
                return json.dumps(
                    {
                        "action": "coordinate_task",
                        "task": task_description,
                        "status": "failed",
                        "error": "No agents available for coordination",
                        "timestamp": datetime.now().isoformat(),
                    }
                )

            # Determine best agent for the task
            selected_agent = self._select_best_agent(
                task_description, assigned_agent, available_agents
            )

            if not selected_agent:
                return json.dumps(
                    {
                        "action": "coordinate_task",
                        "task": task_description,
                        "status": "failed",
                        "error": "No suitable agent found for task",
                        "available_agents": list(available_agents.keys()),
                        "timestamp": datetime.now().isoformat(),
                    }
                )

            # Record coordination
            coordination_record = {
                "task_id": f"task_{len(self.coordination_history) + 1}",
                "task": task_description,
                "assigned_agent": selected_agent.name,
                "coordination_time": datetime.now().isoformat(),
                "status": "coordinated",
                "reasoning": self._get_selection_reasoning(
                    task_description, selected_agent
                ),
            }

            self.coordination_history.append(coordination_record)

            result = {
                "action": "coordinate_task",
                "task": task_description,
                "assigned_agent": selected_agent.name,
                "agent_description": selected_agent.description,
                "agent_capabilities": selected_agent.capabilities,
                "status": "coordinated",
                "task_id": coordination_record["task_id"],
                "reasoning": coordination_record["reasoning"],
                "timestamp": datetime.now().isoformat(),
            }

            logger.info(
                f"✅ Task coordinated to {selected_agent.name}: {task_description}"
            )
            return json.dumps(result, indent=2)

        except Exception as e:
            logger.error(f"❌ Task coordination failed: {e}")
            return json.dumps(
                {
                    "action": "coordinate_task",
                    "task": task_description,
                    "status": "error",
                    "error": str(e),
                    "timestamp": datetime.now().isoformat(),
                }
            )

    async def delegate_to_agent(
        self, agent_name: str, task: str, context: str = ""
    ) -> str:
        """Delegate task to a specific agent with real JSON-RPC communication.

        Args:
            agent_name: Name of the target agent
            task: Task to delegate
            context: Additional context for the task

        Returns:
            JSON string with delegation result
        """
        try:
            logger.info(f"🤝 Delegating to {agent_name}: {task}")

            # Check if agent exists
            agent_info = self.discovery_service.get_agent_info(agent_name)

            if not agent_info:
                available_agents = self.discovery_service.discover_agents()
                return json.dumps(
                    {
                        "action": "delegate_task",
                        "agent": agent_name,
                        "task": task,
                        "status": "failed",
                        "error": f"Agent '{agent_name}' not found",
                        "available_agents": list(available_agents.keys()),
                        "timestamp": datetime.now().isoformat(),
                    }
                )

            # Create delegation record
            delegation_id = f"delegation_{len(self.active_delegations) + 1}"
            delegation_record = {
                "delegation_id": delegation_id,
                "agent": agent_name,
                "task": task,
                "context": context,
                "status": "delegating",
                "delegation_time": datetime.now().isoformat(),
                "agent_capabilities": agent_info.capabilities,
                "agent_tools": agent_info.tools,
            }

            self.active_delegations[delegation_id] = delegation_record

            # Use communication service to send task via JSON-RPC
            communication_service = get_communication_service()
            communication_result = await communication_service.send_task_to_agent(
                agent_name, task, context
            )

            # Update delegation record with result
            delegation_record["status"] = communication_result.get("status", "unknown")
            delegation_record["communication_result"] = communication_result
            delegation_record["completion_time"] = datetime.now().isoformat()

            result = {
                "action": "delegate_task",
                "delegation_id": delegation_id,
                "agent": agent_name,
                "agent_description": agent_info.description,
                "task": task,
                "context": context,
                "status": communication_result.get("status", "unknown"),
                "agent_capabilities": agent_info.capabilities,
                "available_tools": agent_info.tools,
                "communication_result": communication_result,
                "execution_time_ms": communication_result.get("execution_time_ms"),
                "timestamp": datetime.now().isoformat(),
            }

            if communication_result.get("status") == "success":
                logger.info(f"✅ Task successfully delegated to {agent_name}: {task}")
                result["next_steps"] = (
                    f"Task completed by {agent_name}. Result: {communication_result.get('result', {}).get('output', 'No output')}"
                )
            else:
                logger.warning(
                    f"⚠️ Task delegation failed to {agent_name}: {communication_result.get('error', 'Unknown error')}"
                )
                result["next_steps"] = (
                    f"Task delegation failed. Error: {communication_result.get('error', 'Unknown error')}"
                )

            return json.dumps(result, indent=2)

        except Exception as e:
            logger.error(f"❌ Task delegation failed: {e}")
            return json.dumps(
                {
                    "action": "delegate_task",
                    "agent": agent_name,
                    "task": task,
                    "status": "error",
                    "error": str(e),
                    "timestamp": datetime.now().isoformat(),
                }
            )

    async def intelligent_route_task(self, task: str, context: str = "") -> str:
        """Route task using intelligent routing engine with analysis and optimization.

        Args:
            task: Task to route intelligently
            context: Additional context for routing

        Returns:
            JSON string with intelligent routing result
        """
        try:
            logger.info(f"🧠 Intelligent routing for task: {task}")

            # Use the routing engine for intelligent task routing
            routing_engine = get_routing_engine()
            routing_result = await routing_engine.route_task(task, context)

            # Create comprehensive routing record
            routing_id = f"intelligent_route_{len(self.active_delegations) + 1}"
            routing_record = {
                "routing_id": routing_id,
                "task": task,
                "context": context,
                "routing_result": routing_result,
                "status": "completed" if routing_result.success else "failed",
                "routing_time": datetime.now().isoformat(),
                "agents_used": routing_result.agents_used,
                "execution_time": routing_result.execution_time,
                "performance_metrics": routing_result.performance_metrics,
            }

            self.active_delegations[routing_id] = routing_record

            # Format result for return
            result = {
                "action": "intelligent_route_task",
                "routing_id": routing_id,
                "task": task,
                "context": context,
                "status": "success" if routing_result.success else "failed",
                "agents_used": routing_result.agents_used,
                "execution_time_ms": routing_result.execution_time * 1000,
                "primary_result": routing_result.primary_result,
                "secondary_results": routing_result.secondary_results,
                "errors": routing_result.errors,
                "performance_metrics": routing_result.performance_metrics,
                "next_steps": self._generate_routing_next_steps(routing_result),
                "timestamp": datetime.now().isoformat(),
            }

            if routing_result.success:
                logger.info(f"✅ Intelligent routing successful: {routing_id}")
            else:
                logger.warning(f"⚠️ Intelligent routing had issues: {routing_id}")

            return json.dumps(result, indent=2)

        except Exception as e:
            logger.error(f"❌ Intelligent routing failed: {e}")
            return json.dumps(
                {
                    "action": "intelligent_route_task",
                    "task": task,
                    "status": "error",
                    "error": str(e),
                    "timestamp": datetime.now().isoformat(),
                }
            )

    async def orchestrate_complex_task(
        self,
        task: str,
        context: str = "",
        max_agents: int = 3,
        timeout_seconds: int = 300,
    ) -> str:
        """Orchestrate complex task across multiple agents with coordination.

        Args:
            task: Complex task to orchestrate
            context: Additional context
            max_agents: Maximum number of agents to use
            timeout_seconds: Timeout for orchestration

        Returns:
            JSON string with orchestration result
        """
        try:
            logger.info(f"🎼 Orchestrating complex task: {task}")

            # Use task orchestrator for complex multi-agent coordination
            task_orchestrator = get_task_orchestrator()
            orchestration_result = await task_orchestrator.orchestrate_task(
                task,
                context,
                max_parallel_tasks=max_agents,
                timeout_seconds=timeout_seconds,
            )

            # Create orchestration record
            orchestration_id = orchestration_result.orchestration_id
            orchestration_record = {
                "orchestration_id": orchestration_id,
                "task": task,
                "context": context,
                "orchestration_result": orchestration_result,
                "status": "completed" if orchestration_result.success else "failed",
                "orchestration_time": datetime.now().isoformat(),
                "completed_subtasks": orchestration_result.completed_subtasks,
                "failed_subtasks": orchestration_result.failed_subtasks,
                "total_execution_time": orchestration_result.total_execution_time,
            }

            self.active_delegations[orchestration_id] = orchestration_record

            # Format result for return
            result = {
                "action": "orchestrate_complex_task",
                "orchestration_id": orchestration_id,
                "task": task,
                "context": context,
                "status": "success" if orchestration_result.success else "failed",
                "completed_subtasks": orchestration_result.completed_subtasks,
                "failed_subtasks": orchestration_result.failed_subtasks,
                "total_execution_time": orchestration_result.total_execution_time,
                "results": orchestration_result.results,
                "aggregated_result": orchestration_result.aggregated_result,
                "errors": orchestration_result.errors,
                "performance_metrics": orchestration_result.performance_metrics,
                "next_steps": self._generate_orchestration_next_steps(
                    orchestration_result
                ),
                "timestamp": datetime.now().isoformat(),
            }

            if orchestration_result.success:
                logger.info(
                    f"✅ Complex task orchestration successful: {orchestration_id}"
                )
            else:
                logger.warning(
                    f"⚠️ Complex task orchestration had issues: {orchestration_id}"
                )

            return json.dumps(result, indent=2)

        except Exception as e:
            logger.error(f"❌ Complex task orchestration failed: {e}")
            return json.dumps(
                {
                    "action": "orchestrate_complex_task",
                    "task": task,
                    "status": "error",
                    "error": str(e),
                    "timestamp": datetime.now().isoformat(),
                }
            )

    def _generate_routing_next_steps(self, routing_result) -> str:
        """Generate next steps based on routing result."""
        if routing_result.success:
            if routing_result.primary_result:
                return f"Task successfully routed and executed. Primary result available from {routing_result.agents_used[0] if routing_result.agents_used else 'unknown agent'}."
            else:
                return "Task routed successfully but no primary result available. Check secondary results."
        else:
            if routing_result.errors:
                return f"Routing failed with errors: {', '.join(routing_result.errors[:2])}. Consider alternative agents or task decomposition."
            else:
                return "Routing failed for unknown reasons. Check agent availability and task requirements."

    def _generate_orchestration_next_steps(self, orchestration_result) -> str:
        """Generate next steps based on orchestration result."""
        if orchestration_result.success:
            if orchestration_result.aggregated_result:
                return f"Complex task orchestration completed successfully. {orchestration_result.completed_subtasks} subtasks completed. Aggregated result available."
            else:
                return f"Orchestration completed with {orchestration_result.completed_subtasks} subtasks. Individual results available but no aggregation performed."
        else:
            failed_count = orchestration_result.failed_subtasks
            completed_count = orchestration_result.completed_subtasks
            return f"Orchestration partially failed: {completed_count} completed, {failed_count} failed. Review individual subtask results and retry failed components."

    def get_agent_status(self) -> str:
        """Get real status of all agents with actual discovery.

        Returns:
            JSON string with agent status information
        """
        try:
            logger.info("📊 Getting real agent status...")

            # Get fresh agent discovery
            agents = self.discovery_service.discover_agents(force_refresh=True)
            discovery_summary = self.discovery_service.get_discovery_summary()

            # Build comprehensive status
            agent_details = []
            for agent_name, agent_info in agents.items():
                agent_details.append(
                    {
                        "name": agent_info.name,
                        "description": agent_info.description,
                        "status": agent_info.status,
                        "capabilities": agent_info.capabilities,
                        "tools": agent_info.tools,
                        "model": agent_info.model,
                        "specialization": agent_info.specialization,
                        "last_updated": agent_info.last_updated,
                    }
                )

            result = {
                "action": "get_agent_status",
                "total_agents": len(agents),
                "discoverable_agents": len(agents),
                "agents": agent_details,
                "discovery_summary": discovery_summary,
                "coordination_stats": {
                    "total_coordinations": len(self.coordination_history),
                    "active_delegations": len(self.active_delegations),
                    "last_coordination": (
                        self.coordination_history[-1]["coordination_time"]
                        if self.coordination_history
                        else None
                    ),
                },
                "status": "operational",
                "timestamp": datetime.now().isoformat(),
            }

            logger.info(f"✅ Agent status retrieved: {len(agents)} agents operational")
            return json.dumps(result, indent=2)

        except Exception as e:
            logger.error(f"❌ Failed to get agent status: {e}")
            return json.dumps(
                {
                    "action": "get_agent_status",
                    "status": "error",
                    "error": str(e),
                    "timestamp": datetime.now().isoformat(),
                }
            )

    def _select_best_agent(
        self,
        task_description: str,
        assigned_agent: str,
        available_agents: Dict[str, AgentCapability],
    ) -> Optional[AgentCapability]:
        """Select the best agent for a given task.

        Args:
            task_description: Description of the task
            assigned_agent: Specific agent requested (if any)
            available_agents: Dictionary of available agents

        Returns:
            Selected agent or None if no suitable agent found
        """
        # If specific agent requested, use it if available
        if assigned_agent and assigned_agent in available_agents:
            return available_agents[assigned_agent]

        # Analyze task to determine best agent
        task_lower = task_description.lower()

        # Task type analysis
        if any(
            keyword in task_lower
            for keyword in ["code", "execute", "run", "script", "python", "javascript"]
        ):
            # Look for code execution agent
            for agent in available_agents.values():
                if "code" in agent.name.lower() or "execution" in agent.capabilities:
                    return agent

        elif any(
            keyword in task_lower
            for keyword in [
                "data",
                "analyze",
                "visualization",
                "chart",
                "graph",
                "statistics",
            ]
        ):
            # Look for data science agent
            for agent in available_agents.values():
                if "data" in agent.name.lower() or "analysis" in agent.capabilities:
                    return agent

        elif any(
            keyword in task_lower
            for keyword in ["search", "find", "knowledge", "information", "research"]
        ):
            # Look for memory/search agent
            for agent in available_agents.values():
                if "memory" in agent.name.lower() or "search" in agent.capabilities:
                    return agent

        elif any(
            keyword in task_lower
            for keyword in ["coordinate", "manage", "orchestrate", "delegate"]
        ):
            # Look for orchestration agent (VANA)
            for agent in available_agents.values():
                if (
                    "vana" in agent.name.lower()
                    or "orchestration" in agent.capabilities
                ):
                    return agent

        # Default to VANA if available
        if "vana" in available_agents:
            return available_agents["vana"]

        # Return first available agent as fallback
        return next(iter(available_agents.values())) if available_agents else None

    def _get_selection_reasoning(
        self, task_description: str, selected_agent: AgentCapability
    ) -> str:
        """Get reasoning for agent selection.

        Args:
            task_description: Description of the task
            selected_agent: Selected agent

        Returns:
            Reasoning string
        """
        task_lower = task_description.lower()

        if "code" in task_lower and "code" in selected_agent.name.lower():
            return f"Selected {selected_agent.name} for code execution task based on specialization"
        elif "data" in task_lower and "data" in selected_agent.name.lower():
            return f"Selected {selected_agent.name} for data analysis task based on capabilities"
        elif "search" in task_lower and "memory" in selected_agent.capabilities:
            return f"Selected {selected_agent.name} for search/knowledge task based on capabilities"
        elif "vana" in selected_agent.name.lower():
            return f"Selected {selected_agent.name} as orchestration agent for general task coordination"
        else:
            return f"Selected {selected_agent.name} based on available capabilities: {', '.join(selected_agent.capabilities[:3])}"


# Global coordination service instance
_coordination_service = None


def get_coordination_service() -> AgentCoordinationService:
    """Get the global agent coordination service instance."""
    global _coordination_service
    if _coordination_service is None:
        _coordination_service = AgentCoordinationService()
    return _coordination_service


# Real coordination tool functions to replace stubs
def real_coordinate_task(task_description: str, assigned_agent: str = "") -> str:
    """Real implementation of coordinate_task tool."""
    service = get_coordination_service()
    return service.coordinate_task(task_description, assigned_agent)


def real_delegate_to_agent(agent_name: str, task: str, context: str = "") -> str:
    """Real implementation of delegate_to_agent tool."""
    service = get_coordination_service()

    # Handle async call in sync context
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            # If we're already in an async context, create a task
            import concurrent.futures

            with concurrent.futures.ThreadPoolExecutor() as executor:
                future = executor.submit(
                    asyncio.run, service.delegate_to_agent(agent_name, task, context)
                )
                return future.result(timeout=30)
        else:
            # Run in the existing loop
            return loop.run_until_complete(
                service.delegate_to_agent(agent_name, task, context)
            )
    except RuntimeError:
        # No event loop, create one
        return asyncio.run(service.delegate_to_agent(agent_name, task, context))


def real_get_agent_status() -> str:
    """Real implementation of get_agent_status tool."""
    service = get_coordination_service()
    return service.get_agent_status()


def real_intelligent_route_task(task: str, context: str = "") -> str:
    """Real implementation of intelligent task routing."""
    service = get_coordination_service()

    # Handle async call in sync context
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            # If we're already in an async context, create a task
            import concurrent.futures

            with concurrent.futures.ThreadPoolExecutor() as executor:
                future = executor.submit(
                    asyncio.run, service.intelligent_route_task(task, context)
                )
                return future.result(timeout=60)
        else:
            # Run in the existing loop
            return loop.run_until_complete(
                service.intelligent_route_task(task, context)
            )
    except RuntimeError:
        # No event loop, create one
        return asyncio.run(service.intelligent_route_task(task, context))


def real_orchestrate_complex_task(
    task: str, context: str = "", max_agents: int = 3, timeout_seconds: int = 300
) -> str:
    """Real implementation of complex task orchestration."""
    service = get_coordination_service()

    # Handle async call in sync context
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            # If we're already in an async context, create a task
            import concurrent.futures

            with concurrent.futures.ThreadPoolExecutor() as executor:
                future = executor.submit(
                    asyncio.run,
                    service.orchestrate_complex_task(
                        task, context, max_agents, timeout_seconds
                    ),
                )
                return future.result(timeout=timeout_seconds + 30)
        else:
            # Run in the existing loop
            return loop.run_until_complete(
                service.orchestrate_complex_task(
                    task, context, max_agents, timeout_seconds
                )
            )
    except RuntimeError:
        # No event loop, create one
        return asyncio.run(
            service.orchestrate_complex_task(task, context, max_agents, timeout_seconds)
        )
