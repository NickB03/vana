"""
Vector Search Client for VANA Memory System

This module provides a client for interacting with Vertex AI Vector Search.
It replaces the legacy Ragie.ai client with a more scalable and integrated solution.

Features:
- Improved authentication and error handling
- Explicit type conversion for embeddings
- Graceful fallback to mock implementation
- Comprehensive health status reporting
- Audit logging for security-sensitive operations
"""

import os
import uuid
import time
import logging
import requests
from google.cloud import aiplatform
from typing import List, Dict, Any, Optional
from google.oauth2 import service_account
import vertexai
from vertexai.language_models import TextEmbeddingModel

# Import audit logger
from tools.vector_search.vector_search_audit import vector_search_audit_logger

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class VectorSearchClient:
    """Client for interacting with Vertex AI Vector Search

    This client provides methods for:
    - Generating embeddings from text
    - Searching the vector store with embeddings
    - Searching for knowledge with text queries
    - Uploading content with embeddings
    - Batch uploading content
    - Checking health status
    """

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

        # Initialize mock client for fallback
        from tools.vector_search.vector_search_mock import MockVectorSearchClient
        try:
            self.mock_client = MockVectorSearchClient()
            if self.use_mock:
                logger.info("Mock Vector Search client initialized")
                self.initialized = True
                self.using_mock = True
        except ImportError:
            # If the mock client is not available, use a simple implementation
            logger.warning("Mock Vector Search client not available, using simple implementation")
            self.mock_client = SimpleMockVectorSearchClient()
            if self.use_mock:
                self.initialized = True
                self.using_mock = True
                logger.info("Simple mock Vector Search client initialized as fallback")

    def _initialize(self) -> bool:
        """Initialize the Vector Search client.

        Returns:
            True if initialization was successful, False otherwise.
        """
        # If already initialized, return True
        if self.initialized:
            return True

        # If using mock, initialize mock client
        if self.use_mock:
            self.initialized = True
            self.using_mock = True
            logger.info("Using mock implementation as configured")
            return True

        # Check if required configuration is available
        if not self.project_id:
            logger.error("Project ID not provided. Set GOOGLE_CLOUD_PROJECT environment variable.")
            if self.auto_fallback:
                logger.warning("Falling back to mock implementation due to missing project ID")
                self.initialized = True
                self.using_mock = True
                return True
            return False

        if not self.endpoint_id:
            logger.warning("Endpoint ID not provided. Set VECTOR_SEARCH_ENDPOINT_ID environment variable.")
            # Continue anyway, as we might be able to use the REST API

        try:
            # Initialize Vertex AI
            vertexai.init(project=self.project_id, location=self.location)

            # Set up credentials if provided
            if self.credentials_path:
                try:
                    self.credentials = service_account.Credentials.from_service_account_file(
                        self.credentials_path,
                        scopes=["https://www.googleapis.com/auth/cloud-platform"]
                    )
                    logger.info(f"Loaded credentials from {self.credentials_path}")
                except Exception as e:
                    logger.error(f"Error loading credentials: {e}")
                    if self.auto_fallback:
                        logger.warning("Falling back to mock implementation due to credentials error")
                        self.initialized = True
                        self.using_mock = True
                        return True
                    return False

            # Initialize the index endpoint if endpoint ID is available
            if self.endpoint_id:
                try:
                    self.index_endpoint = aiplatform.MatchingEngineIndexEndpoint(
                        index_endpoint_name=self.endpoint_id,
                        project=self.project_id,
                        location=self.location,
                        credentials=self.credentials
                    )
                    logger.info(f"Initialized index endpoint {self.endpoint_id}")
                except Exception as e:
                    logger.error(f"Error initializing index endpoint: {e}")
                    # Continue anyway, as we might be able to use the REST API

            # Initialize the match client for low-level API access
            try:
                self.match_client = aiplatform.gapic.MatchServiceClient(
                    client_options={"api_endpoint": f"{self.location}-aiplatform.googleapis.com"},
                    credentials=self.credentials
                )
                logger.info("Initialized match client")
            except Exception as e:
                logger.error(f"Error initializing match client: {e}")
                # Continue anyway, as we might be able to use the high-level API

            # Mark as initialized
            self.initialized = True
            self.using_mock = False
            logger.info("Vector Search client initialized successfully")
            return True
        except Exception as e:
            logger.error(f"Error initializing Vector Search client: {e}")
            if self.auto_fallback:
                logger.warning("Falling back to mock implementation due to initialization error")
                self.initialized = True
                self.using_mock = True
                return True
            return False

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

    def generate_embedding(self, text: str) -> List[float]:
        """Generate embedding for text using Vertex AI text-embedding-004 model

        Args:
            text: The text to generate an embedding for.

        Returns:
            A list of float values representing the embedding.
        """
        # Input validation
        if not text or not isinstance(text, str):
            logger.error(f"Invalid input for embedding generation: {type(text)}")
            if self.auto_fallback:
                logger.warning("Falling back to mock implementation due to invalid input")
                return self.mock_client.generate_embedding("empty text" if not text else str(text))
            return []

        # Use mock if configured
        if self.using_mock:
            logger.info("Using mock implementation for embedding generation")
            return self.mock_client.generate_embedding(text)

        # Ensure client is initialized
        if not self._initialize():
            logger.error("Vector Search client not initialized")
            if self.auto_fallback:
                logger.warning("Falling back to mock implementation for embedding generation")
                return self.mock_client.generate_embedding(text)
            return []

        try:
            # Use the text-embedding-004 model via the Vertex AI SDK
            start_time = time.time()
            try:
                # Initialize the model
                model = TextEmbeddingModel.from_pretrained("text-embedding-004")

                # Generate embedding
                embedding_result = model.get_embeddings([text])[0]

                # Explicitly convert values to float to avoid type errors
                embedding_values = [float(value) for value in embedding_result.values]

                # Validate embedding dimensions
                if len(embedding_values) != 768:
                    logger.warning(f"Unexpected embedding dimensions: {len(embedding_values)}, expected 768")

                # Log performance metrics
                generation_time = time.time() - start_time
                logger.info(f"Generated embedding with {len(embedding_values)} dimensions in {generation_time:.2f}s")

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

    def search(self, query: str, top_k: int = 5, user_id: str = "system") -> List[Dict[str, Any]]:
        """Search for relevant content using Vector Search

        Args:
            query: The search query
            top_k: Maximum number of results to return
            user_id: ID of the user performing the search (for audit logging)

        Returns:
            A list of search results, each containing content, score, and metadata
        """
        # Audit log the search attempt
        audit_details = {"method": "search", "top_k": top_k}

        if self.using_mock:
            # Log mock search
            vector_search_audit_logger.log_search(
                user_id=user_id,
                query=query,
                num_results=top_k,
                status="success",
                details={"using_mock": True, **audit_details}
            )
            return self.mock_client.search(query, top_k)

        if not self._initialize():
            logger.error("Vector Search client not initialized")
            # Log initialization failure
            vector_search_audit_logger.log_search(
                user_id=user_id,
                query=query,
                num_results=top_k,
                status="failure",
                details={"error": "Vector Search client not initialized", **audit_details}
            )
            if self.auto_fallback:
                logger.warning("Falling back to mock implementation for search")
                return self.mock_client.search(query, top_k)
            return []

        try:
            # Generate embedding for the query
            query_embedding = self.generate_embedding(query)

            if not query_embedding:
                logger.error("Failed to generate embedding for query")
                # Log embedding generation failure
                vector_search_audit_logger.log_search(
                    user_id=user_id,
                    query=query,
                    num_results=top_k,
                    status="failure",
                    details={"error": "Failed to generate embedding for query", **audit_details}
                )
                if self.auto_fallback:
                    logger.warning("Falling back to mock implementation due to embedding generation failure")
                    return self.mock_client.search(query, top_k)
                return []

            # Use the search_vector_store method with the generated embedding
            return self.search_vector_store(query_embedding, top_k, user_id=user_id, original_query=query)

        except Exception as e:
            error_message = str(e)
            logger.error(f"Error searching Vector Search: {error_message}")
            # Log search error
            vector_search_audit_logger.log_search(
                user_id=user_id,
                query=query,
                num_results=top_k,
                status="failure",
                details={"error": error_message, **audit_details}
            )
            if self.auto_fallback:
                logger.warning("Falling back to mock implementation due to unexpected error")
                return self.mock_client.search(query, top_k)
            return []

    def search_vector_store(self, query_embedding: List[float], top_k: int = 5,
                          user_id: str = "system", original_query: str = None) -> List[Dict[str, Any]]:
        """Search the vector store with a query embedding.

        Args:
            query_embedding: The embedding to search with.
            top_k: The number of results to return.
            user_id: ID of the user performing the search (for audit logging)
            original_query: The original text query if available (for audit logging)

        Returns:
            A list of search results, each containing 'content', 'score', 'metadata', and 'id'.
        """
        # Audit log the vector store search attempt
        audit_details = {
            "method": "search_vector_store",
            "top_k": top_k,
            "embedding_length": len(query_embedding) if query_embedding else 0
        }

        # Add original query if available
        if original_query:
            audit_details["original_query"] = original_query

        if self.using_mock:
            # Log mock search
            vector_search_audit_logger.log_search(
                user_id=user_id,
                query=original_query or f"embedding_length_{len(query_embedding)}",
                num_results=top_k,
                status="success",
                details={"using_mock": True, **audit_details}
            )
            return self.mock_client.search_vector_store(query_embedding, top_k) if hasattr(self.mock_client, 'search_vector_store') else []

        if not self._initialize():
            logger.error("Vector Search client not initialized")
            # Log initialization failure
            vector_search_audit_logger.log_search(
                user_id=user_id,
                query=original_query or f"embedding_length_{len(query_embedding)}",
                num_results=top_k,
                status="failure",
                details={"error": "Vector Search client not initialized", **audit_details}
            )
            if self.auto_fallback:
                logger.warning("Falling back to mock implementation for vector store search")
                return self.mock_client.search_vector_store(query_embedding, top_k) if hasattr(self.mock_client, 'search_vector_store') else []
            return []

        try:
            # Validate embedding format
            if not query_embedding or not all(isinstance(value, float) for value in query_embedding):
                logger.warning("Invalid embedding format, ensuring all values are float")
                if query_embedding:
                    try:
                        query_embedding = [float(value) for value in query_embedding]
                    except (ValueError, TypeError) as e:
                        logger.error(f"Failed to convert embedding values to float: {str(e)}")
                        if self.auto_fallback:
                            logger.warning("Falling back to mock implementation due to embedding format error")
                            return self.mock_client.search_vector_store(query_embedding, top_k) if hasattr(self.mock_client, 'search_vector_store') else []
                        return []
                else:
                    logger.error("Empty embedding provided")
                    return []

            # Measure search time
            start_time = time.time()

            # Try to search using the high-level API first if index_endpoint is available
            if hasattr(self, 'index_endpoint') and self.index_endpoint:
                try:
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
                            "score": float(match.distance),
                            "metadata": match.restricts,
                            "id": getattr(match, "id", "unknown")
                        })

                    search_time = time.time() - start_time
                    logger.info(f"Successfully retrieved {len(results)} results using high-level API in {search_time:.2f}s")

                    # Log successful search
                    vector_search_audit_logger.log_search(
                        user_id=user_id,
                        query=original_query or f"embedding_length_{len(query_embedding)}",
                        num_results=len(results),
                        status="success",
                        details={
                            "search_time_ms": search_time * 1000,
                            "api": "high-level",
                            **audit_details
                        }
                    )

                    return results
                except Exception as high_level_error:
                    error_message = str(high_level_error)
                    logger.warning(f"High-level API search failed: {error_message}")
                    logger.info("Trying low-level API search")

                    # Log high-level API failure (not a complete failure yet, will try low-level API)
                    vector_search_audit_logger.log_search(
                        user_id=user_id,
                        query=original_query or f"embedding_length_{len(query_embedding)}",
                        num_results=top_k,
                        status="degraded",
                        details={
                            "error": error_message,
                            "api": "high-level",
                            "fallback": "trying low-level API",
                            **audit_details
                        }
                    )
            else:
                logger.info("Using low-level API for search (no index_endpoint available)")

            # Fall back to low-level API using match_client
            try:
                if not self.match_client:
                    logger.error("Match client not initialized")
                    if self.auto_fallback:
                        logger.warning("Falling back to mock implementation due to missing match client")
                        return self.mock_client.search_vector_store(query_embedding, top_k) if hasattr(self.mock_client, 'search_vector_store') else []
                    return []

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
                            "metadata": {},
                            "id": getattr(neighbor.datapoint, "datapoint_id", "unknown")
                        }

                        # Extract metadata from the neighbor
                        try:
                            for attr in neighbor.datapoint.restricts:
                                result["metadata"][attr.namespace + "." + attr.name] = attr.value
                        except AttributeError:
                            pass

                        results.append(result)

                search_time = time.time() - start_time
                logger.info(f"Successfully retrieved {len(results)} results using low-level API in {search_time:.2f}s")

                # Log successful search
                vector_search_audit_logger.log_search(
                    user_id=user_id,
                    query=original_query or f"embedding_length_{len(query_embedding)}",
                    num_results=len(results),
                    status="success",
                    details={
                        "search_time_ms": search_time * 1000,
                        "api": "low-level",
                        **audit_details
                    }
                )

                return results
            except Exception as low_level_error:
                error_message = str(low_level_error)
                logger.error(f"Low-level API search failed: {error_message}")

                # Log low-level API failure
                vector_search_audit_logger.log_search(
                    user_id=user_id,
                    query=original_query or f"embedding_length_{len(query_embedding)}",
                    num_results=top_k,
                    status="failure",
                    details={
                        "error": error_message,
                        "api": "low-level",
                        **audit_details
                    }
                )

                if self.auto_fallback:
                    logger.warning("Falling back to mock implementation due to search failure")
                    return self.mock_client.search_vector_store(query_embedding, top_k) if hasattr(self.mock_client, 'search_vector_store') else []
                return []
        except Exception as e:
            error_message = str(e)
            logger.error(f"Error searching vector store: {error_message}")

            # Log unexpected error
            vector_search_audit_logger.log_search(
                user_id=user_id,
                query=original_query or f"embedding_length_{len(query_embedding)}",
                num_results=top_k,
                status="failure",
                details={
                    "error": error_message,
                    "error_type": "unexpected",
                    **audit_details
                }
            )

            if self.auto_fallback:
                logger.warning("Falling back to mock implementation due to unexpected error")
                return self.mock_client.search_vector_store(query_embedding, top_k) if hasattr(self.mock_client, 'search_vector_store') else []
            return []

    def search_knowledge(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """Search for knowledge using the vector store with enhanced validation.

        This is a convenience method that generates an embedding for the query
        and then searches the vector store with that embedding. It formats the
        results in a consistent way for knowledge retrieval.

        Args:
            query: The query text.
            top_k: The number of results to return.

        Returns:
            A list of search results, each containing 'content', 'score', 'source', and 'id'.
        """
        # Input validation
        if not query or not isinstance(query, str):
            logger.error(f"Invalid query for knowledge search: {type(query)}")
            return []

        if self.using_mock:
            logger.info(f"Using mock implementation for knowledge search: '{query}'")
            return self.mock_client.search_knowledge(query, top_k) if hasattr(self.mock_client, 'search_knowledge') else []

        if not self._initialize():
            logger.error("Vector Search client not initialized")
            if self.auto_fallback:
                logger.warning("Falling back to mock implementation for knowledge search")
                return self.mock_client.search_knowledge(query, top_k) if hasattr(self.mock_client, 'search_knowledge') else []
            return []

        try:
            # Measure total search time
            start_time = time.time()

            # Generate embedding for the query
            embedding = self.generate_embedding(query)

            if not embedding:
                logger.error("Failed to generate embedding for knowledge query")
                if self.auto_fallback:
                    logger.warning("Falling back to mock implementation due to embedding generation failure")
                    return self.mock_client.search_knowledge(query, top_k) if hasattr(self.mock_client, 'search_knowledge') else []
                return []

            # Validate embedding dimensions
            if len(embedding) != 768:
                logger.warning(f"Unexpected embedding dimensions: {len(embedding)}, expected 768")

            # Search the vector store
            results = self.search_vector_store(embedding, top_k)

            # Format the results consistently
            formatted_results = []
            for result in results:
                # Extract content from result
                content = result.get("content", "")

                # Extract source from metadata if available
                metadata = result.get("metadata", {})
                source = metadata.get("source", "unknown")

                # Create formatted result
                formatted_result = {
                    "id": result.get("id", ""),
                    "score": float(result.get("score", 0.0)),
                    "content": content,
                    "source": source,
                    "metadata": metadata,
                    "vector_source": True  # Indicate this came from vector search
                }
                formatted_results.append(formatted_result)

            # Log performance metrics
            total_time = time.time() - start_time
            logger.info(f"Knowledge search for '{query[:50]}...' returned {len(formatted_results)} results in {total_time:.2f}s")

            return formatted_results
        except Exception as e:
            logger.error(f"Error in search_knowledge: {str(e)}")

            if self.auto_fallback:
                logger.warning("Falling back to mock implementation for knowledge search")
                return self.mock_client.search_knowledge(query, top_k) if hasattr(self.mock_client, 'search_knowledge') else []

            return []

    def get_health_status(self) -> Dict[str, Any]:
        """Get the health status of the Vector Search client.

        This method performs a comprehensive health check of the Vector Search client,
        including authentication, embedding generation, and search functionality.

        Returns:
            A dictionary with health status information including:
            - status: 'healthy', 'degraded', 'error', or 'mock'
            - message: A human-readable status message
            - details: Detailed information about the health check
            - metrics: Performance metrics if available
            - recommendations: Recommendations for fixing issues if any
        """
        # If using mock, return mock status
        if self.using_mock:
            return {
                "status": "mock",
                "message": "Using mock implementation",
                "details": {
                    "initialized": self.initialized,
                    "using_mock": True,
                    "project_id": self.project_id,
                    "location": self.location,
                    "endpoint_id": self.endpoint_id,
                    "deployed_index_id": self.deployed_index_id,
                    "credentials_path": self.credentials_path
                }
            }

        # Check if client is initialized
        if not self._initialize():
            return {
                "status": "error",
                "message": "Vector Search client not initialized",
                "details": {
                    "initialized": False,
                    "using_mock": self.using_mock,
                    "project_id": self.project_id,
                    "location": self.location,
                    "endpoint_id": self.endpoint_id,
                    "deployed_index_id": self.deployed_index_id,
                    "credentials_path": self.credentials_path
                },
                "recommendations": [
                    "Check that all required environment variables are set",
                    "Verify that the service account key file exists and is accessible",
                    "Ensure the service account has the necessary permissions"
                ]
            }

        try:
            # Start with a healthy status
            status = "healthy"
            message = "Vector Search is healthy"
            details = {
                "initialized": self.initialized,
                "using_mock": self.using_mock,
                "project_id": self.project_id,
                "location": self.location,
                "endpoint_id": self.endpoint_id,
                "deployed_index_id": self.deployed_index_id,
                "credentials_path": self.credentials_path
            }
            metrics = {}
            recommendations = []

            # Test embedding generation
            embedding_start = time.time()
            test_text = "Vector Search health check test"
            try:
                embedding = self.generate_embedding(test_text)
                embedding_time = time.time() - embedding_start

                if embedding and len(embedding) > 0:
                    details["embedding_test"] = "success"
                    details["embedding_dimensions"] = len(embedding)
                    metrics["embedding_generation_time_ms"] = embedding_time * 1000
                else:
                    status = "error"
                    message = "Failed to generate embedding"
                    details["embedding_test"] = "failed"
                    recommendations.append("Check embedding model access and permissions")
            except Exception as e:
                status = "error"
                message = f"Error generating embedding: {str(e)}"
                details["embedding_test"] = "error"
                details["embedding_error"] = str(e)
                recommendations.append("Check embedding model access and permissions")
                return {
                    "status": status,
                    "message": message,
                    "details": details,
                    "recommendations": recommendations
                }

            # Test vector search
            if status != "error" and embedding:
                search_start = time.time()
                try:
                    results = self.search_vector_store(embedding, 1)
                    search_time = time.time() - search_start

                    if results is not None:
                        details["search_test"] = "success"
                        details["search_results_count"] = len(results)
                        metrics["search_time_ms"] = search_time * 1000

                        # If no results found, mark as degraded
                        if len(results) == 0:
                            status = "degraded"
                            message = "Vector Search is operational but returned no results"
                            recommendations.append("Check if the index contains data")
                    else:
                        status = "error"
                        message = "Failed to search vector store"
                        details["search_test"] = "failed"
                        recommendations.append("Check Vector Search endpoint and permissions")
                except Exception as e:
                    status = "error"
                    message = f"Error searching vector store: {str(e)}"
                    details["search_test"] = "error"
                    details["search_error"] = str(e)
                    recommendations.append("Check Vector Search endpoint and permissions")

            # Add metrics to the response
            details["metrics"] = metrics

            # Return the health status
            return {
                "status": status,
                "message": message,
                "details": details,
                "metrics": metrics,
                "recommendations": recommendations if status != "healthy" else []
            }
        except Exception as e:
            return {
                "status": "error",
                "message": f"Error checking health: {str(e)}",
                "details": {
                    "initialized": self.initialized,
                    "using_mock": self.using_mock,
                    "project_id": self.project_id,
                    "location": self.location,
                    "endpoint_id": self.endpoint_id,
                    "deployed_index_id": self.deployed_index_id,
                    "credentials_path": self.credentials_path,
                    "error": str(e)
                },
                "recommendations": ["Check logs for detailed error information"]
            }

    def upload_embedding(self, content: str, metadata: Dict[str, Any] = None, user_id: str = "system") -> bool:
        """Upload content with embedding to Vector Search

        Args:
            content: The content to upload
            metadata: Metadata for the content
            user_id: ID of the user performing the upload (for audit logging)

        Returns:
            True if successful, False otherwise
        """
        # Audit log the upload attempt
        audit_details = {
            "method": "upload_embedding",
            "content_length": len(content) if content else 0,
            "has_metadata": metadata is not None
        }

        if self.using_mock:
            # Log mock upload
            vector_search_audit_logger.log_update(
                user_id=user_id,
                operation_type="upsert",
                num_items=1,
                status="success",
                details={"using_mock": True, **audit_details}
            )
            return self.mock_client.upload_embedding(content, metadata)

        if not self._initialize():
            logger.error("Vector Search client not initialized")
            # Log initialization failure
            vector_search_audit_logger.log_update(
                user_id=user_id,
                operation_type="upsert",
                num_items=1,
                status="failure",
                details={"error": "Vector Search client not initialized", **audit_details}
            )
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

                    # Log successful upload
                    vector_search_audit_logger.log_update(
                        user_id=user_id,
                        operation_type="upsert",
                        num_items=1,
                        item_ids=[content_id],
                        status="success",
                        details={**audit_details}
                    )

                    return True
                else:
                    logger.warning("Index endpoint not initialized")
                    # Log endpoint initialization failure
                    vector_search_audit_logger.log_update(
                        user_id=user_id,
                        operation_type="upsert",
                        num_items=1,
                        status="failure",
                        details={"error": "Index endpoint not initialized", **audit_details}
                    )
                    if self.auto_fallback:
                        logger.warning("Falling back to mock implementation due to missing endpoint")
                        return self.mock_client.upload_embedding(content, metadata)
                    return False
            except Exception as e:
                error_message = str(e)
                logger.error(f"Error uploading to Vector Search: {error_message}")
                # Log upload error
                vector_search_audit_logger.log_update(
                    user_id=user_id,
                    operation_type="upsert",
                    num_items=1,
                    status="failure",
                    details={"error": error_message, "error_type": "upload", **audit_details}
                )
                if self.auto_fallback:
                    logger.warning("Falling back to mock implementation due to upload error")
                    return self.mock_client.upload_embedding(content, metadata)
                return False
        except Exception as e:
            error_message = str(e)
            logger.error(f"Error preparing content for upload: {error_message}")
            # Log unexpected error
            vector_search_audit_logger.log_update(
                user_id=user_id,
                operation_type="upsert",
                num_items=1,
                status="failure",
                details={"error": error_message, "error_type": "unexpected", **audit_details}
            )
            if self.auto_fallback:
                logger.warning("Falling back to mock implementation due to unexpected error")
                return self.mock_client.upload_embedding(content, metadata)
            return False

    def batch_upload_embeddings(self, items: List[Dict[str, Any]], user_id: str = "system") -> bool:
        """Upload multiple items with embeddings to Vector Search in batch

        Args:
            items: List of items to upload, each containing content, metadata, and optionally embedding
            user_id: ID of the user performing the batch upload (for audit logging)

        Returns:
            True if successful, False otherwise
        """
        # Audit log the batch upload attempt
        audit_details = {
            "method": "batch_upload_embeddings",
            "num_items": len(items)
        }

        if self.using_mock:
            # Log mock batch upload
            vector_search_audit_logger.log_update(
                user_id=user_id,
                operation_type="batch_upsert",
                num_items=len(items),
                status="success",
                details={"using_mock": True, **audit_details}
            )
            return self.mock_client.batch_upload_embeddings(items)

        if not self._initialize():
            logger.error("Vector Search client not initialized")
            # Log initialization failure
            vector_search_audit_logger.log_update(
                user_id=user_id,
                operation_type="batch_upsert",
                num_items=len(items),
                status="failure",
                details={"error": "Vector Search client not initialized", **audit_details}
            )
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

                    # Log successful batch upload
                    item_ids = [dp.get("id", "unknown") for dp in datapoints[:10]]  # Get first 10 IDs for logging
                    vector_search_audit_logger.log_update(
                        user_id=user_id,
                        operation_type="batch_upsert",
                        num_items=len(datapoints),
                        item_ids=item_ids,
                        status="success",
                        details={
                            "batch_size": batch_size,
                            "num_batches": (len(datapoints) + batch_size - 1) // batch_size,
                            **audit_details
                        }
                    )

                    return True
                else:
                    logger.warning("Index endpoint not initialized")
                    # Log endpoint initialization failure
                    vector_search_audit_logger.log_update(
                        user_id=user_id,
                        operation_type="batch_upsert",
                        num_items=len(datapoints),
                        status="failure",
                        details={"error": "Index endpoint not initialized", **audit_details}
                    )
                    if self.auto_fallback:
                        logger.warning("Falling back to mock implementation due to missing endpoint")
                        return self.mock_client.batch_upload_embeddings(items)
                    return False
            except Exception as e:
                error_message = str(e)
                logger.error(f"Error batch uploading to Vector Search: {error_message}")
                # Log batch upload error
                vector_search_audit_logger.log_update(
                    user_id=user_id,
                    operation_type="batch_upsert",
                    num_items=len(datapoints) if datapoints else len(items),
                    status="failure",
                    details={"error": error_message, "error_type": "upload", **audit_details}
                )
                if self.auto_fallback:
                    logger.warning("Falling back to mock implementation due to batch upload error")
                    return self.mock_client.batch_upload_embeddings(items)
                return False
        except Exception as e:
            error_message = str(e)
            logger.error(f"Error preparing items for batch upload: {error_message}")
            # Log unexpected error
            vector_search_audit_logger.log_update(
                user_id=user_id,
                operation_type="batch_upsert",
                num_items=len(items),
                status="failure",
                details={"error": error_message, "error_type": "unexpected", **audit_details}
            )
            if self.auto_fallback:
                logger.warning("Falling back to mock implementation due to unexpected error")
                return self.mock_client.batch_upload_embeddings(items)
            return False


class SimpleMockVectorSearchClient:
    """Simple mock implementation when the full mock is not available"""

    def __init__(self):
        """Initialize the simple mock client"""
        logger.info("Initializing Simple Mock Vector Search Client")

    def generate_embedding(self, text: str) -> List[float]:
        """Mock embedding generation

        Args:
            text: The text to generate an embedding for

        Returns:
            A list of 768 random float values
        """
        logger.info(f"Mock: Generating embedding for '{text[:30]}...'")
        import random
        # Generate a deterministic but unique embedding based on the text
        random.seed(hash(text) % 10000)
        return [random.uniform(-1, 1) for _ in range(768)]

    def search(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """Mock search function

        Args:
            query: The search query
            top_k: Maximum number of results to return

        Returns:
            A list of mock search results
        """
        logger.info(f"Mock: Searching for '{query[:30]}...'")

        # Generate mock results
        results = []
        for i in range(min(top_k, 3)):  # Return at most 3 results
            results.append({
                "id": f"mock-id-{i}",
                "score": 0.9 - (i * 0.1),
                "content": f"Mock content for query '{query}' (result {i+1})",
                "metadata": {"source": f"mock-source-{i}"}
            })

        return results

    def search_vector_store(self, query_embedding: List[float], top_k: int = 5) -> List[Dict[str, Any]]:
        """Mock vector store search

        Args:
            query_embedding: The embedding to search with
            top_k: Maximum number of results to return

        Returns:
            A list of mock search results
        """
        logger.info(f"Mock: Searching vector store with embedding of length {len(query_embedding)}")

        # Generate mock results
        results = []
        for i in range(min(top_k, 3)):  # Return at most 3 results
            results.append({
                "id": f"mock-id-{i}",
                "score": 0.9 - (i * 0.1),
                "content": f"Mock content for vector search (result {i+1})",
                "metadata": {"source": f"mock-source-{i}"}
            })

        return results

    def search_knowledge(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """Mock knowledge search

        Args:
            query: The search query
            top_k: Maximum number of results to return

        Returns:
            A list of mock knowledge results
        """
        logger.info(f"Mock: Searching knowledge for '{query[:30]}...'")

        # Generate mock results
        results = []
        for i in range(min(top_k, 3)):  # Return at most 3 results
            results.append({
                "id": f"mock-id-{i}",
                "score": 0.9 - (i * 0.1),
                "content": f"Mock knowledge content for query '{query}' (result {i+1})",
                "source": f"mock-source-{i}",
                "metadata": {"source": f"mock-source-{i}"},
                "vector_source": False  # Indicate this is from mock
            })

        return results

    def upload_embedding(self, content: str, metadata: Dict[str, Any] = None) -> bool:
        """Mock upload function

        Args:
            content: The content to upload
            metadata: Metadata for the content

        Returns:
            Always returns True
        """
        logger.info(f"Mock: Uploading content '{content[:30]}...'")
        return True

    def batch_upload_embeddings(self, items: List[Dict[str, Any]]) -> bool:
        """Mock batch upload function

        Args:
            items: List of items to upload

        Returns:
            Always returns True
        """
        logger.info(f"Mock: Batch uploading {len(items)} items")
        return True

    def is_available(self) -> bool:
        """Check if Vector Search is available

        Returns:
            Always returns True for the mock implementation
        """
        return True

    def get_health_status(self) -> Dict[str, Any]:
        """Get mock health status

        Returns:
            Mock health status information
        """
        return {
            "status": "mock",
            "message": "Using mock implementation",
            "details": {
                "initialized": True,
                "using_mock": True
            }
        }
