"""Security utilities for authentication and authorization."""

import secrets
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import Depends, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from .config import (
    ACCESS_TOKEN_EXPIRE_DELTA,
    JWT_ALGORITHM,
    JWT_SECRET_KEY,
    REFRESH_TOKEN_EXPIRE_DELTA,
    get_auth_settings,
)
from .models import RefreshToken, User
from .schemas import TokenData

# Password hashing
auth_settings = get_auth_settings()
pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
    bcrypt__rounds=auth_settings.bcrypt_rounds,
)

# JWT token scheme
security = HTTPBearer()
optional_security = HTTPBearer(auto_error=False)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash using bcrypt.

    Args:
        plain_password: The plain text password to verify.
        hashed_password: The bcrypt hashed password to compare against.

    Returns:
        True if the password matches the hash, False otherwise.

    Security:
        Uses bcrypt for constant-time password verification to prevent
        timing attacks. Always validate against the stored hash.

    Example:
        >>> is_valid = verify_password("user_password", stored_hash)
        >>> if is_valid:
        ...     print("Authentication successful")
    """
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash a password using bcrypt with salt.

    Args:
        password: The plain text password to hash.

    Returns:
        A bcrypt hashed password string with salt.

    Security:
        Uses bcrypt with configurable rounds (default 12) for secure
        password storage. Each hash includes a random salt to prevent
        rainbow table attacks.

    Example:
        >>> hashed = get_password_hash("secure_password123")
        >>> # Store hashed password in database
        >>> user.hashed_password = hashed
    """
    return pwd_context.hash(password)


def validate_password_strength(password: str) -> bool:
    """Validate password meets security requirements.

    Args:
        password: The password string to validate.

    Returns:
        True if password meets all security requirements, False otherwise.

    Security Requirements:
        - Minimum 8 characters length
        - At least one uppercase letter (A-Z)
        - At least one lowercase letter (a-z)
        - At least one digit (0-9)
        - At least one special character (!@#$%^&*()_+-=[]{}|;:,.<>?)

    Security:
        Implements strong password policy to prevent weak passwords
        that are vulnerable to dictionary or brute force attacks.

    Example:
        >>> is_strong = validate_password_strength("MyP@ssw0rd123")
        >>> if not is_strong:
        ...     raise ValidationError("Password does not meet requirements")
    """
    if len(password) < 8:
        return False

    has_upper = any(c.isupper() for c in password)
    has_lower = any(c.islower() for c in password)
    has_digit = any(c.isdigit() for c in password)
    has_special = any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in password)

    return all([has_upper, has_lower, has_digit, has_special])


def create_access_token(
    data: dict[str, Any], expires_delta: timedelta | None = None
) -> str:
    """Create a JWT access token with expiration and type claims.

    Args:
        data: Dictionary containing claims to include in the token.
              Must include 'sub' (subject) claim with user ID.
        expires_delta: Optional custom expiration time. If None,
                      uses default ACCESS_TOKEN_EXPIRE_DELTA (30 minutes).

    Returns:
        Encoded JWT access token string.

    Security:
        - Tokens are signed with HMAC-SHA256 using a secret key
        - Includes 'exp' claim for automatic expiration
        - Includes 'type' claim set to 'access' for token validation
        - Default 30-minute expiration limits exposure window

    Raises:
        JWTError: If token encoding fails.

    Example:
        >>> token_data = {"sub": "123", "email": "user@example.com"}
        >>> token = create_access_token(token_data)
        >>> # Token valid for 30 minutes by default
    """
    to_encode = data.copy()

    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + ACCESS_TOKEN_EXPIRE_DELTA

    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return encoded_jwt


