#!/usr/bin/env python3
"""Authentication routes for Vana API"""

from datetime import timedelta
from typing import Optional
from fastapi import APIRouter, HTTPException, status, Depends
from app.simple_auth import (
    Token,
    LoginRequest,
    User,
    authenticate_user,
    create_access_token,
    create_refresh_token,
    get_current_active_user,
    ACCESS_TOKEN_EXPIRE_MINUTES,
)

# Create auth router
auth_router = APIRouter(prefix="/api/auth", tags=["authentication"])


@auth_router.post("/login")
async def login(request: LoginRequest):
    """Login endpoint to get JWT tokens"""

    # Authenticate user
    user = authenticate_user(request.email, request.username, request.password)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email/username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Create tokens
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={
            "username": user.username,
            "email": user.email,
            "user_id": user.id,
        },
        expires_delta=access_token_expires
    )
    refresh_token = create_refresh_token(
        data={
            "username": user.username,
            "email": user.email,
            "user_id": user.id,
        }
    )

    # Return in the format the frontend expects
    return {
        "user": {
            "id": user.id,
            "email": user.email,
            "username": user.username,
            "is_active": user.is_active,
            "is_superuser": user.is_superuser,
        },
        "tokens": {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,  # Convert to seconds
        }
    }


@auth_router.post("/refresh", response_model=Token)
async def refresh_token(refresh_token: str):
    """Refresh access token using refresh token"""
    from app.auth import decode_token

    try:
        # Decode refresh token
        payload = decode_token(refresh_token)

        if payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type",
            )

        # Create new tokens
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        new_access_token = create_access_token(
            data={
                "username": payload.get("username"),
                "email": payload.get("email"),
                "user_id": payload.get("user_id"),
            },
            expires_delta=access_token_expires
        )
        new_refresh_token = create_refresh_token(
            data={
                "username": payload.get("username"),
                "email": payload.get("email"),
                "user_id": payload.get("user_id"),
            }
        )

        return Token(
            access_token=new_access_token,
            refresh_token=new_refresh_token,
            token_type="bearer"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
        )


@auth_router.get("/me")
async def get_current_user_info(current_user: Optional[User] = Depends(get_current_active_user)):
    """Get current user information"""
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    return {
        "id": current_user.id,
        "email": current_user.email,
        "username": current_user.username,
        "is_active": current_user.is_active,
        "is_superuser": current_user.is_superuser,
    }