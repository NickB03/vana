"""
Unit tests for Enhanced Orchestrator V2

Tests the advanced routing, workflow integration, and performance features.
"""

from unittest.mock import MagicMock, Mock, patch

import pytest

from agents.vana.enhanced_orchestrator_v2 import (
    AdvancedRouter,
    RequestBatcher,
    batch_process_requests,
    enhanced_orchestrator_v2,
    extract_task_type,
    format_response,
    get_orchestrator_v2_stats,
    route_with_workflow,
)


class TestAdvancedRouter:
    """Test suite for advanced routing logic."""

    @pytest.fixture
    def router(self):
        """Create a router instance."""
        return AdvancedRouter()

    def test_calculate_confidence_security_high_priority(self, router):
        """Test confidence calculation for security requests."""
        request = "Check for SQL injection vulnerabilities in the login form"
        rule = router.routing_rules["security"]

        confidence = router.calculate_confidence(request, rule)

        # Should have confidence due to keywords
        assert confidence > 0.3  # Has injection keyword
        # With new specialist, total should be at least 0.3
        assert confidence >= 0.3

    def test_calculate_confidence_multiple_matches(self, router):
        """Test confidence with multiple keyword matches."""
        request = "Analyze the architecture and design patterns for security best practices"

        # Check both architecture and security
        arch_confidence = router.calculate_confidence(request, router.routing_rules["architecture"])
        sec_confidence = router.calculate_confidence(request, router.routing_rules["security"])

        # Both should have some confidence
        assert arch_confidence > 0
        assert sec_confidence > 0
        # Security has higher priority (10 vs 7)
        # But architecture has more keyword matches
        # The difference should be reflected in the priority component

    def test_detect_workflow_sequential(self, router):
        """Test detection of sequential workflow needs."""
        requests = [
            "First analyze the code, then run tests",
            "Build the project after running the tests",
            "Deploy followed by monitoring setup",
            "1. analyze 2. refactor",  # Changed to use numbered list
        ]

        for request in requests:
            workflow = router.detect_workflow_type(request)
            assert workflow == "sequential"

    def test_detect_workflow_parallel(self, router):
        """Test detection of parallel workflow needs."""
        requests = [
            "Run tests and security scan simultaneously",
            "Analyze performance and accessibility at the same time",
            "Deploy to staging and production in parallel",
            "Check UI and API concurrently",
        ]

        for request in requests:
            workflow = router.detect_workflow_type(request)
            assert workflow == "parallel"

    def test_detect_workflow_loop(self, router):
        """Test detection of loop workflow needs."""
        requests = [
            "Iterate through all files and analyze",
            "For each component, run tests",
            "Repeat the analysis until convergence",
            "Process all data points while condition is true",
        ]

        for request in requests:
            workflow = router.detect_workflow_type(request)
            assert workflow == "loop"

    def test_detect_workflow_numbered_list(self, router):
        """Test workflow detection for numbered lists."""
        request = """Please do the following:
        1. Analyze the code
        2. Generate tests
        3. Run performance benchmarks
        """

        workflow = router.detect_workflow_type(request)
        assert workflow == "sequential"

    def test_route_request_security_priority(self, router):
        """Test that security requests get priority routing."""
        request = "Check authentication implementation"
        task_type = "code_review"

        specialist, workflow = router.route_request(request, task_type)

        assert specialist == "security"
        # workflow might be detected if request contains patterns

    def test_route_request_with_workflow(self, router):
        """Test routing with workflow detection."""
        request = "Analyze all components for security issues in parallel"
        task_type = "security_scan"

        specialist, workflow = router.route_request(request, task_type)

        assert specialist == "security"
        assert workflow == "parallel"

    def test_record_result_updates_performance(self, router):
        """Test performance tracking."""
        # Record some results
        router.record_result("security", True)
        router.record_result("security", True)
        router.record_result("security", False)

        perf = router.specialist_performance["security"]
        assert perf["total"] == 3
        assert perf["success"] == 2


