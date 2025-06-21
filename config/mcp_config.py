"""
MCP Configuration Management for VANA

This module provides centralized configuration for MCP (Model Context Protocol)
servers and tools. Manages server URLs, authentication requirements, and
environment key mappings for all MCP integrations.
"""

import os
from dataclasses import dataclass
from enum import Enum
from typing import Any, Dict, List, Optional


class MCPServerType(Enum):
    """MCP Server deployment types."""

    API_DIRECT = "api_direct"
    NPM_GLOBAL = "npm_global"
    DOCKER = "docker"
    PYTHON_PACKAGE = "python_package"
    NATIVE = "native"


class MCPServerStatus(Enum):
    """MCP Server status states."""

    READY = "ready"
    NEEDS_API_KEY = "needs_api_key"
    NEEDS_TOKEN = "needs_token"
    NEEDS_CONNECTION_STRING = "needs_connection_string"
    SIMULATED = "simulated"
    DISABLED = "disabled"


@dataclass
class MCPServerConfig:
    """Configuration for a single MCP server."""

    name: str
    package: str
    server_type: MCPServerType
    status: MCPServerStatus
    description: str
    env_keys: List[str]
    url: Optional[str] = None
    port: Optional[int] = None
    timeout: int = 30
    retry_count: int = 3
    priority: int = 1  # 1 = highest priority


