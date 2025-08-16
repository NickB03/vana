"""Integration tests for SSE endpoints with optional authentication."""

import json
import os
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.auth.config import get_auth_settings
from app.auth.database import get_auth_db
from app.auth.models import User
from app.auth.security import create_access_token, get_password_hash
from app.server import app


@pytest.fixture
def auth_db_session():
    """Mock database session for auth tests."""
    mock_session = MagicMock(spec=Session)
    mock_user = User(
        id=1,
        username="testuser",
        email="test@example.com",
        hashed_password=get_password_hash("testpass123!"),
        is_active=True,
        is_verified=True,
        is_superuser=False
    )
    mock_session.query.return_value.filter.return_value.first.return_value = mock_user
    return mock_session


@pytest.fixture
def override_auth_db(auth_db_session):
    """Override the auth database dependency."""
    app.dependency_overrides[get_auth_db] = lambda: auth_db_session
    yield
    app.dependency_overrides.clear()


@pytest.fixture
def valid_token():
    """Create a valid JWT token for testing."""
    return create_access_token(data={"sub": "1"})


@pytest.fixture
def invalid_token():
    """Create an invalid JWT token for testing."""
    return "invalid.jwt.token"


class TestSSEOptionalAuth:
    """Test suite for SSE endpoints with optional authentication."""

    def test_sse_with_auth_required_and_valid_token(self, override_auth_db, valid_token):
        """Test SSE endpoint with auth required and valid token."""
        with patch.dict(os.environ, {"AUTH_REQUIRE_SSE_AUTH": "true"}):
            # Force reload of auth settings
            with patch("app.auth.config.auth_settings.require_sse_auth", True):
                client = TestClient(app)
                headers = {"Authorization": f"Bearer {valid_token}"}

                with client.stream("GET", "/agent_network_sse/test-session", headers=headers) as response:
                    assert response.status_code == 200
                    assert response.headers["content-type"] == "text/event-stream; charset=utf-8"

                    # Read first chunk to verify connection
                    chunk = next(response.iter_lines())
                    assert "data:" in chunk
                    event_data = json.loads(chunk.split("data: ")[1])
                    assert event_data["type"] == "connection"
                    assert event_data["status"] == "connected"
                    assert event_data["authenticated"] is True
                    assert event_data["userId"] == 1

    def test_sse_with_auth_required_and_no_token(self, override_auth_db):
        """Test SSE endpoint with auth required and no token."""
        with patch.dict(os.environ, {"AUTH_REQUIRE_SSE_AUTH": "true"}):
            with patch("app.auth.config.auth_settings.require_sse_auth", True):
                client = TestClient(app)

                response = client.get("/agent_network_sse/test-session")
                assert response.status_code == 401
                assert "Authentication required for SSE endpoints" in response.json()["detail"]

    def test_sse_with_auth_required_and_invalid_token(self, override_auth_db, invalid_token):
        """Test SSE endpoint with auth required and invalid token."""
        with patch.dict(os.environ, {"AUTH_REQUIRE_SSE_AUTH": "true"}):
            with patch("app.auth.config.auth_settings.require_sse_auth", True):
                client = TestClient(app)
                headers = {"Authorization": f"Bearer {invalid_token}"}

                response = client.get("/agent_network_sse/test-session", headers=headers)
                assert response.status_code == 401
                assert "Could not validate credentials" in response.json()["detail"]

    def test_sse_with_auth_optional_and_valid_token(self, override_auth_db, valid_token):
        """Test SSE endpoint with auth optional and valid token."""
        with patch.dict(os.environ, {"AUTH_REQUIRE_SSE_AUTH": "false"}):
            with patch("app.auth.config.auth_settings.require_sse_auth", False):
                client = TestClient(app)
                headers = {"Authorization": f"Bearer {valid_token}"}

                with client.stream("GET", "/agent_network_sse/test-session", headers=headers) as response:
                    assert response.status_code == 200
                    assert response.headers["content-type"] == "text/event-stream; charset=utf-8"

                    # Read first chunk to verify connection
                    chunk = next(response.iter_lines())
                    assert "data:" in chunk
                    event_data = json.loads(chunk.split("data: ")[1])
                    assert event_data["type"] == "connection"
                    assert event_data["status"] == "connected"
                    assert event_data["authenticated"] is True
                    assert event_data["userId"] == 1

    def test_sse_with_auth_optional_and_no_token(self, override_auth_db):
        """Test SSE endpoint with auth optional and no token (demo mode)."""
        with patch.dict(os.environ, {"AUTH_REQUIRE_SSE_AUTH": "false"}):
            with patch("app.auth.config.auth_settings.require_sse_auth", False):
                client = TestClient(app)

                with client.stream("GET", "/agent_network_sse/test-session") as response:
                    assert response.status_code == 200
                    assert response.headers["content-type"] == "text/event-stream; charset=utf-8"

                    # Read first chunk to verify connection
                    chunk = next(response.iter_lines())
                    assert "data:" in chunk
                    event_data = json.loads(chunk.split("data: ")[1])
                    assert event_data["type"] == "connection"
                    assert event_data["status"] == "connected"
                    assert event_data["authenticated"] is False
                    assert event_data["userId"] is None

    def test_sse_with_auth_optional_and_invalid_token(self, override_auth_db, invalid_token):
        """Test SSE endpoint with auth optional and invalid token (should still work)."""
        with patch.dict(os.environ, {"AUTH_REQUIRE_SSE_AUTH": "false"}):
            with patch("app.auth.config.auth_settings.require_sse_auth", False):
                client = TestClient(app)
                headers = {"Authorization": f"Bearer {invalid_token}"}

                with client.stream("GET", "/agent_network_sse/test-session", headers=headers) as response:
                    assert response.status_code == 200
                    assert response.headers["content-type"] == "text/event-stream; charset=utf-8"

                    # Read first chunk to verify connection
                    chunk = next(response.iter_lines())
                    assert "data:" in chunk
                    event_data = json.loads(chunk.split("data: ")[1])
                    assert event_data["type"] == "connection"
                    assert event_data["status"] == "connected"
                    assert event_data["authenticated"] is False
                    assert event_data["userId"] is None

    def test_history_with_auth_required_and_valid_token(self, override_auth_db, valid_token):
        """Test history endpoint with auth required and valid token."""
        with patch.dict(os.environ, {"AUTH_REQUIRE_SSE_AUTH": "true"}):
            with patch("app.auth.config.auth_settings.require_sse_auth", True):
                client = TestClient(app)
                headers = {"Authorization": f"Bearer {valid_token}"}

                response = client.get("/agent_network_history", headers=headers)
                assert response.status_code == 200

                data = response.json()
                assert "events" in data
                assert data["authenticated"] is True
                assert data["user_id"] == 1
                assert "timestamp" in data

    def test_history_with_auth_required_and_no_token(self, override_auth_db):
        """Test history endpoint with auth required and no token."""
        with patch.dict(os.environ, {"AUTH_REQUIRE_SSE_AUTH": "true"}):
            with patch("app.auth.config.auth_settings.require_sse_auth", True):
                client = TestClient(app)

                response = client.get("/agent_network_history")
                assert response.status_code == 401
                assert "Authentication required for SSE endpoints" in response.json()["detail"]

    def test_history_with_auth_optional_and_no_token(self, override_auth_db):
        """Test history endpoint with auth optional and no token."""
        with patch.dict(os.environ, {"AUTH_REQUIRE_SSE_AUTH": "false"}):
            with patch("app.auth.config.auth_settings.require_sse_auth", False):
                client = TestClient(app)

                response = client.get("/agent_network_history")
                assert response.status_code == 200

                data = response.json()
                assert "events" in data
                assert data["authenticated"] is False
                assert data["user_id"] is None
                assert "timestamp" in data

    def test_history_with_auth_optional_and_valid_token(self, override_auth_db, valid_token):
        """Test history endpoint with auth optional and valid token."""
        with patch.dict(os.environ, {"AUTH_REQUIRE_SSE_AUTH": "false"}):
            with patch("app.auth.config.auth_settings.require_sse_auth", False):
                client = TestClient(app)
                headers = {"Authorization": f"Bearer {valid_token}"}

                response = client.get("/agent_network_history", headers=headers)
                assert response.status_code == 200

                data = response.json()
                assert "events" in data
                assert data["authenticated"] is True
                assert data["user_id"] == 1
                assert "timestamp" in data


