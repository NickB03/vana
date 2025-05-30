"""
Tests for the TaskParser class.
"""

import unittest
from agent.task_parser import TaskParser

class TestTaskParser(unittest.TestCase):
    """Test cases for the TaskParser class."""
    
    def setUp(self):
        """Set up test environment."""
        self.parser = TaskParser()
        
    def test_initialization(self):
        """Test parser initialization."""
        self.assertIsInstance(self.parser.task_patterns, dict)
        self.assertIn("search", self.parser.task_patterns)
        self.assertIn("tool_request", self.parser.task_patterns)
        self.assertIn("conversation", self.parser.task_patterns)
        
    def test_parse_search_query(self):
        """Test parsing a search query."""
        # Test different search patterns
        test_cases = [
            ("search for python programming", "python programming"),
            ("find information about machine learning", "machine learning"),
            ("look up weather in New York", "weather in New York"),
            ("what is the capital of France", "the capital of France")
        ]
        
        for message, expected_query in test_cases:
            task_info = self.parser.parse(message)
            
            self.assertEqual(task_info["type"], "search")
            self.assertEqual(task_info["parameters"]["query"], expected_query)
            self.assertIn("vector_search", task_info["tools"])
            self.assertIn("web_search", task_info["tools"])
            
    def test_parse_tool_request(self):
        """Test parsing a tool request."""
        # Test different tool request patterns
        test_cases = [
            ("use calculator tool", "calculator"),
            ("run file_system", "file_system"),
            ("execute database_query", "database_query")
        ]
        
        for message, expected_tool in test_cases:
            task_info = self.parser.parse(message)
            
            self.assertEqual(task_info["type"], "tool_request")
            self.assertEqual(task_info["parameters"]["tool_name"], expected_tool)
            self.assertIn(expected_tool, task_info["tools"])
            
    def test_parse_conversation(self):
        """Test parsing a conversation message."""
        # Test different conversation patterns
        test_cases = [
            "hi",
            "hello there",
            "hey!",
            "how are you",
            "what's your name"
        ]
        
        for message in test_cases:
            task_info = self.parser.parse(message)
            
            self.assertEqual(task_info["type"], "conversation")
            self.assertEqual(task_info["parameters"], {})
            self.assertEqual(task_info["tools"], [])
            
    def test_parse_unknown(self):
        """Test parsing an unknown message type."""
        # Test messages that don't match any pattern
        test_cases = [
            "I like pizza",
            "The weather is nice today",
            "42"
        ]
        
        for message in test_cases:
            task_info = self.parser.parse(message)
            
            self.assertEqual(task_info["type"], "conversation")  # Default to conversation
            self.assertEqual(task_info["parameters"], {})
            self.assertEqual(task_info["tools"], [])
            
    def test_extract_search_query(self):
        """Test extracting a search query."""
        # Test the _extract_search_query method directly
        test_cases = [
            ("search for python programming", "python programming"),
            ("find information about machine learning", "machine learning"),
            ("look up weather in New York", "weather in New York"),
            ("what is the capital of France", "the capital of France"),
            ("something else entirely", "something else entirely")  # Fallback case
        ]
        
        for message, expected_query in test_cases:
            query = self.parser._extract_search_query(message)
            self.assertEqual(query, expected_query)
            
    def test_extract_tool_name(self):
        """Test extracting a tool name."""
        # Test the _extract_tool_name method directly
        test_cases = [
            ("use calculator tool", "calculator"),
            ("run file_system", "file_system"),
            ("execute database_query", "database_query"),
            ("something else entirely", "unknown")  # Fallback case
        ]
        
        for message, expected_tool in test_cases:
            tool_name = self.parser._extract_tool_name(message)
            self.assertEqual(tool_name, expected_tool)
            
    def test_determine_task_type(self):
        """Test determining the task type."""
        # Test the _determine_task_type method directly
        test_cases = [
            ("search for python programming", "search"),
            ("find information about machine learning", "search"),
            ("look up weather in New York", "search"),
            ("what is the capital of France", "search"),
            ("use calculator tool", "tool_request"),
            ("run file_system", "tool_request"),
            ("execute database_query", "tool_request"),
            ("hi", "conversation"),
            ("hello there", "conversation"),
            ("how are you", "conversation"),
            ("what's your name", "conversation"),
            ("something else entirely", "conversation")  # Default case
        ]
        
        for message, expected_type in test_cases:
            task_type = self.parser._determine_task_type(message)
            self.assertEqual(task_type, expected_type)
            
if __name__ == "__main__":
    unittest.main()
