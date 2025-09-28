"""Session store factory for creating appropriate session stores based on configuration.

This module provides a factory function to create either Redis-backed or in-memory
session stores based on the application configuration and Redis availability.
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from ..config import get_config
from .session_store import SessionStore, SessionStoreConfig

if TYPE_CHECKING:
    from .redis_session_store import RedisSessionStore

# Global session store instance
_session_store: SessionStore | None = None


def create_session_store(
    force_memory: bool = False,
    config_override: SessionStoreConfig | None = None,
) -> SessionStore:
    """Create and configure the appropriate session store.

    Args:
        force_memory: Force use of in-memory store even if Redis is available
        config_override: Override default session store configuration

    Returns:
        Configured session store (Redis-backed or in-memory)
    """
    logger = logging.getLogger(__name__)

    # Get application configuration
    app_config = get_config()
    redis_config = app_config.redis_config

    # Use override config if provided
    session_config = config_override or SessionStoreConfig()

    # Check if Redis should be used
    use_redis = (
        not force_memory
        and redis_config.redis_enabled
        and redis_config.redis_url
    )

    if use_redis:
        try:
            # Import Redis session store (only if Redis is available)
            from .redis_session_store import RedisSessionStore, REDIS_AVAILABLE

            if not REDIS_AVAILABLE:
                logger.warning(
                    "Redis Python client not available - falling back to in-memory session store"
                )
                return SessionStore(session_config)

            # Create Redis session store
            logger.info("Creating Redis-backed session store")

            redis_store = RedisSessionStore(
                config=session_config,
                redis_url=redis_config.redis_url,
                redis_db=redis_config.redis_db,
                redis_password=redis_config.redis_password,
                max_connections=redis_config.redis_max_connections,
                retry_attempts=redis_config.redis_retry_attempts,
                fallback_to_memory=redis_config.redis_fallback_to_memory,
            )

            logger.info(
                f"Redis session store configured: {redis_config.redis_url}, "
                f"DB: {redis_config.redis_db}, "
                f"Max connections: {redis_config.redis_max_connections}"
            )

            return redis_store

        except ImportError as e:
            logger.warning(f"Failed to import Redis session store: {e}")
        except Exception as e:
            logger.error(f"Failed to create Redis session store: {e}")

            if not redis_config.redis_fallback_to_memory:
                raise RuntimeError(f"Redis session store creation failed: {e}") from e

    # Fall back to in-memory session store
    logger.info("Creating in-memory session store")
    return SessionStore(session_config)


def get_session_store() -> SessionStore:
    """Get the global session store instance.

    Returns:
        The global session store instance
    """
    global _session_store

    if _session_store is None:
        _session_store = create_session_store()

    return _session_store


def reset_session_store() -> None:
    """Reset the global session store instance.

    This is primarily useful for testing or when reconfiguration is needed.
    """
    global _session_store
    _session_store = None


async def shutdown_session_store() -> None:
    """Gracefully shutdown the global session store."""
    global _session_store

    if _session_store is not None:
        await _session_store.shutdown()
        _session_store = None


def get_session_store_stats() -> dict[str, any]:
    """Get comprehensive statistics from the current session store.

    Returns:
        Dictionary with session store statistics
    """
    store = get_session_store()

    # Base statistics
    stats = store.get_memory_stats()

    # Add Redis-specific stats if available
    if hasattr(store, 'get_redis_stats'):
        redis_stats = store.get_redis_stats()
        stats.update({
            "redis": redis_stats,
            "store_type": "redis" if redis_stats.get("redis_available") else "memory",
        })
    else:
        stats.update({
            "store_type": "memory",
            "redis": {"redis_available": False},
        })

    # Add security stats
    if hasattr(store, 'get_security_stats'):
        security_stats = store.get_security_stats()
        stats.update({"security": security_stats})

    return stats


# Helper functions for cross-session memory (only available with Redis)

async def store_user_context(user_id: int, context_key: str, context_data: any) -> bool:
    """Store user context across sessions.

    Args:
        user_id: User identifier
        context_key: Context key for namespacing
        context_data: Data to store

    Returns:
        True if successfully stored, False otherwise
    """
    store = get_session_store()

    if hasattr(store, 'store_user_context'):
        try:
            await store.store_user_context(user_id, context_key, context_data)
            return True
        except Exception:
            return False

    return False


async def get_user_context(user_id: int, context_key: str) -> any:
    """Retrieve user context across sessions.

    Args:
        user_id: User identifier
        context_key: Context key to retrieve

    Returns:
        Stored context data or None if not found
    """
    store = get_session_store()

    if hasattr(store, 'get_user_context'):
        try:
            return await store.get_user_context(user_id, context_key)
        except Exception:
            pass

    return None


async def store_agent_memory(agent_id: str, memory_key: str, memory_data: any) -> bool:
    """Store agent memory for persistence.

    Args:
        agent_id: Agent identifier
        memory_key: Memory key for namespacing
        memory_data: Memory data to store

    Returns:
        True if successfully stored, False otherwise
    """
    store = get_session_store()

    if hasattr(store, 'store_agent_memory'):
        try:
            await store.store_agent_memory(agent_id, memory_key, memory_data)
            return True
        except Exception:
            return False

    return False


async def get_agent_memory(agent_id: str, memory_key: str) -> any:
    """Retrieve agent memory.

    Args:
        agent_id: Agent identifier
        memory_key: Memory key to retrieve

    Returns:
        Stored memory data or None if not found
    """
    store = get_session_store()

    if hasattr(store, 'get_agent_memory'):
        try:
            return await store.get_agent_memory(agent_id, memory_key)
        except Exception:
            pass

    return None


async def get_session_history(user_id: int, limit: int = 10) -> list[dict[str, any]]:
    """Get session history for a user.

    Args:
        user_id: User identifier
        limit: Maximum number of sessions to return

    Returns:
        List of session summaries
    """
    store = get_session_store()

    if hasattr(store, 'get_session_history'):
        try:
            return await store.get_session_history(user_id, limit)
        except Exception:
            pass

    return []