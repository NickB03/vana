"""
CrewAI Tools Integration for VANA Multi-Agent System

This module provides integration with CrewAI tools, enabling VANA agents
to use CrewAI's tool ecosystem and agent capabilities.

Based on CrewAI documentation patterns:
- Tool discovery from CrewAI modules and toolkits
- Adapter for CrewAI Tool interface
- Integration with VANA tool framework
"""

import logging
from typing import Dict, Any, List, Optional, Callable, Union
import importlib

from lib._tools.third_party_tools import (
    ThirdPartyToolAdapter, ThirdPartyToolInfo, ThirdPartyToolType
)
from lib._shared_libraries.tool_standards import (
    performance_monitor
)

# Configure logging
logger = logging.getLogger(__name__)


class CrewAIToolAdapter(ThirdPartyToolAdapter):
    """
    Adapter for integrating CrewAI tools into VANA.

    Supports various CrewAI tool patterns:
    - Tools created with @tool decorator
    - Tools from CrewAI toolkits
    - Custom CrewAI tools
    """

    def __init__(self):
        """Initialize the CrewAI adapter."""
        super().__init__(ThirdPartyToolType.CREWAI)

        # Try to import CrewAI components
        self.crewai_available = self._check_crewai_availability()

        if self.crewai_available:
            logger.info("CrewAI integration available")
        else:
            logger.warning("CrewAI not available - install with: pip install crewai crewai-tools")

    def _check_crewai_availability(self) -> bool:
        """
        Check if CrewAI is available.

        Returns:
            True if CrewAI is available, False otherwise
        """
        try:
            import crewai
            import crewai_tools
            return True
        except ImportError:
            return False

    def discover_tools(self, source: Any) -> List[ThirdPartyToolInfo]:
        """
        Discover CrewAI tools from various sources.

        Args:
            source: Source to discover tools from (module, toolkit, list, etc.)

        Returns:
            List of discovered CrewAI tools
        """
        if not self.crewai_available:
            logger.warning("CrewAI not available for tool discovery")
            return []

        tools = []

        try:
            # Pattern 1: Single CrewAI tool
            if self._is_crewai_tool(source):
                tool_info = self._create_crewai_tool_info(source)
                if tool_info:
                    tools.append(tool_info)

            # Pattern 2: List of tools
            elif isinstance(source, (list, tuple)):
                for i, tool in enumerate(source):
                    if self._is_crewai_tool(tool):
                        tool_info = self._create_crewai_tool_info(tool)
                        if tool_info:
                            tools.append(tool_info)

            # Pattern 3: Module with tool attributes
            elif hasattr(source, '__dict__'):
                for name, obj in source.__dict__.items():
                    if self._is_crewai_tool(obj):
                        tool_info = self._create_crewai_tool_info(obj)
                        if tool_info:
                            tools.append(tool_info)

            logger.info(f"Discovered {len(tools)} CrewAI tools")
            return tools

        except Exception as e:
            logger.error(f"Error discovering CrewAI tools: {e}")
            return []

    def adapt_tool(self, tool_info: ThirdPartyToolInfo) -> Callable:
        """
        Adapt a CrewAI tool to VANA's interface.

        Args:
            tool_info: Information about the CrewAI tool

        Returns:
            Adapted tool function
        """
        crewai_tool = tool_info.original_tool

        def adapted_crewai_tool(*args, **kwargs) -> str:
            """Adapted CrewAI tool function."""
            start_time = performance_monitor.start_execution(tool_info.name)

            try:
                # Convert positional args to kwargs if needed
                if args and not kwargs:
                    # For single argument tools, use the first arg as input
                    if len(args) == 1:
                        # Try common parameter names for CrewAI tools
                        kwargs['query'] = args[0]

                # Execute the CrewAI tool
                if hasattr(crewai_tool, 'run'):
                    # Use run method (common for CrewAI tools)
                    if kwargs:
                        result = crewai_tool.run(**kwargs)
                    else:
                        result = crewai_tool.run(*args)
                elif hasattr(crewai_tool, '_run'):
                    # Use _run method (internal CrewAI method)
                    if kwargs:
                        result = crewai_tool._run(**kwargs)
                    else:
                        result = crewai_tool._run(*args)
                elif callable(crewai_tool):
                    # Direct callable
                    result = crewai_tool(*args, **kwargs)
                else:
                    raise ValueError(f"Unable to execute CrewAI tool {tool_info.name}")

                # Convert result to string
                if result is None:
                    result_str = "CrewAI tool executed successfully (no return value)"
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

                performance_monitor.end_execution(tool_info.name, start_time, success=True)
                return f"🤖 **CrewAI Tool Result**:\n\n{result_str}"

            except Exception as e:
                performance_monitor.end_execution(tool_info.name, start_time, success=False)
                logger.error(f"Error executing CrewAI tool {tool_info.name}: {e}")
                return f"❌ Error executing CrewAI tool: {str(e)}"

        # Set function metadata
        adapted_crewai_tool.__name__ = tool_info.name
        adapted_crewai_tool.__doc__ = tool_info.description

        return adapted_crewai_tool

    def validate_tool(self, tool: Any) -> bool:
        """
        Validate that a tool is a CrewAI tool.

        Args:
            tool: Tool to validate

        Returns:
            True if tool is a CrewAI tool
        """
        return self._is_crewai_tool(tool)

    def _is_crewai_tool(self, obj: Any) -> bool:
        """
        Check if an object is a CrewAI tool.

        Args:
            obj: Object to check

        Returns:
            True if object is a CrewAI tool
        """
        if not self.crewai_available:
            return False

        try:
            # Check if it has CrewAI tool attributes
            if (hasattr(obj, 'name') and hasattr(obj, 'description') and
                (hasattr(obj, 'run') or hasattr(obj, '_run'))):
                return True

            # Check for function tools (have __name__ and specific attributes)
            if (hasattr(obj, '__name__') and hasattr(obj, 'description') and
                hasattr(obj, 'args')):
                return True

            # Check for CrewAI tool class patterns
            class_name = type(obj).__name__
            if 'Tool' in class_name and hasattr(obj, 'run'):
                return True

            return False

        except Exception:
            return False

    def _create_crewai_tool_info(self, tool: Any) -> Optional[ThirdPartyToolInfo]:
        """
        Create tool information for a CrewAI tool.

        Args:
            tool: CrewAI tool

        Returns:
            Tool information or None if invalid
        """
        try:
            # Get tool name
            name = getattr(tool, 'name', getattr(tool, '__name__', 'unknown_tool'))

            # Get tool description
            description = (
                getattr(tool, 'description', None) or
                getattr(tool, '__doc__', None) or
                f"CrewAI tool: {name}"
            )

            # Get parameters from args if available
            parameters = {}
            if hasattr(tool, 'args') and tool.args:
                try:
                    # CrewAI tools often have args as a schema
                    args_schema = tool.args
                    if hasattr(args_schema, '__fields__'):
                        # Pydantic style
                        parameters = {
                            field_name: {
                                'type': field.type_,
                                'description': getattr(field, 'description', None)
                            }
                            for field_name, field in args_schema.__fields__.items()
                        }
                except Exception as e:
                    logger.debug(f"Could not extract parameters from {name}: {e}")

            return ThirdPartyToolInfo(
                name=name,
                description=description,
                tool_type=ThirdPartyToolType.CREWAI,
                original_tool=tool,
                adapter=self,
                parameters=parameters,
                metadata={
                    'tool_class': type(tool).__name__,
                    'has_run': hasattr(tool, 'run'),
                    'has_private_run': hasattr(tool, '_run'),
                    'has_args': hasattr(tool, 'args'),
                    'module': getattr(type(tool), '__module__', 'unknown')
                }
            )

        except Exception as e:
            logger.error(f"Error creating CrewAI tool info: {e}")
            return None

