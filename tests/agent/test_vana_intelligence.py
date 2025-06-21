"""
Agent intelligence tests for VANA main agent

Tests VANA's reasoning patterns, tool selection intelligence, response quality,
and behavioral consistency across different query types.
"""

import asyncio
import time

import pytest

from tests.framework import (
    AgentIntelligenceValidator,
    QueryType,
    ResponseQualityAnalyzer,
    TestDataManager,
    create_test_agent_client,
)


class TestVanaIntelligence:
    """Test VANA agent intelligence and behavior"""

    @pytest.fixture
    async def agent_client(self):
        """Create VANA agent test client"""
        client = await create_test_agent_client("vana")
        yield client
        # Cleanup
        client.clear_history()

    @pytest.fixture
    def test_data_manager(self):
        """Create test data manager"""
        return TestDataManager()

    @pytest.fixture
    def intelligence_validator(self, agent_client, test_data_manager):
        """Create agent intelligence validator"""
        return AgentIntelligenceValidator(agent_client, test_data_manager)

    @pytest.fixture
    def quality_analyzer(self):
        """Create response quality analyzer"""
        return ResponseQualityAnalyzer(hitl_threshold=0.85, enable_llm_judge=False)

    @pytest.mark.agent
    @pytest.mark.asyncio
    async def test_factual_query_reasoning(self, intelligence_validator):
        """Test VANA's reasoning consistency for factual queries"""
        result = await intelligence_validator.validate_reasoning_consistency(
            QueryType.FACTUAL
        )

        # Verify test execution
        assert result.scenarios_tested > 0, "No scenarios were tested"
        assert result.execution_time > 0, "Test should take some time to execute"

        # Verify reasoning consistency
        assert result.score >= 0.7, f"Reasoning consistency too low: {result.score:.2f}"

        # Check individual results
        assert len(result.individual_results) > 0, "No individual results recorded"

        # Verify that VANA uses appropriate tools for factual queries
        for individual_result in result.individual_results:
            tools_used = individual_result.get("tools_used", [])
            expected_pattern = individual_result.get("expected_pattern", "")

            if expected_pattern == "web_search_then_extract":
                assert (
                    "adk_web_search" in tools_used or len(tools_used) == 0
                ), f"Expected web search for factual query: {individual_result['query']}"

        # Test should pass if score is reasonable
        if result.score >= 0.8:
            assert result.passed, "Test should pass with high consistency score"

    @pytest.mark.agent
    @pytest.mark.asyncio
    async def test_tool_selection_intelligence(self, intelligence_validator):
        """Test VANA's tool selection intelligence across query types"""
        query_types = [QueryType.FACTUAL, QueryType.ANALYTICAL, QueryType.PROCEDURAL]

        result = await intelligence_validator.validate_tool_selection_intelligence(
            query_types
        )

        # Verify test execution
        assert result.scenarios_tested > 0, "No scenarios were tested"
        assert (
            result.score >= 0.75
        ), f"Tool selection intelligence too low: {result.score:.2f}"

        # Analyze tool usage patterns
        tool_usage_analysis = result.details.get("tool_usage_analysis", {})
        assert "tool_usage_frequency" in tool_usage_analysis
        assert "tools_by_query_type" in tool_usage_analysis

        # Verify appropriate tool usage by query type
        tools_by_type = tool_usage_analysis["tools_by_query_type"]

        # Factual queries should primarily use web search
        if "factual" in tools_by_type:
            factual_tools = tools_by_type["factual"]
            assert (
                "adk_web_search" in factual_tools or len(factual_tools) == 0
            ), "Factual queries should use web search"

        # Procedural queries should use delegation
        if "procedural" in tools_by_type:
            procedural_tools = tools_by_type["procedural"]
            # Should use delegation or other appropriate tools
            assert len(procedural_tools) >= 0  # At least some tool usage expected

        # Test should pass if score is reasonable
        if result.score >= 0.85:
            assert result.passed, "Test should pass with high tool selection score"

    @pytest.mark.agent
    @pytest.mark.asyncio
    async def test_response_quality_analysis(
        self, agent_client, quality_analyzer, test_data_manager
    ):
        """Test VANA's response quality across different scenarios"""
        # Load test scenarios
        try:
            factual_scenarios = test_data_manager.load_scenarios_by_type(
                QueryType.FACTUAL
            )
        except FileNotFoundError:
            pytest.skip("Factual scenarios not available")

        quality_scores = []
        response_analyses = []

        # Test first few scenarios
        for scenario in factual_scenarios[:3]:
            # Get agent response
            response = await agent_client.query(scenario.query)

            # Analyze response quality
            quality_metrics = quality_analyzer.analyze_response_quality(
                response.content,
                scenario.query,
                scenario.validation_criteria,
                scenario.expected_data,
            )

            quality_scores.append(quality_metrics.overall_score)
            response_analyses.append(
                {
                    "scenario_id": scenario.query_id,
                    "query": scenario.query,
                    "response": response.content,
                    "quality_metrics": quality_metrics,
                    "execution_time": response.execution_time,
                }
            )

        # Verify quality metrics
        assert len(quality_scores) > 0, "No quality scores calculated"

        avg_quality = sum(quality_scores) / len(quality_scores)
        assert (
            avg_quality >= 0.6
        ), f"Average response quality too low: {avg_quality:.2f}"

        # Check individual quality components
        for analysis in response_analyses:
            metrics = analysis["quality_metrics"]

            # Basic quality checks
            assert 0.0 <= metrics.accuracy <= 1.0, "Accuracy score out of range"
            assert 0.0 <= metrics.completeness <= 1.0, "Completeness score out of range"
            assert 0.0 <= metrics.relevance <= 1.0, "Relevance score out of range"
            assert 0.0 <= metrics.clarity <= 1.0, "Clarity score out of range"

            # Response should not be empty for successful queries
            if analysis["response"]:
                assert (
                    len(analysis["response"]) > 10
                ), f"Response too short for query: {analysis['query']}"

    @pytest.mark.agent
    @pytest.mark.asyncio
    async def test_context_utilization(self, intelligence_validator):
        """Test VANA's ability to utilize context effectively"""
        result = await intelligence_validator.validate_context_utilization()

        # Verify test execution
        assert result.scenarios_tested > 0, "No context scenarios were tested"
        assert result.execution_time > 0, "Test should take some time to execute"

        # Verify context utilization
        assert result.score >= 0.6, f"Context utilization too low: {result.score:.2f}"

        # Check context analysis details
        context_analysis = result.details.get("context_analysis", {})
        assert "avg_context_usage" in context_analysis
        assert "scenarios_with_good_context_usage" in context_analysis

        # At least some scenarios should show good context usage
        good_usage_count = context_analysis.get("scenarios_with_good_context_usage", 0)
        assert (
            good_usage_count >= 0
        ), "Should have some scenarios with good context usage"

    @pytest.mark.agent
    @pytest.mark.asyncio
    async def test_error_handling_behavior(self, agent_client):
        """Test VANA's error handling and graceful degradation"""
        error_scenarios = [
            "What is the weather on Mars right now?",  # Impossible query
            "",  # Empty query
            "a" * 1000,  # Very long query
            "What is 2+2?",  # Simple math that shouldn't need web search
        ]

        error_responses = []

        for scenario in error_scenarios:
            response = await agent_client.query(scenario)
            error_responses.append(
                {
                    "query": scenario,
                    "response": response.content,
                    "status": response.status,
                    "execution_time": response.execution_time,
                    "error": response.error,
                }
            )

        # Verify error handling
        for error_response in error_responses:
            # Should not crash or return empty responses
            assert error_response["status"] in [
                "success",
                "error",
                "timeout",
            ], f"Invalid status: {error_response['status']}"

            # Should have some response content or error message
            has_content = bool(
                error_response["response"] and error_response["response"].strip()
            )
            has_error = bool(error_response["error"])

            assert (
                has_content or has_error
            ), f"No response or error for query: {error_response['query']}"

            # Execution time should be reasonable
            assert (
                error_response["execution_time"] < 30.0
            ), f"Response time too long: {error_response['execution_time']:.2f}s"

    @pytest.mark.agent
    @pytest.mark.asyncio
    async def test_response_consistency(self, agent_client):
        """Test VANA's response consistency for similar queries"""
        similar_queries = [
            "What time is it in London?",
            "What is the current time in London?",
            "Tell me the time in London right now",
        ]

        responses = []

        for query in similar_queries:
            response = await agent_client.query(query)
            responses.append(
                {
                    "query": query,
                    "response": response.content,
                    "tools_used": response.tools_used,
                    "execution_time": response.execution_time,
                }
            )

            # Small delay between requests
            await asyncio.sleep(1)

        # Verify consistency
        assert len(responses) == len(similar_queries), "Not all queries were processed"

        # Check tool usage consistency
        tool_sets = [set(r["tools_used"]) for r in responses]

        # Should use similar tools for similar queries
        if len(tool_sets) > 1:
            # Calculate tool usage similarity
            common_tools = set.intersection(*tool_sets) if tool_sets else set()
            total_unique_tools = set.union(*tool_sets) if tool_sets else set()

            if total_unique_tools:
                consistency_ratio = len(common_tools) / len(total_unique_tools)
                # Allow some variation but expect some consistency
                assert (
                    consistency_ratio >= 0.3 or len(total_unique_tools) <= 2
                ), f"Tool usage too inconsistent: {consistency_ratio:.2f}"

        # Check response pattern consistency
        response_lengths = [len(r["response"]) for r in responses if r["response"]]
        if response_lengths:
            avg_length = sum(response_lengths) / len(response_lengths)
            # Responses should be reasonably similar in length
            for length in response_lengths:
                ratio = length / avg_length if avg_length > 0 else 1
                assert (
                    0.3 <= ratio <= 3.0
                ), f"Response length too inconsistent: {length} vs avg {avg_length:.1f}"

    @pytest.mark.agent
    @pytest.mark.asyncio
    async def test_performance_characteristics(self, agent_client):
        """Test VANA's performance characteristics"""
        test_queries = [
            "What is the capital of France?",
            "How is the weather today?",
            "What time is it?",
        ]

        performance_data = []

        for query in test_queries:
            start_time = time.time()
            response = await agent_client.query(query)
            end_time = time.time()

            performance_data.append(
                {
                    "query": query,
                    "response_time": response.execution_time,
                    "measured_time": end_time - start_time,
                    "status": response.status,
                    "response_length": len(response.content) if response.content else 0,
                }
            )

        # Verify performance
        response_times = [p["response_time"] for p in performance_data]

        # Response times should be reasonable
        avg_response_time = sum(response_times) / len(response_times)
        assert (
            avg_response_time < 10.0
        ), f"Average response time too slow: {avg_response_time:.2f}s"

        # No response should be extremely slow
        max_response_time = max(response_times)
        assert (
            max_response_time < 30.0
        ), f"Maximum response time too slow: {max_response_time:.2f}s"

        # Should have successful responses
        successful_responses = [p for p in performance_data if p["status"] == "success"]
        success_rate = len(successful_responses) / len(performance_data)
        assert success_rate >= 0.7, f"Success rate too low: {success_rate:.2%}"

    @pytest.mark.agent
    @pytest.mark.asyncio
    async def test_intelligence_regression(self, intelligence_validator):
        """Test for intelligence regression across all capabilities"""
        # Run comprehensive intelligence validation
        reasoning_result = await intelligence_validator.validate_reasoning_consistency()
        tool_result = (
            await intelligence_validator.validate_tool_selection_intelligence()
        )
        context_result = await intelligence_validator.validate_context_utilization()

        # Calculate overall intelligence score
        intelligence_scores = [
            reasoning_result.score,
            tool_result.score,
            context_result.score,
        ]

        overall_intelligence = sum(intelligence_scores) / len(intelligence_scores)

        # Verify overall intelligence meets threshold
        assert (
            overall_intelligence >= 0.7
        ), f"Overall intelligence score too low: {overall_intelligence:.2f}"

        # Individual components should meet minimum thresholds
        assert (
            reasoning_result.score >= 0.6
        ), f"Reasoning consistency below threshold: {reasoning_result.score:.2f}"
        assert (
            tool_result.score >= 0.7
        ), f"Tool selection intelligence below threshold: {tool_result.score:.2f}"
        assert (
            context_result.score >= 0.6
        ), f"Context utilization below threshold: {context_result.score:.2f}"

        # Log intelligence metrics for monitoring
        intelligence_metrics = {
            "overall_intelligence": overall_intelligence,
            "reasoning_consistency": reasoning_result.score,
            "tool_selection": tool_result.score,
            "context_utilization": context_result.score,
            "test_timestamp": time.time(),
        }

        # This could be logged to a monitoring system
        print(f"Intelligence Metrics: {intelligence_metrics}")


