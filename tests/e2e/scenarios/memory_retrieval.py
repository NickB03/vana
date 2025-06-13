"""
Memory Retrieval Test Scenario for VANA.

This module provides a comprehensive test scenario for testing memory retrieval capabilities
of the VANA agent, including short-term and long-term memory, context maintenance,
and handling of corrections to previously stored information.
"""

import logging
import os
import random
import sys
import time
from datetime import datetime, timedelta

# Add the parent directory to the path so we can import our modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))

from tests.e2e.framework.agent_client import AgentClient
from tests.e2e.framework.test_case import TestCase
from tests.e2e.framework.test_utils import check_response_coherence, extract_key_information

logger = logging.getLogger(__name__)


class MemoryRetrievalTest(TestCase):
    """Test case for memory retrieval capabilities of the VANA agent."""

    def __init__(self):
        """Initialize the test case."""
        super().__init__(
            name="memory_retrieval",
            description="Comprehensive test for memory retrieval capabilities of the VANA agent",
        )
        self.agent_client = None
        self.session_id = None
        self.memory_items = [
            {
                "type": "personal_fact",
                "content": "My name is Alex Chen and I work as a software engineer at Acme Corp",
                "category": "identity",
            },
            {"type": "personal_fact", "content": "My favorite movie is The Matrix", "category": "preferences"},
            {"type": "personal_fact", "content": "I have two cats named Luna and Stella", "category": "pets"},
            {
                "type": "event",
                "content": "I have a doctor's appointment next Tuesday at 2pm",
                "category": "appointments",
            },
            {"type": "task", "content": "I need to finish the quarterly report by Friday", "category": "work"},
            {"type": "contact", "content": "My colleague Taylor's email is taylor@example.com", "category": "contacts"},
        ]
        self.stored_memories = []

    def setup(self):
        """Set up the test case."""
        logger.info("Setting up MemoryRetrievalTest")
        self.agent_client = AgentClient()
        self.session_id = self.agent_client.create_session()
        self.stored_memories = []

    def teardown(self):
        """Tear down the test case."""
        logger.info("Tearing down MemoryRetrievalTest")
        if self.session_id:
            self.agent_client.end_session(self.session_id)

    def _send_message_and_verify(self, message, expected_content=None, timeout=30):
        """Helper method to send a message and verify the response."""
        # Send message
        response = self.execute_step(self.agent_client.send_message, "vana", message, self.session_id)

        # Wait for agent response
        start_time = time.time()
        agent_response = None
        while time.time() - start_time < timeout:
            agent_response = self.agent_client.wait_for_agent_response("vana", self.session_id)
            if agent_response is not None:
                break
            time.sleep(1)

        # Verify response
        self.assert_true(agent_response is not None, f"Agent did not respond to: {message}")

        # Check for expected content if provided
        if expected_content and agent_response:
            response_text = agent_response.get("message", "").lower()
            if isinstance(expected_content, list):
                for content in expected_content:
                    self.assert_true(
                        content.lower() in response_text, f"Expected '{content}' not found in response: {response_text}"
                    )
            else:
                self.assert_true(
                    expected_content.lower() in response_text,
                    f"Expected '{expected_content}' not found in response: {response_text}",
                )

        return agent_response

    def _run(self):
        """Run the test case."""
        # Step 1: Start conversation and establish context
        self.step("start", "Start conversation and establish context")
        self._send_message_and_verify(
            "Hello Vana, I'd like to test your memory capabilities today.", ["hello", "memory", "help"]
        )

        # Step 2: Store multiple memory items with delays between them
        self.step("store_memories", "Store multiple memory items")

        # Shuffle memory items to randomize the order
        random.shuffle(self.memory_items)

        # Store each memory item
        for i, memory_item in enumerate(self.memory_items):
            # Store the memory
            self.substep(f"store_memory_{i+1}", f"Store memory item {i+1}: {memory_item['content']}")
            response = self._send_message_and_verify(
                f"Please remember that {memory_item['content']}.", ["remember", "noted", "got it"]
            )

            # Add to stored memories
            self.stored_memories.append(memory_item)

            # Add a short delay between memory items to simulate natural conversation
            if i < len(self.memory_items) - 1:
                time.sleep(2)

        # Step 3: Engage in unrelated conversation to create distance
        self.step("unrelated_conversation", "Engage in unrelated conversation")

        # Ask a few unrelated questions
        unrelated_questions = [
            "What's the weather like today?",
            "Can you tell me about vector databases?",
            "How does machine learning work?",
            "What's your favorite color?",
        ]

        for i, question in enumerate(unrelated_questions):
            self.substep(f"unrelated_{i+1}", f"Ask unrelated question {i+1}")
            self._send_message_and_verify(question)
            time.sleep(2)

        # Step 4: Test immediate recall of the most recent memory
        self.step("recent_recall", "Test recall of most recent memory")
        most_recent = self.stored_memories[-1]
        response = self._send_message_and_verify(
            "What was the last important thing I asked you to remember?", most_recent["content"]
        )

        # Step 5: Test recall of a specific memory by category
        self.step("category_recall", "Test recall by category")

        # Find a memory with category "work" or "appointments"
        target_categories = ["work", "appointments"]
        category_memories = [m for m in self.stored_memories if m["category"] in target_categories]

        if category_memories:
            target_memory = random.choice(category_memories)
            category_name = target_memory["category"]

            response = self._send_message_and_verify(
                f"What do I need to do related to {category_name}?", target_memory["content"]
            )
        else:
            self.log_warning("No memories with target categories found")

        # Step 6: Test recall of identity information
        self.step("identity_recall", "Test recall of identity information")
        identity_memories = [m for m in self.stored_memories if m["category"] == "identity"]

        if identity_memories:
            identity_memory = identity_memories[0]
            response = self._send_message_and_verify("What is my name and where do I work?", ["Alex Chen", "Acme Corp"])
        else:
            self.log_warning("No identity memory found")

        # Step 7: Test recall of all stored memories
        self.step("all_memories", "Test recall of all stored memories")
        response = self._send_message_and_verify(
            "Can you summarize all the important information I've shared with you today?"
        )

        # Check if response contains all stored memories
        if response:
            response_text = response.get("message", "").lower()
            missing_memories = []

            for memory in self.stored_memories:
                # Create a simplified version of the memory content for matching
                memory_keywords = " ".join(memory["content"].lower().split()[:4])

                if memory_keywords not in response_text:
                    missing_memories.append(memory["content"])

            # Assert that at least 80% of memories were recalled
            recall_percentage = (len(self.stored_memories) - len(missing_memories)) / len(self.stored_memories)
            self.assert_true(
                recall_percentage >= 0.8,
                f"Agent recalled only {recall_percentage:.0%} of memories. Missing: {missing_memories}",
            )

        # Step 8: Test recall after a simulated time gap
        self.step("time_gap_recall", "Test recall after time gap")

        # First, tell the agent we're going to continue later
        self._send_message_and_verify(
            "I need to step away for a bit. We'll continue our conversation later.", ["okay", "sure", "later"]
        )

        # Wait a bit to simulate time passing
        time.sleep(5)

        # Now come back and test recall
        random_memory = random.choice(self.stored_memories)
        response = self._send_message_and_verify(
            "I'm back. Can you still remember what I told you about " + random_memory["category"] + "?",
            random_memory["content"],
        )

        # Step 9: Test memory correction
        self.step("memory_correction", "Test memory correction")

        # Choose a memory to correct
        memory_to_correct = random.choice(self.stored_memories)
        original_content = memory_to_correct["content"]

        # Create a corrected version
        if "favorite" in original_content:
            corrected_content = original_content.replace("favorite", "second favorite")
        elif "two cats" in original_content:
            corrected_content = original_content.replace("two cats", "three cats") + " and Nova"
        elif "next Tuesday" in original_content:
            corrected_content = original_content.replace("next Tuesday", "next Wednesday")
        elif "Friday" in original_content:
            corrected_content = original_content.replace("Friday", "Thursday")
        elif "@example.com" in original_content:
            corrected_content = original_content.replace("@example.com", "@company.com")
        else:
            # Fallback correction
            corrected_content = "Actually, " + original_content + " is not correct"

        # Send the correction
        self._send_message_and_verify(
            f"I need to correct something. {corrected_content}.", ["updated", "corrected", "changed", "noted"]
        )

        # Test if the correction was remembered
        response = self._send_message_and_verify(
            f"What do you remember about my {memory_to_correct['category']}?", corrected_content
        )

        # Step 10: Test complex retrieval that requires combining information
        self.step("complex_retrieval", "Test complex retrieval requiring information combination")

        # Find work and identity memories
        work_memories = [m for m in self.stored_memories if m["category"] == "work"]
        identity_memories = [m for m in self.stored_memories if m["category"] == "identity"]

        if work_memories and identity_memories:
            response = self._send_message_and_verify(
                "What is my profession and what task do I need to complete?", ["software engineer", "report"]
            )
        else:
            self.log_warning("Missing work or identity memories for complex retrieval test")

        # Step 11: End the test
        self.step("end", "End the test")
        self._send_message_and_verify(
            "Thank you for helping me test your memory capabilities. How do you think you did?",
            ["memory", "remember", "test"],
        )


# Create an instance of the test case
test_case = MemoryRetrievalTest()


def setup():
    """Set up the test scenario."""
    test_case.setup()


def run():
    """Run the test scenario."""
    return test_case.run()


def teardown():
    """Tear down the test scenario."""
    test_case.teardown()
