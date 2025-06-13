"""
Tests for MCP Client functionality.
"""

import pytest
import asyncio
import json
from unittest.mock import Mock, AsyncMock, patch

from lib.mcp.core.mcp_client import MCPClient, ServerConfig, ToolInfo, ToolResponse, Response, ConnectionStatus


@pytest.fixture
def server_config():
    """Create a test server configuration."""
    return ServerConfig(
        name="test_server",
        command=["python", "-m", "test_server"],
        args=["--test"],
        env={"TEST_VAR": "test_value"},
        timeout=30,
        retry_attempts=3,
        retry_delay=1
    )


@pytest.fixture
def mcp_client(server_config):
    """Create an MCP Client instance for testing."""
    return MCPClient(server_config)


@pytest.fixture
def mock_process():
    """Create a mock subprocess for testing."""
    process = Mock()
    process.stdin = Mock()
    process.stdout = Mock()
    process.stderr = Mock()
    process.wait = AsyncMock(return_value=0)
    process.terminate = Mock()
    process.kill = Mock()
    
    # Mock stdin methods
    process.stdin.write = Mock()
    process.stdin.drain = AsyncMock()
    process.stdin.is_closing = Mock(return_value=False)
    
    # Mock stdout methods
    process.stdout.readline = AsyncMock()
    
    return process


