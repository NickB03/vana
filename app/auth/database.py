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
    """Get database session for authentication."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables() -> None:
    """Create all authentication tables."""
    Base.metadata.create_all(bind=engine)


def drop_tables() -> None:
    """Drop all authentication tables."""
    Base.metadata.drop_all(bind=engine)


def init_auth_db() -> None:
    """Initialize authentication database with tables and default data."""
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
