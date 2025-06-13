#!/usr/bin/env python3
"""
Check Service Account Permissions

This script checks what permissions the service account has on the Vector Search endpoint.
"""

import logging
import os
import sys

from dotenv import load_dotenv
from google.cloud import resourcemanager_v3
from google.iam.v1 import iam_policy_pb2, policy_pb2
from google.oauth2 import service_account

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s", handlers=[logging.StreamHandler()]
)
logger = logging.getLogger(__name__)


def main():
    """Main function to check service account permissions."""
    # Load environment variables
    load_dotenv()

    # Get required environment variables
    project_id = os.environ.get("GOOGLE_CLOUD_PROJECT")
    credentials_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")

    if not all([project_id, credentials_path]):
        logger.error("Missing required environment variables")
        logger.error("Required: GOOGLE_CLOUD_PROJECT, GOOGLE_APPLICATION_CREDENTIALS")
        return 1

    # Get service account email from credentials file
    try:
        credentials = service_account.Credentials.from_service_account_file(credentials_path)
        service_account_email = credentials.service_account_email
        logger.info(f"Service account email: {service_account_email}")
    except Exception as e:
        logger.error(f"Error loading credentials: {e}")
        return 1

    # Print environment variables for debugging
    logger.info(f"GOOGLE_CLOUD_PROJECT: {project_id}")
    logger.info(f"GOOGLE_APPLICATION_CREDENTIALS: {credentials_path}")

    try:
        # Create IAM client
        credentials = service_account.Credentials.from_service_account_file(
            credentials_path, scopes=["https://www.googleapis.com/auth/cloud-platform"]
        )

        # Create resource manager client
        client = resourcemanager_v3.ProjectsClient(credentials=credentials)

        # Get the project
        project_name = f"projects/{project_id}"

        # Get the current IAM policy
        request = iam_policy_pb2.GetIamPolicyRequest(resource=project_name)

        try:
            policy = client.get_iam_policy(request=request)

            # Check what roles the service account has
            logger.info(f"Roles for service account {service_account_email}:")

            found_roles = []
            for binding in policy.bindings:
                member = f"serviceAccount:{service_account_email}"
                if member in binding.members:
                    found_roles.append(binding.role)
                    logger.info(f"  - {binding.role}")

            if not found_roles:
                logger.warning(f"No roles found for service account {service_account_email}")

            # Check for specific Vertex AI roles
            vertex_ai_roles = ["roles/aiplatform.user", "roles/aiplatform.viewer", "roles/aiplatform.admin"]

            logger.info("Checking for required Vertex AI roles:")
            for role in vertex_ai_roles:
                if role in found_roles:
                    logger.info(f"  ✅ {role}: Found")
                else:
                    logger.warning(f"  ❌ {role}: Not found")

            # Check for specific Vector Search permissions
            vector_search_permissions = [
                "aiplatform.indexEndpoints.get",
                "aiplatform.indexEndpoints.list",
                "aiplatform.indexEndpoints.match",
            ]

            logger.info("Required Vector Search permissions:")
            for permission in vector_search_permissions:
                logger.info(f"  - {permission}")

            return 0

        except Exception as e:
            logger.error(f"Error getting IAM policy: {e}")
            logger.warning("The service account may not have permission to view IAM policies")
            logger.warning("Try running this script with your user account instead")
            return 1

    except Exception as e:
        logger.error(f"Error checking permissions: {e}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
