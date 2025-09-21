"""
Comprehensive unit tests for session backup and restore functionality.

Tests cover:
- GCS backup operations (async and sync)
- Session database restore from backups
- Cloud Run persistence setup
- Periodic backup job management
- Error handling and edge cases
- Mock GCS integration
"""

import asyncio
import os
import tempfile
import threading
from unittest.mock import AsyncMock, Mock, patch
from datetime import datetime

import pytest

from app.utils.session_backup import (
    backup_session_db_to_gcs,
    backup_session_db_to_gcs_async,
    create_periodic_backup_job,
    create_periodic_backup_job_async,
    restore_session_db_from_gcs,
    restore_session_db_from_gcs_async,
    setup_session_persistence_for_cloud_run,
)


class TestAsyncBackupOperations:
    """Test async backup functionality."""

    @pytest.mark.asyncio
    async def test_backup_session_db_success(self):
        """Test successful async backup to GCS."""
        mock_storage_client = Mock()
        mock_bucket = Mock()
        mock_blob = Mock()
        
        mock_storage_client.bucket.return_value = mock_bucket
        mock_bucket.blob.return_value = mock_blob
        
        with tempfile.NamedTemporaryFile(delete=False) as temp_file:
            temp_file.write(b"test database content")
            temp_db_path = temp_file.name
        
        try:
            with patch('app.utils.session_backup.storage') as mock_storage_module:
                mock_storage_module.Client.return_value = mock_storage_client
                
                result = await backup_session_db_to_gcs_async(
                    local_db_path=temp_db_path,
                    bucket_name="test-bucket",
                    project_id="test-project"
                )
                
                # Verify backup was successful
                assert result is not None
                assert result.startswith("gs://test-bucket/session_backups/vana_sessions_")
                assert result.endswith(".db")
                
                # Verify GCS calls
                mock_storage_module.Client.assert_called_once_with(project="test-project")
                mock_storage_client.bucket.assert_called_once_with("test-bucket")
                mock_blob.upload_from_filename.assert_called_once_with(temp_db_path)
                
        finally:
            os.unlink(temp_db_path)

    @pytest.mark.asyncio
    async def test_backup_session_db_file_not_found(self):
        """Test backup when database file doesn't exist."""
        with patch('app.utils.session_backup.storage') as mock_storage_module:
            result = await backup_session_db_to_gcs_async(
                local_db_path="/nonexistent/database.db",
                bucket_name="test-bucket",
                project_id="test-project"
            )
            
            assert result is None
            # Should not attempt GCS operations
            mock_storage_module.Client.assert_not_called()

    @pytest.mark.asyncio
    async def test_backup_session_db_gcs_error(self):
        """Test backup when GCS operations fail."""
        mock_storage_client = Mock()
        mock_bucket = Mock()
        mock_blob = Mock()
        
        mock_storage_client.bucket.return_value = mock_bucket
        mock_bucket.blob.return_value = mock_blob
        mock_blob.upload_from_filename.side_effect = Exception("GCS upload failed")
        
        with tempfile.NamedTemporaryFile(delete=False) as temp_file:
            temp_file.write(b"test content")
            temp_db_path = temp_file.name
        
        try:
            with patch('app.utils.session_backup.storage') as mock_storage_module:
                mock_storage_module.Client.return_value = mock_storage_client
                
                result = await backup_session_db_to_gcs_async(
                    local_db_path=temp_db_path,
                    bucket_name="error-bucket",
                    project_id="test-project"
                )
                
                assert result is None
                
        finally:
            os.unlink(temp_db_path)

    @pytest.mark.asyncio
    async def test_backup_session_db_no_storage_module(self):
        """Test backup when google-cloud-storage is not installed."""
        with patch('app.utils.session_backup.storage', None):
            result = await backup_session_db_to_gcs_async(
                local_db_path="/some/path.db",
                bucket_name="test-bucket",
                project_id="test-project"
            )
            
            assert result is None

    @pytest.mark.asyncio
    async def test_backup_custom_prefix(self):
        """Test backup with custom backup prefix."""
        mock_storage_client = Mock()
        mock_bucket = Mock()
        mock_blob = Mock()
        
        mock_storage_client.bucket.return_value = mock_bucket
        mock_bucket.blob.return_value = mock_blob
        
        with tempfile.NamedTemporaryFile(delete=False) as temp_file:
            temp_file.write(b"test content")
            temp_db_path = temp_file.name
        
        try:
            with patch('app.utils.session_backup.storage') as mock_storage_module:
                mock_storage_module.Client.return_value = mock_storage_client
                
                result = await backup_session_db_to_gcs_async(
                    local_db_path=temp_db_path,
                    bucket_name="test-bucket",
                    project_id="test-project",
                    backup_prefix="custom_backups"
                )
                
                assert "custom_backups/vana_sessions_" in result
                # Verify blob was created with custom prefix
                blob_call_args = mock_bucket.blob.call_args[0][0]
                assert blob_call_args.startswith("custom_backups/")
                
        finally:
            os.unlink(temp_db_path)


