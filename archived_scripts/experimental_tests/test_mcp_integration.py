"""
Test suite for VANA MCP Integration

Tests the MCP manager, clients, and server integrations including
GitHub, Brave Search, and Fetch capabilities.
"""

import pytest
import asyncio
import os
from unittest.mock import Mock, patch, AsyncMock

from lib.mcp.core.mcp_manager import MCPManager, MCPServerConfig
from lib.mcp.core.mcp_client import MCPClient, MCPResponse
from lib.mcp.core.mcp_registry import MCPRegistry
from lib.mcp.servers.github_server import GitHubMCPServer
from lib.mcp.servers.brave_search_server import BraveSearchMCPServer
from lib.mcp.servers.fetch_server import FetchMCPServer


class TestMCPRegistry:
    """Test MCP registry functionality."""
    
    def setup_method(self):
        """Set up test environment."""
        self.registry = MCPRegistry()
    
    def test_register_server(self):
        """Test server registration."""
        config = Mock()
        config.description = "Test server"
        config.capabilities = ["test_capability"]
        config.command = ["test", "command"]
        config.timeout = 30
        config.enabled = True
        
        self.registry.register_server("test_server", config, ["tool1", "tool2"])
        
        assert "test_server" in self.registry.servers
        server_info = self.registry.servers["test_server"]
        assert server_info.name == "test_server"
        assert server_info.description == "Test server"
        assert "test_capability" in server_info.capabilities
        assert len(server_info.tools) == 2
    
    def test_capability_index(self):
        """Test capability indexing."""
        config = Mock()
        config.description = "Test server"
        config.capabilities = ["search", "fetch"]
        config.command = ["test"]
        config.timeout = 30
        config.enabled = True
        
        self.registry.register_server("test_server", config)
        
        search_servers = self.registry.get_servers_by_capability("search")
        assert "test_server" in search_servers
        
        fetch_servers = self.registry.get_servers_by_capability("fetch")
        assert "test_server" in fetch_servers
    
    def test_tool_index(self):
        """Test tool indexing."""
        config = Mock()
        config.description = "Test server"
        config.capabilities = ["test"]
        config.command = ["test"]
        config.timeout = 30
        config.enabled = True
        
        self.registry.register_server("test_server", config, ["search", "fetch"])
        
        server = self.registry.find_tool_server("test_server.search")
        assert server == "test_server"
        
        server = self.registry.find_tool_server("search")
        assert server == "test_server"
    
    def test_unregister_server(self):
        """Test server unregistration."""
        config = Mock()
        config.description = "Test server"
        config.capabilities = ["test_capability"]
        config.command = ["test"]
        config.timeout = 30
        config.enabled = True
        
        self.registry.register_server("test_server", config, ["tool1"])
        assert "test_server" in self.registry.servers
        
        self.registry.unregister_server("test_server")
        assert "test_server" not in self.registry.servers
        assert len(self.registry.get_servers_by_capability("test_capability")) == 0


class TestMCPClient:
    """Test MCP client functionality."""
    
    def setup_method(self):
        """Set up test environment."""
        self.client = MCPClient(
            server_name="test_server",
            command=["echo", "test"],
            timeout=5
        )
    
    @pytest.mark.asyncio
    async def test_client_initialization(self):
        """Test client initialization."""
        assert self.client.server_name == "test_server"
        assert self.client.command == ["echo", "test"]
        assert self.client.timeout == 5
        assert not self.client.connected
    
    def test_get_next_id(self):
        """Test request ID generation."""
        id1 = self.client._get_next_id()
        id2 = self.client._get_next_id()
        assert id2 == id1 + 1
    
    def test_is_connected(self):
        """Test connection status check."""
        assert not self.client.is_connected()
        
        # Mock a connected state
        self.client.connected = True
        self.client.process = Mock()
        self.client.process.poll.return_value = None
        
        assert self.client.is_connected()


class TestMCPManager:
    """Test MCP manager functionality."""
    
    def setup_method(self):
        """Set up test environment."""
        # Create a temporary config for testing
        self.test_config = {
            "servers": {
                "test_server": {
                    "command": ["echo", "test"],
                    "args": [],
                    "env": {},
                    "enabled": True,
                    "timeout": 30,
                    "description": "Test server",
                    "capabilities": ["test"]
                }
            }
        }
    
    @pytest.mark.asyncio
    async def test_load_default_configs(self):
        """Test loading default configurations."""
        manager = MCPManager()
        await manager._load_default_configs()
        
        assert "github" in manager.server_configs
        assert "brave_search" in manager.server_configs
        assert "fetch" in manager.server_configs
        
        github_config = manager.server_configs["github"]
        assert github_config.name == "github"
        assert "repositories" in github_config.capabilities
    
    @patch('builtins.open')
    @patch('json.load')
    @pytest.mark.asyncio
    async def test_load_server_configs(self, mock_json_load, mock_open):
        """Test loading server configurations from file."""
        mock_json_load.return_value = self.test_config
        
        manager = MCPManager()
        await manager._load_server_configs()
        
        assert "test_server" in manager.server_configs
        config = manager.server_configs["test_server"]
        assert config.name == "test_server"
        assert config.enabled is True
    
    def test_get_server_status(self):
        """Test getting server status."""
        manager = MCPManager()
        manager.server_configs["test_server"] = MCPServerConfig(
            name="test_server",
            command=["test"],
            args=[],
            env={},
            enabled=True,
            description="Test server",
            capabilities=["test"]
        )
        
        status = manager.get_server_status()
        assert "test_server" in status
        assert status["test_server"]["enabled"] is True
        assert status["test_server"]["connected"] is False