class TestAuditLogging:
    """Test suite for audit logging in SSE endpoints."""

    @patch("app.server.logger")
    def test_sse_access_logged_authenticated(self, mock_logger, override_auth_db, valid_token):
        """Test that SSE access is logged for authenticated users."""
        with patch.dict(os.environ, {"AUTH_REQUIRE_SSE_AUTH": "true"}):
            with patch("app.auth.config.auth_settings.require_sse_auth", True):
                client = TestClient(app)
                headers = {"Authorization": f"Bearer {valid_token}"}

                with client.stream("GET", "/agent_network_sse/test-session", headers=headers) as response:
                    assert response.status_code == 200

                    # Verify audit logging was called
                    if hasattr(mock_logger, 'log_struct'):
                        mock_logger.log_struct.assert_called()
                        call_args = mock_logger.log_struct.call_args[0][0]
                        assert call_args["message"] == "SSE connection established"
                        assert call_args["user_id"] == 1
                        assert call_args["authenticated"] is True
                        assert call_args["session_id"] == "test-session"
                    else:
                        mock_logger.info.assert_called()

    @patch("app.server.logger")
    def test_sse_access_logged_unauthenticated(self, mock_logger, override_auth_db):
        """Test that SSE access is logged for unauthenticated users."""
        with patch.dict(os.environ, {"AUTH_REQUIRE_SSE_AUTH": "false"}):
            with patch("app.auth.config.auth_settings.require_sse_auth", False):
                client = TestClient(app)

                with client.stream("GET", "/agent_network_sse/test-session") as response:
                    assert response.status_code == 200

                    # Verify audit logging was called
                    if hasattr(mock_logger, 'log_struct'):
                        mock_logger.log_struct.assert_called()
                        call_args = mock_logger.log_struct.call_args[0][0]
                        assert call_args["message"] == "SSE connection established"
                        assert call_args["user_id"] is None
                        assert call_args["authenticated"] is False
                        assert call_args["session_id"] == "test-session"
                    else:
                        mock_logger.info.assert_called()

    @patch("app.server.logger")
    def test_history_access_logged(self, mock_logger, override_auth_db, valid_token):
        """Test that history access is logged."""
        with patch.dict(os.environ, {"AUTH_REQUIRE_SSE_AUTH": "true"}):
            with patch("app.auth.config.auth_settings.require_sse_auth", True):
                client = TestClient(app)
                headers = {"Authorization": f"Bearer {valid_token}"}

                response = client.get("/agent_network_history?limit=10", headers=headers)
                assert response.status_code == 200

                # Verify audit logging was called
                if hasattr(mock_logger, 'log_struct'):
                    mock_logger.log_struct.assert_called()
                    call_args = mock_logger.log_struct.call_args[0][0]
                    assert call_args["message"] == "Agent network history accessed"
                    assert call_args["user_id"] == 1
                    assert call_args["authenticated"] is True
                    assert call_args["limit"] == 10
                else:
                    mock_logger.info.assert_called()


