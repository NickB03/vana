#!/usr/bin/env python3
"""
Integration tests for ADK canonical streaming passthrough (Phase 1.1).

Tests verify:
- Feature flag enforcement (501 when disabled)
- Request model validation
- Endpoint registration and routing
"""

import pytest
from fastapi.testclient import TestClient

from app.server import app


@pytest.fixture
def client():
    """Create test client for FastAPI app."""
    return TestClient(app)


class TestRunSSEFeatureFlag:
    """Test feature flag enforcement for /run_sse endpoint."""

    def test_run_sse_requires_feature_flag(self, client, monkeypatch):
        """Test that /run_sse returns 501 when ENABLE_ADK_CANONICAL_STREAM is disabled."""
        # Ensure feature flag is disabled
        monkeypatch.setenv("ENABLE_ADK_CANONICAL_STREAM", "false")

        # Attempt to call endpoint
        response = client.post("/run_sse", json={
            "appName": "vana",
            "userId": "test_user",
            "sessionId": "test_session_123456789012345",
            "newMessage": {
                "parts": [{"text": "test query"}],
                "role": "user"
            },
            "streaming": True
        })

        # Should return 501 Not Implemented
        assert response.status_code == 501
        assert "canonical streaming not enabled" in response.json()["detail"].lower()

    def test_run_sse_validates_request_body(self, client):
        """Test that /run_sse validates the RunAgentRequest model."""
        # Send invalid request (missing required fields)
        response = client.post("/run_sse", json={
            "appName": "vana",
            # Missing userId, sessionId, newMessage
        })

        # Should return 422 Unprocessable Entity (validation error)
        assert response.status_code == 422


class TestRunSSEEndpointRegistration:
    """Test that the new endpoint is properly registered."""

    def test_run_sse_endpoint_exists(self, client):
        """Test that POST /run_sse endpoint is registered."""
        # The endpoint should exist (even if feature flag disabled)
        response = client.post("/run_sse", json={
            "appName": "vana",
            "userId": "test",
            "sessionId": "test_session_123456789012345",
            "newMessage": {"parts": [{"text": "test"}], "role": "user"},
        })

        # Should not return 404 (endpoint exists)
        assert response.status_code != 404
        # Should return 501 (feature flag disabled) or other error
        assert response.status_code in [501, 422]


@pytest.mark.skipif(
    True,  # Skip by default - requires ADK service on port 8080
    reason="Requires ADK service running on port 8080"
)
class TestRunSSEWithADKService:
    """Integration tests with actual ADK service (requires setup)."""

    def test_run_sse_streams_adk_events(self, client, monkeypatch):
        """Test that /run_sse streams raw ADK Event JSON."""
        # Enable feature flag
        monkeypatch.setenv("ENABLE_ADK_CANONICAL_STREAM", "true")

        # This test requires ADK service on port 8080
        # Implementation depends on test environment setup
        pass

    def test_run_sse_timeout_handling(self, client, monkeypatch):
        """Test that /run_sse respects 300s timeout."""
        monkeypatch.setenv("ENABLE_ADK_CANONICAL_STREAM", "true")
        # Implementation requires timeout simulation
        pass

    def test_run_sse_error_propagation(self, client, monkeypatch):
        """Test that /run_sse propagates HTTP errors from ADK."""
        monkeypatch.setenv("ENABLE_ADK_CANONICAL_STREAM", "true")
        # Implementation requires error simulation
        pass
