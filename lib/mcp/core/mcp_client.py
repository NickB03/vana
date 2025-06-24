"""
MCP Client Implementation
JSON-RPC protocol implementation for MCP communication with external servers.

This module provides the core client functionality for connecting to and
communicating with external MCP servers using the JSON-RPC protocol.
"""

import asyncio
import json
import logging
import time
from dataclasses import dataclass
from enum import Enum
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


class ConnectionStatus(Enum):
    """Connection status enumeration"""

    DISCONNECTED = "disconnected"
    CONNECTING = "connecting"
    CONNECTED = "connected"
    ERROR = "error"


@dataclass
class ServerConfig:
    """Server configuration for MCP connections"""

    name: str
    command: List[str]
    args: List[str] = None
    env: Dict[str, str] = None
    timeout: int = 30
    retry_attempts: int = 3
    retry_delay: int = 1


@dataclass
class ToolInfo:
    """Tool information from MCP server"""

    name: str
    description: str
    input_schema: Dict[str, Any]


@dataclass
class ToolResponse:
    """Response from tool execution"""

    content: List[Dict[str, Any]]
    is_error: bool = False


@dataclass
class Response:
    """Generic response from MCP server"""

    id: Optional[str]
    result: Optional[Dict[str, Any]]
    error: Optional[Dict[str, Any]]


