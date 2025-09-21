"""
Comprehensive unit tests for SessionStore class functionality.

Tests cover:
- Thread safety and concurrent operations
- Session lifecycle management
- Message handling and deduplication
- SSE event integration
- Edge cases and error scenarios
"""

import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone

import pytest

from app.utils.session_store import (
    SessionRecord,
    SessionStore,
    StoredMessage,
    _iso,
    _now,
)


class TestSessionStoreBasics:
    """Test basic SessionStore functionality."""

    def test_initialization(self):
        """Test SessionStore initializes correctly."""
        store = SessionStore()
        assert store._sessions == {}
        assert store._lock is not None
        assert hasattr(store._lock, "__enter__")  # RLock has context manager

    def test_ensure_session_creates_new(self):
        """Test ensure_session creates new session with metadata."""
        store = SessionStore()
        session_id = "test-session-123"

        record = store.ensure_session(
            session_id, user_id=42, title="Test Session", status="active"
        )

        assert record.id == session_id
        assert record.user_id == 42
        assert record.title == "Test Session"
        assert record.status == "active"
        assert record.messages == []
        assert record.created_at == record.updated_at

        # Verify session is stored
        assert session_id in store._sessions
        assert store._sessions[session_id] is record

    def test_ensure_session_updates_existing(self):
        """Test ensure_session updates existing session metadata."""
        store = SessionStore()
        session_id = "test-session-456"

        # Create initial session
        initial_record = store.ensure_session(session_id, title="Initial Title")
        initial_updated_at = initial_record.updated_at

        # Small delay to ensure different timestamp
        time.sleep(0.001)

        # Update session
        updated_record = store.ensure_session(
            session_id, title="Updated Title", status="completed"
        )

        assert updated_record is initial_record  # Same object
        assert updated_record.title == "Updated Title"
        assert updated_record.status == "completed"
        assert updated_record.updated_at > initial_updated_at

    def test_update_session(self):
        """Test update_session with arbitrary field updates."""
        store = SessionStore()
        session_id = "test-session-789"

        # Create session first
        store.ensure_session(session_id)

        # Update with arbitrary fields
        updated = store.update_session(
            session_id,
            progress=0.75,
            current_phase="analysis",
            final_report="Test report",
        )

        assert updated.progress == 0.75
        assert updated.current_phase == "analysis"
        assert updated.final_report == "Test report"

    def test_session_to_dict(self):
        """Test SessionRecord to_dict serialization."""
        store = SessionStore()
        session_id = "test-dict-session"

        record = store.ensure_session(
            session_id, user_id=123, title="Dict Test", status="running"
        )

        # Add a message
        store.add_message(
            session_id,
            {
                "id": "msg-1",
                "role": "user",
                "content": "Test message",
                "timestamp": "2023-01-01T00:00:00Z",
            },
        )

        # Test with messages
        data_with_messages = record.to_dict(include_messages=True)
        assert data_with_messages["id"] == session_id
        assert data_with_messages["user_id"] == 123
        assert data_with_messages["title"] == "Dict Test"
        assert data_with_messages["status"] == "running"
        assert len(data_with_messages["messages"]) == 1
        assert data_with_messages["messages"][0]["content"] == "Test message"

        # Test without messages
        data_without_messages = record.to_dict(include_messages=False)
        assert "messages" not in data_without_messages
        assert data_without_messages["id"] == session_id


