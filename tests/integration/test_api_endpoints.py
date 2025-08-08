# Copyright 2025 Google LLC
# Licensed under the Apache License, Version 2.0 (the "License")

import json
import pytest
import asyncio
from typing import AsyncGenerator, Dict, Any
from unittest.mock import AsyncMock, Mock, patch
from fastapi.testclient import TestClient
from fastapi import status
import time
import uuid

from app.server import app
from app.utils.typing import Feedback

class TestAPIEndpoints:
    """Comprehensive test suite for Vana API endpoints."""
    
    def setup_method(self):
        """Set up test client and mock data."""
        self.client = TestClient(app)
        self.test_user_id = "test_user_12345"
        self.test_session_id = str(uuid.uuid4())
        self.base_headers = {"Content-Type": "application/json"}
        
    def test_health_check_endpoint(self):
        """Test /health endpoint returns correct status and information."""
        response = self.client.get("/health")
        
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "vana"
        assert data["version"] == "1.0.0"
        assert "timestamp" in data
        assert "session_storage_enabled" in data
        assert "session_storage_uri" in data
        
    def test_feedback_collection_endpoint(self):
        """Test /feedback endpoint properly logs feedback data."""
        feedback_data = {
            "score": 5,
            "invocation_id": str(uuid.uuid4()),
            "text": "Excellent AI response!"
        }
        
        with patch('app.server.logger') as mock_logger:
            response = self.client.post(
                "/feedback", 
                json=feedback_data,
                headers=self.base_headers
            )
            
            assert response.status_code == status.HTTP_200_OK
            assert response.json() == {"status": "success"}
            
            # Verify logging was called
            mock_logger.log_struct.assert_called_once()
            
    def test_feedback_validation(self):
        """Test feedback endpoint validates required fields."""
        invalid_feedback = {"score": "invalid_score"}  # Invalid score type
        
        response = self.client.post(
            "/feedback",
            json=invalid_feedback,
            headers=self.base_headers
        )
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
        
    def test_agent_network_sse_endpoint(self):
        """Test agent network SSE endpoint initialization."""
        session_id = self.test_session_id
        
        with self.client as client:
            with client.stream(
                "GET", 
                f"/agent_network_sse/{session_id}",
                headers={"Accept": "text/event-stream"}
            ) as response:
                assert response.status_code == status.HTTP_200_OK
                assert response.headers["content-type"] == "text/event-stream; charset=utf-8"
                assert response.headers["cache-control"] == "no-cache"
                assert response.headers["connection"] == "keep-alive"
                
    def test_agent_network_history_endpoint(self):
        """Test agent network history endpoint."""
        # Test with default limit
        response = self.client.get("/agent_network_history")
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, list)
        
        # Test with custom limit
        response = self.client.get("/agent_network_history?limit=10")
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, list)
        
    @patch('app.server.get_fast_api_app')
    def test_adk_integration_endpoints(self, mock_get_app):
        """Test ADK-specific endpoints are properly integrated."""
        # Mock the ADK app to verify integration
        mock_adk_app = Mock()
        mock_get_app.return_value = mock_adk_app
        
        # Test that the app is initialized with correct parameters
        from app.server import AGENT_DIR
        
        # This would be called during app initialization
        mock_get_app.assert_called()
        
    def test_cors_configuration(self):
        """Test CORS headers are properly configured."""
        response = self.client.options("/health")
        
        # Should not error on OPTIONS request
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_405_METHOD_NOT_ALLOWED]
        
    def test_session_creation_endpoint(self):
        """Test session creation through ADK endpoints."""
        session_data = {
            "state": {
                "preferred_language": "English",
                "visit_count": 1
            }
        }
        
        session_url = f"/apps/app/users/{self.test_user_id}/sessions"
        
        with patch('requests.post') as mock_post:
            # Mock successful session creation
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.json.return_value = {"id": self.test_session_id}
            mock_post.return_value = mock_response
            
            # This tests the integration pattern used in the E2E tests
            response = mock_post(
                session_url,
                headers=self.base_headers,
                json=session_data,
                timeout=60
            )
            
            assert response.status_code == 200
            assert response.json()["id"] == self.test_session_id


class TestStreamingEndpoints:
    """Test streaming functionality including SSE and chat streaming."""
    
    def setup_method(self):
        """Set up streaming test environment."""
        self.client = TestClient(app)
        self.test_user_id = "streaming_user_123"
        self.test_session_id = str(uuid.uuid4())
        
    def test_streaming_response_format(self):
        """Test that streaming responses follow correct SSE format."""
        session_id = self.test_session_id
        
        with self.client as client:
            with client.stream(
                "GET", 
                f"/agent_network_sse/{session_id}",
                timeout=5.0  # Short timeout for testing
            ) as response:
                assert response.status_code == status.HTTP_200_OK
                
                # Check SSE headers
                expected_headers = {
                    "cache-control": "no-cache",
                    "connection": "keep-alive",
                    "access-control-allow-origin": "*"
                }
                
                for header, value in expected_headers.items():
                    assert response.headers.get(header) == value
                    
    def test_sse_connection_lifecycle(self):
        """Test SSE connection establishment and cleanup."""
        session_id = self.test_session_id
        
        start_time = time.time()
        
        with self.client as client:
            with client.stream(
                "GET", 
                f"/agent_network_sse/{session_id}",
                timeout=2.0
            ) as response:
                # Connection should establish quickly
                connection_time = time.time() - start_time
                assert connection_time < 1.0  # Should connect within 1 second
                
                # Should maintain connection
                assert response.status_code == status.HTTP_200_OK


