"""
Comprehensive tests for Vector Search Service.
Target: 15% → 80%+ coverage
"""

import json
import pytest
import vcr
from unittest.mock import Mock, patch, MagicMock, AsyncMock
from google.cloud import aiplatform

from lib._shared_libraries.vector_search_service import VectorSearchService
from tests.fixtures.vcr_config import get_test_vcr, MOCK_RESPONSES


class TestVectorSearchService:
    """Test suite for VectorSearchService class."""

    @pytest.fixture
    def service(self):
        """Create a VectorSearchService instance for testing."""
        return VectorSearchService(
            project_id="test-project",
            location="us-central1",
            index_endpoint_id="test-endpoint",
            deployed_index_id="test-index"
        )

    @pytest.fixture
    def mock_vertex_client(self):
        """Mock Vertex AI client."""
        with patch('lib._shared_libraries.vector_search_service.aiplatform') as mock_ai:
            mock_client = Mock()
            mock_ai.MatchingEngineIndexEndpoint.return_value = mock_client
            yield mock_client

    def test_init_with_required_params(self):
        """Test service initialization with required parameters."""
        service = VectorSearchService(
            project_id="test-project",
            location="us-central1",
            index_endpoint_id="test-endpoint",
            deployed_index_id="test-index"
        )
        
        assert service.project_id == "test-project"
        assert service.location == "us-central1"
        assert service.index_endpoint_id == "test-endpoint"
        assert service.deployed_index_id == "test-index"

    def test_init_with_optional_params(self):
        """Test service initialization with optional parameters."""
        service = VectorSearchService(
            project_id="test-project",
            location="us-central1",
            index_endpoint_id="test-endpoint",
            deployed_index_id="test-index",
            api_endpoint="custom-endpoint.googleapis.com",
            credentials_path="/path/to/credentials.json"
        )
        
        assert service.api_endpoint == "custom-endpoint.googleapis.com"
        assert service.credentials_path == "/path/to/credentials.json"

    def test_init_missing_required_params(self):
        """Test service initialization with missing required parameters."""
        with pytest.raises(ValueError, match="project_id is required"):
            VectorSearchService(
                project_id="",
                location="us-central1",
                index_endpoint_id="test-endpoint",
                deployed_index_id="test-index"
            )

    @patch('lib._shared_libraries.vector_search_service.aiplatform.init')
    def test_initialize_client_success(self, mock_init, service):
        """Test successful client initialization."""
        service._initialize_client()
        
        mock_init.assert_called_once_with(
            project=service.project_id,
            location=service.location
        )

    @patch('lib._shared_libraries.vector_search_service.aiplatform.init')
    def test_initialize_client_with_credentials(self, mock_init):
        """Test client initialization with credentials."""
        service = VectorSearchService(
            project_id="test-project",
            location="us-central1",
            index_endpoint_id="test-endpoint",
            deployed_index_id="test-index",
            credentials_path="/path/to/creds.json"
        )
        
        with patch('lib._shared_libraries.vector_search_service.service_account.Credentials.from_service_account_file') as mock_creds:
            mock_creds.return_value = Mock()
            service._initialize_client()
            
            mock_creds.assert_called_once_with("/path/to/creds.json")

    @patch('lib._shared_libraries.vector_search_service.requests.post')
    def test_generate_embedding_success(self, mock_post, service):
        """Test successful embedding generation."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = MOCK_RESPONSES['google_vertex']
        mock_post.return_value = mock_response

        with patch.object(service, '_get_access_token', return_value="test-token"):
            embedding = service._generate_embedding("test text")
            
            assert isinstance(embedding, list)
            assert len(embedding) == 768
            assert all(isinstance(x, (int, float)) for x in embedding)

    @patch('lib._shared_libraries.vector_search_service.requests.post')
    def test_generate_embedding_error(self, mock_post, service):
        """Test embedding generation with error."""
        mock_post.side_effect = Exception("API Error")

        with patch.object(service, '_get_access_token', return_value="test-token"):
            with pytest.raises(Exception, match="API Error"):
                service._generate_embedding("test text")

    def test_generate_embedding_empty_text(self, service):
        """Test embedding generation with empty text."""
        with pytest.raises(ValueError, match="Text cannot be empty"):
            service._generate_embedding("")

    @patch('lib._shared_libraries.vector_search_service.google.auth.default')
    def test_get_access_token_success(self, mock_auth, service):
        """Test successful access token retrieval."""
        mock_credentials = Mock()
        mock_credentials.token = "test-access-token"
        mock_auth.return_value = (mock_credentials, "test-project")

        token = service._get_access_token()
        assert token == "test-access-token"

    @patch('lib._shared_libraries.vector_search_service.google.auth.default')
    def test_get_access_token_error(self, mock_auth, service):
        """Test access token retrieval with error."""
        mock_auth.side_effect = Exception("Auth error")

        with pytest.raises(Exception, match="Auth error"):
            service._get_access_token()

    def test_search_success(self, service, mock_vertex_client):
        """Test successful vector search."""
        # Mock embedding generation
        with patch.object(service, '_generate_embedding', return_value=[0.1] * 768):
            # Mock search response
            mock_response = [
                Mock(id="doc1", distance=0.1),
                Mock(id="doc2", distance=0.2)
            ]
            mock_vertex_client.find_neighbors.return_value = mock_response

            results = service.search("test query", num_neighbors=5)
            
            assert isinstance(results, list)
            assert len(results) == 2
            assert results[0]["id"] == "doc1"
            assert results[0]["score"] == 0.9  # 1 - distance

    def test_search_empty_query(self, service):
        """Test search with empty query."""
        with pytest.raises(ValueError, match="Query cannot be empty"):
            service.search("")

    def test_search_invalid_num_neighbors(self, service):
        """Test search with invalid num_neighbors."""
        with pytest.raises(ValueError, match="num_neighbors must be positive"):
            service.search("test query", num_neighbors=0)

    def test_search_with_filter(self, service, mock_vertex_client):
        """Test search with metadata filter."""
        with patch.object(service, '_generate_embedding', return_value=[0.1] * 768):
            mock_response = [Mock(id="doc1", distance=0.1)]
            mock_vertex_client.find_neighbors.return_value = mock_response

            filter_dict = {"category": "technology"}
            results = service.search("test query", filter=filter_dict)
            
            # Verify filter was passed to find_neighbors
            call_args = mock_vertex_client.find_neighbors.call_args
            assert "filter" in call_args[1] or len(call_args[0]) > 2

    @patch('lib._shared_libraries.vector_search_service.aiplatform.MatchingEngineIndex')
    def test_add_documents_success(self, mock_index, service):
        """Test successful document addition."""
        mock_index_instance = Mock()
        mock_index.return_value = mock_index_instance
        
        documents = [
            {"id": "doc1", "content": "Document 1", "metadata": {"type": "text"}},
            {"id": "doc2", "content": "Document 2", "metadata": {"type": "text"}}
        ]

        with patch.object(service, '_generate_embedding', return_value=[0.1] * 768):
            result = service.add_documents(documents)
            
            assert result["status"] == "success"
            assert result["added_count"] == 2

    def test_add_documents_empty_list(self, service):
        """Test adding empty document list."""
        with pytest.raises(ValueError, match="Documents list cannot be empty"):
            service.add_documents([])

    def test_add_documents_invalid_format(self, service):
        """Test adding documents with invalid format."""
        invalid_docs = [{"content": "Missing ID"}]
        
        with pytest.raises(ValueError, match="Document must have 'id' and 'content'"):
            service.add_documents(invalid_docs)

    def test_delete_documents_success(self, service, mock_vertex_client):
        """Test successful document deletion."""
        document_ids = ["doc1", "doc2"]
        
        # Mock the delete operation
        mock_vertex_client.delete_datapoints.return_value = Mock()
        
        result = service.delete_documents(document_ids)
        
        assert result["status"] == "success"
        assert result["deleted_count"] == 2

    def test_delete_documents_empty_list(self, service):
        """Test deleting with empty ID list."""
        with pytest.raises(ValueError, match="Document IDs list cannot be empty"):
            service.delete_documents([])

    def test_get_document_success(self, service, mock_vertex_client):
        """Test successful document retrieval."""
        mock_vertex_client.read_datapoints.return_value = [
            Mock(datapoint_id="doc1", feature_vector=[0.1] * 768)
        ]
        
        document = service.get_document("doc1")
        
        assert document["id"] == "doc1"
        assert "embedding" in document

    def test_get_document_not_found(self, service, mock_vertex_client):
        """Test document retrieval when not found."""
        mock_vertex_client.read_datapoints.return_value = []
        
        document = service.get_document("nonexistent")
        
        assert document is None

    def test_list_documents_success(self, service, mock_vertex_client):
        """Test successful document listing."""
        mock_vertex_client.read_datapoints.return_value = [
            Mock(datapoint_id="doc1", feature_vector=[0.1] * 768),
            Mock(datapoint_id="doc2", feature_vector=[0.2] * 768)
        ]
        
        documents = service.list_documents(limit=10)
        
        assert isinstance(documents, list)
        assert len(documents) == 2
        assert documents[0]["id"] == "doc1"

    def test_get_index_stats_success(self, service, mock_vertex_client):
        """Test successful index statistics retrieval."""
        mock_vertex_client.get_index_stats.return_value = {
            "vectors_count": 1000,
            "shards_count": 2
        }
        
        stats = service.get_index_stats()
        
        assert stats["vectors_count"] == 1000
        assert stats["shards_count"] == 2

    def test_health_check_success(self, service, mock_vertex_client):
        """Test successful health check."""
        mock_vertex_client.get_index_stats.return_value = {"status": "ready"}
        
        health = service.health_check()
        
        assert health["status"] == "healthy"
        assert "timestamp" in health

    def test_health_check_failure(self, service, mock_vertex_client):
        """Test health check failure."""
        mock_vertex_client.get_index_stats.side_effect = Exception("Service unavailable")
        
        health = service.health_check()
        
        assert health["status"] == "unhealthy"
        assert "error" in health


class TestVectorSearchServiceIntegration:
    """Integration tests with VCR for real API behavior."""

    @pytest.fixture
    def vcr_service(self):
        """Create service for VCR tests."""
        return VectorSearchService(
            project_id="test-project-vcr",
            location="us-central1",
            index_endpoint_id="test-endpoint-vcr",
            deployed_index_id="test-index-vcr"
        )

    @vcr.use_cassette('tests/fixtures/cassettes/vector_search_embedding.yaml')
    def test_embedding_generation_integration(self, vcr_service):
        """Test embedding generation with VCR."""
        with patch.object(vcr_service, '_get_access_token', return_value="test-token"):
            # This will record/replay actual API calls
            embedding = vcr_service._generate_embedding("test text for embedding")
            
            assert isinstance(embedding, list)
            assert len(embedding) > 0

    @vcr.use_cassette('tests/fixtures/cassettes/vector_search_query.yaml')
    def test_search_integration(self, vcr_service):
        """Test search integration with VCR."""
        with patch.object(vcr_service, '_generate_embedding', return_value=[0.1] * 768):
            with patch.object(vcr_service, '_initialize_client'):
                # Mock the vertex client for this test
                mock_client = Mock()
                mock_client.find_neighbors.return_value = [
                    Mock(id="doc1", distance=0.1)
                ]
                vcr_service.client = mock_client
                
                results = vcr_service.search("test query")
                assert isinstance(results, list)


class TestVectorSearchServiceEdgeCases:
    """Test edge cases and error conditions."""

    def test_service_with_unicode_text(self, service):
        """Test service with unicode text."""
        with patch.object(service, '_generate_embedding', return_value=[0.1] * 768):
            with patch.object(service, 'client') as mock_client:
                mock_client.find_neighbors.return_value = []
                
                results = service.search("Hello, 世界! 🌍")
                assert isinstance(results, list)

    def test_service_with_very_long_text(self, service):
        """Test service with very long text."""
        long_text = "word " * 1000  # Very long text
        
        with patch.object(service, '_generate_embedding', return_value=[0.1] * 768):
            with patch.object(service, 'client') as mock_client:
                mock_client.find_neighbors.return_value = []
                
                results = service.search(long_text)
                assert isinstance(results, list)

    def test_concurrent_requests(self, service):
        """Test handling of concurrent requests."""
        import threading
        import time
        
        results = []
        
        def search_worker():
            with patch.object(service, '_generate_embedding', return_value=[0.1] * 768):
                with patch.object(service, 'client') as mock_client:
                    mock_client.find_neighbors.return_value = [Mock(id="doc1", distance=0.1)]
                    result = service.search(f"query {threading.current_thread().ident}")
                    results.append(result)
        
        threads = [threading.Thread(target=search_worker) for _ in range(5)]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join()
        
        assert len(results) == 5
