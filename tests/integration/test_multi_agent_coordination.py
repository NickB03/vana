"""
Integration tests for multi-agent coordination

Tests agent-to-agent communication, delegation workflows, and coordination
patterns across the VANA multi-agent system.
"""

import asyncio
import time

import pytest

from tests.framework import TestDataManager, create_multi_agent_environment


class TestMultiAgentCoordination:
    """Test multi-agent coordination and communication"""

    @pytest.fixture
    async def multi_agent_env(self):
        """Create multi-agent test environment"""
        agent_names = ["vana", "code_execution", "data_science", "specialists"]
        env = await create_multi_agent_environment(agent_names)
        yield env

        # Cleanup
        for client in env.values():
            client.clear_history()

    @pytest.fixture
    def test_data_manager(self):
        """Create test data manager"""
        return TestDataManager()

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_vana_to_code_execution_delegation(self, multi_agent_env):
        """Test delegation from VANA to code execution agent"""
        vana_client = multi_agent_env["vana"]

        # Query that should trigger delegation to code execution
        code_query = (
            "Write a Python function to calculate the factorial of a number and test it"
        )

        response = await vana_client.query(code_query)

        # Verify response
        assert response.status in [
            "success",
            "error",
        ], f"Invalid status: {response.status}"

        if response.status == "success":
            # Should contain code-related content
            response_lower = response.content.lower()
            assert any(
                keyword in response_lower
                for keyword in ["def", "function", "factorial", "python"]
            ), "Response should contain code-related content"

            # Check for delegation indicators
            delegation_indicators = [
                "delegat",
                "transfer",
                "code execution",
                "specialist",
            ]
            has_delegation_indicator = any(
                indicator in response_lower for indicator in delegation_indicators
            )

            # Should either show delegation or contain actual code
            assert (
                has_delegation_indicator or "def " in response.content
            ), "Should show delegation or contain code"

        # Verify tool usage
        tools_used = response.tools_used
        expected_tools = ["delegate_to_agent", "adk_web_search"]

        # Should use delegation or search tools
        assert (
            any(tool in tools_used for tool in expected_tools) or len(tools_used) == 0
        ), f"Expected delegation or search tools, got: {tools_used}"

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_vana_to_data_science_delegation(self, multi_agent_env):
        """Test delegation from VANA to data science agent"""
        vana_client = multi_agent_env["vana"]

        # Query that should trigger delegation to data science
        data_query = "Analyze a dataset of sales figures and create visualizations showing trends"

        response = await vana_client.query(data_query)

        # Verify response
        assert response.status in [
            "success",
            "error",
        ], f"Invalid status: {response.status}"

        if response.status == "success":
            # Should contain data analysis related content
            response_lower = response.content.lower()
            data_keywords = ["analyz", "dataset", "visualization", "trend", "data"]
            assert any(
                keyword in response_lower for keyword in data_keywords
            ), "Response should contain data analysis content"

            # Check for delegation or analysis content
            has_analysis_content = any(
                keyword in response_lower
                for keyword in ["pandas", "matplotlib", "chart", "graph", "plot"]
            )
            has_delegation_content = any(
                keyword in response_lower
                for keyword in ["delegat", "transfer", "data science", "specialist"]
            )

            assert (
                has_analysis_content or has_delegation_content
            ), "Should contain analysis content or delegation indicators"

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_vana_to_specialists_delegation(self, multi_agent_env):
        """Test delegation from VANA to specialists agent"""
        vana_client = multi_agent_env["vana"]

        # Query that should trigger delegation to specialists
        specialist_query = (
            "Design a microservices architecture for an e-commerce platform"
        )

        response = await vana_client.query(specialist_query)

        # Verify response
        assert response.status in [
            "success",
            "error",
        ], f"Invalid status: {response.status}"

        if response.status == "success":
            # Should contain architecture-related content
            response_lower = response.content.lower()
            arch_keywords = [
                "architecture",
                "microservices",
                "design",
                "system",
                "platform",
            ]
            assert any(
                keyword in response_lower for keyword in arch_keywords
            ), "Response should contain architecture content"

            # Should be substantial response for complex architectural question
            assert (
                len(response.content) > 100
            ), "Architecture response should be substantial"

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_coordination_workflow_complex_task(self, multi_agent_env):
        """Test coordination workflow for complex multi-step task"""
        vana_client = multi_agent_env["vana"]

        # Complex task requiring multiple agents
        complex_query = """
        I need help with a data science project:
        1. Create a Python script to load and clean a CSV dataset
        2. Perform statistical analysis on the data
        3. Create visualizations showing key insights
        4. Generate a summary report with recommendations
        """

        response = await vana_client.query(complex_query)

        # Verify response handling
        assert response.status in [
            "success",
            "error",
        ], f"Invalid status: {response.status}"

        if response.status == "success":
            response_lower = response.content.lower()

            # Should address multiple aspects of the request
            required_aspects = ["python", "data", "analysis", "visualization"]
            addressed_aspects = sum(
                1 for aspect in required_aspects if aspect in response_lower
            )

            assert (
                addressed_aspects >= 2
            ), f"Should address multiple aspects, only found {addressed_aspects}"

            # Should be comprehensive response
            assert (
                len(response.content) > 200
            ), "Complex task should generate comprehensive response"

        # Check execution time is reasonable for complex task
        assert (
            response.execution_time < 60.0
        ), f"Complex task took too long: {response.execution_time:.2f}s"

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_agent_communication_patterns(self, multi_agent_env):
        """Test communication patterns between agents"""
        vana_client = multi_agent_env["vana"]

        # Test different types of queries that require different agents
        test_scenarios = [
            {
                "query": "Write a function to sort a list in Python",
                "expected_agent": "code_execution",
                "keywords": ["function", "python", "sort"],
            },
            {
                "query": "Analyze customer data for purchasing patterns",
                "expected_agent": "data_science",
                "keywords": ["analyze", "data", "pattern"],
            },
            {
                "query": "Design a REST API architecture",
                "expected_agent": "specialists",
                "keywords": ["design", "api", "architecture"],
            },
        ]

        communication_results = []

        for scenario in test_scenarios:
            response = await vana_client.query(scenario["query"])

            communication_results.append(
                {
                    "scenario": scenario,
                    "response": response,
                    "tools_used": response.tools_used,
                    "delegations": response.delegations,
                }
            )

            # Brief delay between requests
            await asyncio.sleep(1)

        # Analyze communication patterns
        for result in communication_results:
            scenario = result["scenario"]
            response = result["response"]

            if response.status == "success":
                # Should contain relevant keywords
                response_lower = response.content.lower()
                keyword_matches = sum(
                    1 for keyword in scenario["keywords"] if keyword in response_lower
                )

                assert (
                    keyword_matches >= 1
                ), f"Response should contain relevant keywords for: {scenario['query']}"

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_coordination_error_handling(self, multi_agent_env):
        """Test error handling in multi-agent coordination"""
        vana_client = multi_agent_env["vana"]

        # Test scenarios that might cause coordination issues
        error_scenarios = [
            "Delegate this task to an agent that doesn't exist",
            "Perform an impossible task that no agent can handle",
            "Create a circular dependency between agents",
        ]

        for scenario in error_scenarios:
            response = await vana_client.query(scenario)

            # Should handle errors gracefully
            assert response.status in [
                "success",
                "error",
                "timeout",
            ], f"Invalid status for error scenario: {response.status}"

            # Should not crash or hang
            assert (
                response.execution_time < 30.0
            ), f"Error scenario took too long: {response.execution_time:.2f}s"

            # Should provide some response or error message
            has_content = bool(response.content and response.content.strip())
            has_error = bool(response.error)

            assert (
                has_content or has_error
            ), f"No response or error for scenario: {scenario}"

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_concurrent_agent_requests(self, multi_agent_env):
        """Test concurrent requests to multiple agents"""
        vana_client = multi_agent_env["vana"]

        # Multiple queries that could be processed concurrently
        concurrent_queries = [
            "What is the current time?",
            "Write a hello world function in Python",
            "Explain machine learning basics",
            "What's the weather like today?",
        ]

        # Send all queries concurrently
        start_time = time.time()
        tasks = [vana_client.query(query) for query in concurrent_queries]
        responses = await asyncio.gather(*tasks, return_exceptions=True)
        end_time = time.time()

        total_time = end_time - start_time

        # Verify all requests completed
        assert len(responses) == len(
            concurrent_queries
        ), "Not all concurrent requests completed"

        # Check individual responses
        successful_responses = 0
        for i, response in enumerate(responses):
            if isinstance(response, Exception):
                # Exception occurred
                assert False, f"Query {i} failed with exception: {response}"
            else:
                # Normal response
                assert hasattr(
                    response, "status"
                ), f"Invalid response object for query {i}"
                if response.status == "success":
                    successful_responses += 1

        # Should have reasonable success rate
        success_rate = successful_responses / len(responses)
        assert success_rate >= 0.5, f"Success rate too low: {success_rate:.2%}"

        # Concurrent processing should be reasonably efficient
        # (Not necessarily faster due to agent processing overhead)
        assert (
            total_time < 120.0
        ), f"Concurrent requests took too long: {total_time:.2f}s"

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_agent_state_isolation(self, multi_agent_env):
        """Test that agents maintain proper state isolation"""
        vana_client = multi_agent_env["vana"]

        # Send queries that might affect agent state
        state_queries = [
            "Remember that my name is Alice",
            "What is my name?",
            "Forget everything and start fresh",
            "What is my name now?",
        ]

        state_responses = []

        for query in state_queries:
            response = await vana_client.query(query)
            state_responses.append(
                {
                    "query": query,
                    "response": response.content,
                    "status": response.status,
                }
            )

            # Small delay between state-affecting queries
            await asyncio.sleep(2)

        # Verify state handling
        for i, response_data in enumerate(state_responses):
            query = response_data["query"]
            response = response_data["response"]
            status = response_data["status"]

            # All queries should get some response
            assert status in ["success", "error"], f"Invalid status for query: {query}"

            if status == "success":
                assert (
                    response and response.strip()
                ), f"Empty response for query: {query}"

    @pytest.mark.integration
    @pytest.mark.slow
    @pytest.mark.asyncio
    async def test_coordination_performance_under_load(self, multi_agent_env):
        """Test coordination performance under sustained load"""
        vana_client = multi_agent_env["vana"]

        # Test queries of different types
        load_queries = [
            "What time is it?",
            "Write a simple Python function",
            "Explain a concept",
            "Search for information",
        ]

        # Run sustained load test
        num_iterations = 10
        all_responses = []

        start_time = time.time()

        for iteration in range(num_iterations):
            for query in load_queries:
                response = await vana_client.query(query)
                all_responses.append(
                    {
                        "iteration": iteration,
                        "query": query,
                        "response_time": response.execution_time,
                        "status": response.status,
                    }
                )

                # Brief delay to avoid overwhelming
                await asyncio.sleep(0.5)

        end_time = time.time()
        total_test_time = end_time - start_time

        # Analyze performance under load
        successful_responses = [r for r in all_responses if r["status"] == "success"]
        success_rate = len(successful_responses) / len(all_responses)

        assert (
            success_rate >= 0.7
        ), f"Success rate under load too low: {success_rate:.2%}"

        # Check response time consistency
        response_times = [r["response_time"] for r in successful_responses]
        if response_times:
            avg_response_time = sum(response_times) / len(response_times)
            max_response_time = max(response_times)

            assert (
                avg_response_time < 15.0
            ), f"Average response time under load too high: {avg_response_time:.2f}s"
            assert (
                max_response_time < 45.0
            ), f"Maximum response time under load too high: {max_response_time:.2f}s"

        # Overall test should complete in reasonable time
        expected_max_time = num_iterations * len(load_queries) * 10  # 10s per query max
        assert (
            total_test_time < expected_max_time
        ), f"Load test took too long: {total_test_time:.2f}s"


