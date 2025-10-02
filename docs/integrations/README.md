# Vana Integrations

This directory contains documentation for external tools and services integrated with Vana.

## Available Integrations

### Model Context Protocol (MCP)
**Location**: `mcp/`

Core integration framework for connecting Claude Code to external tools, databases, and APIs. Essential foundation for all MCP-based integrations.

**Key Features**:
- Standard protocol for AI-tool integration
- Multiple server types (stdio, HTTP, SSE)
- Environment variable support
- Authentication (OAuth 2.0)
- Project and user-level configuration

**Available MCP Servers**:
- **filesystem**: File operations
- **github**: GitHub API integration
- **brave-search**: Web search capabilities
- **memory**: Persistent memory across sessions
- **fetch**: Web content retrieval
- **git**: Git repository operations
- **sentry**: Error monitoring and debugging

**Documentation**:
- [Full README](./mcp/README.md) - Comprehensive MCP guide
- [Quick Reference](./mcp/QUICK_REFERENCE.md) - Common commands and patterns
- [Setup Guide](./mcp/SETUP_GUIDE.md) - Step-by-step installation
- [Vana Config](./mcp/mcp-vana-config.json) - Project configuration
- [Environment Template](./mcp/env.example) - Required variables

### Chrome DevTools MCP
**Location**: `chrome-devtools-mcp/`

MCP server for controlling Chrome browser via AI agents. Enables automated browser testing, web scraping, performance analysis, and debugging.

**Key Features**:
- Browser automation via Puppeteer
- Performance tracing and analysis
- Network inspection
- Screenshot capture
- Console log monitoring

**Use Cases in Vana**:
- Research agent web automation
- Frontend E2E testing
- Performance monitoring
- Visual documentation

**Documentation**:
- [Full README](./chrome-devtools-mcp/README.md)
- [Quick Reference](./chrome-devtools-mcp/QUICK_REFERENCE.md)
- [Configuration Examples](./chrome-devtools-mcp/config-example.json)

## Adding New Integrations

When documenting a new integration:

1. Create a new folder: `docs/integrations/{integration-name}/`
2. Include at minimum:
   - `README.md` - Comprehensive documentation
   - `QUICK_REFERENCE.md` - Common commands/patterns
   - Configuration examples (JSON/YAML as appropriate)
3. Update this index with:
   - Integration name and location
   - Brief description
   - Key features
   - Use cases specific to Vana
   - Links to documentation

## Integration Categories

### Core Frameworks
- **MCP (Model Context Protocol)** - Foundation for all MCP-based integrations

### MCP Servers
- **Chrome DevTools MCP** - Browser automation and inspection
- **filesystem** - File system operations (via MCP)
- **github** - GitHub API integration (via MCP)
- **brave-search** - Web search (via MCP)
- **memory** - Persistent memory (via MCP)

### Future Integrations (Planned)

#### MCP Servers to Add
- **Linear**: Issue tracking and project management
- **Slack**: Team communication and notifications
- **Notion**: Knowledge base and documentation
- **PostgreSQL**: Database queries
- **Supabase**: Backend-as-a-Service integration

#### Direct Integrations
- Google Cloud services (already partially integrated)
- OpenRouter API (already integrated)
- Gemini models (already integrated)

#### Monitoring & Analytics
- **Sentry** - Error monitoring (MCP available, needs setup)
- Prometheus metrics
- Custom analytics platform
