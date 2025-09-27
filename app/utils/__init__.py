"""Utilities package for the Vana application.

This package provides various utility modules including session management,
security, and persistence functionality.
"""

from .session_factory import (
    create_session_store,
    get_session_store,
    get_session_store_stats,
    get_agent_memory,
    get_session_history,
    get_user_context,
    reset_session_store,
    shutdown_session_store,
    store_agent_memory,
    store_user_context,
)
from .session_security import (
    SessionSecurityConfig,
    SessionSecurityValidator,
    SessionValidationResult,
    create_session_security_validator,
)
from .session_store import (
    SessionRecord,
    SessionStore,
    SessionStoreConfig,
    StoredMessage,
)

# Conditional imports for Redis components
try:
    from .redis_session_store import RedisSessionStore, create_redis_session_store
    from .cross_session_memory import CrossSessionMemory
    REDIS_COMPONENTS_AVAILABLE = True
except ImportError:
    # Redis components not available
    REDIS_COMPONENTS_AVAILABLE = False
    RedisSessionStore = None
    CrossSessionMemory = None
    create_redis_session_store = None

__all__ = [
    # Session management
    "SessionRecord",
    "SessionStore",
    "SessionStoreConfig",
    "StoredMessage",

    # Security
    "SessionSecurityConfig",
    "SessionSecurityValidator",
    "SessionValidationResult",
    "create_session_security_validator",

    # Factory functions
    "create_session_store",
    "get_session_store",
    "get_session_store_stats",
    "reset_session_store",
    "shutdown_session_store",

    # Cross-session memory helpers
    "get_agent_memory",
    "get_session_history",
    "get_user_context",
    "store_agent_memory",
    "store_user_context",

    # Redis components (conditionally available)
    "RedisSessionStore",
    "CrossSessionMemory",
    "create_redis_session_store",
    "REDIS_COMPONENTS_AVAILABLE",
]