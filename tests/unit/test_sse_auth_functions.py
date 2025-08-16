"""Unit tests for SSE authentication functions."""

import os
from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.auth.config import AuthSettings
from app.auth.models import User
from app.auth.security import (
    create_access_token,
    get_current_user_for_sse,
    get_current_user_optional,
)


class TestOptionalAuthentication:
    """Test suite for optional authentication functions."""

    @pytest.fixture
    def mock_db_session(self):
        """Mock database session."""
        session = MagicMock(spec=Session)
        user = User(
            id=1,
            username="testuser",
            email="test@example.com",
            is_active=True,
            is_verified=True,
            is_superuser=False
        )
        session.query.return_value.filter.return_value.first.return_value = user
        return session

    @pytest.fixture
    def valid_credentials(self):
        """Valid JWT credentials."""
        token = create_access_token(data={"sub": "1"})
        return HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)

    @pytest.fixture
    def invalid_credentials(self):
        """Invalid JWT credentials."""
        return HTTPAuthorizationCredentials(scheme="Bearer", credentials="invalid.token")

    def test_get_current_user_optional_with_valid_credentials(self, mock_db_session, valid_credentials):
        """Test get_current_user_optional with valid credentials returns user."""
        user = get_current_user_optional(valid_credentials, mock_db_session)

        assert user is not None
        assert user.id == 1
        assert user.username == "testuser"
        assert user.is_active is True

    def test_get_current_user_optional_with_no_credentials(self, mock_db_session):
        """Test get_current_user_optional with no credentials returns None."""
        user = get_current_user_optional(None, mock_db_session)

        assert user is None

    def test_get_current_user_optional_with_invalid_credentials(self, mock_db_session, invalid_credentials):
        """Test get_current_user_optional with invalid credentials returns None."""
        user = get_current_user_optional(invalid_credentials, mock_db_session)

        assert user is None

    def test_get_current_user_optional_with_inactive_user(self, mock_db_session, valid_credentials):
        """Test get_current_user_optional with inactive user returns None."""
        # Make the user inactive
        mock_db_session.query.return_value.filter.return_value.first.return_value.is_active = False

        user = get_current_user_optional(valid_credentials, mock_db_session)

        assert user is None


class TestSSEAuthentication:
    """Test suite for SSE-specific authentication function."""

    @pytest.fixture
    def mock_db_session(self):
        """Mock database session."""
        session = MagicMock(spec=Session)
        user = User(
            id=1,
            username="testuser",
            email="test@example.com",
            is_active=True,
            is_verified=True,
            is_superuser=False
        )
        session.query.return_value.filter.return_value.first.return_value = user
        return session

    @pytest.fixture
    def valid_credentials(self):
        """Valid JWT credentials."""
        token = create_access_token(data={"sub": "1"})
        return HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)

    @pytest.fixture
    def invalid_credentials(self):
        """Invalid JWT credentials."""
        return HTTPAuthorizationCredentials(scheme="Bearer", credentials="invalid.token")

    def test_sse_auth_required_with_valid_credentials(self, mock_db_session, valid_credentials):
        """Test SSE auth when required with valid credentials."""
        with patch("app.auth.security.get_auth_settings") as mock_settings:
            mock_settings.return_value.require_sse_auth = True

            user = get_current_user_for_sse(valid_credentials, mock_db_session)

            assert user is not None
            assert user.id == 1
            assert user.is_active is True

    def test_sse_auth_required_with_no_credentials_raises_exception(self, mock_db_session):
        """Test SSE auth when required with no credentials raises HTTPException."""
        with patch("app.auth.security.get_auth_settings") as mock_settings:
            mock_settings.return_value.require_sse_auth = True

            with pytest.raises(HTTPException) as exc_info:
                get_current_user_for_sse(None, mock_db_session)

            assert exc_info.value.status_code == 401
            assert "Authentication required for SSE endpoints" in str(exc_info.value.detail)

    def test_sse_auth_required_with_invalid_credentials_raises_exception(self, mock_db_session, invalid_credentials):
        """Test SSE auth when required with invalid credentials raises HTTPException."""
        with patch("app.auth.security.get_auth_settings") as mock_settings:
            mock_settings.return_value.require_sse_auth = True

            with pytest.raises(HTTPException) as exc_info:
                get_current_user_for_sse(invalid_credentials, mock_db_session)

            assert exc_info.value.status_code == 401
            assert "Could not validate credentials" in str(exc_info.value.detail)

    def test_sse_auth_optional_with_valid_credentials(self, mock_db_session, valid_credentials):
        """Test SSE auth when optional with valid credentials returns user."""
        with patch("app.auth.security.get_auth_settings") as mock_settings:
            mock_settings.return_value.require_sse_auth = False

            user = get_current_user_for_sse(valid_credentials, mock_db_session)

            assert user is not None
            assert user.id == 1
            assert user.is_active is True

    def test_sse_auth_optional_with_no_credentials(self, mock_db_session):
        """Test SSE auth when optional with no credentials returns None."""
        with patch("app.auth.security.get_auth_settings") as mock_settings:
            mock_settings.return_value.require_sse_auth = False

            user = get_current_user_for_sse(None, mock_db_session)

            assert user is None

    def test_sse_auth_optional_with_invalid_credentials(self, mock_db_session, invalid_credentials):
        """Test SSE auth when optional with invalid credentials returns None."""
        with patch("app.auth.security.get_auth_settings") as mock_settings:
            mock_settings.return_value.require_sse_auth = False

            user = get_current_user_for_sse(invalid_credentials, mock_db_session)

            assert user is None


