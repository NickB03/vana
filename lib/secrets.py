import os
import logging
from typing import Optional
from google.cloud import secretmanager
from google.api_core import exceptions

logger = logging.getLogger(__name__)

class SecretManager:
    def __init__(self, project_id: Optional[str] = None):
        self.project_id = project_id or os.getenv('GOOGLE_CLOUD_PROJECT', 'analystai-454200')
        self.client = None
        
    def _get_client(self):
        """Lazy initialization of Secret Manager client"""
        if self.client is None:
            try:
                self.client = secretmanager.SecretManagerServiceClient()
            except Exception as e:
                logger.error(f"Failed to initialize Secret Manager client: {e}")
                raise
        return self.client
    
    def get_secret(self, secret_name: str, version: str = "latest") -> Optional[str]:
        """
        Retrieve secret from Google Secret Manager
        
        Args:
            secret_name: Name of the secret (e.g., 'brave-api-key')
            version: Version of the secret (default: 'latest')
            
        Returns:
            Secret value as string, or None if not found
        """
        try:
            client = self._get_client()
            name = f"projects/{self.project_id}/secrets/{secret_name}/versions/{version}"
            response = client.access_secret_version(request={"name": name})
            return response.payload.data.decode("UTF-8")
        except exceptions.NotFound:
            logger.error(f"Secret {secret_name} not found in project {self.project_id}")
            return None
        except Exception as e:
            logger.error(f"Error retrieving secret {secret_name}: {e}")
            return None

# Global instance for easy access
secret_manager = SecretManager()

def get_api_key(secret_name: str) -> Optional[str]:
    """
    Convenience function to get API keys from Secret Manager
    
    Args:
        secret_name: Name of the secret (e.g., 'brave-api-key', 'openrouter-api-key')
        
    Returns:
        API key as string, or None if not found
    """
    return secret_manager.get_secret(secret_name)
