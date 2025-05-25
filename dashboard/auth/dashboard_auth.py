#!/usr/bin/env python3
"""
Dashboard Authentication Module

This module provides authentication for the dashboard.
It includes:
- Basic authentication with username/password
- Token-based authentication
- API key authentication for programmatic access
- Role-based access control
- Audit logging for authentication events
"""

import os
import time
import json
import logging
import hashlib
import secrets
import functools
from typing import Dict, List, Any, Optional, Callable, Union
from datetime import datetime, timedelta
from pathlib import Path
from flask import request, Response, redirect, url_for, session, current_app, jsonify

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Default credentials file location
DEFAULT_CREDENTIALS_FILE = "dashboard/auth/credentials.json"

# Default audit log location
DEFAULT_AUDIT_LOG_FILE = "logs/audit/dashboard_auth.log"

# Default API keys file location
DEFAULT_API_KEYS_FILE = "dashboard/auth/api_keys.json"

class DashboardAuth:
    """Dashboard Authentication Manager"""

    def __init__(
        self,
        credentials_file: str = DEFAULT_CREDENTIALS_FILE,
        audit_log_file: str = DEFAULT_AUDIT_LOG_FILE,
        api_keys_file: str = DEFAULT_API_KEYS_FILE,
        token_expiry: int = 86400,  # 24 hours
        enable_audit: bool = True,
        credentials_data: Optional[Dict[str, Any]] = None
    ):
        """
        Initialize the authentication manager

        Args:
            credentials_file: Path to credentials file
            audit_log_file: Path to audit log file
            api_keys_file: Path to API keys file
            token_expiry: Token expiry time in seconds
            enable_audit: Whether to enable audit logging
            credentials_data: Optional credentials data to use instead of loading from file
        """
        self.credentials_file = credentials_file
        self.audit_log_file = audit_log_file
        self.api_keys_file = api_keys_file
        self.token_expiry = token_expiry
        self.enable_audit = enable_audit
        self.credentials_data = credentials_data

        # Active tokens
        self.active_tokens = {}

        # Load credentials
        self.credentials = self._load_credentials()

        # Load API keys
        self.api_keys = self._load_api_keys()

        # Set up audit logging
        if self.enable_audit:
            self._setup_audit_logging()

    def _load_credentials(self) -> Dict[str, Dict[str, Any]]:
        """
        Load credentials from file or use provided credentials data

        Returns:
            Dictionary of credentials
        """
        # If credentials data was provided directly, use it
        if self.credentials_data and "users" in self.credentials_data:
            logger.info("Using provided credentials data")
            return self.credentials_data["users"]

        try:
            if os.path.exists(self.credentials_file):
                with open(self.credentials_file, 'r') as f:
                    return json.load(f)
            else:
                # Create default credentials if file doesn't exist
                default_credentials = {
                    "admin": {
                        "password_hash": self._hash_password("admin"),
                        "roles": ["admin"],
                        "created_at": datetime.now().isoformat()
                    }
                }

                # Create directory if it doesn't exist
                os.makedirs(os.path.dirname(self.credentials_file), exist_ok=True)

                # Save default credentials
                with open(self.credentials_file, 'w') as f:
                    json.dump(default_credentials, f, indent=2)

                logger.warning(f"Created default credentials file at {self.credentials_file}")
                logger.warning("Default username: admin, password: admin")
                logger.warning("Please change the default password immediately!")

                return default_credentials
        except Exception as e:
            logger.error(f"Error loading credentials: {e}")
            return {}

    def _load_api_keys(self) -> Dict[str, Dict[str, Any]]:
        """
        Load API keys from file

        Returns:
            Dictionary of API keys
        """
        try:
            if os.path.exists(self.api_keys_file):
                with open(self.api_keys_file, 'r') as f:
                    return json.load(f)
            else:
                # Create default API keys if file doesn't exist
                default_api_key = secrets.token_hex(16)
                default_api_keys = {
                    default_api_key: {
                        "name": "Default API Key",
                        "roles": ["api"],
                        "created_at": datetime.now().isoformat(),
                        "created_by": "system"
                    }
                }

                # Create directory if it doesn't exist
                os.makedirs(os.path.dirname(self.api_keys_file), exist_ok=True)

                # Save default API keys
                with open(self.api_keys_file, 'w') as f:
                    json.dump(default_api_keys, f, indent=2)

                logger.warning(f"Created default API keys file at {self.api_keys_file}")
                logger.warning(f"Default API key: {default_api_key}")
                logger.warning("Please create a secure API key for production use!")

                return default_api_keys
        except Exception as e:
            logger.error(f"Error loading API keys: {e}")
            return {}

    def _setup_audit_logging(self) -> None:
        """Set up audit logging"""
        try:
            # Create directory if it doesn't exist
            os.makedirs(os.path.dirname(self.audit_log_file), exist_ok=True)

            # Set up file handler
            audit_handler = logging.FileHandler(self.audit_log_file)
            audit_handler.setLevel(logging.INFO)

            # Set up formatter
            formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
            audit_handler.setFormatter(formatter)

            # Create logger
            self.audit_logger = logging.getLogger("dashboard_auth_audit")
            self.audit_logger.setLevel(logging.INFO)
            self.audit_logger.addHandler(audit_handler)

            logger.info(f"Audit logging enabled to {self.audit_log_file}")
        except Exception as e:
            logger.error(f"Error setting up audit logging: {e}")
            self.enable_audit = False

    def _hash_password(self, password: str) -> str:
        """
        Hash a password

        Args:
            password: Password to hash

        Returns:
            Hashed password
        """
        return hashlib.sha256(password.encode()).hexdigest()

    def _audit_log(self, event: str, username: str, success: bool, details: Optional[Dict[str, Any]] = None) -> None:
        """
        Log an audit event

        Args:
            event: Event type
            username: Username
            success: Whether the event was successful
            details: Additional details
        """
        if not self.enable_audit:
            return

        try:
            # Create audit log entry
            entry = {
                "timestamp": datetime.now().isoformat(),
                "event": event,
                "username": username,
                "success": success,
                "ip": request.remote_addr if request else "unknown",
                "user_agent": request.user_agent.string if request and request.user_agent else "unknown",
                "details": details or {}
            }

            # Log the entry
            self.audit_logger.info(json.dumps(entry))
        except Exception as e:
            logger.error(f"Error logging audit event: {e}")

    def authenticate(self, username: str, password: str) -> bool:
        """
        Authenticate a user

        Args:
            username: Username
            password: Password

        Returns:
            True if authentication is successful, False otherwise
        """
        # Check if user exists
        if username not in self.credentials:
            self._audit_log("login", username, False, {"reason": "user_not_found"})
            return False

        # Check password
        password_hash = self._hash_password(password)
        if password_hash != self.credentials[username]["password_hash"]:
            self._audit_log("login", username, False, {"reason": "invalid_password"})
            return False

        # Authentication successful
        self._audit_log("login", username, True)
        return True

    def generate_token(self, username: str) -> str:
        """
        Generate an authentication token

        Args:
            username: Username

        Returns:
            Authentication token
        """
        # Generate token
        token = secrets.token_hex(32)

        # Store token
        self.active_tokens[token] = {
            "username": username,
            "created_at": datetime.now().isoformat(),
            "expires_at": (datetime.now() + timedelta(seconds=self.token_expiry)).isoformat(),
            "roles": self.credentials[username]["roles"]
        }

        # Log token generation
        self._audit_log("token_generated", username, True)

        return token

    def validate_token(self, token: str) -> Optional[Dict[str, Any]]:
        """
        Validate an authentication token

        Args:
            token: Authentication token

        Returns:
            Token data if valid, None otherwise
        """
        # Check if token exists
        if token not in self.active_tokens:
            return None

        # Get token data
        token_data = self.active_tokens[token]

        # Check if token has expired
        expires_at = datetime.fromisoformat(token_data["expires_at"])
        if datetime.now() > expires_at:
            # Remove expired token
            del self.active_tokens[token]
            self._audit_log("token_expired", token_data["username"], False)
            return None

        return token_data

    def revoke_token(self, token: str) -> bool:
        """
        Revoke an authentication token

        Args:
            token: Authentication token

        Returns:
            True if token was revoked, False otherwise
        """
        # Check if token exists
        if token not in self.active_tokens:
            return False

        # Get username for audit log
        username = self.active_tokens[token]["username"]

        # Remove token
        del self.active_tokens[token]

        # Log token revocation
        self._audit_log("token_revoked", username, True)

        return True

    def has_role(self, username: str, role: str) -> bool:
        """
        Check if a user has a specific role

        Args:
            username: Username
            role: Role to check

        Returns:
            True if user has the role, False otherwise
        """
        # Check if user exists
        if username not in self.credentials:
            return False

        # Check if user has the role
        return role in self.credentials[username]["roles"]

    def change_password(self, username: str, new_password: str) -> bool:
        """
        Change a user's password

        Args:
            username: Username
            new_password: New password

        Returns:
            True if password was changed, False otherwise
        """
        # Check if user exists
        if username not in self.credentials:
            self._audit_log("password_change", username, False, {"reason": "user_not_found"})
            return False

        # Update password
        self.credentials[username]["password_hash"] = self._hash_password(new_password)

        # Save credentials
        try:
            with open(self.credentials_file, 'w') as f:
                json.dump(self.credentials, f, indent=2)

            # Log password change
            self._audit_log("password_change", username, True)

            return True
        except Exception as e:
            logger.error(f"Error saving credentials: {e}")
            self._audit_log("password_change", username, False, {"reason": str(e)})
            return False

    def validate_api_key(self, api_key: str) -> Optional[Dict[str, Any]]:
        """
        Validate an API key

        Args:
            api_key: API key to validate

        Returns:
            API key data if valid, None otherwise
        """
        # Check if API key exists
        if api_key not in self.api_keys:
            self._audit_log("api_key_validation", "unknown", False, {"reason": "invalid_api_key"})
            return None

        # Get API key data
        api_key_data = self.api_keys[api_key]

        # Check if API key has expired (if expiry is set)
        if "expires_at" in api_key_data:
            expires_at = datetime.fromisoformat(api_key_data["expires_at"])
            if datetime.now() > expires_at:
                self._audit_log("api_key_validation", api_key_data.get("name", "unknown"), False, {"reason": "expired_api_key"})
                return None

        # API key is valid
        self._audit_log("api_key_validation", api_key_data.get("name", "unknown"), True)

        return api_key_data

    def create_api_key(self, name: str, roles: List[str], created_by: str, expires_in_days: Optional[int] = None) -> str:
        """
        Create a new API key

        Args:
            name: Name of the API key
            roles: Roles to assign to the API key
            created_by: Username of the user creating the API key
            expires_in_days: Number of days until the API key expires (None for no expiry)

        Returns:
            The new API key
        """
        # Generate API key
        api_key = secrets.token_hex(32)

        # Create API key data
        api_key_data = {
            "name": name,
            "roles": roles,
            "created_at": datetime.now().isoformat(),
            "created_by": created_by
        }

        # Add expiry if specified
        if expires_in_days is not None:
            api_key_data["expires_at"] = (datetime.now() + timedelta(days=expires_in_days)).isoformat()

        # Add API key to dictionary
        self.api_keys[api_key] = api_key_data

        # Save API keys
        try:
            with open(self.api_keys_file, 'w') as f:
                json.dump(self.api_keys, f, indent=2)

            # Log API key creation
            self._audit_log("api_key_created", created_by, True, {"api_key_name": name})

            return api_key
        except Exception as e:
            logger.error(f"Error saving API keys: {e}")
            self._audit_log("api_key_created", created_by, False, {"reason": str(e)})
            return ""

    def revoke_api_key(self, api_key: str) -> bool:
        """
        Revoke an API key

        Args:
            api_key: API key to revoke

        Returns:
            True if API key was revoked, False otherwise
        """
        # Check if API key exists
        if api_key not in self.api_keys:
            return False

        # Get API key name for audit log
        api_key_name = self.api_keys[api_key].get("name", "unknown")

        # Remove API key
        del self.api_keys[api_key]

        # Save API keys
        try:
            with open(self.api_keys_file, 'w') as f:
                json.dump(self.api_keys, f, indent=2)

            # Log API key revocation
            self._audit_log("api_key_revoked", api_key_name, True)

            return True
        except Exception as e:
            logger.error(f"Error saving API keys: {e}")
            self._audit_log("api_key_revoked", api_key_name, False, {"reason": str(e)})
            return False

