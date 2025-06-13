"""
Tests for MCP Manager functionality.
"""

import pytest
import asyncio
import json
import tempfile
from pathlib import Path
from unittest.mock import Mock, AsyncMock, patch

from lib.mcp.core.mcp_manager import MCPManager, ServerInstance, HealthStatus, ToolResult
from lib.mcp.core.mcp_client import MCPClient, ServerConfig, ConnectionStatus


@pytest.fixture
def temp_config_file():
    """Create a temporary configuration file for testing."""
    config_data = {
        "test_server": {
            "enabled": True,
            "command": ["python", "-m", "test_server"],
            "args": ["--test"],
            "env": {"TEST_VAR": "test_value"},
            "timeout": 30,
            "retry_attempts": 3,
            "retry_delay": 1
        },
        "disabled_server": {
            "enabled": False,
            "command": ["python", "-m", "disabled_server"]
        }
    }
    
    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
        json.dump(config_data, f)
        temp_path = f.name
    
    yield temp_path
    
    # Cleanup
    Path(temp_path).unlink()


@pytest.fixture
def mcp_manager(temp_config_file):
    """Create an MCP Manager instance for testing."""
    return MCPManager(temp_config_file)


@pytest.fixture
def mock_client():
    """Create a mock MCP client."""
    client = Mock(spec=MCPClient)
    client.connect = AsyncMock(return_value=True)
    client.disconnect = AsyncMock(return_value=True)
    client.list_tools = AsyncMock(return_value=[])
    client.health_check = AsyncMock(return_value=True)
    client.status = ConnectionStatus.CONNECTED
    return client


