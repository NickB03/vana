"""
LangChain Tools Integration for VANA Multi-Agent System

This module provides integration with LangChain tools, enabling VANA agents
to use the extensive LangChain tool ecosystem.

Based on LangChain documentation patterns:
- Tool discovery from LangChain modules and toolkits
- Adapter for LangChain Tool interface
- Integration with VANA tool framework
"""

import importlib
import logging
from typing import Any, Callable, List, Optional

from lib._shared_libraries.tool_standards import performance_monitor
from lib._tools.third_party_tools import (
    ThirdPartyToolAdapter,
    ThirdPartyToolInfo,
    ThirdPartyToolType,
)

# Configure logging
logger = logging.getLogger(__name__)


class LangChainToolAdapter(ThirdPartyToolAdapter):
    """
    Adapter for integrating LangChain tools into VANA.

    Supports various LangChain tool patterns:
    - BaseTool subclasses
    - Function tools created with @tool decorator
    - Tools from toolkits
    - Tools loaded via load_tools()
    """

    def __init__(self):
        """Initialize the LangChain adapter."""
        super().__init__(ThirdPartyToolType.LANGCHAIN)

        # Try to import LangChain components
        self.langchain_available = self._check_langchain_availability()

        if self.langchain_available:
            logger.info("LangChain integration available")
        else:
            logger.warning(
                "LangChain not available - install with: pip install langchain langchain-community"
            )

    def _check_langchain_availability(self) -> bool:
        """
        Check if LangChain is available.

        Returns:
            True if LangChain is available, False otherwise
        """
        try:
            pass

            return True
        except ImportError:
            return False

    def discover_tools(self, source: Any) -> List[ThirdPartyToolInfo]:
        """
        Discover LangChain tools from various sources.

        Args:
            source: Source to discover tools from (module, toolkit, list, etc.)

        Returns:
            List of discovered LangChain tools
        """
        if not self.langchain_available:
            logger.warning("LangChain not available for tool discovery")
            return []

        tools = []

        try:
            # Import LangChain components
            pass

            # Pattern 1: Single LangChain tool
            if self._is_langchain_tool(source):
                tool_info = self._create_langchain_tool_info(source)
                if tool_info:
                    tools.append(tool_info)

            # Pattern 2: List of tools
            elif isinstance(source, (list, tuple)):
                for i, tool in enumerate(source):
                    if self._is_langchain_tool(tool):
                        tool_info = self._create_langchain_tool_info(tool)
                        if tool_info:
                            tools.append(tool_info)

            # Pattern 3: Toolkit with get_tools() method
            elif hasattr(source, "get_tools") and callable(
                getattr(source, "get_tools")
            ):
                try:
                    toolkit_tools = source.get_tools()
                    for tool in toolkit_tools:
                        if self._is_langchain_tool(tool):
                            tool_info = self._create_langchain_tool_info(tool)
                            if tool_info:
                                tools.append(tool_info)
                except Exception as e:
                    logger.error(f"Error getting tools from toolkit: {e}")

            # Pattern 4: Module with tool attributes
            elif hasattr(source, "__dict__"):
                for name, obj in source.__dict__.items():
                    if self._is_langchain_tool(obj):
                        tool_info = self._create_langchain_tool_info(obj)
                        if tool_info:
                            tools.append(tool_info)

            logger.info(f"Discovered {len(tools)} LangChain tools")
            return tools

        except Exception as e:
            logger.error(f"Error discovering LangChain tools: {e}")
            return []

    def adapt_tool(self, tool_info: ThirdPartyToolInfo) -> Callable:
        """
        Adapt a LangChain tool to VANA's interface.

        Args:
            tool_info: Information about the LangChain tool

        Returns:
            Adapted tool function
        """
        langchain_tool = tool_info.original_tool

        def adapted_langchain_tool(*args, **kwargs) -> str:
            """Adapted LangChain tool function."""
            start_time = performance_monitor.start_execution(tool_info.name)

            try:
                # Convert positional args to kwargs if needed
                if args and not kwargs:
                    # For single argument tools, use the first arg as input
                    if len(args) == 1:
                        if hasattr(langchain_tool, "args_schema"):
                            # Get the first field name from the schema
                            schema = langchain_tool.args_schema
                            if hasattr(schema, "__fields__"):
                                field_names = list(schema.__fields__.keys())
                                if field_names:
                                    kwargs[field_names[0]] = args[0]
                        else:
                            # Default to 'query' or 'input'
                            kwargs["query"] = args[0]

                # Execute the LangChain tool
                if hasattr(langchain_tool, "invoke"):
                    # Use invoke method (preferred for newer LangChain versions)
                    result = langchain_tool.invoke(kwargs)
                elif hasattr(langchain_tool, "run"):
                    # Use run method (older LangChain versions)
                    if kwargs:
                        result = langchain_tool.run(**kwargs)
                    else:
                        result = langchain_tool.run(*args)
                elif callable(langchain_tool):
                    # Direct callable
                    result = langchain_tool(*args, **kwargs)
                else:
                    raise ValueError(
                        f"Unable to execute LangChain tool {tool_info.name}"
                    )

                # Convert result to string
                if result is None:
                    result_str = (
                        "LangChain tool executed successfully (no return value)"
                    )
                elif isinstance(result, str):
                    result_str = result
                elif isinstance(result, dict):
                    # Format dict results nicely
                    result_str = "\n".join([f"**{k}**: {v}" for k, v in result.items()])
                elif isinstance(result, (list, tuple)):
                    # Format list results
                    result_str = "\n".join([f"• {item}" for item in result])
                else:
                    result_str = str(result)

                performance_monitor.end_execution(
                    tool_info.name, start_time, success=True
                )
                return f"🔧 **LangChain Tool Result**:\n\n{result_str}"

            except Exception as e:
                performance_monitor.end_execution(
                    tool_info.name, start_time, success=False
                )
                logger.error(f"Error executing LangChain tool {tool_info.name}: {e}")
                return f"❌ Error executing LangChain tool: {str(e)}"

        # Set function metadata
        adapted_langchain_tool.__name__ = tool_info.name
        adapted_langchain_tool.__doc__ = tool_info.description

        return adapted_langchain_tool

    def validate_tool(self, tool: Any) -> bool:
        """
        Validate that a tool is a LangChain tool.

        Args:
            tool: Tool to validate

        Returns:
            True if tool is a LangChain tool
        """
        return self._is_langchain_tool(tool)

    def _is_langchain_tool(self, obj: Any) -> bool:
        """
        Check if an object is a LangChain tool.

        Args:
            obj: Object to check

        Returns:
            True if object is a LangChain tool
        """
        if not self.langchain_available:
            return False

        try:
            from langchain_core.tools import BaseTool

            # Check if it's a BaseTool instance
            if isinstance(obj, BaseTool):
                return True

            # Check if it has LangChain tool attributes
            if (
                hasattr(obj, "name")
                and hasattr(obj, "description")
                and (hasattr(obj, "run") or hasattr(obj, "invoke"))
            ):
                return True

            # Check for function tools (have __name__ and specific attributes)
            if (
                hasattr(obj, "__name__")
                and hasattr(obj, "description")
                and hasattr(obj, "args_schema")
            ):
                return True

            return False

        except Exception:
            return False

    def _create_langchain_tool_info(self, tool: Any) -> Optional[ThirdPartyToolInfo]:
        """
        Create tool information for a LangChain tool.

        Args:
            tool: LangChain tool

        Returns:
            Tool information or None if invalid
        """
        try:
            # Get tool name
            name = getattr(tool, "name", getattr(tool, "__name__", "unknown_tool"))

            # Get tool description
            description = (
                getattr(tool, "description", None)
                or getattr(tool, "__doc__", None)
                or f"LangChain tool: {name}"
            )

            # Get parameters from args_schema if available
            parameters = {}
            if hasattr(tool, "args_schema") and tool.args_schema:
                try:
                    schema = tool.args_schema
                    if hasattr(schema, "__fields__"):
                        # Pydantic v1 style
                        parameters = {
                            field_name: {
                                "type": field.type_,
                                "description": (
                                    field.field_info.description
                                    if hasattr(field.field_info, "description")
                                    else None
                                ),
                            }
                            for field_name, field in schema.__fields__.items()
                        }
                    elif hasattr(schema, "model_fields"):
                        # Pydantic v2 style
                        parameters = {
                            field_name: {
                                "type": field.annotation,
                                "description": field.description,
                            }
                            for field_name, field in schema.model_fields.items()
                        }
                except Exception as e:
                    logger.debug(f"Could not extract parameters from {name}: {e}")

            return ThirdPartyToolInfo(
                name=name,
                description=description,
                tool_type=ThirdPartyToolType.LANGCHAIN,
                original_tool=tool,
                adapter=self,
                parameters=parameters,
                metadata={
                    "tool_class": type(tool).__name__,
                    "has_invoke": hasattr(tool, "invoke"),
                    "has_run": hasattr(tool, "run"),
                    "has_args_schema": hasattr(tool, "args_schema"),
                    "module": getattr(type(tool), "__module__", "unknown"),
                },
            )

        except Exception as e:
            logger.error(f"Error creating LangChain tool info: {e}")
            return None


