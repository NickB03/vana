"""Redis-based session store implementation for ADK compliance.

This module provides a Redis-backed session store that extends the current
InMemorySessionService with persistence capabilities, cross-session memory,
and enhanced reliability features.

Features:
- Session persistence with configurable TTL
- Cross-session memory for user context
- Atomic operations for concurrent access
- Connection pooling and retry logic
- Graceful fallback to in-memory if Redis unavailable
- All security features from the original implementation
"""

from __future__ import annotations

import asyncio
import json
import logging
import pickle
import time
from contextlib import asynccontextmanager
from dataclasses import asdict
from datetime import datetime, timezone
from typing import Any, AsyncGenerator

from .cross_session_memory import CrossSessionMemory
from .session_security import (
    SessionValidationResult,
    create_session_security_validator,
)
from .session_store import (
    SessionRecord,
    SessionStore,
    SessionStoreConfig,
    StoredMessage,
    _iso,
    _now,
)

try:
    import redis.asyncio as redis
    from redis.asyncio import ConnectionPool
    from redis.exceptions import ConnectionError, RedisError, TimeoutError
    REDIS_AVAILABLE = True
except ImportError:
    redis = None
    ConnectionPool = None
    ConnectionError = Exception
    RedisError = Exception
    TimeoutError = Exception
    REDIS_AVAILABLE = False


