"""
Basic Conversation Test Scenario for VANA.

This module provides a test scenario for basic conversation with the VANA agent.
"""

import os
import sys
import logging
import json
import time
from datetime import datetime

# Add the parent directory to the path so we can import our modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))

from tests.e2e.framework.test_case import TestCase
from tests.e2e.framework.agent_client import AgentClient

logger = logging.getLogger(__name__)

class BasicConversationTest(TestCase):
    """Test case for basic conversation with the VANA agent."""
    
    def __init__(self):
        """Initialize the test case."""
        super().__init__(
            name="basic_conversation",
            description="Test basic conversation with the VANA agent"
        )
        self.agent_client = None
        self.session_id = None
    
    def setup(self):
        """Set up the test case."""
        self.agent_client = AgentClient()
        self.session_id = self.agent_client.create_session()
    
    def teardown(self):
        """Tear down the test case."""
        if self.session_id:
            self.agent_client.end_session(self.session_id)
    
    def _run(self):
        """Run the test case."""
        # Step 1: Send a greeting message
        self.step("greeting", "Send a greeting message to the agent")
        response = self.execute_step(
            self.agent_client.send_message,
            "vana",
            "Hello, how are you?",
            self.session_id
        )
        
        # Wait for the agent's response
        agent_response = self.agent_client.wait_for_agent_response("vana", self.session_id)
        self.assert_true(agent_response is not None, "Agent did not respond to greeting")
        
        # Step 2: Ask a question about the agent
        self.step("question", "Ask a question about the agent")
        response = self.execute_step(
            self.agent_client.send_message,
            "vana",
            "What can you help me with?",
            self.session_id
        )
        
        # Wait for the agent's response
        agent_response = self.agent_client.wait_for_agent_response("vana", self.session_id)
        self.assert_true(agent_response is not None, "Agent did not respond to question")
        
        # Step 3: Ask a question that requires memory
        self.step("memory", "Ask a question that requires memory")
        response = self.execute_step(
            self.agent_client.send_message,
            "vana",
            "What was the first thing I asked you?",
            self.session_id
        )
        
        # Wait for the agent's response
        agent_response = self.agent_client.wait_for_agent_response("vana", self.session_id)
        self.assert_true(agent_response is not None, "Agent did not respond to memory question")
        
        # Check if the agent's response contains the first question
        self.assert_true(
            "hello" in agent_response.get("message", "").lower() or
            "how are you" in agent_response.get("message", "").lower(),
            "Agent's response does not reference the first question"
        )
        
        # Step 4: End the conversation
        self.step("end", "End the conversation")
        response = self.execute_step(
            self.agent_client.send_message,
            "vana",
            "Thank you, goodbye!",
            self.session_id
        )
        
        # Wait for the agent's response
        agent_response = self.agent_client.wait_for_agent_response("vana", self.session_id)
        self.assert_true(agent_response is not None, "Agent did not respond to goodbye")

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
