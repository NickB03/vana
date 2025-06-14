"""
VANA MCP Integration System
Model Context Protocol integration for external server connectivity.

This package provides comprehensive MCP integration capabilities including:
- MCP Client for JSON-RPC communication
- MCP Manager for server lifecycle management
- MCP Registry for capability tracking
- Server integrations for GitHub, Brave Search, and Fetch
- Security and configuration management
"""

from .core.mcp_client import MCPClient, ServerConfig, ToolInfo, ToolResponse, ConnectionStatus
from .core.mcp_manager import MCPManager, ServerInstance, HealthStatus, ToolResult
from .core.mcp_registry import MCPRegistry, ServerInfo, Capabilities, PerformanceMetrics, ServerStatus

__version__ = "1.0.0"
__author__ = "VANA Development Team"

__all__ = [
    # Core classes
    "MCPClient",
    "MCPManager",
    "MCPRegistry",

    # Data classes
    "ServerConfig",
    "ServerInstance",
    "ServerInfo",
    "ToolInfo",
    "ToolResponse",
    "ToolResult",
    "HealthStatus",
    "Capabilities",
    "PerformanceMetrics",

    # Enums
    "ConnectionStatus",
    "ServerStatus"
]
