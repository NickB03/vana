"""Authentication and user management routes."""

import logging
import os
import secrets
from datetime import datetime, timezone

import httpx
from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    HTTPException,
    Query,
    Request,
    status,
)
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .database import get_auth_db
from .google_cloud import verify_google_identity
from .models import Permission, Role, User
from .schemas import (
    AuthResponse,
    ChangePassword,
    GoogleCloudIdentity,
    GoogleOAuthCallbackRequest,
    PasswordReset,
    PasswordResetRequest,
    RefreshTokenRequest,
    RoleCreate,
    Token,
    UserCreate,
    UserResponse,
    UserUpdate,
)
from .schemas import Permission as PermissionSchema
from .schemas import Role as RoleSchema
from .security import (
    authenticate_user,
    create_access_token,
    create_password_reset_token,
    create_refresh_token,
    current_active_user_dep,
    current_superuser_dep,
    get_password_hash,
    revoke_all_user_tokens,
    revoke_refresh_token,
    users_delete_permission_dep,
    users_read_permission_dep,
    users_update_permission_dep,
    validate_password_strength,
    verify_password_reset_token,
    verify_refresh_token,
)

# Initialize logger
logger = logging.getLogger(__name__)

# Create router
auth_router = APIRouter(prefix="/auth", tags=["Authentication"])
users_router = APIRouter(prefix="/users", tags=["User Management"])
admin_router = APIRouter(prefix="/admin", tags=["Administration"])

# Create dependency instances to avoid B008 violations (function calls in argument defaults)
auth_db_dependency = Depends(get_auth_db)


# Authentication endpoints
@auth_router.post(
    "/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED
)
async def register_user(
    user: UserCreate, request: Request, db: Session = auth_db_dependency
) -> AuthResponse:
    """Register a new user account with automatic role assignment.

    Args:
        user: User registration data including email, username, and password.
        request: FastAPI request object for extracting client information.
        db: Database session for user creation and role assignment.

    Returns:
        AuthResponse containing user data and authentication tokens.

    Raises:
        HTTPException: 400 Bad Request if password doesn't meet requirements
                      or 409 Conflict if email/username already exists.

    Security:
        - Validates password strength (8+ chars, mixed case, numbers, symbols)
        - Checks for existing email/username to prevent duplicates
        - Hashes password with bcrypt before storage
        - Assigns default "user" role automatically
        - Creates immediate login session with tokens
        - Records device info and IP address for audit trails

    Registration Process:
        1. Validate password meets security requirements
        2. Check email/username uniqueness
        3. Hash password with bcrypt
        4. Create user with is_active=True, is_verified=False
        5. Assign default "user" role
        6. Generate access and refresh tokens
        7. Return user data and tokens for immediate login

    Example:
        >>> user_data = UserCreate(
        ...     email="user@example.com",
        ...     username="newuser",
        ...     password="SecureP@ss123"
        ... )
        >>> response = await register_user(user_data, request, db)
        >>> print(f"User {response.user.email} registered successfully")
    """
    # Validate password strength
    if not validate_password_strength(user.password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password does not meet security requirements",
        )

    # Check if user already exists
    existing_user = (
        db.query(User)
        .filter((User.email == user.email) | (User.username == user.username))
        .first()
    )

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User with this email or username already exists",
        )

    try:
        # Create new user with server-controlled security flags
        db_user = User(
            email=user.email,
            username=user.username,
            first_name=user.first_name,
            last_name=user.last_name,
            hashed_password=get_password_hash(user.password),
            is_active=True,  # Server-controlled: new users are active by default
            is_verified=False,  # Server-controlled: require email verification
        )

        db.add(db_user)
        db.flush()  # Get the ID

        # Always assign the default "user" role on public registration.
        # Role assignment must be performed via privileged admin endpoints.
        default_role = db.query(Role).filter(Role.name == "user").first()
        if not default_role:
            logger.error(
                'Default role "user" is missing; ensure RBAC seed/migrations ran.'
            )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Server misconfiguration: default role not found",
            )
        db_user.roles.append(default_role)

        db.commit()
        db.refresh(db_user)

        # Create tokens for immediate login after registration
        access_token = create_access_token(
            data={"sub": str(db_user.id), "email": db_user.email}
        )
        refresh_token = create_refresh_token(
            user_id=db_user.id,
            db=db,
            device_info=request.headers.get("User-Agent"),
            ip_address=request.client.host if request.client else None,
        )

        tokens = Token(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=30 * 60,  # 30 minutes
        )

        return AuthResponse(user=UserResponse.model_validate(db_user), tokens=tokens)

    except IntegrityError as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User with this email or username already exists",
        ) from e


