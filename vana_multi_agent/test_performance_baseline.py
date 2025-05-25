"""
Performance Baseline Test Suite for VANA Multi-Agent System

This test suite establishes performance baselines for all system components
and validates that performance targets are being met.
"""

import time
import pytest
from typing import Dict, Any

# Import performance profiler
from vana_multi_agent.performance.profiler import performance_profiler

# Import standardized tools for testing
from vana_multi_agent.tools.standardized_file_tools import (
    standardized_read_file, standardized_write_file,
    standardized_list_directory, standardized_file_exists
)
from vana_multi_agent.tools.standardized_search_tools import (
    standardized_vector_search, standardized_web_search,
    standardized_search_knowledge
)
from vana_multi_agent.tools.standardized_kg_tools import (
    standardized_kg_query, standardized_kg_store,
    standardized_kg_relationship, standardized_kg_extract_entities
)
from vana_multi_agent.tools.standardized_system_tools import (
    standardized_echo, standardized_get_health_status,
    standardized_coordinate_task, standardized_delegate_to_agent,
    standardized_get_agent_status
)

# Import core components
from vana_multi_agent.core.task_router import TaskRouter
from vana_multi_agent.core.confidence_scorer import ConfidenceScorer
from vana_multi_agent.core.mode_manager import ModeManager