# Flask authentication decorator
def requires_auth(roles: Optional[List[str]] = None):
    """
    Decorator for routes that require authentication

    Args:
        roles: List of required roles (if None, any authenticated user is allowed)
    """
    def decorator(f):
        @functools.wraps(f)
        def decorated(*args, **kwargs):
            auth = current_app.config.get('AUTH_MANAGER')

            # Check if authentication is enabled
            if not auth:
                return f(*args, **kwargs)

            # First, check for API key authentication
            api_key = request.headers.get('X-API-Key')
            if api_key:
                # Validate API key
                api_key_data = auth.validate_api_key(api_key)
                if not api_key_data:
                    return jsonify({"error": "Invalid API key"}), 401

                # Check roles if specified
                if roles:
                    api_key_roles = api_key_data.get('roles', [])
                    if not any(role in api_key_roles for role in roles):
                        return jsonify({"error": "Insufficient permissions"}), 403

                # API key authentication successful
                return f(*args, **kwargs)

            # If no API key, check for session-based authentication
            token = session.get('auth_token')
            if not token:
                # If this is an API request (Accept: application/json), return JSON error
                if request.headers.get('Accept') == 'application/json':
                    return jsonify({"error": "Authentication required"}), 401
                # Otherwise redirect to login page
                return redirect(url_for('auth.login', next=request.url))

            # Validate token
            token_data = auth.validate_token(token)
            if not token_data:
                # If this is an API request, return JSON error
                if request.headers.get('Accept') == 'application/json':
                    return jsonify({"error": "Invalid or expired token"}), 401
                # Otherwise redirect to login page
                return redirect(url_for('auth.login', next=request.url))

            # Check roles if specified
            if roles:
                user_roles = token_data.get('roles', [])
                if not any(role in user_roles for role in roles):
                    # If this is an API request, return JSON error
                    if request.headers.get('Accept') == 'application/json':
                        return jsonify({"error": "Insufficient permissions"}), 403
                    # Otherwise return 403 response
                    return Response('Unauthorized', 403)

            # Authentication successful
            return f(*args, **kwargs)
        return decorated
    return decorator
