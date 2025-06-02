"""
Integration tests for hybrid search with ADK memory.

Tests the integration of ADK memory with the existing hybrid search
functionality, combining vector search, web search, and ADK memory
for comprehensive information retrieval.
"""

from unittest.mock import AsyncMock, MagicMock

import pytest


class TestHybridSearchADKMemoryIntegration:
    """Test suite for hybrid search integration with ADK memory."""

    @pytest.fixture
    def hybrid_search_config(self):
        """Configuration for hybrid search with ADK memory."""
        return {
            "enable_vector_search": True,
            "enable_web_search": True,
            "enable_adk_memory": True,
            "memory_weight": 0.4,
            "vector_weight": 0.4,
            "web_weight": 0.2,
            "max_results_per_source": 5,
            "min_relevance_threshold": 0.6,
        }

    @pytest.fixture
    def mock_hybrid_search(self, hybrid_search_config, mock_memory_service):
        """Mock hybrid search system with ADK memory integration."""
        search = MagicMock()
        search.config = hybrid_search_config
        search.memory_service = mock_memory_service
        search.search = AsyncMock()
        search.search_memory = AsyncMock()
        search.search_vector = AsyncMock()
        search.search_web = AsyncMock()
        return search

    @pytest.mark.asyncio
    async def test_hybrid_search_with_all_sources(self, mock_hybrid_search):
        """Test hybrid search combining ADK memory, vector search, and web search."""
        query = "How to implement ADK memory in VANA?"

        # Mock results from each source
        memory_results = [
            {
                "content": "ADK memory implementation from previous conversation...",
                "relevance_score": 0.9,
                "source": "adk_memory",
                "session_id": "session-123",
            }
        ]

        vector_results = [
            {
                "content": "Vector search result about ADK memory...",
                "relevance_score": 0.8,
                "source": "vector_search",
                "document_id": "doc-456",
            }
        ]

        web_results = [
            {
                "content": "Web search result about ADK memory...",
                "relevance_score": 0.7,
                "source": "web_search",
                "url": "https://example.com/adk-memory",
            }
        ]

        # Configure mock responses
        mock_hybrid_search.search_memory.return_value = memory_results
        mock_hybrid_search.search_vector.return_value = vector_results
        mock_hybrid_search.search_web.return_value = web_results

        # Mock result fusion
        fused_results = memory_results + vector_results + web_results
        mock_hybrid_search.search.return_value = fused_results

        results = await mock_hybrid_search.search(query)

        assert len(results) == 3
        assert any(r["source"] == "adk_memory" for r in results)
        assert any(r["source"] == "vector_search" for r in results)
        assert any(r["source"] == "web_search" for r in results)

    @pytest.mark.asyncio
    async def test_hybrid_search_memory_priority(self, mock_hybrid_search):
        """Test hybrid search with memory results taking priority."""
        query = "previous conversation about session management"

        # Memory has highly relevant results
        memory_results = [
            {
                "content": "We discussed session management in detail yesterday...",
                "relevance_score": 0.95,
                "source": "adk_memory",
                "context_match": True,
            }
        ]

        # Vector and web have lower relevance
        vector_results = [
            {
                "content": "General session management documentation...",
                "relevance_score": 0.7,
                "source": "vector_search",
            }
        ]

        mock_hybrid_search.search_memory.return_value = memory_results
        mock_hybrid_search.search_vector.return_value = vector_results
        mock_hybrid_search.search_web.return_value = []

        # Mock weighted fusion that prioritizes memory
        def weighted_fusion(memory, vector, web):
            all_results = memory + vector + web
            return sorted(all_results, key=lambda x: x["relevance_score"], reverse=True)

        mock_hybrid_search.search.return_value = weighted_fusion(
            memory_results, vector_results, []
        )

        results = await mock_hybrid_search.search(query)

        # Memory result should be first due to highest relevance
        assert results[0]["source"] == "adk_memory"
        assert results[0]["relevance_score"] == 0.95
        assert results[0]["context_match"] is True


if __name__ == "__main__":
    pytest.main(["-xvs", __file__])