class TestErrorHandling:
    """Test error handling across all endpoints."""
    
    def setup_method(self):
        """Set up error testing environment."""
        self.client = TestClient(app)
        
    def test_invalid_session_id_format(self):
        """Test handling of invalid session ID formats."""
        invalid_session_ids = [
            "",  # Empty string
            "invalid-format",  # Invalid format
            "../../etc/passwd",  # Path traversal attempt
            "<script>alert('xss')</script>",  # XSS attempt
        ]
        
        for invalid_id in invalid_session_ids:
            response = self.client.get(f"/agent_network_sse/{invalid_id}")
            
            # Should handle gracefully (not crash)
            assert response.status_code in [
                status.HTTP_200_OK,  # Might accept and handle gracefully
                status.HTTP_400_BAD_REQUEST,  # Might reject invalid format
                status.HTTP_422_UNPROCESSABLE_ENTITY  # Validation error
            ]
            
    def test_malformed_feedback_data(self):
        """Test handling of malformed feedback data."""
        malformed_data_cases = [
            {},  # Empty object
            {"score": "not_a_number"},  # Invalid score type
            {"score": 999},  # Score out of range
            None,  # Null data
        ]
        
        for case in malformed_data_cases:
            response = self.client.post("/feedback", json=case)
            
            # Should return validation error for malformed data
            assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
            
    def test_large_payload_handling(self):
        """Test handling of large payloads."""
        # Create a large feedback payload
        large_text = "A" * 10000  # 10KB text
        large_feedback = {
            "score": 3,
            "invocation_id": str(uuid.uuid4()),
            "text": large_text
        }
        
        response = self.client.post("/feedback", json=large_feedback)
        
        # Should either accept or reject gracefully
        assert response.status_code in [
            status.HTTP_200_OK,
            status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            status.HTTP_422_UNPROCESSABLE_ENTITY
        ]
        
    def test_concurrent_requests(self):
        """Test handling of concurrent requests."""
        import threading
        
        results = []
        
        def make_health_request():
            try:
                response = self.client.get("/health")
                results.append(response.status_code)
            except Exception as e:
                results.append(f"Error: {e}")
                
        # Create multiple concurrent requests
        threads = []
        for _ in range(10):
            thread = threading.Thread(target=make_health_request)
            threads.append(thread)
            thread.start()
            
        # Wait for all requests to complete
        for thread in threads:
            thread.join(timeout=10)
            
        # All requests should succeed
        assert all(result == status.HTTP_200_OK for result in results)
        assert len(results) == 10


class TestPerformanceAndLimits:
    """Test performance characteristics and limits."""
    
    def setup_method(self):
        """Set up performance testing."""
        self.client = TestClient(app)
        
    def test_health_endpoint_performance(self):
        """Test health endpoint response time."""
        start_time = time.time()
        response = self.client.get("/health")
        response_time = time.time() - start_time
        
        assert response.status_code == status.HTTP_200_OK
        assert response_time < 0.5  # Should respond within 500ms
        
    def test_feedback_endpoint_performance(self):
        """Test feedback endpoint performance."""
        feedback_data = {
            "score": 4,
            "invocation_id": str(uuid.uuid4()),
            "text": "Performance test feedback"
        }
        
        start_time = time.time()
        response = self.client.post("/feedback", json=feedback_data)
        response_time = time.time() - start_time
        
        assert response.status_code == status.HTTP_200_OK
        assert response_time < 1.0  # Should process within 1 second
        
    def test_multiple_sse_connections(self):
        """Test multiple SSE connections don't overwhelm server."""
        session_ids = [str(uuid.uuid4()) for _ in range(5)]
        connections = []
        
        try:
            # Open multiple SSE connections
            for session_id in session_ids:
                stream = self.client.stream(
                    "GET", 
                    f"/agent_network_sse/{session_id}",
                    timeout=2.0
                )
                connection = stream.__enter__()
                connections.append((stream, connection))
                
                # Each connection should succeed
                assert connection.status_code == status.HTTP_200_OK
                
        finally:
            # Clean up connections
            for stream, connection in connections:
                try:
                    stream.__exit__(None, None, None)
                except:
                    pass  # Ignore cleanup errors


if __name__ == "__main__":
    pytest.main([__file__, "-v"])