@auth_router.post("/login", response_model=AuthResponse)
async def login_user(
    request: Request, db: Session = auth_db_dependency
) -> AuthResponse:
    """OAuth2-compliant user authentication endpoint with multi-format support.

    Args:
        request: FastAPI request object containing login credentials.
        db: Database session for user authentication and token creation.

    Returns:
        AuthResponse containing authenticated user data and tokens.

    Raises:
        HTTPException:
            - 400 Bad Request for malformed requests or unsupported content types
            - 401 Unauthorized for invalid credentials or inactive accounts

    Security:
        - OAuth2 compliant with proper error responses
        - Supports both form-encoded and JSON content types
        - Validates credentials using constant-time password verification
        - Updates last_login timestamp on successful authentication
        - Creates new access and refresh tokens
        - Records device info and IP address for audit trails
        - Implements proper error responses to prevent user enumeration

    Supported Content Types:
        1. application/x-www-form-urlencoded (OAuth2 standard):
           - username: Username or email address
           - password: User password
           - grant_type: Must be "password" if provided

        2. application/json (backward compatibility):
           - username OR email: Username or email address
           - password: User password

    OAuth2 Compliance:
        - Returns proper OAuth2 error codes (invalid_request, invalid_grant)
        - Includes appropriate HTTP headers for caching and authentication
        - Supports grant_type validation for OAuth2 flows

    Example:
        >>> # Form data (OAuth2 standard)
        >>> response = requests.post("/auth/login", data={
        ...     "username": "user@example.com",
        ...     "password": "password123",
        ...     "grant_type": "password"
        ... })

        >>> # JSON data (backward compatibility)
        >>> response = requests.post("/auth/login", json={
        ...     "email": "user@example.com",
        ...     "password": "password123"
        ... })
    """
    content_type = request.headers.get("content-type", "").lower()

    # Parse request data based on content type
    if content_type.startswith("application/x-www-form-urlencoded"):
        # OAuth2 form request
        form_data = await request.form()

        username = form_data.get("username")
        password = form_data.get("password")

        # Normalize username by trimming whitespace; do not trim password
        username = username.strip() if username else None
        grant_type = form_data.get("grant_type")

        if not username or not password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="invalid_request",
                headers={
                    "Content-Type": "application/json",
                    "Cache-Control": "no-store",
                },
            )

        # Validate grant_type for OAuth2 compliance (optional but recommended)
        if grant_type and grant_type != "password":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="unsupported_grant_type",
                headers={
                    "Content-Type": "application/json",
                    "Cache-Control": "no-store",
                },
            )

    elif content_type.startswith("application/json"):
        # JSON request (backward compatibility)
        try:
            import json

            body = await request.body()
            if not body:
                raise ValueError("Empty body")

            json_data = json.loads(body.decode("utf-8"))
            # Accept both username and email for backward compatibility
            username_field = json_data.get("username")
            email_field = json_data.get("email")

            # Normalize values by trimming whitespace
            username_field = username_field.strip() if username_field else None
            email_field = email_field.strip() if email_field else None

            # Validate that if both username and email are provided, they must match
            if username_field and email_field and username_field != email_field:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="username and email fields must have the same value when both are provided",
                    headers={
                        "Content-Type": "application/json",
                        "Cache-Control": "no-store",
                    },
                )

            username = username_field or email_field
            password = json_data.get("password")

            if not username or not password:
                raise ValueError("Missing credentials")

        except HTTPException:
            # Re-raise HTTPException to preserve specific error responses
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="invalid_request",
                headers={
                    "Content-Type": "application/json",
                    "Cache-Control": "no-store",
                },
            ) from e

    else:
        # Unsupported content type
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="invalid_request",
            headers={"Content-Type": "application/json", "Cache-Control": "no-store"},
        )

    # Authenticate user
    user = authenticate_user(username, password, db)

    if not user:
        # OAuth2 compliant error response
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="invalid_grant",
            headers={
                "Content-Type": "application/json",
                "Cache-Control": "no-store",
                "WWW-Authenticate": 'Bearer realm="vana"',
            },
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="invalid_grant",
            headers={"Content-Type": "application/json", "Cache-Control": "no-store"},
        )

    # Update last login
    user.last_login = datetime.now(timezone.utc)
    db.commit()

    # Create tokens
    access_token = create_access_token(data={"sub": str(user.id), "email": user.email})
    refresh_token = create_refresh_token(
        user_id=user.id,
        db=db,
        device_info=request.headers.get("User-Agent"),
        ip_address=request.client.host if request.client else None,
    )

    tokens = Token(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=30 * 60,  # 30 minutes
    )

    return AuthResponse(user=UserResponse.model_validate(user), tokens=tokens)


