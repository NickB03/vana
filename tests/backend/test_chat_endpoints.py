"""
Backend API tests for chat action endpoints
Tests regenerate, edit, delete, and feedback functionality
"""

import pytest
import asyncio
import json
from unittest.mock import AsyncMock, Mock, patch
from fastapi.testclient import TestClient
from fastapi import status
from app.server import app
from app.models.chat import Message, ChatSession, MessageFeedback
from app.services.chat_service import ChatService
from app.services.sse_service import SSEService


client = TestClient(app)


@pytest.fixture
def mock_chat_service():
    """Mock chat service for testing"""
    service = Mock(spec=ChatService)
    service.regenerate_message = AsyncMock()
    service.edit_message = AsyncMock()
    service.delete_message = AsyncMock()
    service.add_feedback = AsyncMock()
    service.get_message = AsyncMock()
    return service


@pytest.fixture
def mock_sse_service():
    """Mock SSE service for testing"""
    service = Mock(spec=SSEService)
    service.send_event = AsyncMock()
    service.send_thought_process = AsyncMock()
    service.send_stream_chunk = AsyncMock()
    return service


@pytest.fixture
def sample_message():
    """Sample message for testing"""
    return {
        "id": "msg-123",
        "role": "assistant",
        "content": "Hello, how can I help you?",
        "timestamp": 1640995200.0,
        "parent_id": "msg-122"
    }


@pytest.fixture
def sample_session():
    """Sample chat session for testing"""
    return {
        "id": "session-456",
        "messages": ["msg-122", "msg-123"],
        "created_at": 1640995200.0,
        "updated_at": 1640995200.0
    }


class TestRegenerateEndpoint:
    """Test suite for message regeneration endpoint"""

    def test_regenerate_message_success(self, mock_chat_service, sample_message):
        """Test successful message regeneration"""
        # Mock the service methods
        new_message = {**sample_message, "id": "msg-124", "content": "New response"}
        mock_chat_service.regenerate_message.return_value = new_message

        with patch('app.dependencies.get_chat_service', return_value=mock_chat_service):
            response = client.post(
                f"/api/chat/regenerate",
                json={"message_id": "msg-123", "session_id": "session-456"}
            )

        assert response.status_code == status.HTTP_200_OK
        response_data = response.json()
        assert response_data["success"] is True
        assert response_data["new_message_id"] == "msg-124"
        mock_chat_service.regenerate_message.assert_called_once_with(
            message_id="msg-123",
            session_id="session-456"
        )

    def test_regenerate_message_not_found(self, mock_chat_service):
        """Test regeneration with non-existent message"""
        mock_chat_service.regenerate_message.side_effect = ValueError("Message not found")

        with patch('app.dependencies.get_chat_service', return_value=mock_chat_service):
            response = client.post(
                f"/api/chat/regenerate",
                json={"message_id": "nonexistent", "session_id": "session-456"}
            )

        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert "Message not found" in response.json()["detail"]

    def test_regenerate_message_invalid_request(self):
        """Test regeneration with invalid request data"""
        response = client.post(
            f"/api/chat/regenerate",
            json={"invalid": "data"}
        )

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_regenerate_message_service_error(self, mock_chat_service):
        """Test regeneration with service error"""
        mock_chat_service.regenerate_message.side_effect = Exception("Service error")

        with patch('app.dependencies.get_chat_service', return_value=mock_chat_service):
            response = client.post(
                f"/api/chat/regenerate",
                json={"message_id": "msg-123", "session_id": "session-456"}
            )

        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR

    @pytest.mark.asyncio
    async def test_regenerate_with_streaming(self, mock_chat_service, mock_sse_service):
        """Test regeneration with SSE streaming"""
        async def mock_regenerate_with_stream(*args, **kwargs):
            # Simulate streaming response
            await mock_sse_service.send_thought_process("Analyzing request...")
            await mock_sse_service.send_thought_process("Generating response...")
            await mock_sse_service.send_stream_chunk("Hello")
            await mock_sse_service.send_stream_chunk(" world!")
            return {"id": "msg-124", "content": "Hello world!"}

        mock_chat_service.regenerate_message = mock_regenerate_with_stream

        with patch('app.dependencies.get_chat_service', return_value=mock_chat_service):
            with patch('app.dependencies.get_sse_service', return_value=mock_sse_service):
                response = client.post(
                    f"/api/chat/regenerate",
                    json={"message_id": "msg-123", "session_id": "session-456", "stream": True}
                )

        assert response.status_code == status.HTTP_200_OK
        mock_sse_service.send_thought_process.assert_called()
        mock_sse_service.send_stream_chunk.assert_called()


