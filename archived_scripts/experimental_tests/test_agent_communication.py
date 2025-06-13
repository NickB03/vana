"""
Test Suite for Agent Communication System

This module tests the JSON-RPC communication protocols, message routing,
and agent coordination functionality.
"""

import pytest
import asyncio
import json
from unittest.mock import Mock, patch, AsyncMock
from fastapi import FastAPI
from fastapi.testclient import TestClient

# Import the modules we're testing
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from lib._tools.message_protocol import (
    MessageProtocol, JsonRpcRequest, JsonRpcResponse, JsonRpcErrorCode,
    AgentTaskRequest, AgentTaskResponse, AgentMethods
)
from lib._tools.jsonrpc_client import JsonRpcClient
from lib._tools.jsonrpc_server import JsonRpcServer, AgentRpcHandler
from lib._tools.agent_communication import AgentCommunicationService
from lib._tools.message_router import MessageRouter, RoutingStrategy
from lib._tools.agent_interface import SimpleAgentInterface, OrchestrationAgentInterface

class TestMessageProtocol:
    """Test JSON-RPC 2.0 message protocol."""
    
    def test_create_request(self):
        """Test creating JSON-RPC requests."""
        request = MessageProtocol.create_request("test_method", {"param1": "value1"})
        
        assert request.jsonrpc == "2.0"
        assert request.method == "test_method"
        assert request.params == {"param1": "value1"}
        assert request.id is not None
    
    def test_create_success_response(self):
        """Test creating success responses."""
        response = MessageProtocol.create_success_response({"result": "success"}, "test_id")
        
        assert response.jsonrpc == "2.0"
        assert response.result == {"result": "success"}
        assert response.error is None
        assert response.id == "test_id"
    
    def test_create_error_response(self):
        """Test creating error responses."""
        response = MessageProtocol.create_error_response(
            JsonRpcErrorCode.METHOD_NOT_FOUND, "Method not found", {"method": "test"}, "test_id"
        )
        
        assert response.jsonrpc == "2.0"
        assert response.result is None
        assert response.error is not None
        assert response.error.code == JsonRpcErrorCode.METHOD_NOT_FOUND.value
        assert response.error.message == "Method not found"
        assert response.id == "test_id"
    
    def test_parse_request(self):
        """Test parsing JSON-RPC requests."""
        json_data = '{"jsonrpc": "2.0", "method": "test", "params": {"key": "value"}, "id": 1}'
        request = MessageProtocol.parse_request(json_data)
        
        assert request.jsonrpc == "2.0"
        assert request.method == "test"
        assert request.params == {"key": "value"}
        assert request.id == 1
    
    def test_parse_invalid_request(self):
        """Test parsing invalid JSON-RPC requests."""
        with pytest.raises(ValueError, match="Invalid JSON"):
            MessageProtocol.parse_request("invalid json")
        
        with pytest.raises(ValueError, match="Invalid or missing jsonrpc version"):
            MessageProtocol.parse_request('{"method": "test"}')
    
    def test_validate_request(self):
        """Test request validation."""
        # Valid request
        valid_request = JsonRpcRequest(method="test", params={"key": "value"})
        assert MessageProtocol.validate_request(valid_request) is None
        
        # Invalid request - empty method
        invalid_request = JsonRpcRequest(method="", params={"key": "value"})
        error = MessageProtocol.validate_request(invalid_request)
        assert error is not None
        assert error.code == JsonRpcErrorCode.INVALID_REQUEST.value

