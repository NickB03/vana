"""
Tests for the ADKSessionAdapter class.
"""

import os
import unittest
import tempfile
import shutil
from unittest.mock import MagicMock, patch

from vana.context import ConversationContextManager
from vana.adk_integration import ADKSessionAdapter

# Mock ADK classes
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

class TestADKSessionAdapter(unittest.TestCase):
    """Test cases for the ADKSessionAdapter class."""
    
    def setUp(self):
        """Set up test environment."""
        # Create temporary directory for test database
        self.test_dir = tempfile.mkdtemp()
        self.db_path = os.path.join(self.test_dir, "test_context.db")
        
        # Create context manager
        self.context_manager = ConversationContextManager(db_path=self.db_path)
        
        # Create session adapter with mocked ADK
        with patch('vana.adk_integration.adk_session_adapter.ADK_AVAILABLE', True):
            with patch('vana.adk_integration.adk_session_adapter.InMemorySessionService', MockSessionService):
                self.session_adapter = ADKSessionAdapter(self.context_manager)
                self.session_adapter.adk_available = True
                self.session_adapter.session_service = MockSessionService()
        
    def tearDown(self):
        """Clean up test environment."""
        # Remove temporary directory
        shutil.rmtree(self.test_dir)
        
    def test_create_session(self):
        """Test creating a session."""
        # Create session
        session_info = self.session_adapter.create_session(
            user_id="test_user",
            session_id="test_session"
        )
        
        # Check session info
        self.assertEqual(session_info["user_id"], "test_user")
        self.assertEqual(session_info["session_id"], "test_session")
        self.assertIsNotNone(session_info["vana_context_id"])
        self.assertEqual(session_info["adk_session_id"], "test_session")
        
        # Check that context was created
        context = self.context_manager.get_conversation_context(session_info["vana_context_id"])
        self.assertIsNotNone(context)
        self.assertEqual(context.user_id, "test_user")
        self.assertEqual(context.session_id, "test_session")
        
        # Check that session mapping was created
        self.assertIn(context.id, self.session_adapter.session_map)
        self.assertEqual(self.session_adapter.session_map[context.id], "test_session")
        
    def test_get_session(self):
        """Test getting a session."""
        # Create session
        session_info = self.session_adapter.create_session(
            user_id="test_user",
            session_id="test_session"
        )
        
        # Get context ID
        context_id = session_info["vana_context_id"]
        
        # Get session
        retrieved_session_info = self.session_adapter.get_session(context_id)
        
        # Check retrieved session info
        self.assertEqual(retrieved_session_info["user_id"], "test_user")
        self.assertEqual(retrieved_session_info["session_id"], "test_session")
        self.assertEqual(retrieved_session_info["vana_context_id"], context_id)
        self.assertEqual(retrieved_session_info["adk_session_id"], "test_session")
        
    def test_sync_session_state(self):
        """Test synchronizing session state."""
        # Create session
        session_info = self.session_adapter.create_session(
            user_id="test_user",
            session_id="test_session"
        )
        
        # Get context ID
        context_id = session_info["vana_context_id"]
        
        # Get context
        context = self.context_manager.get_conversation_context(context_id)
        
        # Add data to context
        context.data["test_key"] = "test_value"
        context.add_message("user", "Hello, world!")
        context.add_entity("person", "John Doe", {"age": 30})
        self.context_manager.save_conversation_context(context)
        
        # Sync session state
        result = self.session_adapter.sync_session_state(context_id)
        
        # Check result
        self.assertTrue(result)
        
        # Get ADK session
        adk_session = self.session_adapter.get_adk_session(context_id)
        
        # Check ADK session state
        self.assertEqual(adk_session.state["test_key"], "test_value")
        self.assertEqual(len(adk_session.state["messages"]), 1)
        self.assertEqual(adk_session.state["messages"][0]["content"], "Hello, world!")
        self.assertEqual(len(adk_session.state["entities"]), 1)
        self.assertEqual(adk_session.state["entities"][0]["name"], "John Doe")
        
        # Add data to ADK session
        adk_session.state["adk_key"] = "adk_value"
        
        # Sync session state again
        result = self.session_adapter.sync_session_state(context_id)
        
        # Check result
        self.assertTrue(result)
        
        # Get updated context
        updated_context = self.context_manager.get_conversation_context(context_id)
        
        # Check that ADK data was synced to context
        self.assertEqual(updated_context.data["adk_key"], "adk_value")
        
    def test_add_message_to_session(self):
        """Test adding a message to a session."""
        # Create session
        session_info = self.session_adapter.create_session(
            user_id="test_user",
            session_id="test_session"
        )
        
        # Get context ID
        context_id = session_info["vana_context_id"]
        
        # Add message
        result = self.session_adapter.add_message_to_session(
            context_id=context_id,
            role="user",
            content="Hello, world!"
        )
        
        # Check result
        self.assertTrue(result)
        
        # Get context
        context = self.context_manager.get_conversation_context(context_id)
        
        # Check context messages
        self.assertEqual(len(context.messages), 1)
        self.assertEqual(context.messages[0]["role"], "user")
        self.assertEqual(context.messages[0]["content"], "Hello, world!")
        
        # Get ADK session
        adk_session = self.session_adapter.get_adk_session(context_id)
        
        # Check ADK session messages
        self.assertEqual(len(adk_session.state["messages"]), 1)
        self.assertEqual(adk_session.state["messages"][0]["role"], "user")
        self.assertEqual(adk_session.state["messages"][0]["content"], "Hello, world!")
        
        # Add another message
        result = self.session_adapter.add_message_to_session(
            context_id=context_id,
            role="assistant",
            content="Hi there!"
        )
        
        # Check result
        self.assertTrue(result)
        
        # Get updated context
        updated_context = self.context_manager.get_conversation_context(context_id)
        
        # Check updated context messages
        self.assertEqual(len(updated_context.messages), 2)
        self.assertEqual(updated_context.messages[1]["role"], "assistant")
        self.assertEqual(updated_context.messages[1]["content"], "Hi there!")
        
        # Get updated ADK session
        updated_adk_session = self.session_adapter.get_adk_session(context_id)
        
        # Check updated ADK session messages
        self.assertEqual(len(updated_adk_session.state["messages"]), 2)
        self.assertEqual(updated_adk_session.state["messages"][1]["role"], "assistant")
        self.assertEqual(updated_adk_session.state["messages"][1]["content"], "Hi there!")
        
    def test_get_adk_session(self):
        """Test getting an ADK session."""
        # Create session
        session_info = self.session_adapter.create_session(
            user_id="test_user",
            session_id="test_session"
        )
        
        # Get context ID
        context_id = session_info["vana_context_id"]
        
        # Get ADK session
        adk_session = self.session_adapter.get_adk_session(context_id)
        
        # Check ADK session
        self.assertIsNotNone(adk_session)
        self.assertEqual(adk_session.app_name, self.session_adapter.app_name)
        self.assertEqual(adk_session.user_id, "test_user")
        self.assertEqual(adk_session.session_id, "test_session")
        
    def test_get_vana_context(self):
        """Test getting a VANA context from an ADK session."""
        # Create session
        session_info = self.session_adapter.create_session(
            user_id="test_user",
            session_id="test_session"
        )
        
        # Get context ID
        context_id = session_info["vana_context_id"]
        
        # Get VANA context from ADK session
        context = self.session_adapter.get_vana_context(
            adk_session_id="test_session",
            user_id="test_user"
        )
        
        # Check context
        self.assertIsNotNone(context)
        self.assertEqual(context.id, context_id)
        self.assertEqual(context.user_id, "test_user")
        self.assertEqual(context.session_id, "test_session")
        
    def test_fallback_when_adk_not_available(self):
        """Test fallback behavior when ADK is not available."""
        # Create session adapter with ADK not available
        with patch('vana.adk_integration.adk_session_adapter.ADK_AVAILABLE', False):
            fallback_adapter = ADKSessionAdapter(self.context_manager)
            
        # Check that ADK is not available
        self.assertFalse(fallback_adapter.is_adk_available())
        
        # Create session
        session_info = fallback_adapter.create_session(
            user_id="test_user",
            session_id="test_session"
        )
        
        # Check session info
        self.assertEqual(session_info["user_id"], "test_user")
        self.assertEqual(session_info["session_id"], "test_session")
        self.assertIsNotNone(session_info["vana_context_id"])
        self.assertIsNone(session_info["adk_session_id"])
        
        # Get context ID
        context_id = session_info["vana_context_id"]
        
        # Check that context was created
        context = self.context_manager.get_conversation_context(context_id)
        self.assertIsNotNone(context)
        self.assertEqual(context.user_id, "test_user")
        self.assertEqual(context.session_id, "test_session")
        
        # Add message
        result = fallback_adapter.add_message_to_session(
            context_id=context_id,
            role="user",
            content="Hello, world!"
        )
        
        # Check result
        self.assertTrue(result)
        
        # Get context
        context = self.context_manager.get_conversation_context(context_id)
        
        # Check context messages
        self.assertEqual(len(context.messages), 1)
        self.assertEqual(context.messages[0]["role"], "user")
        self.assertEqual(context.messages[0]["content"], "Hello, world!")


if __name__ == "__main__":
    unittest.main()
