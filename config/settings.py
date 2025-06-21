"""
VANA Configuration Settings

This module provides centralized configuration management using pydantic-settings.
Integrates with Google Cloud Secret Manager and environment variables for secure
and flexible configuration across different environments.
"""

import os
from typing import Optional

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    VANA application settings with environment variable support.

    This class uses pydantic-settings to load configuration from:
    1. Environment variables
    2. Google Cloud Secret Manager (via existing lib/secrets.py)
    3. .env files

    All settings follow the existing VANA environment patterns.
    """

    model_config = SettingsConfigDict(
        env_file=".env.local",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Model Configuration
    vana_model: str = Field(
        default="gemini-2.0-flash-exp", description="Default LLM model for VANA agent"
    )

    # Google Cloud Configuration
    google_project_id: str = Field(
        default="analystai-454200", description="Google Cloud project ID"
    )

    google_location: str = Field(
        default="us-central1", description="Google Cloud region for services"
    )

    # Environment Detection
    vana_env: str = Field(
        default="development",
        description="Environment: development, production, or test",
    )

    # API Keys (loaded from Secret Manager via existing integration)
    openrouter_api_key: Optional[str] = Field(
        default="", description="OpenRouter API key for LLM access"
    )

    github_token: Optional[str] = Field(
        default="", description="GitHub token for repository access"
    )

    brave_api_key: Optional[str] = Field(
        default="", description="Brave Search API key for web search"
    )

    # Server Configuration
    port: int = Field(
        default=8000, description="Server port (Cloud Run uses PORT env var)"
    )

    # Memory Configuration
    memory_similarity_top_k: int = Field(
        default=5, description="Number of top results for similarity search"
    )

    memory_vector_distance_threshold: float = Field(
        default=0.7, description="Distance threshold for vector search"
    )

    memory_cache_size: int = Field(default=1000, description="Local memory cache size")

    memory_cache_ttl: int = Field(
        default=3600, description="Memory cache TTL in seconds"
    )

    # RAG Configuration
    rag_corpus_resource_name: Optional[str] = Field(
        default=None, description="Vertex AI RAG corpus resource name"
    )

    # Logging Configuration
    log_level: str = Field(default="INFO", description="Logging level")

    # Development Settings
    debug: bool = Field(default=False, description="Enable debug mode")

    @property
    def is_development(self) -> bool:
        """Check if running in development environment."""
        return self.vana_env.lower() == "development"

    @property
    def is_production(self) -> bool:
        """Check if running in production environment."""
        return self.vana_env.lower() == "production"

    @property
    def is_test(self) -> bool:
        """Check if running in test environment."""
        return self.vana_env.lower() == "test"

    @property
    def is_cloud_run(self) -> bool:
        """Check if running in Google Cloud Run environment."""
        return os.getenv("K_SERVICE") is not None

    def get_effective_port(self) -> int:
        """Get the effective port, prioritizing Cloud Run PORT env var."""
        return int(os.environ.get("PORT", self.port))


# Global settings instance
settings = Settings()


def get_settings() -> Settings:
    """
    Get the global settings instance.

    This function provides a way to access settings throughout the application
    and can be easily mocked for testing.
    """
    return settings


def reload_settings() -> Settings:
    """
    Reload settings from environment variables and files.

    Useful for testing or when environment variables change at runtime.
    """
    global settings
    settings = Settings()
    return settings
