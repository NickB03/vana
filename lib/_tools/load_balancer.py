"""
Load Balancer for Agent Task Distribution

This module provides load balancing capabilities to distribute tasks
evenly across available agents and monitor agent capacity.
"""

import logging
import time
from collections import defaultdict
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from .agent_communication import get_communication_service
from .agent_discovery import AgentCapability, get_discovery_service

logger = logging.getLogger(__name__)


@dataclass
class AgentLoad:
    """Current load information for an agent."""

    agent_name: str
    active_tasks: int
    queued_tasks: int
    total_load: int
    capacity: int
    utilization: float
    last_task_time: Optional[str]
    average_task_duration: float
    status: str


@dataclass
class LoadBalancingDecision:
    """Result of load balancing analysis."""

    recommended_agent: str
    load_score: float
    reasoning: str
    alternative_agents: List[str]
    load_distribution: Dict[str, float]


class LoadBalancer:
    """Intelligent load balancer for agent task distribution."""

    def __init__(self):
        """Initialize the load balancer."""
        self.discovery_service = get_discovery_service()
        self.communication_service = get_communication_service()

        # Agent load tracking
        self.agent_loads: Dict[str, AgentLoad] = {}
        self.task_queue: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
        self.active_tasks: Dict[str, List[Dict[str, Any]]] = defaultdict(list)

        # Load balancing configuration
        self.default_capacity = 5  # Default concurrent tasks per agent
        self.agent_capacities = self._initialize_agent_capacities()
        self.load_update_interval = 30  # seconds
        self.last_load_update = 0

    def _initialize_agent_capacities(self) -> Dict[str, int]:
        """Initialize agent capacity configurations."""
        return {
            "vana": 10,  # Orchestration agent can handle more coordination tasks
            "code_execution": 3,  # Code execution is resource intensive
            "data_science": 2,  # Data analysis is very resource intensive
            "memory": 8,  # Memory operations are relatively lightweight
            "specialists": 4,  # Specialized tasks vary in complexity
            "workflows": 6,  # Workflow automation moderate capacity
        }

    async def get_best_agent_for_load(
        self, candidate_agents: List[str], task_priority: str = "normal"
    ) -> LoadBalancingDecision:
        """Get the best agent based on current load distribution.

        Args:
            candidate_agents: List of candidate agent names
            task_priority: Task priority (high, normal, low)

        Returns:
            LoadBalancingDecision with recommended agent
        """
        logger.info(f"⚖️ Load balancing for {len(candidate_agents)} candidate agents")

        # Update agent loads
        await self._update_agent_loads()

        if not candidate_agents:
            return LoadBalancingDecision(
                recommended_agent="vana",  # Default fallback
                load_score=0.0,
                reasoning="No candidate agents provided, defaulting to orchestration",
                alternative_agents=[],
                load_distribution={},
            )

        # Score each candidate agent
        agent_scores = {}
        load_distribution = {}

        for agent_name in candidate_agents:
            score = await self._calculate_load_score(agent_name, task_priority)
            agent_scores[agent_name] = score

            agent_load = self.agent_loads.get(agent_name)
            if agent_load:
                load_distribution[agent_name] = agent_load.utilization
            else:
                load_distribution[agent_name] = 0.0

        # Find the best agent (highest score = lowest load)
        best_agent = max(agent_scores, key=agent_scores.get)
        best_score = agent_scores[best_agent]

        # Get alternative agents
        sorted_agents = sorted(agent_scores.items(), key=lambda x: x[1], reverse=True)
        alternative_agents = [
            agent for agent, score in sorted_agents[1:4] if score > 0.3
        ]

        # Generate reasoning
        reasoning = self._generate_load_reasoning(
            best_agent, best_score, load_distribution
        )

        decision = LoadBalancingDecision(
            recommended_agent=best_agent,
            load_score=best_score,
            reasoning=reasoning,
            alternative_agents=alternative_agents,
            load_distribution=load_distribution,
        )

        logger.info(
            f"✅ Load balancing recommendation: {best_agent} (score: {best_score:.2f})"
        )
        return decision

    async def _update_agent_loads(self):
        """Update current load information for all agents."""
        current_time = time.time()

        # Only update if enough time has passed
        if current_time - self.last_load_update < self.load_update_interval:
            return

        available_agents = self.discovery_service.discover_agents()

        for agent_name, agent_info in available_agents.items():
            await self._update_single_agent_load(agent_name, agent_info)

        self.last_load_update = current_time
        logger.debug(f"🔄 Updated load information for {len(available_agents)} agents")

    async def _update_single_agent_load(
        self, agent_name: str, agent_info: AgentCapability
    ):
        """Update load information for a single agent."""
        # Get current active tasks
        active_tasks = len(self.active_tasks.get(agent_name, []))

        # Get queued tasks
        queued_tasks = len(self.task_queue.get(agent_name, []))

        # Calculate total load
        total_load = active_tasks + queued_tasks

        # Get agent capacity
        capacity = self.agent_capacities.get(agent_name, self.default_capacity)

        # Calculate utilization
        utilization = total_load / capacity if capacity > 0 else 1.0

        # Get last task time
        last_task_time = None
        if self.active_tasks.get(agent_name):
            last_task = max(
                self.active_tasks[agent_name], key=lambda x: x.get("start_time", 0)
            )
            last_task_time = last_task.get("start_time")

        # Calculate average task duration
        average_duration = await self._calculate_average_task_duration(agent_name)

        # Update agent load
        self.agent_loads[agent_name] = AgentLoad(
            agent_name=agent_name,
            active_tasks=active_tasks,
            queued_tasks=queued_tasks,
            total_load=total_load,
            capacity=capacity,
            utilization=utilization,
            last_task_time=last_task_time,
            average_task_duration=average_duration,
            status=agent_info.status,
        )

    async def _calculate_load_score(self, agent_name: str, task_priority: str) -> float:
        """Calculate load score for an agent (higher = better for load balancing)."""
        agent_load = self.agent_loads.get(agent_name)

        if not agent_load:
            # No load information, assume available
            return 0.8

        # Base score starts high and decreases with load
        base_score = 1.0

        # Penalize based on utilization
        utilization_penalty = agent_load.utilization * 0.7
        base_score -= utilization_penalty

        # Penalize if agent is at or over capacity
        if agent_load.total_load >= agent_load.capacity:
            base_score -= 0.5

        # Adjust based on agent status
        status_multipliers = {
            "active": 1.0,
            "idle": 1.1,  # Slight preference for idle agents
            "busy": 0.7,
            "offline": 0.0,
            "error": 0.2,
        }

        status_multiplier = status_multipliers.get(agent_load.status.lower(), 0.5)
        base_score *= status_multiplier

        # Adjust based on task priority
        if task_priority == "high":
            # For high priority, prefer less loaded agents more strongly
            base_score *= 1.0 - agent_load.utilization * 0.5
        elif task_priority == "low":
            # For low priority, more tolerant of loaded agents
            base_score *= 1.0 - agent_load.utilization * 0.3

        # Consider average task duration
        if agent_load.average_task_duration > 60:  # Long-running tasks
            base_score *= 0.9  # Slight penalty for agents with long-running tasks

        return max(0.0, min(1.0, base_score))

    async def _calculate_average_task_duration(self, agent_name: str) -> float:
        """Calculate average task duration for an agent."""
        # This would typically use historical data from performance tracker
        # For now, return a default based on agent type
        default_durations = {
            "vana": 15.0,
            "code_execution": 30.0,
            "data_science": 60.0,
            "memory": 5.0,
            "specialists": 45.0,
            "workflows": 20.0,
        }

        return default_durations.get(agent_name, 20.0)

    def _generate_load_reasoning(
        self, agent_name: str, score: float, load_distribution: Dict[str, float]
    ) -> str:
        """Generate reasoning for load balancing decision."""
        agent_load = self.agent_loads.get(agent_name)

        reasoning_parts = []
        reasoning_parts.append(f"Selected {agent_name} for optimal load distribution")

        if agent_load:
            reasoning_parts.append(f"Current utilization: {agent_load.utilization:.1%}")
            reasoning_parts.append(
                f"Active tasks: {agent_load.active_tasks}/{agent_load.capacity}"
            )

            if agent_load.utilization < 0.5:
                reasoning_parts.append("Low utilization - good availability")
            elif agent_load.utilization < 0.8:
                reasoning_parts.append("Moderate utilization - acceptable load")
            else:
                reasoning_parts.append("High utilization - consider alternatives")

        # Add comparison with other agents
        if load_distribution:
            avg_utilization = sum(load_distribution.values()) / len(load_distribution)
            agent_utilization = load_distribution.get(agent_name, 0.0)

            if agent_utilization < avg_utilization:
                reasoning_parts.append("Below average load compared to alternatives")
            elif agent_utilization > avg_utilization:
                reasoning_parts.append("Above average load but still best option")

        return ". ".join(reasoning_parts)

    async def register_task_start(
        self, agent_name: str, task_id: str, task_info: Dict[str, Any]
    ):
        """Register that a task has started on an agent."""
        task_record = {
            "task_id": task_id,
            "start_time": time.time(),
            "task_info": task_info,
        }

        self.active_tasks[agent_name].append(task_record)

        # Remove from queue if it was queued
        self.task_queue[agent_name] = [
            task
            for task in self.task_queue[agent_name]
            if task.get("task_id") != task_id
        ]

        logger.debug(f"📝 Registered task start: {task_id} on {agent_name}")

    async def register_task_completion(
        self, agent_name: str, task_id: str, success: bool
    ):
        """Register that a task has completed on an agent."""
        # Remove from active tasks
        self.active_tasks[agent_name] = [
            task
            for task in self.active_tasks[agent_name]
            if task.get("task_id") != task_id
        ]

        logger.debug(
            f"✅ Registered task completion: {task_id} on {agent_name} (success: {success})"
        )

    async def queue_task(
        self,
        agent_name: str,
        task_id: str,
        task_info: Dict[str, Any],
        priority: str = "normal",
    ):
        """Queue a task for an agent."""
        task_record = {
            "task_id": task_id,
            "queue_time": time.time(),
            "task_info": task_info,
            "priority": priority,
        }

        # Insert based on priority
        if priority == "high":
            self.task_queue[agent_name].insert(0, task_record)
        else:
            self.task_queue[agent_name].append(task_record)

        logger.debug(
            f"📥 Queued task: {task_id} for {agent_name} (priority: {priority})"
        )

    def get_load_statistics(self) -> Dict[str, Any]:
        """Get comprehensive load statistics."""
        if not self.agent_loads:
            return {"message": "No load data available"}

        total_capacity = sum(load.capacity for load in self.agent_loads.values())
        total_active_tasks = sum(
            load.active_tasks for load in self.agent_loads.values()
        )
        total_queued_tasks = sum(
            load.queued_tasks for load in self.agent_loads.values()
        )

        # Calculate system utilization
        system_utilization = (
            total_active_tasks / total_capacity if total_capacity > 0 else 0
        )

        # Find most and least loaded agents
        most_loaded = max(self.agent_loads.values(), key=lambda x: x.utilization)
        least_loaded = min(self.agent_loads.values(), key=lambda x: x.utilization)

        # Agent load details
        agent_details = {}
        for agent_name, load in self.agent_loads.items():
            agent_details[agent_name] = {
                "utilization": load.utilization,
                "active_tasks": load.active_tasks,
                "queued_tasks": load.queued_tasks,
                "capacity": load.capacity,
                "status": load.status,
            }

        return {
            "system_overview": {
                "total_capacity": total_capacity,
                "total_active_tasks": total_active_tasks,
                "total_queued_tasks": total_queued_tasks,
                "system_utilization": system_utilization,
                "agents_count": len(self.agent_loads),
            },
            "load_distribution": {
                "most_loaded_agent": {
                    "name": most_loaded.agent_name,
                    "utilization": most_loaded.utilization,
                },
                "least_loaded_agent": {
                    "name": least_loaded.agent_name,
                    "utilization": least_loaded.utilization,
                },
            },
            "agent_details": agent_details,
            "recommendations": self._generate_load_recommendations(),
        }

    def _generate_load_recommendations(self) -> List[str]:
        """Generate load balancing recommendations."""
        recommendations = []

        if not self.agent_loads:
            return ["No load data available for recommendations"]

        # Check for overloaded agents
        overloaded_agents = [
            load for load in self.agent_loads.values() if load.utilization > 0.9
        ]

        if overloaded_agents:
            agent_names = [agent.agent_name for agent in overloaded_agents]
            recommendations.append(
                f"Agents overloaded (>90%): {', '.join(agent_names)}"
            )
            recommendations.append(
                "Consider increasing capacity or redistributing tasks"
            )

        # Check for underutilized agents
        underutilized_agents = [
            load
            for load in self.agent_loads.values()
            if load.utilization < 0.2 and load.status.lower() == "active"
        ]

        if underutilized_agents:
            agent_names = [agent.agent_name for agent in underutilized_agents]
            recommendations.append(
                f"Agents underutilized (<20%): {', '.join(agent_names)}"
            )
            recommendations.append("Consider routing more tasks to these agents")

        # Check for queued tasks
        total_queued = sum(load.queued_tasks for load in self.agent_loads.values())
        if total_queued > 10:
            recommendations.append(f"High queue volume ({total_queued} tasks)")
            recommendations.append("Consider scaling up agent capacity")

        # System utilization recommendations
        system_utilization = sum(
            load.active_tasks for load in self.agent_loads.values()
        ) / sum(load.capacity for load in self.agent_loads.values())

        if system_utilization > 0.8:
            recommendations.append("System utilization high (>80%)")
            recommendations.append(
                "Monitor performance and consider capacity expansion"
            )
        elif system_utilization < 0.3:
            recommendations.append("System utilization low (<30%)")
            recommendations.append("System has good capacity for additional load")

        return (
            recommendations
            if recommendations
            else ["Load distribution appears optimal"]
        )

    async def rebalance_tasks(self) -> Dict[str, Any]:
        """Attempt to rebalance tasks across agents."""
        logger.info("🔄 Starting task rebalancing")

        rebalancing_actions = []

        # Find overloaded and underloaded agents
        overloaded = [
            load for load in self.agent_loads.values() if load.utilization > 0.8
        ]
        underloaded = [
            load for load in self.agent_loads.values() if load.utilization < 0.4
        ]

        # Move queued tasks from overloaded to underloaded agents
        for overloaded_agent in overloaded:
            if not self.task_queue[overloaded_agent.agent_name]:
                continue

            for underloaded_agent in underloaded:
                if not self.task_queue[overloaded_agent.agent_name]:
                    break

                # Move one task
                task = self.task_queue[overloaded_agent.agent_name].pop(0)
                self.task_queue[underloaded_agent.agent_name].append(task)

                rebalancing_actions.append(
                    {
                        "action": "moved_queued_task",
                        "task_id": task["task_id"],
                        "from_agent": overloaded_agent.agent_name,
                        "to_agent": underloaded_agent.agent_name,
                    }
                )

        logger.info(
            f"✅ Rebalancing completed: {len(rebalancing_actions)} actions taken"
        )

        return {
            "rebalancing_completed": True,
            "actions_taken": len(rebalancing_actions),
            "actions": rebalancing_actions,
        }


# Global load balancer instance
_load_balancer = None


def get_load_balancer() -> LoadBalancer:
    """Get the global load balancer instance."""
    global _load_balancer
    if _load_balancer is None:
        _load_balancer = LoadBalancer()
    return _load_balancer
