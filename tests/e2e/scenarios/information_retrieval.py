#!/usr/bin/env python3
"""
End-to-end test scenario for information retrieval.

This scenario tests the agent's ability to retrieve information from various sources,
including memory, knowledge graph, vector search, and web search.
"""

import os
import sys
import unittest
from unittest.mock import patch, MagicMock
import tempfile
import json

# Add the project root to the Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(current_dir, "..", "..", ".."))
sys.path.append(project_root)

from agent.core import VanaAgent
from agent.memory.short_term import ShortTermMemory
from agent.memory.memory_bank import MemoryBankManager
from agent.tools import (
    vector_search, search_knowledge, web_search,
    kg_query, kg_store, kg_relationship, kg_extract_entities
)

class InformationRetrievalScenario(unittest.TestCase):
    """End-to-end test scenario for information retrieval."""
    
    def setUp(self):
        """Set up test fixtures."""
        # Create agent with mock external services
        self.agent = self._create_agent()
        
        # Start a session
        self.session_id = self.agent.create_session("test_user")
    
    def _create_agent(self) -> VanaAgent:
        """
        Create and configure the VANA agent with mock external services.
        
        Returns:
            Configured VanaAgent instance
        """
        # Create agent with mock model
        agent = VanaAgent(name="vana", model="mock-model")
        
        # Mock the generate_response method
        agent.generate_response = MagicMock(return_value="Mock response")
        
        # Add real memory components
        agent.short_term_memory = ShortTermMemory()
        agent.memory_bank = MemoryBankManager()
        
        # Mock vector search tools
        mock_vector_search = MagicMock(return_value=[
            {"text": "VANA is an AI agent with memory and knowledge graph capabilities.", "score": 0.9},
            {"text": "VANA uses Vector Search for semantic retrieval.", "score": 0.8}
        ])
        agent.register_tool("vector_search", mock_vector_search)
        
        mock_search_knowledge = MagicMock(return_value=[
            {"text": "Memory systems in AI agents allow for context preservation.", "score": 0.9},
            {"text": "Knowledge graphs store structured information about entities and relationships.", "score": 0.8}
        ])
        agent.register_tool("search_knowledge", mock_search_knowledge)
        
        # Mock web search tool
        mock_web_search = MagicMock(return_value=[
            {
                "title": "Latest Developments in AI Agents",
                "snippet": "Recent advances in AI agents include improved memory systems and knowledge retrieval.",
                "url": "https://example.com/ai-agents"
            },
            {
                "title": "Vector Search in AI",
                "snippet": "Vector search enables semantic retrieval of information based on meaning rather than keywords.",
                "url": "https://example.com/vector-search"
            }
        ])
        agent.register_tool("web_search", mock_web_search)
        
        # Mock knowledge graph tools
        mock_kg_query = MagicMock(return_value=[
            {"name": "VANA", "type": "project", "observation": "VANA is an AI project with memory capabilities."},
            {"name": "Vector Search", "type": "technology", "observation": "Vector Search is used for semantic retrieval."}
        ])
        agent.register_tool("kg_query", mock_kg_query)
        
        mock_kg_store = MagicMock(return_value={"success": True})
        agent.register_tool("kg_store", mock_kg_store)
        
        mock_kg_relationship = MagicMock(return_value={"success": True})
        agent.register_tool("kg_relationship", mock_kg_relationship)
        
        mock_kg_extract_entities = MagicMock(return_value=[
            {"name": "VANA", "type": "project", "observation": "VANA is an AI project."},
            {"name": "Vector Search", "type": "technology", "observation": "Vector Search is a technology."}
        ])
        agent.register_tool("kg_extract_entities", mock_kg_extract_entities)
        
        return agent
    
    def test_information_retrieval_scenario(self):
        """Test the information retrieval scenario."""
        # Step 1: Store information about the user
        self.agent.process_message("My name is Test User and I'm interested in AI agents.", session_id=self.session_id)
        
        # Step 2: Store information in the knowledge graph
        self.agent.process_message("Please remember that VANA is an AI project with memory and knowledge graph capabilities.", session_id=self.session_id)
        
        # Verify that kg_store was called
        self.agent.tools["kg_store"].assert_called()
        
        # Step 3: Store a relationship in the knowledge graph
        self.agent.process_message("Also remember that VANA uses Vector Search for semantic retrieval.", session_id=self.session_id)
        
        # Verify that kg_relationship was called
        self.agent.tools["kg_relationship"].assert_called()
        
        # Step 4: Query the knowledge graph
        self.agent.process_message("What do you know about VANA?", session_id=self.session_id)
        
        # Verify that kg_query was called
        self.agent.tools["kg_query"].assert_called()
        
        # Step 5: Search for information using vector search
        self.agent.process_message("Can you search for information about memory systems in AI agents?", session_id=self.session_id)
        
        # Verify that search_knowledge was called
        self.agent.tools["search_knowledge"].assert_called()
        
        # Step 6: Search for information using web search
        self.agent.process_message("What are the latest developments in AI agent technology? Please search the web.", session_id=self.session_id)
        
        # Verify that web_search was called
        self.agent.tools["web_search"].assert_called()
        
        # Step 7: Test memory by asking about the user
        self.agent.process_message("What's my name and what am I interested in?", session_id=self.session_id)
        
        # Verify that the agent remembered the user's information
        memory_items = self.agent.short_term_memory.get_all(filter_role="user")
        self.assertEqual(memory_items[0]["content"], "My name is Test User and I'm interested in AI agents.")
        
        # Step 8: Extract entities from text
        self.agent.process_message("Can you extract entities from this text: 'VANA is an AI project that uses Vector Search and Knowledge Graph technologies.'", session_id=self.session_id)
        
        # Verify that kg_extract_entities was called
        self.agent.tools["kg_extract_entities"].assert_called()
        
        # Verify that all interactions are in short-term memory
        memory_items = self.agent.short_term_memory.get_all()
        self.assertEqual(len(memory_items), 16)  # 8 user messages and 8 agent responses

if __name__ == "__main__":
    unittest.main()
