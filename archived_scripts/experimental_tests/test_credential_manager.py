"""
Test Credential Manager

This module tests the credential manager functionality.
"""

import os
import sys
import unittest
from unittest.mock import patch, MagicMock
import tempfile

# Add the project root to the Python path
sys.path.insert(0, os.path.abspath(os.path.dirname(os.path.dirname(__file__))))

from tools.security.credential_manager import CredentialManager

class TestCredentialManager(unittest.TestCase):
    """Test cases for the Credential Manager."""
    
    def setUp(self):
        """Set up test environment."""
        # Create a test master key
        self.test_master_key = "dGVzdF9tYXN0ZXJfa2V5X2Zvcl9jcmVkZW50aWFsX21hbmFnZXJfdGVzdHM="
        
        # Create a credential manager with the test key
        self.credential_manager = CredentialManager(master_key=self.test_master_key)
    
    def test_encryption_decryption(self):
        """Test encryption and decryption of values."""
        # Test value
        test_value = "test_api_key_12345"
        
        # Encrypt the value
        encrypted = self.credential_manager.encrypt(test_value)
        
        # Verify the encrypted value is different from the original
        self.assertNotEqual(encrypted, test_value)
        
        # Decrypt the value
        decrypted = self.credential_manager.decrypt(encrypted)
        
        # Verify the decrypted value matches the original
        self.assertEqual(decrypted, test_value)
    
    @patch.dict(os.environ, {"TEST_API_KEY": "test_value_123"})
    def test_get_credential_from_env(self):
        """Test getting a credential from environment variables."""
        # Get the credential
        value = self.credential_manager.get_credential("TEST_API_KEY")
        
        # Verify the value
        self.assertEqual(value, "test_value_123")
    
    @patch.dict(os.environ, {"TEST_API_KEY_ENCRYPTED": ""})
    def test_get_credential_with_default(self):
        """Test getting a credential with a default value."""
        # Get the credential with a default value
        value = self.credential_manager.get_credential("TEST_API_KEY", default="default_value")
        
        # Verify the default value is returned
        self.assertEqual(value, "default_value")
    
    def test_store_and_retrieve_credential(self):
        """Test storing and retrieving a credential."""
        # Store a credential
        encrypted = self.credential_manager.store_credential("TEST_CRED", "test_value_456", encrypt=True)
        
        # Verify the credential is encrypted
        self.assertNotEqual(encrypted, "test_value_456")
        
        # Retrieve the credential from cache
        value = self.credential_manager.get_credential("TEST_CRED")
        
        # Verify the value
        self.assertEqual(value, "test_value_456")
    
    def test_clear_cache(self):
        """Test clearing the credential cache."""
        # Store a credential
        self.credential_manager.store_credential("TEST_CACHE", "test_cache_value")
        
        # Verify it's in the cache
        self.assertIn("TEST_CACHE", self.credential_manager._credential_cache)
        
        # Clear the cache
        self.credential_manager.clear_cache()
        
        # Verify the cache is empty
        self.assertEqual(len(self.credential_manager._credential_cache), 0)
    
    @patch.dict(os.environ, {
        "MCP_ENDPOINT": "https://test.mcp.server",
        "MCP_NAMESPACE": "test-namespace",
        "MCP_API_KEY": "test-api-key"
    })
    def test_get_mcp_credentials(self):
        """Test getting MCP credentials."""
        # Get MCP credentials
        credentials = self.credential_manager.get_mcp_credentials()
        
        # Verify the credentials
        self.assertEqual(credentials["endpoint"], "https://test.mcp.server")
        self.assertEqual(credentials["namespace"], "test-namespace")
        self.assertEqual(credentials["api_key"], "test-api-key")
    
    def test_mask_credential_key(self):
        """Test masking credential keys for logging."""
        # Test with a sensitive key
        masked = self.credential_manager._mask_credential_key("API_KEY")
        self.assertEqual(masked, "API***EY")
        
        # Test with a non-sensitive key
        masked = self.credential_manager._mask_credential_key("MCP_ENDPOINT")
        self.assertEqual(masked, "MCP_ENDPOINT")

if __name__ == "__main__":
    unittest.main()
