#!/usr/bin/env python3
"""Password migration script from SHA256 to bcrypt.

This script handles migration of passwords from insecure SHA256 hashing
to secure bcrypt hashing. Migration strategy:

1. Add 'requires_password_reset' flag to User model
2. Mark all existing users for password reset on next login
3. On successful login with old SHA256 password:
   - Verify against old hash
   - Rehash with bcrypt
   - Update database
   - Remove reset flag
4. Send password reset emails to all users

Security Note: This is a one-time migration. After completion,
all passwords will use bcrypt with 12-14 rounds.
"""

import hashlib
import os
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from .database import SessionLocal, engine
from .models import Base, User
from .security import get_password_hash


def simple_hash(password: str) -> str:
    """Legacy SHA256 hash for migration verification only.

    WARNING: This is the OLD insecure hashing method.
    DO NOT use for new passwords. Only for migration verification.
    """
    return hashlib.sha256(f"{password}:vana-salt".encode()).hexdigest()


def verify_old_password(plain_password: str, old_hash: str) -> bool:
    """Verify password against OLD SHA256 hash during migration."""
    return simple_hash(plain_password) == old_hash


def migrate_user_password(db: Session, user: User, plain_password: str) -> bool:
    """Migrate a single user's password from SHA256 to bcrypt.

    Args:
        db: Database session
        user: User model instance
        plain_password: Plain text password (from login attempt)

    Returns:
        True if migration successful, False otherwise
    """
    # Verify against old SHA256 hash
    if not verify_old_password(plain_password, user.hashed_password):
        return False

    # Generate new bcrypt hash
    new_hash = get_password_hash(plain_password)

    # Update user record
    user.hashed_password = new_hash
    user.updated_at = datetime.now(timezone.utc)

    # Remove password reset flag if exists
    if hasattr(user, 'requires_password_reset'):
        user.requires_password_reset = False

    db.commit()
    return True


def mark_all_users_for_reset(db: Session) -> int:
    """Mark all users with SHA256 passwords for mandatory password reset.

    This forces all users to reset their passwords on next login,
    ensuring migration to bcrypt.

    Returns:
        Number of users marked for reset
    """
    # Check if column exists, if not return 0
    # This is safe since the column is optional
    try:
        users = db.query(User).all()
        count = 0

        for user in users:
            if hasattr(user, 'requires_password_reset'):
                user.requires_password_reset = True
                count += 1

        db.commit()
        return count
    except Exception as e:
        print(f"Note: requires_password_reset column not available: {e}")
        return 0


def check_hash_type(hashed_password: str) -> str:
    """Determine hash type from password hash.

    Returns:
        'bcrypt' if hash starts with '$2b$'
        'sha256' if hash is 64 hex characters
        'unknown' otherwise
    """
    if hashed_password.startswith('$2b$') or hashed_password.startswith('$2a$'):
        return 'bcrypt'
    elif len(hashed_password) == 64 and all(c in '0123456789abcdef' for c in hashed_password):
        return 'sha256'
    else:
        return 'unknown'


def audit_password_hashes(db: Session) -> dict:
    """Audit all user passwords to determine hash types.

    Returns:
        Dictionary with counts of each hash type
    """
    users = db.query(User).all()

    stats = {
        'bcrypt': 0,
        'sha256': 0,
        'unknown': 0,
        'total': len(users)
    }

    for user in users:
        hash_type = check_hash_type(user.hashed_password)
        stats[hash_type] += 1

    return stats


def run_migration_audit():
    """Run audit to check password hash status."""
    db = SessionLocal()
    try:
        print("=" * 60)
        print("PASSWORD HASH MIGRATION AUDIT")
        print("=" * 60)

        stats = audit_password_hashes(db)

        print(f"\nTotal users: {stats['total']}")
        print(f"Bcrypt hashes: {stats['bcrypt']} ✅")
        print(f"SHA256 hashes (INSECURE): {stats['sha256']} ⚠️")
        print(f"Unknown hashes: {stats['unknown']} ❓")

        if stats['sha256'] > 0:
            print("\n⚠️  WARNING: SHA256 password hashes detected!")
            print("These users should be forced to reset passwords.")
            print("Run mark_all_users_for_reset() to initiate migration.")
        else:
            print("\n✅ All passwords use secure bcrypt hashing!")

        print("=" * 60)

        return stats

    finally:
        db.close()


if __name__ == "__main__":
    # Run audit when script is executed directly
    run_migration_audit()
