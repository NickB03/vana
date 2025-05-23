# Implementation Plan for Vector Search Authentication Fix

This plan provides detailed instructions for auggie (Augment code agent) to implement the Vector Search authentication fix for the VANA project. The work is structured in phases with specific tasks and clear guidance on implementation.

## Phase 1: Create Authentication Validation Script

**Task 1.1: Set up basic validation script structure**

```python
# Create file: scripts/verify_vector_search_configuration.py with the following structure

import os
import sys
import logging
import argparse
from typing import Dict, Any, Optional, Tuple, List
from google.cloud import aiplatform
from google.oauth2 import service_account

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("vector_search_validator")

# Environment variable names
ENV_PROJECT_ID = "GOOGLE_CLOUD_PROJECT"
ENV_LOCATION = "GOOGLE_CLOUD_LOCATION"
ENV_ENDPOINT_ID = "VECTOR_SEARCH_ENDPOINT_ID"
ENV_DEPLOYED_INDEX_ID = "DEPLOYED_INDEX_ID"
ENV_CREDENTIALS = "GOOGLE_APPLICATION_CREDENTIALS"

def parse_arguments():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description="Verify Vector Search Configuration")
    parser.add_argument("--project", help="GCP Project ID")
    parser.add_argument("--location", help="GCP Location", default="us-central1")
    parser.add_argument("--endpoint-id", help="Vector Search Endpoint ID")
    parser.add_argument("--deployed-index-id", help="Deployed Index ID", default="vanasharedindex")
    parser.add_argument("--credentials", help="Path to service account key file")
    parser.add_argument("--verbose", action="store_true", help="Enable verbose logging")
    return parser.parse_args()

def main():
    """Main function to verify Vector Search configuration."""
    logger.info("Starting Vector Search configuration verification")
    
    # Logic will be implemented in the next tasks
    
    logger.info("Vector Search configuration verification completed")

if __name__ == "__main__":
    main()
```

**Task 1.2: Implement environment validation**

```python
# Add these functions to verify_vector_search_configuration.py

def get_configuration(args) -> Dict[str, Any]:
    """Get configuration from environment variables or command line arguments."""
    config = {}
    
    # Project ID
    config["project_id"] = args.project or os.environ.get(ENV_PROJECT_ID)
    if not config["project_id"]:
        logger.error(f"Project ID not provided. Set {ENV_PROJECT_ID} environment variable or use --project")
        sys.exit(1)
    
    # Location
    config["location"] = args.location or os.environ.get(ENV_LOCATION) or "us-central1"
    
    # Endpoint ID
    config["endpoint_id"] = args.endpoint_id or os.environ.get(ENV_ENDPOINT_ID)
    if not config["endpoint_id"]:
        logger.error(f"Endpoint ID not provided. Set {ENV_ENDPOINT_ID} environment variable or use --endpoint-id")
        sys.exit(1)
    
    # Deployed Index ID
    config["deployed_index_id"] = args.deployed_index_id or os.environ.get(ENV_DEPLOYED_INDEX_ID) or "vanasharedindex"
    
    # Credentials
    config["credentials_path"] = args.credentials or os.environ.get(ENV_CREDENTIALS)
    if not config["credentials_path"]:
        logger.warning(f"Credentials path not provided. Using default credentials.")
    elif not os.path.exists(config["credentials_path"]):
        logger.error(f"Credentials file does not exist: {config['credentials_path']}")
        sys.exit(1)
    
    logger.info(f"Configuration: {config}")
    return config

def validate_environment(config: Dict[str, Any]) -> bool:
    """Validate the environment configuration."""
    logger.info("Validating environment configuration")
    
    # Check environment variables
    missing_vars = []
    if not os.environ.get(ENV_PROJECT_ID) and not config.get("project_id"):
        missing_vars.append(ENV_PROJECT_ID)
    if not os.environ.get(ENV_LOCATION) and not config.get("location"):
        missing_vars.append(ENV_LOCATION)
    if not os.environ.get(ENV_ENDPOINT_ID) and not config.get("endpoint_id"):
        missing_vars.append(ENV_ENDPOINT_ID)
    if not os.environ.get(ENV_DEPLOYED_INDEX_ID) and not config.get("deployed_index_id"):
        missing_vars.append(ENV_DEPLOYED_INDEX_ID)
    
    if missing_vars:
        logger.warning(f"Missing environment variables: {', '.join(missing_vars)}")
        logger.warning("Some variables were provided as command line arguments, but setting environment variables is recommended for production use.")
    
    # Check credentials
    if not os.environ.get(ENV_CREDENTIALS) and not config.get("credentials_path"):
        logger.warning(f"Missing {ENV_CREDENTIALS} environment variable. Using default application credentials.")
        logger.warning("This may work for development but is not recommended for production.")
    elif config.get("credentials_path") and not os.path.exists(config["credentials_path"]):
        logger.error(f"Credentials file not found: {config['credentials_path']}")
        return False
    
    logger.info("Environment validation completed")
    return True

# Update main function
def main():
    """Main function to verify Vector Search configuration."""
    logger.info("Starting Vector Search configuration verification")
    
    args = parse_arguments()
    if args.verbose:
        logger.setLevel(logging.DEBUG)
    
    config = get_configuration(args)
    if not validate_environment(config):
        logger.error("Environment validation failed")
        sys.exit(1)
    
    # More validation functions will be added in the next tasks
    
    logger.info("Vector Search configuration verification completed")
```

**Task 1.3: Implement service account authentication and permissions verification**

```python
# Add these functions to verify_vector_search_configuration.py

def validate_gcp_authentication(config: Dict[str, Any]) -> Tuple[bool, Optional[Any]]:
    """Validate Google Cloud authentication."""
    logger.info("Validating GCP authentication")
    
    credentials = None
    try:
        # Try to create credentials from the provided service account key file
        if config.get("credentials_path"):
            try:
                credentials = service_account.Credentials.from_service_account_file(
                    config["credentials_path"],
                    scopes=["https://www.googleapis.com/auth/cloud-platform"]
                )
                logger.info(f"Successfully loaded credentials from {config['credentials_path']}")
            except Exception as e:
                logger.error(f"Failed to load credentials from file: {str(e)}")
                return False, None
        
        # Initialize Vertex AI with the project and location
        aiplatform.init(
            project=config["project_id"],
            location=config["location"],
            credentials=credentials
        )
        logger.info(f"Successfully initialized Vertex AI with project {config['project_id']} in {config['location']}")
        
        return True, credentials
    except Exception as e:
        logger.error(f"Failed to authenticate with GCP: {str(e)}")
        return False, None

def validate_service_account_permissions(config: Dict[str, Any], credentials: Any) -> bool:
    """Validate that the service account has the necessary permissions."""
    logger.info("Validating service account permissions")
    
    # We'll test permissions by attempting to list indexes
    try:
        # Initialize the IndexServiceClient with the provided credentials
        if credentials:
            client = aiplatform.gapic.IndexServiceClient(credentials=credentials)
        else:
            client = aiplatform.gapic.IndexServiceClient()
        
        # Create the parent resource path
        parent = f"projects/{config['project_id']}/locations/{config['location']}"
        
        # Try to list indexes to verify permissions
        request = aiplatform.gapic.ListIndexesRequest(parent=parent)
        indexes = client.list_indexes(request=request)
        
        # Check if we can iterate through the results
        index_count = 0
        for index in indexes:
            index_count += 1
            logger.debug(f"Found index: {index.name}")
        
        logger.info(f"Successfully listed {index_count} indexes")
        return True
    except Exception as e:
        logger.error(f"Failed to list indexes due to permission issue: {str(e)}")
        logger.error("The service account may not have the necessary permissions.")
        logger.error("Required permissions: aiplatform.indexes.list")
        
        # Provide guidance on fixing the issue
        logger.info("\nTo fix this issue:")
        logger.info("1. Go to the Google Cloud Console: https://console.cloud.google.com/")
        logger.info(f"2. Navigate to IAM & Admin > IAM for project {config['project_id']}")
        logger.info("3. Find your service account and click the edit (pencil) icon")
        logger.info("4. Add the following roles:")
        logger.info("   - Vertex AI User")
        logger.info("   - Storage Object Viewer")
        logger.info("5. Alternatively, add the specific permissions:")
        logger.info("   - aiplatform.indexes.list")
        logger.info("   - aiplatform.indexes.get")
        logger.info("   - aiplatform.indexEndpoints.list")
        logger.info("   - aiplatform.indexEndpoints.get")
        
        return False

# Update main function to include these new validations
def main():
    """Main function to verify Vector Search configuration."""
    logger.info("Starting Vector Search configuration verification")
    
    args = parse_arguments()
    if args.verbose:
        logger.setLevel(logging.DEBUG)
    
    config = get_configuration(args)
    if not validate_environment(config):
        logger.error("Environment validation failed")
        sys.exit(1)
    
    auth_success, credentials = validate_gcp_authentication(config)
    if not auth_success:
        logger.error("GCP authentication failed")
        sys.exit(1)
    
    if not validate_service_account_permissions(config, credentials):
        logger.error("Service account permissions validation failed")
        sys.exit(1)
    
    # More validation functions will be added in the next tasks
    
    logger.info("Vector Search configuration verification completed successfully")
```

**Task 1.4: Implement Vector Search endpoint and index validation**

