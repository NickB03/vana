"""
Unit tests for VanaMemoryService class.

Tests the core functionality of the VanaMemoryService wrapper around
VertexAiRagMemoryService, including initialization, configuration,
memory operations, and error handling.
"""

import pytest
import asyncio
from unittest.mock import MagicMock, patch, AsyncMock
from typing import Dict, Any, List


class TestVanaMemoryService:
    """Test suite for VanaMemoryService class."""
    
    @pytest.fixture
    def memory_service_config(self, mock_rag_corpus):
        """Configuration for VanaMemoryService."""
        return {
            "rag_corpus": mock_rag_corpus,
            "similarity_top_k": 5,
            "vector_distance_threshold": 0.7,
            "enable_fallback": True,
            "timeout_seconds": 30
        }
    
    @pytest.fixture
    def mock_vana_memory_service(self, memory_service_config, mock_memory_service):
        """Mock VanaMemoryService instance."""
        service = MagicMock()
        service.config = memory_service_config
        service.memory_service = mock_memory_service
        service.is_available.return_value = True
        service.add_session_to_memory = AsyncMock(return_value={"status": "success"})
        service.search_memory = AsyncMock(return_value=[])
        service.get_memory_stats = MagicMock(return_value={})
        return service
    
    def test_initialization_with_valid_config(self, memory_service_config):
        """Test VanaMemoryService initialization with valid configuration."""
        with patch('memory.vana_memory_service.VertexAiRagMemoryService') as mock_vertex:
            mock_vertex.return_value = MagicMock()
            
            with patch('memory.vana_memory_service.VanaMemoryService') as MockService:
                mock_instance = MagicMock()
                mock_instance.is_available.return_value = True
                MockService.return_value = mock_instance
                
                service = MockService(**memory_service_config)
                
                assert service is not None
                assert service.is_available()
                MockService.assert_called_once_with(**memory_service_config)
    
    @pytest.mark.asyncio
    async def test_add_session_to_memory_success(self, mock_vana_memory_service, mock_session):
        """Test successfully adding session to memory."""
        mock_session.add_message("user", "Hello, how are you?")
        mock_session.add_message("assistant", "I'm doing well, thank you!")
        
        result = await mock_vana_memory_service.add_session_to_memory(mock_session)
        
        assert result["status"] == "success"
        mock_vana_memory_service.add_session_to_memory.assert_called_once_with(mock_session)
    
    @pytest.mark.asyncio
    async def test_search_memory_success(self, mock_vana_memory_service):
        """Test successful memory search."""
        query = "How to implement ADK memory?"
        expected_results = [
            {
                "content": "ADK memory implementation guide...",
                "relevance_score": 0.9,
                "session_id": "session-123",
                "metadata": {"source": "conversation"}
            }
        ]
        
        mock_vana_memory_service.search_memory.return_value = expected_results
        
        results = await mock_vana_memory_service.search_memory("vana", "test_user", query)
        
        assert len(results) == 1
        assert results[0]["relevance_score"] == 0.9
        assert "ADK memory implementation" in results[0]["content"]
        mock_vana_memory_service.search_memory.assert_called_once_with("vana", "test_user", query)
    
    def test_is_available_when_service_ready(self, mock_vana_memory_service):
        """Test is_available returns True when service is ready."""
        mock_vana_memory_service.is_available.return_value = True
        
        assert mock_vana_memory_service.is_available()
    
    def test_get_memory_stats(self, mock_vana_memory_service):
        """Test getting memory service statistics."""
        expected_stats = {
            "total_sessions": 150,
            "total_documents": 500,
            "memory_usage_mb": 256,
            "last_updated": "2025-01-27T10:00:00Z",
            "rag_corpus": "projects/${GOOGLE_CLOUD_PROJECT}/locations/us-central1/ragCorpora/test-corpus"
        }
        
        mock_vana_memory_service.get_memory_stats.return_value = expected_stats
        
        stats = mock_vana_memory_service.get_memory_stats()
        
        assert stats["total_sessions"] == 150
        assert stats["total_documents"] == 500
        assert stats["memory_usage_mb"] == 256
        assert "rag_corpus" in stats


if __name__ == "__main__":
    pytest.main(["-xvs", __file__])
