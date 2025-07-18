"""
Message Router for Agent Communication

This module provides intelligent message routing between agents based on
capabilities, availability, and load balancing.
"""

import logging
import time
from datetime import datetime, timedelta
from enum import Enum
from typing import Any, Dict, List, Optional

from .agent_communication import get_communication_service
from .agent_discovery import AgentCapability, get_discovery_service

logger = logging.getLogger(__name__)


class RoutingStrategy(Enum):
    """Routing strategies for message routing."""

    CAPABILITY_BASED = "capability_based"
    ROUND_ROBIN = "round_robin"
    LEAST_LOADED = "least_loaded"
    FASTEST_RESPONSE = "fastest_response"
    SPECIFIC_AGENT = "specific_agent"


class MessageRouter:
    """Intelligent message router for agent communication."""

    def __init__(self):
        """Initialize the message router."""
        self.discovery_service = get_discovery_service()
        self.communication_service = get_communication_service()
        self.routing_history: List[Dict[str, Any]] = []
        self.agent_load: Dict[str, int] = {}
        self.agent_performance: Dict[str, Dict[str, Any]] = {}
        self.offline_agents: Dict[str, datetime] = {}
        self.message_queue: Dict[str, List[Dict[str, Any]]] = {}

    async def route_task(
        self,
        task: str,
        context: str = "",
        strategy: RoutingStrategy = RoutingStrategy.CAPABILITY_BASED,
        preferred_agent: Optional[str] = None,
        required_capabilities: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """Route a task to the most appropriate agent.

        Args:
            task: Task description
            context: Additional context
            strategy: Routing strategy to use
            preferred_agent: Preferred agent name (for SPECIFIC_AGENT strategy)
            required_capabilities: Required agent capabilities

        Returns:
            Dictionary with routing result
        """
        start_time = time.time()

        logger.info(f"🧭 Routing task with strategy {strategy.value}: {task}")

        try:
            # Get available agents
            available_agents = self.discovery_service.discover_agents()

            if not available_agents:
                return {
                    "status": "error",
                    "error": "No agents available for routing",
                    "task": task,
                    "strategy": strategy.value,
                }

            # Filter out offline agents
            online_agents = self._filter_online_agents(available_agents)

            if not online_agents:
                return {
                    "status": "error",
                    "error": "No online agents available",
                    "offline_agents": list(self.offline_agents.keys()),
                    "task": task,
                    "strategy": strategy.value,
                }

            # Select target agent based on strategy
            selected_agent = await self._select_agent(
                online_agents, task, strategy, preferred_agent, required_capabilities
            )

            if not selected_agent:
                return {
                    "status": "error",
                    "error": "No suitable agent found for task",
                    "available_agents": list(online_agents.keys()),
                    "task": task,
                    "strategy": strategy.value,
                    "required_capabilities": required_capabilities,
                }

            # Send task to selected agent
            result = await self.communication_service.send_task_to_agent(selected_agent.name, task, context)

            # Update routing history and performance metrics
            routing_time = (time.time() - start_time) * 1000
            self._update_routing_metrics(selected_agent.name, task, strategy, routing_time, result)

            # Add routing metadata to result
            result["routing_info"] = {
                "selected_agent": selected_agent.name,
                "strategy": strategy.value,
                "routing_time_ms": routing_time,
                "agent_capabilities": selected_agent.capabilities,
                "selection_reasoning": self._get_selection_reasoning(selected_agent, task, strategy),
            }

            logger.info(f"✅ Task routed to {selected_agent.name} ({routing_time:.1f}ms)")
            return result

        except Exception as e:
            logger.error(f"❌ Error routing task: {e}")
            return {
                "status": "error",
                "error": str(e),
                "task": task,
                "strategy": strategy.value,
            }

    async def route_to_multiple_agents(
        self,
        task: str,
        context: str = "",
        agent_count: int = 2,
        strategy: RoutingStrategy = RoutingStrategy.CAPABILITY_BASED,
    ) -> Dict[str, Any]:
        """Route a task to multiple agents for redundancy or comparison.

        Args:
            task: Task description
            context: Additional context
            agent_count: Number of agents to route to
            strategy: Routing strategy to use

        Returns:
            Dictionary with results from multiple agents
        """
        logger.info(f"🔀 Routing task to {agent_count} agents: {task}")

        available_agents = self.discovery_service.discover_agents()
        online_agents = self._filter_online_agents(available_agents)

        if len(online_agents) < agent_count:
            return {
                "status": "error",
                "error": f"Not enough agents available. Requested: {agent_count}, Available: {len(online_agents)}",
                "available_agents": list(online_agents.keys()),
            }

        # Select multiple agents
        selected_agents = await self._select_multiple_agents(online_agents, task, agent_count, strategy)

        # Send task to all selected agents concurrently
        tasks = []
        for agent in selected_agents:
            task_coroutine = self.communication_service.send_task_to_agent(agent.name, task, context)
            tasks.append((agent.name, task_coroutine))

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

        return {
            "status": "success",
            "results": results,
            "agent_count": len(results),
            "strategy": strategy.value,
            "task": task,
        }

    async def queue_task_for_offline_agent(
        self, agent_name: str, task: str, context: str = "", priority: str = "normal"
    ) -> Dict[str, Any]:
        """Queue a task for an offline agent.

        Args:
            agent_name: Name of the offline agent
            task: Task description
            context: Additional context
            priority: Task priority

        Returns:
            Dictionary with queuing result
        """
        if agent_name not in self.message_queue:
            self.message_queue[agent_name] = []

        queued_task = {
            "task": task,
            "context": context,
            "priority": priority,
            "queued_at": datetime.now().isoformat(),
            "task_id": f"queued_{len(self.message_queue[agent_name]) + 1}",
        }

        # Insert based on priority
        if priority == "high":
            self.message_queue[agent_name].insert(0, queued_task)
        else:
            self.message_queue[agent_name].append(queued_task)

        logger.info(f"📥 Queued task for offline agent {agent_name}: {task}")

        return {
            "status": "queued",
            "agent_name": agent_name,
            "task_id": queued_task["task_id"],
            "queue_position": len(self.message_queue[agent_name]),
            "task": task,
        }

    async def process_queued_tasks(self, agent_name: str) -> Dict[str, Any]:
        """Process queued tasks for an agent that came back online.

        Args:
            agent_name: Name of the agent

        Returns:
            Dictionary with processing results
        """
        if agent_name not in self.message_queue or not self.message_queue[agent_name]:
            return {
                "status": "no_tasks",
                "agent_name": agent_name,
                "message": "No queued tasks for agent",
            }

        queued_tasks = self.message_queue[agent_name].copy()
        self.message_queue[agent_name] = []

        logger.info(f"📤 Processing {len(queued_tasks)} queued tasks for {agent_name}")

        results = []
        for queued_task in queued_tasks:
            try:
                result = await self.communication_service.send_task_to_agent(
                    agent_name, queued_task["task"], queued_task["context"]
                )
                result["task_id"] = queued_task["task_id"]
                result["queued_at"] = queued_task["queued_at"]
                results.append(result)
            except Exception as e:
                results.append(
                    {
                        "status": "error",
                        "error": str(e),
                        "task_id": queued_task["task_id"],
                        "task": queued_task["task"],
                    }
                )

        return {
            "status": "processed",
            "agent_name": agent_name,
            "processed_count": len(results),
            "results": results,
        }

    def get_routing_stats(self) -> Dict[str, Any]:
        """Get routing statistics.

        Returns:
            Dictionary with routing statistics
        """
        return {
            "total_routes": len(self.routing_history),
            "agent_load": self.agent_load,
            "agent_performance": self.agent_performance,
            "offline_agents": {name: offline_time.isoformat() for name, offline_time in self.offline_agents.items()},
            "queued_tasks": {agent: len(tasks) for agent, tasks in self.message_queue.items()},
            "last_updated": datetime.now().isoformat(),
        }

    def _filter_online_agents(self, agents: Dict[str, AgentCapability]) -> Dict[str, AgentCapability]:
        """Filter out offline agents.

        Args:
            agents: Dictionary of all agents

        Returns:
            Dictionary of online agents only
        """
        online_agents = {}
        current_time = datetime.now()

        for name, agent in agents.items():
            # Check if agent is marked as offline
            if name in self.offline_agents:
                offline_time = self.offline_agents[name]
                # Remove from offline list if it's been offline for more than 5 minutes
                if current_time - offline_time > timedelta(minutes=5):
                    del self.offline_agents[name]
                    online_agents[name] = agent
                # Otherwise, keep it offline
            else:
                online_agents[name] = agent

        return online_agents

    async def _select_agent(
        self,
        agents: Dict[str, AgentCapability],
        task: str,
        strategy: RoutingStrategy,
        preferred_agent: Optional[str],
        required_capabilities: Optional[List[str]],
    ) -> Optional[AgentCapability]:
        """Select the best agent based on strategy.

        Args:
            agents: Available agents
            task: Task description
            strategy: Routing strategy
            preferred_agent: Preferred agent name
            required_capabilities: Required capabilities

        Returns:
            Selected agent or None
        """
        # Filter by required capabilities
        if required_capabilities:
            filtered_agents = {}
            for name, agent in agents.items():
                agent_caps = [cap.lower() for cap in agent.capabilities]
                if all(req_cap.lower() in agent_caps for req_cap in required_capabilities):
                    filtered_agents[name] = agent
            agents = filtered_agents

        if not agents:
            return None

        if strategy == RoutingStrategy.SPECIFIC_AGENT:
            return agents.get(preferred_agent) if preferred_agent else None

        elif strategy == RoutingStrategy.CAPABILITY_BASED:
            return self._select_by_capability(agents, task)

        elif strategy == RoutingStrategy.ROUND_ROBIN:
            return self._select_round_robin(agents)

        elif strategy == RoutingStrategy.LEAST_LOADED:
            return self._select_least_loaded(agents)

        elif strategy == RoutingStrategy.FASTEST_RESPONSE:
            return self._select_fastest_response(agents)

        else:
            # Default to first available
            return next(iter(agents.values()))

    async def _select_multiple_agents(
        self,
        agents: Dict[str, AgentCapability],
        task: str,
        count: int,
        strategy: RoutingStrategy,
    ) -> List[AgentCapability]:
        """Select multiple agents based on strategy.

        Args:
            agents: Available agents
            task: Task description
            count: Number of agents to select
            strategy: Routing strategy

        Returns:
            List of selected agents
        """
        if strategy == RoutingStrategy.CAPABILITY_BASED:
            # Sort by capability match and select top N
            scored_agents = []
            for agent in agents.values():
                score = self._calculate_capability_score(agent, task)
                scored_agents.append((score, agent))

            scored_agents.sort(key=lambda x: x[0], reverse=True)
            return [agent for _, agent in scored_agents[:count]]

        else:
            # For other strategies, just select first N agents
            return list(agents.values())[:count]

    def _select_by_capability(self, agents: Dict[str, AgentCapability], task: str) -> AgentCapability:
        """Select agent based on capability matching."""
        # Score agents based on capability match
        best_agent = None
        best_score = -1

        for agent in agents.values():
            score = self._calculate_capability_score(agent, task)
            if score > best_score:
                best_score = score
                best_agent = agent

        return best_agent or next(iter(agents.values()))

    def _calculate_capability_score(self, agent: AgentCapability, task: str) -> float:
        """Calculate capability match score for an agent."""
        task_lower = task.lower()
        score = 0.0

        # Check agent name relevance
        if any(keyword in agent.name.lower() for keyword in ["code", "data", "memory", "search"]):
            if any(keyword in task_lower for keyword in ["code", "data", "memory", "search"]):
                score += 2.0

        # Check capability relevance
        for capability in agent.capabilities:
            cap_lower = capability.lower()
            if any(keyword in task_lower for keyword in cap_lower.split()):
                score += 1.0

        # Check tool relevance
        for tool in agent.tools:
            tool_lower = tool.lower()
            if any(keyword in task_lower for keyword in tool_lower.split()):
                score += 0.5

        return score

    def _select_round_robin(self, agents: Dict[str, AgentCapability]) -> AgentCapability:
        """Select agent using round-robin strategy."""
        agent_names = sorted(agents.keys())

        # Find the agent with the least recent usage
        least_recent_agent = None

        for name in agent_names:
            if name not in self.agent_load:
                self.agent_load[name] = 0

            # Simple round-robin based on load count
            if self.agent_load[name] < self.agent_load.get(least_recent_agent or name, float("inf")):
                least_recent_agent = name

        return agents[least_recent_agent or agent_names[0]]

    def _select_least_loaded(self, agents: Dict[str, AgentCapability]) -> AgentCapability:
        """Select agent with the least current load."""
        least_loaded_agent = None
        min_load = float("inf")

        for name, agent in agents.items():
            current_load = self.agent_load.get(name, 0)
            if current_load < min_load:
                min_load = current_load
                least_loaded_agent = agent

        return least_loaded_agent or next(iter(agents.values()))

    def _select_fastest_response(self, agents: Dict[str, AgentCapability]) -> AgentCapability:
        """Select agent with the fastest average response time."""
        fastest_agent = None
        best_time = float("inf")

        for name, agent in agents.items():
            if name in self.agent_performance:
                avg_time = self.agent_performance[name].get("average_response_time", float("inf"))
                if avg_time < best_time:
                    best_time = avg_time
                    fastest_agent = agent

        return fastest_agent or next(iter(agents.values()))

    def _update_routing_metrics(
        self,
        agent_name: str,
        task: str,
        strategy: RoutingStrategy,
        routing_time: float,
        result: Dict[str, Any],
    ) -> None:
        """Update routing metrics and performance data."""
        # Update load
        if agent_name not in self.agent_load:
            self.agent_load[agent_name] = 0
        self.agent_load[agent_name] += 1

        # Update performance metrics
        if agent_name not in self.agent_performance:
            self.agent_performance[agent_name] = {
                "total_requests": 0,
                "successful_requests": 0,
                "average_response_time": 0.0,
                "last_request_time": None,
            }

        perf = self.agent_performance[agent_name]
        perf["total_requests"] += 1

        if result.get("status") == "success":
            perf["successful_requests"] += 1

        # Update average response time
        if "execution_time_ms" in result:
            current_avg = perf["average_response_time"]
            total_requests = perf["total_requests"]
            new_time = result["execution_time_ms"]
            perf["average_response_time"] = ((current_avg * (total_requests - 1)) + new_time) / total_requests

        perf["last_request_time"] = datetime.now().isoformat()

        # Add to routing history
        self.routing_history.append(
            {
                "timestamp": datetime.now().isoformat(),
                "agent_name": agent_name,
                "task": task[:100],  # Truncate for storage
                "strategy": strategy.value,
                "routing_time_ms": routing_time,
                "success": result.get("status") == "success",
            }
        )

        # Keep only last 1000 entries
        if len(self.routing_history) > 1000:
            self.routing_history = self.routing_history[-1000:]

    def _get_selection_reasoning(self, agent: AgentCapability, task: str, strategy: RoutingStrategy) -> str:
        """Get reasoning for agent selection."""
        if strategy == RoutingStrategy.CAPABILITY_BASED:
            score = self._calculate_capability_score(agent, task)
            return f"Selected {agent.name} based on capability match (score: {score:.1f})"
        elif strategy == RoutingStrategy.ROUND_ROBIN:
            return f"Selected {agent.name} using round-robin strategy"
        elif strategy == RoutingStrategy.LEAST_LOADED:
            load = self.agent_load.get(agent.name, 0)
            return f"Selected {agent.name} as least loaded agent (load: {load})"
        elif strategy == RoutingStrategy.FASTEST_RESPONSE:
            avg_time = self.agent_performance.get(agent.name, {}).get("average_response_time", 0)
            return f"Selected {agent.name} for fastest response time ({avg_time:.1f}ms)"
        else:
            return f"Selected {agent.name} using {strategy.value} strategy"


# Global message router instance
_message_router = None


def get_message_router() -> MessageRouter:
    """Get the global message router instance."""
    global _message_router
    if _message_router is None:
        _message_router = MessageRouter()
    return _message_router
