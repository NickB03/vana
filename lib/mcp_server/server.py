"""
VANA MCP Server Implementation
Cloud Run Compatible MCP Server with SSE Transport

This module implements a proper MCP server using the official MCP SDK
with Server-Sent Events (SSE) transport for Cloud Run compatibility.
"""

import asyncio
import json
import logging
import os
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, Request, Response
from fastapi.responses import StreamingResponse
from starlette.applications import Starlette
from starlette.responses import JSONResponse
from starlette.routing import Route

# MCP SDK imports
try:
    import mcp.types as types
    from mcp.server import Server
    from mcp.server.sse import SseServerTransport
    from mcp.types import (
        CallToolResult,
        GetPromptResult,
        ListToolsResult,
        Prompt,
        ReadResourceResult,
        Resource,
        TextContent,
        Tool,
    )
except ImportError as e:
    logging.error(f"MCP SDK not available: {e}")
    # Fallback for development
    Server = None
    SseServerTransport = None

logger = logging.getLogger(__name__)


class VANAMCPServer:
    """VANA MCP Server with Cloud Run SSE Transport"""

    def __init__(self):
        self.server = None
        self.transport = None
        self.tools_registry = {}
        self.resources_registry = {}
        self.prompts_registry = {}

    async def initialize_server(self):
        """Initialize the MCP server with tools and capabilities"""
        if not Server:
            raise RuntimeError("MCP SDK not available")

        # Create MCP server instance
        self.server = Server("vana-mcp-server")

        # Register tools
        await self._register_tools()

        # Register resources
        await self._register_resources()

        # Register prompts
        await self._register_prompts()

        logger.info("VANA MCP Server initialized with tools, resources, and prompts")

    async def _register_tools(self):
        """Register MCP tools"""

        # Context7 Sequential Thinking Tool
        @self.server.list_tools()
        async def list_tools() -> List[Tool]:
            return [
                Tool(
                    name="context7_sequential_thinking",
                    description="Advanced reasoning and structured problem-solving using sequential thinking patterns",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "prompt": {
                                "type": "string",
                                "description": "The problem or question requiring structured analysis",
                            },
                            "minimum_tokens": {
                                "type": "integer",
                                "description": "Minimum tokens for comprehensive analysis",
                                "default": 10000,
                            },
                        },
                        "required": ["prompt"],
                    },
                ),
                Tool(
                    name="brave_search_mcp",
                    description="Enhanced web search using Brave Search API with MCP interface",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "query": {"type": "string", "description": "Search query string"},
                            "max_results": {
                                "type": "integer",
                                "description": "Maximum number of results to return",
                                "default": 5,
                            },
                        },
                        "required": ["query"],
                    },
                ),
                Tool(
                    name="github_mcp_operations",
                    description="GitHub operations using GitHub API with MCP interface",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "operation": {
                                "type": "string",
                                "description": "GitHub operation type",
                                "enum": ["repos", "user_info", "issues", "pull_requests", "create_issue"],
                            },
                            "owner": {"type": "string", "description": "Repository owner (for repo operations)"},
                            "repo": {"type": "string", "description": "Repository name (for repo operations)"},
                        },
                        "required": ["operation"],
                    },
                ),
            ]

        @self.server.call_tool()
        async def call_tool(name: str, arguments: Dict[str, Any]) -> CallToolResult:
            """Handle tool calls"""
            try:
                if name == "context7_sequential_thinking":
                    result = await self._handle_context7_tool(arguments)
                elif name == "brave_search_mcp":
                    result = await self._handle_brave_search_tool(arguments)
                elif name == "github_mcp_operations":
                    result = await self._handle_github_tool(arguments)
                else:
                    return CallToolResult(
                        content=[TextContent(type="text", text=f"Unknown tool: {name}")], isError=True
                    )

                return CallToolResult(
                    content=[TextContent(type="text", text=json.dumps(result, indent=2))], isError=False
                )

            except Exception as e:
                logger.error(f"Tool call error for {name}: {e}")
                return CallToolResult(content=[TextContent(type="text", text=f"Tool error: {str(e)}")], isError=True)

    async def _handle_context7_tool(self, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """Handle Context7 sequential thinking tool"""
        prompt = arguments.get("prompt", "")
        minimum_tokens = arguments.get("minimum_tokens", 10000)

        # Import the actual implementation
        from lib._tools.adk_mcp_tools import context7_sequential_thinking

        # Call the implementation
        result = context7_sequential_thinking(prompt, minimum_tokens)

        return {
            "tool": "context7_sequential_thinking",
            "status": "success",
            "result": result,
            "mcp_server": "vana-mcp-server",
            "transport": "sse",
        }

    async def _handle_brave_search_tool(self, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """Handle Brave Search MCP tool"""
        query = arguments.get("query", "")
        max_results = arguments.get("max_results", 5)

        # Import the actual implementation
        from lib._tools.adk_mcp_tools import brave_search_mcp

        # Call the implementation
        result = brave_search_mcp(query, max_results)

        return {
            "tool": "brave_search_mcp",
            "status": "success",
            "result": result,
            "mcp_server": "vana-mcp-server",
            "transport": "sse",
        }

    async def _handle_github_tool(self, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """Handle GitHub MCP operations tool"""
        operation = arguments.get("operation", "")

        # Import the actual implementation
        from lib._tools.adk_mcp_tools import github_mcp_operations

        # Call the implementation with all arguments
        result = github_mcp_operations(operation, **arguments)

        return {
            "tool": "github_mcp_operations",
            "status": "success",
            "result": result,
            "mcp_server": "vana-mcp-server",
            "transport": "sse",
        }

    async def _register_resources(self):
        """Register MCP resources"""

        @self.server.list_resources()
        async def list_resources() -> List[Resource]:
            return [
                Resource(
                    uri="vana://status",
                    name="VANA Server Status",
                    description="Current status and capabilities of VANA MCP server",
                    mimeType="application/json",
                ),
                Resource(
                    uri="vana://tools",
                    name="Available Tools",
                    description="List of available MCP tools and their capabilities",
                    mimeType="application/json",
                ),
            ]

        @self.server.read_resource()
        async def read_resource(uri: str) -> ReadResourceResult:
            """Handle resource reads"""
            if uri == "vana://status":
                status = {
                    "server": "vana-mcp-server",
                    "version": "1.0.0",
                    "transport": "sse",
                    "tools_count": 3,
                    "resources_count": 2,
                    "status": "operational",
                    "cloud_platform": "Google Cloud Run",
                }
                return ReadResourceResult(
                    contents=[
                        types.TextResourceContents(
                            uri=uri, mimeType="application/json", text=json.dumps(status, indent=2)
                        )
                    ]
                )
            elif uri == "vana://tools":
                tools_info = {
                    "available_tools": [
                        {
                            "name": "context7_sequential_thinking",
                            "description": "Advanced reasoning and structured problem-solving",
                            "category": "reasoning",
                        },
                        {
                            "name": "brave_search_mcp",
                            "description": "Enhanced web search using Brave Search API",
                            "category": "search",
                        },
                        {
                            "name": "github_mcp_operations",
                            "description": "GitHub operations and workflow automation",
                            "category": "development",
                        },
                    ],
                    "total_tools": 3,
                    "mcp_compliant": True,
                }
                return ReadResourceResult(
                    contents=[
                        types.TextResourceContents(
                            uri=uri, mimeType="application/json", text=json.dumps(tools_info, indent=2)
                        )
                    ]
                )
            else:
                raise ValueError(f"Unknown resource: {uri}")

    async def _register_prompts(self):
        """Register MCP prompts"""

        @self.server.list_prompts()
        async def list_prompts() -> List[Prompt]:
            return [
                Prompt(
                    name="vana_analysis",
                    description="Structured analysis prompt for complex problems",
                    arguments=[
                        types.PromptArgument(name="topic", description="Topic or problem to analyze", required=True),
                        types.PromptArgument(
                            name="depth", description="Analysis depth (basic, detailed, comprehensive)", required=False
                        ),
                    ],
                )
            ]

        @self.server.get_prompt()
        async def get_prompt(name: str, arguments: Optional[Dict[str, str]] = None) -> GetPromptResult:
            """Handle prompt requests"""
            if name == "vana_analysis":
                topic = arguments.get("topic", "") if arguments else ""
                depth = arguments.get("depth", "detailed") if arguments else "detailed"

                prompt_text = f"""
Analyze the following topic using structured reasoning: {topic}

Analysis depth: {depth}

Please provide:
1. Problem definition and key components
2. Sequential analysis steps
3. Benefits and challenges
4. Strategic recommendations
5. Implementation considerations

Use the Context7 sequential thinking framework for comprehensive analysis.
"""

                return GetPromptResult(
                    messages=[
                        types.PromptMessage(role="user", content=types.TextContent(type="text", text=prompt_text))
                    ]
                )
            else:
                raise ValueError(f"Unknown prompt: {name}")


# Global server instance
vana_mcp_server = VANAMCPServer()
