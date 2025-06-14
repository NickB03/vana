#!/usr/bin/env python3
"""
Generate Vector Search Permission Commands for Backend SA

This script generates the gcloud commands needed to add the necessary
IAM permissions for Vector Search access to the backend service account.
"""

import logging
import os
import sys

from dotenv import load_dotenv

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s", handlers=[logging.StreamHandler()]
)
logger = logging.getLogger(__name__)


def main():
    """Main function to generate Vector Search permission commands."""
    # Load environment variables
    load_dotenv()

    # Get required environment variables
    project_id = os.environ.get("GOOGLE_CLOUD_PROJECT")
    service_account_email = os.environ.get("FIREBASE_CLIENT_EMAIL")

    if not all([project_id, service_account_email]):
        logger.error("Missing required environment variables")
        logger.error("Required: GOOGLE_CLOUD_PROJECT, FIREBASE_CLIENT_EMAIL")
        return 1

    logger.info("Generating Vector Search permission commands for:")
    logger.info(f"  Project: {project_id}")
    logger.info(f"  Service Account: {service_account_email}")

    # Define the roles to add
    roles = ["roles/aiplatform.user", "roles/aiplatform.viewer", "roles/aiplatform.admin"]

    # Generate the commands
    logger.info("\n# Run these commands to add Vector Search permissions:")
    for role in roles:
        command = f'gcloud projects add-iam-policy-binding {project_id} \\\n    --member="serviceAccount:{service_account_email}" \\\n    --role="{role}"'
        logger.info(f"\n{command}")

    # Generate command to verify permissions
    logger.info("\n# After adding permissions, verify with:")
    logger.info(
        "%s",
        f'gcloud projects get-iam-policy {project_id} \\\n    --flatten="bindings[].members" \\\n    --format="table(bindings.role, bindings.members)" \\\n    --filter="bindings.members:{service_account_email}"',
    )

    logger.info("✅ Successfully generated Vector Search permission commands")
    return 0


if __name__ == "__main__":
    sys.exit(main())
