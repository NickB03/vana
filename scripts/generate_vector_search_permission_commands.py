#!/usr/bin/env python3
"""
Generate Vector Search Permission Commands

This script generates the gcloud commands needed to add the necessary
IAM permissions for Vector Search access.
"""

import argparse
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
    parser = argparse.ArgumentParser(description="Generate Vector Search Permission Commands")
    parser.add_argument(
        "--service-account",
        type=str,
        default="vana-vector-search-sa@${GOOGLE_CLOUD_PROJECT}.iam.gserviceaccount.com",
        help="Service account email",
    )
    args = parser.parse_args()

    # Load environment variables
    load_dotenv()

    # Get required environment variables
    project_id = os.environ.get("GOOGLE_CLOUD_PROJECT")

    if not project_id:
        logger.error("Missing required environment variable: GOOGLE_CLOUD_PROJECT")
        return 1

    service_account_email = args.service_account

    logger.info(f"Generating Vector Search permission commands for:")
    logger.info(f"  Project: {project_id}")
    logger.info(f"  Service Account: {service_account_email}")

    # Define the roles to add
    roles = [
        "roles/aiplatform.user",
        "roles/aiplatform.viewer",
        "roles/aiplatform.admin",
        # Add more specific roles for Vector Search
        "roles/aiplatform.indexEndpointViewer",
        "roles/aiplatform.indexEndpointAdmin",
        "roles/aiplatform.indexAdmin",
    ]

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
