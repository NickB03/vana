"""
Integration tests for MCP system.
"""

import pytest
import asyncio
import json
import tempfile
from pathlib import Path
from unittest.mock import Mock, AsyncMock, patch

from lib.mcp.core.mcp_manager import MCPManager
from lib.mcp.core.mcp_registry import MCPRegistry, ServerInfo, ServerStatus
from lib.mcp.core.mcp_client import ServerConfig


@pytest.fixture
def integration_config():
    """Create integration test configuration."""
    config_data = {
        "github": {
            "enabled": True,
            "command": ["python", "-m", "mock_github_server"],
            "args": [],
            "env": {"GITHUB_TOKEN": "test_token"},
            "timeout": 30,
            "retry_attempts": 3,
            "retry_delay": 1
        },
        "brave_search": {
            "enabled": True,
            "command": ["python", "-m", "mock_brave_server"],
            "args": [],
            "env": {"BRAVE_API_KEY": "test_key"},
            "timeout": 15,
            "retry_attempts": 3,
            "retry_delay": 1
        },
        "fetch": {
            "enabled": True,
            "command": ["python", "-m", "mock_fetch_server"],
            "args": [],
            "env": {},
            "timeout": 30,
            "retry_attempts": 3,
            "retry_delay": 1
        }
    }
    
    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
        json.dump(config_data, f)
        temp_path = f.name
    
    yield temp_path
    
    # Cleanup
    Path(temp_path).unlink()


@pytest.fixture
def mcp_manager(integration_config):
    """Create MCP Manager for integration testing."""
    return MCPManager(integration_config)


@pytest.fixture
def mcp_registry():
    """Create MCP Registry for integration testing."""
    return MCPRegistry()