class TestAsyncRestoreOperations:
    """Test async restore functionality."""

    @pytest.mark.asyncio
    async def test_restore_session_db_success(self):
        """Test successful async restore from GCS."""
        mock_storage_client = Mock()
        mock_bucket = Mock()
        mock_blob = Mock()
        
        mock_storage_client.bucket.return_value = mock_bucket
        mock_bucket.blob.return_value = mock_blob
        
        with tempfile.TemporaryDirectory() as temp_dir:
            restore_path = os.path.join(temp_dir, "restored.db")
            
            with patch('app.utils.session_backup.storage') as mock_storage_module:
                mock_storage_module.Client.return_value = mock_storage_client
                
                result = await restore_session_db_from_gcs_async(
                    local_db_path=restore_path,
                    bucket_name="test-bucket",
                    project_id="test-project",
                    backup_filename="session_backups/backup_20230101_120000.db"
                )
                
                assert result is True
                
                # Verify GCS calls
                mock_storage_module.Client.assert_called_once_with(project="test-project")
                mock_storage_client.bucket.assert_called_once_with("test-bucket")
                mock_bucket.blob.assert_called_once_with("session_backups/backup_20230101_120000.db")
                mock_blob.download_to_filename.assert_called_once_with(restore_path)

    @pytest.mark.asyncio
    async def test_restore_session_db_latest_backup(self):
        """Test restore using latest backup when no specific filename provided."""
        mock_storage_client = Mock()
        mock_bucket = Mock()
        
        # Mock blobs in bucket
        mock_blob1 = Mock()
        mock_blob1.name = "session_backups/vana_sessions_20230101_100000.db"
        mock_blob2 = Mock() 
        mock_blob2.name = "session_backups/vana_sessions_20230101_120000.db"
        mock_blob3 = Mock()
        mock_blob3.name = "session_backups/vana_sessions_20230101_140000.db"
        mock_blob_latest = Mock()
        
        mock_bucket.list_blobs.return_value = [mock_blob1, mock_blob2, mock_blob3]
        mock_bucket.blob.return_value = mock_blob_latest
        
        mock_storage_client.bucket.return_value = mock_bucket
        
        with tempfile.TemporaryDirectory() as temp_dir:
            restore_path = os.path.join(temp_dir, "restored.db")
            
            with patch('app.utils.session_backup.storage') as mock_storage_module:
                mock_storage_module.Client.return_value = mock_storage_client
                
                result = await restore_session_db_from_gcs_async(
                    local_db_path=restore_path,
                    bucket_name="test-bucket",
                    project_id="test-project",
                    backup_filename=None  # Should use latest
                )
                
                assert result is True
                
                # Should use latest backup (sorted by name)
                mock_bucket.blob.assert_called_once_with("session_backups/vana_sessions_20230101_140000.db")

    @pytest.mark.asyncio
    async def test_restore_session_db_no_backups(self):
        """Test restore when no backup files exist."""
        mock_storage_client = Mock()
        mock_bucket = Mock()
        
        mock_bucket.list_blobs.return_value = []  # No backups
        mock_storage_client.bucket.return_value = mock_bucket
        
        with patch('app.utils.session_backup.storage') as mock_storage_module:
            mock_storage_module.Client.return_value = mock_storage_client
            
            result = await restore_session_db_from_gcs_async(
                local_db_path="/tmp/restore.db",
                bucket_name="empty-bucket",
                project_id="test-project"
            )
            
            assert result is False

    @pytest.mark.asyncio
    async def test_restore_session_db_not_found_error(self):
        """Test restore when backup file not found."""
        mock_storage_client = Mock()
        mock_bucket = Mock()
        mock_blob = Mock()
        
        mock_blob.download_to_filename.side_effect = exceptions.NotFound("Backup not found")
        
        mock_storage_client.bucket.return_value = mock_bucket
        mock_bucket.blob.return_value = mock_blob
        
        with patch('app.utils.session_backup.storage') as mock_storage_module:
            mock_storage_module.Client.return_value = mock_storage_client
            
            result = await restore_session_db_from_gcs_async(
                local_db_path="/tmp/restore.db",
                bucket_name="test-bucket",
                project_id="test-project",
                backup_filename="nonexistent/backup.db"
            )
            
            assert result is False

    @pytest.mark.asyncio
    async def test_restore_session_db_creates_directory(self):
        """Test that restore creates parent directories if needed."""
        mock_storage_client = Mock()
        mock_bucket = Mock()
        mock_blob = Mock()
        
        mock_storage_client.bucket.return_value = mock_bucket
        mock_bucket.blob.return_value = mock_blob
        
        with tempfile.TemporaryDirectory() as temp_dir:
            # Path with nested directory that doesn't exist
            restore_path = os.path.join(temp_dir, "nested", "dir", "restored.db")
            
            with patch('app.utils.session_backup.storage') as mock_storage_module:
                mock_storage_module.Client.return_value = mock_storage_client
                
                result = await restore_session_db_from_gcs_async(
                    local_db_path=restore_path,
                    bucket_name="test-bucket",
                    project_id="test-project",
                    backup_filename="backup.db"
                )
                
                assert result is True
                # Directory should have been created
                assert os.path.exists(os.path.dirname(restore_path))

    @pytest.mark.asyncio
    async def test_restore_session_db_no_storage_module(self):
        """Test restore when google-cloud-storage is not installed."""
        with patch('app.utils.session_backup.storage', None):
            result = await restore_session_db_from_gcs_async(
                local_db_path="/tmp/restore.db",
                bucket_name="test-bucket",
                project_id="test-project"
            )
            
            assert result is False