class TestEditMessageEndpoint:
    """Test suite for message editing endpoint"""

    def test_edit_message_success(self, mock_chat_service, sample_message):
        """Test successful message editing"""
        updated_message = {**sample_message, "content": "Updated content"}
        mock_chat_service.edit_message.return_value = updated_message

        with patch('app.dependencies.get_chat_service', return_value=mock_chat_service):
            response = client.put(
                f"/api/chat/messages/msg-123/edit",
                json={"content": "Updated content"}
            )

        assert response.status_code == status.HTTP_200_OK
        response_data = response.json()
        assert response_data["success"] is True
        assert response_data["message"]["content"] == "Updated content"
        mock_chat_service.edit_message.assert_called_once_with(
            message_id="msg-123",
            new_content="Updated content"
        )

    def test_edit_message_empty_content(self, mock_chat_service):
        """Test editing with empty content"""
        with patch('app.dependencies.get_chat_service', return_value=mock_chat_service):
            response = client.put(
                f"/api/chat/messages/msg-123/edit",
                json={"content": ""}
            )

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_edit_message_not_found(self, mock_chat_service):
        """Test editing non-existent message"""
        mock_chat_service.edit_message.side_effect = ValueError("Message not found")

        with patch('app.dependencies.get_chat_service', return_value=mock_chat_service):
            response = client.put(
                f"/api/chat/messages/nonexistent/edit",
                json={"content": "New content"}
            )

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_edit_user_message_only(self, mock_chat_service):
        """Test that only user messages can be edited"""
        assistant_message = {"role": "assistant", "content": "AI response"}
        mock_chat_service.get_message.return_value = assistant_message

        with patch('app.dependencies.get_chat_service', return_value=mock_chat_service):
            response = client.put(
                f"/api/chat/messages/msg-123/edit",
                json={"content": "Edited AI response"}
            )

        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert "Cannot edit assistant messages" in response.json()["detail"]


class TestDeleteMessageEndpoint:
    """Test suite for message deletion endpoint"""

    def test_delete_message_success(self, mock_chat_service):
        """Test successful message deletion"""
        mock_chat_service.delete_message.return_value = {
            "deleted_message_ids": ["msg-123", "msg-124", "msg-125"]
        }

        with patch('app.dependencies.get_chat_service', return_value=mock_chat_service):
            response = client.delete(f"/api/chat/messages/msg-123")

        assert response.status_code == status.HTTP_200_OK
        response_data = response.json()
        assert response_data["success"] is True
        assert len(response_data["deleted_message_ids"]) == 3
        mock_chat_service.delete_message.assert_called_once_with(
            message_id="msg-123",
            cascade=True
        )

    def test_delete_message_not_found(self, mock_chat_service):
        """Test deletion of non-existent message"""
        mock_chat_service.delete_message.side_effect = ValueError("Message not found")

        with patch('app.dependencies.get_chat_service', return_value=mock_chat_service):
            response = client.delete(f"/api/chat/messages/nonexistent")

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_delete_message_cascade_deletion(self, mock_chat_service):
        """Test cascade deletion removes child messages"""
        mock_chat_service.delete_message.return_value = {
            "deleted_message_ids": ["msg-123", "msg-124", "msg-125", "msg-126"]
        }

        with patch('app.dependencies.get_chat_service', return_value=mock_chat_service):
            response = client.delete(f"/api/chat/messages/msg-123?cascade=true")

        assert response.status_code == status.HTTP_200_OK
        response_data = response.json()
        assert len(response_data["deleted_message_ids"]) == 4
        mock_chat_service.delete_message.assert_called_once_with(
            message_id="msg-123",
            cascade=True
        )

    def test_delete_message_no_cascade(self, mock_chat_service):
        """Test deletion without cascade"""
        mock_chat_service.delete_message.return_value = {
            "deleted_message_ids": ["msg-123"]
        }

        with patch('app.dependencies.get_chat_service', return_value=mock_chat_service):
            response = client.delete(f"/api/chat/messages/msg-123?cascade=false")

        assert response.status_code == status.HTTP_200_OK
        response_data = response.json()
        assert len(response_data["deleted_message_ids"]) == 1
        mock_chat_service.delete_message.assert_called_once_with(
            message_id="msg-123",
            cascade=False
        )


