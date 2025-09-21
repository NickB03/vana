"""
Pytest configuration and shared fixtures for session management unit tests.

This file provides:
- Common fixtures for testing
- Test configuration
- Mock objects for session testing
- Test utilities and helpers
"""

import tempfile
import uuid
from datetime import datetime, timezone
from unittest.mock import Mock

import pytest

from app.utils.session_store import SessionRecord, SessionStore, StoredMessage


@pytest.fixture
def clean_session_store():
    """Provide a fresh SessionStore instance for each test."""
    return SessionStore()


@pytest.fixture
def populated_session_store():
    """Provide a SessionStore with sample data for testing."""
    store = SessionStore()

    # Create first session with multiple messages
    session_id_1 = "test-session-1"
    store.ensure_session(
        session_id_1, title="First Test Session", user_id=1, status="completed"
    )

    store.add_message(
        session_id_1,
        {
            "id": "msg-1-1",
            "role": "user",
            "content": "Hello from first session",
            "timestamp": "2023-01-01T10:00:00Z",
        },
    )

    store.add_message(
        session_id_1,
        {
            "id": "msg-1-2",
            "role": "assistant",
            "content": "Response from first session",
            "timestamp": "2023-01-01T10:01:00Z",
            "metadata": {"type": "response"},
        },
    )

    # Create second session with progress
    session_id_2 = "test-session-2"
    store.ensure_session(
        session_id_2, title="Second Test Session", user_id=2, status="running"
    )

    store.add_message(
        session_id_2,
        {
            "role": "user",
            "content": "Query for second session",
            "timestamp": "2023-01-01T11:00:00Z",
        },
    )

    store.upsert_progress_message(
        session_id_2, "Processing request...", completed=False
    )

    # Create third session (empty)
    session_id_3 = "test-session-3"
    store.ensure_session(
        session_id_3, title="Empty Session", user_id=3, status="pending"
    )

    return store


@pytest.fixture
def mock_user():
    """Mock authenticated user for testing."""
    user = Mock()
    user.id = 12345
    user.email = "test@example.com"
    user.is_active = True
    user.is_superuser = False
    return user


@pytest.fixture
def mock_superuser():
    """Mock superuser for testing."""
    user = Mock()
    user.id = 99999
    user.email = "admin@example.com"
    user.is_active = True
    user.is_superuser = True
    return user


@pytest.fixture
def sample_session_data():
    """Sample session data for testing."""
    return {
        "id": "sample-session-123",
        "title": "Sample Session",
        "status": "running",
        "created_at": "2023-01-01T10:00:00Z",
        "updated_at": "2023-01-01T11:00:00Z",
        "user_id": 456,
        "progress": 0.6,
        "current_phase": "processing",
        "final_report": None,
        "error": None,
        "messages": [
            {
                "id": "sample-msg-1",
                "role": "user",
                "content": "Sample user message",
                "timestamp": "2023-01-01T10:00:00Z",
                "metadata": None,
            },
            {
                "id": "sample-msg-2",
                "role": "assistant",
                "content": "Sample assistant response",
                "timestamp": "2023-01-01T10:30:00Z",
                "metadata": {"type": "response"},
            },
        ],
    }


@pytest.fixture
def sample_sse_events():
    """Sample SSE events for testing."""
    return [
        {
            "type": "research_started",
            "data": {"status": "running", "current_phase": "initialization"},
        },
        {
            "type": "research_progress",
            "data": {
                "overall_progress": 25.5,
                "current_phase": "data_collection",
                "partial_results": {
                    "documents_processed": "10/40",
                    "key_insights": "Initial patterns identified",
                },
            },
        },
        {
            "type": "research_progress",
            "data": {
                "overall_progress": 75.0,
                "current_phase": "analysis",
                "partial_results": {
                    "documents_processed": "30/40",
                    "analysis_complete": "75%",
                },
            },
        },
        {
            "type": "research_complete",
            "data": {
                "status": "completed",
                "overall_progress": 100,
                "final_report": "Research completed successfully. Key findings include...",
            },
        },
        {
            "type": "error",
            "data": {"error": "Connection timeout occurred", "status": "failed"},
        },
    ]


@pytest.fixture
def temp_database():
    """Create temporary database file for backup testing."""
    with tempfile.NamedTemporaryFile(delete=False, suffix=".db") as temp_file:
        temp_file.write(b"test database content for unit tests")
        temp_path = temp_file.name

    yield temp_path

    # Cleanup
    import os

    if os.path.exists(temp_path):
        os.unlink(temp_path)


