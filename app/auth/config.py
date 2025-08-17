"""Authentication configuration settings."""

import os
from datetime import timedelta

from pydantic import ConfigDict, Field
from pydantic_settings import BaseSettings


class AuthSettings(BaseSettings):
    """Authentication configuration settings."""

    # JWT Settings
    secret_key: str = Field(
        default_factory=lambda: os.urandom(32).hex(),
        description="Secret key for JWT token signing"
    )
    algorithm: str = Field(default="HS256", description="JWT algorithm")
    access_token_expire_minutes: int = Field(default=30, description="Access token expiration in minutes")
    refresh_token_expire_days: int = Field(default=7, description="Refresh token expiration in days")

    # Password Settings
    password_min_length: int = Field(default=8, description="Minimum password length")
    password_require_uppercase: bool = Field(default=True, description="Require uppercase letters")
    password_require_lowercase: bool = Field(default=True, description="Require lowercase letters")
    password_require_numbers: bool = Field(default=True, description="Require numbers")
    password_require_special: bool = Field(default=True, description="Require special characters")

    # Google Cloud Settings
    google_cloud_project: str | None = Field(default=None, description="Google Cloud project ID")
    google_application_credentials: str | None = Field(default=None, description="Google Cloud credentials path")

    # Database Settings
    auth_database_url: str | None = Field(default=None, description="Authentication database URL")

    # Rate Limiting
    login_rate_limit: int = Field(default=5, description="Login attempts per minute")
    registration_rate_limit: int = Field(default=3, description="Registration attempts per hour")

    # Security Settings
    bcrypt_rounds: int = Field(default=12, description="Bcrypt rounds for password hashing")
    enable_registration: bool = Field(default=True, description="Enable user registration")
    require_email_verification: bool = Field(default=False, description="Require email verification")

    # Session Settings
    max_refresh_tokens_per_user: int = Field(default=5, description="Maximum refresh tokens per user")

    # SSE Settings
    require_sse_auth: bool = Field(default=True, description="Require authentication for SSE endpoints (set False for demo mode)")

    model_config = ConfigDict(
        env_file=".env.local",
        env_prefix="AUTH_",
        extra="ignore"  # Ignore extra fields from .env.local
    )


# Global settings instance
auth_settings = AuthSettings()


def get_auth_settings() -> AuthSettings:
    """Get authentication settings."""
    return auth_settings


# JWT Settings derived from config
JWT_SECRET_KEY = auth_settings.secret_key
JWT_ALGORITHM = auth_settings.algorithm
ACCESS_TOKEN_EXPIRE_MINUTES = auth_settings.access_token_expire_minutes
REFRESH_TOKEN_EXPIRE_DAYS = auth_settings.refresh_token_expire_days

# Timedelta objects for convenience
ACCESS_TOKEN_EXPIRE_DELTA = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
REFRESH_TOKEN_EXPIRE_DELTA = timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
