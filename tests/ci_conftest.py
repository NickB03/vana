"""
CI-specific test configuration to handle Google Cloud dependencies in GitHub Actions.
This file provides mocks and fixtures for running tests without GCP credentials.
"""

import os
import sys
from unittest.mock import MagicMock, patch

import pytest


def pytest_configure(config):
    """Configure pytest for CI environment."""
    if os.getenv("CI") or os.getenv("RUNNING_IN_CI"):
        print("Running in CI mode - mocking Google Cloud dependencies")

        # Mock Google Cloud modules before they're imported
        sys.modules["google.cloud.logging"] = MagicMock()
        sys.modules["google.cloud.aiplatform"] = MagicMock()
        sys.modules["google.auth"] = MagicMock()
        sys.modules["google.auth.default"] = MagicMock()
        sys.modules["google.auth.credentials"] = MagicMock()
        sys.modules["google.cloud"] = MagicMock()

        # Set up mock return values
        mock_credentials = MagicMock()
        mock_project = "test-project"
        sys.modules["google.auth"].default = MagicMock(
            return_value=(mock_credentials, mock_project)
        )


@pytest.fixture(autouse=True)
def mock_gcp_in_ci(monkeypatch):
    """Auto-mock GCP services in CI environment."""
    if os.getenv("CI") or os.getenv("RUNNING_IN_CI"):
        # Set environment variables
        monkeypatch.setenv("GOOGLE_CLOUD_PROJECT", "test-project")
        monkeypatch.setenv("CI", "true")

        # Mock Google Cloud clients
        with patch("google.cloud.logging.Client") as mock_logging:
            mock_logging.return_value = MagicMock()

        # Mock ADK if it's being used
        try:
            import importlib.util

            if importlib.util.find_spec("google_adk"):
                monkeypatch.setattr("google_adk.Client", MagicMock)
        except ImportError:
            pass

        yield
    else:
        # Not in CI, don't mock anything
        yield


@pytest.fixture
def mock_gcp_credentials():
    """Provide mock GCP credentials for testing."""
    return MagicMock()


@pytest.fixture
def mock_gcp_client():
    """Provide a mock GCP client for testing."""
    client = MagicMock()
    client.project = "test-project"
    return client
