"""Authentication models for user management and role-based access control."""

from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Table,
    Text,
)
from sqlalchemy.orm import Mapped, declarative_base, mapped_column, relationship
from sqlalchemy.sql import func

Base = declarative_base()

# Association table for many-to-many relationship between users and roles
user_roles = Table(
    "user_roles",
    Base.metadata,
    Column("user_id", Integer, ForeignKey("users.id"), primary_key=True),
    Column("role_id", Integer, ForeignKey("roles.id"), primary_key=True),
)

# Association table for many-to-many relationship between roles and permissions
role_permissions = Table(
    "role_permissions",
    Base.metadata,
    Column("role_id", Integer, ForeignKey("roles.id"), primary_key=True),
    Column("permission_id", Integer, ForeignKey("permissions.id"), primary_key=True),
)


class User(Base):
    """User model for authentication and authorization with role-based access control.

    Represents a user account in the system with authentication credentials,
    profile information, and role-based permissions. Supports both local
    password authentication and Google Cloud Identity integration.

    Security Features:
        - Bcrypt hashed passwords (never stores plain text)
        - Account status flags (active, verified, superuser)
        - Role-based permissions through many-to-many relationships
        - Google Cloud Identity integration for SSO
        - Audit trails with creation/update timestamps
        - Session management through refresh tokens

    Database Relationships:
        - Many-to-many with Role (user can have multiple roles)
        - One-to-many with RefreshToken (user can have multiple active sessions)

    Example:
        >>> user = User(
        ...     email="user@example.com",
        ...     username="john_doe",
        ...     hashed_password=get_password_hash("secure_password"),
        ...     is_active=True,
        ...     is_verified=True
        ... )
        >>> user.roles.append(user_role)  # Assign default user role
    """

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(
        String(255), unique=True, index=True, nullable=False
    )
    username: Mapped[str] = mapped_column(
        String(50), unique=True, index=True, nullable=False
    )
    first_name: Mapped[str | None] = mapped_column(String(50), nullable=True)
    last_name: Mapped[str | None] = mapped_column(String(50), nullable=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_superuser: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    google_cloud_identity: Mapped[str | None] = mapped_column(
        String(255), nullable=True, index=True
    )
    last_login: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    roles: Mapped[list["Role"]] = relationship(
        "Role", secondary=user_roles, back_populates="users", lazy="select"
    )
    refresh_tokens: Mapped[list["RefreshToken"]] = relationship(
        "RefreshToken", back_populates="user", cascade="all, delete-orphan"
    )

    @property
    def full_name(self) -> str:
        """Get the user's full display name for UI purposes.

        Returns:
            Combined first and last name if both are available,
            otherwise returns the username as fallback.

        Privacy:
            Safe to display in user interfaces and logs as it only
            returns data the user has explicitly provided.

        Example:
            >>> user.first_name = "John"
            >>> user.last_name = "Doe"
            >>> print(user.full_name)  # "John Doe"
            >>> 
            >>> user_no_names.first_name = None
            >>> print(user_no_names.full_name)  # "john_doe" (username)
        """
        if self.first_name and self.last_name:
            return f"{self.first_name} {self.last_name}"
        return self.username

    def has_permission(self, permission_name: str) -> bool:
        """Check if user has a specific permission through role assignments.

        Args:
            permission_name: Permission name to check (e.g., "users:read", "admin:manage").

        Returns:
            True if user has the permission or is a superuser, False otherwise.

        Security:
            - Superusers automatically have all permissions
            - Checks all assigned roles and their associated permissions
            - Uses exact string matching for permission names
            - Efficient early return for superusers

        Permission Format:
            Permissions follow "resource:action" pattern:
            - "users:read" - Read user data
            - "users:update" - Modify user accounts  
            - "admin:manage" - Administrative functions
            - "sessions:delete" - Delete user sessions

        Example:
            >>> if user.has_permission("users:update"):
            ...     # Allow user modification
            ...     update_user_profile(user_id, new_data)
            >>> 
            >>> # Superuser check
            >>> admin_user.is_superuser = True
            >>> assert admin_user.has_permission("any:permission")  # Always True
        """
        for role in self.roles:
            for permission in role.permissions:
                if permission.name == permission_name:
                    return True
        return self.is_superuser

    def has_role(self, role_name: str) -> bool:
        """Check if user is assigned a specific role.

        Args:
            role_name: Role name to check (e.g., "admin", "user", "viewer").

        Returns:
            True if user has the specified role, False otherwise.

        Security:
            - Performs exact string matching on role names
            - Case-sensitive role name comparison
            - Efficient any() operation for multiple role checking

        Role Hierarchy:
            - "admin" - Full system access
            - "user" - Standard user operations  
            - "viewer" - Read-only access
            - Custom roles can be defined as needed

        Example:
            >>> if user.has_role("admin"):
            ...     # Allow administrative operations
            ...     show_admin_panel()
            >>> 
            >>> # Multiple role check
            >>> if user.has_role("admin") or user.has_role("moderator"):
            ...     # Allow moderation actions
            ...     moderate_content()
        """
        return any(role.name == role_name for role in self.roles)


class Role(Base):
    """Role model for role-based access control (RBAC) system.

    Represents a role that can be assigned to users, providing a collection
    of permissions for accessing different system resources. Roles enable
    flexible and scalable permission management.

    Security Features:
        - Groups related permissions for easier management
        - Many-to-many relationships with users and permissions
        - Active/inactive status for role lifecycle management
        - Hierarchical permission inheritance through role assignments

    Database Relationships:
        - Many-to-many with User (role can be assigned to multiple users)
        - Many-to-many with Permission (role can have multiple permissions)

    Common Roles:
        - "admin" - Full system access with all permissions
        - "user" - Standard user operations (agents, sessions, feedback)
        - "viewer" - Read-only access to user's own data
        - Custom roles for specific business requirements

    Example:
        >>> admin_role = Role(
        ...     name="admin",
        ...     description="Full system administrator",
        ...     is_active=True
        ... )
        >>> admin_role.permissions.extend(all_permissions)
        >>> user.roles.append(admin_role)
    """

    __tablename__ = "roles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(
        String(50), unique=True, index=True, nullable=False
    )
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    users: Mapped[list[User]] = relationship(
        "User", secondary=user_roles, back_populates="roles"
    )
    permissions: Mapped[list["Permission"]] = relationship(
        "Permission", secondary=role_permissions, back_populates="roles", lazy="select"
    )


