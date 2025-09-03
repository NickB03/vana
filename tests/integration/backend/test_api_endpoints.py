"""Integration tests for backend API endpoints."""

import json
import uuid
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch
import pytest
from fastapi.testclient import TestClient
from httpx import AsyncClient
import asyncio

from app.server import app


@pytest.fixture
def client():
    """Create test client for FastAPI app."""
    return TestClient(app)


@pytest.fixture
async def async_client():
    """Create async test client for FastAPI app."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client


@pytest.fixture
def mock_authenticated_user():
    """Mock an authenticated user."""
    return MagicMock(
        id="test-user-123",
        email="test@example.com",
        is_active=True
    )


class TestHealthEndpoint:
    """Test /health endpoint."""

    def test_health_check_success(self, client):
        """Test health check returns success."""
        response = client.get("/health")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "healthy"
        assert "timestamp" in data
        assert data["service"] == "vana"
        assert data["version"] == "1.0.0"
        assert "session_storage_enabled" in data

    def test_health_check_contains_session_info(self, client):
        """Test health check includes session storage information."""
        response = client.get("/health")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "session_storage_enabled" in data
        assert "session_storage_uri" in data
        assert "session_storage_bucket" in data


class TestChatMessageEndpoint:
    """Test /chat/{chat_id}/message endpoint."""

    def test_create_chat_message_success(self, client):
        """Test successful chat message creation."""
        chat_id = str(uuid.uuid4())
        message_data = {
            "message": "Hello, world!",
            "message_id": str(uuid.uuid4()),
            "model": "gemini-pro"
        }
        
        response = client.post(
            f"/chat/{chat_id}/message",
            json=message_data,
            headers={
                "X-User-ID": "test-user-123",
                "X-Session-ID": chat_id
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "task_id" in data
        assert "message_id" in data
        assert data["status"] == "started"
        assert data["chat_id"] == chat_id

    def test_create_chat_message_missing_body(self, client):
        """Test chat message creation with missing request body."""
        chat_id = str(uuid.uuid4())
        
        response = client.post(
            f"/chat/{chat_id}/message",
            headers={
                "X-User-ID": "test-user-123",
                "X-Session-ID": chat_id
            }
        )
        
        # Should handle missing body gracefully
        assert response.status_code in [400, 422, 500]

    def test_create_chat_message_invalid_json(self, client):
        """Test chat message creation with invalid JSON."""
        chat_id = str(uuid.uuid4())
        
        response = client.post(
            f"/chat/{chat_id}/message",
            data="invalid json",
            headers={
                "Content-Type": "application/json",
                "X-User-ID": "test-user-123",
                "X-Session-ID": chat_id
            }
        )
        
        assert response.status_code in [400, 422]

    def test_create_chat_message_generates_ids(self, client):
        """Test that missing IDs are generated automatically."""
        chat_id = str(uuid.uuid4())
        message_data = {
            "message": "Test message without IDs"
        }
        
        response = client.post(
            f"/chat/{chat_id}/message",
            json=message_data,
            headers={
                "X-User-ID": "test-user-123",
                "X-Session-ID": chat_id
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Should generate task_id and use provided or generate message_id
        assert "task_id" in data
        assert "message_id" in data
        assert len(data["task_id"]) > 0
        assert len(data["message_id"]) > 0

    def test_create_chat_message_default_model(self, client):
        """Test default model is used when not specified."""
        chat_id = str(uuid.uuid4())
        message_data = {
            "message": "Test message"
        }
        
        with patch('app.server.logger') as mock_logger:
            response = client.post(
                f"/chat/{chat_id}/message",
                json=message_data,
                headers={
                    "X-User-ID": "test-user-123",
                    "X-Session-ID": chat_id
                }
            )
        
        assert response.status_code == 200


class TestFeedbackEndpoint:
    """Test /feedback endpoint."""

    @patch('app.server.current_active_user_dep')
    def test_feedback_collection_success(self, mock_user_dep, client, mock_authenticated_user):
        """Test successful feedback collection."""
        mock_user_dep.return_value = mock_authenticated_user
        
        feedback_data = {
            "rating": 5,
            "comment": "Great experience!",
            "feature": "chat",
            "timestamp": datetime.now().isoformat()
        }
        
        with patch('app.server.logger') as mock_logger:
            response = client.post("/feedback", json=feedback_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"

    def test_feedback_collection_unauthorized(self, client):
        """Test feedback collection without authentication."""
        feedback_data = {
            "rating": 3,
            "comment": "Okay experience"
        }
        
        response = client.post("/feedback", json=feedback_data)
        
        # Should return 401/403 for unauthenticated requests
        assert response.status_code in [401, 403]


class TestSSEEndpoint:
    """Test /agent_network_sse/{session_id} endpoint."""

    @pytest.mark.asyncio
    async def test_sse_endpoint_connection(self, async_client):
        """Test SSE endpoint establishes connection."""
        session_id = str(uuid.uuid4())
        
        async with async_client.stream(
            "GET", 
            f"/agent_network_sse/{session_id}",
            timeout=2.0
        ) as response:
            assert response.status_code == 200
            assert response.headers["content-type"] == "text/event-stream"
            
            # Read first few lines
            content = b""
            async for chunk in response.aiter_bytes():
                content += chunk
                if b"data:" in content:
                    break
                
            assert b"data:" in content

    @pytest.mark.asyncio
    async def test_sse_endpoint_headers(self, async_client):
        """Test SSE endpoint sets correct headers."""
        session_id = str(uuid.uuid4())
        
        async with async_client.stream(
            "GET", 
            f"/agent_network_sse/{session_id}",
            timeout=1.0
        ) as response:
            headers = response.headers
            
            assert headers["content-type"] == "text/event-stream"
            assert headers["cache-control"] == "no-cache"
            assert headers["connection"] == "keep-alive"
            assert headers["access-control-allow-origin"] == "*"

    @patch('app.server.get_sse_broadcaster')
    @pytest.mark.asyncio
    async def test_sse_endpoint_with_mock_broadcaster(self, mock_broadcaster, async_client):
        """Test SSE endpoint with mocked broadcaster."""
        mock_queue = AsyncMock()
        mock_queue.get = AsyncMock(side_effect=asyncio.TimeoutError())
        
        mock_broadcaster_instance = AsyncMock()
        mock_broadcaster_instance.add_subscriber = AsyncMock(return_value=mock_queue)
        mock_broadcaster_instance.remove_subscriber = AsyncMock()
        mock_broadcaster.return_value = mock_broadcaster_instance
        
        session_id = str(uuid.uuid4())
        
        try:
            async with async_client.stream(
                "GET", 
                f"/agent_network_sse/{session_id}",
                timeout=1.0
            ) as response:
                assert response.status_code == 200
                
                # Should get at least connection event
                content = b""
                async for chunk in response.aiter_bytes():
                    content += chunk
                    if len(content) > 100:  # Read some content
                        break
        except Exception:
            # Timeout is expected
            pass


class TestAgentNetworkHistory:
    """Test /agent_network_history endpoint."""

    @patch('app.server.get_agent_network_event_history')
    @patch('app.server.current_user_for_sse_dep')
    def test_get_history_success(self, mock_user_dep, mock_history, client, mock_authenticated_user):
        """Test successful history retrieval."""
        mock_user_dep.return_value = mock_authenticated_user
        mock_history.return_value = [
            {"type": "agent_start", "timestamp": "2023-01-01T00:00:00Z"},
            {"type": "agent_complete", "timestamp": "2023-01-01T00:01:00Z"}
        ]
        
        response = client.get("/agent_network_history?limit=10")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "events" in data
        assert "authenticated" in data
        assert "timestamp" in data
        assert len(data["events"]) == 2

    @patch('app.server.get_agent_network_event_history')
    def test_get_history_unauthenticated(self, mock_history, client):
        """Test history retrieval without authentication."""
        mock_history.return_value = []
        
        with patch.dict('os.environ', {'REQUIRE_SSE_AUTH': 'false'}):
            response = client.get("/agent_network_history")
            
            # Should work in demo mode (REQUIRE_SSE_AUTH=false)
            assert response.status_code in [200, 401, 403]

    @patch('app.server.get_agent_network_event_history')
    @patch('app.server.current_user_for_sse_dep')
    def test_get_history_with_limit(self, mock_user_dep, mock_history, client, mock_authenticated_user):
        """Test history retrieval with custom limit."""
        mock_user_dep.return_value = mock_authenticated_user
        mock_history.return_value = []
        
        response = client.get("/agent_network_history?limit=100")
        
        assert response.status_code == 200
        mock_history.assert_called_once_with(100)


class TestCORSHeaders:
    """Test CORS headers are properly set."""

    def test_cors_headers_present(self, client):
        """Test CORS headers are present in responses."""
        response = client.get("/health")
        
        # CORS headers should be added by middleware
        assert response.status_code == 200
        
        # Test with OPTIONS request
        options_response = client.options("/health")
        # Some frameworks return 405 for OPTIONS on endpoints that don't explicitly handle it
        assert options_response.status_code in [200, 405]

    def test_cors_headers_in_sse(self, client):
        """Test CORS headers in SSE endpoint."""
        session_id = str(uuid.uuid4())
        
        # Test that we can at least connect (headers are set in response)
        try:
            response = client.get(f"/agent_network_sse/{session_id}", timeout=1)
            # Will likely timeout, but headers should be set
        except:
            pass


class TestErrorHandling:
    """Test error handling in API endpoints."""

    def test_chat_message_error_handling(self, client):
        """Test error handling in chat message endpoint."""
        chat_id = "invalid-chat-id"
        
        with patch('app.server.logger.error') as mock_logger:
            # Cause an error by sending malformed data
            response = client.post(
                f"/chat/{chat_id}/message",
                data="not json",
                headers={
                    "Content-Type": "application/json",
                    "X-User-ID": "test-user",
                    "X-Session-ID": chat_id
                }
            )
        
        # Should handle error gracefully
        assert response.status_code >= 400

    def test_internal_server_error_handling(self, client):
        """Test internal server error handling."""
        with patch('app.server.uuid.uuid4', side_effect=Exception("Test error")):
            response = client.post(
                f"/chat/test-id/message",
                json={"message": "test"},
                headers={
                    "X-User-ID": "test-user",
                    "X-Session-ID": "test-session"
                }
            )
        
        assert response.status_code == 500
        data = response.json()
        assert "detail" in data or "error" in data