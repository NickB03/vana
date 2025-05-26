"""
Third-Party Tools Integration for VANA Multi-Agent System

This module implements Google ADK Third-Party Tools pattern, enabling integration
with external tool libraries like LangChain and CrewAI tools.

Based on Google ADK documentation:
- Third-Party Tools for ecosystem integration
- Tool discovery and registration system
- Adapter pattern for external tool libraries
- Seamless integration with existing tool framework
"""

import logging
import importlib
import inspect
from typing import Dict, Any, List, Optional, Callable, Union, Type
from dataclasses import dataclass
from abc import ABC, abstractmethod
from enum import Enum

from vana_multi_agent.core.tool_standards import (
    StandardToolResponse, ToolErrorType, ErrorHandler,
    performance_monitor, InputValidator
)

# Configure logging
logger = logging.getLogger(__name__)

class ThirdPartyToolType(Enum):
    """Types of third-party tool libraries supported."""
    LANGCHAIN = "langchain"
    CREWAI = "crewai"
    LLAMAINDEX = "llamaindex"
    GENERIC = "generic"

@dataclass
class ThirdPartyToolInfo:
    """Information about a third-party tool."""
    name: str
    description: str
    tool_type: ThirdPartyToolType
    original_tool: Any
    adapter: 'ThirdPartyToolAdapter'
    parameters: Dict[str, Any]
    metadata: Dict[str, Any]

class ThirdPartyToolAdapter(ABC):
    """
    Abstract base class for third-party tool adapters.

    Provides a common interface for integrating tools from different
    external libraries into the VANA tool framework.
    """

    def __init__(self, tool_type: ThirdPartyToolType):
        """
        Initialize the adapter.

        Args:
            tool_type: Type of third-party tool library
        """
        self.tool_type = tool_type
        self.discovered_tools: Dict[str, ThirdPartyToolInfo] = {}
        self.registered_tools: Dict[str, Callable] = {}

        logger.info(f"Initialized {tool_type.value} adapter")

    @abstractmethod
    def discover_tools(self, source: Any) -> List[ThirdPartyToolInfo]:
        """
        Discover available tools from the third-party library.

        Args:
            source: Source object (module, toolkit, etc.) to discover tools from

        Returns:
            List of discovered tool information
        """
        pass

    @abstractmethod
    def adapt_tool(self, tool_info: ThirdPartyToolInfo) -> Callable:
        """
        Adapt a third-party tool to VANA's tool interface.

        Args:
            tool_info: Information about the tool to adapt

        Returns:
            Adapted tool function compatible with VANA
        """
        pass

    @abstractmethod
    def validate_tool(self, tool: Any) -> bool:
        """
        Validate that a tool is compatible with this adapter.

        Args:
            tool: Tool to validate

        Returns:
            True if tool is compatible, False otherwise
        """
        pass

    def register_tool(self, tool_info: ThirdPartyToolInfo) -> str:
        """
        Register a third-party tool with the adapter.

        Args:
            tool_info: Information about the tool to register

        Returns:
            Tool identifier for the registered tool
        """
        try:
            # Validate the tool
            if not self.validate_tool(tool_info.original_tool):
                raise ValueError(f"Tool {tool_info.name} is not compatible with {self.tool_type.value} adapter")

            # Adapt the tool
            adapted_tool = self.adapt_tool(tool_info)

            # Register the tool
            tool_id = f"{self.tool_type.value}_{tool_info.name}"
            self.discovered_tools[tool_id] = tool_info
            self.registered_tools[tool_id] = adapted_tool

            logger.info(f"Registered {self.tool_type.value} tool: {tool_info.name}")
            return tool_id

        except Exception as e:
            logger.error(f"Failed to register tool {tool_info.name}: {e}")
            raise

    def get_tool(self, tool_id: str) -> Optional[Callable]:
        """
        Get a registered tool by ID.

        Args:
            tool_id: Tool identifier

        Returns:
            Adapted tool function or None if not found
        """
        return self.registered_tools.get(tool_id)

    def list_tools(self) -> List[ThirdPartyToolInfo]:
        """
        List all discovered tools.

        Returns:
            List of tool information for all discovered tools
        """
        return list(self.discovered_tools.values())

    def get_tool_info(self, tool_id: str) -> Optional[ThirdPartyToolInfo]:
        """
        Get information about a registered tool.

        Args:
            tool_id: Tool identifier

        Returns:
            Tool information or None if not found
        """
        return self.discovered_tools.get(tool_id)

