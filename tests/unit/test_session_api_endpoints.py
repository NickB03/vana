"""
Comprehensive unit tests for session API endpoints.

Tests cover:
- GET /api/sessions (list sessions)
- GET /api/sessions/{id} (get specific session)
- PUT /api/sessions/{id} (update session)
- POST /api/sessions/{id}/messages (add message)
- Authentication and authorization
- Error handling and edge cases
"""

from unittest.mock import Mock, patch

import pytest
from fastapi.testclient import TestClient

from app.server import app
from app.utils.session_store import SessionStore


class TestSessionListEndpoint:
    """Test GET /api/sessions endpoint."""

    def test_list_sessions_empty(self):
        """Test listing sessions when store is empty."""
        with patch("app.server.session_store") as mock_store:
            mock_store.list_sessions.return_value = []

            client = TestClient(app)
            response = client.get("/api/sessions")

            assert response.status_code == 200
            data = response.json()
            assert data["sessions"] == []
            assert data["count"] == 0
            assert "timestamp" in data
            assert "authenticated" in data

    def test_list_sessions_with_data(self):
        """Test listing sessions with multiple sessions."""
        mock_sessions = [
            {
                "id": "session-1",
                "title": "First Session",
                "status": "completed",
                "created_at": "2023-01-01T10:00:00Z",
                "updated_at": "2023-01-01T11:00:00Z",
                "user_id": 1,
                "progress": 1.0,
                "current_phase": None,
                "final_report": "Test report",
                "error": None,
            },
            {
                "id": "session-2",
                "title": "Second Session",
                "status": "running",
                "created_at": "2023-01-01T12:00:00Z",
                "updated_at": "2023-01-01T13:00:00Z",
                "user_id": 2,
                "progress": 0.6,
                "current_phase": "analysis",
                "final_report": None,
                "error": None,
            },
        ]

        with patch("app.server.session_store") as mock_store:
            mock_store.list_sessions.return_value = mock_sessions

            client = TestClient(app)
            response = client.get("/api/sessions")

            assert response.status_code == 200
            data = response.json()
            assert data["count"] == 2
            assert len(data["sessions"]) == 2
            assert data["sessions"][0]["id"] == "session-1"
            assert data["sessions"][1]["id"] == "session-2"
            assert data["authenticated"] is False  # No auth in test

    def test_list_sessions_with_authentication(self):
        """Test listing sessions with authenticated user."""
        mock_user = Mock()
        mock_user.id = 123
        mock_user.email = "test@example.com"

        with (
            patch("app.server.session_store") as mock_store,
            patch("app.server.current_user_for_sse_dep", return_value=mock_user),
        ):
            mock_store.list_sessions.return_value = []

            client = TestClient(app)
            response = client.get("/api/sessions")

            assert response.status_code == 200
            data = response.json()
            assert data["authenticated"] is True

    def test_list_sessions_store_error(self):
        """Test handling of session store errors."""
        with patch("app.server.session_store") as mock_store:
            mock_store.list_sessions.side_effect = Exception("Store error")

            client = TestClient(app)
            response = client.get("/api/sessions")

            # Should handle gracefully or return 500
            assert response.status_code == 500


