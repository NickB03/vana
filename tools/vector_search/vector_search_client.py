"""
Vector Search Client for VANA Memory System

This module provides a client for interacting with Vertex AI Vector Search.
It replaces the legacy Ragie.ai client with a more scalable and integrated solution.

Features:
- Improved authentication and error handling
- Explicit type conversion for embeddings
- Graceful fallback to mock implementation
- Comprehensive health status reporting
"""

import os
import uuid
import logging
import requests
from google.cloud import aiplatform
from typing import List, Dict, Any, Optional
from google.oauth2 import service_account
import vertexai
from vertexai.language_models import TextEmbeddingModel

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class VectorSearchClient:
    """Client for interacting with Vertex AI Vector Search"""

    def __init__(
        self,
        project_id: Optional[str] = None,
        location: Optional[str] = None,
        endpoint_id: Optional[str] = None,
        deployed_index_id: Optional[str] = None,
        credentials_path: Optional[str] = None,
        use_mock: bool = False,
        auto_fallback: bool = True
    ):
        """Initialize the Vector Search client.

        Args:
            project_id: GCP project ID. If not provided, will try to get from environment.
            location: GCP location. If not provided, will try to get from environment.
            endpoint_id: Vector Search endpoint ID. If not provided, will try to get from environment.
            deployed_index_id: Deployed index ID. If not provided, will try to get from environment.
            credentials_path: Path to service account key file. If not provided, will try to get from environment.
            use_mock: Whether to use the mock implementation.
            auto_fallback: Whether to automatically fall back to the mock implementation if the real one fails.
        """
        self.use_mock = use_mock
        self.auto_fallback = auto_fallback

        # Initialize configuration from arguments or environment variables
        self.project_id = project_id or os.environ.get("GOOGLE_CLOUD_PROJECT")
        self.location = location or os.environ.get("GOOGLE_CLOUD_LOCATION", "us-central1")
        self.endpoint_id = endpoint_id or os.environ.get("VECTOR_SEARCH_ENDPOINT_ID")
        self.deployed_index_id = deployed_index_id or os.environ.get("DEPLOYED_INDEX_ID", "vanasharedindex")
        self.credentials_path = credentials_path or os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")

        # Track initialization status
        self.initialized = False
        self.using_mock = use_mock
        self.credentials = None
        self.index_endpoint = None
        self.match_client = None

        # Log configuration
        logger.info(f"Vector Search Client Configuration:")
        logger.info(f"  Project ID: {self.project_id}")
        logger.info(f"  Location: {self.location}")
        logger.info(f"  Endpoint ID: {self.endpoint_id}")
        logger.info(f"  Deployed Index ID: {self.deployed_index_id}")
        logger.info(f"  Credentials Path: {self.credentials_path}")
        logger.info(f"  Use Mock: {self.use_mock}")
        logger.info(f"  Auto Fallback: {self.auto_fallback}")

        # Initialize immediately if not using mock
        if not self.use_mock:
            self._initialize()

    def _initialize(self) -> bool:
        """Initialize the Vector Search client with error handling."""
        if self.use_mock:
            logger.info("Using mock implementation as requested")
            self._initialize_mock()
            return True

        if self.initialized:
            return True

        # Check configuration
        if not self.project_id:
            logger.error("Project ID not provided. Set GOOGLE_CLOUD_PROJECT environment variable.")
            if self.auto_fallback:
                logger.warning("Falling back to mock implementation due to missing project ID")
                self._initialize_mock()
            return False

        if not self.endpoint_id:
            logger.error("Endpoint ID not provided. Set VECTOR_SEARCH_ENDPOINT_ID environment variable.")
            if self.auto_fallback:
                logger.warning("Falling back to mock implementation due to missing endpoint ID")
                self._initialize_mock()
            return False

        # Initialize credentials
        try:
            if self.credentials_path:
                try:
                    self.credentials = service_account.Credentials.from_service_account_file(
                        self.credentials_path,
                        scopes=["https://www.googleapis.com/auth/cloud-platform"]
                    )
                    logger.info(f"Successfully loaded credentials from {self.credentials_path}")
                except Exception as e:
                    logger.error(f"Failed to load credentials from file: {str(e)}")
                    if self.auto_fallback:
                        logger.warning("Falling back to mock implementation due to credential loading failure")
                        self._initialize_mock()
                    return False
            else:
                logger.warning("No credentials path provided. Using default application credentials.")

            # Initialize Vertex AI
            try:
                vertexai.init(
                    project=self.project_id,
                    location=self.location,
                    credentials=self.credentials
                )
                logger.info("Successfully initialized Vertex AI for embedding generation")
            except Exception as e:
                logger.error(f"Failed to initialize Vertex AI: {str(e)}")
                if self.auto_fallback:
                    logger.warning("Falling back to mock implementation due to Vertex AI initialization failure")
                    self._initialize_mock()
                return False

            # Initialize aiplatform
            try:
                aiplatform.init(
                    project=self.project_id,
                    location=self.location,
                    credentials=self.credentials
                )
                logger.info("Successfully initialized AI Platform")
            except Exception as e:
                logger.error(f"Failed to initialize AI Platform: {str(e)}")
                if self.auto_fallback:
                    logger.warning("Falling back to mock implementation due to AI Platform initialization failure")
                    self._initialize_mock()
                return False

            # Initialize endpoint
            try:
                # Try to get the index endpoint
                self.index_endpoint = aiplatform.MatchingEngineIndexEndpoint(
                    index_endpoint_name=self.endpoint_id
                )
                logger.info(f"Successfully initialized Vector Search endpoint: {self.endpoint_id}")

                # Also initialize the match client for direct API access
                if self.credentials:
                    self.match_client = aiplatform.gapic.MatchServiceClient(credentials=self.credentials)
                else:
                    self.match_client = aiplatform.gapic.MatchServiceClient()
                logger.info("Successfully initialized Match Service client")
            except Exception as e:
                logger.error(f"Failed to initialize Vector Search endpoint: {str(e)}")
                if self.auto_fallback:
                    logger.warning("Falling back to mock implementation due to endpoint initialization failure")
                    self._initialize_mock()
                return False

            self.initialized = True
            self.using_mock = False
            logger.info("Vector Search client successfully initialized")
            return True

        except Exception as e:
            logger.error(f"Failed to initialize Vector Search client: {str(e)}")
            if self.auto_fallback:
                logger.warning("Falling back to mock implementation due to initialization failure")
                self._initialize_mock()
            return False

    def _initialize_mock(self):
        """Initialize the mock implementation."""
        try:
            from .vector_search_mock import MockVectorSearchClient
            self.mock_client = MockVectorSearchClient()
            self.initialized = True
            self.using_mock = True
            logger.info("Mock Vector Search client initialized")
        except Exception as e:
            logger.error(f"Failed to initialize mock Vector Search client: {str(e)}")
            # Create a simple mock client directly
            self.mock_client = SimpleMockVectorSearchClient()
            self.initialized = True
            self.using_mock = True
            logger.info("Simple mock Vector Search client initialized as fallback")

    def is_available(self) -> bool:
        """Check if Vector Search is available

        Returns:
            True if Vector Search is available, False otherwise
        """
        if self.using_mock:
            return True

        if not self._initialize():
            return False

        try:
            # Create a simple test vector with the correct dimensions (768)
            # Use a list of floats instead of generating an embedding
            test_vector = [0.0] * 768

            # Simple test query with the test vector
            if self.index_endpoint:
                self.index_endpoint.match(
                    deployed_index_id=self.deployed_index_id,
                    queries=[{"datapoint": test_vector}],
                    num_neighbors=1
                )
                logger.info("Vector Search is available")
                return True
            else:
                logger.warning("Vector Search endpoint not initialized")
                return False
        except Exception as e:
            logger.error(f"Vector Search is not available: {e}")
            return False

