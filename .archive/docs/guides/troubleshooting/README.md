# VANA Troubleshooting Guide

Comprehensive troubleshooting guide for common issues and error scenarios.

## Table of Contents

1. [Quick Diagnostics](#quick-diagnostics)
2. [Installation Issues](#installation-issues)
3. [Runtime Errors](#runtime-errors)
4. [Memory System Issues](#memory-system-issues)
5. [Tool Permission Problems](#tool-permission-problems)
6. [Deployment Issues](#deployment-issues)
7. [Performance Problems](#performance-problems)
8. [Getting Help](#getting-help)

## Quick Diagnostics

### System Health Check

Run this comprehensive diagnostic to identify issues:

```bash
# Save as check_system.py and run: poetry run python check_system.py
import sys
import subprocess
import importlib

def check_python_version():
    version = sys.version_info
    if version.major == 3 and version.minor >= 13:
        print(f"✅ Python {version.major}.{version.minor}.{version.micro} - OK")
        return True
    else:
        print(f"❌ Python {version.major}.{version.minor}.{version.micro} - REQUIRES 3.13+")
        return False

def check_poetry():
    try:
        result = subprocess.run(['poetry', '--version'], capture_output=True, text=True)
        if result.returncode == 0:
            print(f"✅ Poetry - {result.stdout.strip()}")
            return True
    except FileNotFoundError:
        pass
    print("❌ Poetry - Not installed or not in PATH")
    return False

def check_dependencies():
    required_packages = [
        'google.adk',
        'google.cloud.aiplatform',
        'chromadb',
        'fastapi',
        'uvicorn'
    ]
    
    for package in required_packages:
        try:
            importlib.import_module(package.replace('.', '/').split('/')[0])
            print(f"✅ {package} - Available")
        except ImportError:
            print(f"❌ {package} - Missing")

def check_agents():
    try:
        from agents.vana.team import root_agent
        print(f"✅ VANA Orchestrator - {len(root_agent.tools)} tools loaded")
    except Exception as e:
        print(f"❌ VANA Orchestrator - {e}")
    
    try:
        from lib._shared_libraries.adk_memory_service import ADKMemoryService
        service = ADKMemoryService()
        print("✅ Memory Service - Working")
    except Exception as e:
        print(f"❌ Memory Service - {e}")

def check_environment():
    import os
    required_vars = ['VANA_MODEL', 'ENVIRONMENT']
    optional_vars = ['GOOGLE_CLOUD_PROJECT', 'PROJECT_NUMBER']
    
    for var in required_vars:
        value = os.getenv(var)
        if value:
            print(f"✅ {var} - {value}")
        else:
            print(f"⚠️ {var} - Not set (may use defaults)")
    
    for var in optional_vars:
        value = os.getenv(var)
        if value:
            print(f"✅ {var} - Set")
        else:
            print(f"ℹ️ {var} - Not set (optional for development)")

if __name__ == "__main__":
    print("🔍 VANA System Health Check")
    print("=" * 50)
    
    print("\n📋 Prerequisites:")
    check_python_version()
    check_poetry()
    
    print("\n📦 Dependencies:")
    check_dependencies()
    
    print("\n🤖 Agents:")
    check_agents()
    
    print("\n🌍 Environment:")
    check_environment()
    
    print("\n🎯 Health check complete!")
```

## Installation Issues

### Python Version Problems

**Error**: `Python 3.13+ required for production stability`

**Solutions**:
```bash
# Check current version
python3 --version

# Install Python 3.13 (macOS with Homebrew)
brew install python@3.13

# Install Python 3.13 (Ubuntu/Debian)
sudo apt update
sudo apt install python3.13 python3.13-venv python3.13-pip

# Update Poetry environment
poetry env use python3.13
poetry install
```

### Poetry Installation Issues

**Error**: `Poetry not found` or `Command 'poetry' not found`

**Solutions**:
```bash
# Install Poetry
curl -sSL https://install.python-poetry.org | python3 -

# Add to PATH (add to ~/.bashrc or ~/.zshrc)
export PATH="$HOME/.local/bin:$PATH"

# Verify installation
poetry --version
```

### Dependency Installation Failures

**Error**: `Package installation failed` or `Dependency resolution error`

**Solutions**:
```bash
# Clear Poetry cache
poetry cache clear --all pypi

# Reinstall with verbose output
poetry install -vvv

# Force reinstall specific packages
poetry remove problematic-package
poetry add problematic-package

# Check for conflicting versions
poetry show --tree
```

## Runtime Errors

### Agent Loading Failures

**Error**: `Failed to load VANA Orchestrator` or `Agent initialization error`

**Diagnosis**:
```bash
# Test agent loading
poetry run python -c "
try:
    from agents.vana.team import root_agent
    print(f'Success: {len(root_agent.tools)} tools')
except Exception as e:
    print(f'Error: {e}')
    import traceback
    traceback.print_exc()
"
```

**Solutions**:
- Verify all dependencies installed correctly
- Check for missing environment variables
- Ensure Google Cloud credentials are configured
- Review error logs for specific missing components

### Tool Loading Errors

**Error**: `FunctionTool.init() got an unexpected keyword argument 'name'`

This is a known issue with the coordinated search tool.

**Location**: `lib/_tools/search_coordinator.py:425`

**Workaround**:
```python
# The system gracefully handles this error and continues
# Core functionality remains available without coordinated search
# No user action required - this is logged as a warning
```

### Memory Service Issues

**Error**: `Memory search failed` or `Database index unavailable`

**Diagnosis**:
```bash
# Check memory service status
poetry run python -c "
try:
    from lib._shared_libraries.adk_memory_service import ADKMemoryService
    service = ADKMemoryService()
    print('Memory service working')
except Exception as e:
    print(f'Memory service error: {e}')
"
```

**Solutions**:
1. **In-Memory Fallback** (Default for development):
   ```bash
   # This is expected behavior - system uses in-memory storage
   # Look for: "Initialized InMemoryMemoryService for development/testing"
   ```

2. **External Memory Server** (Production):
   ```bash
   # Start ChromaDB memory server
   python scripts/local_memory_server.py
   
   # Verify connection
   curl -X POST http://localhost:8081/mcp/messages \
     -H "Content-Type: application/json" \
     -d '{"method": "tools/list"}'
   ```

## Memory System Issues

### ChromaDB Connection Problems

**Error**: `Failed to connect to ChromaDB server`

**Solutions**:
```bash
# Check if memory server is running
ps aux | grep local_memory_server

# Start memory server
python /Users/nick/Development/vana/scripts/local_memory_server.py &

# Verify server is listening
lsof -i :8081

# Test connection
curl http://localhost:8081/health
```

### Memory Storage Failures

**Error**: `Failed to store memory chunk - Content too large`

**Solutions**:
```bash
# Reduce content size in storage operations
# Split large content into smaller chunks
# Check memory system limits and configuration
```

### Memory Search Issues

**Error**: `Memory search returned no results`

**Solutions**:
- Verify memory server is running
- Check that data has been stored previously
- Try broader search terms
- Verify database permissions and access

## Tool Permission Problems

### Permission Denied Errors

**Error**: `Tool access denied` or `Tool 'X' not in allowed tools list`

**Solutions**:

1. **Check Settings File**:
   ```bash
   # Verify .claude/settings.local.json exists
   cat .claude/settings.local.json
   ```

2. **Add Required Permissions**:
   ```json
   {
     "permissions": {
       "allow": [
         "Bash(python:*)",
         "Bash(poetry:*)",
         "Bash(git:*)",
         "mcp__memory__*",
         "mcp__GitHub__*"
       ],
       "deny": []
     }
   }
   ```

3. **Validate JSON Syntax**:
   ```bash
   python -m json.tool .claude/settings.local.json
   ```

### MCP Server Configuration Issues

**Error**: `MCP server unavailable` or `Connection failed`

**Solutions**:

1. **Check Server Configuration**:
   ```bash
   # Verify .claude.json configuration
   cat ~/.claude.json | jq '.projects["/Users/nick/Development/vana"].mcpServers'
   ```

2. **Test Server Connectivity**:
   ```bash
   # Test individual MCP servers
   npx @modelcontextprotocol/server-memory --help
   
   # Check server processes
   ps aux | grep mcp
   ```

3. **Restart MCP Servers**:
   ```bash
   # Kill existing processes
   pkill -f "server-memory"
   
   # Restart Claude Code session to reinitialize servers
   ```

## Deployment Issues

### Google Cloud Authentication

**Error**: `Authentication failed` or `Invalid credentials`

**Solutions**:
```bash
# Re-authenticate with Google Cloud
gcloud auth login
gcloud auth application-default login

# Verify active account
gcloud auth list

# Set correct project
gcloud config set project YOUR_PROJECT_ID
```

### Environment Variable Issues

**Error**: `Required environment variable not set`

**Solutions**:
```bash
# Check current environment
env | grep VANA
env | grep GOOGLE

# Set required variables
export GOOGLE_CLOUD_PROJECT="your-project-id"
export PROJECT_NUMBER="your-project-number"

# Verify in deployment
echo $GOOGLE_CLOUD_PROJECT
```

### Service Account Problems

**Error**: `Service account not found` or `Permission denied`

**Solutions**:
```bash
# Verify service account exists
gcloud iam service-accounts describe \
  vana-vector-search-sa@$GOOGLE_CLOUD_PROJECT.iam.gserviceaccount.com

# Check permissions
gcloud projects get-iam-policy $GOOGLE_CLOUD_PROJECT \
  --flatten="bindings[].members" \
  --filter="bindings.members:vana-vector-search-sa*"

# Recreate if necessary
gcloud iam service-accounts create vana-vector-search-sa \
  --display-name="VANA Vector Search Service Account"
```

## Performance Problems

### Slow Agent Response

**Symptoms**: Long delays in agent responses or task execution

**Solutions**:
1. **Check Resource Usage**:
   ```bash
   # Monitor system resources
   top -p $(pgrep -f "python.*main.py")
   
   # Check memory usage
   ps aux | grep python | awk '{print $4, $11}' | sort -nr
   ```

2. **Optimize Tool Usage**:
   - Use batch operations for multiple related tasks
   - Implement proper timeouts
   - Cache results where appropriate

3. **Network Performance**:
   ```bash
   # Test Google Cloud connectivity
   time gcloud auth list
   
   # Check DNS resolution
   nslookup aiplatform.googleapis.com
   ```

### Memory Leaks

**Symptoms**: Increasing memory usage over time

**Solutions**:
1. **Monitor Memory Usage**:
   ```bash
   # Track memory over time
   while true; do
     ps aux | grep "python.*main.py" | awk '{print $4}'
     sleep 60
   done
   ```

2. **Restart Services Periodically**:
   ```bash
   # Implement health checks and automatic restarts
   # Monitor for memory thresholds
   ```

### High CPU Usage

**Symptoms**: Excessive CPU consumption

**Solutions**:
1. **Profile Performance**:
   ```bash
   # Use Python profiling
   poetry run python -m cProfile -o profile.stats main.py
   ```

2. **Optimize Tool Operations**:
   - Review concurrent operations
   - Implement rate limiting
   - Use async operations where possible

## Getting Help

### Information to Collect

When reporting issues, please provide:

1. **System Information**:
   ```bash
   python3 --version
   poetry --version
   uname -a
   ```

2. **Error Details**:
   - Complete error messages
   - Stack traces
   - Reproduction steps

3. **Configuration**:
   - Environment variables (redact secrets)
   - Settings file contents
   - MCP server configuration

4. **Logs**:
   ```bash
   # Enable debug logging
   export ANTHROPIC_LOG=debug
   poetry run python main.py 2>&1 | tee vana_debug.log
   ```

### Support Channels

1. **GitHub Issues**: [Report bugs and request features](https://github.com/your-org/vana/issues)
2. **Discussions**: Community Q&A and troubleshooting
3. **Documentation**: Review guides and API references
4. **Email**: For security vulnerabilities: nbohmer@gmail.com

### Self-Help Resources

1. **System Health Check**: Run the diagnostic script above
2. **Error Logs**: Check application logs for specific errors  
3. **Configuration Validation**: Verify all settings files
4. **Component Testing**: Test individual components in isolation

---

*This troubleshooting guide is updated regularly. For the latest information, check the GitHub repository.*