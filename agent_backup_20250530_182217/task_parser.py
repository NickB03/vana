"""
Task Parser for VANA Agent

This module provides functionality for parsing user messages into structured tasks
that can be executed by the VANA agent.
"""

import logging
import re
from typing import Dict, Any, List, Optional

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class TaskParser:
    """
    Parser for converting user messages into structured tasks.
    
    This class analyzes user messages to determine:
    - Task type (query, command, conversation, etc.)
    - Task parameters
    - Required tools
    - Priority and urgency
    """
    
    def __init__(self):
        """Initialize the task parser."""
        # Define task type patterns
        self.task_patterns = {
            "search": [
                r"(?i)search for (.+)",
                r"(?i)find information (about|on) (.+)",
                r"(?i)look up (.+)",
                r"(?i)what (is|are) (.+)"
            ],
            "tool_request": [
                r"(?i)use (.+) tool",
                r"(?i)run (.+)",
                r"(?i)execute (.+)"
            ],
            "conversation": [
                r"(?i)^(hi|hello|hey)( there)?[.!]?$",
                r"(?i)^how are you",
                r"(?i)^what('s| is) your name"
            ]
        }
        
        logger.info("Initialized TaskParser")
    
    def parse(self, message: str) -> Dict[str, Any]:
        """
        Parse a user message into a structured task.
        
        Args:
            message: User message
            
        Returns:
            Dictionary containing task information
        """
        # Basic task info
        task_info = {
            "original_message": message,
            "type": "unknown",
            "parameters": {},
            "tools": []
        }
        
        # Determine task type
        task_type = self._determine_task_type(message)
        task_info["type"] = task_type
        
        # Extract parameters based on task type
        if task_type == "search":
            task_info["parameters"]["query"] = self._extract_search_query(message)
            task_info["tools"].append("vector_search")
            task_info["tools"].append("web_search")
        elif task_type == "tool_request":
            tool_name = self._extract_tool_name(message)
            task_info["parameters"]["tool_name"] = tool_name
            task_info["tools"].append(tool_name)
        
        logger.info(f"Parsed task: {task_type}")
        return task_info
    
    def _determine_task_type(self, message: str) -> str:
        """
        Determine the type of task based on the message.
        
        Args:
            message: User message
            
        Returns:
            Task type
        """
        # Check each pattern
        for task_type, patterns in self.task_patterns.items():
            for pattern in patterns:
                if re.search(pattern, message):
                    return task_type
        
        # Default to conversation if no specific pattern matches
        return "conversation"
    
    def _extract_search_query(self, message: str) -> str:
        """
        Extract the search query from a message.
        
        Args:
            message: User message
            
        Returns:
            Search query
        """
        # Try each search pattern
        for pattern in self.task_patterns["search"]:
            match = re.search(pattern, message)
            if match:
                # Different patterns have different group structures
                if len(match.groups()) == 1:
                    return match.group(1)
                elif len(match.groups()) == 2:
                    return match.group(2)
        
        # If no pattern matches, use the whole message
        return message
    
    def _extract_tool_name(self, message: str) -> str:
        """
        Extract the tool name from a message.
        
        Args:
            message: User message
            
        Returns:
            Tool name
        """
        # Try each tool request pattern
        for pattern in self.task_patterns["tool_request"]:
            match = re.search(pattern, message)
            if match:
                return match.group(1).lower().strip()
        
        # If no pattern matches, return unknown
        return "unknown"
