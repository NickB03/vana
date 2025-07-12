"""
Mock Services Manager for AI Agent Testing

This module provides comprehensive mock service management for testing
AI agents in isolation from external dependencies.
"""

import asyncio
import json
import logging
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable, Dict, List, Optional
from unittest.mock import patch


class ServiceType(Enum):
    """Types of services that can be mocked"""

    WEB_SEARCH = "web_search"
    VECTOR_SEARCH = "vector_search"
    MEMORY_SERVICE = "memory_service"
    KNOWLEDGE_BASE = "knowledge_base"
    EXTERNAL_API = "external_api"
    AGENT_COORDINATION = "agent_coordination"


@dataclass
class MockResponse:
    """Represents a mock service response"""

    status_code: int = 200
    data: Any = None
    headers: Dict[str, str] = field(default_factory=dict)
    delay: float = 0.0
    error: Optional[Exception] = None


@dataclass
class MockEndpoint:
    """Configuration for a mock endpoint"""

    path: str
    method: str = "GET"
    response: MockResponse = field(default_factory=MockResponse)
    handler: Optional[Callable] = None
    call_count: int = 0
    last_request: Optional[Dict[str, Any]] = None


class BaseMockService(ABC):
    """Base class for mock services"""

    def __init__(self, service_type: ServiceType):
        self.service_type = service_type
        self.logger = logging.getLogger(f"mock_{service_type.value}")
        self.is_active = False
        self.call_history: List[Dict[str, Any]] = []

    @abstractmethod
    async def start(self):
        """Start the mock service"""
        pass

    @abstractmethod
    async def stop(self):
        """Stop the mock service"""
        pass

    @abstractmethod
    def configure_response(self, **kwargs):
        """Configure mock responses"""
        pass

    def record_call(self, method: str, args: tuple, kwargs: dict):
        """Record a service call for testing verification"""
        self.call_history.append(
            {
                "timestamp": time.time(),
                "method": method,
                "args": args,
                "kwargs": kwargs,
            }
        )


class MockWebSearchService(BaseMockService):
    """Mock web search service for testing"""

    def __init__(self):
        super().__init__(ServiceType.WEB_SEARCH)
        self.responses = {
            "weather": {
                "results": [
                    {
                        "title": "Weather in New York",
                        "url": "https://weather.com/weather/today/l/New+York+NY",
                        "description": "Current weather in New York: 75°F, partly cloudy",
                        "extra_snippets": ["75°F", "partly cloudy", "humidity 60%"],
                        "summary": "Current temperature is 75°F with partly cloudy skies",
                    }
                ]
            },
            "time": {
                "results": [
                    {
                        "title": "Current Time in Paris",
                        "url": "https://timeanddate.com/worldclock/france/paris",
                        "description": "Current local time in Paris: 3:45 PM CET",
                        "extra_snippets": ["3:45 PM", "CET", "Central European Time"],
                        "summary": "The current time in Paris is 3:45 PM CET",
                    }
                ]
            },
            "default": {
                "results": [
                    {
                        "title": "Test Search Result",
                        "url": "https://example.com",
                        "description": "This is a test search result",
                        "extra_snippets": ["test", "example"],
                        "summary": "Test search result for validation",
                    }
                ]
            },
        }
        self.mock_patch = None

    async def start(self):
        """Start mocking web search"""
        if self.is_active:
            return

        # Mock the web search function
        async def mock_web_search(query: str, max_results: int = 5) -> str:
            self.record_call("web_search", (query, max_results), {})

            # Determine response type based on query
            query_lower = query.lower()
            if "weather" in query_lower:
                response_data = self.responses["weather"]
            elif "time" in query_lower:
                response_data = self.responses["time"]
            else:
                response_data = self.responses["default"]

            # Simulate processing delay
            await asyncio.sleep(0.1)

            return json.dumps(response_data)

        # Apply the mock
        self.mock_patch = patch("lib._tools.adk_tools.web_search", side_effect=mock_web_search)
        self.mock_patch.start()

        self.is_active = True
        self.logger.info("Mock web search service started")

    async def stop(self):
        """Stop mocking web search"""
        if not self.is_active:
            return

        if self.mock_patch:
            self.mock_patch.stop()
            self.mock_patch = None

        self.is_active = False
        self.logger.info("Mock web search service stopped")

    def configure_response(self, query_type: str, response_data: Dict[str, Any]):
        """Configure mock response for specific query type"""
        self.responses[query_type] = response_data
        self.logger.info(f"Configured mock response for query type: {query_type}")


class MockVectorSearchService(BaseMockService):
    """Mock vector search service for testing"""

    def __init__(self):
        super().__init__(ServiceType.VECTOR_SEARCH)
        self.mock_results = [
            {
                "content": "Test document content about AI agents",
                "metadata": {"source": "test_doc.md", "score": 0.95},
                "score": 0.95,
            },
            {
                "content": "Additional test content for validation",
                "metadata": {"source": "validation_doc.md", "score": 0.87},
                "score": 0.87,
            },
        ]
        self.mock_patch = None

    async def start(self):
        """Start mocking vector search"""
        if self.is_active:
            return

        async def mock_vector_search(query: str, limit: int = 10) -> List[Dict[str, Any]]:
            self.record_call("vector_search", (query, limit), {})
            await asyncio.sleep(0.05)  # Simulate processing
            return self.mock_results[:limit]

        self.mock_patch = patch("lib._tools.adk_tools.vector_search", side_effect=mock_vector_search)
        self.mock_patch.start()

        self.is_active = True
        self.logger.info("Mock vector search service started")

    async def stop(self):
        """Stop mocking vector search"""
        if not self.is_active:
            return

        if self.mock_patch:
            self.mock_patch.stop()
            self.mock_patch = None

        self.is_active = False
        self.logger.info("Mock vector search service stopped")

    def configure_response(self, results: List[Dict[str, Any]]):
        """Configure mock search results"""
        self.mock_results = results
        self.logger.info(f"Configured {len(results)} mock search results")


