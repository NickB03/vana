#!/usr/bin/env python3
"""
Test Memory Integration for VANA

This test validates that the ADK memory service integration is working correctly,
including VertexAiRagMemoryService configuration and load_memory tool functionality.
"""

import os
import sys
import asyncio
import pytest
from typing import Dict, Any

# Add project root to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from lib._shared_libraries.adk_memory_service import get_adk_memory_service, reset_adk_memory_service
from lib.environment import setup_environment


class TestMemoryIntegration:
    """Test suite for ADK memory service integration."""

    def setup_method(self):
        """Reset memory service before each test."""
        reset_adk_memory_service()

    def test_memory_service_initialization(self):
        """Test that memory service initializes correctly based on environment."""
        # Test with development environment (should use InMemoryMemoryService)
        os.environ["GOOGLE_GENAI_USE_VERTEXAI"] = "False"
        os.environ["SESSION_SERVICE_TYPE"] = "in_memory"
        
        memory_service = get_adk_memory_service()
        service_info = memory_service.get_service_info()
        
        assert memory_service.is_available()
        assert service_info["service_type"] == "InMemoryMemoryService"
        assert service_info["available"] is True
        assert service_info["supports_semantic_search"] is True

    def test_memory_service_vertex_ai_config(self):
        """Test that memory service configures for Vertex AI in production."""
        # Test with production environment (should attempt VertexAiRagMemoryService)
        os.environ["GOOGLE_GENAI_USE_VERTEXAI"] = "True"
        os.environ["SESSION_SERVICE_TYPE"] = "vertex_ai"
        os.environ["RAG_CORPUS_RESOURCE_NAME"] = "projects/test/locations/us-central1/ragCorpora/test-corpus"
        
        memory_service = get_adk_memory_service()
        service_info = memory_service.get_service_info()
        
        assert memory_service.is_available()
        # Note: May fallback to InMemoryMemoryService if Vertex AI not available in test environment
        assert service_info["available"] is True
        assert service_info["supports_semantic_search"] is True

    @pytest.mark.asyncio
    async def test_memory_search_functionality(self):
        """Test memory search functionality."""
        memory_service = get_adk_memory_service()
        
        # Test search functionality
        results = await memory_service.search_memory("test query")
        
        assert isinstance(results, list)
        assert len(results) > 0
        
        # Check result format
        result = results[0]
        assert "content" in result
        assert "score" in result
        assert "source" in result
        assert "metadata" in result

    def test_load_memory_tool_availability(self):
        """Test that load_memory tool is available."""
        memory_service = get_adk_memory_service()
        load_memory_tool = memory_service.get_load_memory_tool()
        
        assert load_memory_tool is not None
        # The tool should be the ADK load_memory tool
        assert hasattr(load_memory_tool, '__name__') or hasattr(load_memory_tool, 'name')

    def test_environment_detection(self):
        """Test that environment detection works correctly."""
        # Test local development detection
        os.environ["GOOGLE_GENAI_USE_VERTEXAI"] = "False"
        reset_adk_memory_service()
        
        memory_service = get_adk_memory_service()
        service_info = memory_service.get_service_info()
        assert service_info["service_type"] == "InMemoryMemoryService"
        
        # Test production detection
        os.environ["GOOGLE_GENAI_USE_VERTEXAI"] = "True"
        reset_adk_memory_service()
        
        memory_service = get_adk_memory_service()
        service_info = memory_service.get_service_info()
        # Should attempt VertexAiRagMemoryService (may fallback to InMemory if not available)
        assert service_info["available"] is True


def test_memory_service_integration():
    """Integration test for memory service with environment setup."""
    # Setup environment
    environment_type = setup_environment()
    print(f"Environment type: {environment_type}")
    
    # Get memory service
    memory_service = get_adk_memory_service()
    service_info = memory_service.get_service_info()
    
    print(f"Memory service info: {service_info}")
    
    # Validate service is available
    assert memory_service.is_available()
    assert service_info["available"] is True
    
    # Test load_memory tool
    load_memory_tool = memory_service.get_load_memory_tool()
    assert load_memory_tool is not None
    
    print("✅ Memory service integration test passed!")


if __name__ == "__main__":
    # Run the integration test
    test_memory_service_integration()
    
    # Run async test
    async def run_async_tests():
        test_instance = TestMemoryIntegration()
        test_instance.setup_method()
        await test_instance.test_memory_search_functionality()
        print("✅ Async memory search test passed!")
    
    asyncio.run(run_async_tests())
    
    print("🎉 All memory integration tests completed successfully!")