class TestMCPManager:
    """Test cases for MCP Manager."""
    
    def test_load_configuration(self, mcp_manager):
        """Test configuration loading."""
        assert "test_server" in mcp_manager.server_configs
        assert "disabled_server" not in mcp_manager.server_configs
        
        config = mcp_manager.server_configs["test_server"]
        assert config.name == "test_server"
        assert config.command == ["python", "-m", "test_server"]
        assert config.args == ["--test"]
        assert config.env == {"TEST_VAR": "test_value"}
    
    @pytest.mark.asyncio
    async def test_start_server_success(self, mcp_manager, mock_client):
        """Test successful server startup."""
        with patch('lib.mcp.core.mcp_manager.MCPClient', return_value=mock_client):
            instance = await mcp_manager.start_server("test_server")
            
            assert isinstance(instance, ServerInstance)
            assert instance.name == "test_server"
            assert instance.status == ConnectionStatus.CONNECTED
            assert "test_server" in mcp_manager.servers
            
            # Verify client methods were called
            mock_client.connect.assert_called_once()
            mock_client.list_tools.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_start_server_connection_failure(self, mcp_manager, mock_client):
        """Test server startup with connection failure."""
        mock_client.connect.return_value = False
        
        with patch('lib.mcp.core.mcp_manager.MCPClient', return_value=mock_client):
            with pytest.raises(RuntimeError, match="Failed to connect"):
                await mcp_manager.start_server("test_server")
    
    @pytest.mark.asyncio
    async def test_start_server_invalid_name(self, mcp_manager):
        """Test starting server with invalid name."""
        with pytest.raises(ValueError, match="No configuration found"):
            await mcp_manager.start_server("nonexistent_server")
    
    @pytest.mark.asyncio
    async def test_start_server_already_running(self, mcp_manager, mock_client):
        """Test starting server that's already running."""
        with patch('lib.mcp.core.mcp_manager.MCPClient', return_value=mock_client):
            # Start server first time
            instance1 = await mcp_manager.start_server("test_server")
            
            # Try to start again
            instance2 = await mcp_manager.start_server("test_server")
            
            # Should return the same instance
            assert instance1 is instance2
    
    @pytest.mark.asyncio
    async def test_stop_server_success(self, mcp_manager, mock_client):
        """Test successful server shutdown."""
        with patch('lib.mcp.core.mcp_manager.MCPClient', return_value=mock_client):
            # Start server
            await mcp_manager.start_server("test_server")
            assert "test_server" in mcp_manager.servers
            
            # Stop server
            result = await mcp_manager.stop_server("test_server")
            
            assert result is True
            assert "test_server" not in mcp_manager.servers
            mock_client.disconnect.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_stop_server_not_running(self, mcp_manager):
        """Test stopping server that's not running."""
        result = await mcp_manager.stop_server("test_server")
        assert result is True  # Should succeed silently
    
    @pytest.mark.asyncio
    async def test_discover_tools(self, mcp_manager, mock_client):
        """Test tool discovery."""
        from lib.mcp.core.mcp_client import ToolInfo
        
        mock_tools = [
            ToolInfo("tool1", "Description 1", {"type": "object"}),
            ToolInfo("tool2", "Description 2", {"type": "object"})
        ]
        mock_client.list_tools.return_value = mock_tools
        
        with patch('lib.mcp.core.mcp_manager.MCPClient', return_value=mock_client):
            await mcp_manager.start_server("test_server")
            
            tools = await mcp_manager.discover_tools("test_server")
            
            assert len(tools) == 2
            assert tools[0].name == "tool1"
            assert tools[1].name == "tool2"
            
            # Check that tools were cached in instance
            instance = mcp_manager.servers["test_server"]
            assert len(instance.tools) == 2
    
    @pytest.mark.asyncio
    async def test_discover_tools_server_not_running(self, mcp_manager):
        """Test tool discovery on non-running server."""
        with pytest.raises(ValueError, match="Server not running"):
            await mcp_manager.discover_tools("test_server")
    
    @pytest.mark.asyncio
    async def test_execute_tool_success(self, mcp_manager, mock_client):
        """Test successful tool execution."""
        from lib.mcp.core.mcp_client import ToolInfo, ToolResponse
        
        # Setup mock tools and response
        mock_tools = [ToolInfo("test_tool", "Test tool", {"type": "object"})]
        mock_response = ToolResponse([{"type": "text", "text": "Success"}], False)
        
        mock_client.list_tools.return_value = mock_tools
        mock_client.call_tool.return_value = mock_response
        
        with patch('lib.mcp.core.mcp_manager.MCPClient', return_value=mock_client):
            await mcp_manager.start_server("test_server")
            
            result = await mcp_manager.execute_tool("test_server", "test_tool", {"param": "value"})
            
            assert isinstance(result, ToolResult)
            assert result.success is True
            assert result.server_name == "test_server"
            assert len(result.content) == 1
            assert result.content[0]["text"] == "Success"
            
            mock_client.call_tool.assert_called_once_with("test_tool", {"param": "value"})
    
    @pytest.mark.asyncio
    async def test_execute_tool_not_found(self, mcp_manager, mock_client):
        """Test tool execution with non-existent tool."""
        mock_client.list_tools.return_value = []
        
        with patch('lib.mcp.core.mcp_manager.MCPClient', return_value=mock_client):
            await mcp_manager.start_server("test_server")
            
            result = await mcp_manager.execute_tool("test_server", "nonexistent_tool", {})
            
            assert result.success is False
            assert "Tool not found" in result.error_message
    
    @pytest.mark.asyncio
    async def test_execute_tool_server_not_running(self, mcp_manager):
        """Test tool execution on non-running server."""
        result = await mcp_manager.execute_tool("test_server", "test_tool", {})
        
        assert result.success is False
        assert "Server not running" in result.error_message
    
    @pytest.mark.asyncio
    async def test_get_server_health(self, mcp_manager, mock_client):
        """Test server health check."""
        with patch('lib.mcp.core.mcp_manager.MCPClient', return_value=mock_client):
            await mcp_manager.start_server("test_server")
            
            health = await mcp_manager.get_server_health("test_server")
            
            assert isinstance(health, HealthStatus)
            assert health.is_healthy is True
            assert health.error_count == 0
            assert health.uptime is not None
            assert health.status_message == "Healthy"
            
            mock_client.health_check.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_get_server_health_not_running(self, mcp_manager):
        """Test health check on non-running server."""
        health = await mcp_manager.get_server_health("test_server")
        
        assert health.is_healthy is False
        assert health.status_message == "Server not running"
    
    @pytest.mark.asyncio
    async def test_restart_server(self, mcp_manager, mock_client):
        """Test server restart."""
        with patch('lib.mcp.core.mcp_manager.MCPClient', return_value=mock_client):
            # Start server first
            await mcp_manager.start_server("test_server")
            original_instance = mcp_manager.servers["test_server"]
            
            # Restart server
            result = await mcp_manager.restart_server("test_server")
            
            assert result is True
            assert "test_server" in mcp_manager.servers
            
            # Should be a new instance
            new_instance = mcp_manager.servers["test_server"]
            assert new_instance is not original_instance
    
    def test_get_all_servers(self, mcp_manager):
        """Test getting all server instances."""
        servers = mcp_manager.get_all_servers()
        assert isinstance(servers, dict)
        assert len(servers) == 0  # No servers started yet
    
    def test_get_all_tools(self, mcp_manager):
        """Test getting all tools from all servers."""
        tools = mcp_manager.get_all_tools()
        assert isinstance(tools, dict)
        assert len(tools) == 0  # No servers started yet
    
    @pytest.mark.asyncio
    async def test_shutdown(self, mcp_manager, mock_client):
        """Test manager shutdown."""
        with patch('lib.mcp.core.mcp_manager.MCPClient', return_value=mock_client):
            # Start a server
            await mcp_manager.start_server("test_server")
            assert len(mcp_manager.servers) == 1
            
            # Shutdown
            await mcp_manager.shutdown()
            
            assert len(mcp_manager.servers) == 0
            assert mcp_manager.health_check_task is None
