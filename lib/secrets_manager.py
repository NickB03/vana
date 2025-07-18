"""
Secure Secret Management for VANA
Handles API keys and secrets for both local development and Cloud Run deployment
"""

import os
import logging
from typing import Optional, Dict, Any
from functools import lru_cache

logger = logging.getLogger(__name__)


class SecretManager:
    """Manages secrets across different environments"""
    
    @staticmethod
    def is_cloud_run() -> bool:
        """Check if running on Cloud Run"""
        return bool(os.getenv('K_SERVICE'))
    
    @staticmethod
    def is_production() -> bool:
        """Check if running in production"""
        return os.getenv('ENVIRONMENT', 'development').lower() == 'production'
    
    @staticmethod
    @lru_cache(maxsize=128)
    def get_secret(key: str, default: Optional[str] = None) -> Optional[str]:
        """
        Get secret value with fallback chain:
        1. Environment variable
        2. Google Secret Manager (if on Cloud Run)
        3. Default value
        
        Args:
            key: Secret key name
            default: Default value if secret not found
            
        Returns:
            Secret value or default
        """
        # First try environment variable
        value = os.getenv(key)
        if value:
            return value
        
        # In production on Cloud Run, try Secret Manager
        if SecretManager.is_cloud_run() and SecretManager.is_production():
            try:
                from google.cloud import secretmanager
                
                client = secretmanager.SecretManagerServiceClient()
                project_id = os.getenv('GOOGLE_CLOUD_PROJECT')
                
                # Convert key to secret name (e.g., GOOGLE_API_KEY -> google-api-key)
                secret_name = key.lower().replace('_', '-')
                name = f"projects/{project_id}/secrets/{secret_name}/versions/latest"
                
                response = client.access_secret_version(request={"name": name})
                return response.payload.data.decode("UTF-8")
                
            except Exception as e:
                logger.warning(f"Failed to fetch secret {key} from Secret Manager: {e}")
                # Fall through to default
        
        # Return default if provided
        if default is not None:
            return default
        
        # For required secrets, raise error in production
        if SecretManager.is_production():
            raise ValueError(f"Required secret {key} not found")
        
        # In development, return empty string
        logger.warning(f"Secret {key} not found, using empty string (development mode)")
        return ""
    
    @staticmethod
    def get_all_secrets() -> Dict[str, Any]:
        """
        Get all required secrets for VANA
        
        Returns:
            Dictionary of secret values
        """
        return {
            'google_api_key': SecretManager.get_secret('GOOGLE_API_KEY'),
            'google_cloud_project': SecretManager.get_secret('GOOGLE_CLOUD_PROJECT', 'analystai-454200'),
            'vana_model': SecretManager.get_secret('VANA_MODEL', 'gemini-2.0-flash'),
            'environment': SecretManager.get_secret('ENVIRONMENT', 'development'),
            'port': int(SecretManager.get_secret('PORT', '8081')),
            
            # ADK is now the default - no feature flags needed
            
            # Optional services
            'google_cse_id': SecretManager.get_secret('GOOGLE_CSE_ID', ''),
            'google_search_api_key': SecretManager.get_secret('GOOGLE_SEARCH_API_KEY', ''),
        }
    
    @staticmethod
    def validate_secrets() -> bool:
        """
        Validate that all required secrets are present
        
        Returns:
            True if all required secrets are present
        """
        required = ['GOOGLE_API_KEY']
        missing = []
        
        for key in required:
            if not SecretManager.get_secret(key):
                missing.append(key)
        
        if missing:
            logger.error(f"Missing required secrets: {missing}")
            return False
        
        logger.info("All required secrets validated successfully")
        return True


# Convenience functions
get_secret = SecretManager.get_secret
get_all_secrets = SecretManager.get_all_secrets
validate_secrets = SecretManager.validate_secrets
is_cloud_run = SecretManager.is_cloud_run
is_production = SecretManager.is_production