class SimpleMockVectorSearchClient:
    """Simple mock implementation when the full mock is not available"""

    def __init__(self):
        logger.info("Initializing Simple Mock Vector Search Client")

    def generate_embedding(self, _text: str) -> List[float]:
        """Generate a simple mock embedding

        Args:
            _text: The text to generate an embedding for (unused in mock)

        Returns:
            A mock embedding with 768 dimensions
        """
        return [0.1] * 768

    def search(self, _query: str, _top_k: int = 5) -> List[Dict[str, Any]]:
        """Return empty search results

        Args:
            _query: The search query (unused in mock)
            _top_k: Maximum number of results to return (unused in mock)

        Returns:
            Empty list of search results
        """
        return []

    def upload_embedding(self, _content: str, _metadata: Dict[str, Any] = None) -> bool:
        """Mock upload function

        Args:
            _content: The content to upload (unused in mock)
            _metadata: Metadata for the content (unused in mock)

        Returns:
            Always returns True
        """
        return True

    def batch_upload_embeddings(self, _items: List[Dict[str, Any]]) -> bool:
        """Mock batch upload function

        Args:
            _items: List of items to upload (unused in mock)

        Returns:
            Always returns True
        """
        return True

    def is_available(self) -> bool:
        """Check if Vector Search is available

        Returns:
            Always returns True for the mock implementation
        """
        return True

    def generate_embedding(self, text: str) -> List[float]:
        """Generate embedding for text using Vertex AI text-embedding-004 model

        Args:
            text: The text to generate an embedding for.

        Returns:
            A list of float values representing the embedding.
        """
        if self.using_mock:
            return self.mock_client.generate_embedding(text)

        if not self._initialize():
            logger.error("Vector Search client not initialized")
            if self.auto_fallback:
                logger.warning("Falling back to mock implementation for embedding generation")
                return self.mock_client.generate_embedding(text)
            return []

        try:
            # Use the text-embedding-004 model via the Vertex AI SDK
            try:
                model = TextEmbeddingModel.from_pretrained("text-embedding-004")
                embedding = model.get_embeddings([text])[0]

                # Explicitly convert values to float to avoid type errors
                embedding_values = [float(value) for value in embedding.values]

                logger.info(f"Generated embedding with {len(embedding_values)} dimensions")
                return embedding_values
            except Exception as e:
                logger.error(f"Error using Vertex AI SDK for embedding: {str(e)}")

                # Fall back to REST API approach
                logger.info("Falling back to REST API approach for embedding generation")
                return self._generate_embedding_rest_api(text)
        except Exception as e:
            logger.error(f"Error generating embedding: {str(e)}")

            if self.auto_fallback:
                logger.warning("Falling back to mock implementation for embedding generation")
                return self.mock_client.generate_embedding(text)

            return []

    def _generate_embedding_rest_api(self, text: str) -> List[float]:
        """Generate embedding using the REST API as a fallback"""
        if not self.project_id or not self.location:
            logger.warning("Project or location not set, using mock embedding")
            return self.mock_client.generate_embedding(text)

        endpoint = f"https://{self.location}-aiplatform.googleapis.com/v1/projects/{self.project_id}/locations/{self.location}/publishers/google/models/text-embedding-004:predict"

        try:
            auth_token = self._get_auth_token()
            if not auth_token:
                logger.error("Failed to get auth token")
                return self.mock_client.generate_embedding(text)

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
                logger.info(f"Generated embedding with {len(embedding_values)} dimensions via REST API")
                return embedding_values
            else:
                logger.error(f"Invalid embedding format: {type(embedding_values)}")
                return self.mock_client.generate_embedding(text)
        except Exception as e:
            logger.error(f"Error generating embedding via REST API: {e}")
            return self.mock_client.generate_embedding(text)

    def search(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """Search for relevant content using Vector Search

        Args:
            query: The search query
            top_k: Maximum number of results to return

        Returns:
            A list of search results, each containing content, score, and metadata
        """
        if self.using_mock:
            return self.mock_client.search(query, top_k)

        if not self._initialize():
            logger.error("Vector Search client not initialized")
            if self.auto_fallback:
                logger.warning("Falling back to mock implementation for search")
                return self.mock_client.search(query, top_k)
            return []

        try:
            # Generate embedding for the query
            query_embedding = self.generate_embedding(query)

            if not query_embedding:
                logger.error("Failed to generate embedding for query")
                if self.auto_fallback:
                    logger.warning("Falling back to mock implementation due to embedding generation failure")
                    return self.mock_client.search(query, top_k)
                return []

            # Validate embedding format
            if not all(isinstance(value, float) for value in query_embedding):
                logger.warning("Invalid embedding format, ensuring all values are float")
                try:
                    query_embedding = [float(value) for value in query_embedding]
                except (ValueError, TypeError) as e:
                    logger.error(f"Failed to convert embedding values to float: {str(e)}")
                    if self.auto_fallback:
                        logger.warning("Falling back to mock implementation due to embedding format error")
                        return self.mock_client.search(query, top_k)
                    return []

            # Try to search using the high-level API first
            try:
                if self.index_endpoint:
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

                    logger.info(f"Successfully retrieved {len(results)} results using high-level API")
                    return results
                else:
                    logger.warning("Index endpoint not initialized, trying low-level API")
                    raise ValueError("Index endpoint not initialized")
            except Exception as high_level_error:
                logger.warning(f"High-level API search failed: {str(high_level_error)}")
                logger.info("Trying low-level API search")

                # Fall back to low-level API
                try:
                    if not self.match_client:
                        logger.error("Match client not initialized")
                        raise ValueError("Match client not initialized")

                    # Create the endpoint path
                    endpoint_path = f"projects/{self.project_id}/locations/{self.location}/indexEndpoints/{self.endpoint_id}"

                    # Create the find_neighbors request
                    request = aiplatform.gapic.FindNeighborsRequest(
                        index_endpoint=endpoint_path,
                        deployed_index_id=self.deployed_index_id,
                        queries=[
                            aiplatform.gapic.FindNeighborsRequest.Query(
                                datapoint=aiplatform.gapic.IndexDatapoint(
                                    feature_vector=query_embedding
                                )
                            )
                        ]
                    )

                    # Send the request
                    response = self.match_client.find_neighbors(request)

                    # Process results
                    results = []
                    for query_result in response.nearest_neighbors:
                        for neighbor in query_result.neighbors:
                            result = {
                                "content": getattr(neighbor.datapoint, "document", ""),
                                "score": float(neighbor.distance),
                                "metadata": {}
                            }

                            # Extract metadata from the neighbor
                            try:
                                for attr in neighbor.datapoint.restricts:
                                    result["metadata"][attr.namespace + "." + attr.name] = attr.value
                            except AttributeError:
                                pass

                            results.append(result)

                    logger.info(f"Successfully retrieved {len(results)} results using low-level API")
                    return results
                except Exception as low_level_error:
                    logger.error(f"Low-level API search also failed: {str(low_level_error)}")
                    if self.auto_fallback:
                        logger.warning("Falling back to mock implementation due to search failure")
                        return self.mock_client.search(query, top_k)
                    return []
        except Exception as e:
            logger.error(f"Error searching Vector Search: {str(e)}")
            if self.auto_fallback:
                logger.warning("Falling back to mock implementation due to unexpected error")
                return self.mock_client.search(query, top_k)
            return []

    def upload_embedding(self, content: str, metadata: Dict[str, Any] = None) -> bool:
        """Upload content with embedding to Vector Search

        Args:
            content: The content to upload
            metadata: Metadata for the content

        Returns:
            True if successful, False otherwise
        """
        if self.using_mock:
            return self.mock_client.upload_embedding(content, metadata)

        if not self._initialize():
            logger.error("Vector Search client not initialized")
            if self.auto_fallback:
                logger.warning("Falling back to mock implementation for upload")
                return self.mock_client.upload_embedding(content, metadata)
            return False

        try:
            # Generate embedding for the content
            embedding = self.generate_embedding(content)

            if not embedding:
                logger.error("Failed to generate embedding for content")
                if self.auto_fallback:
                    logger.warning("Falling back to mock implementation due to embedding generation failure")
                    return self.mock_client.upload_embedding(content, metadata)
                return False

            # Validate embedding format
            if not all(isinstance(value, float) for value in embedding):
                logger.warning("Invalid embedding format, ensuring all values are float")
                try:
                    embedding = [float(value) for value in embedding]
                except (ValueError, TypeError) as e:
                    logger.error(f"Failed to convert embedding values to float: {str(e)}")
                    if self.auto_fallback:
                        logger.warning("Falling back to mock implementation due to embedding format error")
                        return self.mock_client.upload_embedding(content, metadata)
                    return False

            # Create a unique ID for the content
            content_id = str(uuid.uuid4())

            # Create the datapoint
            datapoint = {
                "id": content_id,
                "feature_vector": embedding,
                "restricts": metadata or {},
                "document": content
            }

            # Try to upload using the high-level API
            try:
                if self.index_endpoint:
                    self.index_endpoint.upsert_datapoints(
                        deployed_index_id=self.deployed_index_id,
                        datapoints=[datapoint]
                    )
                    logger.info(f"Successfully uploaded content with ID {content_id}")
                    return True
                else:
                    logger.warning("Index endpoint not initialized")
                    if self.auto_fallback:
                        logger.warning("Falling back to mock implementation due to missing endpoint")
                        return self.mock_client.upload_embedding(content, metadata)
                    return False
            except Exception as e:
                logger.error(f"Error uploading to Vector Search: {str(e)}")
                if self.auto_fallback:
                    logger.warning("Falling back to mock implementation due to upload error")
                    return self.mock_client.upload_embedding(content, metadata)
                return False
        except Exception as e:
            logger.error(f"Error preparing content for upload: {str(e)}")
            if self.auto_fallback:
                logger.warning("Falling back to mock implementation due to unexpected error")
                return self.mock_client.upload_embedding(content, metadata)
            return False

    def batch_upload_embeddings(self, items: List[Dict[str, Any]]) -> bool:
        """Upload multiple items with embeddings to Vector Search in batch

        Args:
            items: List of items to upload, each containing content, metadata, and optionally embedding

        Returns:
            True if successful, False otherwise
        """
        if self.using_mock:
            return self.mock_client.batch_upload_embeddings(items)

        if not self._initialize():
            logger.error("Vector Search client not initialized")
            if self.auto_fallback:
                logger.warning("Falling back to mock implementation for batch upload")
                return self.mock_client.batch_upload_embeddings(items)
            return False

        try:
            datapoints = []

            for item in items:
                content = item.get("content", "")
                metadata = item.get("metadata", {})
                embedding = item.get("embedding")

                # Generate embedding if not provided
                if not embedding:
                    embedding = self.generate_embedding(content)
                    if not embedding:
                        logger.error(f"Failed to generate embedding for content: {content[:50]}...")
                        continue

                # Validate embedding format
                if not all(isinstance(value, float) for value in embedding):
                    logger.warning(f"Invalid embedding format for content: {content[:50]}...")
                    try:
                        embedding = [float(value) for value in embedding]
                    except (ValueError, TypeError) as e:
                        logger.error(f"Failed to convert embedding values to float: {str(e)}")
                        continue

                # Create a unique ID for the content
                content_id = item.get("id", str(uuid.uuid4()))

                # Create the datapoint
                datapoint = {
                    "id": content_id,
                    "feature_vector": embedding,
                    "restricts": metadata,
                    "document": content
                }

                datapoints.append(datapoint)

            if not datapoints:
                logger.error("No valid datapoints to upload")
                if self.auto_fallback:
                    logger.warning("Falling back to mock implementation due to no valid datapoints")
                    return self.mock_client.batch_upload_embeddings(items)
                return False

            # Try to upload using the high-level API
            try:
                if self.index_endpoint:
                    # Upload to Vector Search in batches of 100
                    batch_size = 100
                    for i in range(0, len(datapoints), batch_size):
                        batch = datapoints[i:i+batch_size]
                        self.index_endpoint.upsert_datapoints(
                            deployed_index_id=self.deployed_index_id,
                            datapoints=batch
                        )
                    logger.info(f"Successfully uploaded {len(datapoints)} items in batches of {batch_size}")
                    return True
                else:
                    logger.warning("Index endpoint not initialized")
                    if self.auto_fallback:
                        logger.warning("Falling back to mock implementation due to missing endpoint")
                        return self.mock_client.batch_upload_embeddings(items)
                    return False
            except Exception as e:
                logger.error(f"Error batch uploading to Vector Search: {str(e)}")
                if self.auto_fallback:
                    logger.warning("Falling back to mock implementation due to batch upload error")
                    return self.mock_client.batch_upload_embeddings(items)
                return False
        except Exception as e:
            logger.error(f"Error preparing items for batch upload: {str(e)}")
            if self.auto_fallback:
                logger.warning("Falling back to mock implementation due to unexpected error")
                return self.mock_client.batch_upload_embeddings(items)
            return False

    def _get_auth_token(self) -> str:
        """Get authentication token for Google Cloud API

        Returns:
            Authentication token string or empty string if failed
        """
        try:
            from google.auth.transport.requests import Request

            # Use existing credentials if available
            if self.credentials:
                credentials = self.credentials
            # Otherwise, try to load from file
            elif self.credentials_path:
                credentials = service_account.Credentials.from_service_account_file(
                    self.credentials_path,
                    scopes=["https://www.googleapis.com/auth/cloud-platform"]
                )
            # Fall back to environment variable
            else:
                credentials_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
                if not credentials_path:
                    logger.error("No credentials available for authentication")
                    return ""

                credentials = service_account.Credentials.from_service_account_file(
                    credentials_path,
                    scopes=["https://www.googleapis.com/auth/cloud-platform"]
                )

            # Refresh the credentials to get a valid token
            credentials.refresh(Request())
            logger.info("Successfully obtained authentication token")
            return credentials.token
        except Exception as e:
            logger.error(f"Error getting auth token: {str(e)}")
            return ""