class Permission(Base):
    """Permission model for fine-grained access control in RBAC system.

    Represents a specific permission to perform an action on a resource.
    Permissions follow a "resource:action" naming convention and are
    assigned to roles, which are then assigned to users.

    Security Features:
        - Fine-grained access control at resource and action level
        - Standardized naming convention (resource:action)
        - Flexible resource and action categorization
        - Audit trail with creation timestamps

    Permission Structure:
        - name: Unique permission identifier (e.g., "users:read")
        - resource: Target resource category (e.g., "users", "sessions")
        - action: Specific action allowed (e.g., "read", "create", "delete")
        - description: Human-readable explanation of permission

    Database Relationships:
        - Many-to-many with Role (permission can be assigned to multiple roles)

    Example Permission Names:
        - "users:read" - View user profiles and data
        - "users:update" - Modify user accounts
        - "users:delete" - Remove user accounts
        - "admin:manage" - Administrative functions
        - "sessions:create" - Create new sessions
        - "feedback:read" - View feedback data

    Example:
        >>> permission = Permission(
        ...     name="users:update",
        ...     description="Modify user accounts and profiles",
        ...     resource="users",
        ...     action="update"
        ... )
        >>> role.permissions.append(permission)
    """

    __tablename__ = "permissions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(
        String(100), unique=True, index=True, nullable=False
    )
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    resource: Mapped[str] = mapped_column(
        String(50), nullable=False
    )  # e.g., 'agents', 'sessions', 'feedback'
    action: Mapped[str] = mapped_column(
        String(20), nullable=False
    )  # e.g., 'read', 'write', 'delete', 'create'
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    roles: Mapped[list[Role]] = relationship(
        "Role", secondary=role_permissions, back_populates="permissions"
    )