@auth_router.post("/refresh", response_model=Token)
async def refresh_access_token(
    request: Request,
    refresh_data: RefreshTokenRequest,
    db: Session = auth_db_dependency,
) -> Token:
    """Generate new access token using a valid refresh token.

    Args:
        request: FastAPI request object for extracting client information.
        refresh_data: Request data containing the refresh token.
        db: Database session for token verification and creation.

    Returns:
        Token object with new access and refresh tokens.

    Raises:
        HTTPException: 401 Unauthorized if refresh token is invalid,
                      expired, revoked, or user is inactive.

    Security:
        - Validates refresh token signature, expiration, and revocation status
        - Checks user account is still active
        - Revokes old refresh token to prevent reuse (token rotation)
        - Creates new access and refresh token pair
        - Records device info and IP address for audit trails
        - Implements refresh token rotation for enhanced security

    Token Rotation:
        - Old refresh token is immediately revoked
        - New refresh token replaces the old one
        - Prevents token replay attacks if refresh token is compromised
        - Maintains session continuity for legitimate users

    Example:
        >>> refresh_request = RefreshTokenRequest(refresh_token="abc123...")
        >>> new_tokens = await refresh_access_token(request, refresh_request, db)
        >>> # Update client storage with new tokens
        >>> store_tokens(new_tokens.access_token, new_tokens.refresh_token)
    """
    user = verify_refresh_token(refresh_data.refresh_token, db)

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token"
        )

    # Revoke the old refresh token
    revoke_refresh_token(refresh_data.refresh_token, db)

    # Create new tokens
    access_token = create_access_token(data={"sub": str(user.id), "email": user.email})
    new_refresh_token = create_refresh_token(
        user_id=user.id,
        db=db,
        device_info=request.headers.get("User-Agent"),
        ip_address=request.client.host if request.client else None,
    )

    return Token(
        access_token=access_token,
        refresh_token=new_refresh_token,
        token_type="bearer",
        expires_in=30 * 60,  # 30 minutes
    )


@auth_router.post("/logout", response_model=None)
async def logout_user(
    refresh_data: RefreshTokenRequest,
    current_user: User = current_active_user_dep,
    db: Session = auth_db_dependency,
):
    """Logout user from current session by revoking the refresh token.

    Args:
        refresh_data: Request data containing the refresh token to revoke.
        current_user: Currently authenticated user (from JWT access token).
        db: Database session for token revocation.

    Returns:
        Success message confirming logout.

    Raises:
        HTTPException:
            - 403 Forbidden if token doesn't belong to current user
            - 400 Bad Request if refresh token is invalid

    Security:
        - Validates token ownership to prevent token hijacking
        - Only allows users to revoke their own tokens
        - Immediately invalidates refresh token in database
        - Access token remains valid until natural expiration (30 minutes)
        - Prevents unauthorized logout attacks on other users

    Logout Process:
        1. Verify refresh token belongs to authenticated user
        2. Revoke refresh token in database
        3. Return success confirmation
        4. Client should discard both access and refresh tokens

    Note:
        Access tokens cannot be revoked server-side due to JWT stateless design.
        They will expire naturally after 30 minutes.

    Example:
        >>> logout_request = RefreshTokenRequest(refresh_token="abc123...")
        >>> result = await logout_user(logout_request, current_user, db)
        >>> # Client should clear stored tokens
        >>> clear_local_tokens()
    """
    # Verify token ownership before revocation to prevent token hijacking
    token_owner = verify_refresh_token(refresh_data.refresh_token, db)
    if not token_owner or token_owner.id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot revoke a token that does not belong to the current user",
        )

    revoked = revoke_refresh_token(refresh_data.refresh_token, db)

    if not revoked:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid refresh token"
        )

    return {"message": "Successfully logged out"}