class GenericThirdPartyAdapter(ThirdPartyToolAdapter):
    """
    Generic adapter for third-party tools that don't have specific adapters.

    This adapter attempts to automatically discover and adapt tools based on
    common patterns and interfaces.
    """

    def __init__(self):
        """Initialize the generic adapter."""
        super().__init__(ThirdPartyToolType.GENERIC)

    def discover_tools(self, source: Any) -> List[ThirdPartyToolInfo]:
        """
        Discover tools from a generic source.

        Args:
            source: Source object to discover tools from

        Returns:
            List of discovered tool information
        """
        tools = []

        try:
            # Try to discover tools from common patterns
            if hasattr(source, '__dict__'):
                for name, obj in source.__dict__.items():
                    if self._is_tool_like(obj):
                        tool_info = self._create_tool_info(name, obj)
                        if tool_info:
                            tools.append(tool_info)

            # Try to discover from lists/iterables
            elif hasattr(source, '__iter__'):
                for i, obj in enumerate(source):
                    if self._is_tool_like(obj):
                        name = getattr(obj, 'name', getattr(obj, '__name__', f"tool_{i}"))
                        tool_info = self._create_tool_info(name, obj)
                        if tool_info:
                            tools.append(tool_info)

            logger.info(f"Discovered {len(tools)} generic tools")
            return tools

        except Exception as e:
            logger.error(f"Error discovering generic tools: {e}")
            return []

    def adapt_tool(self, tool_info: ThirdPartyToolInfo) -> Callable:
        """
        Adapt a generic tool to VANA's interface.

        Args:
            tool_info: Information about the tool to adapt

        Returns:
            Adapted tool function
        """
        original_tool = tool_info.original_tool

        def adapted_tool(*args, **kwargs) -> str:
            """Adapted generic tool function."""
            start_time = performance_monitor.start_execution(tool_info.name)

            try:
                # Try different execution patterns
                result = None

                # Pattern 1: Direct callable
                if callable(original_tool):
                    result = original_tool(*args, **kwargs)

                # Pattern 2: Has run method
                elif hasattr(original_tool, 'run'):
                    result = original_tool.run(*args, **kwargs)

                # Pattern 3: Has invoke method
                elif hasattr(original_tool, 'invoke'):
                    result = original_tool.invoke(*args, **kwargs)

                # Pattern 4: Has call method
                elif hasattr(original_tool, '__call__'):
                    result = original_tool(*args, **kwargs)

                else:
                    raise ValueError(f"Unable to execute tool {tool_info.name}")

                # Convert result to string
                if result is None:
                    result_str = "Tool executed successfully (no return value)"
                elif isinstance(result, str):
                    result_str = result
                else:
                    result_str = str(result)

                performance_monitor.end_execution(tool_info.name, start_time, success=True)
                return result_str

            except Exception as e:
                performance_monitor.end_execution(tool_info.name, start_time, success=False)
                logger.error(f"Error executing generic tool {tool_info.name}: {e}")
                return f"❌ Error executing tool: {str(e)}"

        # Set function metadata
        adapted_tool.__name__ = tool_info.name
        adapted_tool.__doc__ = tool_info.description

        return adapted_tool

    def validate_tool(self, tool: Any) -> bool:
        """
        Validate that a tool is compatible with the generic adapter.

        Args:
            tool: Tool to validate

        Returns:
            True if tool appears to be executable
        """
        return self._is_tool_like(tool)

    def _is_tool_like(self, obj: Any) -> bool:
        """
        Check if an object appears to be a tool.

        Args:
            obj: Object to check

        Returns:
            True if object appears to be a tool
        """
        # Check for common tool patterns
        if callable(obj):
            return True

        if hasattr(obj, 'run') and callable(getattr(obj, 'run')):
            return True

        if hasattr(obj, 'invoke') and callable(getattr(obj, 'invoke')):
            return True

        if hasattr(obj, '__call__'):
            return True

        return False

    def _create_tool_info(self, name: str, tool: Any) -> Optional[ThirdPartyToolInfo]:
        """
        Create tool information for a discovered tool.

        Args:
            name: Tool name
            tool: Tool object

        Returns:
            Tool information or None if tool is invalid
        """
        try:
            # Get description from various sources
            description = (
                getattr(tool, 'description', None) or
                getattr(tool, '__doc__', None) or
                f"Generic third-party tool: {name}"
            )

            # Get parameters if available
            parameters = {}
            if hasattr(tool, 'args_schema'):
                parameters = getattr(tool, 'args_schema', {})
            elif callable(tool):
                sig = inspect.signature(tool)
                parameters = {param.name: param.annotation for param in sig.parameters.values()}

            return ThirdPartyToolInfo(
                name=name,
                description=description,
                tool_type=ThirdPartyToolType.GENERIC,
                original_tool=tool,
                adapter=self,
                parameters=parameters,
                metadata={
                    'source_type': type(tool).__name__,
                    'has_run': hasattr(tool, 'run'),
                    'has_invoke': hasattr(tool, 'invoke'),
                    'is_callable': callable(tool)
                }
            )

        except Exception as e:
            logger.error(f"Error creating tool info for {name}: {e}")
            return None