class TestGitHubMCPServer:
    """Test GitHub MCP server integration."""
    
    def setup_method(self):
        """Set up test environment."""
        self.github_server = GitHubMCPServer()
    
    def test_initialization(self):
        """Test GitHub server initialization."""
        assert self.github_server.server_name == "github"
        assert self.github_server.client is None
    
    @pytest.mark.asyncio
    async def test_search_repositories_without_client(self):
        """Test repository search without initialized client."""
        with pytest.raises(RuntimeError, match="GitHub MCP server not initialized"):
            await self.github_server.search_repositories("python")
    
    @pytest.mark.asyncio
    async def test_get_repository_without_client(self):
        """Test get repository without initialized client."""
        with pytest.raises(RuntimeError, match="GitHub MCP server not initialized"):
            await self.github_server.get_repository("owner", "repo")


class TestBraveSearchMCPServer:
    """Test Brave Search MCP server integration."""
    
    def setup_method(self):
        """Set up test environment."""
        self.brave_server = BraveSearchMCPServer()
    
    def test_initialization(self):
        """Test Brave Search server initialization."""
        assert self.brave_server.server_name == "brave_search"
        assert self.brave_server.client is None
    
    @pytest.mark.asyncio
    async def test_web_search_without_client(self):
        """Test web search without initialized client."""
        with pytest.raises(RuntimeError, match="Brave Search MCP server not initialized"):
            await self.brave_server.web_search("test query")
    
    @pytest.mark.asyncio
    async def test_news_search_without_client(self):
        """Test news search without initialized client."""
        with pytest.raises(RuntimeError, match="Brave Search MCP server not initialized"):
            await self.brave_server.news_search("test news")


class TestFetchMCPServer:
    """Test Fetch MCP server integration."""
    
    def setup_method(self):
        """Set up test environment."""
        self.fetch_server = FetchMCPServer()
    
    def test_initialization(self):
        """Test Fetch server initialization."""
        assert self.fetch_server.server_name == "fetch"
        assert self.fetch_server.client is None
    
    @pytest.mark.asyncio
    async def test_fetch_url_without_client(self):
        """Test URL fetch without initialized client."""
        with pytest.raises(RuntimeError, match="Fetch MCP server not initialized"):
            await self.fetch_server.fetch_url("https://example.com")
    
    @pytest.mark.asyncio
    async def test_get_without_client(self):
        """Test GET request without initialized client."""
        with pytest.raises(RuntimeError, match="Fetch MCP server not initialized"):
            await self.fetch_server.get("https://example.com")
    
    @pytest.mark.asyncio
    async def test_post_without_client(self):
        """Test POST request without initialized client."""
        with pytest.raises(RuntimeError, match="Fetch MCP server not initialized"):
            await self.fetch_server.post("https://example.com", {"key": "value"})


class TestMCPIntegration:
    """Test MCP integration scenarios."""
    
    @pytest.mark.asyncio
    async def test_manager_context_manager(self):
        """Test MCP manager as context manager."""
        with patch.object(MCPManager, 'initialize') as mock_init, \
             patch.object(MCPManager, 'shutdown') as mock_shutdown:
            
            mock_init.return_value = None
            mock_shutdown.return_value = None
            
            async with MCPManager() as manager:
                assert manager is not None
            
            mock_init.assert_called_once()
            mock_shutdown.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_tool_discovery_flow(self):
        """Test tool discovery workflow."""
        manager = MCPManager()
        
        # Mock server configurations
        await manager._load_default_configs()
        
        # Test tool discovery without actual connections
        tools = manager.get_available_tools()
        assert isinstance(tools, dict)
    
    def test_server_config_creation(self):
        """Test server configuration creation."""
        config = MCPServerConfig(
            name="test",
            command=["test", "command"],
            args=["--arg"],
            env={"TEST": "value"},
            enabled=True,
            timeout=60,
            description="Test server",
            capabilities=["test_capability"]
        )
        
        assert config.name == "test"
        assert config.command == ["test", "command"]
        assert config.args == ["--arg"]
        assert config.env["TEST"] == "value"
        assert config.enabled is True
        assert config.timeout == 60
        assert "test_capability" in config.capabilities


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
