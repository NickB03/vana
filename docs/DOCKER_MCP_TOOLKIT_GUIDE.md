# Docker MCP Toolkit Complete Guide

## Overview
Docker MCP Toolkit is a gateway for setting up, managing, and running containerized MCP servers connected to AI agents. It provides secure defaults, one-click setup, and cross-platform compatibility.

## Requirements
- Docker Desktop version 4.42.0+ (4.46.0+ for Learning Center)
- Enable MCP Toolkit in Docker Desktop Beta features

## Quick Start

### 1. Enable MCP Toolkit
```bash
# In Docker Desktop:
Settings → Beta features → Enable Docker MCP Toolkit → Apply
```

### 2. Add MCP Servers

#### Via Docker Desktop UI
1. Open Docker Desktop → MCP Toolkit → Catalog tab
2. Search for desired server (e.g., GitHub Official, Puppeteer, Docker Hub)
3. Click the plus (+) icon to add
4. Configure authentication in Configuration tab

#### Via Docker CLI
```bash
# Enable a server
docker mcp server enable [server-name]

# List available servers
docker mcp server list

# Check server status
docker mcp server status [server-name]
```

## Available MCP Servers (100+ in Catalog)

### Popular Servers
- **GitHub Official** - Requires OAuth authentication
- **Docker Hub** - Requires PAT authentication
- **Puppeteer** - Browser automation
- **Playwright** - Cross-browser testing
- **YouTube** - Video platform integration
- **Perplexity** - AI search integration
- **Stripe** - Payment processing
- **Elastic** - Search and analytics
- **Neo4j** - Graph database
- **Atlassian** - Jira/Confluence integration

## Authentication Methods

### OAuth Authentication (GitHub, etc.)
1. Select server → Configuration tab → OAuth
2. Browser opens authorization page
3. Follow on-screen instructions
4. Credentials stored securely in Docker Desktop

### Personal Access Token (Docker Hub, etc.)
1. Select server → Configuration tab
2. Enter username
3. Enter PAT (Personal Access Token)
4. Save configuration

### Security Features
- **Image signing**: All catalog images digitally signed
- **Filesystem isolation**: No host access by default
- **Credential storage**: Secure, encrypted storage
- **Request interception**: Blocks sensitive data exposure

## Client Connection

### Supported Clients
- Claude Desktop
- Cursor
- VSCode
- Windsurf
- Gordon (Docker AI Agent)
- Continue.dev
- Goose

### Connection Process
1. Add servers to MCP Toolkit first
2. Go to Clients tab in MCP Toolkit
3. Click "Connect" next to desired client
4. Restart client application
5. Client now has access to all MCP servers

### Benefits
- No manual client configuration
- Centralized server management
- Cross-LLM compatibility
- One-click setup

## Server Configuration

### Modify Server Settings
1. Select server in MCP Toolkit
2. Go to Configuration tab
3. Available options:
   - Authentication method
   - Environment variables
   - File system permissions
   - Network settings
   - Resource limits

### File System Access
```yaml
# Default: No host filesystem access
# To grant access:
1. Select server
2. Configuration → Filesystem
3. Add mount points explicitly
4. Apply changes
```

### Dynamic Tool Management
- Add/remove tools without config changes
- UI-based management in Docker Desktop
- No manual JSON editing required
- Changes apply immediately

## Advanced Features

### Container Isolation Benefits
- Sandboxed execution environment
- No host damage from LLM behavior
- Consistent runtime across platforms
- No dependency conflicts
- Automatic resource cleanup

### Runtime Security Measures
1. **Passive Security**
   - Image attestation
   - Signed containers
   - Minimal base images

2. **Active Security**
   - Request validation
   - Secret blocking
   - Access control
   - Runtime monitoring

### Multi-Server Management
```bash
# Add multiple servers
docker mcp server enable github
docker mcp server enable puppeteer
docker mcp server enable docker-hub

# Connect all to client
docker mcp client connect claude-desktop
```

## Troubleshooting

### Server Not Working
```bash
# Check server status
docker mcp server status [server-name]

# View logs
docker mcp server logs [server-name]

# Restart server
docker mcp server restart [server-name]
```

### Authentication Issues
1. Re-authenticate via Configuration tab
2. Check token expiration
3. Verify OAuth permissions
4. Clear cached credentials and retry

### Client Connection Problems
1. Restart client application
2. Verify server is running
3. Check Docker Desktop is running
4. Re-connect from Clients tab

## Best Practices

### Security
- ✅ Use OAuth when available
- ✅ Rotate PATs regularly
- ✅ Grant minimal filesystem access
- ✅ Review server permissions
- ✅ Keep Docker Desktop updated

### Performance
- ✅ Limit concurrent servers
- ✅ Monitor resource usage
- ✅ Use appropriate server sizes
- ✅ Clean up unused servers

### Development Workflow
1. Start with minimal servers
2. Add servers as needed
3. Test in isolation first
4. Document server dependencies
5. Version control server configs

## CLI Commands Reference

```bash
# Server Management
docker mcp server list                    # List all servers
docker mcp server enable [name]           # Add server
docker mcp server disable [name]          # Remove server
docker mcp server status [name]           # Check status
docker mcp server logs [name]             # View logs
docker mcp server restart [name]          # Restart server
docker mcp server configure [name]        # Open config

# Client Management
docker mcp client list                    # List clients
docker mcp client connect [client]        # Connect client
docker mcp client disconnect [client]     # Disconnect
docker mcp client status [client]         # Check status

# Toolkit Management
docker mcp toolkit status                 # Overall status
docker mcp toolkit version                # Version info
docker mcp toolkit update                 # Update toolkit
```

## Integration Examples

### Example 1: GitHub + Claude Desktop
```bash
# Add GitHub server
docker mcp server enable github

# Configure OAuth
# (Follow UI prompts)

# Connect Claude Desktop
docker mcp client connect claude-desktop

# Restart Claude Desktop
# GitHub tools now available in Claude
```

### Example 2: Multi-Server Setup
```bash
# Add multiple servers
docker mcp server enable github
docker mcp server enable docker-hub
docker mcp server enable puppeteer

# Configure each
docker mcp server configure github
docker mcp server configure docker-hub

# Connect to all clients
docker mcp client connect claude-desktop
docker mcp client connect cursor
```

## Updates and Maintenance

### Keep Updated
```bash
# Update Docker Desktop
# Check for MCP Toolkit updates in Beta features
# Update individual servers via Catalog
```

### Monitor Health
- Check MCP Toolkit status regularly
- Review server logs for errors
- Monitor resource usage
- Clean up unused servers

## Additional Resources

- [Docker MCP Catalog](https://hub.docker.com/search?q=mcp%2F)
- [MCP Toolkit Docs](https://docs.docker.com/ai/mcp-catalog-and-toolkit/)
- [MCP Protocol Spec](https://modelcontextprotocol.io/)
- [Docker Desktop Download](https://www.docker.com/products/docker-desktop/)

## Quick Reference Card

| Task | Command/Action |
|------|---------------|
| Enable MCP Toolkit | Settings → Beta → Enable MCP Toolkit |
| Add Server | Catalog → Search → Click + |
| Configure Auth | Server → Configuration → OAuth/PAT |
| Connect Client | Clients → Connect → Restart Client |
| Check Status | `docker mcp server status [name]` |
| View Logs | `docker mcp server logs [name]` |
| Remove Server | `docker mcp server disable [name]` |

---

*Last Updated: January 2025*
*Docker MCP Toolkit Version: Beta*