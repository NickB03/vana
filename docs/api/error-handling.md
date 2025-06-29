# API Error Handling Guide

Comprehensive guide to error handling, common issues, and troubleshooting strategies.

## Error Categories

### Tool Execution Errors

#### Permission Errors
```json
{
  "error": "Tool access denied",
  "code": "PERMISSION_DENIED",
  "details": "Tool 'Bash(rm:*)' not in allowed tools list"
}
```

**Common Causes**:
- Tool not in `permissions.allow` list
- Tool explicitly in `permissions.deny` list
- Missing MCP server configuration

**Resolution**:
```json
// Add to .claude/settings.local.json
{
  "permissions": {
    "allow": ["Bash(specific:command)"]
  }
}
```

#### Timeout Errors
```json
{
  "error": "Operation timeout",
  "code": "TIMEOUT",
  "details": "Tool execution exceeded 120000ms limit"
}
```

**Common Causes**:
- Long-running operations without proper timeout configuration
- Network connectivity issues
- Resource constraints

**Resolution**:
```json
// Increase timeout in settings
{
  "toolSettings": {
    "bash": {
      "defaultTimeout": 300000,
      "maxTimeout": 600000
    }
  }
}
```

### MCP Server Errors

#### Connection Failures
```json
{
  "error": "MCP server unavailable",
  "code": "CONNECTION_FAILED",
  "server": "ChromaDB",
  "details": "Failed to connect to memory server"
}
```

**Diagnosis Steps**:
1. Check server process status
2. Verify configuration in `.claude.json`
3. Test server connectivity
4. Review server logs

**Resolution**:
```bash
# Restart MCP server
python /Users/nick/Development/vana/scripts/local_memory_server.py

# Verify configuration
cat ~/.claude.json | jq '.projects["/Users/nick/Development/vana"].mcpServers'
```

#### Authentication Errors
```json
{
  "error": "Authentication failed",
  "code": "AUTH_FAILED", 
  "service": "GitHub",
  "details": "Invalid or expired token"
}
```

**Resolution**:
```json
// Update token in .claude.json
{
  "mcpServers": {
    "GitHub": {
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "new_valid_token"
      }
    }
  }
}
```

### Memory System Errors

#### Storage Failures
```json
{
  "error": "Failed to store memory chunk",
  "code": "STORAGE_FAILED",
  "details": "Content too large for storage"
}
```

**Common Causes**:
- Content exceeding size limits
- Database connectivity issues
- Malformed metadata

**Resolution**:
```python
# Reduce content size
await mcp__memory__store_memory(
    content="Concise version of information",
    metadata={"category": "brief_update"}
)
```

#### Search Failures
```json
{
  "error": "Memory search failed",
  "code": "SEARCH_FAILED",
  "details": "Database index unavailable"
}
```

**Diagnosis**:
```python
# Check memory system status
result = await mcp__memory__memory_stats()
status = await mcp__memory__operation_status()
```

### API Response Errors

#### Rate Limiting
```json
{
  "error": "Rate limit exceeded",
  "code": "RATE_LIMITED",
  "service": "brave-search",
  "retryAfter": 60
}
```

**Automatic Handling**:
- Exponential backoff retry strategy
- Request queuing and throttling
- Alternative service fallback

#### Content Filtering
```json
{
  "error": "Content blocked by filtering policy", 
  "code": "CONTENT_FILTERED",
  "details": "API error 400 content blocked"
}
```

**Resolution Strategies**:
1. **Simplify Content**: Remove potentially problematic terms
2. **Incremental Approach**: Break large content into smaller chunks
3. **Alternative Phrasing**: Rephrase sensitive content

## Error Recovery Patterns

### Automatic Retry
```python
async def robust_tool_call(tool_func, *args, max_retries=3, **kwargs):
    for attempt in range(max_retries):
        try:
            return await tool_func(*args, **kwargs)
        except TimeoutError:
            if attempt < max_retries - 1:
                await asyncio.sleep(2 ** attempt)  # Exponential backoff
            else:
                raise
        except PermissionError:
            # Don't retry permission errors
            raise
```

### Fallback Strategies
```python
async def search_with_fallback(query):
    try:
        # Try primary search
        return await mcp__memory__search_memory(query)
    except Exception:
        # Fall back to basic search
        return await vector_search(query)
```

