"""Conftest for integration tests.

Sets up environment variables and fixtures for integration testing.
"""

import os

# Set up test environment BEFORE importing app modules
os.environ["ENVIRONMENT"] = "development"
os.environ["JWT_SECRET_KEY"] = "test_secret_key_for_integration_testing_do_not_use_in_production_32_chars_long"
os.environ["AUTH_SECRET_KEY"] = "test_secret_key_for_integration_testing_do_not_use_in_production_32_chars_long"
os.environ["AUTH_REQUIRE_SSE_AUTH"] = "false"
os.environ["SESSION_INTEGRITY_KEY"] = "test_secret_key_for_integration_testing_do_not_use_in_production_32_chars_long"
os.environ["CI"] = "true"  # Skip GCS operations

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.auth.database import Base


@pytest.fixture(scope="function")
def db_session():
    """Create a fresh database session for each test."""
    # Use in-memory SQLite for testing
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(engine)

    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSessionLocal()

    yield session

    session.close()
    Base.metadata.drop_all(engine)
