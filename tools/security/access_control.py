"""
Access Control Framework for VANA

This module provides access control for memory operations in the VANA project.
It implements a permission model for different operations and roles.
"""

import os
import enum
import logging
import functools
from typing import Dict, List, Any, Optional, Callable, Set, Union

# Set up logging
logger = logging.getLogger(__name__)

class PermissionLevel(enum.Enum):
    """Permission levels for memory operations."""
    READ = 1
    WRITE = 2
    ADMIN = 3

class Operation(enum.Enum):
    """Operations that can be performed on memory."""
    # Read operations
    RETRIEVE_ENTITY = "retrieve_entity"
    SEARCH = "search"
    GET_RELATIONSHIPS = "get_relationships"
    
    # Write operations
    STORE_ENTITY = "store_entity"
    UPDATE_ENTITY = "update_entity"
    CREATE_RELATIONSHIP = "create_relationship"
    DELETE_ENTITY = "delete_entity"
    DELETE_RELATIONSHIP = "delete_relationship"
    
    # Admin operations
    PURGE_ENTITIES = "purge_entities"
    RESET_KNOWLEDGE_GRAPH = "reset_knowledge_graph"
    MODIFY_SCHEMA = "modify_schema"

class Role(enum.Enum):
    """Roles for memory access."""
    GUEST = "guest"
    USER = "user"
    AGENT = "agent"
    ADMIN = "admin"

class AccessControlManager:
    """
    Access Control Manager for memory operations.
    
    This class provides access control for memory operations based on roles
    and permissions.
    """
    
    def __init__(self):
        """Initialize the access control manager."""
        # Define role permissions
        self.role_permissions = {
            Role.GUEST: {PermissionLevel.READ},
            Role.USER: {PermissionLevel.READ, PermissionLevel.WRITE},
            Role.AGENT: {PermissionLevel.READ, PermissionLevel.WRITE},
            Role.ADMIN: {PermissionLevel.READ, PermissionLevel.WRITE, PermissionLevel.ADMIN}
        }
        
        # Define operation permissions
        self.operation_permissions = {
            # Read operations
            Operation.RETRIEVE_ENTITY: PermissionLevel.READ,
            Operation.SEARCH: PermissionLevel.READ,
            Operation.GET_RELATIONSHIPS: PermissionLevel.READ,
            
            # Write operations
            Operation.STORE_ENTITY: PermissionLevel.WRITE,
            Operation.UPDATE_ENTITY: PermissionLevel.WRITE,
            Operation.CREATE_RELATIONSHIP: PermissionLevel.WRITE,
            Operation.DELETE_ENTITY: PermissionLevel.WRITE,
            Operation.DELETE_RELATIONSHIP: PermissionLevel.WRITE,
            
            # Admin operations
            Operation.PURGE_ENTITIES: PermissionLevel.ADMIN,
            Operation.RESET_KNOWLEDGE_GRAPH: PermissionLevel.ADMIN,
            Operation.MODIFY_SCHEMA: PermissionLevel.ADMIN
        }
        
        # Entity type restrictions
        self.entity_type_restrictions = {
            Role.GUEST: {"public", "documentation", "knowledge"},
            Role.USER: {"public", "documentation", "knowledge", "user", "project"},
            Role.AGENT: {"public", "documentation", "knowledge", "user", "project", "agent"},
            Role.ADMIN: set()  # No restrictions for admin
        }
        
        logger.info("Access Control Manager initialized")
    
    def has_permission(self, role: Union[Role, str], operation: Union[Operation, str]) -> bool:
        """
        Check if a role has permission for an operation.
        
        Args:
            role: Role to check
            operation: Operation to check
            
        Returns:
            True if the role has permission, False otherwise
        """
        # Convert string role to enum if needed
        if isinstance(role, str):
            try:
                role = Role(role)
            except ValueError:
                logger.warning(f"Invalid role: {role}")
                return False
        
        # Convert string operation to enum if needed
        if isinstance(operation, str):
            try:
                operation = Operation(operation)
            except ValueError:
                logger.warning(f"Invalid operation: {operation}")
                return False
        
        # Get the permission level required for the operation
        required_permission = self.operation_permissions.get(operation)
        if not required_permission:
            logger.warning(f"Unknown operation: {operation}")
            return False
        
        # Check if the role has the required permission
        role_permissions = self.role_permissions.get(role, set())
        has_permission = required_permission in role_permissions
        
        if not has_permission:
            logger.warning(f"Role {role.value} does not have permission for operation {operation.value}")
        
        return has_permission
    
    def can_access_entity_type(self, role: Union[Role, str], entity_type: str) -> bool:
        """
        Check if a role can access an entity type.
        
        Args:
            role: Role to check
            entity_type: Entity type to check
            
        Returns:
            True if the role can access the entity type, False otherwise
        """
        # Convert string role to enum if needed
        if isinstance(role, str):
            try:
                role = Role(role)
            except ValueError:
                logger.warning(f"Invalid role: {role}")
                return False
        
        # Get the entity type restrictions for the role
        restricted_types = self.entity_type_restrictions.get(role, set())
        
        # If there are no restrictions, allow access
        if not restricted_types:
            return True
        
        # Check if the entity type is allowed
        entity_type_lower = entity_type.lower()
        for allowed_type in restricted_types:
            if allowed_type.lower() in entity_type_lower:
                return True
        
        logger.warning(f"Role {role.value} cannot access entity type {entity_type}")
        return False
    
    def authorize(self, role: Union[Role, str], operation: Union[Operation, str], 
                entity_type: Optional[str] = None) -> bool:
        """
        Authorize an operation for a role.
        
        Args:
            role: Role to authorize
            operation: Operation to authorize
            entity_type: Optional entity type to check access for
            
        Returns:
            True if authorized, False otherwise
        """
        # Check operation permission
        if not self.has_permission(role, operation):
            return False
        
        # Check entity type access if provided
        if entity_type and not self.can_access_entity_type(role, entity_type):
            return False
        
        return True

def require_permission(operation: Union[Operation, str], entity_type_arg: Optional[str] = None):
    """
    Decorator to require permission for an operation.
    
    Args:
        operation: Operation to require permission for
        entity_type_arg: Name of the argument that contains the entity type
        
    Returns:
        Decorator function
    """
    def decorator(func):
        @functools.wraps(func)
        def wrapper(self, *args, **kwargs):
            # Get the access control manager
            if hasattr(self, 'access_control'):
                acm = self.access_control
            else:
                # Create a new access control manager if not available
                acm = AccessControlManager()
            
            # Get the role
            role = getattr(self, 'role', Role.AGENT)
            
            # Get the entity type if specified
            entity_type = None
            if entity_type_arg:
                if entity_type_arg in kwargs:
                    entity_type = kwargs[entity_type_arg]
                elif len(args) > 0:
                    # Assume the first argument is the entity type
                    entity_type = args[0]
            
            # Check authorization
            if not acm.authorize(role, operation, entity_type):
                logger.warning(f"Access denied: {role} cannot perform {operation} on {entity_type}")
                return {"error": "Access denied", "success": False}
            
            # Call the original function
            return func(self, *args, **kwargs)
        return wrapper
    return decorator
