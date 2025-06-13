"""
MCP Registry Implementation
Server and tool registry with capability indexing.

This module provides a registry system for tracking MCP servers, their capabilities,
tools, and performance metrics for intelligent routing and discovery.
"""

import logging
import time
from collections import defaultdict
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional, Set

logger = logging.getLogger(__name__)


class ServerStatus(Enum):
    """Server status enumeration"""

    UNKNOWN = "unknown"
    STARTING = "starting"
    RUNNING = "running"
    STOPPED = "stopped"
    ERROR = "error"


@dataclass
class ServerInfo:
    """Server information for registry"""

    name: str
    description: str
    capabilities: List[str]
    tools: List[str]
    status: ServerStatus
    endpoint: Optional[str] = None
    version: Optional[str] = None
    last_seen: Optional[float] = None
    tags: Set[str] = field(default_factory=set)


@dataclass
class Capabilities:
    """Server capabilities information"""

    tools: List[str]
    resources: List[str]
    prompts: List[str]
    sampling: bool = False
    roots: bool = False
    experimental: List[str] = field(default_factory=list)


@dataclass
class PerformanceMetrics:
    """Performance metrics for a server"""

    total_requests: int = 0
    successful_requests: int = 0
    failed_requests: int = 0
    average_response_time: float = 0.0
    last_request_time: Optional[float] = None
    uptime: float = 0.0
    error_rate: float = 0.0


