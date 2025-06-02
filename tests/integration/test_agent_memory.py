#!/usr/bin/env python3
"""
Integration tests for the agent memory components.
"""

import os
import shutil
import tempfile
import unittest
from unittest.mock import patch

from agent.core import VanaAgent
from agent.memory.memory_bank import MemoryBankManager
from agent.memory.short_term import ShortTermMemory
from agent.tools.knowledge_graph import (
    kg_extract_entities,
    kg_query,
    kg_relationship,
    kg_store,
)


class TestAgentMemoryIntegration(unittest.TestCase):
    """Integration tests for the agent memory components."""

    def setUp(self):
        """Set up test fixtures."""
        # Create a temporary directory for testing
        self.test_dir = tempfile.mkdtemp()

        # Create test memory bank files
        self.test_files = {
            "activeContext.md": "# Active Context\n\n## Current Focus\n\nThis is the current focus.",
            "progress.md": "# Progress\n\n## Completed Tasks\n\nThese are completed tasks.",
        }

        for filename, content in self.test_files.items():
            with open(
                os.path.join(self.test_dir, filename), "w", encoding="utf-8"
            ) as f:
                f.write(content)

        # Create memory components
        self.short_term = ShortTermMemory(max_items=10)
        self.memory_bank = MemoryBankManager(memory_bank_dir=self.test_dir)

        # Create agent
        self.agent = VanaAgent()

        # Add memory components to agent
        self.agent.short_term_memory = self.short_term
        self.agent.memory_bank = self.memory_bank

        # Create a patcher for the KnowledgeGraphManager
        self.kg_manager_patcher = patch(
            "agent.tools.knowledge_graph.KnowledgeGraphManager"
        )
        self.mock_kg_manager_class = self.kg_manager_patcher.start()
        self.mock_kg_manager = self.mock_kg_manager_class.return_value

        # Set up mock responses
        self.mock_kg_manager.is_available.return_value = True
        self.mock_kg_manager.query.return_value = {
            "entities": [
                {
                    "name": "VANA",
                    "type": "project",
                    "observation": "VANA is an AI project",
                }
            ]
        }
        self.mock_kg_manager.store.return_value = {"success": True}
        self.mock_kg_manager.store_relationship.return_value = {"success": True}
        self.mock_kg_manager.extract_entities.return_value = [
            {"name": "VANA", "type": "project", "observation": "VANA is an AI project"}
        ]

    def tearDown(self):
        """Tear down test fixtures."""
        # Remove temporary directory
        shutil.rmtree(self.test_dir)

        # Stop patchers
        self.kg_manager_patcher.stop()

    def test_short_term_memory_integration(self):
        """Test integration of short-term memory with agent."""
        # Add messages to short-term memory
        self.agent.short_term_memory.add("user", "Hello")
        self.agent.short_term_memory.add("assistant", "Hi there")
        self.agent.short_term_memory.add("user", "Tell me about VANA")

        # Get recent messages
        recent = self.agent.short_term_memory.get_recent(count=2)

        # Check results
        self.assertEqual(len(recent), 2)
        self.assertEqual(recent[0]["content"], "Hi there")
        self.assertEqual(recent[1]["content"], "Tell me about VANA")

        # Search for messages
        search_results = self.agent.short_term_memory.search("VANA")

        # Check results
        self.assertEqual(len(search_results), 1)
        self.assertEqual(search_results[0]["content"], "Tell me about VANA")

    def test_memory_bank_integration(self):
        """Test integration of memory bank with agent."""
        # Read a memory bank file
        result = self.agent.memory_bank.read_file("activeContext.md")

        # Check results
        self.assertTrue(result["success"])
        self.assertIn("Current Focus", result["content"])

        # Extract a section
        section = self.agent.memory_bank.extract_section(
            "activeContext.md", "Current Focus"
        )

        # Check results
        self.assertTrue(section["success"])
        self.assertEqual(section["content"], "This is the current focus.")

        # Update a section
        update_result = self.agent.memory_bank.update_section(
            "activeContext.md", "Current Focus", "This is the updated current focus."
        )

        # Check results
        self.assertTrue(update_result["success"])

        # Read the updated section
        updated_section = self.agent.memory_bank.extract_section(
            "activeContext.md", "Current Focus"
        )

        # Check results
        self.assertTrue(updated_section["success"])
        self.assertEqual(
            updated_section["content"], "This is the updated current focus."
        )

    def test_knowledge_graph_integration(self):
        """Test integration of knowledge graph with agent."""
        # Register knowledge graph tools
        self.agent.register_tool("kg_query", kg_query)
        self.agent.register_tool("kg_store", kg_store)
        self.agent.register_tool("kg_relationship", kg_relationship)
        self.agent.register_tool("kg_extract_entities", kg_extract_entities)

        # Query the knowledge graph
        query_result = self.agent._handle_tool_command("!kg_query project VANA")

        # Check results (should be a list of entities)
        self.assertIsInstance(query_result, list)
        self.assertEqual(len(query_result), 1)
        self.assertEqual(query_result[0]["name"], "VANA")

        # Store an entity
        store_result = self.agent._handle_tool_command(
            "!kg_store Vector_Search technology Vector Search is a semantic search technology"
        )

        # Check results
        self.assertIn("success", store_result)
        self.assertTrue(store_result["success"])

        # Store a relationship
        relationship_result = self.agent._handle_tool_command(
            "!kg_relationship VANA uses Vector_Search"
        )

        # Check results
        self.assertIn("success", relationship_result)
        self.assertTrue(relationship_result["success"])

        # Extract entities
        extract_result = self.agent._handle_tool_command(
            "!kg_extract_entities VANA is a project that uses Vector Search"
        )

        # Check results (should be a list of entities)
        self.assertIsInstance(extract_result, list)
        self.assertEqual(len(extract_result), 1)
        self.assertEqual(extract_result[0]["name"], "VANA")

    def test_combined_memory_workflow(self):
        """Test a combined workflow using all memory components."""
        # Register knowledge graph tools
        self.agent.register_tool("kg_query", kg_query)
        self.agent.register_tool("kg_store", kg_store)

        # 1. User asks about VANA
        self.agent.short_term_memory.add("user", "What is VANA?")

        # 2. Agent queries knowledge graph
        query_result = self.agent._handle_tool_command("!kg_query project VANA")

        # 3. Agent responds based on knowledge graph
        response = "VANA is an AI project with memory and knowledge graph capabilities."
        self.agent.short_term_memory.add("assistant", response)

        # 4. Agent updates memory bank with new information
        self.agent.memory_bank.update_section(
            "activeContext.md", "Current Focus", "Explaining VANA to the user."
        )

        # 5. User provides new information
        self.agent.short_term_memory.add(
            "user", "VANA also has Vector Search capabilities."
        )

        # 6. Agent stores new information in knowledge graph
        store_result = self.agent._handle_tool_command(
            "!kg_store Vector_Search technology Vector Search is used by VANA"
        )

        # 7. Agent updates progress
        self.agent.memory_bank.update_section(
            "progress.md",
            "Completed Tasks",
            "- Explained VANA to the user\n- Learned about Vector Search capabilities",
        )

        # Check final state
        # Short-term memory should have the conversation
        conversation = self.agent.short_term_memory.get_all()
        self.assertEqual(len(conversation), 3)

        # Memory bank should have updated sections
        focus_section = self.agent.memory_bank.extract_section(
            "activeContext.md", "Current Focus"
        )
        self.assertEqual(focus_section["content"], "Explaining VANA to the user.")

        progress_section = self.agent.memory_bank.extract_section(
            "progress.md", "Completed Tasks"
        )
        self.assertIn("Explained VANA to the user", progress_section["content"])
        self.assertIn(
            "Learned about Vector Search capabilities", progress_section["content"]
        )


if __name__ == "__main__":
    unittest.main()
