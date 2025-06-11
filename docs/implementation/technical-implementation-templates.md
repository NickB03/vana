# Technical Implementation Templates

## Agent Implementation Template

### Standard Agent Structure
```python
# agents/{agent_name}/specialist.py
from google.genai.adk import LlmAgent, FunctionTool
from typing import Dict, Any, List
import asyncio

class {AgentName}Specialist(LlmAgent):
    def __init__(self):
        super().__init__(
            name="{agent_name}",
            description="Specialist for {domain_description}"
        )
        self.session_state = {}
        self._register_tools()
    
    def _register_tools(self):
        """Register all tools for this specialist"""
        self.add_tool(FunctionTool(
            name="{primary_tool_name}",
            description="{tool_description}",
            parameters=self._get_{tool_name}_schema(),
            function=self._{tool_name}_implementation
        ))
    
    def _get_{tool_name}_schema(self) -> Dict[str, Any]:
        """Define tool parameter schema"""
        return {
            "type": "object",
            "properties": {
                "input_param": {
                    "type": "string",
                    "description": "Description of input parameter"
                }
            },
            "required": ["input_param"]
        }
    
    async def _{tool_name}_implementation(self, **kwargs) -> Dict[str, Any]:
        """Implement tool functionality"""
        try:
            # Tool implementation logic
            result = await self._process_request(kwargs)
            
            # Store in session state if needed
            self.session_state["{tool_name}_last_result"] = result
            
            return {
                "status": "success",
                "result": result,
                "timestamp": datetime.utcnow().isoformat()
            }
        except Exception as e:
            return {
                "status": "error",
                "error": str(e),
                "error_type": type(e).__name__
            }
    
    async def _process_request(self, params: Dict[str, Any]) -> Any:
        """Core processing logic"""
        # Implement specific agent logic here
        pass

# agents/{agent_name}/__init__.py
from .specialist import {AgentName}Specialist

root_agent = {AgentName}Specialist()
```

### Agent Configuration Template
```yaml
# agents/{agent_name}/config/agent_config.yaml
agent:
  name: "{agent_name}"
  description: "{agent_description}"
  version: "1.0.0"
  
capabilities:
  primary_domain: "{domain}"
  supported_formats: ["{format1}", "{format2}"]
  max_concurrent_requests: 5
  timeout_seconds: 30

tools:
  - name: "{tool1_name}"
    enabled: true
    priority: 1
  - name: "{tool2_name}"
    enabled: true
    priority: 2

integration:
  mcp_servers: ["{server1}", "{server2}"]
  required_env_vars: ["{VAR1}", "{VAR2}"]
  
performance:
  cache_enabled: true
  cache_ttl_seconds: 300
  max_memory_mb: 512
```

## MCP Integration Template

### MCP Server Wrapper Template
```python
# lib/mcp_integration/servers/{server_name}_mcp.py
from lib.mcp_integration.core.mcp_wrapper import MCPWrapper
from google.genai.adk import FunctionTool
from typing import List, Dict, Any
import os

class {ServerName}MCPServer(MCPWrapper):
    def __init__(self):
        super().__init__(
            server_name="{server_name}",
            server_url="{mcp_server_url}",
            required_env_vars=["{ENV_VAR1}", "{ENV_VAR2}"]
        )
        self.client = self._initialize_client()
    
    def _initialize_client(self):
        """Initialize MCP server client"""
        # Initialize connection to MCP server
        pass
    
    def get_tools(self) -> List[FunctionTool]:
        """Return list of tools provided by this MCP server"""
        return [
            FunctionTool(
                name="{server_name}_{tool_name}",
                description="{tool_description}",
                parameters=self._get_{tool_name}_schema(),
                function=self._{tool_name}_handler
            )
        ]
    
    def _get_{tool_name}_schema(self) -> Dict[str, Any]:
        """Define tool parameter schema"""
        return {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Query parameter for the tool"
                }
            },
            "required": ["query"]
        }
    
    async def _{tool_name}_handler(self, **kwargs) -> Dict[str, Any]:
        """Handle tool execution"""
        try:
            # Validate inputs
            self._validate_inputs(kwargs)
            
            # Execute MCP server request
            result = await self._execute_mcp_request("{tool_name}", kwargs)
            
            # Process and format response
            formatted_result = self._format_response(result)
            
            return {
                "status": "success",
                "data": formatted_result,
                "server": self.server_name
            }
        except Exception as e:
            return {
                "status": "error",
                "error": str(e),
                "server": self.server_name
            }
    
    async def _execute_mcp_request(self, tool_name: str, params: Dict[str, Any]) -> Any:
        """Execute request to MCP server"""
        # Implement MCP server communication
        pass
    
    def _format_response(self, raw_response: Any) -> Dict[str, Any]:
        """Format MCP server response for VANA consumption"""
        # Format response according to VANA standards
        pass
```