class TestConfigValidation:
    """Test suite for configuration validation."""

    def test_default_config_requires_auth(self):
        """Test that default configuration requires authentication."""
        settings = get_auth_settings()
        assert settings.require_sse_auth is True

    def test_config_environment_override(self):
        """Test that environment variables override default config."""
        with patch.dict(os.environ, {"AUTH_REQUIRE_SSE_AUTH": "false"}):
            # Create new settings instance to pick up env var
            from app.auth.config import AuthSettings
            settings = AuthSettings()
            assert settings.require_sse_auth is False

    def test_config_with_true_values(self):
        """Test various true values in environment."""
        true_values = ["true", "True", "TRUE", "1", "yes", "on"]

        for value in true_values:
            with patch.dict(os.environ, {"AUTH_REQUIRE_SSE_AUTH": value}):
                from app.auth.config import AuthSettings
                settings = AuthSettings()
                assert settings.require_sse_auth is True, f"Value '{value}' should be True"

    def test_config_with_false_values(self):
        """Test various false values in environment."""
        false_values = ["false", "False", "FALSE", "0", "no", "off"]

        for value in false_values:
            with patch.dict(os.environ, {"AUTH_REQUIRE_SSE_AUTH": value}):
                from app.auth.config import AuthSettings
                settings = AuthSettings()
                assert settings.require_sse_auth is False, f"Value '{value}' should be False"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