# Example CrewAI tool discovery functions


def discover_crewai_tools() -> List[str]:
    """
    Discover tools from crewai-tools package.

    Returns:
        List of registered tool IDs
    """
    from lib._tools.third_party_tools import third_party_registry

    # Register CrewAI adapter if not already registered
    if ThirdPartyToolType.CREWAI not in third_party_registry.adapters:
        third_party_registry.register_adapter(CrewAIToolAdapter())

    registered_tools = []

    try:
        # Try to import and discover common CrewAI tools
        tool_modules = [
            'crewai_tools.tools.file_read_tool',
            'crewai_tools.tools.file_write_tool',
            'crewai_tools.tools.directory_read_tool',
            'crewai_tools.tools.web_scrape_tool',
        ]

        for module_name in tool_modules:
            try:
                module = importlib.import_module(module_name)
                tool_ids = third_party_registry.discover_tools_from_source(
                    module, ThirdPartyToolType.CREWAI
                )
                registered_tools.extend(tool_ids)
            except ImportError:
                logger.debug(f"Could not import {module_name}")
            except Exception as e:
                logger.error(f"Error discovering tools from {module_name}: {e}")

        logger.info(f"Discovered {len(registered_tools)} CrewAI tools")

    except Exception as e:
        logger.error(f"Error discovering CrewAI tools: {e}")

    return registered_tools


