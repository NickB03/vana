#!/usr/bin/env python3
"""
Memory Bank Integration for VANA Agent

This module provides integration with the file-based memory bank for the VANA agent.
It allows reading and updating memory bank files with appropriate validation and error handling.
"""

import os
import logging
import json
import re
from datetime import datetime
from typing import Dict, List, Any, Optional, Union, Tuple

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MemoryBankManager:
    """
    Memory Bank Manager for the VANA agent.
    
    This class provides methods for reading and updating memory bank files,
    with appropriate validation and error handling.
    """
    
    def __init__(self, memory_bank_dir: str = None):
        """
        Initialize the Memory Bank Manager.
        
        Args:
            memory_bank_dir: Directory containing memory bank files (defaults to /memory-bank)
        """
        # Default to memory-bank directory in project root
        if memory_bank_dir is None:
            # Try to find the memory-bank directory relative to the current file
            current_dir = os.path.dirname(os.path.abspath(__file__))
            project_root = os.path.abspath(os.path.join(current_dir, "..", ".."))
            memory_bank_dir = os.path.join(project_root, "memory-bank")
        
        self.memory_bank_dir = memory_bank_dir
        
        # Validate memory bank directory
        if not os.path.exists(memory_bank_dir):
            logger.warning(f"Memory bank directory not found: {memory_bank_dir}")
        elif not os.path.isdir(memory_bank_dir):
            logger.warning(f"Memory bank path is not a directory: {memory_bank_dir}")
        
        logger.info(f"Initialized MemoryBankManager with directory: {memory_bank_dir}")
        
        # Core memory bank files
        self.core_files = [
            "projectbrief.md",
            "productContext.md",
            "activeContext.md",
            "systemPatterns.md",
            "techContext.md",
            "progress.md"
        ]
    
    def _validate_path(self, filename: str) -> Tuple[bool, str]:
        """
        Validate a file path to ensure it's safe to access.
        
        Args:
            filename: Name of the file to validate
            
        Returns:
            Tuple of (is_valid, full_path_or_error_message)
        """
        # Check for path traversal attempts
        if ".." in filename or filename.startswith("/") or filename.startswith("\\"):
            return False, "Invalid filename: path traversal attempt detected"
        
        # Only allow .md files
        if not filename.endswith(".md"):
            return False, "Invalid filename: only .md files are allowed"
        
        # Construct full path
        full_path = os.path.join(self.memory_bank_dir, filename)
        
        # Ensure the path is still within the memory bank directory
        if not os.path.abspath(full_path).startswith(os.path.abspath(self.memory_bank_dir)):
            return False, "Invalid filename: path would be outside memory bank directory"
        
        return True, full_path
    
    def read_file(self, filename: str) -> Dict[str, Any]:
        """
        Read a memory bank file.
        
        Args:
            filename: Name of the file to read
            
        Returns:
            Dictionary with file content and metadata
        """
        # Validate path
        is_valid, path_or_error = self._validate_path(filename)
        if not is_valid:
            logger.error(path_or_error)
            return {
                "success": False,
                "error": path_or_error
            }
        
        full_path = path_or_error
        
        try:
            # Check if file exists
            if not os.path.exists(full_path):
                error_msg = f"File not found: {filename}"
                logger.error(error_msg)
                return {
                    "success": False,
                    "error": error_msg
                }
            
            # Read file
            with open(full_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Get file metadata
            stats = os.stat(full_path)
            modified_time = datetime.fromtimestamp(stats.st_mtime).isoformat()
            
            logger.info(f"Successfully read memory bank file: {filename}")
            return {
                "success": True,
                "content": content,
                "filename": filename,
                "modified": modified_time,
                "size": stats.st_size
            }
        except Exception as e:
            error_msg = f"Error reading file {filename}: {str(e)}"
            logger.error(error_msg)
            return {
                "success": False,
                "error": error_msg
            }
    
    def update_file(self, filename: str, content: str) -> Dict[str, Any]:
        """
        Update a memory bank file.
        
        Args:
            filename: Name of the file to update
            content: New content for the file
            
        Returns:
            Dictionary with success status and metadata
        """
        # Validate path
        is_valid, path_or_error = self._validate_path(filename)
        if not is_valid:
            logger.error(path_or_error)
            return {
                "success": False,
                "error": path_or_error
            }
        
        full_path = path_or_error
        
        try:
            # Create backup if file exists
            if os.path.exists(full_path):
                backup_dir = os.path.join(self.memory_bank_dir, "backups")
                os.makedirs(backup_dir, exist_ok=True)
                
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                backup_filename = f"{os.path.splitext(filename)[0]}_{timestamp}.md"
                backup_path = os.path.join(backup_dir, backup_filename)
                
                with open(full_path, 'r', encoding='utf-8') as src, open(backup_path, 'w', encoding='utf-8') as dst:
                    dst.write(src.read())
                
                logger.info(f"Created backup of {filename} at {backup_path}")
            
            # Write new content
            with open(full_path, 'w', encoding='utf-8') as f:
                f.write(content)
            
            # Get updated metadata
            stats = os.stat(full_path)
            modified_time = datetime.fromtimestamp(stats.st_mtime).isoformat()
            
            logger.info(f"Successfully updated memory bank file: {filename}")
            return {
                "success": True,
                "filename": filename,
                "modified": modified_time,
                "size": stats.st_size
            }
        except Exception as e:
            error_msg = f"Error updating file {filename}: {str(e)}"
            logger.error(error_msg)
            return {
                "success": False,
                "error": error_msg
            }
    
    def list_files(self) -> Dict[str, Any]:
        """
        List all memory bank files.
        
        Returns:
            Dictionary with list of files and metadata
        """
        try:
            if not os.path.exists(self.memory_bank_dir):
                return {
                    "success": False,
                    "error": f"Memory bank directory not found: {self.memory_bank_dir}"
                }
            
            files = []
            for filename in os.listdir(self.memory_bank_dir):
                if filename.endswith(".md") and os.path.isfile(os.path.join(self.memory_bank_dir, filename)):
                    full_path = os.path.join(self.memory_bank_dir, filename)
                    stats = os.stat(full_path)
                    
                    files.append({
                        "filename": filename,
                        "modified": datetime.fromtimestamp(stats.st_mtime).isoformat(),
                        "size": stats.st_size,
                        "is_core": filename in self.core_files
                    })
            
            logger.info(f"Listed {len(files)} memory bank files")
            return {
                "success": True,
                "files": files
            }
        except Exception as e:
            error_msg = f"Error listing memory bank files: {str(e)}"
            logger.error(error_msg)
            return {
                "success": False,
                "error": error_msg
            }
    
    def extract_section(self, filename: str, section_title: str) -> Dict[str, Any]:
        """
        Extract a specific section from a memory bank file.
        
        Args:
            filename: Name of the file to read
            section_title: Title of the section to extract
            
        Returns:
            Dictionary with section content and metadata
        """
        # Read the file
        result = self.read_file(filename)
        if not result["success"]:
            return result
        
        content = result["content"]
        
        # Find the section
        pattern = re.compile(rf"^#+\s*{re.escape(section_title)}.*?$(.*?)(?=^#+\s|\Z)", re.MULTILINE | re.DOTALL)
        match = pattern.search(content)
        
        if not match:
            return {
                "success": False,
                "error": f"Section '{section_title}' not found in {filename}"
            }
        
        section_content = match.group(1).strip()
        
        logger.info(f"Successfully extracted section '{section_title}' from {filename}")
        return {
            "success": True,
            "section": section_title,
            "content": section_content,
            "filename": filename
        }
    
    def update_section(self, filename: str, section_title: str, new_content: str) -> Dict[str, Any]:
        """
        Update a specific section in a memory bank file.
        
        Args:
            filename: Name of the file to update
            section_title: Title of the section to update
            new_content: New content for the section
            
        Returns:
            Dictionary with success status and metadata
        """
        # Read the file
        result = self.read_file(filename)
        if not result["success"]:
            return result
        
        content = result["content"]
        
        # Find the section
        pattern = re.compile(rf"^(#+\s*{re.escape(section_title)}.*?$)(.*?)(?=^#+\s|\Z)", re.MULTILINE | re.DOTALL)
        match = pattern.search(content)
        
        if not match:
            return {
                "success": False,
                "error": f"Section '{section_title}' not found in {filename}"
            }
        
        # Replace the section content
        header = match.group(1)
        updated_content = content.replace(match.group(0), f"{header}\n\n{new_content.strip()}\n\n")
        
        # Update the file
        update_result = self.update_file(filename, updated_content)
        if update_result["success"]:
            logger.info(f"Successfully updated section '{section_title}' in {filename}")
        
        return update_result
