"""
Environment Configuration

This module provides configuration management for different environments (development, production).
"""

import os
import logging
from typing import Dict, Any, Optional
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)

class EnvironmentConfig:
    """Configuration manager for different environments"""
    
    @staticmethod
    def is_development():
        """Check if running in development mode"""
        return os.environ.get("VANA_ENV", "development") == "development"
    
    @staticmethod
    def is_production():
        """Check if running in production mode"""
        return os.environ.get("VANA_ENV", "development") == "production"
    
    @staticmethod
    def is_test():
        """Check if running in test mode"""
        return os.environ.get("VANA_ENV", "development") == "test"
    
    @staticmethod
    def get_mcp_config() -> Dict[str, str]:
        """
        Get MCP configuration based on environment.
        
        Returns:
            Dict containing endpoint, namespace, and api_key
        """
        if EnvironmentConfig.is_development():
            # Use local server in development if available
            if os.environ.get("USE_LOCAL_MCP", "true").lower() == "true":
                return {
                    "endpoint": "http://localhost:5000",
                    "namespace": "vana-dev",
                    "api_key": "local_dev_key"
                }
        
        # Default to configuration from environment variables
        return {
            "endpoint": os.environ.get("MCP_ENDPOINT", "https://mcp.community.augment.co"),
            "namespace": os.environ.get("MCP_NAMESPACE", "vana-project"),
            "api_key": os.environ.get("MCP_API_KEY", "")
        }
    
    @staticmethod
    def get_memory_config() -> Dict[str, Any]:
        """
        Get memory configuration based on environment.
        
        Returns:
            Dict containing memory configuration
        """
        # Base directory for data storage
        data_dir = os.environ.get("VANA_DATA_DIR", os.path.join(os.getcwd(), "data"))
        
        # Create data directory if it doesn't exist
        os.makedirs(data_dir, exist_ok=True)
        
        return {
            "sync_interval": int(os.environ.get("MEMORY_SYNC_INTERVAL", "300")),
            "cache_size": int(os.environ.get("MEMORY_CACHE_SIZE", "1000")),
            "cache_ttl": int(os.environ.get("MEMORY_CACHE_TTL", "3600")),
            "local_db_path": os.path.join(data_dir, "memory_cache.db"),
            "entity_half_life_days": float(os.environ.get("ENTITY_HALF_LIFE_DAYS", "30"))
        }
    
    @staticmethod
    def get_vector_search_config() -> Dict[str, Any]:
        """
        Get Vector Search configuration based on environment.
        
        Returns:
            Dict containing Vector Search configuration
        """
        return {
            "endpoint_id": os.environ.get("VECTOR_SEARCH_ENDPOINT_ID", ""),
            "deployed_index_id": os.environ.get("DEPLOYED_INDEX_ID", "vanasharedindex"),
            "project_id": os.environ.get("GOOGLE_CLOUD_PROJECT", ""),
            "location": os.environ.get("GOOGLE_CLOUD_LOCATION", "us-central1")
        }
    
    @staticmethod
    def get_n8n_config() -> Dict[str, str]:
        """
        Get n8n configuration based on environment.
        
        Returns:
            Dict containing n8n configuration
        """
        if EnvironmentConfig.is_development():
            # Use local n8n in development if available
            if os.environ.get("USE_LOCAL_N8N", "true").lower() == "true":
                return {
                    "webhook_url": "http://localhost:5678/webhook",
                    "api_url": "http://localhost:5678/api",
                    "username": "",
                    "password": ""
                }
        
        # Default to configuration from environment variables
        return {
            "webhook_url": os.environ.get("N8N_WEBHOOK_URL", ""),
            "api_url": os.environ.get("N8N_API_URL", ""),
            "username": os.environ.get("N8N_USERNAME", ""),
            "password": os.environ.get("N8N_PASSWORD", "")
        }
    
    @staticmethod
    def get_web_search_config() -> Dict[str, Any]:
        """
        Get Web Search configuration based on environment.
        
        Returns:
            Dict containing Web Search configuration
        """
        return {
            "api_key": os.environ.get("GOOGLE_SEARCH_API_KEY", ""),
            "cx": os.environ.get("GOOGLE_SEARCH_CX", ""),
            "max_results": int(os.environ.get("WEB_SEARCH_MAX_RESULTS", "5")),
            "web_weight": float(os.environ.get("WEB_SEARCH_WEIGHT", "0.3"))
        }