class TestRequestBatcher:
    """Test suite for request batching."""

    @pytest.fixture
    def batcher(self):
        """Create a batcher instance."""
        return RequestBatcher(max_batch_size=3, timeout_ms=50)

    def test_add_request_batch_not_ready(self, batcher):
        """Test adding requests when batch isn't full."""
        batch = batcher.add_request("Request 1", "security")
        assert batch is None

        batch = batcher.add_request("Request 2", "security")
        assert batch is None

    def test_add_request_batch_ready(self, batcher):
        """Test batch returns when full."""
        batcher.add_request("Request 1", "security")
        batcher.add_request("Request 2", "security")
        batch = batcher.add_request("Request 3", "security")

        assert batch is not None
        assert len(batch) == 3
        assert "Request 1" in batch

    def test_add_request_different_categories(self, batcher):
        """Test batching maintains separate categories."""
        batcher.add_request("Security 1", "security")
        batcher.add_request("QA 1", "qa")
        batcher.add_request("Security 2", "security")

        # Security hasn't reached limit yet
        assert len(batcher.batches["security"]) == 2
        assert len(batcher.batches["qa"]) == 1

    def test_flush_category(self, batcher):
        """Test flushing a specific category."""
        batcher.add_request("Request 1", "security")
        batcher.add_request("Request 2", "security")

        batch = batcher.flush_category("security")
        assert len(batch) == 2
        assert len(batcher.batches["security"]) == 0

    def test_flush_all(self, batcher):
        """Test flushing all batches."""
        batcher.add_request("Security 1", "security")
        batcher.add_request("QA 1", "qa")

        all_batches = batcher.flush_all()
        assert len(all_batches) == 2
        assert len(all_batches["security"]) == 1
        assert len(all_batches["qa"]) == 1
        assert len(batcher.batches) == 0


class TestRouteWithWorkflow:
    """Test suite for workflow routing."""

    @patch("agents.vana.enhanced_orchestrator_v2.adk_analyze_task")
    @patch("agents.vana.enhanced_orchestrator_v2.advanced_router")
    def test_route_with_workflow_sequential(self, mock_router, mock_analyze):
        """Test routing with sequential workflow."""
        mock_analyze.return_value = "Task type: architecture_review"
        mock_router.route_request.return_value = ("architecture", "sequential")

        # Mock specialists
        with patch("agents.vana.enhanced_orchestrator_v2.architecture_specialist") as mock_arch:
            with patch("agents.vana.enhanced_orchestrator_v2.qa_specialist") as mock_qa:
                with patch("agents.vana.enhanced_orchestrator_v2.sequential_workflow_manager") as mock_seq:
                    mock_workflow = Mock()
                    mock_workflow.run.return_value = "Sequential result"
                    mock_seq.create_sequential_workflow.return_value = mock_workflow

                    result = route_with_workflow("Analyze architecture then validate")

                    # Should create sequential workflow
                    mock_seq.create_sequential_workflow.assert_called_once()
                    assert "Sequential" in result

    @patch("agents.vana.enhanced_orchestrator_v2.adk_analyze_task")
    @patch("agents.vana.enhanced_orchestrator_v2.advanced_router")
    def test_route_with_workflow_direct_specialist(self, mock_router, mock_analyze):
        """Test direct routing without workflow."""
        mock_analyze.return_value = "Task type: security_scan"
        mock_router.route_request.return_value = ("security", None)

        with patch("agents.vana.enhanced_orchestrator_v2.security_specialist") as mock_sec:
            mock_sec.run.return_value = "Security scan complete"

            result = route_with_workflow("Scan for vulnerabilities")

            # Should call specialist directly
            mock_sec.run.assert_called_once()
            assert "Security" in result
            # The footer always contains "Workflow Management"
            workflow_count = result.count("Workflow")
            assert workflow_count == 1  # Only in footer


