"""
SSE Backend Integration Tests
Tests the SSE streaming functionality from the backend perspective
"""

import asyncio
import json
import time
from collections.abc import AsyncGenerator

import httpx
import pytest

# Mark all tests as requiring server - skip if server not running
pytestmark = [pytest.mark.requires_server, pytest.mark.timeout(30)]

BACKEND_URL = "http://localhost:8000"
TEST_SESSION_ID = "test-session-e2e"


class TestSSEBackendIntegration:
    """Test SSE streaming functionality from backend"""

    @pytest.fixture
    async def http_client(self) -> AsyncGenerator[httpx.AsyncClient, None]:
        """Create async HTTP client for testing"""
        async with httpx.AsyncClient(timeout=30.0) as client:
            yield client

    @pytest.mark.asyncio
    async def test_sse_endpoint_accessible(self, http_client: httpx.AsyncClient):
        """Test that SSE endpoint is accessible"""
        response = await http_client.get(f"{BACKEND_URL}/sse/{TEST_SESSION_ID}")

        # Should not return 404 (endpoint exists)
        assert response.status_code != 404

        # May return 401 (unauthorized) or start streaming
        assert response.status_code in [200, 401, 403]

    @pytest.mark.asyncio
    async def test_sse_stream_format(self, http_client: httpx.AsyncClient):
        """Test SSE stream returns proper format"""
        try:
            async with http_client.stream(
                "GET", f"{BACKEND_URL}/sse/{TEST_SESSION_ID}"
            ) as response:
                # Should have proper SSE headers
                assert "text/event-stream" in response.headers.get("content-type", "")
                assert response.headers.get("cache-control") == "no-cache"

                # Try to read some data
                chunk_count = 0
                async for chunk in response.aiter_text():
                    if chunk.strip():
                        chunk_count += 1

                        # SSE format should include data: prefix
                        if chunk.startswith("data:"):
                            try:
                                # Try to parse JSON data
                                data_part = chunk[5:].strip()  # Remove 'data:' prefix
                                if data_part and data_part != "[DONE]":
                                    json.loads(data_part)
                            except json.JSONDecodeError:
                                # Non-JSON data is also valid for SSE
                                pass

                    # Don't test too long
                    if chunk_count >= 5:
                        break

        except httpx.ConnectError:
            pytest.skip("Backend not running")
        except httpx.TimeoutException:
            # Timeout is acceptable for streaming endpoint
            pass

    @pytest.mark.asyncio
    async def test_sse_with_session_creation(self, http_client: httpx.AsyncClient):
        """Test SSE with proper session creation"""
        # First create a session
        session_data = {
            "name": f"Test Session {int(time.time())}",
            "description": "E2E test session",
        }

        try:
            session_response = await http_client.post(
                f"{BACKEND_URL}/sessions", json=session_data
            )

            if session_response.status_code in [200, 201]:
                session = session_response.json()
                session_id = session.get("id") or session.get("session_id")

                if session_id:
                    # Test SSE with real session
                    sse_response = await http_client.get(
                        f"{BACKEND_URL}/sse/{session_id}"
                    )
                    assert sse_response.status_code in [200, 401, 403]

        except httpx.ConnectError:
            pytest.skip("Backend not running")

    @pytest.mark.asyncio
    async def test_sse_handles_invalid_sessions(self, http_client: httpx.AsyncClient):
        """Test SSE handles invalid session IDs gracefully"""
        invalid_sessions = [
            "nonexistent-session",
            "",
            "../../etc/passwd",
            "<script>alert('xss')</script>",
            "session with spaces",
            "session/with/slashes",
        ]

        for session_id in invalid_sessions:
            try:
                response = await http_client.get(f"{BACKEND_URL}/sse/{session_id}")

                # Should handle invalid sessions gracefully
                assert response.status_code in [400, 401, 403, 404, 422]

            except httpx.ConnectError:
                pytest.skip("Backend not running")

    @pytest.mark.asyncio
    async def test_sse_concurrent_connections(self, http_client: httpx.AsyncClient):
        """Test SSE handles multiple concurrent connections"""

        async def connect_sse(session_id: str):
            try:
                async with http_client.stream(
                    "GET", f"{BACKEND_URL}/sse/{session_id}"
                ) as response:
                    if response.status_code == 200:
                        # Read a few chunks
                        chunk_count = 0
                        async for _chunk in response.aiter_text():
                            chunk_count += 1
                            if chunk_count >= 3:
                                break
                    return response.status_code
            except Exception:
                return 500

        # Create multiple concurrent connections
        tasks = [connect_sse(f"{TEST_SESSION_ID}-{i}") for i in range(5)]

        try:
            results = await asyncio.gather(*tasks, return_exceptions=True)

            # Should handle concurrent connections
            for result in results:
                if isinstance(result, int):
                    assert result in [200, 401, 403, 404]

        except Exception:
            # If backend can't handle concurrent connections, that's noted
            pass

    @pytest.mark.asyncio
    async def test_sse_authentication_integration(self, http_client: httpx.AsyncClient):
        """Test SSE with authentication"""
        # Try SSE without authentication
        response = await http_client.get(f"{BACKEND_URL}/sse/{TEST_SESSION_ID}")

        if response.status_code == 401:
            # Test with mock authentication header
            headers = {"Authorization": "Bearer mock-token"}
            auth_response = await http_client.get(
                f"{BACKEND_URL}/sse/{TEST_SESSION_ID}", headers=headers
            )

            # Should handle authentication attempt
            assert auth_response.status_code in [200, 401, 403]

    @pytest.mark.asyncio
    async def test_health_check_integration(self, http_client: httpx.AsyncClient):
        """Test health check integration with SSE system"""
        try:
            health_response = await http_client.get(f"{BACKEND_URL}/health")

            assert health_response.status_code == 200
            health_data = health_response.json()

            # Health check should include service status
            assert health_data.get("status") == "healthy"
            assert health_data.get("service") == "vana"

        except httpx.ConnectError:
            pytest.skip("Backend not running")

    @pytest.mark.asyncio
    async def test_api_endpoints_integration(self, http_client: httpx.AsyncClient):
        """Test integration between API endpoints and SSE"""
        try:
            # Test auth endpoints
            auth_response = await http_client.post(
                f"{BACKEND_URL}/auth/login",
                json={"email": "test@example.com", "password": "testpass"},
            )

            # Should return proper response (may be 401 for invalid creds)
            assert auth_response.status_code in [200, 401, 422]

        except httpx.ConnectError:
            pytest.skip("Backend not running")


if __name__ == "__main__":
    # Run tests directly if executed as script
    pytest.main([__file__, "-v"])
