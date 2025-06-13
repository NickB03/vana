"""
Enhanced File System MCP Tools for VANA Agent System

This module provides advanced file system operations beyond basic read/write:
- File watching and monitoring
- Batch file operations
- File metadata and properties
- File compression and archiving
- Directory synchronization

Part of Phase 3: Fundamental MCP Implementation
"""

import hashlib
import json
import os
import shutil
import tarfile
import time
import zipfile
from pathlib import Path
from typing import Optional

from google.adk.tools import FunctionTool


def get_file_metadata(file_path: str) -> str:
    """
    Get comprehensive metadata for a file or directory.

    Args:
        file_path: Path to the file or directory

    Returns:
        JSON string with file metadata
    """
    try:
        path = Path(file_path)

        if not path.exists():
            return f"Error: Path '{file_path}' does not exist"

        stat = path.stat()

        metadata = {
            "path": str(path.absolute()),
            "name": path.name,
            "type": "directory" if path.is_dir() else "file",
            "size_bytes": stat.st_size,
            "size_human": _format_bytes(stat.st_size),
            "created": time.ctime(stat.st_ctime),
            "modified": time.ctime(stat.st_mtime),
            "accessed": time.ctime(stat.st_atime),
            "permissions": oct(stat.st_mode)[-3:],
            "owner_uid": stat.st_uid,
            "group_gid": stat.st_gid,
        }

        if path.is_file():
            # Add file-specific metadata
            metadata["extension"] = path.suffix
            metadata["stem"] = path.stem

            # Calculate file hash for integrity checking
            try:
                with open(path, "rb") as f:
                    file_hash = hashlib.md5()
                    for chunk in iter(lambda: f.read(4096), b""):
                        file_hash.update(chunk)
                    metadata["md5_hash"] = file_hash.hexdigest()
            except Exception:
                metadata["md5_hash"] = "Unable to calculate"

        elif path.is_dir():
            # Add directory-specific metadata
            try:
                contents = list(path.iterdir())
                metadata["item_count"] = len(contents)
                metadata["subdirectories"] = len([p for p in contents if p.is_dir()])
                metadata["files"] = len([p for p in contents if p.is_file()])
            except PermissionError:
                metadata["item_count"] = "Permission denied"

        return json.dumps(metadata, indent=2)

    except Exception as e:
        return f"Error getting file metadata: {str(e)}"


def batch_file_operations(operations: str) -> str:
    """
    Perform multiple file operations in batch.

    Args:
        operations: JSON string with list of operations
                   Format: [{"operation": "copy|move|delete", "source": "path", "destination": "path"}]

    Returns:
        Results of batch operations
    """
    try:
        ops_list = json.loads(operations)
        results = []

        for i, op in enumerate(ops_list):
            try:
                operation = op.get("operation", "").lower()
                source = op.get("source", "")
                destination = op.get("destination", "")

                if operation == "copy":
                    if os.path.isdir(source):
                        shutil.copytree(source, destination)
                    else:
                        shutil.copy2(source, destination)
                    results.append(f"Operation {i+1}: Copied '{source}' to '{destination}' - SUCCESS")

                elif operation == "move":
                    shutil.move(source, destination)
                    results.append(f"Operation {i+1}: Moved '{source}' to '{destination}' - SUCCESS")

                elif operation == "delete":
                    if os.path.isdir(source):
                        shutil.rmtree(source)
                    else:
                        os.remove(source)
                    results.append(f"Operation {i+1}: Deleted '{source}' - SUCCESS")

                else:
                    results.append(f"Operation {i+1}: Unknown operation '{operation}' - FAILED")

            except Exception as e:
                results.append(f"Operation {i+1}: {str(e)} - FAILED")

        return "\n".join(results)

    except Exception as e:
        return f"Error in batch operations: {str(e)}"


def compress_files(file_paths: str, archive_path: str, compression_type: str = "zip") -> str:
    """
    Compress files or directories into an archive.

    Args:
        file_paths: JSON list of file/directory paths to compress
        archive_path: Output archive file path
        compression_type: Type of compression ('zip', 'tar', 'tar.gz', 'tar.bz2')

    Returns:
        Compression result message
    """
    try:
        paths = json.loads(file_paths)

        if compression_type.lower() == "zip":
            with zipfile.ZipFile(archive_path, "w", zipfile.ZIP_DEFLATED) as zipf:
                for path_str in paths:
                    path = Path(path_str)
                    if path.is_file():
                        zipf.write(path, path.name)
                    elif path.is_dir():
                        for file_path in path.rglob("*"):
                            if file_path.is_file():
                                zipf.write(file_path, file_path.relative_to(path.parent))

        elif compression_type.lower() in ["tar", "tar.gz", "tar.bz2"]:
            mode_map = {"tar": "w", "tar.gz": "w:gz", "tar.bz2": "w:bz2"}
            mode = mode_map[compression_type.lower()]

            with tarfile.open(archive_path, mode) as tarf:
                for path_str in paths:
                    path = Path(path_str)
                    if path.exists():
                        tarf.add(path, path.name)

        else:
            return f"Error: Unsupported compression type '{compression_type}'"

        # Get archive info
        archive_size = os.path.getsize(archive_path)
        return f"Successfully created archive '{archive_path}' ({_format_bytes(archive_size)}) with {len(paths)} items"

    except Exception as e:
        return f"Error compressing files: {str(e)}"