# Example LangChain tool discovery functions
def discover_langchain_community_tools() -> List[str]:
    """
    Discover tools from langchain-community.

    Returns:
        List of registered tool IDs
    """
    from lib._tools.third_party_tools import third_party_registry

    # Register LangChain adapter if not already registered
    if ThirdPartyToolType.LANGCHAIN not in third_party_registry.adapters:
        third_party_registry.register_adapter(LangChainToolAdapter())

    registered_tools = []

    try:
        # Try to import and discover common LangChain tools
        tool_modules = [
            "langchain_community.tools.tavily_search",
            "langchain_community.tools.wikipedia",
            "langchain_community.tools.serpapi",
            "langchain_community.tools.google_search",
        ]

        for module_name in tool_modules:
            try:
                module = importlib.import_module(module_name)
                tool_ids = third_party_registry.discover_tools_from_source(
                    module, ThirdPartyToolType.LANGCHAIN
                )
                registered_tools.extend(tool_ids)
            except ImportError:
                logger.debug(f"Could not import {module_name}")
            except Exception as e:
                logger.error(f"Error discovering tools from {module_name}: {e}")

        logger.info(f"Discovered {len(registered_tools)} LangChain community tools")

    except Exception as e:
        logger.error(f"Error discovering LangChain community tools: {e}")

    return registered_tools