class RefreshToken(Base):
    """Refresh token model for secure session and token management.

    Represents a long-lived token used to obtain new access tokens without
    requiring user re-authentication. Implements token rotation and device
    tracking for enhanced security.

    Security Features:
        - Cryptographically secure random token generation
        - Configurable expiration times (default 7 days)
        - Token revocation support for immediate logout
        - Device fingerprinting for suspicious activity detection
        - IP address tracking for location-based security
        - Automatic cleanup of old tokens (keeps latest 4 per user)

    Token Lifecycle:
        1. Created during login/registration with secure random value
        2. Used to generate new access tokens via /auth/refresh
        3. Rotated on each refresh (old token revoked, new token issued)
        4. Revoked on logout or security events
        5. Automatically expires after configured period

    Database Relationships:
        - Many-to-one with User (user can have multiple active tokens)

    Security Considerations:
        - Tokens should be stored securely on client (httpOnly cookies)
        - Implement token rotation to limit exposure window
        - Monitor for suspicious device/IP changes
        - Revoke all tokens on password change or security breach

    Example:
        >>> refresh_token = RefreshToken(
        ...     token=secrets.token_urlsafe(32),
        ...     user_id=user.id,
        ...     expires_at=datetime.now(timezone.utc) + timedelta(days=7),
        ...     device_info="Mozilla/5.0...",
        ...     ip_address="192.168.1.100"
        ... )
    """

    __tablename__ = "refresh_tokens"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    token: Mapped[str] = mapped_column(
        String(255), unique=True, index=True, nullable=False
    )
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    is_revoked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    device_info: Mapped[str | None] = mapped_column(String(255), nullable=True)
    ip_address: Mapped[str | None] = mapped_column(
        String(45), nullable=True
    )  # IPv6 compatible
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    user: Mapped[User] = relationship("User", back_populates="refresh_tokens")

    @property
    def is_expired(self) -> bool:
        """Check if the refresh token has passed its expiration time.

        Returns:
            True if token is expired, False if still valid.

        Security:
            - Uses UTC timestamps for consistent timezone handling
            - Gracefully handles timezone-naive datetime objects
            - Conservative approach: expired if current time > expiration

        Implementation Notes:
            - Converts timezone-naive expires_at to UTC for comparison
            - Uses datetime.now(timezone.utc) for current time
            - Prevents timezone-related security vulnerabilities

        Example:
            >>> if refresh_token.is_expired:
            ...     raise HTTPException(401, "Token expired")
            >>> else:
            ...     # Token is still valid, proceed with refresh
            ...     new_access_token = create_access_token(user_data)
        """
        now = datetime.now(timezone.utc)
        expires_at = self.expires_at

        # Handle timezone-naive expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)

        return now > expires_at

    @property
    def is_valid(self) -> bool:
        """Check if the refresh token is valid for use in authentication.

        Returns:
            True if token is not expired and not revoked, False otherwise.

        Security:
            - Combines expiration and revocation checks for complete validation
            - Must pass both checks to be considered valid
            - Used in token verification before granting new access tokens

        Validation Criteria:
            1. Token must not be expired (current time < expires_at)
            2. Token must not be revoked (is_revoked = False)

        Example:
            >>> if not refresh_token.is_valid:
            ...     raise HTTPException(401, "Invalid refresh token")
            >>> 
            >>> # Token is valid, generate new access token
            >>> user = refresh_token.user
            >>> new_token = create_access_token({"sub": str(user.id)})
        """
        return not self.is_expired and not self.is_revoked