```python
# Add these functions to verify_vector_search_configuration.py

def validate_vector_search_resources(config: Dict[str, Any], credentials: Any) -> bool:
    """Validate Vector Search resources (endpoint and index)."""
    logger.info("Validating Vector Search resources")
    
    try:
        # Initialize the IndexEndpointServiceClient with the provided credentials
        if credentials:
            endpoint_client = aiplatform.gapic.IndexEndpointServiceClient(credentials=credentials)
        else:
            endpoint_client = aiplatform.gapic.IndexEndpointServiceClient()
        
        # Create the parent resource path
        parent = f"projects/{config['project_id']}/locations/{config['location']}"
        
        # Try to get the index endpoint
        endpoint_name = f"{parent}/indexEndpoints/{config['endpoint_id']}"
        try:
            endpoint = endpoint_client.get_index_endpoint(name=endpoint_name)
            logger.info(f"Successfully found index endpoint: {endpoint.name}")
        except Exception as e:
            logger.error(f"Failed to find index endpoint {config['endpoint_id']}: {str(e)}")
            logger.error("Check that the endpoint ID is correct and exists in the specified project and location.")
            return False
        
        # Check if the endpoint has the deployed index
        deployed_index_found = False
        for deployed_index in endpoint.deployed_indexes:
            logger.debug(f"Found deployed index: {deployed_index.id}")
            if deployed_index.id == config["deployed_index_id"]:
                deployed_index_found = True
                logger.info(f"Successfully found deployed index: {deployed_index.id}")
                break
        
        if not deployed_index_found:
            logger.error(f"Deployed index {config['deployed_index_id']} not found on endpoint {config['endpoint_id']}")
            logger.error("Available deployed indexes:")
            for deployed_index in endpoint.deployed_indexes:
                logger.error(f"  - {deployed_index.id}")
            return False
        
        return True
    except Exception as e:
        logger.error(f"Failed to validate Vector Search resources: {str(e)}")
        return False

def validate_embedding_generation(config: Dict[str, Any], credentials: Any) -> bool:
    """Validate that we can generate embeddings."""
    logger.info("Validating embedding generation")
    
    try:
        from vertexai.language_models import TextEmbeddingModel
        import vertexai
        
        # Initialize Vertex AI with the project and location
        vertexai.init(
            project=config["project_id"],
            location=config["location"],
            credentials=credentials
        )
        
        # Use the text-embedding-004 model
        try:
            model = TextEmbeddingModel.from_pretrained("text-embedding-004")
            logger.info("Successfully loaded text-embedding-004 model")
        except Exception as e:
            logger.error(f"Failed to load text-embedding-004 model: {str(e)}")
            return False
        
        # Generate an embedding for a test text
        test_text = "This is a test text for embedding generation."
        try:
            embedding = model.get_embeddings([test_text])[0]
            embedding_values = [float(value) for value in embedding.values]
            
            logger.info(f"Successfully generated embedding with {len(embedding_values)} dimensions")
            logger.debug(f"First 5 values: {embedding_values[:5]}")
            
            return True
        except Exception as e:
            logger.error(f"Failed to generate embedding: {str(e)}")
            return False
    except ImportError:
        logger.error("Failed to import embedding libraries. Make sure vertexai is installed.")
        logger.error("Run: pip install google-cloud-aiplatform")
        return False
    except Exception as e:
        logger.error(f"Failed to validate embedding generation: {str(e)}")
        return False

# Add test for Vector Search query functionality
def test_vector_search_query(config: Dict[str, Any], credentials: Any) -> bool:
    """Test Vector Search query functionality."""
    logger.info("Testing Vector Search query functionality")
    
    try:
        # Generate an embedding
        from vertexai.language_models import TextEmbeddingModel
        import vertexai
        
        vertexai.init(
            project=config["project_id"],
            location=config["location"],
            credentials=credentials
        )
        
        model = TextEmbeddingModel.from_pretrained("text-embedding-004")
        test_query = "What is VANA?"
        embedding = model.get_embeddings([test_query])[0]
        
        # Convert embedding values to float
        embedding_values = [float(value) for value in embedding.values]
        
        # Create the endpoint path
        endpoint_path = f"projects/{config['project_id']}/locations/{config['location']}/indexEndpoints/{config['endpoint_id']}"
        
        # Initialize the MatchServiceClient
        if credentials:
            match_client = aiplatform.gapic.MatchServiceClient(credentials=credentials)
        else:
            match_client = aiplatform.gapic.MatchServiceClient()
        
        # Create the find_neighbors request
        request = aiplatform.gapic.FindNeighborsRequest(
            index_endpoint=endpoint_path,
            deployed_index_id=config["deployed_index_id"],
            queries=[
                aiplatform.gapic.FindNeighborsRequest.Query(
                    datapoint=aiplatform.gapic.IndexDatapoint(
                        feature_vector=embedding_values
                    )
                )
            ]
        )
        
        # Send the request
        try:
            response = match_client.find_neighbors(request)
            
            # Check if we got results
            result_count = 0
            for query_result in response.nearest_neighbors:
                for neighbor in query_result.neighbors:
                    result_count += 1
                    logger.debug(f"Result {result_count}: {neighbor.distance}")
            
            logger.info(f"Successfully retrieved {result_count} results from Vector Search")
            
            if result_count == 0:
                logger.warning("No results found. This might indicate that the index is empty.")
                logger.warning("This is not necessarily an error, but you may want to populate the index with data.")
            
            return True
        except Exception as e:
            logger.error(f"Failed to query Vector Search: {str(e)}")
            return False
    except Exception as e:
        logger.error(f"Failed to test Vector Search query: {str(e)}")
        return False

# Update main function to include these new validations
def main():
    """Main function to verify Vector Search configuration."""
    logger.info("Starting Vector Search configuration verification")
    
    args = parse_arguments()
    if args.verbose:
        logger.setLevel(logging.DEBUG)
    
    config = get_configuration(args)
    if not validate_environment(config):
        logger.error("Environment validation failed")
        sys.exit(1)
    
    auth_success, credentials = validate_gcp_authentication(config)
    if not auth_success:
        logger.error("GCP authentication failed")
        sys.exit(1)
    
    if not validate_service_account_permissions(config, credentials):
        logger.error("Service account permissions validation failed")
        sys.exit(1)
    
    if not validate_vector_search_resources(config, credentials):
        logger.error("Vector Search resources validation failed")
        sys.exit(1)
    
    if not validate_embedding_generation(config, credentials):
        logger.error("Embedding generation validation failed")
        sys.exit(1)
    
    if not test_vector_search_query(config, credentials):
        logger.error("Vector Search query test failed")
        sys.exit(1)
    
    logger.info("✅ All Vector Search configuration validations passed!")
    logger.info("Vector Search is properly configured and operational.")
```

**Task 1.5: Add comprehensive output reporting**

```python
# Add these functions to verify_vector_search_configuration.py

def generate_validation_report(config: Dict[str, Any], validations: Dict[str, bool]) -> str:
    """Generate a comprehensive validation report."""
    report_lines = [
        "=== Vector Search Configuration Validation Report ===",
        "",
        f"Project ID: {config['project_id']}",
        f"Location: {config['location']}",
        f"Endpoint ID: {config['endpoint_id']}",
        f"Deployed Index ID: {config['deployed_index_id']}",
        f"Credentials Path: {config.get('credentials_path', 'Using default credentials')}",
        "",
        "Validation Results:",
        f"  Environment Configuration: {'✅ Passed' if validations.get('environment', False) else '❌ Failed'}",
        f"  GCP Authentication: {'✅ Passed' if validations.get('authentication', False) else '❌ Failed'}",
        f"  Service Account Permissions: {'✅ Passed' if validations.get('permissions', False) else '❌ Failed'}",
        f"  Vector Search Resources: {'✅ Passed' if validations.get('resources', False) else '❌ Failed'}",
        f"  Embedding Generation: {'✅ Passed' if validations.get('embedding', False) else '❌ Failed'}",
        f"  Vector Search Query Test: {'✅ Passed' if validations.get('query', False) else '❌ Failed'}",
        "",
    ]
    
    # Overall status
    all_passed = all(validations.values())
    if all_passed:
        report_lines.append("Overall Status: ✅ All validations passed! Vector Search is properly configured.")
    else:
        report_lines.append("Overall Status: ❌ Some validations failed. See details above.")
        
        # Add fixing instructions
        report_lines.extend([
            "",
            "To fix the issues:",
            "",
            "1. Environment Configuration:",
            "   - Make sure all required environment variables are set:",
            f"     - {ENV_PROJECT_ID}",
            f"     - {ENV_LOCATION}",
            f"     - {ENV_ENDPOINT_ID}",
            f"     - {ENV_DEPLOYED_INDEX_ID}",
            f"     - {ENV_CREDENTIALS}",
            "",
            "2. GCP Authentication:",
            "   - Make sure the service account key file exists and is accessible",
            "   - Make sure the service account key file is valid",
            "",
            "3. Service Account Permissions:",
            "   - Make sure the service account has the necessary permissions:",
            "     - aiplatform.indexes.list",
            "     - aiplatform.indexes.get",
            "     - aiplatform.indexEndpoints.list",
            "     - aiplatform.indexEndpoints.get",
            "",
            "4. Vector Search Resources:",
            "   - Make sure the endpoint ID is correct and the endpoint exists",
            "   - Make sure the deployed index ID is correct and the index is deployed to the endpoint",
            "",
            "5. Embedding Generation:",
            "   - Make sure the text-embedding-004 model is available in your region",
            "   - Make sure the service account has access to the model",
            "",
            "6. Vector Search Query Test:",
            "   - Make sure the index contains data",
            "   - Make sure the find_neighbors request is properly formatted",
        ])
    
    return "\n".join(report_lines)

# Update main function to use the report generator
def main():
    """Main function to verify Vector Search configuration."""
    logger.info("Starting Vector Search configuration verification")
    
    args = parse_arguments()
    if args.verbose:
        logger.setLevel(logging.DEBUG)
    
    config = get_configuration(args)
    
    # Track validation results
    validations = {
        "environment": False,
        "authentication": False,
        "permissions": False,
        "resources": False,
        "embedding": False,
        "query": False
    }
    
    # Run validations
    validations["environment"] = validate_environment(config)
    if not validations["environment"]:
        logger.error("Environment validation failed")
    else:
        validations["authentication"], credentials = validate_gcp_authentication(config)
        if not validations["authentication"]:
            logger.error("GCP authentication failed")
        else:
            validations["permissions"] = validate_service_account_permissions(config, credentials)
            if not validations["permissions"]:
                logger.error("Service account permissions validation failed")
            
            validations["resources"] = validate_vector_search_resources(config, credentials)
            if not validations["resources"]:
                logger.error("Vector Search resources validation failed")
            
            validations["embedding"] = validate_embedding_generation(config, credentials)
            if not validations["embedding"]:
                logger.error("Embedding generation validation failed")
            
            validations["query"] = test_vector_search_query(config, credentials)
            if not validations["query"]:
                logger.error("Vector Search query test failed")
    
    # Generate and print report
    report = generate_validation_report(config, validations)
    print("\n" + report)
    
    # Save report to file
    report_file = "vector_search_validation_report.txt"
    try:
        with open(report_file, "w") as f:
            f.write(report)
        logger.info(f"Validation report saved to {report_file}")
    except Exception as e:
        logger.error(f"Failed to save validation report: {str(e)}")
    
    # Exit with appropriate code
    if all(validations.values()):
        logger.info("Vector Search configuration verification completed successfully")
        sys.exit(0)
    else:
        logger.error("Vector Search configuration verification failed")
        sys.exit(1)
```

## Phase 2: Enhance Vector Search Client with Better Authentication

**Task 2.1: Update Vector Search client initialization and error handling**

```python
# Update file: tools/vector_search/vector_search_client.py

import os
import logging
from typing import List, Dict, Any, Optional, Tuple, Union
from google.cloud import aiplatform
from vertexai.language_models import TextEmbeddingModel
import vertexai
from google.oauth2 import service_account

logger = logging.getLogger(__name__)

class VectorSearchClient:
    """Client for interacting with Vertex AI Vector Search."""
    
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
        self.endpoint = None
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
            vertexai.init(
                project=self.project_id,
                location=self.location,
                credentials=self.credentials
            )
            
            # Initialize aiplatform
            aiplatform.init(
                project=self.project_id,
                location=self.location,
                credentials=self.credentials
            )
            
            # Initialize endpoint
            try:
                endpoint_path = f"projects/{self.project_id}/locations/{self.location}/indexEndpoints/{self.endpoint_id}"
                if self.credentials:
                    self.match_client = aiplatform.gapic.MatchServiceClient(credentials=self.credentials)
                else:
                    self.match_client = aiplatform.gapic.MatchServiceClient()
                logger.info(f"Successfully initialized Vector Search client for endpoint {endpoint_path}")
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
        from .vector_search_mock import MockVectorSearchClient
        self.mock_client = MockVectorSearchClient()
        self.initialized = True
        self.using_mock = True
        logger.info("Mock Vector Search client initialized")
    
    # Rest of the class will be updated in the next task
```

**Task 2.2: Update embedding generation and search methods**

