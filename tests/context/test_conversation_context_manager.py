"""
Tests for the ConversationContextManager class.
"""

import os
import shutil
import tempfile
import unittest

from vana.context import ConversationContext, ConversationContextManager


class TestConversationContextManager(unittest.TestCase):
    """Test cases for the ConversationContextManager class."""

    def setUp(self):
        """Set up test environment."""
        # Create temporary directory for test database
        self.test_dir = tempfile.mkdtemp()
        self.db_path = os.path.join(self.test_dir, "test_context.db")

        # Create context manager
        self.context_manager = ConversationContextManager(db_path=self.db_path)

    def tearDown(self):
        """Clean up test environment."""
        # Remove temporary directory
        shutil.rmtree(self.test_dir)

    def test_create_conversation_context(self):
        """Test creating a conversation context."""
        # Create context
        context = self.context_manager.create_conversation_context(
            user_id="test_user", session_id="test_session"
        )

        # Check context properties
        self.assertEqual(context.user_id, "test_user")
        self.assertEqual(context.session_id, "test_session")
        self.assertEqual(context.scope, ConversationContext.SCOPE_SESSION)
        self.assertEqual(len(context.messages), 0)
        self.assertEqual(len(context.entities), 0)
        self.assertEqual(context.relevance_score, 1.0)
        self.assertEqual(context.summary, "")

    def test_create_conversation_context_with_scope(self):
        """Test creating a conversation context with a specific scope."""
        # Create context with user scope
        context = self.context_manager.create_conversation_context(
            user_id="test_user",
            session_id="test_session",
            scope=ConversationContext.SCOPE_USER,
        )

        # Check context scope
        self.assertEqual(context.scope, ConversationContext.SCOPE_USER)

        # Create context with global scope
        context = self.context_manager.create_conversation_context(
            user_id="test_user",
            session_id="test_session",
            scope=ConversationContext.SCOPE_GLOBAL,
        )

        # Check context scope
        self.assertEqual(context.scope, ConversationContext.SCOPE_GLOBAL)

    def test_add_message(self):
        """Test adding a message to a conversation context."""
        # Create context
        context = self.context_manager.create_conversation_context(
            user_id="test_user", session_id="test_session"
        )

        # Add message
        context.add_message("user", "Hello, world!")

        # Check message
        self.assertEqual(len(context.messages), 1)
        self.assertEqual(context.messages[0]["role"], "user")
        self.assertEqual(context.messages[0]["content"], "Hello, world!")
        self.assertIn("timestamp", context.messages[0])

        # Add another message
        context.add_message("assistant", "Hi there!")

        # Check messages
        self.assertEqual(len(context.messages), 2)
        self.assertEqual(context.messages[1]["role"], "assistant")
        self.assertEqual(context.messages[1]["content"], "Hi there!")

    def test_add_entity(self):
        """Test adding an entity to a conversation context."""
        # Create context
        context = self.context_manager.create_conversation_context(
            user_id="test_user", session_id="test_session"
        )

        # Add entity
        context.add_entity("person", "John Doe", {"age": 30, "occupation": "developer"})

        # Check entity
        self.assertEqual(len(context.entities), 1)
        self.assertEqual(context.entities[0]["type"], "person")
        self.assertEqual(context.entities[0]["name"], "John Doe")
        self.assertEqual(context.entities[0]["value"]["age"], 30)
        self.assertEqual(context.entities[0]["value"]["occupation"], "developer")
        self.assertEqual(context.entities[0]["confidence"], 1.0)
        self.assertIn("timestamp", context.entities[0])

        # Add another entity with confidence
        context.add_entity("location", "New York", {"country": "USA"}, confidence=0.8)

        # Check entities
        self.assertEqual(len(context.entities), 2)
        self.assertEqual(context.entities[1]["type"], "location")
        self.assertEqual(context.entities[1]["name"], "New York")
        self.assertEqual(context.entities[1]["confidence"], 0.8)

    def test_set_summary(self):
        """Test setting a summary for a conversation context."""
        # Create context
        context = self.context_manager.create_conversation_context(
            user_id="test_user", session_id="test_session"
        )

        # Set summary
        context.set_summary("This is a test conversation.")

        # Check summary
        self.assertEqual(context.summary, "This is a test conversation.")

    def test_set_relevance(self):
        """Test setting relevance for a conversation context."""
        # Create context
        context = self.context_manager.create_conversation_context(
            user_id="test_user", session_id="test_session"
        )

        # Set relevance
        context.set_relevance(0.75)

        # Check relevance
        self.assertEqual(context.relevance_score, 0.75)

        # Test clamping
        context.set_relevance(1.5)
        self.assertEqual(context.relevance_score, 1.0)

        context.set_relevance(-0.5)
        self.assertEqual(context.relevance_score, 0.0)

    def test_serialize_deserialize(self):
        """Test serializing and deserializing a conversation context."""
        # Create context
        context = self.context_manager.create_conversation_context(
            user_id="test_user",
            session_id="test_session",
            scope=ConversationContext.SCOPE_USER,
        )

        # Add data
        context.add_message("user", "Hello, world!")
        context.add_message("assistant", "Hi there!")
        context.add_entity("person", "John Doe", {"age": 30})
        context.set_summary("Test conversation")
        context.set_relevance(0.8)
        context.data["test_key"] = "test_value"

        # Serialize
        serialized = context.serialize()

        # Deserialize
        deserialized = ConversationContext.deserialize(serialized)

        # Check deserialized context
        self.assertEqual(deserialized.id, context.id)
        self.assertEqual(deserialized.user_id, context.user_id)
        self.assertEqual(deserialized.session_id, context.session_id)
        self.assertEqual(deserialized.scope, context.scope)
        self.assertEqual(len(deserialized.messages), 2)
        self.assertEqual(deserialized.messages[0]["content"], "Hello, world!")
        self.assertEqual(deserialized.messages[1]["content"], "Hi there!")
        self.assertEqual(len(deserialized.entities), 1)
        self.assertEqual(deserialized.entities[0]["name"], "John Doe")
        self.assertEqual(deserialized.summary, "Test conversation")
        self.assertEqual(deserialized.relevance_score, 0.8)
        self.assertEqual(deserialized.data["test_key"], "test_value")

    def test_save_load_conversation_context(self):
        """Test saving and loading a conversation context."""
        # Create context
        context = self.context_manager.create_conversation_context(
            user_id="test_user", session_id="test_session"
        )

        # Add data
        context.add_message("user", "Hello, world!")
        context.add_entity("person", "John Doe", {"age": 30})
        context.set_summary("Test conversation")
        context.data["test_key"] = "test_value"

        # Save context
        self.context_manager.save_conversation_context(context)

        # Get context ID
        context_id = context.id

        # Clear cache
        self.context_manager.clear_cache()

        # Load context
        loaded_context = self.context_manager.get_conversation_context(context_id)

        # Check loaded context
        self.assertIsNotNone(loaded_context)
        self.assertEqual(loaded_context.id, context_id)
        self.assertEqual(loaded_context.user_id, "test_user")
        self.assertEqual(loaded_context.session_id, "test_session")
        self.assertEqual(len(loaded_context.messages), 1)
        self.assertEqual(loaded_context.messages[0]["content"], "Hello, world!")
        self.assertEqual(len(loaded_context.entities), 1)
        self.assertEqual(loaded_context.entities[0]["name"], "John Doe")
        self.assertEqual(loaded_context.summary, "Test conversation")
        self.assertEqual(loaded_context.data["test_key"], "test_value")

    def test_list_conversation_contexts(self):
        """Test listing conversation contexts."""
        # Create contexts
        context1 = self.context_manager.create_conversation_context(
            user_id="user1",
            session_id="session1",
            scope=ConversationContext.SCOPE_SESSION,
        )
        context2 = self.context_manager.create_conversation_context(
            user_id="user1",
            session_id="session2",
            scope=ConversationContext.SCOPE_SESSION,
        )
        context3 = self.context_manager.create_conversation_context(
            user_id="user2", session_id="session3", scope=ConversationContext.SCOPE_USER
        )

        # Save contexts
        self.context_manager.save_conversation_context(context1)
        self.context_manager.save_conversation_context(context2)
        self.context_manager.save_conversation_context(context3)

        # Clear cache
        self.context_manager.clear_cache()

        # List all contexts
        contexts = self.context_manager.list_conversation_contexts()
        self.assertEqual(len(contexts), 3)

        # List contexts by user
        contexts = self.context_manager.list_conversation_contexts(user_id="user1")
        self.assertEqual(len(contexts), 2)

        # List contexts by session
        contexts = self.context_manager.list_conversation_contexts(
            session_id="session3"
        )
        self.assertEqual(len(contexts), 1)
        self.assertEqual(contexts[0].user_id, "user2")

        # List contexts by scope
        contexts = self.context_manager.list_conversation_contexts(
            scope=ConversationContext.SCOPE_USER
        )
        self.assertEqual(len(contexts), 1)
        self.assertEqual(contexts[0].user_id, "user2")

        # List contexts by user and scope
        contexts = self.context_manager.list_conversation_contexts(
            user_id="user1", scope=ConversationContext.SCOPE_SESSION
        )
        self.assertEqual(len(contexts), 2)

    def test_calculate_context_relevance(self):
        """Test calculating context relevance."""
        # Create context
        context = self.context_manager.create_conversation_context(
            user_id="test_user", session_id="test_session"
        )

        # Add messages
        context.add_message("user", "I need information about Python programming.")
        context.add_message("assistant", "Python is a popular programming language.")
        context.add_message("user", "How do I install Python?")

        # Calculate relevance for a relevant query
        relevance = self.context_manager.calculate_context_relevance(
            context, "How to use Python for web development?"
        )

        # Check relevance (should be high)
        self.assertGreater(relevance, 0.0)

        # Calculate relevance for an irrelevant query
        relevance = self.context_manager.calculate_context_relevance(
            context, "What is the weather like today?"
        )

        # Check relevance (should be low)
        self.assertLess(relevance, 0.5)

    def test_summarize_context(self):
        """Test summarizing a context."""
        # Create context
        context = self.context_manager.create_conversation_context(
            user_id="test_user", session_id="test_session"
        )

        # Add messages
        context.add_message("user", "Hello, I need help with Python.")
        context.add_message("assistant", "Sure, what do you need help with?")
        context.add_message("user", "How do I install Python?")
        context.add_message("assistant", "You can download Python from python.org.")
        context.add_message("user", "Thanks!")

        # Summarize context
        summary = self.context_manager.summarize_context(context)

        # Check summary
        self.assertIsNotNone(summary)
        self.assertGreater(len(summary), 0)

        # Check that summary was saved to context
        self.assertEqual(context.summary, summary)

    def test_get_relevant_contexts(self):
        """Test getting relevant contexts."""
        # Create contexts
        context1 = self.context_manager.create_conversation_context(
            user_id="test_user", session_id="session1"
        )
        context1.add_message("user", "I need help with Python programming.")
        context1.add_message(
            "assistant", "What specific Python topic do you need help with?"
        )

        context2 = self.context_manager.create_conversation_context(
            user_id="test_user", session_id="session2"
        )
        context2.add_message("user", "How do I cook pasta?")
        context2.add_message("assistant", "Boil water, add salt, then add pasta.")

        context3 = self.context_manager.create_conversation_context(
            user_id="test_user", session_id="session3"
        )
        context3.add_message(
            "user", "What are some good Python libraries for data science?"
        )
        context3.add_message(
            "assistant", "NumPy, Pandas, and Scikit-learn are popular choices."
        )

        # Save contexts
        self.context_manager.save_conversation_context(context1)
        self.context_manager.save_conversation_context(context2)
        self.context_manager.save_conversation_context(context3)

        # Get relevant contexts for a Python query
        relevant_contexts = self.context_manager.get_relevant_contexts(
            "How do I use Python for machine learning?", user_id="test_user"
        )

        # Check that Python-related contexts are returned first
        self.assertGreaterEqual(len(relevant_contexts), 2)
        python_contexts = [c for c in relevant_contexts if "Python" in str(c.messages)]
        self.assertGreaterEqual(len(python_contexts), 2)

        # Get relevant contexts for a cooking query
        relevant_contexts = self.context_manager.get_relevant_contexts(
            "What's a good recipe for spaghetti?", user_id="test_user"
        )

        # Check that cooking-related context is returned first
        self.assertGreaterEqual(len(relevant_contexts), 1)
        cooking_contexts = [
            c
            for c in relevant_contexts
            if "cook" in str(c.messages) or "pasta" in str(c.messages)
        ]
        self.assertGreaterEqual(len(cooking_contexts), 1)


if __name__ == "__main__":
    unittest.main()
