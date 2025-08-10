"""Pydantic schemas for authentication API."""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field, ConfigDict


class PermissionBase(BaseModel):
    """Base permission schema."""
    name: str = Field(..., description="Permission name")
    description: Optional[str] = Field(None, description="Permission description")
    resource: str = Field(..., description="Resource the permission applies to")
    action: str = Field(..., description="Action the permission allows")


class Permission(PermissionBase):
    """Permission schema with ID."""
    id: int
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class RoleBase(BaseModel):
    """Base role schema."""
    name: str = Field(..., description="Role name")
    description: Optional[str] = Field(None, description="Role description")
    is_active: bool = Field(True, description="Whether the role is active")


class RoleCreate(RoleBase):
    """Role creation schema."""
    permission_ids: Optional[List[int]] = Field(default_factory=list, description="List of permission IDs")


class RoleUpdate(BaseModel):
    """Role update schema."""
    name: Optional[str] = Field(None, description="Role name")
    description: Optional[str] = Field(None, description="Role description")
    is_active: Optional[bool] = Field(None, description="Whether the role is active")
    permission_ids: Optional[List[int]] = Field(None, description="List of permission IDs")


class Role(RoleBase):
    """Role schema with permissions."""
    id: int
    created_at: datetime
    permissions: List[Permission] = Field(default_factory=list, description="Role permissions")
    
    model_config = ConfigDict(from_attributes=True)


class UserBase(BaseModel):
    """Base user schema."""
    email: EmailStr = Field(..., description="User email address")
    username: str = Field(..., min_length=3, max_length=50, description="Username")
    first_name: Optional[str] = Field(None, max_length=50, description="First name")
    last_name: Optional[str] = Field(None, max_length=50, description="Last name")
    is_active: bool = Field(True, description="Whether the user is active")
    is_verified: bool = Field(False, description="Whether the user is verified")


class UserCreate(UserBase):
    """User creation schema."""
    password: str = Field(..., min_length=8, description="User password")
    role_ids: Optional[List[int]] = Field(default_factory=list, description="List of role IDs")


class UserUpdate(BaseModel):
    """User update schema."""
    email: Optional[EmailStr] = Field(None, description="User email address")
    username: Optional[str] = Field(None, min_length=3, max_length=50, description="Username")
    first_name: Optional[str] = Field(None, max_length=50, description="First name")
    last_name: Optional[str] = Field(None, max_length=50, description="Last name")
    is_active: Optional[bool] = Field(None, description="Whether the user is active")
    is_verified: Optional[bool] = Field(None, description="Whether the user is verified")
    password: Optional[str] = Field(None, min_length=8, description="User password")
    role_ids: Optional[List[int]] = Field(None, description="List of role IDs")


class UserResponse(UserBase):
    """User response schema."""
    id: int
    full_name: str = Field(..., description="User's full name")
    is_superuser: bool = Field(..., description="Whether the user is a superuser")
    google_cloud_identity: Optional[str] = Field(None, description="Google Cloud identity")
    last_login: Optional[datetime] = Field(None, description="Last login timestamp")
    created_at: datetime
    updated_at: datetime
    roles: List[Role] = Field(default_factory=list, description="User roles")
    
    model_config = ConfigDict(from_attributes=True)


class UserLogin(BaseModel):
    """User login schema."""
    username: str = Field(..., description="Username or email")
    password: str = Field(..., description="Password")


class Token(BaseModel):
    """JWT token response schema."""
    access_token: str = Field(..., description="JWT access token")
    refresh_token: str = Field(..., description="JWT refresh token")
    token_type: str = Field("bearer", description="Token type")
    expires_in: int = Field(..., description="Token expiration in seconds")


class TokenData(BaseModel):
    """Token data schema for JWT validation."""
    user_id: Optional[int] = Field(None, description="User ID from token")
    username: Optional[str] = Field(None, description="Username from token")
    email: Optional[str] = Field(None, description="Email from token")
    scopes: List[str] = Field(default_factory=list, description="Token scopes")


class RefreshTokenRequest(BaseModel):
    """Refresh token request schema."""
    refresh_token: str = Field(..., description="Refresh token")


class PasswordResetRequest(BaseModel):
    """Password reset request schema."""
    email: EmailStr = Field(..., description="User email address")


class PasswordReset(BaseModel):
    """Password reset schema."""
    token: str = Field(..., description="Password reset token")
    new_password: str = Field(..., min_length=8, description="New password")


class ChangePassword(BaseModel):
    """Change password schema."""
    current_password: str = Field(..., description="Current password")
    new_password: str = Field(..., min_length=8, description="New password")


class GoogleCloudIdentity(BaseModel):
    """Google Cloud identity schema."""
    id_token: str = Field(..., description="Google Cloud ID token")
    access_token: Optional[str] = Field(None, description="Google Cloud access token")
    
    
class ApiKeyCreate(BaseModel):
    """API key creation schema."""
    name: str = Field(..., description="API key name")
    scopes: List[str] = Field(default_factory=list, description="API key scopes")
    expires_in_days: Optional[int] = Field(None, description="Expiration in days")


class ApiKeyResponse(BaseModel):
    """API key response schema."""
    id: int
    name: str
    key: str = Field(..., description="API key (only shown once)")
    scopes: List[str]
    expires_at: Optional[datetime]
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class OAuth2ErrorResponse(BaseModel):
    """OAuth2 compliant error response schema."""
    error: str = Field(..., description="OAuth2 error code")
    error_description: Optional[str] = Field(None, description="Human-readable error description")
    error_uri: Optional[str] = Field(None, description="URI for more information about the error")


class OAuth2TokenRequest(BaseModel):
    """OAuth2 token request schema for form data."""
    grant_type: str = Field(..., description="OAuth2 grant type")
    username: str = Field(..., description="Username or email")
    password: str = Field(..., description="User password")
    scope: Optional[str] = Field(None, description="Requested scope")