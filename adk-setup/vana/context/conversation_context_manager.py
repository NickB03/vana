"""
Conversation Context Manager for VANA

This module provides enhanced context management for conversations,
including context scoping, memory fetching, and context summarization.
"""

import os
import json
import logging
import time
import sqlite3
from typing import Dict, Any, Optional, List, Tuple
from datetime import datetime

from .context_manager import ContextManager, Context

# Set up logging
logger = logging.getLogger(__name__)

class ConversationContext(Context):
    """Enhanced context object for conversations with scoping and relevance."""

    SCOPE_SESSION = "session"
    SCOPE_USER = "user"
    SCOPE_GLOBAL = "global"

    def __init__(self, user_id: str, session_id: str, context_id: Optional[str] = None,
                 scope: str = SCOPE_SESSION):
        """
        Initialize a conversation context object.

        Args:
            user_id: User ID
            session_id: Session ID
            context_id: Context ID (optional, will be generated if not provided)
            scope: Context scope (session, user, or global)
        """
        super().__init__(user_id, session_id, context_id)
        self.scope = scope
        self.messages = []
        self.entities = []
        self.relevance_score = 1.0  # Default maximum relevance
        self.summary = ""

    def add_message(self, role: str, content: str) -> None:
        """
        Add a message to the conversation context.

        Args:
            role: Message role (user or assistant)
            content: Message content
        """
        message = {
            "role": role,
            "content": content,
            "timestamp": datetime.now().isoformat()
        }
        self.messages.append(message)
        self.updated_at = datetime.now().isoformat()

    def add_entity(self, entity_type: str, entity_name: str,
                   entity_value: Any, confidence: float = 1.0) -> None:
        """
        Add an entity to the conversation context.

        Args:
            entity_type: Entity type
            entity_name: Entity name
            entity_value: Entity value
            confidence: Entity confidence (0.0 to 1.0)
        """
        entity = {
            "type": entity_type,
            "name": entity_name,
            "value": entity_value,
            "confidence": confidence,
            "timestamp": datetime.now().isoformat()
        }
        self.entities.append(entity)
        self.updated_at = datetime.now().isoformat()

    def set_summary(self, summary: str) -> None:
        """
        Set the conversation summary.

        Args:
            summary: Conversation summary
        """
        self.summary = summary
        self.updated_at = datetime.now().isoformat()

    def set_relevance(self, score: float) -> None:
        """
        Set the relevance score for this context.

        Args:
            score: Relevance score (0.0 to 1.0)
        """
        self.relevance_score = max(0.0, min(1.0, score))  # Clamp between 0 and 1

    def serialize(self) -> Dict[str, Any]:
        """
        Serialize the context to a dictionary.

        Returns:
            Serialized context
        """
        data = super().serialize()
        data.update({
            "scope": self.scope,
            "messages": self.messages,
            "entities": self.entities,
            "relevance_score": self.relevance_score,
            "summary": self.summary
        })
        return data

    @classmethod
    def deserialize(cls, data: Dict[str, Any]) -> 'ConversationContext':
        """
        Deserialize a dictionary to a context object.

        Args:
            data: Serialized context

        Returns:
            Deserialized context object
        """
        context = cls(
            user_id=data["user_id"],
            session_id=data["session_id"],
            context_id=data["id"],
            scope=data.get("scope", cls.SCOPE_SESSION)
        )
        context.created_at = data["created_at"]
        context.updated_at = data["updated_at"]
        context.data = data.get("data", {})
        context.messages = data.get("messages", [])
        context.entities = data.get("entities", [])
        context.relevance_score = data.get("relevance_score", 1.0)
        context.summary = data.get("summary", "")
        return context


