"""
VANA Dynamic Agent Factory - On-Demand Agent Creation and Management

This module implements dynamic agent creation patterns inspired by AGOR and Node.js best practices:
- On-demand agent instantiation
- Agent lifecycle management
- Resource optimization and cleanup
- Agent pool management
- Specialized agent templates
- Performance monitoring and scaling

Key Features:
- Create agents only when needed
- Automatic agent cleanup and resource management
- Agent template system for rapid deployment
- Load balancing across agent instances
- Memory and performance optimization
"""

import asyncio
import gc
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional

from google.adk.agents import LlmAgent
from google.adk.tools import FunctionTool

from lib.logging_config import get_logger

logger = get_logger("vana.lib._shared_libraries.dynamic_agent_factory")


class AgentState(Enum):
    """Agent lifecycle states"""

    CREATING = "creating"
    IDLE = "idle"
    WORKING = "working"
    PAUSED = "paused"
    TERMINATING = "terminating"
    TERMINATED = "terminated"


@dataclass
class AgentTemplate:
    """Template for creating specialized agents"""

    name: str
    description: str
    instruction: str
    tools: List[FunctionTool]
    model: str
    output_key: Optional[str] = None
    specialization: str = "general"
    resource_requirements: Dict[str, Any] = field(default_factory=dict)
    max_concurrent_tasks: int = 3
    idle_timeout: int = 300  # seconds


@dataclass
class AgentInstance:
    """Runtime agent instance with lifecycle management"""

    agent_id: str
    agent: LlmAgent
    template: AgentTemplate
    state: AgentState
    created_at: float
    last_used: float
    current_tasks: List[str] = field(default_factory=list)
    total_tasks_completed: int = 0
    total_execution_time: float = 0.0


