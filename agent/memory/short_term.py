#!/usr/bin/env python3
"""
Short-Term Memory for VANA Agent

This module provides a short-term memory implementation for the VANA agent.
It stores recent interactions and provides methods for retrieving and summarizing them.
"""

import logging
import time
from datetime import datetime
from typing import Dict, List, Any, Optional, Union
from collections import deque

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ShortTermMemory:
    """
    Short-term memory for the VANA agent.
    
    This class provides in-memory storage for recent interactions,
    with methods for storing, retrieving, and summarizing them.
    It supports configuration for memory size and retention policy.
    """
    
    def __init__(self, max_items: int = 100, max_age_seconds: Optional[int] = None):
        """
        Initialize the short-term memory.
        
        Args:
            max_items: Maximum number of items to store in memory
            max_age_seconds: Maximum age of items in seconds (None for no limit)
        """
        self.max_items = max_items
        self.max_age_seconds = max_age_seconds
        self.memory_buffer = deque(maxlen=max_items)
        logger.info(f"Initialized ShortTermMemory with max_items={max_items}, max_age_seconds={max_age_seconds}")
    
    def add(self, role: str, content: str, metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Add an interaction to the memory.
        
        Args:
            role: Role of the sender (e.g., 'user', 'assistant')
            content: Content of the interaction
            metadata: Additional metadata for the interaction
            
        Returns:
            The added memory item
        """
        timestamp = datetime.now().isoformat()
        memory_item = {
            "role": role,
            "content": content,
            "timestamp": timestamp,
            "metadata": metadata or {}
        }
        
        self.memory_buffer.append(memory_item)
        logger.debug(f"Added item to short-term memory. Buffer size: {len(self.memory_buffer)}")
        return memory_item
    
    def get_all(self, filter_role: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Get all items in the memory buffer, optionally filtered by role.
        
        Args:
            filter_role: Optional role to filter by
            
        Returns:
            List of memory items
        """
        # Apply age filter if configured
        if self.max_age_seconds is not None:
            current_time = datetime.now()
            self.memory_buffer = deque(
                [item for item in self.memory_buffer if 
                 (current_time - datetime.fromisoformat(item["timestamp"])).total_seconds() <= self.max_age_seconds],
                maxlen=self.max_items
            )
        
        # Apply role filter if specified
        if filter_role:
            return [item for item in self.memory_buffer if item["role"] == filter_role]
        
        return list(self.memory_buffer)
    
    def get_recent(self, count: int = 5, filter_role: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Get the most recent items in the memory buffer.
        
        Args:
            count: Number of recent items to retrieve
            filter_role: Optional role to filter by
            
        Returns:
            List of recent memory items
        """
        all_items = self.get_all(filter_role)
        return all_items[-count:] if all_items else []
    
    def search(self, query: str) -> List[Dict[str, Any]]:
        """
        Search for items in the memory buffer containing the query.
        
        Args:
            query: Search query
            
        Returns:
            List of matching memory items
        """
        return [item for item in self.memory_buffer 
                if query.lower() in item["content"].lower()]
    
    def summarize(self, max_length: int = 200) -> str:
        """
        Generate a summary of the memory buffer.
        
        Args:
            max_length: Maximum length of the summary
            
        Returns:
            Summary of the memory buffer
        """
        if not self.memory_buffer:
            return "No interactions in memory."
        
        # Get conversation pairs (user-assistant)
        conversation_pairs = []
        for i in range(len(self.memory_buffer) - 1):
            current = self.memory_buffer[i]
            next_item = self.memory_buffer[i + 1]
            
            if current["role"] == "user" and next_item["role"] == "assistant":
                conversation_pairs.append({
                    "user": current["content"],
                    "assistant": next_item["content"]
                })
        
        # Create summary
        summary = "Recent conversation summary:\n"
        for i, pair in enumerate(conversation_pairs[-3:], 1):  # Last 3 pairs
            user_msg = pair["user"]
            assistant_msg = pair["assistant"]
            
            # Truncate if needed
            if len(user_msg) > 50:
                user_msg = user_msg[:47] + "..."
            if len(assistant_msg) > 50:
                assistant_msg = assistant_msg[:47] + "..."
            
            summary += f"{i}. User: {user_msg}\n   Assistant: {assistant_msg}\n"
        
        # Ensure summary is within max_length
        if len(summary) > max_length:
            summary = summary[:max_length - 3] + "..."
        
        return summary
    
    def clear(self) -> None:
        """
        Clear the memory buffer.
        """
        buffer_size = len(self.memory_buffer)
        self.memory_buffer.clear()
        logger.info(f"Cleared short-term memory. Removed {buffer_size} items.")
    
    def get_stats(self) -> Dict[str, Any]:
        """
        Get statistics about the memory buffer.
        
        Returns:
            Dictionary with memory statistics
        """
        if not self.memory_buffer:
            return {
                "count": 0,
                "oldest": None,
                "newest": None,
                "roles": {}
            }
        
        # Count roles
        roles = {}
        for item in self.memory_buffer:
            role = item["role"]
            roles[role] = roles.get(role, 0) + 1
        
        # Get timestamps
        timestamps = [datetime.fromisoformat(item["timestamp"]) for item in self.memory_buffer]
        oldest = min(timestamps).isoformat()
        newest = max(timestamps).isoformat()
        
        return {
            "count": len(self.memory_buffer),
            "oldest": oldest,
            "newest": newest,
            "roles": roles
        }
