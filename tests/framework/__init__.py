"""
AI Agent Testing Framework for VANA Project

This framework provides specialized testing capabilities for AI agents,
including intelligence validation, response quality analysis, and
Google ADK compliance verification.

Key Components:
- AgentIntelligenceValidator: Tests agent reasoning and behavior patterns
- ResponseQualityAnalyzer: Analyzes response quality with HITL support
- ADKComplianceValidator: Validates Google ADK compliance
- PerformanceBenchmarker: Benchmarks agent performance
- TestDataManager: Manages external test scenarios
- AgentTestClient: Standardized agent interaction interface

Usage:
    from tests.framework import AgentIntelligenceValidator, TestDataManager

    # Create test data manager and load scenarios
    data_manager = TestDataManager()
    scenarios = data_manager.load_scenarios_by_type(QueryType.FACTUAL)

    # Create agent client and validator
    agent_client = await create_test_agent_client("vana")
    validator = AgentIntelligenceValidator(agent_client, data_manager)

    # Run intelligence tests
    result = await validator.validate_reasoning_consistency(QueryType.FACTUAL)
    print(f"Reasoning consistency score: {result.score}")
"""

# Import all implemented components
from .adk_compliance_validator import ADKComplianceValidator, ComplianceResult
from .agent_client import (
    AgentContext,
    AgentResponse,
    AgentTestClient,
    create_multi_agent_environment,
    create_test_agent_client,
)
from .agent_intelligence_validator import AgentIntelligenceValidator, IntelligenceTestResult, ReasoningPattern
from .mock_services import (
    BaseMockService,
    MockAgentCoordinationService,
    MockServiceManager,
    MockVectorSearchService,
    MockWebSearchService,
    ServiceType,
    create_mock_service_manager,
)
from .performance_benchmarker import LoadTestResult, PerformanceBenchmarker, PerformanceMetrics
from .performance_monitor import (
    MetricType,
    PerformanceMetric,
    PerformanceMonitor,
    PerformanceReport,
    PerformanceThreshold,
)
from .response_quality_analyzer import QualityMetrics, ResponseQualityAnalyzer, ReviewStatus, ValidationResult
from .test_data_manager import QueryType, TestDataManager, TestScenario

# Import test infrastructure components
from .test_environment import AgentEnvironment, EnvironmentConfig, EnvironmentType, TestEnvironment
from .test_fixtures import AgentTestData, MultiAgentTestData, TestFixture, TestFixtureManager

__all__ = [
    # Core validators
    "AgentIntelligenceValidator",
    "ResponseQualityAnalyzer",
    "ADKComplianceValidator",
    "PerformanceBenchmarker",
    # Data types
    "IntelligenceTestResult",
    "QualityMetrics",
    "ValidationResult",
    "TestScenario",
    "AgentResponse",
    "AgentContext",
    "ComplianceResult",
    "PerformanceMetrics",
    "LoadTestResult",
    # Enums
    "QueryType",
    "ReasoningPattern",
    "ReviewStatus",
    # Managers and clients
    "TestDataManager",
    "AgentTestClient",
    # Factory functions
    "create_test_agent_client",
    "create_multi_agent_environment",
    # Test Infrastructure
    "TestEnvironment",
    "EnvironmentConfig",
    "EnvironmentType",
    "AgentEnvironment",
    "MockServiceManager",
    "BaseMockService",
    "MockWebSearchService",
    "MockVectorSearchService",
    "MockAgentCoordinationService",
    "ServiceType",
    "create_mock_service_manager",
    "TestFixtureManager",
    "TestFixture",
    "AgentTestData",
    "MultiAgentTestData",
    "PerformanceMonitor",
    "PerformanceMetric",
    "PerformanceReport",
    "PerformanceThreshold",
    "MetricType",
]

__version__ = "1.0.0"
__author__ = "VANA Development Team"
__description__ = "AI Agent Testing Framework for Google ADK"

# Framework configuration
DEFAULT_CONFIG = {
    "hitl_threshold": 0.85,
    "enable_llm_judge": True,
    "test_timeout": 30,
    "max_retries": 3,
    "base_test_url": "https://vana-dev-960076421399.us-central1.run.app",
}


def get_framework_info():
    """Get information about the testing framework"""
    return {
        "version": __version__,
        "description": __description__,
        "components": __all__,
        "default_config": DEFAULT_CONFIG,
    }
