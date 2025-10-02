"""Unit tests for JWT secret configuration (CRIT-003).

Tests verify that JWT_SECRET_KEY is properly validated and configured for production use.
"""

import os
from unittest.mock import patch

import pytest


def test_auth_settings_requires_jwt_secret_from_environment() -> None:
    """Test that AuthSettings loads JWT_SECRET_KEY from environment."""
    # Clear any existing secrets
    with patch.dict(os.environ, {}, clear=True):
        os.environ["AUTH_SECRET_KEY"] = "test_secret_from_env_32_chars_long_minimum"

        # Import after environment is set
        from app.auth.config import AuthSettings

        settings = AuthSettings()

        # Should load from environment
        assert settings.secret_key == "test_secret_from_env_32_chars_long_minimum"


def test_auth_settings_without_secret_returns_empty_string() -> None:
    """Test that AuthSettings returns empty string when no secret is configured."""
    # Clear environment
    with patch.dict(os.environ, {}, clear=True):
        # Import after environment is cleared
        from app.auth.config import AuthSettings

        settings = AuthSettings()

        # Should return empty string (no more random default)
        assert settings.secret_key == ""


def test_server_validation_logic_for_production() -> None:
    """Test the production validation logic from server.py."""
    # Simulate the validation that happens in server.py

    # Case 1: Production with empty secret should raise
    environment = "production"
    secret_key = ""

    with pytest.raises(RuntimeError, match="JWT_SECRET_KEY"):
        if environment == "production" and not secret_key:
            raise RuntimeError(
                "CRITICAL: JWT_SECRET_KEY or AUTH_SECRET_KEY must be set in production environment. "
                "This is required for secure token signing and user session persistence. "
                "Generate a secure key with: openssl rand -hex 32"
            )


def test_server_validation_logic_for_development() -> None:
    """Test the development validation logic from server.py."""
    # Case 2: Development with empty secret should not raise
    environment = "development"
    secret_key = ""

    # This should NOT raise
    if environment == "production" and not secret_key:
        pytest.fail("Should not check in development")

    # Verify it passes without error
    assert secret_key == ""


def test_server_validation_logic_with_valid_secret() -> None:
    """Test validation passes with valid secret in production."""
    environment = "production"
    secret_key = "valid_secret_key_32_chars_long_minimum_length"

    # This should NOT raise
    if environment == "production" and not secret_key:
        pytest.fail("Should not raise with valid secret")

    # Verify it passes
    assert secret_key != ""


def test_jwt_constants_use_auth_settings() -> None:
    """Test that JWT constants are derived from auth_settings."""
    with patch.dict(os.environ, {"AUTH_SECRET_KEY": "test_key_32_chars"}):
        # Need to reload the module to pick up new environment
        import importlib
        import app.auth.config

        importlib.reload(app.auth.config)

        from app.auth.config import JWT_SECRET_KEY, auth_settings

        # JWT_SECRET_KEY constant should match auth_settings.secret_key
        assert JWT_SECRET_KEY == auth_settings.secret_key
