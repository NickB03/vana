"""
Basic Conversation Test Scenario for VANA.

This module provides a comprehensive test scenario for basic conversation with the VANA agent,
including greeting, information retrieval, memory testing, and error handling.
"""

import logging
import os
import random
import sys
import time

# Add the parent directory to the path so we can import our modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))

from tests.e2e.framework.agent_client import AgentClient
from tests.e2e.framework.test_case import TestCase
from tests.e2e.framework.test_utils import extract_key_information

logger = logging.getLogger(__name__)


class BasicConversationTest(TestCase):
    """Test case for basic conversation with the VANA agent."""

    def __init__(self):
        """Initialize the test case."""
        super().__init__(
            name="basic_conversation", description="Comprehensive test for basic conversation with the VANA agent"
        )
        self.agent_client = None
        self.session_id = None
        self.conversation_history = []
        self.test_facts = [
            "My favorite color is blue",
            "I have a dog named Max",
            "I live in Seattle",
            "I work as a software engineer",
            "My birthday is in October",
        ]

    def setup(self):
        """Set up the test case."""
        logger.info("Setting up BasicConversationTest")
        self.agent_client = AgentClient()
        self.session_id = self.agent_client.create_session()
        self.conversation_history = []

    def teardown(self):
        """Tear down the test case."""
        logger.info("Tearing down BasicConversationTest")
        if self.session_id:
            self.agent_client.end_session(self.session_id)

    def _send_message_and_verify(self, message, step_name, expected_content=None, timeout=30):
        """Helper method to send a message and verify the response."""
        # Record message in conversation history
        self.conversation_history.append({"role": "user", "message": message})

        # Send message
        self.execute_step(self.agent_client.send_message, "vana", message, self.session_id)

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

        # Record response in conversation history
        if agent_response:
            self.conversation_history.append({"role": "assistant", "message": agent_response.get("message", "")})

            # Check for expected content if provided
            if expected_content:
                response_text = agent_response.get("message", "").lower()
                if isinstance(expected_content, list):
                    for content in expected_content:
                        self.assert_true(
                            content.lower() in response_text,
                            f"Expected '{content}' not found in response: {response_text}",
                        )
                else:
                    self.assert_true(
                        expected_content.lower() in response_text,
                        f"Expected '{expected_content}' not found in response: {response_text}",
                    )

        return agent_response

    def _run(self):
        """Run the test case."""
        # Step 1: Send a greeting message
        self.step("greeting", "Send a greeting message to the agent")
        greeting_response = self._send_message_and_verify(
            "Hello Vana! How are you today?", "greeting", ["hello", "hi", "greetings"]
        )

        # Step 2: Ask about capabilities
        self.step("capabilities", "Ask about agent capabilities")
        capabilities_response = self._send_message_and_verify(
            "What can you help me with?", "capabilities", ["help", "assist", "support"]
        )

        # Step 3: Share some personal information
        self.step("share_info", "Share personal information for memory testing")
        random_fact = random.choice(self.test_facts)
        share_response = self._send_message_and_verify(
            f"I want to tell you something about myself: {random_fact}.", "share_info", ["thank", "remember", "noted"]
        )

        # Step 4: Ask a follow-up question to test context maintenance
        self.step("follow_up", "Ask a follow-up question to test context")
        follow_up_response = self._send_message_and_verify(
            "Can you remember what I just told you about myself?", "follow_up", random_fact
        )

        # Step 5: Test knowledge retrieval
        self.step("knowledge", "Test knowledge retrieval capabilities")
        knowledge_response = self._send_message_and_verify(
            "What is a vector database and how does it work?",
            "knowledge",
            ["vector", "database", "similarity", "search"],
        )

        # Step 6: Test error handling with an ambiguous question
        self.step("ambiguous", "Test handling of ambiguous questions")
        ambiguous_response = self._send_message_and_verify("Can you tell me about that?", "ambiguous")

        # Check if the agent asked for clarification
        response_text = ambiguous_response.get("message", "").lower()
        self.assert_true(
            "clarify" in response_text or "specify" in response_text or "what" in response_text,
            "Agent did not ask for clarification on ambiguous question",
        )

        # Step 7: Test memory of earlier conversation
        self.step("memory", "Test memory of earlier conversation")
        memory_response = self._send_message_and_verify(
            "What was the first thing I asked you in our conversation?", "memory", ["hello", "how are you"]
        )

        # Step 8: Test handling of complex instructions
        self.step("complex", "Test handling of complex instructions")
        complex_response = self._send_message_and_verify(
            "I need you to do three things: 1) Tell me what time it is, 2) Remind me what I told you about myself, and 3) Suggest a book about artificial intelligence.",
            "complex",
        )

        # Check if all three parts were addressed
        response_text = complex_response.get("message", "").lower()
        self.assert_true("time" in response_text, "Time information missing from complex response")
        self.assert_true(random_fact.lower() in response_text, "Personal information missing from complex response")
        self.assert_true(
            "book" in response_text or "ai" in response_text or "artificial intelligence" in response_text,
            "Book suggestion missing from complex response",
        )

        # Step 9: Test conversation summary capability
        self.step("summary", "Test conversation summary capability")
        summary_response = self._send_message_and_verify("Can you summarize our conversation so far?", "summary")

        # Extract key points from the summary
        key_points = extract_key_information(summary_response.get("message", ""))

        # Verify that the summary contains key elements from the conversation
        self.assert_true(len(key_points) >= 3, "Summary does not contain enough key points")

        # Step 10: End the conversation
        self.step("end", "End the conversation")
        end_response = self._send_message_and_verify(
            "Thank you for chatting with me. Goodbye!", "end", ["goodbye", "bye", "farewell", "thank"]
        )


# Create an instance of the test case
test_case = BasicConversationTest()


def setup():
    """Set up the test scenario."""
    test_case.setup()


def run():
    """Run the test scenario."""
    return test_case.run()


def teardown():
    """Tear down the test scenario."""
    test_case.teardown()
