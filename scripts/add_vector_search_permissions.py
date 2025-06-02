#!/usr/bin/env python3
"""
Add Vector Search Permissions

This script adds the necessary IAM permissions for Vector Search access.
It uses the Google Cloud API to add the required roles to the service account.
"""

import argparse
import logging
import os
import sys

from dotenv import load_dotenv
from google.cloud import resourcemanager_v3
from google.iam.v1 import iam_policy_pb2, policy_pb2
from google.oauth2 import service_account

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler()],
)
logger = logging.getLogger(__name__)


def main():
    """Main function to add Vector Search permissions."""
    parser = argparse.ArgumentParser(description="Add Vector Search Permissions")
    parser.add_argument(
        "--service-account",
        type=str,
        default="vana-vector-search-sa@analystai-454200.iam.gserviceaccount.com",
        help="Service account email",
    )
    args = parser.parse_args()

    # Load environment variables
    load_dotenv()

    # Get required environment variables
    project_id = os.environ.get("GOOGLE_CLOUD_PROJECT")
    credentials_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")

    if not all([project_id, credentials_path]):
        logger.error("Missing required environment variables")
        logger.error("Required: GOOGLE_CLOUD_PROJECT, GOOGLE_APPLICATION_CREDENTIALS")
        return 1

    service_account_email = args.service_account

    logger.info("Adding Vector Search permissions for:")
    logger.info(f"  Project: {project_id}")
    logger.info(f"  Service Account: {service_account_email}")

    try:
        # Load credentials
        credentials = service_account.Credentials.from_service_account_file(
            credentials_path, scopes=["https://www.googleapis.com/auth/cloud-platform"]
        )

        # Create IAM client
        client = resourcemanager_v3.ProjectsClient(credentials=credentials)

        # Get the project
        project_name = f"projects/{project_id}"

        # Get the current IAM policy
        request = iam_policy_pb2.GetIamPolicyRequest(resource=project_name)
        policy = client.get_iam_policy(request=request)

        # Define the roles to add
        roles_to_add = [
            "roles/aiplatform.user",
            "roles/aiplatform.viewer",
            "roles/aiplatform.admin",
            # Add more specific roles for Vector Search
            "roles/aiplatform.indexEndpointViewer",
            "roles/aiplatform.indexEndpointAdmin",
            "roles/aiplatform.indexAdmin",
        ]

        # Service account member string
        member = f"serviceAccount:{service_account_email}"

        # Add roles to the policy
        for role in roles_to_add:
            # Check if the role already exists
            role_exists = False
            for binding in policy.bindings:
                if binding.role == role and member in binding.members:
                    role_exists = True
                    logger.info(f"Role {role} already exists for {member}")
                    break

            # Add the role if it doesn't exist
            if not role_exists:
                logger.info(f"Adding role {role} for {member}")
                binding = policy_pb2.Binding()
                binding.role = role
                binding.members.append(member)
                policy.bindings.append(binding)

        # Set the updated IAM policy
        set_request = iam_policy_pb2.SetIamPolicyRequest(
            resource=project_name, policy=policy
        )
        updated_policy = client.set_iam_policy(request=set_request)

        logger.info("✅ Successfully updated IAM policy with Vector Search permissions")
        logger.info("Please wait a few minutes for the permissions to propagate")
        return 0

    except Exception as e:
        logger.error(f"❌ Error adding Vector Search permissions: {e}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
