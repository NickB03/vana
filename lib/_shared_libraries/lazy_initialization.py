"""
Lazy Initialization Manager
Prevents import-time initialization that causes hanging.
"""

import logging
import os
from functools import wraps
from typing import Any, Callable, Dict, Optional

logger = logging.getLogger(__name__)


class LazyInitializationManager:
    """Manages lazy initialization of services to prevent import-time hangs."""

    def __init__(self):
        self._services: Dict[str, Any] = {}
        self._factories: Dict[str, Callable] = {}
        self._initialized: Dict[str, bool] = {}
        self.is_cloud_run = os.getenv("K_SERVICE") is not None
        self.is_development = os.getenv("ENVIRONMENT", "development") == "development"

    def register_service(self, name: str, factory: Callable, force_lazy: bool = False):
        """Register a service with lazy initialization."""
        self._factories[name] = factory
        self._initialized[name] = False

        # In development, always use lazy initialization
        # In Cloud Run, allow eager initialization unless forced lazy
        if self.is_development or force_lazy:
            logger.info(f"Registered lazy service: {name}")
        else:
            logger.info(f"Registered service: {name} (will initialize on startup)")

    def get_service(self, name: str) -> Any:
        """Get service with lazy initialization."""
        if name not in self._factories:
            raise ValueError(f"Service '{name}' not registered")

        if not self._initialized[name]:
            logger.info(f"Lazy initializing service: {name}")
            try:
                self._services[name] = self._factories[name]()
                self._initialized[name] = True
                logger.info(f"✅ Service '{name}' initialized successfully")
            except Exception as e:
                logger.error(f"❌ Failed to initialize service '{name}': {e}")
                raise

        return self._services[name]

    def is_service_initialized(self, name: str) -> bool:
        """Check if service is initialized."""
        return self._initialized.get(name, False)

    def initialize_all_services(self):
        """Initialize all registered services (for startup)."""
        logger.info("Initializing all registered services...")
        for name in self._factories:
            if not self._initialized[name]:
                try:
                    self.get_service(name)
                except Exception as e:
                    logger.error(f"Failed to initialize service '{name}': {e}")
                    # Continue with other services

    def reset_service(self, name: str):
        """Reset a service (for testing)."""
        if name in self._services:
            del self._services[name]
        self._initialized[name] = False
        logger.info(f"Reset service: {name}")


# Global lazy initialization manager
lazy_manager = LazyInitializationManager()


def lazy_service(name: str, force_lazy: bool = False):
    """Decorator to register a function as a lazy service."""

    def decorator(factory_func: Callable):
        lazy_manager.register_service(name, factory_func, force_lazy)

        @wraps(factory_func)
        def wrapper(*args, **kwargs):
            return lazy_manager.get_service(name)

        return wrapper

    return decorator


def get_lazy_service(name: str) -> Any:
    """Get a lazy service by name."""
    return lazy_manager.get_service(name)


# Service factory functions
@lazy_service("adk_memory_service", force_lazy=True)
def create_adk_memory_service():
    """Create ADK memory service with lazy initialization."""
    from lib._shared_libraries.adk_memory_service import ADKMemoryService

    # Determine Vertex AI usage
    use_vertex_ai_env = os.getenv("GOOGLE_GENAI_USE_VERTEXAI", "False").lower() == "true"
    session_service_type = os.getenv("SESSION_SERVICE_TYPE", "in_memory").lower()
    use_vertex_ai = use_vertex_ai_env or session_service_type == "vertex_ai"

    logger.info(f"Creating ADK memory service: use_vertex_ai={use_vertex_ai}")
    return ADKMemoryService(use_vertex_ai=use_vertex_ai)


@lazy_service("vector_search_client", force_lazy=True)
def create_vector_search_client():
    """Create vector search client with lazy initialization."""
    from lib._shared_libraries.vector_search_client import VectorSearchClient

    # Use mock in development to avoid hanging
    use_mock = lazy_manager.is_development
    logger.info(f"Creating vector search client: use_mock={use_mock}")
    return VectorSearchClient(use_mock=use_mock)


# Convenience functions for backward compatibility
def get_adk_memory_service():
    """Get ADK memory service (lazy)."""
    return get_lazy_service("adk_memory_service")


def get_vector_search_client():
    """Get vector search client (lazy)."""
    return get_lazy_service("vector_search_client")