class TestJsonRpcServer:
    """Test JSON-RPC server functionality."""
    
    @pytest.fixture
    def server(self):
        """Create a test server."""
        return JsonRpcServer("test_agent")
    
    def test_server_initialization(self, server):
        """Test server initialization."""
        assert server.agent_name == "test_agent"
        assert AgentMethods.GET_STATUS in server.methods
        assert AgentMethods.GET_CAPABILITIES in server.methods
        assert AgentMethods.HEALTH_CHECK in server.methods
    
    def test_register_method(self, server):
        """Test method registration."""
        def test_method():
            return "test result"
        
        server.register_method("test_method", test_method)
        assert "test_method" in server.methods
        assert server.methods["test_method"] == test_method
    
    @pytest.mark.asyncio
    async def test_handle_valid_request(self, server):
        """Test handling valid requests."""
        # Register a test method
        def test_method(param1: str) -> str:
            return f"Hello {param1}"
        
        server.register_method("test_method", test_method)
        
        # Create request
        request_data = '{"jsonrpc": "2.0", "method": "test_method", "params": {"param1": "world"}, "id": 1}'
        
        # Handle request
        response_data = await server.handle_request(request_data)
        response = json.loads(response_data)
        
        assert response["jsonrpc"] == "2.0"
        assert response["result"] == "Hello world"
        assert response["id"] == 1
    
    @pytest.mark.asyncio
    async def test_handle_method_not_found(self, server):
        """Test handling method not found."""
        request_data = '{"jsonrpc": "2.0", "method": "nonexistent_method", "id": 1}'
        
        response_data = await server.handle_request(request_data)
        response = json.loads(response_data)
        
        assert response["jsonrpc"] == "2.0"
        assert "error" in response
        assert response["error"]["code"] == JsonRpcErrorCode.METHOD_NOT_FOUND.value
        assert response["id"] == 1
    
    @pytest.mark.asyncio
    async def test_handle_invalid_json(self, server):
        """Test handling invalid JSON."""
        response_data = await server.handle_request("invalid json")
        response = json.loads(response_data)
        
        assert response["jsonrpc"] == "2.0"
        assert "error" in response
        assert response["error"]["code"] == JsonRpcErrorCode.PARSE_ERROR.value

class TestAgentCommunicationService:
    """Test agent communication service."""
    
    @pytest.fixture
    def app(self):
        """Create a test FastAPI app."""
        return FastAPI()
    
    @pytest.fixture
    def communication_service(self):
        """Create a test communication service."""
        return AgentCommunicationService("http://localhost:8000")
    
    def test_register_agent_endpoint(self, communication_service, app):
        """Test registering agent endpoints."""
        # Register an agent endpoint
        rpc_handler = communication_service.register_agent_endpoint(app, "test_agent")
        
        assert "test_agent" in communication_service.active_endpoints
        assert isinstance(rpc_handler, AgentRpcHandler)
        assert "test_agent" in communication_service.communication_stats
    
    @pytest.mark.asyncio
    async def test_send_task_to_agent_not_found(self, communication_service):
        """Test sending task to non-existent agent."""
        with patch.object(communication_service.discovery_service, 'get_agent_info', return_value=None):
            result = await communication_service.send_task_to_agent("nonexistent", "test task")
            
            assert result["status"] == "error"
            assert "not found" in result["error"]
    
    @pytest.mark.asyncio
    async def test_check_agent_health(self, communication_service):
        """Test agent health checking."""
        # Mock the JsonRpcClient
        with patch('lib._tools.agent_communication.JsonRpcClient') as mock_client_class:
            mock_client = AsyncMock()
            mock_client_class.return_value.__aenter__.return_value = mock_client
            
            # Mock successful health check
            mock_response = Mock()
            mock_response.error = None
            mock_response.result = {"status": "healthy"}
            mock_client.health_check.return_value = mock_response
            
            result = await communication_service.check_agent_health("test_agent")
            
            assert result["agent_name"] == "test_agent"
            assert result["status"] == "healthy"

class TestMessageRouter:
    """Test message routing functionality."""
    
    @pytest.fixture
    def router(self):
        """Create a test message router."""
        return MessageRouter()
    
    @pytest.mark.asyncio
    async def test_route_task_no_agents(self, router):
        """Test routing when no agents are available."""
        with patch.object(router.discovery_service, 'discover_agents', return_value={}):
            result = await router.route_task("test task")
            
            assert result["status"] == "error"
            assert "No agents available" in result["error"]
    
    def test_capability_score_calculation(self, router):
        """Test capability score calculation."""
        from lib._tools.agent_discovery import AgentCapability
        
        agent = AgentCapability(
            name="code_execution",
            description="Code execution agent",
            tools=["execute_code", "validate_code"],
            capabilities=["code_execution", "python", "javascript"],
            status="active"
        )
        
        # Test code-related task
        score = router._calculate_capability_score(agent, "execute python code")
        assert score > 0
        
        # Test unrelated task
        score = router._calculate_capability_score(agent, "analyze data visualization")
        assert score >= 0

