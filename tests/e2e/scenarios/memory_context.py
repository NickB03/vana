#!/usr/bin/env python3
"""
End-to-end test scenario for memory and context preservation.

This scenario tests the agent's ability to maintain context across interactions,
including short-term memory and memory bank integration.
"""

import os
import sys
import tempfile
import unittest
from unittest.mock import MagicMock

# Add the project root to the Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(current_dir, "..", "..", ".."))
sys.path.append(project_root)

from agent.core import VanaAgent
from agent.memory.memory_bank import MemoryBankManager
from agent.memory.short_term import ShortTermMemory


class MemoryContextScenario(unittest.TestCase):
    """End-to-end test scenario for memory and context preservation."""

    def setUp(self):
        """Set up test fixtures."""
        # Create a temporary directory for test files
        self.temp_dir = tempfile.TemporaryDirectory()
        self.test_dir = self.temp_dir.name

        # Create test memory bank files
        self.active_context_file = os.path.join(self.test_dir, "activeContext.md")
        with open(self.active_context_file, "w") as f:
            f.write(
                "# Active Context\n\n## Current Focus\n\nThis is the current focus."
            )

        self.progress_file = os.path.join(self.test_dir, "progress.md")
        with open(self.progress_file, "w") as f:
            f.write("# Progress\n\n## Completed Tasks\n\nThese are completed tasks.")

        # Create agent
        self.agent = self._create_agent()

        # Start a session
        self.session_id = self.agent.create_session("test_user")

    def tearDown(self):
        """Tear down test fixtures."""
        self.temp_dir.cleanup()

    def _create_agent(self) -> VanaAgent:
        """
        Create and configure the VANA agent.

        Returns:
            Configured VanaAgent instance
        """
        # Create agent with mock model
        agent = VanaAgent(name="vana", model="mock-model")

        # Mock the generate_response method
        agent.generate_response = MagicMock(return_value="Mock response")

        # Add real memory components
        agent.short_term_memory = ShortTermMemory(max_items=100)
        agent.memory_bank = MemoryBankManager(memory_bank_dir=self.test_dir)

        return agent

    def test_short_term_memory(self):
        """Test short-term memory for context preservation."""
        # Step 1: Store user information
        self.agent.process_message(
            "My name is Test User and I'm interested in AI agents.",
            session_id=self.session_id,
        )

        # Step 2: Store user preferences
        self.agent.process_message(
            "I prefer detailed explanations and examples.", session_id=self.session_id
        )

        # Step 3: Ask about a topic
        self.agent.process_message(
            "Can you tell me about memory systems in AI?", session_id=self.session_id
        )

        # Step 4: Ask a follow-up question
        self.agent.process_message(
            "How does that relate to knowledge graphs?", session_id=self.session_id
        )

        # Step 5: Ask about user preferences
        response = self.agent.process_message(
            "What are my preferences?", session_id=self.session_id
        )

        # Verify that all interactions are in short-term memory
        memory_items = self.agent.short_term_memory.get_all()
        self.assertEqual(len(memory_items), 10)  # 5 user messages and 5 agent responses

        # Verify the content of the first user message
        self.assertEqual(memory_items[0]["role"], "user")
        self.assertEqual(
            memory_items[0]["content"],
            "My name is Test User and I'm interested in AI agents.",
        )

        # Verify the content of the second user message
        self.assertEqual(memory_items[2]["role"], "user")
        self.assertEqual(
            memory_items[2]["content"], "I prefer detailed explanations and examples."
        )

    def test_memory_bank_integration(self):
        """Test memory bank integration."""
        # Step 1: Read the active context
        result = self.agent.memory_bank.read_file("activeContext.md")

        # Verify that the file was read successfully
        self.assertTrue(result["success"])
        self.assertEqual(result["filename"], "activeContext.md")
        self.assertIn("Current Focus", result["content"])

        # Step 2: Extract the current focus section
        section = self.agent.memory_bank.extract_section(
            "activeContext.md", "Current Focus"
        )

        # Verify that the section was extracted successfully
        self.assertTrue(section["success"])
        self.assertEqual(section["section"], "Current Focus")
        self.assertEqual(section["content"], "This is the current focus.")

        # Step 3: Update the current focus section
        update_result = self.agent.memory_bank.update_section(
            "activeContext.md", "Current Focus", "This is the updated current focus."
        )

        # Verify that the section was updated successfully
        self.assertTrue(update_result["success"])

        # Step 4: Read the updated section
        updated_section = self.agent.memory_bank.extract_section(
            "activeContext.md", "Current Focus"
        )

        # Verify that the section was updated
        self.assertTrue(updated_section["success"])
        self.assertEqual(
            updated_section["content"], "This is the updated current focus."
        )

        # Step 5: List all memory bank files
        list_result = self.agent.memory_bank.list_files()

        # Verify that the files were listed successfully
        self.assertTrue(list_result["success"])
        self.assertEqual(len(list_result["files"]), 2)

        # Verify that the files are in the list
        filenames = [file["filename"] for file in list_result["files"]]
        self.assertIn("activeContext.md", filenames)
        self.assertIn("progress.md", filenames)

    def test_combined_memory_workflow(self):
        """Test a combined workflow using both short-term memory and memory bank."""
        # Step 1: Store user information in short-term memory
        self.agent.process_message(
            "My name is Test User and I'm working on the VANA project.",
            session_id=self.session_id,
        )

        # Step 2: Update the current focus in the memory bank
        self.agent.memory_bank.update_section(
            "activeContext.md",
            "Current Focus",
            "Working on memory integration for the VANA project.",
        )

        # Step 3: Ask about the current focus
        self.agent.process_message(
            "What is the current focus of the project?", session_id=self.session_id
        )

        # Step 4: Update the completed tasks in the memory bank
        self.agent.memory_bank.update_section(
            "progress.md",
            "Completed Tasks",
            "- Implemented short-term memory\n- Implemented memory bank integration",
        )

        # Step 5: Ask about completed tasks
        self.agent.process_message(
            "What tasks have been completed?", session_id=self.session_id
        )

        # Step 6: Ask about the user
        self.agent.process_message(
            "Who am I and what am I working on?", session_id=self.session_id
        )

        # Verify that all interactions are in short-term memory
        memory_items = self.agent.short_term_memory.get_all()
        self.assertEqual(len(memory_items), 8)  # 4 user messages and 4 agent responses

        # Verify the content of the first user message
        self.assertEqual(memory_items[0]["role"], "user")
        self.assertEqual(
            memory_items[0]["content"],
            "My name is Test User and I'm working on the VANA project.",
        )

        # Verify that the memory bank was updated
        current_focus = self.agent.memory_bank.extract_section(
            "activeContext.md", "Current Focus"
        )
        self.assertEqual(
            current_focus["content"],
            "Working on memory integration for the VANA project.",
        )

        completed_tasks = self.agent.memory_bank.extract_section(
            "progress.md", "Completed Tasks"
        )
        self.assertIn("Implemented short-term memory", completed_tasks["content"])
        self.assertIn("Implemented memory bank integration", completed_tasks["content"])


if __name__ == "__main__":
    unittest.main()
