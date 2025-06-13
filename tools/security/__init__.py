"""
Security module for VANA project.

This module provides security-related functionality including:
- Credential management
- Access control
- Audit logging
"""

from .access_control import AccessControlManager, Operation, PermissionLevel, Role
from .audit_logger import AuditLogger
from .credential_manager import CredentialManager

# Alias for backward compatibility
AccessControl = AccessControlManager

__all__ = [
    "CredentialManager",
    "AccessControl",
    "AccessControlManager",
    "AuditLogger",
    "Role",
    "Operation",
    "PermissionLevel",
]
