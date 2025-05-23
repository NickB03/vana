#!/usr/bin/env python3
"""
Unit tests for the MemoryBankManager class.
"""

import unittest
import os
import tempfile
import shutil
from agent.memory.memory_bank import MemoryBankManager

class TestMemoryBankManager(unittest.TestCase):
    """Test cases for the MemoryBankManager class."""
    
    def setUp(self):
        """Set up test fixtures."""
        # Create a temporary directory for testing
        self.test_dir = tempfile.mkdtemp()
        
        # Create test memory bank files
        self.test_files = {
            "test1.md": "# Test File 1\n\n## Section 1\n\nThis is section 1 content.\n\n## Section 2\n\nThis is section 2 content.",
            "test2.md": "# Test File 2\n\nSome content here.",
            "projectbrief.md": "# Project Brief\n\n## Overview\n\nThis is a test project brief."
        }
        
        for filename, content in self.test_files.items():
            with open(os.path.join(self.test_dir, filename), 'w', encoding='utf-8') as f:
                f.write(content)
        
        # Create memory bank manager
        self.memory_bank = MemoryBankManager(memory_bank_dir=self.test_dir)
    
    def tearDown(self):
        """Tear down test fixtures."""
        # Remove temporary directory
        shutil.rmtree(self.test_dir)
    
    def test_read_file(self):
        """Test reading a memory bank file."""
        # Read a file
        result = self.memory_bank.read_file("test1.md")
        
        # Check results
        self.assertTrue(result["success"])
        self.assertEqual(result["filename"], "test1.md")
        self.assertEqual(result["content"], self.test_files["test1.md"])
        self.assertIn("modified", result)
        self.assertIn("size", result)
    
    def test_read_nonexistent_file(self):
        """Test reading a nonexistent file."""
        # Read a nonexistent file
        result = self.memory_bank.read_file("nonexistent.md")
        
        # Check results
        self.assertFalse(result["success"])
        self.assertIn("error", result)
        self.assertIn("not found", result["error"])
    
    def test_read_invalid_file(self):
        """Test reading a file with an invalid path."""
        # Read a file with an invalid path
        result = self.memory_bank.read_file("../outside.md")
        
        # Check results
        self.assertFalse(result["success"])
        self.assertIn("error", result)
        self.assertIn("path traversal", result["error"])
    
    def test_update_file(self):
        """Test updating a memory bank file."""
        # Update a file
        new_content = "# Updated Test File\n\nThis is updated content."
        result = self.memory_bank.update_file("test2.md", new_content)
        
        # Check results
        self.assertTrue(result["success"])
        self.assertEqual(result["filename"], "test2.md")
        
        # Read the file to verify update
        read_result = self.memory_bank.read_file("test2.md")
        self.assertEqual(read_result["content"], new_content)
    
    def test_update_nonexistent_file(self):
        """Test updating a nonexistent file (should create it)."""
        # Update a nonexistent file
        new_content = "# New File\n\nThis is a new file."
        result = self.memory_bank.update_file("new.md", new_content)
        
        # Check results
        self.assertTrue(result["success"])
        self.assertEqual(result["filename"], "new.md")
        
        # Read the file to verify creation
        read_result = self.memory_bank.read_file("new.md")
        self.assertEqual(read_result["content"], new_content)
    
    def test_list_files(self):
        """Test listing memory bank files."""
        # List files
        result = self.memory_bank.list_files()
        
        # Check results
        self.assertTrue(result["success"])
        self.assertIsInstance(result["files"], list)
        self.assertEqual(len(result["files"]), 3)
        
        # Check that all test files are in the list
        filenames = [file["filename"] for file in result["files"]]
        for filename in self.test_files.keys():
            self.assertIn(filename, filenames)
        
        # Check that projectbrief.md is marked as a core file
        for file in result["files"]:
            if file["filename"] == "projectbrief.md":
                self.assertTrue(file["is_core"])
    
    def test_extract_section(self):
        """Test extracting a section from a memory bank file."""
        # Extract a section
        result = self.memory_bank.extract_section("test1.md", "Section 1")
        
        # Check results
        self.assertTrue(result["success"])
        self.assertEqual(result["section"], "Section 1")
        self.assertEqual(result["content"], "This is section 1 content.")
    
    def test_extract_nonexistent_section(self):
        """Test extracting a nonexistent section."""
        # Extract a nonexistent section
        result = self.memory_bank.extract_section("test1.md", "Nonexistent Section")
        
        # Check results
        self.assertFalse(result["success"])
        self.assertIn("error", result)
        self.assertIn("not found", result["error"])
    
    def test_update_section(self):
        """Test updating a section in a memory bank file."""
        # Update a section
        new_content = "This is updated section 1 content."
        result = self.memory_bank.update_section("test1.md", "Section 1", new_content)
        
        # Check results
        self.assertTrue(result["success"])
        
        # Extract the section to verify update
        extract_result = self.memory_bank.extract_section("test1.md", "Section 1")
        self.assertEqual(extract_result["content"], new_content)
    
    def test_update_nonexistent_section(self):
        """Test updating a nonexistent section."""
        # Update a nonexistent section
        result = self.memory_bank.update_section("test1.md", "Nonexistent Section", "New content")
        
        # Check results
        self.assertFalse(result["success"])
        self.assertIn("error", result)
        self.assertIn("not found", result["error"])

if __name__ == "__main__":
    unittest.main()
