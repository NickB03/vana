"""
Integration tests for session management functionality.

Tests comprehensive workflows combining:
- SessionStore operations
- API endpoint interactions
- SSE event processing
- Backup/restore operations
- Real-world usage scenarios
"""

import tempfile
import time
import uuid
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from unittest.mock import Mock, patch

import pytest
from fastapi.testclient import TestClient

from app.server import app
from app.utils.session_store import SessionStore


class TestSessionLifecycleIntegration:
    """Test complete session lifecycle scenarios."""

    def test_research_session_full_workflow(self):
        """Test complete research session from start to finish."""
        test_store = SessionStore()

        with patch("app.server.session_store", test_store):
            client = TestClient(app)
            session_id = f"research-workflow-{uuid.uuid4()}"

            # 1. Start research session via POST
            research_query = "Analyze climate change impact on agriculture"

            # FIXED: ADK agents run on port 8080, no orchestrator needed
            response = client.post(
                f"/api/run_sse/{session_id}", json={"query": research_query}
            )

            assert response.status_code == 200
                data = response.json()
                assert data["success"] is True
                assert data["session_id"] == session_id

                # Verify orchestrator was called
                mock_orch_instance.start_research_with_broadcasting.assert_called_once()

            # 2. Simulate SSE events coming in
            events = [
                {
                    "type": "research_started",
                    "data": {"status": "running", "current_phase": "initialization"},
                },
                {
                    "type": "research_progress",
                    "data": {
                        "overall_progress": 25,
                        "current_phase": "data_collection",
                        "partial_results": {"sources_found": "15 academic papers"},
                    },
                },
                {
                    "type": "research_progress",
                    "data": {
                        "overall_progress": 75,
                        "current_phase": "analysis",
                        "partial_results": {
                            "key_insights": "Temperature rise correlation"
                        },
                    },
                },
                {
                    "type": "research_complete",
                    "data": {
                        "status": "completed",
                        "overall_progress": 100,
                        "final_report": "Climate change significantly impacts crop yields...",
                    },
                },
            ]

            # Process events through session store
            for event in events:
                test_store.ingest_event(session_id, event)

            # 3. Verify session state via API
            response = client.get(f"/api/sessions/{session_id}")
            assert response.status_code == 200

            session_data = response.json()
            assert session_data["status"] == "completed"
            assert session_data["progress"] == 1.0
            assert (
                session_data["final_report"]
                == "Climate change significantly impacts crop yields..."
            )
            assert len(session_data["messages"]) >= 2  # User query + progress messages

            # Verify user message
            user_messages = [m for m in session_data["messages"] if m["role"] == "user"]
            assert len(user_messages) == 1
            assert user_messages[0]["content"] == research_query

            # Verify progress message
            progress_messages = [
                m
                for m in session_data["messages"]
                if m.get("metadata", {}).get("kind") == "assistant-progress"
            ]
            assert len(progress_messages) == 1
            assert progress_messages[0]["metadata"]["completed"] is True

            # 4. Update session title
            response = client.put(
                f"/api/sessions/{session_id}",
                json={"title": "Climate Change Agriculture Analysis"},
            )
            assert response.status_code == 200

            # 5. Add follow-up message
            response = client.post(
                f"/api/sessions/{session_id}/messages",
                json={
                    "role": "user",
                    "content": "Can you provide more details on adaptation strategies?",
                    "timestamp": datetime.now().isoformat(),
                },
            )
            assert response.status_code == 200

            # 6. Verify final session state
            response = client.get(f"/api/sessions/{session_id}")
            session_data = response.json()

            assert session_data["title"] == "Climate Change Agriculture Analysis"
            assert len(session_data["messages"]) >= 3  # Original + progress + follow-up

    def test_multiple_concurrent_sessions(self):
        """Test handling multiple concurrent research sessions."""
        test_store = SessionStore()

        with patch("app.server.session_store", test_store):
            client = TestClient(app)

            def create_and_process_session(session_index):
                """Create and process a session in a thread."""
                session_id = f"concurrent-session-{session_index}"

                # Start session (ADK agents handle the research)
                response = client.post(
                    f"/api/run_sse/{session_id}",
                    json={"query": f"Research topic {session_index}"},
                )
                assert response.status_code == 200

                # Process events
                for progress in [25, 50, 75, 100]:
                    event = {
                        "type": "research_progress"
                        if progress < 100
                        else "research_complete",
                        "data": {
                            "overall_progress": progress,
                            "current_phase": f"phase_{progress}",
                            "status": "completed" if progress == 100 else "running",
                        },
                    }
                    if progress == 100:
                        event["data"]["final_report"] = (
                            f"Results for session {session_index}"
                        )

                    test_store.ingest_event(session_id, event)

                # Add messages
                for i in range(3):
                    client.post(
                        f"/api/sessions/{session_id}/messages",
                        json={
                            "role": "user" if i % 2 == 0 else "assistant",
                            "content": f"Message {i} for session {session_index}",
                            "timestamp": datetime.now().isoformat(),
                        },
                    )

                return session_id

            # Run concurrent sessions
            num_sessions = 8
            with ThreadPoolExecutor(max_workers=num_sessions) as executor:
                futures = [
                    executor.submit(create_and_process_session, i)
                    for i in range(num_sessions)
                ]

                session_ids = [future.result() for future in as_completed(futures)]

            # Verify all sessions were created and processed correctly
            assert len(session_ids) == num_sessions

            response = client.get("/api/sessions")
            assert response.status_code == 200

            sessions_data = response.json()
            assert sessions_data["count"] == num_sessions

            # Verify each session
            for session_id in session_ids:
                response = client.get(f"/api/sessions/{session_id}")
                assert response.status_code == 200

                session_data = response.json()
                assert session_data["status"] == "completed"
                assert session_data["progress"] == 1.0
                assert (
                    len(session_data["messages"]) >= 4
                )  # User query + progress + 3 added messages

    def test_session_error_handling_workflow(self):
        """Test session handling when errors occur during research."""
        test_store = SessionStore()

        with patch("app.server.session_store", test_store):
            client = TestClient(app)
            session_id = f"error-workflow-{uuid.uuid4()}"

            # Start session (ADK agents handle the research)
            response = client.post(
                f"/api/run_sse/{session_id}", json={"query": "Test error handling"}
            )
            assert response.status_code == 200

            # Simulate initial progress
            test_store.ingest_event(
                session_id,
                {
                    "type": "research_started",
                    "data": {"status": "running", "current_phase": "initialization"},
                },
            )

            test_store.ingest_event(
                session_id,
                {
                    "type": "research_progress",
                    "data": {
                        "overall_progress": 30,
                        "current_phase": "data_collection",
                    },
                },
            )

            # Simulate error
            test_store.ingest_event(
                session_id,
                {
                    "type": "error",
                    "data": {"error": "API rate limit exceeded", "status": "failed"},
                },
            )

            # Check session state
            response = client.get(f"/api/sessions/{session_id}")
            assert response.status_code == 200

            session_data = response.json()
            assert session_data["status"] == "failed"
            assert session_data["error"] == "API rate limit exceeded"
            assert session_data["progress"] == 0.3  # Should preserve last progress

            # Try to update session to retry
            response = client.put(
                f"/api/sessions/{session_id}",
                json={"status": "retrying", "error": None},
            )
            assert response.status_code == 200

            # Simulate successful retry
            test_store.ingest_event(
                session_id,
                {
                    "type": "research_complete",
                    "data": {
                        "status": "completed",
                        "overall_progress": 100,
                        "final_report": "Successfully completed after retry",
                    },
                },
            )

            # Verify final state
            response = client.get(f"/api/sessions/{session_id}")
            session_data = response.json()
            assert session_data["status"] == "completed"
            assert session_data["final_report"] == "Successfully completed after retry"

    def test_session_authentication_workflow(self):
        """Test session operations with authentication."""
        test_store = SessionStore()
        mock_user = Mock()
        mock_user.id = 12345
        mock_user.email = "test@example.com"

        with (
            patch("app.server.session_store", test_store),
            patch("app.server.current_user_for_sse_dep", return_value=mock_user),
        ):
            client = TestClient(app)
            session_id = f"auth-workflow-{uuid.uuid4()}"

            # Start authenticated session (ADK agents handle the research)
            response = client.post(
                f"/api/run_sse/{session_id}",
                json={"query": "Authenticated research query"},
            )
            assert response.status_code == 200

            # Add authenticated message
            response = client.post(
                f"/api/sessions/{session_id}/messages",
                json={
                    "role": "user",
                    "content": "Authenticated user message",
                    "timestamp": datetime.now().isoformat(),
                },
            )
            assert response.status_code == 200
            assert response.json()["authenticated"] is True

            # Update session as authenticated user
            response = client.put(
                f"/api/sessions/{session_id}", json={"title": "Authenticated Session"}
            )
            assert response.status_code == 200
            assert response.json()["authenticated"] is True

            # Retrieve session data
            response = client.get(f"/api/sessions/{session_id}")
            assert response.status_code == 200
            session_data = response.json()
            assert session_data["authenticated"] is True
            assert session_data["user_id"] == 12345
            assert session_data["title"] == "Authenticated Session"

            # List sessions
            response = client.get("/api/sessions")
            assert response.status_code == 200
            sessions_data = response.json()
            assert sessions_data["authenticated"] is True


