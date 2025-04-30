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
        
        return config
    
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