class TestSessionGetEndpoint:
    """Test GET /api/sessions/{session_id} endpoint."""

    def test_get_session_exists(self):
        """Test retrieving existing session."""
        session_data = {
            "id": "test-session-123",
            "title": "Test Session",
            "status": "running",
            "created_at": "2023-01-01T10:00:00Z",
            "updated_at": "2023-01-01T11:00:00Z",
            "user_id": 1,
            "progress": 0.5,
            "current_phase": "processing",
            "final_report": None,
            "error": None,
            "messages": [
                {
                    "id": "msg-1",
                    "role": "user",
                    "content": "Hello",
                    "timestamp": "2023-01-01T10:00:00Z",
                    "metadata": None,
                },
                {
                    "id": "msg-2",
                    "role": "assistant",
                    "content": "Hi there!",
                    "timestamp": "2023-01-01T10:01:00Z",
                    "metadata": {"type": "response"},
                },
            ],
        }

        with patch("app.server.session_store") as mock_store:
            mock_store.get_session.return_value = session_data

            client = TestClient(app)
            response = client.get("/api/sessions/test-session-123")

            assert response.status_code == 200
            data = response.json()
            assert data["id"] == "test-session-123"
            assert data["title"] == "Test Session"
            assert data["status"] == "running"
            assert len(data["messages"]) == 2
            assert data["messages"][0]["role"] == "user"
            assert data["messages"][1]["role"] == "assistant"
            assert data["authenticated"] is False

    def test_get_session_not_found(self):
        """Test retrieving non-existent session."""
        with patch("app.server.session_store") as mock_store:
            mock_store.get_session.return_value = None

            client = TestClient(app)
            response = client.get("/api/sessions/non-existent")

            assert response.status_code == 404
            assert "Session not found" in response.json()["detail"]

    def test_get_session_with_authentication(self):
        """Test retrieving session with authenticated user."""
        mock_user = Mock()
        mock_user.id = 456
        mock_user.email = "user@example.com"

        session_data = {
            "id": "auth-session",
            "title": "Authenticated Session",
            "status": "completed",
            "created_at": "2023-01-01T10:00:00Z",
            "updated_at": "2023-01-01T11:00:00Z",
            "user_id": 456,
            "progress": 1.0,
            "current_phase": None,
            "final_report": "Complete",
            "error": None,
            "messages": [],
        }

        with (
            patch("app.server.session_store") as mock_store,
            patch("app.server.current_user_for_sse_dep", return_value=mock_user),
        ):
            mock_store.get_session.return_value = session_data

            client = TestClient(app)
            response = client.get("/api/sessions/auth-session")

            assert response.status_code == 200
            data = response.json()
            assert data["authenticated"] is True
            assert data["user_id"] == 456

    def test_get_session_store_error(self):
        """Test handling of session store errors."""
        with patch("app.server.session_store") as mock_store:
            mock_store.get_session.side_effect = Exception("Database error")

            client = TestClient(app)
            response = client.get("/api/sessions/error-session")

            assert response.status_code == 500


