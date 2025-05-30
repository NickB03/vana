"""
Tests for the ADKStateManager class.
"""

import os
import unittest
import tempfile
import shutil
import json
from unittest.mock import MagicMock, patch

from vana.context import ConversationContextManager, ConversationContext
from vana.adk_integration import ADKSessionAdapter, ADKStateManager

# Mock ADK classes
class MockSession:
    def __init__(self, app_name, user_id, session_id):
        self.app_name = app_name
        self.user_id = user_id
        self.session_id = session_id
        self.state = {}

class TestADKStateManager(unittest.TestCase):
    """Test cases for the ADKStateManager class."""
    
    def setUp(self):
        """Set up test environment."""
        # Create temporary directory for test database
        self.test_dir = tempfile.mkdtemp()
        self.db_path = os.path.join(self.test_dir, "test_context.db")
        
        # Mock ADK availability
        patcher1 = patch('vana.adk_integration.adk_session_adapter.ADK_AVAILABLE', True)
        patcher2 = patch('vana.adk_integration.adk_state_manager.ADK_AVAILABLE', True)
        self.addCleanup(patcher1.stop)
        self.addCleanup(patcher2.stop)
        patcher1.start()
        patcher2.start()
        
        # Mock InMemorySessionService
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
        patcher3 = patch(
            'vana.adk_integration.adk_session_adapter.InMemorySessionService', 
            MockSessionService
        )
        self.addCleanup(patcher3.stop)
        patcher3.start()
        
        # Create context manager
        self.context_manager = ConversationContextManager(db_path=self.db_path)
        
        # Create session adapter
        self.session_adapter = ADKSessionAdapter(self.context_manager)
        
        # Create state manager
        self.state_manager = ADKStateManager(self.session_adapter, self.context_manager)
        
    def tearDown(self):
        """Clean up test environment."""
        # Remove temporary directory
        shutil.rmtree(self.test_dir)
        
    def test_get_state(self):
        """Test getting state."""
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
        context.set_summary("Test summary")
        self.context_manager.save_conversation_context(context)
        
        # Get state
        state = self.state_manager.get_state(context_id)
        
        # Check state
        self.assertEqual(state["data"]["test_key"], "test_value")
        self.assertEqual(len(state["messages"]), 1)
        self.assertEqual(state["messages"][0]["content"], "Hello, world!")
        self.assertEqual(len(state["entities"]), 1)
        self.assertEqual(state["entities"][0]["name"], "John Doe")
        self.assertEqual(state["summary"], "Test summary")
        self.assertEqual(state["user_id"], "test_user")
        self.assertEqual(state["session_id"], "test_session")
        
    def test_set_state(self):
        """Test setting state."""
        # Create session
        session_info = self.session_adapter.create_session(
            user_id="test_user",
            session_id="test_session"
        )
        
        # Get context ID
        context_id = session_info["vana_context_id"]
        
        # Create state
        state = {
            "data": {"test_key": "test_value"},
            "messages": [
                {"role": "user", "content": "Hello, world!", "timestamp": "2023-01-01T00:00:00"}
            ],
            "entities": [
                {"type": "person", "name": "John Doe", "value": {"age": 30}, "confidence": 1.0, "timestamp": "2023-01-01T00:00:00"}
            ],
            "summary": "Test summary"
        }
        
        # Set state
        result = self.state_manager.set_state(context_id, state)
        
        # Check result
        self.assertTrue(result)
        
        # Get context
        context = self.context_manager.get_conversation_context(context_id)
        
        # Check context
        self.assertEqual(context.data["test_key"], "test_value")
        self.assertEqual(len(context.messages), 1)
        self.assertEqual(context.messages[0]["content"], "Hello, world!")
        self.assertEqual(len(context.entities), 1)
        self.assertEqual(context.entities[0]["name"], "John Doe")
        self.assertEqual(context.summary, "Test summary")
        
        # Get ADK session
        adk_session = self.session_adapter.get_adk_session(context_id)
        
        # Check ADK session state
        self.assertEqual(adk_session.state["test_key"], "test_value")
        self.assertEqual(len(adk_session.state["messages"]), 1)
        self.assertEqual(adk_session.state["messages"][0]["content"], "Hello, world!")
        self.assertEqual(len(adk_session.state["entities"]), 1)
        self.assertEqual(adk_session.state["entities"][0]["name"], "John Doe")
        
    def test_update_state(self):
        """Test updating state."""
        # Create session
        session_info = self.session_adapter.create_session(
            user_id="test_user",
            session_id="test_session"
        )
        
        # Get context ID
        context_id = session_info["vana_context_id"]
        
        # Update state
        result = self.state_manager.update_state(context_id, "test_key", "test_value")
        
        # Check result
        self.assertTrue(result)
        
        # Get context
        context = self.context_manager.get_conversation_context(context_id)
        
        # Check context
        self.assertEqual(context.data["test_key"], "test_value")
        
        # Get ADK session
        adk_session = self.session_adapter.get_adk_session(context_id)
        
        # Check ADK session state
        self.assertEqual(adk_session.state["test_key"], "test_value")
        
    def test_get_state_value(self):
        """Test getting a state value."""
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
        self.context_manager.save_conversation_context(context)
        
        # Get state value
        value = self.state_manager.get_state_value(context_id, "test_key")
        
        # Check value
        self.assertEqual(value, "test_value")
        
        # Get nonexistent state value
        value = self.state_manager.get_state_value(context_id, "nonexistent_key", "default_value")
        
        # Check value
        self.assertEqual(value, "default_value")
        
    def test_sync_state(self):
        """Test synchronizing state."""
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
        self.context_manager.save_conversation_context(context)
        
        # Get ADK session
        adk_session = self.session_adapter.get_adk_session(context_id)
        
        # Add data to ADK session
        adk_session.state["adk_key"] = "adk_value"
        
        # Sync state
        result = self.state_manager.sync_state(context_id)
        
        # Check result
        self.assertTrue(result)
        
        # Get updated context
        updated_context = self.context_manager.get_conversation_context(context_id)
        
        # Check that ADK data was synced to context
        self.assertEqual(updated_context.data["adk_key"], "adk_value")
        
        # Check that context data was synced to ADK session
        self.assertEqual(adk_session.state["test_key"], "test_value")
        
    def test_serialize_deserialize_state(self):
        """Test serializing and deserializing state."""
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
        context.set_summary("Test summary")
        self.context_manager.save_conversation_context(context)
        
        # Serialize state
        state_json = self.state_manager.serialize_state(context_id)
        
        # Check that state_json is valid JSON
        state = json.loads(state_json)
        self.assertEqual(state["data"]["test_key"], "test_value")
        
        # Clear context data
        context.data.clear()
        context.messages.clear()
        context.entities.clear()
        context.summary = ""
        self.context_manager.save_conversation_context(context)
        
        # Deserialize state
        result = self.state_manager.deserialize_state(context_id, state_json)
        
        # Check result
        self.assertTrue(result)
        
        # Get updated context
        updated_context = self.context_manager.get_conversation_context(context_id)
        
        # Check that state was restored
        self.assertEqual(updated_context.data["test_key"], "test_value")
        self.assertEqual(len(updated_context.messages), 1)
        self.assertEqual(updated_context.messages[0]["content"], "Hello, world!")
        self.assertEqual(len(updated_context.entities), 1)
        self.assertEqual(updated_context.entities[0]["name"], "John Doe")
        self.assertEqual(updated_context.summary, "Test summary")
        
    def test_fallback_when_adk_not_available(self):
        """Test fallback behavior when ADK is not available."""
        # Create state manager with ADK not available
        with patch('vana.adk_integration.adk_state_manager.ADK_AVAILABLE', False):
            fallback_manager = ADKStateManager(self.session_adapter, self.context_manager)
            
        # Check that ADK is not available
        self.assertFalse(fallback_manager.is_adk_available())
        
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
        self.context_manager.save_conversation_context(context)
        
        # Get state
        state = fallback_manager.get_state(context_id)
        
        # Check state
        self.assertEqual(state["data"]["test_key"], "test_value")
        
        # Try to sync state
        result = fallback_manager.sync_state(context_id)
        
        # Check result
        self.assertFalse(result)


if __name__ == "__main__":
    unittest.main()
