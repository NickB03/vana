#!/usr/bin/env python3
"""
Verify Vector Search Configuration

This script verifies that the Vector Search configuration is properly set up,
including environment variables, service account authentication, and permissions.
It provides detailed feedback on any issues found and suggestions for fixing them.

Usage:
    python scripts/verify_vector_search_configuration.py [options]

Options:
    --project PROJECT         GCP Project ID
    --location LOCATION       GCP Location (default: us-central1)
    --endpoint-id ENDPOINT_ID Vector Search Endpoint ID
    --deployed-index-id ID    Deployed Index ID (default: vanasharedindex)
    --credentials PATH        Path to service account key file
    --verbose                 Enable verbose logging
"""

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

if __name__ == "__main__":
    main()