class DynamicAgentFactory:
    """
    Dynamic agent creation and lifecycle management system

    Features:
    - On-demand agent creation from templates
    - Automatic resource cleanup and optimization
    - Agent pool management with load balancing
    - Performance monitoring and scaling
    - Memory optimization and garbage collection
    """

    def __init__(self, max_agents: int = 20, cleanup_interval: int = 60):
        self.agent_templates: Dict[str, AgentTemplate] = {}
        self.active_agents: Dict[str, AgentInstance] = {}
        self.agent_pool: Dict[str, List[str]] = {}  # template_name -> [agent_ids]
        self.max_agents = max_agents
        self.cleanup_interval = cleanup_interval
        self._cleanup_task: Optional[asyncio.Task] = None
        self._agent_counter = 0

        # Start cleanup task
        self._start_cleanup_task()

    def register_template(self, template: AgentTemplate):
        """Register an agent template for dynamic creation"""
        self.agent_templates[template.name] = template
        self.agent_pool[template.name] = []

    async def get_agent(self, template_name: str, task_context: str = None) -> Optional[AgentInstance]:
        """Get an available agent instance, creating one if necessary"""
        if template_name not in self.agent_templates:
            raise ValueError(f"Unknown agent template: {template_name}")

        # Try to get an idle agent from the pool
        available_agent = await self._get_idle_agent(template_name)
        if available_agent:
            available_agent.state = AgentState.WORKING
            available_agent.last_used = time.time()
            return available_agent

        # Create new agent if under limit
        if len(self.active_agents) < self.max_agents:
            return await self._create_agent(template_name)

        # Wait for an agent to become available
        return await self._wait_for_available_agent(template_name)

    async def release_agent(self, agent_id: str, task_id: str = None):
        """Release an agent back to the pool"""
        if agent_id not in self.active_agents:
            return

        agent_instance = self.active_agents[agent_id]

        # Remove task from current tasks
        if task_id and task_id in agent_instance.current_tasks:
            agent_instance.current_tasks.remove(task_id)
            agent_instance.total_tasks_completed += 1

        # Set to idle if no more tasks
        if not agent_instance.current_tasks:
            agent_instance.state = AgentState.IDLE
            agent_instance.last_used = time.time()

    async def assign_task(self, agent_id: str, task_id: str) -> bool:
        """Assign a task to an agent"""
        if agent_id not in self.active_agents:
            return False

        agent_instance = self.active_agents[agent_id]
        template = agent_instance.template

        # Check if agent can handle more tasks
        if len(agent_instance.current_tasks) >= template.max_concurrent_tasks:
            return False

        agent_instance.current_tasks.append(task_id)
        agent_instance.state = AgentState.WORKING
        return True

    async def terminate_agent(self, agent_id: str):
        """Gracefully terminate an agent"""
        if agent_id not in self.active_agents:
            return

        agent_instance = self.active_agents[agent_id]
        agent_instance.state = AgentState.TERMINATING

        # Wait for current tasks to complete
        while agent_instance.current_tasks:
            await asyncio.sleep(0.1)

        # Remove from pools and cleanup
        template_name = agent_instance.template.name
        if agent_id in self.agent_pool.get(template_name, []):
            self.agent_pool[template_name].remove(agent_id)

        del self.active_agents[agent_id]
        agent_instance.state = AgentState.TERMINATED

        # Force garbage collection
        del agent_instance
        gc.collect()

    def get_agent_statistics(self) -> Dict[str, Any]:
        """Get comprehensive agent statistics"""
        stats = {
            "total_agents": len(self.active_agents),
            "max_agents": self.max_agents,
            "agents_by_template": {},
            "agents_by_state": {},
            "resource_utilization": {},
            "performance_metrics": {},
        }

        # Count by template
        for template_name in self.agent_templates:
            template_agents = [a for a in self.active_agents.values() if a.template.name == template_name]
            stats["agents_by_template"][template_name] = len(template_agents)

        # Count by state
        for state in AgentState:
            state_count = len([a for a in self.active_agents.values() if a.state == state])
            stats["agents_by_state"][state.value] = state_count

        # Calculate resource utilization
        total_tasks = sum(len(a.current_tasks) for a in self.active_agents.values())
        max_possible_tasks = sum(a.template.max_concurrent_tasks for a in self.active_agents.values())
        stats["resource_utilization"]["task_utilization"] = (
            total_tasks / max_possible_tasks if max_possible_tasks > 0 else 0.0
        )

        # Performance metrics
        if self.active_agents:
            avg_tasks_completed = sum(a.total_tasks_completed for a in self.active_agents.values()) / len(
                self.active_agents
            )
            avg_execution_time = sum(a.total_execution_time for a in self.active_agents.values()) / len(
                self.active_agents
            )
            stats["performance_metrics"]["avg_tasks_completed"] = avg_tasks_completed
            stats["performance_metrics"]["avg_execution_time"] = avg_execution_time

        return stats

    def get_optimization_recommendations(self) -> List[str]:
        """Get recommendations for agent pool optimization"""
        recommendations = []
        stats = self.get_agent_statistics()

        # Check for underutilized templates
        for template_name, count in stats["agents_by_template"].items():
            if count > 2:
                template_agents = [a for a in self.active_agents.values() if a.template.name == template_name]
                idle_agents = [a for a in template_agents if a.state == AgentState.IDLE]
                if len(idle_agents) > 1:
                    recommendations.append(f"Consider reducing {template_name} agents - {len(idle_agents)} idle")

        # Check for overutilization
        utilization = stats["resource_utilization"]["task_utilization"]
        if utilization > 0.8:
            recommendations.append("High resource utilization - consider increasing max_agents")
        elif utilization < 0.3:
            recommendations.append("Low resource utilization - consider reducing agent pool")

        # Check for long-running idle agents
        current_time = time.time()
        for agent_instance in self.active_agents.values():
            if (
                agent_instance.state == AgentState.IDLE
                and current_time - agent_instance.last_used > agent_instance.template.idle_timeout
            ):
                recommendations.append(f"Agent {agent_instance.agent_id} idle for too long - consider termination")

        return recommendations

    async def _get_idle_agent(self, template_name: str) -> Optional[AgentInstance]:
        """Get an idle agent from the pool"""
        pool = self.agent_pool.get(template_name, [])

        for agent_id in pool:
            if agent_id in self.active_agents:
                agent_instance = self.active_agents[agent_id]
                if agent_instance.state == AgentState.IDLE:
                    return agent_instance

        return None

    async def _create_agent(self, template_name: str) -> AgentInstance:
        """Create a new agent instance from template"""
        template = self.agent_templates[template_name]
        self._agent_counter += 1
        agent_id = f"{template_name}_{self._agent_counter}_{int(time.time())}"

        # Create the actual LlmAgent
        agent = LlmAgent(
            name=agent_id,
            model=template.model,
            description=template.description,
            instruction=template.instruction,
            tools=template.tools,
            output_key=template.output_key,
        )

        # Create agent instance wrapper
        agent_instance = AgentInstance(
            agent_id=agent_id,
            agent=agent,
            template=template,
            state=AgentState.CREATING,
            created_at=time.time(),
            last_used=time.time(),
        )

        # Add to active agents and pool
        self.active_agents[agent_id] = agent_instance
        self.agent_pool[template_name].append(agent_id)

        # Set to idle (ready for work)
        agent_instance.state = AgentState.IDLE

        return agent_instance

    async def _wait_for_available_agent(self, template_name: str, timeout: int = 30) -> Optional[AgentInstance]:
        """Wait for an agent to become available"""
        start_time = time.time()

        while time.time() - start_time < timeout:
            available_agent = await self._get_idle_agent(template_name)
            if available_agent:
                available_agent.state = AgentState.WORKING
                available_agent.last_used = time.time()
                return available_agent

            await asyncio.sleep(0.5)

        return None

    def _start_cleanup_task(self):
        """Start the background cleanup task"""
        if self._cleanup_task is None or self._cleanup_task.done():
            self._cleanup_task = asyncio.create_task(self._cleanup_loop())

    async def _cleanup_loop(self):
        """Background cleanup loop"""
        while True:
            try:
                await asyncio.sleep(self.cleanup_interval)
                await self._cleanup_idle_agents()
            except asyncio.CancelledError:
                break
            except Exception as e:
                # Log error but continue cleanup loop
                logger.error(f"Error in cleanup loop: {e}")

    async def _cleanup_idle_agents(self):
        """Clean up agents that have been idle too long"""
        current_time = time.time()
        agents_to_terminate = []

        for agent_id, agent_instance in self.active_agents.items():
            if (
                agent_instance.state == AgentState.IDLE
                and current_time - agent_instance.last_used > agent_instance.template.idle_timeout
            ):
                # Keep at least one agent per template
                template_agents = [
                    a for a in self.active_agents.values() if a.template.name == agent_instance.template.name
                ]
                if len(template_agents) > 1:
                    agents_to_terminate.append(agent_id)

        # Terminate idle agents
        for agent_id in agents_to_terminate:
            await self.terminate_agent(agent_id)

    async def shutdown(self):
        """Gracefully shutdown the factory"""
        # Cancel cleanup task
        if self._cleanup_task:
            self._cleanup_task.cancel()
            try:
                await self._cleanup_task
            except asyncio.CancelledError:
                pass

        # Terminate all agents
        agent_ids = list(self.active_agents.keys())
        for agent_id in agent_ids:
            await self.terminate_agent(agent_id)

        # Clear all data structures
        self.active_agents.clear()
        self.agent_pool.clear()

        # Force garbage collection
        gc.collect()
