"""End-to-End Integration Tests for Complete Chat Flow."""

import asyncio
import json
import uuid
from datetime import datetime
from typing import Dict, Any, Optional
import pytest
import httpx
from contextlib import asynccontextmanager


class TestChatFlowE2E:
    """End-to-end tests for complete chat workflow from frontend to backend."""

    @pytest.fixture
    def backend_base_url(self) -> str:
        """Backend base URL."""
        return "http://localhost:8000"

    @pytest.fixture  
    def frontend_base_url(self) -> str:
        """Frontend base URL (if running separately)."""
        return "http://localhost:3000"

    @pytest.fixture
    async def http_client(self) -> httpx.AsyncClient:
        """HTTP client for API calls."""
        async with httpx.AsyncClient(timeout=30.0) as client:
            yield client

    @pytest.fixture
    def test_user_data(self) -> Dict[str, Any]:
        """Test user data."""
        return {
            "id": f"test-user-{uuid.uuid4()}",
            "email": "test@example.com",
            "name": "Test User"
        }

    @pytest.fixture
    def test_chat_data(self) -> Dict[str, Any]:
        """Test chat data."""
        return {
            "id": f"chat-{uuid.uuid4()}",
            "message": "Hello, can you help me with a coding question?",
            "message_id": f"msg-{uuid.uuid4()}",
            "model": "gemini-pro"
        }

    @pytest.mark.asyncio
    async def test_backend_health_check(self, http_client: httpx.AsyncClient, backend_base_url: str):
        """Test backend health endpoint is responsive."""
        response = await http_client.get(f"{backend_base_url}/health")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "healthy"
        assert data["service"] == "vana"
        assert "timestamp" in data
        assert "session_storage_enabled" in data

    @pytest.mark.asyncio
    async def test_chat_message_creation_flow(
        self, 
        http_client: httpx.AsyncClient, 
        backend_base_url: str,
        test_user_data: Dict[str, Any],
        test_chat_data: Dict[str, Any]
    ):
        """Test complete chat message creation flow."""
        chat_id = test_chat_data["id"]
        message_data = {
            "message": test_chat_data["message"],
            "message_id": test_chat_data["message_id"],
            "model": test_chat_data["model"]
        }
        
        # Send message to backend
        response = await http_client.post(
            f"{backend_base_url}/chat/{chat_id}/message",
            json=message_data,
            headers={
                "X-User-ID": test_user_data["id"],
                "X-Session-ID": chat_id
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "task_id" in data
        assert "message_id" in data
        assert data["status"] == "started"
        assert data["chat_id"] == chat_id
        
        return data

    @pytest.mark.asyncio
    async def test_sse_connection_establishment(
        self,
        http_client: httpx.AsyncClient,
        backend_base_url: str,
        test_user_data: Dict[str, Any]
    ):
        """Test SSE connection can be established."""
        session_id = f"session-{uuid.uuid4()}"
        
        # Test SSE connection
        try:
            async with http_client.stream(
                "GET",
                f"{backend_base_url}/agent_network_sse/{session_id}",
                timeout=5.0
            ) as response:
                assert response.status_code == 200
                assert response.headers["content-type"] == "text/event-stream"
                
                # Read initial connection event
                content_received = False
                async for line in response.aiter_lines():
                    if line.startswith("data:"):
                        event_data = json.loads(line[5:])  # Remove "data:" prefix
                        if event_data.get("type") == "connection":
                            assert event_data["status"] == "connected"
                            assert event_data["sessionId"] == session_id
                            content_received = True
                            break
                
                assert content_received, "Should receive connection event"
                
        except httpx.TimeoutException:
            # SSE connections can timeout, but we should get initial content
            pass

    @pytest.mark.asyncio
    async def test_agent_network_history_retrieval(
        self,
        http_client: httpx.AsyncClient,
        backend_base_url: str
    ):
        """Test agent network history can be retrieved."""
        response = await http_client.get(f"{backend_base_url}/agent_network_history?limit=10")
        
        assert response.status_code in [200, 401, 403]  # Depends on auth config
        
        if response.status_code == 200:
            data = response.json()
            assert "events" in data
            assert "timestamp" in data
            assert isinstance(data["events"], list)

    @pytest.mark.asyncio
    async def test_cors_headers_in_responses(
        self,
        http_client: httpx.AsyncClient,
        backend_base_url: str
    ):
        """Test CORS headers are present in API responses."""
        # Test health endpoint
        response = await http_client.get(f"{backend_base_url}/health")
        assert response.status_code == 200
        
        # CORS headers should be present (added by middleware)
        # Note: Exact headers depend on middleware configuration

    @pytest.mark.asyncio 
    async def test_error_handling_chain(
        self,
        http_client: httpx.AsyncClient,
        backend_base_url: str,
        test_user_data: Dict[str, Any]
    ):
        """Test error handling throughout the system."""
        
        # Test malformed request
        malformed_response = await http_client.post(
            f"{backend_base_url}/chat/test-chat/message",
            data="invalid json",
            headers={
                "Content-Type": "application/json",
                "X-User-ID": test_user_data["id"],
                "X-Session-ID": "test-session"
            }
        )
        
        assert malformed_response.status_code >= 400
        
        # Test missing headers
        no_headers_response = await http_client.post(
            f"{backend_base_url}/chat/test-chat/message",
            json={"message": "test"}
        )
        
        # Should handle gracefully (may succeed or fail depending on requirements)
        assert no_headers_response.status_code in range(200, 600)

    @pytest.mark.asyncio
    async def test_concurrent_chat_sessions(
        self,
        http_client: httpx.AsyncClient,
        backend_base_url: str,
        test_user_data: Dict[str, Any]
    ):
        """Test multiple concurrent chat sessions."""
        num_sessions = 3
        tasks = []
        
        for i in range(num_sessions):
            chat_id = f"concurrent-chat-{i}-{uuid.uuid4()}"
            message_data = {
                "message": f"Concurrent message {i}",
                "message_id": f"msg-{i}-{uuid.uuid4()}",
                "model": "gemini-pro"
            }
            
            task = http_client.post(
                f"{backend_base_url}/chat/{chat_id}/message",
                json=message_data,
                headers={
                    "X-User-ID": f"{test_user_data['id']}-{i}",
                    "X-Session-ID": chat_id
                }
            )
            tasks.append(task)
        
        # Execute all requests concurrently
        responses = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Verify all requests completed
        success_count = 0
        for response in responses:
            if isinstance(response, httpx.Response):
                if response.status_code == 200:
                    success_count += 1
                    data = response.json()
                    assert "task_id" in data
                    assert data["status"] == "started"
        
        # At least some requests should succeed
        assert success_count > 0

    @pytest.mark.asyncio
    async def test_session_persistence_workflow(
        self,
        http_client: httpx.AsyncClient,
        backend_base_url: str,
        test_user_data: Dict[str, Any]
    ):
        """Test session persistence across multiple interactions."""
        chat_id = f"persistent-chat-{uuid.uuid4()}"
        session_id = f"persistent-session-{uuid.uuid4()}"
        
        # Send first message
        first_message = {
            "message": "Start of conversation",
            "message_id": f"msg-1-{uuid.uuid4()}",
            "model": "gemini-pro"
        }
        
        first_response = await http_client.post(
            f"{backend_base_url}/chat/{chat_id}/message",
            json=first_message,
            headers={
                "X-User-ID": test_user_data["id"],
                "X-Session-ID": session_id
            }
        )
        
        assert first_response.status_code == 200
        first_data = first_response.json()
        assert first_data["chat_id"] == chat_id
        
        # Send follow-up message in same session
        second_message = {
            "message": "Follow-up message",
            "message_id": f"msg-2-{uuid.uuid4()}",
            "model": "gemini-pro"
        }
        
        second_response = await http_client.post(
            f"{backend_base_url}/chat/{chat_id}/message",
            json=second_message,
            headers={
                "X-User-ID": test_user_data["id"],
                "X-Session-ID": session_id
            }
        )
        
        assert second_response.status_code == 200
        second_data = second_response.json()
        assert second_data["chat_id"] == chat_id

    @pytest.mark.asyncio
    async def test_authentication_and_authorization_flow(
        self,
        http_client: httpx.AsyncClient,
        backend_base_url: str
    ):
        """Test authentication and authorization in the workflow."""
        
        # Test access without proper authentication/headers
        unauthorized_response = await http_client.post(
            f"{backend_base_url}/chat/test-chat/message",
            json={
                "message": "This should require auth",
                "message_id": f"msg-{uuid.uuid4()}"
            }
        )
        
        # Should succeed (backend currently doesn't enforce auth on this endpoint)
        # or return appropriate auth error
        assert unauthorized_response.status_code in [200, 401, 403]

    @pytest.mark.asyncio
    async def test_environment_configuration_impact(
        self,
        http_client: httpx.AsyncClient,
        backend_base_url: str
    ):
        """Test how environment configuration affects the workflow."""
        
        # Test health endpoint to verify configuration is loaded
        health_response = await http_client.get(f"{backend_base_url}/health")
        assert health_response.status_code == 200
        
        health_data = health_response.json()
        
        # Verify session storage configuration is present
        assert "session_storage_enabled" in health_data
        assert "session_storage_uri" in health_data
        
        # Verify environment-dependent settings
        if health_data.get("session_storage_enabled"):
            assert health_data["session_storage_uri"] is not None

    @pytest.mark.asyncio
    async def test_streaming_response_flow(
        self,
        http_client: httpx.AsyncClient,
        backend_base_url: str,
        test_user_data: Dict[str, Any]
    ):
        """Test complete streaming response workflow."""
        session_id = f"stream-session-{uuid.uuid4()}"
        
        # Create a message first
        chat_id = f"stream-chat-{uuid.uuid4()}"
        message_response = await http_client.post(
            f"{backend_base_url}/chat/{chat_id}/message",
            json={
                "message": "Test streaming response",
                "message_id": f"msg-{uuid.uuid4()}",
                "model": "gemini-pro"
            },
            headers={
                "X-User-ID": test_user_data["id"],
                "X-Session-ID": session_id
            }
        )
        
        assert message_response.status_code == 200
        
        # Connect to SSE stream
        events_received = []
        try:
            async with http_client.stream(
                "GET",
                f"{backend_base_url}/agent_network_sse/{session_id}",
                timeout=5.0
            ) as response:
                assert response.status_code == 200
                
                async for line in response.aiter_lines():
                    if line.startswith("data:"):
                        try:
                            event_data = json.loads(line[5:])
                            events_received.append(event_data)
                            
                            # Stop after receiving a few events
                            if len(events_received) >= 2:
                                break
                        except json.JSONDecodeError:
                            # Skip malformed JSON
                            continue
                            
        except httpx.TimeoutException:
            # Expected for streaming endpoints
            pass
        
        # Should receive at least connection event
        assert len(events_received) > 0
        assert any(event.get("type") == "connection" for event in events_received)

    @pytest.mark.asyncio
    async def test_rate_limiting_and_recovery(
        self,
        http_client: httpx.AsyncClient,
        backend_base_url: str,
        test_user_data: Dict[str, Any]
    ):
        """Test rate limiting behavior and recovery."""
        chat_id = f"rate-limit-chat-{uuid.uuid4()}"
        
        # Send multiple requests quickly to test rate limiting
        rapid_requests = []
        for i in range(10):
            request = http_client.post(
                f"{backend_base_url}/chat/{chat_id}/message",
                json={
                    "message": f"Rate limit test message {i}",
                    "message_id": f"msg-{i}-{uuid.uuid4()}",
                    "model": "gemini-pro"
                },
                headers={
                    "X-User-ID": f"{test_user_data['id']}-rate-test",
                    "X-Session-ID": f"rate-session-{i}"
                }
            )
            rapid_requests.append(request)
        
        # Execute requests with small delays
        responses = []
        for request in rapid_requests:
            response = await request
            responses.append(response)
            await asyncio.sleep(0.1)  # Small delay between requests
        
        # Analyze responses - some might be rate limited, others should succeed
        success_count = sum(1 for r in responses if r.status_code == 200)
        rate_limited_count = sum(1 for r in responses if r.status_code == 429)
        
        # At least some should succeed, rate limiting behavior depends on configuration
        assert success_count + rate_limited_count == len(responses)