class TestPerformanceBaseline:
    """Test suite for establishing performance baselines."""

    @classmethod
    def setup_class(cls):
        """Set up performance profiling for the test session."""
        performance_profiler.start_profiling()
        print("🚀 Starting performance baseline establishment...")

    @classmethod
    def teardown_class(cls):
        """Stop profiling and establish baseline."""
        performance_profiler.stop_profiling()
        performance_profiler.establish_baseline()

        # Export baseline metrics
        performance_profiler.export_metrics("vana_multi_agent/performance/baseline_metrics.json")

        # Print performance summary
        summary = performance_profiler.get_performance_summary()
        print("\n📊 Performance Baseline Summary:")
        print(f"Total Components: {summary['total_components']}")
        print(f"Total Executions: {summary['total_executions']}")
        print(f"Overall Success Rate: {summary['overall_success_rate']:.2f}%")
        print(f"Average Execution Time: {summary['average_execution_time']:.4f}s")

        if summary['bottlenecks']:
            print("\n⚠️ Performance Bottlenecks Identified:")
            for bottleneck in summary['bottlenecks']:
                print(f"  - {bottleneck['component']}: {', '.join(bottleneck['issues'])}")

    def test_file_system_tools_performance(self):
        """Test performance of file system tools."""
        print("\n📁 Testing File System Tools Performance...")

        # Test echo tool (baseline)
        for i in range(10):
            result = performance_profiler.profile_execution(
                "echo",
                lambda: standardized_echo(f"Performance test {i}")
            )
            assert "Performance test" in result

        # Test file operations (using test directory in current workspace)
        import os

        # Use current directory for testing (safe for file operations)
        test_dir = "vana_multi_agent/test_data"
        os.makedirs(test_dir, exist_ok=True)
        test_file = os.path.join(test_dir, "performance_test.txt")
        test_content = "Performance testing content " * 100  # ~2.7KB

        # Test write performance
        for i in range(5):
            result = performance_profiler.profile_execution(
                "write_file",
                lambda: standardized_write_file(test_file, f"{test_content} {i}")
            )
            assert "Successfully wrote" in result

        # Test read performance
        for i in range(10):
            result = performance_profiler.profile_execution(
                "read_file",
                lambda: standardized_read_file(test_file)
            )
            assert test_content in result

        # Test directory listing performance
        for i in range(5):
            result = performance_profiler.profile_execution(
                "list_directory",
                lambda: standardized_list_directory(test_dir)
            )
            assert "performance_test.txt" in result

        # Test file existence check performance
        for i in range(10):
            result = performance_profiler.profile_execution(
                "file_exists",
                lambda: standardized_file_exists(test_file)
            )
            assert "true" in result.lower()

        # Clean up test file
        try:
            os.remove(test_file)
        except:
            pass

    def test_search_tools_performance(self):
        """Test performance of search tools."""
        print("\n🔍 Testing Search Tools Performance...")

        test_queries = [
            "VANA multi-agent system",
            "performance optimization",
            "tool standardization",
            "AI agent best practices",
            "system architecture"
        ]

        # Test vector search performance
        for query in test_queries:
            result = performance_profiler.profile_execution(
                "vector_search",
                lambda q=query: standardized_vector_search(q, max_results=3)
            )
            # Should return some result (mock or real)
            assert len(result) > 0

        # Test web search performance
        for query in test_queries[:3]:  # Fewer web searches to avoid rate limits
            result = performance_profiler.profile_execution(
                "web_search",
                lambda q=query: standardized_web_search(q, max_results=2)
            )
            assert len(result) > 0

        # Test knowledge search performance
        for query in test_queries:
            result = performance_profiler.profile_execution(
                "search_knowledge",
                lambda q=query: standardized_search_knowledge(q, max_results=3)
            )
            assert len(result) > 0

    def test_knowledge_graph_tools_performance(self):
        """Test performance of knowledge graph tools."""
        print("\n🕸️ Testing Knowledge Graph Tools Performance...")

        test_entities = [
            ("VANA", "project", "AI multi-agent system with enhanced capabilities"),
            ("Performance", "concept", "System optimization and monitoring"),
            ("Standardization", "process", "Tool interface consistency framework"),
            ("Routing", "component", "Intelligent task routing system"),
            ("Monitoring", "feature", "Real-time performance tracking")
        ]

        # Test entity storage performance
        for entity_name, entity_type, properties in test_entities:
            result = performance_profiler.profile_execution(
                "kg_store",
                lambda n=entity_name, t=entity_type, p=properties: standardized_kg_store(n, t, p)
            )
            assert len(result) > 0

        # Test relationship creation performance
        relationships = [
            ("VANA", "uses", "Performance"),
            ("Performance", "requires", "Monitoring"),
            ("Standardization", "improves", "Performance"),
            ("Routing", "part_of", "VANA")
        ]

        for entity1, relationship, entity2 in relationships:
            result = performance_profiler.profile_execution(
                "kg_relationship",
                lambda e1=entity1, r=relationship, e2=entity2: standardized_kg_relationship(e1, r, e2)
            )
            assert len(result) > 0

        # Test entity querying performance
        for entity_name, entity_type, _ in test_entities:
            result = performance_profiler.profile_execution(
                "kg_query",
                lambda t=entity_type, n=entity_name: standardized_kg_query(t, n)
            )
            assert len(result) > 0

        # Test entity extraction performance
        test_texts = [
            "VANA is an AI system that uses performance monitoring and standardization.",
            "The routing component handles task delegation with confidence scoring.",
            "Performance optimization requires comprehensive monitoring and analytics."
        ]

        for text in test_texts:
            result = performance_profiler.profile_execution(
                "kg_extract_entities",
                lambda t=text: standardized_kg_extract_entities(t)
            )
            assert len(result) > 0

    def test_coordination_tools_performance(self):
        """Test performance of coordination and system tools."""
        print("\n🤝 Testing Coordination Tools Performance...")

        # Test health status performance
        for i in range(5):
            result = performance_profiler.profile_execution(
                "get_health_status",
                lambda: standardized_get_health_status()
            )
            assert len(result) > 0

        # Test agent status performance
        for i in range(5):
            result = performance_profiler.profile_execution(
                "get_agent_status",
                lambda: standardized_get_agent_status()
            )
            assert "agent" in result.lower()

        # Test task coordination performance
        test_tasks = [
            "Optimize system performance",
            "Implement new feature",
            "Fix critical bug",
            "Update documentation",
            "Deploy to production"
        ]

        for task in test_tasks:
            result = performance_profiler.profile_execution(
                "coordinate_task",
                lambda t=task: standardized_coordinate_task(t)
            )
            assert len(result) > 0

        # Test agent delegation performance
        agents = ["architecture_specialist", "ui_specialist", "devops_specialist", "qa_specialist"]

        for i, agent in enumerate(agents):
            task = f"Performance test task {i+1}"
            result = performance_profiler.profile_execution(
                "delegate_to_agent",
                lambda a=agent, t=task: standardized_delegate_to_agent(a, t)
            )
            assert agent.replace("_", " ").title() in result or "specialist" in result.lower()

    def test_core_components_performance(self):
        """Test performance of core system components."""
        print("\n⚙️ Testing Core Components Performance...")

        # Test task router performance
        router = TaskRouter()
        test_tasks = [
            "Design a new user interface",
            "Optimize database queries",
            "Set up CI/CD pipeline",
            "Write unit tests",
            "Create system documentation"
        ]

        for task in test_tasks:
            result = performance_profiler.profile_execution(
                "task_routing",
                lambda t=task: router.route_task(t)
            )
            assert hasattr(result, 'selected_agent')
            assert hasattr(result, 'confidence_score')

        # Test confidence scorer performance
        scorer = ConfidenceScorer()

        for task in test_tasks:
            task_analysis = performance_profiler.profile_execution(
                "task_analysis",
                lambda t=task: scorer.analyze_task(t)
            )
            assert hasattr(task_analysis, 'complexity_score')

            # Test agent confidence calculation
            confidence = performance_profiler.profile_execution(
                "confidence_calculation",
                lambda: scorer.calculate_agent_confidence("architecture_specialist", task_analysis)
            )
            assert hasattr(confidence, 'final_confidence')

        # Test mode manager performance
        mode_manager = ModeManager()

        for task in test_tasks:
            mode_decision = performance_profiler.profile_execution(
                "mode_decision",
                lambda t=task: mode_manager.determine_mode(t)
            )
            assert mode_decision in ["PLAN", "ACT"]

    def test_performance_targets(self):
        """Validate that performance targets are being met."""
        print("\n🎯 Validating Performance Targets...")

        # Get current metrics
        summary = performance_profiler.get_performance_summary()

        # Check overall success rate
        assert summary['overall_success_rate'] >= 90.0, f"Success rate {summary['overall_success_rate']:.2f}% below target 90%"

        # Check average execution time
        assert summary['average_execution_time'] <= 2.0, f"Average execution time {summary['average_execution_time']:.4f}s above target 2.0s"

        # Check for critical bottlenecks
        critical_bottlenecks = [b for b in summary['bottlenecks'] if b['bottleneck_score'] >= 5]
        assert len(critical_bottlenecks) == 0, f"Critical bottlenecks found: {[b['component'] for b in critical_bottlenecks]}"

        print("✅ All performance targets met!")

if __name__ == "__main__":
    # Run performance baseline tests
    pytest.main([__file__, "-v", "-s"])