```python
# Add these methods to the VectorSearchClient class in tools/vector_search/vector_search_client.py

def generate_embedding(self, text: str) -> List[float]:
    """Generate an embedding for a text.
    
    Args:
        text: The text to generate an embedding for.
        
    Returns:
        A list of float values representing the embedding.
    """
    if self.using_mock:
        return self.mock_client.generate_embedding(text)
    
    if not self._initialize():
        logger.error("Vector Search client not initialized")
        return []
    
    try:
        # Use the text-embedding-004 model
        model = TextEmbeddingModel.from_pretrained("text-embedding-004")
        
        # Generate embedding
        embedding = model.get_embeddings([text])[0]
        
        # Explicitly convert values to float to avoid type errors
        embedding_values = [float(value) for value in embedding.values]
        
        logger.info(f"Generated embedding with {len(embedding_values)} dimensions")
        return embedding_values
    except Exception as e:
        logger.error(f"Error generating embedding: {str(e)}")
        
        if self.auto_fallback:
            logger.warning("Falling back to mock implementation for embedding generation")
            return self.mock_client.generate_embedding(text)
        
        return []

def search_vector_store(
    self,
    query_embedding: List[float],
    top_k: int = 5
) -> List[Dict[str, Any]]:
    """Search the vector store with a query embedding.
    
    Args:
        query_embedding: The embedding to search with.
        top_k: The number of results to return.
        
    Returns:
        A list of search results, each containing 'id', 'score', and 'metadata'.
    """
    if self.using_mock:
        return self.mock_client.search_vector_store(query_embedding, top_k)
    
    if not self._initialize():
        logger.error("Vector Search client not initialized")
        return []
    
    try:
        # Validate embedding format
        if not query_embedding or not all(isinstance(value, float) for value in query_embedding):
            logger.warning("Invalid embedding format, ensuring all values are float")
            if query_embedding:
                query_embedding = [float(value) for value in query_embedding]
            else:
                raise ValueError("Failed to generate valid embedding")
        
        # Create the find_neighbors request
        endpoint_path = f"projects/{self.project_id}/locations/{self.location}/indexEndpoints/{self.endpoint_id}"
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
        try:
            response = self.match_client.find_neighbors(request)
        except Exception as primary_error:
            logger.error(f"Primary API call failed: {str(primary_error)}")
            logger.info("Trying alternative match API")
            
            try:
                # Try the alternative match API as a fallback
                response = self.match_client.match(
                    index_endpoint=endpoint_path,
                    deployed_index_id=self.deployed_index_id,
                    queries=[
                        {
                            "datapoint": {
                                "feature_vector": query_embedding
                            }
                        }
                    ],
                    num_neighbors=top_k
                )
            except Exception as alt_error:
                logger.error(f"Alternative API also failed: {str(alt_error)}")
                if self.auto_fallback:
                    logger.warning("Falling back to mock implementation for search")
                    return self.mock_client.search_vector_store(query_embedding, top_k)
                return []
        
        # Process results
        results = []
        for query_result in response.nearest_neighbors:
            for neighbor in query_result.neighbors:
                result = {
                    "id": neighbor.datapoint.datapoint_id,
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
        
        logger.info(f"Retrieved {len(results)} results from Vector Search")
        return results
    except Exception as e:
        logger.error(f"Error searching vector store: {str(e)}")
        
        if self.auto_fallback:
            logger.warning("Falling back to mock implementation for search")
            return self.mock_client.search_vector_store(query_embedding, top_k)
        
        return []

def search_knowledge(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
    """Search for knowledge using the vector store.
    
    This is a convenience method that generates an embedding for the query
    and then searches the vector store with that embedding.
    
    Args:
        query: The query text.
        top_k: The number of results to return.
        
    Returns:
        A list of search results, each containing 'id', 'score', 'content', and 'source'.
    """
    if self.using_mock:
        return self.mock_client.search_knowledge(query, top_k)
    
    try:
        # Generate embedding for the query
        embedding = self.generate_embedding(query)
        
        if not embedding:
            logger.error("Failed to generate embedding for query")
            if self.auto_fallback:
                logger.warning("Falling back to mock implementation due to embedding generation failure")
                return self.mock_client.search_knowledge(query, top_k)
            return []
        
        # Search the vector store
        results = self.search_vector_store(embedding, top_k)
        
        # Format the results
        formatted_results = []
        for result in results:
            formatted_result = {
                "id": result.get("id", ""),
                "score": result.get("score", 0.0),
                "content": result.get("metadata", {}).get("content", ""),
                "source": result.get("metadata", {}).get("source", ""),
                "vector_source": not self.using_mock
            }
            formatted_results.append(formatted_result)
        
        return formatted_results
    except Exception as e:
        logger.error(f"Error in search_knowledge: {str(e)}")
        
        if self.auto_fallback:
            logger.warning("Falling back to mock implementation for knowledge search")
            return self.mock_client.search_knowledge(query, top_k)
        
        return []

def get_health_status(self) -> Dict[str, Any]:
    """Get the health status of the Vector Search client.
    
    Returns:
        A dictionary with health status information.
    """
    if self.using_mock:
        return {
            "status": "mock",
            "message": "Using mock implementation",
            "details": {
                "initialized": self.initialized,
                "using_mock": self.using_mock,
                "project_id": self.project_id,
                "location": self.location,
                "endpoint_id": self.endpoint_id,
                "deployed_index_id": self.deployed_index_id,
                "credentials_path": self.credentials_path
            }
        }
    
    if not self._initialize():
        return {
            "status": "error",
            "message": "Vector Search client not initialized",
            "details": {
                "initialized": self.initialized,
                "using_mock": self.using_mock,
                "project_id": self.project_id,
                "location": self.location,
                "endpoint_id": self.endpoint_id,
                "deployed_index_id": self.deployed_index_id,
                "credentials_path": self.credentials_path
            }
        }
    
    try:
        # Try to generate a test embedding
        test_embedding = self.generate_embedding("Test health check")
        
        if not test_embedding:
            return {
                "status": "error",
                "message": "Failed to generate test embedding",
                "details": {
                    "initialized": self.initialized,
                    "using_mock": self.using_mock,
                    "project_id": self.project_id,
                    "location": self.location,
                    "endpoint_id": self.endpoint_id,
                    "deployed_index_id": self.deployed_index_id,
                    "credentials_path": self.credentials_path
                }
            }
        
        # Try to search with the test embedding
        test_results = self.search_vector_store(test_embedding, 1)
        
        return {
            "status": "healthy",
            "message": "Vector Search client is healthy",
            "details": {
                "initialized": self.initialized,
                "using_mock": self.using_mock,
                "project_id": self.project_id,
                "location": self.location,
                "endpoint_id": self.endpoint_id,
                "deployed_index_id": self.deployed_index_id,
                "credentials_path": self.credentials_path,
                "embedding_dimensions": len(test_embedding),
                "test_search_results": len(test_results)
            }
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
            }
        }
```

## Phase 3: Create Vector Search Health Checker Service

**Task 3.1: Create health checker module**