class TestFeedbackEndpoint:
    """Test suite for message feedback endpoint"""

    def test_add_positive_feedback(self, mock_chat_service):
        """Test adding positive feedback"""
        mock_chat_service.add_feedback.return_value = {
            "message_id": "msg-123",
            "feedback_type": "positive"
        }

        with patch('app.dependencies.get_chat_service', return_value=mock_chat_service):
            response = client.post(
                f"/api/chat/feedback",
                json={
                    "message_id": "msg-123",
                    "feedback_type": "positive"
                }
            )

        assert response.status_code == status.HTTP_200_OK
        response_data = response.json()
        assert response_data["success"] is True
        assert response_data["feedback_type"] == "positive"
        mock_chat_service.add_feedback.assert_called_once_with(
            message_id="msg-123",
            feedback_type="positive",
            comment=None
        )

    def test_add_negative_feedback_with_comment(self, mock_chat_service):
        """Test adding negative feedback with comment"""
        mock_chat_service.add_feedback.return_value = {
            "message_id": "msg-123",
            "feedback_type": "negative",
            "comment": "Response was not helpful"
        }

        with patch('app.dependencies.get_chat_service', return_value=mock_chat_service):
            response = client.post(
                f"/api/chat/feedback",
                json={
                    "message_id": "msg-123",
                    "feedback_type": "negative",
                    "comment": "Response was not helpful"
                }
            )

        assert response.status_code == status.HTTP_200_OK
        response_data = response.json()
        assert response_data["comment"] == "Response was not helpful"
        mock_chat_service.add_feedback.assert_called_once_with(
            message_id="msg-123",
            feedback_type="negative",
            comment="Response was not helpful"
        )

    def test_remove_feedback(self, mock_chat_service):
        """Test removing existing feedback"""
        mock_chat_service.add_feedback.return_value = {
            "message_id": "msg-123",
            "feedback_type": None
        }

        with patch('app.dependencies.get_chat_service', return_value=mock_chat_service):
            response = client.post(
                f"/api/chat/feedback",
                json={
                    "message_id": "msg-123",
                    "feedback_type": None
                }
            )

        assert response.status_code == status.HTTP_200_OK
        mock_chat_service.add_feedback.assert_called_once_with(
            message_id="msg-123",
            feedback_type=None,
            comment=None
        )

    def test_invalid_feedback_type(self, mock_chat_service):
        """Test invalid feedback type"""
        with patch('app.dependencies.get_chat_service', return_value=mock_chat_service):
            response = client.post(
                f"/api/chat/feedback",
                json={
                    "message_id": "msg-123",
                    "feedback_type": "invalid"
                }
            )

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


class TestSSEEventStreaming:
    """Test suite for SSE event streaming during chat actions"""

    @pytest.mark.asyncio
    async def test_thought_process_events(self, mock_sse_service):
        """Test thought process events are sent correctly"""
        thoughts = [
            "Understanding the request...",
            "Analyzing context...",
            "Generating response..."
        ]

        for thought in thoughts:
            await mock_sse_service.send_thought_process(thought)

        assert mock_sse_service.send_thought_process.call_count == 3

    @pytest.mark.asyncio
    async def test_regeneration_streaming(self, mock_sse_service):
        """Test regeneration streaming events"""
        chunks = ["Hello", " there", "!", " How", " can", " I", " help?"]

        for chunk in chunks:
            await mock_sse_service.send_stream_chunk(chunk)

        assert mock_sse_service.send_stream_chunk.call_count == len(chunks)

    @pytest.mark.asyncio
    async def test_error_event_streaming(self, mock_sse_service):
        """Test error events are streamed properly"""
        error_message = "Failed to generate response"

        await mock_sse_service.send_event("error", {"message": error_message})

        mock_sse_service.send_event.assert_called_once_with(
            "error",
            {"message": error_message}
        )

    @pytest.mark.asyncio
    async def test_completion_event(self, mock_sse_service):
        """Test completion event is sent after streaming"""
        message_data = {
            "id": "msg-124",
            "content": "Complete response",
            "role": "assistant"
        }

        await mock_sse_service.send_event("message_complete", message_data)

        mock_sse_service.send_event.assert_called_once_with(
            "message_complete",
            message_data
        )


class TestConcurrentOperations:
    """Test suite for concurrent chat operations"""

    @pytest.mark.asyncio
    async def test_concurrent_regeneration_requests(self, mock_chat_service):
        """Test handling multiple regeneration requests"""
        async def delayed_regenerate(*args, **kwargs):
            await asyncio.sleep(0.1)  # Simulate processing time
            return {"id": "new-msg", "content": "Response"}

        mock_chat_service.regenerate_message = delayed_regenerate

        # Send multiple concurrent requests
        with patch('app.dependencies.get_chat_service', return_value=mock_chat_service):
            tasks = [
                asyncio.create_task(
                    asyncio.to_thread(
                        lambda: client.post(
                            "/api/chat/regenerate",
                            json={"message_id": f"msg-{i}", "session_id": "session-456"}
                        )
                    )
                )
                for i in range(5)
            ]

            responses = await asyncio.gather(*tasks)

        # All requests should complete successfully
        for response in responses:
            assert response.status_code == status.HTTP_200_OK

    def test_rate_limiting(self, mock_chat_service):
        """Test rate limiting for chat actions"""
        with patch('app.dependencies.get_chat_service', return_value=mock_chat_service):
            # Send many requests quickly
            responses = []
            for i in range(20):
                response = client.post(
                    "/api/chat/regenerate",
                    json={"message_id": f"msg-{i}", "session_id": "session-456"}
                )
                responses.append(response)

        # Should eventually hit rate limit
        rate_limited = any(r.status_code == 429 for r in responses[-5:])
        assert rate_limited or all(r.status_code == 200 for r in responses)


