#!/usr/bin/env python3
"""
Validation script for capability_matcher.py - Intelligent Agent Selection
Validates all 8 critical functions without external dependencies
"""

import sys
from dataclasses import dataclass
from pathlib import Path
from typing import List

# Add project root to path
sys.path.append(str(Path(__file__).parent))


def validate_capability_matcher():
    """Validate capability matcher functionality"""
    print("🧪 Validating Capability Matcher...")
    print("=" * 60)

    try:
        # Import the capability matcher components
        from lib._tools.capability_matcher import (
            CapabilityMatch,
            CapabilityMatcher,
            MatchingResult,
            get_capability_matcher,
        )

        print("✅ Successfully imported capability_matcher module")

        # Test 1: Data class functionality
        print("\n📋 Test 1: Data Class Functionality")

        # Test CapabilityMatch
        match = CapabilityMatch(
            agent_name="test_agent",
            match_score=0.8,
            matched_capabilities=["python", "data_analysis"],
            missing_capabilities=["machine_learning"],
            capability_coverage=0.75,
            performance_score=0.9,
            availability_score=0.95,
            overall_score=0.85,
            reasoning="Test reasoning",
        )

        assert isinstance(match.agent_name, str), "Agent name must be string"
        assert isinstance(match.match_score, float), "Match score must be float"
        assert isinstance(match.matched_capabilities, list), "Matched capabilities must be list"
        assert 0 <= match.match_score <= 1, "Match score must be 0-1"
        assert 0 <= match.capability_coverage <= 1, "Coverage must be 0-1"
        print("  ✅ CapabilityMatch dataclass works correctly")

        # Test MatchingResult
        result = MatchingResult(
            best_match=match,
            alternative_matches=[],
            coverage_analysis={"total_coverage": 0.8},
            recommendations=["Use test_agent"],
        )

        assert isinstance(result.best_match, CapabilityMatch), "Best match must be CapabilityMatch"
        assert isinstance(result.alternative_matches, list), "Alternative matches must be list"
        assert isinstance(result.coverage_analysis, dict), "Coverage analysis must be dict"
        assert isinstance(result.recommendations, list), "Recommendations must be list"
        print("  ✅ MatchingResult dataclass works correctly")

        # Test 2: CapabilityMatcher initialization with mocks
        print("\n📋 Test 2: CapabilityMatcher Initialization")

        # Mock the dependencies to avoid import issues
        from unittest.mock import Mock, patch

        with (
            patch("lib._tools.capability_matcher.get_discovery_service") as mock_discovery,
            patch("lib._tools.capability_matcher.get_task_analyzer") as mock_analyzer,
            patch("lib._tools.capability_matcher.get_task_classifier") as mock_classifier,
        ):
            # Setup mocks
            mock_discovery.return_value = Mock()
            mock_analyzer.return_value = Mock()
            mock_classifier.return_value = Mock()

            matcher = CapabilityMatcher()

            # Validate initialization
            assert matcher.discovery_service is not None, "Discovery service must be initialized"
            assert matcher.task_analyzer is not None, "Task analyzer must be initialized"
            assert matcher.task_classifier is not None, "Task classifier must be initialized"
            assert isinstance(matcher.capability_weights, dict), "Capability weights must be dict"
            assert isinstance(matcher.performance_cache, dict), "Performance cache must be dict"

            # Validate capability weights
            assert len(matcher.capability_weights) > 5, "Must have multiple capability weights"
            assert all(
                isinstance(w, (int, float)) for w in matcher.capability_weights.values()
            ), "All weights must be numeric"
            print("  ✅ CapabilityMatcher initialization works correctly")

        # Test 3: Capability weight initialization
        print("\n📋 Test 3: Capability Weight Configuration")

        with (
            patch("lib._tools.capability_matcher.get_discovery_service") as mock_discovery,
            patch("lib._tools.capability_matcher.get_task_analyzer") as mock_analyzer,
            patch("lib._tools.capability_matcher.get_task_classifier") as mock_classifier,
        ):
            mock_discovery.return_value = Mock()
            mock_analyzer.return_value = Mock()
            mock_classifier.return_value = Mock()

            matcher = CapabilityMatcher()
            weights = matcher._initialize_capability_weights()

            # Validate weights configuration
            assert isinstance(weights, dict), "Weights must be dictionary"
            assert "code_execution" in weights, "Must include code_execution weight"
            assert "data_analysis" in weights, "Must include data_analysis weight"
            assert "python" in weights, "Must include python weight"
            assert "machine_learning" in weights, "Must include machine_learning weight"

            # Validate weight values
            for weight in weights.values():
                assert isinstance(weight, (int, float)), "All weights must be numeric"
                assert 0 <= weight <= 2, "Weights must be in reasonable range"

            print("  ✅ Capability weight configuration works correctly")

        # Test 4: Performance score calculation
        print("\n📋 Test 4: Performance Score Calculation")

        with (
            patch("lib._tools.capability_matcher.get_discovery_service") as mock_discovery,
            patch("lib._tools.capability_matcher.get_task_analyzer") as mock_analyzer,
            patch("lib._tools.capability_matcher.get_task_classifier") as mock_classifier,
        ):
            mock_discovery.return_value = Mock()
            mock_analyzer.return_value = Mock()
            mock_classifier.return_value = Mock()

            # Import AgentCapability for testing
            try:
                from lib._tools.agent_discovery import AgentCapability
            except ImportError:
                # Create a mock AgentCapability if not available
                @dataclass
                class AgentCapability:
                    name: str
                    description: str
                    capabilities: List[str]
                    tools: List[str]
                    status: str
                    success_rate: float

            matcher = CapabilityMatcher()

            # Test different agent statuses
            test_agents = {
                "active": AgentCapability(
                    name="active_agent",
                    description="Active agent",
                    capabilities=["python"],
                    tools=[],
                    status="active",
                    success_rate=0.9,
                ),
                "offline": AgentCapability(
                    name="offline_agent",
                    description="Offline agent",
                    capabilities=["python"],
                    tools=[],
                    status="offline",
                    success_rate=0.0,
                ),
            }

            for status, agent in test_agents.items():
                score = matcher._calculate_performance_score(agent.name, agent)
                assert isinstance(score, float), f"Performance score must be float for {status}"
                assert 0 <= score <= 1, f"Performance score must be 0-1 for {status}"

                if status == "active":
                    assert score > 0.8, "Active agent should have high performance score"
                elif status == "offline":
                    assert score < 0.5, "Offline agent should have low performance score"

            print("  ✅ Performance score calculation works correctly")

        # Test 5: Availability score calculation
        print("\n📋 Test 5: Availability Score Calculation")

        with (
            patch("lib._tools.capability_matcher.get_discovery_service") as mock_discovery,
            patch("lib._tools.capability_matcher.get_task_analyzer") as mock_analyzer,
            patch("lib._tools.capability_matcher.get_task_classifier") as mock_classifier,
        ):
            mock_discovery.return_value = Mock()
            mock_analyzer.return_value = Mock()
            mock_classifier.return_value = Mock()

            matcher = CapabilityMatcher()

            # Test availability for different statuses
            statuses = ["active", "idle", "busy", "offline"]
            expected_scores = [1.0, 0.95, 0.6, 0.0]

            for status, expected in zip(statuses, expected_scores):
                agent = AgentCapability(
                    name=f"{status}_agent",
                    description=f"{status} agent",
                    capabilities=["test"],
                    tools=[],
                    status=status,
                    success_rate=1.0,
                )

                score = matcher._calculate_availability_score(agent.name, agent)
                assert isinstance(score, float), f"Availability score must be float for {status}"
                assert abs(score - expected) < 0.1, f"Availability score incorrect for {status}"

            print("  ✅ Availability score calculation works correctly")

        # Test 6: Coverage analysis
        print("\n📋 Test 6: Coverage Analysis")

        with (
            patch("lib._tools.capability_matcher.get_discovery_service") as mock_discovery,
            patch("lib._tools.capability_matcher.get_task_analyzer") as mock_analyzer,
            patch("lib._tools.capability_matcher.get_task_classifier") as mock_classifier,
        ):
            mock_discovery.return_value = Mock()
            mock_analyzer.return_value = Mock()
            mock_classifier.return_value = Mock()

            matcher = CapabilityMatcher()

            # Create test matches
            matches = [
                CapabilityMatch(
                    agent_name="agent1",
                    match_score=0.8,
                    matched_capabilities=["python", "data_analysis"],
                    missing_capabilities=["machine_learning"],
                    capability_coverage=0.67,
                    performance_score=0.9,
                    availability_score=0.95,
                    overall_score=0.85,
                    reasoning="Good match",
                ),
                CapabilityMatch(
                    agent_name="agent2",
                    match_score=0.6,
                    matched_capabilities=["machine_learning"],
                    missing_capabilities=["python", "data_analysis"],
                    capability_coverage=0.33,
                    performance_score=0.8,
                    availability_score=0.9,
                    overall_score=0.65,
                    reasoning="Partial match",
                ),
            ]

            required_capabilities = ["python", "data_analysis", "machine_learning"]
            coverage = matcher._analyze_coverage(matches, required_capabilities)

            # Validate coverage analysis
            assert isinstance(coverage, dict), "Coverage analysis must be dict"
            required_fields = [
                "total_coverage",
                "best_coverage",
                "uncovered_capabilities",
                "coverage_gaps",
            ]
            for field in required_fields:
                assert field in coverage, f"Coverage analysis must contain {field}"

            assert isinstance(coverage["total_coverage"], float), "Total coverage must be float"
            assert 0 <= coverage["total_coverage"] <= 1, "Total coverage must be 0-1"
            assert coverage["total_coverage"] > 0.5, "Should have good total coverage"

            print("  ✅ Coverage analysis works correctly")

        # Test 7: Performance cache functionality
        print("\n📋 Test 7: Performance Cache")

        with (
            patch("lib._tools.capability_matcher.get_discovery_service") as mock_discovery,
            patch("lib._tools.capability_matcher.get_task_analyzer") as mock_analyzer,
            patch("lib._tools.capability_matcher.get_task_classifier") as mock_classifier,
        ):
            mock_discovery.return_value = Mock()
            mock_analyzer.return_value = Mock()
            mock_classifier.return_value = Mock()

            matcher = CapabilityMatcher()

            # Test cache update
            matcher.update_performance_cache("test_agent", 0.85)

            assert "test_agent" in matcher.performance_cache, "Agent must be in performance cache"
            assert matcher.performance_cache["test_agent"] == 0.85, "Cache value must be correct"

            print("  ✅ Performance cache functionality works correctly")

        # Test 8: Global function
        print("\n📋 Test 8: Global Function")

        with (
            patch("lib._tools.capability_matcher.get_discovery_service") as mock_discovery,
            patch("lib._tools.capability_matcher.get_task_analyzer") as mock_analyzer,
            patch("lib._tools.capability_matcher.get_task_classifier") as mock_classifier,
        ):
            mock_discovery.return_value = Mock()
            mock_analyzer.return_value = Mock()
            mock_classifier.return_value = Mock()

            # Test singleton behavior
            matcher1 = get_capability_matcher()
            matcher2 = get_capability_matcher()

            assert isinstance(matcher1, CapabilityMatcher), "Must return CapabilityMatcher"
            assert isinstance(matcher2, CapabilityMatcher), "Must return CapabilityMatcher"
            assert matcher1 is matcher2, "Should return same instance (singleton)"

            print("  ✅ Global function works correctly")

        print("\n🎉 ALL TESTS PASSED!")
        print("=" * 60)
        print("✅ Capability Matcher: 8 functions validated")
        print("✅ Data classes: CapabilityMatch and MatchingResult work correctly")
        print("✅ Initialization: CapabilityMatcher setup works correctly")
        print("✅ Weight configuration: Capability weights properly configured")
        print("✅ Performance scoring: Agent performance calculation works")
        print("✅ Availability scoring: Agent availability calculation works")
        print("✅ Coverage analysis: Capability coverage analysis works")
        print("✅ Performance cache: Caching functionality works")
        print("✅ Global function: Singleton pattern works correctly")

        return True

    except Exception as e:
        print(f"\n❌ VALIDATION FAILED: {e}")
        import traceback

        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = validate_capability_matcher()
    sys.exit(0 if success else 1)