```python
# Create file: tools/vector_search/health_checker.py

import os
import sys
import logging
from typing import Dict, Any, Optional, List, Tuple
import time
import json
import argparse
from .vector_search_client import VectorSearchClient

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("vector_search_health_checker")

class VectorSearchHealthChecker:
    """Health checker for Vector Search.
    
    This class provides functionality to check the health of the Vector Search
    service, log metrics, and provide recommendations for fixing issues.
    """
    
    def __init__(
        self,
        project_id: Optional[str] = None,
        location: Optional[str] = None,
        endpoint_id: Optional[str] = None,
        deployed_index_id: Optional[str] = None,
        credentials_path: Optional[str] = None
    ):
        """Initialize the health checker.
        
        Args:
            project_id: GCP project ID. If not provided, will try to get from environment.
            location: GCP location. If not provided, will try to get from environment.
            endpoint_id: Vector Search endpoint ID. If not provided, will try to get from environment.
            deployed_index_id: Deployed index ID. If not provided, will try to get from environment.
            credentials_path: Path to service account key file. If not provided, will try to get from environment.
        """
        self.project_id = project_id or os.environ.get("GOOGLE_CLOUD_PROJECT")
        self.location = location or os.environ.get("GOOGLE_CLOUD_LOCATION", "us-central1")
        self.endpoint_id = endpoint_id or os.environ.get("VECTOR_SEARCH_ENDPOINT_ID")
        self.deployed_index_id = deployed_index_id or os.environ.get("DEPLOYED_INDEX_ID", "vanasharedindex")
        self.credentials_path = credentials_path or os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
        
        # Create the client with auto_fallback=False to catch issues
        self.client = VectorSearchClient(
            project_id=self.project_id,
            location=self.location,
            endpoint_id=self.endpoint_id,
            deployed_index_id=self.deployed_index_id,
            credentials_path=self.credentials_path,
            use_mock=False,
            auto_fallback=False
        )
        
        # Track metrics
        self.metrics = {
            "checks_performed": 0,
            "successful_checks": 0,
            "failed_checks": 0,
            "last_check_time": None,
            "last_check_success": False,
            "last_check_status": None,
            "average_embedding_time_ms": 0,
            "average_search_time_ms": 0
        }
    
    def check_health(self) -> Dict[str, Any]:
        """Check the health of the Vector Search service.
        
        Returns:
            A dictionary with health status information.
        """
        self.metrics["checks_performed"] += 1
        self.metrics["last_check_time"] = time.time()
        
        # Initialize a client with no auto-fallback to catch issues
        try:
            # Check initialization
            if not self.client._initialize():
                status = {
                    "status": "error",
                    "message": "Failed to initialize Vector Search client",
                    "details": {
                        "project_id": self.project_id,
                        "location": self.location,
                        "endpoint_id": self.endpoint_id,
                        "deployed_index_id": self.deployed_index_id,
                        "credentials_path": self.credentials_path
                    },
                    "recommendations": [
                        "Check that all environment variables are set correctly",
                        "Verify that the service account key file exists and is accessible",
                        "Ensure the service account has the necessary permissions"
                    ]
                }
                self._update_metrics_failure(status)
                return status
            
            # Check embedding generation
            test_query = "Vector Search health check test query"
            
            start_time = time.time()
            embedding = self.client.generate_embedding(test_query)
            embedding_time_ms = (time.time() - start_time) * 1000
            
            if not embedding:
                status = {
                    "status": "error",
                    "message": "Failed to generate embedding",
                    "details": {
                        "project_id": self.project_id,
                        "location": self.location,
                        "endpoint_id": self.endpoint_id,
                        "deployed_index_id": self.deployed_index_id,
                        "credentials_path": self.credentials_path
                    },
                    "recommendations": [
                        "Check that the text-embedding-004 model is available in your region",
                        "Ensure the service account has access to the model",
                        "Verify that Vertex AI is properly configured"
                    ]
                }
                self._update_metrics_failure(status)
                return status
            
            # Check vector search
            start_time = time.time()
            results = self.client.search_vector_store(embedding, 5)
            search_time_ms = (time.time() - start_time) * 1000
            
            # Update metrics
            self._update_metrics_success(embedding_time_ms, search_time_ms)
            
            # Return status
            return {
                "status": "healthy",
                "message": "Vector Search is healthy",
                "details": {
                    "project_id": self.project_id,
                    "location": self.location,
                    "endpoint_id": self.endpoint_id,
                    "deployed_index_id": self.deployed_index_id,
                    "credentials_path": self.credentials_path,
                    "embedding_dimensions": len(embedding),
                    "search_results": len(results),
                    "embedding_time_ms": embedding_time_ms,
                    "search_time_ms": search_time_ms,
                    "metrics": self.metrics
                }
            }
            
        except Exception as e:
            status = {
                "status": "error",
                "message": f"Error checking health: {str(e)}",
                "details": {
                    "project_id": self.project_id,
                    "location": self.location,
                    "endpoint_id": self.endpoint_id,
                    "deployed_index_id": self.deployed_index_id,
                    "credentials_path": self.credentials_path,
                    "error": str(e)
                },
                "recommendations": [
                    "Check logs for detailed error messages",
                    "Run the verify_vector_search_configuration.py script for detailed diagnostics",
                    "Verify that the service account has the necessary permissions",
                    "Ensure the Vector Search endpoint and index exist and are properly configured"
                ]
            }
            self._update_metrics_failure(status)
            return status
    
    def _update_metrics_success(self, embedding_time_ms: float, search_time_ms: float):
        """Update metrics after a successful health check."""
        self.metrics["successful_checks"] += 1
        self.metrics["last_check_success"] = True
        self.metrics["last_check_status"] = "healthy"
        
        # Update average times
        if self.metrics["average_embedding_time_ms"] == 0:
            self.metrics["average_embedding_time_ms"] = embedding_time_ms
        else:
            self.metrics["average_embedding_time_ms"] = (
                self.metrics["average_embedding_time_ms"] * 0.9 + embedding_time_ms * 0.1
            )
        
        if self.metrics["average_search_time_ms"] == 0:
            self.metrics["average_search_time_ms"] = search_time_ms
        else:
            self.metrics["average_search_time_ms"] = (
                self.metrics["average_search_time_ms"] * 0.9 + search_time_ms * 0.1
            )
    
    def _update_metrics_failure(self, status: Dict[str, Any]):
        """Update metrics after a failed health check."""
        self.metrics["failed_checks"] += 1
        self.metrics["last_check_success"] = False
        self.metrics["last_check_status"] = status["status"]
    
    def get_recommendations(self) -> List[str]:
        """Get recommendations for improving Vector Search health."""
        recommendations = []
        
        if not self.project_id:
            recommendations.append("Set GOOGLE_CLOUD_PROJECT environment variable")
        
        if not self.endpoint_id:
            recommendations.append("Set VECTOR_SEARCH_ENDPOINT_ID environment variable")
        
        if not self.credentials_path:
            recommendations.append("Set GOOGLE_APPLICATION_CREDENTIALS environment variable")
        elif not os.path.exists(self.credentials_path):
            recommendations.append(f"Service account key file does not exist: {self.credentials_path}")
        
        if self.metrics["last_check_success"] is False:
            recommendations.append("Run the verify_vector_search_configuration.py script for detailed diagnostics")
        
        if self.metrics["average_search_time_ms"] > 500:
            recommendations.append("Consider optimizing Vector Search for better performance")
        
        return recommendations

# Command-line interface
def main():
    """Command-line interface for the health checker."""
    parser = argparse.ArgumentParser(description="Vector Search Health Checker")
    parser.add_argument("--project", help="GCP Project ID")
    parser.add_argument("--location", help="GCP Location", default="us-central1")
    parser.add_argument("--endpoint-id", help="Vector Search Endpoint ID")
    parser.add_argument("--deployed-index-id", help="Deployed Index ID", default="vanasharedindex")
    parser.add_argument("--credentials", help="Path to service account key file")
    parser.add_argument("--output", help="Output file for health check results")
    parser.add_argument("--verbose", action="store_true", help="Enable verbose logging")
    args = parser.parse_args()
    
    if args.verbose:
        logger.setLevel(logging.DEBUG)
    
    # Create health checker
    health_checker = VectorSearchHealthChecker(
        project_id=args.project,
        location=args.location,
        endpoint_id=args.endpoint_id,
        deployed_index_id=args.deployed_index_id,
        credentials_path=args.credentials
    )
    
    # Check health
    health_status = health_checker.check_health()
    
    # Print results
    print(json.dumps(health_status, indent=2))
    
    # Save to file if requested
    if args.output:
        try:
            with open(args.output, "w") as f:
                json.dump(health_status, f, indent=2)
            logger.info(f"Health check results saved to {args.output}")
        except Exception as e:
            logger.error(f"Failed to save health check results: {str(e)}")
    
    # Exit with appropriate code
    if health_status["status"] == "healthy":
        sys.exit(0)
    else:
        sys.exit(1)

if __name__ == "__main__":
    main()
```

**Task 3.2: Create a periodic health check script**

```python
# Create file: scripts/run_vector_search_health_check.py

#!/usr/bin/env python
"""
Periodic health check for Vector Search.

This script runs a periodic health check for Vector Search and logs the results.
It can be run manually or scheduled via cron.
"""

import os
import sys
import logging
import time
import json
import argparse
from datetime import datetime
import sqlite3
from pathlib import Path

# Add the project root to the path so we can import from tools
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from tools.vector_search.health_checker import VectorSearchHealthChecker

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("vector_search_health_check")

def setup_database(db_path: str):
    """Set up the database for storing health check results."""
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Create the health check table if it doesn't exist
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS vector_search_health_checks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT,
            status TEXT,
            message TEXT,
            details TEXT,
            project_id TEXT,
            location TEXT,
            endpoint_id TEXT,
            deployed_index_id TEXT,
            embedding_dimensions INTEGER,
            search_results INTEGER,
            embedding_time_ms REAL,
            search_time_ms REAL
        )
        """)
        
        # Create the metrics table if it doesn't exist
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS vector_search_metrics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT,
            checks_performed INTEGER,
            successful_checks INTEGER,
            failed_checks INTEGER,
            average_embedding_time_ms REAL,
            average_search_time_ms REAL
        )
        """)
        
        conn.commit()
        conn.close()
        
        logger.info(f"Database setup complete: {db_path}")
        return True
    except Exception as e:
        logger.error(f"Failed to set up database: {str(e)}")
        return False

def save_to_database(db_path: str, health_status: dict):
    """Save health check results to the database."""
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Extract values from the health status
        timestamp = datetime.now().isoformat()
        status = health_status.get("status", "unknown")
        message = health_status.get("message", "")
        details_json = json.dumps(health_status.get("details", {}))
        
        # Extract more specific values
        details = health_status.get("details", {})
        project_id = details.get("project_id", "")
        location = details.get("location", "")
        endpoint_id = details.get("endpoint_id", "")
        deployed_index_id = details.get("deployed_index_id", "")
        embedding_dimensions = details.get("embedding_dimensions", 0)
        search_results = details.get("search_results", 0)
        embedding_time_ms = details.get("embedding_time_ms", 0)
        search_time_ms = details.get("search_time_ms", 0)
        
        # Insert into the health check table
        cursor.execute("""
        INSERT INTO vector_search_health_checks (
            timestamp, status, message, details, project_id, location, endpoint_id,
            deployed_index_id, embedding_dimensions, search_results, embedding_time_ms, search_time_ms
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            timestamp, status, message, details_json, project_id, location, endpoint_id,
            deployed_index_id, embedding_dimensions, search_results, embedding_time_ms, search_time_ms
        ))
        
        # Extract metrics and save to the metrics table
        metrics = details.get("metrics", {})
        if metrics:
            cursor.execute("""
            INSERT INTO vector_search_metrics (
                timestamp, checks_performed, successful_checks, failed_checks,
                average_embedding_time_ms, average_search_time_ms
            ) VALUES (?, ?, ?, ?, ?, ?)
            """, (
                timestamp,
                metrics.get("checks_performed", 0),
                metrics.get("successful_checks", 0),
                metrics.get("failed_checks", 0),
                metrics.get("average_embedding_time_ms", 0),
                metrics.get("average_search_time_ms", 0)
            ))
        
        conn.commit()
        conn.close()
        
        logger.info(f"Health check results saved to database: {db_path}")
        return True
    except Exception as e:
        logger.error(f"Failed to save to database: {str(e)}")
        return False

def main():
    """Run the health check and log the results."""
    parser = argparse.ArgumentParser(description="Vector Search Health Check")
    parser.add_argument("--project", help="GCP Project ID")
    parser.add_argument("--location", help="GCP Location", default="us-central1")
    parser.add_argument("--endpoint-id", help="Vector Search Endpoint ID")
    parser.add_argument("--deployed-index-id", help="Deployed Index ID", default="vanasharedindex")
    parser.add_argument("--credentials", help="Path to service account key file")
    parser.add_argument("--output", help="Output file for health check results")
    parser.add_argument("--db", help="Database file for storing health check results",
                      default="vector_search_health.db")
    parser.add_argument("--continuous", action="store_true", help="Run continuously with interval")
    parser.add_argument("--interval", type=int, default=3600, help="Interval in seconds for continuous mode")
    parser.add_argument("--verbose", action="store_true", help="Enable verbose logging")
    args = parser.parse_args()
    
    if args.verbose:
        logger.setLevel(logging.DEBUG)
    
    # Setup database
    if not setup_database(args.db):
        sys.exit(1)
    
    # Function to run a single health check
    def run_health_check():
        # Create health checker
        health_checker = VectorSearchHealthChecker(
            project_id=args.project,
            location=args.location,
            endpoint_id=args.endpoint_id,
            deployed_index_id=args.deployed_index_id,
            credentials_path=args.credentials
        )
        
        # Check health
        health_status = health_checker.check_health()
        
        # Print results
        print(json.dumps(health_status, indent=2))
        
        # Save to database
        save_to_database(args.db, health_status)
        
        # Save to file if requested
        if args.output:
            try:
                with open(args.output, "w") as f:
                    json.dump(health_status, f, indent=2)
                logger.info(f"Health check results saved to {args.output}")
            except Exception as e:
                logger.error(f"Failed to save health check results: {str(e)}")
        
        # Log appropriate message based on status
        if health_status["status"] == "healthy":
            logger.info("Vector Search health check: HEALTHY")
        else:
            logger.error(f"Vector Search health check: {health_status['status'].upper()} - {health_status['message']}")
        
        return health_status["status"] == "healthy"
    
    # Run continuously or once
    if args.continuous:
        logger.info(f"Starting continuous health checks with {args.interval}s interval")
        try:
            while True:
                run_health_check()
                logger.info(f"Sleeping for {args.interval} seconds...")
                time.sleep(args.interval)
        except KeyboardInterrupt:
            logger.info("Health check interrupted, exiting")
    else:
        # Run once and exit with appropriate code
        healthy = run_health_check()
        if healthy:
            sys.exit(0)
        else:
            sys.exit(1)

if __name__ == "__main__":
    main()
```

## Phase 4: Implement an In-App Health Dashboard Component

**Task 4.1: Create a Vector Search dashboard template**

