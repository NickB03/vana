"""
MCP Manager Implementation
Centralized MCP server lifecycle management and coordination.

This module provides centralized management of multiple MCP server connections,
tool discovery, execution coordination, and health monitoring.
"""

import asyncio
import json
import logging
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional

from .mcp_client import ConnectionStatus, MCPClient, ServerConfig, ToolInfo

logger = logging.getLogger(__name__)


@dataclass
class ServerInstance:
    """MCP server instance information"""

    name: str
    client: MCPClient
    config: ServerConfig
    status: ConnectionStatus
    tools: List[ToolInfo]
    last_health_check: Optional[float] = None
    error_count: int = 0
    start_time: Optional[float] = None


@dataclass
class HealthStatus:
    """Server health status information"""

    is_healthy: bool
    last_check: float
    response_time: Optional[float]
    error_count: int
    uptime: Optional[float]
    status_message: str


@dataclass
class ToolResult:
    """Result from tool execution"""

    success: bool
    content: List[Dict[str, Any]]
    server_name: str
    execution_time: float
    error_message: Optional[str] = None


class MCPManager:
    """Centralized MCP server lifecycle management and coordination."""

    def __init__(self, config_path: str):
        """Initialize with server configuration."""
        self.config_path = Path(config_path)
        self.servers: Dict[str, ServerInstance] = {}
        self.server_configs: Dict[str, ServerConfig] = {}
        self.health_check_interval = 60  # seconds
        self.health_check_task = None
        self._load_configuration()

    def _load_configuration(self):
        """Load server configurations from file."""
        try:
            if not self.config_path.exists():
                logger.warning(f"Configuration file not found: {self.config_path}")
                return

            with open(self.config_path, "r") as f:
                config_data = json.load(f)

            for server_name, server_config in config_data.items():
                if not server_config.get("enabled", True):
                    continue

                self.server_configs[server_name] = ServerConfig(
                    name=server_name,
                    command=server_config["command"],
                    args=server_config.get("args", []),
                    env=server_config.get("env", {}),
                    timeout=server_config.get("timeout", 30),
                    retry_attempts=server_config.get("retry_attempts", 3),
                    retry_delay=server_config.get("retry_delay", 1),
                )

            logger.info(f"Loaded {len(self.server_configs)} server configurations")

        except Exception as e:
            logger.error(f"Failed to load configuration: {e}")

    async def start_server(self, server_name: str) -> ServerInstance:
        """Start an MCP server instance."""
        try:
            if server_name in self.servers:
                logger.warning(f"Server {server_name} already running")
                return self.servers[server_name]

            if server_name not in self.server_configs:
                raise ValueError(f"No configuration found for server: {server_name}")

            config = self.server_configs[server_name]
            client = MCPClient(config)

            # Attempt to connect
            if not await client.connect():
                raise RuntimeError(f"Failed to connect to server: {server_name}")

            # Discover tools
            tools = await client.list_tools()

            # Create server instance
            instance = ServerInstance(
                name=server_name,
                client=client,
                config=config,
                status=client.status,
                tools=tools,
                last_health_check=time.time(),
                start_time=time.time(),
            )

            self.servers[server_name] = instance
            logger.info(f"Started MCP server: {server_name} with {len(tools)} tools")

            # Start health monitoring if this is the first server
            if len(self.servers) == 1 and not self.health_check_task:
                self.health_check_task = asyncio.create_task(self._health_monitor())

            return instance

        except Exception as e:
            logger.error(f"Failed to start server {server_name}: {e}")
            raise

    async def stop_server(self, server_name: str) -> bool:
        """Stop an MCP server instance."""
        try:
            if server_name not in self.servers:
                logger.warning(f"Server {server_name} not running")
                return True

            instance = self.servers[server_name]
            await instance.client.disconnect()

            del self.servers[server_name]
            logger.info(f"Stopped MCP server: {server_name}")

            # Stop health monitoring if no servers remain
            if not self.servers and self.health_check_task:
                self.health_check_task.cancel()
                self.health_check_task = None

            return True

        except Exception as e:
            logger.error(f"Failed to stop server {server_name}: {e}")
            return False

    async def discover_tools(self, server_name: str) -> List[ToolInfo]:
        """Discover available tools from a server."""
        try:
            if server_name not in self.servers:
                raise ValueError(f"Server not running: {server_name}")

            instance = self.servers[server_name]
            tools = await instance.client.list_tools()

            # Update cached tools
            instance.tools = tools
            logger.info(f"Discovered {len(tools)} tools from {server_name}")

            return tools

        except Exception as e:
            logger.error(f"Failed to discover tools from {server_name}: {e}")
            return []

    async def execute_tool(self, server_name: str, tool_name: str, params: Dict[str, Any]) -> ToolResult:
        """Execute a tool on a specific server."""
        start_time = time.time()

        try:
            if server_name not in self.servers:
                return ToolResult(
                    success=False,
                    content=[],
                    server_name=server_name,
                    execution_time=0,
                    error_message=f"Server not running: {server_name}",
                )

            instance = self.servers[server_name]

            # Check if tool exists
            tool_names = [tool.name for tool in instance.tools]
            if tool_name not in tool_names:
                return ToolResult(
                    success=False,
                    content=[],
                    server_name=server_name,
                    execution_time=time.time() - start_time,
                    error_message=f"Tool not found: {tool_name}. Available: {tool_names}",
                )

            # Execute tool
            response = await instance.client.call_tool(tool_name, params)
            execution_time = time.time() - start_time

            if response.is_error:
                instance.error_count += 1
                return ToolResult(
                    success=False,
                    content=response.content,
                    server_name=server_name,
                    execution_time=execution_time,
                    error_message="Tool execution failed",
                )

            return ToolResult(
                success=True, content=response.content, server_name=server_name, execution_time=execution_time
            )

        except Exception as e:
            execution_time = time.time() - start_time
            logger.error(f"Tool execution error on {server_name}.{tool_name}: {e}")

            if server_name in self.servers:
                self.servers[server_name].error_count += 1

            return ToolResult(
                success=False, content=[], server_name=server_name, execution_time=execution_time, error_message=str(e)
            )

    async def get_server_health(self, server_name: str) -> HealthStatus:
        """Check server health and status."""
        try:
            if server_name not in self.servers:
                return HealthStatus(
                    is_healthy=False,
                    last_check=time.time(),
                    response_time=None,
                    error_count=0,
                    uptime=None,
                    status_message="Server not running",
                )

            instance = self.servers[server_name]
            start_time = time.time()

            # Perform health check
            is_healthy = await instance.client.health_check()
            response_time = time.time() - start_time

            # Calculate uptime
            uptime = time.time() - instance.start_time if instance.start_time else None

            # Update instance
            instance.last_health_check = time.time()
            instance.status = instance.client.status

            return HealthStatus(
                is_healthy=is_healthy,
                last_check=time.time(),
                response_time=response_time,
                error_count=instance.error_count,
                uptime=uptime,
                status_message="Healthy" if is_healthy else "Unhealthy",
            )

        except Exception as e:
            logger.error(f"Health check failed for {server_name}: {e}")
            return HealthStatus(
                is_healthy=False,
                last_check=time.time(),
                response_time=None,
                error_count=instance.error_count if server_name in self.servers else 0,
                uptime=None,
                status_message=f"Health check error: {str(e)}",
            )

    async def restart_server(self, server_name: str) -> bool:
        """Restart a failed server."""
        try:
            logger.info(f"Restarting server: {server_name}")

            # Stop the server if running
            if server_name in self.servers:
                await self.stop_server(server_name)

            # Wait a moment before restart
            await asyncio.sleep(2)

            # Start the server
            await self.start_server(server_name)

            logger.info(f"Successfully restarted server: {server_name}")
            return True

        except Exception as e:
            logger.error(f"Failed to restart server {server_name}: {e}")
            return False

    async def _health_monitor(self):
        """Background task for monitoring server health."""
        while True:
            try:
                await asyncio.sleep(self.health_check_interval)

                for server_name in list(self.servers.keys()):
                    health = await self.get_server_health(server_name)

                    if not health.is_healthy:
                        logger.warning(f"Server {server_name} unhealthy: {health.status_message}")

                        # Auto-restart if error count is high
                        instance = self.servers.get(server_name)
                        if instance and instance.error_count > 5:
                            logger.info(f"Auto-restarting server {server_name} due to high error count")
                            await self.restart_server(server_name)

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Health monitor error: {e}")

    def get_all_servers(self) -> Dict[str, ServerInstance]:
        """Get all server instances."""
        return self.servers.copy()

    def get_all_tools(self) -> Dict[str, List[ToolInfo]]:
        """Get all tools from all servers."""
        return {name: instance.tools for name, instance in self.servers.items()}

    async def shutdown(self):
        """Shutdown all servers and cleanup."""
        try:
            # Cancel health monitoring
            if self.health_check_task:
                self.health_check_task.cancel()
                self.health_check_task = None

            # Stop all servers
            for server_name in list(self.servers.keys()):
                await self.stop_server(server_name)

            logger.info("MCP Manager shutdown complete")

        except Exception as e:
            logger.error(f"Error during shutdown: {e}")
