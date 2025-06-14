"""
VANA Tool Optimizer - Intelligent Tool Management and Optimization

This module implements advanced tool optimization patterns inspired by Node.js best practices:
- Tool consolidation and deduplication
- Dynamic tool discovery and registration
- Performance monitoring and caching
- Tool inheritance and composition patterns
- Intelligent tool selection based on context

Key Optimizations:
- Reduce tool duplication across agents
- Implement tool caching for performance
- Add tool usage analytics and optimization
- Create tool inheritance hierarchies
- Enable dynamic tool loading and unloading
"""

import asyncio
import time
from typing import Dict, List, Optional, Any, Callable, Set
from dataclasses import dataclass, field
from collections import defaultdict
from functools import wraps
import inspect
import json
from pathlib import Path


@dataclass
class ToolMetrics:
    """Tool usage and performance metrics"""
    tool_name: str
    usage_count: int = 0
    total_execution_time: float = 0.0
    average_execution_time: float = 0.0
    success_rate: float = 1.0
    last_used: Optional[str] = None
    error_count: int = 0
    cache_hits: int = 0
    cache_misses: int = 0


@dataclass
class ToolDefinition:
    """Enhanced tool definition with optimization metadata"""
    name: str
    function: Callable
    description: str
    category: str  # "core", "domain", "utility", "integration"
    dependencies: List[str] = field(default_factory=list)
    cache_enabled: bool = False
    cache_ttl: int = 300  # seconds
    priority: int = 1  # 1=high, 2=medium, 3=low
    agent_compatibility: Set[str] = field(default_factory=set)
    performance_threshold: float = 5.0  # seconds