@auth_router.post("/logout-all")
async def logout_all_devices(
    current_user: User = current_active_user_dep,
    db: Session = auth_db_dependency,
):
    """Logout user from all devices by revoking all active refresh tokens.

    Args:
        current_user: Currently authenticated user (from JWT access token).
        db: Database session for bulk token revocation.

    Returns:
        Success message with count of devices logged out.

    Security:
        - Revokes all active refresh tokens for the user
        - Forces logout from all devices and sessions
        - Used for security incidents or voluntary security actions
        - Does not affect currently valid access tokens (they expire naturally)
        - Prevents continued access from potentially compromised devices

    Use Cases:
        - User suspects account compromise
        - Password change (security best practice)
        - Device theft or loss
        - Security policy enforcement
        - Administrative security actions

    Process:
        1. Find all active (non-revoked) refresh tokens for user
        2. Mark all tokens as revoked in database
        3. Commit changes immediately
        4. Return count of revoked tokens

    Note:
        Access tokens will continue to work until their natural expiration.
        For immediate revocation, consider implementing a token blacklist.

    Example:
        >>> result = await logout_all_devices(current_user, db)
        >>> print(f"Logged out from {result['count']} devices")
        >>> # User must re-authenticate on all devices
    """
    count = revoke_all_user_tokens(current_user.id, db)
    return {"message": f"Logged out from {count} devices"}


@auth_router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = current_active_user_dep,
) -> UserResponse:
    """Retrieve current authenticated user's profile information.

    Args:
        current_user: Currently authenticated and active user.

    Returns:
        UserResponse containing user profile data including roles and permissions.

    Security:
        - Requires valid authentication (access token)
        - Only returns data for the authenticated user
        - Includes role and permission information for client authorization
        - Excludes sensitive data like hashed passwords

    Response Data:
        - Basic profile: id, email, username, names
        - Account status: is_active, is_verified, is_superuser
        - Authentication info: google_cloud_identity, last_login
        - Timestamps: created_at, updated_at
        - Roles and permissions for client-side authorization

    Example:
        >>> user_info = await get_current_user_info(current_user)
        >>> print(f"Welcome {user_info.full_name}")
        >>> if "admin" in [role.name for role in user_info.roles]:
        ...     show_admin_menu()
    """
    return UserResponse.model_validate(current_user)


@auth_router.put("/me", response_model=UserResponse)
async def update_current_user(
    user_update: UserUpdate,
    current_user: User = current_active_user_dep,
    db: Session = auth_db_dependency,
) -> UserResponse:
    """Update current user information."""
    update_data = user_update.model_dump(exclude_unset=True)

    # Handle password update
    if "password" in update_data:
        if not validate_password_strength(update_data["password"]):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password does not meet security requirements",
            )
        update_data["hashed_password"] = get_password_hash(update_data.pop("password"))

    # Handle role updates (only superusers can change their own roles)
    if "role_ids" in update_data and not current_user.is_superuser:
        update_data.pop("role_ids")

    # Normalize selected string fields (non-sensitive)
    for key in ("email", "username", "first_name", "last_name"):
        if key in update_data and isinstance(update_data[key], str):
            update_data[key] = update_data[key].strip()

    # Update user fields
    for field, value in update_data.items():
        if field != "role_ids":
            setattr(current_user, field, value)

    # Handle role updates for superusers
    if "role_ids" in update_data and current_user.is_superuser:
        roles = db.query(Role).filter(Role.id.in_(update_data["role_ids"])).all()
        current_user.roles = roles

    current_user.updated_at = datetime.now(timezone.utc)
    try:
        db.commit()
    except IntegrityError as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email or username already in use",
        ) from e
    db.refresh(current_user)

    return UserResponse.model_validate(current_user)