class TestSessionBackupIntegration:
    """Test integration of session store with backup operations."""

    def test_session_store_with_backup_workflow(self):
        """Test session operations integrated with backup functionality."""
        test_store = SessionStore()

        # Create sessions with data
        session_ids = []
        for i in range(5):
            session_id = f"backup-session-{i}"
            session_ids.append(session_id)

            test_store.ensure_session(
                session_id,
                title=f"Backup Test Session {i}",
                user_id=i,
                status="completed",
            )

            # Add messages
            test_store.add_message(
                session_id,
                {
                    "role": "user",
                    "content": f"Query for session {i}",
                    "timestamp": f"2023-01-{i + 1:02d}T10:00:00Z",
                },
            )

            test_store.add_message(
                session_id,
                {
                    "role": "assistant",
                    "content": f"Response for session {i}",
                    "timestamp": f"2023-01-{i + 1:02d}T10:01:00Z",
                },
            )

        # Simulate backup operation
        with tempfile.NamedTemporaryFile(suffix=".db") as temp_file:
            temp_db_path = temp_file.name

            # Mock successful backup
            with patch("app.utils.session_backup.storage") as mock_storage:
                mock_client = Mock()
                mock_bucket = Mock()
                mock_blob = Mock()

                mock_storage.Client.return_value = mock_client
                mock_client.bucket.return_value = mock_bucket
                mock_bucket.blob.return_value = mock_blob

                from app.utils.session_backup import backup_session_db_to_gcs

                backup_result = backup_session_db_to_gcs(
                    local_db_path=temp_db_path,
                    bucket_name="test-backup-bucket",
                    project_id="test-project",
                )

                # Should attempt backup even with empty file
                assert backup_result is not None
                mock_blob.upload_from_filename.assert_called_once()

        # Verify sessions still accessible after backup
        sessions = test_store.list_sessions()
        assert len(sessions) == 5

        for session_id in session_ids:
            session = test_store.get_session(session_id)
            assert session is not None
            assert len(session["messages"]) == 2

    def test_session_restore_integration(self):
        """Test restoring sessions and continuing operations."""
        # Create original store with data
        original_store = SessionStore()
        session_id = "restore-test-session"

        original_store.ensure_session(
            session_id, title="Pre-restore Session", user_id=999, status="completed"
        )

        original_store.add_message(
            session_id,
            {
                "role": "user",
                "content": "Original message before backup",
                "timestamp": "2023-01-01T10:00:00Z",
            },
        )

        # Simulate restore operation (mock)
        with patch("app.utils.session_backup.storage") as mock_storage:
            mock_client = Mock()
            mock_bucket = Mock()
            mock_blob = Mock()

            mock_storage.Client.return_value = mock_client
            mock_client.bucket.return_value = mock_bucket
            mock_bucket.blob.return_value = mock_blob

            # Mock successful restore
            from app.utils.session_backup import restore_session_db_from_gcs

            with tempfile.NamedTemporaryFile(suffix=".db") as temp_file:
                restore_result = restore_session_db_from_gcs(
                    local_db_path=temp_file.name,
                    bucket_name="test-restore-bucket",
                    project_id="test-project",
                )

                assert restore_result is True
                mock_blob.download_to_filename.assert_called_once()

        # Create new store (simulating post-restore)
        restored_store = SessionStore()

        # Add new session after "restore"
        new_session_id = "post-restore-session"
        restored_store.ensure_session(
            new_session_id, title="Post-restore Session", user_id=888, status="running"
        )

        restored_store.add_message(
            new_session_id,
            {
                "role": "user",
                "content": "New message after restore",
                "timestamp": "2023-01-02T10:00:00Z",
            },
        )

        # Verify new store operations work correctly
        session = restored_store.get_session(new_session_id)
        assert session is not None
        assert session["title"] == "Post-restore Session"
        assert len(session["messages"]) == 1