def load_langchain_tools(tool_names: List[str]) -> List[str]:
    """
    Load specific LangChain tools by name.

    Args:
        tool_names: List of tool names to load

    Returns:
        List of registered tool IDs
    """
    from lib._tools.third_party_tools import third_party_registry

    # Register LangChain adapter if not already registered
    if ThirdPartyToolType.LANGCHAIN not in third_party_registry.adapters:
        third_party_registry.register_adapter(LangChainToolAdapter())

    registered_tools = []

    try:
        from langchain_community.agent_toolkits.load_tools import load_tools

        # Load tools using LangChain's load_tools function
        tools = load_tools(tool_names)

        # Register the loaded tools
        tool_ids = third_party_registry.discover_tools_from_source(
            tools, ThirdPartyToolType.LANGCHAIN
        )
        registered_tools.extend(tool_ids)

        logger.info(f"Loaded {len(registered_tools)} LangChain tools: {tool_names}")

    except Exception as e:
        logger.error(f"Error loading LangChain tools {tool_names}: {e}")

    return registered_tools


def create_example_langchain_tools() -> List[str]:
    """
    Create example LangChain tools for demonstration.

    Returns:
        List of registered tool IDs
    """
    from lib._tools.third_party_tools import third_party_registry

    # Register LangChain adapter if not already registered
    if ThirdPartyToolType.LANGCHAIN not in third_party_registry.adapters:
        third_party_registry.register_adapter(LangChainToolAdapter())

    registered_tools = []

    try:
        # Try to import LangChain and create example tools
        from langchain_core.tools import tool

        @tool
        def calculator(expression: str) -> str:
            """Calculate mathematical expressions safely."""
            try:
                # Simple calculator for basic operations
                allowed_chars = set("0123456789+-*/.() ")
                if not all(c in allowed_chars for c in expression):
                    return "Error: Only basic mathematical operations are allowed"

                result = eval(expression)
                return f"Result: {result}"
            except Exception as e:
                return f"Error: {str(e)}"

        @tool
        def text_length(text: str) -> str:
            """Count the number of characters in text."""
            return f"Text length: {len(text)} characters"

        @tool
        def word_count(text: str) -> str:
            """Count the number of words in text."""
            words = text.split()
            return f"Word count: {len(words)} words"

        @tool
        def reverse_text(text: str) -> str:
            """Reverse the given text."""
            return f"Reversed text: {text[::-1]}"

        # Create list of example tools
        example_tools = [calculator, text_length, word_count, reverse_text]

        # Register the tools
        tool_ids = third_party_registry.discover_tools_from_source(
            example_tools, ThirdPartyToolType.LANGCHAIN
        )
        registered_tools.extend(tool_ids)

        logger.info(f"Created {len(registered_tools)} example LangChain tools")

    except ImportError:
        logger.warning("LangChain not available - cannot create example tools")
    except Exception as e:
        logger.error(f"Error creating example LangChain tools: {e}")

    return registered_tools


# Export key functions
__all__ = [
    "LangChainToolAdapter",
    "discover_langchain_community_tools",
    "load_langchain_tools",
    "create_example_langchain_tools",
]