### MCP Configuration Template
```yaml
# lib/mcp_integration/config/mcp_servers.yaml
servers:
  {server_name}:
    enabled: true
    server_class: "{ServerName}MCPServer"
    priority: {1-3}  # 1=critical, 2=important, 3=optional
    agents: ["{agent1}", "{agent2}"]
    
    environment_vars:
      - "{ENV_VAR1}"
      - "{ENV_VAR2}"
    
    configuration:
      timeout_seconds: 30
      retry_attempts: 3
      cache_enabled: true
      cache_ttl_seconds: 300
    
    health_check:
      enabled: true
      interval_seconds: 60
      endpoint: "/health"
    
    rate_limiting:
      enabled: true
      requests_per_minute: 100
      burst_limit: 10
```

## Sandbox Environment Templates

### Container Configuration Template
```dockerfile
# lib/sandbox/containers/Dockerfile.{language}
FROM {base_image}

# Create sandbox user
RUN useradd -m -s /bin/bash sandbox

# Install language-specific dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    {dependencies} \
    && rm -rf /var/lib/apt/lists/*

# Install language packages
COPY requirements.txt .
RUN {package_install_command}

# Set up workspace
USER sandbox
WORKDIR /workspace

# Copy security policies
COPY security_policies.json /etc/sandbox/
COPY resource_limits.conf /etc/sandbox/

# Set resource limits
ENV MEMORY_LIMIT=512m
ENV CPU_LIMIT=1
ENV TIMEOUT_LIMIT=30

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD {health_check_command}

ENTRYPOINT ["/usr/local/bin/sandbox-executor"]
```

### Security Policy Template
```json
{
  "security_policies": {
    "file_system": {
      "allowed_paths": ["/workspace", "/tmp"],
      "read_only_paths": ["/etc", "/usr", "/bin"],
      "blocked_paths": ["/proc", "/sys", "/dev"],
      "max_file_size_mb": 10,
      "max_total_size_mb": 100
    },
    "network": {
      "enabled": false,
      "allowed_domains": [],
      "blocked_ports": [22, 23, 25, 53, 80, 443],
      "max_connections": 0
    },
    "processes": {
      "max_processes": 10,
      "max_threads": 20,
      "blocked_commands": ["sudo", "su", "chmod", "chown"],
      "timeout_seconds": 30
    },
    "resources": {
      "max_memory_mb": 512,
      "max_cpu_percent": 100,
      "max_execution_time_seconds": 30,
      "max_output_size_kb": 1024
    }
  }
}
```

### Language Executor Template
```python
# lib/sandbox/executors/{language}_executor.py
from lib.sandbox.core.base_executor import BaseExecutor
from lib.sandbox.core.security_manager import SecurityManager
from typing import Dict, Any
import asyncio
import docker

class {Language}Executor(BaseExecutor):
    def __init__(self, security_manager: SecurityManager):
        super().__init__(security_manager)
        self.container_image = "vana-{language}-sandbox:latest"
        self.docker_client = docker.from_env()
    
    async def execute(self, code: str, **kwargs) -> Dict[str, Any]:
        """Execute {language} code in secure container"""
        # Validate code security
        security_result = self.security_manager.validate_code(code, "{language}")
        if not security_result.allowed:
            raise SecurityViolationError(f"Code failed security validation: {security_result.violations}")
        
        # Prepare execution environment
        container_config = self._prepare_container_config(kwargs)
        
        # Execute in container
        try:
            result = await self._run_in_container(code, container_config)
            return self._format_result(result)
        except Exception as e:
            return self._format_error(e)
    
    def _prepare_container_config(self, kwargs: Dict[str, Any]) -> Dict[str, Any]:
        """Prepare container configuration"""
        return {
            "image": self.container_image,
            "mem_limit": kwargs.get("memory_limit", "512m"),
            "cpu_period": 100000,
            "cpu_quota": kwargs.get("cpu_limit", 100000),
            "network_disabled": True,
            "read_only": True,
            "tmpfs": {"/workspace": "size=100m,noexec"},
            "security_opt": ["no-new-privileges:true"],
            "cap_drop": ["ALL"]
        }
    
    async def _run_in_container(self, code: str, config: Dict[str, Any]) -> Dict[str, Any]:
        """Run code in Docker container"""
        container = None
        try:
            # Create and start container
            container = self.docker_client.containers.run(
                **config,
                command=self._get_execution_command(code),
                detach=True,
                remove=True
            )
            
            # Wait for execution with timeout
            exit_code = container.wait(timeout=30)
            
            # Get output
            output = container.logs(stdout=True, stderr=True).decode('utf-8')
            
            return {
                "exit_code": exit_code,
                "output": output,
                "execution_time": self._get_execution_time(container)
            }
        finally:
            if container:
                try:
                    container.kill()
                except:
                    pass
    
    def _get_execution_command(self, code: str) -> List[str]:
        """Get command to execute code"""
        # Language-specific execution command
        return ["{language_interpreter}", "-c", code]
    
    def _format_result(self, raw_result: Dict[str, Any]) -> Dict[str, Any]:
        """Format execution result"""
        return {
            "status": "success" if raw_result["exit_code"] == 0 else "error",
            "output": raw_result["output"],
            "execution_time": raw_result["execution_time"],
            "exit_code": raw_result["exit_code"],
            "language": "{language}"
        }
```

