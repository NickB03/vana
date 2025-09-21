"""Database configuration and utilities for authentication."""

import os
from collections.abc import Generator

from sqlalchemy import MetaData, create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from .models import Base

# Determine database URL
AUTH_DATABASE_URL = os.getenv("AUTH_DATABASE_URL", "sqlite:///./auth.db")

# Create engine with appropriate configuration
if AUTH_DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        AUTH_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        echo=os.getenv("AUTH_DB_ECHO", "false").lower() == "true",
    )
else:
    # For PostgreSQL or other databases
    engine = create_engine(
        AUTH_DATABASE_URL,
        pool_pre_ping=True,
        echo=os.getenv("AUTH_DB_ECHO", "false").lower() == "true",
    )

# Create sessionmaker
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_auth_db() -> Generator[Session, None, None]:
    """Dependency function to provide database session for authentication operations.

    Yields:
        SQLAlchemy Session: Database session configured for authentication.

    Session Management:
        - Creates new session from configured SessionLocal factory
        - Automatically closes session after use (finally block)
        - Safe for use in FastAPI dependency injection
        - Handles connection errors gracefully

    Usage:
        This function is designed to be used as a FastAPI dependency:

        >>> @app.get("/users/me")
        >>> async def get_user(db: Session = Depends(get_auth_db)):
        ...     return db.query(User).filter(User.id == user_id).first()

    Example:
        >>> db_dependency = Depends(get_auth_db)
        >>>
        >>> def some_function(db: Session = db_dependency):
        ...     users = db.query(User).all()
        ...     return users
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables() -> None:
    """Create all authentication tables in the database.

    Creates tables for User, Role, Permission, RefreshToken and their
    association tables based on SQLAlchemy model metadata.

    Security:
        - Creates tables with proper foreign key constraints
        - Establishes many-to-many relationship tables
        - Uses database engine configured with authentication settings

    Tables Created:
        - users: User accounts and authentication data
        - roles: Role definitions for RBAC
        - permissions: Fine-grained permission definitions
        - refresh_tokens: Session management tokens
        - user_roles: Many-to-many user-role associations
        - role_permissions: Many-to-many role-permission associations

    Example:
        >>> create_tables()
        >>> # All authentication tables now exist in database
    """
    Base.metadata.create_all(bind=engine)


def drop_tables() -> None:
    """Drop all authentication tables from the database.

    WARNING: This operation is destructive and will permanently delete
    all authentication data including users, roles, permissions, and tokens.

    Security:
        - Use only for testing, development, or complete system reset
        - Production systems should use database migrations instead
        - Drops tables in correct order to handle foreign key constraints

    Tables Dropped:
        - All tables defined in authentication models
        - Association tables for many-to-many relationships
        - All data will be permanently lost

    Example:
        >>> # WARNING: This deletes all authentication data!
        >>> drop_tables()
        >>> # All authentication tables and data are now gone
    """
    Base.metadata.drop_all(bind=engine)


def init_auth_db() -> None:
    """Initialize authentication database with tables, roles, permissions, and admin user.

    Performs complete database initialization for the authentication system:
    1. Creates all necessary tables
    2. Sets up default permissions for all resources
    3. Creates standard roles (viewer, user, admin)
    4. Assigns appropriate permissions to each role
    5. Creates admin user if credentials provided in environment

    Environment Variables:
        - ADMIN_EMAIL: Email for default admin user (optional)
        - ADMIN_PASSWORD: Password for default admin user (optional)

    Security:
        - Idempotent operation (safe to run multiple times)
        - Skips initialization if permissions already exist
        - Uses secure password hashing for admin user
        - Assigns comprehensive permissions to roles

    Default Permissions Created:
        - Resource-based permissions for: agents, sessions, feedback, users, admin
        - Action-based permissions: read, create, update, delete, manage
        - Fine-grained control over system resources

    Default Roles Created:
        - "viewer": Read-only access to all resources
        - "user": Standard user operations (agents, sessions, feedback)
        - "admin": Full system access with all permissions

    Raises:
        Exception: If database initialization fails (rolled back automatically)

    Example:
        >>> # Set environment variables first
        >>> os.environ["ADMIN_EMAIL"] = "admin@company.com"
        >>> os.environ["ADMIN_PASSWORD"] = "SecureAdminPass123!"
        >>>
        >>> # Initialize database
        >>> init_auth_db()
        >>> print("Authentication database initialized successfully")
    """
    from .models import Permission, Role, User
    from .security import get_password_hash

    # Create tables
    create_tables()

    # Create default permissions and roles
    db = SessionLocal()
    try:
        # Check if already initialized
        if db.query(Permission).first():
            return

        # Create default permissions
        permissions = [
            # Agent permissions
            Permission(
                name="agents:read",
                description="Read agent data",
                resource="agents",
                action="read",
            ),
            Permission(
                name="agents:create",
                description="Create agents",
                resource="agents",
                action="create",
            ),
            Permission(
                name="agents:update",
                description="Update agents",
                resource="agents",
                action="update",
            ),
            Permission(
                name="agents:delete",
                description="Delete agents",
                resource="agents",
                action="delete",
            ),
            # Session permissions
            Permission(
                name="sessions:read",
                description="Read session data",
                resource="sessions",
                action="read",
            ),
            Permission(
                name="sessions:create",
                description="Create sessions",
                resource="sessions",
                action="create",
            ),
            Permission(
                name="sessions:update",
                description="Update sessions",
                resource="sessions",
                action="update",
            ),
            Permission(
                name="sessions:delete",
                description="Delete sessions",
                resource="sessions",
                action="delete",
            ),
            # Feedback permissions
            Permission(
                name="feedback:read",
                description="Read feedback data",
                resource="feedback",
                action="read",
            ),
            Permission(
                name="feedback:create",
                description="Create feedback",
                resource="feedback",
                action="create",
            ),
            Permission(
                name="feedback:update",
                description="Update feedback",
                resource="feedback",
                action="update",
            ),
            Permission(
                name="feedback:delete",
                description="Delete feedback",
                resource="feedback",
                action="delete",
            ),
            # User management permissions
            Permission(
                name="users:read",
                description="Read user data",
                resource="users",
                action="read",
            ),
            Permission(
                name="users:create",
                description="Create users",
                resource="users",
                action="create",
            ),
            Permission(
                name="users:update",
                description="Update users",
                resource="users",
                action="update",
            ),
            Permission(
                name="users:delete",
                description="Delete users",
                resource="users",
                action="delete",
            ),
            # Admin permissions
            Permission(
                name="admin:read",
                description="Read admin data",
                resource="admin",
                action="read",
            ),
            Permission(
                name="admin:manage",
                description="Manage admin functions",
                resource="admin",
                action="manage",
            ),
        ]

        for permission in permissions:
            db.add(permission)
        db.commit()

        # Create default roles
        viewer_role = Role(name="viewer", description="Can view data but not modify")
        user_role = Role(
            name="user", description="Standard user with basic permissions"
        )
        admin_role = Role(
            name="admin", description="Administrator with full permissions"
        )

        db.add_all([viewer_role, user_role, admin_role])
        db.commit()

        # Assign permissions to roles
        # Viewer role - read only
        viewer_permissions = (
            db.query(Permission).filter(Permission.action == "read").all()
        )
        viewer_role.permissions.extend(viewer_permissions)

        # User role - standard user permissions
        user_permissions = (
            db.query(Permission)
            .filter(Permission.resource.in_(["agents", "sessions", "feedback"]))
            .all()
        )
        user_role.permissions.extend(user_permissions)

        # Admin role - all permissions
        all_permissions = db.query(Permission).all()
        admin_role.permissions.extend(all_permissions)

        db.commit()

        # Create default admin user if specified in environment
        admin_email = os.getenv("ADMIN_EMAIL")
        admin_password = os.getenv("ADMIN_PASSWORD")

        if admin_email and admin_password:
            admin_user = User(
                email=admin_email,
                username="admin",
                first_name="System",
                last_name="Administrator",
                hashed_password=get_password_hash(admin_password),
                is_active=True,
                is_superuser=True,
                is_verified=True,
            )
            db.add(admin_user)
            db.commit()

            # Assign admin role
            admin_user.roles.append(admin_role)
            db.commit()

            print(f"Created admin user: {admin_email}")

        print("Authentication database initialized successfully")

    except Exception as e:
        db.rollback()
        print(f"Error initializing auth database: {e}")
        raise
    finally:
        db.close()


# Metadata for Alembic migrations
metadata = MetaData()


if __name__ == "__main__":
    # Initialize database when run directly
    init_auth_db()