class MCPClient:
    """JSON-RPC protocol implementation for MCP communication."""

    def __init__(self, server_config: ServerConfig):
        """Initialize client with server configuration."""
        self.config = server_config
        self.process = None
        self.status = ConnectionStatus.DISCONNECTED
        self.request_id = 0
        self.tools_cache = {}
        self.last_heartbeat = None

    async def connect(self) -> bool:
        """Establish connection to MCP server."""
        try:
            self.status = ConnectionStatus.CONNECTING
            logger.info(f"Connecting to MCP server: {self.config.name}")

            # Prepare command and environment
            cmd = self.config.command + (self.config.args or [])
            env = self.config.env or {}

            # Start the MCP server process
            self.process = await asyncio.create_subprocess_exec(
                *cmd,
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                env=env,
            )

            # Initialize the connection with handshake
            init_response = await self._send_request(
                "initialize",
                {
                    "protocolVersion": "2024-11-05",
                    "capabilities": {"roots": {"listChanged": True}, "sampling": {}},
                    "clientInfo": {"name": "vana-mcp-client", "version": "1.0.0"},
                },
            )

            if init_response.error:
                logger.error(f"MCP initialization failed: {init_response.error}")
                await self.disconnect()
                return False

            # Send initialized notification
            await self._send_notification("notifications/initialized", {})

            self.status = ConnectionStatus.CONNECTED
            self.last_heartbeat = time.time()
            logger.info(f"Successfully connected to MCP server: {self.config.name}")
            return True

        except Exception as e:
            logger.error(f"Failed to connect to MCP server {self.config.name}: {e}")
            self.status = ConnectionStatus.ERROR
            await self.disconnect()
            return False

    async def disconnect(self) -> bool:
        """Clean disconnect from server."""
        try:
            if self.process:
                self.process.terminate()
                try:
                    await asyncio.wait_for(self.process.wait(), timeout=5.0)
                except asyncio.TimeoutError:
                    self.process.kill()
                    await self.process.wait()

            self.status = ConnectionStatus.DISCONNECTED
            self.process = None
            logger.info(f"Disconnected from MCP server: {self.config.name}")
            return True

        except Exception as e:
            logger.error(f"Error disconnecting from MCP server {self.config.name}: {e}")
            return False

    async def send_request(
        self, method: str, params: Dict[str, Any], timeout: int = 30
    ) -> Response:
        """Send JSON-RPC request with timeout and retry."""
        if self.status != ConnectionStatus.CONNECTED:
            if not await self.connect():
                return Response(None, None, {"code": -1, "message": "Not connected"})

        for attempt in range(self.config.retry_attempts):
            try:
                response = await self._send_request(method, params, timeout)
                if response.error and attempt < self.config.retry_attempts - 1:
                    logger.warning(
                        f"Request failed (attempt {attempt + 1}), retrying: {response.error}"
                    )
                    await asyncio.sleep(self.config.retry_delay * (attempt + 1))
                    continue
                return response

            except Exception as e:
                if attempt < self.config.retry_attempts - 1:
                    logger.warning(
                        f"Request exception (attempt {attempt + 1}), retrying: {e}"
                    )
                    await asyncio.sleep(self.config.retry_delay * (attempt + 1))
                    continue
                return Response(None, None, {"code": -2, "message": str(e)})

        return Response(None, None, {"code": -3, "message": "Max retries exceeded"})

    async def _send_request(
        self, method: str, params: Dict[str, Any], timeout: int = 30
    ) -> Response:
        """Internal method to send JSON-RPC request."""
        if not self.process or self.process.stdin.is_closing():
            raise RuntimeError("Process not available")

        self.request_id += 1
        request = {
            "jsonrpc": "2.0",
            "id": self.request_id,
            "method": method,
            "params": params,
        }

        # Send request
        request_data = json.dumps(request) + "\n"
        self.process.stdin.write(request_data.encode())
        await self.process.stdin.drain()

        # Read response with timeout
        try:
            response_line = await asyncio.wait_for(
                self.process.stdout.readline(), timeout=timeout
            )

            if not response_line:
                raise RuntimeError("Empty response from server")

            response_data = json.loads(response_line.decode().strip())

            return Response(
                id=response_data.get("id"),
                result=response_data.get("result"),
                error=response_data.get("error"),
            )

        except asyncio.TimeoutError:
            raise RuntimeError(f"Request timeout after {timeout} seconds")
        except json.JSONDecodeError as e:
            raise RuntimeError(f"Invalid JSON response: {e}")

    async def _send_notification(self, method: str, params: Dict[str, Any]):
        """Send JSON-RPC notification (no response expected)."""
        if not self.process or self.process.stdin.is_closing():
            return

        notification = {"jsonrpc": "2.0", "method": method, "params": params}

        notification_data = json.dumps(notification) + "\n"
        self.process.stdin.write(notification_data.encode())
        await self.process.stdin.drain()

    async def list_tools(self) -> List[ToolInfo]:
        """List available tools from server."""
        try:
            response = await self.send_request("tools/list", {})

            if response.error:
                logger.error(f"Failed to list tools: {response.error}")
                return []

            tools = response.result.get("tools", [])
            tool_infos = []

            for tool in tools:
                tool_infos.append(
                    ToolInfo(
                        name=tool.get("name", ""),
                        description=tool.get("description", ""),
                        input_schema=tool.get("inputSchema", {}),
                    )
                )

            # Cache tools for quick access
            self.tools_cache = {tool.name: tool for tool in tool_infos}
            return tool_infos

        except Exception as e:
            logger.error(f"Error listing tools: {e}")
            return []

    async def call_tool(
        self, tool_name: str, arguments: Dict[str, Any]
    ) -> ToolResponse:
        """Call a specific tool with arguments."""
        try:
            response = await self.send_request(
                "tools/call", {"name": tool_name, "arguments": arguments}
            )

            if response.error:
                return ToolResponse(
                    content=[{"type": "text", "text": f"Tool error: {response.error}"}],
                    is_error=True,
                )

            result = response.result
            content = result.get("content", [])
            is_error = result.get("isError", False)

            return ToolResponse(content=content, is_error=is_error)

        except Exception as e:
            logger.error(f"Error calling tool {tool_name}: {e}")
            return ToolResponse(
                content=[{"type": "text", "text": f"Exception: {str(e)}"}],
                is_error=True,
            )

    async def health_check(self) -> bool:
        """Check if connection is healthy."""
        try:
            if self.status != ConnectionStatus.CONNECTED:
                return False

            # Simple ping to check if server is responsive
            response = await self.send_request("ping", {}, timeout=5)

            if response.error:
                logger.warning(f"Health check failed: {response.error}")
                return False

            self.last_heartbeat = time.time()
            return True

        except Exception as e:
            logger.error(f"Health check error: {e}")
            return False
