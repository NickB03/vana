"""Unit tests for OAuth2 compliance in authentication."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.auth.database import get_auth_db
from app.auth.models import Base, Permission, Role, User
from app.auth.security import get_password_hash
from app.server import app


# Test database setup
@pytest.fixture(scope="function")
def test_db():
    """Create test database for each test."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    SessionLocal = sessionmaker(bind=engine)

    # Override dependency
    def override_get_auth_db():
        db = SessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_auth_db] = override_get_auth_db

    # Initialize with test data
    db = SessionLocal()
    try:
        # Create default permissions
        permissions = [
            Permission(name="agents:read", resource="agents", action="read"),
            Permission(name="users:read", resource="users", action="read"),
        ]
        for perm in permissions:
            db.add(perm)

        # Create default role
        user_role = Role(name="user", description="Standard user")
        db.add(user_role)
        db.commit()

        # Assign permissions
        user_role.permissions = [permissions[0]]  # agents:read
        db.commit()

        yield db
    finally:
        db.close()
        app.dependency_overrides.clear()


@pytest.fixture
def client():
    """Create test client."""
    return TestClient(app)


@pytest.fixture
def test_user(test_db):
    """Create test user in database."""
    user_role = test_db.query(Role).filter(Role.name == "user").first()
    user = User(
        email="test@example.com",
        username="testuser",
        first_name="Test",
        last_name="User",
        hashed_password=get_password_hash("TestPassword123!"),
        is_active=True,
        is_verified=True,
    )
    user.roles = [user_role]
    test_db.add(user)
    test_db.commit()
    test_db.refresh(user)
    return user