class TestSessionStoreMessages:
    """Test message handling functionality."""

    def test_add_message_new(self):
        """Test adding new message to session."""
        store = SessionStore()
        session_id = "msg-test-session"

        message_data = {
            "id": "msg-001",
            "role": "user",
            "content": "Hello, world!",
            "timestamp": "2023-01-01T12:00:00Z",
            "metadata": {"source": "test"},
        }

        stored = store.add_message(session_id, message_data)

        assert stored.id == "msg-001"
        assert stored.role == "user"
        assert stored.content == "Hello, world!"
        assert stored.timestamp == "2023-01-01T12:00:00Z"
        assert stored.metadata == {"source": "test"}

        # Verify session was created and contains message
        session = store.get_session(session_id)
        assert session is not None
        assert len(session["messages"]) == 1
        assert session["messages"][0]["id"] == "msg-001"

    def test_add_message_auto_id(self):
        """Test adding message without ID generates UUID."""
        store = SessionStore()
        session_id = "auto-id-session"

        stored = store.add_message(
            session_id, {"role": "assistant", "content": "Auto ID message"}
        )

        assert stored.id.startswith("msg_")
        assert len(stored.id) > 10  # UUID should be longer
        assert stored.role == "assistant"
        assert stored.content == "Auto ID message"

    def test_add_message_deduplication(self):
        """Test message deduplication by ID."""
        store = SessionStore()
        session_id = "dedup-session"

        # Add initial message
        message_data = {
            "id": "duplicate-msg",
            "role": "user",
            "content": "Original content",
            "metadata": {"version": 1},
        }
        stored1 = store.add_message(session_id, message_data)

        # Add same message ID with different content
        updated_data = {
            "id": "duplicate-msg",
            "role": "user",
            "content": "Updated content",
            "metadata": {"version": 2},
        }
        stored2 = store.add_message(session_id, updated_data)

        # Should return same object, updated content
        assert stored1 is stored2
        assert stored2.content == "Updated content"
        assert stored2.metadata == {"version": 2}

        # Session should still have only one message
        session = store.get_session(session_id)
        assert len(session["messages"]) == 1

    def test_add_message_auto_title(self):
        """Test automatic title generation from first user message."""
        store = SessionStore()
        session_id = "title-session"

        # Add user message that should become title
        long_content = "This is a very long user message that should be truncated for the title because it exceeds the 60 character limit"
        store.add_message(session_id, {"role": "user", "content": long_content})

        session = store.get_session(session_id)
        assert session["title"] == long_content[:60]

        # Assistant messages shouldn't change title
        store.add_message(
            session_id, {"role": "assistant", "content": "Assistant response"}
        )

        session = store.get_session(session_id)
        assert session["title"] == long_content[:60]  # Unchanged

    def test_upsert_progress_message_new(self):
        """Test creating new progress message."""
        store = SessionStore()
        session_id = "progress-session"

        progress_msg = store.upsert_progress_message(
            session_id, "Processing request...", completed=False
        )

        assert progress_msg.role == "assistant"
        assert progress_msg.content == "Processing request..."
        assert progress_msg.metadata == {"kind": "assistant-progress"}
        assert progress_msg.id.endswith("_assistant_progress")

        # Verify in session
        session = store.get_session(session_id)
        assert len(session["messages"]) == 1
        assert session["messages"][0]["metadata"]["kind"] == "assistant-progress"

    def test_upsert_progress_message_update(self):
        """Test updating existing progress message."""
        store = SessionStore()
        session_id = "progress-update-session"

        # Create initial progress message
        msg1 = store.upsert_progress_message(session_id, "Starting...")
        initial_id = msg1.id

        # Add regular message
        store.add_message(session_id, {"role": "user", "content": "User message"})

        # Update progress message
        msg2 = store.upsert_progress_message(
            session_id, "Processing complete!", completed=True
        )

        # Should be same message object, updated content
        assert msg2 is msg1
        assert msg2.id == initial_id
        assert msg2.content == "Processing complete!"
        assert msg2.metadata == {"kind": "assistant-progress", "completed": True}

        # Session should still have 2 messages total
        session = store.get_session(session_id)
        assert len(session["messages"]) == 2