class MCPRegistry:
    """Server and tool registry with capability indexing."""

    def __init__(self):
        """Initialize the registry."""
        self.servers: Dict[str, ServerInfo] = {}
        self.tool_index: Dict[str, List[str]] = defaultdict(list)  # tool_name -> [server_names]
        self.capability_index: Dict[str, List[str]] = defaultdict(list)  # capability -> [server_names]
        self.tag_index: Dict[str, List[str]] = defaultdict(list)  # tag -> [server_names]
        self.performance_metrics: Dict[str, PerformanceMetrics] = {}

    def register_server(self, server_info: ServerInfo) -> bool:
        """Register a new MCP server."""
        try:
            server_name = server_info.name

            # Update server info
            server_info.last_seen = time.time()
            self.servers[server_name] = server_info

            # Update tool index
            for tool_name in server_info.tools:
                if server_name not in self.tool_index[tool_name]:
                    self.tool_index[tool_name].append(server_name)

            # Update capability index
            for capability in server_info.capabilities:
                if server_name not in self.capability_index[capability]:
                    self.capability_index[capability].append(server_name)

            # Update tag index
            for tag in server_info.tags:
                if server_name not in self.tag_index[tag]:
                    self.tag_index[tag].append(server_name)

            # Initialize performance metrics if not exists
            if server_name not in self.performance_metrics:
                self.performance_metrics[server_name] = PerformanceMetrics()

            logger.info(f"Registered server: {server_name} with {len(server_info.tools)} tools")
            return True

        except Exception as e:
            logger.error(f"Failed to register server {server_info.name}: {e}")
            return False

    def unregister_server(self, server_name: str) -> bool:
        """Unregister an MCP server."""
        try:
            if server_name not in self.servers:
                logger.warning(f"Server not registered: {server_name}")
                return True

            server_info = self.servers[server_name]

            # Remove from tool index
            for tool_name in server_info.tools:
                if server_name in self.tool_index[tool_name]:
                    self.tool_index[tool_name].remove(server_name)
                    if not self.tool_index[tool_name]:
                        del self.tool_index[tool_name]

            # Remove from capability index
            for capability in server_info.capabilities:
                if server_name in self.capability_index[capability]:
                    self.capability_index[capability].remove(server_name)
                    if not self.capability_index[capability]:
                        del self.capability_index[capability]

            # Remove from tag index
            for tag in server_info.tags:
                if server_name in self.tag_index[tag]:
                    self.tag_index[tag].remove(server_name)
                    if not self.tag_index[tag]:
                        del self.tag_index[tag]

            # Remove server and metrics
            del self.servers[server_name]
            if server_name in self.performance_metrics:
                del self.performance_metrics[server_name]

            logger.info(f"Unregistered server: {server_name}")
            return True

        except Exception as e:
            logger.error(f"Failed to unregister server {server_name}: {e}")
            return False

    def find_tool(self, tool_name: str) -> List[ServerInfo]:
        """Find servers that provide a specific tool."""
        try:
            server_names = self.tool_index.get(tool_name, [])
            servers = []

            for server_name in server_names:
                if server_name in self.servers:
                    server_info = self.servers[server_name]
                    # Only include running servers
                    if server_info.status == ServerStatus.RUNNING:
                        servers.append(server_info)

            # Sort by performance (success rate and response time)
            servers.sort(key=lambda s: self._get_server_score(s.name), reverse=True)

            return servers

        except Exception as e:
            logger.error(f"Error finding tool {tool_name}: {e}")
            return []

    def find_by_capability(self, capability: str) -> List[ServerInfo]:
        """Find servers that provide a specific capability."""
        try:
            server_names = self.capability_index.get(capability, [])
            servers = []

            for server_name in server_names:
                if server_name in self.servers:
                    server_info = self.servers[server_name]
                    if server_info.status == ServerStatus.RUNNING:
                        servers.append(server_info)

            # Sort by performance
            servers.sort(key=lambda s: self._get_server_score(s.name), reverse=True)

            return servers

        except Exception as e:
            logger.error(f"Error finding capability {capability}: {e}")
            return []

    def find_by_tag(self, tag: str) -> List[ServerInfo]:
        """Find servers that have a specific tag."""
        try:
            server_names = self.tag_index.get(tag, [])
            servers = []

            for server_name in server_names:
                if server_name in self.servers:
                    server_info = self.servers[server_name]
                    if server_info.status == ServerStatus.RUNNING:
                        servers.append(server_info)

            return servers

        except Exception as e:
            logger.error(f"Error finding tag {tag}: {e}")
            return []

    def get_capabilities(self, server_name: str) -> Optional[Capabilities]:
        """Get server capabilities and tool list."""
        try:
            if server_name not in self.servers:
                return None

            server_info = self.servers[server_name]

            return Capabilities(
                tools=server_info.tools.copy(),
                resources=[],  # Would need to be populated from server discovery
                prompts=[],  # Would need to be populated from server discovery
                sampling="sampling" in server_info.capabilities,
                roots="roots" in server_info.capabilities,
                experimental=[cap for cap in server_info.capabilities if cap.startswith("experimental/")],
            )

        except Exception as e:
            logger.error(f"Error getting capabilities for {server_name}: {e}")
            return None

    def update_metrics(self, server_name: str, metrics: PerformanceMetrics) -> bool:
        """Update performance metrics for a server."""
        try:
            if server_name not in self.servers:
                logger.warning(f"Cannot update metrics for unregistered server: {server_name}")
                return False

            self.performance_metrics[server_name] = metrics

            # Update server last seen time
            self.servers[server_name].last_seen = time.time()

            return True

        except Exception as e:
            logger.error(f"Error updating metrics for {server_name}: {e}")
            return False

    def record_request(self, server_name: str, success: bool, response_time: float):
        """Record a request for performance tracking."""
        try:
            if server_name not in self.performance_metrics:
                self.performance_metrics[server_name] = PerformanceMetrics()

            metrics = self.performance_metrics[server_name]
            metrics.total_requests += 1
            metrics.last_request_time = time.time()

            if success:
                metrics.successful_requests += 1
            else:
                metrics.failed_requests += 1

            # Update average response time (exponential moving average)
            if metrics.average_response_time == 0:
                metrics.average_response_time = response_time
            else:
                alpha = 0.1  # Smoothing factor
                metrics.average_response_time = alpha * response_time + (1 - alpha) * metrics.average_response_time

            # Update error rate
            metrics.error_rate = metrics.failed_requests / metrics.total_requests

        except Exception as e:
            logger.error(f"Error recording request for {server_name}: {e}")

    def _get_server_score(self, server_name: str) -> float:
        """Calculate server performance score for ranking."""
        try:
            if server_name not in self.performance_metrics:
                return 0.0

            metrics = self.performance_metrics[server_name]

            if metrics.total_requests == 0:
                return 0.5  # Neutral score for new servers

            # Calculate score based on success rate and response time
            success_rate = metrics.successful_requests / metrics.total_requests

            # Normalize response time (lower is better)
            # Assume 1 second is good, 5 seconds is poor
            response_score = max(0, 1 - (metrics.average_response_time - 1) / 4)

            # Weighted combination
            score = 0.7 * success_rate + 0.3 * response_score

            return max(0, min(1, score))  # Clamp to [0, 1]

        except Exception as e:
            logger.error(f"Error calculating score for {server_name}: {e}")
            return 0.0

    def get_server_status(self, server_name: str) -> Optional[ServerStatus]:
        """Get current status of a server."""
        if server_name in self.servers:
            return self.servers[server_name].status
        return None

    def update_server_status(self, server_name: str, status: ServerStatus):
        """Update server status."""
        if server_name in self.servers:
            self.servers[server_name].status = status
            self.servers[server_name].last_seen = time.time()

    def get_all_tools(self) -> Dict[str, List[str]]:
        """Get all tools and their providing servers."""
        return dict(self.tool_index)

    def get_all_servers(self) -> Dict[str, ServerInfo]:
        """Get all registered servers."""
        return self.servers.copy()

    def get_server_metrics(self, server_name: str) -> Optional[PerformanceMetrics]:
        """Get performance metrics for a server."""
        return self.performance_metrics.get(server_name)

    def cleanup_stale_servers(self, max_age_seconds: int = 300):
        """Remove servers that haven't been seen recently."""
        try:
            current_time = time.time()
            stale_servers = []

            for server_name, server_info in self.servers.items():
                if server_info.last_seen and (current_time - server_info.last_seen) > max_age_seconds:
                    stale_servers.append(server_name)

            for server_name in stale_servers:
                logger.info(f"Removing stale server: {server_name}")
                self.unregister_server(server_name)

            return len(stale_servers)

        except Exception as e:
            logger.error(f"Error cleaning up stale servers: {e}")
            return 0
