"""Pydantic schemas for authentication API."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class PermissionBase(BaseModel):
    """Base permission schema."""

    name: str = Field(..., description="Permission name")
    description: str | None = Field(None, description="Permission description")
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
    description: str | None = Field(None, description="Role description")
    is_active: bool = Field(True, description="Whether the role is active")


class RoleCreate(RoleBase):
    """Role creation schema."""

    permission_ids: list[int] | None = Field(
        default_factory=list, description="List of permission IDs"
    )


class RoleUpdate(BaseModel):
    """Role update schema."""

    name: str | None = Field(None, description="Role name")
    description: str | None = Field(None, description="Role description")
    is_active: bool | None = Field(None, description="Whether the role is active")
    permission_ids: list[int] | None = Field(None, description="List of permission IDs")


class Role(RoleBase):
    """Role schema with permissions."""

    id: int
    created_at: datetime
    permissions: list[Permission] = Field(
        default_factory=list, description="Role permissions"
    )

    model_config = ConfigDict(from_attributes=True)


class UserBase(BaseModel):
    """Base user schema."""

    email: EmailStr = Field(..., description="User email address")
    username: str = Field(..., min_length=3, max_length=50, description="Username")
    first_name: str | None = Field(None, max_length=50, description="First name")
    last_name: str | None = Field(None, max_length=50, description="Last name")
    is_active: bool = Field(True, description="Whether the user is active")
    is_verified: bool = Field(False, description="Whether the user is verified")


class UserCreate(UserBase):
    """User registration schema with password validation.

    Used for creating new user accounts through the registration endpoint.
    Inherits basic user fields and adds password requirement with validation.

    Security:
        - Password minimum length enforced (8 characters)
        - Additional password strength validation applied server-side
        - Email format validation through EmailStr type
        - Username length constraints (3-50 characters)

    Validation Rules:
        - email: Must be valid email format
        - username: 3-50 characters, unique in database
        - password: Minimum 8 characters, strength validated server-side
        - first_name/last_name: Optional, max 50 characters each

    Example:
        >>> user_data = UserCreate(
        ...     email="user@example.com",
        ...     username="johndoe",
        ...     password="SecureP@ss123",
        ...     first_name="John",
        ...     last_name="Doe"
        ... )
    """

    password: str = Field(
        ...,
        min_length=8,
        description="User password (min 8 chars, will be validated for strength)",
    )


class UserUpdate(BaseModel):
    """User update schema."""

    # Reject unknown fields to avoid silently ignoring privilege-related fields
    model_config = ConfigDict(extra="forbid")

    email: EmailStr | None = Field(None, description="User email address")
    username: str | None = Field(
        None, min_length=3, max_length=50, description="Username"
    )
    first_name: str | None = Field(None, max_length=50, description="First name")
    last_name: str | None = Field(None, max_length=50, description="Last name")
    # Security: is_active and is_verified removed to prevent privilege escalation
    password: str | None = Field(None, min_length=8, description="User password")
    role_ids: list[int] | None = Field(None, description="List of role IDs")


class UserResponse(UserBase):
    """User response schema."""

    id: int
    full_name: str = Field(..., description="User's full name")
    is_superuser: bool = Field(..., description="Whether the user is a superuser")
    google_cloud_identity: str | None = Field(None, description="Google Cloud identity")
    last_login: datetime | None = Field(None, description="Last login timestamp")
    created_at: datetime
    updated_at: datetime
    roles: list[Role] = Field(default_factory=list, description="User roles")

    model_config = ConfigDict(from_attributes=True)


class UserLogin(BaseModel):
    """User login schema."""

    username: str = Field(..., description="Username or email")
    password: str = Field(..., description="Password")


class Token(BaseModel):
    """JWT token response schema for authentication endpoints.

    Contains both access and refresh tokens returned after successful
    authentication (login, registration, token refresh).

    Security:
        - access_token: Short-lived (30 min) for API access
        - refresh_token: Long-lived (7 days) for obtaining new access tokens
        - token_type: Always "bearer" for HTTP Authorization header
        - expires_in: Access token lifetime in seconds for client scheduling

    Token Usage:
        - Include access_token in Authorization header: "Bearer {access_token}"
        - Store refresh_token securely (httpOnly cookie recommended)
        - Use refresh_token to get new access_token before expiration
        - Both tokens should be cleared on logout

    Example:
        >>> tokens = Token(
        ...     access_token="eyJhbGciOiJIUzI1NiIs...",
        ...     refresh_token="def50200d4f1b7c8e9a...",
        ...     token_type="bearer",
        ...     expires_in=1800  # 30 minutes
        ... )
        >>>
        >>> # Client usage
        >>> headers = {"Authorization": f"Bearer {tokens.access_token}"}
    """

    access_token: str = Field(..., description="JWT access token for API authorization")
    refresh_token: str = Field(
        ..., description="Refresh token for obtaining new access tokens"
    )
    token_type: str = Field("bearer", description="Token type (always 'bearer')")
    expires_in: int = Field(..., description="Access token expiration time in seconds")


class TokenData(BaseModel):
    """Token data schema for JWT validation."""

    user_id: int | None = Field(None, description="User ID from token")
    username: str | None = Field(None, description="Username from token")
    email: str | None = Field(None, description="Email from token")
    scopes: list[str] = Field(default_factory=list, description="Token scopes")


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
    access_token: str | None = Field(None, description="Google Cloud access token")


class ApiKeyCreate(BaseModel):
    """API key creation schema."""

    name: str = Field(..., description="API key name")
    scopes: list[str] = Field(default_factory=list, description="API key scopes")
    expires_in_days: int | None = Field(None, description="Expiration in days")


class ApiKeyResponse(BaseModel):
    """API key response schema."""

    id: int
    name: str
    key: str = Field(..., description="API key (only shown once)")
    scopes: list[str]
    expires_at: datetime | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class OAuth2ErrorResponse(BaseModel):
    """OAuth2 compliant error response schema."""

    error: str = Field(..., description="OAuth2 error code")
    error_description: str | None = Field(
        None, description="Human-readable error description"
    )
    error_uri: str | None = Field(
        None, description="URI for more information about the error"
    )


class OAuth2TokenRequest(BaseModel):
    """OAuth2 token request schema for form data."""

    grant_type: str = Field(..., description="OAuth2 grant type")
    username: str = Field(..., description="Username or email")
    password: str = Field(..., description="User password")
    scope: str | None = Field(None, description="Requested scope")


class AuthResponse(BaseModel):
    """Standardized authentication response for login and registration endpoints.

    Combines user profile information with authentication tokens in a single
    response object. Used by login, registration, and Google OAuth endpoints.

    Security:
        - Returns user profile data (excludes sensitive fields like password hash)
        - Includes role and permission information for client authorization
        - Provides both access and refresh tokens for session management
        - All sensitive data is properly filtered through UserResponse schema

    Response Structure:
        - user: Complete user profile with roles and permissions
        - tokens: Access token (30 min) and refresh token (7 days)

    Client Usage:
        1. Store tokens securely (access token in memory, refresh in httpOnly cookie)
        2. Use user data to populate UI and determine available features
        3. Check user roles/permissions for client-side authorization
        4. Set up token refresh before access token expires

    Example:
        >>> auth_response = AuthResponse(
        ...     user=UserResponse.model_validate(authenticated_user),
        ...     tokens=Token(
        ...         access_token="jwt_access_token",
        ...         refresh_token="secure_refresh_token",
        ...         token_type="bearer",
        ...         expires_in=1800
        ...     )
        ... )
    """

    user: UserResponse = Field(
        ..., description="Authenticated user profile and permissions"
    )
    tokens: Token = Field(
        ..., description="JWT access and refresh tokens for session management"
    )


class GoogleOAuthCallbackRequest(BaseModel):
    """Google OAuth callback request schema."""

    code: str = Field(..., description="Authorization code from Google")
    state: str = Field(..., description="State parameter for CSRF protection")
