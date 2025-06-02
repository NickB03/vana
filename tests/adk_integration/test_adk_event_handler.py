"""
Tests for the ADKEventHandler class.
"""

import os
import shutil
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from vana.adk_integration import ADKEventHandler, ADKSessionAdapter, ADKStateManager
from vana.context import ConversationContextManager


# Mock ADK classes
class MockSession:
    def __init__(self, app_name, user_id, session_id):
        self.app_name = app_name
        self.user_id = user_id
        self.session_id = session_id
        self.state = {}


class TestADKEventHandler(unittest.TestCase):
    """Test cases for the ADKEventHandler class."""

    def setUp(self):
        """Set up test environment."""
        # Create temporary directory for test database
        self.test_dir = tempfile.mkdtemp()
        self.db_path = os.path.join(self.test_dir, "test_context.db")

        # Mock ADK availability
        patcher1 = patch("vana.adk_integration.adk_session_adapter.ADK_AVAILABLE", True)
        patcher2 = patch("vana.adk_integration.adk_state_manager.ADK_AVAILABLE", True)
        patcher3 = patch("vana.adk_integration.adk_event_handler.ADK_AVAILABLE", True)
        self.addCleanup(patcher1.stop)
        self.addCleanup(patcher2.stop)
        self.addCleanup(patcher3.stop)
        patcher1.start()
        patcher2.start()
        patcher3.start()

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
        patcher4 = patch(
            "vana.adk_integration.adk_session_adapter.InMemorySessionService",
            MockSessionService,
        )
        self.addCleanup(patcher4.stop)
        patcher4.start()

        # Create context manager
        self.context_manager = ConversationContextManager(db_path=self.db_path)

        # Create session adapter
        self.session_adapter = ADKSessionAdapter(self.context_manager)

        # Create state manager
        self.state_manager = ADKStateManager(self.session_adapter, self.context_manager)

        # Create event handler
        self.event_handler = ADKEventHandler(
            self.session_adapter, self.state_manager, self.context_manager
        )

    def tearDown(self):
        """Clean up test environment."""
        # Remove temporary directory
        shutil.rmtree(self.test_dir)

    def test_register_event_handler(self):
        """Test registering an event handler."""
        # Create handler function
        handler = MagicMock()

        # Register handler
        result = self.event_handler.register_event_handler(
            event_type=ADKEventHandler.EVENT_MESSAGE_RECEIVED, handler=handler
        )

        # Check result
        self.assertTrue(result)

        # Check that handler was registered
        self.assertIn(
            handler,
            self.event_handler.event_handlers[ADKEventHandler.EVENT_MESSAGE_RECEIVED],
        )

    def test_unregister_event_handler(self):
        """Test unregistering an event handler."""
        # Create handler function
        handler = MagicMock()

        # Register handler
        self.event_handler.register_event_handler(
            event_type=ADKEventHandler.EVENT_MESSAGE_RECEIVED, handler=handler
        )

        # Unregister handler
        result = self.event_handler.unregister_event_handler(
            event_type=ADKEventHandler.EVENT_MESSAGE_RECEIVED, handler=handler
        )

        # Check result
        self.assertTrue(result)

        # Check that handler was unregistered
        self.assertNotIn(
            handler,
            self.event_handler.event_handlers[ADKEventHandler.EVENT_MESSAGE_RECEIVED],
        )

    def test_trigger_event(self):
        """Test triggering an event."""
        # Create handler function
        handler = MagicMock()

        # Register handler
        self.event_handler.register_event_handler(
            event_type=ADKEventHandler.EVENT_MESSAGE_RECEIVED, handler=handler
        )

        # Create event data
        event_data = {"message": "Test message"}

        # Trigger event
        result = self.event_handler.trigger_event(
            event_type=ADKEventHandler.EVENT_MESSAGE_RECEIVED, event_data=event_data
        )

        # Check result
        self.assertTrue(result)

        # Check that handler was called
        handler.assert_called_once()

        # Check that event data was passed to handler
        args, kwargs = handler.call_args
        self.assertEqual(args[0]["message"], "Test message")
        self.assertIn("timestamp", args[0])

    def test_handle_message_received(self):
        """Test handling a message received event."""
        # Create session
        session_info = self.session_adapter.create_session(
            user_id="test_user", session_id="test_session"
        )

        # Get context ID
        context_id = session_info["vana_context_id"]

        # Create handler function
        handler = MagicMock()

        # Register handler
        self.event_handler.register_event_handler(
            event_type=ADKEventHandler.EVENT_MESSAGE_RECEIVED, handler=handler
        )

        # Handle message received
        result = self.event_handler.handle_message_received(
            context_id=context_id, message="Test message"
        )

        # Check result
        self.assertTrue(result)

        # Check that handler was called
        handler.assert_called_once()

        # Check that message was added to context
        context = self.context_manager.get_conversation_context(context_id)
        self.assertEqual(len(context.messages), 1)
        self.assertEqual(context.messages[0]["role"], "user")
        self.assertEqual(context.messages[0]["content"], "Test message")

        # Check that message was added to ADK session
        adk_session = self.session_adapter.get_adk_session(context_id)
        self.assertEqual(len(adk_session.state["messages"]), 1)
        self.assertEqual(adk_session.state["messages"][0]["role"], "user")
        self.assertEqual(adk_session.state["messages"][0]["content"], "Test message")

    def test_handle_message_sent(self):
        """Test handling a message sent event."""
        # Create session
        session_info = self.session_adapter.create_session(
            user_id="test_user", session_id="test_session"
        )

        # Get context ID
        context_id = session_info["vana_context_id"]

        # Create handler function
        handler = MagicMock()

        # Register handler
        self.event_handler.register_event_handler(
            event_type=ADKEventHandler.EVENT_MESSAGE_SENT, handler=handler
        )

        # Handle message sent
        result = self.event_handler.handle_message_sent(
            context_id=context_id, message="Test response"
        )

        # Check result
        self.assertTrue(result)

        # Check that handler was called
        handler.assert_called_once()

        # Check that message was added to context
        context = self.context_manager.get_conversation_context(context_id)
        self.assertEqual(len(context.messages), 1)
        self.assertEqual(context.messages[0]["role"], "assistant")
        self.assertEqual(context.messages[0]["content"], "Test response")

        # Check that message was added to ADK session
        adk_session = self.session_adapter.get_adk_session(context_id)
        self.assertEqual(len(adk_session.state["messages"]), 1)
        self.assertEqual(adk_session.state["messages"][0]["role"], "assistant")
        self.assertEqual(adk_session.state["messages"][0]["content"], "Test response")

    def test_handle_tool_called(self):
        """Test handling a tool called event."""
        # Create session
        session_info = self.session_adapter.create_session(
            user_id="test_user", session_id="test_session"
        )

        # Get context ID
        context_id = session_info["vana_context_id"]

        # Create handler function
        handler = MagicMock()

        # Register handler
        self.event_handler.register_event_handler(
            event_type=ADKEventHandler.EVENT_TOOL_CALLED, handler=handler
        )

        # Handle tool called
        result = self.event_handler.handle_tool_called(
            context_id=context_id,
            tool_name="test_tool",
            tool_args={"arg1": "value1", "arg2": "value2"},
        )

        # Check result
        self.assertTrue(result)

        # Check that handler was called
        handler.assert_called_once()

        # Check that tool call was added to context
        context = self.context_manager.get_conversation_context(context_id)
        self.assertIn("tool_calls", context.data)
        self.assertEqual(len(context.data["tool_calls"]), 1)
        self.assertEqual(context.data["tool_calls"][0]["tool_name"], "test_tool")
        self.assertEqual(context.data["tool_calls"][0]["tool_args"]["arg1"], "value1")
        self.assertEqual(context.data["tool_calls"][0]["tool_args"]["arg2"], "value2")

    def test_handle_tool_response(self):
        """Test handling a tool response event."""
        # Create session
        session_info = self.session_adapter.create_session(
            user_id="test_user", session_id="test_session"
        )

        # Get context ID
        context_id = session_info["vana_context_id"]

        # Create handler function
        handler = MagicMock()

        # Register handler
        self.event_handler.register_event_handler(
            event_type=ADKEventHandler.EVENT_TOOL_RESPONSE, handler=handler
        )

        # Handle tool response
        result = self.event_handler.handle_tool_response(
            context_id=context_id,
            tool_name="test_tool",
            tool_args={"arg1": "value1", "arg2": "value2"},
            response="Tool response",
        )

        # Check result
        self.assertTrue(result)

        # Check that handler was called
        handler.assert_called_once()

        # Check that tool response was added to context
        context = self.context_manager.get_conversation_context(context_id)
        self.assertIn("tool_responses", context.data)
        self.assertEqual(len(context.data["tool_responses"]), 1)
        self.assertEqual(context.data["tool_responses"][0]["tool_name"], "test_tool")
        self.assertEqual(
            context.data["tool_responses"][0]["tool_args"]["arg1"], "value1"
        )
        self.assertEqual(
            context.data["tool_responses"][0]["tool_args"]["arg2"], "value2"
        )
        self.assertEqual(context.data["tool_responses"][0]["response"], "Tool response")

    def test_handle_error(self):
        """Test handling an error event."""
        # Create session
        session_info = self.session_adapter.create_session(
            user_id="test_user", session_id="test_session"
        )

        # Get context ID
        context_id = session_info["vana_context_id"]

        # Create handler function
        handler = MagicMock()

        # Register handler
        self.event_handler.register_event_handler(
            event_type=ADKEventHandler.EVENT_ERROR, handler=handler
        )

        # Handle error
        result = self.event_handler.handle_error(
            context_id=context_id, error_message="Test error", error_type="test_error"
        )

        # Check result
        self.assertTrue(result)

        # Check that handler was called
        handler.assert_called_once()

        # Check that error was added to context
        context = self.context_manager.get_conversation_context(context_id)
        self.assertIn("errors", context.data)
        self.assertEqual(len(context.data["errors"]), 1)
        self.assertEqual(context.data["errors"][0]["error_type"], "test_error")
        self.assertEqual(context.data["errors"][0]["error_message"], "Test error")

    def test_handle_session_created(self):
        """Test handling a session created event."""
        # Create handler function
        handler = MagicMock()

        # Register handler
        self.event_handler.register_event_handler(
            event_type=ADKEventHandler.EVENT_SESSION_CREATED, handler=handler
        )

        # Handle session created
        result = self.event_handler.handle_session_created(
            session_id="test_session", user_id="test_user", context_id="test_context"
        )

        # Check result
        self.assertTrue(result)

        # Check that handler was called
        handler.assert_called_once()

        # Check event data
        args, kwargs = handler.call_args
        self.assertEqual(args[0]["session_id"], "test_session")
        self.assertEqual(args[0]["user_id"], "test_user")
        self.assertEqual(args[0]["context_id"], "test_context")

    def test_handle_session_updated(self):
        """Test handling a session updated event."""
        # Create handler function
        handler = MagicMock()

        # Register handler
        self.event_handler.register_event_handler(
            event_type=ADKEventHandler.EVENT_SESSION_UPDATED, handler=handler
        )

        # Handle session updated
        result = self.event_handler.handle_session_updated(
            session_id="test_session", user_id="test_user", context_id="test_context"
        )

        # Check result
        self.assertTrue(result)

        # Check that handler was called
        handler.assert_called_once()

        # Check event data
        args, kwargs = handler.call_args
        self.assertEqual(args[0]["session_id"], "test_session")
        self.assertEqual(args[0]["user_id"], "test_user")
        self.assertEqual(args[0]["context_id"], "test_context")

    def test_fallback_when_adk_not_available(self):
        """Test fallback behavior when ADK is not available."""
        # Create event handler with ADK not available
        with patch("vana.adk_integration.adk_event_handler.ADK_AVAILABLE", False):
            fallback_handler = ADKEventHandler(
                self.session_adapter, self.state_manager, self.context_manager
            )

        # Check that ADK is not available
        self.assertFalse(fallback_handler.is_adk_available())

        # Create session
        session_info = self.session_adapter.create_session(
            user_id="test_user", session_id="test_session"
        )

        # Get context ID
        context_id = session_info["vana_context_id"]

        # Handle message received
        result = fallback_handler.handle_message_received(
            context_id=context_id, message="Test message"
        )

        # Check result
        self.assertTrue(result)

        # Check that message was added to context
        context = self.context_manager.get_conversation_context(context_id)
        self.assertEqual(len(context.messages), 1)
        self.assertEqual(context.messages[0]["role"], "user")
        self.assertEqual(context.messages[0]["content"], "Test message")


if __name__ == "__main__":
    unittest.main()
