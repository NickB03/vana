"""Integration tests for authentication API endpoints."""

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
            Permission(name="users:create", resource="users", action="create"),
        ]
        for perm in permissions:
            db.add(perm)

        # Create default roles
        user_role = Role(name="user", description="Standard user")
        admin_role = Role(name="admin", description="Administrator")
        db.add_all([user_role, admin_role])
        db.commit()

        # Assign permissions
        user_role.permissions = [permissions[0]]  # agents:read
        admin_role.permissions = permissions  # all permissions
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
def test_user_data():
    """Test user registration data."""
    return {
        "email": "test@example.com",
        "username": "testuser",
        "password": "TestPassword123!",
        "first_name": "Test",
        "last_name": "User",
    }


@pytest.fixture
def test_admin_user(test_db):
    """Create test admin user."""
    admin_role = test_db.query(Role).filter(Role.name == "admin").first()
    user = User(
        email="admin@example.com",
        username="admin",
        first_name="Admin",
        last_name="User",
        hashed_password=get_password_hash("AdminPassword123!"),
        is_active=True,
        is_superuser=True,
        is_verified=True,
    )
    user.roles = [admin_role]
    test_db.add(user)
    test_db.commit()
    test_db.refresh(user)
    return user


@pytest.fixture
def admin_token(client, test_admin_user):
    """Get admin authentication token."""
    response = client.post(
        "/auth/login", json={"username": "admin", "password": "AdminPassword123!"}
    )
    assert response.status_code == 200
    return response.json()["tokens"]["access_token"]


@pytest.fixture
def auth_headers(admin_token):
    """Get authorization headers."""
    return {"Authorization": f"Bearer {admin_token}"}


class TestUserRegistration:
    """Test user registration endpoint."""

    def test_register_user_success(self, client, test_db, test_user_data):
        """Test successful user registration."""
        response = client.post("/auth/register", json=test_user_data)

        assert response.status_code == 201
        data = response.json()

        # Debug: Print the actual response to see what's returned
        print(f"Registration response: {data}")

        # The response has a nested structure with 'user' and 'tokens'
        assert "user" in data, "Registration response should contain user data"
        assert "tokens" in data, "Registration response should contain tokens"

        user_data = data["user"]

        # Verify user data
        assert user_data["email"] == test_user_data["email"]
        assert user_data["username"] == test_user_data["username"]
        assert user_data["first_name"] == test_user_data["first_name"]
        assert user_data["last_name"] == test_user_data["last_name"]
        assert "id" in user_data, "User data should contain ID"

        # Verify tokens are present
        tokens = data["tokens"]
        assert "access_token" in tokens
        assert "refresh_token" in tokens
        assert "token_type" in tokens

        # Password should not be returned
        assert "hashed_password" not in user_data
        assert "password" not in user_data

        # Check user exists in database
        user = test_db.query(User).filter(User.email == test_user_data["email"]).first()
        assert user is not None
        assert user.email == test_user_data["email"]

    def test_register_user_duplicate_email(self, client, test_db, test_user_data):
        """Test registration with duplicate email."""
        # First registration
        response1 = client.post("/auth/register", json=test_user_data)
        assert response1.status_code == 201

        # Second registration with same email
        test_user_data["username"] = "different_username"
        response2 = client.post("/auth/register", json=test_user_data)
        assert response2.status_code == 409
        assert "already exists" in response2.json()["detail"]

    def test_register_user_weak_password(self, client, test_user_data):
        """Test registration with weak password."""
        test_user_data["password"] = "weak"
        response = client.post("/auth/register", json=test_user_data)

        assert response.status_code == 400
        assert "security requirements" in response.json()["detail"]

    def test_register_user_invalid_email(self, client, test_user_data):
        """Test registration with invalid email."""
        test_user_data["email"] = "invalid-email"
        response = client.post("/auth/register", json=test_user_data)

        assert response.status_code == 422  # Validation error


