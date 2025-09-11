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
    """Centralized environment configuration loader."""
    
    _instance: Optional['EnvironmentLoader'] = None
    _loaded = False
    
    def __new__(cls) -> 'EnvironmentLoader':
        """Singleton pattern to ensure single environment loading."""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def load_environment(self, silent: bool = False) -> dict[str, str]:
        """
        Load environment variables from .env files.
        
        Args:
            silent: If True, suppress logging output
            
        Returns:
            Dictionary with environment loading status
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
        """Check if environment has been loaded."""
        return self._loaded
    
    def reset(self) -> None:
        """Reset the loader state (primarily for testing)."""
        self._loaded = False


# Global instance
_env_loader = EnvironmentLoader()


def load_environment(silent: bool = False) -> dict[str, str]:
    """
    Load environment variables from .env files.
    
    This function provides a clean interface for loading environment
    variables without import-time side effects.
    
    Args:
        silent: If True, suppress logging output
        
    Returns:
        Dictionary with environment loading status
    """
    return _env_loader.load_environment(silent=silent)


def is_environment_loaded() -> bool:
    """Check if environment variables have been loaded."""
    return _env_loader.is_loaded()


def reset_environment_loader() -> None:
    """Reset the environment loader (for testing purposes)."""
    _env_loader.reset()