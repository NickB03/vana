"""
Comprehensive Integration Tests for Vana ADK System
Tests all critical integration points identified in the issues report
"""

import pytest
import asyncio
import json
from unittest.mock import Mock, patch, AsyncMock
from fastapi.testclient import TestClient
from fastapi import WebSocket
import websockets
from typing import Dict, Any, List

# Import the actual application components
import sys
sys.path.append('/Users/nick/Development/vana')
from app.server import app, SessionStore
from app.agent import ResearchAgent
from app.config import Settings


class TestMessageFormatValidation:
    """Test message format consistency between frontend and backend"""
    
    @pytest.fixture
    def client(self):
        return TestClient(app)
    
    def test_message_format_from_frontend(self, client):
        """Test that backend properly handles frontend message format"""
        # Frontend sends this format
        frontend_message = {
            "type": "user_message",
            "content": "Test message",
            "session_id": "test-session-123"
        }
        
        response = client.post("/api/messages", json=frontend_message)
        
        # Should transform to agent format internally
        assert response.status_code == 200
        data = response.json()
        assert "message_id" in data
        assert data["status"] == "received"
    
    def test_message_format_to_frontend(self, client):
        """Test that backend sends correct format to frontend"""
        # Send message and check response format
        message = {
            "type": "user_message", 
            "content": "Test",
            "session_id": "test-123"
        }
        
        response = client.post("/api/messages", json=message)
        data = response.json()
        
        # Frontend expects this format
        assert "content" in data or "data" in data
        assert "type" in data or "role" in data
    
    @pytest.mark.asyncio
    async def test_websocket_message_format(self):
        """Test WebSocket message format consistency"""
        async with websockets.connect("ws://localhost:8000/ws") as websocket:
            # Send frontend format
            await websocket.send(json.dumps({
                "type": "user_message",
                "content": "Test WebSocket"
            }))
            
            # Receive and validate response format
            response = await websocket.recv()
            data = json.loads(response)
            
            assert "type" in data
            assert data["type"] in ["agent_response", "thinking", "error"]


class TestSessionManagement:
    """Test session persistence and management"""
    
    @pytest.fixture
    def session_store(self):
        return SessionStore()
    
    def test_session_creation(self, session_store):
        """Test that sessions are created properly"""
        session_id = session_store.create_session(user_id="test-user")
        
        assert session_id is not None
        assert session_store.get_session(session_id) is not None
        assert session_store.get_session(session_id)["user_id"] == "test-user"
    
    def test_session_persistence(self, session_store):
        """Test that sessions persist across operations"""
        session_id = session_store.create_session(user_id="test-user")
        
        # Add data to session
        session_store.update_session(session_id, {"messages": ["test1", "test2"]})
        
        # Retrieve session
        session = session_store.get_session(session_id)
        assert "messages" in session
        assert len(session["messages"]) == 2
    
    @pytest.mark.asyncio
    async def test_session_cleanup(self, session_store):
        """Test that sessions are properly cleaned up"""
        session_id = session_store.create_session(user_id="test-user")
        
        # Simulate session timeout
        await asyncio.sleep(0.1)
        
        # Session should still exist (no auto-cleanup in test timeframe)
        assert session_store.get_session(session_id) is not None
        
        # Manual cleanup
        session_store.close_session(session_id)
        assert session_store.get_session(session_id) is None


class TestADKIntegration:
    """Test ADK agent integration"""
    
    @pytest.fixture
    def agent(self):
        return ResearchAgent()
    
    @pytest.mark.asyncio
    async def test_agent_message_processing(self, agent):
        """Test that agent processes messages correctly"""
        message = {
            "message": "Research quantum computing",
            "session_id": "test-session"
        }
        
        # Process message
        response = await agent.process_message(message)
        
        assert response is not None
        assert "content" in response or "data" in response
        assert "type" in response
    
    @pytest.mark.asyncio
    async def test_agent_error_handling(self, agent):
        """Test agent error handling"""
        # Send malformed message
        bad_message = {"invalid": "format"}
        
        with pytest.raises(ValueError):
            await agent.process_message(bad_message)


