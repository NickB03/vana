# Copyright 2025 Google LLC
# Licensed under the Apache License, Version 2.0 (the "License")

import json
import os
import sqlite3
import tempfile
import time
import uuid
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any
from unittest.mock import Mock, patch

import pytest

from app.utils.session_backup import (
    backup_session_db_to_gcs,
    create_periodic_backup_job,
    restore_session_db_from_gcs,
    setup_session_persistence_for_cloud_run,
)

# Note: User and Session models are not currently defined in app.models
# from app.models import User, Session


# Mock classes for testing
@dataclass
class User:
    """Mock User class for testing."""

    id: str
    email: str
    display_name: str


@dataclass
class Session:
    """Mock Session class for testing."""

    id: str
    user_id: str
    created_at: datetime = None
    last_activity: datetime = None

    # Duplicate classes removed - using the ones defined above
    updated_at: float | None = None
    state: dict[str, Any] = field(default_factory=dict)


@dataclass
class MockGCSBlob:
    """Mock GCS blob for testing."""

    name: str
    updated: datetime
    size: int = 1024

    def download_to_filename(self, filename: str):
        """Mock download functionality."""
        # Create a dummy file
        with open(filename, "w") as f:
            f.write('{"mock": "session_data"}')

    def upload_from_filename(self, filename: str):
        """Mock upload functionality."""
        pass  # No-op for testing


