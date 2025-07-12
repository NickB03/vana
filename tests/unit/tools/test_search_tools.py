"""
Unit tests for search tools functionality

Tests the search tools (vector_search, search_knowledge) in isolation,
validating their core functionality, error handling, and edge cases.
Note: web_search is tested separately in test_web_search_tool.py

FIXED: Updated to match actual function signatures and behavior.
- All functions are synchronous (no async/await)
- Functions return JSON strings, not objects
- Tests work with actual implementations and fallback behavior
"""

import json

# Import the actual tools from VANA codebase
import sys
from pathlib import Path

import pytest

sys.path.append(str(Path(__file__).parent.parent.parent.parent))

from lib._tools.adk_tools import adk_search_knowledge, adk_vector_search
from tests.framework import EnvironmentConfig, EnvironmentType, TestEnvironment


class TestVectorSearchTool:
    """Unit tests for vector search tool"""

    @pytest.fixture
    def test_env(self):
        """Create test environment"""
        config = EnvironmentConfig(env_type=EnvironmentType.UNIT)
        return TestEnvironment(config)

    @pytest.fixture
    def mock_vector_response(self):
        """Mock vector search response"""
        return [
            {
                "content": "This is a relevant document about machine learning",
                "score": 0.95,
                "metadata": {"source": "ml_docs", "type": "technical"},
                "id": "doc_1",
            },
            {
                "content": "Another document discussing AI algorithms",
                "score": 0.87,
                "metadata": {"source": "ai_papers", "type": "research"},
                "id": "doc_2",
            },
            {
                "content": "Basic introduction to neural networks",
                "score": 0.82,
                "metadata": {"source": "tutorials", "type": "educational"},
                "id": "doc_3",
            },
        ]

    @pytest.mark.unit
    def test_vector_search_basic_functionality(self):
        """Test basic vector search functionality"""
        # vector_search is synchronous and uses real implementation with fallback
        result = adk_vector_search.func("machine learning algorithms")

        # Verify result structure
        assert isinstance(result, str)
        assert len(result) > 0

        # Should return JSON with search results
        try:
            parsed = json.loads(result)
            assert "query" in parsed
            assert "results" in parsed
            assert "total" in parsed
            assert parsed["query"] == "machine learning algorithms"
            assert isinstance(parsed["results"], list)
        except json.JSONDecodeError:
            pytest.fail("vector_search should return valid JSON")

    @pytest.mark.unit
    def test_vector_search_empty_query(self):
        """Test vector search with empty query"""
        result = adk_vector_search.func("")

        assert isinstance(result, str)
        assert len(result) > 0

        # Should handle empty query gracefully
        try:
            parsed = json.loads(result)
            assert "query" in parsed
            assert parsed["query"] == ""
        except json.JSONDecodeError:
            pytest.fail("vector_search should return valid JSON")

    @pytest.mark.unit
    def test_vector_search_fallback_behavior(self):
        """Test vector search fallback behavior when service fails"""
        # The function has built-in fallback when vector search client fails
        result = adk_vector_search.func("test query")

        assert isinstance(result, str)
        assert len(result) > 0

        # Should return either production results or fallback
        try:
            parsed = json.loads(result)
            assert "mode" in parsed
            assert parsed["mode"] in ["production", "fallback"]
            assert "results" in parsed
            assert isinstance(parsed["results"], list)
        except json.JSONDecodeError:
            pytest.fail("vector_search should return valid JSON")

    @pytest.mark.unit
    def test_vector_search_json_structure(self):
        """Test vector search returns proper JSON structure"""
        result = adk_vector_search.func("test query")

        parsed = json.loads(result)

        # Verify all expected fields are present
        expected_fields = ["query", "results", "total", "mode"]
        for field in expected_fields:
            assert field in parsed, f"Missing field: {field}"

        # Verify results structure
        if parsed["results"]:
            for result_item in parsed["results"]:
                assert "content" in result_item
                assert "score" in result_item
                assert "source" in result_item

    @pytest.mark.unit
    def test_vector_search_unicode_query(self):
        """Test vector search with unicode query"""
        unicode_query = "机器学习 café naïve résumé 🤖"
        result = adk_vector_search.func(unicode_query)

        assert isinstance(result, str)
        assert len(result) > 0

        # Should handle unicode gracefully
        try:
            parsed = json.loads(result)
            assert parsed["query"] == unicode_query
        except json.JSONDecodeError:
            pytest.fail("vector_search should return valid JSON")

    @pytest.mark.unit
    def test_vector_search_long_query(self):
        """Test vector search with very long query"""
        long_query = "machine learning artificial intelligence " * 50  # Very long query
        result = adk_vector_search.func(long_query)

        assert isinstance(result, str)
        assert len(result) > 0

        # Should handle long queries gracefully
        try:
            parsed = json.loads(result)
            assert parsed["query"] == long_query
        except json.JSONDecodeError:
            pytest.fail("vector_search should return valid JSON")

    @pytest.mark.unit
    def test_vector_search_multiple_requests(self):
        """Test multiple vector search requests"""
        # Test multiple sequential requests (functions are synchronous)
        queries = [
            "machine learning",
            "artificial intelligence",
            "neural networks",
            "deep learning",
        ]

        results = []
        for query in queries:
            result = adk_vector_search.func(query)
            results.append(result)

        # All requests should complete successfully
        assert len(results) == len(queries)
        for result in results:
            assert isinstance(result, str)
            assert len(result) > 0