class MockAgentCoordinationService(BaseMockService):
    """Mock agent coordination service for testing"""

    def __init__(self):
        super().__init__(ServiceType.AGENT_COORDINATION)
        self.agent_responses = {
            "vana": "I am VANA, ready to help with your request.",
            "code_execution": "Code execution agent ready for programming tasks.",
            "data_science": "Data science agent ready for analysis tasks.",
        }
        self.mock_patches = []

    async def start(self):
        """Start mocking agent coordination"""
        if self.is_active:
            return

        async def mock_delegate_to_agent(agent_name: str, task: str) -> str:
            self.record_call("delegate_to_agent", (agent_name, task), {})
            await asyncio.sleep(0.2)  # Simulate delegation delay
            return self.agent_responses.get(agent_name, f"Mock response from {agent_name}")

        async def mock_get_agent_status(
            agent_name: Optional[str] = None,
        ) -> Dict[str, Any]:
            self.record_call("get_agent_status", (agent_name,), {})
            if agent_name:
                return {"agent": agent_name, "status": "active", "tools": ["mock_tool"]}
            else:
                return {
                    "total_agents": len(self.agent_responses),
                    "active_agents": list(self.agent_responses.keys()),
                    "status": "operational",
                }

        # Apply mocks
        delegate_patch = patch("lib._tools.adk_tools.delegate_to_agent", side_effect=mock_delegate_to_agent)
        status_patch = patch("lib._tools.adk_tools.get_agent_status", side_effect=mock_get_agent_status)

        delegate_patch.start()
        status_patch.start()

        self.mock_patches = [delegate_patch, status_patch]
        self.is_active = True
        self.logger.info("Mock agent coordination service started")

    async def stop(self):
        """Stop mocking agent coordination"""
        if not self.is_active:
            return

        for patch_obj in self.mock_patches:
            patch_obj.stop()
        self.mock_patches.clear()

        self.is_active = False
        self.logger.info("Mock agent coordination service stopped")

    def configure_response(self, agent_name: str, response: str):
        """Configure mock response for specific agent"""
        self.agent_responses[agent_name] = response
        self.logger.info(f"Configured mock response for agent: {agent_name}")


class MockServiceManager:
    """
    Comprehensive mock service manager for AI agent testing.

    Manages multiple mock services and provides centralized control
    for testing scenarios requiring service isolation.
    """

    def __init__(self):
        self.logger = logging.getLogger("mock_service_manager")
        self.services: Dict[ServiceType, BaseMockService] = {}
        self.active_services: set = set()

    def register_service(self, service: BaseMockService):
        """Register a mock service"""
        self.services[service.service_type] = service
        self.logger.info(f"Registered mock service: {service.service_type.value}")

    async def start_service(self, service_type: ServiceType):
        """Start a specific mock service"""
        if service_type not in self.services:
            raise ValueError(f"Service not registered: {service_type.value}")

        service = self.services[service_type]
        await service.start()
        self.active_services.add(service_type)
        self.logger.info(f"Started mock service: {service_type.value}")

    async def stop_service(self, service_type: ServiceType):
        """Stop a specific mock service"""
        if service_type not in self.services:
            return

        service = self.services[service_type]
        await service.stop()
        self.active_services.discard(service_type)
        self.logger.info(f"Stopped mock service: {service_type.value}")

    async def start_all_services(self):
        """Start all registered mock services"""
        for service_type in self.services:
            await self.start_service(service_type)
        self.logger.info(f"Started {len(self.services)} mock services")

    async def stop_all_services(self):
        """Stop all active mock services"""
        for service_type in list(self.active_services):
            await self.stop_service(service_type)
        self.logger.info("Stopped all mock services")

    def get_service(self, service_type: ServiceType) -> Optional[BaseMockService]:
        """Get a specific mock service"""
        return self.services.get(service_type)

    def get_call_history(self, service_type: ServiceType) -> List[Dict[str, Any]]:
        """Get call history for a specific service"""
        service = self.services.get(service_type)
        return service.call_history if service else []

    def clear_call_history(self, service_type: Optional[ServiceType] = None):
        """Clear call history for specific service or all services"""
        if service_type:
            service = self.services.get(service_type)
            if service:
                service.call_history.clear()
        else:
            for service in self.services.values():
                service.call_history.clear()
        self.logger.info("Cleared call history")

    def get_manager_stats(self) -> Dict[str, Any]:
        """Get statistics about the mock service manager"""
        return {
            "registered_services": len(self.services),
            "active_services": len(self.active_services),
            "service_types": [st.value for st in self.services.keys()],
            "active_service_types": [st.value for st in self.active_services],
        }


# Factory function for creating pre-configured mock service manager
def create_mock_service_manager() -> MockServiceManager:
    """Create a mock service manager with common services pre-registered"""
    manager = MockServiceManager()

    # Register common mock services
    manager.register_service(MockWebSearchService())
    manager.register_service(MockVectorSearchService())
    manager.register_service(MockAgentCoordinationService())

    return manager