def create_example_crewai_tools() -> List[str]:
    """
    Create example CrewAI tools for demonstration.

    Returns:
        List of registered tool IDs
    """
    from lib._tools.third_party_tools import third_party_registry

    # Register CrewAI adapter if not already registered
    if ThirdPartyToolType.CREWAI not in third_party_registry.adapters:
        third_party_registry.register_adapter(CrewAIToolAdapter())

    registered_tools = []

    try:
        # Try to import CrewAI and create example tools
        from crewai_tools import tool

        @tool("String Formatter")
        def format_string(text: str, format_type: str = "upper") -> str:
            """Format a string according to the specified format type."""
            if format_type == "upper":
                return text.upper()
            elif format_type == "lower":
                return text.lower()
            elif format_type == "title":
                return text.title()
            elif format_type == "capitalize":
                return text.capitalize()
            else:
                return text

        @tool("List Processor")
        def process_list(items: str, operation: str = "sort") -> str:
            """Process a comma-separated list of items."""
            item_list = [item.strip() for item in items.split(',')]

            if operation == "sort":
                result = sorted(item_list)
            elif operation == "reverse":
                result = list(reversed(item_list))
            elif operation == "unique":
                result = list(set(item_list))
            elif operation == "count":
                return f"Number of items: {len(item_list)}"
            else:
                result = item_list

            return ", ".join(result)

        @tool("Text Analyzer")
        def analyze_text(text: str) -> str:
            """Analyze text and provide statistics."""
            words = text.split()
            sentences = text.split('.')
            paragraphs = text.split('\n\n')

            return f"""Text Analysis:
- Characters: {len(text)}
- Words: {len(words)}
- Sentences: {len([s for s in sentences if s.strip()])}
- Paragraphs: {len([p for p in paragraphs if p.strip()])}
- Average words per sentence: {len(words) / max(len([s for s in sentences if s.strip()]), 1):.1f}"""

        # Create list of example tools
        example_tools = [format_string, process_list, analyze_text]

        # Register the tools
        tool_ids = third_party_registry.discover_tools_from_source(
            example_tools, ThirdPartyToolType.CREWAI
        )
        registered_tools.extend(tool_ids)

        logger.info(f"Created {len(registered_tools)} example CrewAI tools")

    except ImportError:
        logger.warning("CrewAI not available - cannot create example tools")
    except Exception as e:
        logger.error(f"Error creating example CrewAI tools: {e}")

    return registered_tools

# Export key functions
__all__ = [
    'CrewAIToolAdapter',
    'discover_crewai_tools',
    'create_example_crewai_tools'
]
