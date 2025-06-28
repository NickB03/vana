# Claude Code MCP Server Configuration for VANA Development

## Overview
This document describes the MCP (Model Context Protocol) servers configured for Claude Code to enhance development capabilities for the VANA project.

## Current MCP Server Configuration

### ✅ Already Configured

1. **GitHub** - Repository operations and code management
   - Status: Configured with your personal access token
   - Usage: PR creation, issue management, repository exploration

2. **Context7** - Enhanced context management
   - Status: Configured
   - Usage: Research capabilities and context retention

3. **VSCode** - IDE integration
   - Status: Configured
   - Usage: Direct file editing within VSCode

4. **Sequential Thinking** - Structured reasoning
   - Status: Configured
   - Usage: Complex problem decomposition and analysis

### ✅ Newly Added (Restart Claude Desktop to activate)

5. **Filesystem** - Direct file system access
   - Path: `/Users/nick/Development/vana`
   - Benefits: Faster file navigation, bulk operations, real-time monitoring

6. **Git** - Repository operations
   - Repository: `/Users/nick/Development/vana`
   - Benefits: Branch management, commit history, change tracking

7. **Memory** - Persistent context between sessions
   - Benefits: Maintain project context, remember decisions, track progress

8. **Playwright** - Browser automation and testing
   - Benefits: UI testing, screenshot capture, end-to-end testing

## Additional MCP Servers to Consider

### For Future Enhancement

1. **PostgreSQL MCP** - When you need database integration
   ```json
   "postgres": {
     "command": "npx",
     "args": ["-y", "@modelcontextprotocol/server-postgres"],
     "env": {
       "DATABASE_URL": "postgresql://user:password@localhost:5432/vana"
     }
   }
   ```

2. **Brave Search MCP** - For enhanced web research
   ```json
   "brave-search": {
     "command": "npx",
     "args": ["-y", "@modelcontextprotocol/server-brave-search"],
     "env": {
       "BRAVE_API_KEY": "your-brave-api-key"
     }
   }
   ```

## How These Enhance VANA Development

### Immediate Benefits

1. **Faster Code Navigation** (Filesystem + Git)
   - Direct access to project structure
   - Instant file content retrieval
   - Git history and change tracking

2. **Persistent Development Context** (Memory)
   - Remember architectural decisions
   - Track implementation progress
   - Maintain context between sessions

3. **UI Testing Capabilities** (Playwright)
   - Test Open WebUI integration
   - Capture screenshots for documentation
   - Validate user flows

4. **Enhanced Problem Solving** (Sequential Thinking + Context7)
   - Structured approach to complex problems
   - Research capabilities for best practices
   - Better architectural decisions

### Development Workflow Improvements

1. **Code Review**: Git MCP shows changes, GitHub MCP manages PRs
2. **Testing**: Playwright automates UI tests, filesystem accesses test files
3. **Documentation**: Memory tracks decisions, filesystem manages docs
4. **Integration**: All tools work together for seamless development

## Usage Examples

### With Filesystem MCP
Instead of multiple Read commands:
```
# Old way
Read file1.py
Read file2.py
Read file3.py

# New way with Filesystem MCP
filesystem.list("/Users/nick/Development/vana/lib")
filesystem.read_multiple(["file1.py", "file2.py", "file3.py"])
```

### With Git MCP
Track changes efficiently:
```
git.status()
git.diff("main", "feature-branch")
git.log(limit=10)
```

### With Memory MCP
Maintain context:
```
memory.store("openwebui_integration", {
  "status": "adapter_development",
  "decisions": ["Use OpenAI-compatible format", "Disable RAG"],
  "next_steps": ["Test with Docker", "Configure auth"]
})
```

### With Playwright MCP
Test UI integration:
```
playwright.navigate("http://localhost:3000")
playwright.screenshot("open-webui-homepage.png")
playwright.click("button.chat-submit")
```

## Restart Required

To activate the new MCP servers:
1. Save all work in Claude Desktop
2. Quit Claude Desktop completely
3. Restart Claude Desktop
4. The new MCP servers will be available

## Security Notes

- Filesystem access is limited to `/Users/nick/Development/vana`
- Git operations are restricted to the VANA repository
- Memory data is stored locally
- API keys should be added to environment variables when needed

## Troubleshooting

If MCP servers don't load:
1. Check Claude Desktop logs
2. Verify npx is in your PATH
3. Ensure internet connectivity for package downloads
4. Try removing and re-adding problematic servers

## Next Steps

1. Test each MCP server after restart
2. Configure PostgreSQL when database is needed
3. Add Brave Search API key for enhanced research
4. Utilize Memory MCP for persistent context