class RedisSessionStore(SessionStore):
    """Redis-backed session store with fallback to in-memory storage.

    Extends the base SessionStore to provide:
    - Persistent session storage in Redis
    - Cross-session memory capabilities
    - Atomic operations with Redis transactions
    - Connection pooling and automatic reconnection
    - Graceful degradation when Redis is unavailable
    """

    def __init__(
        self,
        config: SessionStoreConfig | None = None,
        redis_url: str = "redis://localhost:6379",
        redis_db: int = 0,
        redis_password: str | None = None,
        max_connections: int = 10,
        retry_attempts: int = 3,
        fallback_to_memory: bool = True,
    ) -> None:
        """Initialize Redis session store.

        Args:
            config: Session store configuration
            redis_url: Redis connection URL
            redis_db: Redis database number
            redis_password: Redis password if required
            max_connections: Maximum connections in pool
            retry_attempts: Number of retry attempts for failed operations
            fallback_to_memory: Whether to fallback to in-memory store on Redis failure
        """
        # Initialize parent class (in-memory store)
        super().__init__(config)

        self._redis_url = redis_url
        self._redis_db = redis_db
        self._redis_password = redis_password
        self._max_connections = max_connections
        self._retry_attempts = retry_attempts
        self._fallback_to_memory = fallback_to_memory

        # Redis connection management
        self._redis_pool: ConnectionPool | None = None
        self._redis_client: redis.Redis | None = None
        self._redis_available = False
        self._connection_retries = 0

        # Cross-session memory
        self._cross_session_memory: CrossSessionMemory | None = None

        # Persistence settings
        self._session_prefix = "vana:session:"
        self._memory_prefix = "vana:memory:"
        self._user_prefix = "vana:user:"

        # Background tasks
        self._redis_health_task: asyncio.Task | None = None
        self._persistence_task: asyncio.Task | None = None

        # Initialize Redis connection
        asyncio.create_task(self._initialize_redis())

    async def _initialize_redis(self) -> None:
        """Initialize Redis connection with error handling."""
        if not REDIS_AVAILABLE:
            self._logger.warning(
                "Redis not available - falling back to in-memory session store"
            )
            return

        try:
            # Create connection pool
            self._redis_pool = ConnectionPool.from_url(
                self._redis_url,
                db=self._redis_db,
                password=self._redis_password,
                max_connections=self._max_connections,
                decode_responses=False,  # We'll handle encoding ourselves
                socket_timeout=5.0,
                socket_connect_timeout=5.0,
                retry_on_timeout=True,
            )

            # Create Redis client
            self._redis_client = redis.Redis(connection_pool=self._redis_pool)

            # Test connection
            await self._redis_client.ping()
            self._redis_available = True
            self._connection_retries = 0

            # Initialize cross-session memory
            self._cross_session_memory = CrossSessionMemory(self._redis_client)

            # Start background tasks
            self._start_background_tasks()

            self._logger.info("Redis session store initialized successfully")

        except Exception as e:
            self._logger.error(f"Failed to initialize Redis: {e}")
            self._redis_available = False

            if not self._fallback_to_memory:
                raise RuntimeError(f"Redis initialization failed: {e}") from e

    def _start_background_tasks(self) -> None:
        """Start background tasks for Redis health monitoring and persistence."""
        if self._redis_health_task is None or self._redis_health_task.done():
            self._redis_health_task = asyncio.create_task(self._redis_health_monitor())

        if self._persistence_task is None or self._persistence_task.done():
            self._persistence_task = asyncio.create_task(self._periodic_persistence())

    async def _redis_health_monitor(self) -> None:
        """Monitor Redis health and attempt reconnection if needed."""
        while not self._shutdown_event.is_set():
            try:
                if self._redis_client and not self._redis_available:
                    # Attempt to reconnect
                    await self._redis_client.ping()
                    self._redis_available = True
                    self._connection_retries = 0
                    self._logger.info("Redis connection restored")

                # Wait before next health check
                await asyncio.sleep(30)  # Check every 30 seconds

            except Exception as e:
                if self._redis_available:
                    self._logger.warning(f"Redis health check failed: {e}")
                    self._redis_available = False

                self._connection_retries += 1

                # Exponential backoff for reconnection attempts
                wait_time = min(300, 5 * (2 ** min(self._connection_retries, 6)))
                await asyncio.sleep(wait_time)

    async def _periodic_persistence(self) -> None:
        """Periodically persist in-memory sessions to Redis."""
        while not self._shutdown_event.is_set():
            try:
                if self._redis_available:
                    await self._persist_memory_sessions()

                # Wait for next persistence cycle
                persistence_interval = self._config.cleanup_interval_minutes * 60 // 2
                await asyncio.sleep(persistence_interval)

            except Exception as e:
                self._logger.error(f"Periodic persistence failed: {e}")
                await asyncio.sleep(60)  # Wait before retrying

    async def _persist_memory_sessions(self) -> None:
        """Persist in-memory sessions to Redis."""
        if not self._redis_available or not self._redis_client:
            return

        with self._lock:
            sessions_to_persist = dict(self._sessions)

        # Persist sessions in batches
        pipe = self._redis_client.pipeline()
        batch_size = 0

        for session_id, record in sessions_to_persist.items():
            try:
                # Serialize session record
                session_data = self._serialize_session_record(record)
                key = f"{self._session_prefix}{session_id}"

                # Set with TTL
                ttl_seconds = self._config.session_ttl_hours * 3600
                pipe.setex(key, ttl_seconds, session_data)

                batch_size += 1

                # Execute batch when it reaches a reasonable size
                if batch_size >= 50:
                    await pipe.execute()
                    pipe = self._redis_client.pipeline()
                    batch_size = 0

            except Exception as e:
                self._logger.warning(f"Failed to persist session {session_id[:8]}...: {e}")

        # Execute remaining batch
        if batch_size > 0:
            await pipe.execute()

    def _serialize_session_record(self, record: SessionRecord) -> bytes:
        """Serialize session record for Redis storage.

        Args:
            record: Session record to serialize

        Returns:
            Serialized session data
        """
        # Convert to dictionary
        data = asdict(record)

        # Handle messages separately for efficiency
        messages_data = []
        for msg in record.messages:
            messages_data.append(asdict(msg))
        data["messages"] = messages_data

        # Use pickle for efficient serialization
        return pickle.dumps(data)

    def _deserialize_session_record(self, data: bytes) -> SessionRecord:
        """Deserialize session record from Redis storage.

        Args:
            data: Serialized session data

        Returns:
            Deserialized session record
        """
        # Deserialize data
        record_dict = pickle.loads(data)

        # Reconstruct messages
        messages = []
        for msg_data in record_dict.get("messages", []):
            messages.append(StoredMessage(**msg_data))
        record_dict["messages"] = messages

        return SessionRecord(**record_dict)

    @asynccontextmanager
    async def _redis_operation(self) -> AsyncGenerator[redis.Redis, None]:
        """Context manager for Redis operations with retry logic.

        Yields:
            Redis client for operations

        Raises:
            RedisError: If all retry attempts fail
        """
        if not self._redis_available or not self._redis_client:
            raise RedisError("Redis not available")

        last_error = None

        for attempt in range(self._retry_attempts):
            try:
                yield self._redis_client
                return
            except (ConnectionError, TimeoutError) as e:
                last_error = e
                self._logger.warning(
                    f"Redis operation failed (attempt {attempt + 1}/{self._retry_attempts}): {e}"
                )

                if attempt < self._retry_attempts - 1:
                    await asyncio.sleep(0.1 * (2 ** attempt))  # Exponential backoff

                    # Try to reconnect
                    try:
                        await self._redis_client.ping()
                    except Exception:
                        self._redis_available = False

        # All attempts failed
        self._redis_available = False
        raise RedisError(f"Redis operation failed after {self._retry_attempts} attempts") from last_error

    # Override parent methods to use Redis when available

    async def ensure_session_async(
        self,
        session_id: str,
        *,
        user_id: int | None = None,
        title: str | None = None,
        status: str | None = None,
        client_ip: str | None = None,
        user_agent: str | None = None,
    ) -> SessionRecord:
        """Create session if missing with Redis persistence."""
        # First try to load from Redis
        if self._redis_available:
            try:
                async with self._redis_operation() as redis_client:
                    key = f"{self._session_prefix}{session_id}"
                    session_data = await redis_client.get(key)

                    if session_data:
                        record = self._deserialize_session_record(session_data)

                        # Update in-memory cache
                        with self._lock:
                            self._sessions[session_id] = record

                        # Update access time
                        record.last_access_at = _iso(_now())
                        record.updated_at = _iso(_now())

                        # Update Redis with new access time
                        updated_data = self._serialize_session_record(record)
                        ttl_seconds = self._config.session_ttl_hours * 3600
                        await redis_client.setex(key, ttl_seconds, updated_data)

                        return record

            except Exception as e:
                self._logger.warning(f"Failed to load session from Redis: {e}")

        # Fallback to parent implementation (in-memory)
        record = self.ensure_session(
            session_id,
            user_id=user_id,
            title=title,
            status=status,
            client_ip=client_ip,
            user_agent=user_agent,
        )

        # Persist to Redis if available
        if self._redis_available:
            try:
                async with self._redis_operation() as redis_client:
                    key = f"{self._session_prefix}{session_id}"
                    session_data = self._serialize_session_record(record)
                    ttl_seconds = self._config.session_ttl_hours * 3600
                    await redis_client.setex(key, ttl_seconds, session_data)

            except Exception as e:
                self._logger.warning(f"Failed to persist session to Redis: {e}")

        return record

    def ensure_session(
        self,
        session_id: str,
        *,
        user_id: int | None = None,
        title: str | None = None,
        status: str | None = None,
        client_ip: str | None = None,
        user_agent: str | None = None,
    ) -> SessionRecord:
        """Synchronous version that delegates to parent for compatibility."""
        return super().ensure_session(
            session_id,
            user_id=user_id,
            title=title,
            status=status,
            client_ip=client_ip,
            user_agent=user_agent,
        )

    async def add_message_async(
        self, session_id: str, message: dict[str, Any]
    ) -> StoredMessage:
        """Add message with Redis persistence."""
        # Add to in-memory store first
        stored_message = self.add_message(session_id, message)

        # Persist to Redis if available
        if self._redis_available:
            try:
                async with self._redis_operation() as redis_client:
                    # Get updated session record
                    with self._lock:
                        record = self._sessions.get(session_id)

                    if record:
                        key = f"{self._session_prefix}{session_id}"
                        session_data = self._serialize_session_record(record)
                        ttl_seconds = self._config.session_ttl_hours * 3600
                        await redis_client.setex(key, ttl_seconds, session_data)

            except Exception as e:
                self._logger.warning(f"Failed to persist message to Redis: {e}")

        return stored_message

    async def delete_session_async(self, session_id: str) -> bool:
        """Delete session from both memory and Redis."""
        # Delete from memory
        deleted = self.delete_session(session_id)

        # Delete from Redis if available
        if self._redis_available:
            try:
                async with self._redis_operation() as redis_client:
                    key = f"{self._session_prefix}{session_id}"
                    await redis_client.delete(key)

            except Exception as e:
                self._logger.warning(f"Failed to delete session from Redis: {e}")

        return deleted

    async def get_session_async(
        self,
        session_id: str,
        client_ip: str | None = None,
        user_agent: str | None = None,
        user_id: int | None = None,
    ) -> dict[str, Any] | None:
        """Get session with Redis fallback."""
        # Try in-memory first
        session_data = self.get_session(session_id, client_ip, user_agent, user_id)

        if session_data:
            return session_data

        # Try Redis if available
        if self._redis_available:
            try:
                async with self._redis_operation() as redis_client:
                    key = f"{self._session_prefix}{session_id}"
                    redis_data = await redis_client.get(key)

                    if redis_data:
                        record = self._deserialize_session_record(redis_data)

                        # Validate session access
                        validation_result = self._validate_session_access(
                            session_id, client_ip, user_agent, user_id
                        )

                        if not validation_result.is_valid:
                            self._record_failed_attempt(
                                client_ip,
                                session_id,
                                validation_result.error_code or "ACCESS_DENIED",
                            )
                            return None

                        # Update access time and cache in memory
                        record.last_access_at = _iso(_now())
                        record.updated_at = _iso(_now())

                        with self._lock:
                            self._sessions[session_id] = record

                        # Update Redis with new access time
                        updated_data = self._serialize_session_record(record)
                        ttl_seconds = self._config.session_ttl_hours * 3600
                        await redis_client.setex(key, ttl_seconds, updated_data)

                        return record.to_dict(include_messages=True)

            except Exception as e:
                self._logger.warning(f"Failed to get session from Redis: {e}")

        return None

    async def list_sessions_async(
        self, user_id: int | None = None, include_security: bool = False
    ) -> list[dict[str, Any]]:
        """List sessions from both memory and Redis."""
        # Get in-memory sessions
        memory_sessions = self.list_sessions(user_id, include_security)
        session_ids = {session["id"] for session in memory_sessions}

        # Get additional sessions from Redis
        redis_sessions = []
        if self._redis_available:
            try:
                async with self._redis_operation() as redis_client:
                    pattern = f"{self._session_prefix}*"
                    cursor = 0

                    while True:
                        cursor, keys = await redis_client.scan(
                            cursor=cursor, match=pattern, count=100
                        )

                        for key in keys:
                            session_id = key.decode().replace(self._session_prefix, "")

                            # Skip if already in memory
                            if session_id in session_ids:
                                continue

                            try:
                                session_data = await redis_client.get(key)
                                if session_data:
                                    record = self._deserialize_session_record(session_data)

                                    # Filter by user if specified
                                    if user_id is not None and record.user_id != user_id:
                                        continue

                                    session_dict = record.to_dict(
                                        include_messages=False,
                                        include_security=include_security,
                                    )
                                    redis_sessions.append(session_dict)

                            except Exception as e:
                                self._logger.warning(
                                    f"Failed to deserialize session {session_id}: {e}"
                                )

                        if cursor == 0:
                            break

            except Exception as e:
                self._logger.warning(f"Failed to list Redis sessions: {e}")

        # Combine and sort all sessions
        all_sessions = memory_sessions + redis_sessions
        all_sessions.sort(key=lambda item: item["updated_at"], reverse=True)

        return all_sessions

    # Cross-session memory methods

    async def store_user_context(
        self, user_id: int, context_key: str, context_data: Any
    ) -> None:
        """Store user context across sessions."""
        if self._cross_session_memory:
            await self._cross_session_memory.store_user_context(
                user_id, context_key, context_data
            )

    async def get_user_context(
        self, user_id: int, context_key: str
    ) -> Any:
        """Retrieve user context across sessions."""
        if self._cross_session_memory:
            return await self._cross_session_memory.get_user_context(user_id, context_key)
        return None

    async def store_agent_memory(
        self, agent_id: str, memory_key: str, memory_data: Any
    ) -> None:
        """Store agent memory for persistence."""
        if self._cross_session_memory:
            await self._cross_session_memory.store_agent_memory(
                agent_id, memory_key, memory_data
            )

    async def get_agent_memory(self, agent_id: str, memory_key: str) -> Any:
        """Retrieve agent memory."""
        if self._cross_session_memory:
            return await self._cross_session_memory.get_agent_memory(agent_id, memory_key)
        return None

    async def get_session_history(
        self, user_id: int, limit: int = 10
    ) -> list[dict[str, Any]]:
        """Get session history for a user."""
        if self._cross_session_memory:
            return await self._cross_session_memory.get_session_history(user_id, limit)
        return []

    # Cleanup and shutdown

    async def cleanup_expired_sessions_async(self) -> int:
        """Async cleanup of expired sessions from both memory and Redis."""
        removed_count = self.cleanup_expired_sessions()

        # Cleanup Redis sessions
        redis_removed = 0
        if self._redis_available:
            try:
                async with self._redis_operation() as redis_client:
                    pattern = f"{self._session_prefix}*"
                    cursor = 0
                    expired_keys = []

                    cutoff_timestamp = time.time() - (self._config.session_ttl_hours * 3600)

                    while True:
                        cursor, keys = await redis_client.scan(
                            cursor=cursor, match=pattern, count=100
                        )

                        for key in keys:
                            try:
                                # Check TTL
                                ttl = await redis_client.ttl(key)
                                if ttl == -1 or ttl <= 0:  # No TTL or expired
                                    expired_keys.append(key)
                                    continue

                                # Check session data for additional validation
                                session_data = await redis_client.get(key)
                                if session_data:
                                    record = self._deserialize_session_record(session_data)
                                    access_time_str = record.last_access_at or record.updated_at
                                    access_time = datetime.fromisoformat(
                                        access_time_str.replace("Z", "+00:00")
                                    ).timestamp()

                                    if access_time < cutoff_timestamp:
                                        expired_keys.append(key)

                            except Exception as e:
                                self._logger.warning(f"Error checking session {key}: {e}")
                                expired_keys.append(key)  # Remove corrupted sessions

                        if cursor == 0:
                            break

                    # Remove expired sessions
                    if expired_keys:
                        redis_removed = await redis_client.delete(*expired_keys)

            except Exception as e:
                self._logger.warning(f"Failed to cleanup Redis sessions: {e}")

        total_removed = removed_count + redis_removed

        if total_removed > 0:
            self._logger.info(
                f"Cleaned up {total_removed} expired sessions "
                f"({removed_count} from memory, {redis_removed} from Redis)"
            )

        return total_removed

    async def shutdown(self) -> None:
        """Gracefully shutdown Redis session store."""
        self._logger.info("Shutting down Redis session store...")

        # Stop background tasks
        if self._redis_health_task:
            self._redis_health_task.cancel()
            try:
                await self._redis_health_task
            except asyncio.CancelledError:
                pass

        if self._persistence_task:
            self._persistence_task.cancel()
            try:
                await self._persistence_task
            except asyncio.CancelledError:
                pass

        # Final persistence of in-memory sessions
        if self._redis_available:
            try:
                await self._persist_memory_sessions()
            except Exception as e:
                self._logger.warning(f"Final persistence failed: {e}")

        # Shutdown cross-session memory
        if self._cross_session_memory:
            await self._cross_session_memory.shutdown()

        # Close Redis connections
        if self._redis_client:
            try:
                await self._redis_client.aclose()
            except Exception as e:
                self._logger.warning(f"Error closing Redis client: {e}")

        if self._redis_pool:
            try:
                await self._redis_pool.aclose()
            except Exception as e:
                self._logger.warning(f"Error closing Redis pool: {e}")

        # Call parent shutdown
        await super().shutdown()

        self._logger.info("Redis session store shutdown complete")

    def get_redis_stats(self) -> dict[str, Any]:
        """Get Redis connection and performance statistics."""
        stats = {
            "redis_available": self._redis_available,
            "redis_url": self._redis_url,
            "connection_retries": self._connection_retries,
            "fallback_to_memory": self._fallback_to_memory,
        }

        if self._redis_pool:
            stats.update({
                "pool_created_connections": getattr(self._redis_pool, "created_connections", 0),
                "pool_available_connections": getattr(self._redis_pool, "available_connections", 0),
                "pool_in_use_connections": getattr(self._redis_pool, "in_use_connections", 0),
            })

        return stats


# Factory function for easy creation
def create_redis_session_store(
    config: SessionStoreConfig | None = None,
    redis_config: dict[str, Any] | None = None,
) -> RedisSessionStore:
    """Create a Redis session store with configuration.

    Args:
        config: Session store configuration
        redis_config: Redis-specific configuration

    Returns:
        Configured Redis session store
    """
    redis_config = redis_config or {}

    return RedisSessionStore(
        config=config,
        redis_url=redis_config.get("redis_url", "redis://localhost:6379"),
        redis_db=redis_config.get("redis_db", 0),
        redis_password=redis_config.get("redis_password"),
        max_connections=redis_config.get("max_connections", 10),
        retry_attempts=redis_config.get("retry_attempts", 3),
        fallback_to_memory=redis_config.get("fallback_to_memory", True),
    )