def extract_archive(archive_path: str, extract_to: Optional[str] = None) -> str:
    """
    Extract files from an archive.

    Args:
        archive_path: Path to the archive file
        extract_to: Directory to extract to (default: same directory as archive)

    Returns:
        Extraction result message
    """
    try:
        archive_path = Path(archive_path)

        if not archive_path.exists():
            return f"Error: Archive '{archive_path}' does not exist"

        if extract_to is None:
            extract_to = archive_path.parent
        else:
            extract_to = Path(extract_to)
            extract_to.mkdir(parents=True, exist_ok=True)

        if archive_path.suffix.lower() == ".zip":
            with zipfile.ZipFile(archive_path, "r") as zipf:
                zipf.extractall(extract_to)
                file_count = len(zipf.namelist())

        elif archive_path.suffix.lower() in [".tar", ".gz", ".bz2"] or ".tar." in archive_path.name.lower():
            with tarfile.open(archive_path, "r:*") as tarf:
                tarf.extractall(extract_to)
                file_count = len(tarf.getnames())

        else:
            return f"Error: Unsupported archive format for '{archive_path}'"

        return f"Successfully extracted {file_count} items from '{archive_path}' to '{extract_to}'"

    except Exception as e:
        return f"Error extracting archive: {str(e)}"


def find_files(search_path: str, pattern: str = "*", file_type: str = "all", max_results: int = 100) -> str:
    """
    Search for files matching criteria.

    Args:
        search_path: Directory to search in
        pattern: File name pattern (supports wildcards)
        file_type: Type filter ('files', 'directories', 'all')
        max_results: Maximum number of results to return

    Returns:
        JSON string with search results
    """
    try:
        search_path = Path(search_path)

        if not search_path.exists():
            return f"Error: Search path '{search_path}' does not exist"

        results = []
        count = 0

        for path in search_path.rglob(pattern):
            if count >= max_results:
                break

            if file_type == "files" and not path.is_file():
                continue
            elif file_type == "directories" and not path.is_dir():
                continue

            stat = path.stat()
            results.append(
                {
                    "path": str(path),
                    "name": path.name,
                    "type": "directory" if path.is_dir() else "file",
                    "size": stat.st_size,
                    "modified": time.ctime(stat.st_mtime),
                }
            )
            count += 1

        return json.dumps(
            {
                "search_path": str(search_path),
                "pattern": pattern,
                "file_type": file_type,
                "results_count": len(results),
                "max_results_reached": count >= max_results,
                "results": results,
            },
            indent=2,
        )

    except Exception as e:
        return f"Error searching files: {str(e)}"


def sync_directories(source_dir: str, target_dir: str, sync_type: str = "mirror") -> str:
    """
    Synchronize two directories.

    Args:
        source_dir: Source directory path
        target_dir: Target directory path
        sync_type: Sync type ('mirror', 'update', 'merge')

    Returns:
        Synchronization result message
    """
    try:
        source = Path(source_dir)
        target = Path(target_dir)

        if not source.exists():
            return f"Error: Source directory '{source}' does not exist"

        target.mkdir(parents=True, exist_ok=True)

        copied_files = 0
        updated_files = 0
        deleted_files = 0

        if sync_type == "mirror":
            # Remove files in target that don't exist in source
            for target_file in target.rglob("*"):
                if target_file.is_file():
                    relative_path = target_file.relative_to(target)
                    source_file = source / relative_path
                    if not source_file.exists():
                        target_file.unlink()
                        deleted_files += 1

        # Copy/update files from source to target
        for source_file in source.rglob("*"):
            if source_file.is_file():
                relative_path = source_file.relative_to(source)
                target_file = target / relative_path

                # Create parent directories if needed
                target_file.parent.mkdir(parents=True, exist_ok=True)

                if not target_file.exists():
                    shutil.copy2(source_file, target_file)
                    copied_files += 1
                elif source_file.stat().st_mtime > target_file.stat().st_mtime:
                    shutil.copy2(source_file, target_file)
                    updated_files += 1

        return f"Directory sync complete: {copied_files} files copied, {updated_files} files updated, {deleted_files} files deleted"

    except Exception as e:
        return f"Error syncing directories: {str(e)}"


def _format_bytes(bytes_size: int) -> str:
    """Helper function to format bytes in human-readable format."""
    for unit in ["B", "KB", "MB", "GB", "TB"]:
        if bytes_size < 1024.0:
            return f"{bytes_size:.1f} {unit}"
        bytes_size /= 1024.0
    return f"{bytes_size:.1f} PB"


# Create ADK FunctionTool instances
adk_get_file_metadata = FunctionTool(func=get_file_metadata)
adk_get_file_metadata.name = "get_file_metadata"

adk_batch_file_operations = FunctionTool(func=batch_file_operations)
adk_batch_file_operations.name = "batch_file_operations"

adk_compress_files = FunctionTool(func=compress_files)
adk_compress_files.name = "compress_files"

adk_extract_archive = FunctionTool(func=extract_archive)
adk_extract_archive.name = "extract_archive"

adk_find_files = FunctionTool(func=find_files)
adk_find_files.name = "find_files"

adk_sync_directories = FunctionTool(func=sync_directories)
adk_sync_directories.name = "sync_directories"

# Export all enhanced file system tools
__all__ = [
    "adk_get_file_metadata",
    "adk_batch_file_operations",
    "adk_compress_files",
    "adk_extract_archive",
    "adk_find_files",
    "adk_sync_directories",
]
