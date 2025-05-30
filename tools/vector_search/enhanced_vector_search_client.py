#!/usr/bin/env python3
"""
Enhanced Vector Search Client for VANA Memory System

This module provides an enhanced implementation of the Vector Search client
with improved error handling, permission issue detection, and embedding caching.
"""

import os
import uuid
import logging
import time
import json
import requests
from typing import List, Dict, Any, Optional, Tuple
from google.cloud import aiplatform
from google.api_core.exceptions import PermissionDenied, NotFound, InvalidArgument

# Import embedding cache
from tools.embedding_cache import EmbeddingCache

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class EnhancedVectorSearchClient:
    """Enhanced client for Vertex AI Vector Search with robust error handling"""

    def __init__(self, use_cache: bool = True):
        """
        Initialize the Enhanced Vector Search client

        Args:
            use_cache: Whether to use embedding cache
        """
        # Load configuration from environment
        self.project = os.environ.get("GOOGLE_CLOUD_PROJECT")
        self.location = os.environ.get("GOOGLE_CLOUD_LOCATION")
        self.endpoint_id = os.environ.get("VECTOR_SEARCH_ENDPOINT_ID")
        self.deployed_index_id = os.environ.get("DEPLOYED_INDEX_ID", "vanasharedindex")

        # Initialize embedding cache if enabled
        self.use_cache = use_cache
        if use_cache:
            self.embedding_cache = EmbeddingCache()

        # Track availability and error state
        self.is_initialized = False
        self.last_error = None
        self.permission_error = False
        self.last_check_time = 0
        self.check_interval = 300  # 5 minutes

        # Initialize Vertex AI if credentials are available
        if os.environ.get("GOOGLE_APPLICATION_CREDENTIALS"):
            try:
                aiplatform.init(project=self.project, location=self.location)

                # Get the index endpoint
                self.index_endpoint = aiplatform.MatchingEngineIndexEndpoint(
                    index_endpoint_name=self.endpoint_id
                )
                self.is_initialized = True
                logger.info("Vector Search client initialized successfully")
            except PermissionDenied as e:
                logger.error(f"Permission denied initializing Vector Search: {e}")
                self.last_error = str(e)
                self.permission_error = True
                self.index_endpoint = None
            except Exception as e:
                logger.error(f"Error initializing Vector Search: {e}")
                self.last_error = str(e)
                self.index_endpoint = None
        else:
            logger.warning("GOOGLE_APPLICATION_CREDENTIALS not set, Vector Search unavailable")
            self.last_error = "GOOGLE_APPLICATION_CREDENTIALS not set"
            self.index_endpoint = None

    def is_available(self) -> bool:
        """
        Check if Vector Search is available

        Returns:
            True if available, False otherwise
        """
        # Skip check if we've checked recently
        current_time = time.time()
        if current_time - self.last_check_time < self.check_interval:
            return self.is_initialized and self.index_endpoint is not None

        self.last_check_time = current_time

        if not self.is_initialized or not self.index_endpoint:
            logger.warning("Vector Search endpoint not initialized")
            return False

        try:
            # Create a simple test vector with the correct dimensions (768)
            test_vector = [0.0] * 768

            # Simple test query with the test vector
            self.index_endpoint.match(
                deployed_index_id=self.deployed_index_id,
                queries=[{"datapoint": test_vector}],
                num_neighbors=1
            )
            logger.info("Vector Search is available")
            return True
        except PermissionDenied as e:
            logger.error(f"Permission denied accessing Vector Search: {e}")
            self.last_error = str(e)
            self.permission_error = True
            return False
        except Exception as e:
            logger.error(f"Vector Search is not available: {e}")
            self.last_error = str(e)
            return False

    def get_error_info(self) -> Dict[str, Any]:
        """
        Get information about the last error

        Returns:
            Dict with error information
        """
        return {
            "is_available": self.is_available(),
            "is_initialized": self.is_initialized,
            "last_error": self.last_error,
            "permission_error": self.permission_error
        }

    def _get_auth_token(self) -> Optional[str]:
        """
        Get authentication token for API requests

        Returns:
            Authentication token or None if failed
        """
        try:
            from google.auth.transport.requests import Request
            from google.oauth2 import service_account

            # Check if credentials file exists
            creds_file = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
            if not creds_file or not os.path.exists(creds_file):
                logger.error("GOOGLE_APPLICATION_CREDENTIALS not set or file not found")
                return None

            # Load credentials
            credentials = service_account.Credentials.from_service_account_file(
                creds_file,
                scopes=["https://www.googleapis.com/auth/cloud-platform"]
            )

            # Refresh token if needed
            if credentials.expired:
                credentials.refresh(Request())

            return credentials.token
        except Exception as e:
            logger.error(f"Error getting auth token: {e}")
            return None

    def generate_embedding(self, text: str) -> List[float]:
        """
        Generate embedding for text using Vertex AI Embeddings

        Args:
            text: Text to generate embedding for

        Returns:
            Embedding vector
        """
        # Check cache first if enabled
        if self.use_cache:
            cached_embedding = self.embedding_cache.get(text)
            if cached_embedding is not None:
                logger.debug("Using cached embedding")
                return cached_embedding

        # Prepare API endpoint
        project = self.project
        location = self.location
        endpoint = f"https://{location}-aiplatform.googleapis.com/v1/projects/{project}/locations/{location}/publishers/google/models/text-embedding-004:predict"

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

            if response.status_code == 403:
                logger.error("Permission denied accessing embedding API")
                self.permission_error = True
                return self._use_mock_embedding(text)

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

                # Cache the embedding if enabled
                if self.use_cache:
                    self.embedding_cache.set(text, embedding_values)

                return embedding_values
            else:
                logger.error(f"Invalid embedding format: {type(embedding_values)}")
                raise Exception(f"Invalid embedding format received: {type(embedding_values)}")
        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 403:
                logger.error("Permission denied accessing embedding API")
                self.permission_error = True
            logger.error(f"HTTP error generating embedding: {e}")
            raise Exception(f"Vector Search embedding API failed: {e}")
        except Exception as e:
            logger.error(f"Error generating embedding: {e}")
            raise Exception(f"Vector Search embedding generation failed: {e}")



    def search(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """
        Search for relevant content using Vector Search

        Args:
            query: Search query
            top_k: Maximum number of results to return

        Returns:
            List of search results
        """
        if not self.is_available():
            logger.error("Vector Search is not available")
            raise Exception("Vector Search service is not available")

        try:
            # Generate embedding for the query
            query_embedding = self.generate_embedding(query)

            if not query_embedding:
                logger.error("Failed to generate embedding for query")
                raise Exception("Failed to generate embedding for search query")

            # Ensure embedding is a list of floats
            if isinstance(query_embedding, dict) and "values" in query_embedding:
                query_embedding = query_embedding["values"]

            # Convert all values to float if they're strings
            if isinstance(query_embedding, list) and query_embedding and isinstance(query_embedding[0], str):
                query_embedding = [float(x) for x in query_embedding]

            # Try primary API first
            try:
                # Search the index
                response = self.index_endpoint.match(
                    deployed_index_id=self.deployed_index_id,
                    queries=[{"datapoint": query_embedding}],
                    num_neighbors=top_k
                )
            except (NotFound, InvalidArgument) as e:
                # Try alternative API if primary fails
                logger.warning(f"Primary API failed, trying alternative: {e}")
                response = self.index_endpoint.find_neighbors(
                    deployed_index_id=self.deployed_index_id,
                    queries=[query_embedding],
                    num_neighbors=top_k
                )

            # Format results
            results = []
            for match in response[0]:
                # Handle different response formats
                if hasattr(match, 'document'):
                    # match API format
                    content = match.document
                    score = match.distance
                    metadata = match.restricts
                elif hasattr(match, 'id'):
                    # find_neighbors API format
                    content = match.id
                    score = match.distance
                    metadata = {}
                else:
                    # Unknown format
                    logger.warning(f"Unknown match format: {match}")
                    continue

                results.append({
                    "content": content,
                    "score": score,
                    "metadata": metadata
                })

            return results
        except PermissionDenied as e:
            logger.error(f"Permission denied accessing Vector Search: {e}")
            self.permission_error = True
            raise Exception(f"Permission denied for Vector Search: {e}")
        except Exception as e:
            logger.error(f"Error searching Vector Search: {e}")
            raise Exception(f"Vector Search operation failed: {e}")



    def upload_embedding(self, content: str, metadata: Dict[str, Any] = None) -> bool:
        """
        Upload content with embedding to Vector Search

        Args:
            content: The content to upload
            metadata: Metadata for the content

        Returns:
            True if successful, False otherwise
        """
        if not self.is_available():
            logger.error("Vector Search is not available")
            raise Exception("Vector Search service is not available")

        try:
            # Generate embedding for the content
            embedding = self.generate_embedding(content)

            if not embedding:
                logger.error("Failed to generate embedding for content")
                raise Exception("Failed to generate embedding for upload content")

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
        except PermissionDenied as e:
            logger.error(f"Permission denied uploading to Vector Search: {e}")
            self.permission_error = True
            raise Exception(f"Permission denied for Vector Search upload: {e}")
        except Exception as e:
            logger.error(f"Error uploading to Vector Search: {e}")
            raise Exception(f"Vector Search upload failed: {e}")



    def batch_upload_embeddings(self, items: List[Dict[str, Any]]) -> bool:
        """
        Upload multiple items with embeddings to Vector Search

        Args:
            items: List of items to upload (each with 'content' and optional 'metadata')

        Returns:
            True if successful, False otherwise
        """
        if not self.is_available():
            logger.error("Vector Search is not available")
            raise Exception("Vector Search service is not available")

        try:
            # Generate datapoints
            datapoints = []
            for item in items:
                content = item.get("content")
                metadata = item.get("metadata", {})

                if not content:
                    logger.warning("Skipping item without content")
                    continue

                # Generate embedding
                embedding = self.generate_embedding(content)

                if not embedding:
                    logger.warning(f"Skipping item, failed to generate embedding: {content[:50]}...")
                    continue

                # Ensure embedding is a list of floats
                if isinstance(embedding, dict) and "values" in embedding:
                    embedding = embedding["values"]

                # Convert all values to float if they're strings
                if isinstance(embedding, list) and embedding and isinstance(embedding[0], str):
                    embedding = [float(x) for x in embedding]

                # Create datapoint
                datapoint = {
                    "id": item.get("id", str(uuid.uuid4())),
                    "feature_vector": embedding,
                    "restricts": metadata
                }

                datapoints.append(datapoint)

            if not datapoints:
                logger.error("No valid datapoints to upload")
                raise Exception("No valid datapoints generated for batch upload")

            # Upload to Vector Search in batches of 100
            batch_size = 100
            for i in range(0, len(datapoints), batch_size):
                batch = datapoints[i:i+batch_size]
                self.index_endpoint.upsert_datapoints(
                    deployed_index_id=self.deployed_index_id,
                    datapoints=batch
                )

            return True
        except PermissionDenied as e:
            logger.error(f"Permission denied batch uploading to Vector Search: {e}")
            self.permission_error = True
            raise Exception(f"Permission denied for Vector Search batch upload: {e}")
        except Exception as e:
            logger.error(f"Error batch uploading to Vector Search: {e}")
            raise Exception(f"Vector Search batch upload failed: {e}")



    def get_cache_stats(self) -> Dict[str, Any]:
        """
        Get embedding cache statistics

        Returns:
            Dict with cache statistics
        """
        if not self.use_cache:
            return {"enabled": False}

        return {
            "enabled": True,
            "stats": self.embedding_cache.get_stats()
        }
