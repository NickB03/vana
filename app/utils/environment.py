"""
Centralized environment configuration loader.

This module provides a single point of truth for loading and managing
environment variables across the application, eliminating import-time
side effects and reducing coupling.
"""

import os
from typing import Optional
from pathlib import Path

from dotenv import load_dotenv


class EnvironmentLoader:
    """Centralized environment configuration loader with singleton pattern.
    
    Provides a single point of truth for loading and managing environment variables
    across the application, eliminating import-time side effects and reducing
    coupling between modules. Uses singleton pattern to ensure environment
    is loaded only once per application lifecycle.
    
    Features:
        - Singleton pattern for consistent environment loading
        - Prioritized .env file loading (.env.local over .env)
        - Silent loading option for testing and controlled environments
        - Load status tracking to prevent duplicate operations
        - Comprehensive loading status reporting
        
    File Loading Priority:
        1. .env.local (development-specific overrides)
        2. .env (default environment configuration)
        3. System environment variables only (fallback)
        
    Example:
        >>> loader = EnvironmentLoader()
        >>> result = loader.load_environment(silent=False)
        >>> print(f"Status: {result['status']}")
        >>> print(f"Source: {result['source']}")
    """
    
    _instance: Optional['EnvironmentLoader'] = None
    _loaded = False
    
    def __new__(cls) -> 'EnvironmentLoader':
        """Implement singleton pattern to ensure single environment loading instance.
        
        Returns:
            The single EnvironmentLoader instance, creating it if it doesn't exist
            
        Note:
            This ensures that environment loading is consistent across the entire
            application and prevents multiple instances from causing conflicts.
        """
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def load_environment(self, silent: bool = False) -> dict[str, str]:
        """Load environment variables from .env files with priority handling.
        
        Attempts to load environment variables from .env files in priority order.
        If environment has already been loaded, returns cached status to prevent
        duplicate loading operations.
        
        Args:
            silent: If True, suppress console output for loading status.
                   Useful for testing or when output control is required.
            
        Returns:
            Dictionary containing loading status information:
                - status: \"loaded\", \"already_loaded\", or \"no_file\"
                - source: Path to loaded file or \"environment_variables\"
                - message: Human-readable status description
                
        Example:
            >>> loader = EnvironmentLoader()
            >>> result = loader.load_environment()
            >>> if result[\"status\"] == \"loaded\":
            ...     print(f\"Loaded from: {result['source']}\")
            >>> elif result[\"status\"] == \"no_file\":
            ...     print(\"Using system environment variables only\")
            
        Note:
            Loading is idempotent - subsequent calls return cached status
            without re-reading files or overriding environment variables.
        """
        if self._loaded:
            return {
                "status": "already_loaded",
                "source": "cached",
                "message": "Environment already loaded"
            }
        
        # Get the project root directory
        project_root = Path(__file__).parent.parent.parent
        
        # Try to load .env.local first, fall back to .env if not found
        env_local_path = project_root / ".env.local"
        env_fallback_path = project_root / ".env"
        
        result = {
            "status": "loaded",
            "source": "",
            "message": ""
        }
        
        if env_local_path.exists():
            load_dotenv(env_local_path)
            result["source"] = str(env_local_path)
            result["message"] = f"Loaded environment from {env_local_path}"
            if not silent:
                print(f"✅ {result['message']}")
        elif env_fallback_path.exists():
            load_dotenv(env_fallback_path)
            result["source"] = str(env_fallback_path)
            result["message"] = f"Loaded environment from {env_fallback_path}"
            if not silent:
                print(f"✅ {result['message']}")
        else:
            result["status"] = "no_file"
            result["source"] = "environment_variables"
            result["message"] = "No .env.local or .env file found, using environment variables only"
            if not silent:
                print(f"⚠️ {result['message']}")
        
        self._loaded = True
        return result
    
    def is_loaded(self) -> bool:
        """Check if environment variables have been loaded from .env files.
        
        Returns:
            True if load_environment() has been successfully called,
            False if environment loading is still pending
            
        Example:
            >>> loader = EnvironmentLoader()
            >>> if not loader.is_loaded():
            ...     loader.load_environment()
        """
        return self._loaded
    
    def reset(self) -> None:
        """Reset the loader state to allow re-loading (primarily for testing).
        
        Clears the internal loaded flag to allow load_environment() to be
        called again. This is primarily useful for testing scenarios where
        you need to simulate different environment loading conditions.
        
        Warning:
            This method is intended for testing purposes only. In production
            environments, the singleton pattern should ensure environment
            is loaded only once during application startup.
            
        Example:
            >>> # In test setup
            >>> loader = EnvironmentLoader()
            >>> loader.reset()  # Clear any previous state
            >>> result = loader.load_environment(silent=True)
        """
        self._loaded = False


# Global instance
_env_loader = EnvironmentLoader()


def load_environment(silent: bool = False) -> dict[str, str]:
    """Load environment variables from .env files using singleton loader.
    
    Provides a clean, import-safe interface for loading environment variables
    without import-time side effects. This is the recommended way to load
    environment configuration in application code.
    
    Args:
        silent: If True, suppress console output for loading status.
               Useful for testing or automated deployment scenarios.
        
    Returns:
        Dictionary containing loading status information:
            - status: \"loaded\", \"already_loaded\", or \"no_file\"
            - source: Path to loaded file or \"environment_variables\"
            - message: Human-readable status description
            
    Example:
        >>> from app.utils.environment import load_environment
        >>> 
        >>> # Load environment at application startup
        >>> result = load_environment()
        >>> if result[\"status\"] == \"loaded\":
        ...     print(f\"✅ Environment loaded from {result['source']}\")
        >>> elif result[\"status\"] == \"no_file\":
        ...     print(\"⚠️ No .env file found, using system variables\")
        >>> 
        >>> # Silent loading for tests
        >>> result = load_environment(silent=True)
        
    Note:
        This function is idempotent and safe to call multiple times.
        The underlying singleton ensures environment is loaded only once.
    """
    return _env_loader.load_environment(silent=silent)


def is_environment_loaded() -> bool:
    """Check if environment variables have been loaded from .env files.
    
    Convenience function to check the loading state without triggering
    the actual loading process. Useful for conditional environment
    loading or debugging environment setup issues.
    
    Returns:
        True if environment has been loaded via load_environment(),
        False if loading is still pending
        
    Example:
        >>> from app.utils.environment import is_environment_loaded, load_environment
        >>> 
        >>> if not is_environment_loaded():
        ...     print(\"Environment not yet loaded, loading now...\")
        ...     load_environment()
        >>> else:
        ...     print(\"Environment already loaded\")
    """
    return _env_loader.is_loaded()


def reset_environment_loader() -> None:
    """Reset the environment loader state for testing purposes.
    
    Clears the internal state of the singleton environment loader to allow
    re-loading in test scenarios. This function should ONLY be used in
    testing code and never in production environments.
    
    Warning:
        This function is intended exclusively for testing purposes.
        Using it in production code may lead to unexpected behavior
        and inconsistent environment state.
        
    Example:
        >>> # In test teardown or setup
        >>> from app.utils.environment import reset_environment_loader
        >>> reset_environment_loader()  # Clear state for clean test
        >>> # Now load_environment() will work as if called for first time
    """
    _env_loader.reset()