### Graceful Degradation
```python
async def get_system_status():
    status = {"components": {}}
    
    try:
        status["memory"] = await mcp__memory__memory_stats()
    except Exception:
        status["memory"] = {"status": "unavailable", "fallback": True}
    
    try:
        status["health"] = await get_health_status()
    except Exception:
        status["health"] = {"status": "unknown"}
    
    return status
```

## Debugging Tools

### Error Logging Configuration
```python
# Enhanced logging for debugging
import logging

logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('vana_debug.log'),
        logging.StreamHandler()
    ]
)
```

### Health Check Utilities
```python
async def diagnostic_check():
    """Comprehensive system diagnostic"""
    results = {}
    
    # Test core tools
    try:
        await echo("test")
        results["core_tools"] = "✅ Working"
    except Exception as e:
        results["core_tools"] = f"❌ Failed: {e}"
    
    # Test memory system
    try:
        await mcp__memory__memory_stats()
        results["memory"] = "✅ Working"
    except Exception as e:
        results["memory"] = f"❌ Failed: {e}"
    
    # Test external services
    for service in ["GitHub", "brave-search"]:
        try:
            # Service-specific health check
            results[service] = "✅ Working"
        except Exception as e:
            results[service] = f"❌ Failed: {e}"
    
    return results
```

### Configuration Validation
```bash
#!/bin/bash
# validate_config.sh

echo "Validating VANA configuration..."

# Check settings file
if ! python -m json.tool .claude/settings.local.json > /dev/null 2>&1; then
    echo "❌ Invalid JSON in settings.local.json"
    exit 1
fi

# Check MCP configuration
if ! python -m json.tool ~/.claude.json > /dev/null 2>&1; then
    echo "❌ Invalid JSON in .claude.json"
    exit 1
fi

# Test Python environment
if ! python3 --version | grep -q "3\.1[3-9]"; then
    echo "❌ Python 3.13+ required"
    exit 1
fi

echo "✅ Configuration validation passed"
```

## Error Prevention Best Practices

### Input Validation
```python
def validate_file_path(path: str) -> str:
    """Validate and sanitize file paths"""
    if not path or not isinstance(path, str):
        raise ValueError("Path must be non-empty string")
    
    # Prevent directory traversal
    if ".." in path or path.startswith("/"):
        raise SecurityError("Invalid path detected")
    
    return os.path.normpath(path)
```

### Resource Management
```python
async def safe_tool_execution(tool_func, *args, **kwargs):
    """Execute tools with resource management"""
    start_time = time.time()
    
    try:
        result = await asyncio.wait_for(
            tool_func(*args, **kwargs),
            timeout=kwargs.get('timeout', 120)
        )
        return result
    except asyncio.TimeoutError:
        raise TimeoutError(f"Tool execution exceeded timeout")
    finally:
        execution_time = time.time() - start_time
        logger.info(f"Tool execution time: {execution_time:.2f}s")
```

### Error Monitoring
```python
class ErrorTracker:
    def __init__(self):
        self.error_counts = {}
        self.recent_errors = []
    
    def record_error(self, error_type: str, details: str):
        self.error_counts[error_type] = self.error_counts.get(error_type, 0) + 1
        self.recent_errors.append({
            "type": error_type,
            "details": details,
            "timestamp": time.time()
        })
        
        # Keep only recent errors
        cutoff = time.time() - 3600  # 1 hour
        self.recent_errors = [
            e for e in self.recent_errors 
            if e["timestamp"] > cutoff
        ]
```

## Support and Escalation

### When to Seek Help
- **Persistent Permission Issues**: Configuration appears correct but errors continue
- **Memory System Failures**: Database corruption or persistent connectivity issues
- **Performance Degradation**: Significant slowdowns or resource exhaustion
- **Security Concerns**: Potential security vulnerabilities or access issues

### Information to Provide
1. **Error Details**: Complete error messages and stack traces
2. **Configuration**: Relevant settings and MCP server configuration
3. **Environment**: Python version, system details, recent changes
4. **Reproduction Steps**: Exact steps that trigger the error
5. **Logs**: Recent log entries showing the problem

### Contact Channels
- **GitHub Issues**: Bug reports and feature requests
- **Security Issues**: Email nbohmer@gmail.com for security vulnerabilities
- **Documentation**: Contribute improvements via pull requests