class TestAgentInterface:
    """Test agent interface implementations."""
    
    @pytest.fixture
    def simple_agent(self):
        """Create a simple agent interface."""
        return SimpleAgentInterface("test_agent")
    
    @pytest.fixture
    def orchestration_agent(self):
        """Create an orchestration agent interface."""
        return OrchestrationAgentInterface("vana")
    
    @pytest.mark.asyncio
    async def test_simple_agent_execute_task(self, simple_agent):
        """Test simple agent task execution."""
        response = await simple_agent.execute_task("test task", "test context")
        
        assert isinstance(response, AgentTaskResponse)
        assert response.status == "completed"
        assert response.agent_id == "test_agent"
        assert "test task" in response.output
    
    @pytest.mark.asyncio
    async def test_orchestration_agent_delegation(self, orchestration_agent):
        """Test orchestration agent delegation logic."""
        # Test that code tasks should be delegated
        should_delegate = await orchestration_agent._should_delegate_task("execute python code")
        assert should_delegate is True
        
        # Test that coordination tasks should not be delegated
        should_delegate = await orchestration_agent._should_delegate_task("coordinate tasks")
        assert should_delegate is False
    
    def test_simple_agent_capabilities(self, simple_agent):
        """Test getting agent capabilities."""
        capabilities = asyncio.run(simple_agent.get_capabilities())
        
        assert capabilities["agent_name"] == "test_agent"
        assert "methods" in capabilities
        assert capabilities["supports_async"] is True

class TestIntegration:
    """Integration tests for the complete communication system."""
    
    @pytest.mark.asyncio
    async def test_end_to_end_communication(self):
        """Test end-to-end communication between agents."""
        # Create FastAPI app
        app = FastAPI()
        
        # Create communication service
        comm_service = AgentCommunicationService("http://localhost:8000")
        
        # Create a simple agent with custom task handler
        async def custom_task_handler(task: str, context: str = "", agent_id: str = "",
                                    priority: str = "normal", timeout_seconds: int = 30) -> AgentTaskResponse:
            return AgentTaskResponse(
                status="completed",
                output=f"Processed: {task}",
                agent_id="test_agent",
                execution_time_ms=100.0
            )
        
        # Register agent endpoint
        rpc_handler = comm_service.register_agent_endpoint(app, "test_agent", custom_task_handler)
        
        # Verify registration
        assert "test_agent" in comm_service.active_endpoints
        assert isinstance(rpc_handler, AgentRpcHandler)
    
    @pytest.mark.asyncio
    async def test_routing_with_multiple_agents(self):
        """Test routing with multiple available agents."""
        router = MessageRouter()
        
        # Mock multiple agents
        from lib._tools.agent_discovery import AgentCapability
        
        mock_agents = {
            "code_agent": AgentCapability(
                name="code_agent",
                description="Code execution agent",
                tools=["execute_code"],
                capabilities=["code_execution"],
                status="active"
            ),
            "data_agent": AgentCapability(
                name="data_agent", 
                description="Data analysis agent",
                tools=["analyze_data"],
                capabilities=["data_analysis"],
                status="active"
            )
        }
        
        with patch.object(router.discovery_service, 'discover_agents', return_value=mock_agents):
            with patch.object(router.communication_service, 'send_task_to_agent') as mock_send:
                mock_send.return_value = {"status": "success", "result": {"output": "Task completed"}}
                
                # Test capability-based routing for code task
                result = await router.route_task("execute python code", strategy=RoutingStrategy.CAPABILITY_BASED)
                
                # Should route to code_agent
                assert result["status"] == "success"
                assert result["routing_info"]["selected_agent"] == "code_agent"

