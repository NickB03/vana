"""
Tests for the File System tool.
"""

import os
import shutil
import tempfile
import unittest

from agent.tools.file_system import (
    FileSystemTool,
    file_exists,
    list_directory,
    read_file,
    write_file,
)


class TestFileSystemTool(unittest.TestCase):
    """Test cases for the FileSystemTool class."""

    def setUp(self):
        """Set up test environment."""
        # Create a temporary directory for testing
        self.test_dir = tempfile.mkdtemp()
        self.file_system_tool = FileSystemTool()
        self.file_system_tool_with_base = FileSystemTool(base_dir=self.test_dir)

        # Create a test file
        self.test_file_path = os.path.join(self.test_dir, "test_file.txt")
        with open(self.test_file_path, "w") as f:
            f.write("Test content")

        # Create a subdirectory
        self.test_subdir_path = os.path.join(self.test_dir, "test_subdir")
        os.makedirs(self.test_subdir_path, exist_ok=True)

    def tearDown(self):
        """Clean up after tests."""
        # Remove the temporary directory and its contents
        shutil.rmtree(self.test_dir)

    def test_initialization(self):
        """Test tool initialization."""
        self.assertIsNone(self.file_system_tool.base_dir)
        self.assertEqual(self.file_system_tool_with_base.base_dir, self.test_dir)

    def test_validate_path(self):
        """Test path validation."""
        # Valid paths
        self.assertTrue(self.file_system_tool._validate_path(self.test_file_path))
        self.assertTrue(self.file_system_tool._validate_path(self.test_dir))

        # Invalid paths (restricted directories)
        self.assertFalse(self.file_system_tool._validate_path("/etc/passwd"))
        self.assertFalse(self.file_system_tool._validate_path("/var/log/syslog"))

        # Invalid file extensions
        self.assertFalse(self.file_system_tool._validate_path("/tmp/test.exe"))
        self.assertFalse(self.file_system_tool._validate_path("/tmp/test.dll"))

        # Test base directory restriction
        outside_path = os.path.join(tempfile.gettempdir(), "outside.txt")
        self.assertTrue(self.file_system_tool._validate_path(outside_path))
        self.assertFalse(self.file_system_tool_with_base._validate_path(outside_path))

    def test_read_file(self):
        """Test reading a file."""
        # Test reading an existing file
        result = self.file_system_tool.read_file(self.test_file_path)
        self.assertTrue(result["success"])
        self.assertEqual(result["content"], "Test content")

        # Test reading a non-existent file
        non_existent_path = os.path.join(self.test_dir, "non_existent.txt")
        result = self.file_system_tool.read_file(non_existent_path)
        self.assertFalse(result["success"])
        self.assertIn("not found", result["error"])

        # Test reading a directory
        result = self.file_system_tool.read_file(self.test_dir)
        self.assertFalse(result["success"])
        self.assertIn("Not a file", result["error"])

        # Test reading a file outside base directory
        outside_path = os.path.join(tempfile.gettempdir(), "outside.txt")
        with open(outside_path, "w") as f:
            f.write("Outside content")

        try:
            result = self.file_system_tool_with_base.read_file(outside_path)
            self.assertFalse(result["success"])
            self.assertIn("Invalid or restricted", result["error"])
        finally:
            # Clean up
            if os.path.exists(outside_path):
                os.remove(outside_path)

    def test_write_file(self):
        """Test writing to a file."""
        # Test writing to a new file
        new_file_path = os.path.join(self.test_dir, "new_file.txt")
        result = self.file_system_tool.write_file(new_file_path, "New content")
        self.assertTrue(result["success"])

        # Verify the file was written
        with open(new_file_path) as f:
            content = f.read()
        self.assertEqual(content, "New content")

        # Test appending to a file
        result = self.file_system_tool.write_file(
            new_file_path, " Appended", append=True
        )
        self.assertTrue(result["success"])

        # Verify the content was appended
        with open(new_file_path) as f:
            content = f.read()
        self.assertEqual(content, "New content Appended")

        # Test writing to a file with an invalid extension
        invalid_path = os.path.join(self.test_dir, "invalid.exe")
        result = self.file_system_tool.write_file(invalid_path, "Invalid content")
        self.assertFalse(result["success"])
        self.assertIn("not allowed", result["error"])

        # Test writing to a file outside base directory
        outside_path = os.path.join(tempfile.gettempdir(), "outside.txt")
        result = self.file_system_tool_with_base.write_file(
            outside_path, "Outside content"
        )
        self.assertFalse(result["success"])
        self.assertIn("Invalid or restricted", result["error"])

    def test_list_directory(self):
        """Test listing directory contents."""
        # Test listing an existing directory
        result = self.file_system_tool.list_directory(self.test_dir)
        self.assertTrue(result["success"])

        # Verify the contents
        contents = result["contents"]
        self.assertEqual(len(contents), 2)  # test_file.txt and test_subdir

        # Check that file types are correct
        file_entry = next(
            (item for item in contents if item["name"] == "test_file.txt"), None
        )
        dir_entry = next(
            (item for item in contents if item["name"] == "test_subdir"), None
        )

        self.assertIsNotNone(file_entry)
        self.assertIsNotNone(dir_entry)
        self.assertEqual(file_entry["type"], "file")
        self.assertEqual(dir_entry["type"], "directory")

        # Test listing a non-existent directory
        non_existent_path = os.path.join(self.test_dir, "non_existent_dir")
        result = self.file_system_tool.list_directory(non_existent_path)
        self.assertFalse(result["success"])
        self.assertIn("not found", result["error"])

        # Test listing a file
        result = self.file_system_tool.list_directory(self.test_file_path)
        self.assertFalse(result["success"])
        self.assertIn("Not a directory", result["error"])

        # Test listing a directory outside base directory
        outside_dir = tempfile.mkdtemp()
        try:
            result = self.file_system_tool_with_base.list_directory(outside_dir)
            self.assertFalse(result["success"])
            self.assertIn("Invalid or restricted", result["error"])
        finally:
            # Clean up
            if os.path.exists(outside_dir):
                shutil.rmtree(outside_dir)

    def test_file_exists(self):
        """Test checking if a file exists."""
        # Test with an existing file
        result = self.file_system_tool.file_exists(self.test_file_path)
        self.assertTrue(result["success"])
        self.assertTrue(result["exists"])

        # Test with a non-existent file
        non_existent_path = os.path.join(self.test_dir, "non_existent.txt")
        result = self.file_system_tool.file_exists(non_existent_path)
        self.assertTrue(result["success"])
        self.assertFalse(result["exists"])

        # Test with a directory
        result = self.file_system_tool.file_exists(self.test_dir)
        self.assertTrue(result["success"])
        self.assertFalse(result["exists"])  # It exists but is not a file

        # Test with a path outside base directory
        outside_path = os.path.join(tempfile.gettempdir(), "outside.txt")
        result = self.file_system_tool_with_base.file_exists(outside_path)
        self.assertFalse(result["success"])
        self.assertIn("Invalid or restricted", result["error"])

    def test_get_metadata(self):
        """Test getting tool metadata."""
        metadata = self.file_system_tool.get_metadata()

        self.assertEqual(metadata["name"], "file_system")
        self.assertIn("description", metadata)
        self.assertIn("operations", metadata)

        # Check operations
        operations = metadata["operations"]
        operation_names = [op["name"] for op in operations]
        self.assertIn("read_file", operation_names)
        self.assertIn("write_file", operation_names)
        self.assertIn("list_directory", operation_names)
        self.assertIn("file_exists", operation_names)

    def test_function_wrappers(self):
        """Test the function wrappers."""
        # Test read_file wrapper
        content = read_file(self.test_file_path)
        self.assertEqual(content, "Test content")

        # Test write_file wrapper
        new_file_path = os.path.join(self.test_dir, "wrapper_test.txt")
        result = write_file(new_file_path, "Wrapper test")
        self.assertTrue(result["success"])

        # Verify the file was written
        with open(new_file_path) as f:
            content = f.read()
        self.assertEqual(content, "Wrapper test")

        # Test list_directory wrapper
        contents = list_directory(self.test_dir)
        self.assertIsInstance(contents, list)
        self.assertEqual(
            len(contents), 3
        )  # test_file.txt, test_subdir, and wrapper_test.txt

        # Test file_exists wrapper
        exists = file_exists(new_file_path)
        self.assertTrue(exists)

        non_existent = file_exists(os.path.join(self.test_dir, "non_existent.txt"))
        self.assertFalse(non_existent)


if __name__ == "__main__":
    unittest.main()
