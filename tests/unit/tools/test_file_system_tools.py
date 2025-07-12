"""
Unit tests for file system tools functionality

Tests the file system tools (read_file, write_file, list_directory, file_exists)
in isolation, validating their core functionality, error handling, and edge cases.
"""

import os

# Import the actual tools from VANA codebase
import sys
import tempfile
from pathlib import Path
from unittest.mock import patch

import pytest

sys.path.append(str(Path(__file__).parent.parent.parent.parent))

from lib._tools.adk_tools import adk_file_exists, adk_list_directory, adk_read_file, adk_write_file
from tests.framework import EnvironmentConfig, EnvironmentType, TestEnvironment


class TestFileSystemTools:
    """Unit tests for file system tools"""

    @pytest.fixture
    def test_env(self):
        """Create test environment"""
        config = EnvironmentConfig(env_type=EnvironmentType.UNIT)
        return TestEnvironment(config)

    @pytest.fixture
    def temp_dir(self):
        """Create temporary directory for testing"""
        with tempfile.TemporaryDirectory() as temp_dir:
            yield temp_dir

    @pytest.fixture
    def sample_file_content(self):
        """Sample file content for testing"""
        return "This is a test file.\nLine 2 of the test file.\nFinal line."

    @pytest.mark.unit
    def test_adk_read_file_success(self, temp_dir, sample_file_content):
        """Test successful file reading"""
        # Create test file
        test_file = os.path.join(temp_dir, "test.txt")
        with open(test_file, "w") as f:
            f.write(sample_file_content)

        # Test reading the file (access .func attribute for FunctionTool)
        result = adk_read_file.func(test_file)

        # Verify result (read_file returns just the content)
        assert result == sample_file_content

    @pytest.mark.unit
    def test_adk_read_file_not_found(self):
        """Test reading non-existent file"""
        result = adk_read_file.func("/nonexistent/file.txt")

        # Should handle error gracefully
        assert isinstance(result, str)
        assert "error" in result.lower() or "not found" in result.lower()

    @pytest.mark.unit
    def test_adk_read_file_permission_denied(self):
        """Test reading file with permission issues"""
        with patch("builtins.open", side_effect=PermissionError("Permission denied")):
            result = adk_read_file.func("/restricted/file.txt")

            assert isinstance(result, str)
            assert "permission" in result.lower() or "error" in result.lower()

    @pytest.mark.unit
    def test_adk_write_file_success(self, temp_dir):
        """Test successful file writing"""
        test_file = os.path.join(temp_dir, "write_test.txt")
        test_content = "This is test content for writing."

        # Test writing file
        result = adk_write_file.func(test_file, test_content)

        # Verify result indicates success
        assert isinstance(result, str)
        assert "success" in result.lower() or "written" in result.lower()

        # Verify file was actually written
        assert os.path.exists(test_file)
        with open(test_file, "r") as f:
            assert f.read() == test_content

    @pytest.mark.unit
    def test_adk_write_file_create_directory(self, temp_dir):
        """Test writing file with directory creation"""
        nested_file = os.path.join(temp_dir, "subdir", "nested.txt")
        test_content = "Nested file content"

        # Test writing to nested path
        result = adk_write_file.func(nested_file, test_content)

        # Should create directory and file
        assert isinstance(result, str)
        assert os.path.exists(nested_file)
        with open(nested_file, "r") as f:
            assert f.read() == test_content

    @pytest.mark.unit
    def test_adk_write_file_permission_error(self):
        """Test writing file with permission issues"""
        with patch("builtins.open", side_effect=PermissionError("Permission denied")):
            result = adk_write_file.func("/restricted/file.txt", "content")

            assert isinstance(result, str)
            assert "permission" in result.lower() or "error" in result.lower()

    @pytest.mark.unit
    def test_adk_list_directory_success(self, temp_dir):
        """Test successful directory listing"""
        # Create test files and directories
        test_files = ["file1.txt", "file2.py", "file3.md"]
        test_dirs = ["subdir1", "subdir2"]

        for filename in test_files:
            with open(os.path.join(temp_dir, filename), "w") as f:
                f.write("test content")

        for dirname in test_dirs:
            os.makedirs(os.path.join(temp_dir, dirname))

        # Test directory listing
        result = adk_list_directory.func(temp_dir)

        # Verify all files and directories are listed
        assert isinstance(result, str)
        for item in test_files + test_dirs:
            assert item in result

    @pytest.mark.unit
    def test_adk_list_directory_not_found(self):
        """Test listing non-existent directory"""
        result = adk_list_directory.func("/nonexistent/directory")

        assert isinstance(result, str)
        assert "error" in result.lower() or "not found" in result.lower()

    @pytest.mark.unit
    def test_adk_list_directory_empty(self, temp_dir):
        """Test listing empty directory"""
        empty_dir = os.path.join(temp_dir, "empty")
        os.makedirs(empty_dir)

        result = adk_list_directory.func(empty_dir)

        assert isinstance(result, str)
        assert "empty" in result.lower() or "no files" in result.lower()

    @pytest.mark.unit
    def test_adk_file_exists_true(self, temp_dir):
        """Test file exists check for existing file"""
        test_file = os.path.join(temp_dir, "exists.txt")
        with open(test_file, "w") as f:
            f.write("test")

        result = adk_file_exists.func(test_file)

        assert isinstance(result, str)
        assert "true" in result.lower() or "exists" in result.lower()

    @pytest.mark.unit
    def test_adk_file_exists_false(self):
        """Test file exists check for non-existent file"""
        result = adk_file_exists.func("/nonexistent/file.txt")

        assert isinstance(result, str)
        assert "false" in result.lower() or "not exist" in result.lower()

    @pytest.mark.unit
    def test_adk_file_exists_directory(self, temp_dir):
        """Test file exists check for directory"""
        result = adk_file_exists.func(temp_dir)

        assert isinstance(result, str)
        # Should indicate it's a directory, not a file
        assert "directory" in result.lower() or "folder" in result.lower()