class TestUserLogin:
    """Test user login endpoint."""

    def test_login_success_json(self, client, test_db, test_user_data):
        """Test successful login with JSON data."""
        # Register user first
        client.post("/auth/register", json=test_user_data)

        # Login with JSON
        response = client.post(
            "/auth/login",
            json={
                "username": test_user_data["username"],
                "password": test_user_data["password"],
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert "tokens" in data
        assert "user" in data
        tokens = data["tokens"]
        assert "access_token" in tokens
        assert "refresh_token" in tokens
        assert tokens["token_type"] == "bearer"
        assert tokens["expires_in"] > 0

    def test_login_success_form_data(self, client, test_db, test_user_data):
        """Test successful login with form-encoded data (OAuth2 standard)."""
        # Register user first
        client.post("/auth/register", json=test_user_data)

        # Login with form data
        response = client.post(
            "/auth/login",
            data={
                "username": test_user_data["username"],
                "password": test_user_data["password"],
                "grant_type": "password",
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )

        assert response.status_code == 200
        data = response.json()
        assert "tokens" in data
        assert "user" in data
        tokens = data["tokens"]
        assert "access_token" in tokens
        assert "refresh_token" in tokens
        assert tokens["token_type"] == "bearer"
        assert tokens["expires_in"] > 0

    def test_login_form_data_no_grant_type(self, client, test_db, test_user_data):
        """Test login with form data but no grant_type (should still work)."""
        # Register user first
        client.post("/auth/register", json=test_user_data)

        # Login with form data but no grant_type
        response = client.post(
            "/auth/login",
            data={
                "username": test_user_data["username"],
                "password": test_user_data["password"],
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )

        assert response.status_code == 200
        data = response.json()
        assert "tokens" in data
        tokens = data["tokens"]
        assert "access_token" in tokens

    def test_login_form_data_invalid_grant_type(self, client, test_db, test_user_data):
        """Test login with invalid grant_type."""
        # Register user first
        client.post("/auth/register", json=test_user_data)

        # Login with invalid grant_type
        response = client.post(
            "/auth/login",
            data={
                "username": test_user_data["username"],
                "password": test_user_data["password"],
                "grant_type": "authorization_code",  # Invalid for this endpoint
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )

        assert response.status_code == 400
        data = response.json()
        assert data["detail"] == "unsupported_grant_type"
        assert "Content-Type" in response.headers
        assert "Cache-Control" in response.headers
        assert response.headers["Cache-Control"] == "no-store"

    def test_login_form_data_missing_credentials(self, client):
        """Test login with form data but missing credentials."""
        # Login with missing password
        response = client.post(
            "/auth/login",
            data={"username": "test"},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )

        assert response.status_code == 400
        data = response.json()
        assert data["detail"] == "invalid_request"
        assert "Content-Type" in response.headers
        assert "Cache-Control" in response.headers
        assert response.headers["Cache-Control"] == "no-store"

    def test_login_unsupported_content_type(self, client):
        """Test login with unsupported content type."""
        response = client.post(
            "/auth/login",
            data="<xml>invalid</xml>",
            headers={"Content-Type": "application/xml"},
        )

        assert response.status_code == 400
        data = response.json()
        assert data["detail"] == "invalid_request"

    def test_login_by_email_json(self, client, test_db, test_user_data):
        """Test login by email with JSON data."""
        # Register user first
        client.post("/auth/register", json=test_user_data)

        # Login with email
        response = client.post(
            "/auth/login",
            json={
                "username": test_user_data["email"],
                "password": test_user_data["password"],
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert "tokens" in data
        assert "access_token" in data["tokens"]

    def test_login_by_email_form_data(self, client, test_db, test_user_data):
        """Test login by email with form data."""
        # Register user first
        client.post("/auth/register", json=test_user_data)

        # Login with email using form data
        response = client.post(
            "/auth/login",
            data={
                "username": test_user_data["email"],
                "password": test_user_data["password"],
                "grant_type": "password",
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )

        assert response.status_code == 200
        data = response.json()
        assert "tokens" in data
        assert "access_token" in data["tokens"]

    def test_login_invalid_credentials_json(self, client, test_db, test_user_data):
        """Test login with invalid credentials using JSON."""
        # Register user first
        client.post("/auth/register", json=test_user_data)

        # Login with wrong password
        response = client.post(
            "/auth/login",
            json={"username": test_user_data["username"], "password": "wrongpassword"},
        )

        assert response.status_code == 401
        # OAuth2-compliant error response
        assert response.json()["detail"] == "invalid_grant"
        assert "WWW-Authenticate" in response.headers
        assert "Cache-Control" in response.headers
        assert response.headers["Cache-Control"] == "no-store"

    def test_login_invalid_credentials_form_data(self, client, test_db, test_user_data):
        """Test login with invalid credentials using form data."""
        # Register user first
        client.post("/auth/register", json=test_user_data)

        # Login with wrong password using form data
        response = client.post(
            "/auth/login",
            data={
                "username": test_user_data["username"],
                "password": "wrongpassword",
                "grant_type": "password",
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )

        assert response.status_code == 401
        # OAuth2-compliant error response
        assert response.json()["detail"] == "invalid_grant"
        assert "WWW-Authenticate" in response.headers
        assert "Cache-Control" in response.headers
        assert response.headers["Cache-Control"] == "no-store"

    def test_login_inactive_user_json(self, client, test_db, test_user_data):
        """Test login with inactive user using JSON."""
        # Register and deactivate user
        client.post("/auth/register", json=test_user_data)
        user = test_db.query(User).filter(User.email == test_user_data["email"]).first()
        user.is_active = False
        test_db.commit()

        # Try to login
        response = client.post(
            "/auth/login",
            json={
                "username": test_user_data["username"],
                "password": test_user_data["password"],
            },
        )

        assert response.status_code == 401
        # OAuth2-compliant error response
        assert response.json()["detail"] == "invalid_grant"
        assert "Cache-Control" in response.headers
        assert response.headers["Cache-Control"] == "no-store"

    def test_login_inactive_user_form_data(self, client, test_db, test_user_data):
        """Test login with inactive user using form data."""
        # Register and deactivate user
        client.post("/auth/register", json=test_user_data)
        user = test_db.query(User).filter(User.email == test_user_data["email"]).first()
        user.is_active = False
        test_db.commit()

        # Try to login using form data
        response = client.post(
            "/auth/login",
            data={
                "username": test_user_data["username"],
                "password": test_user_data["password"],
                "grant_type": "password",
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )

        assert response.status_code == 401
        # OAuth2-compliant error response
        assert response.json()["detail"] == "invalid_grant"
        assert "Cache-Control" in response.headers
        assert response.headers["Cache-Control"] == "no-store"


class TestOAuth2Compliance:
    """Test OAuth2 specification compliance."""

    def test_oauth2_error_response_structure(self, client):
        """Test that error responses follow OAuth2 spec structure."""
        response = client.post(
            "/auth/login",
            data={
                "username": "nonexistent",
                "password": "invalid",
                "grant_type": "password",
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )

        assert response.status_code == 401
        data = response.json()

        # OAuth2 requires 'error' field
        assert "detail" in data  # FastAPI uses 'detail' instead of 'error'
        assert data["detail"] == "invalid_grant"

        # Check OAuth2-required headers
        assert "Content-Type" in response.headers
        assert response.headers["Content-Type"] == "application/json"
        assert "Cache-Control" in response.headers
        assert response.headers["Cache-Control"] == "no-store"

    def test_oauth2_grant_type_validation(self, client, test_db, test_user_data):
        """Test grant_type parameter validation."""
        # Register user first
        client.post("/auth/register", json=test_user_data)

        # Test valid grant_type
        response = client.post(
            "/auth/login",
            data={
                "username": test_user_data["username"],
                "password": test_user_data["password"],
                "grant_type": "password",
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        assert response.status_code == 200

        # Test invalid grant_type
        response = client.post(
            "/auth/login",
            data={
                "username": test_user_data["username"],
                "password": test_user_data["password"],
                "grant_type": "client_credentials",
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        assert response.status_code == 400
        assert response.json()["detail"] == "unsupported_grant_type"

    def test_oauth2_malformed_request(self, client):
        """Test malformed OAuth2 request handling."""
        # Empty form data
        response = client.post(
            "/auth/login",
            data={},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )

        assert response.status_code == 400
        assert response.json()["detail"] == "invalid_request"

    def test_oauth2_content_type_handling(self, client, test_db, test_user_data):
        """Test proper content type handling."""
        # Register user first
        client.post("/auth/register", json=test_user_data)

        # Test with proper form content type
        response = client.post(
            "/auth/login",
            data={
                "username": test_user_data["username"],
                "password": test_user_data["password"],
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        assert response.status_code == 200

        # Test with charset in content type
        response = client.post(
            "/auth/login",
            data={
                "username": test_user_data["username"],
                "password": test_user_data["password"],
            },
            headers={
                "Content-Type": "application/x-www-form-urlencoded; charset=utf-8"
            },
        )
        assert response.status_code == 200

    def test_oauth2_response_headers(self, client, test_db, test_user_data):
        """Test OAuth2-required response headers."""
        # Register user first
        client.post("/auth/register", json=test_user_data)

        # Successful login should have proper headers
        response = client.post(
            "/auth/login",
            data={
                "username": test_user_data["username"],
                "password": test_user_data["password"],
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )

        assert response.status_code == 200
        # OAuth2 token response should be JSON
        assert "Content-Type" in response.headers
        assert response.headers["Content-Type"] == "application/json"


class TestTokenRefresh:
    """Test token refresh endpoint."""

    def test_refresh_token_success(self, client, test_db, test_user_data):
        """Test successful token refresh."""
        # Register and login user
        client.post("/auth/register", json=test_user_data)
        login_response = client.post(
            "/auth/login",
            json={
                "username": test_user_data["username"],
                "password": test_user_data["password"],
            },
        )
        refresh_token = login_response.json()["tokens"]["refresh_token"]

        # Refresh token
        response = client.post("/auth/refresh", json={"refresh_token": refresh_token})

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"

    def test_refresh_token_invalid(self, client):
        """Test refresh with invalid token."""
        response = client.post("/auth/refresh", json={"refresh_token": "invalid_token"})

        assert response.status_code == 401
        assert "Invalid refresh token" in response.json()["detail"]


class TestUserInfo:
    """Test user information endpoints."""

    def test_get_current_user(self, client, test_db, test_user_data):
        """Test getting current user information."""
        # Register and login user
        client.post("/auth/register", json=test_user_data)
        login_response = client.post(
            "/auth/login",
            json={
                "username": test_user_data["username"],
                "password": test_user_data["password"],
            },
        )
        token = login_response.json()["tokens"]["access_token"]

        # Get user info
        response = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})

        assert response.status_code == 200
        data = response.json()
        assert data["email"] == test_user_data["email"]
        assert data["username"] == test_user_data["username"]
        assert "id" in data

    def test_get_current_user_unauthorized(self, client):
        """Test getting user info without authentication."""
        response = client.get("/auth/me")
        # The middleware returns 403 for forbidden access, not 401 for unauthorized
        assert response.status_code == 403

    def test_update_current_user(self, client, test_db, test_user_data):
        """Test updating current user information."""
        # Register and login user
        client.post("/auth/register", json=test_user_data)
        login_response = client.post(
            "/auth/login",
            json={
                "username": test_user_data["username"],
                "password": test_user_data["password"],
            },
        )
        token = login_response.json()["tokens"]["access_token"]

        # Update user
        update_data = {"first_name": "Updated", "last_name": "Name"}
        response = client.put(
            "/auth/me", headers={"Authorization": f"Bearer {token}"}, json=update_data
        )

        assert response.status_code == 200
        data = response.json()
        assert data["first_name"] == "Updated"
        assert data["last_name"] == "Name"


class TestPasswordManagement:
    """Test password management endpoints."""

    def test_change_password(self, client, test_db, test_user_data):
        """Test changing password."""
        # Register and login user
        client.post("/auth/register", json=test_user_data)
        login_response = client.post(
            "/auth/login",
            json={
                "username": test_user_data["username"],
                "password": test_user_data["password"],
            },
        )
        token = login_response.json()["tokens"]["access_token"]

        # Change password
        response = client.post(
            "/auth/change-password",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "current_password": test_user_data["password"],
                "new_password": "NewPassword123!",
            },
        )

        assert response.status_code == 200
        assert "Password changed successfully" in response.json()["message"]

        # Test login with new password
        login_response = client.post(
            "/auth/login",
            json={
                "username": test_user_data["username"],
                "password": "NewPassword123!",
            },
        )
        assert login_response.status_code == 200

    def test_change_password_wrong_current(self, client, test_db, test_user_data):
        """Test changing password with wrong current password."""
        # Register and login user
        client.post("/auth/register", json=test_user_data)
        login_response = client.post(
            "/auth/login",
            json={
                "username": test_user_data["username"],
                "password": test_user_data["password"],
            },
        )
        token = login_response.json()["tokens"]["access_token"]

        # Try to change password with wrong current password
        response = client.post(
            "/auth/change-password",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "current_password": "wrongpassword",
                "new_password": "NewPassword123!",
            },
        )

        assert response.status_code == 400
        assert "Incorrect current password" in response.json()["detail"]


class TestUserManagement:
    """Test user management endpoints (admin only)."""

    def test_list_users_admin(self, client, test_admin_user, auth_headers):
        """Test listing users as admin."""
        response = client.get("/users/", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1  # At least the admin user

        # Check admin user is in list
        admin_found = any(user["email"] == "admin@example.com" for user in data)
        assert admin_found

    def test_list_users_unauthorized(self, client):
        """Test listing users without authorization."""
        response = client.get("/users/")
        assert response.status_code == 401

    def test_get_user_by_id_admin(self, client, test_admin_user, auth_headers):
        """Test getting user by ID as admin."""
        response = client.get(f"/users/{test_admin_user.id}", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "admin@example.com"
        assert data["username"] == "admin"

    def test_get_nonexistent_user(self, client, auth_headers):
        """Test getting nonexistent user."""
        response = client.get("/users/99999", headers=auth_headers)
        assert response.status_code == 404


class TestRoleManagement:
    """Test role management endpoints (superuser only)."""

    def test_list_roles_superuser(self, client, test_admin_user, auth_headers):
        """Test listing roles as superuser."""
        response = client.get("/admin/roles", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 2  # user and admin roles

        # Check expected roles exist
        role_names = [role["name"] for role in data]
        assert "user" in role_names
        assert "admin" in role_names

    def test_create_role_superuser(self, client, test_admin_user, auth_headers):
        """Test creating role as superuser."""
        role_data = {
            "name": "test_role",
            "description": "Test role for testing",
            "is_active": True,
            "permission_ids": [],
        }

        response = client.post("/admin/roles", headers=auth_headers, json=role_data)

        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "test_role"
        assert data["description"] == "Test role for testing"
        assert data["is_active"] is True

    def test_list_permissions_superuser(self, client, test_admin_user, auth_headers):
        """Test listing permissions as superuser."""
        response = client.get("/admin/permissions", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 3  # At least the permissions we created

        # Check expected permissions exist
        permission_names = [perm["name"] for perm in data]
        assert "agents:read" in permission_names
        assert "users:read" in permission_names


class TestSecurityMiddleware:
    """Test security middleware functionality."""

    def test_security_headers(self, client):
        """Test security headers are added."""
        response = client.get("/health")

        # Check security headers
        assert "X-Content-Type-Options" in response.headers
        assert response.headers["X-Content-Type-Options"] == "nosniff"
        assert "X-Frame-Options" in response.headers
        assert response.headers["X-Frame-Options"] == "DENY"

    def test_rate_limiting(self, client):
        """Test rate limiting middleware."""
        # Make many requests quickly
        responses = []
        for _i in range(110):  # More than the limit of 100
            response = client.post(
                "/auth/login", json={"username": "test", "password": "test"}
            )
            responses.append(response.status_code)

        # Should eventually get rate limited
        assert 429 in responses  # Too Many Requests


class TestProtectedEndpoints:
    """Test that existing endpoints are properly protected."""

    def test_feedback_requires_auth(self, client):
        """Test feedback endpoint requires authentication."""
        response = client.post(
            "/feedback", json={"rating": 5, "comment": "Test feedback"}
        )
        assert response.status_code == 401

    def test_feedback_with_auth(self, client, test_db, test_user_data):
        """Test feedback endpoint with authentication."""
        # Register and login user
        client.post("/auth/register", json=test_user_data)
        login_response = client.post(
            "/auth/login",
            json={
                "username": test_user_data["username"],
                "password": test_user_data["password"],
            },
        )
        token = login_response.json()["tokens"]["access_token"]

        # Submit feedback
        response = client.post(
            "/feedback",
            headers={"Authorization": f"Bearer {token}"},
            json={"rating": 5, "comment": "Test feedback"},
        )
        assert response.status_code == 200

    def test_sse_requires_auth(self, client):
        """Test SSE endpoint requires authentication."""
        response = client.get("/agent_network_sse/test_session")
        assert response.status_code == 401

    def test_agent_history_requires_auth(self, client):
        """Test agent history endpoint requires authentication."""
        response = client.get("/agent_network_history")
        assert response.status_code == 401
