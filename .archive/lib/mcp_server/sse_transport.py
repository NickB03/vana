"""
MCP SSE Transport for Cloud Run
Server-Sent Events transport implementation for MCP protocol compatibility
"""

import asyncio
import json
import logging
from typing import Any, Dict

from fastapi import Request
from fastapi.responses import StreamingResponse
from starlette.responses import JSONResponse

logger = logging.getLogger(__name__)


class MCPSSETransport:
    """MCP Server-Sent Events Transport for Cloud Run"""

    def __init__(self, mcp_server):
        self.mcp_server = mcp_server
        self.active_connections = {}

    async def handle_sse_connection(self, request: Request) -> StreamingResponse:
        """Handle SSE connection endpoint"""

        async def event_stream():
            """Generate SSE events"""
            try:
                # Send initial connection event
                yield f"data: {json.dumps({'type': 'connection', 'status': 'connected', 'server': 'vana-mcp-server'})}\n\n"

                # Keep connection alive
                while True:
                    # Send heartbeat every 30 seconds
                    yield f"data: {json.dumps({'type': 'heartbeat', 'timestamp': asyncio.get_event_loop().time()})}\n\n"
                    await asyncio.sleep(30)

            except asyncio.CancelledError:
                logger.info("SSE connection cancelled")
            except Exception as e:
                logger.error(f"SSE stream error: {e}")
                yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

        return StreamingResponse(
            event_stream(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Cache-Control",
            },
        )

    async def handle_message_post(self, request: Request) -> JSONResponse:
        """Handle MCP message POST endpoint"""
        try:
            # Parse JSON-RPC message
            message = await request.json()

            # Validate JSON-RPC format
            if not isinstance(message, dict) or "jsonrpc" not in message:
                return JSONResponse(
                    {"error": {"code": -32600, "message": "Invalid Request"}},
                    status_code=400,
                )

            # Handle different MCP methods
            method = message.get("method", "")
            params = message.get("params", {})
            message_id = message.get("id")

            if method == "initialize":
                result = await self._handle_initialize(params)
            elif method == "tools/list":
                result = await self._handle_list_tools(params)
            elif method == "tools/call":
                result = await self._handle_call_tool(params)
            elif method == "resources/list":
                result = await self._handle_list_resources(params)
            elif method == "resources/read":
                result = await self._handle_read_resource(params)
            elif method == "prompts/list":
                result = await self._handle_list_prompts(params)
            elif method == "prompts/get":
                result = await self._handle_get_prompt(params)
            else:
                return JSONResponse(
                    {
                        "jsonrpc": "2.0",
                        "id": message_id,
                        "error": {
                            "code": -32601,
                            "message": f"Method not found: {method}",
                        },
                    }
                )

            # Return JSON-RPC response
            response = {"jsonrpc": "2.0", "id": message_id, "result": result}

            return JSONResponse(response)

        except json.JSONDecodeError:
            return JSONResponse({"error": {"code": -32700, "message": "Parse error"}}, status_code=400)
        except Exception as e:
            logger.error(f"Message handling error: {e}")
            return JSONResponse(
                {
                    "jsonrpc": "2.0",
                    "id": message.get("id") if "message" in locals() else None,
                    "error": {"code": -32603, "message": f"Internal error: {str(e)}"},
                }
            )

    async def _handle_initialize(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Handle MCP initialize request"""
        return {
            "protocolVersion": "2024-11-05",
            "capabilities": {
                "tools": {},
                "resources": {},
                "prompts": {},
                "logging": {},
            },
            "serverInfo": {
                "name": "vana-mcp-server",
                "version": "1.0.0",
                "description": "VANA MCP Server with Context7, Brave Search, and GitHub tools",
                "transport": "sse",
                "platform": "Google Cloud Run",
            },
        }

    async def _handle_list_tools(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Handle tools/list request"""
        return {
            "tools": [
                {
                    "name": "context7_sequential_thinking",
                    "description": "Advanced reasoning and structured problem-solving using sequential thinking patterns",
                    "inputSchema": {
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
                },
                {
                    "name": "brave_search_mcp",
                    "description": "Enhanced web search using Brave Search API with MCP interface",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "query": {
                                "type": "string",
                                "description": "Search query string",
                            },
                            "max_results": {
                                "type": "integer",
                                "description": "Maximum number of results to return",
                                "default": 5,
                            },
                        },
                        "required": ["query"],
                    },
                },
                {
                    "name": "github_mcp_operations",
                    "description": "GitHub operations using GitHub API with MCP interface",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "operation": {
                                "type": "string",
                                "description": "GitHub operation type",
                                "enum": [
                                    "repos",
                                    "user_info",
                                    "issues",
                                    "pull_requests",
                                    "create_issue",
                                ],
                            },
                            "owner": {
                                "type": "string",
                                "description": "Repository owner (for repo operations)",
                            },
                            "repo": {
                                "type": "string",
                                "description": "Repository name (for repo operations)",
                            },
                        },
                        "required": ["operation"],
                    },
                },
            ]
        }

    async def _handle_call_tool(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Handle tools/call request"""
        tool_name = params.get("name", "")
        arguments = params.get("arguments", {})

        try:
            if tool_name == "context7_sequential_thinking":
                from lib._tools.adk_mcp_tools import context7_sequential_thinking

                result = context7_sequential_thinking(
                    arguments.get("prompt", ""), arguments.get("minimum_tokens", 10000)
                )
            elif tool_name == "brave_search_mcp":
                from lib._tools.adk_mcp_tools import brave_search_mcp

                result = brave_search_mcp(arguments.get("query", ""), arguments.get("max_results", 5))
            elif tool_name == "github_mcp_operations":
                from lib._tools.adk_mcp_tools import github_mcp_operations

                result = github_mcp_operations(
                    arguments.get("operation", ""),
                    **{k: v for k, v in arguments.items() if k != "operation"},
                )
            else:
                return {
                    "content": [{"type": "text", "text": f"Unknown tool: {tool_name}"}],
                    "isError": True,
                }

            return {
                "content": [{"type": "text", "text": json.dumps(result, indent=2)}],
                "isError": False,
            }

        except Exception as e:
            logger.error(f"Tool call error for {tool_name}: {e}")
            return {
                "content": [{"type": "text", "text": f"Tool error: {str(e)}"}],
                "isError": True,
            }

    async def _handle_list_resources(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Handle resources/list request"""
        return {
            "resources": [
                {
                    "uri": "vana://status",
                    "name": "VANA Server Status",
                    "description": "Current status and capabilities of VANA MCP server",
                    "mimeType": "application/json",
                },
                {
                    "uri": "vana://tools",
                    "name": "Available Tools",
                    "description": "List of available MCP tools and their capabilities",
                    "mimeType": "application/json",
                },
            ]
        }

    async def _handle_read_resource(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Handle resources/read request"""
        uri = params.get("uri", "")

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
            return {
                "contents": [
                    {
                        "uri": uri,
                        "mimeType": "application/json",
                        "text": json.dumps(status, indent=2),
                    }
                ]
            }
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
            return {
                "contents": [
                    {
                        "uri": uri,
                        "mimeType": "application/json",
                        "text": json.dumps(tools_info, indent=2),
                    }
                ]
            }
        else:
            raise ValueError(f"Unknown resource: {uri}")

    async def _handle_list_prompts(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Handle prompts/list request"""
        return {
            "prompts": [
                {
                    "name": "vana_analysis",
                    "description": "Structured analysis prompt for complex problems",
                    "arguments": [
                        {
                            "name": "topic",
                            "description": "Topic or problem to analyze",
                            "required": True,
                        },
                        {
                            "name": "depth",
                            "description": "Analysis depth (basic, detailed, comprehensive)",
                            "required": False,
                        },
                    ],
                }
            ]
        }

    async def _handle_get_prompt(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Handle prompts/get request"""
        name = params.get("name", "")
        arguments = params.get("arguments", {})

        if name == "vana_analysis":
            topic = arguments.get("topic", "")
            depth = arguments.get("depth", "detailed")

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

            return {"messages": [{"role": "user", "content": {"type": "text", "text": prompt_text}}]}
        else:
            raise ValueError(f"Unknown prompt: {name}")
