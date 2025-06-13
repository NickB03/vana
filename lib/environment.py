"""
Smart Environment Detection and Configuration for VANA ADK
Automatically detects local vs Cloud Run environment and loads appropriate configuration.
"""

import logging
import os
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv

logger = logging.getLogger(__name__)


class EnvironmentDetector:
    """Detects the current environment and loads appropriate configuration."""

    @staticmethod
    def is_cloud_run() -> bool:
        """
        Detect if running in Google Cloud Run environment.
        Cloud Run sets specific environment variables.
        """
        cloud_run_indicators = [
            "K_SERVICE",  # Cloud Run service name
            "K_REVISION",  # Cloud Run revision
            "K_CONFIGURATION",  # Cloud Run configuration
            "PORT",  # Cloud Run sets PORT
            "GOOGLE_CLOUD_PROJECT",  # Usually set in Cloud Run
        ]

        # Check if multiple Cloud Run indicators are present
        indicators_present = sum(1 for indicator in cloud_run_indicators if os.getenv(indicator))

        # If 2 or more indicators are present, likely Cloud Run
        is_cloud_run = indicators_present >= 2

        logger.info(f"Environment detection: Cloud Run indicators found: {indicators_present}/5")
        logger.info(f"Environment detected: {'Cloud Run' if is_cloud_run else 'Local Development'}")

        return is_cloud_run

    @staticmethod
    def is_local_development() -> bool:
        """Detect if running in local development environment."""
        return not EnvironmentDetector.is_cloud_run()

    @staticmethod
    def load_environment_config() -> str:
        """
        Load the appropriate environment configuration.
        Returns the environment type that was loaded.
        """
        project_root = Path(__file__).parent.parent

        if EnvironmentDetector.is_cloud_run():
            # Cloud Run Production Environment
            env_file = project_root / ".env.production"
            env_type = "production"

            logger.info("Loading production environment configuration")

            # Load production .env file if it exists
            if env_file.exists():
                load_dotenv(env_file)
                logger.info(f"Loaded configuration from {env_file}")
            else:
                logger.warning(f"Production .env file not found: {env_file}")

            # Ensure critical Cloud Run environment variables are set
            EnvironmentDetector._ensure_cloud_run_config()

        else:
            # Local Development Environment
            env_file = project_root / ".env.local"
            env_type = "development"

            logger.info("Loading local development environment configuration")

            # Load local .env file if it exists
            if env_file.exists():
                load_dotenv(env_file)
                logger.info(f"Loaded configuration from {env_file}")
            else:
                logger.warning(f"Local .env file not found: {env_file}")
                logger.info("Please create .env.local with your GOOGLE_API_KEY")

            # Fallback to main .env file for backward compatibility
            main_env_file = project_root / ".env"
            if main_env_file.exists():
                load_dotenv(main_env_file)
                logger.info(f"Also loaded configuration from {main_env_file}")

            # Ensure local development configuration
            EnvironmentDetector._ensure_local_config()

        # Log the final authentication configuration
        EnvironmentDetector._log_auth_config()

        return env_type

    @staticmethod
    def _ensure_cloud_run_config():
        """Ensure Cloud Run specific configuration is properly set."""
        # Force Vertex AI authentication for Cloud Run
        os.environ["GOOGLE_GENAI_USE_VERTEXAI"] = "True"

        # Ensure GOOGLE_APPLICATION_CREDENTIALS is unset (use service account)
        if "GOOGLE_APPLICATION_CREDENTIALS" in os.environ:
            del os.environ["GOOGLE_APPLICATION_CREDENTIALS"]
            logger.info("Unset GOOGLE_APPLICATION_CREDENTIALS for service account auth")

        # Set default values if not provided by Cloud Run
        if not os.environ.get("VANA_ENV"):
            os.environ["VANA_ENV"] = "production"

        if not os.environ.get("VANA_HOST"):
            os.environ["VANA_HOST"] = "0.0.0.0"

    @staticmethod
    def _ensure_local_config():
        """Ensure local development configuration is properly set."""
        # Force API key authentication for local development
        os.environ["GOOGLE_GENAI_USE_VERTEXAI"] = "False"

        # Check if API key is available
        api_key = os.environ.get("GOOGLE_API_KEY")
        if not api_key or api_key == "YOUR_GOOGLE_API_KEY_HERE":
            logger.error("GOOGLE_API_KEY not set or still placeholder!")
            logger.error("Please set your Google API key in .env.local")
            logger.error("Get your API key from: https://aistudio.google.com/app/apikey")

        # Set default values for local development
        if not os.environ.get("VANA_ENV"):
            os.environ["VANA_ENV"] = "development"

        if not os.environ.get("VANA_HOST"):
            os.environ["VANA_HOST"] = "localhost"

    @staticmethod
    def _log_auth_config():
        """Log the current authentication configuration for debugging."""
        use_vertex = os.environ.get("GOOGLE_GENAI_USE_VERTEXAI", "False").lower() == "true"
        api_key_set = bool(os.environ.get("GOOGLE_API_KEY"))
        project_id = os.environ.get("GOOGLE_CLOUD_PROJECT")

        logger.info("=== Authentication Configuration ===")
        logger.info(f"Use Vertex AI: {use_vertex}")
        logger.info(f"API Key Set: {api_key_set}")
        logger.info(f"Project ID: {project_id}")
        logger.info(f"Environment: {os.environ.get('VANA_ENV', 'unknown')}")
        logger.info("=====================================")


def setup_environment() -> str:
    """
    Main function to set up the environment.
    Call this at the start of your application.

    Returns:
        str: The environment type ('development' or 'production')
    """
    return EnvironmentDetector.load_environment_config()