class TestMCPIntegration:
    """Integration test cases for MCP system."""
    
    @pytest.mark.asyncio
    async def test_full_system_startup_and_shutdown(self, mcp_manager):
        """Test complete system startup and shutdown."""
        # Mock successful connections for all servers
        mock_clients = {}
        
        def create_mock_client(config):
            client = Mock()
            client.connect = AsyncMock(return_value=True)
            client.disconnect = AsyncMock(return_value=True)
            client.list_tools = AsyncMock(return_value=[])
            client.health_check = AsyncMock(return_value=True)
            client.status = "connected"
            mock_clients[config.name] = client
            return client
        
        with patch('lib.mcp.core.mcp_manager.MCPClient', side_effect=create_mock_client):
            # Start all servers
            github_instance = await mcp_manager.start_server("github")
            brave_instance = await mcp_manager.start_server("brave_search")
            fetch_instance = await mcp_manager.start_server("fetch")
            
            # Verify all servers are running
            assert len(mcp_manager.servers) == 3
            assert "github" in mcp_manager.servers
            assert "brave_search" in mcp_manager.servers
            assert "fetch" in mcp_manager.servers
            
            # Test health checks
            github_health = await mcp_manager.get_server_health("github")
            brave_health = await mcp_manager.get_server_health("brave_search")
            fetch_health = await mcp_manager.get_server_health("fetch")
            
            assert github_health.is_healthy
            assert brave_health.is_healthy
            assert fetch_health.is_healthy
            
            # Shutdown system
            await mcp_manager.shutdown()
            
            # Verify all servers stopped
            assert len(mcp_manager.servers) == 0
            
            # Verify disconnect was called for all clients
            for client in mock_clients.values():
                client.disconnect.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_tool_discovery_across_servers(self, mcp_manager):
        """Test tool discovery across multiple servers."""
        from lib.mcp.core.mcp_client import ToolInfo
        
        # Mock tools for each server
        github_tools = [
            ToolInfo("create_repository", "Create a new repository", {}),
            ToolInfo("create_issue", "Create a new issue", {}),
            ToolInfo("search_code", "Search code in repositories", {})
        ]
        
        brave_tools = [
            ToolInfo("web_search", "Search the web", {}),
            ToolInfo("news_search", "Search news articles", {}),
            ToolInfo("image_search", "Search images", {})
        ]
        
        fetch_tools = [
            ToolInfo("http_get", "Perform HTTP GET request", {}),
            ToolInfo("scrape_content", "Scrape web content", {}),
            ToolInfo("download_file", "Download a file", {})
        ]
        
        def create_mock_client(config):
            client = Mock()
            client.connect = AsyncMock(return_value=True)
            client.disconnect = AsyncMock(return_value=True)
            client.health_check = AsyncMock(return_value=True)
            client.status = "connected"
            
            # Return different tools based on server
            if config.name == "github":
                client.list_tools = AsyncMock(return_value=github_tools)
            elif config.name == "brave_search":
                client.list_tools = AsyncMock(return_value=brave_tools)
            elif config.name == "fetch":
                client.list_tools = AsyncMock(return_value=fetch_tools)
            else:
                client.list_tools = AsyncMock(return_value=[])
            
            return client
        
        with patch('lib.mcp.core.mcp_manager.MCPClient', side_effect=create_mock_client):
            # Start servers
            await mcp_manager.start_server("github")
            await mcp_manager.start_server("brave_search")
            await mcp_manager.start_server("fetch")
            
            # Get all tools
            all_tools = mcp_manager.get_all_tools()
            
            # Verify tools from all servers
            assert len(all_tools) == 3
            assert len(all_tools["github"]) == 3
            assert len(all_tools["brave_search"]) == 3
            assert len(all_tools["fetch"]) == 3
            
            # Verify specific tools exist
            github_tool_names = [tool.name for tool in all_tools["github"]]
            assert "create_repository" in github_tool_names
            assert "create_issue" in github_tool_names
            assert "search_code" in github_tool_names
            
            brave_tool_names = [tool.name for tool in all_tools["brave_search"]]
            assert "web_search" in brave_tool_names
            assert "news_search" in brave_tool_names
            assert "image_search" in brave_tool_names
            
            fetch_tool_names = [tool.name for tool in all_tools["fetch"]]
            assert "http_get" in fetch_tool_names
            assert "scrape_content" in fetch_tool_names
            assert "download_file" in fetch_tool_names
    
    @pytest.mark.asyncio
    async def test_tool_execution_workflow(self, mcp_manager):
        """Test complete tool execution workflow."""
        from lib.mcp.core.mcp_client import ToolInfo, ToolResponse
        
        # Mock tool and response
        test_tool = ToolInfo("web_search", "Search the web", {})
        test_response = ToolResponse([{"type": "text", "text": "Search results"}], False)
        
        def create_mock_client(config):
            client = Mock()
            client.connect = AsyncMock(return_value=True)
            client.disconnect = AsyncMock(return_value=True)
            client.list_tools = AsyncMock(return_value=[test_tool])
            client.call_tool = AsyncMock(return_value=test_response)
            client.health_check = AsyncMock(return_value=True)
            client.status = "connected"
            return client
        
        with patch('lib.mcp.core.mcp_manager.MCPClient', side_effect=create_mock_client):
            # Start server
            await mcp_manager.start_server("brave_search")
            
            # Execute tool
            result = await mcp_manager.execute_tool(
                "brave_search", 
                "web_search", 
                {"query": "test query"}
            )
            
            # Verify execution
            assert result.success is True
            assert result.server_name == "brave_search"
            assert len(result.content) == 1
            assert result.content[0]["text"] == "Search results"
            assert result.execution_time > 0
    
    @pytest.mark.asyncio
    async def test_server_failure_and_recovery(self, mcp_manager):
        """Test server failure handling and recovery."""
        # Mock client that fails initially then succeeds
        connection_attempts = 0
        
        def create_mock_client(config):
            nonlocal connection_attempts
            client = Mock()
            client.disconnect = AsyncMock(return_value=True)
            client.list_tools = AsyncMock(return_value=[])
            client.health_check = AsyncMock(return_value=True)
            client.status = "connected"
            
            # Fail first connection attempt, succeed on second
            async def mock_connect():
                nonlocal connection_attempts
                connection_attempts += 1
                return connection_attempts > 1
            
            client.connect = mock_connect
            return client
        
        with patch('lib.mcp.core.mcp_manager.MCPClient', side_effect=create_mock_client):
            # First attempt should fail
            with pytest.raises(RuntimeError, match="Failed to connect"):
                await mcp_manager.start_server("github")
            
            # Restart should succeed
            result = await mcp_manager.restart_server("github")
            assert result is True
            assert "github" in mcp_manager.servers
    
    def test_registry_integration(self, mcp_registry):
        """Test registry integration with server management."""
        # Register servers
        github_server = ServerInfo(
            name="github",
            description="GitHub API integration",
            capabilities=["repositories", "issues", "pull_requests"],
            tools=["create_repository", "create_issue", "search_code"],
            status=ServerStatus.RUNNING,
            tags={"development", "version_control"}
        )
        
        brave_server = ServerInfo(
            name="brave_search",
            description="Brave Search API integration",
            capabilities=["web_search", "news_search", "image_search"],
            tools=["web_search", "news_search", "image_search"],
            status=ServerStatus.RUNNING,
            tags={"search", "web"}
        )
        
        # Register servers
        assert mcp_registry.register_server(github_server)
        assert mcp_registry.register_server(brave_server)
        
        # Test tool discovery
        repo_servers = mcp_registry.find_tool("create_repository")
        assert len(repo_servers) == 1
        assert repo_servers[0].name == "github"
        
        search_servers = mcp_registry.find_tool("web_search")
        assert len(search_servers) == 1
        assert search_servers[0].name == "brave_search"
        
        # Test capability discovery
        dev_servers = mcp_registry.find_by_capability("repositories")
        assert len(dev_servers) == 1
        assert dev_servers[0].name == "github"
        
        # Test tag discovery
        search_tagged = mcp_registry.find_by_tag("search")
        assert len(search_tagged) == 1
        assert search_tagged[0].name == "brave_search"
    
    @pytest.mark.asyncio
    async def test_concurrent_operations(self, mcp_manager):
        """Test concurrent operations across multiple servers."""
        from lib.mcp.core.mcp_client import ToolInfo, ToolResponse
        
        # Mock tools and responses
        tools = [ToolInfo("test_tool", "Test tool", {})]
        response = ToolResponse([{"type": "text", "text": "Success"}], False)
        
        def create_mock_client(config):
            client = Mock()
            client.connect = AsyncMock(return_value=True)
            client.disconnect = AsyncMock(return_value=True)
            client.list_tools = AsyncMock(return_value=tools)
            client.call_tool = AsyncMock(return_value=response)
            client.health_check = AsyncMock(return_value=True)
            client.status = "connected"
            return client
        
        with patch('lib.mcp.core.mcp_manager.MCPClient', side_effect=create_mock_client):
            # Start multiple servers
            await asyncio.gather(
                mcp_manager.start_server("github"),
                mcp_manager.start_server("brave_search"),
                mcp_manager.start_server("fetch")
            )
            
            # Execute tools concurrently
            results = await asyncio.gather(
                mcp_manager.execute_tool("github", "test_tool", {}),
                mcp_manager.execute_tool("brave_search", "test_tool", {}),
                mcp_manager.execute_tool("fetch", "test_tool", {})
            )
            
            # Verify all executions succeeded
            assert len(results) == 3
            for result in results:
                assert result.success is True
                assert result.content[0]["text"] == "Success"
    
    @pytest.mark.asyncio
    async def test_error_propagation(self, mcp_manager):
        """Test error propagation through the system."""
        from lib.mcp.core.mcp_client import ToolInfo, ToolResponse
        
        # Mock tool that returns error
        tools = [ToolInfo("error_tool", "Tool that errors", {})]
        error_response = ToolResponse([{"type": "text", "text": "Tool failed"}], True)
        
        def create_mock_client(config):
            client = Mock()
            client.connect = AsyncMock(return_value=True)
            client.disconnect = AsyncMock(return_value=True)
            client.list_tools = AsyncMock(return_value=tools)
            client.call_tool = AsyncMock(return_value=error_response)
            client.health_check = AsyncMock(return_value=True)
            client.status = "connected"
            return client
        
        with patch('lib.mcp.core.mcp_manager.MCPClient', side_effect=create_mock_client):
            await mcp_manager.start_server("github")
            
            # Execute tool that errors
            result = await mcp_manager.execute_tool("github", "error_tool", {})
            
            # Verify error is properly propagated
            assert result.success is False
            assert result.error_message == "Tool execution failed"
            assert result.content[0]["text"] == "Tool failed"
            
            # Verify error count is tracked
            instance = mcp_manager.servers["github"]
            assert instance.error_count == 1
