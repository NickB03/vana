"""
Memory Retrieval Test Scenario for VANA.

This module provides a test scenario for memory retrieval with the VANA agent.
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

class MemoryRetrievalTest(TestCase):
    """Test case for memory retrieval with the VANA agent."""
    
    def __init__(self):
        """Initialize the test case."""
        super().__init__(
            name="memory_retrieval",
            description="Test memory retrieval with the VANA agent"
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
        # Step 1: Provide some information to the agent
        self.step("provide_information", "Provide information to the agent")
        response = self.execute_step(
            self.agent_client.send_message,
            "vana",
            "My name is John and I work as a software engineer at Acme Corp.",
            self.session_id
        )
        
        # Wait for the agent's response
        agent_response = self.agent_client.wait_for_agent_response("vana", self.session_id)
        self.assert_true(agent_response is not None, "Agent did not respond to information")
        
        # Step 2: Provide more information
        self.step("provide_more_information", "Provide more information to the agent")
        response = self.execute_step(
            self.agent_client.send_message,
            "vana",
            "I'm working on a project called Project X, which is a machine learning system for predicting customer behavior.",
            self.session_id
        )
        
        # Wait for the agent's response
        agent_response = self.agent_client.wait_for_agent_response("vana", self.session_id)
        self.assert_true(agent_response is not None, "Agent did not respond to more information")
        
        # Step 3: Ask a question about the first piece of information
        self.step("retrieve_first_information", "Ask about the first piece of information")
        response = self.execute_step(
            self.agent_client.send_message,
            "vana",
            "What is my name and where do I work?",
            self.session_id
        )
        
        # Wait for the agent's response
        agent_response = self.agent_client.wait_for_agent_response("vana", self.session_id)
        self.assert_true(agent_response is not None, "Agent did not respond to first retrieval question")
        
        # Check if the agent's response contains the correct information
        self.assert_true(
            "john" in agent_response.get("message", "").lower() and
            "acme" in agent_response.get("message", "").lower(),
            "Agent's response does not contain the correct name and company"
        )
        
        # Step 4: Ask a question about the second piece of information
        self.step("retrieve_second_information", "Ask about the second piece of information")
        response = self.execute_step(
            self.agent_client.send_message,
            "vana",
            "What project am I working on and what is it about?",
            self.session_id
        )
        
        # Wait for the agent's response
        agent_response = self.agent_client.wait_for_agent_response("vana", self.session_id)
        self.assert_true(agent_response is not None, "Agent did not respond to second retrieval question")
        
        # Check if the agent's response contains the correct information
        self.assert_true(
            "project x" in agent_response.get("message", "").lower() and
            "machine learning" in agent_response.get("message", "").lower() and
            "customer behavior" in agent_response.get("message", "").lower(),
            "Agent's response does not contain the correct project information"
        )
        
        # Step 5: Ask a complex question that requires combining information
        self.step("complex_retrieval", "Ask a complex question that requires combining information")
        response = self.execute_step(
            self.agent_client.send_message,
            "vana",
            "What is my profession and what kind of project am I working on?",
            self.session_id
        )
        
        # Wait for the agent's response
        agent_response = self.agent_client.wait_for_agent_response("vana", self.session_id)
        self.assert_true(agent_response is not None, "Agent did not respond to complex retrieval question")
        
        # Check if the agent's response contains the correct information
        self.assert_true(
            "software engineer" in agent_response.get("message", "").lower() and
            "project x" in agent_response.get("message", "").lower() and
            "machine learning" in agent_response.get("message", "").lower(),
            "Agent's response does not contain the correct combined information"
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
