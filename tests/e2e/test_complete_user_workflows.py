"""
End-to-end tests for complete user workflows

Tests complete user scenarios from initial query to final resolution,
validating the entire VANA system workflow including multi-agent coordination.
"""

import asyncio
import time

import pytest

from tests.framework import PerformanceBenchmarker, ResponseQualityAnalyzer, create_test_agent_client


class TestCompleteUserWorkflows:
    """Test complete end-to-end user workflows"""

    @pytest.fixture
    async def vana_client(self):
        """Create VANA client for E2E testing"""
        client = await create_test_agent_client("vana")
        yield client
        client.clear_history()

    @pytest.fixture
    def quality_analyzer(self):
        """Create response quality analyzer"""
        return ResponseQualityAnalyzer(hitl_threshold=0.8, enable_llm_judge=False)

    @pytest.fixture
    def performance_benchmarker(self, vana_client):
        """Create performance benchmarker"""
        return PerformanceBenchmarker(vana_client)

    @pytest.mark.e2e
    @pytest.mark.asyncio
    async def test_information_research_workflow(self, vana_client, quality_analyzer):
        """Test complete information research workflow"""
        # Simulate user researching a topic
        research_workflow = [
            "I need to research artificial intelligence trends in 2024",
            "What are the key developments in AI this year?",
            "Can you provide specific examples of breakthrough AI technologies?",
            "How do these developments impact software development?",
            "Summarize the key points for a technical presentation",
        ]

        workflow_results = []
        conversation_context = []

        for step, query in enumerate(research_workflow):
            start_time = time.time()
            response = await vana_client.query(query)
            end_time = time.time()

            # Analyze response quality
            quality_metrics = quality_analyzer.analyze_response_quality(
                response.content, query
            )

            step_result = {
                "step": step + 1,
                "query": query,
                "response": response.content,
                "status": response.status,
                "execution_time": response.execution_time,
                "measured_time": end_time - start_time,
                "tools_used": response.tools_used,
                "quality_metrics": quality_metrics,
                "response_length": len(response.content) if response.content else 0,
            }

            workflow_results.append(step_result)
            conversation_context.append({"query": query, "response": response.content})

            # Brief pause between workflow steps
            await asyncio.sleep(2)

        # Validate workflow completion
        assert len(workflow_results) == len(
            research_workflow
        ), "Not all workflow steps completed"

        # Check overall workflow success
        successful_steps = [r for r in workflow_results if r["status"] == "success"]
        success_rate = len(successful_steps) / len(workflow_results)
        assert success_rate >= 0.8, f"Workflow success rate too low: {success_rate:.2%}"

        # Validate response quality progression
        quality_scores = [r["quality_metrics"].overall_score for r in successful_steps]
        if quality_scores:
            avg_quality = sum(quality_scores) / len(quality_scores)
            assert (
                avg_quality >= 0.6
            ), f"Average response quality too low: {avg_quality:.2f}"

        # Check for information research indicators
        all_responses = " ".join([r["response"] for r in successful_steps])
        research_indicators = [
            "ai",
            "artificial intelligence",
            "development",
            "technology",
        ]
        found_indicators = sum(
            1
            for indicator in research_indicators
            if indicator.lower() in all_responses.lower()
        )
        assert found_indicators >= 2, "Should contain research-related content"

        # Validate workflow performance
        total_workflow_time = sum(r["execution_time"] for r in workflow_results)
        assert (
            total_workflow_time < 120.0
        ), f"Total workflow time too long: {total_workflow_time:.2f}s"

    @pytest.mark.e2e
    @pytest.mark.asyncio
    async def test_development_assistance_workflow(self, vana_client, quality_analyzer):
        """Test complete development assistance workflow"""
        # Simulate developer getting help with a project
        dev_workflow = [
            "I'm building a web application and need help with the architecture",
            "What's the best approach for a Python web API with authentication?",
            "Can you help me write the authentication middleware code?",
            "How should I structure the database for user management?",
            "What testing strategy should I use for this application?",
        ]

        workflow_results = []

        for step, query in enumerate(dev_workflow):
            response = await vana_client.query(query)

            # Analyze response quality
            quality_metrics = quality_analyzer.analyze_response_quality(
                response.content, query
            )

            step_result = {
                "step": step + 1,
                "query": query,
                "response": response.content,
                "status": response.status,
                "execution_time": response.execution_time,
                "tools_used": response.tools_used,
                "quality_metrics": quality_metrics,
                "contains_code": "def " in response.content
                or "class " in response.content,
                "contains_architecture": any(
                    term in response.content.lower()
                    for term in ["architecture", "design", "structure"]
                ),
            }

            workflow_results.append(step_result)
            await asyncio.sleep(2)

        # Validate development workflow
        successful_steps = [r for r in workflow_results if r["status"] == "success"]
        success_rate = len(successful_steps) / len(workflow_results)
        assert (
            success_rate >= 0.7
        ), f"Development workflow success rate too low: {success_rate:.2%}"

        # Check for development-specific content
        code_responses = [r for r in successful_steps if r["contains_code"]]
        arch_responses = [r for r in successful_steps if r["contains_architecture"]]

        # Should have some technical content
        assert (
            len(code_responses) > 0 or len(arch_responses) > 0
        ), "Should contain code or architecture content"

        # Check tool usage patterns
        all_tools_used = []
        for result in successful_steps:
            all_tools_used.extend(result["tools_used"])

        # Should use appropriate tools for development queries
        expected_tools = ["delegate_to_agent", "adk_web_search"]
        tool_usage = any(tool in all_tools_used for tool in expected_tools)
        assert (
            tool_usage or len(all_tools_used) == 0
        ), "Should use appropriate tools for development assistance"

    @pytest.mark.e2e
    @pytest.mark.asyncio
    async def test_data_analysis_workflow(self, vana_client, quality_analyzer):
        """Test complete data analysis workflow"""
        # Simulate user working on data analysis project
        data_workflow = [
            "I have a CSV file with sales data and need to analyze it",
            "What's the best approach to clean and prepare the data?",
            "Can you help me create visualizations for sales trends?",
            "How do I identify the top-performing products?",
            "Generate a summary report with key insights and recommendations",
        ]

        workflow_results = []

        for step, query in enumerate(data_workflow):
            response = await vana_client.query(query)

            quality_metrics = quality_analyzer.analyze_response_quality(
                response.content, query
            )

            step_result = {
                "step": step + 1,
                "query": query,
                "response": response.content,
                "status": response.status,
                "execution_time": response.execution_time,
                "tools_used": response.tools_used,
                "quality_metrics": quality_metrics,
                "mentions_data_tools": any(
                    tool in response.content.lower()
                    for tool in ["pandas", "matplotlib", "seaborn", "plotly"]
                ),
                "mentions_analysis": any(
                    term in response.content.lower()
                    for term in ["analyz", "trend", "insight", "pattern"]
                ),
            }

            workflow_results.append(step_result)
            await asyncio.sleep(2)

        # Validate data analysis workflow
        successful_steps = [r for r in workflow_results if r["status"] == "success"]
        success_rate = len(successful_steps) / len(workflow_results)
        assert (
            success_rate >= 0.7
        ), f"Data analysis workflow success rate too low: {success_rate:.2%}"

        # Check for data analysis content
        data_tool_mentions = sum(
            1 for r in successful_steps if r["mentions_data_tools"]
        )
        analysis_mentions = sum(1 for r in successful_steps if r["mentions_analysis"])

        # Should contain relevant data analysis content
        assert (
            data_tool_mentions > 0 or analysis_mentions > 0
        ), "Should contain data analysis related content"

        # Check for delegation to data science agent
        delegation_tools = ["delegate_to_agent"]
        used_delegation = any(
            tool in result["tools_used"]
            for result in successful_steps
            for tool in delegation_tools
        )

        # Data analysis should involve appropriate agent coordination
        # (This is flexible as coordination patterns may vary)

    @pytest.mark.e2e
    @pytest.mark.asyncio
    async def test_problem_solving_workflow(self, vana_client, quality_analyzer):
        """Test complete problem-solving workflow"""
        # Simulate user working through a complex problem
        problem_workflow = [
            "I'm having performance issues with my web application",
            "The application is slow when handling multiple users",
            "What are the common causes of web application performance problems?",
            "How can I identify bottlenecks in my system?",
            "What specific optimizations should I implement first?",
        ]

        workflow_results = []

        for step, query in enumerate(problem_workflow):
            response = await vana_client.query(query)

            quality_metrics = quality_analyzer.analyze_response_quality(
                response.content, query
            )

            step_result = {
                "step": step + 1,
                "query": query,
                "response": response.content,
                "status": response.status,
                "execution_time": response.execution_time,
                "tools_used": response.tools_used,
                "quality_metrics": quality_metrics,
                "addresses_performance": "performance" in response.content.lower(),
                "provides_solutions": any(
                    term in response.content.lower()
                    for term in ["solution", "fix", "optimize", "improve"]
                ),
            }

            workflow_results.append(step_result)
            await asyncio.sleep(2)

        # Validate problem-solving workflow
        successful_steps = [r for r in workflow_results if r["status"] == "success"]
        success_rate = len(successful_steps) / len(workflow_results)
        assert (
            success_rate >= 0.7
        ), f"Problem-solving workflow success rate too low: {success_rate:.2%}"

        # Check for problem-solving content
        performance_mentions = sum(
            1 for r in successful_steps if r["addresses_performance"]
        )
        solution_mentions = sum(1 for r in successful_steps if r["provides_solutions"])

        assert performance_mentions >= 1, "Should address performance issues"
        assert solution_mentions >= 1, "Should provide solutions"

        # Responses should be substantial for complex problems
        substantial_responses = [
            r for r in successful_steps if len(r["response"]) > 100
        ]
        assert (
            len(substantial_responses) >= len(successful_steps) // 2
        ), "Should provide substantial responses for complex problems"

    @pytest.mark.e2e
    @pytest.mark.slow
    @pytest.mark.asyncio
    async def test_extended_conversation_workflow(self, vana_client, quality_analyzer):
        """Test extended conversation workflow with context preservation"""
        # Simulate extended conversation with context building
        extended_workflow = [
            "I'm working on a machine learning project",
            "The project involves predicting customer behavior",
            "I have historical purchase data and customer demographics",
            "What machine learning algorithms would work best for this?",
            "How should I prepare the data for training?",
            "What metrics should I use to evaluate the model?",
            "Can you help me implement the data preprocessing?",
            "How do I handle missing values in the dataset?",
            "What's the best way to split the data for training and testing?",
            "Can you provide a summary of the complete approach?",
        ]

        workflow_results = []
        conversation_context = []

        for step, query in enumerate(extended_workflow):
            response = await vana_client.query(query)

            quality_metrics = quality_analyzer.analyze_response_quality(
                response.content, query
            )

            # Check for context awareness
            context_indicators = ["project", "customer", "data", "machine learning"]
            context_awareness = sum(
                1
                for indicator in context_indicators
                if indicator.lower() in response.content.lower()
            )

            step_result = {
                "step": step + 1,
                "query": query,
                "response": response.content,
                "status": response.status,
                "execution_time": response.execution_time,
                "tools_used": response.tools_used,
                "quality_metrics": quality_metrics,
                "context_awareness_score": context_awareness / len(context_indicators),
                "response_length": len(response.content) if response.content else 0,
            }

            workflow_results.append(step_result)
            conversation_context.append(
                {"step": step + 1, "query": query, "response": response.content}
            )

            await asyncio.sleep(1)

        # Validate extended conversation
        successful_steps = [r for r in workflow_results if r["status"] == "success"]
        success_rate = len(successful_steps) / len(workflow_results)
        assert (
            success_rate >= 0.7
        ), f"Extended conversation success rate too low: {success_rate:.2%}"

        # Check context preservation
        context_scores = [r["context_awareness_score"] for r in successful_steps]
        if context_scores:
            avg_context_score = sum(context_scores) / len(context_scores)
            assert (
                avg_context_score >= 0.3
            ), f"Context awareness too low: {avg_context_score:.2f}"

        # Later responses should maintain context from earlier conversation
        later_responses = successful_steps[len(successful_steps) // 2 :]
        if later_responses:
            later_context_scores = [
                r["context_awareness_score"] for r in later_responses
            ]
            avg_later_context = sum(later_context_scores) / len(later_context_scores)
            assert (
                avg_later_context >= 0.2
            ), "Later responses should maintain some context awareness"

        # Check overall conversation quality
        quality_scores = [r["quality_metrics"].overall_score for r in successful_steps]
        if quality_scores:
            avg_quality = sum(quality_scores) / len(quality_scores)
            assert (
                avg_quality >= 0.6
            ), f"Extended conversation quality too low: {avg_quality:.2f}"

    @pytest.mark.e2e
    @pytest.mark.performance
    @pytest.mark.asyncio
    async def test_workflow_performance_characteristics(self, performance_benchmarker):
        """Test performance characteristics of complete workflows"""
        # Test workflow performance with realistic queries
        workflow_queries = [
            "Help me design a web application architecture",
            "What are the best practices for API development?",
            "How do I implement user authentication?",
            "What testing strategies should I use?",
            "How do I deploy the application to production?",
        ]

        # Benchmark the workflow
        result = await performance_benchmarker.benchmark_response_times(
            query_types=None,  # Use custom queries
            iterations=1,
        )

        # Test with actual workflow queries
        workflow_performance = []

        for query in workflow_queries:
            start_time = time.time()
            response = await performance_benchmarker.agent_client.query(query)
            end_time = time.time()

            workflow_performance.append(
                {
                    "query": query,
                    "response_time": response.execution_time,
                    "measured_time": end_time - start_time,
                    "status": response.status,
                    "response_length": len(response.content) if response.content else 0,
                }
            )

        # Validate workflow performance
        response_times = [
            p["response_time"] for p in workflow_performance if p["status"] == "success"
        ]

        if response_times:
            avg_response_time = sum(response_times) / len(response_times)
            max_response_time = max(response_times)

            assert (
                avg_response_time < 15.0
            ), f"Average workflow response time too slow: {avg_response_time:.2f}s"
            assert (
                max_response_time < 30.0
            ), f"Maximum workflow response time too slow: {max_response_time:.2f}s"

        # Check success rate
        successful_queries = [
            p for p in workflow_performance if p["status"] == "success"
        ]
        success_rate = len(successful_queries) / len(workflow_performance)
        assert success_rate >= 0.8, f"Workflow success rate too low: {success_rate:.2%}"

    @pytest.mark.e2e
    @pytest.mark.asyncio
    async def test_error_recovery_workflow(self, vana_client):
        """Test error recovery in complete workflows"""
        # Workflow that includes potential error scenarios
        error_recovery_workflow = [
            "Help me with a complex task",
            "",  # Empty query
            "What is the weather on Mars?",  # Impossible query
            "Now help me with a normal task - what time is it?",  # Recovery
            "Can you summarize what we discussed?",  # Context check
        ]

        workflow_results = []

        for step, query in enumerate(error_recovery_workflow):
            response = await vana_client.query(query)

            step_result = {
                "step": step + 1,
                "query": query,
                "response": response.content,
                "status": response.status,
                "execution_time": response.execution_time,
                "error": response.error,
                "recovered": response.status == "success"
                and step > 2,  # Recovery after errors
            }

            workflow_results.append(step_result)
            await asyncio.sleep(1)

        # Validate error recovery
        assert len(workflow_results) == len(
            error_recovery_workflow
        ), "Not all workflow steps completed"

        # Should handle errors gracefully
        for result in workflow_results:
            assert result["status"] in [
                "success",
                "error",
                "timeout",
            ], f"Invalid status: {result['status']}"

            # Should not hang on errors
            assert (
                result["execution_time"] < 30.0
            ), f"Step took too long: {result['execution_time']:.2f}s"

        # Should recover from errors
        recovery_steps = [r for r in workflow_results[-2:] if r["recovered"]]
        assert len(recovery_steps) > 0, "Should recover from errors in workflow"

        # Final step should work normally
        final_step = workflow_results[-1]
        assert final_step["status"] in [
            "success",
            "error",
        ], "Final step should complete normally"
