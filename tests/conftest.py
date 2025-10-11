"""Pytest configuration and fixtures."""

import os
from pathlib import Path

import pytest
from dotenv import load_dotenv


# Load .env.local before any tests run
def pytest_configure(config):
    """Load environment variables from .env.local before tests."""
    env_path = Path(__file__).parent.parent / ".env.local"
    if env_path.exists():
        load_dotenv(env_path, override=True)
        print(f"✓ Loaded environment from {env_path}")
    else:
        print(f"⚠ Warning: {env_path} not found")


@pytest.fixture
def db_session():
    """Provide database session for tests."""
    from app.auth.database import SessionLocal

    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