class TestAuthConfiguration:
    """Test suite for authentication configuration."""

    def test_auth_settings_default_require_sse_auth_true(self):
        """Test that default setting requires SSE auth."""
        settings = AuthSettings()
        assert settings.require_sse_auth is True

    def test_auth_settings_environment_override_false(self):
        """Test that environment variable can override to False."""
        with patch.dict(os.environ, {"AUTH_REQUIRE_SSE_AUTH": "false"}):
            settings = AuthSettings()
            assert settings.require_sse_auth is False

    def test_auth_settings_environment_override_true(self):
        """Test that environment variable can override to True."""
        with patch.dict(os.environ, {"AUTH_REQUIRE_SSE_AUTH": "true"}):
            settings = AuthSettings()
            assert settings.require_sse_auth is True

    def test_auth_settings_invalid_environment_defaults_to_field_default(self):
        """Test that invalid environment value defaults to field default."""
        with patch.dict(os.environ, {"AUTH_REQUIRE_SSE_AUTH": "maybe"}):
            # Invalid boolean values should raise a validation error
            with pytest.raises(Exception):  # ValidationError from pydantic
                settings = AuthSettings()

    @pytest.mark.parametrize("env_value,expected", [
        ("1", True),
        ("0", False),
        ("yes", True),
        ("no", False),
        ("on", True),
        ("off", False),
        ("TRUE", True),
        ("FALSE", False),
    ])
    def test_auth_settings_boolean_conversions(self, env_value, expected):
        """Test various boolean conversion values."""
        with patch.dict(os.environ, {"AUTH_REQUIRE_SSE_AUTH": env_value}):
            settings = AuthSettings()
            assert settings.require_sse_auth is expected


class TestSecurityIntegration:
    """Integration tests for security functions."""

    @pytest.fixture
    def mock_db_with_multiple_users(self):
        """Mock database session with multiple users."""
        session = MagicMock(spec=Session)

        active_user = User(
            id=1,
            username="activeuser",
            email="active@example.com",
            is_active=True,
            is_verified=True,
            is_superuser=False
        )

        inactive_user = User(
            id=2,
            username="inactiveuser",
            email="inactive@example.com",
            is_active=False,
            is_verified=True,
            is_superuser=False
        )

        def mock_query_filter(user_id):
            if user_id == 1:
                return MagicMock(first=MagicMock(return_value=active_user))
            elif user_id == 2:
                return MagicMock(first=MagicMock(return_value=inactive_user))
            else:
                return MagicMock(first=MagicMock(return_value=None))

        session.query.return_value.filter.side_effect = lambda filter_expr: mock_query_filter(1)
        return session

    def test_active_user_authentication_flow(self, mock_db_with_multiple_users):
        """Test complete authentication flow for active user."""
        token = create_access_token(data={"sub": "1"})
        credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)

        # Test required auth mode
        with patch("app.auth.security.get_auth_settings") as mock_settings:
            mock_settings.return_value.require_sse_auth = True

            user = get_current_user_for_sse(credentials, mock_db_with_multiple_users)
            assert user is not None
            assert user.is_active is True

        # Test optional auth mode
        with patch("app.auth.security.get_auth_settings") as mock_settings:
            mock_settings.return_value.require_sse_auth = False

            user = get_current_user_for_sse(credentials, mock_db_with_multiple_users)
            assert user is not None
            assert user.is_active is True

    def test_no_credentials_authentication_flow(self, mock_db_with_multiple_users):
        """Test authentication flow with no credentials."""
        # Test required auth mode - should raise exception
        with patch("app.auth.security.get_auth_settings") as mock_settings:
            mock_settings.return_value.require_sse_auth = True

            with pytest.raises(HTTPException):
                get_current_user_for_sse(None, mock_db_with_multiple_users)

        # Test optional auth mode - should return None
        with patch("app.auth.security.get_auth_settings") as mock_settings:
            mock_settings.return_value.require_sse_auth = False

            user = get_current_user_for_sse(None, mock_db_with_multiple_users)
            assert user is None


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