class TestSyncWrapperFunctions:
    """Test synchronous wrapper functions."""

    def test_sync_backup_no_event_loop(self):
        """Test sync backup when no event loop is running."""
        with patch('app.utils.session_backup.backup_session_db_to_gcs_async') as mock_async_backup, \
             patch('app.utils.session_backup.asyncio.run') as mock_run, \
             patch('app.utils.session_backup.asyncio.get_running_loop') as mock_get_loop:
            
            mock_get_loop.side_effect = RuntimeError("No running loop")
            mock_run.return_value = "gs://bucket/backup.db"
            
            result = backup_session_db_to_gcs(
                local_db_path="/tmp/test.db",
                bucket_name="test-bucket",
                project_id="test-project"
            )
            
            assert result == "gs://bucket/backup.db"
            mock_run.assert_called_once()

    def test_sync_backup_with_event_loop(self):
        """Test sync backup when event loop is already running."""
        mock_loop = Mock()
        
        with patch('app.utils.session_backup.backup_session_db_to_gcs_async') as mock_async_backup, \
             patch('app.utils.session_backup.asyncio.get_running_loop', return_value=mock_loop), \
             patch('app.utils.session_backup.concurrent.futures.ThreadPoolExecutor') as mock_executor:
            
            # Mock thread pool execution
            mock_future = Mock()
            mock_future.result.return_value = "gs://bucket/threaded_backup.db"
            mock_executor.return_value.__enter__.return_value.submit.return_value = mock_future
            
            result = backup_session_db_to_gcs(
                local_db_path="/tmp/test.db",
                bucket_name="test-bucket",
                project_id="test-project"
            )
            
            assert result == "gs://bucket/threaded_backup.db"
            mock_executor.assert_called_once()

    def test_sync_restore_no_event_loop(self):
        """Test sync restore when no event loop is running."""
        with patch('app.utils.session_backup.restore_session_db_from_gcs_async') as mock_async_restore, \
             patch('app.utils.session_backup.asyncio.run') as mock_run, \
             patch('app.utils.session_backup.asyncio.get_running_loop') as mock_get_loop:
            
            mock_get_loop.side_effect = RuntimeError("No running loop")
            mock_run.return_value = True
            
            result = restore_session_db_from_gcs(
                local_db_path="/tmp/restore.db",
                bucket_name="test-bucket",
                project_id="test-project"
            )
            
            assert result is True
            mock_run.assert_called_once()

    def test_sync_backup_error_handling(self):
        """Test sync backup error handling."""
        with patch('app.utils.session_backup.asyncio.get_running_loop') as mock_get_loop:
            mock_get_loop.side_effect = Exception("Unexpected error")
            
            result = backup_session_db_to_gcs(
                local_db_path="/tmp/test.db",
                bucket_name="test-bucket",
                project_id="test-project"
            )
            
            assert result is None

    def test_sync_restore_error_handling(self):
        """Test sync restore error handling."""
        with patch('app.utils.session_backup.asyncio.get_running_loop') as mock_get_loop:
            mock_get_loop.side_effect = Exception("Unexpected error")
            
            result = restore_session_db_from_gcs(
                local_db_path="/tmp/restore.db",
                bucket_name="test-bucket",
                project_id="test-project"
            )
            
            assert result is False

    def test_sync_functions_no_storage_module(self):
        """Test sync functions when google-cloud-storage is not installed."""
        with patch('app.utils.session_backup.storage', None):
            backup_result = backup_session_db_to_gcs(
                local_db_path="/tmp/test.db",
                bucket_name="test-bucket",
                project_id="test-project"
            )
            assert backup_result is None
            
            restore_result = restore_session_db_from_gcs(
                local_db_path="/tmp/restore.db",
                bucket_name="test-bucket",
                project_id="test-project"
            )
            assert restore_result is False