class TestTaskRoutingEngine:
    """Test the complete task routing engine."""

    @pytest.fixture
    def routing_engine(self):
        """Create a test routing engine."""
        from lib._tools.routing_engine import RoutingEngine
        return RoutingEngine()

    @pytest.mark.asyncio
    async def test_task_analysis_and_routing(self, routing_engine):
        """Test end-to-end task analysis and routing."""
        # Mock the dependencies
        with patch.object(routing_engine.task_analyzer, 'analyze_task') as mock_analyze:
            with patch.object(routing_engine.task_classifier, 'classify_task') as mock_classify:
                with patch.object(routing_engine.capability_matcher, 'match_capabilities') as mock_match:
                    with patch.object(routing_engine.communication_service, 'send_task_to_agent') as mock_send:

                        # Set up mocks
                        from lib._tools.task_analyzer import TaskAnalysis, TaskType, TaskComplexity
                        from lib._tools.task_classifier import TaskClassification, AgentRecommendation, AgentCategory
                        from lib._tools.capability_matcher import MatchingResult, CapabilityMatch

                        mock_analyze.return_value = TaskAnalysis(
                            task_type=TaskType.CODE_EXECUTION,
                            complexity=TaskComplexity.MODERATE,
                            keywords=["execute", "python", "code"],
                            required_capabilities=["code_execution", "python"],
                            estimated_duration=30.0,
                            resource_requirements={"cpu_intensive": True},
                            confidence_score=0.8,
                            reasoning="Code execution task identified"
                        )

                        mock_classify.return_value = TaskClassification(
                            primary_recommendation=AgentRecommendation(
                                agent_category=AgentCategory.CODE_EXECUTION,
                                agent_name="code_execution",
                                confidence=0.9,
                                reasoning="Best match for code execution",
                                fallback_agents=["vana"]
                            ),
                            alternative_recommendations=[],
                            decomposition_suggested=False,
                            parallel_execution=False,
                            estimated_agents_needed=1,
                            routing_strategy="direct_routing"
                        )

                        mock_match.return_value = MatchingResult(
                            best_match=CapabilityMatch(
                                agent_name="code_execution",
                                match_score=0.9,
                                matched_capabilities=["code_execution", "python"],
                                missing_capabilities=[],
                                capability_coverage=1.0,
                                performance_score=0.8,
                                availability_score=1.0,
                                overall_score=0.9,
                                reasoning="Perfect match for code execution"
                            ),
                            alternative_matches=[],
                            coverage_analysis={"total_coverage": 1.0},
                            recommendations=["Excellent match found"]
                        )

                        mock_send.return_value = {
                            "status": "success",
                            "result": {"output": "Code executed successfully"},
                            "execution_time_ms": 1500
                        }

                        # Test the routing
                        result = await routing_engine.route_task("execute python code to calculate fibonacci")

                        # Verify the result
                        assert result.success is True
                        assert result.agents_used == ["code_execution"]
                        assert result.primary_result["status"] == "success"
                        assert result.execution_time > 0

    @pytest.mark.asyncio
    async def test_complex_task_orchestration(self, routing_engine):
        """Test complex task orchestration with multiple agents."""
        from lib._tools.task_orchestrator import TaskOrchestrator, OrchestrationStrategy

        orchestrator = TaskOrchestrator()

        # Mock the communication service
        with patch.object(orchestrator.communication_service, 'send_task_to_agent') as mock_send:
            mock_send.return_value = {
                "status": "success",
                "result": {"output": "Subtask completed"},
                "execution_time_ms": 1000
            }

            # Test orchestration
            result = await orchestrator.orchestrate_task(
                "analyze data and create visualization then generate report",
                strategy=OrchestrationStrategy.SEQUENTIAL,
                max_parallel_tasks=2,
                timeout_seconds=60
            )

            # Verify orchestration result
            assert result.success is True
            assert result.completed_subtasks > 0
            assert result.total_execution_time > 0

