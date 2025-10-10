"""Conftest for integration tests.

Sets up environment variables and fixtures for integration testing.
"""

import os
import pytest


@pytest.fixture(scope="session", autouse=True)
def setup_test_environment():
    """Set up test environment variables for all integration tests."""
    original_env = os.environ.copy()

    # Set test environment
    os.environ["ENVIRONMENT"] = "development"
    os.environ["JWT_SECRET_KEY"] = "test_secret_key_for_integration_testing_do_not_use_in_production_32_chars_long"
    os.environ["AUTH_SECRET_KEY"] = "test_secret_key_for_integration_testing_do_not_use_in_production_32_chars_long"
    os.environ["AUTH_REQUIRE_SSE_AUTH"] = "false"
    os.environ["SESSION_INTEGRITY_KEY"] = "test_secret_key_for_integration_testing_do_not_use_in_production_32_chars_long"
    os.environ["CI"] = "true"  # Skip GCS operations

    yield

    # Restore original environment
    os.environ.clear()
    os.environ.update(original_env)
