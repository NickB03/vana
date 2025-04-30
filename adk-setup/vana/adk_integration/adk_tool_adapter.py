"""
ADK Tool Adapter for VANA

This module provides a bridge between VANA specialist agents and ADK tools,
allowing specialists to be exposed as tools to the ADK framework.
"""

import os
import logging
import inspect
import functools
from typing import Dict, Any, Optional, List, Callable, Union, Type

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
    
    def __init__(self):
        """Initialize the ADK Tool Adapter."""
        self.adk_available = ADK_AVAILABLE
        self.tools = {}  # Maps tool names to tool objects
        self.specialists = {}  # Maps specialist names to specialist objects
        
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
                                   description: Optional[str] = None) -> bool:
        """
        Register a specialist agent as an ADK tool.
        
        Args:
            specialist_name: Name of the specialist
            specialist_obj: Specialist object
            tool_name: Tool name (optional, defaults to specialist_name)
            description: Tool description (optional)
            
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
                
            # Create wrapper function
            def specialist_wrapper(query: str, **kwargs) -> str:
                """
                Wrapper function for specialist agent.
                
                Args:
                    query: Query string
                    **kwargs: Additional arguments
                    
                Returns:
                    Response from specialist agent
                """
                try:
                    # Call specialist
                    if hasattr(specialist_obj, "run"):
                        response = specialist_obj.run(query, **kwargs)
                    elif hasattr(specialist_obj, "generate_content"):
                        response = specialist_obj.generate_content(query, **kwargs)
                        if hasattr(response, "text"):
                            response = response.text
                    else:
                        logger.error(f"Specialist {specialist_name} has no run or generate_content method")
                        return f"Error: Specialist {specialist_name} has no run or generate_content method"
                        
                    return response
                except Exception as e:
                    logger.error(f"Error calling specialist {specialist_name}: {e}")
                    return f"Error calling specialist {specialist_name}: {str(e)}"
                    
            # Create ADK tool
            tool = FunctionTool(
                name=tool_name,
                description=description,
                func=specialist_wrapper
            )
            
            # Store tool and specialist
            self.tools[tool_name] = tool
            self.specialists[specialist_name] = specialist_obj
            
            logger.info(f"Registered specialist {specialist_name} as tool {tool_name}")
            
            return True
        except Exception as e:
            logger.error(f"Error registering specialist as tool: {e}")
            return False
            
    def register_function_as_tool(self, func: Callable, tool_name: Optional[str] = None,
                                 description: Optional[str] = None) -> bool:
        """
        Register a function as an ADK tool.
        
        Args:
            func: Function to register
            tool_name: Tool name (optional, defaults to function name)
            description: Tool description (optional, defaults to function docstring)
            
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
            
            logger.info(f"Registered function {func.__name__} as tool {tool_name}")
            
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
            
    def tool_decorator(self, name: Optional[str] = None, description: Optional[str] = None):
        """
        Decorator for registering functions as tools.
        
        Args:
            name: Tool name (optional, defaults to function name)
            description: Tool description (optional, defaults to function docstring)
            
        Returns:
            Decorator function
        """
        def decorator(func):
            # Register function as tool
            tool_name = name or func.__name__
            self.register_function_as_tool(func, tool_name, description)
            
            @functools.wraps(func)
            def wrapper(*args, **kwargs):
                return func(*args, **kwargs)
                
            return wrapper
            
        return decorator
