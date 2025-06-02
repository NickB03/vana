import asyncio
import unittest
from unittest.mock import MagicMock, patch

from tools.hybrid_search_delta import HybridSearchDelta


class TestHybridSearchDelta(unittest.TestCase):
    """Test cases for Hybrid Search with Delta Updates."""

    def setUp(self):
        self.mock_memory_manager = MagicMock()
        self.hybrid_search = HybridSearchDelta(self.mock_memory_manager)

    @patch("tools.hybrid_search_delta.search_knowledge")
    def test_search(self, mock_search_knowledge):
        """Test hybrid search functionality."""
        # Setup mocks
        mock_search_knowledge.return_value = {
            "results": [
                {"content": "Vector result 1", "distance": 0.9},
                {"content": "Vector result 2", "distance": 0.8},
            ],
            "count": 2,
        }

        # Mock the _search_knowledge_graph method
        self.hybrid_search._search_knowledge_graph = MagicMock(
            return_value={
                "results": [
                    {"id": "kg1", "name": "KG result 1", "observations": ["KG obs 1"]},
                    {"id": "kg2", "name": "KG result 2", "observations": ["KG obs 2"]},
                ],
                "count": 2,
            }
        )

        # Run the test using asyncio
        result = asyncio.run(self.hybrid_search.search("test query"))

        # Verify the result
        self.assertEqual(len(result["results"]), 4)  # Should have all 4 results
        self.assertEqual(result["sources"]["vector_search"], 2)
        self.assertEqual(result["sources"]["knowledge_graph"], 2)

        # Verify the memory manager was called to sync
        self.mock_memory_manager.sync_if_needed.assert_called_once()

    def test_merge_results(self):
        """Test merging results from different sources."""
        # Create test data
        vector_results = {
            "results": [
                {"content": "Vector result 1", "score": 0.9},
                {"content": "Vector result 2", "score": 0.8},
            ],
            "count": 2,
        }

        kg_results = {
            "results": [
                {"id": "kg1", "name": "KG result 1", "observations": ["KG obs 1"]},
                {"id": "kg2", "name": "KG result 2", "observations": ["KG obs 2"]},
            ],
            "count": 2,
        }

        # Call method
        result = self.hybrid_search._merge_results(vector_results, kg_results, top_k=3)

        # Verify result
        self.assertEqual(len(result["results"]), 3)  # Limited to top_k=3
        self.assertEqual(result["sources"]["vector_search"], 2)
        self.assertEqual(result["sources"]["knowledge_graph"], 2)

    def test_format_results(self):
        """Test formatting search results."""
        # Create test data
        results = {
            "results": [
                {
                    "content": "Vector result 1",
                    "score": 0.9,
                    "metadata": {"source": "doc1.md"},
                    "source_type": "vector_search",
                },
                {
                    "name": "KG result 1",
                    "type": "concept",
                    "observations": ["KG observation 1"],
                    "source_type": "knowledge_graph",
                },
            ],
            "count": 2,
            "sources": {"vector_search": 1, "knowledge_graph": 1},
        }

        # Call method
        formatted = self.hybrid_search.format_results(results)

        # Verify result
        self.assertIn("[Vector Search]", formatted)
        self.assertIn("[Knowledge Graph]", formatted)
        self.assertIn("Vector result 1", formatted)
        self.assertIn("KG observation 1", formatted)
        self.assertIn(
            "Sources: 1 from Vector Search, 1 from Knowledge Graph", formatted
        )


if __name__ == "__main__":
    unittest.main()