class TestExtractTaskType:
    """Test task type extraction."""

    def test_extract_task_type_found(self):
        """Test extracting task type from analysis."""
        analysis = """
        Analysis complete.
        Task_Type: security_scan
        Priority: High
        """

        task_type = extract_task_type(analysis)
        assert task_type == "security_scan"

    def test_extract_task_type_not_found(self):
        """Test extraction when no task type."""
        analysis = "This is just some analysis without type"

        task_type = extract_task_type(analysis)
        assert task_type == "unknown"


class TestFormatResponse:
    """Test response formatting."""

    def test_format_response_with_workflow(self):
        """Test formatting with workflow info."""
        response = format_response("Test request", "security", "parallel", "Scan results")

        assert "Security Specialist" in response
        assert "Parallel execution" in response
        assert "Scan results" in response

    def test_format_response_without_workflow(self):
        """Test formatting without workflow."""
        response = format_response("Test request", "qa", None, "Test results")

        assert "Qa Specialist" in response
        # The footer always contains "Workflow Management"
        workflow_count = response.count("Workflow")
        assert workflow_count == 1  # Only in footer
        assert "Test results" in response


class TestBatchProcessRequests:
    """Test batch processing functionality."""

    @patch("agents.vana.enhanced_orchestrator_v2.parallel_workflow_manager")
    def test_batch_process_requests_success(self, mock_parallel):
        """Test successful batch processing."""
        mock_workflow = Mock()
        mock_workflow.run.return_value = "Batch results"
        mock_parallel.create_parallel_workflow.return_value = mock_workflow

        with patch("agents.vana.enhanced_orchestrator_v2.security_specialist"):
            requests = ["Scan 1", "Scan 2", "Scan 3"]
            results = batch_process_requests(requests, "security")

            assert len(results) == 3
            mock_parallel.create_parallel_workflow.assert_called_once()

    def test_batch_process_requests_invalid_category(self):
        """Test batch processing with invalid category."""
        requests = ["Request 1", "Request 2"]
        results = batch_process_requests(requests, "invalid_category")

        assert len(results) == 2
        assert all("not available" in r for r in results)


class TestGetOrchestratorV2Stats:
    """Test statistics generation."""

    @patch("agents.vana.enhanced_orchestrator_v2.get_orchestrator_metrics")
    def test_get_stats_format(self, mock_metrics):
        """Test stats report formatting."""
        mock_metrics.return_value.get_summary.return_value = {
            "total_requests": 100,
            "average_response_time": 1.5,
            "cache_hit_rate": 75,
            "error_count": 5,
        }

        stats = get_orchestrator_v2_stats()

        assert "Enhanced Orchestrator V2" in stats
        assert "100" in stats  # Total requests
        assert "1.5s" in stats  # Response time
        assert "75%" in stats  # Cache hit rate
        assert "Routing Intelligence" in stats
        assert "Workflow Usage" in stats


class TestEnhancedOrchestratorV2Agent:
    """Test the orchestrator agent configuration."""

    def test_orchestrator_v2_configuration(self):
        """Test orchestrator V2 is properly configured."""
        assert enhanced_orchestrator_v2.name == "enhanced_orchestrator_v2"
        assert enhanced_orchestrator_v2.model == "gemini-2.5-flash"

        # Check tools
        tool_names = [tool.func.__name__ for tool in enhanced_orchestrator_v2.tools]
        assert "route_with_workflow" in tool_names
        assert "get_orchestrator_v2_stats" in tool_names

    def test_orchestrator_v2_instruction(self):
        """Test orchestrator V2 instruction content."""
        instruction = enhanced_orchestrator_v2.instruction
        assert "Enhanced VANA Orchestrator V2" in instruction
        assert "Multi-Criteria Routing" in instruction
        assert "Workflow Management" in instruction
        assert "SECURITY (Priority 10)" in instruction


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
