#!/usr/bin/env python3
"""
Verify that the necessary Google Cloud APIs are enabled.
"""

import os
import subprocess
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def check_gcloud_installed():
    """Check if gcloud CLI is installed."""
    try:
        subprocess.run(["gcloud", "--version"], capture_output=True, check=True)
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        return False

def check_apis_enabled():
    """Check if the necessary APIs are enabled."""
    project_id = os.getenv("GOOGLE_CLOUD_PROJECT")
    if not project_id:
        print("❌ GOOGLE_CLOUD_PROJECT environment variable not set.")
        return False
    
    print(f"Checking enabled APIs for project: {project_id}")
    
    # Get list of enabled APIs
    result = subprocess.run(
        ["gcloud", "services", "list", "--enabled", "--format=value(config.name)", f"--project={project_id}"],
        capture_output=True,
        text=True,
        check=True
    )
    
    enabled_apis = result.stdout.strip().split('\n')
    
    # Check for required APIs
    required_apis = {
        "aiplatform.googleapis.com": "Vertex AI API",
        "artifactregistry.googleapis.com": "Artifact Registry API"
    }
    
    all_enabled = True
    print("\nAPI Status:")
    
    for api_name, api_description in required_apis.items():
        if api_name in enabled_apis:
            print(f"✅ {api_description} ({api_name}) is enabled")
        else:
            print(f"❌ {api_description} ({api_name}) is NOT enabled")
            all_enabled = False
    
    return all_enabled

def enable_apis():
    """Enable the necessary APIs."""
    project_id = os.getenv("GOOGLE_CLOUD_PROJECT")
    
    print("\nEnabling required APIs...")
    
    # Enable Vertex AI API
    print("Enabling Vertex AI API...")
    subprocess.run(
        ["gcloud", "services", "enable", "aiplatform.googleapis.com", f"--project={project_id}"],
        check=True
    )
    
    # Enable Artifact Registry API
    print("Enabling Artifact Registry API...")
    subprocess.run(
        ["gcloud", "services", "enable", "artifactregistry.googleapis.com", f"--project={project_id}"],
        check=True
    )
    
    print("✅ APIs enabled successfully")

def main():
    """Main function."""
    print("🔍 Verifying Google Cloud APIs...")
    
    # Check if gcloud CLI is installed
    if not check_gcloud_installed():
        print("❌ gcloud CLI is not installed or not in PATH.")
        print("Please install the Google Cloud SDK: https://cloud.google.com/sdk/docs/install")
        sys.exit(1)
    
    # Check if APIs are enabled
    apis_enabled = check_apis_enabled()
    
    if not apis_enabled:
        # Ask user if they want to enable the APIs
        response = input("\nDo you want to enable the required APIs? (y/n): ")
        if response.lower() == 'y':
            enable_apis()
            # Verify again
            print("\nVerifying APIs again...")
            apis_enabled = check_apis_enabled()
            if not apis_enabled:
                print("\n❌ Failed to enable all required APIs.")
                sys.exit(1)
        else:
            print("\n⚠️ Required APIs are not enabled. Some functionality may not work.")
            sys.exit(1)
    
    print("\n✅ All required APIs are enabled!")

if __name__ == "__main__":
    main()
