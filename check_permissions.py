#!/usr/bin/env python3
"""
Check and update service account permissions.

This script checks if the service account has the necessary permissions
for ADK and Vector Search, and adds them if needed.
"""

import os
import subprocess
import sys
import json
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure Google Cloud
PROJECT_ID = os.getenv("GOOGLE_CLOUD_PROJECT")
SERVICE_ACCOUNT_PATH = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")

def check_gcloud_installed():
    """Check if gcloud CLI is installed."""
    try:
        subprocess.run(["gcloud", "--version"], capture_output=True, check=True)
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        return False

def get_service_account_email():
    """Get the service account email from the credentials file."""
    if not SERVICE_ACCOUNT_PATH:
        print("❌ GOOGLE_APPLICATION_CREDENTIALS environment variable not set.")
        return None
    
    if not os.path.exists(SERVICE_ACCOUNT_PATH):
        print(f"❌ Service account credentials file not found: {SERVICE_ACCOUNT_PATH}")
        return None
    
    try:
        with open(SERVICE_ACCOUNT_PATH, "r") as f:
            credentials = json.load(f)
            return credentials.get("client_email")
    except Exception as e:
        print(f"❌ Error reading service account credentials: {str(e)}")
        return None

def check_permissions(service_account_email):
    """Check if the service account has the necessary permissions."""
    if not PROJECT_ID:
        print("❌ GOOGLE_CLOUD_PROJECT environment variable not set.")
        return False
    
    print(f"Checking permissions for service account: {service_account_email}")
    
    # Get the IAM policy for the project
    result = subprocess.run(
        ["gcloud", "projects", "get-iam-policy", PROJECT_ID, "--format=json"],
        capture_output=True,
        text=True,
        check=True
    )
    
    policy = json.loads(result.stdout)
    
    # Check for required roles
    required_roles = {
        "roles/aiplatform.user": "Vertex AI User",
        "roles/aiplatform.admin": "Vertex AI Admin",
        "roles/storage.objectAdmin": "Storage Object Admin",
        "roles/serviceusage.serviceUsageConsumer": "Service Usage Consumer"
    }
    
    member = f"serviceAccount:{service_account_email}"
    
    assigned_roles = set()
    for binding in policy.get("bindings", []):
        if member in binding.get("members", []):
            assigned_roles.add(binding.get("role"))
    
    all_roles_assigned = True
    print("\nPermission Status:")
    
    for role, description in required_roles.items():
        if role in assigned_roles:
            print(f"✅ {description} ({role}) is assigned")
        else:
            print(f"❌ {description} ({role}) is NOT assigned")
            all_roles_assigned = False
    
    return all_roles_assigned

def add_permissions(service_account_email):
    """Add the necessary permissions to the service account."""
    if not PROJECT_ID:
        print("❌ GOOGLE_CLOUD_PROJECT environment variable not set.")
        return False
    
    print("\nAdding required permissions...")
    
    # Required roles
    required_roles = [
        "roles/aiplatform.user",
        "roles/aiplatform.admin",
        "roles/storage.objectAdmin",
        "roles/serviceusage.serviceUsageConsumer"
    ]
    
    member = f"serviceAccount:{service_account_email}"
    
    for role in required_roles:
        print(f"Adding {role}...")
        try:
            subprocess.run(
                [
                    "gcloud", "projects", "add-iam-policy-binding", PROJECT_ID,
                    f"--member={member}",
                    f"--role={role}"
                ],
                capture_output=True,
                check=True
            )
            print(f"✅ {role} added successfully")
        except subprocess.CalledProcessError as e:
            print(f"❌ Error adding {role}: {e.stderr.decode()}")
            return False
    
    return True

def main():
    """Main function."""
    print("🔍 Checking service account permissions...")
    
    # Check if gcloud CLI is installed
    if not check_gcloud_installed():
        print("❌ gcloud CLI is not installed or not in PATH.")
        print("Please install the Google Cloud SDK: https://cloud.google.com/sdk/docs/install")
        sys.exit(1)
    
    # Get the service account email
    service_account_email = get_service_account_email()
    if not service_account_email:
        sys.exit(1)
    
    # Check if the service account has the necessary permissions
    permissions_ok = check_permissions(service_account_email)
    
    if not permissions_ok:
        # Ask user if they want to add the permissions
        response = input("\nDo you want to add the required permissions? (y/n): ")
        if response.lower() == 'y':
            if add_permissions(service_account_email):
                print("\n✅ Permissions added successfully!")
                # Verify again
                print("\nVerifying permissions again...")
                permissions_ok = check_permissions(service_account_email)
                if not permissions_ok:
                    print("\n❌ Failed to add all required permissions.")
                    sys.exit(1)
            else:
                print("\n❌ Failed to add permissions.")
                sys.exit(1)
        else:
            print("\n⚠️ Required permissions are not assigned. Some functionality may not work.")
            sys.exit(1)
    
    print("\n✅ All required permissions are assigned!")

if __name__ == "__main__":
    main()
