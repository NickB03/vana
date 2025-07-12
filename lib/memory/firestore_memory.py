"""
Firestore Memory Service for VANA

This module implements a Firestore-based memory service that extends Google ADK's
BaseMemoryService. Provides persistent memory storage with TTL support and
async operations for optimal performance.
"""

import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from google.cloud import firestore
from google.cloud.firestore import AsyncClient

logger = logging.getLogger(__name__)


class FirestoreMemoryService:
    """
    ADK-native persistent memory using Firestore.

    This service extends BaseMemoryService to provide persistent memory storage
    using Google Cloud Firestore. Features include:
    - Automatic TTL (Time To Live) for memory cleanup
    - Async operations for optimal performance
    - Session-based memory organization
    - Keyword search capabilities
    - Metadata support for enhanced querying
    """

    def __init__(self, collection_name: str = "vana_memories", ttl_days: int = 30):
        """
        Initialize Firestore memory service.

        Args:
            collection_name: Firestore collection name for storing memories
            ttl_days: Default TTL in days for memory records
        """
        self.collection_name = collection_name
        self.ttl_days = ttl_days

        # Initialize async Firestore client
        self.db: Optional[AsyncClient] = None
        self._initialize_client()

        logger.info(f"FirestoreMemoryService initialized with collection: {collection_name}")

    def _initialize_client(self) -> None:
        """Initialize the async Firestore client."""
        try:
            # Use async client for better performance
            self.db = firestore.AsyncClient()
            logger.info("Firestore async client initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Firestore client: {e}")
            raise

    async def add_session_to_memory(self, session) -> bool:
        """
        Add a session's content to memory for future retrieval.

        Args:
            session: The session to add to memory

        Returns:
            True if successful, False otherwise
        """
        if not self.db:
            logger.warning("Firestore client not initialized")
            return False

        try:
            # Extract content from session messages
            content_parts = []
            if hasattr(session, "messages") and session.messages:
                for message in session.messages:
                    if hasattr(message, "content") and message.content:
                        content_parts.append(str(message.content))

            # Combine all content
            content = "\n".join(content_parts) if content_parts else ""

            if not content:
                logger.warning(f"No content found in session {session.id}")
                return False

            # Prepare memory document
            memory_doc = {
                "session_id": session.id,
                "content": content,
                "metadata": {
                    "user_id": getattr(session, "user_id", ""),
                    "created_at": getattr(session, "created_at", datetime.now()).isoformat()
                    if hasattr(session, "created_at")
                    else datetime.now().isoformat(),
                },
                "timestamp": datetime.now(),
                "ttl": datetime.now() + timedelta(days=self.ttl_days),
                "created_at": firestore.SERVER_TIMESTAMP,
            }

            # Store in Firestore
            collection_ref = self.db.collection(self.collection_name)
            doc_ref = await collection_ref.add(memory_doc)

            logger.info(f"Session {session.id} added to memory with document ID: {doc_ref[1].id}")
            return True

        except Exception as e:
            logger.error(f"Failed to add session to memory: {e}")
            return False

    async def search_memory(self, query: str, top_k: int = 5, session_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Simple keyword search - upgrade to vector search later.

        Args:
            query: Search query string
            top_k: Maximum number of results to return
            session_id: Optional session filter

        Returns:
            List of MemoryRecord objects matching the query
        """
        if not self.db:
            raise RuntimeError("Firestore client not initialized")

        try:
            memories = []

            # Build query with TTL filter
            collection_ref = self.db.collection(self.collection_name)
            query_ref = collection_ref.where("ttl", ">", datetime.now())

            # Add session filter if provided
            if session_id:
                query_ref = query_ref.where("session_id", "==", session_id)

            # Order by timestamp (most recent first) and limit results
            query_ref = query_ref.order_by("timestamp", direction=firestore.Query.DESCENDING)
            query_ref = query_ref.limit(50)  # Get more docs for filtering

            # Execute query
            docs = query_ref.stream()

            # Filter by keyword search and convert to dictionary
            query_lower = query.lower()
            async for doc in docs:
                data = doc.to_dict()
                if data:  # Ensure data is not None
                    content = data.get("content", "")

                    # Simple keyword matching
                    if query_lower in content.lower():
                        memory_dict = {
                            "content": content,
                            "score": 1.0,  # Simple scoring for now
                            "source": "firestore_memory",
                            "metadata": {
                                **data.get("metadata", {}),
                                "session_id": data.get("session_id"),
                                "timestamp": data.get("timestamp"),
                                "doc_id": doc.id,
                            },
                        }
                        memories.append(memory_dict)

                        # Stop when we have enough results
                        if len(memories) >= top_k:
                            break

            logger.debug(f"Found {len(memories)} memories for query: {query}")
            return memories

        except Exception as e:
            logger.error(f"Failed to search memory: {e}")
            return []

    async def get_session_memories(self, session_id: str, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Get recent memories for a specific session.

        Args:
            session_id: Session identifier
            limit: Maximum number of memories to return

        Returns:
            List of recent MemoryRecord objects for the session
        """
        if not self.db:
            raise RuntimeError("Firestore client not initialized")

        try:
            memories = []

            # Query memories for specific session
            collection_ref = self.db.collection(self.collection_name)
            query_ref = (
                collection_ref.where("session_id", "==", session_id)
                .where("ttl", ">", datetime.now())
                .order_by("timestamp", direction=firestore.Query.DESCENDING)
                .limit(limit)
            )

            # Execute query and convert to dictionary
            docs = query_ref.stream()
            async for doc in docs:
                data = doc.to_dict()
                if data:  # Ensure data is not None
                    memory_dict = {
                        "content": data.get("content", ""),
                        "score": 1.0,  # Simple scoring for now
                        "source": "firestore_memory",
                        "metadata": {
                            **data.get("metadata", {}),
                            "session_id": data.get("session_id"),
                            "timestamp": data.get("timestamp"),
                            "doc_id": doc.id,
                        },
                    }
                    memories.append(memory_dict)

            logger.debug(f"Retrieved {len(memories)} memories for session: {session_id}")
            return memories

        except Exception as e:
            logger.error(f"Failed to get session memories: {e}")
            return []

    async def cleanup_expired_memories(self) -> int:
        """
        Clean up expired memories based on TTL.

        Returns:
            Number of memories cleaned up
        """
        if not self.db:
            raise RuntimeError("Firestore client not initialized")

        try:
            # Query expired memories
            collection_ref = self.db.collection(self.collection_name)
            expired_query = collection_ref.where("ttl", "<=", datetime.now())

            # Delete expired documents
            deleted_count = 0
            docs = expired_query.stream()
            async for doc in docs:
                await doc.reference.delete()
                deleted_count += 1

            if deleted_count > 0:
                logger.info(f"Cleaned up {deleted_count} expired memories")

            return deleted_count

        except Exception as e:
            logger.error(f"Failed to cleanup expired memories: {e}")
            return 0

    async def get_memory_stats(self) -> Dict[str, Any]:
        """
        Get statistics about stored memories.

        Returns:
            Dictionary with memory statistics
        """
        if not self.db:
            raise RuntimeError("Firestore client not initialized")

        try:
            collection_ref = self.db.collection(self.collection_name)

            # Count total memories
            total_docs = collection_ref.stream()
            total_count = len([doc async for doc in total_docs])

            # Count active memories (not expired)
            active_docs = collection_ref.where("ttl", ">", datetime.now()).stream()
            active_count = len([doc async for doc in active_docs])

            return {
                "total_memories": total_count,
                "active_memories": active_count,
                "expired_memories": total_count - active_count,
                "collection_name": self.collection_name,
                "ttl_days": self.ttl_days,
            }

        except Exception as e:
            logger.error(f"Failed to get memory stats: {e}")
            return {
                "total_memories": 0,
                "active_memories": 0,
                "expired_memories": 0,
                "collection_name": self.collection_name,
                "ttl_days": self.ttl_days,
                "error": str(e),
            }
