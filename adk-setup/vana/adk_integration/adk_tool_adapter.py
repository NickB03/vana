"""
ADK Tool Adapter for VANA

This module provides a bridge between VANA specialist agents and ADK tools,
allowing specialists to be exposed as tools to the ADK framework.

It supports standardized input/output formats, capability advertisement,
and specialized context parsers for different agent types.
"""

import os
import logging
import inspect
import functools
import json
from typing import Dict, Any, Optional, List, Callable, Union, Type, Set

# Import ADK components with error handling
try:
    from google.adk.tools import Tool, FunctionTool
    ADK_AVAILABLE = True
except ImportError:
    ADK_AVAILABLE = False
    # Create placeholder classes for type hints
    class Tool:
        pass
    class FunctionTool:
        pass

# Set up logging
logger = logging.getLogger(__name__)

class ADKToolAdapter:
    """Bridge between VANA specialist agents and ADK tools."""

    # Standard input/output formats
    INPUT_FORMAT_TEXT = "text"
    INPUT_FORMAT_JSON = "json"
    INPUT_FORMAT_STRUCTURED = "structured"

    OUTPUT_FORMAT_TEXT = "text"
    OUTPUT_FORMAT_JSON = "json"
    OUTPUT_FORMAT_STRUCTURED = "structured"

    # Agent types for specialized context parsing
    AGENT_TYPE_GENERAL = "general"
    AGENT_TYPE_ARCHITECT = "architect"
    AGENT_TYPE_INTERACTION = "interaction"
    AGENT_TYPE_PLATFORM = "platform"
    AGENT_TYPE_TESTING = "testing"
    AGENT_TYPE_DOCUMENTATION = "documentation"

    def __init__(self):
        """Initialize the ADK Tool Adapter."""
        self.adk_available = ADK_AVAILABLE
        self.tools = {}  # Maps tool names to tool objects
        self.specialists = {}  # Maps specialist names to specialist objects
        self.capabilities = {}  # Maps tool names to capability metadata
        self.agent_types = {}  # Maps specialist names to agent types

        if not self.adk_available:
            logger.warning("ADK not available, using fallback tool handling")

    def is_adk_available(self) -> bool:
        """
        Check if ADK is available.

        Returns:
            True if ADK is available, False otherwise
        """
        return self.adk_available

    def register_specialist_as_tool(self, specialist_name: str, specialist_obj: Any,
                                   tool_name: Optional[str] = None,
                                   description: Optional[str] = None,
                                   input_format: str = INPUT_FORMAT_TEXT,
                                   output_format: str = OUTPUT_FORMAT_TEXT,
                                   agent_type: str = AGENT_TYPE_GENERAL,
                                   capabilities: Optional[Dict[str, Any]] = None) -> bool:
        """
        Register a specialist agent as an ADK tool.

        Args:
            specialist_name: Name of the specialist
            specialist_obj: Specialist object
            tool_name: Tool name (optional, defaults to specialist_name)
            description: Tool description (optional)
            input_format: Input format (text, json, structured)
            output_format: Output format (text, json, structured)
            agent_type: Agent type for specialized context parsing
            capabilities: Capability metadata (optional)

        Returns:
            True if successful, False otherwise
        """
        if not self.adk_available:
            logger.warning("ADK not available, cannot register specialist as tool")
            return False

        try:
            # Set tool name
            tool_name = tool_name or specialist_name

            # Set description
            if not description and hasattr(specialist_obj, "description"):
                description = specialist_obj.description
            elif not description:
                description = f"Specialist agent: {specialist_name}"

            # Set capabilities
            if capabilities is None:
                capabilities = {}

            # Add standard capability metadata
            capabilities.update({
                "name": specialist_name,
                "type": agent_type,
                "input_format": input_format,
                "output_format": output_format,
                "version": "1.0"
            })

            # Store agent type
            self.agent_types[specialist_name] = agent_type

            # Create wrapper function with standardized input/output handling
            def specialist_wrapper(query: str, **kwargs) -> str:
                """
                Wrapper function for specialist agent with standardized input/output.

                Args:
                    query: Query string
                    **kwargs: Additional arguments

                Returns:
                    Response from specialist agent
                """
                try:
                    # Parse context based on agent type
                    context = self._parse_context_for_agent(query, agent_type, **kwargs)

                    # Format input based on input format
                    formatted_input = self._format_input(query, input_format, context)

                    # Call specialist
                    if hasattr(specialist_obj, "run"):
                        response = specialist_obj.run(formatted_input, **kwargs)
                    elif hasattr(specialist_obj, "generate_content"):
                        response = specialist_obj.generate_content(formatted_input, **kwargs)
                        if hasattr(response, "text"):
                            response = response.text
                    else:
                        logger.error(f"Specialist {specialist_name} has no run or generate_content method")
                        return self._format_error(f"Specialist {specialist_name} has no run or generate_content method", output_format)

                    # Format output based on output format
                    return self._format_output(response, output_format)
                except Exception as e:
                    logger.error(f"Error calling specialist {specialist_name}: {e}")
                    return self._format_error(f"Error calling specialist {specialist_name}: {str(e)}", output_format)

            # Create ADK tool
            tool = FunctionTool(
                name=tool_name,
                description=description,
                func=specialist_wrapper
            )

            # Store tool, specialist, and capabilities
            self.tools[tool_name] = tool
            self.specialists[specialist_name] = specialist_obj
            self.capabilities[tool_name] = capabilities

            logger.info(f"Registered specialist {specialist_name} as tool {tool_name} with capabilities: {capabilities}")

            return True
        except Exception as e:
            logger.error(f"Error registering specialist as tool: {e}")
            return False

    def register_function_as_tool(self, func: Callable, tool_name: Optional[str] = None,
                                 description: Optional[str] = None,
                                 input_format: str = INPUT_FORMAT_TEXT,
                                 output_format: str = OUTPUT_FORMAT_TEXT,
                                 capabilities: Optional[Dict[str, Any]] = None) -> bool:
        """
        Register a function as an ADK tool.

        Args:
            func: Function to register
            tool_name: Tool name (optional, defaults to function name)
            description: Tool description (optional, defaults to function docstring)
            input_format: Input format (text, json, structured)
            output_format: Output format (text, json, structured)
            capabilities: Capability metadata (optional)

        Returns:
            True if successful, False otherwise
        """
        if not self.adk_available:
            logger.warning("ADK not available, cannot register function as tool")
            return False

        try:
            # Set tool name
            tool_name = tool_name or func.__name__

            # Set description
            description = description or inspect.getdoc(func) or f"Function: {func.__name__}"

            # Create ADK tool
            tool = FunctionTool(
                name=tool_name,
                description=description,
                func=func
            )

            # Store tool
            self.tools[tool_name] = tool

            # Set capabilities
            if capabilities is None:
                capabilities = {}

            # Add standard capability metadata
            capabilities.update({
                "name": tool_name,
                "type": "function",
                "input_format": input_format,
                "output_format": output_format,
                "version": "1.0"
            })

            # Store capabilities
            self.capabilities[tool_name] = capabilities

            logger.info(f"Registered function {func.__name__} as tool {tool_name} with capabilities: {capabilities}")

            return True
        except Exception as e:
            logger.error(f"Error registering function as tool: {e}")
            return False

    def get_tool(self, tool_name: str) -> Optional[Tool]:
        """
        Get a tool by name.

        Args:
            tool_name: Tool name

        Returns:
            Tool object or None if not found
        """
        return self.tools.get(tool_name)

    def get_all_tools(self) -> List[Tool]:
        """
        Get all registered tools.

        Returns:
            List of tool objects
        """
        return list(self.tools.values())

    def execute_tool(self, tool_name: str, *args, **kwargs) -> Any:
        """
        Execute a tool by name.

        Args:
            tool_name: Tool name
            *args: Positional arguments
            **kwargs: Keyword arguments

        Returns:
            Tool execution result
        """
        try:
            # Get tool
            tool = self.get_tool(tool_name)
            if not tool:
                logger.warning(f"Tool not found: {tool_name}")
                return f"Error: Tool {tool_name} not found"

            # Execute tool
            if hasattr(tool, "func"):
                return tool.func(*args, **kwargs)
            else:
                logger.warning(f"Tool {tool_name} has no func attribute")
                return f"Error: Tool {tool_name} has no func attribute"
        except Exception as e:
            logger.error(f"Error executing tool {tool_name}: {e}")
            return f"Error executing tool {tool_name}: {str(e)}"

    def tool_decorator(self, name: Optional[str] = None, description: Optional[str] = None,
                      input_format: str = INPUT_FORMAT_TEXT,
                      output_format: str = OUTPUT_FORMAT_TEXT,
                      capabilities: Optional[Dict[str, Any]] = None):
        """
        Decorator for registering functions as tools.

        Args:
            name: Tool name (optional, defaults to function name)
            description: Tool description (optional, defaults to function docstring)
            input_format: Input format (text, json, structured)
            output_format: Output format (text, json, structured)
            capabilities: Capability metadata (optional)

        Returns:
            Decorator function
        """
        def decorator(func):
            # Register function as tool
            tool_name = name or func.__name__

            # Create enhanced function with input/output formatting
            @functools.wraps(func)
            def enhanced_func(*args, **kwargs):
                try:
                    # Format input if needed
                    if len(args) > 0 and isinstance(args[0], str):
                        context = kwargs.get('context', {})
                        formatted_input = self._format_input(args[0], input_format, context)
                        args = (formatted_input,) + args[1:]

                    # Call original function
                    result = func(*args, **kwargs)

                    # Format output
                    return self._format_output(result, output_format)
                except Exception as e:
                    logger.error(f"Error in enhanced function {func.__name__}: {e}")
                    return self._format_error(f"Error in function {func.__name__}: {str(e)}", output_format)

            # Register the enhanced function
            self.register_function_as_tool(enhanced_func, tool_name, description)

            # Store capabilities if provided
            if capabilities:
                if tool_name in self.capabilities:
                    self.capabilities[tool_name].update(capabilities)
                else:
                    self.capabilities[tool_name] = capabilities

                # Add standard capability metadata
                self.capabilities[tool_name].update({
                    "input_format": input_format,
                    "output_format": output_format,
                    "version": "1.0"
                })

            return enhanced_func

        return decorator

    def _format_input(self, query: str, input_format: str, context: Dict[str, Any] = None) -> Any:
        """
        Format input based on input format.

        Args:
            query: Query string
            input_format: Input format (text, json, structured)
            context: Context object (optional)

        Returns:
            Formatted input
        """
        if context is None:
            context = {}

        try:
            if input_format == self.INPUT_FORMAT_TEXT:
                return query
            elif input_format == self.INPUT_FORMAT_JSON:
                # If query is already JSON, parse it
                if query.strip().startswith('{') and query.strip().endswith('}'):
                    try:
                        return json.loads(query)
                    except json.JSONDecodeError:
                        pass

                # Otherwise, create a JSON object with the query and context
                return json.dumps({
                    "query": query,
                    "context": context
                })
            elif input_format == self.INPUT_FORMAT_STRUCTURED:
                return {
                    "query": query,
                    "context": context
                }
            else:
                logger.warning(f"Unknown input format: {input_format}, using text")
                return query
        except Exception as e:
            logger.error(f"Error formatting input: {e}")
            return query

    def _format_output(self, response: Any, output_format: str) -> str:
        """
        Format output based on output format.

        Args:
            response: Response from specialist agent
            output_format: Output format (text, json, structured)

        Returns:
            Formatted output
        """
        try:
            if output_format == self.OUTPUT_FORMAT_TEXT:
                if isinstance(response, str):
                    return response
                elif isinstance(response, dict) and "content" in response:
                    return response["content"]
                else:
                    return str(response)
            elif output_format == self.OUTPUT_FORMAT_JSON:
                if isinstance(response, str):
                    # Try to parse as JSON
                    try:
                        json_response = json.loads(response)
                        return json.dumps(json_response)
                    except json.JSONDecodeError:
                        # Not JSON, create a JSON object
                        return json.dumps({"content": response})
                elif isinstance(response, dict):
                    return json.dumps(response)
                else:
                    return json.dumps({"content": str(response)})
            elif output_format == self.OUTPUT_FORMAT_STRUCTURED:
                if isinstance(response, dict):
                    return response
                elif isinstance(response, str):
                    # Try to parse as JSON
                    try:
                        return json.loads(response)
                    except json.JSONDecodeError:
                        # Not JSON, create a structured object
                        return {"content": response}
                else:
                    return {"content": str(response)}
            else:
                logger.warning(f"Unknown output format: {output_format}, using text")
                if isinstance(response, str):
                    return response
                else:
                    return str(response)
        except Exception as e:
            logger.error(f"Error formatting output: {e}")
            if isinstance(response, str):
                return response
            else:
                return str(response)

    def _format_error(self, error_message: str, output_format: str) -> str:
        """
        Format error message based on output format.

        Args:
            error_message: Error message
            output_format: Output format (text, json, structured)

        Returns:
            Formatted error message
        """
        try:
            if output_format == self.OUTPUT_FORMAT_TEXT:
                return error_message
            elif output_format == self.OUTPUT_FORMAT_JSON:
                return json.dumps({"error": error_message})
            elif output_format == self.OUTPUT_FORMAT_STRUCTURED:
                return {"error": error_message}
            else:
                return error_message
        except Exception as e:
            logger.error(f"Error formatting error message: {e}")
            return error_message

    def _parse_context_for_agent(self, query: str, agent_type: str, **kwargs) -> Dict[str, Any]:
        """
        Parse context based on agent type.

        Args:
            query: Query string
            agent_type: Agent type
            **kwargs: Additional arguments

        Returns:
            Parsed context
        """
        context = kwargs.get('context', {})

        # Add query to context
        context['query'] = query

        # Add agent type to context
        context['agent_type'] = agent_type

        # Add specialized context based on agent type
        if agent_type == self.AGENT_TYPE_ARCHITECT:
            # Add architecture-specific context
            context['design_patterns'] = kwargs.get('design_patterns', [])
            context['system_components'] = kwargs.get('system_components', [])
            context['requirements'] = kwargs.get('requirements', [])
        elif agent_type == self.AGENT_TYPE_INTERACTION:
            # Add interaction-specific context
            context['user_interface'] = kwargs.get('user_interface', {})
            context['user_preferences'] = kwargs.get('user_preferences', {})
            context['interaction_history'] = kwargs.get('interaction_history', [])
        elif agent_type == self.AGENT_TYPE_PLATFORM:
            # Add platform-specific context
            context['infrastructure'] = kwargs.get('infrastructure', {})
            context['deployment_targets'] = kwargs.get('deployment_targets', [])
            context['system_metrics'] = kwargs.get('system_metrics', {})
        elif agent_type == self.AGENT_TYPE_TESTING:
            # Add testing-specific context
            context['test_cases'] = kwargs.get('test_cases', [])
            context['test_results'] = kwargs.get('test_results', {})
            context['coverage_metrics'] = kwargs.get('coverage_metrics', {})
        elif agent_type == self.AGENT_TYPE_DOCUMENTATION:
            # Add documentation-specific context
            context['documentation_type'] = kwargs.get('documentation_type', 'general')
            context['target_audience'] = kwargs.get('target_audience', 'developers')
            context['existing_documentation'] = kwargs.get('existing_documentation', {})

        return context

    def get_agent_capabilities(self, agent_name: str) -> Dict[str, Any]:
        """
        Get capabilities for an agent.

        Args:
            agent_name: Agent name

        Returns:
            Capability metadata
        """
        # Check if agent is registered as a tool
        if agent_name in self.tools:
            return self.capabilities.get(agent_name, {})

        # Check if agent is registered as a specialist
        if agent_name in self.specialists:
            # Find tool name for this specialist
            for tool_name, specialist in self.specialists.items():
                if specialist == self.specialists[agent_name]:
                    return self.capabilities.get(tool_name, {})

        return {}

    def get_all_capabilities(self) -> Dict[str, Dict[str, Any]]:
        """
        Get capabilities for all agents and tools.

        Returns:
            Dictionary mapping tool names to capability metadata
        """
        return self.capabilities

    def advertise_capabilities(self) -> str:
        """
        Generate a human-readable advertisement of all capabilities.

        Returns:
            String describing all available capabilities
        """
        if not self.capabilities:
            return "No capabilities available."

        advertisement = "Available capabilities:\n\n"

        for tool_name, capabilities in self.capabilities.items():
            agent_type = capabilities.get("type", "unknown")
            input_format = capabilities.get("input_format", "text")
            output_format = capabilities.get("output_format", "text")

            advertisement += f"- {tool_name} ({agent_type}):\n"

            if "description" in capabilities:
                advertisement += f"  Description: {capabilities['description']}\n"

            advertisement += f"  Input format: {input_format}\n"
            advertisement += f"  Output format: {output_format}\n"

            if "parameters" in capabilities:
                advertisement += "  Parameters:\n"
                for param_name, param_desc in capabilities["parameters"].items():
                    advertisement += f"    - {param_name}: {param_desc}\n"

            advertisement += "\n"

        return advertisement

    def get_capabilities_by_type(self, agent_type: str) -> Dict[str, Dict[str, Any]]:
        """
        Get capabilities for all agents of a specific type.

        Args:
            agent_type: Agent type

        Returns:
            Dictionary mapping tool names to capability metadata
        """
        return {
            tool_name: capabilities
            for tool_name, capabilities in self.capabilities.items()
            if capabilities.get("type") == agent_type
        }

    def get_capabilities_by_format(self, input_format: str = None, output_format: str = None) -> Dict[str, Dict[str, Any]]:
        """
        Get capabilities for all agents with specific input/output formats.

        Args:
            input_format: Input format (optional)
            output_format: Output format (optional)

        Returns:
            Dictionary mapping tool names to capability metadata
        """
        result = {}

        for tool_name, capabilities in self.capabilities.items():
            if input_format and capabilities.get("input_format") != input_format:
                continue

            if output_format and capabilities.get("output_format") != output_format:
                continue

            result[tool_name] = capabilities

        return result