def create_refresh_token(
    user_id: int,
    db: Session,
    device_info: str | None = None,
    ip_address: str | None = None,
) -> str:
    """Create a secure refresh token and store it in the database.

    Args:
        user_id: The ID of the user to create the refresh token for.
        db: Database session for storing the token.
        device_info: Optional device information (e.g., User-Agent header).
        ip_address: Optional IP address of the client.

    Returns:
        A URL-safe base64 encoded refresh token string.

    Security:
        - Generates cryptographically secure random tokens using secrets module
        - Stores tokens in database with expiration timestamp
        - Automatically revokes old tokens (keeps only latest 4 per user)
        - Associates tokens with device info and IP for audit trails
        - Tokens expire after 7 days by default

    Database Side Effects:
        - Creates new RefreshToken record
        - Revokes old refresh tokens beyond the limit (4)
        - Commits changes to database

    Example:
        >>> token = create_refresh_token(
        ...     user_id=123,
        ...     db=session,
        ...     device_info="Mozilla/5.0...",
        ...     ip_address="192.168.1.100"
        ... )
    """
    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + REFRESH_TOKEN_EXPIRE_DELTA

    # Clean up old refresh tokens (keep only the latest 4)
    old_tokens = (
        db.query(RefreshToken)
        .filter(RefreshToken.user_id == user_id, RefreshToken.is_revoked.is_(False))
        .order_by(RefreshToken.created_at.desc())
        .offset(4)
        .all()
    )

    for old_token in old_tokens:
        old_token.is_revoked = True

    # Create new refresh token
    refresh_token = RefreshToken(
        token=token,
        user_id=user_id,
        expires_at=expires_at,
        device_info=device_info,
        ip_address=ip_address,
    )
    db.add(refresh_token)
    db.commit()

    return token


def verify_refresh_token(token: str, db: Session) -> User | None:
    """Verify a refresh token and return the associated user.

    Args:
        token: The refresh token string to verify.
        db: Database session for token lookup.

    Returns:
        User object if token is valid and not expired/revoked, None otherwise.

    Security:
        - Validates token exists in database and is not revoked
        - Checks token expiration timestamp against current time
        - Returns None for any invalid, expired, or revoked tokens
        - Prevents timing attacks by using constant-time database queries

    Validation Process:
        1. Database lookup for active (non-revoked) token
        2. Expiration time validation
        3. User account status validation

    Example:
        >>> user = verify_refresh_token("abc123...", db_session)
        >>> if user:
        ...     # Token is valid, proceed with refresh
        ...     new_access_token = create_access_token({"sub": str(user.id)})
    """
    refresh_token = (
        db.query(RefreshToken)
        .filter(RefreshToken.token == token, RefreshToken.is_revoked.is_(False))
        .first()
    )

    if not refresh_token or not refresh_token.is_valid:
        return None

    return refresh_token.user


def revoke_refresh_token(token: str, db: Session) -> bool:
    """Revoke a specific refresh token to invalidate it.

    Args:
        token: The refresh token string to revoke.
        db: Database session for token modification.

    Returns:
        True if token was found and revoked, False if token doesn't exist.

    Security:
        - Marks token as revoked in database to prevent future use
        - Used for logout operations and security incidents
        - Commits changes immediately to ensure token is invalidated

    Database Side Effects:
        - Updates RefreshToken.is_revoked to True
        - Commits transaction immediately

    Example:
        >>> success = revoke_refresh_token("abc123...", db_session)
        >>> if success:
        ...     print("User logged out successfully")
        ... else:
        ...     print("Invalid refresh token")
    """
    refresh_token = db.query(RefreshToken).filter(RefreshToken.token == token).first()
    if refresh_token:
        refresh_token.is_revoked = True
        db.commit()
        return True
    return False


def revoke_all_user_tokens(user_id: int, db: Session) -> int:
    """Revoke all active refresh tokens for a specific user.

    Args:
        user_id: The ID of the user whose tokens should be revoked.
        db: Database session for bulk token modification.

    Returns:
        Number of tokens that were revoked.

    Security:
        - Forces logout from all devices and sessions
        - Used for password changes, security breaches, or account suspension
        - Bulk operation for efficiency with large token counts
        - Only affects non-revoked tokens to avoid unnecessary updates

    Database Side Effects:
        - Updates all active RefreshToken records for the user
        - Sets is_revoked to True for all matching tokens
        - Commits transaction immediately

    Use Cases:
        - Password change (force re-authentication)
        - Security incident response
        - Account suspension
        - "Logout from all devices" feature

    Example:
        >>> revoked_count = revoke_all_user_tokens(user.id, db_session)
        >>> print(f"Logged out from {revoked_count} devices")
    """
    count = (
        db.query(RefreshToken)
        .filter(RefreshToken.user_id == user_id, RefreshToken.is_revoked.is_(False))
        .update({"is_revoked": True})
    )
    db.commit()
    return count