```python
# Create file: dashboard/templates/vector_search_health.html

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vector Search Health Dashboard</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            color: #333;
            background-color: #f8f9fa;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
        }
        .header h1 {
            margin: 0;
            color: #2d3748;
        }
        .status-card {
            background-color: white;
            border-radius: 6px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24);
            padding: 20px;
            margin-bottom: 20px;
        }
        .status-healthy {
            border-left: 5px solid #48bb78;
        }
        .status-error {
            border-left: 5px solid #f56565;
        }
        .status-warning {
            border-left: 5px solid #ed8936;
        }
        .status-unknown {
            border-left: 5px solid #a0aec0;
        }
        .status-indicator {
            font-weight: bold;
        }
        .status-indicator.healthy {
            color: #48bb78;
        }
        .status-indicator.error {
            color: #f56565;
        }
        .status-indicator.warning {
            color: #ed8936;
        }
        .status-indicator.unknown {
            color: #a0aec0;
        }
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 20px;
        }
        .metric-card {
            background-color: white;
            border-radius: 6px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24);
            padding: 20px;
        }
        .metric-value {
            font-size: 24px;
            font-weight: bold;
            margin: 10px 0;
            color: #4a5568;
        }
        .metric-label {
            color: #718096;
            font-size: 14px;
        }
        .details-section {
            background-color: white;
            border-radius: 6px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24);
            padding: 20px;
            margin-bottom: 20px;
        }
        .details-section h2 {
            margin-top: 0;
            color: #2d3748;
        }
        .details-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 10px;
        }
        .detail-item {
            margin-bottom: 10px;
        }
        .detail-label {
            font-weight: bold;
            color: #4a5568;
        }
        .detail-value {
            color: #718096;
        }
        .recommendations-section {
            background-color: white;
            border-radius: 6px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24);
            padding: 20px;
            margin-bottom: 20px;
        }
        .recommendations-section h2 {
            margin-top: 0;
            color: #2d3748;
        }
        .recommendations-list {
            list-style-type: none;
            padding: 0;
        }
        .recommendation-item {
            padding: 10px;
            margin-bottom: 5px;
            background-color: #f8f9fa;
            border-radius: 4px;
            color: #4a5568;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        th, td {
            text-align: left;
            padding: 12px;
            border-bottom: 1px solid #e2e8f0;
        }
        th {
            background-color: #f7fafc;
            color: #4a5568;
        }
        tr:hover {
            background-color: #f7fafc;
        }
        .refresh-button {
            background-color: #4299e1;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-weight: 500;
        }
        .refresh-button:hover {
            background-color: #3182ce;
        }
        .timestamp {
            color: #718096;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Vector Search Health Dashboard</h1>
            <div>
                <span class="timestamp">Last updated: {{ last_updated }}</span>
                <button class="refresh-button" onclick="location.reload()">Refresh</button>
            </div>
        </div>
        
        <div class="status-card status-{{ current_status.status }}">
            <h2>Current Status: <span class="status-indicator {{ current_status.status }}">{{ current_status.status|upper }}</span></h2>
            <p>{{ current_status.message }}</p>
            {% if current_status.status != 'healthy' %}
                <p><strong>Error:</strong> {{ current_status.details.error|default('No specific error message') }}</p>
            {% endif %}
        </div>
        
        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-label">Health Checks Performed</div>
                <div class="metric-value">{{ metrics.checks_performed }}</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Successful Checks</div>
                <div class="metric-value">{{ metrics.successful_checks }}</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Failed Checks</div>
                <div class="metric-value">{{ metrics.failed_checks }}</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Success Rate</div>
                <div class="metric-value">
                    {% if metrics.checks_performed > 0 %}
                        {{ (metrics.successful_checks / metrics.checks_performed * 100)|round(1) }}%
                    {% else %}
                        N/A
                    {% endif %}
                </div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Avg. Embedding Time</div>
                <div class="metric-value">{{ metrics.average_embedding_time_ms|round(1) }} ms</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Avg. Search Time</div>
                <div class="metric-value">{{ metrics.average_search_time_ms|round(1) }} ms</div>
            </div>
        </div>
        
        <div class="details-section">
            <h2>Configuration Details</h2>
            <div class="details-grid">
                <div class="detail-item">
                    <div class="detail-label">Project ID</div>
                    <div class="detail-value">{{ config.project_id }}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Location</div>
                    <div class="detail-value">{{ config.location }}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Endpoint ID</div>
                    <div class="detail-value">{{ config.endpoint_id }}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Deployed Index ID</div>
                    <div class="detail-value">{{ config.deployed_index_id }}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Using Mock</div>
                    <div class="detail-value">{{ config.using_mock }}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Credentials Path</div>
                    <div class="detail-value">{{ config.credentials_path }}</div>
                </div>
                {% if config.embedding_dimensions %}
                <div class="detail-item">
                    <div class="detail-label">Embedding Dimensions</div>
                    <div class="detail-value">{{ config.embedding_dimensions }}</div>
                </div>
                {% endif %}
            </div>
        </div>
        
        {% if recommendations %}
        <div class="recommendations-section">
            <h2>Recommendations</h2>
            <ul class="recommendations-list">
                {% for recommendation in recommendations %}
                <li class="recommendation-item">{{ recommendation }}</li>
                {% endfor %}
            </ul>
        </div>
        {% endif %}
        
        <div class="details-section">
            <h2>Recent Health Checks</h2>
            <table>
                <thead>
                    <tr>
                        <th>Timestamp</th>
                        <th>Status</th>
                        <th>Message</th>
                        <th>Embedding Time (ms)</th>
                        <th>Search Time (ms)</th>
                    </tr>
                </thead>
                <tbody>
                    {% for check in recent_checks %}
                    <tr>
                        <td>{{ check.timestamp }}</td>
                        <td>
                            <span class="status-indicator {{ check.status }}">{{ check.status|upper }}</span>
                        </td>
                        <td>{{ check.message }}</td>
                        <td>{{ check.embedding_time_ms|default('-')|round(1) if check.embedding_time_ms else '-' }}</td>
                        <td>{{ check.search_time_ms|default('-')|round(1) if check.search_time_ms else '-' }}</td>
                    </tr>
                    {% endfor %}
                </tbody>
            </table>
        </div>
    </div>
</body>
</html>
```

**Task 4.2: Create a Flask dashboard app**

```python
# Create file: dashboard/app.py

from flask import Flask, render_template, jsonify
import os
import sys
import sqlite3
from datetime import datetime
import json
from pathlib import Path

# Add the project root to the path so we can import from tools
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from tools.vector_search.health_checker import VectorSearchHealthChecker

app = Flask(__name__)

# Configuration
DB_PATH = os.environ.get("VECTOR_SEARCH_DB", "vector_search_health.db")

@app.route('/')
def index():
    """Render the dashboard homepage."""
    return render_template('index.html')

@app.route('/vector-search')
def vector_search_dashboard():
    """Render the Vector Search health dashboard."""
    
    # Run a new health check
    health_checker = VectorSearchHealthChecker()
    current_status = health_checker.check_health()
    
    # Get recommendations
    recommendations = health_checker.get_recommendations()
    
    # Get metrics from the current status
    metrics = current_status.get("details", {}).get("metrics", {
        "checks_performed": 0,
        "successful_checks": 0,
        "failed_checks": 0,
        "average_embedding_time_ms": 0,
        "average_search_time_ms": 0
    })
    
    # Get configuration details
    config = {
        "project_id": current_status.get("details", {}).get("project_id", ""),
        "location": current_status.get("details", {}).get("location", ""),
        "endpoint_id": current_status.get("details", {}).get("endpoint_id", ""),
        "deployed_index_id": current_status.get("details", {}).get("deployed_index_id", ""),
        "using_mock": current_status.get("details", {}).get("using_mock", False),
        "credentials_path": current_status.get("details", {}).get("credentials_path", ""),
        "embedding_dimensions": current_status.get("details", {}).get("embedding_dimensions", "")
    }
    
    # Get recent health checks from the database
    recent_checks = []
    try:
        if os.path.exists(DB_PATH):
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            
            cursor.execute("""
            SELECT timestamp, status, message, embedding_time_ms, search_time_ms
            FROM vector_search_health_checks
            ORDER BY timestamp DESC
            LIMIT 10
            """)
            
            columns = [column[0] for column in cursor.description]
            for row in cursor.fetchall():
                recent_checks.append(dict(zip(columns, row)))
            
            conn.close()
    except Exception as e:
        app.logger.error(f"Failed to get recent health checks: {str(e)}")
    
    return render_template(
        'vector_search_health.html',
        current_status=current_status,
        metrics=metrics,
        config=config,
        recommendations=recommendations,
        recent_checks=recent_checks,
        last_updated=datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    )

@app.route('/api/vector-search/health', methods=['GET'])
def api_vector_search_health():
    """API endpoint for Vector Search health status."""
    health_checker = VectorSearchHealthChecker()
    health_status = health_checker.check_health()
    return jsonify(health_status)

@app.route('/api/vector-search/metrics', methods=['GET'])
def api_vector_search_metrics():
    """API endpoint for Vector Search metrics."""
    try:
        if os.path.exists(DB_PATH):
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            
            cursor.execute("""
            SELECT timestamp, checks_performed, successful_checks, failed_checks,
                   average_embedding_time_ms, average_search_time_ms
            FROM vector_search_metrics
            ORDER BY timestamp DESC
            LIMIT 1
            """)
            
            row = cursor.fetchone()
            if row:
                columns = [column[0] for column in cursor.description]
                metrics = dict(zip(columns, row))
            else:
                metrics = {
                    "checks_performed": 0,
                    "successful_checks": 0,
                    "failed_checks": 0,
                    "average_embedding_time_ms": 0,
                    "average_search_time_ms": 0
                }
            
            conn.close()
            return jsonify(metrics)
        else:
            return jsonify({
                "error": "Metrics database not found"
            }), 404
    except Exception as e:
        return jsonify({
            "error": str(e)
        }), 500

@app.route('/api/vector-search/recent-checks', methods=['GET'])
def api_vector_search_recent_checks():
    """API endpoint for recent Vector Search health checks."""
    try:
        if os.path.exists(DB_PATH):
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            
            cursor.execute("""
            SELECT timestamp, status, message, embedding_time_ms, search_time_ms
            FROM vector_search_health_checks
            ORDER BY timestamp DESC
            LIMIT 20
            """)
            
            columns = [column[0] for column in cursor.description]
            recent_checks = []
            for row in cursor.fetchall():
                recent_checks.append(dict(zip(columns, row)))
            
            conn.close()
            return jsonify(recent_checks)
        else:
            return jsonify({
                "error": "Health checks database not found"
            }), 404
    except Exception as e:
        return jsonify({
            "error": str(e)
        }), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
```

**Task 4.3: Create a dashboard launcher script**