@auth_router.post("/change-password")
async def change_password(
    password_data: ChangePassword,
    current_user: User = current_active_user_dep,
    db: Session = auth_db_dependency,
):
    """Change the current user's password with validation and security measures.

    Args:
        password_data: Current and new password data.
        current_user: Currently authenticated and active user.
        db: Database session for password update and token revocation.

    Returns:
        Success message indicating password change and logout requirement.

    Raises:
        HTTPException:
            - 400 Bad Request if current password is incorrect
            - 400 Bad Request if new password is same as current
            - 400 Bad Request if new password doesn't meet requirements

    Security:
        - Validates current password before allowing change
        - Enforces password strength requirements for new password
        - Prevents reuse of current password
        - Hashes new password with bcrypt before storage
        - Revokes all refresh tokens to force re-authentication
        - Updates password change timestamp

    Security Measures:
        1. Current password verification (prevents unauthorized changes)
        2. New password strength validation
        3. Password reuse prevention
        4. Secure bcrypt hashing
        5. Force logout from all devices (token revocation)
        6. Audit trail with updated_at timestamp

    Example:
        >>> password_change = ChangePassword(
        ...     current_password="oldpass123",
        ...     new_password="NewSecure@Pass456"
        ... )
        >>> result = await change_password(password_change, current_user, db)
        >>> # User must re-authenticate on all devices
    """
    from .security import verify_password

    # Verify current password
    if not verify_password(
        password_data.current_password, current_user.hashed_password
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Incorrect current password"
        )

    # Disallow reusing the same password
    if verify_password(password_data.new_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be different from the current password",
        )

    # Validate new password
    if not validate_password_strength(password_data.new_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password does not meet security requirements",
        )

    # Update password
    current_user.hashed_password = get_password_hash(password_data.new_password)
    current_user.updated_at = datetime.now(timezone.utc)
    db.commit()

    # Revoke all refresh tokens to force re-authentication
    revoke_all_user_tokens(current_user.id, db)

    return {"message": "Password changed successfully. Please log in again."}


@auth_router.post("/forgot-password")
async def forgot_password(
    request_data: PasswordResetRequest,
    background_tasks: BackgroundTasks,
    db: Session = auth_db_dependency,
):
    """Initiate password reset process by sending reset token to user's email.

    Args:
        request_data: Email address for password reset.
        background_tasks: FastAPI background tasks for email sending.
        db: Database session for user lookup.

    Returns:
        Generic success message (same for existing and non-existing emails).

    Security:
        - Always returns success message to prevent email enumeration
        - Only sends reset token if email exists and user is active
        - Reset token expires after 1 hour
        - Token includes email claim for validation
        - Development mode can log masked tokens for testing

    Email Enumeration Prevention:
        - Returns identical response for valid and invalid emails
        - Prevents attackers from discovering registered email addresses
        - Processing time should be consistent regardless of email validity

    Development Features:
        - Set VANA_DEV_LOG_RESET_TOKEN=true to log masked tokens
        - Tokens are masked in logs (first 4 + last 4 characters only)
        - Production deployments should never log tokens

    Example:
        >>> reset_request = PasswordResetRequest(email="user@example.com")
        >>> result = await forgot_password(reset_request, bg_tasks, db)
        >>> # Always returns success message
        >>> print(result["message"])  # "If the email exists, a reset link has been sent."
    """
    user = db.query(User).filter(User.email == request_data.email).first()

    # Always return success to prevent email enumeration
    if user and user.is_active:
        reset_token = create_password_reset_token(user.email)

        # In production, send email with reset token
        # background_tasks.add_task(send_password_reset_email, user.email, reset_token)

        # For development only: log token at DEBUG level if explicitly enabled
        if os.getenv("VANA_DEV_LOG_RESET_TOKEN", "false").lower() in {
            "1",
            "true",
            "yes",
        }:
            # Mask token in logs to reduce exposure risk
            masked = (
                f"{reset_token[:4]}...{reset_token[-4:]}"
                if isinstance(reset_token, str) and len(reset_token) > 8
                else "***"
            )
            logger.debug("Password reset token (masked) for %s: %s", user.email, masked)

    return {"message": "If the email exists, a password reset link has been sent."}