## Testing Templates

### Agent Testing Template
```python
# tests/agents/test_{agent_name}_specialist.py
import pytest
from agents.{agent_name}.specialist import {AgentName}Specialist
from unittest.mock import AsyncMock, patch

class Test{AgentName}Specialist:
    @pytest.fixture
    async def specialist(self):
        """Create specialist instance for testing"""
        return {AgentName}Specialist()
    
    @pytest.mark.asyncio
    async def test_agent_initialization(self, specialist):
        """Test agent initializes correctly"""
        assert specialist.name == "{agent_name}"
        assert len(specialist.tools) > 0
    
    @pytest.mark.asyncio
    async def test_{primary_tool}_success(self, specialist):
        """Test primary tool executes successfully"""
        result = await specialist._{primary_tool}_implementation(
            input_param="test_value"
        )
        
        assert result["status"] == "success"
        assert "result" in result
    
    @pytest.mark.asyncio
    async def test_{primary_tool}_error_handling(self, specialist):
        """Test tool handles errors gracefully"""
        with patch.object(specialist, '_process_request', side_effect=Exception("Test error")):
            result = await specialist._{primary_tool}_implementation(
                input_param="invalid_value"
            )
            
            assert result["status"] == "error"
            assert "error" in result
    
    @pytest.mark.asyncio
    async def test_session_state_management(self, specialist):
        """Test session state is managed correctly"""
        await specialist._{primary_tool}_implementation(input_param="test")
        
        assert "{primary_tool}_last_result" in specialist.session_state
```

### MCP Integration Testing Template
```python
# tests/mcp_integration/test_{server_name}_mcp.py
import pytest
from lib.mcp_integration.servers.{server_name}_mcp import {ServerName}MCPServer
from unittest.mock import AsyncMock, patch

class Test{ServerName}MCPServer:
    @pytest.fixture
    def mcp_server(self):
        """Create MCP server instance for testing"""
        with patch.dict('os.environ', {'{ENV_VAR1}': 'test_value'}):
            return {ServerName}MCPServer()
    
    @pytest.mark.asyncio
    async def test_server_initialization(self, mcp_server):
        """Test MCP server initializes correctly"""
        assert mcp_server.server_name == "{server_name}"
        assert len(mcp_server.get_tools()) > 0
    
    @pytest.mark.asyncio
    async def test_tool_execution_success(self, mcp_server):
        """Test tool executes successfully"""
        with patch.object(mcp_server, '_execute_mcp_request', return_value={"data": "test"}):
            result = await mcp_server._{tool_name}_handler(query="test_query")
            
            assert result["status"] == "success"
            assert "data" in result
    
    @pytest.mark.asyncio
    async def test_error_handling(self, mcp_server):
        """Test error handling"""
        with patch.object(mcp_server, '_execute_mcp_request', side_effect=Exception("Connection error")):
            result = await mcp_server._{tool_name}_handler(query="test_query")
            
            assert result["status"] == "error"
            assert "error" in result
```

These templates provide standardized patterns for implementing agents, MCP integrations, sandbox environments, and testing procedures, ensuring consistency and quality across all implementations.
