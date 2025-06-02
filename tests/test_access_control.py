"""
Test Access Control Framework

This module tests the access control framework functionality.
"""

import os
import sys
import unittest

# Add the project root to the Python path
sys.path.insert(0, os.path.abspath(os.path.dirname(os.path.dirname(__file__))))

from tools.security.access_control import (
    AccessControlManager,
    Operation,
    PermissionLevel,
    Role,
    require_permission,
)


class TestAccessControl(unittest.TestCase):
    """Test cases for the Access Control Framework."""

    def setUp(self):
        """Set up test environment."""
        self.acm = AccessControlManager()

    def test_role_permissions(self):
        """Test role permissions."""
        # Test guest permissions
        self.assertIn(PermissionLevel.READ, self.acm.role_permissions[Role.GUEST])
        self.assertNotIn(PermissionLevel.WRITE, self.acm.role_permissions[Role.GUEST])
        self.assertNotIn(PermissionLevel.ADMIN, self.acm.role_permissions[Role.GUEST])

        # Test user permissions
        self.assertIn(PermissionLevel.READ, self.acm.role_permissions[Role.USER])
        self.assertIn(PermissionLevel.WRITE, self.acm.role_permissions[Role.USER])
        self.assertNotIn(PermissionLevel.ADMIN, self.acm.role_permissions[Role.USER])

        # Test admin permissions
        self.assertIn(PermissionLevel.READ, self.acm.role_permissions[Role.ADMIN])
        self.assertIn(PermissionLevel.WRITE, self.acm.role_permissions[Role.ADMIN])
        self.assertIn(PermissionLevel.ADMIN, self.acm.role_permissions[Role.ADMIN])

    def test_operation_permissions(self):
        """Test operation permissions."""
        # Test read operations
        self.assertEqual(
            self.acm.operation_permissions[Operation.RETRIEVE_ENTITY],
            PermissionLevel.READ,
        )
        self.assertEqual(
            self.acm.operation_permissions[Operation.SEARCH], PermissionLevel.READ
        )

        # Test write operations
        self.assertEqual(
            self.acm.operation_permissions[Operation.STORE_ENTITY],
            PermissionLevel.WRITE,
        )
        self.assertEqual(
            self.acm.operation_permissions[Operation.CREATE_RELATIONSHIP],
            PermissionLevel.WRITE,
        )

        # Test admin operations
        self.assertEqual(
            self.acm.operation_permissions[Operation.PURGE_ENTITIES],
            PermissionLevel.ADMIN,
        )
        self.assertEqual(
            self.acm.operation_permissions[Operation.RESET_KNOWLEDGE_GRAPH],
            PermissionLevel.ADMIN,
        )

    def test_has_permission(self):
        """Test permission checking."""
        # Test guest permissions
        self.assertTrue(self.acm.has_permission(Role.GUEST, Operation.RETRIEVE_ENTITY))
        self.assertFalse(self.acm.has_permission(Role.GUEST, Operation.STORE_ENTITY))

        # Test user permissions
        self.assertTrue(self.acm.has_permission(Role.USER, Operation.RETRIEVE_ENTITY))
        self.assertTrue(self.acm.has_permission(Role.USER, Operation.STORE_ENTITY))
        self.assertFalse(self.acm.has_permission(Role.USER, Operation.PURGE_ENTITIES))

        # Test admin permissions
        self.assertTrue(self.acm.has_permission(Role.ADMIN, Operation.RETRIEVE_ENTITY))
        self.assertTrue(self.acm.has_permission(Role.ADMIN, Operation.STORE_ENTITY))
        self.assertTrue(self.acm.has_permission(Role.ADMIN, Operation.PURGE_ENTITIES))

        # Test with string values
        self.assertTrue(self.acm.has_permission("admin", "retrieve_entity"))
        self.assertFalse(self.acm.has_permission("guest", "store_entity"))

    def test_entity_type_access(self):
        """Test entity type access restrictions."""
        # Test guest access
        self.assertTrue(self.acm.can_access_entity_type(Role.GUEST, "public"))
        self.assertTrue(self.acm.can_access_entity_type(Role.GUEST, "documentation"))
        self.assertFalse(self.acm.can_access_entity_type(Role.GUEST, "user"))
        self.assertFalse(self.acm.can_access_entity_type(Role.GUEST, "agent"))

        # Test user access
        self.assertTrue(self.acm.can_access_entity_type(Role.USER, "public"))
        self.assertTrue(self.acm.can_access_entity_type(Role.USER, "user"))
        self.assertFalse(self.acm.can_access_entity_type(Role.USER, "agent"))

        # Test agent access
        self.assertTrue(self.acm.can_access_entity_type(Role.AGENT, "public"))
        self.assertTrue(self.acm.can_access_entity_type(Role.AGENT, "user"))
        self.assertTrue(self.acm.can_access_entity_type(Role.AGENT, "agent"))

        # Test admin access (no restrictions)
        self.assertTrue(self.acm.can_access_entity_type(Role.ADMIN, "public"))
        self.assertTrue(self.acm.can_access_entity_type(Role.ADMIN, "user"))
        self.assertTrue(self.acm.can_access_entity_type(Role.ADMIN, "agent"))
        self.assertTrue(self.acm.can_access_entity_type(Role.ADMIN, "restricted"))

    def test_authorize(self):
        """Test authorization."""
        # Test guest authorization
        self.assertTrue(
            self.acm.authorize(Role.GUEST, Operation.RETRIEVE_ENTITY, "public")
        )
        self.assertFalse(
            self.acm.authorize(Role.GUEST, Operation.RETRIEVE_ENTITY, "user")
        )
        self.assertFalse(
            self.acm.authorize(Role.GUEST, Operation.STORE_ENTITY, "public")
        )

        # Test user authorization
        self.assertTrue(
            self.acm.authorize(Role.USER, Operation.RETRIEVE_ENTITY, "public")
        )
        self.assertTrue(self.acm.authorize(Role.USER, Operation.STORE_ENTITY, "user"))
        self.assertFalse(self.acm.authorize(Role.USER, Operation.STORE_ENTITY, "agent"))
        self.assertFalse(self.acm.authorize(Role.USER, Operation.PURGE_ENTITIES))

        # Test admin authorization
        self.assertTrue(
            self.acm.authorize(Role.ADMIN, Operation.RETRIEVE_ENTITY, "public")
        )
        self.assertTrue(self.acm.authorize(Role.ADMIN, Operation.STORE_ENTITY, "user"))
        self.assertTrue(self.acm.authorize(Role.ADMIN, Operation.PURGE_ENTITIES))

    def test_require_permission_decorator(self):
        """Test the require_permission decorator."""

        # Create a test class with the decorator
        class TestClass:
            def __init__(self):
                self.access_control = AccessControlManager()
                self.role = Role.USER

            @require_permission(Operation.RETRIEVE_ENTITY)
            def read_operation(self):
                return {"success": True, "data": "read data"}

            @require_permission(Operation.STORE_ENTITY)
            def write_operation(self):
                return {"success": True, "data": "write data"}

            @require_permission(Operation.PURGE_ENTITIES)
            def admin_operation(self):
                return {"success": True, "data": "admin data"}

            @require_permission(Operation.STORE_ENTITY, entity_type_arg="entity_type")
            def write_with_entity_type(self, entity_type):
                return {"success": True, "data": f"write to {entity_type}"}

        # Create an instance
        test_obj = TestClass()

        # Test read operation (allowed for user)
        result = test_obj.read_operation()
        self.assertTrue(result["success"])
        self.assertEqual(result["data"], "read data")

        # Test write operation (allowed for user)
        result = test_obj.write_operation()
        self.assertTrue(result["success"])
        self.assertEqual(result["data"], "write data")

        # Test admin operation (not allowed for user)
        result = test_obj.admin_operation()
        self.assertFalse(result["success"])
        self.assertEqual(result["error"], "Access denied")

        # Test write with allowed entity type
        result = test_obj.write_with_entity_type("user")
        self.assertTrue(result["success"])
        self.assertEqual(result["data"], "write to user")

        # Test write with disallowed entity type
        result = test_obj.write_with_entity_type("agent")
        self.assertFalse(result["success"])
        self.assertEqual(result["error"], "Access denied")

        # Change role to admin and test again
        test_obj.role = Role.ADMIN
        result = test_obj.admin_operation()
        self.assertTrue(result["success"])
        self.assertEqual(result["data"], "admin data")


if __name__ == "__main__":
    unittest.main()