class MCPConfigManager:
    """Centralized MCP configuration management."""

    def __init__(self):
        """Initialize MCP configuration manager."""
        self.servers = self._initialize_server_configs()

    def _initialize_server_configs(self) -> Dict[str, MCPServerConfig]:
        """Initialize all MCP server configurations."""

        servers = {}

        # Tier 1 Priority Servers (Phase 3 Enhanced)
        servers["brave_search"] = MCPServerConfig(
            name="brave_search",
            package="@modelcontextprotocol/server-brave-search",
            server_type=MCPServerType.API_DIRECT,
            status=self._get_server_status("BRAVE_API_KEY"),
            description="Enhanced web search with AI-powered results",
            env_keys=["BRAVE_API_KEY"],
            url="https://api.search.brave.com/res/v1/web/search",
            timeout=12,
            priority=1,
        )

        servers["github"] = MCPServerConfig(
            name="github",
            package="ghcr.io/github/github-mcp-server",
            server_type=MCPServerType.API_DIRECT,
            status=self._get_server_status(
                ["GITHUB_TOKEN", "GITHUB_PERSONAL_ACCESS_TOKEN"]
            ),
            description="Complete GitHub workflow automation",
            env_keys=["GITHUB_TOKEN", "GITHUB_PERSONAL_ACCESS_TOKEN"],
            url="https://api.github.com",
            timeout=15,
            priority=1,
        )

        servers["firecrawl"] = MCPServerConfig(
            name="firecrawl",
            package="firecrawl-api",
            server_type=MCPServerType.API_DIRECT,
            status=self._get_server_status("FIRECRAWL_API_KEY"),
            description="Advanced web scraping and crawling",
            env_keys=["FIRECRAWL_API_KEY"],
            url="https://api.firecrawl.dev/v0",
            timeout=30,
            priority=1,
        )

        servers["playwright"] = MCPServerConfig(
            name="playwright",
            package="playwright",
            server_type=MCPServerType.PYTHON_PACKAGE,
            status=MCPServerStatus.SIMULATED,
            description="Browser automation and testing",
            env_keys=[],
            timeout=60,
            priority=1,
        )

        servers["time_utilities"] = MCPServerConfig(
            name="time_utilities",
            package="built_in",
            server_type=MCPServerType.NATIVE,
            status=MCPServerStatus.READY,
            description="Time and date operations",
            env_keys=[],
            priority=1,
        )

        servers["context7_sequential_thinking"] = MCPServerConfig(
            name="context7_sequential_thinking",
            package="built_in",
            server_type=MCPServerType.NATIVE,
            status=MCPServerStatus.READY,
            description="Advanced reasoning and structured problem-solving",
            env_keys=[],
            priority=1,
        )

        # Tier 2 Priority Servers (Future Implementation)
        servers["notion"] = MCPServerConfig(
            name="notion",
            package="@notionhq/notion-mcp-server",
            server_type=MCPServerType.NPM_GLOBAL,
            status=MCPServerStatus.NEEDS_TOKEN,
            description="Knowledge management and documentation",
            env_keys=["NOTION_API_TOKEN"],
            url="https://api.notion.com/v1",
            priority=2,
        )

        servers["mongodb"] = MCPServerConfig(
            name="mongodb",
            package="@mongodb-js/mongodb-mcp-server",
            server_type=MCPServerType.NPM_GLOBAL,
            status=MCPServerStatus.NEEDS_CONNECTION_STRING,
            description="Database operations and management",
            env_keys=["MONGODB_CONNECTION_STRING"],
            priority=2,
        )

        return servers

    def _get_server_status(self, env_keys) -> MCPServerStatus:
        """Determine server status based on environment variables."""
        if isinstance(env_keys, str):
            env_keys = [env_keys]

        # Check if any of the required environment keys are present
        for key in env_keys:
            if os.getenv(key):
                return MCPServerStatus.READY

        if "API_KEY" in str(env_keys):
            return MCPServerStatus.NEEDS_API_KEY
        elif "TOKEN" in str(env_keys):
            return MCPServerStatus.NEEDS_TOKEN
        else:
            return MCPServerStatus.NEEDS_CONNECTION_STRING

    def get_server_config(self, server_name: str) -> Optional[MCPServerConfig]:
        """Get configuration for a specific MCP server."""
        return self.servers.get(server_name)

    def get_ready_servers(self) -> Dict[str, MCPServerConfig]:
        """Get all servers that are ready to use."""
        return {
            name: config
            for name, config in self.servers.items()
            if config.status == MCPServerStatus.READY
        }

    def get_servers_by_priority(self, priority: int = 1) -> Dict[str, MCPServerConfig]:
        """Get servers by priority level."""
        return {
            name: config
            for name, config in self.servers.items()
            if config.priority == priority
        }

    def get_server_status_summary(self) -> Dict[str, Any]:
        """Get comprehensive status summary of all MCP servers."""
        total_servers = len(self.servers)
        ready_servers = len(self.get_ready_servers())

        status_counts = {}
        for config in self.servers.values():
            status = config.status.value
            status_counts[status] = status_counts.get(status, 0) + 1

        return {
            "total_servers": total_servers,
            "ready_servers": ready_servers,
            "readiness_percentage": round((ready_servers / total_servers) * 100, 1),
            "status_breakdown": status_counts,
            "tier_1_ready": len(
                [
                    c
                    for c in self.servers.values()
                    if c.priority == 1 and c.status == MCPServerStatus.READY
                ]
            ),
            "tier_2_ready": len(
                [
                    c
                    for c in self.servers.values()
                    if c.priority == 2 and c.status == MCPServerStatus.READY
                ]
            ),
        }

    def get_missing_environment_keys(self) -> Dict[str, List[str]]:
        """Get list of missing environment keys for each server."""
        missing_keys = {}

        for name, config in self.servers.items():
            if config.status != MCPServerStatus.READY and config.env_keys:
                missing = []
                for key in config.env_keys:
                    if not os.getenv(key):
                        missing.append(key)

                if missing:
                    missing_keys[name] = missing

        return missing_keys

    def validate_server_configuration(self, server_name: str) -> Dict[str, Any]:
        """Validate configuration for a specific server."""
        config = self.get_server_config(server_name)
        if not config:
            return {
                "valid": False,
                "error": f"Server '{server_name}' not found in configuration",
            }

        validation_result = {
            "valid": True,
            "server_name": server_name,
            "status": config.status.value,
            "environment_keys": {},
        }

        # Check environment keys
        for key in config.env_keys:
            value = os.getenv(key)
            validation_result["environment_keys"][key] = {
                "present": bool(value),
                "value_length": len(value) if value else 0,
            }

        # Overall validation
        missing_keys = [k for k in config.env_keys if not os.getenv(k)]
        if missing_keys:
            validation_result["valid"] = False
            validation_result["missing_keys"] = missing_keys

        return validation_result


# Global MCP configuration manager instance
mcp_config = MCPConfigManager()


def get_mcp_config() -> MCPConfigManager:
    """Get the global MCP configuration manager instance."""
    return mcp_config


def get_mcp_servers() -> Dict[str, Any]:
    """Get MCP servers configuration in dictionary format."""
    servers_dict = {}

    for name, config in mcp_config.servers.items():
        servers_dict[name] = {
            "package": config.package,
            "type": config.server_type.value,
            "status": config.status.value,
            "description": config.description,
            "url": config.url,
            "port": config.port,
            "timeout": config.timeout,
            "priority": config.priority,
            "env_keys": config.env_keys,
        }

    return servers_dict


# MCP Server URLs and endpoints for direct API access
MCP_SERVERS = get_mcp_servers()
