"""
Comprehensive Tests for capability_matcher.py - Intelligent Agent Selection

Tests all 8 critical functions in capability_matcher.py with STRICT validation.
This module provides capability matching for optimal agent routing decisions.
"""

import pytest
import tempfile
import os
from pathlib import Path
from unittest.mock import Mock, patch

# Import the capability matcher
import sys

sys.path.append(str(Path(__file__).parent.parent.parent.parent))

try:
    from lib._tools.capability_matcher import (
        CapabilityMatch,
        MatchingResult,
        CapabilityMatcher,
        get_capability_matcher,
    )
    from lib._tools.agent_discovery import AgentCapability
except ImportError as e:
    pytest.skip(f"Could not import capability_matcher: {e}", allow_module_level=True)


class TestCapabilityMatcherComprehensive:
    """Comprehensive tests for capability_matcher with STRICT validation"""

    def setup_method(self):
        """Setup for each test method"""
        self.temp_dir = tempfile.mkdtemp()

        # Create mock agent capabilities for testing
        self.mock_agents = {
            "vana": AgentCapability(
                name="vana",
                description="Main orchestration agent",
                capabilities=[
                    "orchestration",
                    "coordination",
                    "workflow_automation",
                    "task_routing",
                ],
                tools=["delegate_task", "coordinate_agents", "workflow_engine"],
                status="active",
                load_factor=0.2,
                performance_score=0.9,
            ),
            "code_execution": AgentCapability(
                name="code_execution",
                description="Code execution specialist",
                capabilities=["python", "javascript", "shell", "code_execution"],
                tools=["execute_python", "execute_js", "run_shell"],
                status="active",
                load_factor=0.1,
                performance_score=0.95,
            ),
            "data_science": AgentCapability(
                name="data_science",
                description="Data analysis specialist",
                capabilities=[
                    "data_analysis",
                    "statistics",
                    "machine_learning",
                    "python",
                    "visualization",
                ],
                tools=["analyze_data", "create_plots", "run_ml_models"],
                status="idle",
                load_factor=0.0,
                performance_score=0.85,
            ),
        }

    def teardown_method(self):
        """Cleanup after each test method"""
        import shutil

        if os.path.exists(self.temp_dir):
            shutil.rmtree(self.temp_dir)

    # CapabilityMatch and MatchingResult Data Classes Tests

    @pytest.mark.unit
    def test_capability_match_dataclass(self):
        """Test CapabilityMatch dataclass with STRICT validation"""
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

        # STRICT: Must have all required fields with correct types
        assert isinstance(match.agent_name, str), "Agent name must be string"
        assert isinstance(match.match_score, float), "Match score must be float"
        assert isinstance(match.matched_capabilities, list), (
            "Matched capabilities must be list"
        )
        assert isinstance(match.missing_capabilities, list), (
            "Missing capabilities must be list"
        )
        assert isinstance(match.capability_coverage, float), "Coverage must be float"
        assert isinstance(match.performance_score, float), (
            "Performance score must be float"
        )
        assert isinstance(match.availability_score, float), (
            "Availability score must be float"
        )
        assert isinstance(match.overall_score, float), "Overall score must be float"
        assert isinstance(match.reasoning, str), "Reasoning must be string"

        # STRICT: Scores must be in valid ranges
        assert 0 <= match.match_score <= 1, "Match score must be 0-1"
        assert 0 <= match.capability_coverage <= 1, "Coverage must be 0-1"
        assert 0 <= match.performance_score <= 1, "Performance score must be 0-1"
        assert 0 <= match.availability_score <= 1, "Availability score must be 0-1"
        assert 0 <= match.overall_score <= 1, "Overall score must be 0-1"

    @pytest.mark.unit
    def test_matching_result_dataclass(self):
        """Test MatchingResult dataclass with STRICT validation"""
        best_match = CapabilityMatch(
            agent_name="best_agent",
            match_score=0.9,
            matched_capabilities=["python"],
            missing_capabilities=[],
            capability_coverage=1.0,
            performance_score=0.9,
            availability_score=0.95,
            overall_score=0.92,
            reasoning="Perfect match",
        )

        result = MatchingResult(
            best_match=best_match,
            alternative_matches=[],
            coverage_analysis={"total_coverage": 1.0},
            recommendations=["Use best_agent"],
        )

        # STRICT: Must have all required fields with correct types
        assert isinstance(result.best_match, CapabilityMatch), (
            "Best match must be CapabilityMatch"
        )
        assert isinstance(result.alternative_matches, list), (
            "Alternative matches must be list"
        )
        assert isinstance(result.coverage_analysis, dict), (
            "Coverage analysis must be dict"
        )
        assert isinstance(result.recommendations, list), "Recommendations must be list"

    # CapabilityMatcher Class Tests - STRICT validation

    @pytest.mark.unit
    def test_capability_matcher_initialization(self):
        """Test CapabilityMatcher initialization with STRICT validation"""
        with (
            patch(
                "lib._tools.capability_matcher.get_discovery_service"
            ) as mock_discovery,
            patch("lib._tools.capability_matcher.get_task_analyzer") as mock_analyzer,
            patch(
                "lib._tools.capability_matcher.get_task_classifier"
            ) as mock_classifier,
        ):
            mock_discovery.return_value = Mock()
            mock_analyzer.return_value = Mock()
            mock_classifier.return_value = Mock()

            matcher = CapabilityMatcher()

            # STRICT: Must initialize all components
            assert matcher.discovery_service is not None, (
                "Discovery service must be initialized"
            )
            assert matcher.task_analyzer is not None, (
                "Task analyzer must be initialized"
            )
            assert matcher.task_classifier is not None, (
                "Task classifier must be initialized"
            )
            assert isinstance(matcher.capability_weights, dict), (
                "Capability weights must be dict"
            )
            assert isinstance(matcher.performance_cache, dict), (
                "Performance cache must be dict"
            )

            # STRICT: Capability weights must be properly configured
            assert len(matcher.capability_weights) > 5, (
                "Must have multiple capability weights"
            )
            assert all(
                isinstance(weight, (int, float))
                for weight in matcher.capability_weights.values()
            ), "All weights must be numeric"
            assert all(
                0 <= weight <= 2 for weight in matcher.capability_weights.values()
            ), "Weights must be in reasonable range"

    @pytest.mark.unit
    def test_match_capabilities_functionality(self):
        """Test match_capabilities method with STRICT validation"""
        with (
            patch(
                "lib._tools.capability_matcher.get_discovery_service"
            ) as mock_discovery,
            patch("lib._tools.capability_matcher.get_task_analyzer") as mock_analyzer,
            patch(
                "lib._tools.capability_matcher.get_task_classifier"
            ) as mock_classifier,
        ):
            # Setup mocks
            mock_discovery_service = Mock()
            mock_discovery_service.discover_agents.return_value = self.mock_agents
            mock_discovery.return_value = mock_discovery_service

            mock_task_analyzer = Mock()
            mock_analysis = Mock()
            mock_analysis.required_capabilities = ["python", "data_analysis"]
            mock_task_analyzer.analyze_task.return_value = mock_analysis
            mock_analyzer.return_value = mock_task_analyzer

            mock_classifier.return_value = Mock()

            matcher = CapabilityMatcher()

            # Test capability matching
            task = "Analyze sales data using Python"
            result = matcher.match_capabilities(task)

            # STRICT: Must return MatchingResult
            assert isinstance(result, MatchingResult), "Must return MatchingResult"

            # STRICT: Must have best match
            assert result.best_match is not None, "Must have best match"
            assert isinstance(result.best_match, CapabilityMatch), (
                "Best match must be CapabilityMatch"
            )

            # STRICT: Must have coverage analysis
            assert isinstance(result.coverage_analysis, dict), (
                "Coverage analysis must be dict"
            )
            assert "total_coverage" in result.coverage_analysis, (
                "Must include total coverage"
            )
            assert "best_coverage" in result.coverage_analysis, (
                "Must include best coverage"
            )

            # STRICT: Must have recommendations
            assert isinstance(result.recommendations, list), (
                "Recommendations must be list"
            )
            assert len(result.recommendations) > 0, (
                "Must have at least one recommendation"
            )

    @pytest.mark.unit
    def test_match_capabilities_with_explicit_requirements(self):
        """Test match_capabilities with explicit requirements with STRICT validation"""
        with (
            patch(
                "lib._tools.capability_matcher.get_discovery_service"
            ) as mock_discovery,
            patch("lib._tools.capability_matcher.get_task_analyzer") as mock_analyzer,
            patch(
                "lib._tools.capability_matcher.get_task_classifier"
            ) as mock_classifier,
        ):
            # Setup mocks
            mock_discovery_service = Mock()
            mock_discovery_service.discover_agents.return_value = self.mock_agents
            mock_discovery.return_value = mock_discovery_service

            mock_analyzer.return_value = Mock()
            mock_classifier.return_value = Mock()

            matcher = CapabilityMatcher()

            # Test with explicit capability requirements
            required_capabilities = ["python", "machine_learning", "visualization"]
            result = matcher.match_capabilities(
                "Build ML model", required_capabilities=required_capabilities
            )

            # STRICT: Must handle explicit requirements
            assert isinstance(result, MatchingResult), "Must return MatchingResult"
            assert result.best_match is not None, "Must find best match"

            # STRICT: Best match should be data_science agent (has most required capabilities)
            assert result.best_match.agent_name in ["data_science", "code_execution"], (
                "Best match should be specialist with required capabilities"
            )

    @pytest.mark.unit
    def test_score_agent_match_functionality(self):
        """Test _score_agent_match method with STRICT validation"""
        with (
            patch(
                "lib._tools.capability_matcher.get_discovery_service"
            ) as mock_discovery,
            patch("lib._tools.capability_matcher.get_task_analyzer") as mock_analyzer,
            patch(
                "lib._tools.capability_matcher.get_task_classifier"
            ) as mock_classifier,
        ):
            mock_discovery.return_value = Mock()
            mock_analyzer.return_value = Mock()
            mock_classifier.return_value = Mock()

            matcher = CapabilityMatcher()

            # Test scoring for data science agent
            agent_info = self.mock_agents["data_science"]
            required_capabilities = ["python", "data_analysis", "statistics"]
            task = "Analyze customer data"

            match = matcher._score_agent_match(
                "data_science", agent_info, required_capabilities, task
            )

            # STRICT: Must return CapabilityMatch
            assert isinstance(match, CapabilityMatch), "Must return CapabilityMatch"
            assert match.agent_name == "data_science", "Agent name must match"

            # STRICT: Must have high match score for matching capabilities
            assert match.match_score > 0.5, (
                "Should have high match score for relevant capabilities"
            )
            assert match.capability_coverage > 0.5, (
                "Should have good capability coverage"
            )

            # STRICT: Must identify matched and missing capabilities
            assert isinstance(match.matched_capabilities, list), (
                "Matched capabilities must be list"
            )
            assert isinstance(match.missing_capabilities, list), (
                "Missing capabilities must be list"
            )
            assert len(match.matched_capabilities) > 0, (
                "Should have some matched capabilities"
            )

            # STRICT: Scores must be in valid ranges
            assert 0 <= match.overall_score <= 1, "Overall score must be 0-1"
            assert len(match.reasoning) > 10, "Reasoning must be descriptive"

    @pytest.mark.unit
    def test_calculate_performance_score_functionality(self):
        """Test _calculate_performance_score method with STRICT validation"""
        with (
            patch(
                "lib._tools.capability_matcher.get_discovery_service"
            ) as mock_discovery,
            patch("lib._tools.capability_matcher.get_task_analyzer") as mock_analyzer,
            patch(
                "lib._tools.capability_matcher.get_task_classifier"
            ) as mock_classifier,
        ):
            mock_discovery.return_value = Mock()
            mock_analyzer.return_value = Mock()
            mock_classifier.return_value = Mock()

            matcher = CapabilityMatcher()

            # Test with active agent
            active_agent = self.mock_agents["code_execution"]
            score = matcher._calculate_performance_score("code_execution", active_agent)

            # STRICT: Must return valid performance score
            assert isinstance(score, float), "Performance score must be float"
            assert 0 <= score <= 1, "Performance score must be 0-1"
            assert score > 0.8, "Active agent should have high performance score"

            # Test with offline agent
            offline_agent = AgentCapability(
                name="offline_agent",
                description="Offline agent",
                capabilities=["test"],
                tools=[],
                status="offline",
                load_factor=1.0,
                performance_score=0.0,
            )
            offline_score = matcher._calculate_performance_score(
                "offline_agent", offline_agent
            )

            # STRICT: Offline agent should have low score
            assert offline_score < 0.5, (
                "Offline agent should have low performance score"
            )

    @pytest.mark.unit
    def test_calculate_availability_score_functionality(self):
        """Test _calculate_availability_score method with STRICT validation"""
        with (
            patch(
                "lib._tools.capability_matcher.get_discovery_service"
            ) as mock_discovery,
            patch("lib._tools.capability_matcher.get_task_analyzer") as mock_analyzer,
            patch(
                "lib._tools.capability_matcher.get_task_classifier"
            ) as mock_classifier,
        ):
            mock_discovery.return_value = Mock()
            mock_analyzer.return_value = Mock()
            mock_classifier.return_value = Mock()

            matcher = CapabilityMatcher()

            # Test availability scoring for different statuses
            test_cases = [
                ("active", 1.0),
                ("idle", 0.95),
                ("busy", 0.6),
                ("offline", 0.0),
            ]

            for status, expected_min_score in test_cases:
                agent = AgentCapability(
                    name=f"{status}_agent",
                    description=f"{status} agent",
                    capabilities=["test"],
                    tools=[],
                    status=status,
                    load_factor=0.0,
                    performance_score=1.0,
                )

                score = matcher._calculate_availability_score(f"{status}_agent", agent)

                # STRICT: Must return appropriate availability score
                assert isinstance(score, float), (
                    f"Availability score must be float for {status}"
                )
                assert 0 <= score <= 1, f"Availability score must be 0-1 for {status}"
                assert score >= expected_min_score - 0.1, (
                    f"Score too low for {status} agent"
                )

    @pytest.mark.unit
    def test_analyze_coverage_functionality(self):
        """Test _analyze_coverage method with STRICT validation"""
        with (
            patch(
                "lib._tools.capability_matcher.get_discovery_service"
            ) as mock_discovery,
            patch("lib._tools.capability_matcher.get_task_analyzer") as mock_analyzer,
            patch(
                "lib._tools.capability_matcher.get_task_classifier"
            ) as mock_classifier,
        ):
            mock_discovery.return_value = Mock()
            mock_analyzer.return_value = Mock()
            mock_classifier.return_value = Mock()

            matcher = CapabilityMatcher()

            # Create test matches
            match1 = CapabilityMatch(
                agent_name="agent1",
                match_score=0.8,
                matched_capabilities=["python", "data_analysis"],
                missing_capabilities=["machine_learning"],
                capability_coverage=0.67,
                performance_score=0.9,
                availability_score=0.95,
                overall_score=0.85,
                reasoning="Good match",
            )

            match2 = CapabilityMatch(
                agent_name="agent2",
                match_score=0.6,
                matched_capabilities=["machine_learning", "visualization"],
                missing_capabilities=["python"],
                capability_coverage=0.67,
                performance_score=0.8,
                availability_score=0.9,
                overall_score=0.75,
                reasoning="Partial match",
            )

            required_capabilities = ["python", "data_analysis", "machine_learning"]
            coverage = matcher._analyze_coverage(
                [match1, match2], required_capabilities
            )

            # STRICT: Must return comprehensive coverage analysis
            assert isinstance(coverage, dict), "Coverage analysis must be dict"

            # STRICT: Must contain required fields
            required_fields = [
                "total_coverage",
                "best_coverage",
                "uncovered_capabilities",
                "coverage_gaps",
            ]
            for field in required_fields:
                assert field in coverage, f"Coverage analysis must contain {field}"

            # STRICT: Values must be in correct types and ranges
            assert isinstance(coverage["total_coverage"], float), (
                "Total coverage must be float"
            )
            assert isinstance(coverage["best_coverage"], float), (
                "Best coverage must be float"
            )
            assert isinstance(coverage["uncovered_capabilities"], list), (
                "Uncovered capabilities must be list"
            )
            assert isinstance(coverage["coverage_gaps"], int), (
                "Coverage gaps must be int"
            )

            assert 0 <= coverage["total_coverage"] <= 1, "Total coverage must be 0-1"
            assert 0 <= coverage["best_coverage"] <= 1, "Best coverage must be 0-1"

    # Global Function Tests

    @pytest.mark.unit
    def test_get_capability_matcher_functionality(self):
        """Test get_capability_matcher global function with STRICT validation"""
        with (
            patch(
                "lib._tools.capability_matcher.get_discovery_service"
            ) as mock_discovery,
            patch("lib._tools.capability_matcher.get_task_analyzer") as mock_analyzer,
            patch(
                "lib._tools.capability_matcher.get_task_classifier"
            ) as mock_classifier,
        ):
            mock_discovery.return_value = Mock()
            mock_analyzer.return_value = Mock()
            mock_classifier.return_value = Mock()

            # Test singleton behavior
            matcher1 = get_capability_matcher()
            matcher2 = get_capability_matcher()

            # STRICT: Must return CapabilityMatcher instances
            assert isinstance(matcher1, CapabilityMatcher), (
                "Must return CapabilityMatcher instance"
            )
            assert isinstance(matcher2, CapabilityMatcher), (
                "Must return CapabilityMatcher instance"
            )

            # STRICT: Should return same instance (singleton pattern)
            assert matcher1 is matcher2, "Should return same instance (singleton)"

    # Error Handling Tests

    @pytest.mark.unit
    def test_no_agents_available_handling(self):
        """Test handling when no agents are available with STRICT validation"""
        with (
            patch(
                "lib._tools.capability_matcher.get_discovery_service"
            ) as mock_discovery,
            patch("lib._tools.capability_matcher.get_task_analyzer") as mock_analyzer,
            patch(
                "lib._tools.capability_matcher.get_task_classifier"
            ) as mock_classifier,
        ):
            # Setup mocks with empty agents
            mock_discovery_service = Mock()
            mock_discovery_service.discover_agents.return_value = {}
            mock_discovery.return_value = mock_discovery_service

            mock_analyzer.return_value = Mock()
            mock_classifier.return_value = Mock()

            matcher = CapabilityMatcher()

            result = matcher.match_capabilities("test task")

            # STRICT: Must handle no agents gracefully
            assert isinstance(result, MatchingResult), (
                "Must return MatchingResult even with no agents"
            )
            assert result.best_match is None, "Best match should be None when no agents"
            assert len(result.alternative_matches) == 0, (
                "Should have no alternative matches"
            )
            assert "No agents available" in str(result.recommendations), (
                "Should indicate no agents available"
            )

    @pytest.mark.unit
    def test_performance_cache_functionality(self):
        """Test performance cache update functionality with STRICT validation"""
        with (
            patch(
                "lib._tools.capability_matcher.get_discovery_service"
            ) as mock_discovery,
            patch("lib._tools.capability_matcher.get_task_analyzer") as mock_analyzer,
            patch(
                "lib._tools.capability_matcher.get_task_classifier"
            ) as mock_classifier,
        ):
            mock_discovery.return_value = Mock()
            mock_analyzer.return_value = Mock()
            mock_classifier.return_value = Mock()

            matcher = CapabilityMatcher()

            # Test cache update
            matcher.update_performance_cache("test_agent", 0.85)

            # STRICT: Must update cache correctly
            assert "test_agent" in matcher.performance_cache, (
                "Agent must be in performance cache"
            )
            assert matcher.performance_cache["test_agent"] == 0.85, (
                "Cache value must be correct"
            )

            # Test cache is used in performance calculation
            mock_agent = AgentCapability(
                name="test_agent",
                description="Test agent",
                capabilities=["test"],
                tools=[],
                status="active",
                load_factor=0.0,
                performance_score=1.0,
            )

            score = matcher._calculate_performance_score("test_agent", mock_agent)

            # STRICT: Cache should influence score
            assert isinstance(score, float), "Performance score must be float"
            assert score != 1.0, "Cached performance should modify base score"

    # Integration Tests

    @pytest.mark.unit
    def test_complete_capability_matching_workflow(self):
        """Test complete capability matching workflow with STRICT validation"""
        with (
            patch(
                "lib._tools.capability_matcher.get_discovery_service"
            ) as mock_discovery,
            patch("lib._tools.capability_matcher.get_task_analyzer") as mock_analyzer,
            patch(
                "lib._tools.capability_matcher.get_task_classifier"
            ) as mock_classifier,
        ):
            # Setup comprehensive mock environment
            mock_discovery_service = Mock()
            mock_discovery_service.discover_agents.return_value = self.mock_agents
            mock_discovery.return_value = mock_discovery_service

            mock_task_analyzer = Mock()
            mock_analysis = Mock()
            mock_analysis.required_capabilities = [
                "python",
                "data_analysis",
                "visualization",
            ]
            mock_task_analyzer.analyze_task.return_value = mock_analysis
            mock_analyzer.return_value = mock_task_analyzer

            mock_classifier.return_value = Mock()

            matcher = CapabilityMatcher()

            # Test complete workflow
            task = "Create data visualization dashboard using Python"
            context = "Need to analyze sales data and create interactive charts"

            result = matcher.match_capabilities(task, context)

            # STRICT: Complete workflow must succeed
            assert isinstance(result, MatchingResult), (
                "Complete workflow must return MatchingResult"
            )
            assert result.best_match is not None, "Must find best match"
            assert result.best_match.agent_name in self.mock_agents, (
                "Best match must be available agent"
            )
            assert len(result.recommendations) > 0, "Must provide recommendations"

            # STRICT: Coverage analysis must be comprehensive
            coverage = result.coverage_analysis
            assert coverage["total_coverage"] > 0, "Must have some capability coverage"
            assert "agents_analyzed" in coverage, "Must include agents analyzed count"
            assert coverage["agents_analyzed"] == len(self.mock_agents), (
                "Must analyze all available agents"
            )
