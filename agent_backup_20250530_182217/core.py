"""
VANA Agent Core

This module defines the core agent class for the VANA Single Agent Platform.
It provides the foundation for task execution, tool integration, and state management.
"""

import logging
import os
import json
import uuid
from typing import Dict, Any, List, Optional, Callable, Union
from datetime import datetime

# Import task parser
from agent.task_parser import TaskParser

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class VanaAgent:
    """
    VANA Agent - Core agent class for the VANA Single Agent Platform.
    
    This class provides the foundation for:
    - Task parsing and execution
    - Tool integration and invocation
    - State management and persistence
    - Error handling and logging
    """
    
    def __init__(self, name: str = "vana", model: str = None):
        """
        Initialize the VANA agent.
        
        Args:
            name: Name of the agent
            model: LLM model to use (if None, uses environment variable or default)
        """
        self.name = name
        self.model = model or os.environ.get("VANA_MODEL", "gemini-1.5-pro")
        
        # Initialize task parser
        self.task_parser = TaskParser()
        
        # Initialize tools registry
        self.tools = {}
        
        # Initialize state
        self.conversation_history = []
        self.current_session_id = None
        self.current_user_id = None
        
        logger.info(f"Initialized {self.name} agent with model {self.model}")
    
    def register_tool(self, tool_name: str, tool_function: Callable, description: str = None):
        """
        Register a tool with the agent.
        
        Args:
            tool_name: Name of the tool
            tool_function: Function that implements the tool
            description: Description of the tool
        """
        self.tools[tool_name] = {
            "function": tool_function,
            "description": description or tool_function.__doc__ or "No description provided"
        }
        logger.info(f"Registered tool: {tool_name}")
    
    def create_session(self, user_id: str) -> str:
        """
        Create a new session for a user.
        
        Args:
            user_id: User identifier
            
        Returns:
            Session ID
        """
        session_id = str(uuid.uuid4())
        self.current_session_id = session_id
        self.current_user_id = user_id
        self.conversation_history = []
        
        logger.info(f"Created session {session_id} for user {user_id}")
        return session_id
    
    def load_session(self, session_id: str, user_id: str) -> bool:
        """
        Load an existing session.
        
        Args:
            session_id: Session identifier
            user_id: User identifier
            
        Returns:
            True if session was loaded successfully, False otherwise
        """
        # In a real implementation, this would load session data from storage
        # For now, we just set the current session ID and user ID
        self.current_session_id = session_id
        self.current_user_id = user_id
        
        # Mock implementation - in a real system, we would load conversation history
        # from a database or other persistent storage
        self.conversation_history = []
        
        logger.info(f"Loaded session {session_id} for user {user_id}")
        return True
    
    def process_message(self, message: str, session_id: str = None, user_id: str = None) -> str:
        """
        Process a user message and generate a response.
        
        Args:
            message: User message
            session_id: Session identifier (optional if already set)
            user_id: User identifier (optional if already set)
            
        Returns:
            Agent response
        """
        # Set or validate session
        if session_id:
            if self.current_session_id and session_id != self.current_session_id:
                # Load different session
                self.load_session(session_id, user_id or self.current_user_id)
            elif not self.current_session_id:
                # No current session, create or load
                if user_id:
                    self.current_session_id = session_id
                    self.current_user_id = user_id
                else:
                    raise ValueError("User ID is required when setting a new session ID")
        elif not self.current_session_id:
            # No session ID provided and no current session
            if user_id:
                session_id = self.create_session(user_id)
            else:
                raise ValueError("Either session_id or user_id must be provided")
        
        # Add user message to conversation history
        self.conversation_history.append({
            "role": "user",
            "content": message,
            "timestamp": datetime.now().isoformat()
        })
        
        # Process message
        try:
            # Check if message is a tool command
            if message.startswith("!"):
                response = self._handle_tool_command(message)
            else:
                # Parse task
                task_info = self.task_parser.parse(message)
                
                # Generate response based on task
                response = self._generate_response(message, task_info)
            
            # Add response to conversation history
            self.conversation_history.append({
                "role": "assistant",
                "content": response,
                "timestamp": datetime.now().isoformat()
            })
            
            return response
        
        except Exception as e:
            error_message = f"Error processing message: {str(e)}"
            logger.error(error_message)
            
            # Add error to conversation history
            self.conversation_history.append({
                "role": "assistant",
                "content": error_message,
                "timestamp": datetime.now().isoformat(),
                "error": True
            })
            
            return error_message
    
    def _handle_tool_command(self, command: str) -> str:
        """
        Handle a tool command.
        
        Args:
            command: Tool command (starting with !)
            
        Returns:
            Tool response
        """
        # Parse command
        parts = command[1:].split(maxsplit=1)
        tool_name = parts[0]
        args = parts[1] if len(parts) > 1 else ""
        
        # Check if tool exists
        if tool_name not in self.tools:
            return f"Unknown tool: {tool_name}. Available tools: {', '.join(self.tools.keys())}"
        
        # Execute tool
        try:
            tool = self.tools[tool_name]["function"]
            return tool(args)
        except Exception as e:
            error_message = f"Error executing tool {tool_name}: {str(e)}"
            logger.error(error_message)
            return error_message
    
    def _generate_response(self, message: str, task_info: Dict[str, Any]) -> str:
        """
        Generate a response to a user message.
        
        Args:
            message: User message
            task_info: Task information from parser
            
        Returns:
            Generated response
        """
        # In a real implementation, this would use an LLM to generate a response
        # For now, we return a simple echo response
        task_type = task_info.get("type", "unknown")
        return f"Echo: {message}\nTask type: {task_type}"
    
    def get_available_tools(self) -> List[Dict[str, str]]:
        """
        Get a list of available tools.
        
        Returns:
            List of tool information dictionaries
        """
        return [
            {"name": name, "description": info["description"]}
            for name, info in self.tools.items()
        ]
    
    def get_conversation_history(self) -> List[Dict[str, Any]]:
        """
        Get the conversation history for the current session.
        
        Returns:
            List of message dictionaries
        """
        return self.conversation_history
