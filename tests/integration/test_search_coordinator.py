"""
Integration Tests for Search Coordinator

Tests the memory-first search priority logic and coordination between
memory, vector, and web search services.
"""

import asyncio
import json
import os
import sys
import unittest
from unittest.mock import AsyncMock, MagicMock, patch

# Add project root to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../.."))

from lib._tools.search_coordinator import QueryClassifier, SearchCoordinator


class TestQueryClassifier(unittest.TestCase):
    """Test query classification for search strategy determination."""

    def setUp(self):
        self.classifier = QueryClassifier()

    def test_vana_specific_queries(self):
        """Test classification of VANA-specific queries."""
        queries = [
            "What is VANA?",
            "How do VANA agents work?",
            "What tools does VANA have?",
            "VANA capabilities",
            "agent orchestration",
        ]

        for query in queries:
            classification = self.classifier.classify_query(query)
            self.assertEqual(classification["type"], "vana_specific")
            self.assertTrue(classification["is_vana_specific"])
            self.assertEqual(classification["priority"], ["memory", "vector"])
            self.assertGreaterEqual(classification["confidence"], 0.8)

    def test_user_context_queries(self):
        """Test classification of user preference/context queries."""
        queries = [
            "What are my preferences?",
            "Remember my usual choice",
            "How do I typically like to work?",
            "My last settings",
            "What did I prefer last time?",
        ]

        for query in queries:
            classification = self.classifier.classify_query(query)
            self.assertEqual(classification["type"], "user_context")
            self.assertTrue(classification["is_user_context"])
            self.assertEqual(classification["priority"], ["memory"])
            self.assertGreaterEqual(classification["confidence"], 0.9)

    def test_current_info_queries(self):
        """Test classification of current information queries."""
        queries = [
            "What's the weather today?",
            "Current news",
            "Latest stock prices",
            "What time is it now?",
            "Recent developments",
        ]

        for query in queries:
            classification = self.classifier.classify_query(query)
            self.assertEqual(classification["type"], "current_info")
            self.assertTrue(classification["requires_current"])
            self.assertEqual(classification["priority"], ["memory", "web"])
            self.assertGreaterEqual(classification["confidence"], 0.8)

    def test_technical_queries(self):
        """Test classification of technical/factual queries."""
        queries = [
            "How to implement async functions?",
            "What is machine learning?",
            "Explain recursion",
            "Algorithm for sorting",
            "Code example for API",
        ]

        for query in queries:
            classification = self.classifier.classify_query(query)
            self.assertEqual(classification["type"], "technical")
            self.assertEqual(classification["priority"], ["memory", "vector", "web"])
            self.assertGreaterEqual(classification["confidence"], 0.7)