class ConversationContextManager(ContextManager):
    """Enhanced manager for conversation contexts with scoping and memory integration."""

    def __init__(self, db_path: Optional[str] = None, memory_manager=None):
        """
        Initialize a conversation context manager.

        Args:
            db_path: Path to SQLite database (optional, defaults to data/context.db)
            memory_manager: Memory manager instance (optional)
        """
        super().__init__(db_path)
        self.memory_manager = memory_manager

    def _init_db(self) -> None:
        """Initialize the database with enhanced schema."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        # Create enhanced context table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS contexts (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            session_id TEXT NOT NULL,
            scope TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            data TEXT NOT NULL,
            messages TEXT NOT NULL,
            entities TEXT NOT NULL,
            relevance_score REAL NOT NULL,
            summary TEXT NOT NULL
        )
        """)

        conn.commit()
        conn.close()

    def create_conversation_context(self, user_id: str, session_id: str,
                                   scope: str = ConversationContext.SCOPE_SESSION) -> ConversationContext:
        """
        Create a new conversation context.

        Args:
            user_id: User ID
            session_id: Session ID
            scope: Context scope (session, user, or global)

        Returns:
            New conversation context object
        """
        context = ConversationContext(user_id, session_id, scope=scope)
        self.cache[context.id] = context
        return context

    def save_conversation_context(self, context: ConversationContext) -> bool:
        """
        Save a conversation context to the database.

        Args:
            context: Conversation context object

        Returns:
            True if successful, False otherwise
        """
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            # Serialize data
            data_json = json.dumps(context.data)
            messages_json = json.dumps(context.messages)
            entities_json = json.dumps(context.entities)

            # Insert or update context
            cursor.execute("""
            INSERT OR REPLACE INTO contexts (
                id, user_id, session_id, scope, created_at, updated_at,
                data, messages, entities, relevance_score, summary
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                context.id,
                context.user_id,
                context.session_id,
                context.scope,
                context.created_at,
                context.updated_at,
                data_json,
                messages_json,
                entities_json,
                context.relevance_score,
                context.summary
            ))

            conn.commit()
            conn.close()

            # Update cache
            self.cache[context.id] = context

            return True
        except Exception as e:
            logger.error(f"Error saving conversation context: {e}")
            return False

    def load_conversation_context(self, context_id: str) -> Optional[ConversationContext]:
        """
        Load a conversation context from the database.

        Args:
            context_id: Context ID

        Returns:
            Conversation context object or None if not found
        """
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            # Query context
            cursor.execute("""
            SELECT id, user_id, session_id, scope, created_at, updated_at,
                   data, messages, entities, relevance_score, summary
            FROM contexts
            WHERE id = ?
            """, (context_id,))

            row = cursor.fetchone()

            conn.close()

            if row:
                # Create context object
                context = ConversationContext(
                    user_id=row[1],
                    session_id=row[2],
                    context_id=row[0],
                    scope=row[3]
                )
                context.created_at = row[4]
                context.updated_at = row[5]
                context.data = json.loads(row[6])
                context.messages = json.loads(row[7])
                context.entities = json.loads(row[8])
                context.relevance_score = row[9]
                context.summary = row[10]

                # Update cache
                self.cache[context.id] = context

                return context

            return None
        except Exception as e:
            logger.error(f"Error loading conversation context: {e}")
            return None

    def get_conversation_context(self, context_id: str) -> Optional[ConversationContext]:
        """
        Get a conversation context by ID.

        Args:
            context_id: Context ID

        Returns:
            Conversation context object or None if not found
        """
        # Check cache
        if context_id in self.cache:
            context = self.cache[context_id]
            if isinstance(context, ConversationContext):
                return context

        # Load from database
        return self.load_conversation_context(context_id)

    def list_conversation_contexts(self, user_id: Optional[str] = None,
                                  session_id: Optional[str] = None,
                                  scope: Optional[str] = None) -> List[ConversationContext]:
        """
        List conversation contexts from the database.

        Args:
            user_id: Filter by user ID (optional)
            session_id: Filter by session ID (optional)
            scope: Filter by scope (optional)

        Returns:
            List of conversation context objects
        """
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            # Build query
            query = """
            SELECT id, user_id, session_id, scope, created_at, updated_at,
                   data, messages, entities, relevance_score, summary
            FROM contexts
            """
            params = []
            conditions = []

            if user_id:
                conditions.append("user_id = ?")
                params.append(user_id)

            if session_id:
                conditions.append("session_id = ?")
                params.append(session_id)

            if scope:
                conditions.append("scope = ?")
                params.append(scope)

            if conditions:
                query += " WHERE " + " AND ".join(conditions)

            # Query contexts
            cursor.execute(query, params)

            rows = cursor.fetchall()

            conn.close()

            # Create context objects
            contexts = []

            for row in rows:
                context = ConversationContext(
                    user_id=row[1],
                    session_id=row[2],
                    context_id=row[0],
                    scope=row[3]
                )
                context.created_at = row[4]
                context.updated_at = row[5]
                context.data = json.loads(row[6])
                context.messages = json.loads(row[7])
                context.entities = json.loads(row[8])
                context.relevance_score = row[9]
                context.summary = row[10]

                # Update cache
                self.cache[context.id] = context

                contexts.append(context)

            return contexts
        except Exception as e:
            logger.error(f"Error listing conversation contexts: {e}")
            return []

    def fetch_relevant_memory(self, query: str, user_id: Optional[str] = None,
                             top_k: int = 5) -> List[Dict[str, Any]]:
        """
        Fetch relevant memory based on a query.

        Args:
            query: Query string
            user_id: User ID (optional)
            top_k: Maximum number of results to return

        Returns:
            List of relevant memory items
        """
        if not self.memory_manager:
            logger.warning("Memory manager not available for fetching relevant memory")
            return []

        try:
            # Use memory manager to search for relevant information
            results = self.memory_manager.search(query, user_id=user_id, top_k=top_k)
            return results
        except Exception as e:
            logger.error(f"Error fetching relevant memory: {e}")
            return []

    def summarize_context(self, context: ConversationContext, max_length: int = 200) -> str:
        """
        Generate a summary of the conversation context.

        Args:
            context: Conversation context object
            max_length: Maximum summary length

        Returns:
            Context summary
        """
        try:
            # Simple summarization based on recent messages
            if not context.messages:
                return ""

            # Get the last few messages
            recent_messages = context.messages[-5:]

            # Create a simple summary
            summary_parts = []
            for message in recent_messages:
                role = message["role"]
                content = message["content"]

                # Truncate content if too long
                if len(content) > 50:
                    content = content[:47] + "..."

                summary_parts.append(f"{role}: {content}")

            summary = " | ".join(summary_parts)

            # Truncate if still too long
            if len(summary) > max_length:
                summary = summary[:max_length-3] + "..."

            # Update the context summary
            context.set_summary(summary)
            self.save_conversation_context(context)

            return summary
        except Exception as e:
            logger.error(f"Error summarizing context: {e}")
            return ""

    def calculate_context_relevance(self, context: ConversationContext, query: str) -> float:
        """
        Calculate the relevance of a context to a query.

        Args:
            context: Conversation context object
            query: Query string

        Returns:
            Relevance score (0.0 to 1.0)
        """
        try:
            # Simple relevance calculation based on term overlap
            if not context.messages:
                return 0.0

            # Extract terms from query
            query_terms = set(query.lower().split())

            # Extract terms from recent messages
            message_terms = set()
            for message in context.messages[-5:]:
                content = message["content"].lower()
                message_terms.update(content.split())

            # Calculate overlap
            if not query_terms:
                return 0.0

            overlap = len(query_terms.intersection(message_terms)) / len(query_terms)

            # Update context relevance
            context.set_relevance(overlap)
            self.save_conversation_context(context)

            return overlap
        except Exception as e:
            logger.error(f"Error calculating context relevance: {e}")
            return 0.0

    def get_relevant_contexts(self, query: str, user_id: Optional[str] = None,
                             top_k: int = 3) -> List[ConversationContext]:
        """
        Get contexts relevant to a query.

        Args:
            query: Query string
            user_id: User ID (optional)
            top_k: Maximum number of results to return

        Returns:
            List of relevant context objects
        """
        try:
            # Get all contexts for the user
            contexts = self.list_conversation_contexts(user_id=user_id)

            # Calculate relevance for each context
            context_relevance = []
            for context in contexts:
                relevance = self.calculate_context_relevance(context, query)
                context_relevance.append((context, relevance))

            # Sort by relevance (descending)
            context_relevance.sort(key=lambda x: x[1], reverse=True)

            # Return top_k contexts
            return [context for context, _ in context_relevance[:top_k]]
        except Exception as e:
            logger.error(f"Error getting relevant contexts: {e}")
            return []