class TestCloudRunSetup:
    """Test Cloud Run persistence setup."""

    def test_setup_session_persistence_new_database(self):
        """Test setting up persistence when database doesn't exist."""
        with tempfile.TemporaryDirectory() as temp_dir:
            db_path = os.path.join(temp_dir, "sessions", "vana_sessions.db")
            
            with patch('app.utils.session_backup.restore_session_db_from_gcs') as mock_restore:
                mock_restore.return_value = True
                
                result = setup_session_persistence_for_cloud_run(
                    project_id="test-project",
                    session_db_path=db_path
                )
                
                expected_uri = f"sqlite:///{db_path}"
                assert result == expected_uri
                
                # Should have tried to restore from backup
                mock_restore.assert_called_once()
                
                # Directory should be created
                assert os.path.exists(os.path.dirname(db_path))

    def test_setup_session_persistence_existing_database(self):
        """Test setting up persistence when database already exists."""
        with tempfile.TemporaryDirectory() as temp_dir:
            db_path = os.path.join(temp_dir, "vana_sessions.db")
            
            # Create existing database file
            with open(db_path, 'w') as f:
                f.write("existing database")
            
            with patch('app.utils.session_backup.restore_session_db_from_gcs') as mock_restore:
                result = setup_session_persistence_for_cloud_run(
                    project_id="test-project",
                    session_db_path=db_path
                )
                
                expected_uri = f"sqlite:///{db_path}"
                assert result == expected_uri
                
                # Should not try to restore when database exists
                mock_restore.assert_not_called()

    def test_setup_session_persistence_default_path(self):
        """Test setup with default session database path."""
        result = setup_session_persistence_for_cloud_run(
            project_id="test-project"
        )
        
        expected_uri = "sqlite:///data/sessions/vana_sessions.db"
        assert result == expected_uri