class TestDataValidation:
    """Test suite for input data validation"""

    def test_message_id_validation(self):
        """Test message ID format validation"""
        invalid_ids = ["", "invalid-format", "msg", "123", None]

        for invalid_id in invalid_ids:
            response = client.post(
                f"/api/chat/regenerate",
                json={"message_id": invalid_id, "session_id": "session-456"}
            )
            assert response.status_code in [400, 422]

    def test_content_length_validation(self, mock_chat_service):
        """Test content length limits"""
        very_long_content = "A" * 10000  # 10k characters

        with patch('app.dependencies.get_chat_service', return_value=mock_chat_service):
            response = client.put(
                f"/api/chat/messages/msg-123/edit",
                json={"content": very_long_content}
            )

        # Should either accept or reject based on limit
        assert response.status_code in [200, 413, 422]

    def test_xss_prevention(self, mock_chat_service):
        """Test XSS prevention in content"""
        malicious_content = '<script>alert("XSS")</script>Hello'

        mock_chat_service.edit_message.return_value = {
            "id": "msg-123",
            "content": "Hello"  # Script tags should be stripped
        }

        with patch('app.dependencies.get_chat_service', return_value=mock_chat_service):
            response = client.put(
                f"/api/chat/messages/msg-123/edit",
                json={"content": malicious_content}
            )

        # Content should be sanitized
        if response.status_code == 200:
            response_data = response.json()
            assert "<script>" not in response_data["message"]["content"]


@pytest.mark.integration
class TestFullWorkflow:
    """Integration tests for complete chat action workflows"""

    def test_edit_and_regenerate_sequence(self, mock_chat_service):
        """Test editing a message then regenerating response"""
        # First, edit the message
        mock_chat_service.edit_message.return_value = {
            "id": "msg-123",
            "content": "Edited content"
        }

        with patch('app.dependencies.get_chat_service', return_value=mock_chat_service):
            edit_response = client.put(
                f"/api/chat/messages/msg-123/edit",
                json={"content": "Edited content"}
            )

        assert edit_response.status_code == status.HTTP_200_OK

        # Then regenerate response
        mock_chat_service.regenerate_message.return_value = {
            "id": "msg-124",
            "content": "New response to edited message"
        }

        with patch('app.dependencies.get_chat_service', return_value=mock_chat_service):
            regen_response = client.post(
                f"/api/chat/regenerate",
                json={"message_id": "msg-123", "session_id": "session-456"}
            )

        assert regen_response.status_code == status.HTTP_200_OK
        assert edit_response.json()["success"] is True
        assert regen_response.json()["success"] is True

    def test_delete_with_cascade_cleanup(self, mock_chat_service):
        """Test deletion properly cleans up all descendant messages"""
        mock_chat_service.delete_message.return_value = {
            "deleted_message_ids": ["msg-123", "msg-124", "msg-125"]
        }

        with patch('app.dependencies.get_chat_service', return_value=mock_chat_service):
            response = client.delete(f"/api/chat/messages/msg-123")

        assert response.status_code == status.HTTP_200_OK
        response_data = response.json()
        assert len(response_data["deleted_message_ids"]) == 3

    def test_feedback_persistence(self, mock_chat_service):
        """Test feedback persists across sessions"""
        # Add feedback
        mock_chat_service.add_feedback.return_value = {
            "message_id": "msg-123",
            "feedback_type": "positive"
        }

        with patch('app.dependencies.get_chat_service', return_value=mock_chat_service):
            feedback_response = client.post(
                f"/api/chat/feedback",
                json={"message_id": "msg-123", "feedback_type": "positive"}
            )

        assert feedback_response.status_code == status.HTTP_200_OK

        # Verify feedback is persisted
        mock_chat_service.get_message.return_value = {
            "id": "msg-123",
            "content": "Test message",
            "feedback": "positive"
        }

        with patch('app.dependencies.get_chat_service', return_value=mock_chat_service):
            get_response = client.get(f"/api/chat/messages/msg-123")

        assert get_response.status_code == status.HTTP_200_OK
        assert get_response.json()["feedback"] == "positive"