class TestFileSystemToolsEdgeCases:
    """Edge case tests for file system tools"""

    @pytest.mark.unit
    def test_read_file_large_file(self, temp_dir):
        """Test reading very large file"""
        large_file = os.path.join(temp_dir, "large.txt")
        large_content = "Large file content\n" * 10000  # ~180KB

        with open(large_file, "w") as f:
            f.write(large_content)

        result = adk_read_file.func(large_file)

        # Should handle large files gracefully
        assert isinstance(result, str)
        assert len(result) > 0

    @pytest.mark.unit
    def test_read_file_binary_file(self, temp_dir):
        """Test reading binary file"""
        binary_file = os.path.join(temp_dir, "binary.bin")
        binary_content = b"\x00\x01\x02\x03\xff\xfe\xfd"

        with open(binary_file, "wb") as f:
            f.write(binary_content)

        result = adk_read_file.func(binary_file)

        # Should handle binary files gracefully
        assert isinstance(result, str)

    @pytest.mark.unit
    def test_write_file_unicode_content(self, temp_dir):
        """Test writing file with unicode content"""
        unicode_file = os.path.join(temp_dir, "unicode.txt")
        unicode_content = "Unicode test: 你好世界 🌍 café naïve résumé"

        result = adk_write_file.func(unicode_file, unicode_content)

        assert isinstance(result, str)
        assert os.path.exists(unicode_file)

        # Verify unicode content was written correctly
        with open(unicode_file, "r", encoding="utf-8") as f:
            assert f.read() == unicode_content

    @pytest.mark.unit
    def test_list_directory_special_characters(self, temp_dir):
        """Test listing directory with special character filenames"""
        special_files = [
            "file with spaces.txt",
            "file-with-dashes.txt",
            "file_with_underscores.txt",
        ]

        for filename in special_files:
            with open(os.path.join(temp_dir, filename), "w") as f:
                f.write("test")

        result = adk_list_directory.func(temp_dir)

        # Should handle special characters in filenames
        assert isinstance(result, str)
        for filename in special_files:
            assert filename in result

    @pytest.mark.unit
    def test_file_operations_relative_paths(self, temp_dir):
        """Test file operations with relative paths"""
        # Change to temp directory
        original_cwd = os.getcwd()
        try:
            os.chdir(temp_dir)

            # Test with relative paths
            relative_file = "relative_test.txt"
            content = "Relative path test"

            # Write with relative path
            write_result = adk_write_file.func(relative_file, content)
            assert isinstance(write_result, str)

            # Read with relative path
            read_result = adk_read_file.func(relative_file)
            assert content in read_result

            # Check exists with relative path
            exists_result = adk_file_exists.func(relative_file)
            assert "true" in exists_result.lower() or "exists" in exists_result.lower()

        finally:
            os.chdir(original_cwd)

    @pytest.mark.unit
    def test_file_operations_empty_strings(self):
        """Test file operations with empty strings"""
        # Test empty filename
        result = adk_read_file.func("")
        assert isinstance(result, str)
        assert "error" in result.lower()

        # Test empty content
        result = adk_write_file.func("test.txt", "")
        assert isinstance(result, str)

        # Test empty directory path
        result = adk_list_directory.func("")
        assert isinstance(result, str)