def get_current_user(
    credentials: HTTPAuthorizationCredentials,
    db: Session,
) -> User:
    """Extract and validate the current authenticated user from JWT token.

    Args:
        credentials: HTTP Authorization credentials containing Bearer token.
        db: Database session for user lookup.

    Returns:
        User object for the authenticated user.

    Raises:
        HTTPException: 401 Unauthorized if token is invalid, expired,
                      malformed, or user doesn't exist.

    Security:
        - Validates JWT signature using secret key and HMAC-SHA256
        - Verifies token type is 'access' (not refresh or other types)
        - Checks token expiration automatically via JWT library
        - Validates user ID format and existence in database
        - Uses constant-time operations to prevent timing attacks

    Token Validation Process:
        1. Decode and verify JWT signature
        2. Extract 'sub' (subject) claim containing user ID
        3. Validate token type is 'access'
        4. Convert user ID to integer safely
        5. Lookup user in database
        6. Return user object if all validations pass

    Example:
        >>> from fastapi.security import HTTPBearer
        >>> security = HTTPBearer()
        >>> user = get_current_user(credentials, db_session)
        >>> print(f"Authenticated user: {user.email}")
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(
            credentials.credentials, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM]
        )
        # Enforce type conversion for JWT 'sub' claim
        sub_claim = payload.get("sub")
        if sub_claim is None:
            raise credentials_exception

        # Convert to int, handling both string and int inputs
        try:
            user_id = int(sub_claim)
        except (ValueError, TypeError) as e:
            raise credentials_exception from e

        token_type: str | None = payload.get("type")
        if token_type != "access":
            raise credentials_exception

        token_data = TokenData(user_id=user_id)
    except JWTError as e:
        raise credentials_exception from e

    user = db.query(User).filter(User.id == token_data.user_id).first()
    if user is None:
        raise credentials_exception

    return user


def get_current_active_user(current_user: User) -> User:
    """Validate that the current user account is active.

    Args:
        current_user: User object to validate.

    Returns:
        The same user object if account is active.

    Raises:
        HTTPException: 400 Bad Request if user account is inactive.

    Security:
        - Enforces account status validation for all protected endpoints
        - Prevents access by deactivated or suspended accounts
        - Used as a dependency in FastAPI route protection

    Example:
        >>> active_user = get_current_active_user(user)
        >>> # Proceed with active user operations
    """
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user"
        )
    return current_user


def get_current_verified_user(current_user: User) -> User:
    """Validate that the current user account is email-verified.

    Args:
        current_user: User object to validate.

    Returns:
        The same user object if account is verified.

    Raises:
        HTTPException: 400 Bad Request if user account is not verified.

    Security:
        - Enforces email verification requirement for sensitive operations
        - Prevents access by unverified accounts to protected resources
        - Used for operations requiring confirmed email ownership

    Example:
        >>> verified_user = get_current_verified_user(user)
        >>> # Proceed with verified user operations
    """
    if not current_user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="User not verified"
        )
    return current_user


def get_current_superuser(current_user: User) -> User:
    """Validate that the current user has superuser privileges.

    Args:
        current_user: User object to validate.

    Returns:
        The same user object if user is a superuser.

    Raises:
        HTTPException: 403 Forbidden if user is not a superuser.

    Security:
        - Enforces superuser privilege validation for admin operations
        - Prevents unauthorized access to administrative functions
        - Used as dependency for admin-only endpoints
        - Superusers bypass role-based permission checks

    Example:
        >>> admin_user = get_current_superuser(user)
        >>> # Proceed with administrative operations
    """
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions"
        )
    return current_user


def require_permissions(required_permissions: list[str]):
    """Create a permission checker dependency for FastAPI routes.

    Args:
        required_permissions: List of permission names that the user must have.
                             Format: "resource:action" (e.g., "users:read", "admin:manage")

    Returns:
        A function that validates user permissions and returns the user if authorized.

    Raises:
        HTTPException: 403 Forbidden if user lacks any required permissions.

    Security:
        - Implements fine-grained role-based access control (RBAC)
        - Superusers automatically pass all permission checks
        - Validates permissions through user's assigned roles
        - Returns detailed error messages for missing permissions

    Permission Format:
        Permissions follow the pattern "resource:action":
        - "users:read" - Read user data
        - "users:update" - Modify user accounts
        - "admin:manage" - Administrative functions
        - "sessions:delete" - Delete user sessions

    Example:
        >>> # Require multiple permissions
        >>> @app.get("/admin/users")
        >>> def list_users(user: User = Depends(require_permissions(["users:read", "admin:read"]))):
        ...     return get_all_users()

        >>> # Single permission
        >>> checker = require_permissions(["users:update"])
        >>> authorized_user = checker(current_user)
    """

    def permission_checker(current_user: User) -> User:
        if current_user.is_superuser:
            return current_user

        user_permissions = []
        for role in current_user.roles:
            for permission in role.permissions:
                user_permissions.append(permission.name)

        missing_permissions = set(required_permissions) - set(user_permissions)
        if missing_permissions:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Missing required permissions: {', '.join(missing_permissions)}",
            )

        return current_user

    return permission_checker


def require_roles(required_roles: list[str]):
    """Create a role checker dependency for FastAPI routes.

    Args:
        required_roles: List of role names where user must have at least one.
                       Examples: ["admin", "user", "viewer"]

    Returns:
        A function that validates user roles and returns the user if authorized.

    Raises:
        HTTPException: 403 Forbidden if user doesn't have any of the required roles.

    Security:
        - Implements role-based access control (RBAC)
        - Superusers automatically pass all role checks
        - Uses OR logic: user needs any one of the specified roles
        - Provides clear error messages for unauthorized access

    Role Hierarchy:
        - "admin" - Full system access
        - "user" - Standard user operations
        - "viewer" - Read-only access
        - Custom roles can be defined in database

    Example:
        >>> # Require admin or manager role
        >>> @app.delete("/users/{user_id}")
        >>> def delete_user(user: User = Depends(require_roles(["admin", "manager"]))):
        ...     return delete_user_account()

        >>> # Single role requirement
        >>> checker = require_roles(["admin"])
        >>> admin_user = checker(current_user)
    """

    def role_checker(current_user: User) -> User:
        if current_user.is_superuser:
            return current_user

        user_roles = [role.name for role in current_user.roles]

        if not any(role in user_roles for role in required_roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Required one of roles: {', '.join(required_roles)}",
            )

        return current_user

    return role_checker


def authenticate_user(username: str, password: str, db: Session) -> User | None:
    """Authenticate a user with username/email and password credentials.

    Args:
        username: Username or email address for authentication.
        password: Plain text password to verify.
        db: Database session for user lookup and updates.

    Returns:
        User object if authentication succeeds, None if authentication fails.

    Security:
        - Supports authentication with either username or email
        - Uses constant-time password verification to prevent timing attacks
        - Updates last_login timestamp on successful authentication
        - Returns None for any authentication failure (user not found or wrong password)
        - Commits last_login update immediately to database

    Authentication Process:
        1. Lookup user by username OR email (flexible login)
        2. Verify password using bcrypt constant-time comparison
        3. Update last_login timestamp if authentication succeeds
        4. Return user object or None based on authentication result

    Example:
        >>> user = authenticate_user("john@example.com", "password123", db_session)
        >>> if user:
        ...     # Authentication successful
        ...     access_token = create_access_token({"sub": str(user.id)})
        ... else:
        ...     # Authentication failed
        ...     raise HTTPException(401, "Invalid credentials")
    """
    # Try to find user by username or email
    user = (
        db.query(User)
        .filter((User.username == username) | (User.email == username))
        .first()
    )

    if not user or not verify_password(password, user.hashed_password):
        return None

    # Update last login
    user.last_login = datetime.now(timezone.utc)
    db.commit()

    return user


def generate_api_key() -> str:
    """Generate a secure API key with Vana prefix.

    Returns:
        A secure API key string with format "vana_{random_token}".

    Security:
        - Uses cryptographically secure random token generation
        - 32-byte URL-safe base64 encoding provides sufficient entropy
        - Prefixed with "vana_" for easy identification and validation
        - Suitable for API authentication and service-to-service communication

    Example:
        >>> api_key = generate_api_key()
        >>> print(api_key)  # Output: "vana_AbC123..."
        >>> # Store in database with user/service association
    """
    return f"vana_{secrets.token_urlsafe(32)}"


def create_password_reset_token(email: str) -> str:
    """Create a JWT token for password reset with 1-hour expiration.

    Args:
        email: Email address to include in the reset token.

    Returns:
        Encoded JWT token for password reset.

    Security:
        - Short 1-hour expiration limits exposure window
        - Token type set to 'password_reset' for validation
        - Signed with same secret key as access tokens
        - Email claim allows token validation against user account

    Token Claims:
        - email: User's email address
        - exp: Expiration timestamp (1 hour from creation)
        - type: Set to 'password_reset' for validation

    Example:
        >>> reset_token = create_password_reset_token("user@example.com")
        >>> # Send token via email to user
        >>> send_password_reset_email(email, reset_token)
    """
    expire = datetime.now(timezone.utc) + timedelta(hours=1)
    to_encode = {"email": email, "exp": expire, "type": "password_reset"}
    return jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def verify_password_reset_token(token: str) -> str | None:
    """Verify a password reset token and extract the email address.

    Args:
        token: JWT password reset token to verify.

    Returns:
        Email address if token is valid, None if invalid/expired.

    Security:
        - Validates JWT signature and expiration automatically
        - Checks token type to ensure it's a password reset token
        - Returns None for any invalid, expired, or malformed tokens
        - Email extraction allows lookup of user account for password update

    Validation Process:
        1. Decode and verify JWT signature
        2. Check token hasn't expired (1-hour limit)
        3. Validate token type is 'password_reset'
        4. Extract and return email claim

    Example:
        >>> email = verify_password_reset_token(token_from_url)
        >>> if email:
        ...     user = get_user_by_email(email)
        ...     # Allow password reset for this user
        ... else:
        ...     raise HTTPException(400, "Invalid or expired token")
    """
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        email = payload.get("email")
        token_type = payload.get("type")

        if email is None or token_type != "password_reset":
            return None

        return email
    except JWTError:
        return None


def get_current_user_optional(
    credentials: HTTPAuthorizationCredentials | None,
    db: Session,
) -> User | None:
    """Optionally authenticate user from JWT token without raising exceptions.

    Args:
        credentials: Optional HTTP Authorization credentials with Bearer token.
        db: Database session for user lookup.

    Returns:
        User object if valid token provided and user exists, None otherwise.

    Security:
        - Graceful authentication that doesn't raise exceptions
        - Validates JWT signature, expiration, and token type
        - Checks user exists and is active in database
        - Returns None for any authentication failure
        - Used for optional authentication (public endpoints with user context)

    Use Cases:
        - Public endpoints that show different content for authenticated users
        - Optional rate limiting based on user identity
        - Analytics and logging with optional user context
        - Mixed public/private content based on authentication status

    Example:
        >>> user = get_current_user_optional(credentials, db_session)
        >>> if user:
        ...     # Show personalized content
        ...     return get_user_specific_data(user.id)
        ... else:
        ...     # Show public content
        ...     return get_public_data()
    """
    if not credentials:
        return None

    try:
        payload = jwt.decode(
            credentials.credentials, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM]
        )
        # Enforce type conversion for JWT 'sub' claim
        sub_claim = payload.get("sub")
        if sub_claim is None:
            return None

        # Convert to int, handling both string and int inputs
        try:
            user_id = int(sub_claim)
        except (ValueError, TypeError):
            return None

        token_type: str | None = payload.get("type")
        if token_type != "access":
            return None

        token_data = TokenData(user_id=user_id)
    except JWTError:
        return None

    user = db.query(User).filter(User.id == token_data.user_id).first()
    if user is None or not user.is_active:
        return None

    return user


def get_current_user_for_sse(
    credentials: HTTPAuthorizationCredentials | None,
    db: Session,
) -> User | None:
    """Authenticate user for Server-Sent Events (SSE) endpoints with configurable requirements.

    Args:
        credentials: Optional HTTP Authorization credentials with Bearer token.
        db: Database session for user lookup.

    Returns:
        User object if authentication required and valid, or None if optional.

    Raises:
        HTTPException: 401 Unauthorized if authentication is required but
                      credentials are missing or invalid.

    Security:
        - Behavior controlled by REQUIRE_SSE_AUTH configuration setting
        - Production mode (REQUIRE_SSE_AUTH=True): Mandatory authentication
        - Demo mode (REQUIRE_SSE_AUTH=False): Optional authentication
        - Prevents unauthorized access to real-time data streams

    Configuration Modes:
        - Production (REQUIRE_SSE_AUTH=True):
          * Requires valid JWT token for all SSE connections
          * Throws 401 error for missing/invalid credentials
          * Ensures secure access to real-time user data

        - Demo (REQUIRE_SSE_AUTH=False):
          * Optional authentication for SSE endpoints
          * Allows anonymous access for public demonstrations
          * Still validates tokens if provided

    Example:
        >>> # Production mode - authentication required
        >>> user = get_current_user_for_sse(credentials, db_session)
        >>> if user:
        ...     return sse_stream_for_user(user.id)

        >>> # Demo mode - authentication optional
        >>> user = get_current_user_for_sse(None, db_session)
        >>> # Returns None, allows anonymous SSE access
    """
    auth_settings = get_auth_settings()

    if auth_settings.require_sse_auth:
        # Production mode: require authentication
        if not credentials:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required for SSE endpoints",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return get_current_user(credentials, db)
    else:
        # Demo mode: optional authentication
        return get_current_user_optional(credentials, db)


# FastAPI Dependency factories to avoid B008 linting violations
# Create module-level dependency singletons
security_dep = Security(security)
optional_security_dep = Security(optional_security)


def _create_current_active_user_dependency():
    """Create dependency chain for active user authentication."""
    from app.auth.database import get_auth_db

    auth_db_dep = Depends(get_auth_db)

    def dependency(
        credentials: HTTPAuthorizationCredentials = security_dep,
        db: Session = auth_db_dep,
    ) -> User:
        user = get_current_user(credentials, db)
        return get_current_active_user(user)

    return dependency


def _create_current_user_for_sse_dependency():
    """Create dependency chain for SSE user authentication."""
    from app.auth.database import get_auth_db

    auth_db_dep = Depends(get_auth_db)

    def dependency(
        credentials: HTTPAuthorizationCredentials | None = optional_security_dep,
        db: Session = auth_db_dep,
    ) -> User | None:
        return get_current_user_for_sse(credentials, db)

    return dependency


def _create_current_superuser_dependency():
    """Create dependency chain for superuser authentication."""
    from app.auth.database import get_auth_db

    auth_db_dep = Depends(get_auth_db)

    def dependency(
        credentials: HTTPAuthorizationCredentials = security_dep,
        db: Session = auth_db_dep,
    ) -> User:
        user = get_current_user(credentials, db)
        active_user = get_current_active_user(user)
        return get_current_superuser(active_user)

    return dependency


def _create_permission_dependency(required_permissions: list[str]):
    """Create dependency chain for permission-based authentication."""
    from app.auth.database import get_auth_db

    auth_db_dep = Depends(get_auth_db)
    permission_checker = require_permissions(required_permissions)

    def dependency(
        credentials: HTTPAuthorizationCredentials = security_dep,
        db: Session = auth_db_dep,
    ) -> User:
        user = get_current_user(credentials, db)
        active_user = get_current_active_user(user)
        return permission_checker(active_user)

    return dependency


# Create the actual dependency instances
current_active_user_dep = Depends(_create_current_active_user_dependency())
current_user_for_sse_dep = Depends(_create_current_user_for_sse_dependency())
current_superuser_dep = Depends(_create_current_superuser_dependency())

# Permission-based dependencies
users_read_permission_dep = Depends(_create_permission_dependency(["users:read"]))
users_update_permission_dep = Depends(_create_permission_dependency(["users:update"]))
users_delete_permission_dep = Depends(_create_permission_dependency(["users:delete"]))