class TestTaskAnalyzer:
    """Test task analysis functionality."""

    @pytest.fixture
    def task_analyzer(self):
        """Create a test task analyzer."""
        from lib._tools.task_analyzer import TaskAnalyzer
        return TaskAnalyzer()

    def test_code_execution_task_analysis(self, task_analyzer):
        """Test analysis of code execution tasks."""
        analysis = task_analyzer.analyze_task("execute python script to process data")

        assert analysis.task_type.value == "code_execution"
        assert "execute" in analysis.keywords
        assert "python" in analysis.keywords
        assert "code_execution" in analysis.required_capabilities
        assert analysis.confidence_score > 0.5

    def test_data_analysis_task_analysis(self, task_analyzer):
        """Test analysis of data analysis tasks."""
        analysis = task_analyzer.analyze_task("analyze sales data and create visualization charts")

        assert analysis.task_type.value == "data_analysis"
        assert "analyze" in analysis.keywords
        assert "data" in analysis.keywords
        assert "data_analysis" in analysis.required_capabilities
        assert analysis.confidence_score > 0.5

    def test_knowledge_search_task_analysis(self, task_analyzer):
        """Test analysis of knowledge search tasks."""
        analysis = task_analyzer.analyze_task("search for information about machine learning algorithms")

        assert analysis.task_type.value == "knowledge_search"
        assert "search" in analysis.keywords
        assert "knowledge_search" in analysis.required_capabilities
        assert analysis.confidence_score > 0.5

class TestCapabilityMatcher:
    """Test capability matching functionality."""

    @pytest.fixture
    def capability_matcher(self):
        """Create a test capability matcher."""
        from lib._tools.capability_matcher import CapabilityMatcher
        return CapabilityMatcher()

    @pytest.mark.asyncio
    async def test_capability_matching(self, capability_matcher):
        """Test capability matching with mock agents."""
        # Mock the discovery service
        from lib._tools.agent_discovery import AgentCapability

        mock_agents = {
            "code_execution": AgentCapability(
                name="code_execution",
                description="Code execution agent",
                tools=["execute_code"],
                capabilities=["code_execution", "python"],
                status="active"
            ),
            "data_science": AgentCapability(
                name="data_science",
                description="Data analysis agent",
                tools=["analyze_data"],
                capabilities=["data_analysis", "visualization"],
                status="active"
            )
        }

        with patch.object(capability_matcher.discovery_service, 'discover_agents', return_value=mock_agents):
            result = await capability_matcher.match_capabilities(
                "execute python code",
                required_capabilities=["code_execution", "python"]
            )

            assert result.best_match is not None
            assert result.best_match.agent_name == "code_execution"
            assert result.best_match.capability_coverage > 0.8

class TestPerformanceTracking:
    """Test performance tracking functionality."""

    @pytest.fixture
    def performance_tracker(self):
        """Create a test performance tracker."""
        from lib._tools.performance_tracker import PerformanceTracker
        return PerformanceTracker()

    @pytest.mark.asyncio
    async def test_performance_recording(self, performance_tracker):
        """Test recording performance metrics."""
        await performance_tracker.record_routing_performance(
            agent_name="test_agent",
            routing_strategy="direct",
            success=True,
            execution_time=1.5,
            agent_count=1
        )

        # Check that metrics were recorded
        stats = performance_tracker.get_performance_summary()
        assert stats["overall_statistics"]["total_routes"] == 1
        assert stats["overall_statistics"]["success_rate"] == 1.0

    def test_agent_performance_stats(self, performance_tracker):
        """Test agent performance statistics."""
        # Add some test data
        performance_tracker.metrics_history.extend([
            type('Metric', (), {
                'agent_name': 'test_agent',
                'routing_strategy': 'direct',
                'success': True,
                'execution_time': 1.0,
                'agent_count': 1,
                'timestamp': '2025-01-01T00:00:00'
            })() for _ in range(5)
        ])

        stats = performance_tracker.get_performance_summary()
        assert len(stats["top_performing_agents"]) > 0

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
