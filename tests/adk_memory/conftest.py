"""
Pytest configuration and fixtures for ADK memory tests.

This module provides shared fixtures and configuration for all ADK memory tests,
including mock services, test data, and common setup/teardown functionality.
"""

import pytest
import os
import tempfile
import shutil
from unittest.mock import MagicMock, patch, AsyncMock
from typing import Dict, Any, List, Optional
import asyncio
from datetime import datetime, timedelta


# Mock ADK Classes for Testing
class MockVertexAiRagMemoryService:
    """Mock implementation of VertexAiRagMemoryService for testing."""
    
    def __init__(self, rag_corpus: str, similarity_top_k: int = 5, 
                 vector_distance_threshold: float = 0.7):
        self.rag_corpus = rag_corpus
        self.similarity_top_k = similarity_top_k
        self.vector_distance_threshold = vector_distance_threshold
        self.memory_store = {}
        self.session_store = {}
        
    async def add_session_to_memory(self, session):
        """Mock adding session to memory."""
        session_id = f"{session.app_name}_{session.user_id}_{session.session_id}"
        self.session_store[session_id] = {
            "session": session,
            "timestamp": datetime.now(),
            "messages": getattr(session, 'messages', [])
        }
        return {"status": "success", "session_id": session_id}
        
    async def search_memory(self, app_name: str, user_id: str, query: str):
        """Mock memory search functionality."""
        # Simulate search results
        results = []
        for session_id, session_data in self.session_store.items():
            if app_name in session_id and user_id in session_id:
                # Simple keyword matching for mock
                if any(word.lower() in str(session_data).lower() 
                      for word in query.split()):
                    results.append({
                        "session_id": session_id,
                        "relevance_score": 0.8,
                        "content": f"Mock result for query: {query}",
                        "metadata": session_data.get("metadata", {})
                    })
        return results[:self.similarity_top_k]


class MockSession:
    """Mock ADK Session for testing."""
    
    def __init__(self, app_name: str, user_id: str, session_id: str):
        self.app_name = app_name
        self.user_id = user_id
        self.session_id = session_id
        self.state = {}
        self.messages = []
        self.created_at = datetime.now()
        
    def add_message(self, role: str, content: str, metadata: Optional[Dict] = None):
        """Add message to session."""
        message = {
            "role": role,
            "content": content,
            "timestamp": datetime.now().isoformat(),
            "metadata": metadata or {}
        }
        self.messages.append(message)
        return message


class MockSessionService:
    """Mock ADK SessionService for testing."""
    
    def __init__(self):
        self.sessions = {}
        
    def create_session(self, app_name: str, user_id: str, session_id: str):
        """Create a new session."""
        session = MockSession(app_name, user_id, session_id)
        key = (app_name, user_id, session_id)
        self.sessions[key] = session
        return session
        
    def get_session(self, app_name: str, user_id: str, session_id: str):
        """Get existing session."""
        key = (app_name, user_id, session_id)
        return self.sessions.get(key)


# Pytest Fixtures
@pytest.fixture
def mock_rag_corpus():
    """Provide mock RAG corpus resource name."""
    return "projects/analystai-454200/locations/us-central1/ragCorpora/test-corpus"


@pytest.fixture
def mock_memory_service(mock_rag_corpus):
    """Provide mock VertexAiRagMemoryService."""
    return MockVertexAiRagMemoryService(
        rag_corpus=mock_rag_corpus,
        similarity_top_k=5,
        vector_distance_threshold=0.7
    )


@pytest.fixture
def mock_session_service():
    """Provide mock SessionService."""
    return MockSessionService()


@pytest.fixture
def mock_session(mock_session_service):
    """Provide mock Session."""
    return mock_session_service.create_session("vana", "test_user", "test_session")


@pytest.fixture
def sample_conversation_data():
    """Provide sample conversation data for testing."""
    return [
        {
            "role": "user",
            "content": "How do I implement ADK memory in VANA?",
            "timestamp": "2025-01-27T10:00:00Z"
        },
        {
            "role": "assistant", 
            "content": "To implement ADK memory, you need to use VertexAiRagMemoryService...",
            "timestamp": "2025-01-27T10:00:30Z"
        }
    ]


@pytest.fixture
def mock_environment_variables():
    """Mock environment variables for testing."""
    env_vars = {
        "RAG_CORPUS_RESOURCE_NAME": "projects/analystai-454200/locations/us-central1/ragCorpora/test-corpus",
        "SIMILARITY_TOP_K": "5",
        "VECTOR_DISTANCE_THRESHOLD": "0.7",
        "GOOGLE_CLOUD_PROJECT": "analystai-454200",
        "VERTEX_AI_REGION": "us-central1"
    }
    
    with patch.dict(os.environ, env_vars):
        yield env_vars


# Test Configuration
pytest_plugins = ["pytest_asyncio"]


# Mock patches for common ADK imports
@pytest.fixture(autouse=True)
def mock_adk_imports():
    """Mock ADK imports that might not be available in test environment."""
    with patch.dict('sys.modules', {
        'google.adk.memory': MagicMock(),
        'google.adk.sessions': MagicMock(),
        'google.adk.tools': MagicMock(),
        'google.adk.core': MagicMock()
    }):
        yield
