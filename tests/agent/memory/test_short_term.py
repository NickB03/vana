#!/usr/bin/env python3
"""
Unit tests for the ShortTermMemory class.
"""

import unittest
import time
from datetime import datetime, timedelta
from agent.memory.short_term import ShortTermMemory

class TestShortTermMemory(unittest.TestCase):
    """Test cases for the ShortTermMemory class."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.memory = ShortTermMemory(max_items=5, max_age_seconds=60)
    
    def test_add_and_get_all(self):
        """Test adding items and retrieving all items."""
        # Add items
        self.memory.add("user", "Hello")
        self.memory.add("assistant", "Hi there")
        self.memory.add("user", "How are you?")
        
        # Get all items
        items = self.memory.get_all()
        
        # Check results
        self.assertEqual(len(items), 3)
        self.assertEqual(items[0]["role"], "user")
        self.assertEqual(items[0]["content"], "Hello")
        self.assertEqual(items[1]["role"], "assistant")
        self.assertEqual(items[1]["content"], "Hi there")
        self.assertEqual(items[2]["role"], "user")
        self.assertEqual(items[2]["content"], "How are you?")
    
    def test_max_items_limit(self):
        """Test that the memory respects the max_items limit."""
        # Add more items than the limit
        for i in range(10):
            self.memory.add("user", f"Message {i}")
        
        # Get all items
        items = self.memory.get_all()
        
        # Check that only the last max_items are kept
        self.assertEqual(len(items), 5)
        self.assertEqual(items[0]["content"], "Message 5")
        self.assertEqual(items[4]["content"], "Message 9")
    
    def test_get_recent(self):
        """Test retrieving recent items."""
        # Add items
        for i in range(5):
            self.memory.add("user", f"Message {i}")
        
        # Get recent items
        items = self.memory.get_recent(count=3)
        
        # Check results
        self.assertEqual(len(items), 3)
        self.assertEqual(items[0]["content"], "Message 2")
        self.assertEqual(items[1]["content"], "Message 3")
        self.assertEqual(items[2]["content"], "Message 4")
    
    def test_filter_by_role(self):
        """Test filtering items by role."""
        # Add items with different roles
        self.memory.add("user", "User message 1")
        self.memory.add("assistant", "Assistant message 1")
        self.memory.add("user", "User message 2")
        self.memory.add("assistant", "Assistant message 2")
        
        # Get items filtered by role
        user_items = self.memory.get_all(filter_role="user")
        assistant_items = self.memory.get_all(filter_role="assistant")
        
        # Check results
        self.assertEqual(len(user_items), 2)
        self.assertEqual(user_items[0]["content"], "User message 1")
        self.assertEqual(user_items[1]["content"], "User message 2")
        
        self.assertEqual(len(assistant_items), 2)
        self.assertEqual(assistant_items[0]["content"], "Assistant message 1")
        self.assertEqual(assistant_items[1]["content"], "Assistant message 2")
    
    def test_search(self):
        """Test searching for items."""
        # Add items
        self.memory.add("user", "Hello world")
        self.memory.add("assistant", "Hi there")
        self.memory.add("user", "Python is great")
        self.memory.add("assistant", "Yes, Python is awesome")
        
        # Search for items
        python_items = self.memory.search("python")
        hello_items = self.memory.search("hello")
        
        # Check results
        self.assertEqual(len(python_items), 2)
        self.assertEqual(python_items[0]["content"], "Python is great")
        self.assertEqual(python_items[1]["content"], "Yes, Python is awesome")
        
        self.assertEqual(len(hello_items), 1)
        self.assertEqual(hello_items[0]["content"], "Hello world")
    
    def test_clear(self):
        """Test clearing the memory."""
        # Add items
        self.memory.add("user", "Hello")
        self.memory.add("assistant", "Hi there")
        
        # Clear memory
        self.memory.clear()
        
        # Check that memory is empty
        items = self.memory.get_all()
        self.assertEqual(len(items), 0)
    
    def test_get_stats(self):
        """Test getting memory statistics."""
        # Add items
        self.memory.add("user", "User message 1")
        self.memory.add("assistant", "Assistant message 1")
        self.memory.add("user", "User message 2")
        
        # Get stats
        stats = self.memory.get_stats()
        
        # Check results
        self.assertEqual(stats["count"], 3)
        self.assertEqual(stats["roles"]["user"], 2)
        self.assertEqual(stats["roles"]["assistant"], 1)
        self.assertIsNotNone(stats["oldest"])
        self.assertIsNotNone(stats["newest"])
    
    def test_summarize(self):
        """Test summarizing the memory."""
        # Add conversation pairs
        self.memory.add("user", "Hello")
        self.memory.add("assistant", "Hi there")
        self.memory.add("user", "How are you?")
        self.memory.add("assistant", "I'm doing well, thanks for asking!")
        self.memory.add("user", "Tell me about VANA")
        self.memory.add("assistant", "VANA is a project for building AI agents with memory and knowledge graph capabilities.")
        
        # Get summary
        summary = self.memory.summarize()
        
        # Check that summary contains conversation snippets
        self.assertIn("Hello", summary)
        self.assertIn("Hi there", summary)
        self.assertIn("How are you", summary)
        self.assertIn("VANA", summary)
    
    def test_metadata(self):
        """Test adding and retrieving metadata."""
        # Add item with metadata
        metadata = {"source": "chat", "importance": "high"}
        self.memory.add("user", "Important message", metadata=metadata)
        
        # Get item
        items = self.memory.get_all()
        
        # Check metadata
        self.assertEqual(items[0]["metadata"]["source"], "chat")
        self.assertEqual(items[0]["metadata"]["importance"], "high")

if __name__ == "__main__":
    unittest.main()
