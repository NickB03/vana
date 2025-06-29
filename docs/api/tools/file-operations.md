# File Operations Tools

Core file management tools for reading, writing, and manipulating files.

## Available Tools

### `read_file`
**Status**: ✅ Fully Functional  
**Description**: Read complete file contents with encoding support

```python
# Example usage
result = await read_file("/path/to/file.txt")
# Returns: file contents as string
```

**Parameters**:
- `file_path` (string, required): Absolute path to file
- `limit` (number, optional): Maximum lines to read
- `offset` (number, optional): Starting line number

**Error Handling**:
- File not found: Returns clear error message
- Permission denied: Security validation error
- Large files: Automatic truncation with warning

### `write_file`
**Status**: ✅ Fully Functional  
**Description**: Create new file or overwrite existing with content

```python
# Example usage
result = await write_file("/path/to/file.txt", "content")
# Returns: success confirmation
```

**Parameters**:
- `file_path` (string, required): Absolute path for file
- `content` (string, required): Content to write

**Security Features**:
- Path validation prevents directory traversal
- Content filtering for malicious patterns
- Backup creation for existing files

### `list_directory`
**Status**: ✅ Fully Functional  
**Description**: List files and directories with metadata

```python
# Example usage
result = await list_directory("/path/to/directory")
# Returns: array of file/directory objects
```

**Parameters**:
- `path` (string, required): Directory path to list
- `ignore` (array, optional): Glob patterns to exclude

**Response Format**:
```json
{
  "files": [
    {
      "name": "example.txt",
      "type": "file",
      "size": 1024,
      "modified": "2025-06-29T10:00:00Z"
    }
  ]
}
```

### `file_exists`
**Status**: ✅ Fully Functional  
**Description**: Check if file or directory exists

```python
# Example usage
result = await file_exists("/path/to/check")
# Returns: boolean existence status
```

## Implementation Details

**Source Location**: `lib/_tools/adk_tools.py`  
**Security Manager**: `lib/security/security_manager.py`  
**Error Logging**: Structured logging with operation context

## Common Use Cases

1. **Configuration Management**: Read/write config files
2. **Log Analysis**: Read and parse log files
3. **Content Generation**: Create documentation and reports
4. **Directory Exploration**: Navigate project structure

## Known Limitations

- File size limits enforced for performance
- Certain system directories may be restricted
- Binary files require special handling