@auth_router.post("/reset-password")
async def reset_password(reset_data: PasswordReset, db: Session = auth_db_dependency):
    """Reset password using reset token."""
    email = verify_password_reset_token(reset_data.token)

    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token",
        )

    user = db.query(User).filter(User.email == email).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token",
        )

    # Validate new password
    if not validate_password_strength(reset_data.new_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password does not meet security requirements",
        )

    # Update password
    user.hashed_password = get_password_hash(reset_data.new_password)
    user.updated_at = datetime.now(timezone.utc)
    db.commit()

    # Revoke all refresh tokens
    revoke_all_user_tokens(user.id, db)

    return {"message": "Password reset successfully"}


@auth_router.post("/google", response_model=AuthResponse)
async def google_login(
    request: Request,
    google_data: GoogleCloudIdentity,
    db: Session = auth_db_dependency,
) -> AuthResponse:
    """Login or register user with Google Cloud Identity."""
    try:
        # Verify Google ID token
        google_user = verify_google_identity(google_data.id_token)

        # Find or create user
        user = (
            db.query(User)
            .filter(
                (User.email == google_user["email"])
                | (User.google_cloud_identity == google_user["sub"])
            )
            .first()
        )

        if not user:
            # Create new user
            user = User(
                email=google_user["email"],
                username=google_user["email"].split("@")[0],
                first_name=google_user.get("given_name", ""),
                last_name=google_user.get("family_name", ""),
                # Store a valid hash of a random secret so verify() is safe and always fails
                hashed_password=get_password_hash(secrets.token_urlsafe(32)),
                is_active=True,
                is_verified=True,  # Google users are pre-verified
                google_cloud_identity=google_user["sub"],
            )

            # Assign default user role
            default_role = db.query(Role).filter(Role.name == "user").first()
            if not default_role:
                logger.error(
                    'Default role "user" is missing; ensure RBAC seed/migrations ran.'
                )
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Server misconfiguration: default role not found",
                )
            user.roles.append(default_role)

            db.add(user)
            db.commit()
            db.refresh(user)
        else:
            # Update Google identity if not set
            if not user.google_cloud_identity:
                user.google_cloud_identity = google_user["sub"]
                db.commit()

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User account is deactivated",
            )

        # Update last login
        user.last_login = datetime.now(timezone.utc)
        db.commit()

        # Create tokens
        access_token = create_access_token(
            data={"sub": str(user.id), "email": user.email}
        )
        refresh_token = create_refresh_token(
            user_id=user.id,
            db=db,
            device_info=request.headers.get("User-Agent"),
            ip_address=request.client.host if request.client else None,
        )

        tokens = Token(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=30 * 60,  # 30 minutes
        )

        return AuthResponse(user=UserResponse.model_validate(user), tokens=tokens)

    except Exception as e:
        logger.exception("Google authentication failed")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Google authentication failed",
        ) from e


@auth_router.post("/google/callback", response_model=AuthResponse)
async def google_oauth_callback(
    request: Request,
    callback_data: GoogleOAuthCallbackRequest,
    db: Session = auth_db_dependency,
) -> AuthResponse:
    """Handle Google OAuth callback by exchanging code for tokens and logging in user."""
    try:
        client_id = os.getenv("GOOGLE_OAUTH_CLIENT_ID")
        client_secret = os.getenv("GOOGLE_OAUTH_CLIENT_SECRET")
        redirect_uri = os.getenv("GOOGLE_OAUTH_REDIRECT_URI")

        if not all([client_id, client_secret, redirect_uri]):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=(
                    "Google OAuth credentials not configured. Set GOOGLE_OAUTH_CLIENT_ID, "
                    "GOOGLE_OAUTH_CLIENT_SECRET, and GOOGLE_OAUTH_REDIRECT_URI from Google Cloud Console."
                ),
            )

        async with httpx.AsyncClient(timeout=10) as client:
            token_response = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "code": callback_data.code,
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "redirect_uri": redirect_uri,
                    "grant_type": "authorization_code",
                },
            )
            token_response.raise_for_status()
            token_data = token_response.json()

        google_identity = GoogleCloudIdentity(
            id_token=token_data.get("id_token"),
            access_token=token_data.get("access_token"),
        )

        return await google_login(request, google_identity, db)

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Google OAuth callback failed")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google OAuth callback failed",
        ) from e