@pytest.fixture
def mock_gcs_storage():
    """Mock Google Cloud Storage components for backup testing."""
    storage_client = Mock()
    bucket = Mock()
    blob = Mock()

    storage_client.bucket.return_value = bucket
    bucket.blob.return_value = blob
    bucket.list_blobs.return_value = []

    return {"client": storage_client, "bucket": bucket, "blob": blob}


# Test utilities


def create_test_message(
    message_id: str = None,
    role: str = "user",
    content: str = "Test message",
    timestamp: str = None,
    metadata: dict = None,
) -> dict:
    """Create test message data."""
    return {
        "id": message_id or f"test-msg-{uuid.uuid4()}",
        "role": role,
        "content": content,
        "timestamp": timestamp or datetime.now(timezone.utc).isoformat(),
        "metadata": metadata,
    }


def create_test_session_record(
    session_id: str = None,
    title: str = "Test Session",
    user_id: int = None,
    status: str = "pending",
) -> SessionRecord:
    """Create test SessionRecord."""
    now = datetime.now(timezone.utc).isoformat()
    return SessionRecord(
        id=session_id or f"test-session-{uuid.uuid4()}",
        created_at=now,
        updated_at=now,
        title=title,
        user_id=user_id,
        status=status,
    )


def assert_message_equals(actual: StoredMessage, expected: dict):
    """Assert that StoredMessage matches expected data."""
    assert actual.id == expected["id"]
    assert actual.role == expected["role"]
    assert actual.content == expected["content"]
    assert actual.timestamp == expected["timestamp"]
    assert actual.metadata == expected.get("metadata")


def assert_session_data_equals(actual: dict, expected: dict):
    """Assert that session data matches expected format."""
    assert actual["id"] == expected["id"]
    assert actual["title"] == expected["title"]
    assert actual["status"] == expected["status"]
    assert actual["user_id"] == expected["user_id"]

    if "messages" in expected:
        assert len(actual["messages"]) == len(expected["messages"])
        for actual_msg, expected_msg in zip(actual["messages"], expected["messages"], strict=False):
            assert actual_msg["id"] == expected_msg["id"]
            assert actual_msg["role"] == expected_msg["role"]
            assert actual_msg["content"] == expected_msg["content"]


# Pytest configuration


def pytest_configure(config):
    """Configure pytest for session management tests."""
    config.addinivalue_line("markers", "unit: mark test as a unit test")
    config.addinivalue_line("markers", "integration: mark test as an integration test")
    config.addinivalue_line(
        "markers", "thread_safety: mark test as testing thread safety"
    )
    config.addinivalue_line(
        "markers", "backup: mark test as testing backup functionality"
    )
    config.addinivalue_line("markers", "api: mark test as testing API endpoints")
    config.addinivalue_line("markers", "sse: mark test as testing SSE integration")


# Test collection configuration


def pytest_collection_modifyitems(config, items):
    """Modify collected test items."""
    for item in items:
        # Add unit marker to all tests in unit directory
        if "unit" in str(item.fspath):
            item.add_marker(pytest.mark.unit)

        # Add specific markers based on test module
        if "session_store" in item.nodeid:
            item.add_marker(pytest.mark.unit)
        elif "session_api" in item.nodeid:
            item.add_marker(pytest.mark.api)
        elif "session_backup" in item.nodeid:
            item.add_marker(pytest.mark.backup)

        # Add thread safety marker for concurrent tests
        if "concurrent" in item.nodeid or "thread" in item.nodeid:
            item.add_marker(pytest.mark.thread_safety)


# Performance testing fixtures


@pytest.fixture
def performance_session_store():
    """Session store with large dataset for performance testing."""
    store = SessionStore()

    # Create 100 sessions with varying amounts of data
    for i in range(100):
        session_id = f"perf-session-{i:03d}"
        store.ensure_session(
            session_id,
            title=f"Performance Test Session {i}",
            user_id=i % 10,  # 10 different users
            status="completed" if i % 3 == 0 else "running",
        )

        # Add varying number of messages (1-20 per session)
        num_messages = (i % 20) + 1
        for j in range(num_messages):
            store.add_message(
                session_id,
                {
                    "role": "user" if j % 2 == 0 else "assistant",
                    "content": f"Performance test message {j} for session {i}",
                    "timestamp": f"2023-01-{(i % 30) + 1:02d}T{(j % 24):02d}:00:00Z",
                },
            )

    return store


# Error simulation fixtures


@pytest.fixture
def failing_session_store():
    """Mock session store that simulates various failures."""
    store = Mock(spec=SessionStore)

    # Configure different failure modes
    store.get_session.side_effect = Exception("Database connection failed")
    store.list_sessions.side_effect = Exception("Query timeout")
    store.add_message.side_effect = Exception("Write operation failed")
    store.update_session.side_effect = Exception("Update constraint violation")

    return store
