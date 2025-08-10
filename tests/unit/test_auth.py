"""Unit tests for authentication system."""

import pytest
from datetime import datetime, timezone, timedelta
from unittest.mock import Mock, patch
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.auth.models import Base, User, Role, Permission, RefreshToken
from app.auth.security import (
    verify_password, get_password_hash, validate_password_strength,
    create_access_token, create_refresh_token, verify_refresh_token,
    authenticate_user, generate_api_key
)
from app.auth.schemas import UserCreate, UserUpdate
from app.auth.database import get_auth_db


# Test database setup
@pytest.fixture
def test_db():
    """Create test database."""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    SessionLocal = sessionmaker(bind=engine)
    return SessionLocal()


@pytest.fixture
def test_user(test_db):
    """Create test user."""
    user = User(
        email="test@example.com",
        username="testuser",
        first_name="Test",
        last_name="User",
        hashed_password=get_password_hash("testpassword123!"),
        is_active=True,
        is_verified=True
    )
    test_db.add(user)
    test_db.commit()
    test_db.refresh(user)
    return user


@pytest.fixture
def test_role(test_db):
    """Create test role."""
    role = Role(
        name="test_role",
        description="Test role"
    )
    test_db.add(role)
    test_db.commit()
    test_db.refresh(role)
    return role


@pytest.fixture
def test_permission(test_db):
    """Create test permission."""
    permission = Permission(
        name="test:read",
        description="Test read permission",
        resource="test",
        action="read"
    )
    test_db.add(permission)
    test_db.commit()
    test_db.refresh(permission)
    return permission


class TestPasswordSecurity:
    """Test password hashing and validation."""
    
    def test_password_hashing(self):
        """Test password hashing."""
        password = "testpassword123!"
        hashed = get_password_hash(password)
        
        assert hashed != password
        assert verify_password(password, hashed)
        assert not verify_password("wrongpassword", hashed)
    
    def test_password_strength_validation(self):
        """Test password strength validation."""
        # Valid passwords
        assert validate_password_strength("TestPass123!")
        assert validate_password_strength("MySecure@Pass99")
        
        # Invalid passwords
        assert not validate_password_strength("short")  # Too short
        assert not validate_password_strength("nouppercase123!")  # No uppercase
        assert not validate_password_strength("NOLOWERCASE123!")  # No lowercase
        assert not validate_password_strength("NoNumbers!")  # No numbers
        assert not validate_password_strength("NoSpecial123")  # No special chars


class TestJWTTokens:
    """Test JWT token creation and validation."""
    
    def test_access_token_creation(self):
        """Test access token creation."""
        data = {"sub": "123", "email": "test@example.com"}
        token = create_access_token(data)
        
        assert isinstance(token, str)
        assert len(token) > 0
    
    def test_access_token_with_expiry(self):
        """Test access token with custom expiry."""
        data = {"sub": "123", "email": "test@example.com"}
        expiry = timedelta(minutes=10)
        token = create_access_token(data, expiry)
        
        assert isinstance(token, str)
        assert len(token) > 0
    
    def test_refresh_token_creation(self, test_db, test_user):
        """Test refresh token creation."""
        token = create_refresh_token(
            user_id=test_user.id,
            db=test_db,
            device_info="test device",
            ip_address="127.0.0.1"
        )
        
        assert isinstance(token, str)
        assert len(token) > 0
        
        # Verify token is stored in database
        db_token = test_db.query(RefreshToken).filter(
            RefreshToken.token == token
        ).first()
        assert db_token is not None
        assert db_token.user_id == test_user.id
        assert db_token.device_info == "test device"
        assert db_token.ip_address == "127.0.0.1"
    
    def test_refresh_token_verification(self, test_db, test_user):
        """Test refresh token verification."""
        token = create_refresh_token(test_user.id, test_db)
        
        # Valid token
        user = verify_refresh_token(token, test_db)
        assert user is not None
        assert user.id == test_user.id
        
        # Invalid token
        invalid_user = verify_refresh_token("invalid_token", test_db)
        assert invalid_user is None
    
    def test_refresh_token_expiry(self, test_db, test_user):
        """Test refresh token expiry."""
        # Create expired token
        expired_token = RefreshToken(
            token="expired_token",
            user_id=test_user.id,
            expires_at=datetime.now(timezone.utc) - timedelta(days=1),
            is_revoked=False
        )
        test_db.add(expired_token)
        test_db.commit()
        
        # Should not verify expired token
        user = verify_refresh_token("expired_token", test_db)
        assert user is None