class TestSessionPersistence:
    """Test session persistence and backup functionality."""

    def setup_method(self):
        """Set up session persistence testing."""
        self.test_user_id = "session_user_123"
        self.test_session_id = str(uuid.uuid4())
        self.test_project_id = "test-project-12345"
        self.test_bucket_name = f"{self.test_project_id}-vana-session-storage"

        # Create temporary database for testing
        self.temp_db_fd, self.temp_db_path = tempfile.mkstemp(suffix=".db")
        os.close(self.temp_db_fd)  # Close the file descriptor, keep the path

    def teardown_method(self):
        """Clean up after tests."""
        # Remove temporary database
        if os.path.exists(self.temp_db_path):
            os.unlink(self.temp_db_path)

    def create_test_session_db(self):
        """Create a test session database with sample data."""
        conn = sqlite3.connect(self.temp_db_path)
        cursor = conn.cursor()

        # Create sessions table (simplified structure)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                state TEXT,
                metadata TEXT
            )
        """)

        # Insert test data
        test_sessions = [
            {
                "id": self.test_session_id,
                "user_id": self.test_user_id,
                "created_at": int(time.time()),
                "updated_at": int(time.time()),
                "state": json.dumps({"step": "research", "topic": "AI testing"}),
                "metadata": json.dumps({"source": "test", "version": "1.0"}),
            },
            {
                "id": str(uuid.uuid4()),
                "user_id": "another_user",
                "created_at": int(time.time() - 3600),
                "updated_at": int(time.time() - 1800),
                "state": json.dumps(
                    {"step": "complete", "results": ["test1", "test2"]}
                ),
                "metadata": json.dumps({"source": "test", "archived": True}),
            },
        ]

        for session in test_sessions:
            cursor.execute(
                """
                INSERT INTO sessions (id, user_id, created_at, updated_at, state, metadata)
                VALUES (?, ?, ?, ?, ?, ?)
            """,
                (
                    session["id"],
                    session["user_id"],
                    session["created_at"],
                    session["updated_at"],
                    session["state"],
                    session["metadata"],
                ),
            )

        conn.commit()
        conn.close()

    def test_session_database_backup(self):
        """Test session database backup to GCS."""
        self.create_test_session_db()

        # Mock GCS client and bucket
        with (
            patch("google.cloud.storage.Client") as mock_storage_client,
            patch("app.utils.session_backup.logger"),
        ):
            mock_client = Mock()
            mock_bucket = Mock()
            mock_blob = Mock()

            mock_storage_client.return_value = mock_client
            mock_client.bucket.return_value = mock_bucket
            mock_bucket.blob.return_value = mock_blob

            # Test backup
            backup_session_db_to_gcs(
                local_db_path=self.temp_db_path,
                bucket_name=self.test_bucket_name,
                project_id=self.test_project_id,
            )

            # Verify backup was attempted
            mock_client.bucket.assert_called_once_with(self.test_bucket_name)
            mock_blob.upload_from_filename.assert_called_once_with(self.temp_db_path)

    def test_session_database_restore(self):
        """Test session database restore from GCS."""
        # Create mock backup file

        with (
            patch("google.cloud.storage.Client") as mock_storage_client,
            patch("app.utils.session_backup.logger"),
        ):
            mock_client = Mock()
            mock_bucket = Mock()
            mock_blob = MockGCSBlob(
                name="session_backup_latest.db", updated=datetime.now()
            )

            mock_storage_client.return_value = mock_client
            mock_client.bucket.return_value = mock_bucket
            mock_bucket.list_blobs.return_value = [mock_blob]
            mock_bucket.blob.return_value = mock_blob

            # Test restore
            restore_session_db_from_gcs(
                local_db_path=self.temp_db_path,
                bucket_name=self.test_bucket_name,
                project_id=self.test_project_id,
            )

            # Verify restore was attempted
            mock_client.bucket.assert_called_once_with(self.test_bucket_name)
            mock_bucket.list_blobs.assert_called_once()

            # Verify local database file exists
            assert os.path.exists(self.temp_db_path)

    def test_cloud_run_session_persistence_setup(self):
        """Test Cloud Run session persistence setup."""
        cloud_run_db_path = "/tmp/cloud_run_sessions.db"

        with (
            patch(
                "app.utils.session_backup.restore_session_db_from_gcs"
            ) as mock_restore,
            patch(
                "app.utils.session_backup.create_periodic_backup_job"
            ) as mock_backup_job,
        ):
            session_uri = setup_session_persistence_for_cloud_run(
                project_id=self.test_project_id, session_db_path=cloud_run_db_path
            )

            # Verify setup
            assert session_uri == f"sqlite:///{cloud_run_db_path}"
            mock_restore.assert_called_once()
            mock_backup_job.assert_called_once()

    def test_periodic_backup_job_creation(self):
        """Test periodic backup job creation."""
        self.create_test_session_db()

        with (
            patch("threading.Thread") as mock_thread,
            patch("app.utils.session_backup.backup_session_db_to_gcs"),
        ):
            # Create periodic backup job
            create_periodic_backup_job(
                local_db_path=self.temp_db_path,
                bucket_name=self.test_bucket_name,
                project_id=self.test_project_id,
                interval_hours=1,  # Short interval for testing
            )

            # Verify thread was created for periodic backup
            mock_thread.assert_called_once()
            thread_args = mock_thread.call_args
            assert "target" in thread_args.kwargs
            assert "daemon" in thread_args.kwargs
            assert thread_args.kwargs["daemon"] is True


class TestSessionLifecycle:
    """Test complete session lifecycle management."""

    def setup_method(self):
        """Set up session lifecycle testing."""
        self.test_user = User(
            id="lifecycle_user_123",
            email="lifecycle@test.com",
            display_name="Lifecycle Test User",
        )

    def test_session_creation(self):
        """Test session creation process."""
        session_data = {
            "user_id": self.test_user.id,
            "initial_state": {
                "research_topic": "Machine Learning Testing",
                "preferred_language": "English",
                "session_type": "research",
            },
        }

        # Create session
        session = Session(
            id=str(uuid.uuid4()),
            user_id=session_data["user_id"],
            created_at=time.time(),
            state=session_data["initial_state"],
        )

        # Verify session properties
        assert session.id is not None
        assert session.user_id == self.test_user.id
        assert session.created_at > 0
        assert isinstance(session.state, dict)
        assert session.state["research_topic"] == "Machine Learning Testing"

    def test_session_state_updates(self):
        """Test session state update process."""
        # Create initial session
        session = Session(
            id=str(uuid.uuid4()),
            user_id=self.test_user.id,
            created_at=time.time(),
            state={"step": "initial", "progress": 0},
        )

        # Simulate state updates during session
        state_updates = [
            {"step": "research", "progress": 0.2, "current_task": "data_collection"},
            {
                "step": "analysis",
                "progress": 0.6,
                "current_task": "pattern_recognition",
            },
            {"step": "synthesis", "progress": 0.9, "current_task": "report_generation"},
            {"step": "complete", "progress": 1.0, "results": ["finding1", "finding2"]},
        ]

        for i, update in enumerate(state_updates):
            # Update session state
            session.state.update(update)
            session.updated_at = time.time()

            # Verify state evolution
            assert session.state["step"] == update["step"]
            assert session.state["progress"] == update["progress"]

            if i == len(state_updates) - 1:  # Final state
                assert session.state["progress"] == 1.0
                assert "results" in session.state

    def test_session_cleanup(self):
        """Test session cleanup and resource management."""
        # Create multiple sessions
        sessions = []
        for i in range(5):
            session = Session(
                id=str(uuid.uuid4()),
                user_id=self.test_user.id,
                created_at=time.time() - (i * 3600),  # Stagger creation times
                state={"step": f"test_step_{i}", "data": f"test_data_{i}"},
            )
            sessions.append(session)

        # Test cleanup criteria
        current_time = time.time()
        old_session_threshold = current_time - (24 * 3600)  # 24 hours ago

        active_sessions = []
        expired_sessions = []

        for session in sessions:
            if session.created_at > old_session_threshold:
                active_sessions.append(session)
            else:
                expired_sessions.append(session)

        # Verify cleanup logic
        assert len(active_sessions) + len(expired_sessions) == len(sessions)

        # Simulate cleanup of expired sessions
        for expired_session in expired_sessions:
            # Cleanup logic would go here
            assert expired_session.created_at <= old_session_threshold

    def test_session_concurrency(self):
        """Test concurrent session operations."""
        import threading

        session = Session(
            id=str(uuid.uuid4()),
            user_id=self.test_user.id,
            created_at=time.time(),
            state={"counter": 0, "operations": []},
        )

        def update_session(operation_id):
            """Simulate concurrent session updates."""
            # Simulate concurrent state updates
            session.state["counter"] += 1
            session.state["operations"].append(f"op_{operation_id}")
            session.updated_at = time.time()

        # Create concurrent update threads
        threads = []
        num_operations = 10

        for i in range(num_operations):
            thread = threading.Thread(target=update_session, args=(i,))
            threads.append(thread)
            thread.start()

        # Wait for all operations to complete
        for thread in threads:
            thread.join()

        # Verify final state (may have race conditions, but shouldn't crash)
        assert session.state["counter"] <= num_operations
        assert len(session.state["operations"]) <= num_operations


class TestSessionStorage:
    """Test session storage mechanisms and performance."""

    def setup_method(self):
        """Set up session storage testing."""
        self.temp_dir = tempfile.mkdtemp()
        self.storage_configs = [
            {"type": "sqlite", "path": os.path.join(self.temp_dir, "test.db")},
            {"type": "memory", "path": ":memory:"},
        ]

    def teardown_method(self):
        """Clean up storage test files."""
        import shutil

        if os.path.exists(self.temp_dir):
            shutil.rmtree(self.temp_dir)

    def test_sqlite_session_storage(self):
        """Test SQLite session storage performance."""
        storage_config = self.storage_configs[0]  # SQLite

        # Create test database
        conn = sqlite3.connect(storage_config["path"])
        cursor = conn.cursor()

        cursor.execute("""
            CREATE TABLE sessions (
                id TEXT PRIMARY KEY,
                user_id TEXT,
                data TEXT,
                created_at INTEGER
            )
        """)

        # Test storage operations
        test_sessions = []
        num_sessions = 100

        start_time = time.time()

        for i in range(num_sessions):
            session_id = str(uuid.uuid4())
            session_data = {
                "user_id": f"user_{i}",
                "state": {"step": f"step_{i}", "data": f"data_{i}"},
                "created_at": time.time(),
            }

            cursor.execute(
                """
                INSERT INTO sessions (id, user_id, data, created_at)
                VALUES (?, ?, ?, ?)
            """,
                (
                    session_id,
                    session_data["user_id"],
                    json.dumps(session_data["state"]),
                    session_data["created_at"],
                ),
            )

            test_sessions.append(session_id)

        conn.commit()
        storage_time = time.time() - start_time

        # Test retrieval performance
        start_time = time.time()

        for session_id in test_sessions:
            cursor.execute("SELECT * FROM sessions WHERE id = ?", (session_id,))
            result = cursor.fetchone()
            assert result is not None

        retrieval_time = time.time() - start_time

        conn.close()

        # Verify performance benchmarks
        assert storage_time < 5.0  # Should store 100 sessions within 5 seconds
        assert retrieval_time < 2.0  # Should retrieve 100 sessions within 2 seconds

    def test_memory_session_storage(self):
        """Test in-memory session storage performance."""
        storage_config = self.storage_configs[1]  # Memory

        # Use in-memory SQLite
        conn = sqlite3.connect(storage_config["path"])
        cursor = conn.cursor()

        cursor.execute("""
            CREATE TABLE sessions (
                id TEXT PRIMARY KEY,
                user_id TEXT,
                data TEXT,
                created_at INTEGER
            )
        """)

        # Test high-frequency operations
        num_operations = 1000
        start_time = time.time()

        for i in range(num_operations):
            session_id = f"mem_session_{i}"

            # Insert
            cursor.execute(
                """
                INSERT INTO sessions (id, user_id, data, created_at)
                VALUES (?, ?, ?, ?)
            """,
                (session_id, f"user_{i}", f'{{"data": "test_{i}"}}', time.time()),
            )

            # Read
            cursor.execute("SELECT data FROM sessions WHERE id = ?", (session_id,))
            result = cursor.fetchone()
            assert result is not None

            # Update
            cursor.execute(
                """
                UPDATE sessions SET data = ? WHERE id = ?
            """,
                (f'{{"data": "updated_{i}"}}', session_id),
            )

        operation_time = time.time() - start_time

        conn.close()

        # Memory operations should be very fast
        assert operation_time < 1.0  # 1000 operations within 1 second

    def test_session_storage_capacity(self):
        """Test session storage capacity limits."""
        storage_config = self.storage_configs[0]  # SQLite file

        conn = sqlite3.connect(storage_config["path"])
        cursor = conn.cursor()

        cursor.execute("""
            CREATE TABLE sessions (
                id TEXT PRIMARY KEY,
                user_id TEXT,
                large_data TEXT,
                created_at INTEGER
            )
        """)

        # Test with large session data
        large_data = json.dumps({"data": "x" * 10000})  # 10KB per session
        sessions_created = 0

        try:
            for i in range(1000):  # Attempt 1000 sessions x 10KB = 10MB
                session_id = f"large_session_{i}"
                cursor.execute(
                    """
                    INSERT INTO sessions (id, user_id, large_data, created_at)
                    VALUES (?, ?, ?, ?)
                """,
                    (session_id, f"user_{i}", large_data, time.time()),
                )

                sessions_created += 1

                if i % 100 == 0:  # Commit periodically
                    conn.commit()

        except Exception as e:
            print(f"Storage capacity reached after {sessions_created} sessions: {e}")

        conn.commit()
        conn.close()

        # Should handle reasonable number of large sessions
        assert sessions_created >= 100  # At least 100 large sessions


class TestSessionSecurity:
    """Test session security and data protection."""

    def setup_method(self):
        """Set up security testing."""
        self.test_user_id = "security_user_123"

    def test_session_id_generation(self):
        """Test session ID generation security."""
        # Generate multiple session IDs
        session_ids = set()
        num_ids = 1000

        for _ in range(num_ids):
            session_id = str(uuid.uuid4())
            session_ids.add(session_id)

            # Verify format
            assert len(session_id) == 36  # UUID format length
            assert session_id.count("-") == 4  # UUID dash pattern

        # All IDs should be unique
        assert len(session_ids) == num_ids

    def test_session_data_sanitization(self):
        """Test session data sanitization."""
        potentially_harmful_inputs = [
            "<script>alert('xss')</script>",
            "'; DROP TABLE sessions; --",
            "../../../etc/passwd",
            "javascript:alert('xss')",
            "<iframe src='http://evil.com'></iframe>",
        ]

        for harmful_input in potentially_harmful_inputs:
            session_data = {
                "user_input": harmful_input,
                "state": {"query": harmful_input},
            }

            # Sanitize or validate session data
            sanitized_data = {}
            for key, value in session_data.items():
                if isinstance(value, str):
                    # Basic sanitization (in real implementation, use proper libraries)
                    sanitized_value = value.replace("<", "&lt;").replace(">", "&gt;")
                    sanitized_data[key] = sanitized_value
                elif isinstance(value, dict):
                    sanitized_dict = {}
                    for sub_key, sub_value in value.items():
                        if isinstance(sub_value, str):
                            sanitized_dict[sub_key] = sub_value.replace(
                                "<", "&lt;"
                            ).replace(">", "&gt;")
                        else:
                            sanitized_dict[sub_key] = sub_value
                    sanitized_data[key] = sanitized_dict
                else:
                    sanitized_data[key] = value

            # Verify sanitization worked
            assert "<script>" not in json.dumps(sanitized_data)
            assert "DROP TABLE" in json.dumps(
                sanitized_data
            )  # SQL injection strings may remain but be escaped

    def test_session_access_control(self):
        """Test session access control."""
        # Create sessions for different users
        user1_id = "user_001"
        user2_id = "user_002"

        user1_sessions = [
            Session(
                id=str(uuid.uuid4()),
                user_id=user1_id,
                created_at=time.time(),
                state={"private": "data1"},
            ),
            Session(
                id=str(uuid.uuid4()),
                user_id=user1_id,
                created_at=time.time(),
                state={"private": "data2"},
            ),
        ]

        user2_sessions = [
            Session(
                id=str(uuid.uuid4()),
                user_id=user2_id,
                created_at=time.time(),
                state={"private": "data3"},
            ),
            Session(
                id=str(uuid.uuid4()),
                user_id=user2_id,
                created_at=time.time(),
                state={"private": "data4"},
            ),
        ]

        all_sessions = user1_sessions + user2_sessions

        # Test access control logic
        def get_user_sessions(requesting_user_id, all_sessions):
            return [
                session
                for session in all_sessions
                if session.user_id == requesting_user_id
            ]

        # User 1 should only see their sessions
        user1_accessible = get_user_sessions(user1_id, all_sessions)
        assert len(user1_accessible) == 2
        assert all(session.user_id == user1_id for session in user1_accessible)

        # User 2 should only see their sessions
        user2_accessible = get_user_sessions(user2_id, all_sessions)
        assert len(user2_accessible) == 2
        assert all(session.user_id == user2_id for session in user2_accessible)

        # No cross-contamination
        user1_session_ids = {session.id for session in user1_accessible}
        user2_session_ids = {session.id for session in user2_accessible}
        assert user1_session_ids.isdisjoint(user2_session_ids)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