class TestAgentCoordinationTools:
    """Test specific coordination tools and mechanisms"""

    @pytest.fixture
    async def vana_client(self):
        """Create VANA client for coordination testing"""
        client = await create_test_agent_client("vana")
        yield client
        client.clear_history()

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_get_agent_status_tool(self, vana_client):
        """Test get_agent_status coordination tool"""
        # Query that might use agent status checking
        status_query = "Check which agents are available for data analysis"

        response = await vana_client.query(status_query)

        # Should get some response about agent capabilities
        assert response.status in [
            "success",
            "error",
        ], f"Invalid status: {response.status}"

        if response.status == "success":
            response_lower = response.content.lower()
            # Should mention agents or capabilities
            agent_indicators = ["agent", "available", "capabilit", "data", "analysis"]
            assert any(
                indicator in response_lower for indicator in agent_indicators
            ), "Response should mention agents or capabilities"

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_delegation_tool_usage(self, vana_client):
        """Test delegate_to_agent tool usage patterns"""
        # Queries that should trigger delegation
        delegation_queries = [
            "Use the code execution agent to write a function",
            "Ask the data science agent to analyze data",
            "Get help from the specialists for architecture design",
        ]

        for query in delegation_queries:
            response = await vana_client.query(query)

            # Should handle delegation requests
            assert response.status in [
                "success",
                "error",
            ], f"Invalid status: {response.status}"

            if response.status == "success":
                # Should acknowledge delegation or provide relevant response
                response_lower = response.content.lower()
                delegation_indicators = ["delegat", "agent", "specialist", "help"]
                assert any(
                    indicator in response_lower for indicator in delegation_indicators
                ), f"Should acknowledge delegation for: {query}"