class TestSessionStoreSSEIntegration:
    """Test SSE event integration."""

    def test_ingest_event_research_started(self):
        """Test processing research_started event."""
        store = SessionStore()
        session_id = "sse-start-session"

        event = {
            "type": "research_started",
            "data": {"status": "running", "current_phase": "initialization"},
        }

        store.ingest_event(session_id, event)

        session = store.get_session(session_id)
        assert session["status"] == "running"
        assert session["current_phase"] == "initialization"

    def test_ingest_event_research_progress(self):
        """Test processing research_progress event."""
        store = SessionStore()
        session_id = "sse-progress-session"

        event = {
            "type": "research_progress",
            "data": {
                "overall_progress": 45.5,
                "current_phase": "analysis",
                "partial_results": {
                    "findings": "Initial analysis complete",
                    "metrics": {"accuracy": 0.95},
                },
            },
        }

        store.ingest_event(session_id, event)

        session = store.get_session(session_id)
        assert session["progress"] == 0.455  # Converted to 0-1 range
        assert session["current_phase"] == "analysis"

        # Should create progress message
        progress_messages = [
            msg
            for msg in session["messages"]
            if msg.get("metadata", {}).get("kind") == "assistant-progress"
        ]
        assert len(progress_messages) == 1
        assert "Analysis" in progress_messages[0]["content"]
        assert "45%" in progress_messages[0]["content"]

    def test_ingest_event_research_complete(self):
        """Test processing research_complete event."""
        store = SessionStore()
        session_id = "sse-complete-session"

        event = {
            "type": "research_complete",
            "data": {
                "status": "completed",
                "overall_progress": 100,
                "final_report": "Research completed successfully with findings...",
            },
        }

        store.ingest_event(session_id, event)

        session = store.get_session(session_id)
        assert session["status"] == "completed"
        assert session["progress"] == 1.0
        assert (
            session["final_report"]
            == "Research completed successfully with findings..."
        )

        # Should create completed progress message with final report
        progress_messages = [
            msg
            for msg in session["messages"]
            if msg.get("metadata", {}).get("kind") == "assistant-progress"
        ]
        assert len(progress_messages) == 1
        assert (
            progress_messages[0]["content"]
            == "Research completed successfully with findings..."
        )
        assert progress_messages[0]["metadata"]["completed"] is True

    def test_ingest_event_error(self):
        """Test processing error event."""
        store = SessionStore()
        session_id = "sse-error-session"

        event = {
            "type": "error",
            "data": {"error": "Connection timeout", "status": "failed"},
        }

        store.ingest_event(session_id, event)

        session = store.get_session(session_id)
        assert session["error"] == "Connection timeout"
        assert session["status"] == "failed"

    def test_ingest_event_invalid_type(self):
        """Test ignoring invalid event types."""
        store = SessionStore()
        session_id = "sse-invalid-session"

        # Create initial session
        store.ensure_session(session_id, status="initial")

        event = {"type": "invalid_event_type", "data": {"status": "should_be_ignored"}}

        store.ingest_event(session_id, event)

        session = store.get_session(session_id)
        assert session["status"] == "initial"  # Unchanged

    def test_format_progress_content(self):
        """Test progress content formatting."""
        store = SessionStore()
        record = SessionRecord(
            id="test",
            created_at="2023-01-01T00:00:00Z",
            updated_at="2023-01-01T00:00:00Z",
            current_phase="Testing",
        )

        payload = {
            "current_phase": "Data Analysis",
            "overall_progress": 67.8,
            "partial_results": {
                "processed_documents": "15/20",
                "key_findings": "Initial trends identified",
            },
        }

        content = store._format_progress_content(payload, record)

        assert "**Data Analysis**" in content
        assert "Progress: 68%" in content
        assert "Processed Documents: 15/20" in content
        assert "Key Findings: Initial trends identified" in content