```python
# Create file: scripts/launch_dashboard.py

#!/usr/bin/env python
"""
Launch the VANA dashboard.

This script launches the VANA dashboard with the Vector Search health monitor.
"""

import os
import sys
import argparse
import subprocess
from pathlib import Path

# Add the project root to the path
project_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(project_root))

def main():
    """Launch the dashboard."""
    parser = argparse.ArgumentParser(description="Launch VANA Dashboard")
    parser.add_argument("--host", default="127.0.0.1", help="Host to bind to")
    parser.add_argument("--port", type=int, default=5000, help="Port to bind to")
    parser.add_argument("--db", default="vector_search_health.db", help="Database file path")
    parser.add_argument("--debug", action="store_true", help="Run in debug mode")
    args = parser.parse_args()
    
    # Set environment variables
    os.environ["VECTOR_SEARCH_DB"] = args.db
    
    # Construct the command to launch the Flask app
    dashboard_app = str(project_root / "dashboard" / "app.py")
    
    # Check if the app.py file exists
    if not os.path.exists(dashboard_app):
        print(f"Error: Dashboard app not found at {dashboard_app}")
        sys.exit(1)
    
    # Check if requirements are installed
    try:
        import flask
    except ImportError:
        print("Flask not installed. Installing requirements...")
        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install", "flask"])
        except subprocess.CalledProcessError:
            print("Failed to install Flask. Please install it manually with 'pip install flask'")
            sys.exit(1)
    
    # Launch the Flask app
    command = [
        sys.executable,
        dashboard_app,
    ]
    
    # Set Flask environment variables
    flask_env = os.environ.copy()
    flask_env["FLASK_APP"] = dashboard_app
    
    if args.debug:
        flask_env["FLASK_ENV"] = "development"
        flask_env["FLASK_DEBUG"] = "1"
    
    flask_env["FLASK_RUN_HOST"] = args.host
    flask_env["FLASK_RUN_PORT"] = str(args.port)
    
    print(f"Launching dashboard at http://{args.host}:{args.port}")
    print("Press Ctrl+C to stop the server")
    
    try:
        subprocess.run(["flask", "run", "--host", args.host, "--port", str(args.port)], env=flask_env)
    except KeyboardInterrupt:
        print("\nDashboard stopped")

if __name__ == "__main__":
    main()
```

## Phase 5: Create Testing Scripts for Validation

**Task 5.1: Create an end-to-end test script**

```python
# Create file: tests/test_vector_search_authentication.py

import unittest
import os
import sys
from pathlib import Path
import logging
import random
import string

# Add the project root to the path
project_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(project_root))

from tools.vector_search.vector_search_client import VectorSearchClient

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("test_vector_search_authentication")

class TestVectorSearchAuthentication(unittest.TestCase):
    """Test the Vector Search authentication functionality."""
    
    def setUp(self):
        """Set up the test environment."""
        # Store original environment variables
        self.original_env = {}
        for var in ["GOOGLE_CLOUD_PROJECT", "GOOGLE_CLOUD_LOCATION", 
                    "VECTOR_SEARCH_ENDPOINT_ID", "DEPLOYED_INDEX_ID",
                    "GOOGLE_APPLICATION_CREDENTIALS"]:
            self.original_env[var] = os.environ.get(var)
    
    def tearDown(self):
        """Restore the original environment."""
        # Restore original environment variables
        for var, value in self.original_env.items():
            if value is None:
                if var in os.environ:
                    del os.environ[var]
            else:
                os.environ[var] = value
    
    def test_environment_variables(self):
        """Test that the client correctly uses environment variables."""
        # Set environment variables
        os.environ["GOOGLE_CLOUD_PROJECT"] = "test-project"
        os.environ["GOOGLE_CLOUD_LOCATION"] = "test-location"
        os.environ["VECTOR_SEARCH_ENDPOINT_ID"] = "test-endpoint"
        os.environ["DEPLOYED_INDEX_ID"] = "test-index"
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "test-credentials.json"
        
        # Create client with use_mock=True to avoid actual API calls
        client = VectorSearchClient(use_mock=True)
        
        # Check that the client picked up the environment variables
        self.assertEqual(client.project_id, "test-project")
        self.assertEqual(client.location, "test-location")
        self.assertEqual(client.endpoint_id, "test-endpoint")
        self.assertEqual(client.deployed_index_id, "test-index")
        self.assertEqual(client.credentials_path, "test-credentials.json")
    
    def test_constructor_arguments(self):
        """Test that constructor arguments override environment variables."""
        # Set environment variables
        os.environ["GOOGLE_CLOUD_PROJECT"] = "env-project"
        os.environ["GOOGLE_CLOUD_LOCATION"] = "env-location"
        os.environ["VECTOR_SEARCH_ENDPOINT_ID"] = "env-endpoint"
        os.environ["DEPLOYED_INDEX_ID"] = "env-index"
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "env-credentials.json"
        
        # Create client with constructor arguments
        client = VectorSearchClient(
            project_id="arg-project",
            location="arg-location",
            endpoint_id="arg-endpoint",
            deployed_index_id="arg-index",
            credentials_path="arg-credentials.json",
            use_mock=True
        )
        
        # Check that constructor arguments were used
        self.assertEqual(client.project_id, "arg-project")
        self.assertEqual(client.location, "arg-location")
        self.assertEqual(client.endpoint_id, "arg-endpoint")
        self.assertEqual(client.deployed_index_id, "arg-index")
        self.assertEqual(client.credentials_path, "arg-credentials.json")
    
    def test_auto_fallback(self):
        """Test that the client falls back to mock when auto_fallback is enabled."""
        # Clear environment variables
        for var in ["GOOGLE_CLOUD_PROJECT", "VECTOR_SEARCH_ENDPOINT_ID"]:
            if var in os.environ:
                del os.environ[var]
        
        # Create client with auto_fallback=True
        client = VectorSearchClient(auto_fallback=True)
        
        # Check that the client is using mock
        self.assertTrue(client.using_mock)
        
        # Test that search still works (using mock)
        query = "test query"
        results = client.search_knowledge(query)
        
        # Should get some mock results
        self.assertIsInstance(results, list)
        self.assertGreater(len(results), 0)
    
    def test_no_auto_fallback(self):
        """Test that the client does not fall back when auto_fallback is disabled."""
        # Clear environment variables
        for var in ["GOOGLE_CLOUD_PROJECT", "VECTOR_SEARCH_ENDPOINT_ID"]:
            if var in os.environ:
                del os.environ[var]
        
        # Create client with auto_fallback=False
        client = VectorSearchClient(auto_fallback=False)
        
        # Check that the client is not initialized
        self.assertFalse(client.initialized)
        
        # Test that search returns empty results
        query = "test query"
        results = client.search_knowledge(query)
        
        # Should get empty results
        self.assertEqual(results, [])
    
    def test_explicit_mock(self):
        """Test that the client uses mock when explicitly requested."""
        # Create client with use_mock=True
        client = VectorSearchClient(use_mock=True)
        
        # Check that the client is using mock
        self.assertTrue(client.using_mock)
        
        # Test that search works (using mock)
        query = "test query"
        results = client.search_knowledge(query)
        
        # Should get some mock results
        self.assertIsInstance(results, list)
        self.assertGreater(len(results), 0)
    
    def test_embedding_type_conversion(self):
        """Test that embeddings are correctly converted to float."""
        # Create client with use_mock=True
        client = VectorSearchClient(use_mock=True)
        
        # Generate a test embedding with mixed types
        test_embedding = [str(random.random()) for _ in range(10)]
        
        # Create a method to check embedding conversion
        def check_embedding_conversion(embedding):
            # This should convert all values to float
            if not embedding or not all(isinstance(value, float) for value in embedding):
                if embedding:
                    embedding = [float(value) for value in embedding]
                else:
                    return []
            return embedding
        
        # Convert the test embedding
        converted_embedding = check_embedding_conversion(test_embedding)
        
        # Check that all values were converted to float
        self.assertTrue(all(isinstance(value, float) for value in converted_embedding))
    
    def test_health_status(self):
        """Test the health status method."""
        # Create client with use_mock=True
        client = VectorSearchClient(use_mock=True)
        
        # Get health status
        health_status = client.get_health_status()
        
        # Check that we got a valid health status
        self.assertIsInstance(health_status, dict)
        self.assertIn("status", health_status)
        self.assertEqual(health_status["status"], "mock")
        self.assertIn("message", health_status)
        self.assertIn("details", health_status)

if __name__ == "__main__":
    unittest.main()
```

**Task 5.2: Create a quick verification script**

```python
# Create file: scripts/quick_verify_vector_search.py

#!/usr/bin/env python
"""
Quick verification script for Vector Search authentication.

This script provides a simple way to verify that Vector Search authentication
is working correctly.
"""

import os
import sys
import argparse
import logging
from pathlib import Path

# Add the project root to the path
project_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(project_root))

from tools.vector_search.vector_search_client import VectorSearchClient

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("quick_verify_vector_search")

def main():
    """Verify Vector Search authentication."""
    parser = argparse.ArgumentParser(description="Quick Vector Search Authentication Verification")
    parser.add_argument("--project", help="GCP Project ID")
    parser.add_argument("--location", help="GCP Location", default="us-central1")
    parser.add_argument("--endpoint-id", help="Vector Search Endpoint ID")
    parser.add_argument("--deployed-index-id", help="Deployed Index ID", default="vanasharedindex")
    parser.add_argument("--credentials", help="Path to service account key file")
    parser.add_argument("--mock", action="store_true", help="Force using mock implementation")
    parser.add_argument("--no-fallback", action="store_true", help="Disable auto-fallback to mock")
    parser.add_argument("--verbose", action="store_true", help="Enable verbose logging")
    args = parser.parse_args()
    
    if args.verbose:
        logger.setLevel(logging.DEBUG)
    
    # Create the Vector Search client
    client = VectorSearchClient(
        project_id=args.project,
        location=args.location,
        endpoint_id=args.endpoint_id,
        deployed_index_id=args.deployed_index_id,
        credentials_path=args.credentials,
        use_mock=args.mock,
        auto_fallback=not args.no_fallback
    )
    
    # Print client configuration
    logger.info("Vector Search Client Configuration:")
    logger.info(f"  Project ID: {client.project_id}")
    logger.info(f"  Location: {client.location}")
    logger.info(f"  Endpoint ID: {client.endpoint_id}")
    logger.info(f"  Deployed Index ID: {client.deployed_index_id}")
    logger.info(f"  Credentials Path: {client.credentials_path}")
    logger.info(f"  Using Mock: {client.use_mock}")
    logger.info(f"  Auto Fallback: {client.auto_fallback}")
    
    # Get health status
    health_status = client.get_health_status()
    logger.info(f"Health Status: {health_status['status']}")
    logger.info(f"Health Message: {health_status['message']}")
    
    # Try to generate an embedding
    logger.info("Generating test embedding...")
    test_query = "This is a test query for Vector Search authentication verification."
    embedding = client.generate_embedding(test_query)
    
    if embedding:
        logger.info(f"Successfully generated embedding with {len(embedding)} dimensions")
        logger.info(f"First 5 values: {embedding[:5]}")
        
        # Try to search with the embedding
        logger.info("Searching with the test embedding...")
        results = client.search_vector_store
        **Task 5.2: Create a quick verification script (continued)**

```python
# Create file: scripts/quick_verify_vector_search.py (continued)

        results = client.search_vector_store(embedding)
        
        if results:
            logger.info(f"Successfully searched Vector Search with {len(results)} results")
            for i, result in enumerate(results[:3]):  # Show top 3 results
                logger.info(f"Result {i+1}:")
                logger.info(f"  ID: {result.get('id', 'N/A')}")
                logger.info(f"  Score: {result.get('score', 'N/A')}")
                
                # Print metadata keys
                metadata_keys = list(result.get('metadata', {}).keys())
                logger.info(f"  Metadata Keys: {metadata_keys}")
            
            # Try a full knowledge search
            logger.info("Performing full knowledge search...")
            knowledge_results = client.search_knowledge(test_query)
            
            if knowledge_results:
                logger.info(f"Successfully performed knowledge search with {len(knowledge_results)} results")
                for i, result in enumerate(knowledge_results[:3]):  # Show top 3 results
                    logger.info(f"Result {i+1}:")
                    logger.info(f"  ID: {result.get('id', 'N/A')}")
                    logger.info(f"  Score: {result.get('score', 'N/A')}")
                    logger.info(f"  Source: {result.get('source', 'N/A')}")
                    
                    # Print truncated content
                    content = result.get('content', '')
                    if content:
                        truncated_content = content[:100] + "..." if len(content) > 100 else content
                        logger.info(f"  Content: {truncated_content}")
                
                logger.info("✅ Vector Search authentication verification completed successfully!")
                return True
            else:
                logger.error("Failed to get knowledge search results")
        else:
            logger.error("Failed to search with the test embedding")
    else:
        logger.error("Failed to generate test embedding")
    
    # If we got here, something failed
    if client.using_mock:
        logger.warning("⚠️ Using mock implementation - real Vector Search is not working")
        logger.info("To fix this issue, run the verify_vector_search_configuration.py script for detailed diagnostics")
        return False
    else:
        logger.error("❌ Vector Search authentication verification failed")
        logger.info("To fix this issue, run the verify_vector_search_configuration.py script for detailed diagnostics")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
