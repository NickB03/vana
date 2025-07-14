"""
Tool Registry for VANA Agent System
Implements Phase 2 tool categorization and management
"""

import logging
import threading
from collections import defaultdict
from datetime import datetime
from enum import Enum
from typing import Any, Callable, Dict, List, Optional

from google.genai import types

from lib._tools.adk_tools import FunctionTool

logger = logging.getLogger(__name__)


class ToolCategory(Enum):
    """Tool categorization aligned with best practices"""

    ANALYSIS = "analysis"  # Information processing and evaluation
    EXECUTION = "execution"  # Direct actions and modifications
    INTEGRATION = "integration"  # External connections and APIs
    UTILITY = "utility"  # Support and transformation functions


class ToolMetadata:
    """Metadata for tool tracking and optimization"""

    def __init__(self, tool: FunctionTool, category: ToolCategory):
        self.tool = tool
        self.category = category
        self.usage_count = 0
        self.last_used = None
        self.success_rate = 1.0
        self.avg_execution_time = 0.0
        self.created_at = datetime.now()

    def record_usage(self, success: bool, execution_time: float):
        """Record tool usage metrics"""
        self.usage_count += 1
        self.last_used = datetime.now()

        # Update success rate with rolling average
        self.success_rate = (self.success_rate * (self.usage_count - 1) + (1.0 if success else 0.0)) / self.usage_count

        # Update average execution time
        self.avg_execution_time = (self.avg_execution_time * (self.usage_count - 1) + execution_time) / self.usage_count