class TestOAuth2FormLogin:
    """Test OAuth2 form-encoded login (application/x-www-form-urlencoded)."""

    def test_form_login_success(self, client, test_user):
        """Test successful login with form data."""
        response = client.post(
            "/auth/login",
            data={
                "username": "testuser",
                "password": "TestPassword123!",
                "grant_type": "password",
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"
        assert data["expires_in"] > 0

    def test_form_login_without_grant_type(self, client, test_user):
        """Test form login without grant_type (should still work)."""
        response = client.post(
            "/auth/login",
            data={"username": "testuser", "password": "TestPassword123!"},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data

    def test_form_login_invalid_grant_type(self, client, test_user):
        """Test form login with invalid grant_type."""
        response = client.post(
            "/auth/login",
            data={
                "username": "testuser",
                "password": "TestPassword123!",
                "grant_type": "authorization_code",  # Invalid for password flow
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )

        assert response.status_code == 400
        assert response.json()["detail"] == "unsupported_grant_type"
        assert response.headers["content-type"] == "application/json"
        assert response.headers["cache-control"] == "no-store"

    def test_form_login_missing_username(self, client):
        """Test form login with missing username."""
        response = client.post(
            "/auth/login",
            data={"password": "TestPassword123!", "grant_type": "password"},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )

        assert response.status_code == 400
        assert response.json()["detail"] == "invalid_request"
        assert response.headers["content-type"] == "application/json"
        assert response.headers["cache-control"] == "no-store"

    def test_form_login_missing_password(self, client):
        """Test form login with missing password."""
        response = client.post(
            "/auth/login",
            data={"username": "testuser", "grant_type": "password"},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )

        assert response.status_code == 400
        assert response.json()["detail"] == "invalid_request"

    def test_form_login_invalid_credentials(self, client, test_user):
        """Test form login with invalid credentials."""
        response = client.post(
            "/auth/login",
            data={
                "username": "testuser",
                "password": "wrongpassword",
                "grant_type": "password",
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )

        assert response.status_code == 401
        assert response.json()["detail"] == "invalid_grant"
        assert "WWW-Authenticate" in response.headers
        assert response.headers["www-authenticate"] == 'Bearer realm="vana"'
        assert response.headers["content-type"] == "application/json"
        assert response.headers["cache-control"] == "no-store"

    def test_form_login_by_email(self, client, test_user):
        """Test form login using email address."""
        response = client.post(
            "/auth/login",
            data={
                "username": "test@example.com",
                "password": "TestPassword123!",
                "grant_type": "password",
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data

    def test_form_login_inactive_user(self, client, test_user, test_db):
        """Test form login with inactive user."""
        test_user.is_active = False
        test_db.commit()

        response = client.post(
            "/auth/login",
            data={
                "username": "testuser",
                "password": "TestPassword123!",
                "grant_type": "password",
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )

        assert response.status_code == 401
        assert response.json()["detail"] == "invalid_grant"
        assert response.headers["content-type"] == "application/json"
        assert response.headers["cache-control"] == "no-store"


class TestJSONLoginBackwardCompatibility:
    """Test JSON login for backward compatibility."""

    def test_json_login_success(self, client, test_user):
        """Test successful login with JSON data."""
        response = client.post(
            "/auth/login", json={"username": "testuser", "password": "TestPassword123!"}
        )

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"
        assert data["expires_in"] > 0

    def test_json_login_by_email(self, client, test_user):
        """Test JSON login using email address."""
        response = client.post(
            "/auth/login",
            json={"username": "test@example.com", "password": "TestPassword123!"},
        )

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data

    def test_json_login_invalid_credentials(self, client, test_user):
        """Test JSON login with invalid credentials."""
        response = client.post(
            "/auth/login", json={"username": "testuser", "password": "wrongpassword"}
        )

        assert response.status_code == 401
        assert response.json()["detail"] == "invalid_grant"
        assert "WWW-Authenticate" in response.headers
        assert response.headers["www-authenticate"] == 'Bearer realm="vana"'
        assert response.headers["content-type"] == "application/json"
        assert response.headers["cache-control"] == "no-store"

    def test_json_login_missing_credentials(self, client):
        """Test JSON login with missing credentials."""
        response = client.post(
            "/auth/login",
            json={"username": "testuser"},  # Missing password
        )

        assert response.status_code == 400
        assert response.json()["detail"] == "invalid_request"

    def test_json_login_empty_body(self, client):
        """Test JSON login with empty body."""
        response = client.post("/auth/login", json={})

        assert response.status_code == 400
        assert response.json()["detail"] == "invalid_request"

    def test_json_login_malformed_json(self, client):
        """Test login with malformed JSON."""
        response = client.post(
            "/auth/login",
            data='{"invalid": json}',  # Malformed JSON
            headers={"Content-Type": "application/json"},
        )

        assert response.status_code == 400
        assert response.json()["detail"] == "invalid_request"


class TestContentTypeHandling:
    """Test proper content type handling."""

    def test_unsupported_content_type(self, client):
        """Test unsupported content type."""
        response = client.post(
            "/auth/login",
            data="username=testuser&password=TestPassword123!",
            headers={"Content-Type": "text/plain"},
        )

        assert response.status_code == 400
        assert response.json()["detail"] == "invalid_request"
        assert response.headers["content-type"] == "application/json"
        assert response.headers["cache-control"] == "no-store"

    def test_no_content_type(self, client, test_user):
        """Test request without content-type header (defaults to form)."""
        response = client.post(
            "/auth/login", data={"username": "testuser", "password": "TestPassword123!"}
        )

        # FastAPI defaults to form encoding
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data

    def test_case_insensitive_content_type(self, client, test_user):
        """Test case-insensitive content type handling."""
        response = client.post(
            "/auth/login",
            json={"username": "testuser", "password": "TestPassword123!"},
            headers={"Content-Type": "APPLICATION/JSON"},  # Uppercase
        )

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data


class TestOAuth2ResponseHeaders:
    """Test OAuth2 compliant response headers."""

    def test_error_response_headers(self, client):
        """Test that error responses include proper OAuth2 headers."""
        response = client.post(
            "/auth/login",
            data={"username": "nonexistent", "password": "wrongpassword"},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )

        assert response.status_code == 401
        assert response.headers["content-type"] == "application/json"
        assert response.headers["cache-control"] == "no-store"
        assert "WWW-Authenticate" in response.headers

    def test_success_response_format(self, client, test_user):
        """Test that success responses follow OAuth2 token response format."""
        response = client.post(
            "/auth/login",
            data={
                "username": "testuser",
                "password": "TestPassword123!",
                "grant_type": "password",
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )

        assert response.status_code == 200
        data = response.json()

        # Required OAuth2 token response fields
        assert "access_token" in data
        assert "token_type" in data
        assert data["token_type"] == "bearer"

        # Optional but included fields
        assert "expires_in" in data
        assert "refresh_token" in data

        # Ensure token values are strings
        assert isinstance(data["access_token"], str)
        assert isinstance(data["refresh_token"], str)
        assert len(data["access_token"]) > 0
        assert len(data["refresh_token"]) > 0


class TestSecurityRequirements:
    """Test security requirements and edge cases."""

    def test_timing_attack_resistance(self, client, test_user):
        """Test that response times don't leak information about user existence."""
        # This is a basic test - in production, you'd measure actual timing

        # Login with existing user, wrong password
        response1 = client.post(
            "/auth/login",
            data={"username": "testuser", "password": "wrongpassword"},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )

        # Login with non-existing user
        response2 = client.post(
            "/auth/login",
            data={"username": "nonexistentuser", "password": "wrongpassword"},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )

        # Both should return same error type
        assert response1.status_code == 401
        assert response2.status_code == 401
        assert response1.json()["detail"] == "invalid_grant"
        assert response2.json()["detail"] == "invalid_grant"

    def test_sql_injection_protection(self, client):
        """Test protection against SQL injection in login."""
        malicious_username = "admin'; DROP TABLE users; --"

        response = client.post(
            "/auth/login",
            data={"username": malicious_username, "password": "TestPassword123!"},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )

        # Should handle safely without errors
        assert response.status_code == 401
        assert response.json()["detail"] == "invalid_grant"

    def test_large_payload_handling(self, client):
        """Test handling of unusually large payloads."""
        large_string = "x" * 10000

        response = client.post(
            "/auth/login",
            data={"username": large_string, "password": "TestPassword123!"},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )

        # Should handle gracefully
        assert response.status_code in [
            400,
            401,
            413,
        ]  # Bad request, unauthorized, or payload too large