class TestSessionUpdateEndpoint:
    """Test PUT /api/sessions/{session_id} endpoint."""

    def test_update_session_title(self):
        """Test updating session title."""
        updated_record = Mock()
        updated_record.to_dict.return_value = {
            "id": "update-session",
            "title": "Updated Title",
            "status": "running",
            "created_at": "2023-01-01T10:00:00Z",
            "updated_at": "2023-01-01T12:00:00Z",
            "user_id": 1,
            "progress": 0.3,
            "current_phase": "processing",
            "final_report": None,
            "error": None,
        }

        with patch("app.server.session_store") as mock_store:
            mock_store.update_session.return_value = updated_record

            client = TestClient(app)
            response = client.put(
                "/api/sessions/update-session", json={"title": "Updated Title"}
            )

            assert response.status_code == 200
            data = response.json()
            assert data["title"] == "Updated Title"
            assert data["authenticated"] is False

            # Verify store was called correctly
            mock_store.update_session.assert_called_once_with(
                "update-session", title="Updated Title"
            )

    def test_update_session_status(self):
        """Test updating session status."""
        updated_record = Mock()
        updated_record.to_dict.return_value = {
            "id": "status-session",
            "title": "Test Session",
            "status": "completed",
            "created_at": "2023-01-01T10:00:00Z",
            "updated_at": "2023-01-01T12:00:00Z",
            "user_id": 1,
            "progress": 1.0,
            "current_phase": "finished",
            "final_report": "Done",
            "error": None,
        }

        with patch("app.server.session_store") as mock_store:
            mock_store.update_session.return_value = updated_record

            client = TestClient(app)
            response = client.put(
                "/api/sessions/status-session", json={"status": "completed"}
            )

            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "completed"

            mock_store.update_session.assert_called_once_with(
                "status-session", status="completed"
            )

    def test_update_session_multiple_fields(self):
        """Test updating multiple session fields."""
        updated_record = Mock()
        updated_record.to_dict.return_value = {
            "id": "multi-session",
            "title": "Multi Update",
            "status": "error",
            "created_at": "2023-01-01T10:00:00Z",
            "updated_at": "2023-01-01T12:00:00Z",
            "user_id": 1,
            "progress": 0.8,
            "current_phase": "failed",
            "final_report": None,
            "error": "Something went wrong",
        }

        with patch("app.server.session_store") as mock_store:
            mock_store.update_session.return_value = updated_record

            client = TestClient(app)
            response = client.put(
                "/api/sessions/multi-session",
                json={"title": "Multi Update", "status": "error"},
            )

            assert response.status_code == 200
            data = response.json()
            assert data["title"] == "Multi Update"
            assert data["status"] == "error"

            mock_store.update_session.assert_called_once_with(
                "multi-session", title="Multi Update", status="error"
            )

    def test_update_session_null_values_ignored(self):
        """Test that null values in payload are ignored."""
        updated_record = Mock()
        updated_record.to_dict.return_value = {
            "id": "null-session",
            "title": "Original Title",
            "status": "running",
            "created_at": "2023-01-01T10:00:00Z",
            "updated_at": "2023-01-01T12:00:00Z",
            "user_id": 1,
            "progress": 0.5,
            "current_phase": "processing",
            "final_report": None,
            "error": None,
        }

        with patch("app.server.session_store") as mock_store:
            mock_store.update_session.return_value = updated_record

            client = TestClient(app)
            response = client.put(
                "/api/sessions/null-session", json={"title": None, "status": "updated"}
            )

            assert response.status_code == 200

            # Only status should be passed, not title (null)
            mock_store.update_session.assert_called_once_with(
                "null-session", status="updated"
            )

    def test_update_session_empty_payload(self):
        """Test updating session with empty payload."""
        updated_record = Mock()
        updated_record.to_dict.return_value = {
            "id": "empty-session",
            "title": "Unchanged",
            "status": "running",
            "created_at": "2023-01-01T10:00:00Z",
            "updated_at": "2023-01-01T12:00:00Z",
            "user_id": 1,
            "progress": 0.5,
            "current_phase": "processing",
            "final_report": None,
            "error": None,
        }

        with patch("app.server.session_store") as mock_store:
            mock_store.update_session.return_value = updated_record

            client = TestClient(app)
            response = client.put("/api/sessions/empty-session", json={})

            assert response.status_code == 200

            # Should still call update_session but with no arguments
            mock_store.update_session.assert_called_once_with("empty-session")

    def test_update_session_with_authentication(self):
        """Test updating session with authenticated user."""
        mock_user = Mock()
        mock_user.id = 789
        mock_user.email = "update@example.com"

        updated_record = Mock()
        updated_record.to_dict.return_value = {
            "id": "auth-update-session",
            "title": "Auth Updated",
            "status": "running",
            "created_at": "2023-01-01T10:00:00Z",
            "updated_at": "2023-01-01T12:00:00Z",
            "user_id": 789,
            "progress": 0.7,
            "current_phase": "processing",
            "final_report": None,
            "error": None,
        }

        with (
            patch("app.server.session_store") as mock_store,
            patch("app.server.current_user_for_sse_dep", return_value=mock_user),
        ):
            mock_store.update_session.return_value = updated_record

            client = TestClient(app)
            response = client.put(
                "/api/sessions/auth-update-session", json={"title": "Auth Updated"}
            )

            assert response.status_code == 200
            data = response.json()
            assert data["authenticated"] is True

    def test_update_session_store_error(self):
        """Test handling of session store errors during update."""
        with patch("app.server.session_store") as mock_store:
            mock_store.update_session.side_effect = Exception("Update failed")

            client = TestClient(app)
            response = client.put(
                "/api/sessions/error-session", json={"title": "Should Fail"}
            )

            assert response.status_code == 500