class TestPeriodicBackupJobs:
    """Test periodic backup job functionality."""

    @pytest.mark.asyncio
    async def test_create_periodic_backup_job_async(self):
        """Test creating async periodic backup job."""
        with patch('app.utils.session_backup.backup_session_db_to_gcs_async') as mock_backup:
            mock_backup.return_value = "gs://bucket/backup.db"
            
            # Create backup job with short interval for testing
            task = await create_periodic_backup_job_async(
                local_db_path="/tmp/test.db",
                bucket_name="test-bucket",
                project_id="test-project",
                interval_hours=0.001  # Very short interval for testing
            )
            
            assert task is not None
            assert not task.done()
            
            # Cancel the task to clean up
            task.cancel()
            
            with pytest.raises(asyncio.CancelledError):
                await task

    @pytest.mark.asyncio
    async def test_periodic_backup_job_no_storage_module(self):
        """Test periodic backup job when storage module not available."""
        with patch('app.utils.session_backup.storage', None):
            task = await create_periodic_backup_job_async(
                local_db_path="/tmp/test.db",
                bucket_name="test-bucket",
                project_id="test-project"
            )
            
            # Should return completed no-op task
            assert task.done()

    def test_create_periodic_backup_job_with_event_loop(self):
        """Test creating periodic backup job when event loop exists."""
        mock_loop = Mock()
        
        with patch('app.utils.session_backup.asyncio.get_running_loop', return_value=mock_loop):
            create_periodic_backup_job(
                local_db_path="/tmp/test.db",
                bucket_name="test-bucket",
                project_id="test-project",
                interval_hours=6
            )
            
            # Should create task in the loop
            mock_loop.create_task.assert_called_once()

    def test_create_periodic_backup_job_no_event_loop(self):
        """Test creating periodic backup job when no event loop exists."""
        with patch('app.utils.session_backup.asyncio.get_running_loop') as mock_get_loop, \
             patch('app.utils.session_backup.threading.Thread') as mock_thread, \
             patch('app.utils.session_backup.backup_session_db_to_gcs') as mock_backup:
            
            mock_get_loop.side_effect = RuntimeError("No running loop")
            mock_thread_instance = Mock()
            mock_thread.return_value = mock_thread_instance
            
            create_periodic_backup_job(
                local_db_path="/tmp/test.db",
                bucket_name="test-bucket", 
                project_id="test-project",
                interval_hours=6
            )
            
            # Should start daemon thread
            mock_thread.assert_called_once()
            mock_thread_instance.start.assert_called_once()

    def test_create_periodic_backup_job_no_storage_module(self):
        """Test periodic backup job creation when storage module not available."""
        with patch('app.utils.session_backup.storage', None):
            # Should not raise exception
            create_periodic_backup_job(
                local_db_path="/tmp/test.db",
                bucket_name="test-bucket",
                project_id="test-project"
            )


class TestBackupIntegration:
    """Test integration scenarios for backup functionality."""

    def test_backup_restore_roundtrip(self):
        """Test complete backup and restore cycle."""
        with tempfile.TemporaryDirectory() as temp_dir:
            # Create source database file
            source_db = os.path.join(temp_dir, "source.db")
            test_content = b"test database content for roundtrip"
            
            with open(source_db, 'wb') as f:
                f.write(test_content)
            
            # Mock GCS operations
            stored_content = None
            
            def mock_upload(filename):
                nonlocal stored_content
                with open(filename, 'rb') as f:
                    stored_content = f.read()
            
            def mock_download(filename):
                with open(filename, 'wb') as f:
                    f.write(stored_content)
            
            mock_storage_client = Mock()
            mock_bucket = Mock()
            mock_blob = Mock()
            
            mock_blob.upload_from_filename.side_effect = mock_upload
            mock_blob.download_to_filename.side_effect = mock_download
            
            mock_storage_client.bucket.return_value = mock_bucket
            mock_bucket.blob.return_value = mock_blob
            
            with patch('app.utils.session_backup.storage') as mock_storage_module:
                mock_storage_module.Client.return_value = mock_storage_client
                
                # Backup
                backup_result = backup_session_db_to_gcs(
                    local_db_path=source_db,
                    bucket_name="test-bucket",
                    project_id="test-project"
                )
                
                assert backup_result is not None
                assert stored_content == test_content
                
                # Restore to different location
                restore_db = os.path.join(temp_dir, "restored.db")
                restore_result = restore_session_db_from_gcs(
                    local_db_path=restore_db,
                    bucket_name="test-bucket",
                    project_id="test-project",
                    backup_filename="session_backups/test_backup.db"
                )
                
                assert restore_result is True
                assert os.path.exists(restore_db)
                
                # Verify content
                with open(restore_db, 'rb') as f:
                    restored_content = f.read()
                
                assert restored_content == test_content

    def test_concurrent_backup_operations(self):
        """Test multiple concurrent backup operations."""
        import threading
        from concurrent.futures import ThreadPoolExecutor
        
        def mock_backup_operation(thread_id):
            """Mock backup operation for concurrent testing."""
            with tempfile.NamedTemporaryFile(delete=False) as temp_file:
                temp_file.write(f"content from thread {thread_id}".encode())
                temp_path = temp_file.name
            
            try:
                with patch('app.utils.session_backup.storage') as mock_storage_module:
                    mock_storage_client = Mock()
                    mock_bucket = Mock() 
                    mock_blob = Mock()
                    
                    mock_storage_client.bucket.return_value = mock_bucket
                    mock_bucket.blob.return_value = mock_blob
                    mock_storage_module.Client.return_value = mock_storage_client
                    
                    result = backup_session_db_to_gcs(
                        local_db_path=temp_path,
                        bucket_name=f"thread-{thread_id}-bucket",
                        project_id="test-project"
                    )
                    
                    return result is not None
                    
            finally:
                os.unlink(temp_path)
        
        # Run multiple backup operations concurrently
        with ThreadPoolExecutor(max_workers=5) as executor:
            futures = [
                executor.submit(mock_backup_operation, i)
                for i in range(5)
            ]
            
            results = [future.result() for future in futures]
        
        # All backups should succeed
        assert all(results)

    def test_backup_with_permission_error(self):
        """Test backup handling when file permission errors occur."""
        with tempfile.TemporaryDirectory() as temp_dir:
            # Create a file we can't read (simulate permission error)
            restricted_db = os.path.join(temp_dir, "restricted.db")
            
            with open(restricted_db, 'w') as f:
                f.write("restricted content")
            
            # Mock file permission error
            mock_storage_client = Mock()
            mock_bucket = Mock()
            mock_blob = Mock()
            
            mock_blob.upload_from_filename.side_effect = PermissionError("Access denied")
            mock_storage_client.bucket.return_value = mock_bucket
            mock_bucket.blob.return_value = mock_blob
            
            with patch('app.utils.session_backup.storage') as mock_storage_module:
                mock_storage_module.Client.return_value = mock_storage_client
                
                result = backup_session_db_to_gcs(
                    local_db_path=restricted_db,
                    bucket_name="test-bucket",
                    project_id="test-project"
                )
                
                assert result is None