class TestSessionStoreRetrieval:
    """Test session retrieval methods."""

    def test_get_session_exists(self):
        """Test retrieving existing session."""
        store = SessionStore()
        session_id = "retrieval-session"

        # Create session with data
        store.ensure_session(session_id, title="Test Session", user_id=456)
        store.add_message(session_id, {"role": "user", "content": "Test message"})

        session = store.get_session(session_id)

        assert session is not None
        assert session["id"] == session_id
        assert session["title"] == "Test Session"
        assert session["user_id"] == 456
        assert len(session["messages"]) == 1
        assert session["messages"][0]["content"] == "Test message"

    def test_get_session_not_exists(self):
        """Test retrieving non-existent session."""
        store = SessionStore()

        session = store.get_session("non-existent-session")
        assert session is None

    def test_list_sessions_empty(self):
        """Test listing sessions when store is empty."""
        store = SessionStore()

        sessions = store.list_sessions()
        assert sessions == []

    def test_list_sessions_multiple(self):
        """Test listing multiple sessions in order."""
        store = SessionStore()

        # Create sessions with different update times
        store.ensure_session("session-1", title="First Session")
        time.sleep(0.001)
        store.ensure_session("session-2", title="Second Session")
        time.sleep(0.001)
        store.ensure_session("session-3", title="Third Session")

        # Update middle session to make it most recent
        time.sleep(0.001)
        store.update_session("session-2", status="updated")

        sessions = store.list_sessions()

        assert len(sessions) == 3
        # Should be sorted by updated_at descending
        assert sessions[0]["id"] == "session-2"  # Most recently updated
        assert sessions[1]["id"] == "session-3"
        assert sessions[2]["id"] == "session-1"

        # Messages should not be included in list
        for session in sessions:
            assert "messages" not in session


class TestSessionStoreThreadSafety:
    """Test thread safety of SessionStore operations."""

    def test_concurrent_session_creation(self):
        """Test creating multiple sessions concurrently."""
        store = SessionStore()
        num_threads = 10
        num_sessions_per_thread = 5

        def create_sessions(thread_id):
            """Create sessions in a thread."""
            created = []
            for i in range(num_sessions_per_thread):
                session_id = f"thread-{thread_id}-session-{i}"
                record = store.ensure_session(
                    session_id,
                    title=f"Session {i} from thread {thread_id}",
                    user_id=thread_id,
                )
                created.append(record.id)
            return created

        # Run concurrent creation
        with ThreadPoolExecutor(max_workers=num_threads) as executor:
            futures = [
                executor.submit(create_sessions, thread_id)
                for thread_id in range(num_threads)
            ]

            all_created = []
            for future in as_completed(futures):
                all_created.extend(future.result())

        # Verify all sessions were created
        assert len(all_created) == num_threads * num_sessions_per_thread
        assert len(set(all_created)) == len(all_created)  # No duplicates

        # Verify sessions exist in store
        sessions = store.list_sessions()
        assert len(sessions) == num_threads * num_sessions_per_thread

    def test_concurrent_message_addition(self):
        """Test adding messages to same session concurrently."""
        store = SessionStore()
        session_id = "concurrent-messages-session"
        num_threads = 8
        messages_per_thread = 10

        def add_messages(thread_id):
            """Add messages in a thread."""
            added = []
            for i in range(messages_per_thread):
                message_id = f"thread-{thread_id}-msg-{i}"
                stored = store.add_message(
                    session_id,
                    {
                        "id": message_id,
                        "role": "user" if i % 2 == 0 else "assistant",
                        "content": f"Message {i} from thread {thread_id}",
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                    },
                )
                added.append(stored.id)
            return added

        # Run concurrent message addition
        with ThreadPoolExecutor(max_workers=num_threads) as executor:
            futures = [
                executor.submit(add_messages, thread_id)
                for thread_id in range(num_threads)
            ]

            all_added = []
            for future in as_completed(futures):
                all_added.extend(future.result())

        # Verify all messages were added
        session = store.get_session(session_id)
        assert len(session["messages"]) == num_threads * messages_per_thread

        # Verify no message IDs are duplicated
        message_ids = [msg["id"] for msg in session["messages"]]
        assert len(set(message_ids)) == len(message_ids)

    def test_concurrent_progress_updates(self):
        """Test concurrent progress message updates."""
        store = SessionStore()
        session_id = "concurrent-progress-session"
        num_threads = 5
        updates_per_thread = 20

        def update_progress(thread_id):
            """Update progress messages in a thread."""
            for i in range(updates_per_thread):
                content = f"Thread {thread_id}, Update {i}: Progress at {i * 5}%"
                store.upsert_progress_message(
                    session_id, content, completed=(i == updates_per_thread - 1)
                )
            return f"Thread {thread_id} completed"

        # Run concurrent updates
        with ThreadPoolExecutor(max_workers=num_threads) as executor:
            futures = [
                executor.submit(update_progress, thread_id)
                for thread_id in range(num_threads)
            ]

            for future in as_completed(futures):
                result = future.result()
                assert "completed" in result

        # Should have only one progress message despite concurrent updates
        session = store.get_session(session_id)
        progress_messages = [
            msg
            for msg in session["messages"]
            if msg.get("metadata", {}).get("kind") == "assistant-progress"
        ]
        assert len(progress_messages) == 1

    def test_concurrent_session_updates(self):
        """Test concurrent updates to session metadata."""
        store = SessionStore()
        session_id = "concurrent-update-session"

        # Create initial session
        store.ensure_session(session_id, title="Initial")

        def update_session_field(field_name, value):
            """Update a specific field."""
            return store.update_session(session_id, **{field_name: value})

        # Update different fields concurrently
        updates = [
            ("status", "running"),
            ("progress", 0.5),
            ("current_phase", "analysis"),
            ("title", "Updated Title"),
            ("error", None),
        ]

        with ThreadPoolExecutor(max_workers=len(updates)) as executor:
            futures = [
                executor.submit(update_session_field, field, value)
                for field, value in updates
            ]

            results = [future.result() for future in as_completed(futures)]

        # All updates should succeed
        assert len(results) == len(updates)

        # Final session should have all updates
        session = store.get_session(session_id)
        assert session["status"] == "running"
        assert session["progress"] == 0.5
        assert session["current_phase"] == "analysis"
        assert session["title"] == "Updated Title"
        assert session["error"] is None


