#!/usr/bin/env python3
"""JWT Authentication for Vana API"""

import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
import hashlib

# Configuration
SECRET_KEY = os.getenv("JWT_SECRET_KEY", secrets.token_urlsafe(32))
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7

# HTTP Bearer security
security = HTTPBearer(auto_error=False)


class User(BaseModel):
    """User model for authentication"""
    id: int
    email: str
    username: str
    is_active: bool = True
    is_superuser: bool = False


class Token(BaseModel):
    """Token response model"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    """Token payload data"""
    username: Optional[str] = None
    email: Optional[str] = None
    user_id: Optional[int] = None


class LoginRequest(BaseModel):
    """Login request model"""
    email: Optional[str] = None
    username: Optional[str] = None
    password: str


# Simple password hashing for development (replace with bcrypt in production)
def simple_hash(password: str) -> str:
    """Simple hash for development - REPLACE WITH BCRYPT IN PRODUCTION"""
    return hashlib.sha256(f"{password}:vana-salt".encode()).hexdigest()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against hash"""
    return simple_hash(plain_password) == hashed_password


def get_password_hash(password: str) -> str:
    """Hash a password"""
    return simple_hash(password)


# Mock user database - replace with real database in production
MOCK_USERS = {
    "test@test.com": {
        "id": 1,
        "email": "test@test.com",
        "username": "testuser",
        "hashed_password": simple_hash("Test123!"),
        "is_active": True,
        "is_superuser": False,
    }
}


def create_access_token(data: dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Create JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def create_refresh_token(data: dict[str, Any]) -> str:
    """Create JWT refresh token"""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decode_token(token: str) -> dict[str, Any]:
    """Decode and verify JWT token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )


def authenticate_user(email: Optional[str], username: Optional[str], password: str) -> Optional[User]:
    """Authenticate user with email/username and password"""
    # Look up user by email or username
    user_data = None
    if email and email in MOCK_USERS:
        user_data = MOCK_USERS[email]
    elif username:
        # Search by username
        for user in MOCK_USERS.values():
            if user.get("username") == username:
                user_data = user
                break

    if not user_data:
        return None

    if not verify_password(password, user_data["hashed_password"]):
        return None

    return User(
        id=user_data["id"],
        email=user_data["email"],
        username=user_data["username"],
        is_active=user_data.get("is_active", True),
        is_superuser=user_data.get("is_superuser", False),
    )


async def get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> Optional[User]:
    """Get current authenticated user from JWT token"""
    # In development mode, allow unauthenticated access
    if os.getenv("ENVIRONMENT", "development") == "development":
        if not credentials or not credentials.credentials:
            return None
    elif not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not credentials:
        return None

    token = credentials.credentials
    try:
        payload = decode_token(token)
        username: Optional[str] = payload.get("username")
        email: Optional[str] = payload.get("email")
        user_id: Optional[int] = payload.get("user_id")

        if not (username or email):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Look up user (in production, query database)
        user_data = None
        if email and email in MOCK_USERS:
            user_data = MOCK_USERS[email]
        elif username:
            for user in MOCK_USERS.values():
                if user.get("username") == username:
                    user_data = user
                    break

        if not user_data:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
                headers={"WWW-Authenticate": "Bearer"},
            )

        return User(
            id=user_data["id"],
            email=user_data["email"],
            username=user_data["username"],
            is_active=user_data.get("is_active", True),
            is_superuser=user_data.get("is_superuser", False),
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_active_user(current_user: Optional[User] = Depends(get_current_user)) -> Optional[User]:
    """Get current active user or None in development"""
    if os.getenv("ENVIRONMENT", "development") == "development":
        return current_user  # Can be None in development

    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user",
        )

    return current_user


def get_current_superuser(current_user: User = Depends(get_current_active_user)) -> User:
    """Get current superuser"""
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions",
        )
    return current_user