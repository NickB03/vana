"""Authentication configuration settings."""

import os
from datetime import timedelta

from pydantic import ConfigDict, Field
from pydantic_settings import BaseSettings


class AuthSettings(BaseSettings):
    """Comprehensive authentication configuration settings with security defaults.

    Centralizes all authentication-related configuration with secure defaults
    and environment-based overrides. Supports JWT tokens, password policies,
    Google Cloud integration, and security features.

    Configuration Sources (in order of precedence):
        1. Environment variables with AUTH_ prefix
        2. .env.local file (if exists)
        3. Default values defined in field definitions

    Security Features:
        - Secure random secret key generation
        - Configurable password strength requirements
        - JWT token expiration controls
        - Rate limiting configuration
        - Session management settings
        - Development vs production mode toggles

    Environment Variables:
        All settings can be overridden with AUTH_ prefix:
        - AUTH_SECRET_KEY: JWT signing secret
        - AUTH_ACCESS_TOKEN_EXPIRE_MINUTES: Access token lifetime
        - AUTH_PASSWORD_MIN_LENGTH: Minimum password length
        - AUTH_REQUIRE_SSE_AUTH: Enable SSE authentication
        - etc.

    Example:
        >>> settings = AuthSettings()
        >>> print(f"Token expires in: {settings.access_token_expire_minutes} minutes")
        >>> 
        >>> # Override via environment
        >>> os.environ["AUTH_ACCESS_TOKEN_EXPIRE_MINUTES"] = "60"
        >>> settings = AuthSettings()
        >>> print(f"New expiration: {settings.access_token_expire_minutes} minutes")
    """

    # JWT Settings
    secret_key: str = Field(
        default_factory=lambda: os.urandom(32).hex(),
        description="Secret key for JWT token signing",
    )
    algorithm: str = Field(default="HS256", description="JWT algorithm")
    access_token_expire_minutes: int = Field(
        default=30, description="Access token expiration in minutes"
    )
    refresh_token_expire_days: int = Field(
        default=7, description="Refresh token expiration in days"
    )

    # Password Settings
    password_min_length: int = Field(default=8, description="Minimum password length")
    password_require_uppercase: bool = Field(
        default=True, description="Require uppercase letters"
    )
    password_require_lowercase: bool = Field(
        default=True, description="Require lowercase letters"
    )
    password_require_numbers: bool = Field(default=True, description="Require numbers")
    password_require_special: bool = Field(
        default=True, description="Require special characters"
    )

    # Google Cloud Settings
    google_cloud_project: str | None = Field(
        default=None, description="Google Cloud project ID"
    )
    google_application_credentials: str | None = Field(
        default=None, description="Google Cloud credentials path"
    )

    # Database Settings
    auth_database_url: str | None = Field(
        default=None, description="Authentication database URL"
    )

    # Rate Limiting
    login_rate_limit: int = Field(default=5, description="Login attempts per minute")
    registration_rate_limit: int = Field(
        default=3, description="Registration attempts per hour"
    )

    # Security Settings
    bcrypt_rounds: int = Field(
        default=12, description="Bcrypt rounds for password hashing"
    )
    enable_registration: bool = Field(
        default=True, description="Enable user registration"
    )
    require_email_verification: bool = Field(
        default=False, description="Require email verification"
    )

    # Session Settings
    max_refresh_tokens_per_user: int = Field(
        default=5, description="Maximum refresh tokens per user"
    )

    # SSE Settings
    require_sse_auth: bool = Field(
        default=True,
        description="Require authentication for SSE endpoints (set False for demo mode)",
    )

    model_config = ConfigDict(
        env_file=".env.local" if os.path.exists(".env.local") else None,
        env_prefix="AUTH_",
        extra="ignore",  # Ignore extra fields from .env.local
    )


# Global settings instance
auth_settings = AuthSettings()


def get_auth_settings() -> AuthSettings:
    """Get the global authentication settings instance.

    Returns:
        AuthSettings: Configured authentication settings object.

    Usage:
        This function provides access to the singleton AuthSettings instance
        that is configured at module import time. Settings are loaded from
        environment variables and .env.local file.

    Thread Safety:
        The returned settings object is thread-safe for reading. Values are
        loaded once at startup and remain constant during application runtime.

    Example:
        >>> settings = get_auth_settings()
        >>> if settings.require_sse_auth:
        ...     # Production mode - enforce authentication
        ...     validate_user_token(request)
        >>> else:
        ...     # Demo mode - optional authentication
        ...     user = get_optional_user(request)
    """
    return auth_settings


# JWT Settings derived from config
JWT_SECRET_KEY = auth_settings.secret_key
JWT_ALGORITHM = auth_settings.algorithm
ACCESS_TOKEN_EXPIRE_MINUTES = auth_settings.access_token_expire_minutes
REFRESH_TOKEN_EXPIRE_DAYS = auth_settings.refresh_token_expire_days

# Timedelta objects for convenience
ACCESS_TOKEN_EXPIRE_DELTA = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
REFRESH_TOKEN_EXPIRE_DELTA = timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