class ThirdPartyToolRegistry:
    """
    Registry for managing third-party tool adapters and discovered tools.
    """

    def __init__(self):
        """Initialize the registry."""
        self.adapters: Dict[ThirdPartyToolType, ThirdPartyToolAdapter] = {}
        self.all_tools: Dict[str, ThirdPartyToolInfo] = {}

        # Register the generic adapter by default
        self.register_adapter(GenericThirdPartyAdapter())

        logger.info("Initialized third-party tool registry")

    def register_adapter(self, adapter: ThirdPartyToolAdapter):
        """
        Register a third-party tool adapter.

        Args:
            adapter: Adapter to register
        """
        self.adapters[adapter.tool_type] = adapter
        logger.info(f"Registered adapter for {adapter.tool_type.value}")

    def discover_tools_from_source(self, source: Any,
                                  tool_type: Optional[ThirdPartyToolType] = None) -> List[str]:
        """
        Discover and register tools from a source.

        Args:
            source: Source to discover tools from
            tool_type: Specific tool type to use, or None for auto-detection

        Returns:
            List of registered tool IDs
        """
        registered_ids = []

        # If tool type is specified, use that adapter
        if tool_type and tool_type in self.adapters:
            adapter = self.adapters[tool_type]
            tools = adapter.discover_tools(source)

            for tool_info in tools:
                try:
                    tool_id = adapter.register_tool(tool_info)
                    self.all_tools[tool_id] = tool_info
                    registered_ids.append(tool_id)
                except Exception as e:
                    logger.error(f"Failed to register tool {tool_info.name}: {e}")

        # Otherwise, try all adapters
        else:
            for adapter in self.adapters.values():
                try:
                    tools = adapter.discover_tools(source)

                    for tool_info in tools:
                        try:
                            tool_id = adapter.register_tool(tool_info)
                            self.all_tools[tool_id] = tool_info
                            registered_ids.append(tool_id)
                        except Exception as e:
                            logger.error(f"Failed to register tool {tool_info.name}: {e}")

                except Exception as e:
                    logger.debug(f"Adapter {adapter.tool_type.value} could not process source: {e}")

        logger.info(f"Discovered and registered {len(registered_ids)} tools from source")
        return registered_ids

    def get_tool(self, tool_id: str) -> Optional[Callable]:
        """
        Get a tool by ID.

        Args:
            tool_id: Tool identifier

        Returns:
            Tool function or None if not found
        """
        tool_info = self.all_tools.get(tool_id)
        if tool_info:
            return tool_info.adapter.get_tool(tool_id)
        return None

    def list_all_tools(self) -> List[ThirdPartyToolInfo]:
        """
        List all registered tools.

        Returns:
            List of all tool information
        """
        return list(self.all_tools.values())

    def get_tools_by_type(self, tool_type: ThirdPartyToolType) -> List[ThirdPartyToolInfo]:
        """
        Get tools by type.

        Args:
            tool_type: Tool type to filter by

        Returns:
            List of tools of the specified type
        """
        return [tool for tool in self.all_tools.values() if tool.tool_type == tool_type]

# Global registry instance
third_party_registry = ThirdPartyToolRegistry()

# Export key classes and functions
__all__ = [
    'ThirdPartyToolType',
    'ThirdPartyToolInfo',
    'ThirdPartyToolAdapter',
    'GenericThirdPartyAdapter',
    'ThirdPartyToolRegistry',
    'third_party_registry'
]