class ToolRegistry:
    """
    Central registry for tool management following ADK patterns
    Implements Phase 2 tool categorization and distribution
    """

    def __init__(self):
        self.tools: Dict[str, ToolMetadata] = {}
        self.categories: Dict[ToolCategory, List[str]] = defaultdict(list)
        self._category_patterns = {
            ToolCategory.ANALYSIS: [
                "analyze",
                "scan",
                "evaluate",
                "assess",
                "inspect",
                "examine",
                "review",
                "check",
                "validate",
                "audit",
            ],
            ToolCategory.EXECUTION: [
                "run",
                "execute",
                "generate",
                "create",
                "write",
                "build",
                "deploy",
                "start",
                "stop",
                "apply",
            ],
            ToolCategory.INTEGRATION: [
                "api",
                "search",
                "fetch",
                "query",
                "connect",
                "sync",
                "pull",
                "push",
                "integrate",
                "webhook",
            ],
            ToolCategory.UTILITY: [
                "format",
                "transform",
                "convert",
                "parse",
                "encode",
                "decode",
                "compress",
                "extract",
                "filter",
                "sort",
            ],
        }

    def register_tool(self, tool: FunctionTool, category: Optional[ToolCategory]) -> None:
        """
        Register a tool with the registry

        Args:
            tool: The FunctionTool to register
            category: Optional category override, otherwise auto-detected
        """
        if tool.name in self.tools:
            logger.warning(f"Tool {tool.name} already registered, updating...")

        # Auto-detect category if not provided
        if category is None:
            category = self._detect_category(tool.name)

        # Create metadata and store
        metadata = ToolMetadata(tool, category)
        self.tools[tool.name] = metadata
        self.categories[category].append(tool.name)

        logger.info(f"Registered tool '{tool.name}' in category {category.value}")

    def _detect_category(self, tool_name: str) -> ToolCategory:
        """Auto-detect tool category based on naming patterns"""
        tool_name_lower = tool_name.lower()

        for category, patterns in self._category_patterns.items():
            for pattern in patterns:
                if pattern in tool_name_lower:
                    return category

        # Default to UTILITY if no pattern matches
        logger.warning(f"Could not detect category for tool '{tool_name}', defaulting to UTILITY")
        return ToolCategory.UTILITY

    def get_tool(self, name: str) -> Optional[FunctionTool]:
        """Get a tool by name"""
        metadata = self.tools.get(name)
        return metadata.tool if metadata else None

    def get_tools_for_category(self, category: ToolCategory) -> List[FunctionTool]:
        """Get all tools in a specific category"""
        tool_names = self.categories.get(category, [])
        return [self.tools[name].tool for name in tool_names if name in self.tools]

    def get_tools_for_agent(self, agent_type: str, max_tools: int) -> List[FunctionTool]:
        """
        Get optimal tool mix for an agent type
        Following ADK best practice of max 6 tools per agent
        """
        # Define tool distribution patterns for different agent types
        agent_patterns = {
            "security_specialist": {
                ToolCategory.ANALYSIS: 3,  # Focus on analysis
                ToolCategory.EXECUTION: 1,  # Limited execution
                ToolCategory.INTEGRATION: 1,  # API access
                ToolCategory.UTILITY: 1,  # Support functions
            },
            "architecture_specialist": {
                ToolCategory.ANALYSIS: 3,  # Heavy analysis
                ToolCategory.EXECUTION: 0,  # No direct execution
                ToolCategory.INTEGRATION: 2,  # Documentation/diagram APIs
                ToolCategory.UTILITY: 1,  # Formatting tools
            },
            "devops_specialist": {
                ToolCategory.ANALYSIS: 1,  # Basic analysis
                ToolCategory.EXECUTION: 3,  # Heavy execution
                ToolCategory.INTEGRATION: 2,  # CI/CD integrations
                ToolCategory.UTILITY: 0,  # Minimal utilities
            },
            "qa_specialist": {
                ToolCategory.ANALYSIS: 2,  # Test analysis
                ToolCategory.EXECUTION: 2,  # Test execution
                ToolCategory.INTEGRATION: 1,  # Test frameworks
                ToolCategory.UTILITY: 1,  # Result formatting
            },
            "ui_specialist": {
                ToolCategory.ANALYSIS: 2,  # Design analysis
                ToolCategory.EXECUTION: 1,  # Component generation
                ToolCategory.INTEGRATION: 2,  # Design systems
                ToolCategory.UTILITY: 1,  # Asset handling
            },
            "data_science_specialist": {
                ToolCategory.ANALYSIS: 2,  # Data analysis
                ToolCategory.EXECUTION: 2,  # Model execution
                ToolCategory.INTEGRATION: 1,  # Data sources
                ToolCategory.UTILITY: 1,  # Data transformation
            },
        }

        # Get pattern for agent type
        pattern = agent_patterns.get(
            agent_type,
            {
                # Default balanced distribution
                ToolCategory.ANALYSIS: 2,
                ToolCategory.EXECUTION: 1,
                ToolCategory.INTEGRATION: 2,
                ToolCategory.UTILITY: 1,
            },
        )

        # Collect tools based on pattern
        selected_tools = []
        for category, count in pattern.items():
            category_tools = self.get_tools_for_category(category)

            # Sort by success rate and usage to get best tools
            category_tools.sort(
                key=lambda t: (self.tools[t.name].success_rate, self.tools[t.name].usage_count), reverse=True
            )

            # Take requested number of tools
            selected_tools.extend(category_tools[:count])

        # Ensure we don't exceed max_tools
        return selected_tools[:max_tools]

    def get_registry_stats(self) -> Dict[str, Any]:
        """Get statistics about the registry"""
        stats = {"total_tools": len(self.tools), "categories": {}}

        for category in ToolCategory:
            category_tools = self.categories.get(category, [])
            stats["categories"][category.value] = {
                "count": len(category_tools),
                "tools": category_tools,
                "total_usage": sum(self.tools[name].usage_count for name in category_tools if name in self.tools),
            }

        return stats

    def optimize_tool_assignment(
        self, agent_type: str, performance_history: Optional[Dict[str, float]] = None
    ) -> List[FunctionTool]:
        """
        Optimize tool assignment based on performance history
        This is an advanced feature for Phase 4 but laying groundwork
        """
        base_tools = self.get_tools_for_agent(agent_type)

        if not performance_history:
            return base_tools

        # Score tools based on performance
        tool_scores = []
        for tool in base_tools:
            score = self.tools[tool.name].success_rate
            if tool.name in performance_history:
                # Weight recent performance more heavily
                score = (score * 0.3) + (performance_history[tool.name] * 0.7)
            tool_scores.append((tool, score))

        # Sort by score and return top tools
        tool_scores.sort(key=lambda x: x[1], reverse=True)
        return [tool for tool, _ in tool_scores[:6]]


# Singleton instance with thread safety
_registry = None
_registry_lock = threading.Lock()


def get_tool_registry() -> ToolRegistry:
    """Get the singleton tool registry instance with thread safety"""
    global _registry
    if _registry is None:
        with _registry_lock:
            # Double-check locking pattern
            if _registry is None:
                _registry = ToolRegistry()
    return _registry
