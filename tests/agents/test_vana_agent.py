"""
Tests for the VanaAgent class with context management and ADK integration.
"""

import os
import unittest
import tempfile
import shutil
from unittest.mock import MagicMock, patch

from vana.agents.vana import VanaAgent
from vana.context import ConversationContextManager, ConversationContext
from vana.adk_integration import (
    ADKSessionAdapter,
    ADKToolAdapter,
    ADKStateManager,
    ADKEventHandler
)

class TestVanaAgent(unittest.TestCase):
    """Test cases for the VanaAgent class."""
    
    def setUp(self):
        """Set up test environment."""
        # Create temporary directory for test database
        self.test_dir = tempfile.mkdtemp()
        self.db_path = os.path.join(self.test_dir, "test_context.db")
        
        # Mock ADK components
        self.mock_adk()
        
        # Create agent
        self.agent = VanaAgent()
        
        # Replace context manager with test instance
        self.agent.context_manager = ConversationContextManager(db_path=self.db_path)
        
        # Update ADK integration components to use test context manager
        self.agent.session_adapter = ADKSessionAdapter(self.agent.context_manager)
        self.agent.state_manager = ADKStateManager(
            self.agent.session_adapter, 
            self.agent.context_manager
        )
        self.agent.event_handler = ADKEventHandler(
            self.agent.session_adapter,
            self.agent.state_manager,
            self.agent.context_manager
        )
        
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
        
    def test_create_context(self):
        """Test creating a context."""
        # Create context
        context_data = self.agent.create_context(
            user_id="test_user",
            session_id="test_session"
        )
        
        # Check that context was created
        self.assertIsNotNone(self.agent.current_context)
        self.assertEqual(self.agent.current_context.user_id, "test_user")
        self.assertEqual(self.agent.current_context.session_id, "test_session")
        
        # Check that context was serialized
        self.assertIsInstance(context_data, dict)
        self.assertEqual(context_data["user_id"], "test_user")
        self.assertEqual(context_data["session_id"], "test_session")
        
    def test_process_message(self):
        """Test processing a message."""
        # Mock generate_response
        self.agent.generate_response = MagicMock(return_value="Test response")
        
        # Process message
        response = self.agent.process_message(
            user_id="test_user",
            session_id="test_session",
            message="Hello, world!"
        )
        
        # Check response
        self.assertEqual(response, "Test response")
        
        # Check that context was created
        self.assertIsNotNone(self.agent.current_context)
        
        # Check that message was added to context
        self.assertEqual(len(self.agent.current_context.messages), 2)
        self.assertEqual(self.agent.current_context.messages[0]["role"], "user")
        self.assertEqual(self.agent.current_context.messages[0]["content"], "Hello, world!")
        self.assertEqual(self.agent.current_context.messages[1]["role"], "assistant")
        self.assertEqual(self.agent.current_context.messages[1]["content"], "Test response")
        
    def test_handle_command(self):
        """Test handling a command."""
        # Mock search_knowledge_tool
        self.agent.search_knowledge_tool = MagicMock(return_value="Search results")
        
        # Handle command
        response = self.agent.handle_command("!vector_search test query")
        
        # Check response
        self.assertEqual(response, "Search results")
        
        # Check that search_knowledge_tool was called
        self.agent.search_knowledge_tool.assert_called_once_with("test query")
        
    def test_generate_response(self):
        """Test generating a response."""
        # Create context
        self.agent.create_context(
            user_id="test_user",
            session_id="test_session"
        )
        
        # Mock context_manager.fetch_relevant_memory
        self.agent.context_manager.fetch_relevant_memory = MagicMock(return_value=[
            {"content": "Relevant memory 1"},
            {"content": "Relevant memory 2"}
        ])
        
        # Mock context_manager.get_relevant_contexts
        self.agent.context_manager.get_relevant_contexts = MagicMock(return_value=[])
        
        # Mock super().generate_content
        with patch.object(self.agent.__class__, 'generate_content', create=True) as mock_generate:
            mock_response = MagicMock()
            mock_response.text = "Generated response"
            mock_generate.return_value = mock_response
            
            # Generate response
            response = self.agent.generate_response("Test query")
            
            # Check response
            self.assertEqual(response, "Generated response")
            
            # Check that generate_content was called with the right prompt
            expected_prompt = "Test query\n\nRelevant memory:\n- Relevant memory 1\n- Relevant memory 2"
            mock_generate.assert_called_once()
            actual_prompt = mock_generate.call_args[0][0]
            self.assertEqual(actual_prompt, expected_prompt)
            
    def test_conversation_context_preservation(self):
        """Test that conversation context is preserved across messages."""
        # Mock generate_response
        self.agent.generate_response = MagicMock(side_effect=[
            "First response",
            "Second response"
        ])
        
        # Process first message
        first_response = self.agent.process_message(
            user_id="test_user",
            session_id="test_session",
            message="First message"
        )
        
        # Check first response
        self.assertEqual(first_response, "First response")
        
        # Get context ID
        context_id = self.agent.current_context.id
        
        # Process second message
        second_response = self.agent.process_message(
            user_id="test_user",
            session_id="test_session",
            message="Second message"
        )
        
        # Check second response
        self.assertEqual(second_response, "Second response")
        
        # Check that context was preserved
        self.assertEqual(self.agent.current_context.id, context_id)
        
        # Check that both messages were added to context
        self.assertEqual(len(self.agent.current_context.messages), 4)
        self.assertEqual(self.agent.current_context.messages[0]["role"], "user")
        self.assertEqual(self.agent.current_context.messages[0]["content"], "First message")
        self.assertEqual(self.agent.current_context.messages[1]["role"], "assistant")
        self.assertEqual(self.agent.current_context.messages[1]["content"], "First response")
        self.assertEqual(self.agent.current_context.messages[2]["role"], "user")
        self.assertEqual(self.agent.current_context.messages[2]["content"], "Second message")
        self.assertEqual(self.agent.current_context.messages[3]["role"], "assistant")
        self.assertEqual(self.agent.current_context.messages[3]["content"], "Second response")


if __name__ == "__main__":
    unittest.main()