class TestSearchCoordinator(unittest.TestCase):
    """Test search coordinator functionality."""

    def setUp(self):
        self.coordinator = SearchCoordinator()

    @patch("lib._tools.search_coordinator.get_adk_memory_service")
    @patch("lib._tools.search_coordinator.get_vector_search_service")
    def test_service_initialization(self, mock_vector, mock_memory):
        """Test proper initialization of search services."""
        # Mock memory service
        mock_memory_instance = MagicMock()
        mock_memory_instance.is_available.return_value = True
        mock_memory.return_value = mock_memory_instance

        # Mock vector service
        mock_vector_instance = MagicMock()
        mock_vector_instance.is_available.return_value = True
        mock_vector.return_value = mock_vector_instance

        # Create coordinator
        coordinator = SearchCoordinator()

        # Verify services are initialized
        self.assertIsNotNone(coordinator.memory_service)
        self.assertIsNotNone(coordinator.vector_service)

    @patch("lib._tools.search_coordinator.web_search")
    async def test_force_web_search(self, mock_web_search):
        """Test force web search bypasses memory/vector."""
        mock_web_search.return_value = json.dumps({"results": ["web result"]})

        result = await self.coordinator.coordinated_search("test query", force_web=True)

        # Verify web search was called
        mock_web_search.assert_called_once()

        # Verify result format
        result_data = json.loads(result)
        self.assertEqual(result_data["query"], "test query")
        self.assertIn("results", result_data)

    @patch("lib._tools.search_coordinator.web_search")
    async def test_current_info_direct_web(self, mock_web_search):
        """Test current information queries go directly to web."""
        mock_web_search.return_value = json.dumps({"weather": "sunny"})

        result = await self.coordinator.coordinated_search("What's the weather today?")

        # Verify web search was called for current info
        mock_web_search.assert_called_once()

        result_data = json.loads(result)
        self.assertEqual(result_data["query"], "What's the weather today?")

    def test_sufficient_results_logic(self):
        """Test logic for determining sufficient results."""
        # VANA-specific query with 2 results should be sufficient
        vana_classification = {"is_vana_specific": True}
        results = [{"relevance": 0.8}, {"relevance": 0.7}]
        self.assertTrue(self.coordinator._has_sufficient_results(results, vana_classification))

        # User context query with 1 result should be sufficient
        user_classification = {"is_user_context": True}
        results = [{"relevance": 0.9}]
        self.assertTrue(self.coordinator._has_sufficient_results(results, user_classification))

        # General query needs 3+ high-quality results
        general_classification = {"type": "general"}
        high_quality_results = [{"relevance": 0.8}, {"relevance": 0.9}, {"relevance": 0.75}]
        self.assertTrue(self.coordinator._has_sufficient_results(high_quality_results, general_classification))

        # Low quality results are not sufficient
        low_quality_results = [{"relevance": 0.3}, {"relevance": 0.4}]
        self.assertFalse(self.coordinator._has_sufficient_results(low_quality_results, general_classification))

    async def test_memory_search_mock(self):
        """Test memory search with mocked service."""
        # Mock memory service
        mock_memory = AsyncMock()
        mock_memory.search_memory.return_value = [{"content": "VANA is an AI system", "score": 0.9}]
        self.coordinator.memory_service = mock_memory

        results = await self.coordinator._search_memory("What is VANA?", 5)

        # Verify memory was searched
        mock_memory.search_memory.assert_called_once_with("What is VANA?", top_k=5)

        # Verify result format
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["source"], "memory")
        self.assertEqual(results[0]["relevance"], 0.9)

    async def test_vector_search_mock(self):
        """Test vector search with mocked service."""
        # Mock vector service
        mock_vector = AsyncMock()
        mock_vector.semantic_search_simple.return_value = [{"content": "technical content", "similarity_score": 0.8}]
        self.coordinator.vector_service = mock_vector

        results = await self.coordinator._search_vector("technical query", 5)

        # Verify vector search was called
        mock_vector.semantic_search_simple.assert_called_once_with("technical query", top_k=5)

        # Verify result format
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["source"], "vector")
        self.assertEqual(results[0]["relevance"], 0.8)

    def test_result_formatting(self):
        """Test result formatting and source attribution."""
        from datetime import datetime

        # Mock results from different sources
        memory_results = [{"relevance": 0.9, "data": {"content": "memory result"}}]
        vector_results = [{"relevance": 0.8, "data": {"content": "vector result"}}]
        web_results = ['{"title": "web result", "url": "http://example.com"}']

        classification = {"type": "technical", "confidence": 0.8}
        start_time = datetime.now()

        result = self.coordinator._format_coordinated_results(
            "test query", memory_results, vector_results, web_results, classification, start_time
        )

        # Parse and verify result structure
        result_data = json.loads(result)

        self.assertEqual(result_data["query"], "test query")
        self.assertIn("search_strategy", result_data)
        self.assertIn("results", result_data)
        self.assertIn("metadata", result_data)

        # Verify sources are properly attributed
        sources = [r["source"] for r in result_data["results"]]
        self.assertIn("memory", sources)
        self.assertIn("vector", sources)
        self.assertIn("web", sources)

        # Verify priority ordering (memory first)
        first_result = result_data["results"][0]
        self.assertEqual(first_result["priority"], 1)  # Memory has highest priority


class TestSearchCoordinatorIntegration(unittest.TestCase):
    """Integration tests with real services (when available)."""

    def setUp(self):
        self.coordinator = SearchCoordinator()

    @unittest.skipUnless(os.getenv("GOOGLE_CLOUD_PROJECT"), "Google Cloud project not configured")
    async def test_real_memory_service(self):
        """Test with real memory service if available."""
        if self.coordinator.memory_service:
            result = await self.coordinator.coordinated_search("What is VANA?")
            result_data = json.loads(result)

            self.assertIn("query", result_data)
            self.assertIn("search_strategy", result_data)
            self.assertIn("results", result_data)

    async def test_fallback_behavior(self):
        """Test graceful fallback when services are unavailable."""
        # Disable services
        self.coordinator.memory_service = None
        self.coordinator.vector_service = None

        with patch("lib._tools.search_coordinator.web_search") as mock_web:
            mock_web.return_value = json.dumps({"fallback": "web result"})

            result = await self.coordinator.coordinated_search("test query")
            result_data = json.loads(result)

            # Should still return valid result
            self.assertEqual(result_data["query"], "test query")
            self.assertIn("results", result_data)


def run_async_test(test_func):
    """Helper to run async tests."""
    return asyncio.run(test_func())


if __name__ == "__main__":
    # Run synchronous tests
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()

    # Add test classes
    suite.addTests(loader.loadTestsFromTestCase(TestQueryClassifier))
    suite.addTests(loader.loadTestsFromTestCase(TestSearchCoordinator))
    suite.addTests(loader.loadTestsFromTestCase(TestSearchCoordinatorIntegration))

    # Run tests
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)

    # Run async tests manually
    print("\n" + "=" * 60)
    print("ASYNC TESTS")
    print("=" * 60)

    # Test search coordinator async methods
    coordinator = SearchCoordinator()

    print("Testing coordinated search...")
    try:
        result = run_async_test(lambda: coordinator.coordinated_search("What is VANA?", max_results=3))
        print("✅ Coordinated search test passed")
        print(f"Result preview: {result[:200]}...")
    except Exception as e:
        print(f"❌ Coordinated search test failed: {e}")

    print("\nTesting force web search...")
    try:
        with patch("lib._tools.search_coordinator.web_search") as mock_web:
            mock_web.return_value = json.dumps({"test": "result"})
            result = run_async_test(lambda: coordinator.coordinated_search("test", force_web=True))
            print("✅ Force web search test passed")
    except Exception as e:
        print(f"❌ Force web search test failed: {e}")

    print(f"\nTests completed. Success: {result.wasSuccessful()}")
