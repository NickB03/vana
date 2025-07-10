# Tool Permissions and Configuration

Guide to configuring tool permissions and access controls in VANA.

## Permission System Overview

VANA uses a two-tier permission system:
1. **Claude Code Settings** - Tool-level permissions in `.claude/settings.local.json`
2. **MCP Server Configuration** - External service setup in `.claude.json`

## Core Tool Permissions

### Always Available Tools
These tools require no special permissions:
- **File Operations**: `read_file`, `write_file`, `list_directory`, `file_exists`
- **Search Tools**: `vector_search`, `web_search`, `search_knowledge`
- **Agent Coordination**: `coordinate_task`, `delegate_to_agent`, `get_agent_status`
- **System Tools**: `get_health_status`, `echo`, `get_system_info`

### Conditional Tools
These tools require explicit permission configuration:

#### Bash Operations
```json
{
  "permissions": {
    "allow": [
      "Bash(python:*)",        // Python script execution
      "Bash(poetry:*)",        // Poetry commands
      "Bash(git:*)",           // Git operations
      "Bash(npm:*)"            // NPM commands
    ]
  }
}
```

#### Web Access
```json
{
  "permissions": {
    "allow": [
      "WebFetch(domain:docs.anthropic.com)",
      "WebFetch(domain:github.com)",
      "WebSearch(*)"
    ]
  }
}
```

## MCP Server Configuration

### Memory System
```json
{
  "mcpServers": {
    "ChromaDB": {
      "command": "python",
      "args": ["/Users/nick/Development/vana/scripts/local_memory_server.py"],
      "env": {
        "MEMORY_DB_PATH": "/Users/nick/Development/vana/.memory_db"
      }
    },
    "memory-mcp": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-memory"],
      "env": {}
    }
  }
}
```

### GitHub Integration
```json
{
  "mcpServers": {
    "GitHub": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "your_token_here"
      }
    }
  }
}
```

### Search Services
```json
{
  "mcpServers": {
    "brave-search": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-brave-search"],
      "env": {
        "BRAVE_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

### Browser Automation
```json
{
  "mcpServers": {
    "playwright": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@executeautomation/playwright-mcp-server"],
      "env": {}
    }
  }
}
```

## Configuration Files

### `.claude/settings.local.json`
Project-specific permissions and tool access:

```json
{
  "permissions": {
    "allow": [
      "Bash(python:*)",
      "Bash(poetry:*)", 
      "Bash(git:*)",
      "WebFetch(domain:*)",
      "mcp__memory__*",
      "mcp__GitHub__*",
      "mcp__brave-search__*",
      "mcp__playwright__*",
      "mcp__filesystem__*"
    ],
    "deny": [
      "Bash(rm:*)",
      "Bash(sudo:*)"
    ]
  },
  "toolSettings": {
    "bash": {
      "defaultTimeout": 120000,
      "maxTimeout": 600000
    },
    "memory": {
      "autoStore": true,
      "maxChunkSize": 1000
    }
  }
}
```

### `/Users/nick/.claude.json`
Global Claude Code configuration with MCP servers:

```json
{
  "projects": {
    "/Users/nick/Development/vana": {
      "mcpServers": {
        "ChromaDB": { ... },
        "GitHub": { ... },
        "brave-search": { ... }
      },
      "hasTrustDialogAccepted": true
    }
  }
}
```

## Security Best Practices

### API Key Management
- **Environment Variables**: Store sensitive keys in `env` object
- **Key Rotation**: Regularly update API keys
- **Scope Limitation**: Use minimal required permissions
- **Secret Storage**: Never commit keys to repositories

### Tool Access Control
```json
{
  "permissions": {
    "allow": [
      "Bash(git:status)",      // Specific command
      "Bash(poetry:install)",  // Installation only
      "WebFetch(domain:trusted.com)"  // Domain restriction
    ],
    "deny": [
      "Bash(rm:*)",           // Prevent file deletion
      "Bash(sudo:*)",         // No superuser access
      "WebFetch(domain:untrusted.com)"
    ]
  }
}
```

## Troubleshooting

### Common Permission Errors

#### "Tool not found"
- **Cause**: Tool not in `allow` list
- **Solution**: Add tool pattern to `permissions.allow`

#### "Permission denied"
- **Cause**: Tool explicitly denied or missing permission
- **Solution**: Check `deny` list and add appropriate `allow` pattern

#### "MCP server error"
- **Cause**: Server configuration or API key issues
- **Solution**: Verify server config and environment variables

#### "API timeout"
- **Cause**: External service connectivity issues
- **Solution**: Check network, API keys, and service status

### Debugging Tools

#### Check Current Permissions
```bash
# View current tool permissions
cat .claude/settings.local.json | jq '.permissions'
```

#### Test MCP Connectivity
```bash
# Test MCP server status
curl -X POST http://localhost:8081/mcp/messages \
  -H "Content-Type: application/json" \
  -d '{"method": "tools/list"}'
```

#### Validate Configuration
```bash
# Check for syntax errors
python -m json.tool .claude/settings.local.json
```

## Permission Templates

### Development Environment
```json
{
  "permissions": {
    "allow": [
      "Bash(python:*)",
      "Bash(poetry:*)",
      "Bash(git:*)",
      "Bash(npm:*)",
      "WebFetch(domain:*)",
      "mcp__*"
    ]
  }
}
```

### Production Environment
```json
{
  "permissions": {
    "allow": [
      "Bash(git:status)",
      "Bash(git:diff)",
      "WebFetch(domain:api.trusted.com)",
      "mcp__memory__search_memory",
      "mcp__memory__store_memory"
    ],
    "deny": [
      "Bash(rm:*)",
      "Bash(sudo:*)"
    ]
  }
}
```