class TestKnowledgeSearchTool:
    """Unit tests for knowledge search tool"""

    @pytest.fixture
    def mock_knowledge_response(self):
        """Mock knowledge search response"""
        return {
            "results": [
                {
                    "title": "Machine Learning Fundamentals",
                    "content": "Machine learning is a subset of artificial intelligence...",
                    "source": "knowledge_base",
                    "relevance": 0.92,
                },
                {
                    "title": "Neural Network Architectures",
                    "content": "Neural networks are computing systems inspired by biological neural networks...",
                    "source": "technical_docs",
                    "relevance": 0.88,
                },
            ],
            "total_results": 2,
            "query_time": 0.15,
        }

    @pytest.mark.unit
    def test_knowledge_search_basic_functionality(self):
        """Test basic knowledge search functionality"""
        # search_knowledge is synchronous and uses real implementation with fallback
        result = adk_search_knowledge.func("machine learning")

        # Verify result structure
        assert isinstance(result, str)
        assert len(result) > 0

        # Should return JSON with search results
        try:
            parsed = json.loads(result)
            assert "query" in parsed
            assert "results" in parsed
            assert "total" in parsed
            assert parsed["query"] == "machine learning"
            assert isinstance(parsed["results"], list)
        except json.JSONDecodeError:
            pytest.fail("search_knowledge should return valid JSON")

    @pytest.mark.unit
    def test_knowledge_search_empty_query(self):
        """Test knowledge search with empty query"""
        result = adk_search_knowledge.func("")

        assert isinstance(result, str)
        assert len(result) > 0

        # Should handle empty query gracefully
        try:
            parsed = json.loads(result)
            assert "query" in parsed
            assert parsed["query"] == ""
        except json.JSONDecodeError:
            pytest.fail("search_knowledge should return valid JSON")

    @pytest.mark.unit
    def test_knowledge_search_fallback_behavior(self):
        """Test knowledge search fallback behavior"""
        # The function tries ADK memory service first, then file-based fallback
        result = adk_search_knowledge.func("test query")

        assert isinstance(result, str)
        assert len(result) > 0

        # Should return either production results or fallback
        try:
            parsed = json.loads(result)
            assert "mode" in parsed
            assert parsed["mode"] in ["production", "file_based", "fallback"]
            assert "results" in parsed
            assert isinstance(parsed["results"], list)
        except json.JSONDecodeError:
            pytest.fail("search_knowledge should return valid JSON")

    @pytest.mark.unit
    def test_knowledge_search_json_structure(self):
        """Test knowledge search returns proper JSON structure"""
        result = adk_search_knowledge.func("test query")

        parsed = json.loads(result)

        # Verify all expected fields are present
        expected_fields = ["query", "results", "total", "mode"]
        for field in expected_fields:
            assert field in parsed, f"Missing field: {field}"

        # Verify results structure if any results exist
        if parsed["results"]:
            for result_item in parsed["results"]:
                assert "content" in result_item
                assert "score" in result_item
                assert "source" in result_item

    @pytest.mark.unit
    def test_knowledge_search_special_characters(self):
        """Test knowledge search with special characters"""
        special_query = "machine-learning & AI: what's the difference?"
        result = adk_search_knowledge.func(special_query)

        assert isinstance(result, str)
        assert len(result) > 0

        # Should handle special characters gracefully
        try:
            parsed = json.loads(result)
            assert parsed["query"] == special_query
        except json.JSONDecodeError:
            pytest.fail("search_knowledge should return valid JSON")

    @pytest.mark.unit
    def test_knowledge_search_performance(self):
        """Test knowledge search performance"""
        import time

        start_time = time.time()
        result = adk_search_knowledge.func("performance test")
        end_time = time.time()

        execution_time = end_time - start_time

        # Should be reasonably fast (under 5 seconds for real implementation)
        assert execution_time < 5.0, f"Knowledge search took too long: {execution_time:.2f}s"
        assert isinstance(result, str)
        assert len(result) > 0


class TestSearchToolsIntegration:
    """Integration tests for search tools"""

    @pytest.mark.unit
    def test_search_tools_basic_integration(self):
        """Test basic integration of search tools"""
        # Test vector search
        vector_result = adk_vector_search.func("test vector query")
        assert isinstance(vector_result, str)
        assert len(vector_result) > 0

        # Test knowledge search
        knowledge_result = adk_search_knowledge.func("test knowledge query")
        assert isinstance(knowledge_result, str)
        assert len(knowledge_result) > 0

    @pytest.mark.unit
    def test_search_tools_consistency(self):
        """Test search tools return consistent results"""
        # Test that tools handle the same query consistently
        query = "machine learning"

        # Run multiple times to check consistency
        vector_results = []
        knowledge_results = []

        for _ in range(3):
            vector_results.append(adk_vector_search.func(query))
            knowledge_results.append(adk_search_knowledge.func(query))

        # All results should be strings
        for result in vector_results + knowledge_results:
            assert isinstance(result, str)
            assert len(result) > 0

        # Results should be consistent (same query should return same structure)
        for i in range(1, len(vector_results)):
            try:
                parsed1 = json.loads(vector_results[0])
                parsed2 = json.loads(vector_results[i])
                assert parsed1["query"] == parsed2["query"]
            except json.JSONDecodeError:
                pytest.fail("vector_search should return valid JSON")

    @pytest.mark.unit
    def test_search_tools_different_queries(self):
        """Test search tools with different types of queries"""
        test_queries = [
            "machine learning",
            "artificial intelligence",
            "data science",
            "neural networks",
            "python programming",
        ]

        for query in test_queries:
            # Test vector search
            vector_result = adk_vector_search.func(query)
            assert isinstance(vector_result, str)
            assert len(vector_result) > 0

            # Test knowledge search
            knowledge_result = adk_search_knowledge.func(query)
            assert isinstance(knowledge_result, str)
            assert len(knowledge_result) > 0