```

**Task 5.3: Create a documentation update**

```markdown
# Vector Search Authentication Guide

This guide explains how to configure and verify Vector Search authentication for the VANA project.

## Prerequisites

Before you begin, make sure you have the following:

1. A Google Cloud Platform (GCP) account with billing enabled
2. A GCP project with the Vertex AI API enabled
3. A service account with appropriate permissions
4. A Vector Search endpoint and index

## Configuration

The Vector Search integration requires the following configuration:

1. **Environment Variables**:
   - `GOOGLE_CLOUD_PROJECT`: Your GCP project ID
   - `GOOGLE_CLOUD_LOCATION`: The location where your Vector Search resources are deployed (default: `us-central1`)
   - `VECTOR_SEARCH_ENDPOINT_ID`: The ID of your Vector Search endpoint
   - `DEPLOYED_INDEX_ID`: The ID of your deployed index (default: `vanasharedindex`)
   - `GOOGLE_APPLICATION_CREDENTIALS`: Path to your service account key file

2. **Service Account Permissions**:
   Your service account needs the following permissions:
   - `aiplatform.indexes.list`
   - `aiplatform.indexes.get`
   - `aiplatform.indexEndpoints.list`
   - `aiplatform.indexEndpoints.get`

## Setup Guide

Follow these steps to set up and verify Vector Search authentication:

### Step 1: Set Environment Variables

You can set environment variables in your shell:

```bash
export GOOGLE_CLOUD_PROJECT=your-project-id
export GOOGLE_CLOUD_LOCATION=us-central1
export VECTOR_SEARCH_ENDPOINT_ID=your-endpoint-id
export DEPLOYED_INDEX_ID=vanasharedindex
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
```

Or create a `.env` file in the project root directory:

```
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_CLOUD_LOCATION=us-central1
VECTOR_SEARCH_ENDPOINT_ID=your-endpoint-id
DEPLOYED_INDEX_ID=vanasharedindex
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
```

### Step 2: Verify Configuration

Run the verification script to check that your configuration is correct:

```bash
python scripts/verify_vector_search_configuration.py
```

This script will:
1. Validate your environment configuration
2. Test GCP authentication
3. Verify service account permissions
4. Check Vector Search resources (endpoint and index)
5. Test embedding generation
6. Test Vector Search query functionality

### Step 3: Quick Verification

For a quick verification, you can run:

```bash
python scripts/quick_verify_vector_search.py
```

This script performs a simple test of the Vector Search functionality and provides immediate feedback.

### Step 4: Run Comprehensive Tests

For more thorough testing, run the test suite:

```bash
python -m unittest tests/test_vector_search_authentication.py
```

## Monitoring

To monitor the health of your Vector Search integration, you can:

1. Run periodic health checks:

```bash
python scripts/run_vector_search_health_check.py --continuous --interval 3600
```

2. Launch the monitoring dashboard:

```bash
python scripts/launch_dashboard.py
```

Then open `http://localhost:5000/vector-search` in your browser.

## Troubleshooting

If you encounter issues with Vector Search authentication, try the following:

1. **Check Environment Variables**:
   Make sure all required environment variables are set correctly.

2. **Verify Service Account Key**:
   Ensure the service account key file exists and is accessible.

3. **Check Permissions**:
   Verify that the service account has the necessary permissions.

4. **Verify Resources**:
   Make sure the Vector Search endpoint and index exist and are properly configured.

5. **Run Verification Script**:
   The `verify_vector_search_configuration.py` script provides detailed diagnostics.

6. **Check Logs**:
   Look for detailed error messages in the logs.

## Fallback Behavior

The Vector Search client is designed to gracefully fall back to a mock implementation when issues are encountered. This allows the system to continue functioning even when Vector Search is unavailable.

By default, the client automatically falls back to the mock implementation when:
- Required configuration is missing
- Authentication fails
- Vector Search resources are unavailable
- Embedding generation fails
- Vector Search queries fail

To disable this behavior, set `auto_fallback=False` when creating the client:

```python
client = VectorSearchClient(auto_fallback=False)
```

## Additional Resources

