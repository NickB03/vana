"""OAuth2 integration tests for real-world usage scenarios."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.auth.models import Base, User, Role
from app.auth.database import get_auth_db
from app.auth.security import get_password_hash
from app.server import app


@pytest.fixture(scope="function")
def test_db():
    """Create test database for each test."""
    engine = create_engine(
        "sqlite:///:memory:", 
        connect_args={"check_same_thread": False},
        poolclass=StaticPool
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
        # Create default role
        user_role = Role(name="user", description="Standard user")
        db.add(user_role)
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
        "email": "oauth_test@example.com",
        "username": "oauth_user",
        "password": "OAuth2Test123!",
        "first_name": "OAuth2",
        "last_name": "User"
    }


class TestOAuth2RealWorldScenarios:
    """Test OAuth2 implementation in real-world scenarios."""
    
    def test_oauth2_client_credentials_flow(self, client, test_db, test_user_data):
        """Test OAuth2 client making form-encoded requests."""
        # Register user
        register_response = client.post("/auth/register", json=test_user_data)
        assert register_response.status_code == 201
        
        # OAuth2 client makes form-encoded request
        oauth_response = client.post("/auth/login",
            data={
                "username": test_user_data["username"],
                "password": test_user_data["password"],
                "grant_type": "password"
            },
            headers={
                "Content-Type": "application/x-www-form-urlencoded",
                "User-Agent": "OAuth2Client/1.0"
            }
        )
        
        assert oauth_response.status_code == 200
        token_data = oauth_response.json()
        
        # Verify token structure
        assert "access_token" in token_data
        assert "refresh_token" in token_data
        assert token_data["token_type"] == "bearer"
        assert token_data["expires_in"] > 0
        
        # Use the token to access protected endpoint
        protected_response = client.get("/auth/me", headers={
            "Authorization": f"Bearer {token_data['access_token']}"
        })
        
        assert protected_response.status_code == 200
        user_info = protected_response.json()
        assert user_info["email"] == test_user_data["email"]
    
    def test_mixed_content_type_usage(self, client, test_db, test_user_data):
        """Test mixing JSON and form-encoded requests in same session."""
        # Register user with JSON (web app)
        client.post("/auth/register", json=test_user_data)
        
        # Login with JSON (web app)
        json_response = client.post("/auth/login", json={
            "username": test_user_data["username"],
            "password": test_user_data["password"]
        })
        assert json_response.status_code == 200
        json_token = json_response.json()["access_token"]
        
        # Login with form data (OAuth2 client)
        form_response = client.post("/auth/login",
            data={
                "username": test_user_data["username"],
                "password": test_user_data["password"],
                "grant_type": "password"
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        assert form_response.status_code == 200
        form_token = form_response.json()["access_token"]
        
        # Both tokens should work for accessing protected resources
        json_user_response = client.get("/auth/me", headers={
            "Authorization": f"Bearer {json_token}"
        })
        assert json_user_response.status_code == 200
        
        form_user_response = client.get("/auth/me", headers={
            "Authorization": f"Bearer {form_token}"
        })
        assert form_user_response.status_code == 200
        
        # Both should return same user data
        assert json_user_response.json()["id"] == form_user_response.json()["id"]
    
    def test_oauth2_error_handling_consistency(self, client, test_db, test_user_data):
        """Test consistent error handling between JSON and form requests."""
        # Register user
        client.post("/auth/register", json=test_user_data)
        
        # Test invalid credentials with JSON
        json_error = client.post("/auth/login", json={
            "username": test_user_data["username"],
            "password": "wrongpassword"
        })
        
        # Test invalid credentials with form data
        form_error = client.post("/auth/login",
            data={
                "username": test_user_data["username"],
                "password": "wrongpassword",
                "grant_type": "password"
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        
        # Both should return same error structure
        assert json_error.status_code == form_error.status_code == 401
        assert json_error.json()["detail"] == form_error.json()["detail"] == "invalid_grant"
        
        # Both should have OAuth2-compliant headers
        for response in [json_error, form_error]:
            assert "Cache-Control" in response.headers
            assert response.headers["Cache-Control"] == "no-store"
            assert "WWW-Authenticate" in response.headers
    
    def test_oauth2_with_email_authentication(self, client, test_db, test_user_data):
        """Test OAuth2 form data with email as username."""
        # Register user
        client.post("/auth/register", json=test_user_data)
        
        # Login using email with form data
        response = client.post("/auth/login",
            data={
                "username": test_user_data["email"],  # Use email as username
                "password": test_user_data["password"],
                "grant_type": "password"
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        
        assert response.status_code == 200
        token_data = response.json()
        
        # Verify token works
        user_response = client.get("/auth/me", headers={
            "Authorization": f"Bearer {token_data['access_token']}"
        })
        assert user_response.status_code == 200
        assert user_response.json()["email"] == test_user_data["email"]
    
    def test_oauth2_token_refresh_flow(self, client, test_db, test_user_data):
        """Test complete OAuth2 token refresh flow."""
        # Register and login user with form data
        client.post("/auth/register", json=test_user_data)
        
        login_response = client.post("/auth/login",
            data={
                "username": test_user_data["username"],
                "password": test_user_data["password"],
                "grant_type": "password"
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        
        assert login_response.status_code == 200
        tokens = login_response.json()
        
        # Use refresh token to get new access token
        import time
        time.sleep(1)  # Ensure different timestamp for new token
        
        refresh_response = client.post("/auth/refresh", json={
            "refresh_token": tokens["refresh_token"]
        })
        
        assert refresh_response.status_code == 200
        new_tokens = refresh_response.json()
        
        # New refresh token should be different (access token might be same if time didn't advance)
        assert new_tokens["refresh_token"] != tokens["refresh_token"]
        
        # New access token should work
        user_response = client.get("/auth/me", headers={
            "Authorization": f"Bearer {new_tokens['access_token']}"
        })
        assert user_response.status_code == 200
    
    def test_oauth2_sequential_authentication(self, client, test_db, test_user_data):
        """Test sequential authentication using both methods."""
        # Register user
        client.post("/auth/register", json=test_user_data)
        
        # First request with JSON
        json_response = client.post("/auth/login", json={
            "username": test_user_data["username"],
            "password": test_user_data["password"]
        })
        
        # Second request with form data
        form_response = client.post("/auth/login",
            data={
                "username": test_user_data["username"],
                "password": test_user_data["password"],
                "grant_type": "password"
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        
        # Both should succeed
        assert json_response.status_code == 200
        assert form_response.status_code == 200
        
        # Both should return valid tokens
        json_token = json_response.json()["access_token"]
        form_token = form_response.json()["access_token"]
        
        assert len(json_token) > 0
        assert len(form_token) > 0
        
        # Both tokens should work for authentication
        json_user_response = client.get("/auth/me", headers={
            "Authorization": f"Bearer {json_token}"
        })
        form_user_response = client.get("/auth/me", headers={
            "Authorization": f"Bearer {form_token}"
        })
        
        assert json_user_response.status_code == 200
        assert form_user_response.status_code == 200
    
    def test_oauth2_edge_cases(self, client, test_db, test_user_data):
        """Test OAuth2 edge cases and boundary conditions."""
        # Register user
        client.post("/auth/register", json=test_user_data)
        
        # Test with extra parameters (should be ignored)
        response = client.post("/auth/login",
            data={
                "username": test_user_data["username"],
                "password": test_user_data["password"],
                "grant_type": "password",
                "scope": "read write",  # Extra parameter
                "client_id": "test_client",  # Extra parameter
                "state": "random_state"  # Extra parameter
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        
        assert response.status_code == 200
        
        # Test with case-insensitive content type
        response = client.post("/auth/login",
            data={
                "username": test_user_data["username"],
                "password": test_user_data["password"]
            },
            headers={"Content-Type": "APPLICATION/X-WWW-FORM-URLENCODED"}
        )
        
        assert response.status_code == 200
        
        # Test empty grant_type (should default to allow)
        response = client.post("/auth/login",
            data={
                "username": test_user_data["username"],
                "password": test_user_data["password"],
                "grant_type": ""  # Empty grant_type
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        
        assert response.status_code == 200


class TestOAuth2BackwardCompatibility:
    """Test backward compatibility with existing implementations."""
    
    def test_legacy_json_clients_still_work(self, client, test_db, test_user_data):
        """Test that existing JSON-based clients continue to work."""
        # Register user
        client.post("/auth/register", json=test_user_data)
        
        # Legacy client using JSON (should still work)
        response = client.post("/auth/login", json={
            "username": test_user_data["username"],
            "password": test_user_data["password"]
        })
        
        assert response.status_code == 200
        token_data = response.json()
        
        # Should have same token structure
        required_fields = ["access_token", "refresh_token", "token_type", "expires_in"]
        for field in required_fields:
            assert field in token_data
        
        assert token_data["token_type"] == "bearer"
    
    def test_api_response_consistency(self, client, test_db, test_user_data):
        """Test that API responses are consistent between content types."""
        # Register user
        client.post("/auth/register", json=test_user_data)
        
        # Get token via JSON
        json_response = client.post("/auth/login", json={
            "username": test_user_data["username"],
            "password": test_user_data["password"]
        })
        
        # Get token via form data
        form_response = client.post("/auth/login",
            data={
                "username": test_user_data["username"],
                "password": test_user_data["password"],
                "grant_type": "password"
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        
        # Both responses should have identical structure
        json_data = json_response.json()
        form_data = form_response.json()
        
        assert set(json_data.keys()) == set(form_data.keys())
        assert json_data["token_type"] == form_data["token_type"]
        assert json_data["expires_in"] == form_data["expires_in"]