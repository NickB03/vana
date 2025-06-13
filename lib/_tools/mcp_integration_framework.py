"""
MCP Integration Framework for VANA Agent Team
Phase 6A: Core MCP Tools Integration

This module provides a standardized framework for integrating Model Context Protocol (MCP) servers
with the VANA agent system, enabling seamless tool orchestration and management.
"""

import json
import logging
import os
import subprocess
from dataclasses import dataclass
from enum import Enum
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


class MCPServerType(Enum):
    """Types of MCP server installation methods"""

    NPM_GLOBAL = "npm_global"
    UVX = "uvx"
    DOCKER = "docker"
    PYTHON_MODULE = "python_module"
    BINARY = "binary"


@dataclass
class MCPServerConfig:
    """Configuration for an MCP server"""

    name: str
    server_type: MCPServerType
    package_name: str
    command: str
    args: List[str]
    env_vars: Dict[str, str]
    description: str
    category: str
    priority: int
    requires_auth: bool = True
    auth_type: str = "api_key"
    docker_image: Optional[str] = None


class MCPServerRegistry:
    """Registry for managing MCP server configurations"""

    def __init__(self):
        self.servers: Dict[str, MCPServerConfig] = {}
        self._load_default_servers()

    def _load_default_servers(self):
        """Load default MCP server configurations"""

        # 1. Brave Search MCP Server (TIER 1 PRIORITY)
        self.register_server(
            MCPServerConfig(
                name="brave_search",
                server_type=MCPServerType.NPM_GLOBAL,
                package_name="@modelcontextprotocol/server-brave-search",
                command="npx",
                args=["-y", "@modelcontextprotocol/server-brave-search"],
                env_vars={"BRAVE_API_KEY": os.getenv("BRAVE_API_KEY", "")},
                description="Enhanced web search with AI-powered results",
                category="search",
                priority=1,
                requires_auth=True,
                auth_type="api_key",
            )
        )

        # 2. GitHub MCP Server (TIER 1 PRIORITY)
        self.register_server(
            MCPServerConfig(
                name="github",
                server_type=MCPServerType.DOCKER,
                package_name="ghcr.io/github/github-mcp-server",
                command="docker",
                args=["run", "-i", "--rm", "-e", "GITHUB_PERSONAL_ACCESS_TOKEN", "ghcr.io/github/github-mcp-server"],
                env_vars={"GITHUB_PERSONAL_ACCESS_TOKEN": os.getenv("GITHUB_TOKEN", "")},
                description="Complete GitHub workflow automation",
                category="development",
                priority=1,
                requires_auth=True,
                auth_type="personal_access_token",
                docker_image="ghcr.io/github/github-mcp-server",
            )
        )

        # 3. AWS Lambda MCP Server (TIER 2 PRIORITY)
        self.register_server(
            MCPServerConfig(
                name="aws_lambda",
                server_type=MCPServerType.UVX,
                package_name="awslabs.lambda-mcp-server",
                command="uvx",
                args=["awslabs.lambda-mcp-server@latest"],
                env_vars={
                    "AWS_PROFILE": os.getenv("AWS_PROFILE", "default"),
                    "AWS_REGION": os.getenv("AWS_REGION", "us-central1"),
                    "FASTMCP_LOG_LEVEL": "ERROR",
                },
                description="AWS Lambda function management and execution",
                category="cloud",
                priority=2,
                requires_auth=True,
                auth_type="aws_credentials",
            )
        )

        # 4. Notion MCP Server (TIER 2 PRIORITY)
        self.register_server(
            MCPServerConfig(
                name="notion",
                server_type=MCPServerType.NPM_GLOBAL,
                package_name="@notionhq/notion-mcp-server",
                command="npx",
                args=["-y", "@notionhq/notion-mcp-server"],
                env_vars={
                    "OPENAPI_MCP_HEADERS": json.dumps(
                        {"Authorization": f"Bearer {os.getenv('NOTION_API_TOKEN', '')}", "Notion-Version": "2022-06-28"}
                    )
                },
                description="Knowledge management and documentation automation",
                category="productivity",
                priority=2,
                requires_auth=True,
                auth_type="api_token",
            )
        )

        # 5. MongoDB MCP Server (TIER 2 PRIORITY)
        self.register_server(
            MCPServerConfig(
                name="mongodb",
                server_type=MCPServerType.NPM_GLOBAL,
                package_name="@mongodb-js/mongodb-mcp-server",
                command="npx",
                args=["-y", "@mongodb-js/mongodb-mcp-server"],
                env_vars={
                    "MONGODB_CONNECTION_STRING": os.getenv("MONGODB_CONNECTION_STRING", ""),
                    "FASTMCP_LOG_LEVEL": "ERROR",
                },
                description="Database operations and management",
                category="database",
                priority=2,
                requires_auth=True,
                auth_type="connection_string",
            )
        )

    def register_server(self, config: MCPServerConfig):
        """Register a new MCP server configuration"""
        self.servers[config.name] = config
        logger.info(f"Registered MCP server: {config.name}")

    def get_server(self, name: str) -> Optional[MCPServerConfig]:
        """Get MCP server configuration by name"""
        return self.servers.get(name)

    def list_servers(self, category: Optional[str] = None, priority: Optional[int] = None) -> List[MCPServerConfig]:
        """List MCP servers with optional filtering"""
        servers = list(self.servers.values())

        if category:
            servers = [s for s in servers if s.category == category]

        if priority:
            servers = [s for s in servers if s.priority <= priority]

        return sorted(servers, key=lambda s: s.priority)

    def get_priority_servers(self, max_priority: int = 1) -> List[MCPServerConfig]:
        """Get high-priority servers for immediate implementation"""
        return [s for s in self.servers.values() if s.priority <= max_priority]


