#!/usr/bin/env python3
"""
Vector Search Diagnostic Tool

This script diagnoses issues with Vector Search, including permission problems,
configuration errors, and connectivity issues. It provides detailed information
and suggestions for fixing common problems.
"""

import os
import sys
import json
import logging
import argparse
import requests
from typing import Dict, Any, List, Optional
from google.cloud import aiplatform
from google.api_core.exceptions import PermissionDenied, NotFound, InvalidArgument

# Add project root to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Set up logging
logging.basicConfig(level=logging.INFO, 
                   format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Import components
try:
    from tools.vector_search.enhanced_vector_search_client import EnhancedVectorSearchClient
except ImportError:
    logger.error("Enhanced Vector Search Client not found. Make sure you're running this script from the project root.")
    sys.exit(1)

def check_environment_variables() -> Dict[str, Any]:
    """
    Check if required environment variables are set.
    
    Returns:
        Dict with environment variable status
    """
    logger.info("Checking environment variables...")
    
    variables = {
        "GOOGLE_CLOUD_PROJECT": os.environ.get("GOOGLE_CLOUD_PROJECT", ""),
        "GOOGLE_CLOUD_LOCATION": os.environ.get("GOOGLE_CLOUD_LOCATION", ""),
        "VECTOR_SEARCH_ENDPOINT_ID": os.environ.get("VECTOR_SEARCH_ENDPOINT_ID", ""),
        "DEPLOYED_INDEX_ID": os.environ.get("DEPLOYED_INDEX_ID", "vanasharedindex"),
        "GOOGLE_APPLICATION_CREDENTIALS": os.environ.get("GOOGLE_APPLICATION_CREDENTIALS", "")
    }
    
    results = {}
    all_set = True
    
    for name, value in variables.items():
        if value:
            # Mask credentials for security
            display_value = value
            if name == "GOOGLE_APPLICATION_CREDENTIALS":
                display_value = f"{os.path.basename(value)}"
            elif name == "VECTOR_SEARCH_ENDPOINT_ID" and len(value) > 20:
                display_value = f"{value[:10]}...{value[-10:]}"
                
            logger.info(f"✅ {name} is set to: {display_value}")
            results[name] = {"set": True, "value": display_value}
        else:
            logger.error(f"❌ {name} is not set")
            results[name] = {"set": False}
            all_set = False
    
    results["all_set"] = all_set
    return results

def check_service_account_permissions() -> Dict[str, Any]:
    """
    Check service account permissions for Vector Search.
    
    Returns:
        Dict with permission check results
    """
    logger.info("Checking service account permissions...")
    
    results = {
        "credentials_file_exists": False,
        "credentials_valid": False,
        "has_aiplatform_permissions": False,
        "has_vector_search_permissions": False,
        "service_account_email": None,
        "project_number": None,
        "errors": []
    }
    
    # Check if credentials file exists
    creds_file = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
    if not creds_file:
        logger.error("❌ GOOGLE_APPLICATION_CREDENTIALS not set")
        results["errors"].append("GOOGLE_APPLICATION_CREDENTIALS not set")
        return results
    
    if not os.path.exists(creds_file):
        logger.error(f"❌ Credentials file not found: {creds_file}")
        results["errors"].append(f"Credentials file not found: {creds_file}")
        return results
    
    results["credentials_file_exists"] = True
    
    # Load credentials file
    try:
        with open(creds_file, 'r') as f:
            creds_data = json.load(f)
            
        service_account_email = creds_data.get("client_email")
        project_id = creds_data.get("project_id")
        
        if not service_account_email:
            logger.error("❌ Service account email not found in credentials file")
            results["errors"].append("Service account email not found in credentials file")
            return results
            
        results["service_account_email"] = service_account_email
        results["project_id"] = project_id
        results["credentials_valid"] = True
        
        logger.info(f"✅ Service account: {service_account_email}")
        logger.info(f"✅ Project ID: {project_id}")
    except Exception as e:
        logger.error(f"❌ Error loading credentials file: {e}")
        results["errors"].append(f"Error loading credentials file: {e}")
        return results
    
    # Check AI Platform permissions
    try:
        # Initialize AI Platform
        aiplatform.init(project=os.environ.get("GOOGLE_CLOUD_PROJECT"))
        
        # List models (simple permission check)
        aiplatform.Model.list(max_results=1)
        
        results["has_aiplatform_permissions"] = True
        logger.info("✅ Service account has AI Platform permissions")
    except PermissionDenied as e:
        logger.error(f"❌ Permission denied for AI Platform: {e}")
        results["errors"].append(f"Permission denied for AI Platform: {e}")
    except Exception as e:
        logger.error(f"❌ Error checking AI Platform permissions: {e}")
        results["errors"].append(f"Error checking AI Platform permissions: {e}")
    
    # Check Vector Search permissions
    try:
        # Get project number
        project_id = os.environ.get("GOOGLE_CLOUD_PROJECT")
        if not project_id:
            logger.error("❌ GOOGLE_CLOUD_PROJECT not set")
            results["errors"].append("GOOGLE_CLOUD_PROJECT not set")
            return results
            
        # Try to get project number from metadata server (works in GCP environment)
        try:
            response = requests.get(
                "http://metadata.google.internal/computeMetadata/v1/project/numeric-project-id",
                headers={"Metadata-Flavor": "Google"},
                timeout=2
            )
            if response.status_code == 200:
                project_number = response.text
                results["project_number"] = project_number
                logger.info(f"✅ Project number: {project_number}")
        except:
            logger.warning("⚠️ Could not get project number from metadata server")
            results["errors"].append("Could not get project number from metadata server")
        
        # Try to access Vector Search endpoint
        endpoint_id = os.environ.get("VECTOR_SEARCH_ENDPOINT_ID")
        if not endpoint_id:
            logger.error("❌ VECTOR_SEARCH_ENDPOINT_ID not set")
            results["errors"].append("VECTOR_SEARCH_ENDPOINT_ID not set")
            return results
            
        # Initialize Vector Search client
        client = EnhancedVectorSearchClient(use_cache=False)
        
        # Check if Vector Search is available
        if client.is_available():
            results["has_vector_search_permissions"] = True
            logger.info("✅ Service account has Vector Search permissions")
        else:
            error_info = client.get_error_info()
            if error_info["permission_error"]:
                logger.error(f"❌ Permission denied for Vector Search: {error_info['last_error']}")
                results["errors"].append(f"Permission denied for Vector Search: {error_info['last_error']}")
            else:
                logger.error(f"❌ Vector Search not available: {error_info['last_error']}")
                results["errors"].append(f"Vector Search not available: {error_info['last_error']}")
    except Exception as e:
        logger.error(f"❌ Error checking Vector Search permissions: {e}")
        results["errors"].append(f"Error checking Vector Search permissions: {e}")
    
    return results

def test_embedding_generation() -> Dict[str, Any]:
    """
    Test embedding generation.
    
    Returns:
        Dict with test results
    """
    logger.info("Testing embedding generation...")
    
    results = {
        "success": False,
        "embedding_dimensions": 0,
        "error": None
    }
    
    try:
        # Initialize Vector Search client
        client = EnhancedVectorSearchClient(use_cache=False)
        
        # Generate embedding for test text
        test_text = "This is a test text for embedding generation."
        embedding = client.generate_embedding(test_text)
        
        if embedding and isinstance(embedding, list):
            results["success"] = True
            results["embedding_dimensions"] = len(embedding)
            logger.info(f"✅ Successfully generated embedding with {len(embedding)} dimensions")
        else:
            logger.error(f"❌ Failed to generate embedding: {embedding}")
            results["error"] = "Invalid embedding format"
    except Exception as e:
        logger.error(f"❌ Error generating embedding: {e}")
        results["error"] = str(e)
    
    return results

def test_vector_search() -> Dict[str, Any]:
    """
    Test Vector Search functionality.
    
    Returns:
        Dict with test results
    """
    logger.info("Testing Vector Search functionality...")
    
    results = {
        "success": False,
        "results_count": 0,
        "using_mock": False,
        "error": None
    }
    
    try:
        # Initialize Vector Search client
        client = EnhancedVectorSearchClient(use_cache=False)
        
        # Check if Vector Search is available
        if not client.is_available():
            logger.warning("⚠️ Vector Search not available, will use mock implementation")
            results["using_mock"] = True
        
        # Perform search
        test_query = "VANA architecture"
        search_results = client.search(test_query, top_k=5)
        
        if search_results and isinstance(search_results, list):
            results["success"] = True
            results["results_count"] = len(search_results)
            logger.info(f"✅ Successfully retrieved {len(search_results)} search results")
            
            # Log first result
            if search_results:
                first_result = search_results[0]
                content = first_result.get("content", "")
                score = first_result.get("score", 0)
                logger.info(f"First result (score: {score}): {content[:100]}...")
        else:
            logger.error(f"❌ Failed to retrieve search results: {search_results}")
            results["error"] = "Invalid search results format"
    except Exception as e:
        logger.error(f"❌ Error performing vector search: {e}")
        results["error"] = str(e)
    
    return results

def generate_permission_fix_instructions(results: Dict[str, Any]) -> str:
    """
    Generate instructions for fixing permission issues.
    
    Args:
        results: Results from permission checks
        
    Returns:
        Instructions for fixing permission issues
    """
    if results["service_account_permissions"]["has_vector_search_permissions"]:
        return "No permission issues detected."
    
    instructions = []
    
    service_account = results["service_account_permissions"].get("service_account_email")
    project_id = results["service_account_permissions"].get("project_id")
    
    if not service_account:
        return "Could not determine service account email. Check your credentials file."
    
    instructions.append(f"# Vector Search Permission Fix Instructions\n")
    instructions.append(f"The service account `{service_account}` does not have sufficient permissions to access Vector Search.\n")
    
    instructions.append("## Required Roles\n")
    instructions.append("The service account needs the following roles:\n")
    instructions.append("1. `roles/aiplatform.user` - For general Vertex AI access")
    instructions.append("2. `roles/aiplatform.serviceAgent` - For Vertex AI service agent access")
    instructions.append("3. `roles/matchingengine.admin` - For Vector Search access\n")
    
    instructions.append("## Fix using Google Cloud Console\n")
    instructions.append("1. Go to [IAM & Admin > IAM](https://console.cloud.google.com/iam-admin/iam)")
    instructions.append(f"2. Find the service account `{service_account}`")
    instructions.append("3. Click the pencil icon to edit permissions")
    instructions.append("4. Click 'ADD ANOTHER ROLE' and add each of the required roles")
    instructions.append("5. Click 'SAVE'\n")
    
    instructions.append("## Fix using gcloud CLI\n")
    instructions.append("Run the following commands:\n")
    instructions.append("```bash")
    instructions.append(f"gcloud projects add-iam-policy-binding {project_id} --member=serviceAccount:{service_account} --role=roles/aiplatform.user")
    instructions.append(f"gcloud projects add-iam-policy-binding {project_id} --member=serviceAccount:{service_account} --role=roles/aiplatform.serviceAgent")
    instructions.append(f"gcloud projects add-iam-policy-binding {project_id} --member=serviceAccount:{service_account} --role=roles/matchingengine.admin")
    instructions.append("```\n")
    
    instructions.append("## Verify Permissions\n")
    instructions.append("After adding the roles, run this diagnostic tool again to verify the permissions have been applied correctly.\n")
    
    return "\n".join(instructions)

def run_diagnostic() -> Dict[str, Any]:
    """
    Run the Vector Search diagnostic.
    
    Returns:
        Dict with diagnostic results
    """
    results = {
        "environment_variables": check_environment_variables(),
        "service_account_permissions": check_service_account_permissions(),
        "embedding_generation": test_embedding_generation(),
        "vector_search": test_vector_search()
    }
    
    # Generate overall status
    all_env_vars_set = results["environment_variables"]["all_set"]
    has_permissions = results["service_account_permissions"].get("has_vector_search_permissions", False)
    embedding_success = results["embedding_generation"]["success"]
    search_success = results["vector_search"]["success"]
    using_mock = results["vector_search"]["using_mock"]
    
    if all_env_vars_set and has_permissions and embedding_success and search_success and not using_mock:
        results["status"] = "healthy"
        results["message"] = "Vector Search is working correctly."
    elif search_success and using_mock:
        results["status"] = "using_mock"
        results["message"] = "Vector Search is using mock implementation."
        results["fix_instructions"] = generate_permission_fix_instructions(results)
    else:
        results["status"] = "error"
        results["message"] = "Vector Search is not working correctly."
        results["fix_instructions"] = generate_permission_fix_instructions(results)
    
    return results

def parse_args():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description="Vector Search Diagnostic Tool")
    parser.add_argument("--json", action="store_true", help="Output results as JSON")
    parser.add_argument("--fix", action="store_true", help="Show fix instructions")
    return parser.parse_args()

def main():
    """Main function."""
    args = parse_args()
    
    logger.info("=== Vector Search Diagnostic Tool ===\n")
    
    # Run diagnostic
    results = run_diagnostic()
    
    # Print summary
    logger.info("\n=== Diagnostic Summary ===")
    logger.info(f"Status: {results['status']}")
    logger.info(f"Message: {results['message']}")
    
    # Output as JSON if requested
    if args.json:
        logger.debug("%s", json.dumps(results, indent=2))
    
    # Show fix instructions if requested or if there are errors
    if args.fix or results["status"] != "healthy":
        if "fix_instructions" in results:
            logger.info("\n=== Fix Instructions ===")
            logger.info("%s", results["fix_instructions"])
    
    logger.info("\n=== Diagnostic Complete ===")
    
    # Return exit code based on status
    if results["status"] == "healthy":
        return 0
    elif results["status"] == "using_mock":
        return 1
    else:
        return 2

if __name__ == "__main__":
    sys.exit(main())