class TestUserAuthentication:
    """Test user authentication."""
    
    def test_authenticate_valid_user(self, test_db, test_user):
        """Test authentication with valid credentials."""
        user = authenticate_user("testuser", "testpassword123!", test_db)
        assert user is not None
        assert user.id == test_user.id
        assert user.last_login is not None
    
    def test_authenticate_by_email(self, test_db, test_user):
        """Test authentication by email."""
        user = authenticate_user("test@example.com", "testpassword123!", test_db)
        assert user is not None
        assert user.id == test_user.id
    
    def test_authenticate_invalid_password(self, test_db, test_user):
        """Test authentication with invalid password."""
        user = authenticate_user("testuser", "wrongpassword", test_db)
        assert user is None
    
    def test_authenticate_nonexistent_user(self, test_db):
        """Test authentication with nonexistent user."""
        user = authenticate_user("nonexistent", "password", test_db)
        assert user is None


class TestUserModel:
    """Test User model methods."""
    
    def test_user_full_name(self, test_user):
        """Test user full name property."""
        assert test_user.full_name == "Test User"
        
        # Test with missing names
        user_no_names = User(username="noname")
        assert user_no_names.full_name == "noname"
    
    def test_user_has_permission(self, test_db, test_user, test_role, test_permission):
        """Test user permission checking."""
        # User without permission
        assert not test_user.has_permission("test:read")
        
        # Add permission to role and role to user
        test_role.permissions.append(test_permission)
        test_user.roles.append(test_role)
        test_db.commit()
        
        # User with permission
        assert test_user.has_permission("test:read")
        assert not test_user.has_permission("nonexistent:permission")
        
        # Superuser has all permissions
        test_user.is_superuser = True
        test_db.commit()
        assert test_user.has_permission("any:permission")
    
    def test_user_has_role(self, test_db, test_user, test_role):
        """Test user role checking."""
        # User without role
        assert not test_user.has_role("test_role")
        
        # Add role to user
        test_user.roles.append(test_role)
        test_db.commit()
        
        # User with role
        assert test_user.has_role("test_role")
        assert not test_user.has_role("nonexistent_role")


class TestRefreshTokenModel:
    """Test RefreshToken model methods."""
    
    def test_token_validity(self, test_db, test_user):
        """Test token validity checks."""
        # Valid token
        valid_token = RefreshToken(
            token="valid_token",
            user_id=test_user.id,
            expires_at=datetime.now(timezone.utc) + timedelta(days=1),
            is_revoked=False
        )
        assert valid_token.is_valid
        assert not valid_token.is_expired
        
        # Expired token
        expired_token = RefreshToken(
            token="expired_token",
            user_id=test_user.id,
            expires_at=datetime.now(timezone.utc) - timedelta(days=1),
            is_revoked=False
        )
        assert not expired_token.is_valid
        assert expired_token.is_expired
        
        # Revoked token
        revoked_token = RefreshToken(
            token="revoked_token",
            user_id=test_user.id,
            expires_at=datetime.now(timezone.utc) + timedelta(days=1),
            is_revoked=True
        )
        assert not revoked_token.is_valid
        assert not revoked_token.is_expired


class TestUtilities:
    """Test utility functions."""
    
    def test_api_key_generation(self):
        """Test API key generation."""
        key1 = generate_api_key()
        key2 = generate_api_key()
        
        assert isinstance(key1, str)
        assert isinstance(key2, str)
        assert key1 != key2
        assert key1.startswith("vana_")
        assert key2.startswith("vana_")
        assert len(key1) > 20
        assert len(key2) > 20


class TestSchemas:
    """Test Pydantic schemas."""
    
    def test_user_create_schema(self):
        """Test UserCreate schema validation."""
        # Valid user data
        user_data = {
            "email": "test@example.com",
            "username": "testuser",
            "password": "TestPassword123!",
            "first_name": "Test",
            "last_name": "User"
        }
        user = UserCreate(**user_data)
        assert user.email == "test@example.com"
        assert user.username == "testuser"
        
        # Invalid email
        with pytest.raises(ValueError):
            UserCreate(**{**user_data, "email": "invalid-email"})
        
        # Short username
        with pytest.raises(ValueError):
            UserCreate(**{**user_data, "username": "ab"})
        
        # Short password
        with pytest.raises(ValueError):
            UserCreate(**{**user_data, "password": "short"})
    
    def test_user_update_schema(self):
        """Test UserUpdate schema validation."""
        # All fields optional
        user_update = UserUpdate()
        assert user_update.email is None
        assert user_update.username is None
        
        # Partial update
        user_update = UserUpdate(email="new@example.com")
        assert user_update.email == "new@example.com"
        assert user_update.username is None


@pytest.mark.asyncio
class TestAsyncOperations:
    """Test async authentication operations."""
    
    async def test_async_token_operations(self, test_db, test_user):
        """Test async token operations."""
        # This would test any async operations if we had them
        # For now, we'll just test that our sync operations work in async context
        token = create_refresh_token(test_user.id, test_db)
        user = verify_refresh_token(token, test_db)
        assert user is not None
        assert user.id == test_user.id