class TestSessionMessageEndpoint:
    """Test POST /api/sessions/{session_id}/messages endpoint."""

    def test_add_message_user(self):
        """Test adding user message to session."""
        stored_message = Mock()
        stored_message.to_dict.return_value = {
            "id": "msg-user-123",
            "role": "user",
            "content": "Hello, assistant!",
            "timestamp": "2023-01-01T10:00:00Z",
            "metadata": None,
        }

        with patch("app.server.session_store") as mock_store:
            mock_store.add_message.return_value = stored_message
            mock_store.update_session.return_value = Mock()

            client = TestClient(app)
            response = client.post(
                "/api/sessions/msg-session/messages",
                json={
                    "id": "msg-user-123",
                    "role": "user",
                    "content": "Hello, assistant!",
                    "timestamp": "2023-01-01T10:00:00",
                },
            )

            assert response.status_code == 200
            data = response.json()
            assert data["id"] == "msg-user-123"
            assert data["role"] == "user"
            assert data["content"] == "Hello, assistant!"
            assert data["sessionId"] == "msg-session"
            assert data["authenticated"] is False

            # Verify store calls
            mock_store.add_message.assert_called_once()
            mock_store.update_session.assert_called_once_with(
                "msg-session",
                status="running",
                user_id=None,
                title="Hello, assistant!",  # Should use content as title for user messages
            )

    def test_add_message_assistant(self):
        """Test adding assistant message to session."""
        stored_message = Mock()
        stored_message.to_dict.return_value = {
            "id": "msg-assistant-456",
            "role": "assistant",
            "content": "I'm here to help!",
            "timestamp": "2023-01-01T10:01:00Z",
            "metadata": {"type": "response"},
        }

        with patch("app.server.session_store") as mock_store:
            mock_store.add_message.return_value = stored_message
            mock_store.update_session.return_value = Mock()

            client = TestClient(app)
            response = client.post(
                "/api/sessions/assistant-session/messages",
                json={
                    "role": "assistant",
                    "content": "I'm here to help!",
                    "timestamp": "2023-01-01T10:01:00",
                    "metadata": {"type": "response"},
                },
            )

            assert response.status_code == 200
            data = response.json()
            assert data["role"] == "assistant"
            assert data["metadata"]["type"] == "response"

            # Title should be None for assistant messages
            mock_store.update_session.assert_called_once_with(
                "assistant-session", status="running", user_id=None, title=None
            )

    def test_add_message_with_authentication(self):
        """Test adding message with authenticated user."""
        mock_user = Mock()
        mock_user.id = 999
        mock_user.email = "message@example.com"

        stored_message = Mock()
        stored_message.to_dict.return_value = {
            "id": "msg-auth-789",
            "role": "user",
            "content": "Authenticated message",
            "timestamp": "2023-01-01T10:00:00Z",
            "metadata": None,
        }

        with (
            patch("app.server.session_store") as mock_store,
            patch("app.server.current_user_for_sse_dep", return_value=mock_user),
        ):
            mock_store.add_message.return_value = stored_message
            mock_store.update_session.return_value = Mock()

            client = TestClient(app)
            response = client.post(
                "/api/sessions/auth-msg-session/messages",
                json={
                    "role": "user",
                    "content": "Authenticated message",
                    "timestamp": "2023-01-01T10:00:00",
                },
            )

            assert response.status_code == 200
            data = response.json()
            assert data["authenticated"] is True

            # Should update session with user_id
            mock_store.update_session.assert_called_once_with(
                "auth-msg-session",
                status="running",
                user_id=999,
                title="Authenticated message",
            )

    def test_add_message_auto_id(self):
        """Test adding message without ID generates one."""
        stored_message = Mock()
        stored_message.to_dict.return_value = {
            "id": "auto-generated-id",
            "role": "user",
            "content": "No ID provided",
            "timestamp": "2023-01-01T10:00:00Z",
            "metadata": None,
        }

        with patch("app.server.session_store") as mock_store:
            mock_store.add_message.return_value = stored_message
            mock_store.update_session.return_value = Mock()

            client = TestClient(app)
            response = client.post(
                "/api/sessions/auto-id-session/messages",
                json={
                    "role": "user",
                    "content": "No ID provided",
                    "timestamp": "2023-01-01T10:00:00",
                },
            )

            assert response.status_code == 200
            data = response.json()
            assert data["id"] == "auto-generated-id"

    def test_add_message_long_content_title_truncation(self):
        """Test that long user message content is truncated for title."""
        long_content = "This is a very long user message that should be truncated when used as the session title because it exceeds the 60 character limit that is set in the code"

        stored_message = Mock()
        stored_message.to_dict.return_value = {
            "id": "msg-long-content",
            "role": "user",
            "content": long_content,
            "timestamp": "2023-01-01T10:00:00Z",
            "metadata": None,
        }

        with patch("app.server.session_store") as mock_store:
            mock_store.add_message.return_value = stored_message
            mock_store.update_session.return_value = Mock()

            client = TestClient(app)
            response = client.post(
                "/api/sessions/long-content-session/messages",
                json={
                    "role": "user",
                    "content": long_content,
                    "timestamp": "2023-01-01T10:00:00",
                },
            )

            assert response.status_code == 200

            # Title should be truncated to 60 characters
            expected_title = long_content[:60]
            mock_store.update_session.assert_called_once_with(
                "long-content-session",
                status="running",
                user_id=None,
                title=expected_title,
            )

    def test_add_message_invalid_timestamp(self):
        """Test handling of invalid timestamp format."""
        client = TestClient(app)
        response = client.post(
            "/api/sessions/invalid-time-session/messages",
            json={
                "role": "user",
                "content": "Invalid time",
                "timestamp": "not-a-valid-timestamp",
            },
        )

        # Should return 422 for validation error
        assert response.status_code == 422

    def test_add_message_missing_required_fields(self):
        """Test handling of missing required fields."""
        client = TestClient(app)

        # Missing content
        response1 = client.post(
            "/api/sessions/missing-fields-session/messages",
            json={"role": "user", "timestamp": "2023-01-01T10:00:00"},
        )
        assert response1.status_code == 422

        # Missing timestamp
        response2 = client.post(
            "/api/sessions/missing-fields-session/messages",
            json={"role": "user", "content": "Missing timestamp"},
        )
        assert response2.status_code == 422

    def test_add_message_store_error(self):
        """Test handling of session store errors during message addition."""
        with patch("app.server.session_store") as mock_store:
            mock_store.add_message.side_effect = Exception("Message add failed")

            client = TestClient(app)
            response = client.post(
                "/api/sessions/error-msg-session/messages",
                json={
                    "role": "user",
                    "content": "Should fail",
                    "timestamp": "2023-01-01T10:00:00",
                },
            )

            assert response.status_code == 500


