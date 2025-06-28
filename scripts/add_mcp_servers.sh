#!/bin/bash

# Add GitHub MCP server
claude mcp add GitHub npx -- -y @modelcontextprotocol/server-github
# We'll need to manually add the token to the config file

# Add context7 MCP server
claude mcp add context7 npx -- -y @upstash/context7-mcp@latest

# Add vscode MCP server
claude mcp add vscode npx -- vscode-as-mcp-server

# Add sequentialthinking MCP server
claude mcp add sequentialthinking npx -- -y @modelcontextprotocol/server-sequential-thinking

# Add filesystem MCP server
claude mcp add filesystem npx -- -y @modelcontextprotocol/server-filesystem /Users/nick/Development/vana

# Add playwright MCP server
claude mcp add playwright npx -- -y @executeautomation/playwright-mcp-server

# Add brave-search MCP server
claude mcp add brave-search npx -- -y @modelcontextprotocol/server-brave-search
# We'll need to manually add the API key to the config file

echo "All MCP servers added. Now updating environment variables..."