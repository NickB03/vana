"""
Vector Search Client for VANA Memory System

This module provides a client for interacting with Vertex AI Vector Search.
It replaces the legacy Ragie.ai client with a more scalable and integrated solution.
"""

import os
import uuid
import logging
import requests
import importlib.util
from google.cloud import aiplatform
from typing import List, Dict, Any, Optional, Union

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class VectorSearchClient:
    """Client for interacting with Vertex AI Vector Search"""

    def __init__(self):
        """Initialize the Vector Search client"""
        self.project = os.environ.get("GOOGLE_CLOUD_PROJECT")
        self.location = os.environ.get("GOOGLE_CLOUD_LOCATION")
        self.endpoint_id = os.environ.get("VECTOR_SEARCH_ENDPOINT_ID")
        self.deployed_index_id = os.environ.get("DEPLOYED_INDEX_ID", "vanasharedindex")

        # Initialize Vertex AI if credentials are available
        if os.environ.get("GOOGLE_APPLICATION_CREDENTIALS"):
            try:
                aiplatform.init(project=self.project, location=self.location)

                # Get the index endpoint
                self.index_endpoint = aiplatform.MatchingEngineIndexEndpoint(
                    index_endpoint_name=self.endpoint_id
                )
            except Exception as e:
                print(f"Error initializing Vertex AI: {e}")
                self.index_endpoint = None
        else:
            self.index_endpoint = None

    def is_available(self) -> bool:
        """Check if Vector Search is available"""
        if not self.index_endpoint:
            logger.warning("Vector Search endpoint not initialized")
            return False

        try:
            # Create a simple test vector with the correct dimensions (768)
            # Use a list of floats instead of generating an embedding
            test_vector = [0.0] * 768

            # Simple test query with the test vector
            self.index_endpoint.match(
                deployed_index_id=self.deployed_index_id,
                queries=[{"datapoint": test_vector}],
                num_neighbors=1
            )
            logger.info("Vector Search is available")
            return True
        except Exception as e:
            logger.error(f"Vector Search is not available: {e}")
            return False

    def generate_embedding(self, text: str) -> List[float]:
        """Generate embedding for text using Vertex AI text-embedding-004 model"""
        # Check if we can use the real embedding service
        if not self.project or not self.location:
            logger.warning("Project or location not set, using mock embedding")
            return self._use_mock_embedding(text)

        endpoint = f"https://{self.location}-aiplatform.googleapis.com/v1/projects/{self.project}/locations/{self.location}/publishers/google/models/text-embedding-004:predict"

        try:
            auth_token = self._get_auth_token()
            if not auth_token:
                logger.error("Failed to get auth token")
                return self._use_mock_embedding(text)

            response = requests.post(
                endpoint,
                headers={"Authorization": f"Bearer {auth_token}"},
                json={"instances": [{"content": text}]}
            )
            response.raise_for_status()

            # Get the embedding values
            embedding_data = response.json()["predictions"][0]["embeddings"]

            # Extract values if in dictionary format
            if isinstance(embedding_data, dict) and "values" in embedding_data:
                embedding_values = embedding_data["values"]
            else:
                embedding_values = embedding_data

            # Ensure all values are float
            if isinstance(embedding_values, list) and embedding_values:
                # Convert all values to float
                embedding_values = [float(value) for value in embedding_values]
                logger.info(f"Generated embedding with {len(embedding_values)} dimensions")
                return embedding_values
            else:
                logger.error(f"Invalid embedding format: {type(embedding_values)}")
                return self._use_mock_embedding(text)
        except Exception as e:
            logger.error(f"Error generating embedding: {e}")
            return self._use_mock_embedding(text)

    def _use_mock_embedding(self, text: str) -> List[float]:
        """Use mock implementation for generating embeddings when real service is not available"""
        try:
            # Check if mock implementation is available
            mock_path = os.path.join(os.path.dirname(__file__), "vector_search_mock.py")
            if os.path.exists(mock_path):
                logger.info("Using mock Vector Search implementation for embedding")

                # Import mock implementation
                from tools.vector_search.vector_search_mock import MockVectorSearchClient

                # Create mock client and generate embedding
                mock_client = MockVectorSearchClient()
                return mock_client.generate_embedding(text)
            else:
                logger.warning("Mock Vector Search implementation not found")
                # Return a simple mock embedding (768 dimensions)
                return [0.1] * 768
        except Exception as e:
            logger.error(f"Error using mock Vector Search for embedding: {e}")
            # Return a simple mock embedding (768 dimensions)
            return [0.1] * 768

    def search(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """Search for relevant content using Vector Search"""
        if not self.is_available():
            logger.warning("Vector Search is not available, using mock implementation")
            return self._use_mock_search(query, top_k)

        try:
            # Generate embedding for the query
            query_embedding = self.generate_embedding(query)

            if not query_embedding:
                logger.error("Failed to generate embedding for query")
                return self._use_mock_search(query, top_k)

            # Ensure embedding is a list of floats
            if isinstance(query_embedding, dict) and "values" in query_embedding:
                query_embedding = query_embedding["values"]

            # Convert all values to float if they're strings
            if isinstance(query_embedding, list) and query_embedding and isinstance(query_embedding[0], str):
                query_embedding = [float(x) for x in query_embedding]

            # Search the index
            response = self.index_endpoint.match(
                deployed_index_id=self.deployed_index_id,
                queries=[{"datapoint": query_embedding}],
                num_neighbors=top_k
            )

            # Format results
            results = []
            for match in response[0]:
                results.append({
                    "content": match.document,
                    "score": match.distance,
                    "metadata": match.restricts
                })

            return results
        except Exception as e:
            logger.error(f"Error searching Vector Search: {e}")
            return self._use_mock_search(query, top_k)

    def _use_mock_search(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """Use mock implementation when real Vector Search is not available"""
        try:
            # Check if mock implementation is available
            mock_path = os.path.join(os.path.dirname(__file__), "vector_search_mock.py")
            if os.path.exists(mock_path):
                logger.info("Using mock Vector Search implementation")

                # Import mock implementation
                from tools.vector_search.vector_search_mock import MockVectorSearchClient

                # Create mock client and search
                mock_client = MockVectorSearchClient()
                return mock_client.search(query, top_k=top_k)
            else:
                logger.warning("Mock Vector Search implementation not found")
                return []
        except Exception as e:
            logger.error(f"Error using mock Vector Search: {e}")
            return []

    def upload_embedding(self, content: str, metadata: Dict[str, Any] = None) -> bool:
        """Upload content with embedding to Vector Search"""
        if not self.is_available():
            logger.warning("Vector Search is not available, using mock implementation")
            return self._use_mock_upload(content, metadata)

        try:
            # Generate embedding for the content
            embedding = self.generate_embedding(content)

            if not embedding:
                logger.error("Failed to generate embedding for content")
                return self._use_mock_upload(content, metadata)

            # Ensure embedding is a list of floats
            if isinstance(embedding, dict) and "values" in embedding:
                embedding = embedding["values"]

            # Convert all values to float if they're strings
            if isinstance(embedding, list) and embedding and isinstance(embedding[0], str):
                embedding = [float(x) for x in embedding]

            # Create datapoint
            datapoint = {
                "id": str(uuid.uuid4()),
                "feature_vector": embedding,
                "restricts": metadata or {}
            }

            # Upload to Vector Search
            self.index_endpoint.upsert_datapoints(
                deployed_index_id=self.deployed_index_id,
                datapoints=[datapoint]
            )

            return True
        except Exception as e:
            logger.error(f"Error uploading to Vector Search: {e}")
            return self._use_mock_upload(content, metadata)

    def _use_mock_upload(self, content: str, metadata: Dict[str, Any] = None) -> bool:
        """Use mock implementation for uploading when real Vector Search is not available"""
        try:
            # Check if mock implementation is available
            mock_path = os.path.join(os.path.dirname(__file__), "vector_search_mock.py")
            if os.path.exists(mock_path):
                logger.info("Using mock Vector Search implementation for upload")

                # Import mock implementation
                from tools.vector_search.vector_search_mock import MockVectorSearchClient

                # Create mock client and upload
                mock_client = MockVectorSearchClient()
                return mock_client.upload_embedding(content, metadata)
            else:
                logger.warning("Mock Vector Search implementation not found")
                return False
        except Exception as e:
            logger.error(f"Error using mock Vector Search for upload: {e}")
            return False

    def batch_upload_embeddings(self, items: List[Dict[str, Any]]) -> bool:
        """Upload multiple items with embeddings to Vector Search in batch"""
        if not self.is_available():
            logger.warning("Vector Search is not available, using mock implementation")
            return self._use_mock_batch_upload(items)

        try:
            datapoints = []

            for item in items:
                content = item.get("content", "")
                metadata = item.get("metadata", {})

                # Generate embedding for the content
                embedding = self.generate_embedding(content)

                if not embedding:
                    logger.error(f"Failed to generate embedding for content: {content[:50]}...")
                    continue

                # Ensure embedding is a list of floats
                if isinstance(embedding, dict) and "values" in embedding:
                    embedding = embedding["values"]

                # Convert all values to float if they're strings
                if isinstance(embedding, list) and embedding and isinstance(embedding[0], str):
                    embedding = [float(x) for x in embedding]

                # Create datapoint
                datapoint = {
                    "id": str(uuid.uuid4()),
                    "feature_vector": embedding,
                    "restricts": metadata
                }

                datapoints.append(datapoint)

            if not datapoints:
                logger.error("No valid datapoints to upload")
                return self._use_mock_batch_upload(items)

            # Upload to Vector Search in batches of 100
            batch_size = 100
            for i in range(0, len(datapoints), batch_size):
                batch = datapoints[i:i+batch_size]
                self.index_endpoint.upsert_datapoints(
                    deployed_index_id=self.deployed_index_id,
                    datapoints=batch
                )

            return True
        except Exception as e:
            logger.error(f"Error batch uploading to Vector Search: {e}")
            return self._use_mock_batch_upload(items)

    def _use_mock_batch_upload(self, items: List[Dict[str, Any]]) -> bool:
        """Use mock implementation for batch uploading when real Vector Search is not available"""
        try:
            # Check if mock implementation is available
            mock_path = os.path.join(os.path.dirname(__file__), "vector_search_mock.py")
            if os.path.exists(mock_path):
                logger.info("Using mock Vector Search implementation for batch upload")

                # Import mock implementation
                from tools.vector_search.vector_search_mock import MockVectorSearchClient

                # Create mock client and batch upload
                mock_client = MockVectorSearchClient()
                return mock_client.batch_upload_embeddings(items)
            else:
                logger.warning("Mock Vector Search implementation not found")
                return False
        except Exception as e:
            logger.error(f"Error using mock Vector Search for batch upload: {e}")
            return False

    def _get_auth_token(self) -> str:
        """Get authentication token for Google Cloud API"""
        try:
            from google.auth.transport.requests import Request
            from google.oauth2 import service_account

            credentials = service_account.Credentials.from_service_account_file(
                os.environ.get("GOOGLE_APPLICATION_CREDENTIALS"),
                scopes=["https://www.googleapis.com/auth/cloud-platform"]
            )

            credentials.refresh(Request())
            return credentials.token
        except Exception as e:
            print(f"Error getting auth token: {e}")
            return ""