class TestSessionEndpointsIntegration:
    """Test integration scenarios across session endpoints."""

    def test_full_session_workflow(self):
        """Test complete session workflow: create, update, add messages, retrieve."""
        # Use real session store for integration test
        test_store = SessionStore()

        with patch("app.server.session_store", test_store):
            client = TestClient(app)
            session_id = "integration-session"

            # 1. Add first message (creates session)
            response1 = client.post(
                f"/api/sessions/{session_id}/messages",
                json={
                    "role": "user",
                    "content": "Start integration test",
                    "timestamp": "2023-01-01T10:00:00",
                },
            )
            assert response1.status_code == 200

            # 2. Update session title
            response2 = client.put(
                f"/api/sessions/{session_id}",
                json={"title": "Integration Test Session"},
            )
            assert response2.status_code == 200
            assert response2.json()["title"] == "Integration Test Session"

            # 3. Add assistant response
            response3 = client.post(
                f"/api/sessions/{session_id}/messages",
                json={
                    "role": "assistant",
                    "content": "Integration test response",
                    "timestamp": "2023-01-01T10:01:00",
                },
            )
            assert response3.status_code == 200

            # 4. Get full session
            response4 = client.get(f"/api/sessions/{session_id}")
            assert response4.status_code == 200
            session_data = response4.json()
            assert session_data["title"] == "Integration Test Session"
            assert len(session_data["messages"]) == 2
            assert session_data["messages"][0]["role"] == "user"
            assert session_data["messages"][1]["role"] == "assistant"

            # 5. List sessions should include our session
            response5 = client.get("/api/sessions")
            assert response5.status_code == 200
            sessions_data = response5.json()
            assert sessions_data["count"] == 1
            assert sessions_data["sessions"][0]["id"] == session_id

    def test_concurrent_session_operations(self):
        """Test concurrent operations on same session."""
        from concurrent.futures import ThreadPoolExecutor

        test_store = SessionStore()

        with patch("app.server.session_store", test_store):
            client = TestClient(app)
            session_id = "concurrent-session"

            def add_message(thread_id):
                """Add message from a thread."""
                return client.post(
                    f"/api/sessions/{session_id}/messages",
                    json={
                        "id": f"msg-thread-{thread_id}",
                        "role": "user",
                        "content": f"Message from thread {thread_id}",
                        "timestamp": "2023-01-01T10:00:00",
                    },
                )

            def update_session(field_value):
                """Update session from a thread."""
                field, value = field_value
                return client.put(f"/api/sessions/{session_id}", json={field: value})

            # Run concurrent operations
            with ThreadPoolExecutor(max_workers=8) as executor:
                # Submit message additions
                message_futures = [executor.submit(add_message, i) for i in range(5)]

                # Submit session updates
                update_futures = [
                    executor.submit(update_session, ("title", f"Updated Title {i}"))
                    for i in range(3)
                ]

                # Wait for all operations
                message_results = [f.result() for f in message_futures]
                update_results = [f.result() for f in update_futures]

            # All operations should succeed
            for result in message_results + update_results:
                assert result.status_code == 200

            # Verify final state
            response = client.get(f"/api/sessions/{session_id}")
            assert response.status_code == 200
            session_data = response.json()
            assert len(session_data["messages"]) == 5  # All messages added