class TestWebSocketLifecycle:
    """Test WebSocket connection lifecycle"""
    
    @pytest.mark.asyncio
    async def test_websocket_connection(self):
        """Test WebSocket connection establishment"""
        async with websockets.connect("ws://localhost:8000/ws") as ws:
            # Connection should be established
            assert ws.open
            
            # Send ping
            await ws.ping()
            
            # Should receive pong
            pong = await ws.wait_closed_or_pong()
            assert pong is not None
    
    @pytest.mark.asyncio
    async def test_websocket_reconnection(self):
        """Test WebSocket reconnection logic"""
        # First connection
        ws1 = await websockets.connect("ws://localhost:8000/ws")
        await ws1.close()
        
        # Reconnection should work
        ws2 = await websockets.connect("ws://localhost:8000/ws")
        assert ws2.open
        await ws2.close()
    
    @pytest.mark.asyncio
    async def test_websocket_heartbeat(self):
        """Test WebSocket heartbeat mechanism"""
        async with websockets.connect("ws://localhost:8000/ws") as ws:
            # Send heartbeat
            await ws.send(json.dumps({"type": "ping"}))
            
            # Should receive pong
            response = await ws.recv()
            data = json.loads(response)
            assert data["type"] == "pong"


class TestSSEConnection:
    """Test Server-Sent Events connection"""
    
    @pytest.fixture
    def client(self):
        return TestClient(app)
    
    def test_sse_stream_connection(self, client):
        """Test SSE stream connection"""
        with client.stream("GET", "/sse") as response:
            assert response.status_code == 200
            assert response.headers["content-type"] == "text/event-stream"
    
    def test_sse_message_format(self, client):
        """Test SSE message format"""
        with client.stream("GET", "/sse") as response:
            # Read first message
            for line in response.iter_lines():
                if line.startswith(b"data: "):
                    data = json.loads(line[6:])
                    assert "type" in data
                    break


class TestErrorHandling:
    """Test error handling and recovery"""
    
    @pytest.fixture
    def client(self):
        return TestClient(app)
    
    def test_malformed_request_handling(self, client):
        """Test handling of malformed requests"""
        response = client.post("/api/messages", json={})
        assert response.status_code == 422  # Validation error
    
    def test_error_propagation(self, client):
        """Test that errors propagate correctly to frontend"""
        response = client.post("/api/messages", json={
            "type": "user_message",
            "content": None,  # Invalid content
            "session_id": "test"
        })
        
        assert response.status_code == 400
        data = response.json()
        assert "error" in data or "detail" in data
    
    @pytest.mark.asyncio
    async def test_websocket_error_handling(self):
        """Test WebSocket error handling"""
        async with websockets.connect("ws://localhost:8000/ws") as ws:
            # Send invalid JSON
            await ws.send("invalid json")
            
            # Should receive error response
            response = await ws.recv()
            data = json.loads(response)
            assert data["type"] == "error"


class TestMemoryLeaks:
    """Test for memory leaks in connections"""
    
    @pytest.mark.asyncio
    async def test_connection_cleanup(self):
        """Test that connections are properly cleaned up"""
        connections = []
        
        # Create multiple connections
        for _ in range(10):
            ws = await websockets.connect("ws://localhost:8000/ws")
            connections.append(ws)
        
        # Close all connections
        for ws in connections:
            await ws.close()
        
        # All connections should be closed
        assert all(not ws.open for ws in connections)
    
    def test_session_memory_cleanup(self):
        """Test session memory cleanup"""
        store = SessionStore()
        
        # Create many sessions
        session_ids = []
        for i in range(100):
            sid = store.create_session(user_id=f"user-{i}")
            session_ids.append(sid)
        
        # Clean up sessions
        for sid in session_ids:
            store.close_session(sid)
        
        # All sessions should be removed
        assert all(store.get_session(sid) is None for sid in session_ids)


class TestPerformance:
    """Test performance and optimization"""
    
    @pytest.fixture
    def client(self):
        return TestClient(app)
    
    @pytest.mark.asyncio
    async def test_concurrent_requests(self, client):
        """Test handling of concurrent requests"""
        tasks = []
        
        async def send_message(i):
            response = client.post("/api/messages", json={
                "type": "user_message",
                "content": f"Test {i}",
                "session_id": f"session-{i}"
            })
            return response.status_code == 200
        
        # Send 50 concurrent requests
        for i in range(50):
            tasks.append(send_message(i))
        
        results = await asyncio.gather(*tasks)
        assert all(results)
    
    @pytest.mark.asyncio
    async def test_message_processing_speed(self, agent):
        """Test message processing performance"""
        import time
        
        start = time.time()
        
        # Process multiple messages
        for i in range(10):
            await agent.process_message({
                "message": f"Test message {i}",
                "session_id": "perf-test"
            })
        
        elapsed = time.time() - start
        
        # Should process 10 messages in reasonable time
        assert elapsed < 10  # Less than 1 second per message


# Integration test suite runner
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])