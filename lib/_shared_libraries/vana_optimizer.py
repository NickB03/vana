"""
VANA System Optimizer - Comprehensive Agent Structure Optimization

This module integrates all optimization components to provide a unified optimization system:
- Strategy-based orchestration (AGOR patterns)
- Dynamic agent management
- Tool optimization and consolidation
- Performance monitoring and analytics
- Resource optimization and scaling
- Coordination and state management

Main Integration Points:
- StrategyOrchestrator: Dynamic strategy selection
- DynamicAgentFactory: On-demand agent creation
- ToolOptimizer: Tool performance and consolidation
- CoordinationManager: AGOR-style state management
"""

import time
from dataclasses import dataclass
from typing import Any, Dict, List

from .coordination_manager import CoordinationManager
from .dynamic_agent_factory import AgentTemplate, DynamicAgentFactory
from .strategy_orchestrator import StrategyConfig, StrategyOrchestrator, StrategyType
from .tool_optimizer import ToolDefinition, ToolOptimizer


@dataclass
class OptimizationMetrics:
    """System-wide optimization metrics"""

    strategy_efficiency: float
    agent_utilization: float
    tool_performance: float
    coordination_overhead: float
    overall_score: float
    recommendations: List[str]


class VANAOptimizer:
    """
    Comprehensive VANA system optimizer

    Integrates all optimization components to provide:
    - Intelligent strategy selection and execution
    - Dynamic agent lifecycle management
    - Tool performance optimization
    - Coordination and state management
    - System-wide performance monitoring
    """

    def __init__(self, coordination_dir: str = ".vana"):
        # Initialize core optimization components
        self.strategy_orchestrator = StrategyOrchestrator()
        self.agent_factory = DynamicAgentFactory()
        self.tool_optimizer = ToolOptimizer()
        self.coordination_manager = CoordinationManager(coordination_dir)

        # System state
        self.active_strategies: Dict[str, StrategyConfig] = {}
        self.optimization_history: List[OptimizationMetrics] = []
        self.system_start_time = time.time()

        # Initialize default agent templates
        self._initialize_default_templates()

    async def optimize_task_execution(
        self, task_description: str, context: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Optimize and execute a task using the best strategy and agents

        Args:
            task_description: Description of the task to execute
            context: Additional context for optimization

        Returns:
            Dict containing execution results and optimization metrics
        """
        # Step 1: Select optimal strategy
        strategy_config = self.strategy_orchestrator.select_strategy(
            task_description, context
        )

        # Step 2: Initialize strategy coordination
        self.strategy_orchestrator.initialize_strategy(strategy_config)

        # Step 3: Get optimized agents for the strategy
        required_agents = await self._get_strategy_agents(strategy_config)

        # Step 4: Execute strategy with optimized coordination
        execution_result = await self._execute_optimized_strategy(
            strategy_config, required_agents, task_description
        )

        # Step 5: Update coordination and metrics
        await self._update_coordination_state(strategy_config, execution_result)

        return {
            "strategy": strategy_config,
            "agents_used": [a.agent_id for a in required_agents],
            "execution_result": execution_result,
            "optimization_metrics": await self._calculate_optimization_metrics(),
        }

    async def get_system_optimization_report(self) -> Dict[str, Any]:
        """Generate comprehensive system optimization report"""
        # Collect metrics from all components
        strategy_metrics = self._get_strategy_metrics()
        agent_metrics = self.agent_factory.get_agent_statistics()
        tool_metrics = self.tool_optimizer.generate_optimization_report()
        coordination_metrics = await self._get_coordination_metrics()

        # Calculate overall optimization score
        optimization_score = await self._calculate_optimization_metrics()

        report = {
            "system_overview": {
                "uptime_hours": (time.time() - self.system_start_time) / 3600,
                "active_strategies": len(self.active_strategies),
                "total_agents": agent_metrics["total_agents"],
                "total_tools": tool_metrics["summary"]["total_tools"],
                "optimization_score": optimization_score.overall_score,
            },
            "strategy_performance": strategy_metrics,
            "agent_performance": agent_metrics,
            "tool_performance": tool_metrics,
            "coordination_performance": coordination_metrics,
            "optimization_recommendations": optimization_score.recommendations,
            "historical_trends": self._get_optimization_trends(),
        }

        return report

    async def apply_optimization_recommendations(
        self, auto_apply: bool = False
    ) -> List[str]:
        """Apply system optimization recommendations"""
        applied_optimizations = []

        # Get recommendations from all components
        agent_recommendations = self.agent_factory.get_optimization_recommendations()
        tool_recommendations = self.tool_optimizer.generate_optimization_report()[
            "optimization_opportunities"
        ]

        if auto_apply:
            # Apply safe optimizations automatically
            for recommendation in agent_recommendations:
                if (
                    "reducing" in recommendation.lower()
                    and "idle" in recommendation.lower()
                ):
                    # Auto-apply idle agent cleanup
                    await self._apply_agent_optimization(recommendation)
                    applied_optimizations.append(f"Applied: {recommendation}")

            for recommendation in tool_recommendations:
                if "enable caching" in recommendation.lower():
                    # Auto-apply caching optimizations
                    await self._apply_tool_optimization(recommendation)
                    applied_optimizations.append(f"Applied: {recommendation}")

        return applied_optimizations

    def register_agent_template(self, template: AgentTemplate):
        """Register a new agent template for dynamic creation"""
        self.agent_factory.register_template(template)

    def register_tool_definition(self, tool_def: ToolDefinition):
        """Register a tool with optimization metadata"""
        self.tool_optimizer.register_tool(tool_def)

    async def _get_strategy_agents(self, strategy_config: StrategyConfig) -> List[Any]:
        """Get optimal agents for a strategy"""
        required_agents = []

        # Determine agent requirements based on strategy and domain
        if strategy_config.domain == "travel":
            agent_templates = [
                "hotel_search_agent",
                "flight_search_agent",
                "itinerary_planning_agent",
            ]
        elif strategy_config.domain == "development":
            agent_templates = [
                "code_generation_agent",
                "testing_agent",
                "documentation_agent",
            ]
        elif strategy_config.domain == "core":
            agent_templates = [
                "architecture_specialist",
                "ui_specialist",
                "devops_specialist",
            ]
        else:
            agent_templates = ["architecture_specialist"]  # Default

        # Limit agents based on strategy type
        if strategy_config.strategy_type == StrategyType.SINGLE_AGENT:
            agent_templates = agent_templates[:1]
        elif strategy_config.strategy_type == StrategyType.PARALLEL_DIVERGENT:
            agent_templates = agent_templates[: strategy_config.agent_count]

        # Get agents from factory
        for template_name in agent_templates:
            try:
                agent_instance = await self.agent_factory.get_agent(template_name)
                if agent_instance:
                    required_agents.append(agent_instance)
            except ValueError:
                # Template not found, skip
                continue

        return required_agents

    async def _execute_optimized_strategy(
        self, strategy_config: StrategyConfig, agents: List[Any], task_description: str
    ) -> Dict[str, Any]:
        """Execute strategy with optimized coordination"""
        execution_start = time.time()

        # Log strategy execution start
        await self.coordination_manager.log_agent_communication(
            "system",
            f"Starting {strategy_config.strategy_type.value} strategy for: {task_description}",
            "strategy",
        )

        # Execute based on strategy type
        if strategy_config.strategy_type == StrategyType.PIPELINE:
            result = await self._execute_pipeline_strategy(agents, task_description)
        elif strategy_config.strategy_type == StrategyType.PARALLEL_DIVERGENT:
            result = await self._execute_parallel_divergent_strategy(
                agents, task_description
            )
        elif strategy_config.strategy_type == StrategyType.SWARM:
            result = await self._execute_swarm_strategy(agents, task_description)
        else:
            result = await self._execute_single_agent_strategy(
                agents[0] if agents else None, task_description
            )

        execution_time = time.time() - execution_start

        # Release agents back to pool
        for agent in agents:
            await self.agent_factory.release_agent(agent.agent_id)

        return {
            "strategy_type": strategy_config.strategy_type.value,
            "execution_time": execution_time,
            "agents_used": len(agents),
            "result": result,
        }

    async def _execute_pipeline_strategy(
        self, agents: List[Any], task: str
    ) -> Dict[str, Any]:
        """Execute pipeline strategy - sequential handoffs"""
        results = {}
        current_input = task

        for i, agent in enumerate(agents):
            stage_result = f"Stage {i + 1} result for: {current_input}"
            results[f"stage_{i + 1}"] = stage_result
            current_input = stage_result

            # Update coordination
            await self.coordination_manager.update_agent_status(
                agent.agent_id, "working", f"Pipeline stage {i + 1}"
            )

        return {"pipeline_result": results, "final_output": current_input}

    async def _execute_parallel_divergent_strategy(
        self, agents: List[Any], task: str
    ) -> Dict[str, Any]:
        """Execute parallel divergent strategy - multiple independent solutions"""

        # Phase 1: Divergent (parallel execution)
        divergent_results = {}
        for i, agent in enumerate(agents):
            solution = f"Independent solution {i + 1} for: {task}"
            divergent_results[f"solution_{i + 1}"] = solution

            await self.coordination_manager.update_agent_status(
                agent.agent_id, "working", f"Divergent solution {i + 1}"
            )

        # Phase 2: Convergent (synthesis)
        convergent_result = (
            f"Synthesized solution combining: {', '.join(divergent_results.values())}"
        )

        return {
            "divergent_solutions": divergent_results,
            "convergent_solution": convergent_result,
        }

    async def _execute_swarm_strategy(
        self, agents: List[Any], task: str
    ) -> Dict[str, Any]:
        """Execute swarm strategy - dynamic task queue"""
        # Break task into subtasks
        subtasks = [f"Subtask {i + 1} of: {task}" for i in range(len(agents))]
        results = {}

        # Agents claim tasks dynamically
        for i, (agent, subtask) in enumerate(zip(agents, subtasks)):
            result = f"Completed {subtask}"
            results[f"subtask_{i + 1}"] = result

            await self.coordination_manager.update_agent_status(
                agent.agent_id, "working", subtask
            )

        return {
            "swarm_results": results,
            "combined_output": f"Swarm completion of: {task}",
        }

    async def _execute_single_agent_strategy(
        self, agent: Any, task: str
    ) -> Dict[str, Any]:
        """Execute single agent strategy"""
        if not agent:
            return {"error": "No agent available"}

        result = f"Single agent completion of: {task}"

        await self.coordination_manager.update_agent_status(
            agent.agent_id, "working", task
        )

        return {"single_agent_result": result}

    async def _update_coordination_state(
        self, strategy_config: StrategyConfig, execution_result: Dict[str, Any]
    ):
        """Update coordination state after strategy execution"""
        # Update session memory
        await self.coordination_manager.update_session_memory(
            f"strategy_{strategy_config.strategy_type.value}",
            execution_result,
            "strategy_execution",
        )

        # Log completion
        await self.coordination_manager.log_agent_communication(
            "system",
            f"Completed {strategy_config.strategy_type.value} strategy",
            "completion",
        )

    async def _calculate_optimization_metrics(self) -> OptimizationMetrics:
        """Calculate comprehensive optimization metrics"""
        # Get component metrics
        agent_stats = self.agent_factory.get_agent_statistics()
        tool_report = self.tool_optimizer.generate_optimization_report()

        # Calculate scores (0.0 to 1.0)
        agent_utilization = agent_stats["resource_utilization"].get(
            "task_utilization", 0.0
        )
        tool_performance = min(tool_report["summary"]["cache_hit_rate"], 1.0)
        strategy_efficiency = 0.8  # Placeholder - would calculate from strategy metrics
        coordination_overhead = (
            0.1  # Placeholder - would calculate from coordination metrics
        )

        # Overall score (weighted average)
        overall_score = (
            strategy_efficiency * 0.3
            + agent_utilization * 0.3
            + tool_performance * 0.2
            + (1.0 - coordination_overhead) * 0.2
        )

        # Generate recommendations
        recommendations = []
        if agent_utilization < 0.5:
            recommendations.append("Consider reducing agent pool size")
        if tool_performance < 0.7:
            recommendations.append("Enable caching for frequently used tools")
        if overall_score < 0.7:
            recommendations.append("System optimization needed")

        metrics = OptimizationMetrics(
            strategy_efficiency=strategy_efficiency,
            agent_utilization=agent_utilization,
            tool_performance=tool_performance,
            coordination_overhead=coordination_overhead,
            overall_score=overall_score,
            recommendations=recommendations,
        )

        # Store in history
        self.optimization_history.append(metrics)

        return metrics

    def _get_strategy_metrics(self) -> Dict[str, Any]:
        """Get strategy performance metrics"""
        return {
            "active_strategies": len(self.active_strategies),
            "strategy_types_used": list(
                set(s.strategy_type.value for s in self.active_strategies.values())
            ),
            "average_strategy_duration": 45.0,  # Placeholder
        }

    async def _get_coordination_metrics(self) -> Dict[str, Any]:
        """Get coordination performance metrics"""
        return {
            "coordination_overhead": 0.1,  # Placeholder
            "state_sync_efficiency": 0.9,  # Placeholder
            "communication_volume": 100,  # Placeholder
        }

    def _get_optimization_trends(self) -> Dict[str, Any]:
        """Get optimization trends over time"""
        if len(self.optimization_history) < 2:
            return {"trend": "insufficient_data"}

        recent = self.optimization_history[-5:]  # Last 5 measurements
        scores = [m.overall_score for m in recent]

        trend = "improving" if scores[-1] > scores[0] else "declining"

        return {
            "trend": trend,
            "score_history": scores,
            "average_score": sum(scores) / len(scores),
        }

    async def _apply_agent_optimization(self, recommendation: str):
        """Apply agent-related optimization"""
        # Placeholder for agent optimization implementation

    async def _apply_tool_optimization(self, recommendation: str):
        """Apply tool-related optimization"""
        # Placeholder for tool optimization implementation

    def _initialize_default_templates(self):
        """Initialize default agent templates"""
        # This would be populated with actual agent templates
        # For now, just placeholder templates