# User management endpoints
@users_router.get("/", response_model=list[UserResponse])
async def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    current_user: User = users_read_permission_dep,
    db: Session = auth_db_dependency,
) -> list[UserResponse]:
    """List all users (requires users:read permission)."""
    users = db.query(User).offset(skip).limit(limit).all()
    return [UserResponse.model_validate(user) for user in users]


@users_router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    current_user: User = users_read_permission_dep,
    db: Session = auth_db_dependency,
) -> UserResponse:
    """Get user by ID (requires users:read permission)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )
    return UserResponse.model_validate(user)


@users_router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_update: UserUpdate,
    current_user: User = users_update_permission_dep,
    db: Session = auth_db_dependency,
) -> UserResponse:
    """Update user (requires users:update permission)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    update_data = user_update.model_dump(exclude_unset=True)

    # Handle password update
    if "password" in update_data:
        if not validate_password_strength(update_data["password"]):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password does not meet security requirements",
            )
        update_data["hashed_password"] = get_password_hash(update_data.pop("password"))

    # Update user fields (exclude security-sensitive fields to prevent privilege escalation)
    for field, value in update_data.items():
        if field not in ("role_ids", "is_active", "is_verified"):
            setattr(user, field, value)

    # Handle role updates
    if "role_ids" in update_data:
        roles = db.query(Role).filter(Role.id.in_(update_data["role_ids"])).all()
        user.roles = roles

    user.updated_at = datetime.now(timezone.utc)
    try:
        db.commit()
    except IntegrityError as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email or username already in use",
        ) from e
    db.refresh(user)

    return UserResponse.model_validate(user)


@users_router.delete("/{user_id}")
async def delete_user(
    user_id: int,
    current_user: User = users_delete_permission_dep,
    db: Session = auth_db_dependency,
):
    """Delete user (requires users:delete permission)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    # Prevent deleting superusers unless current user is also superuser
    if user.is_superuser and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Cannot delete superuser"
        )

    # Prevent self-deletion
    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete yourself"
        )

    db.delete(user)
    db.commit()

    return {"message": "User deleted successfully"}


# Admin endpoints
@admin_router.get("/roles", response_model=list[RoleSchema])
async def list_roles(
    current_user: User = current_superuser_dep,
    db: Session = auth_db_dependency,
) -> list[RoleSchema]:
    """List all roles (superuser only)."""
    roles = db.query(Role).all()
    return [RoleSchema.model_validate(role) for role in roles]


@admin_router.post(
    "/roles", response_model=RoleSchema, status_code=status.HTTP_201_CREATED
)
async def create_role(
    role: RoleCreate,
    current_user: User = current_superuser_dep,
    db: Session = auth_db_dependency,
) -> RoleSchema:
    """Create new role (superuser only)."""
    db_role = Role(
        name=role.name, description=role.description, is_active=role.is_active
    )

    # Assign permissions if specified
    if role.permission_ids:
        permissions = (
            db.query(Permission).filter(Permission.id.in_(role.permission_ids)).all()
        )
        db_role.permissions.extend(permissions)

    db.add(db_role)
    db.commit()
    db.refresh(db_role)

    return RoleSchema.model_validate(db_role)


@admin_router.get("/permissions", response_model=list[PermissionSchema])
async def list_permissions(
    current_user: User = current_superuser_dep,
    db: Session = auth_db_dependency,
) -> list[PermissionSchema]:
    """List all permissions (superuser only)."""
    permissions = db.query(Permission).all()
    return [PermissionSchema.model_validate(permission) for permission in permissions]
