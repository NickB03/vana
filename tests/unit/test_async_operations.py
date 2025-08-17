"""Unit tests for async operations."""

import asyncio
import json
import os
import tempfile
from unittest.mock import AsyncMock, Mock, patch

import aiofiles
import pytest
from aiohttp import ClientSession

from app.tools.brave_search import (
    brave_web_search_async,
    brave_web_search_function,
    cleanup_http_session,
    get_http_session,
)
from app.utils.session_backup import (
    backup_session_db_to_gcs,
    backup_session_db_to_gcs_async,
    restore_session_db_from_gcs,
    restore_session_db_from_gcs_async,
)


class TestAsyncBraveSearch:
    """Test async Brave Search functionality."""

    @pytest.fixture
    def mock_brave_response(self):
        """Mock successful Brave API response."""
        return {
            "web": {
                "results": [
                    {
                        "title": "Test Result 1",
                        "url": "https://example.com/1",
                        "description": "Test description 1",
                    },
                    {
                        "title": "Test Result 2",
                        "url": "https://example.com/2",
                        "description": "Test description 2",
                    },
                ]
            }
        }

    @pytest.mark.asyncio
    async def test_brave_web_search_async_success(self, mock_brave_response):
        """Test successful async Brave search."""
        with patch("aiohttp.ClientSession.get") as mock_get:
            # Mock the async context manager
            mock_response = AsyncMock()
            mock_response.raise_for_status = Mock()
            mock_response.json = AsyncMock(return_value=mock_brave_response)

            mock_get.return_value.__aenter__.return_value = mock_response
            mock_get.return_value.__aexit__.return_value = None

            # Set API key
            with patch.dict(os.environ, {"BRAVE_API_KEY": "test-key"}):
                result = await brave_web_search_async("test query", count=2)

            # Verify result
            assert result["query"] == "test query"
            assert result["source"] == "brave_search"
            assert len(result["results"]) == 2
            assert result["results"][0]["title"] == "Test Result 1"
            assert result["results"][0]["link"] == "https://example.com/1"

    @pytest.mark.asyncio
    async def test_brave_web_search_async_missing_api_key(self):
        """Test async search with missing API key."""
        with patch.dict(os.environ, {}, clear=True):
            result = await brave_web_search_async("test query")

        assert "error" in result
        assert "BRAVE_API_KEY" in result["error"]
        assert result["results"] == []

    @pytest.mark.asyncio
    async def test_brave_web_search_async_http_error(self):
        """Test async search with HTTP error."""
        with patch("aiohttp.ClientSession.get") as mock_get:
            mock_response = AsyncMock()
            mock_response.raise_for_status.side_effect = Exception("HTTP Error")

            mock_get.return_value.__aenter__.return_value = mock_response
            mock_get.return_value.__aexit__.return_value = None

            with patch.dict(os.environ, {"BRAVE_API_KEY": "test-key"}):
                result = await brave_web_search_async("test query")

            assert "error" in result
            assert result["results"] == []

    def test_brave_web_search_sync_wrapper(self, mock_brave_response):
        """Test sync wrapper returns expected results."""
        # Test that the sync wrapper returns expected format when given proper environment
        with patch.dict(os.environ, {"BRAVE_API_KEY": "test-key"}):
            # Mock aiohttp to return expected response
            with patch("aiohttp.ClientSession.get") as mock_get:
                mock_response = AsyncMock()
                mock_response.raise_for_status = Mock()
                mock_response.json = AsyncMock(return_value=mock_brave_response)

                mock_get.return_value.__aenter__.return_value = mock_response
                mock_get.return_value.__aexit__.return_value = None

                result = brave_web_search_function("test query")

                # Verify result format
                assert result["query"] == "test query"
                assert result["source"] == "brave_search"
                assert len(result["results"]) == 2
                assert result["results"][0]["title"] == "Test Result 1"

    @pytest.mark.asyncio
    async def test_http_session_pooling(self):
        """Test HTTP session creation and pooling."""
        # Test session creation
        session1 = await get_http_session()
        assert isinstance(session1, ClientSession)

        # Test session reuse
        session2 = await get_http_session()
        assert session1 is session2

        # Test cleanup
        await cleanup_http_session()

        # Test new session after cleanup
        session3 = await get_http_session()
        assert session3 is not session1