class MCPServerManager:
    """Manager for MCP server lifecycle operations"""

    def __init__(self):
        self.registry = MCPServerRegistry()
        self.active_servers: Dict[str, subprocess.Popen] = {}

    def install_server(self, server_name: str) -> bool:
        """Install an MCP server"""
        config = self.registry.get_server(server_name)
        if not config:
            logger.error(f"Server {server_name} not found in registry")
            return False

        try:
            if config.server_type == MCPServerType.NPM_GLOBAL:
                result = subprocess.run(
                    ["npm", "install", "-g", config.package_name], capture_output=True, text=True, check=True
                )
                logger.info(f"Installed {server_name}: {result.stdout}")

            elif config.server_type == MCPServerType.DOCKER:
                result = subprocess.run(
                    ["docker", "pull", config.docker_image], capture_output=True, text=True, check=True
                )
                logger.info(f"Pulled Docker image for {server_name}: {result.stdout}")

            elif config.server_type == MCPServerType.UVX:
                # UVX handles installation automatically on first run
                logger.info(f"UVX will handle installation for {server_name} on first run")

            return True

        except subprocess.CalledProcessError as e:
            logger.error(f"Failed to install {server_name}: {e.stderr}")
            return False

    def validate_authentication(self, server_name: str) -> bool:
        """Validate authentication for an MCP server"""
        config = self.registry.get_server(server_name)
        if not config or not config.requires_auth:
            return True

        # Check if required environment variables are set
        for key, value in config.env_vars.items():
            if not value or value == "":
                logger.warning(f"Missing authentication for {server_name}: {key}")
                return False

        return True

    def generate_mcp_config(self, server_names: List[str]) -> Dict[str, Any]:
        """Generate MCP configuration for specified servers"""
        mcp_config = {"mcpServers": {}}

        for server_name in server_names:
            config = self.registry.get_server(server_name)
            if not config:
                continue

            mcp_config["mcpServers"][server_name] = {
                "command": config.command,
                "args": config.args,
                "env": config.env_vars,
                "disabled": False,
                "autoApprove": [],
            }

        return mcp_config

    def get_implementation_status(self) -> Dict[str, Dict[str, Any]]:
        """Get implementation status for all registered servers"""
        status = {}

        for name, config in self.registry.servers.items():
            status[name] = {
                "priority": config.priority,
                "category": config.category,
                "requires_auth": config.requires_auth,
                "auth_valid": self.validate_authentication(name),
                "description": config.description,
                "ready_for_implementation": self.validate_authentication(name),
            }

        return status


# Global instance for use across the application
mcp_manager = MCPServerManager()
