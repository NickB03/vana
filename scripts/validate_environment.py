#!/usr/bin/env python3
"""
Environment Configuration Validator for VANA

This script validates all required environment variables and credentials
before starting the ADK server to catch configuration issues early.
"""

import os
import sys
import json
import logging
from pathlib import Path
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

def validate_env_variables():
    """Validate required environment variables"""
    required_vars = [
        "GOOGLE_CLOUD_PROJECT",
        "GOOGLE_CLOUD_LOCATION",
        "GOOGLE_APPLICATION_CREDENTIALS",
        "MODEL"
    ]
    
    missing_vars = []
    for var in required_vars:
        if not os.environ.get(var):
            missing_vars.append(var)
    
    if missing_vars:
        logger.error(f"Missing required environment variables: {', '.join(missing_vars)}")
        return False
    
    logger.info("All required environment variables are set")
    return True

def validate_service_account():
    """Validate service account credentials file"""
    creds_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
    if not creds_path:
        logger.error("GOOGLE_APPLICATION_CREDENTIALS environment variable not set")
        return False
    
    # Expand path if it contains ~
    creds_path = os.path.expanduser(creds_path)
    
    # Check if file exists
    if not os.path.isfile(creds_path):
        logger.error(f"Service account credentials file not found: {creds_path}")
        return False
    
    # Check if file is readable
    try:
        with open(creds_path, "r") as f:
            creds_data = json.load(f)
        
        # Check for required fields
        required_fields = ["type", "project_id", "private_key_id", "private_key", "client_email"]
        missing_fields = []
        for field in required_fields:
            if field not in creds_data:
                missing_fields.append(field)
        
        if missing_fields:
            logger.error(f"Service account credentials file missing required fields: {', '.join(missing_fields)}")
            return False
        
        # Verify project ID matches
        if creds_data.get("project_id") != os.environ.get("GOOGLE_CLOUD_PROJECT"):
            logger.warning(f"Service account project ID ({creds_data.get('project_id')}) does not match GOOGLE_CLOUD_PROJECT ({os.environ.get('GOOGLE_CLOUD_PROJECT')})")
        
        logger.info(f"Service account credentials file validated: {creds_path}")
        logger.info(f"Using service account: {creds_data.get('client_email')}")
        return True
    
    except json.JSONDecodeError:
        logger.error(f"Service account credentials file is not valid JSON: {creds_path}")
        return False
    except Exception as e:
        logger.error(f"Error validating service account credentials: {str(e)}")
        return False

def validate_adk_structure():
    """Validate ADK project structure"""
    # Check for required directories
    required_dirs = [
        "adk-setup",
        "adk-setup/vana",
        "adk-setup/vana/agents",
        "adk-setup/vana/tools",
        "adk-setup/vana/config"
    ]
    
    missing_dirs = []
    for dir_path in required_dirs:
        if not os.path.isdir(dir_path):
            missing_dirs.append(dir_path)
    
    if missing_dirs:
        logger.error(f"Missing required directories: {', '.join(missing_dirs)}")
        return False
    
    # Check for required files
    required_files = [
        "adk-setup/vana/__init__.py",
        "adk-setup/vana/agents/__init__.py",
        "adk-setup/vana/tools/__init__.py",
        "adk-setup/vana/config/__init__.py"
    ]
    
    missing_files = []
    for file_path in required_files:
        if not os.path.isfile(file_path):
            missing_files.append(file_path)
    
    if missing_files:
        logger.error(f"Missing required files: {', '.join(missing_files)}")
        return False
    
    # Check for agent.py file
    if not os.path.isfile("adk-setup/vana/agent.py"):
        logger.warning("Missing agent.py file in adk-setup/vana/ - this is required for ADK to find the root agent")
        return False
    
    logger.info("ADK project structure validated")
    return True

def main():
    """Main function"""
    logger.info("Validating environment configuration for VANA...")
    
    # Load environment variables from .env file
    load_dotenv()
    
    # Run validation checks
    env_valid = validate_env_variables()
    sa_valid = validate_service_account()
    adk_valid = validate_adk_structure()
    
    # Check overall validation status
    if env_valid and sa_valid and adk_valid:
        logger.info("✅ Environment configuration validated successfully")
        return 0
    else:
        logger.error("❌ Environment configuration validation failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())
