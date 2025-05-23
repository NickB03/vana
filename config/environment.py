"""
Environment Configuration for VANA

This module provides configuration management for different environments (development, production, test).
It handles environment-specific settings and provides a consistent interface for accessing configuration.
"""

import os
import logging
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Set up logging
logger = logging.getLogger(__name__)

class EnvironmentConfig:
    """Configuration manager for different environments"""

    @staticmethod
    def is_development():
        """Check if running in development mode"""
        return os.environ.get("VANA_ENV", "development") == "development"

    @staticmethod
    def is_test():
        """Check if running in test mode"""
        return os.environ.get("VANA_ENV", "development") == "test"

    @staticmethod
    def is_production():
        """Check if running in production mode"""
        return os.environ.get("VANA_ENV", "development") == "production"

    @staticmethod
    def get_mcp_config():
        """Get MCP configuration based on environment"""
        if EnvironmentConfig.is_development():
            # Use local server in development if available
            if os.environ.get("USE_LOCAL_MCP", "true").lower() == "true":
                logger.info("Using local MCP server for development")
                return {
                    "endpoint": "http://localhost:5000",
                    "namespace": "vana-dev",
                    "api_key": "local_dev_key"
                }

        # Default to configuration from environment variables
        endpoint = os.environ.get("MCP_ENDPOINT", "https://mcp.community.augment.co")
        namespace = os.environ.get("MCP_NAMESPACE", "vana-project")
        api_key = os.environ.get("MCP_API_KEY", "")

        logger.info(f"Using MCP server at {endpoint}/{namespace}")

        return {
            "endpoint": endpoint,
            "namespace": namespace,
            "api_key": api_key
        }

    @staticmethod
    def get_vector_search_config():
        """Get Vector Search configuration based on environment"""
        config = {
            "project_id": os.environ.get("GOOGLE_CLOUD_PROJECT", ""),
            "location": os.environ.get("GOOGLE_CLOUD_LOCATION", ""),
            "endpoint_id": os.environ.get("VECTOR_SEARCH_ENDPOINT_ID", ""),
            "deployed_index_id": os.environ.get("DEPLOYED_INDEX_ID", "vanasharedindex")
        }

        logger.info(f"Using Vector Search endpoint: {config['endpoint_id']}")

        # Attempt to load GCP credentials if GOOGLE_APPLICATION_CREDENTIALS is set
        gcp_creds_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
        if gcp_creds_path:
            config["credentials_path"] = gcp_creds_path
            logger.info(f"Using GCP credentials from: {gcp_creds_path}")
            # Basic validation: check if file exists
            if not os.path.exists(gcp_creds_path):
                logger.error(f"GCP credentials file not found at: {gcp_creds_path}")
            else:
                # Further validation could be added here (e.g., JSON parsing, permission checks)
                pass # Placeholder for more robust validation
        else:
            logger.warning("GOOGLE_APPLICATION_CREDENTIALS environment variable not set. Vector Search may require it.")

        return config

    @staticmethod
    def get_web_search_config():
        """Get Web Search (Google Custom Search) configuration from environment"""
        api_key = os.environ.get("GOOGLE_SEARCH_API_KEY", "")
        engine_id = os.environ.get("GOOGLE_SEARCH_ENGINE_ID", "")

        if not api_key or not engine_id:
            logger.warning("GOOGLE_SEARCH_API_KEY or GOOGLE_SEARCH_ENGINE_ID not found in environment. WebSearchClient may not function.")

        return {
            "api_key": api_key,
            "search_engine_id": engine_id
        }

    @staticmethod
    def get_data_dir():
        """Get data directory path based on environment"""
        base_dir = os.environ.get("VANA_DATA_DIR", ".")

        if EnvironmentConfig.is_test():
            # Use test-specific directory
            data_dir = os.path.join(base_dir, "test_data")
        else:
            # Use environment-specific directory
            env = os.environ.get("VANA_ENV", "development")
            data_dir = os.path.join(base_dir, f"{env}_data")

        # Create directory if it doesn't exist
        os.makedirs(data_dir, exist_ok=True)

        return data_dir

    @staticmethod
    def get_memory_config():
        """Get memory configuration based on environment"""
        return {
            "sync_interval": int(os.environ.get("MEMORY_SYNC_INTERVAL", "300")),
            "cache_size": int(os.environ.get("MEMORY_CACHE_SIZE", "1000")),
            "cache_ttl": int(os.environ.get("MEMORY_CACHE_TTL", "3600")),
            "entity_half_life_days": int(os.environ.get("ENTITY_HALF_LIFE_DAYS", "30")),
            "local_db_path": os.path.join(EnvironmentConfig.get_data_dir(), "memory_cache.db")
        }

    @staticmethod
    def get_gcp_credentials():
        """
        Get GCP credentials, typically from GOOGLE_APPLICATION_CREDENTIALS environment variable.

        Returns:
            dict: The loaded credentials as a dictionary, or None if credentials could not be loaded.

        This method performs comprehensive validation of the credentials file:
        - Checks if the environment variable is set
        - Verifies the file exists and is readable
        - Validates the JSON structure and required fields
        - Checks file permissions (on Unix systems)
        """
        credentials_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
        if not credentials_path:
            logger.warning("GOOGLE_APPLICATION_CREDENTIALS environment variable is not set.")
            return None

        if not os.path.exists(credentials_path):
            logger.error(f"GCP credentials file specified by GOOGLE_APPLICATION_CREDENTIALS not found: {credentials_path}")
            return None

        # Check file permissions on Unix systems
        if os.name == 'posix':
            try:
                file_stat = os.stat(credentials_path)
                file_mode = file_stat.st_mode

                # Check if file is readable only by owner (600 or 400)
                if file_mode & 0o077:  # Check if group or others have any permissions
                    logger.warning(
                        f"GCP credentials file {credentials_path} has insecure permissions. "
                        f"It is recommended to restrict access to owner only (chmod 600)."
                    )
            except Exception as e:
                logger.warning(f"Could not check permissions on GCP credentials file: {e}")

        try:
            import json
            with open(credentials_path, 'r') as f:
                credentials = json.load(f)

            # Comprehensive validation: check for essential keys and their format
            required_keys = ["type", "project_id", "private_key_id", "private_key", "client_email"]
            if not all(key in credentials for key in required_keys):
                logger.error(f"GCP credentials file {credentials_path} is missing one or more required keys.")
                return None

            # Validate service account type
            if credentials.get("type") != "service_account":
                logger.error(f"GCP credentials file {credentials_path} is not a service account key (type: {credentials.get('type')}).")
                return None

            # Validate private key format
            if not credentials.get("private_key", "").startswith("-----BEGIN PRIVATE KEY-----"):
                logger.error(f"GCP credentials file {credentials_path} contains an invalid private key format.")
                return None

            # Validate client email format
            if not credentials.get("client_email", "").endswith(".gserviceaccount.com"):
                logger.warning(f"GCP credentials file {credentials_path} contains an unusual client email format.")

            logger.info(f"Successfully loaded GCP credentials from {credentials_path}")
            return credentials

        except json.JSONDecodeError:
            logger.error(f"Error decoding JSON from GCP credentials file: {credentials_path}")
            return None
        except PermissionError:
            logger.error(f"Permission denied when trying to read GCP credentials file: {credentials_path}")
            return None
        except Exception as e:
            logger.error(f"An unexpected error occurred while loading GCP credentials from {credentials_path}: {e}")
            return None