class TestSessionStoreEdgeCases:
    """Test edge cases and error scenarios."""

    def test_none_timestamp_handling(self):
        """Test handling of None timestamps."""
        store = SessionStore()
        session_id = "none-timestamp-session"

        stored = store.add_message(
            session_id,
            {"role": "user", "content": "Message with no timestamp", "timestamp": None},
        )

        # Should get current timestamp
        assert stored.timestamp is not None
        assert len(stored.timestamp) > 15  # ISO format should be long

    def test_string_timestamp_handling(self):
        """Test handling of string timestamps."""
        store = SessionStore()
        session_id = "string-timestamp-session"

        timestamp_str = "2023-06-15T14:30:00Z"
        stored = store.add_message(
            session_id,
            {
                "role": "user",
                "content": "Message with string timestamp",
                "timestamp": timestamp_str,
            },
        )

        assert stored.timestamp == timestamp_str

    def test_empty_content_message(self):
        """Test handling of messages with empty content."""
        store = SessionStore()
        session_id = "empty-content-session"

        stored = store.add_message(
            session_id,
            {"role": "assistant", "content": "", "metadata": {"type": "system"}},
        )

        assert stored.content == ""
        assert stored.metadata == {"type": "system"}

    def test_invalid_progress_values(self):
        """Test handling of invalid progress values in SSE events."""
        store = SessionStore()
        session_id = "invalid-progress-session"

        # Test non-numeric progress
        event1 = {
            "type": "research_progress",
            "data": {"overall_progress": "not-a-number"},
        }
        store.ingest_event(session_id, event1)

        session = store.get_session(session_id)
        assert session["progress"] is None

        # Test None progress
        event2 = {"type": "research_progress", "data": {"overall_progress": None}}
        store.ingest_event(session_id, event2)

        session = store.get_session(session_id)
        assert session["progress"] is None

    def test_malformed_sse_events(self):
        """Test handling of malformed SSE events."""
        store = SessionStore()
        session_id = "malformed-event-session"

        # Create initial session state
        store.ensure_session(session_id, status="initial")

        # Test event with no data
        event1 = {"type": "research_progress"}
        store.ingest_event(session_id, event1)

        # Test event with non-dict data
        event2 = {"type": "research_progress", "data": "invalid-data-type"}
        store.ingest_event(session_id, event2)

        # Session should remain in initial state
        session = store.get_session(session_id)
        assert session["status"] == "initial"

    def test_large_message_content(self):
        """Test handling of very large message content."""
        store = SessionStore()
        session_id = "large-content-session"

        # Create large content (1MB)
        large_content = "x" * (1024 * 1024)

        stored = store.add_message(
            session_id, {"role": "assistant", "content": large_content}
        )

        assert len(stored.content) == 1024 * 1024
        assert stored.content == large_content

    def test_unicode_content(self):
        """Test handling of Unicode content."""
        store = SessionStore()
        session_id = "unicode-session"

        unicode_content = "Hello 世界! 🌍 Testing émojis and ñoñó characters"

        stored = store.add_message(
            session_id,
            {"role": "user", "content": unicode_content, "metadata": {"lang": "multi"}},
        )

        assert stored.content == unicode_content
        assert stored.metadata["lang"] == "multi"

        # Verify in session retrieval
        session = store.get_session(session_id)
        assert session["messages"][0]["content"] == unicode_content


