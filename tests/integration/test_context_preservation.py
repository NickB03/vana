"""
End-to-end test for context preservation across interactions.
"""

import os
import unittest
import tempfile
import shutil
from unittest.mock import MagicMock, patch

from vana.context import ConversationContextManager
from vana.adk_integration import (
    ADKSessionAdapter,
    ADKToolAdapter,
    ADKStateManager,
    ADKEventHandler
)
from vana.agents.vana import VanaAgent

class TestContextPreservation(unittest.TestCase):
    """Test context preservation across interactions."""
    
    def setUp(self):
        """Set up test environment."""
        # Create temporary directory for test database
        self.test_dir = tempfile.mkdtemp()
        self.db_path = os.path.join(self.test_dir, "test_context.db")
        
        # Mock ADK components
        self.mock_adk()
        
        # Create context manager
        self.context_manager = ConversationContextManager(db_path=self.db_path)
        
        # Create ADK integration components
        self.session_adapter = ADKSessionAdapter(self.context_manager)
        self.tool_adapter = ADKToolAdapter()
        self.state_manager = ADKStateManager(self.session_adapter, self.context_manager)
        self.event_handler = ADKEventHandler(
            self.session_adapter,
            self.state_manager,
            self.context_manager
        )
        
        # Create agent
        self.agent = self.create_mock_agent()
        
    def tearDown(self):
        """Clean up test environment."""
        # Remove temporary directory
        shutil.rmtree(self.test_dir)
        
    def mock_adk(self):
        """Mock ADK components."""
        # Mock ADK availability
        patcher1 = patch('vana.adk_integration.adk_session_adapter.ADK_AVAILABLE', True)
        patcher2 = patch('vana.adk_integration.adk_tool_adapter.ADK_AVAILABLE', True)
        patcher3 = patch('vana.adk_integration.adk_state_manager.ADK_AVAILABLE', True)
        patcher4 = patch('vana.adk_integration.adk_event_handler.ADK_AVAILABLE', True)
        
        # Start patchers
        self.addCleanup(patcher1.stop)
        self.addCleanup(patcher2.stop)
        self.addCleanup(patcher3.stop)
        self.addCleanup(patcher4.stop)
        patcher1.start()
        patcher2.start()
        patcher3.start()
        patcher4.start()
        
        # Mock InMemorySessionService
        class MockSession:
            def __init__(self, app_name, user_id, session_id):
                self.app_name = app_name
                self.user_id = user_id
                self.session_id = session_id
                self.state = {}

        class MockSessionService:
            def __init__(self):
                self.sessions = {}
                
            def create_session(self, app_name, user_id, session_id):
                session = MockSession(app_name, user_id, session_id)
                self.sessions[(app_name, user_id, session_id)] = session
                return session
                
            def get_session(self, app_name, user_id, session_id):
                return self.sessions.get((app_name, user_id, session_id))
                
        # Mock session service
        patcher5 = patch(
            'vana.adk_integration.adk_session_adapter.InMemorySessionService', 
            MockSessionService
        )
        self.addCleanup(patcher5.stop)
        patcher5.start()
        
        # Mock agent_lib.LlmAgent
        patcher6 = patch('google.generativeai.adk.agent.LlmAgent')
        self.mock_llm_agent = patcher6.start()
        self.addCleanup(patcher6.stop)
        
        # Mock tool_lib
        patcher7 = patch('google.generativeai.adk.tool')
        self.mock_tool_lib = patcher7.start()
        self.addCleanup(patcher7.stop)
        
    def create_mock_agent(self):
        """Create a mock agent."""
        # Create agent
        agent = VanaAgent()
        
        # Replace context manager with test instance
        agent.context_manager = self.context_manager
        
        # Update ADK integration components to use test context manager
        agent.session_adapter = self.session_adapter
        agent.tool_adapter = self.tool_adapter
        agent.state_manager = self.state_manager
        agent.event_handler = self.event_handler
        
        # Mock generate_response
        agent.generate_response = MagicMock(side_effect=[
            "I'll remember that your favorite color is blue.",
            "You told me earlier that your favorite color is blue."
        ])
        
        return agent
        
    def test_context_preservation_across_interactions(self):
        """Test that context is preserved across interactions."""
        # Process first message
        response1 = self.agent.process_message(
            user_id="test_user",
            session_id="test_session",
            message="My favorite color is blue."
        )
        
        # Check first response
        self.assertEqual(response1, "I'll remember that your favorite color is blue.")
        
        # Get context ID
        context_id = self.agent.current_context.id
        
        # Check that context was created
        self.assertIsNotNone(self.agent.current_context)
        
        # Check that message was added to context
        self.assertEqual(len(self.agent.current_context.messages), 2)
        self.assertEqual(self.agent.current_context.messages[0]["role"], "user")
        self.assertEqual(self.agent.current_context.messages[0]["content"], "My favorite color is blue.")
        self.assertEqual(self.agent.current_context.messages[1]["role"], "assistant")
        self.assertEqual(self.agent.current_context.messages[1]["content"], "I'll remember that your favorite color is blue.")
        
        # Process second message
        response2 = self.agent.process_message(
            user_id="test_user",
            session_id="test_session",
            message="What's my favorite color?"
        )
        
        # Check second response
        self.assertEqual(response2, "You told me earlier that your favorite color is blue.")
        
        # Check that context was preserved
        self.assertEqual(self.agent.current_context.id, context_id)
        
        # Check that both messages were added to context
        self.assertEqual(len(self.agent.current_context.messages), 4)
        self.assertEqual(self.agent.current_context.messages[0]["role"], "user")
        self.assertEqual(self.agent.current_context.messages[0]["content"], "My favorite color is blue.")
        self.assertEqual(self.agent.current_context.messages[1]["role"], "assistant")
        self.assertEqual(self.agent.current_context.messages[1]["content"], "I'll remember that your favorite color is blue.")
        self.assertEqual(self.agent.current_context.messages[2]["role"], "user")
        self.assertEqual(self.agent.current_context.messages[2]["content"], "What's my favorite color?")
        self.assertEqual(self.agent.current_context.messages[3]["role"], "assistant")
        self.assertEqual(self.agent.current_context.messages[3]["content"], "You told me earlier that your favorite color is blue.")
        
    def test_context_preservation_across_sessions(self):
        """Test that context is preserved across sessions."""
        # Process first message in first session
        response1 = self.agent.process_message(
            user_id="test_user",
            session_id="session1",
            message="My favorite color is blue."
        )
        
        # Check first response
        self.assertEqual(response1, "I'll remember that your favorite color is blue.")
        
        # Get context ID
        context_id1 = self.agent.current_context.id
        
        # Reset current context
        self.agent.current_context = None
        
        # Process second message in second session
        response2 = self.agent.process_message(
            user_id="test_user",
            session_id="session2",
            message="What's my favorite color?"
        )
        
        # Check second response
        self.assertEqual(response2, "You told me earlier that your favorite color is blue.")
        
        # Get second context ID
        context_id2 = self.agent.current_context.id
        
        # Check that contexts are different
        self.assertNotEqual(context_id1, context_id2)
        
        # Check that relevant memory was fetched
        self.agent.context_manager.fetch_relevant_memory.assert_called_once_with(
            query="What's my favorite color?",
            user_id="test_user",
            top_k=3
        )


if __name__ == "__main__":
    unittest.main()