# Fixtures for backup testing

@pytest.fixture
def temp_database():
    """Create temporary database file for testing."""
    with tempfile.NamedTemporaryFile(delete=False) as temp_file:
        temp_file.write(b"test database content")
        temp_path = temp_file.name
    
    yield temp_path
    
    # Cleanup
    if os.path.exists(temp_path):
        os.unlink(temp_path)


@pytest.fixture
def mock_gcs_client():
    """Mock GCS client for testing."""
    client = Mock()
    bucket = Mock()
    blob = Mock()
    
    client.bucket.return_value = bucket
    bucket.blob.return_value = blob
    
    return client, bucket, blob


def test_backup_filename_format(temp_database, mock_gcs_client):
    """Test that backup filenames follow expected format."""
    client, bucket, blob = mock_gcs_client
    
    with patch('app.utils.session_backup.storage') as mock_storage_module:
        mock_storage_module.Client.return_value = client
        
        result = backup_session_db_to_gcs(
            local_db_path=temp_database,
            bucket_name="format-test-bucket",
            project_id="test-project"
        )
        
        assert result is not None
        
        # Check that blob was created with correct filename format
        blob_call_args = bucket.blob.call_args[0][0]
        assert blob_call_args.startswith("session_backups/vana_sessions_")
        assert blob_call_args.endswith(".db")
        assert len(blob_call_args.split("_")) >= 4  # Should have timestamp components


def test_restore_creates_missing_directories():
    """Test that restore creates missing parent directories."""
    with tempfile.TemporaryDirectory() as temp_dir:
        # Create nested path that doesn't exist
        nested_path = os.path.join(temp_dir, "level1", "level2", "level3", "restored.db")
        
        mock_storage_client = Mock()
        mock_bucket = Mock()
        mock_blob = Mock()
        
        mock_storage_client.bucket.return_value = mock_bucket
        mock_bucket.blob.return_value = mock_blob
        
        with patch('app.utils.session_backup.storage') as mock_storage_module:
            mock_storage_module.Client.return_value = mock_storage_client
            
            result = restore_session_db_from_gcs(
                local_db_path=nested_path,
                bucket_name="test-bucket",
                project_id="test-project",
                backup_filename="test_backup.db"
            )
            
            assert result is True
            # All parent directories should exist
            assert os.path.exists(os.path.dirname(nested_path))