class TestHelperFunctions:
    """Test utility helper functions."""

    def test_now_function(self):
        """Test _now() returns timezone-aware UTC datetime."""
        now = _now()
        assert now.tzinfo is not None
        assert now.tzinfo == timezone.utc

    def test_iso_with_datetime(self):
        """Test _iso() with datetime objects."""
        dt = datetime(2023, 6, 15, 14, 30, 0, tzinfo=timezone.utc)
        iso_str = _iso(dt)
        assert iso_str == "2023-06-15T14:30:00+00:00"

    def test_iso_with_naive_datetime(self):
        """Test _iso() with naive datetime (adds UTC timezone)."""
        dt = datetime(2023, 6, 15, 14, 30, 0)  # No timezone
        iso_str = _iso(dt)
        assert iso_str == "2023-06-15T14:30:00+00:00"

    def test_iso_with_string(self):
        """Test _iso() with string input."""
        input_str = "2023-06-15T14:30:00Z"
        result = _iso(input_str)
        assert result == input_str

    def test_iso_with_none(self):
        """Test _iso() with None returns current time."""
        result = _iso(None)
        assert result is not None
        assert len(result) > 15  # Should be ISO format

    def test_stored_message_to_dict(self):
        """Test StoredMessage to_dict method."""
        msg = StoredMessage(
            id="test-msg",
            role="user",
            content="Test content",
            timestamp="2023-01-01T00:00:00Z",
            metadata={"key": "value"},
        )

        data = msg.to_dict()
        expected = {
            "id": "test-msg",
            "role": "user",
            "content": "Test content",
            "timestamp": "2023-01-01T00:00:00Z",
            "metadata": {"key": "value"},
        }
        assert data == expected

    def test_stored_message_to_dict_no_metadata(self):
        """Test StoredMessage to_dict with no metadata."""
        msg = StoredMessage(
            id="test-msg",
            role="assistant",
            content="No metadata",
            timestamp="2023-01-01T00:00:00Z",
        )

        data = msg.to_dict()
        assert data["metadata"] is None


# Fixtures for integration testing
@pytest.fixture
def sample_session_store():
    """Create a SessionStore with sample data."""
    store = SessionStore()

    # Create multiple sessions
    store.ensure_session("session-1", title="First Session", user_id=1)
    store.add_message("session-1", {"role": "user", "content": "Hello from session 1"})

    store.ensure_session("session-2", title="Second Session", user_id=2)
    store.add_message("session-2", {"role": "user", "content": "Hello from session 2"})
    store.add_message(
        "session-2", {"role": "assistant", "content": "Response to session 2"}
    )

    return store


def test_sample_fixture(sample_session_store):
    """Test that the sample fixture works correctly."""
    sessions = sample_session_store.list_sessions()
    assert len(sessions) == 2

    session1 = sample_session_store.get_session("session-1")
    assert len(session1["messages"]) == 1

    session2 = sample_session_store.get_session("session-2")
    assert len(session2["messages"]) == 2