@pytest.fixture
def mock_authenticated_user():
    """Fixture for mock authenticated user."""
    user = Mock()
    user.id = 12345
    user.email = "test@example.com"
    return user


def test_session_endpoints_require_proper_json():
    """Test that endpoints properly validate JSON payloads."""
    client = TestClient(app)

    # Test invalid JSON for update endpoint
    response1 = client.put(
        "/api/sessions/test-session",
        content="invalid-json",
        headers={"Content-Type": "application/json"},
    )
    assert response1.status_code == 422

    # Test invalid JSON for message endpoint
    response2 = client.post(
        "/api/sessions/test-session/messages",
        content="invalid-json",
        headers={"Content-Type": "application/json"},
    )
    assert response2.status_code == 422


def test_session_endpoints_handle_large_payloads():
    """Test handling of large payloads."""
    with patch("app.server.session_store") as mock_store:
        stored_message = Mock()
        stored_message.to_dict.return_value = {
            "id": "large-msg",
            "role": "user",
            "content": "x" * 10000,  # Large content
            "timestamp": "2023-01-01T10:00:00Z",
            "metadata": None,
        }
        mock_store.add_message.return_value = stored_message
        mock_store.update_session.return_value = Mock()

        client = TestClient(app)
        large_content = "x" * 10000  # 10KB message

        response = client.post(
            "/api/sessions/large-session/messages",
            json={
                "role": "user",
                "content": large_content,
                "timestamp": "2023-01-01T10:00:00",
            },
        )

        assert response.status_code == 200
