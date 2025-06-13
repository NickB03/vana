"""
Credential Manager for VANA

This module provides secure credential management for the VANA project.
It handles encryption/decryption of API keys and sensitive information,
and provides a secure interface for accessing credentials.
"""

import base64
import hashlib
import json
import logging
import os
from typing import Any, Dict, Optional

from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from dotenv import load_dotenv

# Set up logging with sensitive data protection
logger = logging.getLogger(__name__)


class CredentialManager:
    """
    Secure credential manager for VANA.

    This class provides secure storage and retrieval of credentials,
    with encryption for sensitive values and secure logging.
    """

    def __init__(self, master_key: Optional[str] = None):
        """
        Initialize the credential manager.

        Args:
            master_key: Optional master key for encryption. If not provided,
                        will use VANA_MASTER_KEY environment variable or generate one.
        """
        # Load environment variables
        load_dotenv()

        # Initialize encryption key
        self.master_key = master_key or os.environ.get("VANA_MASTER_KEY")
        if not self.master_key:
            # Generate a master key if none exists
            self.master_key = self._generate_master_key()
            logger.info("Generated new master key for credential encryption")

        # Initialize Fernet cipher
        self.cipher = self._initialize_cipher()

        # Cache for decrypted credentials
        self._credential_cache = {}

        logger.info("Credential Manager initialized")

    def _generate_master_key(self) -> str:
        """
        Generate a new master key.

        Returns:
            Base64-encoded master key
        """
        key = Fernet.generate_key()
        return key.decode("utf-8")

    def _initialize_cipher(self) -> Fernet:
        """
        Initialize the Fernet cipher for encryption/decryption.

        Returns:
            Fernet cipher
        """
        key_bytes = self.master_key.encode("utf-8")

        # If the key is not in the correct format, derive a proper key
        if len(base64.b64decode(key_bytes)) != 32:
            salt = b"vana_credential_manager"  # Fixed salt
            kdf = PBKDF2HMAC(
                algorithm=hashes.SHA256(),
                length=32,
                salt=salt,
                iterations=100000,
            )
            key = base64.urlsafe_b64encode(kdf.derive(key_bytes))
        else:
            key = key_bytes

        return Fernet(key)

    def encrypt(self, value: str) -> str:
        """
        Encrypt a value.

        Args:
            value: Value to encrypt

        Returns:
            Encrypted value as a string
        """
        if not value:
            return ""

        encrypted = self.cipher.encrypt(value.encode("utf-8"))
        return encrypted.decode("utf-8")

    def decrypt(self, encrypted_value: str) -> str:
        """
        Decrypt a value.

        Args:
            encrypted_value: Encrypted value to decrypt

        Returns:
            Decrypted value
        """
        if not encrypted_value:
            return ""

        decrypted = self.cipher.decrypt(encrypted_value.encode("utf-8"))
        return decrypted.decode("utf-8")

    def get_credential(self, key: str, default: Optional[str] = None) -> str:
        """
        Get a credential by key.

        This method first checks if the credential is available as an encrypted
        environment variable (KEY_ENCRYPTED), then as a regular environment
        variable, and finally falls back to the default value.

        Args:
            key: Credential key
            default: Default value if credential is not found

        Returns:
            Credential value
        """
        # Check cache first
        if key in self._credential_cache:
            return self._credential_cache[key]

        # Check for encrypted environment variable
        encrypted_key = f"{key}_ENCRYPTED"
        encrypted_value = os.environ.get(encrypted_key)

        if encrypted_value:
            # Decrypt the value
            value = self.decrypt(encrypted_value)
            self._credential_cache[key] = value
            logger.debug(f"Retrieved encrypted credential: {self._mask_credential_key(key)}")
            return value

        # Check for regular environment variable
        value = os.environ.get(key, default)
        if value:
            self._credential_cache[key] = value
            logger.debug(f"Retrieved unencrypted credential: {self._mask_credential_key(key)}")
            return value

        logger.warning(f"Credential not found: {self._mask_credential_key(key)}")
        return default or ""

    def store_credential(self, key: str, value: str, encrypt: bool = True) -> bool:
        """
        Store a credential securely.

        This method stores a credential in the local cache and optionally
        encrypts it for persistent storage.

        Args:
            key: Credential key
            value: Credential value
            encrypt: Whether to encrypt the value

        Returns:
            True if successful, False otherwise
        """
        try:
            # Store in cache
            self._credential_cache[key] = value

            # Return the encrypted value for persistent storage
            if encrypt:
                encrypted_value = self.encrypt(value)
                logger.debug(f"Stored encrypted credential: {self._mask_credential_key(key)}")
                return encrypted_value

            logger.debug(f"Stored unencrypted credential: {self._mask_credential_key(key)}")
            return value
        except Exception as e:
            logger.error(f"Error storing credential: {str(e)}")
            return False

    def clear_cache(self) -> None:
        """Clear the credential cache."""
        self._credential_cache.clear()
        logger.debug("Credential cache cleared")

    def _mask_credential_key(self, key: str) -> str:
        """
        Mask a credential key for logging.

        Args:
            key: Credential key

        Returns:
            Masked key
        """
        # Don't mask non-sensitive keys
        non_sensitive_keys = ["ENDPOINT", "URL", "HOST", "PORT", "NAMESPACE"]
        for safe_key in non_sensitive_keys:
            if safe_key in key:
                return key

        # Mask sensitive keys
        return f"{key[:3]}***{key[-2:]}" if len(key) > 5 else "***"

    def get_mcp_credentials(self) -> Dict[str, str]:
        """
        Get MCP credentials.

        Returns:
            Dictionary with MCP credentials
        """
        return {
            "endpoint": self.get_credential("MCP_ENDPOINT", "https://mcp.community.augment.co"),
            "namespace": self.get_credential("MCP_NAMESPACE", "vana-project"),
            "api_key": self.get_credential("MCP_API_KEY", ""),
        }

    def get_vector_search_credentials(self) -> Dict[str, str]:
        """
        Get Vector Search credentials.

        Returns:
            Dictionary with Vector Search credentials
        """
        return {
            "project_id": self.get_credential("GOOGLE_CLOUD_PROJECT", ""),
            "location": self.get_credential("GOOGLE_CLOUD_LOCATION", "us-central1"),
            "endpoint_id": self.get_credential("VECTOR_SEARCH_ENDPOINT_ID", ""),
            "deployed_index_id": self.get_credential("DEPLOYED_INDEX_ID", "vanasharedindex"),
        }

    def get_web_search_credentials(self) -> Dict[str, str]:
        """
        Get Web Search credentials.

        Returns:
            Dictionary with Web Search credentials
        """
        return {
            "api_key": self.get_credential("GOOGLE_SEARCH_API_KEY", ""),
            "engine_id": self.get_credential("GOOGLE_SEARCH_ENGINE_ID", ""),
        }
