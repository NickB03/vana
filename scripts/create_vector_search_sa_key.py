#!/usr/bin/env python3
"""
Create Vector Search Service Account Key

This script generates the gcloud commands needed to create a new service account key file
for the vana-vector-search-sa service account.
"""

import os
import sys
import logging
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

def main():
    """Main function to generate commands for creating a service account key."""
    # Load environment variables
    load_dotenv()
    
    # Get required environment variables
    project_id = os.environ.get("GOOGLE_CLOUD_PROJECT")
    
    if not project_id:
        logger.error("Missing required environment variable: GOOGLE_CLOUD_PROJECT")
        return 1
    
    # Service account email
    service_account_email = f"vana-vector-search-sa@{project_id}.iam.gserviceaccount.com"
    
    logger.info(f"Generating commands for creating a service account key for:")
    logger.info(f"  Project: {project_id}")
    logger.info(f"  Service Account: {service_account_email}")
    
    # Generate the commands
    logger.info("\n# Run these commands to create a new service account key file:")
    
    # Create the secrets directory if it doesn't exist
    logger.info("%s", "\n# Create the secrets directory if it doesn't exist")
    logger.info("mkdir -p secrets")
    
    # Create the service account key
    logger.info("\n# Create the service account key")
    logger.info(f"gcloud iam service-accounts keys create secrets/vana-vector-search-sa.json \\\n    --iam-account={service_account_email}")
    
    # Update the .env file
    logger.info("\n# Update the .env file to use the new service account key")
    logger.info("%s", "sed -i '' 's|GOOGLE_APPLICATION_CREDENTIALS=.*|GOOGLE_APPLICATION_CREDENTIALS=/Users/nick/Development/vana/secrets/vana-vector-search-sa.json|' .env")
    
    # Test the Vector Search client
    logger.info("\n# Test the Vector Search client")
    logger.info("python scripts/verify_vector_search_client.py")
    
    logger.info("✅ Successfully generated commands for creating a service account key")
    return 0

if __name__ == "__main__":
    sys.exit(main())
