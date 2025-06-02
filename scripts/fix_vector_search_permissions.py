#!/usr/bin/env python3
"""
Fix Vector Search Permissions for VANA

This script fixes the permissions for the Vector Search service account.
It adds the necessary IAM roles to the service account to allow it to access
the Vector Search endpoint and index.

Usage:
    python scripts/fix_vector_search_permissions.py
"""

import argparse
import json
import logging
import os
import subprocess
import sys

from dotenv import load_dotenv

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler("vector_search_permissions.log"),
        logging.StreamHandler(),
    ],
)
logger = logging.getLogger(__name__)


def load_environment_variables():
    """Load environment variables."""
    load_dotenv()

    # Required environment variables
    env_vars = {
        "GOOGLE_CLOUD_PROJECT": os.environ.get("GOOGLE_CLOUD_PROJECT"),
        "GOOGLE_CLOUD_LOCATION": os.environ.get("GOOGLE_CLOUD_LOCATION"),
        "GOOGLE_APPLICATION_CREDENTIALS": os.environ.get(
            "GOOGLE_APPLICATION_CREDENTIALS"
        ),
        "VECTOR_SEARCH_ENDPOINT_ID": os.environ.get("VECTOR_SEARCH_ENDPOINT_ID"),
    }

    # Check for missing variables
    missing_vars = [var for var, value in env_vars.items() if not value]
    if missing_vars:
        logger.error(
            f"❌ Missing required environment variables: {', '.join(missing_vars)}"
        )
        logger.error("Please set these variables in your .env file or environment.")
        return None

    logger.info("✅ All required environment variables are set.")
    return env_vars


def get_service_account_email():
    """Get the service account email from the credentials file."""
    credentials_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
    if not credentials_path:
        logger.error("❌ GOOGLE_APPLICATION_CREDENTIALS environment variable not set.")
        return None

    try:
        with open(credentials_path) as f:
            credentials = json.load(f)

        if "client_email" not in credentials:
            logger.error("❌ client_email not found in credentials file.")
            return None

        service_account_email = credentials["client_email"]
        logger.info(f"✅ Service account email: {service_account_email}")
        return service_account_email
    except Exception as e:
        logger.error(f"❌ Error reading credentials file: {e}")
        return None


def add_iam_roles(project_id, service_account_email):
    """Add IAM roles to the service account."""
    if not project_id or not service_account_email:
        logger.error("❌ Missing project ID or service account email.")
        return False

    # Required roles for Vector Search
    roles = [
        "roles/aiplatform.user",
        "roles/aiplatform.viewer",
        "roles/aiplatform.admin",
    ]

    success = True
    for role in roles:
        try:
            logger.info(f"Adding role {role} to {service_account_email}...")

            command = [
                "gcloud",
                "projects",
                "add-iam-policy-binding",
                project_id,
                "--member",
                f"serviceAccount:{service_account_email}",
                "--role",
                role,
            ]

            result = subprocess.run(command, capture_output=True, text=True)

            if result.returncode == 0:
                logger.info(
                    f"✅ Successfully added role {role} to {service_account_email}"
                )
            else:
                logger.error(f"❌ Failed to add role {role} to {service_account_email}")
                logger.error(f"Error: {result.stderr}")
                success = False
        except Exception as e:
            logger.error(f"❌ Error adding role {role} to {service_account_email}: {e}")
            success = False

    return success


def verify_permissions(project_id, location, endpoint_id, service_account_email):
    """Verify that the service account has the necessary permissions."""
    if not project_id or not location or not endpoint_id or not service_account_email:
        logger.error("❌ Missing required parameters.")
        return False

    try:
        logger.info("Verifying permissions...")

        # Extract the endpoint ID from the full resource name
        endpoint_id_short = (
            endpoint_id.split("/")[-1] if "/" in endpoint_id else endpoint_id
        )

        command = [
            "gcloud",
            "ai",
            "index-endpoints",
            "describe",
            endpoint_id_short,
            "--project",
            project_id,
            "--region",
            location,
            "--format",
            "json",
        ]

        result = subprocess.run(command, capture_output=True, text=True)

        if result.returncode == 0:
            logger.info("✅ Successfully verified permissions.")
            return True
        else:
            logger.error("❌ Failed to verify permissions.")
            logger.error(f"Error: {result.stderr}")
            return False
    except Exception as e:
        logger.error(f"❌ Error verifying permissions: {e}")
        return False


def main():
    """Main function."""
    parser = argparse.ArgumentParser(
        description="Fix Vector Search Permissions for VANA"
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Force adding roles even if verification succeeds",
    )
    args = parser.parse_args()

    # Load environment variables
    env_vars = load_environment_variables()
    if not env_vars:
        sys.exit(1)

    # Get service account email
    service_account_email = get_service_account_email()
    if not service_account_email:
        sys.exit(1)

    # Verify permissions
    if not args.force:
        logger.info("Checking if permissions are already set...")
        if verify_permissions(
            env_vars["GOOGLE_CLOUD_PROJECT"],
            env_vars["GOOGLE_CLOUD_LOCATION"],
            env_vars["VECTOR_SEARCH_ENDPOINT_ID"],
            service_account_email,
        ):
            logger.info("✅ Permissions are already set correctly.")
            sys.exit(0)

    # Add IAM roles
    logger.info("Adding IAM roles...")
    if add_iam_roles(env_vars["GOOGLE_CLOUD_PROJECT"], service_account_email):
        logger.info("✅ Successfully added IAM roles.")
    else:
        logger.error("❌ Failed to add IAM roles.")
        sys.exit(1)

    # Verify permissions again
    logger.info("Verifying permissions after adding roles...")
    if verify_permissions(
        env_vars["GOOGLE_CLOUD_PROJECT"],
        env_vars["GOOGLE_CLOUD_LOCATION"],
        env_vars["VECTOR_SEARCH_ENDPOINT_ID"],
        service_account_email,
    ):
        logger.info("✅ Permissions are now set correctly.")
    else:
        logger.error("❌ Permissions are still not set correctly.")
        logger.error("Please check the logs for more information.")
        sys.exit(1)

    logger.info("✅ Vector Search permissions fixed successfully.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
