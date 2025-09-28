"""Cross-session memory management for ADK compliance.

This module provides persistent memory storage across user sessions, enabling:
- User context preservation between sessions
- Agent memory persistence
- Shared knowledge base across the application
- Session history tracking
- Memory namespacing for isolation

The implementation uses Redis for persistence and provides a clean API
for managing different types of cross-session data.
"""

from __future__ import annotations

import asyncio
import json
import logging
import time
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

try:
    import redis.asyncio as redis
    from redis.exceptions import RedisError
    REDIS_AVAILABLE = True
except ImportError:
    redis = None
    RedisError = Exception
    REDIS_AVAILABLE = False


class CrossSessionMemory:
    """Manages persistent memory across user sessions using Redis.

    Features:
    - User-specific context storage
    - Agent memory persistence
    - Session history tracking
    - Shared knowledge base
    - Memory namespacing and TTL support
    - Atomic operations for concurrent access
    """

    def __init__(
        self,
        redis_client: redis.Redis,
        memory_ttl_hours: int = 72,  # 3 days default
        knowledge_ttl_hours: int = 168,  # 1 week default
        history_ttl_hours: int = 720,  # 30 days default
    ) -> None:
        """Initialize cross-session memory manager.

        Args:
            redis_client: Redis client for persistence
            memory_ttl_hours: TTL for user context and agent memory
            knowledge_ttl_hours: TTL for shared knowledge base
            history_ttl_hours: TTL for session history
        """
        self._redis = redis_client
        self._memory_ttl = memory_ttl_hours * 3600
        self._knowledge_ttl = knowledge_ttl_hours * 3600
        self._history_ttl = history_ttl_hours * 3600

        # Key prefixes for organization
        self._user_context_prefix = "vana:memory:user_context:"
        self._agent_memory_prefix = "vana:memory:agent:"
        self._knowledge_base_prefix = "vana:memory:knowledge:"
        self._session_history_prefix = "vana:memory:history:user:"
        self._memory_index_prefix = "vana:memory:index:"

        # Logger
        self._logger = logging.getLogger(__name__)

        # Background cleanup task
        self._cleanup_task: asyncio.Task | None = None
        self._shutdown_event = asyncio.Event()

        # Start background tasks
        asyncio.create_task(self._start_background_tasks())

    async def _start_background_tasks(self) -> None:
        """Start background maintenance tasks."""
        self._cleanup_task = asyncio.create_task(self._cleanup_loop())

    async def _cleanup_loop(self) -> None:
        """Background task for cleaning up expired memory entries."""
        while not self._shutdown_event.is_set():
            try:
                await self._cleanup_expired_entries()
                # Run cleanup every hour
                await asyncio.sleep(3600)
            except asyncio.CancelledError:
                break
            except Exception as e:
                self._logger.warning(f"Memory cleanup error: {e}")
                await asyncio.sleep(300)  # Wait 5 minutes on error

    async def _cleanup_expired_entries(self) -> None:
        """Clean up expired memory entries and rebuild indexes."""
        try:
            # Clean up each type of memory
            await self._cleanup_by_prefix(self._user_context_prefix)
            await self._cleanup_by_prefix(self._agent_memory_prefix)
            await self._cleanup_by_prefix(self._knowledge_base_prefix)
            await self._cleanup_by_prefix(self._session_history_prefix)

            # Rebuild memory indexes
            await self._rebuild_memory_indexes()

        except Exception as e:
            self._logger.error(f"Failed to cleanup expired memory entries: {e}")

    async def _cleanup_by_prefix(self, prefix: str) -> int:
        """Clean up expired entries with given prefix.

        Args:
            prefix: Key prefix to clean up

        Returns:
            Number of entries removed
        """
        removed_count = 0
        cursor = 0

        while True:
            cursor, keys = await self._redis.scan(
                cursor=cursor, match=f"{prefix}*", count=100
            )

            for key in keys:
                try:
                    ttl = await self._redis.ttl(key)
                    if ttl == -2:  # Key doesn't exist
                        removed_count += 1
                    elif ttl == -1:  # Key has no TTL - set appropriate TTL
                        if prefix == self._knowledge_base_prefix:
                            await self._redis.expire(key, self._knowledge_ttl)
                        elif prefix == self._session_history_prefix:
                            await self._redis.expire(key, self._history_ttl)
                        else:
                            await self._redis.expire(key, self._memory_ttl)
                except Exception as e:
                    self._logger.warning(f"Error checking key {key}: {e}")

            if cursor == 0:
                break

        return removed_count

    async def _rebuild_memory_indexes(self) -> None:
        """Rebuild memory indexes for efficient querying."""
        try:
            # Clear existing indexes
            index_pattern = f"{self._memory_index_prefix}*"
            cursor = 0

            while True:
                cursor, keys = await self._redis.scan(
                    cursor=cursor, match=index_pattern, count=100
                )

                if keys:
                    await self._redis.delete(*keys)

                if cursor == 0:
                    break

            # Rebuild user context index
            await self._rebuild_user_context_index()

            # Rebuild agent memory index
            await self._rebuild_agent_memory_index()

        except Exception as e:
            self._logger.error(f"Failed to rebuild memory indexes: {e}")

    async def _rebuild_user_context_index(self) -> None:
        """Rebuild index of user contexts."""
        cursor = 0
        user_set_key = f"{self._memory_index_prefix}users"

        while True:
            cursor, keys = await self._redis.scan(
                cursor=cursor, match=f"{self._user_context_prefix}*", count=100
            )

            for key in keys:
                try:
                    # Extract user ID from key
                    key_str = key.decode() if isinstance(key, bytes) else key
                    user_id = key_str.replace(self._user_context_prefix, "").split(":")[0]

                    # Add to user set
                    await self._redis.sadd(user_set_key, user_id)

                except Exception as e:
                    self._logger.warning(f"Error indexing user context key {key}: {e}")

            if cursor == 0:
                break

        # Set TTL on index
        await self._redis.expire(user_set_key, self._memory_ttl)

    async def _rebuild_agent_memory_index(self) -> None:
        """Rebuild index of agent memories."""
        cursor = 0
        agent_set_key = f"{self._memory_index_prefix}agents"

        while True:
            cursor, keys = await self._redis.scan(
                cursor=cursor, match=f"{self._agent_memory_prefix}*", count=100
            )

            for key in keys:
                try:
                    # Extract agent ID from key
                    key_str = key.decode() if isinstance(key, bytes) else key
                    agent_id = key_str.replace(self._agent_memory_prefix, "").split(":")[0]

                    # Add to agent set
                    await self._redis.sadd(agent_set_key, agent_id)

                except Exception as e:
                    self._logger.warning(f"Error indexing agent memory key {key}: {e}")

            if cursor == 0:
                break

        # Set TTL on index
        await self._redis.expire(agent_set_key, self._memory_ttl)

    # User Context Methods

    async def store_user_context(
        self, user_id: int, context_key: str, context_data: Any
    ) -> None:
        """Store user context data across sessions.

        Args:
            user_id: User identifier
            context_key: Context key for namespacing
            context_data: Data to store (will be JSON serialized)
        """
        try:
            key = f"{self._user_context_prefix}{user_id}:{context_key}"

            # Prepare context data with metadata
            stored_data = {
                "data": context_data,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "user_id": user_id,
                "context_key": context_key,
            }

            # Store with TTL
            serialized_data = json.dumps(stored_data, default=str)
            await self._redis.setex(key, self._memory_ttl, serialized_data)

            # Update user index
            user_set_key = f"{self._memory_index_prefix}users"
            await self._redis.sadd(user_set_key, str(user_id))
            await self._redis.expire(user_set_key, self._memory_ttl)

            self._logger.debug(f"Stored user context: user_id={user_id}, key={context_key}")

        except Exception as e:
            self._logger.error(f"Failed to store user context: {e}")
            raise

    async def get_user_context(
        self, user_id: int, context_key: str
    ) -> Any:
        """Retrieve user context data.

        Args:
            user_id: User identifier
            context_key: Context key to retrieve

        Returns:
            Stored context data or None if not found
        """
        try:
            key = f"{self._user_context_prefix}{user_id}:{context_key}"
            data = await self._redis.get(key)

            if not data:
                return None

            stored_data = json.loads(data)
            return stored_data.get("data")

        except Exception as e:
            self._logger.error(f"Failed to get user context: {e}")
            return None

    async def list_user_contexts(self, user_id: int) -> Dict[str, Any]:
        """List all context keys for a user.

        Args:
            user_id: User identifier

        Returns:
            Dictionary of context_key -> metadata
        """
        try:
            pattern = f"{self._user_context_prefix}{user_id}:*"
            cursor = 0
            contexts = {}

            while True:
                cursor, keys = await self._redis.scan(
                    cursor=cursor, match=pattern, count=100
                )

                for key in keys:
                    try:
                        data = await self._redis.get(key)
                        if data:
                            stored_data = json.loads(data)
                            key_str = key.decode() if isinstance(key, bytes) else key
                            context_key = key_str.replace(
                                f"{self._user_context_prefix}{user_id}:", ""
                            )

                            contexts[context_key] = {
                                "timestamp": stored_data.get("timestamp"),
                                "has_data": stored_data.get("data") is not None,
                            }
                    except Exception as e:
                        self._logger.warning(f"Error processing context key {key}: {e}")

                if cursor == 0:
                    break

            return contexts

        except Exception as e:
            self._logger.error(f"Failed to list user contexts: {e}")
            return {}

    async def delete_user_context(
        self, user_id: int, context_key: str | None = None
    ) -> bool:
        """Delete user context data.

        Args:
            user_id: User identifier
            context_key: Specific context key to delete (None to delete all)

        Returns:
            True if deletion was successful
        """
        try:
            if context_key:
                # Delete specific context
                key = f"{self._user_context_prefix}{user_id}:{context_key}"
                deleted = await self._redis.delete(key)
                return deleted > 0
            else:
                # Delete all contexts for user
                pattern = f"{self._user_context_prefix}{user_id}:*"
                cursor = 0
                deleted_count = 0

                while True:
                    cursor, keys = await self._redis.scan(
                        cursor=cursor, match=pattern, count=100
                    )

                    if keys:
                        deleted_count += await self._redis.delete(*keys)

                    if cursor == 0:
                        break

                # Remove from user index if no contexts remain
                user_set_key = f"{self._memory_index_prefix}users"
                await self._redis.srem(user_set_key, str(user_id))

                return deleted_count > 0

        except Exception as e:
            self._logger.error(f"Failed to delete user context: {e}")
            return False

    # Agent Memory Methods

    async def store_agent_memory(
        self, agent_id: str, memory_key: str, memory_data: Any
    ) -> None:
        """Store agent memory for persistence across sessions.

        Args:
            agent_id: Agent identifier
            memory_key: Memory key for namespacing
            memory_data: Memory data to store
        """
        try:
            key = f"{self._agent_memory_prefix}{agent_id}:{memory_key}"

            # Prepare memory data with metadata
            stored_data = {
                "data": memory_data,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "agent_id": agent_id,
                "memory_key": memory_key,
            }

            # Store with TTL
            serialized_data = json.dumps(stored_data, default=str)
            await self._redis.setex(key, self._memory_ttl, serialized_data)

            # Update agent index
            agent_set_key = f"{self._memory_index_prefix}agents"
            await self._redis.sadd(agent_set_key, agent_id)
            await self._redis.expire(agent_set_key, self._memory_ttl)

            self._logger.debug(f"Stored agent memory: agent_id={agent_id}, key={memory_key}")

        except Exception as e:
            self._logger.error(f"Failed to store agent memory: {e}")
            raise

    async def get_agent_memory(self, agent_id: str, memory_key: str) -> Any:
        """Retrieve agent memory data.

        Args:
            agent_id: Agent identifier
            memory_key: Memory key to retrieve

        Returns:
            Stored memory data or None if not found
        """
        try:
            key = f"{self._agent_memory_prefix}{agent_id}:{memory_key}"
            data = await self._redis.get(key)

            if not data:
                return None

            stored_data = json.loads(data)
            return stored_data.get("data")

        except Exception as e:
            self._logger.error(f"Failed to get agent memory: {e}")
            return None

    async def list_agent_memories(self, agent_id: str) -> Dict[str, Any]:
        """List all memory keys for an agent.

        Args:
            agent_id: Agent identifier

        Returns:
            Dictionary of memory_key -> metadata
        """
        try:
            pattern = f"{self._agent_memory_prefix}{agent_id}:*"
            cursor = 0
            memories = {}

            while True:
                cursor, keys = await self._redis.scan(
                    cursor=cursor, match=pattern, count=100
                )

                for key in keys:
                    try:
                        data = await self._redis.get(key)
                        if data:
                            stored_data = json.loads(data)
                            key_str = key.decode() if isinstance(key, bytes) else key
                            memory_key = key_str.replace(
                                f"{self._agent_memory_prefix}{agent_id}:", ""
                            )

                            memories[memory_key] = {
                                "timestamp": stored_data.get("timestamp"),
                                "has_data": stored_data.get("data") is not None,
                            }
                    except Exception as e:
                        self._logger.warning(f"Error processing memory key {key}: {e}")

                if cursor == 0:
                    break

            return memories

        except Exception as e:
            self._logger.error(f"Failed to list agent memories: {e}")
            return {}

    # Shared Knowledge Base Methods

    async def store_knowledge(
        self, knowledge_key: str, knowledge_data: Any, category: str = "general"
    ) -> None:
        """Store shared knowledge accessible across all sessions.

        Args:
            knowledge_key: Knowledge identifier
            knowledge_data: Knowledge data to store
            category: Knowledge category for organization
        """
        try:
            key = f"{self._knowledge_base_prefix}{category}:{knowledge_key}"

            # Prepare knowledge data with metadata
            stored_data = {
                "data": knowledge_data,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "category": category,
                "knowledge_key": knowledge_key,
                "id": str(uuid.uuid4()),
            }

            # Store with TTL
            serialized_data = json.dumps(stored_data, default=str)
            await self._redis.setex(key, self._knowledge_ttl, serialized_data)

            # Update category index
            category_set_key = f"{self._memory_index_prefix}knowledge:{category}"
            await self._redis.sadd(category_set_key, knowledge_key)
            await self._redis.expire(category_set_key, self._knowledge_ttl)

            self._logger.debug(f"Stored knowledge: category={category}, key={knowledge_key}")

        except Exception as e:
            self._logger.error(f"Failed to store knowledge: {e}")
            raise

    async def get_knowledge(self, knowledge_key: str, category: str = "general") -> Any:
        """Retrieve shared knowledge.

        Args:
            knowledge_key: Knowledge identifier
            category: Knowledge category

        Returns:
            Stored knowledge data or None if not found
        """
        try:
            key = f"{self._knowledge_base_prefix}{category}:{knowledge_key}"
            data = await self._redis.get(key)

            if not data:
                return None

            stored_data = json.loads(data)
            return stored_data.get("data")

        except Exception as e:
            self._logger.error(f"Failed to get knowledge: {e}")
            return None

    async def search_knowledge(
        self, query: str, category: str | None = None, limit: int = 10
    ) -> List[Dict[str, Any]]:
        """Search knowledge base.

        Args:
            query: Search query
            category: Category to search in (None for all)
            limit: Maximum results to return

        Returns:
            List of matching knowledge entries
        """
        try:
            pattern = f"{self._knowledge_base_prefix}"
            if category:
                pattern += f"{category}:*"
            else:
                pattern += "*"

            cursor = 0
            results = []
            query_lower = query.lower()

            while True:
                cursor, keys = await self._redis.scan(
                    cursor=cursor, match=pattern, count=100
                )

                for key in keys:
                    try:
                        data = await self._redis.get(key)
                        if data:
                            stored_data = json.loads(data)

                            # Simple text search in knowledge data
                            knowledge_text = json.dumps(
                                stored_data.get("data", ""), default=str
                            ).lower()

                            if query_lower in knowledge_text or query_lower in stored_data.get("knowledge_key", "").lower():
                                results.append({
                                    "key": stored_data.get("knowledge_key"),
                                    "category": stored_data.get("category"),
                                    "timestamp": stored_data.get("timestamp"),
                                    "data": stored_data.get("data"),
                                    "id": stored_data.get("id"),
                                })

                                if len(results) >= limit:
                                    return results[:limit]

                    except Exception as e:
                        self._logger.warning(f"Error searching knowledge key {key}: {e}")

                if cursor == 0:
                    break

            return results[:limit]

        except Exception as e:
            self._logger.error(f"Failed to search knowledge: {e}")
            return []

    # Session History Methods

    async def record_session_event(
        self, user_id: int, session_id: str, event_type: str, event_data: Any
    ) -> None:
        """Record a session event for history tracking.

        Args:
            user_id: User identifier
            session_id: Session identifier
            event_type: Type of event (e.g., 'session_start', 'message', 'session_end')
            event_data: Event-specific data
        """
        try:
            # Use timestamp for ordering
            timestamp = int(time.time() * 1000)  # Millisecond precision
            key = f"{self._session_history_prefix}{user_id}:{timestamp}:{session_id}"

            # Prepare event data
            event_record = {
                "session_id": session_id,
                "user_id": user_id,
                "event_type": event_type,
                "event_data": event_data,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "timestamp_ms": timestamp,
            }

            # Store with TTL
            serialized_data = json.dumps(event_record, default=str)
            await self._redis.setex(key, self._history_ttl, serialized_data)

            # Update session index for the user
            session_set_key = f"{self._memory_index_prefix}sessions:{user_id}"
            await self._redis.sadd(session_set_key, session_id)
            await self._redis.expire(session_set_key, self._history_ttl)

        except Exception as e:
            self._logger.error(f"Failed to record session event: {e}")

    async def get_session_history(
        self, user_id: int, limit: int = 10
    ) -> List[Dict[str, Any]]:
        """Get session history for a user.

        Args:
            user_id: User identifier
            limit: Maximum number of sessions to return

        Returns:
            List of session summaries ordered by recency
        """
        try:
            pattern = f"{self._session_history_prefix}{user_id}:*"
            cursor = 0
            events = []

            while True:
                cursor, keys = await self._redis.scan(
                    cursor=cursor, match=pattern, count=100
                )

                for key in keys:
                    try:
                        data = await self._redis.get(key)
                        if data:
                            event_record = json.loads(data)
                            events.append(event_record)
                    except Exception as e:
                        self._logger.warning(f"Error processing history key {key}: {e}")

                if cursor == 0:
                    break

            # Sort by timestamp (most recent first) and group by session
            events.sort(key=lambda e: e.get("timestamp_ms", 0), reverse=True)

            # Group events by session and create session summaries
            sessions = {}
            for event in events:
                session_id = event.get("session_id")
                if session_id not in sessions:
                    sessions[session_id] = {
                        "session_id": session_id,
                        "start_time": event.get("timestamp"),
                        "last_activity": event.get("timestamp"),
                        "event_count": 0,
                        "events": [],
                    }

                session_info = sessions[session_id]
                session_info["event_count"] += 1
                session_info["events"].append(event)

                # Update start and end times
                event_time = event.get("timestamp")
                if event_time < session_info["start_time"]:
                    session_info["start_time"] = event_time
                if event_time > session_info["last_activity"]:
                    session_info["last_activity"] = event_time

            # Return most recent sessions
            session_list = list(sessions.values())
            session_list.sort(key=lambda s: s["last_activity"], reverse=True)

            return session_list[:limit]

        except Exception as e:
            self._logger.error(f"Failed to get session history: {e}")
            return []

    # Statistics and Management

    async def get_memory_stats(self) -> Dict[str, Any]:
        """Get memory usage statistics.

        Returns:
            Dictionary with memory statistics
        """
        try:
            stats = {
                "user_contexts": 0,
                "agent_memories": 0,
                "knowledge_entries": 0,
                "session_events": 0,
                "total_keys": 0,
                "memory_size_bytes": 0,
            }

            # Count different types of memory
            for prefix, stat_key in [
                (self._user_context_prefix, "user_contexts"),
                (self._agent_memory_prefix, "agent_memories"),
                (self._knowledge_base_prefix, "knowledge_entries"),
                (self._session_history_prefix, "session_events"),
            ]:
                cursor = 0
                count = 0

                while True:
                    cursor, keys = await self._redis.scan(
                        cursor=cursor, match=f"{prefix}*", count=100
                    )
                    count += len(keys)

                    if cursor == 0:
                        break

                stats[stat_key] = count
                stats["total_keys"] += count

            # Get Redis memory info if available
            try:
                info = await self._redis.info("memory")
                stats["memory_size_bytes"] = info.get("used_memory", 0)
            except Exception:
                pass

            return stats

        except Exception as e:
            self._logger.error(f"Failed to get memory stats: {e}")
            return {}

    async def clear_memory(
        self, memory_type: str | None = None, user_id: int | None = None
    ) -> int:
        """Clear memory entries.

        Args:
            memory_type: Type of memory to clear ('user', 'agent', 'knowledge', 'history')
            user_id: Specific user ID to clear (only for user contexts and history)

        Returns:
            Number of entries cleared
        """
        try:
            cleared_count = 0

            if memory_type == "user" or memory_type is None:
                pattern = self._user_context_prefix
                if user_id:
                    pattern += f"{user_id}:*"
                else:
                    pattern += "*"
                cleared_count += await self._clear_by_pattern(pattern)

            if memory_type == "agent" or memory_type is None:
                pattern = f"{self._agent_memory_prefix}*"
                cleared_count += await self._clear_by_pattern(pattern)

            if memory_type == "knowledge" or memory_type is None:
                pattern = f"{self._knowledge_base_prefix}*"
                cleared_count += await self._clear_by_pattern(pattern)

            if memory_type == "history" or memory_type is None:
                pattern = self._session_history_prefix
                if user_id:
                    pattern += f"{user_id}:*"
                else:
                    pattern += "*"
                cleared_count += await self._clear_by_pattern(pattern)

            return cleared_count

        except Exception as e:
            self._logger.error(f"Failed to clear memory: {e}")
            return 0

    async def _clear_by_pattern(self, pattern: str) -> int:
        """Clear keys matching a pattern.

        Args:
            pattern: Redis key pattern

        Returns:
            Number of keys cleared
        """
        cursor = 0
        cleared = 0

        while True:
            cursor, keys = await self._redis.scan(cursor=cursor, match=pattern, count=100)

            if keys:
                cleared += await self._redis.delete(*keys)

            if cursor == 0:
                break

        return cleared

    async def shutdown(self) -> None:
        """Shutdown cross-session memory manager."""
        self._logger.info("Shutting down cross-session memory...")

        # Signal shutdown
        self._shutdown_event.set()

        # Cancel cleanup task
        if self._cleanup_task:
            self._cleanup_task.cancel()
            try:
                await self._cleanup_task
            except asyncio.CancelledError:
                pass

        self._logger.info("Cross-session memory shutdown complete")