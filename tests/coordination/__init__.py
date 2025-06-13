"""
Coordination Testing Module for VANA
Tests coordination and delegation functionality with success rate tracking

This module provides comprehensive testing for Tasks #5-8:
- Task #5: Real coordination tools
- Task #6: VANA orchestrator delegation
- Task #7: Intelligent task analysis
- Task #8: Multi-agent workflow management

Target: >90% coordination success rate
"""

from .test_coordination_framework import (
    CoordinationTestFramework,
    CoordinationTestResult,
    CoordinationMetrics,
    TestCoordinationTools,
    TestWorkflowManagement,
    TestIntelligentTaskAnalysis,
    TestVANAOrchestration
)

from .coordination_test_runner import CoordinationTestRunner
from .coordination_benchmarks import CoordinationBenchmarks, BenchmarkResult

__all__ = [
    "CoordinationTestFramework",
    "CoordinationTestResult", 
    "CoordinationMetrics",
    "TestCoordinationTools",
    "TestWorkflowManagement",
    "TestIntelligentTaskAnalysis",
    "TestVANAOrchestration",
    "CoordinationTestRunner",
    "CoordinationBenchmarks",
    "BenchmarkResult"
]