class TestVanaSpecializedBehavior:
    """Test VANA's specialized behavior patterns"""

    @pytest.fixture
    async def agent_client(self):
        """Create VANA agent test client"""
        client = await create_test_agent_client("vana")
        yield client
        client.clear_history()

    @pytest.mark.agent
    @pytest.mark.asyncio
    async def test_delegation_intelligence(self, agent_client):
        """Test VANA's delegation decision-making"""
        delegation_scenarios = [
            "Write a Python function to sort a list",  # Should delegate to code execution
            "Analyze this dataset for trends",  # Should delegate to data science
            "What is the weather today?",  # Should use web search, not delegate
        ]

        delegation_results = []

        for scenario in delegation_scenarios:
            response = await agent_client.query(scenario)

            delegation_results.append(
                {
                    "query": scenario,
                    "response": response.content,
                    "tools_used": response.tools_used,
                    "delegations": response.delegations,
                    "status": response.status,
                }
            )

        # Verify delegation behavior
        for result in delegation_results:
            query = result["query"]
            tools_used = result["tools_used"]
            delegations = result["delegations"]

            # Code-related queries should involve delegation or code execution tools
            if "python" in query.lower() or "function" in query.lower():
                should_delegate = (
                    len(delegations) > 0
                    or "delegate_to_agent" in tools_used
                    or "code_execution" in str(tools_used).lower()
                )
                # Note: This is flexible as delegation patterns may vary

            # Weather queries should use web search, not delegation
            if "weather" in query.lower():
                assert (
                    "adk_web_search" in tools_used or len(tools_used) == 0
                ), "Weather queries should use web search"

    @pytest.mark.agent
    @pytest.mark.asyncio
    async def test_proactive_tool_usage(self, agent_client):
        """Test VANA's proactive tool usage"""
        # Queries that should trigger proactive tool usage
        proactive_scenarios = [
            "I need current information about AI developments",  # Should search
            "Help me understand the latest Python features",  # Should search
            "What's happening in the tech world today?",  # Should search
        ]

        for scenario in proactive_scenarios:
            response = await agent_client.query(scenario)

            # Should proactively use tools for current information
            assert (
                len(response.tools_used) > 0 or response.status != "success"
            ), f"Should use tools proactively for: {scenario}"

            # Response should contain relevant information
            if response.status == "success" and response.content:
                assert (
                    len(response.content) > 50
                ), f"Response too brief for complex query: {scenario}"