class TestSessionPerformanceIntegration:
    """Test session management under performance conditions."""

    def test_high_volume_session_operations(self):
        """Test session store performance with high volume operations."""
        test_store = SessionStore()

        # Create many sessions rapidly
        num_sessions = 100
        sessions_created = []

        start_time = time.time()

        for i in range(num_sessions):
            session_id = f"perf-session-{i:03d}"
            sessions_created.append(session_id)

            test_store.ensure_session(
                session_id,
                title=f"Performance Session {i}",
                user_id=i % 10,  # 10 different users
                status="running",
            )

            # Add multiple messages per session
            for j in range(10):
                test_store.add_message(
                    session_id,
                    {
                        "role": "user" if j % 2 == 0 else "assistant",
                        "content": f"Message {j} for session {i}",
                        "timestamp": f"2023-01-01T{j:02d}:00:00Z",
                    },
                )

        creation_time = time.time() - start_time

        # Should complete within reasonable time (adjust as needed)
        assert creation_time < 10.0  # 10 seconds for 100 sessions with 1000 messages

        # Verify all sessions were created
        sessions = test_store.list_sessions()
        assert len(sessions) == num_sessions

        # Test rapid retrieval
        start_time = time.time()

        for session_id in sessions_created[:50]:  # Test first 50
            session = test_store.get_session(session_id)
            assert session is not None
            assert len(session["messages"]) == 10

        retrieval_time = time.time() - start_time
        assert retrieval_time < 2.0  # Should be very fast

    def test_concurrent_high_volume_operations(self):
        """Test concurrent high-volume operations on session store."""
        test_store = SessionStore()
        num_threads = 10
        operations_per_thread = 20

        def thread_operations(thread_id):
            """Perform operations in a thread."""
            results = []

            for i in range(operations_per_thread):
                session_id = f"concurrent-{thread_id}-{i}"

                # Create session
                test_store.ensure_session(
                    session_id,
                    title=f"Thread {thread_id} Session {i}",
                    user_id=thread_id,
                )

                # Add messages
                for j in range(5):
                    test_store.add_message(
                        session_id,
                        {
                            "role": "user" if j % 2 == 0 else "assistant",
                            "content": f"T{thread_id} S{i} M{j}",
                            "timestamp": f"2023-01-01T{j:02d}:0{i}:00Z",
                        },
                    )

                # Update session
                test_store.update_session(session_id, status="completed", progress=1.0)

                results.append(session_id)

            return results

        # Run concurrent operations
        start_time = time.time()

        with ThreadPoolExecutor(max_workers=num_threads) as executor:
            futures = [
                executor.submit(thread_operations, thread_id)
                for thread_id in range(num_threads)
            ]

            all_session_ids = []
            for future in as_completed(futures):
                all_session_ids.extend(future.result())

        total_time = time.time() - start_time

        # Verify results
        expected_sessions = num_threads * operations_per_thread
        assert len(all_session_ids) == expected_sessions

        # All sessions should be accessible
        sessions = test_store.list_sessions()
        assert len(sessions) == expected_sessions

        # Verify thread safety (no data corruption)
        for session_id in all_session_ids:
            session = test_store.get_session(session_id)
            assert session is not None
            assert session["status"] == "completed"
            assert session["progress"] == 1.0
            assert len(session["messages"]) == 5

        # Should complete within reasonable time
        assert total_time < 15.0  # 15 seconds for 200 sessions with operations

    def test_memory_usage_with_large_sessions(self):
        """Test memory usage with large session data."""
        test_store = SessionStore()

        # Create sessions with large content
        large_content = "x" * 10000  # 10KB per message
        num_sessions = 10
        messages_per_session = 50

        for i in range(num_sessions):
            session_id = f"large-session-{i}"

            test_store.ensure_session(session_id, title=f"Large Session {i}", user_id=i)

            for j in range(messages_per_session):
                test_store.add_message(
                    session_id,
                    {
                        "role": "user" if j % 2 == 0 else "assistant",
                        "content": f"{large_content}-{i}-{j}",  # ~10KB + metadata
                        "timestamp": f"2023-01-01T{j % 24:02d}:00:00Z",
                    },
                )

        # Verify all data is accessible
        sessions = test_store.list_sessions()
        assert len(sessions) == num_sessions

        total_messages = 0
        for session_id in [f"large-session-{i}" for i in range(num_sessions)]:
            session = test_store.get_session(session_id)
            total_messages += len(session["messages"])

            # Verify large content integrity
            for message in session["messages"]:
                assert len(message["content"]) >= 10000

        assert total_messages == num_sessions * messages_per_session


# Integration test fixtures


@pytest.fixture
def integration_test_client():
    """Test client with mocked dependencies for integration testing."""
    with patch("app.server.session_store", SessionStore()):
        yield TestClient(app)


def test_integration_fixtures(integration_test_client):
    """Test that integration fixtures work correctly."""
    response = integration_test_client.get("/health")
    assert response.status_code == 200
