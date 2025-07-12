"""
Agent Discovery System for VANA

This module provides real agent discovery functionality to replace the stub implementations
in adk_tools.py. It discovers available agents, their capabilities, tools, and status.
"""

import logging
import os
import sys
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

# Add project root to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

logger = logging.getLogger(__name__)


@dataclass
class AgentCapability:
    """Represents an agent's capabilities and metadata."""

    name: str
    description: str
    tools: List[str]
    capabilities: List[str]
    status: str
    model: Optional[str] = None
    specialization: Optional[str] = None
    last_updated: Optional[str] = None
    response_time_ms: Optional[float] = None
    success_rate: Optional[float] = None


@dataclass
class ToolInfo:
    """Represents a tool's information."""

    name: str
    description: str
    parameters: Dict[str, Any]
    category: str


class AgentDiscoveryService:
    """Service for discovering and managing agent information."""

    def __init__(self, agents_dir: str):
        """Initialize the agent discovery service.

        Args:
            agents_dir: Directory containing agent modules
        """
        self.agents_dir = Path(agents_dir)
        self.project_root = Path(__file__).parent.parent.parent
        self._agent_cache: Dict[str, AgentCapability] = {}
        self._last_discovery: Optional[datetime] = None
        self._cache_ttl_seconds = 300  # 5 minutes

    def discover_agents(self, force_refresh: bool) -> Dict[str, AgentCapability]:
        """Discover all available agents and their capabilities.

        Args:
            force_refresh: Force refresh of agent cache

        Returns:
            Dictionary mapping agent names to their capabilities
        """
        # Check cache validity
        if not force_refresh and self._is_cache_valid():
            logger.debug("Using cached agent discovery results")
            return self._agent_cache

        logger.info("🔍 Starting agent discovery process...")
        discovered_agents = {}

        try:
            # Discover agents from agents directory
            agents_from_dir = self._discover_from_directory()
            discovered_agents.update(agents_from_dir)

            # Discover agents from team files
            agents_from_teams = self._discover_from_team_files()
            discovered_agents.update(agents_from_teams)

            # Update cache
            self._agent_cache = discovered_agents
            self._last_discovery = datetime.now()

            logger.info(f"✅ Discovered {len(discovered_agents)} agents: {list(discovered_agents.keys())}")

        except Exception as e:
            logger.error(f"❌ Agent discovery failed: {e}")
            # Return cached results if available
            if self._agent_cache:
                logger.warning("Returning cached agent discovery results due to error")
                return self._agent_cache
            # Return empty dict if no cache
            return {}

        return discovered_agents

    def _discover_from_directory(self) -> Dict[str, AgentCapability]:
        """Discover agents from the agents directory structure."""
        agents = {}

        if not self.agents_dir.exists():
            logger.warning(f"Agents directory not found: {self.agents_dir}")
            return agents

        # Scan agent directories
        for agent_path in self.agents_dir.iterdir():
            if agent_path.is_dir() and not agent_path.name.startswith("."):
                agent_info = self._analyze_agent_directory(agent_path)
                if agent_info:
                    agents[agent_info.name] = agent_info

        return agents

    def _discover_from_team_files(self) -> Dict[str, AgentCapability]:
        """Discover agents from team.py files."""
        agents = {}

        # Look for team.py files
        team_files = list(self.project_root.rglob("team.py"))

        for team_file in team_files:
            try:
                team_agents = self._analyze_team_file(team_file)
                agents.update(team_agents)
            except Exception as e:
                logger.warning(f"Failed to analyze team file {team_file}: {e}")

        return agents

    def _analyze_agent_directory(self, agent_path: Path) -> Optional[AgentCapability]:
        """Analyze an agent directory to extract capabilities."""
        try:
            agent_name = agent_path.name

            # Look for agent configuration files
            config_file = agent_path / "config" / "agent_config.yaml"
            specialist_file = agent_path / "specialist.py"
            agent_file = agent_path / "agent.py"

            # Extract information from available files
            description = f"{agent_name.replace('_', ' ').title()} Agent"
            tools = []
            capabilities = []
            model = None
            specialization = None

            # Try to load from config file
            if config_file.exists():
                config_info = self._parse_config_file(config_file)
                if config_info:
                    description = config_info.get("description", description)
                    capabilities.extend(config_info.get("capabilities", []))
                    model = config_info.get("model")
                    specialization = config_info.get("specialization")

            # Try to analyze Python files for tools
            for py_file in [specialist_file, agent_file]:
                if py_file.exists():
                    file_tools = self._extract_tools_from_file(py_file)
                    tools.extend(file_tools)

            # Remove duplicates
            tools = list(set(tools))
            capabilities = list(set(capabilities))

            return AgentCapability(
                name=agent_name,
                description=description,
                tools=tools,
                capabilities=capabilities,
                status="active",
                model=model,
                specialization=specialization,
                last_updated=datetime.now().isoformat(),
            )

        except Exception as e:
            logger.warning(f"Failed to analyze agent directory {agent_path}: {e}")
            return None

    def _analyze_team_file(self, team_file: Path) -> Dict[str, AgentCapability]:
        """Analyze a team.py file to extract agent information."""
        agents = {}

        try:
            # Read the file content
            with open(team_file, "r") as f:
                content = f.read()

            # Look for LlmAgent definitions
            if "LlmAgent" in content:
                # Extract agent name from team file path
                if "vana" in str(team_file):
                    agent_name = "vana"

                    # Extract basic info from VANA team file
                    tools = self._extract_tools_from_content(content)

                    agents[agent_name] = AgentCapability(
                        name=agent_name,
                        description="Main orchestration agent for task coordination and delegation",
                        tools=tools,
                        capabilities=[
                            "orchestration",
                            "delegation",
                            "memory_management",
                            "task_coordination",
                        ],
                        status="active",
                        model="gemini-2.0-flash-exp",
                        specialization="orchestration",
                        last_updated=datetime.now().isoformat(),
                    )

        except Exception as e:
            logger.warning(f"Failed to analyze team file {team_file}: {e}")

        return agents

    def _extract_tools_from_file(self, file_path: Path) -> List[str]:
        """Extract tool names from a Python file."""
        tools = []

        try:
            with open(file_path, "r") as f:
                content = f.read()

            tools = self._extract_tools_from_content(content)

        except Exception as e:
            logger.warning(f"Failed to extract tools from {file_path}: {e}")

        return tools

    def _extract_tools_from_content(self, content: str) -> List[str]:
        """Extract tool names from file content."""
        tools = []

        # Look for tool imports and definitions
        import_patterns = [
            "adk_echo",
            "adk_read_file",
            "adk_write_file",
            "adk_list_directory",
            "adk_vector_search",
            "adk_web_search",
            "adk_search_knowledge",
            "adk_coordinate_task",
            "adk_delegate_to_agent",
            "adk_get_agent_status",
            "execute_code",
            "validate_code_security",
            "get_execution_history",
        ]

        for pattern in import_patterns:
            if pattern in content:
                # Convert adk_ prefix to readable names
                tool_name = pattern.replace("adk_", "").replace("_", " ").title()
                tools.append(tool_name)

        return tools

    def _parse_config_file(self, config_file: Path) -> Optional[Dict[str, Any]]:
        """Parse agent configuration file."""
        try:
            import yaml

            with open(config_file, "r") as f:
                config = yaml.safe_load(f)

            # Extract relevant information
            agent_info = config.get("agent", {})
            capabilities_info = config.get("capabilities", {})

            result = {
                "description": agent_info.get("description", ""),
                "model": agent_info.get("model"),
                "specialization": agent_info.get("specialization"),
                "capabilities": [],
            }

            # Extract capabilities from various sections
            if isinstance(capabilities_info, dict):
                for key, value in capabilities_info.items():
                    if isinstance(value, list):
                        result["capabilities"].extend(value)
                    elif isinstance(value, str):
                        result["capabilities"].append(value)

            return result

        except Exception as e:
            logger.warning(f"Failed to parse config file {config_file}: {e}")
            return None

    def _is_cache_valid(self) -> bool:
        """Check if the agent cache is still valid."""
        if not self._last_discovery or not self._agent_cache:
            return False

        elapsed = (datetime.now() - self._last_discovery).total_seconds()
        return elapsed < self._cache_ttl_seconds

    def get_agent_info(self, agent_name: str) -> Optional[AgentCapability]:
        """Get detailed information about a specific agent.

        Args:
            agent_name: Name of the agent

        Returns:
            Agent capability information or None if not found
        """
        agents = self.discover_agents()
        return agents.get(agent_name)

    def get_agents_by_capability(self, capability: str) -> List[AgentCapability]:
        """Get agents that have a specific capability.

        Args:
            capability: Capability to search for

        Returns:
            List of agents with the specified capability
        """
        agents = self.discover_agents()
        matching_agents = []

        for agent in agents.values():
            if capability.lower() in [cap.lower() for cap in agent.capabilities]:
                matching_agents.append(agent)

        return matching_agents

    def get_discovery_summary(self) -> Dict[str, Any]:
        """Get a summary of the discovery process.

        Returns:
            Summary information about discovered agents
        """
        agents = self.discover_agents()

        return {
            "total_agents": len(agents),
            "agent_names": list(agents.keys()),
            "last_discovery": self._last_discovery.isoformat() if self._last_discovery else None,
            "cache_valid": self._is_cache_valid(),
            "discovery_status": "success" if agents else "no_agents_found",
        }


# Global instance for easy access
_discovery_service = None


def get_discovery_service() -> AgentDiscoveryService:
    """Get the global agent discovery service instance."""
    global _discovery_service
    if _discovery_service is None:
        _discovery_service = AgentDiscoveryService()
    return _discovery_service