class ToolOptimizer:
    """
    Advanced tool optimization and management system

    Features:
    - Tool consolidation and deduplication
    - Performance monitoring and optimization
    - Intelligent caching with TTL
    - Dynamic tool discovery and loading
    - Usage analytics and recommendations
    """

    def __init__(self):
        self.tools: Dict[str, ToolDefinition] = {}
        self.metrics: Dict[str, ToolMetrics] = {}
        self.tool_cache: Dict[str, Dict[str, Any]] = {}
        self.cache_timestamps: Dict[str, float] = {}
        self.tool_categories: Dict[str, List[str]] = defaultdict(list)
        self.agent_tool_assignments: Dict[str, Set[str]] = defaultdict(set)

    def register_tool(self, tool_def: ToolDefinition):
        """Register a tool with optimization metadata"""
        self.tools[tool_def.name] = tool_def
        self.metrics[tool_def.name] = ToolMetrics(tool_name=tool_def.name)
        self.tool_categories[tool_def.category].append(tool_def.name)

        # Assign to compatible agents
        for agent_id in tool_def.agent_compatibility:
            self.agent_tool_assignments[agent_id].add(tool_def.name)

    def optimize_tool_function(self, tool_name: str):
        """Decorator to add optimization features to tool functions"""
        def decorator(func):
            @wraps(func)
            async def wrapper(*args, **kwargs):
                start_time = time.time()

                # Check cache if enabled
                if self.tools[tool_name].cache_enabled:
                    cache_key = self._generate_cache_key(tool_name, args, kwargs)
                    cached_result = self._get_cached_result(tool_name, cache_key)
                    if cached_result is not None:
                        self.metrics[tool_name].cache_hits += 1
                        return cached_result
                    else:
                        self.metrics[tool_name].cache_misses += 1

                try:
                    # Execute the tool function
                    if asyncio.iscoroutinefunction(func):
                        result = await func(*args, **kwargs)
                    else:
                        result = func(*args, **kwargs)

                    # Update metrics
                    execution_time = time.time() - start_time
                    self._update_metrics(tool_name, execution_time, success=True)

                    # Cache result if enabled
                    if self.tools[tool_name].cache_enabled:
                        self._cache_result(tool_name, cache_key, result)

                    return result

                except Exception as e:
                    # Update error metrics
                    execution_time = time.time() - start_time
                    self._update_metrics(tool_name, execution_time, success=False)
                    raise e

            return wrapper
        return decorator

    def get_optimized_tool_set(self, agent_id: str, task_context: str = None) -> List[str]:
        """Get optimized tool set for an agent based on usage patterns and context"""
        # Start with agent's assigned tools
        base_tools = self.agent_tool_assignments.get(agent_id, set())

        # Add high-priority tools
        priority_tools = {name for name, tool in self.tools.items()
                         if tool.priority == 1}

        # Add context-relevant tools
        context_tools = self._get_context_relevant_tools(task_context) if task_context else set()

        # Combine and optimize
        all_tools = base_tools | priority_tools | context_tools

        # Remove low-performing tools
        optimized_tools = self._filter_low_performing_tools(all_tools)

        # Sort by performance and usage
        return self._sort_tools_by_performance(optimized_tools)

    def get_tool_recommendations(self, agent_id: str) -> Dict[str, Any]:
        """Get tool optimization recommendations for an agent"""
        agent_tools = self.agent_tool_assignments.get(agent_id, set())

        recommendations = {
            "underused_tools": [],
            "slow_tools": [],
            "cache_candidates": [],
            "redundant_tools": [],
            "missing_tools": []
        }

        for tool_name in agent_tools:
            metrics = self.metrics.get(tool_name)
            tool_def = self.tools.get(tool_name)

            if not metrics or not tool_def:
                continue

            # Check for underused tools
            if metrics.usage_count < 5:
                recommendations["underused_tools"].append(tool_name)

            # Check for slow tools
            if metrics.average_execution_time > tool_def.performance_threshold:
                recommendations["slow_tools"].append({
                    "tool": tool_name,
                    "avg_time": metrics.average_execution_time,
                    "threshold": tool_def.performance_threshold
                })

            # Check for cache candidates
            if (not tool_def.cache_enabled and
                metrics.usage_count > 10 and
                metrics.average_execution_time > 1.0):
                recommendations["cache_candidates"].append(tool_name)

        return recommendations

    def consolidate_duplicate_tools(self) -> Dict[str, List[str]]:
        """Identify and consolidate duplicate or similar tools"""
        duplicates = defaultdict(list)

        # Group tools by similar functionality (simple heuristic)
        for tool_name, tool_def in self.tools.items():
            # Use first word of description as grouping key
            group_key = tool_def.description.split()[0].lower() if tool_def.description else "unknown"
            duplicates[group_key].append(tool_name)

        # Filter to only groups with multiple tools
        return {k: v for k, v in duplicates.items() if len(v) > 1}

    def generate_optimization_report(self) -> Dict[str, Any]:
        """Generate comprehensive tool optimization report"""
        total_tools = len(self.tools)
        total_usage = sum(m.usage_count for m in self.metrics.values())

        report = {
            "summary": {
                "total_tools": total_tools,
                "total_usage": total_usage,
                "cache_hit_rate": self._calculate_cache_hit_rate(),
                "average_performance": self._calculate_average_performance()
            },
            "top_performing_tools": self._get_top_performing_tools(5),
            "underperforming_tools": self._get_underperforming_tools(5),
            "most_used_tools": self._get_most_used_tools(5),
            "least_used_tools": self._get_least_used_tools(5),
            "duplicate_candidates": self.consolidate_duplicate_tools(),
            "optimization_opportunities": self._identify_optimization_opportunities()
        }

        return report

    def _generate_cache_key(self, tool_name: str, args: tuple, kwargs: dict) -> str:
        """Generate cache key for tool execution"""
        # Simple cache key generation - can be enhanced
        key_data = f"{tool_name}:{str(args)}:{str(sorted(kwargs.items()))}"
        return str(hash(key_data))

    def _get_cached_result(self, tool_name: str, cache_key: str) -> Any:
        """Get cached result if valid"""
        if tool_name not in self.tool_cache:
            return None

        if cache_key not in self.tool_cache[tool_name]:
            return None

        # Check TTL
        timestamp_key = f"{tool_name}:{cache_key}"
        if timestamp_key in self.cache_timestamps:
            ttl = self.tools[tool_name].cache_ttl
            if time.time() - self.cache_timestamps[timestamp_key] > ttl:
                # Cache expired
                del self.tool_cache[tool_name][cache_key]
                del self.cache_timestamps[timestamp_key]
                return None

        return self.tool_cache[tool_name][cache_key]

    def _cache_result(self, tool_name: str, cache_key: str, result: Any):
        """Cache tool execution result"""
        if tool_name not in self.tool_cache:
            self.tool_cache[tool_name] = {}

        self.tool_cache[tool_name][cache_key] = result
        self.cache_timestamps[f"{tool_name}:{cache_key}"] = time.time()

    def _update_metrics(self, tool_name: str, execution_time: float, success: bool):
        """Update tool performance metrics"""
        metrics = self.metrics[tool_name]
        metrics.usage_count += 1
        metrics.total_execution_time += execution_time
        metrics.average_execution_time = metrics.total_execution_time / metrics.usage_count
        metrics.last_used = time.strftime("%Y-%m-%d %H:%M:%S")

        if not success:
            metrics.error_count += 1

        metrics.success_rate = (metrics.usage_count - metrics.error_count) / metrics.usage_count

    def _get_context_relevant_tools(self, context: str) -> Set[str]:
        """Get tools relevant to the given context"""
        relevant_tools = set()
        context_lower = context.lower()

        for tool_name, tool_def in self.tools.items():
            if any(keyword in context_lower for keyword in tool_def.description.lower().split()):
                relevant_tools.add(tool_name)

        return relevant_tools

    def _filter_low_performing_tools(self, tools: Set[str]) -> Set[str]:
        """Filter out consistently low-performing tools"""
        filtered = set()

        for tool_name in tools:
            metrics = self.metrics.get(tool_name)
            if not metrics:
                filtered.add(tool_name)
                continue

            # Keep tools with good success rate and reasonable performance
            if metrics.success_rate >= 0.8 and metrics.usage_count > 0:
                filtered.add(tool_name)

        return filtered

    def _sort_tools_by_performance(self, tools: Set[str]) -> List[str]:
        """Sort tools by performance metrics"""
        def performance_score(tool_name: str) -> float:
            metrics = self.metrics.get(tool_name)
            if not metrics or metrics.usage_count == 0:
                return 0.0

            # Combine success rate, usage, and speed
            speed_score = 1.0 / (metrics.average_execution_time + 0.1)
            usage_score = min(metrics.usage_count / 100.0, 1.0)

            return metrics.success_rate * speed_score * usage_score

        return sorted(tools, key=performance_score, reverse=True)

    def _calculate_cache_hit_rate(self) -> float:
        """Calculate overall cache hit rate"""
        total_hits = sum(m.cache_hits for m in self.metrics.values())
        total_requests = sum(m.cache_hits + m.cache_misses for m in self.metrics.values())

        return total_hits / total_requests if total_requests > 0 else 0.0

    def _calculate_average_performance(self) -> float:
        """Calculate average tool performance"""
        times = [m.average_execution_time for m in self.metrics.values() if m.usage_count > 0]
        return sum(times) / len(times) if times else 0.0

    def _get_top_performing_tools(self, limit: int) -> List[Dict[str, Any]]:
        """Get top performing tools"""
        tools_with_scores = []

        for tool_name, metrics in self.metrics.items():
            if metrics.usage_count > 0:
                score = metrics.success_rate / (metrics.average_execution_time + 0.1)
                tools_with_scores.append({
                    "tool": tool_name,
                    "score": score,
                    "success_rate": metrics.success_rate,
                    "avg_time": metrics.average_execution_time
                })

        return sorted(tools_with_scores, key=lambda x: x["score"], reverse=True)[:limit]

    def _get_underperforming_tools(self, limit: int) -> List[Dict[str, Any]]:
        """Get underperforming tools"""
        tools_with_scores = []

        for tool_name, metrics in self.metrics.items():
            if metrics.usage_count > 0:
                score = metrics.success_rate / (metrics.average_execution_time + 0.1)
                tools_with_scores.append({
                    "tool": tool_name,
                    "score": score,
                    "success_rate": metrics.success_rate,
                    "avg_time": metrics.average_execution_time
                })

        return sorted(tools_with_scores, key=lambda x: x["score"])[:limit]

    def _get_most_used_tools(self, limit: int) -> List[Dict[str, Any]]:
        """Get most used tools"""
        return sorted([
            {"tool": name, "usage_count": metrics.usage_count}
            for name, metrics in self.metrics.items()
        ], key=lambda x: x["usage_count"], reverse=True)[:limit]

    def _get_least_used_tools(self, limit: int) -> List[Dict[str, Any]]:
        """Get least used tools"""
        return sorted([
            {"tool": name, "usage_count": metrics.usage_count}
            for name, metrics in self.metrics.items()
        ], key=lambda x: x["usage_count"])[:limit]

    def _identify_optimization_opportunities(self) -> List[str]:
        """Identify specific optimization opportunities"""
        opportunities = []

        # Check for tools that could benefit from caching
        for tool_name, tool_def in self.tools.items():
            metrics = self.metrics.get(tool_name)
            if (not tool_def.cache_enabled and
                metrics and metrics.usage_count > 10 and
                metrics.average_execution_time > 1.0):
                opportunities.append(f"Enable caching for {tool_name}")

        # Check for duplicate tools
        duplicates = self.consolidate_duplicate_tools()
        for group, tools in duplicates.items():
            if len(tools) > 1:
                opportunities.append(f"Consolidate duplicate tools in {group}: {', '.join(tools)}")

        return opportunities
