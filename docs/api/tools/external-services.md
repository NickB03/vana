# External Services Integration

Tools for integrating with external services like GitHub, filesystem, and web APIs.

## GitHub Integration

### `mcp__GitHub__create_or_update_file`
**Status**: ✅ Fully Functional  
**Description**: Create or update files in GitHub repositories

```python
# Example usage
result = await mcp__GitHub__create_or_update_file(
    owner="username",
    repo="project",
    path="docs/README.md",
    content="# Updated Documentation",
    message="Update documentation",
    branch="main"
)
# Returns: commit details and file information
```

**Parameters**:
- `owner` (string, required): Repository owner
- `repo` (string, required): Repository name
- `path` (string, required): File path in repository
- `content` (string, required): File content
- `message` (string, required): Commit message
- `branch` (string, required): Target branch
- `sha` (string, optional): File SHA for updates

### `mcp__GitHub__search_repositories`
**Status**: ✅ Fully Functional  
**Description**: Search GitHub repositories with advanced filters

```python
# Example usage
result = await mcp__GitHub__search_repositories(
    query="machine learning python",
    page=1,
    perPage=30
)
# Returns: repository search results with metadata
```

### `mcp__GitHub__create_pull_request`
**Status**: ✅ Fully Functional  
**Description**: Create pull requests for code changes

```python
# Example usage
result = await mcp__GitHub__create_pull_request(
    owner="username",
    repo="project",
    title="Feature: Add new documentation",
    head="feature-branch",
    base="main",
    body="Comprehensive documentation updates"
)
# Returns: pull request details and URL
```

## Filesystem Operations

### `mcp__filesystem__read_file`
**Status**: ✅ Fully Functional  
**Description**: Read files with advanced encoding support

```python
# Example usage
result = await mcp__filesystem__read_file("/path/to/file.txt")
# Returns: file contents with encoding detection
```

### `mcp__filesystem__write_file`
**Status**: ✅ Fully Functional  
**Description**: Write files with proper encoding handling

```python
# Example usage
result = await mcp__filesystem__write_file(
    path="/path/to/output.txt",
    content="File content"
)
# Returns: write confirmation and file info
```

### `mcp__filesystem__search_files`
**Status**: ✅ Fully Functional  
**Description**: Recursive file search with pattern matching

```python
# Example usage
result = await mcp__filesystem__search_files(
    path="/project/directory",
    pattern="*.py",
    excludePatterns=["__pycache__", "*.pyc"]
)
# Returns: matching file paths with metadata
```

## Web Services

### `mcp__brave-search__brave_web_search`
**Status**: ✅ Fully Functional  
**Description**: Web search using Brave Search API

```python
# Example usage
result = await mcp__brave_search__brave_web_search(
    query="Python async programming best practices",
    count=10,
    offset=0
)
# Returns: web search results with URLs and snippets
```

**Parameters**:
- `query` (string, required): Search query (max 400 chars)
- `count` (number, optional): Results count (1-20, default 10)
- `offset` (number, optional): Pagination offset (max 9)

### `mcp__brave-search__brave_local_search`
**Status**: ✅ Fully Functional  
**Description**: Local business and location search

```python
# Example usage
result = await mcp__brave_search__brave_local_search(
    query="restaurants near Central Park",
    count=5
)
# Returns: local business results with addresses and ratings
```

## Playwright Automation

### `mcp__playwright__playwright_navigate`
**Status**: ✅ Fully Functional  
**Description**: Browser automation and navigation

```python
# Example usage
result = await mcp__playwright__playwright_navigate(
    url="https://example.com",
    browserType="chromium",
    headless=False
)
# Returns: navigation status and page info
```

### `mcp__playwright__playwright_screenshot`
**Status**: ✅ Fully Functional  
**Description**: Capture screenshots of web pages

```python
# Example usage
result = await mcp__playwright__playwright_screenshot(
    name="homepage_screenshot",
    fullPage=True,
    savePng=True
)
# Returns: screenshot data and file path
```

## Configuration Requirements

### API Keys and Authentication
```bash
# Required environment variables
GITHUB_PERSONAL_ACCESS_TOKEN=your_token_here
BRAVE_API_KEY=your_api_key_here
```

### MCP Server Setup
All external service tools require proper MCP server configuration in `.claude.json`:

```json
{
  "mcpServers": {
    "GitHub": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "your_token"
      }
    }
  }
}
```

## Common Integration Patterns

1. **Documentation Automation**: GitHub file updates with search research
2. **Code Analysis**: Repository search combined with file operations
3. **Web Research**: Brave search for current information and trends
4. **UI Testing**: Playwright automation for web application testing

## Error Handling

- **Authentication Failures**: Clear error messages for invalid tokens
- **Rate Limiting**: Automatic retry with exponential backoff
- **Network Issues**: Timeout handling and connection recovery
- **Permission Errors**: Detailed feedback on access restrictions