class TestAsyncSessionBackup:
    """Test async session backup functionality."""

    @pytest.fixture
    def temp_db_file(self):
        """Create a temporary database file."""
        with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as f:
            f.write(b"test database content")
            temp_path = f.name

        yield temp_path

        # Cleanup
        if os.path.exists(temp_path):
            os.unlink(temp_path)

    @pytest.fixture
    def mock_storage_client(self):
        """Mock Google Cloud Storage client."""
        with patch("google.cloud.storage.Client") as mock_client:
            mock_bucket = Mock()
            mock_blob = Mock()
            mock_bucket.blob.return_value = mock_blob
            mock_client.return_value.bucket.return_value = mock_bucket
            yield mock_client, mock_bucket, mock_blob

    @pytest.mark.asyncio
    async def test_backup_session_db_async_success(
        self, temp_db_file, mock_storage_client
    ):
        """Test successful async backup."""
        mock_client, mock_bucket, mock_blob = mock_storage_client

        result = await backup_session_db_to_gcs_async(
            temp_db_file, "test-bucket", "test-project"
        )

        # Verify result
        assert result.startswith("gs://test-bucket/session_backups/")
        assert result.endswith(".db")

        # Verify GCS calls
        mock_client.assert_called_once_with(project="test-project")
        mock_bucket.blob.assert_called_once()
        mock_blob.upload_from_filename.assert_called_once_with(temp_db_file)

    @pytest.mark.asyncio
    async def test_backup_session_db_async_missing_file(self):
        """Test async backup with missing file."""
        result = await backup_session_db_to_gcs_async(
            "/nonexistent/file.db", "test-bucket", "test-project"
        )

        assert result is None

    @pytest.mark.asyncio
    async def test_restore_session_db_async_success(self, mock_storage_client):
        """Test successful async restore."""
        mock_client, mock_bucket, mock_blob = mock_storage_client

        # Mock successful restore
        mock_blob.download_to_filename = Mock()

        with tempfile.TemporaryDirectory() as temp_dir:
            restore_path = os.path.join(temp_dir, "restored.db")

            result = await restore_session_db_from_gcs_async(
                restore_path, "test-bucket", "test-project", "backup.db"
            )

            assert result is True
            mock_blob.download_to_filename.assert_called_once_with(restore_path)

    @pytest.mark.asyncio
    async def test_restore_session_db_async_latest_backup(self, mock_storage_client):
        """Test async restore using latest backup."""
        mock_client, mock_bucket, mock_blob = mock_storage_client

        # Mock blob listing for finding latest backup
        mock_blob1 = Mock()
        mock_blob1.name = "session_backups/vana_sessions_20240101_120000.db"
        mock_blob2 = Mock()
        mock_blob2.name = "session_backups/vana_sessions_20240102_120000.db"

        mock_bucket.list_blobs.return_value = [mock_blob1, mock_blob2]
        mock_blob.download_to_filename = Mock()

        with tempfile.TemporaryDirectory() as temp_dir:
            restore_path = os.path.join(temp_dir, "restored.db")

            result = await restore_session_db_from_gcs_async(
                restore_path, "test-bucket", "test-project"
            )

            assert result is True
            # Should use the latest backup (20240102)
            mock_bucket.blob.assert_called_with(
                "session_backups/vana_sessions_20240102_120000.db"
            )

    def test_sync_backup_wrapper(self, temp_db_file):
        """Test sync backup wrapper."""
        with patch(
            "app.utils.session_backup.backup_session_db_to_gcs_async"
        ) as mock_async:
            mock_async.return_value = "gs://test-bucket/backup.db"

            result = backup_session_db_to_gcs(
                temp_db_file, "test-bucket", "test-project"
            )

            assert result == "gs://test-bucket/backup.db"
            mock_async.assert_called_once()

    def test_sync_restore_wrapper(self):
        """Test sync restore wrapper."""
        with patch(
            "app.utils.session_backup.restore_session_db_from_gcs_async"
        ) as mock_async:
            mock_async.return_value = True

            result = restore_session_db_from_gcs(
                "/tmp/test.db", "test-bucket", "test-project"
            )

            assert result is True
            mock_async.assert_called_once()


class TestAsyncFilesOperations:
    """Test async file operations using aiofiles."""

    @pytest.mark.asyncio
    async def test_aiofiles_basic_operations(self):
        """Test basic aiofiles operations."""
        test_data = {"test": "data", "number": 42}

        with tempfile.NamedTemporaryFile(mode="w", delete=False) as temp_file:
            temp_path = temp_file.name

        try:
            # Test async write
            async with aiofiles.open(temp_path, "w") as f:
                await f.write(json.dumps(test_data))

            # Test async read
            async with aiofiles.open(temp_path) as f:
                content = await f.read()

            # Verify content
            loaded_data = json.loads(content)
            assert loaded_data == test_data

            # Test file existence
            exists = os.path.exists(temp_path)
            assert exists is True

        finally:
            # Cleanup
            if os.path.exists(temp_path):
                os.remove(temp_path)

    @pytest.mark.asyncio
    async def test_aiofiles_directory_operations(self):
        """Test async directory operations."""
        with tempfile.TemporaryDirectory() as temp_dir:
            test_dir = os.path.join(temp_dir, "test_subdir")

            # Test directory creation
            os.makedirs(test_dir, exist_ok=True)

            # Verify directory exists
            exists = os.path.exists(test_dir)
            assert exists is True

            # Test that it's a directory
            is_dir = os.path.isdir(test_dir)
            assert is_dir is True


@pytest.mark.asyncio
async def test_concurrent_operations():
    """Test that multiple async operations can run concurrently."""
    import time

    async def slow_operation(duration: float, result: str) -> str:
        await asyncio.sleep(duration)
        return result

    start_time = time.time()

    # Run 3 operations concurrently (each takes 0.1 seconds)
    tasks = [
        slow_operation(0.1, "result1"),
        slow_operation(0.1, "result2"),
        slow_operation(0.1, "result3"),
    ]

    results = await asyncio.gather(*tasks)
    end_time = time.time()

    # Total time should be close to 0.1s (concurrent) not 0.3s (sequential)
    total_time = end_time - start_time
    assert total_time < 0.2  # Allow some overhead
    assert results == ["result1", "result2", "result3"]


if __name__ == "__main__":
    pytest.main([__file__])