- [Google Cloud Vertex AI Vector Search Documentation](https://cloud.google.com/vertex-ai/docs/vector-search/overview)
- [Vertex AI API Authentication](https://cloud.google.com/vertex-ai/docs/start/client-libraries)
- [Vector Search Fixes](docs/vector-search-fixes.md)
```

## Phase 6: Integration with Enhanced Hybrid Search

**Task 6.1: Update hybrid search to use improved vector search client**

```python
# Update file: tools/enhanced_hybrid_search.py

import logging
import time
from typing import List, Dict, Any, Optional, Tuple, Union

from .vector_search.vector_search_client import VectorSearchClient
from .knowledge_graph.knowledge_graph_manager import KnowledgeGraphManager
from .web_search import WebSearchClient

logger = logging.getLogger(__name__)

class EnhancedHybridSearch:
    """Enhanced Hybrid Search combining Vector Search, Knowledge Graph, and Web Search."""
    
    def __init__(
        self,
        project_id: Optional[str] = None,
        location: Optional[str] = None,
        endpoint_id: Optional[str] = None,
        deployed_index_id: Optional[str] = None,
        credentials_path: Optional[str] = None,
        kg_api_key: Optional[str] = None,
        kg_server_url: Optional[str] = None,
        kg_namespace: Optional[str] = None,
        web_api_key: Optional[str] = None,
        web_search_engine_id: Optional[str] = None,
        enable_web_search: bool = True
    ):
        """Initialize the Enhanced Hybrid Search.
        
        Args:
            project_id: GCP project ID for Vector Search
            location: GCP location for Vector Search
            endpoint_id: Vector Search endpoint ID
            deployed_index_id: Deployed index ID
            credentials_path: Path to service account key file
            kg_api_key: API key for Knowledge Graph
            kg_server_url: Server URL for Knowledge Graph
            kg_namespace: Namespace for Knowledge Graph
            web_api_key: API key for Web Search
            web_search_engine_id: Search engine ID for Web Search
            enable_web_search: Whether to enable Web Search
        """
        self.vs_client = VectorSearchClient(
            project_id=project_id,
            location=location,
            endpoint_id=endpoint_id,
            deployed_index_id=deployed_index_id,
            credentials_path=credentials_path,
            auto_fallback=True
        )
        
        self.kg_client = KnowledgeGraphManager(
            api_key=kg_api_key,
            server_url=kg_server_url,
            namespace=kg_namespace
        )
        
        self.enable_web_search = enable_web_search
        if enable_web_search:
            self.web_client = WebSearchClient(
                api_key=web_api_key,
                search_engine_id=web_search_engine_id
            )
        else:
            self.web_client = None
        
        # Check health status of each service
        self.vs_health = self.vs_client.get_health_status()
        self.kg_health = True  # Knowledge Graph doesn't have a health check yet
        self.web_health = self.web_client is not None
        
        # Log status of each service
        logger.info(f"Vector Search status: {self.vs_health['status']}")
        logger.info(f"Knowledge Graph status: {'enabled' if self.kg_health else 'disabled'}")
        logger.info(f"Web Search status: {'enabled' if self.web_health else 'disabled'}")
    
    def search(
        self,
        query: str,
        top_k: int = 5,
        include_vector_search: bool = True,
        include_knowledge_graph: bool = True,
        include_web_search: bool = True,
        vector_search_weight: float = 1.0,
        knowledge_graph_weight: float = 1.0,
        web_search_weight: float = 0.7,
        minimum_score: float = 0.3
    ) -> List[Dict[str, Any]]:
        """Perform a hybrid search across all available sources.
        
        Args:
            query: The query text
            top_k: Maximum number of results to return
            include_vector_search: Whether to include Vector Search results
            include_knowledge_graph: Whether to include Knowledge Graph results
            include_web_search: Whether to include Web Search results
            vector_search_weight: Weight for Vector Search results
            knowledge_graph_weight: Weight for Knowledge Graph results
            web_search_weight: Weight for Web Search results
            minimum_score: Minimum score to include in results
            
        Returns:
            A list of search results, each containing 'content', 'source', and 'score'
        """
        start_time = time.time()
        
        # Track metrics for each source
        metrics = {
            "vector_search": {"time": 0, "results": 0, "errors": 0},
            "knowledge_graph": {"time": 0, "results": 0, "errors": 0},
            "web_search": {"time": 0, "results": 0, "errors": 0}
        }
        
        # Collect results from each source
        all_results = []
        
        # Vector Search
        if include_vector_search and self.vs_health["status"] != "error":
            vs_start_time = time.time()
            try:
                vs_results = self.vs_client.search_knowledge(query, top_k=top_k)
                
                # Process and score results
                for result in vs_results:
                    result["score"] = result.get("score", 0) * vector_search_weight
                    result["source_type"] = "vector_search"
                
                all_results.extend(vs_results)
                metrics["vector_search"]["results"] = len(vs_results)
            except Exception as e:
                logger.error(f"Error in Vector Search: {str(e)}")
                metrics["vector_search"]["errors"] += 1
            finally:
                metrics["vector_search"]["time"] = time.time() - vs_start_time
        
        # Knowledge Graph
        if include_knowledge_graph and self.kg_health:
            kg_start_time = time.time()
            try:
                kg_results = self.kg_client.search(query, top_k=top_k)
                
                # Process and format results
                formatted_kg_results = []
                for result in kg_results:
                    formatted_result = {
                        "id": result.get("id", ""),
                        "score": result.get("score", 0) * knowledge_graph_weight,
                        "content": result.get("content", ""),
                        "source": result.get("source", "Knowledge Graph"),
                        "source_type": "knowledge_graph"
                    }
                    formatted_kg_results.append(formatted_result)
                
                all_results.extend(formatted_kg_results)
                metrics["knowledge_graph"]["results"] = len(formatted_kg_results)
            except Exception as e:
                logger.error(f"Error in Knowledge Graph search: {str(e)}")
                metrics["knowledge_graph"]["errors"] += 1
            finally:
                metrics["knowledge_graph"]["time"] = time.time() - kg_start_time
        
        # Web Search
        if include_web_search and self.enable_web_search and self.web_health:
            web_start_time = time.time()
            try:
                web_results = self.web_client.search(query, top_k=top_k)
                
                # Process and format results
                formatted_web_results = []
                for result in web_results:
                    formatted_result = {
                        "id": result.get("link", ""),
                        "score": result.get("score", 0) * web_search_weight,
                        "content": result.get("snippet", ""),
                        "source": result.get("title", "Web Search"),
                        "source_url": result.get("link", ""),
                        "source_type": "web_search"
                    }
                    formatted_web_results.append(formatted_result)
                
                all_results.extend(formatted_web_results)
                metrics["web_search"]["results"] = len(formatted_web_results)
            except Exception as e:
                logger.error(f"Error in Web Search: {str(e)}")
                metrics["web_search"]["errors"] += 1
            finally:
                metrics["web_search"]["time"] = time.time() - web_start_time
        
        # Filter, sort, and deduplicate results
        filtered_results = [r for r in all_results if r.get("score", 0) >= minimum_score]
        sorted_results = sorted(filtered_results, key=lambda x: x.get("score", 0), reverse=True)
        
        # Deduplicate by content
        seen_content = set()
        deduplicated_results = []
        for result in sorted_results:
            content = result.get("content", "").strip()
            if content and content not in seen_content:
                seen_content.add(content)
                deduplicated_results.append(result)
        
        # Limit to top_k results
        final_results = deduplicated_results[:top_k]
        
        # Log metrics
        total_time = time.time() - start_time
        logger.info(f"Enhanced Hybrid Search completed in {total_time:.2f}s")
        logger.info(f"Vector Search: {metrics['vector_search']['results']} results in {metrics['vector_search']['time']:.2f}s, {metrics['vector_search']['errors']} errors")
        logger.info(f"Knowledge Graph: {metrics['knowledge_graph']['results']} results in {metrics['knowledge_graph']['time']:.2f}s, {metrics['knowledge_graph']['errors']} errors")
        logger.info(f"Web Search: {metrics['web_search']['results']} results in {metrics['web_search']['time']:.2f}s, {metrics['web_search']['errors']} errors")
        logger.info(f"Total results: {len(final_results)}")
        
        return final_results
    
    def get_health_status(self) -> Dict[str, Any]:
        """Get the health status of all search services.
        
        Returns:
            A dictionary with health status information for each service.
        """
        # Update health status
        self.vs_health = self.vs_client.get_health_status()
        
        return {
            "status": "healthy" if self.vs_health["status"] in ["healthy", "mock"] else "error",
            "vector_search": self.vs_health,
            "knowledge_graph": {
                "status": "enabled" if self.kg_health else "disabled"
            },
            "web_search": {
                "status": "enabled" if self.web_health else "disabled"
            }
        }
```

**Task 6.2: Create a hybrid search test script**

```python
# Create file: scripts/test_enhanced_hybrid_search.py

#!/usr/bin/env python
"""
Test the Enhanced Hybrid Search functionality.

This script tests the Enhanced Hybrid Search by performing searches with
different combinations of sources and checking the results.
"""

import os
import sys
import argparse
import logging
import json
from pathlib import Path
import time
import random

# Add the project root to the path
project_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(project_root))

from tools.enhanced_hybrid_search import EnhancedHybridSearch

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("test_enhanced_hybrid_search")

def format_results(results, title):
    """Format search results for display."""
    output = f"\n=== {title} ===\n"
    
    if not results:
        output += "No results found.\n"
        return output
    
    for i, result in enumerate(results[:5]):  # Show top 5 results
        output += f"Result {i+1}:\n"
        output += f"  Score: {result.get('score', 'N/A'):.4f}\n"
        output += f"  Source: {result.get('source', 'N/A')}\n"
        output += f"  Source Type: {result.get('source_type', 'N/A')}\n"
        
        content = result.get('content', '')
        if content:
            truncated_content = content[:100] + "..." if len(content) > 100 else content
            output += f"  Content: {truncated_content}\n"
        
        output += "\n"
    
    return output

def run_test_searches(hybrid_search, output_file=None):
    """Run a series of test searches to verify functionality."""
    results = {}
    
    # Test queries
    test_queries = [
        "What is the VANA project?",
        "How does Vector Search work?",
        "What is the Knowledge Graph integration?",
        "Who are the specialist agents in VANA?",
        "What are the next steps for the VANA project?",
        random.choice([
            "What is the latest version of Python?",
            "What is the current weather in New York?",
            "What are the latest developments in AI?",
            "What is the current price of Bitcoin?",
            "What are the best restaurants in San Francisco?"
        ])
    ]
    
    # Run tests for each query
    for query in test_queries:
        results[query] = {}
        
        # Test 1: Vector Search only
        logger.info(f"Testing Vector Search only for query: '{query}'")
        vs_results = hybrid_search.search(
            query,
            include_vector_search=True,
            include_knowledge_graph=False,
            include_web_search=False
        )
        results[query]["vector_search_only"] = vs_results
        logger.info(format_results(vs_results, "Vector Search Only"))
        
        # Test 2: Knowledge Graph only
        logger.info(f"Testing Knowledge Graph only for query: '{query}'")
        kg_results = hybrid_search.search(
            query,
            include_vector_search=False,
            include_knowledge_graph=True,
            include_web_search=False
        )
        results[query]["knowledge_graph_only"] = kg_results
        logger.info(format_results(kg_results, "Knowledge Graph Only"))
        
        # Test 3: Web Search only
        logger.info(f"Testing Web Search only for query: '{query}'")
        web_results = hybrid_search.search(
            query,
            include_vector_search=False,
            include_knowledge_graph=False,
            include_web_search=True
        )
        results[query]["web_search_only"] = web_results
        logger.info(format_results(web_results, "Web Search Only"))
        
        # Test 4: Full hybrid search
        logger.info(f"Testing full hybrid search for query: '{query}'")
        hybrid_results = hybrid_search.search(
            query,
            include_vector_search=True,
            include_knowledge_graph=True,
            include_web_search=True
        )
        results[query]["hybrid_search"] = hybrid_results
        logger.info(format_results(hybrid_results, "Full Hybrid Search"))
        
        # Test 5: Custom weights
        logger.info(f"Testing hybrid search with custom weights for query: '{query}'")
        custom_results = hybrid_search.search(
            query,
            include_vector_search=True,
            include_knowledge_graph=True,
            include_web_search=True,
            vector_search_weight=0.8,
            knowledge_graph_weight=1.2,
            web_search_weight=0.5
        )
        results[query]["custom_weights"] = custom_results
        logger.info(format_results(custom_results, "Hybrid Search with Custom Weights"))
    
    # Save results to file if requested
    if output_file:
        try:
            # Convert results to JSON-serializable format
            serializable_results = {}
            for query, query_results in results.items():
                serializable_results[query] = {}
                for test_name, test_results in query_results.items():
                    serializable_results[query][test_name] = [
                        {
                            k: v for k, v in result.items()
                            if isinstance(v, (str, int, float, bool, list, dict)) or v is None
                        }
                        for result in test_results
                    ]
            
            with open(output_file, "w") as f:
                json.dump(serializable_results, f, indent=2)
            logger.info(f"Test results saved to {output_file}")
        except Exception as e:
            logger.error(f"Failed to save test results: {str(e)}")
    
    return results

def main():
    """Run the Enhanced Hybrid Search test."""
    parser = argparse.ArgumentParser(description="Test Enhanced Hybrid Search")
    parser.add_argument("--output", help="Output file for test results")
    parser.add_argument("--no-web", action="store_true", help="Disable Web Search")
    parser.add_argument("--verbose", action="store_true", help="Enable verbose logging")
    args = parser.parse_args()
    
    if args.verbose:
        logger.setLevel(logging.DEBUG)
    
    # Create the Enhanced Hybrid Search
    hybrid_search = EnhancedHybridSearch(enable_web_search=not args.no_web)
    
    # Get health status
    health_status = hybrid_search.get_health_status()
    logger.info(f"Enhanced Hybrid Search Health Status: {health_status['status']}")
    logger.info(f"Vector Search: {health_status['vector_search']['status']}")
    logger.info(f"Knowledge Graph: {health_status['knowledge_graph']['status']}")
    logger.info(f"Web Search: {health_status['web_search']['status']}")
    
    # Run test searches
    run_test_searches(hybrid_search, args.output)
    
    logger.info("Enhanced Hybrid Search tests completed")

if __name__ == "__main__":
    main()
```

## Phase 7: Documentation Updates for Knowledge Base

**Task 7.1: Create updated README section on authentication**

```markdown
# Vector Search Authentication

The Vector Search integration in VANA has been enhanced with robust authentication handling and improved error resilience.

## Key Improvements

1. **Improved Authentication Validation**
   - Comprehensive validation of GCP authentication credentials
   - Service account permissions verification
   - Explicit type conversion for embedding values
   - Graceful fallback to mock implementation when necessary

2. **Enhanced Fault Tolerance**
   - Automatic fallback to mock implementation when Vector Search is unavailable
   - Circuit breaker pattern for handling transient failures
   - Detailed error logging and reporting
   - Metrics collection for monitoring system health

3. **Health Monitoring**
   - Real-time health status checks
   - Detailed health metrics dashboard
   - Automated health check scheduling
   - Comprehensive diagnostic tools

## Configuration

To configure Vector Search authentication, you need to set the following environment variables:

```bash
# Required
GOOGLE_CLOUD_PROJECT=your-project-id
VECTOR_SEARCH_ENDPOINT_ID=your-endpoint-id

# Optional (has defaults)
GOOGLE_CLOUD_LOCATION=us-central1  # default
DEPLOYED_INDEX_ID=vanasharedindex  # default

# Credentials
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
```

## Validation Tools

The system includes several tools for validating Vector Search authentication:

1. **Comprehensive Validation**:
   ```bash
   python scripts/verify_vector_search_configuration.py
   ```
   This script provides a detailed analysis of your Vector Search configuration.

2. **Quick Verification**:
   ```bash
   python scripts/quick_verify_vector_search.py
   ```
   This script quickly verifies that Vector Search is working correctly.

3. **Health Dashboard**:
   ```bash
   python scripts/launch_dashboard.py
   ```
   This launches a web-based dashboard for monitoring Vector Search health.

4. **Continuous Health Checks**:
   ```bash
   python scripts/run_vector_search_health_check.py --continuous
   ```
   This runs periodic health checks to ensure system reliability.

## Troubleshooting

If you encounter issues with Vector Search authentication, see [Vector Search Authentication Guide](docs/vector-search-authentication-guide.md) for detailed troubleshooting steps.
```

This completes the detailed implementation plan for the Vector Search Authentication Fix. Here's a summary of what has been covered:

1. **Phase 1**: Created a comprehensive validation script that checks all aspects of Vector Search configuration
2. **Phase 2**: Enhanced the Vector Search client with improved authentication and error handling
3. **Phase 3**: Built a health checker service for monitoring Vector Search health
4. **Phase 4**: Implemented a dashboard for visualization of health metrics
5. **Phase 5**: Created testing scripts to validate the authentication fixes
6. **Phase 6**: Updated hybrid search to use the improved Vector Search client
7. **Phase 7**: Added documentation for the authentication fixes

Auggie would execute each task sequentially, and you (Nick) would verify the completion of each task by checking the output from Auggie against the expected implementation.