class TestMCPClient:
    """Test cases for MCP Client."""
    
    def test_initialization(self, mcp_client, server_config):
        """Test client initialization."""
        assert mcp_client.config == server_config
        assert mcp_client.status == ConnectionStatus.DISCONNECTED
        assert mcp_client.process is None
        assert mcp_client.request_id == 0
    
    @pytest.mark.asyncio
    async def test_connect_success(self, mcp_client, mock_process):
        """Test successful connection."""
        # Mock successful initialization response
        init_response = {
            "jsonrpc": "2.0",
            "id": 1,
            "result": {
                "protocolVersion": "2024-11-05",
                "capabilities": {},
                "serverInfo": {"name": "test_server", "version": "1.0.0"}
            }
        }
        
        mock_process.stdout.readline.return_value = (json.dumps(init_response) + "\n").encode()
        
        with patch('asyncio.create_subprocess_exec', return_value=mock_process):
            result = await mcp_client.connect()
            
            assert result is True
            assert mcp_client.status == ConnectionStatus.CONNECTED
            assert mcp_client.process == mock_process
            
            # Verify initialization request was sent
            assert mock_process.stdin.write.call_count >= 2  # init + initialized notification
    
    @pytest.mark.asyncio
    async def test_connect_initialization_failure(self, mcp_client, mock_process):
        """Test connection with initialization failure."""
        # Mock error response
        error_response = {
            "jsonrpc": "2.0",
            "id": 1,
            "error": {"code": -1, "message": "Initialization failed"}
        }
        
        mock_process.stdout.readline.return_value = (json.dumps(error_response) + "\n").encode()
        
        with patch('asyncio.create_subprocess_exec', return_value=mock_process):
            result = await mcp_client.connect()
            
            assert result is False
            assert mcp_client.status == ConnectionStatus.ERROR
    
    @pytest.mark.asyncio
    async def test_connect_process_creation_failure(self, mcp_client):
        """Test connection with process creation failure."""
        with patch('asyncio.create_subprocess_exec', side_effect=Exception("Process creation failed")):
            result = await mcp_client.connect()
            
            assert result is False
            assert mcp_client.status == ConnectionStatus.ERROR
    
    @pytest.mark.asyncio
    async def test_disconnect_success(self, mcp_client, mock_process):
        """Test successful disconnection."""
        # Set up connected state
        mcp_client.process = mock_process
        mcp_client.status = ConnectionStatus.CONNECTED
        
        result = await mcp_client.disconnect()
        
        assert result is True
        assert mcp_client.status == ConnectionStatus.DISCONNECTED
        assert mcp_client.process is None
        
        mock_process.terminate.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_disconnect_with_force_kill(self, mcp_client, mock_process):
        """Test disconnection with force kill after timeout."""
        # Mock process that doesn't terminate gracefully
        mock_process.wait.side_effect = asyncio.TimeoutError()
        
        mcp_client.process = mock_process
        mcp_client.status = ConnectionStatus.CONNECTED
        
        result = await mcp_client.disconnect()
        
        assert result is True
        mock_process.terminate.assert_called_once()
        mock_process.kill.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_send_request_success(self, mcp_client, mock_process):
        """Test successful request sending."""
        # Setup connected state
        mcp_client.process = mock_process
        mcp_client.status = ConnectionStatus.CONNECTED
        
        # Mock successful response
        response_data = {
            "jsonrpc": "2.0",
            "id": 1,
            "result": {"status": "success", "data": "test"}
        }
        mock_process.stdout.readline.return_value = (json.dumps(response_data) + "\n").encode()
        
        response = await mcp_client.send_request("test_method", {"param": "value"})
        
        assert isinstance(response, Response)
        assert response.id == 1
        assert response.result == {"status": "success", "data": "test"}
        assert response.error is None
    
    @pytest.mark.asyncio
    async def test_send_request_with_error(self, mcp_client, mock_process):
        """Test request with error response."""
        mcp_client.process = mock_process
        mcp_client.status = ConnectionStatus.CONNECTED
        
        # Mock error response
        response_data = {
            "jsonrpc": "2.0",
            "id": 1,
            "error": {"code": -1, "message": "Method not found"}
        }
        mock_process.stdout.readline.return_value = (json.dumps(response_data) + "\n").encode()
        
        response = await mcp_client.send_request("invalid_method", {})
        
        assert response.error == {"code": -1, "message": "Method not found"}
        assert response.result is None
    
    @pytest.mark.asyncio
    async def test_send_request_timeout(self, mcp_client, mock_process):
        """Test request timeout."""
        mcp_client.process = mock_process
        mcp_client.status = ConnectionStatus.CONNECTED
        
        # Mock timeout
        mock_process.stdout.readline.side_effect = asyncio.TimeoutError()
        
        response = await mcp_client.send_request("test_method", {}, timeout=1)
        
        assert response.error is not None
        assert "timeout" in response.error["message"].lower()
    
    @pytest.mark.asyncio
    async def test_send_request_not_connected(self, mcp_client):
        """Test request when not connected."""
        # Mock failed connection attempt
        with patch.object(mcp_client, 'connect', return_value=False):
            response = await mcp_client.send_request("test_method", {})
            
            assert response.error is not None
            assert response.error["message"] == "Not connected"
    
    @pytest.mark.asyncio
    async def test_send_request_with_retry(self, mcp_client, mock_process):
        """Test request with retry on failure."""
        mcp_client.process = mock_process
        mcp_client.status = ConnectionStatus.CONNECTED
        mcp_client.config.retry_attempts = 2
        
        # First call fails, second succeeds
        error_response = {
            "jsonrpc": "2.0",
            "id": 1,
            "error": {"code": -1, "message": "Temporary error"}
        }
        success_response = {
            "jsonrpc": "2.0", 
            "id": 2,
            "result": {"status": "success"}
        }
        
        mock_process.stdout.readline.side_effect = [
            (json.dumps(error_response) + "\n").encode(),
            (json.dumps(success_response) + "\n").encode()
        ]
        
        response = await mcp_client.send_request("test_method", {})
        
        assert response.result == {"status": "success"}
        assert response.error is None
    
    @pytest.mark.asyncio
    async def test_list_tools(self, mcp_client, mock_process):
        """Test tool listing."""
        mcp_client.process = mock_process
        mcp_client.status = ConnectionStatus.CONNECTED
        
        # Mock tools response
        tools_response = {
            "jsonrpc": "2.0",
            "id": 1,
            "result": {
                "tools": [
                    {
                        "name": "tool1",
                        "description": "Test tool 1",
                        "inputSchema": {"type": "object", "properties": {}}
                    },
                    {
                        "name": "tool2", 
                        "description": "Test tool 2",
                        "inputSchema": {"type": "object", "properties": {}}
                    }
                ]
            }
        }
        mock_process.stdout.readline.return_value = (json.dumps(tools_response) + "\n").encode()
        
        tools = await mcp_client.list_tools()
        
        assert len(tools) == 2
        assert isinstance(tools[0], ToolInfo)
        assert tools[0].name == "tool1"
        assert tools[1].name == "tool2"
        
        # Check tools are cached
        assert len(mcp_client.tools_cache) == 2
        assert "tool1" in mcp_client.tools_cache
    
    @pytest.mark.asyncio
    async def test_list_tools_error(self, mcp_client, mock_process):
        """Test tool listing with error."""
        mcp_client.process = mock_process
        mcp_client.status = ConnectionStatus.CONNECTED
        
        # Mock error response
        error_response = {
            "jsonrpc": "2.0",
            "id": 1,
            "error": {"code": -1, "message": "Tools not available"}
        }
        mock_process.stdout.readline.return_value = (json.dumps(error_response) + "\n").encode()
        
        tools = await mcp_client.list_tools()
        
        assert tools == []
    
    @pytest.mark.asyncio
    async def test_call_tool_success(self, mcp_client, mock_process):
        """Test successful tool call."""
        mcp_client.process = mock_process
        mcp_client.status = ConnectionStatus.CONNECTED
        
        # Mock tool call response
        tool_response = {
            "jsonrpc": "2.0",
            "id": 1,
            "result": {
                "content": [{"type": "text", "text": "Tool executed successfully"}],
                "isError": False
            }
        }
        mock_process.stdout.readline.return_value = (json.dumps(tool_response) + "\n").encode()
        
        response = await mcp_client.call_tool("test_tool", {"param": "value"})
        
        assert isinstance(response, ToolResponse)
        assert response.is_error is False
        assert len(response.content) == 1
        assert response.content[0]["text"] == "Tool executed successfully"
    
    @pytest.mark.asyncio
    async def test_call_tool_error(self, mcp_client, mock_process):
        """Test tool call with error."""
        mcp_client.process = mock_process
        mcp_client.status = ConnectionStatus.CONNECTED
        
        # Mock error response
        error_response = {
            "jsonrpc": "2.0",
            "id": 1,
            "error": {"code": -1, "message": "Tool execution failed"}
        }
        mock_process.stdout.readline.return_value = (json.dumps(error_response) + "\n").encode()
        
        response = await mcp_client.call_tool("test_tool", {})
        
        assert response.is_error is True
        assert "Tool error" in response.content[0]["text"]
    
    @pytest.mark.asyncio
    async def test_health_check_success(self, mcp_client, mock_process):
        """Test successful health check."""
        mcp_client.process = mock_process
        mcp_client.status = ConnectionStatus.CONNECTED
        
        # Mock ping response
        ping_response = {
            "jsonrpc": "2.0",
            "id": 1,
            "result": {"status": "ok"}
        }
        mock_process.stdout.readline.return_value = (json.dumps(ping_response) + "\n").encode()
        
        result = await mcp_client.health_check()
        
        assert result is True
        assert mcp_client.last_heartbeat is not None
    
    @pytest.mark.asyncio
    async def test_health_check_not_connected(self, mcp_client):
        """Test health check when not connected."""
        result = await mcp_client.health_check()
        assert result is False
    
    @pytest.mark.asyncio
    async def test_health_check_error(self, mcp_client, mock_process):
        """Test health check with error."""
        mcp_client.process = mock_process
        mcp_client.status = ConnectionStatus.CONNECTED
        
        # Mock error response
        error_response = {
            "jsonrpc": "2.0",
            "id": 1,
            "error": {"code": -1, "message": "Health check failed"}
        }
        mock_process.stdout.readline.return_value = (json.dumps(error_response) + "\n").encode()
        
        result = await mcp_client.health_check()
        assert result is False
